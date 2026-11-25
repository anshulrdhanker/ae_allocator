import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {estimateOperation,latestEstimateReady,allocationAction,AGENT_MOTION as M} from '../src/components/agent-activity.mjs';
import {EVENTS as E,chaptersFor,deriveTimelineState} from '../src/components/narrative.mjs';
import {initialPlayback,playbackReducer} from '../src/components/playback.mjs';
import {probability,hours} from '../src/components/economics.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures.json',import.meta.url)));

test('agent outputs use the selected model record and finish before any writeback',()=>{
 for(const data of Object.values(fixtures))for(const lead of data.opportunities){
  const op=estimateOperation(lead,E.estimates);
  assert.deepEqual(op.outputs.map(o=>o.value),[probability(lead.p_self),probability(lead.p_sales),`${hours(lead.ae_hours)} h`,`${hours(lead.bdr_hours)} h`]);
  for(const [i,output] of op.outputs.entries()){
   const text=[...output.labelTokens,...output.valueTokens].map(t=>t.text).join('');
   assert.equal(text,`${output.label} ${output.value}`);
   if(i)assert.ok(output.at>=op.outputs[i-1].end);
   assert.ok(output.transferAt>=output.end+M.settle);
   if(i)assert.ok(output.commitAt-op.outputs[i-1].commitAt>=650);
   assert.ok(Math.abs(output.commitAt-output.transferAt-M.transfer)<1e-8);
  }
  assert.ok(op.closeAt>=op.committedAt+M.closeDelay);
  assert.ok(op.readyAt>=op.doneAt+M.hold);
 }
 const d=fixtures.default,changed={...d.opportunities[48],p_self:.1,p_sales:.2,ae_hours:9,bdr_hours:3};
 assert.deepEqual(estimateOperation(changed,E.estimates).outputs.map(o=>o.value),['10%','20%','9.00 h','3.00 h']);
});

test('extended inbound checkpoint covers every selectable lead without shifting story cues',()=>{
 for(const data of Object.values(fixtures)){
  const chapters=chaptersFor(data),b=chapters.find(b=>b.id==='inbound_record');
  if(!b){assert.equal(data.opportunities.length,0);continue;}
  const snapshot=deriveTimelineState(data,b.complete);
  assert.ok(snapshot.storyTime>=latestEstimateReady(data,E.estimates)+299);
  assert.equal(snapshot.view,'inbound');assert.ok(snapshot.storyTime<E.compare);
  const next=chapters[chapters.indexOf(b)+1];assert.equal(next.at,b.end);assert.equal(next.storyAt,31000);
  const state=playbackReducer(initialPlayback(),{type:'seek-cue',chapter:'inbound_record',cue:latestEstimateReady(data,E.estimates)+200,chapters});
  assert.equal(deriveTimelineState(data,state.time).chapter,'inbound_record');assert.equal(state.playing,false);
 }
});

test('pause, resume, selection, replay and static checkpoints retain deterministic agent state',()=>{
 const data=fixtures.default,chapters=chaptersFor(data),b=chapters.find(b=>b.id==='inbound_record');
 const op=estimateOperation(data.opportunities[48],E.estimates),time=b.at+b.delay+op.writeAt+300-b.storyAt;
 let state=playbackReducer(initialPlayback(),{type:'seek-time',time,chapters});
 assert.equal(playbackReducer(state,{type:'tick',delta:1000,chapters}).time,time);
 state=playbackReducer(state,{type:'toggle',chapters});state=playbackReducer(state,{type:'tick',delta:150,chapters});assert.equal(state.time,time+150);
 state=playbackReducer(state,{type:'select-lead',id:3,chapters});assert.equal(state.selectedId,3);assert.equal(state.time,b.complete);
 state=playbackReducer(state,{type:'replay',reduced:true,chapters});assert.equal(state.time,0);assert.equal(state.selectedId,null);assert.equal(state.playing,false);
 assert.equal(deriveTimelineState(data,b.complete,true).storyTime>=op.readyAt,true);
});

test('operation labels respect feasible and fallback solver outcomes',()=>{
 assert.equal(allocationAction(fixtures.default),'Applying optimal allocation');
 assert.equal(allocationAction(fixtures.feasible),'Applying feasible allocation');
 assert.equal(allocationAction(fixtures.fallback),'Retaining baseline routes');
});
