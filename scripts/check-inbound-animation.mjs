import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {chaptersFor,EVENTS as E} from '../src/components/narrative.mjs';
import {estimateOperation,modelInputFields,ESTIMATE_REVEAL_MS} from '../src/components/agent-activity.mjs';
import {arrivalLead} from '../src/components/selectors.mjs';
const data=JSON.parse(await fs.readFile('tests/fixtures.json','utf8')).default;
const b=chaptersFor(data).find(b=>b.id==='inbound_record'),lead=arrivalLead(data),op=estimateOperation(lead,E.estimates);
const server=http.createServer(async(req,res)=>{const name=req.url==='/'?'index.html':'qa.js';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(await fs.readFile(`/tmp/living-document-qa/${name}`));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const seek=async t=>{const time=Math.round(b.at+b.delay+t-b.storyAt);await page.getByRole('spinbutton',{name:'Time (ms)'}).fill(String(time),{force:true});await page.waitForFunction(t=>Number(document.querySelector('[data-playhead]').dataset.playhead)===t,time);};
try{
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1100});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addStyleTag({content:'.qa-toolbar{position:fixed!important;opacity:0;pointer-events:none}'});
  await seek(E.arrival-1);
  assert.equal(await page.locator('.arrival-slot').count(),0);
  await seek(E.arrival+200);
  assert.ok(await page.locator('.arrival-slot [data-lead-id="'+lead.id+'"]').isVisible());
  await seek(E.openRecord+100);
  assert.ok(await page.locator('.compact-record h2').isVisible());
  if(width<=700)assert.ok(await page.locator('.recent-leads').isHidden());
  const fields=modelInputFields(lead,op);
  const metric=key=>page.locator('[data-input="'+key+'"]');
  for(const field of fields){
   await seek(field.commitAt-2);
   assert.equal(await metric(field.key).getAttribute('data-applied'),'false');
   await seek(field.commitAt+2);
   assert.equal(await metric(field.key).getAttribute('data-applied'),'true');
   assert.ok((await metric(field.key).innerText()).includes(field.value));
  }
  await seek(op.committedAt+ESTIMATE_REVEAL_MS+10);
  assert.equal(await page.locator('.workbench-metric[data-applied=true]').count(),6);
  assert.equal(await page.locator('.agent-workbench').getAttribute('data-agent-phase'),'complete');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByLabel('Checkpoint').selectOption({label:'lead_economics'},{force:true});
  assert.ok(await page.locator('.workbench-metrics').isHidden());
  assert.ok(await page.getByRole('button',{name:'Routing to AE via Slack'}).isVisible());
  console.log(`${width}px: arrival, six timed input reveals, completion and economics handoff passed`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));}
