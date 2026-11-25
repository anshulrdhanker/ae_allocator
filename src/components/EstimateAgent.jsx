import {AgentHeader} from './WorkspaceRecord';
import {estimateOperation,modelInputFields,ESTIMATE_REVEAL_MS} from './agent-activity.mjs';
import {progress} from './narrative.mjs';

export default function EstimateAgent({lead,time,at,reduced=false,collapse=0}){
 const operation=estimateOperation(lead,at), done=time>=operation.committedAt+ESTIMATE_REVEAL_MS;
 const thinking=time>=at&&time<operation.outputs[0].at;
 const elapsed=Math.max(0,time-at);
 const animate=!done&&!reduced&&time>=at;
 const flip=animate?progress(elapsed%2000,350,950):0;
 const status=done?'✓ Inputs prepared':animate?<><span className="sr-only">Thinking</span><span aria-hidden="true">{Array.from('Thinking',(letter,i)=>{
  const phase=progress(elapsed%1600,i*65,550);
  return <span key={i} style={{display:'inline-block',transform:`translateY(${-1.7*Math.sin(Math.PI*phase)**2}px)`}}>{letter}</span>;
 })}</span></>:'Thinking';
 return <section className="agent-workbench" aria-label="Routing input preparation" data-agent-phase={done?'complete':time<at?'idle':thinking?'thinking':'generating'}>
  <AgentHeader status={status} iconStyle={animate?{display:'inline-block',transform:`rotateY(${180*flip*flip*(3-2*flip)}deg)`}:undefined}/>
  {collapse<1&&<div className="reveal" style={{gridTemplateRows:`${1-collapse}fr`,opacity:1-collapse}}><div><div className="workbench-body"><div className="workbench-trace"><span className="workbench-label">Activity</span>{operation.steps.slice(0,3).map((step,i)=><div key={step.label} className="trace-row" data-active={time>=step.at}><span>{time>=step.at?(time>=(operation.steps[i+1]?.at??operation.committedAt)?'✓':'•'):'·'}</span>{step.label}</div>)}<div className="trace-row" data-active={done}><span>{done?'✓':'·'}</span>Inputs prepared</div></div>
  <div><span className="workbench-label">Model inputs</span><div className="workbench-metrics">{modelInputFields(lead,operation).map(output=>{
   const applied=time>=output.commitAt;
   const reveal=reduced?Number(applied):progress(time,output.commitAt,ESTIMATE_REVEAL_MS);
   return <div className="workbench-metric" data-input={output.key} data-applied={applied} key={output.key}>
    <span>{output.field}</span>
    <strong className="input-value-slot" aria-busy={!applied}>
     {reveal<1&&<span aria-hidden="true" className="estimate-skeleton" data-pulsing={!reduced&&time>=at} style={{opacity:1-reveal}}/>}
     <span aria-hidden={!applied} style={{opacity:reveal}}>{output.value}</span>
    </strong>
   </div>;
  })}</div></div></div></div></div>}
 </section>;
}
