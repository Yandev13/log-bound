"""Make tc.json (test case groups) from docs/05-testing/test-cases.md for build.js."""
import re, json, sys
src = sys.argv[1] if len(sys.argv) > 1 else '../../05-testing/test-cases.md'
s = open(src, encoding='utf-8').read()
s = s[:s.index('## 7.')]
groups, cur = [], None
for line in s.splitlines():
    m = re.match(r'^##+ (\d[\d.]*)\s+(.*)', line)
    if m and not line.startswith('## 1') and not line.startswith('### 1.1'):
        cur = {'title': m.group(2), 'rows': []}; groups.append(cur); continue
    if cur and line.startswith('| TC-'):
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if len(c) == 6: c = [c[0], c[1], c[3], c[4], c[5]]
        cur['rows'].append(dict(id=c[0], stage=c[1], req=c[2], title=c[3], exp=c[4]))
json.dump([g for g in groups if g['rows']], open('tc.json', 'w'))
