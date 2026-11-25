import itertools
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend import main as model
from backend.main import Configuration, generate, baseline, optimize, simulate, app

@pytest.mark.parametrize('n,bdr,ae', [(0,600,1200),(1,10,20),(4,1,3),(100,30,60),(30,0,50),(30,50,0),(8,100,200)])
def test_allocation_invariants(n,bdr,ae):
    c=Configuration(lead_count=n,bdr_capacity_hours=bdr,ae_capacity_hours=ae)
    result=simulate(c)
    leads=result['opportunities']
    assert leads == generate(c)  # Both methods consume this single unchanged cohort.
    assert len(leads)==n
    if n:
        assert np.mean([l['arr'] for l in leads]) == pytest.approx(c.average_arr)
    for lead in leads:
        assert 0 <= lead['p_self'] <= lead['p_sales'] <= 1
    for name,key in [('traditional','baseline_assignments'),('optimized','optimized_assignments')]:
        assignments=result[key]
        assert len(assignments)==n
        assert set(assignments)<= {'self','sales'}
        selected=[l for l,r in zip(leads,assignments) if r=='sales']
        assert sum(l['bdr_hours'] for l in selected)<=bdr+1e-7
        assert sum(l['ae_hours'] for l in selected)<=ae+1e-7
        metrics=result['metrics'][name]
        assert metrics['human_count']+metrics['self_count']==n
        assert metrics['expected_revenue']==pytest.approx(sum(l['ev_sales'] if r=='sales' else l['ev_self'] for l,r in zip(leads,assignments)))
        if not bdr or not ae:
            assert not selected
    assert result['incremental_revenue']>=-1e-7

def test_reproducibility():
    config=Configuration(lead_count=80,bdr_capacity_hours=20,ae_capacity_hours=40)
    assert simulate(config)==simulate(config)

def test_joint_solution_matches_exhaustive_enumeration():
    leads=[dict(id=i+1,ev_self=10,ev_sales=10+value,incremental_ev=value,bdr_hours=b,ae_hours=a) for i,(value,b,a) in enumerate([(12,3,5),(9,2,3),(9,2,3),(3,1,1)])]
    c=Configuration(lead_count=4,bdr_capacity_hours=4,ae_capacity_hours=6)
    traditional=baseline(leads,c)
    solution,status=optimize(leads,c,traditional)
    feasible=[bits for bits in itertools.product([0,1],repeat=4) if sum(l['bdr_hours']*x for l,x in zip(leads,bits))<=4 and sum(l['ae_hours']*x for l,x in zip(leads,bits))<=6]
    objective=lambda bits:sum(l['incremental_ev']*x for l,x in zip(leads,bits))
    assert status['status']=='optimal'
    assert objective(solution)==max(map(objective,feasible))==18
    assert objective(solution)>objective(traditional)

def test_solver_failure_is_explicit_feasible_fallback(monkeypatch):
    def fail(*args,**kwargs): raise RuntimeError('test failure')
    monkeypatch.setattr(model,'milp',fail)
    result=simulate(Configuration(lead_count=10,bdr_capacity_hours=3,ae_capacity_hours=10))
    assert result['solver']['status']=='fallback'
    assert result['optimized_assignments']==result['baseline_assignments']

def test_api_and_validation():
    client=TestClient(app)
    response=client.post('/api/simulate',json={'lead_count':4})
    assert response.status_code==200
    assert len(response.json()['opportunities'])==4
    for payload in [{'lead_count':-1},{'lead_count':5001},{'average_arr':0},{'ae_capacity_hours':-1},{'seed':-1}]:
        assert client.post('/api/simulate',json=payload).status_code==422

def test_lead_edits_recalculate_economics_and_both_policies():
    override=dict(id=1,arr=1000,p_self=.2,p_sales=.8,ae_hours=2,bdr_hours=1)
    c=Configuration(lead_count=4,ae_capacity_hours=2,bdr_capacity_hours=1,lead_overrides=[override])
    result=simulate(c)
    lead=result['opportunities'][0]
    assert lead['ev_self']==200
    assert lead['ev_sales']==800
    assert lead['incremental_ev']==600
    assert result['opportunities'][1:]==generate(Configuration(lead_count=4))[1:]
    assert result['baseline_assignments']==['sales' if x else 'self' for x in baseline(result['opportunities'],c)]
    feasible=[bits for bits in itertools.product([0,1],repeat=4) if sum(l['ae_hours']*x for l,x in zip(result['opportunities'],bits))<=2 and sum(l['bdr_hours']*x for l,x in zip(result['opportunities'],bits))<=1]
    objective=lambda bits:sum(l['ev_self']+l['incremental_ev']*x for l,x in zip(result['opportunities'],bits))
    assert result['metrics']['optimized']['expected_revenue']==pytest.approx(max(map(objective,feasible)))
    override['ae_hours']=3
    changed=simulate(Configuration(lead_count=4,ae_capacity_hours=2,bdr_capacity_hours=1,lead_overrides=[override]))
    assert changed['optimized_assignments'][0]=='self'
    assert changed['baseline_assignments'][0]=='self'


def test_override_validation():
    client=TestClient(app)
    valid=dict(id=1,arr=1000,p_self=.2,p_sales=.8,ae_hours=2,bdr_hours=1)
    for edits in [[{**valid,'p_self':1.1}],[{**valid,'id':5}],[valid,valid],[{**valid,'ae_hours':0}]]:
        assert client.post('/api/simulate',json={'lead_count':4,'lead_overrides':edits}).status_code==422


def test_default_scenario_has_real_competition():
    result=simulate(Configuration())
    metrics=result['metrics']['optimized']
    assert metrics['ae_utilization']>.98
    assert metrics['ae_utilization']<=1+1e-9
    assert result['incremental_revenue']>0
    routes=set(zip(result['baseline_assignments'],result['optimized_assignments']))
    assert ('sales','self') in routes and ('self','sales') in routes
