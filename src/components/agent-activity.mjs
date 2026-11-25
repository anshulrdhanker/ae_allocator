import {readingTokens,tokenize} from './reading.mjs';
import {money,probability,hours,routeEstimates} from './economics.mjs';

export const AGENT_MOTION={open:280,prepare:1000,settle:60,transfer:160,stagger:90,closeDelay:180,close:320,hold:900};
export const ESTIMATE_REVEAL_MS=450;
export function estimateOperation(lead,at){
 const definitions=[
  ['self','Self-service','Self-service conversion',probability(lead.p_self)],
  ['sales','AE-assisted','AE-assisted conversion',probability(lead.p_sales)],
  ['ae','AE time','AE time required',`${hours(lead.ae_hours)} h`],
  ['bdr','BDR time','BDR effort',`${hours(lead.bdr_hours)} h`],
 ];
 let cursor=at+AGENT_MOTION.prepare;
 const outputs=definitions.map(([key,label,field,value])=>{
  const tokens=readingTokens(`${label} ${value}`,cursor,1.25),split=tokenize(label).length;
  const output={key,label,field,value,at:cursor,end:tokens.at(-1).end,labelTokens:tokens.slice(0,split),valueTokens:tokens.slice(split)};
  cursor=output.end+410;return output;
 });
 const generatedAt=outputs.at(-1).end,writeAt=outputs[0].end+AGENT_MOTION.settle;
 outputs.forEach(output=>{output.transferAt=output.end+AGENT_MOTION.settle;output.commitAt=output.transferAt+AGENT_MOTION.transfer;});
 const committedAt=outputs.at(-1).commitAt,closeAt=committedAt+AGENT_MOTION.closeDelay,doneAt=closeAt+AGENT_MOTION.close;
 return {at,outputs,generatedAt,writeAt,committedAt,closeAt,doneAt,readyAt:doneAt+AGENT_MOTION.hold,
  steps:[{at,label:'Reading lead record'},{at:at+500,label:'Estimating contract values'},{at:at+AGENT_MOTION.prepare,label:'Preparing routing estimates'},{at:generatedAt,label:'Preparing routing estimates'}]};
}

// Spread six visible estimates over the original first-to-last writeback window.
export function modelInputFields(lead,operation){
 const estimates=routeEstimates(lead);
 const fields=[
  {key:'arrSelf',field:'Self-service ARR',value:money(estimates.arr_self)},
  {key:'arrSales',field:'AE-assisted ARR',value:money(estimates.arr_sales)},
  ...operation.outputs.map(({key,field,value})=>({key,field,value})),
 ];
 fields[2].value=probability(estimates.p_self);
 fields[3].value=probability(estimates.p_sales);
 const first=operation.outputs[0].commitAt;
 const interval=(operation.committedAt-first)/(fields.length-1);
 return fields.map((field,i)=>({...field,commitAt:first+i*interval}));
}

// A single checkpoint must also finish a manually selected lead. Cache the
// cohort's longest operation, since returned simulation objects are immutable.
const completionCache=new WeakMap();
export function latestEstimateReady(data,at){
 if(!data?.opportunities.length)return at;
 let byStart=completionCache.get(data);if(!byStart){byStart=new Map();completionCache.set(data,byStart);}
 if(!byStart.has(at))byStart.set(at,Math.max(...data.opportunities.map(lead=>estimateOperation(lead,at).readyAt)));
 return byStart.get(at);
}
export const allocationAction=data=>data.solver.status==='fallback'?'Retaining baseline routes':data.solver.status==='feasible'?'Applying feasible allocation':'Applying optimal allocation';
