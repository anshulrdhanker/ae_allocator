import {money,probability,signedMoney,routeEstimates} from './economics.mjs';
import {EVENTS as E,CALCULATION_DELAY} from './narrative.mjs';
import {Reveal,StreamValue} from './DocumentPrimitives';
import {readingDuration} from './reading.mjs';
import AgentActivity from './AgentActivity';
const slackActionLabel = "Routing to AE via Slack";
export default function PitchMechanism({lead,time,onCompare,actionLabel=slackActionLabel,reduced=false}){
 const estimates=routeEstimates(lead);
 return <div className="lead-economics"><h3>Expected annual revenue</h3>
 <AgentActivity className="calculation-activity" time={time} reduced={reduced} steps={[{at:E.compare,label:'Calculating self-service value'},{at:E.salesEV,label:'Calculating AE-assisted value'},{at:E.delta,label:'Calculating incremental value'}]} completeAt={E.delta+CALCULATION_DELAY+readingDuration(signedMoney(estimates.lift))} completeLabel="Route values calculated"/>
 <Reveal time={time} at={E.selfEV}><div className="calculation-row"><div><span>Self-service</span><small>{money(estimates.arr_self)} × {probability(estimates.p_self)}</small></div><strong><StreamValue fade={700} reduced={reduced} value={money(estimates.selfRevenue)} time={time} at={E.selfEV+CALCULATION_DELAY} placeholder="Calculating…"/></strong></div></Reveal>
 <Reveal time={time} at={E.salesEV}><div className="calculation-row"><div><span>With AE support</span><small>{money(estimates.arr_sales)} × {probability(estimates.p_sales)}</small></div><strong><StreamValue fade={700} reduced={reduced} value={money(estimates.salesRevenue)} time={time} at={E.salesEV+CALCULATION_DELAY} placeholder="Calculating…"/></strong></div></Reveal>
 <Reveal time={time} at={E.delta}><div className="calculation-row net-uplift"><div><span>Incremental expected revenue</span><small>Expected revenue is calculated using the unrounded backend probabilities.</small></div><strong><StreamValue fade={700} reduced={reduced} value={signedMoney(estimates.lift)} time={time} at={E.delta+CALCULATION_DELAY} placeholder="Calculating…"/></strong></div></Reveal>
 <Reveal time={time} at={E.economicsDone}><div className="economics-footer"><div className="action-row"><button className="primary-action" onClick={onCompare}>{actionLabel} {actionLabel === slackActionLabel ? <img src="/slack-icon.svg" width="14" height="14" alt=""/> : <span>→</span>}</button></div></div></Reveal>
 </div>}
