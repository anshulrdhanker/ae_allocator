import {money} from './economics.mjs';
import {leadName,arrivalLead,routeFor} from './selectors.mjs';
import {eventsFor,RECORD_EXPAND_MS,PREPARED_INPUT_HOLD_MS,progress,ease} from './narrative.mjs';
import {AgentHeader, RecordHeader} from './WorkspaceRecord';
import {estimateOperation,ESTIMATE_REVEAL_MS} from './agent-activity.mjs';
import EstimateAgent from './EstimateAgent';
import PitchMechanism from './PitchMechanism';

function smoothStep(p){return p*p*(3-2*p);}

export default function InboundView({data,lead,snapshot,dispatch,mobile=false}){
 const E=eventsFor(mobile);
 const t=snapshot.storyTime,arrival=arrivalLead(data),older=data.opportunities.filter(l=>l.id!==arrival?.id).slice(0,2);
 const operation=lead?estimateOperation(lead,E.estimates):null;
 const agentTime=snapshot.chapter==='inbound_record'?t:Math.max(t,operation?.readyAt??t);
 const activeChapter=['inbound_record','lead_economics'].includes(snapshot.chapter);
 const arrivalDuration=820,settledHold=410;
 const arrived=activeChapter&&t>=E.arrival;
 const inserted=snapshot.reduced?1:smoothStep(progress(t,E.arrival,arrivalDuration));
 const opened=activeChapter&&t>=E.openRecord,comparison=snapshot.chapter==='lead_economics';
 const foldAt=(operation?.committedAt??E.estimates)+ESTIMATE_REVEAL_MS+PREPARED_INPUT_HOLD_MS;
 // Keep the panels on the continuous playback clock across the chapter boundary.
 const inbound=snapshot.chapters.find(b=>b.id==='inbound_record');
 const handoff=inbound?snapshot.time-inbound.at+inbound.storyAt-foldAt:0;
 const foldDuration=700,openAt=foldDuration+250;
 const collapse=snapshot.reduced?Number(comparison):smoothStep(progress(handoff,0,foldDuration));
 const open=snapshot.reduced?Number(comparison):smoothStep(progress(handoff,openAt,920));
 const bodyOpacity=snapshot.reduced?open:smoothStep(progress(handoff,openAt+240,560));
 const economicsTime=comparison?Math.max(t,E.compare):E.compare;
 const cursorStart=E.arrival+arrivalDuration+settledHold, cursorMove=ease(progress(t,cursorStart,750)),cursorExit=ease(progress(t,E.openRecord+700,1000));
 const select=l=>dispatch({type:'select-lead',id:l.id});
 const highlighted=opened?lead?.id:older.at(-1)?.id;
 const record=opened&&lead?.id!==older[1]?.id?lead:null;
 const historical=record&&record.id!==arrival?.id;
 const routedLabel=historical?(routeFor(data,record)==='self'?'Routed to self-service':'Routed to AE'):null;
 const row=l=><button disabled={mobile} className={'queue-row '+(highlighted===l.id?'selected':'')} aria-pressed={highlighted===l.id} data-lead-id={l.id} onClick={()=>select(l)}><span><strong>{leadName(l)}</strong><small>{money(l.arr)} Base ARR</small></span>{l.id===arrival?.id&&t<E.openRecord&&<span className="new-tag">New</span>}</button>;
 return <div className="inbound-screen" data-record-open={Boolean(record)||undefined}>
 <div className="recent-leads"><span>Recent leads</span>{older.map(l=><div key={l.id}>{row(l)}</div>)}{arrival&&arrived&&<div className="arrival-slot" style={{opacity:inserted,transform:inserted<1?`translateX(${(1-inserted)*24}px)`:undefined}}>{row(arrival)}{!snapshot.reduced&&snapshot.chapter==='inbound_record'&&t>=cursorStart&&t<E.openRecord+1700&&<span className="agent-cursor" aria-hidden="true" style={{'--cursor-progress':cursorMove,'--cursor-click':t>=E.openRecord&&t<E.openRecord+180?1:0,'--cursor-exit':cursorExit}}><svg width="21" height="25" viewBox="0 0 21 25"><path d="M3 2v17l4.5-4 3.6 7 3-1.5-3.6-7.1 6.3-.4z" fill="#f5f5fa" stroke="#17171b" strokeWidth="1.5" strokeLinejoin="round"/></svg><span>Agent</span></span>}</div>}</div>
 {!lead?<div className="queue-rest"><h2>No leads in this cohort</h2></div>:!record?null:<div className="inbound-record" style={mobile&&!snapshot.reduced?{opacity:ease(progress(t,E.openRecord,RECORD_EXPAND_MS))}:undefined}><RecordHeader kicker={'INBOUND · '+leadName(record)} title={leadName(record)} description={historical?"Inbound lead routing complete.":"Inbound lead ready for routing analysis."} properties={[
   ['Status',<span><span className="status-dot">◔</span> {routedLabel??"Awaiting allocation"}</span>],
   ['Base ARR',<strong>{money(record.arr)}</strong>]
 ]}/>
 <EstimateAgent mobile={mobile} lead={record} time={historical?Infinity:agentTime} at={E.estimates} reduced={snapshot.reduced} collapse={historical?1:collapse}/>
 {(historical||open>0)&&<div className="reveal" style={{gridTemplateRows:(historical?1:open)+'fr',opacity:historical?1:open}}><div><section className="economics-workbench" aria-label="Routing economics"><AgentHeader task="Route economics"/><div style={{opacity:historical?1:bodyOpacity}}><PitchMechanism mobile={mobile} lead={record} actionLabel={routedLabel??undefined} time={historical?Infinity:economicsTime} reduced={snapshot.reduced} onCompare={()=>dispatch({type:'seek',chapter:'shared_allocation'})}/></div></section></div></div>}</div>}
 </div>;
}
