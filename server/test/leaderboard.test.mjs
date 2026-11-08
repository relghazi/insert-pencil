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
// Hard mode (Ace's locker): a seed with its top bit set is a hard run, kept off the normal board.
const HARD = 0x80000000 + 1979, hardRun = play(HARD, .3), hardLow = play(HARD + 1, .7), hardOther = play(HARD + 2, .5);
await test('a hard run stays off the normal board; hard=1 lists only hard runs, best per player', async () => {
  const before = await top('&limit=25'), ip = { 'CF-Connecting-IP': '203.0.113.31' }, hp = '3'.repeat(32), hq = '4'.repeat(32);
  assert.deepEqual(await top('&limit=25&hard=1'), []);
  for (const [who, run, seed] of [[hp, hardRun, HARD], [hp, hardLow, HARD + 1], [hq, hardOther, HARD + 2]])
    assert.equal((await post(body({ playerId: who, initials: who === hp ? 'ACE' : 'HAL', seed, inputs: run.rec.data().inputs, claimedScore: run.engine.score }), ip)).status, 202);
  assert.deepEqual((await top('&limit=25&hard=1&player=' + hp + '&pending=1')).map(r => [r.initials, !!r.pending]), [['ACE', true]]);
  await runVerify();
  assert.deepEqual(await top('&limit=25'), before, 'the normal board is unchanged');
  const hard = await top('&limit=25&hard=1'), best = Math.max(hardRun.engine.score, hardLow.engine.score);
  assert.deepEqual(hard.map(r => r.initials).sort(), ['ACE', 'HAL']);
  assert.equal(hard.find(r => r.initials === 'ACE').score, best);
  assert.deepEqual((await top('&limit=25&seed=' + HARD)).map(r => r.initials), ['ACE'], 'a seed asked for still lists that seed');
  assert.deepEqual(await top('&limit=25&hard=1&seed=1979'), await top('&limit=25&seed=1979'), 'the daily board ignores hard');
});
await test('the client keeps hard scores apart: local tables, the leaderboard best and its pending run', () => {
  const mem = new Map(), save = { settings: {}, storage: { read: (k, d) => mem.has(k) ? JSON.parse(mem.get(k)) : d, write: (k, v) => { mem.set(k, JSON.stringify(v)); return true; } },
    key: (id, part) => 'No2Arcade:game:' + id + ':' + part, scores(id) { return this.storage.read(this.key(id, 'scores'), []); }, best(id) { return Math.max(0, ...this.scores(id).map(x => x.score)); } };
  const S = globalThis.No2Scores;
  assert.equal(S.hardSeed(1979), HARD); assert(S.isHard(HARD) && !S.isHard(1979) && !S.isHard(20261031));
  S.add(save, 'galgebra', 1979, 'RAD', 500); S.add(save, 'galgebra', HARD, 'ACE', 300);
  assert.deepEqual(S.rows(save, 'galgebra', 1979), [{ name: 'RAD', score: 500 }]); assert.deepEqual(S.rows(save, 'galgebra', HARD), [{ name: 'ACE', score: 300 }]);
  assert.equal(S.best(save, 'galgebra', HARD), 300); assert.equal(save.storage.read('No2Arcade:game:galgebra:hard-best', 0), 300); assert.equal(S.best(save, 'galgebra', 2), 500);
  const enabled = LB.enabled; LB.enabled = true;
  try {
    const end = { state: 'end', score: 100 }, rec = r => ({ bad: false, steps: 5, seed: r, version: '1', data: () => ({ seed: r, inputs: [5, 0, 0] }) });
    assert(LB.finish(save, 'galgebra', rec(1979), { ...end, score: 1000 }, 'RAD'));
    assert(LB.finish(save, 'galgebra', rec(HARD), end, 'ACE'), 'a hard run is not measured against the normal best');
    const st = LB.state(save); assert.equal(st.best['galgebra@hard'], 100); assert.equal(st.best.galgebra, 1000);
    assert.deepEqual(st.pending.map(p => p.seed).sort(), [1979, HARD]);
    assert(!LB.finish(save, 'galgebra', rec(HARD + 3), { ...end, score: 50 }, 'ACE'), 'a lower hard run is not sent');
  } finally { LB.enabled = enabled; }
});
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
// Play stats: batches from the game, and the stats page.
const ev = (over = {}, ip = '8.8.4.4', at) => handle(Object.assign(new Request(base + '/events', { method: 'POST', body: JSON.stringify({ playerId: 'c'.repeat(32), version: '0.13.0', lang: 'fr', device: 'keyboard', events: [{ kind: 'session' }, { kind: 'run', game: 'galgebra', mode: 'normal', seconds: 95, score: 4200 }, { kind: 'comic', mode: 'skipped' }], ...over }), headers: { Origin: 'null', 'CF-Connecting-IP': ip } }), { cf: { country: 'FR', region: 'Bretagne' } }), env, at);
await test('play stats batches are stored row by row, dated by the server', async () => {
  assert.equal((await ev()).status, 202);
  const rows = env.DB.db.prepare("SELECT kind, game, mode, seconds, score, lang, device, version FROM plays WHERE player_id = ? ORDER BY id").all('c'.repeat(32));
  assert.deepEqual(rows.map(r => r.kind), ['session', 'run', 'comic']); assert.equal(rows[1].game, 'galgebra'); assert.equal(rows[1].seconds, 95); assert.equal(rows[0].lang, 'fr');
});
await test('bad play stats batches are refused whole', async () => {
  for (const over of [{ playerId: 'x' }, { version: 'v1' }, { events: [] }, { events: Array(41).fill({ kind: 'session' }) }, { events: [{ kind: 'click' }] }, { events: [{ kind: 'run', game: 'tetris' }] }, { events: [{ kind: 'run', game: 'galgebra', seconds: -1 }] }, { events: [{ kind: 'run', game: 'galgebra', mode: 'easy' }] }])
    assert.equal((await ev(over)).status, 400, JSON.stringify(over));
  assert.equal((await handle(new Request(base + '/events', { method: 'POST', body: 'x'.repeat(9000), headers: { Origin: 'null' } }), env)).status, 413);
});
await test('the stats are public, totals only, and leave the maker out', async () => {
  const at = Date.parse('2026-11-12T12:00:00Z'), get = (q = '', ip = '6.6.6.6', t = at) => handle(new Request(base + '/stats' + q, { headers: { 'CF-Connecting-IP': ip } }), env, t);
  const day = 864e5, t = Date.parse('2026-11-10T12:00:00Z');
  // c: new on the 10th, back on the 11th; d: one day only; the maker (signed REZ) every day.
  env.DB.db.prepare('DELETE FROM plays').run();
  await ev({}, '8.8.4.5', t); await ev({}, '8.8.4.6', t + day); await ev({ playerId: 'd'.repeat(32) }, '8.8.4.7', t + day);
  env.DB.db.prepare("INSERT INTO scores (game, player_id, initials, score, seed, steps, version, replay_hash, created_at) VALUES ('galgebra', ?, 'REZ', 1, 1, 1, '0.1.0', 'own', 0)").run('e'.repeat(32));
  await ev({ playerId: 'e'.repeat(32) }, '8.8.4.8', t);
  const r = await get('?days=7'), text = await r.text(), j = JSON.parse(text);
  assert.equal(r.status, 200); assert.equal(j.totals.users, 2); assert.equal(j.totals.returning, 1);
  assert(!/[a-f0-9]{32}/.test(text), 'no player id in the answer');
  const s10 = j.series.find(x => x.day === '2026-11-10'), s11 = j.series.find(x => x.day === '2026-11-11');
  assert.equal(s10.dau, 1); assert.equal(s10.new, 1); assert.equal(s10.d1, 1); assert.equal(s11.dau, 2); assert.equal(s11.wau, 2); assert.equal(s11.new, 1);
  // played a game today: nobody on the 12th, c and d on the 11th (the maker left out)
  assert.equal(j.totals.playedToday, 0); assert.equal((await (await get('?days=7', '6.6.6.9', t + day)).json()).totals.playedToday, 2);
  assert.equal(j.games.find(g => g.game === 'galgebra').runs, 3); assert.equal(j.langs[0].k, 'fr');
  assert.equal(j.countries[0].k, 'FR'); assert.deepEqual(j.regions[0], { country: 'FR', region: 'Bretagne', players: 2 });
  const all = await (await get('?days=7&owner=1')).json(); assert.equal(all.totals.users, 3);
  // Kept for a while: a new play does not show until the answer is older than STATS_TTL.
  await ev({ playerId: 'f'.repeat(32) }, '8.8.4.9', t + day);
  assert.equal((await (await get('?days=7', '6.6.6.7', at + 1000)).json()).totals.users, 2);
  assert.equal((await (await get('?days=7', '6.6.6.7', at + 301000)).json()).totals.users, 3);
  // One visitor, too many loads.
  const e2 = { ...env, RATE_STATS: '2' }; for (let i = 0; i < 2; i++) await handle(new Request(base + '/stats?days=7', { headers: { 'CF-Connecting-IP': '5.5.5.5' } }), e2, at);
  assert.equal((await handle(new Request(base + '/stats?days=7', { headers: { 'CF-Connecting-IP': '5.5.5.5' } }), e2, at)).status, 429);
});
await test('sticker runs (seeds 0x40000000 to 0x7FFFFFFF) have their own board and never reach the classic one', async () => {
  const ins = (pid, initials, score, seed) => env.DB.db.prepare("INSERT INTO scores (game, player_id, initials, score, seed, steps, version, replay_hash, created_at, status, verified_score) VALUES ('quiz', ?, ?, ?, ?, 1, '0.1.0', ?, 1, 'verified', ?)").run(pid, initials, score, seed, pid + seed, score);
  ins('1'.repeat(32), 'CLS', 500, 77); ins('2'.repeat(32), 'STK', 900, 0x40000000 + 77); ins('3'.repeat(32), 'HRD', 700, 0x80000000 + 77);
  const board = async q => (await (await handle(new Request(base + '/scores?game=quiz' + q), env)).json()).scores.map(r => r.initials);
  assert.deepEqual(await board(''), ['CLS']); assert.deepEqual(await board('&sticker=1'), ['STK']); assert.deepEqual(await board('&hard=1'), ['HRD']);
});
console.log(passed + ' leaderboard checks passed');
