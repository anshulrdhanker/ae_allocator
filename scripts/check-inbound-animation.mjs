import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {chaptersFor,eventsFor,MOBILE_EXPAND_MS} from '../src/components/narrative.mjs';
import {estimateOperation,modelInputFields,ESTIMATE_REVEAL_MS} from '../src/components/agent-activity.mjs';
import {arrivalLead} from '../src/components/selectors.mjs';
const data=JSON.parse(await fs.readFile('tests/fixtures.json','utf8')).default;
const server=http.createServer(async(req,res)=>{const name=req.url==='/'?'index.html':'qa.js';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(await fs.readFile(`/tmp/living-document-qa/${name}`));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const width of [1440,768,390,320]){
  const E=eventsFor(width<=700);
  const b=chaptersFor(data,width<=700).find(b=>b.id==='inbound_record'),lead=arrivalLead(data),op=estimateOperation(lead,E.estimates);
  const seek=async t=>{const time=Math.round(b.at+b.delay+t-b.storyAt);await page.getByRole('spinbutton',{name:'Time (ms)'}).fill(String(time),{force:true});await page.waitForFunction(t=>Number(document.querySelector('[data-playhead]').dataset.playhead)===t,time);};
  await page.setViewportSize({width,height:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addStyleTag({content:'.qa-toolbar{position:fixed!important;opacity:0;pointer-events:none}'});
  await seek(E.arrival-1);
  assert.equal(await page.locator('[role=tabpanel] .arrival-slot').count(),0);
  await seek(E.arrival+200);
  assert.ok(await page.locator('[role=tabpanel] .arrival-slot [data-lead-id="'+lead.id+'"]').isVisible());
  await seek(E.openRecord+100);
  assert.ok(await page.locator('[role=tabpanel] .compact-record h2').isVisible());
  if(width<=700)assert.ok(await page.locator('[role=tabpanel] .recent-leads').isHidden());
  let settledFrame;
  if(width<=700){
   const frame=page.locator('.browser-window');
   await seek(E.openRecord);const compact=await frame.boundingBox();
   await seek(E.openRecord+400);const growing=await frame.boundingBox();
   await seek(E.openRecord+MOBILE_EXPAND_MS);settledFrame=await frame.boundingBox();
   assert.ok(compact.height<growing.height&&growing.height<settledFrame.height);
   assert.equal(compact.y,settledFrame.y);
   await seek(E.estimates-1);
   assert.equal(await page.locator('[role=tabpanel] .agent-workbench').getAttribute('data-agent-phase'),'idle');
  }
  const fields=modelInputFields(lead,op);
  const metric=key=>page.locator('[role=tabpanel] [data-input="'+key+'"]');
  for(const field of fields){
   await seek(field.commitAt-2);
   assert.equal(await metric(field.key).getAttribute('data-applied'),'false');
   await seek(field.commitAt+2);
   assert.equal(await metric(field.key).getAttribute('data-applied'),'true');
   assert.ok((await metric(field.key).innerText()).includes(field.value));
  }
  await seek(op.committedAt+(width<=700?720:ESTIMATE_REVEAL_MS)+10);
  assert.equal(await page.locator('[role=tabpanel] .workbench-metric[data-applied=true]').count(),6);
  assert.equal(await page.locator('[role=tabpanel] .agent-workbench').getAttribute('data-agent-phase'),'complete');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByLabel('Checkpoint').selectOption({label:'lead_economics'},{force:true});
  assert.ok(await page.locator('[role=tabpanel] .workbench-metrics').isHidden());
  assert.ok(await page.getByRole('button',{name:'Routing to AE via Slack'}).isVisible());
  if(settledFrame)assert.deepEqual(await page.locator('.browser-window').boundingBox(),settledFrame);
  console.log(`${width}px: arrival, six timed input reveals, completion and economics handoff passed`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));}
