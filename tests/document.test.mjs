import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectContrastPair,selectPrimaryLead,presentationSummary,routeFor,solutionChecks,worklistLeads,assignmentCounts} from '../src/components/selectors.mjs';
import {initialPlayback,playbackReducer,advanceClock} from '../src/components/playback.mjs';
import {eventsFor,benchmarkTiming,INTRO_DURATION,TOTAL_DURATION,BEATS,chaptersFor,deriveTimelineState,EVENTS as E,narrationFor,narrationPlayback,CALCULATION_DELAY,PAIR_ROUTE_STAGGER,COHORT_ROUTE_STAGGER} from '../src/components/narrative.mjs';
import {narrationTokens,tokenPhase,tokenize,NARRATION_EXIT,tokenCandidates} from '../src/components/intro.mjs';
import {READING,readingTokens,readingDuration,readingCost,readingPhase} from '../src/components/reading.mjs';
import {money,signedMoney} from '../src/components/economics.mjs';
import {plotDomain,coordinates} from '../src/components/economics.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures.json',import.meta.url)));
test('real default response validates 031/003 reversal, full precision delta and exact aggregates',()=>{
 const d=fixtures.default,pair=selectContrastPair(d);assert.deepEqual(pair.map(l=>l.id),[31,3]);assert.equal(selectPrimaryLead(d).id,31);
 const s=presentationSummary(d);assert.equal(s.baseline.revenue,'$44,412,470');assert.equal(s.computed.revenue,'$48,419,621');assert.equal(s.delta,'+$4,007,150');assert.equal(s.percentLabel,'+9.02%');
 assert.notEqual(pair[0].incremental_ev,583087-567519);assert.equal(s.qualification,'Proven optimal');
});
test('all actual scenarios respect route budgets and totals including self service',()=>{
 for(const [name,d] of Object.entries(fixtures))for(const [computed,key] of [[false,'traditional'],[true,'optimized']]){
  const sum=field=>d.opportunities.reduce((n,l)=>n+(routeFor(d,l,computed)==='sales'?l[field]:0),0);
  assert.ok(sum('ae_hours')<=d.configuration.ae_capacity_hours+1e-6,name);assert.ok(sum('bdr_hours')<=d.configuration.bdr_capacity_hours+1e-6,name);
  const total=d.opportunities.reduce((n,l)=>n+l.ev_self,0)+sum('incremental_ev');assert.ok(Math.abs(total-d.metrics[key].expected_revenue)<.001,name);
 }
});
test('empty, one lead, no contrast and zero capacity do not invent a pair or percentage',()=>{
 for(const key of ['empty','single','zero','fallback','negative'])assert.equal(selectContrastPair(fixtures[key]),null,key);
 assert.equal(selectPrimaryLead(fixtures.empty),null);assert.equal(presentationSummary(fixtures.empty).percentLabel,'—');assert.equal(presentationSummary(fixtures.zero).difference,0);
 assert.match(narrationFor(deriveTimelineState(fixtures.zero,chaptersFor(fixtures.zero).find(b=>b.id==='cohort_allocation').complete),fixtures.zero,presentationSummary(fixtures.zero)).text,/same expected annual revenue/);
});
test('negative economics and feasible/fallback statuses remain truthful',()=>{
 assert.ok(selectPrimaryLead(fixtures.negative).incremental_ev<0);
 assert.equal(presentationSummary(fixtures.feasible).qualification,'Feasible · optimality not proven');
 assert.equal(presentationSummary(fixtures.fallback).verified,false);assert.equal(presentationSummary(fixtures.fallback).difference,0);
 const lower=structuredClone(fixtures.single);lower.metrics.optimized.expected_revenue=lower.metrics.traditional.expected_revenue-100;
 assert.ok(presentationSummary(lower).percent<0);assert.match(presentationSummary(lower).delta,/-/);
});
test('coordinates are policy independent, include negative deltas, and handle 5000 points',()=>{
 for(const d of Object.values(fixtures)){
  const domain=plotDomain(d.opportunities),points=d.opportunities.map(l=>coordinates(l,domain));
  const changed=structuredClone(d);changed.optimized_assignments=changed.baseline_assignments;
  assert.deepEqual(points,changed.opportunities.map(l=>coordinates(l,plotDomain(changed.opportunities))));
  points.forEach(p=>{assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.y>=38-1e-8&&p.y<=245+1e-8)});
 }
 assert.equal(fixtures.large.opportunities.length,5000);assert.ok(plotDomain(fixtures.negative.opportunities).min<0);
});
test('seven chapters preserve canonical causal cues with narration-derived reading time',()=>{
 assert.deepEqual(BEATS.map(b=>b.storyAt),[0,8000,16000,31000,43000,58000,70000]);
 const chapters=chaptersFor(fixtures.default);
 assert.equal(chapters.at(-1).duration,benchmarkTiming(narrationFor({chapter:"result"},fixtures.default)).end);
 const at=cue=>{const b=chapters.find(c=>cue>=c.storyAt&&cue<c.storyAt+c.storyDuration);return b.at+b.delay+cue-b.storyAt};
 const entranceAt=chapters[1].at+chapters[1].delay+(E.frame-chapters[1].storyAt)/chapters[1].storyRate;
 assert.equal(deriveTimelineState(fixtures.default,entranceAt-1).frame,0);
 assert.equal(deriveTimelineState(fixtures.default,INTRO_DURATION).frame,1);
 assert.equal(deriveTimelineState(fixtures.default,chapters.find(c=>c.id==='shared_allocation').at).view,'allocation');
 assert.equal(deriveTimelineState(fixtures.default,at(E.allocation)).view,'allocation');
 assert.equal(deriveTimelineState(fixtures.default,at(E.results)).view,'results');
 assert.ok(E.arrival<E.openRecord&&E.openRecord<=E.estimates&&E.estimates<E.effort);
 assert.ok(E.selfEV<E.salesEV&&E.salesEV<E.delta&&E.delta<E.deltaEffort);
 assert.ok(E.secondLead<E.capacity&&E.capacity<E.routes&&E.routes<E.cohort);
 assert.ok(E.optimized<E.aggregate&&E.aggregate<E.usage&&E.usage<E.results);
 assert.ok(E.resultDelta<E.qualification&&E.qualification<=E.finalHold);
 const state=playbackReducer(initialPlayback(),{type:'tick',delta:TOTAL_DURATION+1000});
 assert.equal(state.time,TOTAL_DURATION);assert.equal(state.playing,false);
});
test('replay starts at zero, manual checkpoints stay complete, selected identity survives play',()=>{
 let state=playbackReducer(initialPlayback(),{type:'pause'});
 for(const b of BEATS){state=playbackReducer(state,{type:'next',reduced:true});assert.equal(state.time,b.complete);assert.equal(state.playing,false)}
 state=playbackReducer(state,{type:'back'});assert.equal(state.time,BEATS.at(-2).complete);
 state=playbackReducer(state,{type:'select-lead',id:326});assert.equal(state.selectedId,326);
 state=playbackReducer(state,{type:'toggle'});assert.equal(state.selectedId,326);
 state=playbackReducer(state,{type:'replay'});assert.equal(state.time,0);assert.equal(state.selectedId,null);assert.equal(state.playing,true);
 state=playbackReducer(state,{type:'replay',reduced:true});assert.equal(state.time,0);assert.equal(state.playing,false);
});
test('empty timeline omits nonexistent records and still reaches results',()=>{
 const chapters=chaptersFor(fixtures.empty);assert.ok(chapters.at(-1).end<TOTAL_DURATION);
 assert.ok(!chapters.some(b=>b.id==='inbound_record'||b.id==='lead_economics'));
 for(const b of chapters){const snapshot=deriveTimelineState(fixtures.empty,b.complete,true);assert.ok(snapshot.empty);assert.equal(snapshot.pointer,null)}
 assert.equal(deriveTimelineState(fixtures.empty,chapters.at(-1).complete).view,'results');
});
test('clock stalls before the first data event, freezes when hidden, scales speed',()=>{
 assert.deepEqual(advanceClock({now:10000,previous:1000,hidden:true,ready:true,time:0,speed:1}),{previous:null,delta:0});
 assert.equal(advanceClock({now:20000,previous:null,hidden:false,ready:true,time:1000,speed:1}).delta,0);
 assert.equal(advanceClock({now:100,previous:0,hidden:false,ready:true,time:1000,speed:2}).delta,200);
 assert.equal(advanceClock({now:100,previous:0,hidden:false,ready:false,time:INTRO_DURATION-20,speed:2}).delta,20);
 assert.equal(advanceClock({now:100,previous:0,hidden:false,ready:false,time:INTRO_DURATION,speed:1}).delta,0);
});
test('worklist is bounded, unique, authentic, and retains the chosen lead and pair',()=>{
 for(const d of Object.values(fixtures)){const rows=worklistLeads(d);assert.ok(rows.length<=5);assert.equal(new Set(rows.map(l=>l.id)).size,rows.length);rows.forEach(l=>assert.ok(d.opportunities.includes(l)));}
 assert.deepEqual(worklistLeads(fixtures.default).slice(0,2).map(l=>l.id),[31,3]);
 assert.equal(worklistLeads(fixtures.default,fixtures.default.opportunities[6])[0].id,7);
 assert.deepEqual(assignmentCounts(fixtures.default),{baseline:100,optimized:137,changed:237});
});
test('exact narration adapts counts and never asserts improvement for fallback or losses',()=>{
 const snapshot=d=>deriveTimelineState(d,chaptersFor(d).at(-2).complete);
 assert.match(narrationFor(snapshot(fixtures.default),fixtures.default,presentationSummary(fixtures.default)).text,/9\.02% more expected annual revenue than a baseline routing rule\./);
 for(const key of ['empty','fallback','zero','zeroRevenue'])assert.doesNotMatch(narrationFor(snapshot(fixtures[key]),fixtures[key],presentationSummary(fixtures[key])).text,/revenue lift/);
 assert.match(narrationFor(snapshot(fixtures.fallback),fixtures.fallback,presentationSummary(fixtures.fallback)).text,/baseline/);
 const d=structuredClone(fixtures.default);d.metrics.optimized.expected_revenue=d.metrics.traditional.expected_revenue-100;
 assert.match(narrationFor(snapshot(d),d,presentationSummary(d)).text,/less in expected/);
 const b=chaptersFor(fixtures.single).find(b=>b.id==='cohort_allocation');assert.match(narrationFor(deriveTimelineState(fixtures.single,b.complete),fixtures.single,presentationSummary(fixtures.single)).text,/1 synthetic lead\./);
});

