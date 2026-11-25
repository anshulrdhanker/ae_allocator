import {memo,useLayoutEffect,useRef,useState} from 'react';
import {eventsFor,RECORD_EXPAND_MS,deriveTimelineState,progress,ease} from './narrative.mjs';
import InboundView from './InboundView';
import AllocationEngine from './AllocationEngine';
import {leadName,previousInboundLead} from './selectors.mjs';
// Measure only settled layouts. These inert samples never follow the playhead.
const RecordSizes=memo(function RecordSizes({data,lead,report}){
 const root=useRef(null);
 useLayoutEffect(()=>{
  const measure=()=>report(Math.ceil(Math.max(...Array.from(root.current.children,n=>n.getBoundingClientRect().height))));
  measure();
  const observer=new ResizeObserver(measure);
  for(const child of root.current.children)observer.observe(child);
  return ()=>observer.disconnect();
 },[report]);
 return <div className="record-sizes" ref={root} inert aria-hidden="true">{['inbound_record','lead_economics'].map(chapter=>
  <InboundView key={chapter} data={data} lead={lead} mobile snapshot={{chapter,storyTime:Infinity,time:0,reduced:true,chapters:[]}}/>)}</div>;
});
export default function AgentWorkspace({data,snapshot,lead,summary,controller,error,exiting=false}){
 const {dispatch,state}=controller,{storyTime:t,view,frame}=snapshot;
 const mobile=controller.mobile;
 const E=eventsFor(mobile);
 const [recordHeight,setRecordHeight]=useState(0);
 const expanded=view==='allocation'?1:snapshot.chapter==='inbound_record'?ease(progress(t,E.openRecord,RECORD_EXPAND_MS)):snapshot.chapter==='lead_economics'?1:0;
 const showPrevious=view==='inbound'&&(snapshot.chapter.startsWith('intro_')||t<E.openRecord);
 const record=showPrevious&&data?previousInboundLead(data):lead;
 const previous=useRef(null);
 const [previousPane,setDeparting]=useState(null);
 useLayoutEffect(()=>{
  if(mobile)return;
  if(view==='allocation'&&previous.current?.view==='inbound'&&!snapshot.reduced){
   setDeparting(previous.current);
  }else if(view!=='allocation'||snapshot.reduced){
   setDeparting(null);
  }
  previous.current=snapshot;
 },[snapshot,view,mobile]);
 const phoneSlide=mobile&&!snapshot.reduced&&snapshot.chapter==='shared_allocation'&&snapshot.local<360;
 const departing=mobile?(phoneSlide?deriveTimelineState(data,snapshot.beat.at-1,false,true):null):previousPane;
 const sliding=view==='allocation'&&departing&&!snapshot.reduced;
 const navigate=chapter=>dispatch({type:'seek',chapter});
 const handoffs=[['lead_economics','allocation'],['cohort_allocation','results']];
 const handoff=handoffs.map(([chapter,target])=>({target,beat:snapshot.chapters.find(b=>b.id===chapter)})).find(x=>x.beat&&snapshot.time>=x.beat.end-x.beat.tail&&snapshot.time<x.beat.end+1000);
 const handoffDuration=handoff?.beat.tail??0;
 const navElapsed=handoff?snapshot.time-(handoff.beat.end-handoffDuration):0;
 const navMove=ease(progress(navElapsed,150,900)),navExit=ease(progress(navElapsed,handoffDuration+200,800));
 return <section className="browser-window" aria-label="Routing Agent" data-view={view} style={{'--record-height':lead?recordHeight+'px':'clamp(300px,85vw,380px)','--record-expand':expanded,visibility:frame?'visible':'hidden',transform:`translateY(${(1-frame)*36}px)`,clipPath:frame===1?'none':`inset(0 0 ${(1-frame)*100}% 0 round 12px)`}} inert={!frame||exiting?true:undefined}>
 

 <aside className="workspace-rail"><div className="rail-brand"><span className="brand-symbol">◈</span><strong>Lead routing</strong></div><div className="rail-caption">Workspace</div><nav role="tablist" aria-label="Product views" className="rail-nav">{[['inbound','Inbound','inbound_record','inbox'],['allocation','Allocation','shared_allocation','allocation'],['results','Results','result','results']].map(([id,label,chapter,icon])=><button role="tab" id={'tab-'+id} aria-controls={'view-'+id} aria-selected={view===id} disabled={mobile||!data} key={id} onClick={()=>navigate(snapshot.empty&&id!=='results'?'cohort_allocation':chapter)}><span className={'rail-icon icon-'+icon} aria-hidden="true">{icon==='inbox'?'▣':icon==='allocation'?'◇':'▥'}</span>{label}{!snapshot.reduced&&handoff?.target===id&&<span className="nav-agent-cursor" aria-hidden="true" style={{'--nav-move':navMove,'--nav-exit':navExit,'--nav-click':navElapsed>=handoffDuration-150&&navElapsed<handoffDuration+130?1:0}}><svg width="21" height="25" viewBox="0 0 21 25"><path d="M3 2v17l4.5-4 3.6 7 3-1.5-3.6-7.1 6.3-.4z" fill="#f5f5fa" stroke="#17171b" strokeWidth="1.5" strokeLinejoin="round"/></svg><span>Agent</span></span>}</button>)}</nav><div className="rail-caption rail-cohort">Cohort</div><div className="rail-summary"><span className="rail-summary-dot">◌</span>{data?data.opportunities.length.toLocaleString():'—'} leads</div><div className="rail-footer"><span className="rail-avatar">R</span><span>Routing workspace</span></div></aside>
 <div className="workspace-pane"><header className="workspace-toolbar"><div><span className="toolbar-section">Workspace</span><span className="toolbar-divider">/</span><span>{view==='inbound'?'Inbound':view==='allocation'?'Allocation':'Results'}</span>{view==='inbound'&&record&&<><span className="toolbar-divider">/</span><span className="toolbar-record">{leadName(record)}</span></>}{view==='allocation'&&<><span className="toolbar-divider">/</span><span className="toolbar-record">Cohort</span></>}</div><span className="toolbar-meta">{data?data.opportunities.length.toLocaleString()+' leads':''}</span></header>
 <div className="product-content" data-sliding={sliding?true:undefined}
 data-entering-allocation={sliding && snapshot.chapter==='shared_allocation' && snapshot.local<360 || undefined}
 style={sliding?{'--pane-elapsed':Math.min(snapshot.local,360)+'ms'}:undefined} onFocus={mobile?undefined:()=>dispatch({type:'pause'})}>
 {!data?<div className="empty-view" role="status"><h2>{error?'Unable to prepare the cohort':'Preparing cohort'}</h2><p>{error?'Use Retry to request the calculation.':'Calculating routes.'}</p></div>:<div id={'view-'+view} role="tabpanel" aria-labelledby={'tab-'+view}>
 {view==='inbound'?<InboundView mobile={mobile} data={data} lead={lead} snapshot={snapshot} selectedId={state.selectedId} dispatch={dispatch}/>:<AllocationEngine mobile={mobile} data={data} lead={lead} summary={summary} snapshot={snapshot}
   onRecord={()=>navigate('lead_economics')} onCohort={()=>navigate('cohort_allocation')}/>}
 </div>}
 {sliding&&<div className="departing-pane" inert aria-hidden="true" onAnimationEnd={event=>{if(event.target===event.currentTarget)setDeparting(null)}}>
 <InboundView mobile={mobile} data={data} lead={lead} snapshot={departing} dispatch={dispatch}/></div>}
 </div></div>{mobile&&lead&&<RecordSizes data={data} lead={lead} report={setRecordHeight}/>}</section>;
}
