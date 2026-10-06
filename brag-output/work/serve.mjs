import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const DIST = path.resolve('../../dist'), WORK = path.resolve('.');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json','.ico':'image/x-icon','.jpg':'image/jpeg'};
http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split('?')[0]);
  let f = u.startsWith('/stage/') ? path.join(WORK, u.slice(7)) : path.join(DIST, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f,'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res);
}).listen(4599);
