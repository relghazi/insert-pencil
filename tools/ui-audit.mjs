// UI audit: walk every screen of the built game and measure every visible text element (DOM, including the game
// iframes, plus canvas text the games report through No2CanvasText): font size, family, box. Flags text below the
// meta size of the UI type rules (22 px at 1080p, key glyph labels .85 of that), overlapping text, text cut off by the
// window or by its container, and duplicate visible labels. With --xbox a stub pad presses A first so the game really
// switches to Xbox glyphs; each screen records the input mode it was measured in.
// Writes <out>/audit.json and an annotated screenshot per screen (red: too small, orange: overlap, magenta: clipped).
// With --all every available notebook is walked (title, cheat sheet, play page, pause sheet), not only the first three.
// Usage: node tools/ui-audit.mjs <html> <out> [width height] [--xbox] [--all]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2), xbox = args.includes('--xbox'), all = args.includes('--all'), pos = args.filter(a => !a.startsWith('--'));
const [html, out] = pos.map((p, i) => i < 2 ? path.resolve(p) : p), W = +(pos[2] || 1920), H = +(pos[3] || 1080);
fs.mkdirSync(out, { recursive: true });
const UNIT = Math.min(W / 1920, H / 1080), MIN_PX = 22 * UNIT, GLYPH_PX = MIN_PX * .85; // meta size, scaled from 1080p
const ctx = await chromium.launchPersistentContext(path.join(out, 'profile'), { channel: 'chrome', headless: false, chromiumSandbox: true, viewport: { width: W, height: H } });
// Captures never reach the online leaderboard (their forced game overs were sent as runs before 2026-10-31).
await ctx.route(/^https?:/, r => r.abort());
if (xbox) await ctx.addInitScript(() => { const pad = { id: 'Xbox Wireless Controller', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) }; Object.defineProperty(Navigator.prototype, 'getGamepads', { configurable: true, value: () => [pad, null, null, null] });
  window.__press = async i => { pad.buttons[i].pressed = true; pad.timestamp++; await new Promise(r => setTimeout(r, 120)); pad.buttons[i].pressed = false; pad.timestamp++; }; });
const page = ctx.pages()[0], errors = [];
page.on('pageerror', e => errors.push(String(e)));

// Runs inside each frame: every element that directly holds visible text.
const collect = (frameOffset) => {
  const out = [], vw = innerWidth, vh = innerHeight;
  const visible = el => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
  const clipBox = (el, re = /(hidden|clip|auto|scroll)/) => { let r = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 }; for (let e = el.parentElement; e && e.nodeType === 1; e = e.parentElement) { const s = getComputedStyle(e); if (re.test(s.overflow + s.overflowX + s.overflowY)) { const b = e.getBoundingClientRect(); r = { l: Math.max(r.l, b.left), t: Math.max(r.t, b.top), r: Math.min(r.r, b.right), b: Math.min(r.b, b.bottom) }; } } return r; };
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) continue;
    const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (!text || !visible(el)) continue;
    const rects = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).flatMap(n => { const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()]; }).filter(r => r.width > 1 && r.height > 1);
    if (!rects.length) continue;
    const b = { l: Math.min(...rects.map(r => r.left)), t: Math.min(...rects.map(r => r.top)), r: Math.max(...rects.map(r => r.right)), b: Math.max(...rects.map(r => r.bottom)) };
    const s = getComputedStyle(el), c = clipBox(el), scale = frameOffset.scale || 1;
    const clipped = b.l < c.l - 1 || b.t < c.t - 1 || b.r > c.r + 1 || b.b > c.b + 1 || b.r < 0 || b.b < 0 || b.l > vw || b.t > vh;
    // Out of view only inside a scrolling container: reachable by scrolling, reported apart from real clipping.
    let sc = null; for (let e = el.parentElement; e && e.nodeType === 1; e = e.parentElement) { const q = getComputedStyle(e); if (/(auto|scroll)/.test(q.overflowX + q.overflowY) && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) { sc = e; break; } }
    let inner = false; if (sc) for (let e = el.parentElement; e && e !== sc; e = e.parentElement) { const q = getComputedStyle(e), r = e.getBoundingClientRect(); if (/(hidden|clip)/.test(q.overflow + q.overflowX + q.overflowY) && (b.l < r.left - 1 || b.t < r.top - 1 || b.r > r.right + 1 || b.b > r.bottom + 1)) inner = true; }
    const scrolled = clipped && !!sc && !inner;
    out.push({ glyph: !!el.closest('.device-glyph,svg'), text: text.slice(0, 60), tag: el.tagName.toLowerCase(), id: el.id, cls: String(el.className).slice(0, 40), size: +(parseFloat(s.fontSize) * scale).toFixed(1), family: s.fontFamily.split(',')[0].replace(/["']/g, '').trim(), weight: s.fontWeight, color: s.color, clipped: clipped && !scrolled, scrolled,
      box: { x: frameOffset.x + b.l * scale, y: frameOffset.y + b.t * scale, w: (b.r - b.l) * scale, h: (b.b - b.t) * scale } });
  }
  return out;
};

