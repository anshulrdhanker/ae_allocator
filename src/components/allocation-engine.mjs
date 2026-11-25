import {progress,SIMULATION_LEAD_IN_MS} from './narrative.mjs';
import {routeFor} from './selectors.mjs';

// Both policies see the open record first, then the rest in cohort order.
// Accumulate the backend's EV formula at full precision; round only for display.
export function revenueSeries(data, firstLead) {
  const leads = firstLead
    ? [firstLead, ...data.opportunities.filter(lead => lead.id !== firstLead.id)]
    : data.opportunities;
  const policies = [false, true].map(optimized => {
    const revenue = [0], assisted = [0];
    for (const lead of leads) {
      const sales = routeFor(data, lead, optimized) === 'sales';
      revenue.push(revenue.at(-1) + lead.ev_self + (sales ? lead.incremental_ev : 0));
      assisted.push(assisted.at(-1) + Number(sales));
    }
    return {revenue, assisted};
  });
  const peak = Math.max(1, ...policies.map(policy => policy.revenue.at(-1)));
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const ceiling = Math.ceil(peak / magnitude) * magnitude;
  return {policies, ceiling};
}

export function comparisonFrame(snapshot, total) {
  const cohort = snapshot.chapters.find(beat => beat.id === 'cohort_allocation');
  const shared = snapshot.chapters.find(beat => beat.id === 'shared_allocation');
  const elapsed = snapshot.time - (shared ?? cohort).at;
  const leadIn = total ? SIMULATION_LEAD_IN_MS : 0;
  const finish = total ? 8956 : 0;
  const position = total * (total ? progress(elapsed, leadIn, finish - leadIn) : 1);
  return {position, shown: Math.floor(position), settled: elapsed >= finish,
    showDifference: elapsed >= finish + 1500};
}
