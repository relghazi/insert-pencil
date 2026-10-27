// Player stats from the leaderboard database (owner 2026-10-31): who played, read from the runs players already send
// with "share my scores online" on. Nothing new is collected; a player who never sends a score is not seen here.
// The owner is left out: every player id that ever signed as REZ, plus the ids in ~/.no2-stats-exclude.json
// (a JSON array, outside the repository so it is never published) for browsers where he signed otherwise.
// Usage (from server/, logged in to wrangler): node stats.mjs [--days N] [--all]   (--all keeps the owner in)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2), days = Number(args[args.indexOf('--days') + 1]) || 14, all = args.includes('--all');
const sql = q => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'no2-arcade-leaderboard', '--remote', '--json', '--command', q],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))[0].results;

let skip = [];
if (!all) {
  skip = sql("SELECT DISTINCT player_id FROM scores WHERE initials = 'REZ'").map(r => r.player_id);
  try { skip.push(...JSON.parse(fs.readFileSync(path.join(os.homedir(), '.no2-stats-exclude.json'), 'utf8'))) } catch {}
}
const not = skip.length ? `player_id NOT IN (${[...new Set(skip)].map(id => `'${id.replace(/[^0-9a-f]/g, '')}'`).join(',')})` : '1';
const hard = 'seed >= 2147483648';
const day = ms => new Date(ms).toISOString().slice(0, 10);

const total = sql(`SELECT COUNT(DISTINCT player_id) players, COUNT(*) runs, SUM(status = 'verified') verified, SUM(${hard}) hard,
  MIN(created_at) first, MAX(created_at) last FROM scores WHERE ${not}`)[0];
console.log(`No. 2 Arcade players${all ? '' : ' (owner left out)'}`);
if (!total.runs) { console.log('no runs yet from anyone else.'); process.exit(0) }
console.log(`  unique players ${total.players}   runs ${total.runs} (${total.verified} verified, ${total.hard} hard)   ${day(total.first)} to ${day(total.last)}`);

console.log('\nPer game');
for (const r of sql(`SELECT game, COUNT(DISTINCT player_id) players, COUNT(*) runs, MAX(verified_score) best FROM scores WHERE ${not} GROUP BY game ORDER BY players DESC, runs DESC`))
  console.log(`  ${r.game.padEnd(20)} ${String(r.players).padStart(3)} players ${String(r.runs).padStart(4)} runs   best ${r.best ?? '-'}`);

console.log(`\nPer day (last ${days})`);
const since = Date.now() - days * 864e5;
const rows = sql(`SELECT player_id, created_at FROM scores WHERE ${not} AND created_at >= ${since}`), seen = new Set(), byDay = {};
for (const r of rows.sort((a, b) => a.created_at - b.created_at)) {
  const d = day(r.created_at), b = byDay[d] ??= { players: new Set(), runs: 0, fresh: 0 };
  b.players.add(r.player_id); b.runs++;
  if (!seen.has(r.player_id)) { seen.add(r.player_id); b.fresh++ }
}
for (const [d, b] of Object.entries(byDay)) console.log(`  ${d}  ${String(b.players.size).padStart(3)} players  ${String(b.runs).padStart(4)} runs  ${String(b.fresh).padStart(3)} new`);

console.log('\nPlayers');
for (const r of sql(`SELECT initials, COUNT(*) runs, COUNT(DISTINCT game) games, MIN(created_at) first, MAX(created_at) last FROM scores WHERE ${not} GROUP BY player_id ORDER BY runs DESC LIMIT 50`))
  console.log(`  ${r.initials}  ${String(r.runs).padStart(4)} runs in ${String(r.games).padStart(2)} games   ${day(r.first)} to ${day(r.last)}`);

const slips = sql("SELECT COUNT(*) n FROM reports")[0].n;
console.log(`\nDetention slips: ${slips}`);
