// No. 2 Arcade online leaderboard: request handling, kept free of Worker globals so Node tests can run it
// against a fake D1. GET /scores?game=<id>&limit=10[&player=<id>][&pending=1], POST /submit, and the verifier's
// GET /admin/pending and POST /admin/verdicts (bearer ADMIN_TOKEN). On the free Workers plan (about 10 ms of CPU per
// request) nothing is replayed here: /submit checks the run's shape and stores it as pending, and server/verify.mjs
// replays it outside Cloudflare on the same bundled core and posts the verdict.
import { decode } from './replay.js';

const DEFAULTS = { ALLOWED_ORIGINS: 'null', MAX_BODY: 1048576, MAX_STEPS: 432000, MAX_RUNS: 50000, RATE_PLAYER: 20, RATE_IP: 60, RATE_WINDOW: 3600, RATE_REPORT: 5, RATE_REPORTS: 50 };
// Three-letter initials that are not allowed on the board; they are kept as ??? instead.
const RUDE = new Set('ASS FUK FUC FCK FUQ FKU SHT CUM CNT KNT KKK NIG NGR FAG SEX TIT DIK DIC COK JIZ PUS VAG HOE WHR XXX PIS ANL SUK SUX NAZ KYS BCH'.split(' '));
const PLAYER = /^[a-f0-9]{32}$/, INITIALS = /^[A-Z]{3}$/;
const ADMIN_BATCH = 25, VERDICT_BODY = 16384;
// Detention slips: what a report may be about (a notebook id, or these), and its limits.
const REPORT_PLACES = new Set(['locker', 'comic', 'other']), REPORT_TEXT = 600, REPORT_BODY = 4096;
const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,4}$/;
// Printable text only: control characters (other than line breaks) go, runs of blank lines shrink to one.
const cleanText = (s, max) => String(s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

const conf = env => { const c = { ...DEFAULTS }; for (const k of Object.keys(DEFAULTS)) if (env?.[k] != null && env[k] !== '') c[k] = typeof DEFAULTS[k] === 'number' ? Number(env[k]) : String(env[k]); return c; };
export const cleanInitials = s => RUDE.has(s) ? '???' : s;

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Bearer token check in constant time: both sides are hashed to 32 bytes first, so neither the length nor the
// position of the first wrong character shows in the timing.
async function tokenMatches(given, expected) {
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(given)));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)));
  let diff = 0; for (let i = 0; i < 32; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function cors(request, c) {
  const origin = request.headers.get('Origin');
  if (origin == null) return { ok: true, headers: {} };
  const allowed = c.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(origin) && !allowed.includes('*')) return { ok: false, headers: {} };
  return { ok: true, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } };
}

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

// A fixed-window counter per key in D1; true while the key is under its limit.
async function underLimit(db, key, limit, windowSec, now) {
  const w = Math.floor(now / 1000 / windowSec);
  const row = await db.prepare('INSERT INTO rate (key, window, count) VALUES (?1, ?2, 1) ON CONFLICT(key, window) DO UPDATE SET count = count + 1 RETURNING count').bind(key, w).first();
  return (row?.count ?? 1) <= limit;
}

