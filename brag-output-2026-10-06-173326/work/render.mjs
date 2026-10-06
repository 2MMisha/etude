// node render.mjs <ad> <fmt> <lang> stills t1 t2 ...   |   node render.mjs <ad> <fmt> <lang> frames
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [ad, fmt, lang, mode, ...rest] = process.argv.slice(2);
const V = fmt === 'v', W = V ? 1080 : 1920, H = V ? 1920 : 1080;
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
const p = await b.newPage();
await p.setViewport({ width: W, height: H });
p.on('pageerror', e => console.log('ERR', e.message));
p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
await p.goto(`http://localhost:4610/stage.html?ad=${ad}&fmt=${fmt}&lang=${lang}`, { waitUntil: 'networkidle0' });
const ok = await p.evaluate(() => window.ready());
if (!ok) console.log('WARN: script font not ready');
const name = `${ad}-${lang}-${V ? 'vertical' : 'horizontal'}`;
if (mode === 'stills') {
  fs.mkdirSync('stills', { recursive: true });
  for (const t of rest.map(Number)) {
    await p.evaluate(t => window.seek(t), t);
    await p.screenshot({ path: `stills/${name}-t${t.toFixed(2)}.jpg`, quality: 82 });
  }
} else {
  const dir = `frames/${name}`;
  fs.mkdirSync(dir, { recursive: true });
  const N = Math.round((await p.evaluate(() => window.DUR)) * 30);
  for (let f = 0; f < N; f++) {
    await p.evaluate(t => window.seek(t), f / 30);
    await p.screenshot({ path: `${dir}/${String(f).padStart(4, '0')}.png` });
  }
  console.log('done', name, N);
}
await b.close();
