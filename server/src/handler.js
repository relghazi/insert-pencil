// No. 2 Arcade online leaderboard: request handling, kept free of Worker globals so Node tests can run it
// against a fake D1. GET /scores?game=<id>&limit=10[&player=<id>][&pending=1][&seed=<n>|&hard=1], POST /submit, and the verifier's
// GET /admin/pending and POST /admin/verdicts (bearer ADMIN_TOKEN). On the free Workers plan (about 10 ms of CPU per
// request) nothing is replayed here: /submit checks the run's shape and stores it as pending, and server/verify.mjs
// replays it outside Cloudflare on the same bundled core and posts the verdict.
import { decode } from './replay.js';

const DEFAULTS = { ALLOWED_ORIGINS: 'null', MAX_BODY: 1048576, MAX_STEPS: 432000, MAX_RUNS: 50000, RATE_PLAYER: 20, RATE_IP: 60, RATE_WINDOW: 3600, RATE_REPORT: 5, RATE_REPORTS: 50, RATE_EVENTS: 120, RATE_EVENTS_IP: 600, RATE_STATS: 60, STATS_TTL: 300 };
// Three-letter initials that are not allowed on the board; they are kept as ??? instead.
const RUDE = new Set('ASS FUK FUC FCK FUQ FKU SHT CUM CNT KNT KKK NIG NGR FAG SEX TIT DIK DIC COK JIZ PUS VAG HOE WHR XXX PIS ANL SUK SUX NAZ KYS BCH'.split(' '));
const PLAYER = /^[a-f0-9]{32}$/, INITIALS = /^[A-Z]{3}$/;
const ADMIN_BATCH = 25, VERDICT_BODY = 16384;
// Detention slips: what a report may be about (a notebook id, or these), and its limits.
const REPORT_PLACES = new Set(['locker', 'comic', 'other']), REPORT_TEXT = 600, REPORT_BODY = 4096;
const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,4}$/;
// Play stats (owner 2026-11-01): what a batch may carry. kind session (a launch), run (a real game played: game, mode,
// seconds, score), comic (the intro: mode watched or skipped).
const EVENT_BODY = 8192, EVENT_BATCH = 40, KINDS = new Set(['session', 'run', 'comic']), MODES = new Set(['normal', 'hard', 'daily', 'sticker', 'watched', 'skipped']);
const LANGS = new Set(['en', 'fr', 'es', 'de', 'it']), DEVICES = new Set(['keyboard', 'xbox', 'touch']);
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
  // hard (owner 2026-10-31, Ace's locker): a seed with its top bit set is a hard run. Without a seed, the normal board
  // leaves hard runs out and hard=1 shows only them (best per player); a daily seed's board is unchanged.
  // sticker (owner 2026-11-01, swap stickers): seeds 0x40000000 to 0x7FFFFFFF are sticker runs, kept off the classic board;
  // sticker=1 is their own board. ?4: 0 classic, 1 hard, 2 sticker.
  const RUNS = "(CASE WHEN ?3 IS NOT NULL THEN seed = ?3 WHEN ?4 = 1 THEN seed >= 2147483648 WHEN ?4 = 2 THEN seed >= 1073741824 AND seed < 2147483648 ELSE seed < 1073741824 END)";
  async function top(db, game, limit, player, withPending, seed = null, hard = false, sticker = false) {
    const h = hard ? 1 : sticker ? 2 : 0;
    const { results } = await db.prepare(
      "SELECT player_id, initials, MAX(verified_score) AS score, MIN(created_at) AS first FROM scores WHERE game = ?1 AND status = 'verified' AND " + RUNS + " AND player_id NOT IN (SELECT player_id FROM bans) GROUP BY player_id ORDER BY score DESC, first ASC LIMIT ?2"
    ).bind(game, limit, seed, h).all();
    let rows = results.map(r => ({ initials: r.initials, score: r.score, ...(player && r.player_id === player ? { you: true } : {}) }));
    if (player && withPending) {
      const p = await db.prepare(
        "SELECT initials, MAX(score) AS score FROM scores WHERE game = ?1 AND player_id = ?2 AND status = 'pending' AND " + RUNS + " AND player_id NOT IN (SELECT player_id FROM bans)"
      ).bind(game, player, seed, h).first();
      if (p?.score != null) {
        const best = await db.prepare("SELECT MAX(verified_score) AS score FROM scores WHERE game = ?1 AND player_id = ?2 AND status = 'verified' AND " + RUNS).bind(game, player, seed, h).first();
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

  // Play stats batches from the game. Every row is checked; one bad row refuses the batch. The server's own clock dates them.
  async function events(request, env, c, now) {
    const text = await request.text();
    if (text.length > EVENT_BODY) return json(413, { ok: false, error: 'too large' });
    let body; try { body = JSON.parse(text); } catch { return json(400, { ok: false, error: 'bad json' }); }
    const { playerId, version, lang, device, events: list } = body || {};
    if (!PLAYER.test(playerId || '')) return json(400, { ok: false, error: 'bad player' });
    if (typeof version !== 'string' || !VERSION.test(version)) return json(400, { ok: false, error: 'bad version' });
    if (!Array.isArray(list) || !list.length || list.length > EVENT_BATCH) return json(400, { ok: false, error: 'bad events' });
    const rows = [];
    for (const e of list) {
      if (!e || !KINDS.has(e.kind)) return json(400, { ok: false, error: 'bad event' });
      const game = e.kind === 'run' ? e.game : null, mode = e.mode ?? null;
      if (e.kind === 'run' && !Object.hasOwn(GAMES, game)) return json(400, { ok: false, error: 'unknown game' });
      if (mode != null && !MODES.has(mode)) return json(400, { ok: false, error: 'bad event' });
      const num = (v, max) => v == null ? null : Number.isInteger(v) && v >= 0 && v <= max ? v : NaN;
      const seconds = num(e.seconds, 86400), score = num(e.score, 1e9);
      if (Number.isNaN(seconds) || Number.isNaN(score)) return json(400, { ok: false, error: 'bad event' });
      rows.push([e.kind, game, mode, seconds, score]);
    }
    const db = env.DB;
    if (await db.prepare('SELECT 1 FROM bans WHERE player_id = ?1').bind(playerId).first()) return json(202, { ok: true });
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const ipKey = 'e:' + (await sha256((env.IP_SALT || 'no2') + ip)).slice(0, 24);
    if (!await underLimit(db, 'e:' + playerId, c.RATE_EVENTS, c.RATE_WINDOW, now) || !await underLimit(db, ipKey, c.RATE_EVENTS_IP, c.RATE_WINDOW, now))
      return json(429, { ok: false, error: 'slow down' }, { 'Retry-After': String(c.RATE_WINDOW) });
    const day = new Date(now).toISOString().slice(0, 10), country = /^[A-Z]{2}$/.test(request.cf?.country || '') ? request.cf.country : null;
    const region = country && typeof request.cf?.region === 'string' ? cleanText(request.cf.region, 60).replace(/\n/g, ' ') || null : null;
    const L = LANGS.has(lang) ? lang : null, D = DEVICES.has(device) ? device : null;
    for (const [kind, game, mode, seconds, score] of rows)
      await db.prepare('INSERT INTO plays (player_id, day, at, kind, game, mode, seconds, score, version, lang, device, country, region) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)')
        .bind(playerId, day, now, kind, game, mode, seconds, score, version, L, D, country, region).run();
    return json(202, { ok: true });
  }

  // The play stats page (owner 2026-11-01, public since the same day: totals only, never a player id or a person's score):
  // every number it draws, in one answer. Each answer is kept for STATS_TTL seconds in this Worker instance and a visitor
  // may load it RATE_STATS times an hour, so a busy page never runs the database's daily read budget out. The owner's own
  // browsers are left out like server/stats.mjs does: every player id that ever signed REZ on a board (owner=1 keeps them in).
  const statsCache = new Map();
  async function stats(request, env, url, now, c) {
    const db = env.DB, ip = request.headers.get('CF-Connecting-IP') || 'local';
    if (!await underLimit(db, 's:' + (await sha256((env.IP_SALT || 'no2') + ip)).slice(0, 24), c.RATE_STATS, c.RATE_WINDOW, now))
      return json(429, { ok: false, error: 'slow down' }, { 'Retry-After': String(c.RATE_WINDOW) });
    const ck = url.searchParams.get('days') + '|' + url.searchParams.get('owner') + '|' + new Date(now).toISOString().slice(0, 10), hit = statsCache.get(ck);
    if (hit && now - hit.at < c.STATS_TTL * 1000) return json(200, hit.body);
    const body = await computeStats(db, url, now);
    statsCache.set(ck, { at: now, body }); if (statsCache.size > 40) statsCache.delete(statsCache.keys().next().value);
    return json(200, body);
  }
  async function computeStats(db, url, now) {
    const days = Math.max(7, Math.min(365, Number.parseInt(url.searchParams.get('days') || '90', 10) || 90));
    const keepOwner = url.searchParams.get('owner') === '1';
    const NOT = keepOwner ? '1' : "player_id NOT IN (SELECT DISTINCT player_id FROM scores WHERE initials = 'REZ') AND player_id NOT IN (SELECT player_id FROM bans)";
    const dayOf = ms => new Date(ms).toISOString().slice(0, 10), today = dayOf(now), from = dayOf(now - (days - 1) * 864e5);
    const q = async (sql, ...a) => (await db.prepare(sql).bind(...a).all()).results;
    // Who was seen on which day (all time, for first days and retention), then everything else grouped in SQL.
    const seen = await q('SELECT day, player_id FROM plays WHERE ' + NOT + ' GROUP BY day, player_id');
    const runsDay = await q("SELECT day, COUNT(*) runs, COALESCE(SUM(seconds), 0) seconds FROM plays WHERE kind = 'run' AND day >= ?1 AND " + NOT + ' GROUP BY day', from);
    const sessDay = await q("SELECT day, COUNT(*) sessions FROM plays WHERE kind = 'session' AND day >= ?1 AND " + NOT + ' GROUP BY day', from);
    const games = await q("SELECT game, mode, COUNT(*) runs, COUNT(DISTINCT player_id) players, COALESCE(SUM(seconds), 0) seconds, MAX(score) best, CAST(AVG(score) AS INTEGER) avg FROM plays WHERE kind = 'run' AND day >= ?1 AND " + NOT + ' GROUP BY game, mode', from);
    const split = async (col, limit = 20) => q('SELECT ' + col + " AS k, COUNT(DISTINCT player_id) players FROM plays WHERE day >= ?1 AND " + col + ' IS NOT NULL AND ' + NOT + ' GROUP BY ' + col + ' ORDER BY players DESC LIMIT ' + limit, from);
    // Regions (owner 2026-11-01): Cloudflare's region inside each country, for the page's list beside the map.
    const regions = await q("SELECT country, region, COUNT(DISTINCT player_id) players FROM plays WHERE day >= ?1 AND region IS NOT NULL AND " + NOT + ' GROUP BY country, region ORDER BY players DESC LIMIT 30', from);
    const comic = await q("SELECT mode AS k, COUNT(*) n FROM plays WHERE kind = 'comic' AND day >= ?1 AND " + NOT + ' GROUP BY mode', from);
    const hours = await q("SELECT CAST((at / 3600000) % 24 AS INTEGER) h, COUNT(*) n FROM plays WHERE kind = 'run' AND day >= ?1 AND " + NOT + ' GROUP BY h', from);
    const ranPlayers = await q("SELECT COUNT(DISTINCT player_id) n FROM plays WHERE kind = 'run' AND " + NOT);
    // Players who finished at least one real game today (owner 2026-11-02: "players today" counted everyone who opened it).
    const ranToday = await q("SELECT COUNT(DISTINCT player_id) n FROM plays WHERE kind = 'run' AND day = ?1 AND " + NOT, today);
    // Daily, weekly (7 days) and monthly (30 days) unique users, new users, and day-1 / day-7 return of each day's newcomers.
    const byDay = new Map(), first = new Map();
    for (const r of seen) { (byDay.get(r.day) || byDay.set(r.day, new Set()).get(r.day)).add(r.player_id); if (!first.has(r.player_id) || r.day < first.get(r.player_id)) first.set(r.player_id, r.day); }
    const shift = (d, n) => dayOf(Date.parse(d + 'T00:00:00Z') + n * 864e5), within = (d, n) => { const s = new Set(); for (let i = 0; i < n; i++) for (const p of byDay.get(shift(d, -i)) || []) s.add(p); return s.size; };
    const runs = Object.fromEntries(runsDay.map(r => [r.day, r])), sess = Object.fromEntries(sessDay.map(r => [r.day, r.sessions]));
    const newOn = new Map(); for (const [p, d] of first) (newOn.get(d) || newOn.set(d, []).get(d)).push(p);
    const series = []; for (let d = from; d <= today; d = shift(d, 1)) {
      const fresh = newOn.get(d) || [], back = n => { const s = byDay.get(shift(d, n)); return shift(d, n) > today ? null : fresh.filter(p => s?.has(p)).length; };
      series.push({ day: d, dau: byDay.get(d)?.size || 0, wau: within(d, 7), mau: within(d, 30), new: fresh.length, d1: fresh.length ? back(1) : null, d7: fresh.length ? back(7) : null, sessions: sess[d] || 0, runs: runs[d]?.runs || 0, seconds: runs[d]?.seconds || 0 });
    }
    const days2 = new Map(); for (const r of seen) days2.set(r.player_id, (days2.get(r.player_id) || 0) + 1);
    return { ok: true, now, days, owner: keepOwner,
      totals: { users: first.size, players: ranPlayers[0]?.n || 0, returning: [...days2.values()].filter(n => n > 1).length, dau: within(today, 1), playedToday: ranToday[0]?.n || 0, wau: within(today, 7), mau: within(today, 30) },
      series, games, comic, hours, langs: await split('lang'), devices: await split('device'), countries: await split('country', 300), regions, versions: await split('version') };
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
        return withCors(json(200, { ok: true, game: id, version: GAMES[id].version, scores: await top(env.DB, id, limit, PLAYER.test(player || '') ? player : null, url.searchParams.get('pending') === '1', daySeed(url.searchParams.get('seed')), url.searchParams.get('hard') === '1', url.searchParams.get('sticker') === '1') }));
      }
      if (url.pathname.startsWith('/admin/')) return withCors(await admin(request, env, url, now));
      if (url.pathname === '/submit' && request.method === 'POST') return withCors(await submit(request, env, c, now));
      if (url.pathname === '/report' && request.method === 'POST') return withCors(await report(request, env, c, now));
      if (url.pathname === '/events' && request.method === 'POST') return withCors(await events(request, env, c, now));
      if (url.pathname === '/stats' && request.method === 'GET') return withCors(await stats(request, env, url, now, c));
      return withCors(json(404, { ok: false, error: 'not found' }));
    } catch (e) {
      console.error(e);
      return withCors(json(500, { ok: false, error: 'server error' }));
    }
  };
}
