// Checks the actual running production demo, including hydration and live playback.
// Requires the workspace's @playwright/test; run after starting port 5174.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chaptersFor,eventsFor} from '../src/components/narrative.mjs';
import {INTRO_LIFT_MS,NARRATION_EXIT} from '../src/components/intro.mjs';
const browser=await chromium.launch({headless:true});
try{
 await Promise.all([1440,390].map(async width=>{
  const EVENTS=eventsFor(width<=700);
  const chapters=chaptersFor(JSON.parse(fs.readFileSync('tests/fixtures.json')).default,width<=700);
  const firstLift=chapters[1].at-450-(INTRO_LIFT_MS-NARRATION_EXIT),dockAt=chapters[1].at+chapters[1].delay+EVENTS.dock-chapters[1].storyAt,frameDone=chapters[1].at+chapters[1].delay+EVENTS.frameDone-chapters[1].storyAt;
  const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=page.waitForResponse(r=>r.url().endsWith('/api/simulate'));
  await page.goto('http://127.0.0.1:5174/');
  assert.equal(await page.locator('[data-intro-paragraph=first]').count(),1,'current intro flow must be served');
  assert.equal(await page.locator('.token-disclosure').count(),0);
  const samples=await page.evaluate(end=>new Promise((resolve,reject)=>{
   const rows=[],started=performance.now();
   const sample=()=>{
    const presentation=document.querySelector('[data-playhead]'),time=Number(presentation.dataset.playhead);
    const group=presentation.dataset.beat==='intro_problem'?'first':'second';
    const words=[...document.querySelectorAll(`[data-intro-paragraph=${group}] .narrator-word`)];
    rows.push({time,headerBottom:document.querySelector('.app-header').getBoundingClientRect().bottom,firstOpacity:document.querySelector('[data-intro-paragraph=first]')?.style.opacity,firstBottom:document.querySelector('[data-intro-paragraph=first]')?.getBoundingClientRect().bottom,chapter:presentation.dataset.beat,words:words.map(w=>{const r=w.getBoundingClientRect();return {x:r.x,y:r.y,height:r.height};}),visible:words.filter(w=>w.dataset.state!=='pending').length});
    // Include the browser entrance and the original hold before the next chapter.
    if(time>=end)return resolve(rows);
    if(performance.now()-started>45000)return reject(new Error('Live playback did not advance'));
    requestAnimationFrame(sample);
   };sample();
  }),chapters[1].end-50);
  const origin=(width<=700?samples.find(row=>row.visible>0):samples[0]).words[0];
  for(const chapter of ['intro_problem','intro_question']){
   const rows=samples.filter(s=>s.chapter===chapter&&s.words.length&&(width>700||s.visible>0)&&(chapter==='intro_problem'?s.time<firstLift:s.time<dockAt)),initial=rows[0];
   assert.ok(rows.length>20);
   assert.ok(rows.some(s=>s.visible===s.words.length),'entire paragraph generated');
   for(const row of rows)for(let i=0;i<row.words.length;i++){
    assert.ok(Math.abs(row.words[i].x-initial.words[i].x)<=1,'word shifted horizontally');
    assert.ok(Math.abs(row.words[i].y-initial.words[i].y)<=1,`word shifted vertically at ${width}px / ${row.time} ms`);
   }
   if(width<=700&&chapter==='intro_question'){
    const together=rows.filter(row=>row.visible===row.words.length);
    assert.ok(together.every(row=>row.firstOpacity==='1'&&row.firstBottom<row.words[0].y));
   }else assert.ok(Math.abs(initial.words[0].y-origin.y-(chapter==='intro_question'&&width>700?origin.height/2:0))<=1,'second paragraph offset differs');
   assert.ok(Math.abs(initial.words[0].x-origin.x)<=1,'paragraph origins differ');
  }
  if(width<=700)assert.equal(samples.at(-1).firstOpacity,'0');
  else assert.ok(samples.at(-1).firstBottom<0,'first paragraph clears viewport');
  assert.ok(samples.some(s=>s.time>=frameDone&&s.visible===s.words.length),'second paragraph holds after browser entrance');
  assert.equal((await response).status(),200);assert.deepEqual(errors,[]);
  await page.screenshot({path:`/tmp/live-stationary-intro-${width}.png`,fullPage:true});
  console.log(`${width}px: ${samples.length} live frames; both full paragraphs stationary within 1px; current markup, no disclosure, API and hydration passed`);
  await page.close();
 }));
}finally{await browser.close();}
