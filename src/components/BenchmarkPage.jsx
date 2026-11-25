import {benchmarkTiming,ease} from './narrative.mjs';
import TextGenerationIntro from './TextGenerationIntro';
import {money} from './economics.mjs';

const millions=value=>value>=1e6?`$${(value/1e6).toFixed(2)}M`:money(value);

const descriptions={
 'Revenue-based':'Ranks leads by AE-assisted expected revenue',
 'Incremental value':'Ranks leads by incremental expected revenue',
 'AE efficiency':'Ranks leads by incremental revenue per AE hour',
 'Combined resource efficiency':'Ranks leads by incremental revenue per unit of sales capacity'
};

export default function BenchmarkPage({data,line,time,reduced,children}){
 const policies=data.benchmarks??[];
 const optimized=data.metrics.optimized;
 const revenue=optimized.expected_revenue;
 const ceiling=Math.max(1,revenue,...policies.map(policy=>policy.expected_revenue));
 const timing=benchmarkTiming(line);
 const reveal=at=>({opacity:reduced?1:ease((time-at)/400),visibility:reduced||time>=at?'visible':'hidden'});
 const wins=policies.filter(policy=>revenue>policy.expected_revenue+0.00001).length;
 const conclusion=data.solver.status==='fallback'?data.solver.message
  :wins===4?'MILP produced the highest expected annual revenue in every comparison.'
  :`MILP produced higher expected annual revenue in ${wins} of ${policies.length} comparisons.`;
 return <section className="benchmark-page" aria-label="Allocation benchmarks">
  <TextGenerationIntro line={line} time={time} reduced={reduced} showThinking={false}/>
  <div className="benchmark-grid">{policies.map((policy,index)=>{
    const gain=policy.expected_revenue>0?100*(revenue/policy.expected_revenue-1):null;
    return <figure key={policy.name} style={reveal(timing.cards[index])}><figcaption>{policy.name}<small>{descriptions[policy.name]}</small><strong>MILP {gain===null?'—':(gain>0?'+':'')+gain.toFixed(2)+'%'}</strong></figcaption>
     <div className="benchmark-pair">{[['Heuristic',policy.expected_revenue],['MILP',revenue]].map(([name,value])=><div key={name}>
      <div className="benchmark-column"><b>{millions(value)}</b><i style={{height:(value/ceiling*100)+'%'}}/></div><small>{name}</small>
     </div>)}</div></figure>;
   })}</div>
  <div className="benchmark-result" style={reveal(timing.conclusion)}>
   <p>{conclusion}</p>
  </div>
  <div style={reveal(timing.footer)}>{children}</div>
 </section>;
}
