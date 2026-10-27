-- Detention slips (owner 2026-10-27): problem reports written in the locker's "write it up" form. Stored here until
-- server/reports.mjs files each one as a GitHub issue (status 'filed', issue URL kept); text is dropped once filed.
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  about TEXT NOT NULL,
  text TEXT,
  version TEXT NOT NULL,
  device TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'filed')),
  issue TEXT
);
CREATE INDEX reports_status ON reports (status, id);
