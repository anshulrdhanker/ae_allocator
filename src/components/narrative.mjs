import {money} from './economics.mjs';
import {narrationDuration} from './intro.mjs';
import {READING,readingTokens} from './reading.mjs';
import {latestEstimateReady} from './agent-activity.mjs';
export const clamp=x=>Math.min(1,Math.max(0,x));
export const progress=(time,at,duration=300)=>clamp((time-at)/duration);
export const ease=p=>1-Math.pow(1-clamp(p),3);

const definitions=[['intro_problem',8000],['intro_question',8000],['inbound_record',15000],['lead_economics',12000],['shared_allocation',15000],['cohort_allocation',12000],['result',15000]];
export const INTRO_DOCK_MS=1100,INTRO_AFTER_DOCK_MS=1000,INTRO_AFTER_BROWSER_MS=800,INTRO_BROWSER_ENTER_MS=850;
const dockAt=14200,frameAt=dockAt+INTRO_DOCK_MS+INTRO_AFTER_DOCK_MS;

// Keep the original cursor approach and hover intervals after the lead appears.
const arrival=17257,openRecord=arrival+2137;
export const EVENTS={
 dock:dockAt,frame:frameAt,frameDone:frameAt+INTRO_BROWSER_ENTER_MS,
 arrival,openRecord,estimates:openRecord,estimateSelf:27250,estimateSales:28050,effort:28600,compareAction:29600,
 compare:31550,selfEV:32000,salesEV:35000,delta:38000,deltaEffort:40500,economicsDone:41800,
 allocation:50300,secondLead:50900,capacity:52600,routes:54700,sharedDone:56200,
 cohort:64000,optimized:65600,aggregate:67200,usage:68700,cohortDone:69100,
 results:76700,report:76700,reportOptimized:77600,resultDelta:79400,qualification:81400,finalHold:81700,
};
export const PREPARED_INPUT_HOLD_MS=2000;
export const SIMULATION_LEAD_IN_MS=1020;
const NARRATION_LEAD_IN_MS=550;
export const NAV_HANDOFF_MS=3200;
export const WORKSPACE_EXIT_MS=650;
const BENCHMARK_INTRO_AT=WORKSPACE_EXIT_MS+NARRATION_LEAD_IN_MS;
export function benchmarkTiming(line){
 const firstCard=line.at+line.duration+350;
 const cards=Array.from({length:4},(_,i)=>firstCard+i*330);
 const conclusion=cards[3]+550;
 const footer=conclusion+500;
 return {cards,conclusion,footer,end:Math.ceil(footer+400)};
}
export const CALCULATION_DELAY=520,PAIR_ROUTE_STAGGER=500,COHORT_ROUTE_STAGGER=240;
const firstAction={intro_question:EVENTS.dock,inbound_record:EVENTS.arrival,lead_economics:EVENTS.compare,shared_allocation:EVENTS.allocation,cohort_allocation:EVENTS.cohort,result:EVENTS.results};

export function finalNarration(data,summary){
 if(!data.opportunities.length)return 'There are no leads in this cohort, so neither routing policy generates expected revenue.';
 if(!summary.verified)return 'The solver retained the baseline allocation. There is no verified improvement to report.';
 if(summary.difference===0)return 'With the same leads and sales capacity, both allocations generated the same expected annual revenue.';
 if(summary.difference<0)return `With the same leads and sales capacity, the returned allocation generated ${money(Math.abs(summary.difference))} less in expected annual revenue.`;
 if(summary.percent==null)return `The agent generated ${money(summary.difference)} more expected annual revenue than the baseline.`;
 return `Given the same sales capacity, the agent generated ${summary.percent.toFixed(2)}% more expected annual revenue than a baseline routing rule.`;
}
function summaryForNarration(data){
 const baseline=data.metrics.traditional.expected_revenue,difference=data.metrics.optimized.expected_revenue-baseline;
 return {difference,percent:baseline>0?100*difference/baseline:null,verified:['optimal','feasible'].includes(data.solver.status)};
}
export function narrationFor(snapshot,data,summary){
 const n=data?.opportunities.length??0;
 const lines={intro_problem:"Anthropic's BDRs decide which inbound leads need an AE and which can convert through self-service.",intro_question:"I built an AI agent that uses an optimization algorithm (mixed integer linear programming) to allocate Ant's limited sales capacity to where it generates the highest expected revenue.",inbound_record:'We start with a single inbound lead. The agent estimates its potential ARR and conversion probability under each route, along with the sales effort required.',lead_economics:'Next, the agent calculates the incremental expected revenue from human sales intervention, accounting for both conversion uplift and contract expansion.',shared_allocation:'Given those estimates, the agent uses mixed-integer linear programming to find the combination of leads that maximizes expected revenue within available BDR and AE capacity.',cohort_allocation:n?`I simulated this across ${n.toLocaleString()} synthetic ${n===1?'lead':'leads'}. ${finalNarration(data,summary??summaryForNarration(data))}`:'This simulated cohort is empty, so there are no routing assignments to compare.',result:'I benchmarked the MILP allocation against four simpler routing strategies using the same simulation and the same sales-capacity constraints.'};
 if(n===1&&snapshot.chapter==='shared_allocation')lines.shared_allocation='With one lead in this cohort, the algorithm checks whether AE involvement adds value and fits within both available time budgets.';
 const text=lines[snapshot.chapter];
 const focal={intro_problem:['decide','self-service'],intro_question:['optimization','limited'],inbound_record:['model','probabilities'],lead_economics:['increase','additional'],shared_allocation:['programming','optimal'],cohort_allocation:['simulated','baseline'],result:['optimized','improvement']}[snapshot.chapter];
 const rate=snapshot.chapter.startsWith('intro_')?1:2;
 const readingMs=narrationDuration(text);
 const steady=['inbound_record','lead_economics','shared_allocation','result'].includes(snapshot.chapter);
 const speechDuration=steady?readingTokens(text,0,rate,true).at(-1).end:readingMs/rate;
 return {text,rate,readingMs,steady,liftThirdLine:snapshot.chapter==='shared_allocation',at:snapshot.chapter==='intro_problem'?450:snapshot.chapter==='intro_question'?1250:snapshot.chapter==='result'?BENCHMARK_INTRO_AT:NARRATION_LEAD_IN_MS,duration:speechDuration+(snapshot.chapter==='inbound_record'?1000:0)+(snapshot.chapter==='lead_economics'?400:0),focal};
}
export function narrationPlayback(snapshot, data) {
 const {beat, chapters, local, reduced, time} = snapshot;
 if (!reduced && (beat.id === 'shared_allocation' || beat.id === 'cohort_allocation')) {
  const shared = chapters.find(chapter => chapter.id === 'shared_allocation');
  if (shared) {
   const cue = shared.at + SIMULATION_LEAD_IN_MS - NARRATION_LEAD_IN_MS;
   if (time >= cue) return {beat: chapters.find(chapter => chapter.id === 'cohort_allocation'), local: time - cue};
  }
 }
 if (!reduced && (beat.id === 'lead_economics' || beat.id === 'shared_allocation')) {
  const economics = chapters.find(chapter => chapter.id === 'lead_economics');
  const allocation = chapters.find(chapter => chapter.id === 'shared_allocation');
  const line = narrationFor({chapter: economics.id}, data);
  const handoff = Math.min(allocation.at, economics.at + line.at + line.duration + 2500);
  if (time >= handoff) return {beat: allocation, local: time - handoff};
 }
 return {beat, local};
}

