// node server/test/leaderboard.test.mjs: no network. Records a Galgebra game with the client's recorder, replays it
// with the server's replay, then drives the Worker handler against a fake D1 (node:sqlite with the real migration).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url'; import { DatabaseSync } from 'node:sqlite';
import { build } from '../build.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../..'), require = createRequire(import.meta.url);
const { GAMES } = await import(pathToFileURL(build(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'no2lb-')), 'games.js'))).href);
const { replay, decode } = await import('../src/replay.js');
const { createHandler } = await import('../src/handler.js');
const { verify, judge } = await import('../verify.mjs');
const slips = await import('../reports.mjs');
const { dispatch } = await import('../src/dispatch.js');
const Core = require(path.join(repo, 'src/galgebra/core.js'));
const LB = require(path.join(repo, 'src/shell/leaderboard.js'));

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('PASS ' + name); };

// A human-ish player: the demo pilot with a shaky analog stick, late reactions and dropped shots.
function play(seed, wobble = 0.35) {
  const engine = new Core.GalaxianEngine(seed), rec = new LB.Recorder('galgebra', seed, Core);
  let r = seed * 7 + 3; const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let i = 0; engine.state !== 'end' && i < 120 * 60 * 30; i++) {
    const p = engine.pilot(), input = { axis: (p.axis || 0) * (1 - wobble * rnd()) + (rnd() - .5) * wobble, fire: !!p.fire && rnd() > .2 };
    engine.step(Core.CONFIG.step, rec.take(input, true, engine));
  }
  return { engine, rec };
}

class FakeD1 {
  constructor() { this.db = new DatabaseSync(':memory:'); for (const f of fs.readdirSync(path.join(here, '../migrations')).filter(f => f.endsWith('.sql')).sort()) this.db.exec(fs.readFileSync(path.join(here, '../migrations', f), 'utf8')); }
  prepare(sql) { const db = this.db; return { args: [], bind(...a) { this.args = a; return this; },
    async first() { return db.prepare(sql).get(...this.args) ?? null; }, async all() { return { results: db.prepare(sql).all(...this.args) }; },
    async run() { const res = db.prepare(sql).run(...this.args); return { meta: { changes: Number(res.changes) } }; } }; }
}

const game = play(1979);
const t0 = performance.now(); const again = replay(GAMES.galgebra, 1979, game.rec.data().inputs); const ms = performance.now() - t0;
console.log(`recorded game: score ${game.engine.score}, wave ${game.engine.wave}, ${game.rec.steps} steps (${(game.rec.steps / 120).toFixed(0)} s), ${game.rec.runs.length / 3} runs, ${JSON.stringify(game.rec.data().inputs).length} bytes, replay ${ms.toFixed(0)} ms`);

await test('a recorded game ends and scores', () => { assert.equal(game.engine.state, 'end'); assert(game.engine.score > 0); assert(!game.rec.bad); });
await test('replaying the recording reproduces the exact score and length', () => { assert.equal(again.score, game.engine.score); assert.equal(again.steps, game.rec.steps); });
await test('replays survive a JSON round trip (what the client stores and sends)', () => assert.equal(replay(GAMES.galgebra, 1979, JSON.parse(JSON.stringify(game.rec.data().inputs))).score, game.engine.score));
await test('the same inputs on another seed do not give the same game', () => { const o = replay(GAMES.galgebra, 1980, game.rec.data().inputs); assert(o.error || o.score !== game.engine.score); });
await test('several seeds replay exactly', () => { for (const s of [1, 2024, 31337]) { const p = play(s, .6); assert.equal(replay(GAMES.galgebra, s, p.rec.data().inputs).score, p.engine.score); } });
await test('a recording that stops before game over is refused', () => { const ins = game.rec.data().inputs.slice(0, -3); assert.equal(replay(GAMES.galgebra, 1979, ins).error, 'game not finished'); });
await test('a recording with steps after game over is refused', () => { const ins = [...game.rec.data().inputs, 50, 0, 0]; assert.equal(replay(GAMES.galgebra, 1979, ins).error, 'inputs after game over'); });
await test('malformed and oversized input lists are refused before replay', () => {
  const lim = { maxRuns: 50000, maxSteps: 432000, layout: Core.CONFIG.record };
  for (const bad of [[], [1, 0], [0, 0, 0], [1.5, 0, 0], [1, 2, 0], [1, 0, 2], [1, null, 0], [1, .33, 0], 'x']) assert.equal(decode(bad, lim).error, 'bad inputs');
  assert.equal(decode([432001, 0, 0], lim).error, 'replay too long'); assert.equal(decode(Array(50001 * 3).fill(1), lim).error, 'replay too long');
});
await test('steps played by the demo or after a mode change make the recording unusable', () => { const e = new Core.GalaxianEngine(5), r = new LB.Recorder('galgebra', 5, Core); r.take({ axis: 1 }, true, e); r.take({ axis: 1 }, false, e); assert(r.bad); });

