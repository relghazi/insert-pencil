'use strict';
// Shared pieces for the split and the build. A document is an HTML template whose
// <script>/<style> bodies are replaced by /*@part:name*/ markers; each part has a recipe
// that turns source files back into the exact original text.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const abs = p => path.join(root, p);
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
// zlib output differs between platforms, so this hash swaps each quoted gzip base64 pack
// for the hash of its decompressed bytes; any change to the packed content still shows.
const contentSha256 = html => {
  let out = '', i = 0;
  for (let j; (j = html.indexOf('"H4sI', i)) >= 0;) {
    const k = html.indexOf('"', j + 1);
    out += html.slice(i, j + 1);
    try { out += 'gzip:' + sha256(zlib.gunzipSync(Buffer.from(html.slice(j + 1, k), 'base64'))); }
    catch { out += html.slice(j + 1, k); }
    i = k;
  }
  return sha256(out + html.slice(i));
};

const BLOCK = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const PART = name => `/*@part:${name}*/`;
const PART_RE = /\/\*@part:([^*]+)\*\//g;

// Embedded files are stored as real binaries and referenced by token.
const MIME_EXT = {
  'image/webp': 'webp', 'image/png': 'png', 'image/avif': 'avif', 'image/x-icon': 'ico',
  'font/ttf': 'ttf', 'video/webm': 'webm', 'audio/mp4': 'm4a', 'application/manifest+json': 'webmanifest',
};
const EXT_MIME = Object.fromEntries(Object.entries(MIME_EXT).map(([m, e]) => [e, m]));
const ASSET_RE = /@@asset:([^@]+)@@/g;
const DATA_URI_RE = /data:([a-z0-9.+\/-]+);base64,([A-Za-z0-9+\/]+={0,2})/gi;

// Online leaderboard address: NO2_LEADERBOARD_URL, else src/shell/leaderboard-config.json.
// Empty keeps the feature hidden and every CSP at connect-src 'none'; set, only its origin may be connected to.
let leaderboardCache;
function leaderboard() {
  if (leaderboardCache) return leaderboardCache;
  const file = abs('src/shell/leaderboard-config.json');
  const raw = String(process.env.NO2_LEADERBOARD_URL ?? (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).url || '' : '')).trim();
  if (!raw) return (leaderboardCache = { url: '', connect: "'none'" });
  const u = new URL(raw), local = u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname);
  if (u.protocol !== 'https:' && !local) throw Error('Leaderboard URL must be https:// (or http://127.0.0.1 for local tests): ' + raw);
  if (u.search || u.hash || u.username) throw Error('Leaderboard URL takes no query, hash or login: ' + raw);
  return (leaderboardCache = { url: u.origin + u.pathname.replace(/\/+$/, ''), connect: u.origin });
}
const LEADERBOARD_RE = /@@leaderboard-(url|connect)@@/g;

// Web build (the 249 MB single file crashed iPhones): with web.dir set, each asset is written once beside
// the page as a/<content hash>.<ext> and the page names it by that address, so a phone loads only what it shows.
const web = { dir: null, written: new Map() };
function expandAssets(text) {
  text = text.replace(LEADERBOARD_RE, (_, k) => leaderboard()[k]);
  return text.replace(ASSET_RE, (_, rel) => {
    const ext = path.extname(rel).slice(1), mime = EXT_MIME[ext];
    if (!mime) throw Error('Unknown asset type: ' + rel);
    const data = fs.readFileSync(abs(rel));
    if (web.dir) {
      let name = web.written.get(rel);
      if (!name) { name = 'a/' + sha256(data).slice(0, 16) + '.' + ext; fs.mkdirSync(path.join(web.dir, 'a'), { recursive: true }); fs.writeFileSync(path.join(web.dir, name), data); web.written.set(rel, name); }
      return name;
    }
    return `data:${mime};base64,` + data.toString('base64');
  });
}

const readText = rel => fs.readFileSync(abs(rel), 'utf8');

// Recipes. Each returns the exact text of one part.
function render(recipe) {
  if (typeof recipe === 'string') return expandAssets(readText(recipe));
  if (Array.isArray(recipe)) return recipe.map(render).join('');
  if ('text' in recipe) return recipe.text;
  if ('json' in recipe) return expandAssets(JSON.stringify(JSON.parse(readText(recipe.json))));
  if ('object' in recipe) {
    const out = {};
    for (const [k, r] of Object.entries(recipe.object)) out[k] = render(r);
    return JSON.stringify(out);
  }
  if ('gzipBase64' in recipe) return zlib.gzipSync(Buffer.from(render(recipe.gzipBase64), 'utf8'), { level: 9 }).toString('base64');
  if ('sha256' in recipe) return sha256(render(recipe.sha256));
  if ('document' in recipe) return renderDocument(recipe.document);
  throw Error('Unknown recipe ' + JSON.stringify(recipe).slice(0, 200));
}

