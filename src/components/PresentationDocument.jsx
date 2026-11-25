import {useMemo} from 'react';
import {deriveTimelineState,narrationFor,narrationPlayback,benchmarkTiming,ease,EVENTS,WORKSPACE_EXIT_MS} from './narrative.mjs';
import {arrivalLead,presentationSummary} from './selectors.mjs';
import TextGenerationIntro from './TextGenerationIntro';
import AgentWorkspace from './AgentWorkspace';
import BenchmarkPage from './BenchmarkPage';
import ModelAppendix from './ModelAppendix';
const verifyWithClaudeUrl = "https://claude.ai/new?q=Independently%20evaluate%20the%20mathematical%20validity%20and%20practical%20applicability%20of%20the%20following%20approach%20to%20optimizing%20enterprise%20inbound%20lead%20routing.%0A%0AProblem%0A%0AAn%20enterprise%20GTM%20team%20receives%20inbound%20leads%20that%20can%20either%20convert%20through%20self-service%20or%20receive%20human%20sales%20attention%20from%20a%20BDR%20and%20account%20executive%20(AE).%0A%0AGiven%20limited%20sales%20capacity%2C%20the%20objective%20is%20to%20determine%20which%20combination%20of%20leads%20should%20receive%20human%20intervention%20to%20maximize%20total%20expected%20annual%20recurring%20revenue%20(ARR).%0A%0AModel%20inputs%0A%0AFor%20each%20lead%20i%2C%20the%20agent%20estimates%3A%0A%0A-%20R_self%3A%20Potential%20ARR%20through%20self-service.%0A-%20R_AE%3A%20Potential%20ARR%20with%20AE%20involvement.%0A-%20P_self%3A%20Probability%20of%20converting%20through%20self-service.%0A-%20P_AE%3A%20Probability%20of%20converting%20with%20AE%20involvement.%0A-%20b_i%3A%20Required%20BDR%20hours.%0A-%20a_i%3A%20Required%20AE%20hours.%0A%0AThe%20model%20accounts%20for%20human%20sales%20intervention%20potentially%20increasing%20both%20conversion%20probability%20and%20contract%20value.%0A%0Alogic%0A%0AExpected%20self-service%20revenue%3A%0A%0AEV_self%20%3D%20R_self%20%C3%97%20P_self%0A%0AExpected%20AE-assisted%20revenue%3A%0A%0AEV_AE%20%3D%20R_AE%20%C3%97%20P_AE%0A%0AIncremental%20expected%20revenue%20attributable%20to%20human%20intervention%3A%0A%0A%CE%94EV_i%20%3D%20EV_AE%20%E2%88%92%20EV_self%0A%0AThe%20principle%20is%20that%20sales%20capacity%20should%20be%20allocated%20according%20to%20the%20incremental%20revenue%20it%20creates%2C%20rather%20than%20the%20total%20revenue%20potential%20of%20a%20customer.%0A%0AMathematical%20optimization%0A%0AThe%20agent%20formulates%20the%20allocation%20as%20a%20mixed-integer%20linear%20programming%20(MILP)%20problem.%0A%0AEach%20lead%20receives%20a%20binary%20decision%20variable%20x_i%3A%0A%0A-%20x_i%20%3D%200%3A%20Self-service.%0A-%20x_i%20%3D%201%3A%20BDR%20and%20AE-assisted.%0A%0AObjective%3A%0A%0AMaximize%20%CE%A3%20%5BEV_self%2Ci%20%2B%20x_i%20%C3%97%20%CE%94EV_i%5D%0A%0ASince%20self-service%20expected%20revenue%20is%20constant%20across%20allocations%2C%20this%20is%20equivalent%20to%3A%0A%0AMaximize%20%CE%A3%20(x_i%20%C3%97%20%CE%94EV_i)%0A%0ASubject%20to%3A%0A%0A-%20%CE%A3%20(x_i%20%C3%97%20b_i)%20%E2%89%A4%20available%20BDR%20hours.%0A-%20%CE%A3%20(x_i%20%C3%97%20a_i)%20%E2%89%A4%20available%20AE%20hours.%0A-%20x_i%20%E2%88%88%20%7B0%2C%201%7D%20for%20every%20lead.%0A%0AThe%20problem%20is%20solved%20using%20SciPy's%20MILP%20implementation%20and%20the%20HiGHS%20solver.%0A%0AUnlike%20a%20greedy%20ranking%20algorithm%2C%20the%20solver%20evaluates%20the%20allocation%20collectively%2C%20accounting%20for%20the%20opportunity%20cost%20of%20assigning%20limited%20sales%20resources%20to%20individual%20leads.%0A%0A%23%23%20Simulation%20assumptions%0A%0AThe%20model%20is%20tested%20using%201%2C000%20synthetic%20inbound%20leads%2C%20with%20an%20average%20base%20potential%20ARR%20of%20%24100%2C000%20and%20shared%20capacity%20constraints%20of%20150%20BDR%20hours%20and%20600%20AE%20hours.%0A%0APotential%20ARR%20follows%20a%20right-skewed%20lognormal%20distribution.%20Purchase%20intent%20and%20customer%20complexity%20are%20modeled%20using%20beta%20distributions.%20Required%20sales%20effort%20varies%20across%20customers.%0A%0AThree%20synthetic%20customer%20profiles%20represent%20heterogeneous%20responses%20to%20human%20intervention%3A%0A%0A-%20Self-service%20ready%20(50%25)%3A%20High%20independent%20conversion%20probability%20and%20limited%20benefit%20from%20human%20intervention.%0A-%20Sales-dependent%20(35%25)%3A%20Lower%20independent%20conversion%20probability%20but%20substantial%20potential%20conversion%20uplift%20and%20contract%20expansion%20through%20human%20sales.%0A-%20Low%20intent%20(15%25)%3A%20Relatively%20low%20conversion%20probability%20under%20either%20route.%0A%0Ai%20acknowledge%20that%20These%20are%20hypothetical%20assumptions%2C%20not%20Anthropic's%20internal%20customer%20data%2C%20but%20i%20ran%20a%20simulation%20as%20a%20proof%20of%20concept%0A%0Asimulation%20results%0A%0AAll%20routing%20strategies%20receive%20identical%20lead%20estimates%20and%20capacity%20constraints.%0A%0A%7C%20Routing%20strategy%20%7C%20Expected%20ARR%20%7C%0A%7C%20---%20%7C%20---%20%7C%0A%7C%20Rank%20by%20AE-assisted%20expected%20revenue%20%7C%20%2444%2C412%2C470%20%7C%0A%7C%20Rank%20by%20incremental%20expected%20revenue%20%7C%20%2447%2C845%2C183%20%7C%0A%7C%20Rank%20by%20incremental%20revenue%20per%20AE%20hour%20%7C%20%2447%2C315%2C645%20%7C%0A%7C%20Rank%20by%20incremental%20revenue%20relative%20to%20combined%20resource%20consumption%20%7C%20%2448%2C251%2C963%20%7C%0A%7C%20MILP%20allocation%20%7C%20%2448%2C419%2C621%20%7C%0A%0AThe%20reported%20MILP%20allocation%20produces%209.02%25%20more%20expected%20revenue%20than%20the%20original%20revenue-based%20baseline%20and%200.35%25%20more%20than%20the%20strongest%20tested%20heuristic%2C%20with%20a%20reported%20optimality%20gap%20of%200.00%25%20and%20no%20capacity%20violations.%0A%0AProduction%20considerations%0A%0AThe%20optimization%20assumes%20that%20route-specific%20conversion%20probabilities%2C%20contract%20values%20and%20required%20sales%20effort%20can%20be%20estimated%20reliably.%0A%0AIn%20production%2C%20these%20estimates%20would%20need%20to%20be%20informed%20by%20CRM%20data%2C%20product%20usage%2C%20customer%20characteristics%2C%20historical%20sales%20outcomes%20and%20causal%20uplift%20modeling.%20The%20simulation%20demonstrates%20the%20allocation%20mechanism%20rather%20than%20establishing%20an%20empirical%20revenue%20improvement%20for%20Anthropic.%0A%0AMy%20ask%20to%20you%0A%0AIndependently%20assess%20this%20approach%3A%0A%0A1.%20Is%20the%20economic%20reasoning%20logically%20sound%3F%0A2.%20Is%20the%20mathematical%20formulation%20correct%3F%0A3.%20Would%20this%20approach%20be%20capable%20of%20improving%20enterprise%20sales%20resource%20allocation%20in%20practice%3F%0A4.%20Are%20there%20any%20fundamental%20flaws%20or%20assumptions%20that%20would%20prevent%20it%20from%20working%3F%0A%0ADistinguish%20mathematical%20optimality%20from%20the%20reliability%20of%20the%20underlying%20estimates.%20Do%20not%20treat%20the%20reported%20simulation%20results%20as%20independently%20verified%20without%20reproducing%20them.%0A%0ARespond%20in%20no%20more%20than%20150%20words.%20Be%20direct%2C%20technically%20rigorous%20and%20objective.%20Begin%20with%20your%20overall%20verdict.";

