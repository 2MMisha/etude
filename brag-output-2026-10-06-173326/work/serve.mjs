import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PUB = path.resolve('../../public'), WORK = path.resolve('.');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json','.jpg':'image/jpeg'};
http.createServer((req,res)=>{
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = u.startsWith('/pub/') ? path.join(PUB, u.slice(5)) : path.join(WORK, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream','cache-control':'max-age=3600'}); fs.createReadStream(f).pipe(res);
}).listen(4610, ()=>console.log('serving 4610'));
