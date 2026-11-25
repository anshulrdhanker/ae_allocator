// Run after render-qa.mjs; uses the workspace's @playwright/test installation.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {chaptersFor,EVENTS as E,CALCULATION_DELAY} from '../src/components/narrative.mjs';
import {modelInputFields,ESTIMATE_REVEAL_MS,estimateOperation} from '../src/components/agent-activity.mjs';
import {arrivalLead} from '../src/components/selectors.mjs';
const data=JSON.parse(await fs.readFile('tests/fixtures.json','utf8')).default;
const chapters=chaptersFor(data),beat=chapters.find(b=>b.id==='inbound_record');
const operation=estimateOperation(arrivalLead(data),E.estimates);
const absolute=(story,b=beat)=>b.at+b.delay+story-b.storyAt;
const server=http.createServer(async(req,res)=>{
 const name=req.url==='/'?'index.html':'qa.js';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');
 res.end(await fs.readFile(`/tmp/living-document-qa/${name}`));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const seek=async time=>{await page.getByRole('spinbutton',{name:'Time (ms)'}).fill(String(Math.round(time)));await page.waitForFunction(t=>Number(document.querySelector('[data-playhead]').dataset.playhead)===t,Math.round(time));};
  const fields=modelInputFields(arrivalLead(data),operation);
  const field=fields[0];
  const value=page.locator('[data-input="'+field.key+'"] .input-value-slot > span:last-child');
  await seek(absolute(field.commitAt-1));
  const initial=await value.boundingBox();
  for(const offset of [0,40,110,240,449,500,110]){
   const time=Math.round(absolute(field.commitAt)+offset);
   await seek(time);
   const opacity=await value.evaluate(n=>Number(getComputedStyle(n).opacity));
   const expected=Math.min(1,Math.max(0,(time-absolute(field.commitAt))/ESTIMATE_REVEAL_MS));
   assert.ok(Math.abs(opacity-expected)<.001);
   assert.deepEqual(await value.boundingBox(),initial);
  }
  const paused=await value.getAttribute('style');await page.waitForTimeout(180);
  assert.equal(await value.getAttribute('style'),paused);
  const economics=chapters.find(b=>b.id==='lead_economics');await seek(absolute(E.selfEV+CALCULATION_DELAY+55,economics));
  assert.ok(Math.abs(Number(await page.locator('.stream-value .smooth-stream-word').first().evaluate(n=>getComputedStyle(n).opacity))-.5)<.001);
  await page.getByRole('checkbox',{name:'Static steps'}).check();
  assert.equal(Number(await page.locator('.stream-value .smooth-stream-word').first().evaluate(n=>getComputedStyle(n).opacity)),1);
  assert.deepEqual(errors,[]);console.log(`${width}px: input reveal timing, stable value slot, pause, seeking, streamed economics and static steps passed`);
  await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