// Worker handler against the fake D1.
const TOKEN = 'k'.repeat(40);
const env = { DB: new FakeD1(), ALLOWED_ORIGINS: 'null', RATE_PLAYER: '5', IP_SALT: 'test', ADMIN_TOKEN: TOKEN }, handle = createHandler(GAMES);
const player = 'a'.repeat(32), base = 'http://lb.test';
const body = (over = {}) => JSON.stringify({ game: 'galgebra', version: Core.CONFIG.version, playerId: player, initials: 'RAD', seed: 1979, inputs: game.rec.data().inputs, claimedScore: game.engine.score, ...over });
const post = (b, headers = {}) => handle(new Request(base + '/submit', { method: 'POST', body: b, headers: { 'Content-Type': 'text/plain', Origin: 'null', 'CF-Connecting-IP': '203.0.113.9', ...headers } }), env);
const top = async (q = '') => (await (await handle(new Request(base + '/scores?game=galgebra&limit=10' + q, { headers: { Origin: 'null' } }), env)).json()).scores;
const status = who => env.DB.db.prepare('SELECT status, verified_score, inputs FROM scores WHERE player_id = ?').get(who.repeat(32));
const idOf = who => env.DB.db.prepare('SELECT id FROM scores WHERE player_id = ?').get(who.repeat(32)).id;
// The verifier talks to the handler directly, as it would to the deployed Worker.
const viaHandler = (e = env) => (u, init = {}) => handle(new Request(u, init), e);
const runVerify = (o = {}) => verify({ url: 'http://127.0.0.1:8787', token: TOKEN, fetch: viaHandler(), GAMES, log: () => {}, ...o });
const adminGet = (q, auth, e = env) => handle(new Request(base + '/admin/pending' + q, { headers: auth ? { Authorization: auth } : {} }), e);

