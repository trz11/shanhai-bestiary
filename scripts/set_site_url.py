"""Set canonical URLs after a repository name/domain is chosen. Stdlib only."""
from pathlib import Path
import html
import json
import re
import sys
site=Path(__file__).resolve().parents[1]/'site'
base=sys.argv[1].rstrip('/')+'/'
if not base.startswith('https://'):
    raise SystemExit('A public HTTPS URL is required')
for page in site.rglob('index.html'):
    relative=page.parent.relative_to(site).as_posix()
    canonical=base+('' if relative=='.' else relative+'/')
    text=page.read_text('utf-8')
    text=re.sub(r'<link rel="canonical"[^>]*>|<meta property="og:url"[^>]*>','',text)
    text=re.sub(r'(<meta property="og:image" content=")[^"]*assets/',r'\g<1>'+base+'assets/',text)
    text=text.replace('</head>',f'<link rel="canonical" href="{html.escape(canonical)}"><meta property="og:url" content="{html.escape(canonical)}">\n</head>')
    page.write_text(text,encoding='utf-8')
entries=json.loads((site/'assets'/'catalog.json').read_text('utf-8'))
urls=[base]+[base+'creatures/'+e['id']+'/' for e in entries]
(site/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+html.escape(u)+'</loc></url>' for u in urls)+'</urlset>',encoding='utf-8')
(site/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml\n',encoding='utf-8')
print('Canonical metadata and sitemap configured for '+base)
