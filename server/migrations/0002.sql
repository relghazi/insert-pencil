-- Free Workers plan (owner 2026-10-27): /submit no longer replays inside the request. A run is stored as 'pending'
-- with its inputs; server/verify.mjs replays it outside Cloudflare and posts a verdict through /admin/verdicts.
-- score stays the claimed score; verified_score is the score the replay computed. Rows from 0001 were already
-- replayed by the Worker, so they start as verified.
ALTER TABLE scores ADD COLUMN status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected'));
ALTER TABLE scores ADD COLUMN verified_score INTEGER;
ALTER TABLE scores ADD COLUMN inputs TEXT;
ALTER TABLE scores ADD COLUMN reason TEXT;
ALTER TABLE scores ADD COLUMN verified_at INTEGER;
UPDATE scores SET verified_score = score;
CREATE INDEX scores_status ON scores (status, id);
CREATE INDEX scores_verified ON scores (game, status, verified_score DESC);
