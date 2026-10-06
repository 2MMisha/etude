import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p = await b.newPage(); await p.setViewport({width:1920,height:1080});
for (const [n,u] of [['home','/en/'],['display','/display/?lang=en&date=2026-10-05&time=19:20&view=today'],['week','/display/?view=week&lang=en&date=2026-10-05&time=19:20'],['trainer','/trainers/evgeniia/'],['admin','/admin/']]) {
  await p.goto('http://localhost:4599'+u,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,1500));
  await p.screenshot({path:`ss-${n}.png`});
}
await b.close();
