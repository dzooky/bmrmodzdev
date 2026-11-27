import ast
import json
import os
import tempfile
from pathlib import Path
source = Path(__file__).with_name('build.py').read_text()
fn = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name == 'discover_cc_rule_getters')
ns = {'os': os, 'json': json}
exec(compile(ast.Module(body=[fn], type_ignores=[]), '<test>', 'exec'), ns)
name = 'de.bmw.infotainment.climate.Climate'
field = 'operationAutomaticSwitchDriverSeat'
with tempfile.TemporaryDirectory() as d:
    p = Path(d) / 'catalog.json'
    os.environ['MGU_SOMEIP_CATALOG'] = str(p)
    for instances, getter, count in [({'real': 1}, 0, 1), ({'a':1,'b':2}, 1, 0), ({'real':1}, None, 0), ({}, 1, 0)]:
        p.write_text(json.dumps({'interfaces':{name:{'fields':{field:{'getter':getter,'setter':2}}}},'instanceIDs':{name:instances}}))
        spec = {'signals':{}}
        ns['discover_cc_rule_getters'](spec)
        assert len(spec['signals']) == count
        if count:
            assert spec['signals'][name][field] == 'r'
            assert spec['signals'][name]['_instances'] == 'real'
    p.unlink()
    spec = {'signals':{}}
    ns['discover_cc_rule_getters'](spec)
    assert not spec['signals']
print('CC getter manifest discovery PASS')
