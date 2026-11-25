"""The snippet displayed in the editor is valid and faithful Python."""
import json
import subprocess
import numpy as np
from backend.main import Configuration, generate, optimize, baseline

def test_display_code_matches_backend_solver():
    lines = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {MODEL_CODE} from './src/components/model-code.mjs';console.log(JSON.stringify(MODEL_CODE));"], text=True))
    source = '\n'.join(lines)
    compile(source, '<displayed-formulation>', 'exec')
    c = Configuration(lead_count=30, ae_capacity_hours=25, bdr_capacity_hours=12)
    leads = generate(c)
    namespace = {'leads': leads, 'c': c}
    exec(source, namespace)
    displayed = np.rint(namespace['result'].x).astype(int)
    actual, status = optimize(leads, c, baseline(leads, c))
    assert status['status'] == 'optimal'
    np.testing.assert_array_equal(displayed, actual)
