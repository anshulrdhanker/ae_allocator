import {hours,number,signedMoney} from './economics.mjs';
import {routeFor,leadName} from './selectors.mjs';
import {EVENTS as E,PAIR_ROUTE_STAGGER} from './narrative.mjs';
import {Reveal,RouteChip} from './DocumentPrimitives';
import AgentActivity from './AgentActivity';
import {allocationAction} from './agent-activity.mjs';
export default function DecisionReview({data,rows,time,onCohort,reduced=false}){return <section className="allocation-view"><header className="view-heading"><h2>Allocate within capacity.</h2></header>
 <Reveal time={time} at={E.capacity}><div className="capacity-context"><div><strong>{number(data.configuration.ae_capacity_hours)}</strong><span>AE hours available</span></div><div><strong>{number(data.configuration.bdr_capacity_hours)}</strong><span>BDR hours available</span></div></div></Reveal>
 <AgentActivity className="allocation-activity" time={time} reduced={reduced} steps={[{at:E.capacity,label:`Reviewing ${data.opportunities.length.toLocaleString()} leads`},{at:E.capacity+850,label:'Checking AE and BDR capacity'},{at:E.routes,label:allocationAction(data)}]} completeAt={E.routes+Math.max(0,rows.length-1)*PAIR_ROUTE_STAGGER+200} completeLabel={data.solver.status==='fallback'?'Baseline retained':'Returned allocation applied'}/>
 <div className="example-worklist"><div className="example-columns" aria-hidden="true"><span>Lead</span><span>Potential AE uplift</span><span>AE effort</span><span>Baseline → allocation</span></div>{rows.map((l,i)=><Reveal key={l.id} time={time} at={i?E.secondLead:E.allocation}><div className="example-row" data-lead-id={l.id}><strong className="example-identity">{leadName(l)}</strong><div className="example-value"><span className="mobile-label">Potential AE uplift</span><strong>{signedMoney(l.incremental_ev)}</strong></div><div className="example-effort"><span className="mobile-label">AE effort</span><strong>{hours(l.ae_hours)} h</strong></div><div className="example-routes"><RouteChip route={routeFor(data,l)}/><span className="route-arrow" aria-label="to">→</span>{time>=E.routes+i*PAIR_ROUTE_STAGGER?<RouteChip route={routeFor(data,l,true)} changed={routeFor(data,l)!==routeFor(data,l,true)} time={time} at={E.routes+i*PAIR_ROUTE_STAGGER}/>:<span className="route-pending">—</span>}</div></div></Reveal>)}</div>
 {!rows.length&&<p>No leads to allocate.</p>}
 <Reveal time={time} at={E.sharedDone}><div className="action-row"><button className="primary-action" onClick={onCohort}>View cohort allocation <span>→</span></button></div></Reveal>
 </section>}
