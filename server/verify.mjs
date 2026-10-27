// node server/verify.mjs: the leaderboard's replay check, run outside Cloudflare (the free Workers plan allows about
// 10 ms of CPU per request; a replay needs about 0.3 ms per second of play). Fetches pending runs from the Worker,
// replays each one on the same bundled game core the Worker ships (build.mjs), and posts verified or rejected verdicts
// with the score the replay computed. Runs hourly from .github/workflows/leaderboard-verify.yml, or by hand:
//
//   LEADERBOARD_URL=https://no2-arcade-leaderboard.<you>.workers.dev LEADERBOARD_ADMIN_TOKEN=... node server/verify.mjs
//
// Options: --batch N runs per request (1 to 25, default 10), --max N runs per invocation (default 500).
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from './build.mjs';
import { decode, replay } from './src/replay.js';

const LIMITS = { maxRuns: 50000, maxSteps: 432000 }, BATCH_MAX = 25;

// One stored run in, one verdict out. A run whose version this checkout's core does not have is left pending (the
// verifier is on another revision than the deployed Worker); everything else is decided for good.
export function judge(GAMES, run) {
  const game = Object.hasOwn(GAMES, run.game) ? GAMES[run.game] : null;
  if (!game) return { id: run.id, status: 'rejected', score: null, reason: 'unknown game' };
  if (run.version !== game.version) return { id: run.id, skip: 'version ' + run.version + ' is not ' + game.version };
  let inputs; try { inputs = typeof run.inputs === 'string' ? JSON.parse(run.inputs) : run.inputs; } catch { inputs = null; }
  const shape = decode(inputs, { ...LIMITS, layout: game.record });
  if (shape.error) return { id: run.id, status: 'rejected', score: null, reason: shape.error };
  if (!Number.isInteger(run.seed) || run.seed < 0 || run.seed > 0xffffffff) return { id: run.id, status: 'rejected', score: null, reason: 'bad seed' };
  const result = replay(game, run.seed, inputs);
  if (result.error) return { id: run.id, status: 'rejected', score: null, reason: result.error };
  if (result.score !== run.claimedScore) return { id: run.id, status: 'rejected', score: result.score, reason: 'score does not match the replay' };
  return { id: run.id, status: 'verified', score: result.score };
}

function baseUrl(raw) {
  const u = new URL(String(raw || '').trim());
  const local = u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  // The token only ever travels over https, or to this machine for local tests.
  if (u.protocol !== 'https:' && !local) throw new Error('LEADERBOARD_URL must be https:// (or http://127.0.0.1 for local tests)');
  return u.origin + u.pathname.replace(/\/+$/, '');
}

export async function verify({ url, token, batch = 10, max = 500, fetch: f = globalThis.fetch, GAMES, log = console.log } = {}) {
  if (!token) throw new Error('LEADERBOARD_ADMIN_TOKEN is not set');
  const base = baseUrl(url);
  batch = Math.max(1, Math.min(BATCH_MAX, batch | 0)); max = Math.max(1, max | 0);
  if (!GAMES) GAMES = (await import(pathToFileURL(build()).href)).GAMES;
  const headers = { Authorization: 'Bearer ' + token };
  const call = async (p, init = {}) => {
    const r = await f(base + p, { ...init, headers: { ...headers, ...(init.headers || {}) }, signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) throw new Error(`${init.method || 'GET'} ${p}: ${r.status} ${j?.error || ''}`.trim());
    return j;
  };
  const totals = { verified: 0, rejected: 0, skipped: 0 };
  let after = 0, seen = 0;
  while (seen < max) {
    const { runs } = await call(`/admin/pending?limit=${Math.min(batch, max - seen)}&after=${after}`);
    if (!runs.length) break;
    seen += runs.length; after = runs[runs.length - 1].id;
    const verdicts = [];
    for (const run of runs) {
      const v = judge(GAMES, run);
      if (v.skip) { totals.skipped++; log(`run ${run.id}: left pending (${v.skip})`); continue; }
      verdicts.push(v); log(`run ${run.id} ${run.game}: ${v.status} ${v.score ?? ''}${v.reason ? ' (' + v.reason + ')' : ''}`);
    }
    if (verdicts.length) {
      const res = await call('/admin/verdicts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verdicts }) });
      for (const v of verdicts) if (res.updated.includes(v.id)) totals[v.status]++;
    }
    if (runs.length < batch) break;
  }
  log(`done: ${totals.verified} verified, ${totals.rejected} rejected, ${totals.skipped} left pending`);
  return totals;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? Number(process.argv[i + 1]) : undefined; };
  verify({ url: process.env.LEADERBOARD_URL, token: process.env.LEADERBOARD_ADMIN_TOKEN, batch: arg('batch') ?? 10, max: arg('max') ?? 500 })
    .catch(e => { console.error('verify failed: ' + e.message); process.exit(1); });
}
