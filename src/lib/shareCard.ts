// Sharing a news post, in the browser (the news page on the site and the
// student app): a dialog with a ready image of the post (photo, headline,
// start of the post, QR code to it) as an Instagram/Facebook story (9:16) or
// feed post (4:5), plus links for WhatsApp, Telegram, Facebook, X and email.
// Instagram takes no links from the web, so its button hands over the image.
// The dialog's styles are in global.css (.share-dlg).
import QRCode from 'qrcode';
import { icon } from './icons';

export type SharePost = {
  lang: 'he' | 'en' | 'ru';
  url: string; // absolute URL of the post
  title: string;
  lead: string; // plain-text start of the post
  date: string; // already formatted for the language
  image?: string;
};

export type ShareText = {
  title: string;
  story: string;
  post: string;
  cardHint: string;
  download: string;
  shareImage: string;
  link: string;
  copyLink: string;
  copied: string;
  more: string;
  instagramHint: string;
  scanToRead: string;
  close: string;
};

type Format = 'story' | 'post';

const W = 1080;
const PAD = 72;
const NAVY = '#17224a';
const BLUE = '#2f4b9b';
const INK_SOFT = '#4a5367';
// Story: the bottom 200px stay plain navy, under Instagram's reply field.
const LAYOUT = {
  post: { h: 1350, photo: 640, band: 240, below: 0, titleLines: 3 },
  story: { h: 1920, photo: 960, band: 240, below: 200, titleLines: 4 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Word-wraps text to at most `max` lines, ending the last one with "…" when cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === max) {
      let last = lines[max - 1];
      while (last && ctx.measureText(`${last}…`).width > width) last = last.replace(/\s*\S+$/, '');
      lines[max - 1] = `${last.replace(/[\s,.;:—–-]+$/, '')}…`;
      return lines;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawCard(d: SharePost, scan: string, format: Format): Promise<Blob> {
  const { h: H, photo: PHOTO_H, band, below, titleLines } = LAYOUT[format];
  const bandY = H - band - below;
  const rtl = d.lang === 'he';
  const family = rtl ? '"Heebo", sans-serif' : '"Montserrat", sans-serif';
  await Promise.all(
    ['600 28px', '700 56px', '400 32px'].map((f) => document.fonts.load(`${f} ${family}`, d.title + d.lead).catch(() => {}))
  );

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // Photo: a blurred copy fills the frame, the whole photo sits on top
  // (same look as the post page). The blur is a tiny copy scaled up.
  const photo = d.image ? await loadImage(d.image).catch(() => null) : null;
  if (photo) {
    const cover = Math.max(W / photo.width, PHOTO_H / photo.height);
    const tiny = document.createElement('canvas');
    tiny.width = 27;
    tiny.height = Math.round((27 * PHOTO_H) / W);
    const sw = W / cover;
    const sh = PHOTO_H / cover;
    tiny.getContext('2d')!.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, 0, 0, tiny.width, tiny.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tiny, 0, 0, W, PHOTO_H);
    ctx.fillStyle = 'rgba(23, 34, 74, 0.2)';
    ctx.fillRect(0, 0, W, PHOTO_H);
    const fit = Math.min(W / photo.width, PHOTO_H / photo.height);
    const pw = photo.width * fit;
    const ph = photo.height * fit;
    ctx.drawImage(photo, (W - pw) / 2, (PHOTO_H - ph) / 2, pw, ph);
  } else {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, PHOTO_H);
    const mark = await loadImage('/images/brand/icon-white.svg').catch(() => null);
    if (mark) ctx.drawImage(mark, (W - 220) / 2, (PHOTO_H - 220) / 2, 220, 220);
  }

  // Text: date, headline, start of the post.
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'start';
  const x = rtl ? W - PAD : PAD;
  const width = W - PAD * 2;
  let y = PHOTO_H + 72;
  ctx.fillStyle = BLUE;
  ctx.font = `600 28px ${family}`;
  ctx.fillText(d.date, x, y);
  y += 74;
  ctx.fillStyle = NAVY;
  ctx.font = `700 56px ${family}`;
  for (const line of wrap(ctx, d.title, width, titleLines)) {
    ctx.fillText(line, x, y);
    y += 66;
  }
  y += 6;
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 32px ${family}`;
  const room = Math.floor((bandY - 40 - (y - 32)) / 46);
  if (room > 0)
    for (const line of wrap(ctx, d.lead, width, room)) {
      ctx.fillText(line, x, y);
      y += 46;
    }

  // Band: logo on one side, QR code and its caption on the other.
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, bandY, W, H - bandY);
  const at = (left: number, w: number) => (rtl ? W - left - w : left);
  const logo = await loadImage('/images/brand/logo-line-white.svg').catch(() => null);
  if (logo) {
    const lh = 84;
    const lw = (lh * logo.width) / logo.height;
    ctx.drawImage(logo, at(PAD, lw), bandY + (band - lh) / 2, lw, lh);
  }
  const qr = await loadImage(
    await QRCode.toDataURL(d.url, { margin: 1, errorCorrectionLevel: 'M', width: 480, color: { dark: NAVY, light: '#ffffff' } })
  );
  const qs = 184;
  const qx = at(W - PAD - qs, qs);
  const qy = bandY + (band - qs) / 2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(qx - 12, qy - 12, qs + 24, qs + 24, 18);
  ctx.fill();
  ctx.drawImage(qr, qx, qy, qs, qs);

  ctx.textAlign = 'end';
  const cx = rtl ? qx + qs + 44 : qx - 44;
  ctx.fillStyle = '#fff';
  ctx.font = `600 26px ${family}`;
  const caption = wrap(ctx, scan, 300, 2);
  let cy = bandY + band / 2 - (caption.length * 34) / 2 + 8;
  for (const line of caption) {
    ctx.fillText(line, cx, cy);
    cy += 34;
  }
  ctx.fillStyle = '#c9d3f0';
  ctx.font = `500 24px ${family}`;
  ctx.fillText(new URL(d.url).host, cx, cy + 6);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject()), 'image/png'));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

let dialog: HTMLDialogElement | null = null;

/** Opens the share dialog for a post (one dialog per page, refilled each time). */
export function openShare(d: SharePost, t: ShareText) {
  dialog?.remove();
  dialog = document.createElement('dialog');
  dialog.className = 'share-dlg';
  dialog.dir = d.lang === 'he' ? 'rtl' : 'ltr';
  dialog.lang = d.lang;
  dialog.innerHTML = `
    <div class="share-dlg__head">
      <h2>${esc(t.title)}</h2>
      <button type="button" class="share-dlg__close" data-close aria-label="${esc(t.close)}">${icon('close')}</button>
    </div>
    <div class="share-dlg__tabs" role="group">
      <button type="button" data-format="story" aria-pressed="true">${esc(t.story)}</button>
      <button type="button" data-format="post" aria-pressed="false">${esc(t.post)}</button>
    </div>
    <p class="share-dlg__hint">${esc(t.cardHint)}</p>
    <div class="share-dlg__preview"><img alt="" data-preview hidden /></div>
    <div class="share-dlg__row">
      <button type="button" class="btn btn--primary" data-share-image hidden>${icon('share')}${esc(t.shareImage)}</button>
      <button type="button" class="btn btn--ghost" data-download>${icon('download')}${esc(t.download)}</button>
    </div>
    <h3>${esc(t.link)}</h3>
    <div class="share-dlg__links">
      <a class="share-link" data-net="whatsapp" target="_blank" rel="noopener">${icon('chat')}WhatsApp</a>
      <a class="share-link" data-net="telegram" target="_blank" rel="noopener">${icon('send')}Telegram</a>
      <a class="share-link" data-net="facebook" target="_blank" rel="noopener">${icon('facebook')}Facebook</a>
      <button type="button" class="share-link" data-instagram>${icon('instagram')}Instagram</button>
      <a class="share-link" data-net="x" target="_blank" rel="noopener">${icon('x')}X</a>
      <a class="share-link" data-net="email">${icon('mail')}Email</a>
      <button type="button" class="share-link" data-copy>${icon('link')}<span>${esc(t.copyLink)}</span></button>
      <button type="button" class="share-link" data-native hidden>${icon('share')}${esc(t.more)}</button>
    </div>
    <p class="share-dlg__note" data-insta-hint hidden>${esc(t.instagramHint)}</p>`;
  document.body.append(dialog);
  const dlg = dialog;
  const $ = <T extends Element>(sel: string) => dlg.querySelector<T>(sel)!;

  const slug = new URL(d.url).pathname.split('/').filter(Boolean).pop() || 'news';
  const cards: Partial<Record<Format, Promise<File>>> = {};
  let format: Format = 'story';
  const card = () =>
    (cards[format] ??= drawCard(d, t.scanToRead, format).then(
      (b) => new File([b], `etude-${slug}-${format}.png`, { type: 'image/png' })
    ));

  const preview = $<HTMLImageElement>('[data-preview]');
  const shareImageBtn = $<HTMLButtonElement>('[data-share-image]');
  const show = async () => {
    for (const b of dlg.querySelectorAll<HTMLElement>('[data-format]')) b.setAttribute('aria-pressed', String(b.dataset.format === format));
    const file = await card();
    URL.revokeObjectURL(preview.src);
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    shareImageBtn.hidden = !navigator.canShare?.({ files: [file] });
  };

  const download = async () => {
    const file = await card();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  // The phone's share menu: Instagram (story or feed), Facebook, WhatsApp…
  const shareFile = async () => {
    const file = await card();
    if (!navigator.canShare?.({ files: [file] })) return download();
    try {
      await navigator.share({ files: [file], title: d.title, text: d.url });
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') download();
    }
  };
  const copyLink = () => navigator.clipboard?.writeText(d.url).catch(() => {});

  $('[data-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
  dlg.addEventListener('close', () => dlg.remove());
  for (const b of dlg.querySelectorAll<HTMLButtonElement>('[data-format]'))
    b.addEventListener('click', () => {
      format = b.dataset.format as Format;
      show();
    });
  $('[data-download]').addEventListener('click', download);
  shareImageBtn.addEventListener('click', shareFile);

  const text = encodeURIComponent(d.title);
  const url = encodeURIComponent(d.url);
  const links: Record<string, string> = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${d.title}\n${d.url}`)}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    email: `mailto:?subject=${text}&body=${encodeURIComponent(`${d.lead}\n\n${d.url}`)}`,
  };
  for (const a of dlg.querySelectorAll<HTMLAnchorElement>('[data-net]')) a.href = links[a.dataset.net!];

  $('[data-instagram]').addEventListener('click', () => {
    copyLink();
    $<HTMLElement>('[data-insta-hint]').hidden = false;
    shareFile();
  });

  const copyLabel = $('[data-copy] span');
  $('[data-copy]').addEventListener('click', async () => {
    await copyLink();
    copyLabel.textContent = t.copied;
    setTimeout(() => (copyLabel.textContent = t.copyLink), 2000);
  });

  const native = $<HTMLButtonElement>('[data-native]');
  native.hidden = !navigator.share;
  native.addEventListener('click', () => navigator.share({ title: d.title, url: d.url }).catch(() => {}));

  dlg.showModal();
  show();
}
