import {money,signedMoney,number,hours} from './economics.mjs';
export const leadName=l=>`Lead ${String(l.id).padStart(3,'0')}`;
export function routeFor(data,lead,computed=false){return (computed?data.optimized_assignments:data.baseline_assignments)[lead.id-1];}
export const routeName=r=>r==='sales'?'Sales support':'Self-service';
export const leadEconomics=lead=>lead?{...lead,ev_self:lead.ev_self??lead.arr*lead.p_self,ev_sales:lead.ev_sales??lead.arr*lead.p_sales,incremental_ev:lead.incremental_ev??lead.arr*(lead.p_sales-lead.p_self)}:null;
export function selectContrastPair(data){
 const valid=(a,b)=>a&&b&&routeFor(data,a)==='sales'&&routeFor(data,a,true)==='self'&&routeFor(data,b)==='self'&&routeFor(data,b,true)==='sales'&&a.ev_sales>b.ev_sales&&b.incremental_ev>a.incremental_ev&&b.ae_hours<=a.ae_hours&&b.bdr_hours<=a.bdr_hours;
 const a=data.opportunities.find(l=>l.id===49),b=data.opportunities.find(l=>l.id===326);
 if(valid(a,b))return [a,b];
 const lost=data.opportunities.filter(l=>routeFor(data,l)==='sales'&&routeFor(data,l,true)==='self').sort((a,b)=>a.id-b.id);
 const gained=data.opportunities.filter(l=>routeFor(data,l)==='self'&&routeFor(data,l,true)==='sales').sort((a,b)=>b.incremental_ev-a.incremental_ev||a.id-b.id);
 for(const a of lost)for(const b of gained)if(valid(a,b))return [a,b];
 return null;
}
export function selectPrimaryLead(data,pair=selectContrastPair(data)){
 return pair?.[0]??data.opportunities.find(l=>l.id===49&&l.incremental_ev>0)??[...data.opportunities].sort((a,b)=>b.incremental_ev-a.incremental_ev||a.id-b.id)[0]??null;
}
export function orderLeads(data){const pair=selectContrastPair(data);const first=pair??[selectPrimaryLead(data,null)].filter(Boolean);const ids=new Set(first.map(l=>l.id));return [...first,...data.opportunities.filter(l=>!ids.has(l.id))];}
export function presentationSummary(data){
 const baseline=data.metrics.traditional,computed=data.metrics.optimized,difference=computed.expected_revenue-baseline.expected_revenue;
 const percent=baseline.expected_revenue>0?100*difference/baseline.expected_revenue:null;
 const qualification=data.solver.status==='optimal'?'Proven optimal':data.solver.status==='feasible'?'Feasible · optimality not proven':'Baseline retained · no verified improvement';
 const format=m=>({...m,revenue:money(m.expected_revenue),ae:hours(m.ae_hours),bdr:hours(m.bdr_hours)});
 return {baseline:format(baseline),computed:format(computed),difference,delta:signedMoney(difference),percent,percentLabel:percent===null?'—':`${percent>0?'+':''}${Math.abs(percent)>0&&Math.abs(percent)<.01?(percent<0?'−<0.01':'<0.01'):number(percent)}%`,qualification,verified:['optimal','feasible'].includes(data.solver.status),changed:data.opportunities.filter(l=>routeFor(data,l)!==routeFor(data,l,true)).length};
}

export function solutionChecks(data,computed=true){
 const selected=computed?data.optimized_assignments:data.baseline_assignments;
 const ae=data.opportunities.reduce((sum,l)=>sum+(selected[l.id-1]==='sales'?l.ae_hours:0),0);
 const bdr=data.opportunities.reduce((sum,l)=>sum+(selected[l.id-1]==='sales'?l.bdr_hours:0),0);
 return [{label:'One route per lead',pass:selected.length===data.opportunities.length&&selected.every(r=>r==='sales'||r==='self'),detail:`${selected.length.toLocaleString()} binary assignments`},
 {label:'AE capacity respected',pass:ae<=data.configuration.ae_capacity_hours+1e-7,detail:`${hours(ae)} / ${number(data.configuration.ae_capacity_hours)} hours`},
 {label:'BDR capacity respected',pass:bdr<=data.configuration.bdr_capacity_hours+1e-7,detail:`${hours(bdr)} / ${number(data.configuration.bdr_capacity_hours)} hours`}];
}

export function worklistLeads(data,primary=selectPrimaryLead(data),pair=selectContrastPair(data)){
 const ids=new Set(),rows=[];
 for(const lead of [primary,...(pair??[]),...data.opportunities])if(lead&&!ids.has(lead.id)){ids.add(lead.id);rows.push(lead);if(rows.length===5)break;}
 return rows;
}
export function assignmentCounts(data){return {baseline:data.baseline_assignments.filter(r=>r==='sales').length,optimized:data.optimized_assignments.filter(r=>r==='sales').length,changed:data.opportunities.filter(l=>routeFor(data,l)!==routeFor(data,l,true)).length};}
export const solverLabel=data=>data.solver.status==='optimal'?'Optimal':data.solver.status==='feasible'?'Feasible · not proven optimal':'Baseline retained';

export const arrivalLead=data=>data.opportunities[Math.min(2,data.opportunities.length-1)]??null;

export function previousInboundLead(data) {
 const arrival = arrivalLead(data);
 return data.opportunities.filter(item => item.id !== arrival?.id).slice(0, 2).at(-1);
}