await test('a real run is stored as pending (202), with CORS for the file:// origin, and not listed yet', async () => {
  const r = await post(body()); const j = await r.json(); assert.equal(r.status, 202, JSON.stringify(j)); assert.equal(j.status, 'pending'); assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'null');
  assert.deepEqual(await top('&player=' + player), []);
  assert.equal(status('a').status, 'pending'); assert.equal(status('a').inputs, JSON.stringify(game.rec.data().inputs));
});
await test('with pending=1 the asking player sees their own run marked pending; nobody else does', async () => {
  assert.deepEqual(await top('&player=' + player + '&pending=1'), [{ rank: 1, initials: 'RAD', score: game.engine.score, you: true, pending: true }]);
  assert.deepEqual(await top('&player=' + 'b'.repeat(32) + '&pending=1'), []); assert.deepEqual(await top('&pending=1'), []);
});
await test('the same run sent twice is stored once', async () => { const r = await post(body()); const j = await r.json(); assert.equal(r.status, 202); assert.equal(j.duplicate, true); assert.equal(env.DB.db.prepare('SELECT COUNT(*) AS n FROM scores').get().n, 1); });
const forged = play(1979, .5);
await test('a forged claimedScore is stored as pending (no replay in the request)', async () => {
  const r = await post(body({ claimedScore: forged.engine.score + 1000, playerId: 'b'.repeat(32), inputs: forged.rec.data().inputs })); assert.equal(r.status, 202);
});
await test('admin endpoints: no secret means they do not exist, no token or a wrong token is refused', async () => {
  const off = { ...env, ADMIN_TOKEN: undefined };
  assert.equal((await adminGet('', 'Bearer ' + TOKEN, off)).status, 404);
  assert.equal((await handle(new Request(base + '/admin/verdicts', { method: 'POST', body: '{}', headers: { Authorization: 'Bearer ' + TOKEN } }), off)).status, 404);
  assert.equal((await adminGet('', null)).status, 401); assert.equal((await adminGet('', 'Bearer ' + 'x'.repeat(40))).status, 401);
  assert.equal((await adminGet('', 'Bearer ' + TOKEN.slice(1))).status, 401); assert.equal((await adminGet('', TOKEN)).status, 401);
  const ok = await adminGet('?limit=1', 'Bearer ' + TOKEN); assert.equal(ok.status, 200); assert.equal((await ok.json()).runs.length, 1);
  assert.equal((await (await adminGet('?limit=999', 'Bearer ' + TOKEN)).json()).runs.length, 2);
  const bad = await handle(new Request(base + '/admin/verdicts', { method: 'POST', body: JSON.stringify({ verdicts: Array(26).fill({ id: 1, status: 'rejected' }) }), headers: { Authorization: 'Bearer ' + TOKEN } }), env); assert.equal(bad.status, 400);
});
await test('the verifier replays: the good run is verified, the forged score rejected with the real score', async () => {
  const t = await runVerify({ batch: 1 }); assert.deepEqual(t, { verified: 1, rejected: 1, skipped: 0 });
  assert.deepEqual({ ...status('a') }, { status: 'verified', verified_score: game.engine.score, inputs: null });
  assert.deepEqual({ ...status('b') }, { status: 'rejected', verified_score: forged.engine.score, inputs: null });
  assert.deepEqual(await top('&player=' + player + '&pending=1'), [{ rank: 1, initials: 'RAD', score: game.engine.score, you: true }]);
  assert.deepEqual(await runVerify(), { verified: 0, rejected: 0, skipped: 0 });
});
await test('a decided run cannot be changed again, and verified needs the claimed score', async () => {
  const j = await (await handle(new Request(base + '/admin/verdicts', { method: 'POST', body: JSON.stringify({ verdicts: [{ id: idOf('b'), status: 'verified', score: forged.engine.score + 1000 }] }), headers: { Authorization: 'Bearer ' + TOKEN } }), env)).json();
  assert.deepEqual(j.skipped, [idOf('b')]); assert.equal(status('b').status, 'rejected');
});
await test('tampered inputs are rejected by the verifier', async () => {
  const ins = game.rec.data().inputs.slice(); ins[1] = ins[1] === 1 ? -1 : 1;
  assert.equal((await post(body({ inputs: ins, playerId: 'c'.repeat(32) }))).status, 202);
  assert.deepEqual(await runVerify(), { verified: 0, rejected: 1, skipped: 0 }); assert.equal(status('c').status, 'rejected');
});
await test('a run of a core version the verifier does not have stays pending', () => {
  const v = judge({ galgebra: { ...GAMES.galgebra, version: 'other' } }, { id: 9, game: 'galgebra', version: Core.CONFIG.version, seed: 1, claimedScore: 1, inputs: '[1,0,0]' }); assert(v.skip);
  assert.equal(judge(GAMES, { id: 9, game: 'galgebra', version: Core.CONFIG.version, seed: 1, claimedScore: 1, inputs: 'not json' }).status, 'rejected');
});
await test('a pending run above a verified best shows both, the waiting one marked', async () => {
  const p = play(2024, .2), q = play(31337, .6); const [hi, lo] = p.engine.score > q.engine.score ? [p, q] : [q, p]; const seedOf = x => x === p ? 2024 : 31337, who = '1'.repeat(32);
  assert.equal((await post(body({ playerId: who, initials: 'JUN', seed: seedOf(lo), inputs: lo.rec.data().inputs, claimedScore: lo.engine.score }))).status, 202);
  await runVerify();
  assert.equal((await post(body({ playerId: who, initials: 'JUN', seed: seedOf(hi), inputs: hi.rec.data().inputs, claimedScore: hi.engine.score }))).status, 202);
  const rows = (await top('&player=' + who + '&pending=1')).filter(r => r.you);
  assert.deepEqual(rows.map(r => [r.score, !!r.pending]), [[hi.engine.score, true], [lo.engine.score, false]].sort((a, b) => b[0] - a[0]));
  assert.equal((await top('&player=' + who)).filter(r => r.you).length, 1);
  await runVerify(); assert.deepEqual((await top('&player=' + who + '&pending=1')).filter(r => r.you).map(r => r.score), [hi.engine.score]);
});
await test('a seed asked for lists only runs played on that seed (the daily board)', async () => {
  const all = await top('&limit=25'), on = await top('&limit=25&seed=1979'), off = await top('&limit=25&seed=424242'), bad = await top('&limit=25&seed=-1');
  assert(on.length > 0 && on.length < all.length); assert(on.every(r => all.some(a => a.initials === r.initials))); assert.deepEqual(off, []); assert.deepEqual(bad, all); });
