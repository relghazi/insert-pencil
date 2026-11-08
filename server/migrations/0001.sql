-- No. 2 Arcade online leaderboard, first schema.
-- Accepted, replay-verified scores. replay_hash makes a resent submission a no-op.
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  player_id TEXT NOT NULL,
  initials TEXT NOT NULL,
  score INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  steps INTEGER NOT NULL,
  version TEXT NOT NULL,
  replay_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX scores_replay ON scores (game, replay_hash);
CREATE INDEX scores_top ON scores (game, score DESC);
CREATE INDEX scores_player ON scores (player_id);

-- Players whose scores are hidden and whose submissions are refused.
CREATE TABLE bans (
  player_id TEXT PRIMARY KEY,
  reason TEXT,
  created_at INTEGER NOT NULL
);

-- Fixed-window submit counters per player id and per (salted, hashed) IP.
CREATE TABLE rate (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);
