#!/usr/bin/env python3
"""Pre-launch link check over the built site (dist/): every internal href resolves to a
built page or a public asset, and every link into the repository's run tree points at a
directory that exists in the checkout. Run after `npm run build`.

  python3 scripts/linkcheck.py            # exits 1 on any broken link
"""
import re, sys, html
from pathlib import Path
from urllib.parse import urlparse, unquote

site = Path(__file__).resolve().parents[1]
dist, repo = site / 'dist', site.parent
REPO_URL = 'https://github.com/Corograph/benchmarks/tree/main/'
pages = list(dist.rglob('*.html'))
broken, internal, runs, external = [], 0, 0, set()
for p in pages:
    s = p.read_text()
    for href in re.findall(r'href="([^"]+)"', s):
        href = html.unescape(href)
        if href.startswith('#') or href.startswith('mailto:'): continue
        if href.startswith(REPO_URL):
            runs += 1
            rel = unquote(href[len(REPO_URL):]).split('#')[0].rstrip('/')
            if not (repo / rel).exists(): broken.append((p.relative_to(dist), href, 'run path missing'))
            continue
        u = urlparse(href)
        if u.scheme in ('http', 'https'):
            external.add(u.netloc); continue
        internal += 1
        path = u.path
        target = dist / path.lstrip('/')
        ok = target.exists() or (target / 'index.html').exists() or (target.with_suffix('.html')).exists()
        if not ok: broken.append((p.relative_to(dist), href, 'no built page'))
print(f'{len(pages)} pages · {internal} internal links · {runs} run-directory links · external hosts: {sorted(external)}')
for page, href, why in broken: print(f'  BROKEN {why}: {href}  (in {page})')
sys.exit(1 if broken else 0)
