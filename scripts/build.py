"""Build a portable static bestiary. No API keys or generation logs enter site/."""
from pathlib import Path
import argparse
import concurrent.futures
import html
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT.parent / 'outputs' / '山海经异兽图鉴')
parser.add_argument('--site-url', default='')
args = parser.parse_args()
source = args.source
site = ROOT / 'site'
assets = site / 'assets'
site_url = args.site_url.rstrip('/') + '/' if args.site_url else ''
for folder in ('creatures','thumbs'):
    (assets / folder).mkdir(parents=True, exist_ok=True)
raw = json.loads((source / '图鉴数据.json').read_text('utf-8'))
entries = []
for item in raw['entries']:
    entry = {key: item[key] for key in ('id','name','section','chapter','description','fidelity','source_excerpt','source_url')}
    entry['alias'] = item.get('source_key','')
    entry['limitation'] = item['visual_review_notes'] if item.get('visual_review') != 'checked' else ''
    if entry['id'] == '101':
        entry['limitation'] = '腋下眼已表现，但人面仍有眼，爪形仍偏兽爪，与文字记载存在偏差。'
    entries.append(entry)
by_id = {e['id']:e for e in entries}
featured = ['008','020','002','057','117','239','244','211']
ordered = [by_id[i] for i in featured] + [e for e in entries if e['id'] not in featured]
sections = ['南山经','西山经','北山经','东山经','中山经','海经与大荒经','兽形神灵']
esc = lambda value: html.escape(str(value), quote=True)
icon = lambda name: f'<svg class="icon" aria-hidden="true"><use href="#i-{name}"/></svg>'

def convert(e):
    original = source / 'images' / f"{e['id']}.png"
    large, small = (assets / folder / f"{e['id']}.webp" for folder in ('creatures','thumbs'))
    if large.exists() and small.exists() and min(large.stat().st_mtime,small.stat().st_mtime) > original.stat().st_mtime:
        return
    with Image.open(original) as im:
        im = im.convert('RGB')
        im.save(large, 'WEBP', quality=87, method=5)
        im.thumbnail((640,640),Image.Resampling.LANCZOS)
        im.save(small,'WEBP',quality=80,method=5)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for i, _ in enumerate(pool.map(convert,entries),1):
        if i % 50 == 0:
            print(f'Optimized {i}/{len(entries)} images',flush=True)
for name in ('styles.css','app.js','seal.svg','shanhai-serif.woff2','OFL.txt'):
    path = ROOT / 'src' / name
    if path.exists():
        shutil.copy2(path,assets / name)
data = json.dumps(entries, ensure_ascii=False,separators=(',',':'))
(assets / 'catalog.js').write_text('window.SHANHAI_ENTRIES='+data+';\n',encoding='utf-8')
(assets / 'catalog.json').write_text(data,encoding='utf-8')
shell = (ROOT / 'src' / 'shell.html').read_text('utf-8')

def card(e,base='./'):
    name, chapter, description = map(esc,(e['name'],e['chapter'],e['description']))
    ident=e['id']
    return f'''<article class="creature-card"><a class="card-picture" href="{base}creatures/{ident}/" data-open="{ident}" aria-label="查看{name}"><img src="{base}assets/thumbs/{ident}.webp" width="640" height="640" alt="{name}的工笔风格艺术复原图" loading="lazy" decoding="async"><span class="card-number">NO. {ident}</span><span class="card-reveal" aria-hidden="true">↗</span></a><button class="favorite-button" data-save="{ident}" type="button" aria-label="收藏{name}" aria-pressed="false">{icon('bookmark')}</button><div class="card-content"><div class="card-title-row"><h3><a href="{base}creatures/{ident}/" data-open="{ident}">{name}</a></h3><span class="chapter-tag">{chapter}</span></div><p class="card-description">{description}</p></div></article>'''

def render(main,base='./',entry=None):
    title = f"{entry['name']} · 山海异兽录" if entry else '山海异兽录 · 一部可以漫游的东方异兽图鉴'
    description = entry['description'] if entry else '循着古籍的文字，遇见 266 位山海生灵。浏览异兽插画、形貌介绍与原文出处，收藏和分享你的山海奇遇。'
    path = f"creatures/{entry['id']}/" if entry else ''
    og = f"assets/creatures/{entry['id']}.webp" if entry else 'assets/og-cover.jpg'
    replacements = {'TITLE':esc(title),'DESCRIPTION':esc(description),'OG_IMAGE':esc((site_url or base)+og),'CANONICAL':f'<link rel="canonical" href="{site_url}{path}"><meta property="og:url" content="{site_url}{path}">' if site_url else '', 'BASE':base, 'MAIN':main, 'CREATURE':entry['id'] if entry else '', 'PRELOAD':f'<link rel="preload" as="image" href="{base}assets/creatures/{entry["id"] if entry else "008"}.webp">'}
    rendered = shell
    for key,value in replacements.items():
        rendered=rendered.replace('{{'+key+'}}',value)
    return rendered

filters = '<button class="filter" type="button" data-section="" aria-pressed="true">全部异兽<span>266</span></button>'
for section in sections:
    count=sum(e['section']==section for e in entries)
    filters+=f'<button class="filter" type="button" data-section="{section}" aria-pressed="false">{section}<span>{count}</span></button>'