test('solution checks recompute budgets and validate every binary route',()=>{
 for(const data of Object.values(fixtures))assert.ok(solutionChecks(data).every(c=>c.pass));
 const broken=structuredClone(fixtures.default);broken.optimized_assignments=broken.opportunities.map(()=>'sales');
 assert.ok(solutionChecks(broken).some(c=>!c.pass));broken.optimized_assignments[0]='unknown';assert.equal(solutionChecks(broken)[0].pass,false);
});

test('manual cohort actions expose baseline then a completed returned allocation on normal and shortened paths',()=>{
 for(const d of [fixtures.default,fixtures.empty]){
  const chapters=chaptersFor(d);
  let state=playbackReducer(initialPlayback(),{type:'seek-cue',cue:E.cohort+300,chapters});
  let view=deriveTimelineState(d,state.time);assert.equal(view.cohort,true);assert.ok(view.storyTime<E.optimized);assert.equal(state.playing,false);
  state=playbackReducer(state,{type:'seek-cue',cue:E.cohortDone+300,chapters});view=deriveTimelineState(d,state.time);assert.ok(view.storyTime>=E.cohortDone+280);assert.ok(view.storyTime<E.results);
 }
});


test('all narration uses the reading clock; intro candidates do not add timing penalties',()=>{
 const text='We use optimization, then inspect input. The allocations follow.';
 const tokens=narrationTokens(text,550,1,'optimization');
 assert.equal(tokens.length,tokenize(text).length);assert.equal(tokens.map(t=>t.text).join(''),text);
 assert.deepEqual(tokens,narrationTokens(text,550,1,'optimization'));
 tokens.forEach((t,i)=>{
  assert.equal(tokenPhase(t,t.start-1),'pending');assert.equal(tokenPhase(t,t.start),'thinking');
  assert.equal(tokenPhase(t,t.accept),'accepted');assert.equal(tokenPhase(t,t.end),'settled');
  assert.equal(tokenPhase(t,0,true),'settled');
  assert.ok(t.duration>=READING.minimumWordMs-1e-8);
  assert.equal(t.end-t.start,readingTokens(text,550)[i].end-readingTokens(text,550)[i].start);
  assert.equal(tokenPhase(t,t.start,false,false),'accepted');
  if(i)assert.equal(t.start,tokens[i-1].end);
 });
 assert.deepEqual(tokenCandidates('model',1),[['model',.66],['system',.17],['tool',.09],['framework',.05],['simulation',.03]]);
 assert.deepEqual(tokenCandidates('programming,',0).map(c=>c[1]),[.87,.07,.03,.02,.01]);
 assert.deepEqual(tokenCandidates('optimized',0).map(c=>c[1]),[.79,.10,.06,.03,.02]);
 assert.deepEqual(tokenCandidates('time',0).map(c=>c[0]),['time','effort','capacity','availability','attention']);
 for(let t=0;t<tokens.at(-1).end;t+=10)assert.ok(tokens.filter(w=>['thinking','accepted'].includes(tokenPhase(w,t))).length<=1);
});

