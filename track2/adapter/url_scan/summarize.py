"""Reconcile model comparisons with the boolean comparator on identical frozen pairs."""
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
generic = json.loads((root/'generic-scores.json').read_text())
challenger = json.loads((root/'challenger-scores.json').read_text())
assert generic['pairs_sha256'] == challenger['pairs_sha256']
assert len(generic['rows']) == len(challenger['rows'])
report = {'pairs_sha256': generic['pairs_sha256'], 'groups': {},
          'live_fusion_reproduced': False,
          'fusion_limit': 'The node does not expose its current database fusion parameters or truth-source references.'}
for kind in sorted({r['kind'] for r in generic['rows']}):
    indices = [i for i, r in enumerate(generic['rows']) if r['kind'] == kind]
    report['groups'][kind] = {
        'pairs': len(indices),
        'cases': len({generic['rows'][i]['case'] for i in indices}),
        'generic_wins': sum(generic['rows'][i]['win'] for i in indices),
        'challenger_wins': sum(challenger['rows'][i]['win'] for i in indices),
        'comparator_wins': sum(generic['rows'][i]['comparator_win'] for i in indices),
        'comparator_ties': sum(generic['rows'][i]['comparator_tie'] for i in indices),
        'challenger_gain': sum(challenger['rows'][i]['win'] and not generic['rows'][i]['win'] for i in indices),
        'challenger_loss': sum(generic['rows'][i]['win'] and not challenger['rows'][i]['win'] for i in indices),
        'generic_basis_point_wins': (sum(generic['rows'][i]['bps_win'] for i in indices)
                                     if all('bps_win' in generic['rows'][i] for i in indices) else None),
        'challenger_basis_point_wins': (sum(challenger['rows'][i]['bps_win'] for i in indices)
                                        if all('bps_win' in challenger['rows'][i] for i in indices) else None),
    }
report['token_limits'] = {name: {'max_tokens': run['max_tokens'], 'at_limit': run['texts_at_token_limit'],
                               'unique_texts': run['unique_texts']}
                          for name, run in [('generic', generic), ('challenger', challenger)]}
(root/'comparison.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
