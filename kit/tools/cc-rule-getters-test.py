import ast
import json
from pathlib import Path
root = Path(__file__).resolve().parents[2]
spec = json.loads((root / 'apps/data-diagnostics/app.json').read_text())
source = Path(__file__).with_name('build.py').read_text()
fn = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name == 'manifest_for')
ns = {'PLATFORM_PROXIES': {}, 'PLATFORM_SERVICES': {}}
exec(compile(ast.Module(body=[fn], type_ignores=[]), '<test>', 'exec'), ns)
manifest = ns['manifest_for'](json.loads(json.dumps(spec)))
assert len(manifest['proxies']) == 3
for d in spec['config']['ccRuleGetters']:
    entry = manifest['proxies'][d['interface']]
    assert entry == {'instances': '1', 'attributes': {d['field']: 'r'}}
print('CC explicit getter-only manifest PASS')
