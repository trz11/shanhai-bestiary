import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../site');
const port=Number(process.env.PORT||8770);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
  // A prefix route exercises GitHub Pages project-subdirectory links locally.
  if(pathname.startsWith('/shanhai-bestiary/'))pathname=pathname.slice('/shanhai-bestiary'.length);
  let target=path.resolve(root,'.'+pathname);
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory()){
    if(!pathname.endsWith('/')){res.writeHead(301,{Location:req.url.split('?')[0]+'/'});res.end();return;}
    target=path.join(target,'index.html');
  }
  if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('此页尚未入卷，请返回图鉴首页。');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Content-Length':fs.statSync(target).size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(target).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Shanhai preview: http://127.0.0.1:${port}/`));
