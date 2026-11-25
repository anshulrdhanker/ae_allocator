// Executable explanatory excerpt of backend/main.py's optimize function.
// Uses its actual coefficient normalization, BDR/AE matrix order and options.
// Browser playback only displays this text; Python tests execute it separately.
export const MODEL_CODE=[
 'import numpy as np',
 'from scipy.optimize import milp, Bounds, LinearConstraint',
 '',
 '# x[i] = 1: sales support; 0: self-service',
 'values = np.array([l["incremental_ev"] for l in leads])',
 'effort = np.array([[l["bdr_hours"] for l in leads],',
 '                   [l["ae_hours"] for l in leads]])',
 'capacity = np.array([c.bdr_capacity_hours, c.ae_capacity_hours])',
 '',
 'result = milp(',
 '    -values / max(float(values.max()), 1),',
 '    integrality=np.ones(len(leads)), bounds=Bounds(0, 1),',
 '    constraints=LinearConstraint(effort, -np.inf, capacity),',
 '    options={"time_limit": 15, "mip_rel_gap": 0})',
];
export const CODE_TIMES=[1300,1480,1660,2400,2800,4200,4380,4700,4900,6100,6400,6800,7300,8200];
