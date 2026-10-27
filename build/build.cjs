'use strict';
// npm run build: single-file HTML from src/ + assets/, plus a release ZIP (HTML and README).
// Flags: --html-only skips the ZIP.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { abs, sha256, renderDocument } = require('./lib.cjs');

const manifest = JSON.parse(fs.readFileSync(abs('build/manifest.json'), 'utf8'));
const dist = abs('dist');
fs.mkdirSync(dist, { recursive: true });

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
