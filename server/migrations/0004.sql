-- Play stats (owner 2026-11-01): who plays, what and how long, for the owner's stats page (site/stats, GET /stats).
-- Sent by the game in small batches only while "share my scores online" is on (the same switch as the scores), keyed by
-- the same random player id the leaderboard already uses. No IP address is stored; country is Cloudflare's two-letter
-- guess for the request. day is the UTC day the batch arrived.
CREATE TABLE plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  day TEXT NOT NULL,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('session', 'run', 'comic')),
  game TEXT,
  mode TEXT,
  seconds INTEGER,
  score INTEGER,
  version TEXT NOT NULL,
  lang TEXT,
  device TEXT,
  country TEXT
);
CREATE INDEX plays_day ON plays (day, player_id);
CREATE INDEX plays_kind ON plays (kind, game);
