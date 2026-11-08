# No. 2 Arcade online leaderboard (prototype: Galgebra)

A Cloudflare Worker with a D1 database on the free Workers plan. The game sends a finished run's seed and its
recorded inputs; the Worker checks its shape and limits and stores it as pending. A replay needs about 0.3 ms of CPU
per second of play (a 3 minute game about 50 ms), more than the free plan's 10 ms per request, so the replay runs
outside Cloudflare: `verify.mjs`, started every hour by a GitHub Actions workflow
(`server/github/leaderboard-verify.yml`, scheduled from the public repository), fetches the pending runs, replays each on the game's own deterministic
core (`src/galgebra/core.js`, wrapped in by `build.mjs`, the same bundle the Worker ships) at the fixed 120 Hz step,
and posts a verdict. Only verified scores, at the score the replay computed, reach the board. A new score therefore
takes up to an hour (plus GitHub's own schedule delay, sometimes longer at busy times) to appear for others; the
player sees their own waiting run at once, marked "checking". Players are three initials plus a random anonymous id
kept in their save; there are no accounts.

The game stays offline unless both are true: the build has a leaderboard address, and "Share my scores online" is
on in settings (on by default; the player can turn it off). With no address the option is not shown and every
Content-Security-Policy keeps `connect-src 'none'`.

## API

- `GET /scores?game=galgebra&limit=10[&player=<id>][&pending=1][&seed=<n>|&hard=1]`: the top verified scores, best one per player,
  `you: true` on the asking player's rows. With `pending=1` the asking player's own best waiting run is merged in
  with `pending: true` when it beats their verified best; nobody else's pending runs are ever listed.
  With `seed` only runs on that seed (the daily board). Hard runs (Ace's locker, a seed of 2147483648 or more, top
  bit set) are left out of the normal board; `hard=1` lists only them, best one per player.
- `POST /submit` with `{game, version, playerId, initials, seed, inputs, claimedScore}`. `inputs` is a flat list
  `[steps, axis, fire, ...]`, one run per input change. Answers: 202 stored as pending (a resent run is a no-op and
  answers with its current status), 400 bad request, 403 banned or origin not allowed, 409 game version differs,
  413 too large, 422 malformed or too long inputs, 429 rate limited.
- Verifier only, `Authorization: Bearer <ADMIN_TOKEN>` (compared in constant time; without the `ADMIN_TOKEN` secret
  both answer 404, a missing or wrong token 401):
  - `GET /admin/pending?limit=N&after=<id>`: up to 25 pending runs, oldest first.
  - `POST /admin/verdicts` with `{verdicts: [{id, status: "verified"|"rejected", score, reason}]}`, at most 25. Only
    pending runs change; `verified` also needs `score` to equal the claimed score. Decided runs drop their inputs
    (the hash stays, so a resend is still a no-op).

## Deploy (free plan)

Run these in `server/` to set the Worker up from scratch. The live Worker is already set up: after a release only the redeploy below applies (`npm run deploy`, plus `npx wrangler d1 migrations apply no2-arcade-leaderboard --remote` when a release adds a migration).

1. `npm install` (installs the pinned wrangler locally).
2. `npx wrangler login`
3. `npx wrangler d1 create no2-arcade-leaderboard`, then paste the printed `database_id` into `wrangler.toml`.
4. `npx wrangler d1 migrations apply no2-arcade-leaderboard --remote` (applies every file in `migrations/` in order).
5. `npx wrangler secret put IP_SALT` and type any long random string (IPs are only kept as salted hashes in the
   rate-limit table).
6. Make the verifier token: `openssl rand -hex 32`. Keep it for step 9, then `npx wrangler secret put ADMIN_TOKEN`
   and paste it (at least 16 characters; without it the `/admin` endpoints do not exist and runs stay pending).
7. `npx wrangler deploy`. It prints the address, for example `https://no2-arcade-leaderboard.<you>.workers.dev`.
8. Check it: `curl "https://no2-arcade-leaderboard.<you>.workers.dev/scores?game=galgebra"` answers
   `{"ok":true,...,"scores":[]}`.
9. On GitHub, in the game's repository, Settings > Secrets and variables > Actions > New repository secret:
   `LEADERBOARD_URL` (the address from step 7) and `LEADERBOARD_ADMIN_TOKEN` (the token from step 6).
10. Copy `server/github/leaderboard-verify.yml` to `.github/workflows/` on the repository's default branch. Committing it on a side branch
    does nothing: GitHub only runs scheduled workflows from the default branch. Then Actions > leaderboard-verify >
    Run workflow once and check its log ends `done: ... verified`. The actions in it are pinned to full commit SHAs.

Which games are on the board: every core in build.mjs's list that declares `CONFIG.record` (how one fixed step's
input is recorded; the client's recorder and the replay both read it). After a release that adds games or changes a
core, deploy the Worker again (`npm run deploy` here) so it knows the new games and versions; until then it answers
`unknown game` or `version mismatch` and the game keeps those runs waiting on the player's machine.

The verifier replays with the game core checked out on the default branch. A run whose game version that core does not
have stays pending (the log says so) until the default branch and the deployed Worker match again. By hand, from the
repo root: `LEADERBOARD_URL=... LEADERBOARD_ADMIN_TOKEN=... node server/verify.mjs [--batch 10] [--max 500]`.

## Point the game at it

Either edit `src/shell/leaderboard-config.json`:

```json
{ "url": "https://no2-arcade-leaderboard.<you>.workers.dev" }
```

or set it for one build: `NO2_LEADERBOARD_URL=https://... npm run build` (the variable wins over the file; unset it
to use the file). Only `https://` is accepted, plus `http://127.0.0.1` or `http://localhost` for local tests. The
build writes the address into `src/shell/leaderboard.js` and puts its origin in both CSP `connect-src` lines of
`src/index.html`, so the page can reach that one origin and nothing else. The built HTML changes, so run
`bash tools/update-locks.sh` and `npm test` afterwards.

If the HTML is also served from a web address (not only opened as a file), add that origin to `ALLOWED_ORIGINS` in
`wrangler.toml` (comma separated; `null` is the file:// page) and deploy again.

## Local test (no Cloudflare account needed)

```sh
cd server && npm install
npx wrangler d1 migrations apply no2-arcade-leaderboard --local
npx wrangler dev --local --port 8787
# in the repo root, a build pointed at it:
NO2_LEADERBOARD_URL=http://127.0.0.1:8787 npm run build
```

Then, with the dev server's `ADMIN_TOKEN` in `server/.dev.vars` (one line `ADMIN_TOKEN=<any 16+ characters>`, not in git),
verify by hand: `LEADERBOARD_URL=http://127.0.0.1:8787 LEADERBOARD_ADMIN_TOKEN=<same> node server/verify.mjs`.

`node server/test/leaderboard.test.mjs` (also part of `npm test`) needs no server: it records Galgebra games with the
client's recorder, replays them, runs the Worker's handler against an in-memory SQLite copy of the schema, and drives
`verify.mjs` against that handler (pending, verified, rejected, admin token checks).

## Detention slips (problem reports)

`POST /report` with `{about, text, version, device}` stores a slip from the locker's "write it up" form: `about` is a
notebook id or `locker`, `comic`, `other`; `text` 5 to 600 characters (control characters removed); no player id.
Limits: `RATE_REPORT` per IP and `RATE_REPORTS` from everyone per window. Answers 202, 400, 413 or 429.
`server/reports.mjs` (run every 20 minutes by `server/github/report-issues.yml`, copied into the repository that should receive
the issues, with the same two secrets as the verifier) reads `GET /admin/reports`, opens one issue per slip labelled
"detention slip" (links removed, @mentions and #references neutralised, the text quoted) and posts
`/admin/reports/filed`, which drops the text and keeps the issue link. `node server/reports.mjs --dry` prints them instead.
Migration `0003.sql` adds the table.

## Moderation

Add `--local` instead of `--remote` to try these on the local database.

- Top of the board: `npx wrangler d1 execute no2-arcade-leaderboard --remote --command "SELECT id, player_id, initials, verified_score, datetime(created_at/1000,'unixepoch') FROM scores WHERE game='galgebra' AND status='verified' ORDER BY verified_score DESC LIMIT 20"`
- Waiting and refused runs: `... --command "SELECT id, player_id, initials, score, status, verified_score, reason FROM scores WHERE status!='verified' ORDER BY id DESC LIMIT 20"`
- Ban a player (hides all their scores, refuses new ones): `... --command "INSERT INTO bans (player_id, reason, created_at) VALUES ('<player_id>', 'cheating', unixepoch()*1000)"`
- Unban: `... --command "DELETE FROM bans WHERE player_id='<player_id>'"`
- Remove one score: `... --command "DELETE FROM scores WHERE id=<id>"`
- Clear a game's board: `... --command "DELETE FROM scores WHERE game='galgebra'"`
- Clear everything: `... --command "DELETE FROM scores; DELETE FROM rate;"`

Rude initials (a short list in `src/handler.js`) are stored as `???`.

## Limits (wrangler.toml [vars])

`MAX_BODY` 1.9 MB per submission, `MAX_STEPS` one hour of play, `MAX_RUNS` 250,000 input changes (recordings are packed, see src/replay.js),
`RATE_PLAYER` 20 and `RATE_IP` 60 submissions an hour. The game only queues a run that beats the best it already
sent for that player, keeps at most 3 waiting, and sends them when a high scores page is shown.

## Cost

- Workers Free: 100,000 requests a day and about 10 ms of CPU per request. A submission is one request, a scores page
  one or two, the verifier (every 20 minutes) one or two per 10 runs. No replay runs in a request.
- D1 Free: 5 million rows read and 100,000 rows written a day, 5 GB in all, 500 MB per database. A pending run keeps
  its inputs (a few KB to some tens of KB) until it is decided; a decided row is under 200 bytes.
- GitHub Actions: a run every 20 minutes of under a minute, from the public repository; free for public repositories and well inside the free minutes of a
  private one.
- Each scores read scans the game's verified rows to find each player's best; past roughly 100,000 rows per game,
  add a per-player best table.

Prices as published by Cloudflare in 2026; check the current pricing page before relying on them.

## Adding another game

Add a line to `GAMES` in `build.mjs` (id, core file, global, engine class), add the id to `GAMES` in
`src/shell/leaderboard.js`, record the game's inputs the way `src/galgebra/game.js` does (three small hooks), then
deploy. A core whose inputs carry more than an axis and a fire button needs its own run format in `src/replay.js`
and in the client's recorder.

## Player stats

`node stats.mjs [--days N] [--all]` (from `server/`, logged in to wrangler) prints unique players, runs per game and per day, and the detention slip count, read from the scores players already send. The game's maker is left out (every id that signed as REZ, plus ids listed in `~/.no2-stats-exclude.json`); `--all` keeps everyone. Players who never send a score are not counted.

## Play stats page

The game sends small anonymous batches to `POST /events` while "share my scores online" is on: a session at launch, every real game played (game, normal/hard/daily, seconds, score) and whether the intro comic was watched or skipped, under the same random player id as the scores. No IP is stored; the country is Cloudflare's guess. Demos, captures and automated browsers never send anything.

`GET /stats` is public: it returns totals only (per day, game, language, device, country, version), never a player id. Each answer is kept for `STATS_TTL` seconds (300) in the Worker instance and a visitor may load it `RATE_STATS` times an hour (60), so the page never runs out the database's free daily reads. The maker's own browsers (every id that signed REZ) are left out unless `owner=1`. https://no2arca.de/stats/ draws it; typing STATS in the locker opens it.

Regions (migration 0005): the batch's Cloudflare region (state, province) is kept next to its country for the page's world map and region list; no city, no coordinates.

Setup: `npx wrangler d1 migrations apply no2-arcade-leaderboard --remote` (applies 0004 and 0005), then `npm run deploy`. The `STATS_TOKEN` secret from the first version is no longer used (`npx wrangler secret delete STATS_TOKEN` removes it).