export function chaptersFor(data){
 let at=0,storyAt=0;
 return definitions.flatMap(([id,duration])=>{
  const sourceAt=storyAt;storyAt+=duration;
  if(data?.opportunities.length===0&&['inbound_record','lead_economics','shared_allocation'].includes(id))return [];
  const line=narrationFor({chapter:id},data);
  // Budget reading time independently of reveal speed so workspace actions keep their pacing.
  const comparing=id==='shared_allocation'||id==='cohort_allocation';
  const storyRate=comparing||id==='result'?2:1;
  const delay=id==='result'
   ? 0
   : comparing||['inbound_record','lead_economics'].includes(id)?0:Math.ceil(Math.max(id==='intro_question'?6679:0,line.at+line.readingMs+READING.afterNarrationMs-((firstAction[id]??sourceAt+duration)-sourceAt))); 
  const tail=id==='intro_question'?Math.max(0,EVENTS.frameDone+INTRO_AFTER_BROWSER_MS-sourceAt-duration):id==='lead_economics'?2200:id==='cohort_allocation'?NAV_HANDOFF_MS:0;
  let actual=id==='inbound_record'&&data
   ? Math.ceil(Math.max(latestEstimateReady(data,EVENTS.estimates)-sourceAt+400+PREPARED_INPUT_HOLD_MS,line.at+line.duration+READING.afterNarrationMs))
   : duration/storyRate+delay+tail;
  // With narration running alongside the charts, only a short totals hold is needed.
  if(id==='cohort_allocation'&&data?.opportunities.length) actual-=3000;
  if(id==='result')actual=benchmarkTiming(line).end;
  const b={id,at,storyAt:sourceAt,duration:actual,storyDuration:duration,storyRate,delay,tail,end:at+actual,complete:at+actual-(id==='result'?0:100)};
  at+=actual;return [b];
 });
}
export const BEATS=chaptersFor(null),TOTAL_DURATION=BEATS.at(-1).end,INTRO_DURATION=BEATS[1].at+BEATS[1].delay+(EVENTS.frameDone-BEATS[1].storyAt)/BEATS[1].storyRate;
export const beatAt=(time,chapters=BEATS)=>chapters.find(b=>time<b.end)??chapters.at(-1);
export function deriveTimelineState(data,time,reduced=false){
 const chapters=chaptersFor(data),beat=beatAt(time,chapters),local=time-beat.at;
 const t=beat.storyAt+Math.max(0,local-beat.delay)*beat.storyRate;
 // The entrance stays complete when later chapters resume their own story cues.
 const introTime=chapters[1].storyAt+Math.max(0,time-chapters[1].at-chapters[1].delay)*chapters[1].storyRate;
 return {chapter:beat.id,beat,chapters,time,local,storyTime:t,empty:data?.opportunities.length===0,done:time>=chapters.at(-1).end,view:beat.id==='result'?'results':['shared_allocation','cohort_allocation'].includes(beat.id)?'allocation':'inbound',cohort:t>=EVENTS.cohort,frame:ease(progress(introTime,EVENTS.frame,INTRO_BROWSER_ENTER_MS)),dock:ease(progress(introTime,EVENTS.dock,INTRO_DOCK_MS)),pointer:null,reduced};
}
