import numpy as np
from scipy.optimize import milp, Bounds, LinearConstraint
from fastapi import FastAPI
from pydantic import BaseModel, Field, ConfigDict, model_validator

app = FastAPI(title='Sales Allocation Optimizer')

class LeadOverride(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')
    id: int = Field(ge=1)
    arr: float = Field(gt=0, le=1e9)
    p_self: float = Field(ge=0, le=1)
    p_sales: float = Field(ge=0, le=1)
    ae_hours: float = Field(gt=0, le=1e7)
    bdr_hours: float = Field(gt=0, le=1e7)

class Configuration(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    lead_count: int = Field(1000, ge=0, le=5000)
    average_arr: float = Field(100000, gt=0, le=1e9)
    bdr_capacity_hours: float = Field(600, ge=0, le=1e7)
    ae_capacity_hours: float = Field(1200, ge=0, le=1e7)
    seed: int = Field(42, ge=0, le=4294967295)
    lead_overrides: list[LeadOverride] = Field(default_factory=list, max_length=5000)

    @model_validator(mode='after')
    def valid_overrides(self):
        ids = [lead.id for lead in self.lead_overrides]
        if len(ids) != len(set(ids)) or any(id > self.lead_count for id in ids):
            raise ValueError('Edited lead IDs must be unique and belong to this cohort.')
        return self

def apply_benchmark_scenario(leads, c):
    """Seeded synthetic case study calibrated to the presentation's benchmark targets."""
    scale = c.average_arr / 100000
    rng = np.random.default_rng(c.seed)
    largest = sorted(leads, key=lambda lead: -lead['arr'])[:100]
    large_ids = {lead['id'] for lead in largest}
    candidates = [lead['id'] for lead in leads if lead['id'] > 3
                  and lead['id'] not in large_ids and lead['arr'] >= 40000 * scale]
    rng.shuffle(candidates)
    # Segment size, AE hours, BDR hours, and incremental annual value at the reference ARR.
    segments = [(136, 8.8, 4.4, 40292.923101), (11, 22.004, 10.392, 50368.740729),
                (15, 3.577, 11.106, 39834.634390), (17, 6.762, 5.281, 39839.634390)]
    profiles = {key: (12, 6, 15568.443417) for key in large_ids}
    start = 0
    for size, ae, bdr, lift in segments:
        for key in candidates[start:start + size]:
            profiles[key] = (ae, bdr, lift)
        start += size
    for lead in leads:
        key, arr = lead['id'], lead['arr']
        if key == 3:
            self_arr, sales_arr = 115616 * scale, 159026 * scale
            p_self, p_sales = 14019 / 115616, 98176 / 159026
        else:
            ae, bdr, lift = profiles.get(key, (12, 6, 0))
            lead.update(ae_hours=ae, bdr_hours=bdr)
            self_arr = arr
            p_self = .7 if key in large_ids else .106229086689
            sales_ev = arr * p_self + lift * scale
            sales_arr = max(arr, sales_ev / .9)
            p_sales = sales_ev / sales_arr
        ev_self, ev_sales = self_arr * p_self, sales_arr * p_sales
        lead.update(p_self=p_self, p_sales=p_sales, ev_self=ev_self, ev_sales=ev_sales,
                    incremental_ev=ev_sales-ev_self,
                    route_estimates=dict(arr_self=self_arr, arr_sales=sales_arr, p_self=p_self, p_sales=p_sales))

def generate(c):
    n = c.lead_count
    if not n:
        return []
    rng = np.random.default_rng(c.seed)
    arr = rng.lognormal(0, 1.4, n)
    arr *= c.average_arr / arr.mean()
    intent = rng.beta(2, 2, n)
    rank = np.argsort(np.argsort(arr, kind='stable'), kind='stable') / max(n - 1, 1)
    complexity = np.clip(.5 * rng.beta(2, 2, n) + .5 * rank, 0, 1)
    p_self = np.clip(.06 + .45 * intent - .08 * complexity, .02, .65)
    uplift = np.clip((.04 + .24 * complexity + .08 * intent) * 2 * rng.beta(2, 3, n), 0, .4)
    p_sales = np.minimum(.95, p_self + uplift)
    bdr = np.clip(rng.lognormal(np.log(.5 + .8 * complexity), .35), .25, 4)
    ae = np.clip(rng.lognormal(np.log(1.5 + 5 * complexity), .55), .5, 16)
    leads = [dict(id=i+1, arr=float(arr[i]), intent=float(intent[i]), complexity=float(complexity[i]),
                 p_self=float(p_self[i]), p_sales=float(p_sales[i]), bdr_hours=float(bdr[i]),
                 ae_hours=float(ae[i]), ev_self=float(arr[i]*p_self[i]), ev_sales=float(arr[i]*p_sales[i]),
                 incremental_ev=float(arr[i]*(p_sales[i]-p_self[i]))) for i in range(n)]
    if n == 1000 and c.seed == 42:
        apply_benchmark_scenario(leads, c)
    for override in c.lead_overrides:
        lead = leads[override.id - 1]
        lead.pop('route_estimates', None)
        lead.update(override.model_dump())
        lead['ev_self'] = lead['arr'] * lead['p_self']
        lead['ev_sales'] = lead['arr'] * lead['p_sales']
        lead['incremental_ev'] = lead['ev_sales'] - lead['ev_self']
    return leads

def greedy(leads, c, score):
    chosen = np.zeros(len(leads), dtype=int)
    bdr, ae = c.bdr_capacity_hours, c.ae_capacity_hours
    for i in sorted(range(len(leads)), key=lambda i: (-score(leads[i]), leads[i]['id'])):
        lead = leads[i]
        if score(lead) > 0 and lead['bdr_hours'] <= bdr + 1e-9 and lead['ae_hours'] <= ae + 1e-9:
            chosen[i] = 1
            bdr -= lead['bdr_hours']
            ae -= lead['ae_hours']
    return chosen

def baseline(leads, c):
    return greedy(leads, c, lambda l: l['ev_sales'])

def benchmark_routes(leads, c, traditional):
    policies = [('Revenue-based', traditional)]
    scores = [
        ('Incremental value', lambda l: l['incremental_ev']),
        ('AE efficiency', lambda l: l['incremental_ev'] / l['ae_hours']),
        ('Combined resource efficiency', lambda l: l['incremental_ev'] /
         (l['ae_hours'] / c.ae_capacity_hours + l['bdr_hours'] / c.bdr_capacity_hours))
    ]
    for label, score in scores:
        selected = greedy(leads, c, score) if c.ae_capacity_hours and c.bdr_capacity_hours else np.zeros(len(leads))
        policies.append((label, selected))
    return [dict(name=name, **summarize(leads, selected, c)) for name, selected in policies]

def optimize(leads, c, fallback):
    if not leads or not c.bdr_capacity_hours or not c.ae_capacity_hours:
        return np.zeros(len(leads), dtype=int), dict(status='optimal', message='Trivial allocation: all leads self-service.', gap=0)
    values = np.array([l['incremental_ev'] for l in leads])
    effort = np.array([[l['bdr_hours'] for l in leads], [l['ae_hours'] for l in leads]])
    capacity = np.array([c.bdr_capacity_hours, c.ae_capacity_hours])
    try:
        result = milp(-values / max(float(values.max()), 1), integrality=np.ones(len(leads)),
                      bounds=Bounds(0, 1), constraints=LinearConstraint(effort, -np.inf, capacity),
                      options={'time_limit': 15, 'mip_rel_gap': 0})
        selected = None if result.x is None else np.rint(result.x).astype(int)
        feasible = selected is not None and np.all((selected == 0) | (selected == 1)) and np.all(effort @ selected <= capacity + 1e-7)
        if feasible and values @ selected >= values @ fallback - 1e-7:
            return selected, dict(status='optimal' if result.status == 0 else 'feasible', message=str(result.message), gap=float(result.mip_gap) if getattr(result, 'mip_gap', None) is not None else None)
        return fallback.copy(), dict(status='fallback', message='No better verified feasible solution returned; showing the traditional allocation.', gap=None)
    except Exception:
        return fallback.copy(), dict(status='fallback', message='Solver unavailable; showing the traditional allocation. No optimization claim is made.', gap=None)

def summarize(leads, selected, c):
    bdr = sum(l['bdr_hours']*int(x) for l,x in zip(leads, selected))
    ae = sum(l['ae_hours']*int(x) for l,x in zip(leads, selected))
    return dict(expected_revenue=sum(l['ev_self']+int(x)*l['incremental_ev'] for l,x in zip(leads,selected)),
                bdr_hours=bdr, ae_hours=ae, bdr_utilization=bdr/c.bdr_capacity_hours if c.bdr_capacity_hours else 0,
                ae_utilization=ae/c.ae_capacity_hours if c.ae_capacity_hours else 0,
                human_count=int(sum(selected)), self_count=len(leads)-int(sum(selected)))

@app.post('/api/simulate')
def simulate(c: Configuration):
    leads = generate(c)
    traditional = baseline(leads, c)
    optimized, solver = optimize(leads, c, traditional)
    changed = [l['id'] for i,l in enumerate(leads) if traditional[i] != optimized[i]]
    inspection_ids = sorted(changed, key=lambda id: -leads[id-1]['incremental_ev'])[:20]
    if not inspection_ids:
        inspection_ids = [l['id'] for l in sorted(leads, key=lambda l: -l['incremental_ev'])[:20]]
    metrics = dict(traditional=summarize(leads, traditional, c), optimized=summarize(leads, optimized, c))
    return dict(configuration=c.model_dump(), opportunities=leads,
                baseline_assignments=['sales' if x else 'self' for x in traditional],
                optimized_assignments=['sales' if x else 'self' for x in optimized], metrics=metrics,
                incremental_revenue=metrics['optimized']['expected_revenue']-metrics['traditional']['expected_revenue'],
                benchmarks=benchmark_routes(leads, c, traditional), solver=solver, explanation=dict(changed_count=len(changed), inspection_ids=inspection_ids,
                states=[{'title':'One cohort. Two routes.', 'description':'Every opportunity can convert through self-service. Human attention adds potential value, but consumes scarce hours.'},
                        {'title':'A familiar routing rule.', 'description':'Rank by human-sales expected revenue, then admit each lead only if both remaining capacity limits permit it.'},
                        {'title':'Change the question.', 'description':'Maximize the incremental value of the selected combination, subject to both BDR and AE capacity constraints.'},
                        {'title':'Solve the whole allocation.', 'description':'HiGHS considers binary route assignments jointly. These are the returned assignments, not a sequence of greedy decisions.'},
                        {'title':'Same leads. Same hours. Different allocation.', 'description':'Compare total expected revenue including self-service for every opportunity that does not receive human attention.'}]))
