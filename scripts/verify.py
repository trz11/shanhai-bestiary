"""Check the delivered content, image decoding and every internal page/asset link."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from PIL import Image
import json

root=Path(__file__).resolve().parents[1]/'site'
entries=json.loads((root/'assets'/'catalog.json').read_text('utf-8'))
assert len(entries)==266
assert len({e['id'] for e in entries})==266
assert len({e['section'] for e in entries})==7
assert len([e for e in entries if e['limitation']])==6
assert all('prompt' not in e and 'requested_model' not in e for e in entries)
errors=[]
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[];self.ids=[];self.headings=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='h1':self.headings+=1
        if 'id' in attrs:self.ids.append(attrs['id'])
        if tag in ('a','link','script','img','use'):
            for key in ('href','src'):
                if attrs.get(key):self.links.append(attrs[key])
pages=list(root.rglob('*.html'))
assert len(pages)==267
link_count=0
for path in pages:
    text=path.read_text('utf-8')
    page=Page();page.feed(text)
    if page.headings!=1:errors.append(f'{path}: expected one h1')
    if len(set(page.ids))!=len(page.ids):errors.append(f'{path}: duplicate DOM IDs')
    if '{{' in text:errors.append(f'{path}: unexpanded template')
    for link in page.links:
        parsed=urlsplit(link)
        if parsed.scheme or parsed.netloc or not parsed.path:continue
        target=(path.parent/unquote(parsed.path)).resolve()
        if target.is_dir():target=target/'index.html'
        if not target.is_file():errors.append(f'{path.relative_to(root)}: broken link {link}')
        if not target.is_relative_to(root.resolve()):errors.append(f'{path}: link leaves public root')
        link_count+=1
for entry in entries:
    for group,expected in [('creatures',(1254,1254)),('thumbs',(640,640))]:
        path=root/'assets'/group/(entry['id']+'.webp')
        with Image.open(path) as image:
            image.load()
            if image.size!=expected:errors.append(f'{path.name}: unexpected {image.size}')
total=sum(p.stat().st_size for p in root.rglob('*') if p.is_file())
thumbs=list((root/'assets'/'thumbs').glob('*.webp'))
summary={'pages':len(pages),'entries':len(entries),'decoded_images':len(entries)*2,'internal_links_checked':link_count,'size_mb':round(total/1024/1024,2),'average_thumbnail_kb':round(sum(p.stat().st_size for p in thumbs)/len(thumbs)/1024,1),'errors':errors}
print(json.dumps(summary,ensure_ascii=False,indent=2))
if errors:raise SystemExit(1)
