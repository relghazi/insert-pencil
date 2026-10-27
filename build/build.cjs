'use strict';
// npm run build: single-file HTML from src/ + assets/, plus a release ZIP (HTML and README).
// Flags: --html-only skips the ZIP.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { abs, sha256, renderDocument, expandAssets, web } = require('./lib.cjs');

const manifest = JSON.parse(fs.readFileSync(abs('build/manifest.json'), 'utf8'));
const dist = abs('dist');
fs.mkdirSync(dist, { recursive: true });

// --web DIR (owner 2026-11-01): the website version for no2arca.de, a small index.html with its assets as files in DIR/a.
// The single-file HTML and its lock are untouched; the web page also allows its own origin ('self') in its CSP.
const wi = process.argv.indexOf('--web');
if (wi >= 0) {
  const dir = path.resolve(process.argv[wi + 1] || abs('dist/web'));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); web.dir = dir;
  // The studio card plays first on the website (owner 2026-11-03): sting.js leaves the comic part for an early script placed
  // right after the page's CSP, ahead of the loading cassette and every other script (src/startup/early-sting.js).
  const parts = manifest.document.parts, doc = { ...manifest.document, parts: { ...parts, comic: parts.comic.filter(p => p !== 'src/comic/sting.js') } };
  const startup = { rest: webStartupBytes(), speed: 2.5e5 };
  let page = renderDocument(doc, startup);
  page = page.replace(/img-src data: blob:/g, "img-src 'self' data: blob:").replace(/font-src data:/g, "font-src 'self' data:").replace(/connect-src /g, "connect-src 'self' ");
  const earlyJs = expandAssets(fs.readFileSync(abs('src/comic/sting.js'), 'utf8') + '\n' + fs.readFileSync(abs('src/startup/early-sting.js'), 'utf8').replace('@@web-loading@@', JSON.stringify({ share: +startup.share.toFixed(4), rest: startup.rest })));
  if (/<\/script/i.test(earlyJs)) throw Error('Unescaped </script in the early studio card script');
  const csp = [...page.matchAll(/<meta http-equiv="Content-Security-Policy"[^>]*>/g)].pop(), head = page.indexOf('</head>');
  if (!csp || csp.index > head) throw Error('No CSP meta in the web page head');
  const at = csp.index + csp[0].length;
  // The cassette's picture waits for the card's files (No2EarlySting.cassette).
  const cass = /<img src="(a\/[0-9a-f]+\.webp)" alt="">/.exec(page.slice(page.indexOf('<div id="loading-card"')));
  if (!cass) throw Error('No loading cassette picture in the web page');
  page = page.replace(cass[0], `<img data-src="${cass[1]}" alt=""><script>No2EarlySting.cassette()</script>`);
  page = page.slice(0, at) + '<script>' + earlyJs + '</script>' + page.slice(at);
  fs.writeFileSync(path.join(dir, 'index.html'), page);
  let bytes = 0; for (const n of web.written.values()) bytes += fs.statSync(path.join(dir, n)).size;
  console.log(`WEB   ${path.relative(abs(''), dir)}/index.html  ${Buffer.byteLength(page)} bytes, ${web.written.size} assets ${Math.round(bytes / 1048576)} MB`);
  process.exit(0);
}
// The bytes the website's title waits for after the page itself: the locker's drawings (not Ace's locker), the fonts it
// measures with (the cassette's own hand is already loaded) and the title art; the cassette's bar shares out the wait by them.
function webStartupBytes() {
  const size = token => { const m = /@@asset:([^@]+)@@/.exec(token); return m ? fs.statSync(abs(m[1])).size : 0; };
  const local = JSON.parse(fs.readFileSync(abs('assets/hub/local-images.json'), 'utf8')), data = JSON.parse(fs.readFileSync(abs('assets/asset-data.json'), 'utf8'));
  let n = 0;
  for (const [k, v] of Object.entries(local)) if (k.startsWith('env/locker-') && k !== 'env/locker-ace.png') n += size(v);
  for (const f of new Set(data.fontContract.map(f => data.files[f.file]))) if (!/PatrickHand/.test(f)) n += size(f);
  const title = data.assets.find(a => a.id === 'start-title' && a.file);
  return n + (title ? size(data.files[title.file] || '@@asset:assets/' + title.file + '@@') : 0);
}
const html = renderDocument(manifest.document);
for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (/<\/script/i.test(m[1])) throw Error('Unescaped </script inside a script block');
const htmlPath = path.join(dist, manifest.output);
fs.writeFileSync(htmlPath, html);
const hash = sha256(html);
console.log(`HTML  ${path.relative(abs(''), htmlPath)}  ${Buffer.byteLength(html)} bytes  sha256 ${hash}`);
console.log(hash === manifest.lockedSha256 ? '      matches lockedSha256' : `      differs from lockedSha256 (${manifest.lockedSha256.slice(0, 12)})`);

if (process.argv.includes('--html-only')) process.exit(0);

// Release ZIP: HTML and README, flat.
const zipPath = path.join(dist, manifest.output.replace(/\.html$/, '.zip'));
fs.rmSync(zipPath, { force: true });
execFileSync('zip', ['-j', '-q', '-9', zipPath, htmlPath, abs(manifest.readme)]);
console.log(`ZIP   ${path.relative(abs(''), zipPath)}  ${fs.statSync(zipPath).size} bytes`);
