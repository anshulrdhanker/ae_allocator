// Run after render-qa.mjs; requires the workspace's @playwright/test.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {chaptersFor,narrationFor,eventsFor,PHONE_RISE_MS,INTRO_DOCK_MS,INTRO_AFTER_DOCK_MS,INTRO_AFTER_BROWSER_MS} from '../src/components/narrative.mjs';
import {narrationTokens,NARRATION_EXIT,INTRO_LIFT_MS} from '../src/components/intro.mjs';
const data=JSON.parse(await fs.readFile('tests/fixtures.json','utf8')).default;
const server=http.createServer(async(req,res)=>{const name=req.url==='/'?'index.html':'qa.js';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(await fs.readFile(`/tmp/living-document-qa/${name}`));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<=1,`${label}: ${a} vs ${b}`);
const seek=async time=>{await page.getByRole('spinbutton',{name:'Time (ms)'}).fill(String(Math.round(time)),{force:true});await page.waitForFunction(t=>Number(document.querySelector('[data-playhead]').dataset.playhead)===t,Math.round(time));};
const geometry=()=>page.evaluate(()=>{
 const box=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,height:r.height,width:r.width,bottom:r.bottom};};
 const first=document.querySelector('[data-intro-paragraph=first]'),second=document.querySelector('[data-intro-paragraph=second]');
 const root=document.querySelector('.narrator'),scale=root.getBoundingClientRect().width/root.offsetWidth;
 return {scale,first:box(first),second:box(second),root:box(document.querySelector('.narrator')),frame:box(document.querySelector('.browser-window')),lineHeight:parseFloat(getComputedStyle(document.querySelector('.narrator')).lineHeight),firstOpacity:first&&getComputedStyle(first).opacity,words:[...document.querySelectorAll('[data-intro-paragraph] .narrator-word')].map(box),overlay:box(document.querySelector('.intro-selection'))};
});
try{
 for(const width of [1440,768,390,320]){
  const chapters=chaptersFor(data,width<=700),EVENTS=eventsFor(width<=700);
  await page.setViewportSize({width,height:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addStyleTag({content:'.qa-toolbar{position:fixed!important;bottom:0;opacity:0!important;pointer-events:none}'});
  await page.evaluate(()=>document.fonts.ready);await seek(0);const original=await geometry();
  for(const [i,b] of chapters.slice(0,2).entries()){
   const line=narrationFor({chapter:b.id},data),tokens=narrationTokens(line.text,line.at,line.rate,line.focal);
   await seek(b.at+line.at);const reference=await geometry();
   near((i?reference.second:reference.first).x,original.first.x,'shared X origin');if(i&&width<=700)near(reference.second.y-reference.first.bottom,reference.lineHeight,'one line between paragraphs');else near((i?reference.second:reference.first).y,original.first.y+(i&&width>700?original.words[0].height/2:0),'deliberate half-line second offset');
   for(const local of [...tokens.map(t=>t.start+1),line.at+line.duration+1]){
    await seek(b.at+local);const current=await geometry();
    current.words.forEach((word,index)=>{near(word.x,reference.words[index].x,'fixed word X');near(word.y,reference.words[index].y,'fixed word Y');});
    assert.equal(current.firstOpacity,'1');near(current.frame.y,reference.frame.y,'stable browser during generation');
    if(i)assert.ok(current.first.bottom<current.second.y,'paragraphs do not overlap');
    const active=tokens.findIndex(t=>t.candidates.length&&local>=t.start&&local<t.end);
    if(active>=0){const word=current.words[(i?reference.words.length-tokens.length:0)+active],compact=word.bottom-current.root.y+108*current.scale>current.root.height;assert.ok(current.overlay);near(current.overlay.y,word.bottom+(compact?4:8)*current.scale,'candidate anchor');}
   }
  }
  let lastY=original.first.y;
  for(const elapsed of [0,1,75,150,225,300,INTRO_LIFT_MS-1,INTRO_LIFT_MS,INTRO_LIFT_MS+1]){
   await seek(chapters[1].at+(width<=700?0:-450-(INTRO_LIFT_MS-NARRATION_EXIT))+elapsed);const g=await geometry();assert.ok(g.first.y<=lastY+.01);lastY=g.first.y;if(width>700)assert.equal(g.firstOpacity,'1');else assert.ok(Number(g.firstOpacity)<=1);
  }
  const dockAt=chapters[1].at+chapters[1].delay+EVENTS.dock-chapters[1].storyAt;
  await seek(dockAt);const beforeDock=await geometry();
  const second=narrationFor({chapter:'intro_question'},data);
  assert.equal(second.at+450-NARRATION_EXIT,1310,'pause after lift before second paragraph');
  const frameAt=chapters[1].at+chapters[1].delay+EVENTS.frame-chapters[1].storyAt;
  const frameDoneAt=chapters[1].at+chapters[1].delay+EVENTS.frameDone-chapters[1].storyAt;
  assert.equal(frameAt-(dockAt+(width<=700?PHONE_RISE_MS:INTRO_DOCK_MS)),INTRO_AFTER_DOCK_MS);
  assert.equal(chapters[1].end-frameDoneAt,INTRO_AFTER_BROWSER_MS);
  for(const t of [dockAt+INTRO_DOCK_MS+500,frameAt-1]){await seek(t);assert.equal(await page.locator('.browser-window').evaluate(n=>getComputedStyle(n).visibility),'hidden');}
  await seek(frameDoneAt);const rested=await geometry();
  if(width<=700){
   const rise=original.first.y-beforeDock.first.y;
   near(rise,beforeDock.second.y-rested.second.y,'equal phone rises');
   for(const fraction of [.25,.5,.75]){
    await seek(chapters[1].at-60-PHONE_RISE_MS*1.2*(1-fraction));const first=await geometry();
    await seek(dockAt+PHONE_RISE_MS*fraction);const second=await geometry();
    near(original.first.y-first.first.y,beforeDock.second.y-second.second.y,'matched easing at playback speed');
   }
  }
  await seek(chapters[1].end-1);near((await geometry()).second.y,rested.second.y,'reading hold after entrance');
  assert.equal(await page.locator('.browser-window').evaluate(n=>getComputedStyle(n).visibility),'visible');
  assert.ok(rested.frame.y-rested.second.bottom>=20*rested.scale,'browser below text');
  await seek(chapters[1].end+390);assert.ok(Number(await page.locator('.narrator-previous').evaluate(n=>getComputedStyle(n).opacity))>0,'soft exit continues beyond 390ms');
  await seek(chapters[1].end+550);assert.equal(await page.locator('.narrator-previous').evaluate(n=>getComputedStyle(n).visibility),'hidden');
  assert.equal(await page.locator('.browser-window').evaluate(n=>getComputedStyle(n).visibility),'visible','browser remains visible across chapter boundary');
  await seek(chapters[1].at-1);const beforeBoundary=await geometry();await seek(chapters[1].at);near((await geometry()).first.y,beforeBoundary.first.y,'continuous chapter boundary');
  for(const delta of [1,100,350,INTRO_DOCK_MS-1,INTRO_DOCK_MS]){await seek(dockAt+delta);const g=await geometry();if(width<=700){assert.ok(g.second.y<=beforeDock.second.y);if(delta===INTRO_DOCK_MS){near(g.second.y,g.root.y,'docked in narration region');assert.ok(g.first.bottom<=g.root.y);}continue;}assert.ok(g.second.y<beforeDock.second.y);assert.ok(g.first.y<beforeDock.first.y);if(delta===1)near(g.second.y,beforeDock.second.y,'continuous dock start');if(delta===INTRO_DOCK_MS){assert.ok(g.first.bottom<0,'first paragraph entirely offscreen');near(g.second.y,g.root.y+g.scale*g.lineHeight/2,'second paragraph lands at settled two-line baseline');}}
  // Completed intro transitions out with the same fade before the next narration.
  await seek(chapters[1].end-1);const end=await geometry();await seek(chapters[1].end);const exit=await geometry();near(exit.first.y,end.first.y,'continuous intro exit');
  await seek(chapters[1].at-450-(INTRO_LIFT_MS-NARRATION_EXIT)+190);const paused=await geometry();await page.waitForTimeout(120);assert.deepEqual(await geometry(),paused);
  await seek(chapters[1].at-450-(INTRO_LIFT_MS-NARRATION_EXIT)+190);assert.deepEqual(await geometry(),paused);
  await seek(chapters[1].at+190);if(width<=700)await page.getByLabel('OS motion (test)').selectOption('reduce',{force:true});else await page.getByRole('checkbox',{name:'Static steps'}).check();const reduced=await geometry();assert.ok(reduced.first.bottom<reduced.second.y);assert.equal(await page.locator('.intro-selection').count(),0);
  if(width<=700)await page.getByRole('button',{name:'Previous step'}).click();else await page.getByRole('button',{name:'Replay',exact:true}).click();near((await geometry()).first.y,original.first.y,'replay anchor');
  if(width<=700){
   await page.getByLabel('OS motion (test)').selectOption('system',{force:true});
   await page.waitForSelector('[data-playing=true]');
   await page.getByLabel('Checkpoint').selectOption({label:'intro_problem'},{force:true});
  }else await page.getByRole('checkbox',{name:'Static steps'}).uncheck();await seek(13000);await page.screenshot({path:`/tmp/intro-flow-${width}.png`,fullPage:true});
  await seek(frameDoneAt+500);await page.screenshot({path:`/tmp/intro-clean-exit-${width}.png`,fullPage:true});
  console.log(`${width}px: stationary generation, wider spacing, 1310ms breathing room, clean first exit, extended reading hold, pause/seek/replay/static steps passed`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
