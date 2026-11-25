import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {revenueSeries, comparisonFrame} from '../src/components/allocation-engine.mjs';
import {chaptersFor, deriveTimelineState, narrationPlayback, narrationFor, NAV_HANDOFF_MS} from '../src/components/narrative.mjs';
import {routeFor, selectPrimaryLead} from '../src/components/selectors.mjs';

const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures.json', import.meta.url)));
test('every plotted prefix uses the same actual leads and their returned routes', () => {
  for (const data of Object.values(fixtures)) {
    const selected = data.opportunities.at(-1);
    const {policies, ceiling} = revenueSeries(data, selected);
    const ordered = selected ? [selected, ...data.opportunities.slice(0, -1)] : [];
    for (const [i, policy] of policies.entries()) {
      let revenue = 0, assisted = 0;
      assert.equal(policy.revenue[0], 0);
      ordered.forEach((lead, index) => {
        const sales = routeFor(data, lead, Boolean(i)) === 'sales';
        revenue += sales ? lead.ev_sales : lead.ev_self;
        assisted += Number(sales);
        assert.ok(Math.abs(policy.revenue[index + 1] - revenue) < 1e-5);
        assert.equal(policy.assisted[index + 1], assisted);
      });
      const metrics = i ? data.metrics.optimized : data.metrics.traditional;
      assert.ok(Math.abs(policy.revenue.at(-1) - metrics.expected_revenue) < 1e-5);
      assert.ok(ceiling >= policy.revenue.at(-1));
      assert.equal(policy.assisted.at(-1), metrics.human_count);
    }
  }
});

test('the default first record shows the cost of redirecting Lead 031 before the cohort gain', () => {
  const data = fixtures.default;
  const lead = selectPrimaryLead(data);
  const {policies} = revenueSeries(data, lead);
  assert.equal(lead.id, 31);
  assert.deepEqual(policies.map(p => Math.round(p.revenue[1])), [583087, 567519]);
  assert.deepEqual(policies.map(p => Math.round(p.revenue.at(-1))), [44412470, 48419621]);
});

test('one clock advances the charts, holds the totals, then reveals the difference before Results', () => {
  for (const data of [fixtures.default, fixtures.single, fixtures.empty]) {
    const chapters = chaptersFor(data);
    const first = chapters.find(b => b.id === 'shared_allocation' || b.id === 'cohort_allocation');
    const last = chapters.find(b => b.id === 'cohort_allocation');
    const n = data.opportunities.length;
    const at = t => comparisonFrame(deriveTimelineState(data, t), n);
    if(n) {
      const simulationCue = first.at + 1020;
      for (const t of [simulationCue, last.at, last.end-1]) {
        const narration = narrationPlayback(deriveTimelineState(data,t),data);
        assert.equal(narration.beat.id,last.id);
        assert.equal(narration.local-narrationFor({chapter:last.id},data).at,t-simulationCue);
      }
      for(const elapsed of [0,360,520,1020]) assert.equal(at(first.at + elapsed).position, 0);
      for(const elapsed of [1021,2239,4478,6717,8956])
        assert.ok(Math.abs(at(first.at + elapsed).position - n * (elapsed - 1020) / (8956 - 1020)) < 1e-9);
    }
    let previous = 0, finishedAt, differenceAt;
    for (let t = first.at; t < last.end; t += 100) {
      const f = at(t);
      assert.ok(Number.isInteger(f.shown) && f.shown >= previous && f.shown <= n);
      if (f.settled) { finishedAt ??= t; assert.equal(f.shown, n); }
      if (f.showDifference) differenceAt ??= t;
      previous = f.shown;
    }
    assert.ok(differenceAt - finishedAt >= 1400);
    assert.ok(last.end - NAV_HANDOFF_MS - differenceAt >= 0);
    assert.deepEqual(comparisonFrame(deriveTimelineState(data, last.complete, true), n),
      {position:n, shown:n, settled:true, showDifference:true});
    assert.equal(at(first.at).shown, 0);
  }
});