async function measure(name) {
  // Xbox runs: click the left stick (bound to nothing) so the game switches to controller glyphs before measuring.
  if (xbox) await page.evaluate(() => window.__press(10));
  await page.waitForTimeout(900);
  const items = await page.evaluate(collect, { x: 0, y: 0, scale: 1 });
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const el = await f.frameElement().catch(() => null); if (!el) continue;
    const box = await el.boundingBox(); if (!box || box.width < 10) continue;
    const inner = await f.evaluate(() => innerWidth).catch(() => 0); if (!inner) continue;
    items.push(...(await f.evaluate(collect, { x: box.x, y: box.y, scale: box.width / inner }).catch(() => [])).map(i => ({ ...i, frame: true })));
  }
  const onScreen = items.filter(i => i.box.x + i.box.w > 0 && i.box.y + i.box.h > 0 && i.box.x < W && i.box.y < H);
  const canvas = [];
  for (const f of page.frames()) { if (f !== page.mainFrame()) { const box = await (await f.frameElement().catch(() => null))?.boundingBox(); if (!box || box.width < 10 || !(await f.evaluate(() => document.visibilityState === 'visible' && frameElement?.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false).catch(() => false))) continue; }
    canvas.push(...await f.evaluate(() => globalThis.No2CanvasText?.() || []).catch(() => [])); }
  const small = [...onScreen.filter(i => i.size < (i.glyph ? GLYPH_PX : MIN_PX) - .05), ...canvas.filter(t => t.size < MIN_PX - .5).map(t => ({ ...t, family: 'canvas' }))];
  const mode = await page.evaluate(() => document.body.dataset.input || 'keyboard');
  if (xbox && mode !== 'xbox') throw Error(name + ': measured in ' + mode + ' mode, expected xbox');
  const overlaps = [];
  // Text scrolled out of its container is reachable by scrolling, not overlapping (it is reported as clipped).
  for (let a = 0; a < onScreen.length; a++) for (let b = a + 1; b < onScreen.length; b++) { if (onScreen[a].clipped || onScreen[b].clipped || onScreen[a].scrolled || onScreen[b].scrolled) continue;
    const p = onScreen[a].box, q = onScreen[b].box, ix = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), iy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
    if (ix > 3 && iy > 3 && ix * iy > 0.15 * Math.min(p.w * p.h, q.w * q.h)) overlaps.push([onScreen[a].text, onScreen[b].text]);
  }
  const sizes = [...new Set(onScreen.map(i => Math.round(i.size)))].sort((a, b) => a - b);
  const families = [...new Set(onScreen.map(i => i.family))];
  const labels = {}; for (const i of onScreen) { const k = i.text.toLowerCase(); labels[k] = (labels[k] || 0) + 1; }
  const dupes = Object.entries(labels).filter(([k, n]) => n > 1 && k.length > 2).map(([k, n]) => k + ' x' + n);
  await page.screenshot({ path: path.join(out, name + '.png') });
  await page.evaluate(({ items, small, overlaps, MIN_PX }) => {
    const layer = document.createElement('div'); layer.id = '__audit'; Object.assign(layer.style, { position: 'fixed', inset: 0, zIndex: 2147483647, pointerEvents: 'none' }); document.body.append(layer);
    const ov = new Set(overlaps.flat());
    for (const i of items) { const d = document.createElement('div'), col = i.clipped ? '#f0f' : i.size < MIN_PX ? '#f00' : ov.has(i.text) ? '#f80' : '#0a0';
      Object.assign(d.style, { position: 'absolute', left: i.box.x + 'px', top: i.box.y + 'px', width: i.box.w + 'px', height: i.box.h + 'px', outline: '2px solid ' + col, font: '10px monospace', color: col, background: col + '18' }); d.textContent = Math.round(i.size); layer.append(d); }
  }, { items: onScreen, small, overlaps, MIN_PX });
  await page.screenshot({ path: path.join(out, name + '-audit.png') });
  await page.evaluate(() => document.getElementById('__audit')?.remove());
  return { name, mode, canvas, count: onScreen.length, sizes, families, small: small.map(i => `${i.text} (${i.size}px ${i.family})`), overlaps: overlaps.map(o => o.join(' | ')), clipped: onScreen.filter(i => i.clipped).map(i => i.text), scrolled: onScreen.filter(i => i.scrolled).length, dupes, items: onScreen.map(({ text, size, family, frame, box }) => ({ text, size, family, frame: !!frame, x: Math.round(box.x), y: Math.round(box.y) })) };
}