home = (ROOT/'src'/'home.html').read_text('utf-8').replace('{{FILTERS}}',filters).replace('{{CARDS}}',''.join(card(e) for e in ordered[:24]))
home = home.replace('{{NOSCRIPT_LINKS}}','<ul>'+''.join(f'<li><a href="creatures/{e["id"]}/">{esc(e["name"])}</a></li>' for e in entries)+'</ul>')
(site/'index.html').write_text(render(home),encoding='utf-8')

for index,e in enumerate(entries):
    ident=e['id']; name=esc(e['name']); base='../../'
    previous,next_entry=entries[(index-1)%len(entries)],entries[(index+1)%len(entries)]
    limitation=f'<p class="detail-note"><strong>图像说明</strong> · {esc(e["limitation"])}</p>' if e['limitation'] else ''
    detail=f'''<section class="detail-page page-width"><nav class="breadcrumbs" aria-label="当前位置"><a href="../../#catalog">异兽图鉴</a><span aria-hidden="true">/</span><a href="../../?section={e['section']}#catalog">{e['section']}</a><span aria-hidden="true">/</span><span>{name}</span></nav><article class="standalone-detail"><div class="detail-layout"><div class="detail-art"><img src="../../assets/creatures/{ident}.webp" width="1254" height="1254" alt="{name}的艺术复原图" fetchpriority="high"><span class="art-index">NO. {ident} / 266</span></div><div class="detail-copy"><div class="detail-topline"><span>{esc(e['chapter'])}</span><span>山海异兽录 · {ident}</span></div><h1 class="detail-name">{name}</h1><p class="detail-description">{esc(e['description'])}</p><div class="detail-facts"><span>{esc(e['section'])}</span><span>{esc(e['fidelity'])}</span></div><div class="detail-source"><h3>古籍有载 <a href="{esc(e['source_url'])}" target="_blank" rel="noopener noreferrer">查看篇章 ↗</a></h3><blockquote>{esc(e['source_excerpt'])}</blockquote></div>{limitation}<p class="detail-disclaimer">AI 艺术复原，色彩、姿态与未详细节含现代想象。</p><div class="detail-actions"><button class="button primary" data-share="{ident}" type="button">{icon('share')}分享这只异兽</button><button class="button outline" data-save="{ident}" type="button" aria-label="收藏{name}" aria-pressed="false">{icon('bookmark')}<span data-save-label>收藏异兽</span></button><button class="download-art" data-card="{ident}" type="button">{icon('download')}保存图文卡片</button><a class="download-art" href="../../assets/creatures/{ident}.webp" download="山海异兽录_{ident}_{name}.webp">{icon('download')}下载插画</a></div></div></div><nav class="detail-pagination" aria-label="前后异兽"><a href="../{previous['id']}/">← {esc(previous['name'])}</a><a class="detail-permalink" href="../../#catalog">返回完整图鉴</a><a href="../{next_entry['id']}/">{esc(next_entry['name'])} →</a></nav></article>'''
    related = [other for other in ordered if other['section']==e['section'] and other['id']!=ident][:4]
    detail+='<section class="related" aria-labelledby="related-heading"><div class="related-heading"><h2 id="related-heading">同卷里的其他生灵</h2><a class="text-link" href="../../?section='+e['section']+'#catalog">继续探索 ↗</a></div><div class="creature-grid">'+''.join(card(other,base) for other in related)+'</div></section></section>'
    folder=site/'creatures'/ident;folder.mkdir(parents=True,exist_ok=True)
    (folder/'index.html').write_text(render(detail,base,e),encoding='utf-8')

# A locally generated, public-safe social preview, with no remote dependency.
with Image.open(assets/'creatures'/'008.webp') as im:
    cover=Image.new('RGB',(1200,630),'#f6f3eb')
    art=im.resize((600,600),Image.Resampling.LANCZOS)
    cover.paste(art,(575,15))
    from PIL import ImageDraw,ImageFont
    font_path=Path('C:/Windows/Fonts/simsun.ttc')
    if font_path.exists():
        draw=ImageDraw.Draw(cover)
        draw.text((60,130),'山海异兽录',font=ImageFont.truetype(str(font_path),66),fill='#283a33')
        draw.text((63,248),'山海之间，万物有灵。',font=ImageFont.truetype(str(font_path),30),fill='#a44330')
        draw.text((63,423),'266 幅插画 · 名称 · 介绍 · 原文',font=ImageFont.truetype(str(font_path),22),fill='#69746a')
    cover.save(assets/'og-cover.jpg',quality=90,optimize=True)
(site/'.nojekyll').write_text('',encoding='utf-8')
if site_url:
    urls=[site_url]+[site_url+'creatures/'+e['id']+'/' for e in entries]
    (site/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+esc(url)+'</loc></url>' for url in urls)+'</urlset>',encoding='utf-8')
    (site/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+site_url+'sitemap.xml\n',encoding='utf-8')
else:
    (site/'robots.txt').write_text('User-agent: *\nAllow: /\n',encoding='utf-8')
total=sum(p.stat().st_size for p in site.rglob('*') if p.is_file())
print(json.dumps({'entries':len(entries),'detail_pages':len(list((site/'creatures').glob('*/index.html'))),'site_megabytes':round(total/1024/1024,2),'output':str(site)},ensure_ascii=False),flush=True)
