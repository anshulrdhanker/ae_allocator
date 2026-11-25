import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {chaptersFor, EVENTS, WORKSPACE_EXIT_MS} from '../src/components/narrative.mjs';
import {comparisonFrame} from '../src/components/allocation-engine.mjs';
import {money} from '../src/components/economics.mjs';

const fixtures = JSON.parse(await fs.readFile('tests/fixtures.json'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const seek = async time => {
    const pause = page.getByRole('button',{name:'Pause',exact:true});
    if (await pause.isVisible()) await pause.click();
    await page.getByRole('spinbutton',{name:'Time (ms)'}).fill(String(time),{force:true});
    await page.waitForFunction(t => +document.querySelector('[data-playhead]').dataset.playhead === t,time);
  };
  for (const [width,height] of [[1440,900],[1410,730],[1280,800],[390,844],[320,740]]) {
    await page.setViewportSize({width,height});
    await page.goto('file:///tmp/living-document-qa/index.html');
    await page.addStyleTag({content:'.qa-toolbar{position:absolute;opacity:0;pointer-events:none}'});
    const chapters = chaptersFor(fixtures.default);
    const shared = chapters.find(c => c.id === 'shared_allocation');
    const cohort = chapters.find(c => c.id === 'cohort_allocation');
    await seek(shared.at);
    const totals = page.locator('.chart-value');
    assert.deepEqual(await totals.allTextContents(), ['$0','$0']);
    assert.equal(await page.locator('.allocation-inputs').count(),1);
    await seek(shared.at + 600);
    assert.equal(await page.locator('.allocation-inputs').count(),0);
    assert.equal(await totals.count(),2);
    const compareButton = page.getByRole('button',{name:'Compare full cohort'});
    const cue = shared.at + (EVENTS.sharedDone - shared.storyAt) / shared.storyRate;
    await seek(cue - 1);
    assert.equal(await compareButton.count(),0);
    await seek(cue);
    assert.equal(await compareButton.isVisible(),width>700);
    await seek(cohort.at);
    assert.equal(await compareButton.isVisible(),width>700);
    const partial = await totals.allTextContents();
    const shown = comparisonFrame({chapters,time:cohort.at},1000).shown;
    assert.match(await page.locator('.comparison-progress').innerText(), new RegExp(shown + ' / 1,000'));
    await seek(cohort.complete);
    assert.deepEqual(await totals.allTextContents(), ['$44,412,470','$48,419,621']);
    assert.equal(await compareButton.count(),0);
    assert.match(await page.locator('.simulation-outcome').innerText(),/4,007,150/);
    const boxes = await page.locator('.revenue-chart').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
    if (width >= 900) {
      assert.equal(boxes[0].top, boxes[1].top);
      const fit = await page.evaluate(()=>({
        plotBottom:document.querySelector('.revenue-plots').getBoundingClientRect().bottom,
        pane:document.querySelector('.workspace-pane').getBoundingClientRect().bottom,
        controls:document.querySelector('.transport').getBoundingClientRect().bottom,
      }));
      assert.ok(fit.plotBottom <= fit.pane && fit.controls <= height, JSON.stringify({width,fit}));
    }
    if (width <= 700) assert.ok(boxes[1].top >= boxes[0].bottom);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    const result = chapters.at(-1);
    const workspace = page.locator('.browser-window');
    for (const [offset, opacity] of [[0,1],[WORKSPACE_EXIT_MS/2,0.125]]) {
      await seek(result.at + offset);
      assert.equal(await workspace.getAttribute('data-view'),'allocation');
      assert.equal(await page.locator('.presentation-slide').evaluate(el=>Number(getComputedStyle(el).opacity)),opacity);
      assert.deepEqual(await totals.allTextContents(), ['$44,412,470','$48,419,621']);
    }
    await seek(result.at + WORKSPACE_EXIT_MS);
    assert.ok(await workspace.isHidden());
    assert.ok(await page.locator('.benchmark-page').isVisible());
    await seek(result.complete);
    assert.equal(await page.locator('.benchmark-grid figure:visible').count(),4);
    await seek(cohort.complete);
    if(width<=700){
      assert.ok(await page.getByRole('tab',{name:'Results'}).isDisabled());
      await seek(result.complete);
      await page.getByRole('button',{name:'Replay presentation'}).click();
      await page.waitForSelector('[data-playing=true]');
      await page.getByLabel('Checkpoint').selectOption({label:'cohort_allocation'},{force:true});
    }else{
      await page.getByRole('tab',{name:'Results'}).click();
      await page.getByRole('button',{name:'Replay presentation'}).waitFor();
      await page.waitForSelector('[data-playing=false]');
      assert.ok(await workspace.isHidden());
    }
    await seek(cohort.at);
    assert.deepEqual(await totals.allTextContents(),partial);
  }
  for (const [scenario,data] of Object.entries(fixtures)) {
    await page.getByLabel('Scenario').selectOption(scenario,{force:true});
    await page.getByLabel('Checkpoint').selectOption({label:'cohort_allocation'},{force:true});
    const totals = await page.locator('.chart-value').allTextContents();
    assert.deepEqual(totals,[money(data.metrics.traditional.expected_revenue),money(data.metrics.optimized.expected_revenue)]);
  }
  assert.deepEqual(errors,[]);
  console.log('Allocation playback, geometry, replayed values and all scenario totals passed.');
} finally { await browser.close(); }
