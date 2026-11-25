import {EVENTS as E} from './narrative.mjs';
import {Reveal} from './DocumentPrimitives';
import {solverLabel} from './selectors.mjs';
export default function ResultsLedger({data,time,summary}){const positive=summary.verified&&summary.difference>0;return <section className="results-view"><header className="view-heading"><h2>{positive?<>Better allocation.<br/>Higher expected revenue.</>:<>Allocation results.<br/>Expected annual revenue.</>}</h2></header>
 <Reveal time={time} at={E.report}><div className="policy-result"><span>Baseline</span><strong>{summary.baseline.revenue}</strong></div></Reveal>
 <Reveal time={time} at={E.reportOptimized}><div className="policy-result"><span>{data.solver.status==='fallback'?'Baseline retained':'MILP allocation'}</span><strong>{summary.computed.revenue}</strong></div></Reveal>
 <Reveal time={time} at={E.resultDelta}><div className={'revenue-impact '+(positive?'positive':'')}><span>Additional expected annual revenue</span><strong>{summary.delta}</strong><span className="percent-result">{summary.percentLabel}</span></div>{!positive&&<p className="quiet-note">{!summary.verified?'No verified improvement.':summary.difference<0?'Returned expected revenue is lower than the baseline.':'No measured improvement on this run.'}</p>}{summary.percent===null&&<p className="quiet-note">Percentage unavailable: baseline expected revenue is zero.</p>}</Reveal>
 <Reveal time={time} at={E.qualification}><p className="result-qualification">Same {data.opportunities.length.toLocaleString()} {data.opportunities.length===1?'lead':'leads'} · same AE/BDR capacity limits</p><p className="quiet-note">{solverLabel(data)} · Expected, not realized, revenue.</p></Reveal>
 </section>}