const report = [];
await page.goto(pathToFileURL(html).href);
await page.evaluate(() => { const k = 'No2Arcade:settings', s = JSON.parse(localStorage.getItem(k) || '{}'); s.introSeenVersion = String(No2Catalog.version); localStorage.setItem(k, JSON.stringify(s)); });
await page.reload(); await page.waitForTimeout(2600); report.push(await measure('01-title'));
await page.waitForTimeout(2600); report.push(await measure('02-locker'));
await page.waitForFunction(() => document.getElementById('desk-scores'), null, { timeout: 30000 }).catch(() => {});
await page.evaluate(() => document.getElementById('desk-scores')?.focus()); report.push(await measure('03-locker-focus-door'));
for (const k of ['settings', 'scores', 'achievements', 'calculator', 'eraser', 'cast']) { await page.evaluate(k => No2.dialog(k), k); report.push(await measure('04-dialog-' + k)); await page.evaluate(() => No2.closeDialog()); }
const ids = all ? await page.evaluate(() => No2Catalog.notebooks.filter(n => n.available).map(n => n.id)) : ['scribble-defender', 'erasteroids', 'gym-class-pong'];
for (const [n, id] of ids.entries()) {
  await page.evaluate(id => No2.open(id), id); await page.waitForTimeout(2200);
  for (const pg of n < 3 ? ['title', 'notes', 'play', 'scores', 'back'] : ['title', 'notes', 'play']) { await page.evaluate(pg => No2.go(pg), pg).catch(() => {}); await page.waitForTimeout(pg === 'play' ? 2600 : 500); report.push(await measure(`05-${id}-${pg}`)); }
  if (n < 3 && id !== 'gym-class-pong') { await page.evaluate(() => No2.go('play')); await page.waitForTimeout(1500); await page.evaluate(() => document.getElementById('play-ready')?.click()); await page.waitForTimeout(400); await page.keyboard.press('p'); report.push(await measure(`05-${id}-paused`));
    // Pause is the shell's pause sheet now (one for every game); Defender settings are not reached from it.
    await page.keyboard.press('p'); }
  await page.evaluate(() => No2.close()); await page.waitForTimeout(1300);
}
await page.evaluate(() => No2.intro.start(true)); await page.waitForTimeout(2000); report.push(await measure('06-intro-page1'));
await page.waitForTimeout(5000); report.push(await measure('06-intro-page1-zoomed'));
fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify({ window: [W, H], minPx: MIN_PX, xbox, errors, screens: report }, null, 2));
for (const r of report) console.log(`${r.name.padEnd(34)} ${r.mode.padEnd(8)} texts ${String(r.count).padStart(3)}  sizes ${r.sizes.join(',')}  fonts ${r.families.length}  small ${r.small.length}  overlap ${r.overlaps.length}  clipped ${r.clipped.length}  dupes ${r.dupes.length}`);
console.log(JSON.stringify({ errors }));
await ctx.close();