test('reading budget matches the research anchor and gives difficult tokens more time',()=>{
 const reference='alpha bravo delta echo beta'; // 4.6 letters per word
 assert.ok(Math.abs(readingDuration(reference)-5*60000/238)<1e-8);
 const longer='allocation probability synthesis optimization';
 const letters=tokenize(longer).reduce((n,w)=>n+readingCost(w).length,0);
 assert.ok(Math.abs(readingDuration(longer)-letters*60000/(238*4.6))<1e-8);
 const words=readingTokens('a optimization lead lead, lead. AE ae $895,123');
 assert.ok(words[1].duration>words[0].duration);
 assert.ok(words[4].duration>words[3].duration&&words[3].duration>words[2].duration);
 assert.ok(words[5].duration>words[6].duration);
 assert.ok(words[7].duration>words[2].duration);
 assert.deepEqual(readingTokens(''),[]);assert.equal(readingDuration(''),0);
 for(const data of Object.values(fixtures))for(const chapter of chaptersFor(data)){
  const line=narrationFor({chapter:chapter.id},data),tokens=readingTokens(line.text,line.at);
  const rate=chapter.id.startsWith('intro_')?1:2;
  const generated=narrationTokens(line.text,line.at,line.rate,line.focal,line.steady);
  const scheduled=readingTokens(line.text,line.at,rate,line.steady);
  for(const [i,word] of generated.entries()){
   const leadPause=chapter.id==='inbound_record'&&i>0&&tokens[i].start>=tokens.find(t=>t.text.trim()==='lead.').end?1000:0;
   const nextPause=chapter.id==='lead_economics'&&i>0?400:0;
   for(const cue of ['start','accept','highlightEnd','end'])
    assert.ok(Math.abs(word[cue]-leadPause-nextPause-scheduled[i][cue])<1e-7);
  }
  assert.ok(tokens.every(t=>t.duration>=READING.minimumWordMs-1e-8));
  assert.ok(Math.abs(generated.at(-1).end-line.at-line.duration)<1e-7);
  tokens.forEach((t,i)=>{if(i)assert.equal(t.start,tokens[i-1].end);assert.equal(readingPhase(t,t.start),'accepted');assert.equal(readingPhase(t,t.highlightEnd),'settled');});
 }
});

