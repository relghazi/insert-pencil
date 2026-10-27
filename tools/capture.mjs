// Playwright capture of the release HTML in real Chromium with hardware rendering.
// Usage: node capture.mjs [html] [outDir]
// Ported from outputs/No2-PC-Capture/capture_no2.py (title, hub, focused notebook, Defender play).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = path.resolve(process.argv[2] || path.join(root, 'outputs/No2-Arcade-v0.4.5/No2-Arcade-v0.4.5.html'));
const out = path.resolve(process.argv[3] || path.join(root, 'tools/captures', new Date().toISOString().replace(/[:.]/g, '-')));
fs.mkdirSync(out, { recursive: true });

const report = { html, steps: [], errors: [], console: [], externalRequests: [] };
const save = () => fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify(report, null, 2));

// Headed launch keeps Chromium on the real GPU; headless can fall back to SwiftShader.
// Default is installed Chrome: Playwright's bundled Chromium 141 rejects img.decode() on
// some embedded WebPs and never reaches the hub. CAPTURE_CHANNEL=chromium uses the bundled one.
const channel = process.env.CAPTURE_CHANNEL || 'chrome';
const context = await chromium.launchPersistentContext(path.join(out, 'browser-profile'), {
  channel: channel === 'chromium' ? undefined : channel,
  headless: false,
  args: ['--disable-crash-reporter', '--disable-breakpad', '--ignore-gpu-blocklist'],
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = context.pages()[0] || await context.newPage();
// Captures never reach the online leaderboard (their forced game overs were sent as runs before 2026-10-31).
await context.route(/^https?:/, r => r.abort());
page.on('pageerror', e => { report.errors.push(String(e)); save(); });
page.on('console', m => {
  report.console.push({ type: m.type(), text: m.text().slice(0, 1200) });
  if (process.env.CAPTURE_VERBOSE) console.log(`[${m.type()}] ${m.text().slice(0, 300)}`);
});
page.on('crash', () => { report.errors.push('page crashed'); save(); console.log('PAGE CRASHED'); });
context.on('close', () => console.log('context closed'));
page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) report.externalRequests.push(r.url()); });

const wait = (fn, timeout = 60000) => page.waitForFunction(fn, null, { timeout, polling: 100 });
const shot = async name => {
  await page.screenshot({ path: path.join(out, name + '.png') });
  report.steps.push({ name, t: Date.now() });
  save();
  console.log(name);
};
const key = async (name, ms = 180) => { await page.keyboard.down(name); await page.waitForTimeout(ms); await page.keyboard.up(name); };

try {
  await page.goto(pathToFileURL(html).href, { waitUntil: 'load', timeout: 120000 });
  await wait(() => window.No2?.services.renderer.gate?.ready, 180000);
  report.renderer = await page.evaluate(() => {
    const gl = HubGate.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info');
    return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  console.log('renderer:', report.renderer);

  await wait(() => No2.intro.phase === 'title' && No2.intro.elapsed >= 2.6, 15000);
  await shot('01-title');

  // Skip the rest of the first-launch intro and land on the hub.
  await page.evaluate(() => No2.intro.finish('capture-skip'));
  await wait(() => !No2.intro.active, 60000);
  await page.evaluate(() => { HubGate.setGlance(0); No2.renderHub(); });
  await page.waitForTimeout(1000);
  await shot('02-hub');

  await page.locator('#desk-scribble-defender').focus();
  await page.waitForTimeout(800);
  await shot('03-notebook-focus');

  await page.evaluate(() => { window.captureOpen = No2.open('scribble-defender'); });
  await wait(() => No2.selected === 'scribble-defender' && !No2.loading, 90000);
  await page.waitForTimeout(1500);
  await shot('04-defender-title');

  await page.evaluate(() => No2.go('play', { demo: true }));
  await wait(() => No2.adapter.api && !No2.loading, 90000);
  for (let s = 0; s <= 20; s += 5) {
    if (s) await page.waitForTimeout(5000);
    await shot(`05-defender-play-${String(s).padStart(2, '0')}s`);
  }
  report.memory = await page.evaluate(() => No2.memory?.());
} catch (e) {
  report.failure = String(e);
  console.log('FAILED:', e.message);
}
save();
await context.close();
fs.rmSync(path.join(out, 'browser-profile'), { recursive: true, force: true });
console.log('errors:', report.errors.length, 'external requests:', report.externalRequests.length);
console.log('out:', out);
