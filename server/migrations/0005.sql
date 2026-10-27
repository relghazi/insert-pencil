-- Play stats by region (owner 2026-11-01): Cloudflare's guess of the region (state, province) the batch came from, next to
-- its country, for the stats page's map and region list. No city, no coordinates, no IP.
ALTER TABLE plays ADD COLUMN region TEXT;
