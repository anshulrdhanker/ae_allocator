from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
import json
from backend.main import simulate,Configuration
fixtures={}
for name,c in [('default',{}),('empty',{'lead_count':0}),('single',{'lead_count':1}),('large',{'lead_count':5000}),('zero',{'ae_capacity_hours':0,'bdr_capacity_hours':0}),('negative',{'lead_count':1,'lead_overrides':[{'id':1,'arr':10000,'p_self':.8,'p_sales':.2,'ae_hours':2,'bdr_hours':1}]})]:
 fixtures[name]=simulate(Configuration(**c))
 print(name,fixtures[name]['solver']['status'],flush=True)
with patch('backend.main.milp',side_effect=RuntimeError('Deliberate test fixture')):
 fixtures['fallback']=simulate(Configuration(lead_count=20))
with patch('backend.main.milp',return_value=SimpleNamespace(x=[1],status=1,message='Test fixture: feasible incumbent at time limit',mip_gap=.1)):
 fixtures['feasible']=simulate(Configuration(lead_count=1))
Path('tests/fixtures.json').write_text(json.dumps(fixtures))