await test('the verifier only sends its token over https or to this machine', async () => {
  await assert.rejects(verify({ url: 'http://lb.example', token: TOKEN, GAMES, fetch: viaHandler(), log: () => {} }), /https/);
  await assert.rejects(verify({ url: 'https://lb.example', token: '', GAMES, fetch: viaHandler(), log: () => {} }), /TOKEN/);
});
await test('a different game version is refused', async () => assert.equal((await post(body({ version: '9.9.9' }))).status, 409));
await test('a body over the size limit is refused', async () => assert.equal((await post('x'.repeat(1048577))).status, 413));
await test('malformed inputs are refused at submit', async () => assert.equal((await post(body({ inputs: [1, 5, 0], playerId: '2'.repeat(32) }))).status, 422));
await test('unknown games, bad ids and bad initials are refused', async () => {
  assert.equal((await post(body({ game: 'pong' }))).status, 400); assert.equal((await post(body({ playerId: 'nope' }))).status, 400);
  assert.equal((await post(body({ initials: 'r1' }))).status, 400); assert.equal((await post(body({ seed: -1 }))).status, 400);
});
await test('other origins are refused; preflight answers for the allowed one', async () => {
  assert.equal((await post(body(), { Origin: 'https://evil.example' })).status, 403);
  const r = await handle(new Request(base + '/submit', { method: 'OPTIONS', headers: { Origin: 'null' } }), env); assert.equal(r.status, 204); assert.match(r.headers.get('Access-Control-Allow-Methods'), /POST/);
  assert.doesNotMatch(r.headers.get('Access-Control-Allow-Headers'), /Authorization/i);
});
await test('rude initials are kept as ???', async () => { const p = play(77); const r = await (await post(body({ playerId: 'd'.repeat(32), initials: 'ASS', seed: 77, inputs: p.rec.data().inputs, claimedScore: p.engine.score }))).json(); assert.equal(r.initials, '???'); });
await test('submissions are rate limited per player id', async () => { let last; for (let i = 0; i < 6; i++) last = await post(body({ playerId: 'e'.repeat(32), claimedScore: i + 1 })); assert.equal(last.status, 429); });
await test('submissions are rate limited per IP', async () => { const e2 = { ...env, RATE_PLAYER: '100', RATE_IP: '3' }; let last; for (let i = 0; i < 4; i++) last = await handle(new Request(base + '/submit', { method: 'POST', body: body({ playerId: String(i).repeat(32).slice(0, 32).replace(/./g, 'f'), claimedScore: i + 1 }), headers: { Origin: 'null', 'CF-Connecting-IP': '198.51.100.7' } }), e2); assert.equal(last.status, 429); });
await test('a banned player is hidden and refused', async () => {
  env.DB.db.prepare('INSERT INTO bans (player_id, reason, created_at) VALUES (?, ?, ?)').run(player, 'test', Date.now());
  assert(!(await top('&player=' + player + '&pending=1')).some(r => r.initials === 'RAD')); assert.equal((await post(body({ seed: 1979 }))).status, 403);
});