function formatPlaybackTime(milliseconds){
 const seconds=Math.floor(milliseconds/1000);
 return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
}
export default function PresentationDocument({data,controller,onParameters,busy=false,error=''}){
 const {state,dispatch,speed,setSpeed,reduced,setReduced,osReduced,suspended}=controller;
 const lead=useMemo(()=>data?(data.opportunities.find(l=>l.id===state.selectedId)??arrivalLead(data)):null,[data,state.selectedId]);
 const summary=useMemo(()=>data?presentationSummary(data):null,[data]);
 const current=deriveTimelineState(data,state.time,reduced,controller.mobile);
 const duration=current.chapters.at(-1).end;
 const introBeat=current.chapters[1];
 const allocation=current.chapters.find(b=>b.id==='shared_allocation'||b.id==='cohort_allocation');
 const screenChanges=[
  introBeat.at+introBeat.delay+(EVENTS.frame-introBeat.storyAt)/introBeat.storyRate,
  allocation.at,
  current.chapters.at(-1).at
 ];
 const elapsed=Math.min(state.time,duration);
 const isResult=current.chapter==='result';
 const exiting=isResult&&!reduced&&current.local<WORKSPACE_EXIT_MS;
 const closing=isResult&&!exiting;
 // A manual Results click can originate anywhere in the workspace. Keep that
 // exact frame mounted while it leaves; autoplay leaves the last cohort frame.
 const exitFrom=exiting?(state.resultFrom??current.beat.at-1):null;
 const outgoing=useMemo(()=>exitFrom===null?null:deriveTimelineState(data,exitFrom,reduced,controller.mobile),[data,exitFrom,reduced,controller.mobile]);
 const snapshot=outgoing??current;
 const narration=narrationPlayback(snapshot,data);
 const line=narrationFor({chapter:narration.beat.id},data,summary);
 const previousBeat=snapshot.chapters[snapshot.chapters.indexOf(narration.beat)-1];
 const previousLine=previousBeat?narrationFor({chapter:previousBeat.id},data,summary):null;
 const openingPhase=snapshot.chapter==='intro_problem'?'first':snapshot.chapter==='intro_question'?'second':previousBeat?.id==='intro_question'?'exit':null;
 const opening=openingPhase?{phase:openingPhase,handoffTime:state.time-snapshot.chapters[1].at,dock:snapshot.dock,dockElapsed:snapshot.storyTime-EVENTS.dock,first:narrationFor({chapter:'intro_problem'},data,summary),second:narrationFor({chapter:'intro_question'},data,summary)}:null;
 const mobile=controller.mobile;
 const reservedLines=useMemo(()=>mobile?snapshot.chapters.filter(b=>b.id!=='result').map(b=>narrationFor({chapter:b.id},data,summary).text):null,[mobile,data,summary]);
 const footerReady=closing&&(reduced||current.local>=benchmarkTiming(line).end);
 const profiles=(atEnd=false)=><nav className={atEnd?"closing-links":"app-header"} aria-label={atEnd?"Social profiles":"Methodology and social profiles"}>
   {!atEnd&&<><a className="methodology-label" href={verifyWithClaudeUrl} target="_blank" rel="noopener noreferrer">
     {mobile?'Verify method on Claude':'Verify with Claude'}
     <svg aria-hidden="true" width="16" height="10" viewBox="0 0 16 10" shapeRendering="crispEdges">
       <path fill="#d97757" fillRule="evenodd" d="M2 0h12v4h2v2h-2v2h-1v2h-1V8h-1v2h-1V8H6v2H5V8H4v2H3V8H2V6H0V4h2z M4 2v2h1V2z M11 2v2h1V2z"/>
     </svg>
   </a><span aria-hidden="true">|</span></>}
   <a href="https://www.linkedin.com/in/anshul-dhanker/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
   <span aria-hidden="true">|</span>
   <a href="https://x.com/anshul_dhanker" target="_blank" rel="noopener noreferrer">X</a>
  </nav>;
 return <article className="routing-presentation" data-footer-ready={footerReady||undefined} data-beat={current.chapter} data-workspace-exiting={exiting||undefined} data-playhead={Math.round(state.time)} data-playing={state.playing&&!suspended} style={{'--dock':snapshot.dock}}>
 {!closing&&<div className="presentation-slide" style={exiting?{display:'block',opacity:1-ease(current.local/WORKSPACE_EXIT_MS),transform:`translateY(${18*ease(current.local/WORKSPACE_EXIT_MS)}px)`}:undefined}>
 {profiles()}
 <TextGenerationIntro reservedLines={reservedLines} line={line} previousLine={previousLine} opening={opening} time={narration.local} reduced={reduced} showThinking={snapshot.chapter.startsWith('intro_')}/>
 <AgentWorkspace exiting={exiting} data={data} snapshot={snapshot} lead={lead} summary={summary} controller={controller} busy={busy} error={error}/>
 {mobile&&reduced&&<nav className="static-navigation" aria-label="Read presentation steps">
  <button disabled={current.chapter==='intro_problem'} onClick={()=>dispatch({type:'back'})}>Previous step</button>
  <button disabled={!data} onClick={()=>dispatch({type:'next'})}>Next step</button>
 </nav>}
 <nav className="transport" aria-label="Presentation playback"><button disabled={state.time===0} onClick={()=>dispatch({type:'back'})}>Back</button>{!reduced&&<button disabled={snapshot.done} onClick={()=>dispatch({type:'toggle'})}>{state.playing?'Pause':'Play'}</button>}<button disabled={snapshot.done||(!data&&snapshot.chapter!=='intro_problem')} onClick={()=>dispatch({type:'next'})}>Next</button>{!closing&&<button onClick={()=>dispatch({type:'replay',reduced})}>Replay</button>}<label><span className="speed-caption">Speed</span> <select aria-label="Playback speed" value={speed} disabled={reduced} onChange={e=>setSpeed(Number(e.target.value))}>{[.5,1,1.2,1.5,2].map(s=><option key={s} value={s}>{s}×</option>)}</select></label>
 <div className="playback-timeline">
  <div className="playback-track">
   {data&&<div className="screen-ticks" aria-hidden="true">{screenChanges.map(at=><span key={at} style={{left:(100*at/duration)+'%'}}/>)}</div>}
  <input type="range" aria-label="Presentation timeline" min="0" max={duration} step="any" value={elapsed}
   disabled={!data} aria-valuetext={formatPlaybackTime(elapsed)+' of '+formatPlaybackTime(duration)}
   style={{'--played':(100*elapsed/duration)+'%'}}
   onChange={e=>dispatch({type:'seek-time',time:e.target.valueAsNumber,keepPlaying:true})}/>
  </div>
  <span className="playback-time">{formatPlaybackTime(elapsed)} / {data?formatPlaybackTime(duration):'–:––'}</span>
 </div>
 <label className="motion-toggle"><input type="checkbox" checked={reduced} disabled={!!osReduced} onChange={e=>setReduced(e.target.checked)}/>Static steps</label></nav>
 </div>}
 {closing&&data&&<BenchmarkPage data={data} line={line} time={current.local} reduced={reduced}>
   <div className="closing-actions"><button aria-label="Replay presentation" title="Replay presentation" onClick={()=>dispatch({type:'replay',reduced})}>
     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10a8 8 0 1 1 .8 6M4 4v6h6"/></svg>
   </button><span aria-hidden="true">|</span>{profiles(true)}</div>
 </BenchmarkPage>}
 {!mobile&&!isResult&&data&&snapshot.frame===1&&<ModelAppendix onParameters={onParameters} data={data} summary={summary} onInspect={()=>dispatch({type:'pause'})}/>}
 </article>;
}
