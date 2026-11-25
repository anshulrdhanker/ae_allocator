// Run after render-qa.mjs; uses the workspace's @playwright/test installation.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {chaptersFor,EVENTS as E,CALCULATION_DELAY} from '../src/components/narrative.mjs';
import {estimateOperation} from '../src/components/agent-activity.mjs';
import {selectPrimaryLead} from '../src/components/selectors.mjs';
import {wordOpacity} from '../src/components/smooth-stream.mjs';
const data=JSON.parse(await fs.readFile('tests/fixtures.json','utf8')).default;
const chapters=chaptersFor(data),beat=chapters.find(b=>b.id==='inbound_record');
const operation=estimateOperation(selectPrimaryLead(data),E.estimates);
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
  const words=page.locator('.agent-structured-output .smooth-stream-word');
  const tokens=operation.outputs.flatMap(o=>[...o.labelTokens,...o.valueTokens]);
  const sample=()=>words.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {text:n.textContent,x:r.x,y:r.y,width:r.width,opacity:Number(s.opacity),color:s.color};}));
  await seek(absolute(tokens[0].start-1));const initial=await sample();assert.equal(initial.length,tokens.length);
  for(const index of [0,1,4,7]){
   const token=tokens[index];
   for(const offset of [-1,0,27,55,83,110,150,55,-1]){
    const time=Math.round(absolute(token.start+offset));await seek(time);const current=await sample();
    assert.ok(Math.abs(current[index].opacity-wordOpacity(token,time-beat.at-beat.delay+beat.storyAt))<.001);
    current.forEach((word,i)=>{assert.equal(word.text,tokens[i].text);assert.equal(word.color,initial[i].color);assert.ok(Math.abs(word.x-initial[i].x)<1&&Math.abs(word.y-initial[i].y)<1);});
   }
  }
  await seek(absolute(tokens[0].start+55));const paused=await sample();await page.waitForTimeout(180);assert.deepEqual(await sample(),paused);
  await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForTimeout(220);await page.getByRole('button',{name:'Pause',exact:true}).click();assert.equal((await sample())[0].opacity,1);
  for(const output of operation.outputs){
   await seek(absolute(output.transferAt-2));assert.equal(await page.locator(`[data-transfer="${output.key}"]`).count(),0);
   await seek(absolute(output.transferAt+2));assert.equal(await page.locator(`[data-transfer="${output.key}"]`).count(),1);
   await seek(absolute(output.commitAt+2));assert.equal(await page.locator(`[data-input="${output.key}"]`).getAttribute('data-applied'),'true');
  }
  await seek(absolute(operation.outputs[2].at+55));await page.screenshot({path:`/tmp/smooth-stream-${width}.png`,fullPage:true});
  const economics=chapters.find(b=>b.id==='lead_economics');await seek(absolute(E.selfEV+CALCULATION_DELAY+55,economics));
  assert.ok(Math.abs(Number(await page.locator('.stream-value .smooth-stream-word').first().evaluate(n=>getComputedStyle(n).opacity))-.5)<.001);
  await page.getByRole('checkbox',{name:'Static steps'}).check();
  assert.equal(Number(await page.locator('.stream-value .smooth-stream-word').first().evaluate(n=>getComputedStyle(n).opacity)),1);
  assert.deepEqual(errors,[]);console.log(`${width}px: opacity sampling, stable slots/color, pause, play, seeking, transfers, StreamValue, reduced motion passed`);
  await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
