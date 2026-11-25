import {EVENTS, ease, progress} from './narrative.mjs';
import {useId, useMemo, useRef, useLayoutEffect, useState} from 'react';
import {comparisonFrame, revenueSeries} from './allocation-engine.mjs';
import {hours, money, number} from './economics.mjs';
import {leadName, solverLabel} from './selectors.mjs';
import {AgentHeader} from './WorkspaceRecord';

const compactDollars = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
});


function RevenueChart({title, description, series, baseline, ceiling, shown, position, total, mobile}) {
  const clipId = useId();
  const plotSlot=useRef(null);
  const [size,setSize]=useState({width:310,height:120});
  useLayoutEffect(()=>{
    if(!mobile)return;
    const observer=new ResizeObserver(([entry])=>{
      const {width,height}=entry.contentRect;
      if(width>0&&height>0)setSize({width,height});
    });
    observer.observe(plotSlot.current);
    return ()=>observer.disconnect();
  },[mobile]);
  const {width,height}=mobile?size:{width:310,height:120};
  const plot=mobile?{left:3,right:width-3,top:3,bottom:height-3}:{left:38,right:width-8,top:9,bottom:height-24};
  const x = i => plot.left + (plot.right - plot.left) * i / Math.max(1, total);
  const y = value => plot.bottom - (plot.bottom - plot.top) * value / ceiling;
  const paths = useMemo(() => {
    const path = values => values.map((value, i) =>
      (i ? 'L' : 'M') + x(i).toFixed(2) + ',' + y(value).toFixed(2)).join(' ');
    return {line: path(series.revenue), reference: baseline && path(baseline.revenue)};
  }, [series, baseline, ceiling, total,width,height,mobile]);
  const value = series.revenue[shown];
  const nextValue = series.revenue[Math.min(shown + 1, total)];
  const tip = value + (nextValue - value) * (position - shown);
  const graph=<svg viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={title + ', cumulative expected annual revenue at ' + shown + ' leads: ' + money(value)}>
      <defs><clipPath id={clipId}><rect x={plot.left} y="0" width={x(position) - plot.left} height={mobile?height:height-20}/></clipPath></defs>
      {[0, .5, 1].map(tick => <g key={tick}>
        <line className="chart-grid" x1={plot.left} x2={plot.right} y1={y(tick * ceiling)} y2={y(tick * ceiling)}/>
        {!mobile&&<text x={plot.left - 5} y={y(tick * ceiling) + 3} textAnchor="end">{compactDollars.format(tick * ceiling)}</text>}
      </g>)}
      <g clipPath={'url(#' + clipId + ')'}>
        {baseline && <path className="chart-reference" d={paths.reference}/>}
        <path className="chart-line" d={paths.line}/>
      </g>
      {position > 0 && <circle cx={x(position)} cy={y(tip)} r="3" fill="currentColor"/>}
      {!mobile&&<><text x={plot.left} y={height-7}>0</text>
      <text x={(plot.left + plot.right) / 2} y={height-7} textAnchor="middle">Leads compared</text>
      {total > 0 && <text x={plot.right} y={height-7} textAnchor="end">{number(total)}</text>}</>}
    </svg>;
  const heading=<>
    <figcaption><strong>{title}</strong><span>{description}</span></figcaption>
    <div className="chart-value">{money(value)}</div>
  </>;
  return <figure className="revenue-chart">
    {mobile?<div className="chart-heading">{heading}</div>:heading}
    {mobile?<div className="phone-chart">
      <div className="chart-y-labels" aria-hidden="true">
        {[1,.5,0].map(tick=><span key={tick}>{compactDollars.format(tick*ceiling)}</span>)}
      </div>
      <div className="chart-plot-slot" ref={plotSlot}>{graph}</div>
      <div className="chart-x-labels" aria-hidden="true">
        <span>0</span><span>Leads compared</span><span>{total>0?number(total):''}</span>
      </div>
    </div>:graph}
    <div className="chart-assignments"><span>AE-assisted <b>{number(series.assisted[shown])}</b></span>
      <span>Self-service <b>{number(shown - series.assisted[shown])}</b></span>
      {baseline && <span className="reference-key">Baseline</span>}</div>
  </figure>;
}

export default function AllocationEngine({data, lead, summary, snapshot, mobile=false, onRecord, onCohort}) {
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
            <RevenueChart title="Baseline" description="Rank by AE-assisted revenue" series={policies[0]} {...{ceiling, shown, position, total,mobile}}/>
            <RevenueChart title={summary.verified ? 'MILP allocation' : 'Baseline retained'}
              description={summary.verified ? 'Optimize uplift across the cohort' : 'Returned baseline assignments'}
              series={policies[1]} baseline={policies[0]} {...{ceiling, shown, position, total,mobile}}/>
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
