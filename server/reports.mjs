// Files the locker's detention slips (problem reports) as GitHub issues, then tells the Worker which issue each became.
// Run by a scheduled GitHub Actions workflow in the public repository (server/github/report-issues.yml), whose
// GITHUB_TOKEN may open issues there. Needs LEADERBOARD_URL, LEADERBOARD_ADMIN_TOKEN, GITHUB_TOKEN and
// GITHUB_REPOSITORY (owner/name, set by Actions).
// Usage: node server/reports.mjs [--dry]   (--dry prints the issues instead of opening them)
const LABEL = 'detention slip';

// Notebook titles for the issue title; anything else is shown by its id.
const TITLES = {
  'scribble-defender': 'Scribble Defender', 'gym-class-pong': 'Gym Class Pong', 'detention-breakout': 'Detention Breakout',
  'space-substitutes': 'Space Substitutes', erasteroids: 'Erasteroids', 'lunch-lander': 'Lunch Lander',
  'spitball-command': 'Spitball Command', 'snack-man': 'Snack-Man', 'recess-zone': 'Recess Zone', galgebra: 'Galgebra',
  centigrade: 'Centigrade', froggology: 'Froggology', quiz: 'Quiz', testpest: 'Testpest', 'home-ec-scramble': 'Home Ec Scramble',
  'dunce-kong': 'Dunce Kong', 'dig-doug': 'Dig Doug', 'q-nerd': 'Q*Nerd', 'jock-joust': 'Jock Joust',
  'class-of-2084': 'Robotron: Class of 2084', 'mystery-meat-time': 'Mystery Meat Time', 'hall-patrol': 'Hall Patrol',
  'term-paperboy': 'Term Paperboy', 'locker-gauntlet': 'Locker Gauntlet', locker: 'the locker', comic: 'the intro comic', other: 'something else',
};

// Player text goes into a public issue: links are removed, @mentions and #references cannot notify anyone, and every
// line is quoted so it cannot pass for the issue's own markdown.
export function quote(text) {
  return String(text)
    .replace(/\b(?:https?|ftp):\/\/\S+|\bwww\.\S+/gi, '[link removed]')
    .replace(/@(?=\w)/g, '@​').replace(/#(?=\d)/g, '#​')
    .replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;'))
    .split('\n').map(l => '> ' + l).join('\n');
}

export function issueFor(r) {
  const about = TITLES[r.about] || r.about;
  const first = String(r.text).replace(/\s+/g, ' ').trim();
  const summary = first.length > 60 ? first.slice(0, 57).replace(/\s+\S*$/, '') + '...' : first;
  return {
    title: `Detention slip: ${about}: ${summary.replace(/@/g, '@​')}`.slice(0, 120),
    body: [
      `Written up in the locker of No. 2 Arcade v${r.version}, about **${about}**.`,
      '',
      quote(r.text),
      '',
      `Device: ${String(r.device).replace(/[<>@`]/g, '')}`,
      `Sent ${new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC (slip #${r.id}).`,
    ].join('\n'),
    labels: [LABEL],
  };
}

// Files every new slip. Options default to the environment; tests pass their own fetch and endpoints.
export async function run({ url = process.env.LEADERBOARD_URL, token = process.env.LEADERBOARD_ADMIN_TOKEN, ghToken = process.env.GITHUB_TOKEN,
  repo = process.env.GITHUB_REPOSITORY, dry = false, fetch = globalThis.fetch, log = console.log } = {}) {
  const base = String(url || '').replace(/\/+$/, '');
  if (!base || !token) throw Error('LEADERBOARD_URL and LEADERBOARD_ADMIN_TOKEN are required');
  if (!/^https:\/\//.test(base) && !/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(base + '/')) throw Error('the admin token only goes over https');
  if (!dry && (!ghToken || !/^[\w.-]+\/[\w.-]+$/.test(repo || ''))) throw Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required (or pass --dry)');
  const call = async (u, opts = {}) => {
    const res = await fetch(u, opts), body = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(`${opts.method || 'GET'} ${u.replace(/\?.*/, '')}: HTTP ${res.status} ${body.error || body.message || ''}`);
    return body;
  };
  const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const ghHead = { Authorization: 'Bearer ' + ghToken, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  const { reports } = await call(base + '/admin/reports', { headers: auth });
  if (!reports.length) { log('done: 0 slips'); return []; }
  if (!dry) {
    // The label once; 422 means it already exists.
    const res = await fetch(`https://api.github.com/repos/${repo}/labels`, { method: 'POST', headers: ghHead, body: JSON.stringify({ name: LABEL, color: 'f4b6c2', description: 'Problem reports written up in the game' }) });
    if (!res.ok && res.status !== 422) throw Error(`label: HTTP ${res.status}`);
  }
  const filed = [];
  for (const r of reports) {
    const issue = issueFor(r);
    if (dry) { log('---\n' + issue.title + '\n\n' + issue.body); continue; }
    const made = await call(`https://api.github.com/repos/${repo}/issues`, { method: 'POST', headers: ghHead, body: JSON.stringify(issue) });
    filed.push({ id: r.id, issue: made.html_url });
    log(`slip #${r.id} -> ${made.html_url}`);
  }
  if (filed.length) await call(base + '/admin/reports/filed', { method: 'POST', headers: auth, body: JSON.stringify({ filed }) });
  log(`done: ${dry ? reports.length + ' slips shown' : filed.length + ' filed'}`);
  return filed;
}

if (import.meta.url === `file://${process.argv[1]}`) run({ dry: process.argv.includes('--dry') }).catch(e => { console.error(e.message); process.exit(1); });
