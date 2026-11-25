import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {chaptersFor,EVENTS as E,narrationFor} from '../src/components/narrative.mjs';
import {readingTokens} from '../src/components/reading.mjs';
import {estimateOperation} from '../src/components/agent-activity.mjs';
import {selectPrimaryLead} from '../src/components/selectors.mjs';
const data=JSON.parse(await fs.readFile('tests/fixtures.json','utf8')).default;
const b=chaptersFor(data).find(b=>b.id==='inbound_record'),lead=selectPrimaryLead(data),op=estimateOperation(lead,E.estimates);
const line=narrationFor({chapter:b.id},data),tokens=readingTokens(line.text,b.storyAt+line.at);
assert.ok(b.delay+E.arrival>=b.storyAt+line.at+line.duration);
assert.ok(op.outputs.every(o=>o.transferAt>=op.generatedAt));
const server=http.createServer(async(req,res)=>{const name=req.url==='/'?'index.html':'qa.js';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(await fs.readFile(`/tmp/living-document-qa/${name}`));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const seek=async t=>{const time=Math.round(b.at+b.delay+t-b.storyAt);await page.getByRole('spinbutton',{name:'Time (ms)'}).fill(String(time),{force:true});await page.waitForFunction(t=>Number(document.querySelector('[data-playhead]').dataset.playhead)===t,time);};
try{
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addStyleTag({content:'.qa-toolbar{position:fixed!important;opacity:0;pointer-events:none}'});
  await seek(E.arrival-1);assert.equal(await page.locator('.arrival-slot').evaluate(n=>getComputedStyle(n).visibility),'hidden');
  await seek(E.arrival+200);assert.ok(await page.locator('.arrival-slot').isVisible());
  await page.screenshot({path:`/tmp/inbound-${width}-arrival.png`,fullPage:true});
  await seek(E.openRecord+100);assert.equal(await page.locator('.arr-field strong').count(),1);
  let slots;
  for(const [name,time] of [['generation',op.outputs[0].at+400],['transfer',op.outputs[0].transferAt+300],['ae',op.outputs[2].transferAt+300],['complete',op.readyAt+100]]){
   await seek(time);
   const geometry=await page.locator('.estimate-field').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
   if(slots)assert.deepEqual(geometry,slots,'metric slots stay fixed');slots=geometry;
   if(name==='transfer')assert.ok(await page.locator('[data-transfer=self]').isVisible());
   if(name==='complete'){assert.equal(await page.locator('.estimate-agent-surface').evaluate(n=>getComputedStyle(n).visibility),'hidden');assert.equal(await page.locator('[data-applied=true]').count(),4);assert.ok(await page.getByRole('button',{name:'Compare routes'}).isVisible());}
   else assert.equal(await page.getByRole('button',{name:'Compare routes'}).count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   await page.screenshot({path:`/tmp/inbound-${width}-${name}.png`,fullPage:true});
  }
  await seek(op.outputs[0].transferAt+300);const frozen=await page.locator('[data-transfer=self]').getAttribute('style');await page.waitForTimeout(80);assert.equal(await page.locator('[data-transfer=self]').getAttribute('style'),frozen);
  await page.getByRole('checkbox',{name:'Static steps'}).check();assert.equal(await page.locator('.agent-value-transfer').count(),0);
  console.log(`${width}px: original timing, arrival, generation, transfers, stable fields, completion, pause and static steps passed`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));}