test('every narration finishes with a reading gap before its first demanding browser event',()=>{
 const cues={intro_question:E.dock,inbound_record:E.arrival,lead_economics:E.compare,shared_allocation:E.allocation,cohort_allocation:E.cohort,result:E.results};
 const longer=structuredClone(fixtures.single);longer.metrics.traditional.expected_revenue=0;longer.metrics.optimized.expected_revenue=123456;
 for(const d of [...Object.values(fixtures),longer])for(const b of chaptersFor(d)){
  const line=narrationFor({chapter:b.id},d,presentationSummary(d));
  assert.ok(b.id==='intro_problem'||line.at>NARRATION_EXIT,'exit completes before the next stream');
  if(!cues[b.id]||b.id==='result')continue;
  if(b.id==='cohort_allocation'){
   const playback=narrationPlayback(deriveTimelineState(d,b.end-1),d);
   assert.ok(playback.local>=line.at+line.duration,'simulation narration completes before fade');
   continue;
  }
  if(b.id==='inbound_record'){
   const tokens=narrationTokens(line.text,line.at,line.rate,line.focal,line.steady);
   const single=tokens.find(t=>t.text.trim()==='single');
   const lead=tokens.find(t=>t.text.trim()==='lead.');
   const agent=tokens.find(t=>t.text.trim()==='agent');
   assert.ok(E.arrival-b.storyAt>=single.start && E.arrival-b.storyAt<lead.end);
   assert.ok(E.openRecord-b.storyAt>=agent.start && E.openRecord-b.storyAt<line.at+line.duration);
   assert.equal(deriveTimelineState(d,chaptersFor(d).find(c=>c.id==='lead_economics').complete).view,'inbound');
   continue;
  }
  if(b.id==='lead_economics'){
   assert.ok(E.compare-b.storyAt>=line.at && E.compare-b.storyAt<line.at+line.duration);
   assert.ok(E.salesEV-E.selfEV>=2500 && E.delta-E.salesEV>=2500);
   continue;
  }
  const actionTime=b.at+b.delay+cues[b.id]-b.storyAt;
  assert.ok(actionTime-(b.at+line.at+line.duration)>=1200-1e-6,b.id);
  const tokenEnd=narrationTokens(line.text,line.at,line.rate,line.focal).at(-1).end;
  assert.ok(actionTime>b.at+tokenEnd);
  assert.ok(actionTime-b.at-line.at>=line.duration+READING.afterNarrationMs-1e-6,`${b.id} reading budget`);
 }
 const inbound=chaptersFor(fixtures.default).find(b=>b.id==='inbound_record');
 assert.ok(inbound.duration<inbound.storyDuration,'advance after the completed inputs and narration hold');
 const end=chaptersFor(longer).at(-1);
 assert.equal(end.duration,benchmarkTiming(narrationFor({chapter:end.id},longer)).end);
 assert.equal(narrationFor({chapter:end.id},longer).text,'I benchmarked the MILP allocation against four simpler routing strategies using the same simulation and the same sales-capacity constraints.');
});

