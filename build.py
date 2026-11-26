"""Assemble les sources de src/ en un seul fichier index.html autonome."""
import os
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
r = lambda f: open(os.path.join(d, f), encoding='utf-8').read()
main = '\n'.join(r(f) for f in ['main1.js', 'main2.js', 'main4.js', 'main3.js'])
page = r('page.html').replace('/*CORE*/', r('core.js')).replace('/*MAIN*/', main)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
open(out, 'w', encoding='utf-8').write(page)
print(out, len(page.splitlines()), 'lignes')
