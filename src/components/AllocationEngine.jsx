import {EVENTS, ease, progress} from './narrative.mjs';
import {useId, useMemo} from 'react';
import {comparisonFrame, revenueSeries} from './allocation-engine.mjs';
import {hours, money, number} from './economics.mjs';
import {leadName, solverLabel} from './selectors.mjs';
import {AgentHeader} from './WorkspaceRecord';

const compactDollars = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
});
const plot = {left: 38, right: 302, top: 9, bottom: 96};

function RevenueChart({title, description, series, baseline, ceiling, shown, position, total}) {
  const clipId = useId();
  const x = i => plot.left + (plot.right - plot.left) * i / Math.max(1, total);
  const y = value => plot.bottom - (plot.bottom - plot.top) * value / ceiling;
  const paths = useMemo(() => {
    const path = values => values.map((value, i) =>
      (i ? 'L' : 'M') + x(i).toFixed(2) + ',' + y(value).toFixed(2)).join(' ');
    return {line: path(series.revenue), reference: baseline && path(baseline.revenue)};
  }, [series, baseline, ceiling, total]);
  const value = series.revenue[shown];
  const nextValue = series.revenue[Math.min(shown + 1, total)];
  const tip = value + (nextValue - value) * (position - shown);
  return <figure className="revenue-chart">
    <figcaption><strong>{title}</strong><span>{description}</span></figcaption>
    <div className="chart-value">{money(value)}</div>
    <svg viewBox="0 0 310 120" role="img"
      aria-label={title + ', cumulative expected annual revenue at ' + shown + ' leads: ' + money(value)}>
      <defs><clipPath id={clipId}><rect x={plot.left} y="0" width={x(position) - plot.left} height="100"/></clipPath></defs>
      {[0, .5, 1].map(tick => <g key={tick}>
        <line className="chart-grid" x1={plot.left} x2={plot.right} y1={y(tick * ceiling)} y2={y(tick * ceiling)}/>
        <text x={plot.left - 5} y={y(tick * ceiling) + 3} textAnchor="end">{compactDollars.format(tick * ceiling)}</text>
      </g>)}
      <g clipPath={'url(#' + clipId + ')'}>
        {baseline && <path className="chart-reference" d={paths.reference}/>}
        <path className="chart-line" d={paths.line}/>
      </g>
      {position > 0 && <circle cx={x(position)} cy={y(tip)} r="3" fill="currentColor"/>}
      <text x={plot.left} y="113">0</text>
      <text x={(plot.left + plot.right) / 2} y="113" textAnchor="middle">Leads compared</text>
      {total > 0 && <text x={plot.right} y="113" textAnchor="end">{number(total)}</text>}
    </svg>
    <div className="chart-assignments"><span>AE-assisted <b>{number(series.assisted[shown])}</b></span>
      <span>Self-service <b>{number(shown - series.assisted[shown])}</b></span>
      {baseline && <span className="reference-key">Baseline</span>}</div>
  </figure>;
}

export default function AllocationEngine({data, lead, summary, snapshot, onRecord, onCohort}) {
  const total = data.opportunities.length;
  const {policies, ceiling} = useMemo(() => revenueSeries(data, lead), [data, lead]);
  const {position, shown, settled, showDifference} = comparisonFrame(snapshot, total);
  const shared = snapshot.chapter === 'shared_allocation';
  const collapse = shared && !snapshot.reduced ? ease(progress(snapshot.local, 0, 520)) : 1;
  const status = !total ? 'Empty cohort' : settled ? solverLabel(data) : position === 0 ? 'Ready to compare' : 'Comparing routes';
  return <section className="inbound-screen allocation-screen" aria-label="Cohort allocation">
    {lead && <div className="recent-leads allocation-source"><span>Source</span>
      <button className="queue-row selected" onClick={onRecord}><span><strong>{leadName(lead)}</strong><small>{money(lead.arr)} Base ARR</small></span></button>
    </div>}
    <div className="inbound-record">
      <header className="compact-record"><h2>Cohort allocation</h2></header>
      <section className="agent-workbench allocation-workbench" aria-label="Routing Agent simulation">
        <AgentHeader task={settled?'Allocation complete':lead?'Inputs prepared':undefined} status={status}/>
        {lead && collapse < 1 && <div className="input-compression" style={{'--collapse':collapse}}>
          <div className="workbench-body allocation-inputs">{leadName(lead)} · {money(lead.arr)} ARR · {hours(lead.ae_hours)} AE hours</div>
        </div>}
          <div className="comparison-progress"><strong>Cumulative expected annual revenue</strong>
            <span>{number(shown)} / {number(total)} leads</span></div>
          <div className="revenue-plots">
            <RevenueChart title="Baseline" description="Rank by AE-assisted revenue" series={policies[0]} {...{ceiling, shown, position, total}}/>
            <RevenueChart title={summary.verified ? 'MILP allocation' : 'Baseline retained'}
              description={summary.verified ? 'Optimize uplift across the cohort' : 'Returned baseline assignments'}
              series={policies[1]} baseline={policies[0]} {...{ceiling, shown, position, total}}/>
          </div>
          {total > 0 && <div className="simulation-outcome">
            {showDifference?<><span>Incremental expected annual revenue</span><strong>{summary.delta}<small>{summary.percentLabel}</small></strong></>:<><span>{lead ? leadName(lead) + ' · first record' : 'No leads to compare'}</span>
            {snapshot.storyTime >= EVENTS.sharedDone && <button className="primary-action" onClick={onCohort}>
              Compare full cohort <span>→</span></button>}</>}
          </div>}
      </section>

    </div>
  </section>;
}
