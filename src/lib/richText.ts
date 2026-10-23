// Minimal, safe formatting for news post bodies written in the /admin/ panel
// (the panel's B / I / U / Link buttons insert this syntax):
//
//   **bold**   *italic*   __underline__   [link text](https://example.com)
//   - list item (one per line)
//   ![caption](https://…)   on its own line: photo, video file (.mp4/.webm/.mov) or YouTube/Vimeo
//   !embed(https://…)       on its own line: any page in an iframe (maps, forms, players)
//   blank line = new paragraph, single line break = <br>
//
// Everything else is escaped, so no raw HTML from a post ever reaches the page.
// Links may only point to http(s), mailto:, tel: or a site path ("/he/contact/").

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/)/i;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function inline(raw: string): string {
  // Pull links out first so their URLs aren't touched by the other rules.
  const links: string[] = [];
  let text = raw.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (whole, label: string, url: string) => {
    if (!SAFE_URL.test(url)) return whole;
    const external = /^https?:\/\//i.test(url) && !/^https?:\/\/etude\.ristar\.co(\/|$)/i.test(url);
    links.push(
      `<a href="${escapeHtml(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${format(escapeHtml(label))}</a>`
    );
    return `\u0000${links.length - 1}\u0000`;
  });
  text = format(escapeHtml(text));
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
}

const MEDIA = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/;
const EMBED = /^!embed\(([^)\s]+)\)$/;
const SAFE_MEDIA = /^(https:\/\/|\/)/i;

/** YouTube / Vimeo page link → its player URL. */
function playerUrl(url: string): string | null {
  const yt = url.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

const frame = (src: string, title: string) =>
  `<iframe src="${escapeHtml(src)}" title="${escapeHtml(title)}" loading="lazy" allowfullscreen ` +
  `allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" ` +
  `sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"></iframe>`;

/** A line that is only a media mark → <figure>, otherwise null. */
function media(line: string): string | null {
  const m = line.trim().match(MEDIA);
  const e = line.trim().match(EMBED);
  const url = m ? m[2] : e?.[1];
  if (!url || !SAFE_MEDIA.test(url)) return null;
  const caption = m?.[1].trim() || '';
  const player = playerUrl(url);
  const el = e || player
    ? frame(player || url, caption || (player ? 'Video' : 'Embedded content'))
    : /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)
      ? `<video src="${escapeHtml(url)}" controls playsinline preload="metadata"></video>`
      : `<img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" loading="lazy" />`;
  return `<figure class="rt-media${e || player ? ' rt-media--frame' : ''}">${el}${caption ? `<figcaption>${inline(caption)}</figcaption>` : ''}</figure>`;
}

// Markers only count at word edges, so "2*3*4" or "snake__case" stay as typed.
const BOLD = /\*\*(?=\S)([\s\S]*?\S)\*\*/g;
const UNDERLINE = /(^|[^\p{L}\p{N}_])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}_])/gu;
const ITALIC = /(^|[^*\p{L}\p{N}])\*(?=\S)([^*]*?\S)\*(?![*\p{L}\p{N}])/gu;

function format(escaped: string): string {
  return escaped
    .replace(BOLD, '<strong>$1</strong>')
    .replace(UNDERLINE, '$1<u>$2</u>')
    .replace(ITALIC, '$1<em>$2</em>');
}

/** Post body → safe HTML (paragraphs, line breaks, lists, inline formatting). */
export function renderRichText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n');
      // Media lines break out of the paragraph around them.
      if (lines.some((l) => media(l))) {
        const out: string[] = [];
        let text: string[] = [];
        const flush = () => { if (text.length) out.push(`<p>${text.map(inline).join('<br>')}</p>`); text = []; };
        for (const l of lines) {
          const html = media(l);
          if (html) { flush(); out.push(html); } else text.push(l);
        }
        flush();
        return out.join('');
      }
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

/** Post body → plain text without formatting marks (excerpts, meta descriptions, llms.txt). */
export function plainText(text: string): string {
  return text
    .replace(/^\s*!(?:\[[^\]\n]*\]|embed)\([^)\s]+\)\s*$/gm, '')
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, '$1')
    .replace(BOLD, '$1')
    .replace(UNDERLINE, '$1$2')
    .replace(ITALIC, '$1$2')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain-text excerpt cut at a word boundary. */
export function excerpt(text: string, max: number): string {
  const plain = plainText(text);
  if (plain.length <= max) return plain;
  const cut = plain.lastIndexOf(' ', max);
  return plain.slice(0, cut > max * 0.6 ? cut : max).replace(/[\s,.;:—–-]+$/, '') + '…';
}