// Detention slips: the locker's problem reports, and their filing as GitHub issues.
const slip = (over = {}, ip = '9.9.9.9', e = env) => handle(new Request(base + '/report', { method: 'POST', body: JSON.stringify({ about: 'galgebra', text: 'The bugs stopped diving after wave 3.', version: '0.6.48', device: 'Chrome 141, 1920x1080, keyboard', ...over }), headers: { 'Content-Type': 'text/plain', Origin: 'null', 'CF-Connecting-IP': ip } }), e);
const newSlips = () => env.DB.db.prepare("SELECT * FROM reports WHERE status = 'new' ORDER BY id").all();
await test('a detention slip is stored with only what was written, the version and the device line', async () => {
  const r = await slip({ text: 'Bugs\u0000 froze\r\n\r\n\r\n\r\nafter wave 3.‮' }); assert.equal(r.status, 202);
  const row = newSlips().at(-1); assert.equal(row.about, 'galgebra'); assert.equal(row.text, 'Bugs froze\n\nafter wave 3.'); assert.equal(row.version, '0.6.48');
  assert.deepEqual(Object.keys(row).sort(), ['about', 'created_at', 'device', 'id', 'issue', 'status', 'text', 'version']);
});
await test('slips about the locker, the comic or something else are accepted; unknown places and bad fields are not', async () => {
  for (const about of ['locker', 'comic', 'other']) assert.equal((await slip({ about }, '8.8.8.' + about.length)).status, 202);
  assert.equal((await slip({ about: 'pong' }, '7.7.7.1')).status, 400); assert.equal((await slip({ text: 'hey' }, '7.7.7.2')).status, 400);
  assert.equal((await slip({ version: 'x' }, '7.7.7.3')).status, 400); assert.equal((await slip({ text: 5 }, '7.7.7.4')).status, 400);
  assert.equal((await handle(new Request(base + '/report', { method: 'POST', body: 'x'.repeat(5000), headers: { Origin: 'null' } }), env)).status, 413);
  assert.equal((await slip({}, '7.7.7.5', env).then(() => handle(new Request(base + '/report', { method: 'POST', body: '{}', headers: { Origin: 'https://evil.example' } }), env))).status, 403);
});
await test('long slips are cut to 600 characters', async () => { await slip({ text: 'a'.repeat(900) }, '6.6.6.6'); assert.equal(newSlips().at(-1).text.length, 600); });
await test('slips are rate limited per IP and for everyone', async () => {
  let last; for (let i = 0; i < 6; i++) last = await slip({}, '5.5.5.5'); assert.equal(last.status, 429);
  const e2 = { ...env, RATE_REPORTS: '1' }; await slip({}, '4.4.4.1', e2); assert.equal((await slip({}, '4.4.4.2', e2)).status, 429);
});
await test('a slip becomes a safe issue: links removed, no mentions or references, every line quoted', () => {
  const i = slips.issueFor({ id: 7, created_at: Date.UTC(2026, 9, 27, 18, 5), about: 'q-nerd', text: 'see https://evil.example/x and www.bad.test\n@owner fix #12 <script>', version: '0.6.48', device: 'Safari <b>' });
  assert.match(i.title, /^Detention slip: Q\*Nerd: /); assert(!/https?:|www\./.test(i.body)); assert(!/@owner|#12/.test(i.body)); assert(!/<script>|<b>/.test(i.body));
  assert(i.body.split('\n').filter(l => /link removed|owner|script/.test(l)).every(l => l.startsWith('> '))); assert.deepEqual(i.labels, ['detention slip']);
});
await test('the filer opens one issue per new slip and marks them filed (text dropped); the next run finds none', async () => {
  const opened = [];
  const fake = (u, init = {}) => {
    if (u.startsWith('https://api.github.com/')) { if (u.endsWith('/labels')) return new Response('{}', { status: 422 }); const n = opened.push(JSON.parse(init.body)); return new Response(JSON.stringify({ html_url: 'https://github.com/o/r/issues/' + n }), { status: 201 }); }
    return viaHandler()(u.replace('https://lb.example', base), init);
  };
  const waiting = newSlips().length; const filed = await slips.run({ url: 'https://lb.example', token: TOKEN, ghToken: 'g', repo: 'o/r', fetch: fake, log: () => {} });
  assert.equal(filed.length, Math.min(waiting, 25)); assert.equal(opened.length, filed.length);
  const row = env.DB.db.prepare('SELECT status, text, issue FROM reports WHERE id = ?').get(filed[0].id); assert.equal(row.status, 'filed'); assert.equal(row.text, null); assert.equal(row.issue, filed[0].issue);
  while (newSlips().length) await slips.run({ url: 'https://lb.example', token: TOKEN, ghToken: 'g', repo: 'o/r', fetch: fake, log: () => {} });
  assert.equal((await slips.run({ url: 'https://lb.example', token: TOKEN, ghToken: 'g', repo: 'o/r', fetch: fake, log: () => {} })).length, 0);
});
await test('slip admin endpoints need the token; the filer refuses plain http and bad issue links', async () => {
  assert.equal((await handle(new Request(base + '/admin/reports'), env)).status, 401);
  await assert.rejects(slips.run({ url: 'http://lb.example', token: TOKEN, dry: true, fetch: viaHandler(), log: () => {} }), /https/);
  const r = await handle(new Request(base + '/admin/reports/filed', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ filed: [{ id: 1, issue: 'https://evil.example/1' }] }) }), env); assert.equal(r.status, 400);
});