export function createHandler(GAMES) {
  // Verified scores only, best one per player. With pending, the asking player's own best waiting run is merged in
  // (marked pending) when it beats their verified best, so a just-sent score shows as checking.
  const daySeed = s => { const n = /^\d{1,10}$/.test(s || '') ? Number(s) : NaN; return Number.isInteger(n) && n <= 0xffffffff ? n : null; };
  // seed (owner 2026-10-30, daily challenge): only runs played on that seed, so one day's board stands on its own.
  async function top(db, game, limit, player, withPending, seed = null) {
    const { results } = await db.prepare(
      "SELECT player_id, initials, MAX(verified_score) AS score, MIN(created_at) AS first FROM scores WHERE game = ?1 AND status = 'verified' AND (?3 IS NULL OR seed = ?3) AND player_id NOT IN (SELECT player_id FROM bans) GROUP BY player_id ORDER BY score DESC, first ASC LIMIT ?2"
    ).bind(game, limit, seed).all();
    let rows = results.map(r => ({ initials: r.initials, score: r.score, ...(player && r.player_id === player ? { you: true } : {}) }));
    if (player && withPending) {
      const p = await db.prepare(
        "SELECT initials, MAX(score) AS score FROM scores WHERE game = ?1 AND player_id = ?2 AND status = 'pending' AND (?3 IS NULL OR seed = ?3) AND player_id NOT IN (SELECT player_id FROM bans)"
      ).bind(game, player, seed).first();
      if (p?.score != null) {
        const best = await db.prepare("SELECT MAX(verified_score) AS score FROM scores WHERE game = ?1 AND player_id = ?2 AND status = 'verified' AND (?3 IS NULL OR seed = ?3)").bind(game, player, seed).first();
        if (p.score > (best?.score ?? -1)) {
          rows = rows.filter(r => !r.you);
          if (best?.score != null) rows.push({ initials: p.initials, score: best.score, you: true });
          rows.push({ initials: p.initials, score: p.score, you: true, pending: true });
          rows.sort((a, b) => b.score - a.score || (a.pending ? 1 : 0) - (b.pending ? 1 : 0));
          rows = rows.slice(0, limit);
        }
      }
    }
    return rows.map((r, i) => ({ rank: i + 1, ...r }));
  }

  async function submit(request, env, c, now) {
    const length = Number(request.headers.get('Content-Length') || 0);
    if (length > c.MAX_BODY) return json(413, { ok: false, error: 'too large' });
    const text = await request.text();
    if (text.length > c.MAX_BODY) return json(413, { ok: false, error: 'too large' });
    let body; try { body = JSON.parse(text); } catch { return json(400, { ok: false, error: 'bad json' }); }
    const { game: id, version, playerId, initials, seed, inputs, claimedScore } = body || {};
    const game = Object.hasOwn(GAMES, id) ? GAMES[id] : null;
    if (!game) return json(400, { ok: false, error: 'unknown game' });
    if (version !== game.version) return json(409, { ok: false, error: 'version mismatch', version: game.version });
    if (typeof playerId !== 'string' || !PLAYER.test(playerId)) return json(400, { ok: false, error: 'bad player' });
    if (typeof initials !== 'string' || !INITIALS.test(initials)) return json(400, { ok: false, error: 'bad initials' });
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return json(400, { ok: false, error: 'bad seed' });
    if (!Number.isInteger(claimedScore) || claimedScore < 0) return json(400, { ok: false, error: 'bad score' });
    const db = env.DB;
    if (await db.prepare('SELECT 1 AS b FROM bans WHERE player_id = ?1').bind(playerId).first()) return json(403, { ok: false, error: 'banned' });
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const ipKey = 'ip:' + (await sha256((env.IP_SALT || 'no2') + ip)).slice(0, 24);
    if (!await underLimit(db, 'p:' + playerId, c.RATE_PLAYER, c.RATE_WINDOW, now) || !await underLimit(db, ipKey, c.RATE_IP, c.RATE_WINDOW, now))
      return json(429, { ok: false, error: 'slow down' }, { 'Retry-After': String(c.RATE_WINDOW) });
    const shape = decode(inputs, { maxRuns: c.MAX_RUNS, maxSteps: c.MAX_STEPS, layout: game.record });
    if (shape.error) return json(422, { ok: false, error: shape.error });
    const packed = JSON.stringify(inputs);
    const hash = await sha256(id + '|' + seed + '|' + packed);
    const name = cleanInitials(initials);
    // Stored as pending with its inputs; the score only counts once the verifier's replay agrees.
    const res = await db.prepare("INSERT INTO scores (game, player_id, initials, score, seed, steps, version, replay_hash, created_at, status, inputs) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending', ?10) ON CONFLICT(game, replay_hash) DO NOTHING")
      .bind(id, playerId, name, claimedScore, seed, shape.steps, version, hash, now, packed).run();
    await db.prepare('DELETE FROM rate WHERE window < ?1').bind(Math.floor(now / 1000 / c.RATE_WINDOW) - 1).run();
    const duplicate = !(res?.meta?.changes > 0);
    const status = duplicate ? (await db.prepare('SELECT status FROM scores WHERE game = ?1 AND replay_hash = ?2').bind(id, hash).first())?.status || 'pending' : 'pending';
    return json(202, { ok: true, status, initials: name, duplicate });
  }

  // A detention slip from the locker. Only what the player typed plus the game version and a short device line; no
  // player id, no IP (only its salted hash, in the rate table). Limited per IP and per hour for everyone.
  async function report(request, env, c, now) {
    const text = await request.text();
    if (text.length > REPORT_BODY) return json(413, { ok: false, error: 'too large' });
    let body; try { body = JSON.parse(text); } catch { return json(400, { ok: false, error: 'bad json' }); }
    const { about, text: note, version, device } = body || {};
    if (typeof about !== 'string' || !(REPORT_PLACES.has(about) || Object.hasOwn(GAMES, about))) return json(400, { ok: false, error: 'bad about' });
    if (typeof note !== 'string') return json(400, { ok: false, error: 'bad text' });
    const clean = cleanText(note, REPORT_TEXT);
    if (clean.length < 5) return json(400, { ok: false, error: 'too short' });
    if (typeof version !== 'string' || !VERSION.test(version)) return json(400, { ok: false, error: 'bad version' });
    const where = cleanText(typeof device === 'string' ? device : '', 160).replace(/\n/g, ' ') || 'unknown';
    const db = env.DB;
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const ipKey = 'r:' + (await sha256((env.IP_SALT || 'no2') + ip)).slice(0, 24);
    if (!await underLimit(db, ipKey, c.RATE_REPORT, c.RATE_WINDOW, now) || !await underLimit(db, 'r:all', c.RATE_REPORTS, c.RATE_WINDOW, now))
      return json(429, { ok: false, error: 'slow down' }, { 'Retry-After': String(c.RATE_WINDOW) });
    await db.prepare('INSERT INTO reports (created_at, about, text, version, device) VALUES (?1, ?2, ?3, ?4, ?5)').bind(now, about, clean, version, where).run();
    return json(202, { ok: true });
  }

  // Verifier endpoints. No ADMIN_TOKEN secret: they do not exist (404). Wrong or missing bearer token: 401.
  async function admin(request, env, url, now) {
    if (typeof env.ADMIN_TOKEN !== 'string' || env.ADMIN_TOKEN.length < 16) return json(404, { ok: false, error: 'not found' });
    const m = /^Bearer (\S+)$/.exec(request.headers.get('Authorization') || '');
    if (!m || !await tokenMatches(m[1], env.ADMIN_TOKEN)) return json(401, { ok: false, error: 'unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
    const db = env.DB;
    if (url.pathname === '/admin/pending' && request.method === 'GET') {
      const limit = Math.max(1, Math.min(ADMIN_BATCH, Number.parseInt(url.searchParams.get('limit') || '10', 10) || 10));
      const after = Math.max(0, Number.parseInt(url.searchParams.get('after') || '0', 10) || 0);
      const { results } = await db.prepare("SELECT id, game, version, seed, score, steps, inputs FROM scores WHERE status = 'pending' AND id > ?1 ORDER BY id LIMIT ?2").bind(after, limit).all();
      // inputs go out as the stored JSON text; the verifier parses it.
      return json(200, { ok: true, runs: results.map(r => ({ id: r.id, game: r.game, version: r.version, seed: r.seed, claimedScore: r.score, steps: r.steps, inputs: r.inputs })) });
    }
    if (url.pathname === '/admin/verdicts' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > VERDICT_BODY) return json(413, { ok: false, error: 'too large' });
      let body; try { body = JSON.parse(text); } catch { return json(400, { ok: false, error: 'bad json' }); }
      const list = body?.verdicts;
      if (!Array.isArray(list) || !list.length || list.length > ADMIN_BATCH) return json(400, { ok: false, error: 'bad verdicts' });
      for (const v of list) {
        if (!v || !Number.isInteger(v.id) || v.id < 1 || (v.status !== 'verified' && v.status !== 'rejected')) return json(400, { ok: false, error: 'bad verdict' });
        if (v.score != null && (!Number.isInteger(v.score) || v.score < 0)) return json(400, { ok: false, error: 'bad verdict' });
        if (v.status === 'verified' && v.score == null) return json(400, { ok: false, error: 'bad verdict' });
      }
      const updated = [], skipped = [];
      for (const v of list) {
        // Only pending rows change. verified also needs the replayed score to equal the claimed one; inputs are dropped
        // once decided to keep the database small (replay_hash stays, so a resend is still a no-op).
        const res = v.status === 'verified'
          ? await db.prepare("UPDATE scores SET status = 'verified', verified_score = ?2, verified_at = ?3, reason = NULL, inputs = NULL WHERE id = ?1 AND status = 'pending' AND score = ?2").bind(v.id, v.score, now).run()
          : await db.prepare("UPDATE scores SET status = 'rejected', verified_score = ?2, verified_at = ?3, reason = ?4, inputs = NULL WHERE id = ?1 AND status = 'pending'").bind(v.id, v.score ?? null, now, String(v.reason || '').slice(0, 80)).run();
        (res?.meta?.changes > 0 ? updated : skipped).push(v.id);
      }
      return json(200, { ok: true, updated, skipped });
    }
    // Detention slips for server/reports.mjs: the new ones, oldest first, then which were filed as which issue.
    if (url.pathname === '/admin/reports' && request.method === 'GET') {
      const { results } = await db.prepare("SELECT id, created_at, about, text, version, device FROM reports WHERE status = 'new' ORDER BY id LIMIT ?1").bind(ADMIN_BATCH).all();
      return json(200, { ok: true, reports: results });
    }
    if (url.pathname === '/admin/reports/filed' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > VERDICT_BODY) return json(413, { ok: false, error: 'too large' });
      let body; try { body = JSON.parse(text); } catch { return json(400, { ok: false, error: 'bad json' }); }
      const list = body?.filed;
      if (!Array.isArray(list) || !list.length || list.length > ADMIN_BATCH) return json(400, { ok: false, error: 'bad filed' });
      for (const f of list) if (!f || !Number.isInteger(f.id) || f.id < 1 || typeof f.issue !== 'string' || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(f.issue)) return json(400, { ok: false, error: 'bad filed' });
      const updated = [];
      for (const f of list) {
        const res = await db.prepare("UPDATE reports SET status = 'filed', issue = ?2, text = NULL WHERE id = ?1 AND status = 'new'").bind(f.id, f.issue).run();
        if (res?.meta?.changes > 0) updated.push(f.id);
      }
      return json(200, { ok: true, updated });
    }
    return json(404, { ok: false, error: 'not found' });
  }

  return async function handle(request, env, now = Date.now()) {
    const c = conf(env), url = new URL(request.url), cr = cors(request, c);
    if (!cr.ok) return json(403, { ok: false, error: 'origin not allowed' });
    const withCors = r => { for (const [k, v] of Object.entries(cr.headers)) r.headers.set(k, v); return r; };
    try {
      if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }));
      if (url.pathname === '/scores' && request.method === 'GET') {
        const id = url.searchParams.get('game');
        if (!Object.hasOwn(GAMES, id)) return withCors(json(400, { ok: false, error: 'unknown game' }));
        const limit = Math.max(1, Math.min(25, Number.parseInt(url.searchParams.get('limit') || '10', 10) || 10));
        const player = url.searchParams.get('player');
        return withCors(json(200, { ok: true, game: id, version: GAMES[id].version, scores: await top(env.DB, id, limit, PLAYER.test(player || '') ? player : null, url.searchParams.get('pending') === '1', daySeed(url.searchParams.get('seed'))) }));
      }
      if (url.pathname.startsWith('/admin/')) return withCors(await admin(request, env, url, now));
      if (url.pathname === '/submit' && request.method === 'POST') return withCors(await submit(request, env, c, now));
      if (url.pathname === '/report' && request.method === 'POST') return withCors(await report(request, env, c, now));
      return withCors(json(404, { ok: false, error: 'not found' }));
    } catch (e) {
      console.error(e);
      return withCors(json(500, { ok: false, error: 'server error' }));
    }
  };
}
