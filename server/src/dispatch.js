// Cron (wrangler.toml [triggers]): GitHub's own schedules are sometimes skipped, so every 20 minutes the Worker starts
// the replay verifier when runs are waiting and the issue filer when detention slips are waiting, through GitHub's
// workflow_dispatch API. Off unless the owner sets the GH_DISPATCH_TOKEN secret (a fine-grained token allowed to run
// Actions on those repositories). DISPATCH lists "owner/repo:workflow-file|what" pairs; what is runs or slips.
export async function dispatch(env, { fetch = globalThis.fetch } = {}) {
  if (typeof env.GH_DISPATCH_TOKEN !== 'string' || env.GH_DISPATCH_TOKEN.length < 20) return { off: true };
  const db = env.DB, started = [];
  const waiting = {
    runs: (await db.prepare("SELECT COUNT(*) AS n FROM scores WHERE status = 'pending'").first())?.n || 0,
    slips: (await db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'new'").first())?.n || 0,
  };
  for (const item of String(env.DISPATCH || '').split(',').map(s => s.trim()).filter(Boolean)) {
    const m = /^([\w.-]+\/[\w.-]+):([\w.-]+\.ya?ml)\|(runs|slips)$/.exec(item);
    if (!m || !waiting[m[3]]) continue;
    const res = await fetch(`https://api.github.com/repos/${m[1]}/actions/workflows/${m[2]}/dispatches`, {
      method: 'POST', body: JSON.stringify({ ref: 'main' }),
      headers: { Authorization: 'Bearer ' + env.GH_DISPATCH_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'no2-arcade-leaderboard', 'Content-Type': 'application/json' },
    });
    started.push({ workflow: m[1] + ':' + m[2], status: res.status });
  }
  return { waiting, started };
}
