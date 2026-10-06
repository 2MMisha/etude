import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const mode = process.argv[2] || 'stills';
const b = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--lang=en-US','--hide-scrollbars']});
const p = await b.newPage(); await p.setViewport({width:1920,height:1080});
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('http://localhost:4599/stage/stage.html',{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,1500));
await p.evaluate(()=>window.setup());
if (mode==='stills') {
  fs.mkdirSync('stills',{recursive:true});
  const ts = process.argv.slice(3).map(Number);
  for (const t of ts) { await p.evaluate(t=>window.seek(t), t); await p.screenshot({path:`stills/t${t.toFixed(2)}.jpg`, quality:80}); }
} else {
  fs.mkdirSync('frames',{recursive:true});
  const N = Math.round(21*30);
  for (let f=0; f<N; f++) { await p.evaluate(t=>window.seek(t), f/30); await p.screenshot({path:`frames/f${String(f).padStart(4,'0')}.png`}); if (f%60==0) console.log(f); }
}
await b.close();
