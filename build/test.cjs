'use strict';
// npm test: rebuild the HTML, check it against the lock, then run every preservation check on it.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { abs, sha256, contentSha256, renderDocument } = require('./lib.cjs');

const manifest = JSON.parse(fs.readFileSync(abs('build/manifest.json'), 'utf8'));
const html = renderDocument(manifest.document);
const htmlPath = abs(path.join('dist', manifest.output));
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.writeFileSync(htmlPath, html);

let failed = 0;
// The v0.4.5 baseline every Defender, save and module comparison is made against must never change.
if (sha256(fs.readFileSync(abs('work/v045/No2-Arcade-v0.4.5.html'))) === '590572bf318a10c02756d210a30f33ced0bcf0426afb543562d00a6f4922f6b6') console.log('PASS v0.4.5 baseline unchanged');
else { failed++; console.log('FAIL work/v045/No2-Arcade-v0.4.5.html changed'); }
const hash = sha256(html);
if (hash === manifest.lockedSha256) console.log('PASS Built HTML matches lockedSha256 ' + hash);
else if (contentSha256(html) === manifest.lockedContentSha256) console.log('PASS Built HTML matches lockedContentSha256 ' + manifest.lockedContentSha256 + ' (only gzip bytes differ on this platform)');
else {
  failed++;
  console.log(`FAIL Built HTML ${hash} differs from lockedSha256 ${manifest.lockedSha256}.\n     If the change is intended and all checks below pass, update lockedSha256 in build/manifest.json.`);
}

// Every classic script in src/ must parse (a stray quote once blanked the whole game while the rule checks still passed).
const vm = require('vm'), walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.js$/.test(e.name) ? [path.join(d, e.name)] : []);
const broken = walk(abs('src')).filter(f => { const src = fs.readFileSync(f, 'utf8'); if (/^\s*(import|export)\b/m.test(src)) return false; try { new vm.Script(src, { filename: f }); return false; } catch (e) { console.log(`FAIL ${path.relative(abs(''), f)}: ${e.message}`); return true; } });
if (broken.length) failed++; else console.log('PASS every script in src/ parses');

const env = { ...process.env, NO2_HTML: path.relative(abs(''), htmlPath) };
for (const script of ['work/test-integrated-core.cjs', 'work/test-startup-policy.cjs', 'src/defender/test.cjs', 'src/erasteroids/test.cjs', 'src/pong/test.cjs', 'src/breakout/test.cjs', 'src/invaders/test.cjs', 'src/lander/test.cjs', 'src/missile/test.cjs', 'src/pacman/test.cjs', 'src/battlezone/test.cjs', 'src/galgebra/test.cjs', 'src/centigrade/test.cjs', 'src/frogger/test.cjs', 'src/burgertime/test.cjs', 'src/tempest/test.cjs', 'src/qix/test.cjs', 'src/donkeykong/test.cjs', 'src/qbert/test.cjs', 'src/digdug/test.cjs', 'src/robotron/test.cjs', 'src/joust/test.cjs', 'src/foodfight/test.cjs', 'src/moonpatrol/test.cjs', 'src/paperboy/test.cjs', 'src/gauntlet/test.cjs', 'server/test/leaderboard.test.mjs', 'server/test/replay-all.test.mjs']) {
  console.log(`\n== ${script}`);
  try { execFileSync(process.execPath, [abs(script)], { cwd: abs(''), env, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').filter(l => /^(PASS|FAIL)|checks passed|replay exactly/.test(l)).forEach(l => console.log(l)); }
  catch (e) { failed++; console.log((e.stdout || '').split('\n').slice(-20).join('\n')); console.log(`FAIL ${script} exited ${e.status}`); }
}
console.log(failed ? `\n${failed} failure(s)` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
