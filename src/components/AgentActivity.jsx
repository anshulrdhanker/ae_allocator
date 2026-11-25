// All motion is sampled from the presentation clock, including the activity mark.
export default function AgentActivity({time,steps,completeAt,completeLabel='Complete',reduced=false,className='',mobile=false}){
 const started=time>=steps[0].at,done=time>=completeAt;
 const step=[...steps].reverse().find(step=>time>=step.at)??steps[0];
 const changeAt=done?completeAt:step.at;
 const opacity=mobile&&!reduced ? .5+.5*Math.max(0,Math.min(1,(time-changeAt)/300)) : 1;
 return <div className={'agent-activity '+className} data-state={!started?'pending':done?'complete':'working'} style={{opacity,visibility:started?'visible':'hidden'}} role="status" aria-live="polite">
  <span className="agent-activity-mark" aria-hidden="true">{done?'✓':[0,1,2].map(i=><i key={i} style={{transform:`scaleY(${reduced?0.65:0.3+0.7*(1+Math.sin((time-steps[0].at)/220-i*.9))/2})`}}/>)}</span>
  <span>{done?completeLabel:step.label}</span>
 </div>;
}