// Loading card (2026-10-29): the page is one large file, so a progress bar fills as each big script arrives. The markers are
// <style> blocks, not scripts, so the page's scripts keep their order; the last one hides the card once every script has run.
// Website (opts.rest, build --web): the page's own marks fill the bar to its share of the wait, and the rest (the files the
// title waits for, opts.rest bytes) is filled by src/startup/early-sting.js; the cassette then leaves when the title is
// ready (body.no2-ready), not when the page's last script has run. opts.share is written back for the early script; opts.speed is the bytes a second
// the bar's easing assumes (a phone's 2 Mbit/s on the website, where a fast line is behind the studio card anyway).
function loadingMarks(html, opts = {}) {
  const TOKEN = '<style>@@loading-mark@@</style>', marks = [], total = html.length; let i = -1;
  const share = opts.rest ? total / (total + opts.rest) : 1, R = opts.rest ? '.no2-ready ' : ''; opts.share = share;
  while ((i = html.indexOf(TOKEN, i + 1)) >= 0) marks.push(i);
  // Each marker eases the bar toward the next one over the time that piece takes at about 4 MB/s, so it never stalls; a
  // transform animation, so it keeps moving on the compositor while the page is busy reading a big script.
  let out = '', at = 0;
  marks.forEach((i, k) => { const next = marks[k + 1] ?? total, p = (i / total * 100 * share).toFixed(1), n = (next / total * 100 * share).toFixed(1), s = Math.min(90, Math.max(.5, (next - i) / (opts.speed || 4e6))).toFixed(1);
    // The tape winds from the left pack onto the right one with the bar: each pack's radius keeps the
    // tape's area, r² = R²(1 - p) + r0²p, as a scale of the full pack (r0 = 0.543 of it, just round the hub).
    const reel = (q, left) => { const f = left ? 1 - q : q; return Math.sqrt(f + 0.543 * 0.543 * (1 - f)).toFixed(3); }, pq = p / 100, nq = n / 100, ease = `${s}s cubic-bezier(.2,.7,.4,1) forwards`;
    out += html.slice(at, i) + `<style>@keyframes lp${k}{from{transform:scaleX(${pq.toFixed(3)})}to{transform:scaleX(${nq.toFixed(3)})}}@keyframes ll${k}{from{transform:scale(${reel(pq, true)})}to{transform:scale(${reel(nq, true)})}}@keyframes lr${k}{from{transform:scale(${reel(pq, false)})}to{transform:scale(${reel(nq, false)})}}#loading-card b i{animation:lp${k} ${ease}}#loading-card .inside .pack.l{animation:ll${k} ${ease}}#loading-card .inside .pack.r{animation:lr${k} ${ease}}</style>`; at = i + TOKEN.length; });
  // The cassette leaves on html.no2-go: the first press at the start gate (src/comic/comic.js openGate), or at
  // once where there is no gate (an automated browser). With reduced motion (the system's or the game's setting) base.css stops every animation, so there the card is simply hidden
  // (before 2026-10-31 it stayed over the game for those players).
  out += html.slice(at); return out.replace(/<\/body>(?![\s\S]*<\/body>)/, `<style>html,body{background:#f4eedd}html.no2-go ${R}#loading-card{pointer-events:none;animation:lc-out .7s ease-in .35s forwards}html.no2-go ${R}#loading-card .cass{animation:lc-eject .8s cubic-bezier(.55,0,.7,.2) .2s forwards}html.no2-go ${R}#loading-card :is(b,.lc-line){transition:opacity .2s;opacity:0}@keyframes lc-out{to{opacity:0;visibility:hidden}}@keyframes lc-eject{to{transform:translateY(-28vh) rotate(-4deg) scale(.9);opacity:0}}@media (prefers-reduced-motion:reduce){${R}#loading-card{visibility:hidden;opacity:0}}.reduce-motion${R.trim()} #loading-card{visibility:hidden;opacity:0}html.no2-gate:not(.no2-go) #loading-card{visibility:visible!important;opacity:1!important}</style></body>`);
}
function renderDocument(doc, opts) {
  const template = expandAssets(readText(doc.template));
  const used = new Set();
  const out = template.replace(PART_RE, (_, name) => {
    if (!(name in doc.parts)) throw Error(`${doc.template}: no recipe for part ${name}`);
    used.add(name);
    return render(doc.parts[name]);
  });
  for (const name of Object.keys(doc.parts)) if (!used.has(name)) throw Error(`${doc.template}: part ${name} not in template`);
  return loadingMarks(out, opts);
}

module.exports = { web, leaderboard, root, abs, sha256, contentSha256, BLOCK, PART, PART_RE, MIME_EXT, EXT_MIME, ASSET_RE, DATA_URI_RE, expandAssets, render, renderDocument };