test('microstream cues finish sequentially before the next narration',()=>{
 assert.ok(E.estimates+280<E.estimateSelf&&E.estimateSelf+180<E.estimateSales&&E.estimateSales+180<E.effort);
 assert.ok(E.selfEV+CALCULATION_DELAY+180<E.salesEV&&E.salesEV+CALCULATION_DELAY+180<E.delta);
 assert.ok(E.delta+CALCULATION_DELAY+180<E.deltaEffort);
 assert.ok(E.routes+PAIR_ROUTE_STAGGER+280<E.sharedDone);
 assert.ok(E.optimized+4*COHORT_ROUTE_STAGGER+200<E.aggregate);
 assert.ok(E.report+280<E.reportOptimized&&E.reportOptimized+280<E.resultDelta&&E.resultDelta+280<E.qualification);
});

test('streamed revenue values finish reading before the next dependent action',()=>{
 const leads=[...Object.values(fixtures).flatMap(d=>d.opportunities),{p_self:1,p_sales:1,ae_hours:1e7,bdr_hours:1e7,ev_self:1e9,ev_sales:1e9,incremental_ev:1e9}];
 for(const lead of leads){
  assert.ok(E.selfEV+CALCULATION_DELAY+readingDuration(money(lead.ev_self))<E.salesEV);
  assert.ok(E.salesEV+CALCULATION_DELAY+readingDuration(money(lead.ev_sales))<E.delta);
  assert.ok(E.delta+CALCULATION_DELAY+readingDuration(signedMoney(lead.incremental_ev))<E.deltaEffort);
 }
});

test('navigation waits for the agent handoff before changing views',()=>{
 const chapters=chaptersFor(fixtures.default);
 for(const [chapter,before,after] of [['lead_economics','inbound','allocation'],['cohort_allocation','allocation','results']]){
  const b=chapters.find(c=>c.id===chapter);
  assert.equal(b.tail,chapter==='lead_economics'?2200:3200);
  assert.equal(deriveTimelineState(fixtures.default,b.end-100).view,before);
  assert.equal(deriveTimelineState(fixtures.default,b.end).view,after);
  const paused={...initialPlayback(),time:b.end-500,playing:false};
  assert.equal(playbackReducer(paused,{type:'tick',delta:1000,chapters}).time,paused.time);
  assert.equal(deriveTimelineState(fixtures.default,b.end,true).view,after);
 }
});

test('entering the closing statement plays its word sequence or settles it for static steps',()=>{
 const result=BEATS.at(-1), prior={...initialPlayback(),time:BEATS.at(-2).complete,playing:false};
 for(const action of [{type:'seek',chapter:'result'},{type:'next'}]){
  const entry=playbackReducer(prior,action);
  assert.equal(entry.time,result.at);assert.equal(entry.playing,true);
  const settled=playbackReducer(prior,{...action,reduced:true});
  assert.equal(settled.time,result.complete);assert.equal(settled.playing,false);
 }
});

test('mobile arrival and record preparation follow the inbound narration',()=>{
 const data=fixtures.default;
 const beat=chaptersFor(data,true).find(b=>b.id==='inbound_record');
 const line=narrationFor({chapter:beat.id},data);
 const words=narrationTokens(line.text,line.at,line.rate,line.focal,line.steady);
 const word=name=>words.find(w=>w.text.trim()===name);
 const cues=eventsFor(true);
 assert.equal(cues.arrival,beat.storyAt+Math.round(word('inbound').start));
 assert.equal(cues.openRecord-cues.arrival,2137);
 assert.equal(cues.estimates,cues.openRecord);
 assert.ok(cues.estimates-beat.storyAt>=word('ARR').start && cues.estimates-beat.storyAt<word('ARR').end);
});