await test('the cron starts a workflow only when it has work, and only with a token', async () => {
  const calls = [], fake = (u, init) => { calls.push(u); return Promise.resolve(new Response(null, { status: 204 })); };
  const D = 'o/dev:leaderboard-verify.yml|runs,o/pub:report-issues.yml|slips';
  assert.equal((await dispatch({ DB: env.DB, DISPATCH: D }, { fetch: fake })).off, true); assert.equal(calls.length, 0);
  env.DB.db.prepare("DELETE FROM reports WHERE status = 'new'").run(); env.DB.db.prepare("UPDATE scores SET status = 'verified' WHERE status = 'pending'").run();
  let r = await dispatch({ DB: env.DB, DISPATCH: D, GH_DISPATCH_TOKEN: 'g'.repeat(40) }, { fetch: fake }); assert.equal(r.started.length, 0);
  await slip({}, '3.3.3.3'); r = await dispatch({ DB: env.DB, DISPATCH: D, GH_DISPATCH_TOKEN: 'g'.repeat(40) }, { fetch: fake });
  assert.deepEqual(r.started.map(s => s.workflow), ['o/pub:report-issues.yml']); assert.match(calls.at(-1), /repos\/o\/pub\/actions\/workflows\/report-issues\.yml\/dispatches$/);
});
console.log(passed + ' leaderboard checks passed');
