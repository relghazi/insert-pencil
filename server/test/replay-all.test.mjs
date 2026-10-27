// node server/test/replay-all.test.mjs [game-id ...]: no network. For every core that declares CONFIG.record, the
// demo pilot plays through the client's recorder (src/shell/leaderboard.js) with a shaky hand, then lets go so the
// game runs out; the server's decode and replay (server/src/replay.js) must accept the recording and reach exactly
// the same score on the same step. Also checks the recording survives JSON and that another seed does not match.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
import { createRequire } from 'node:module'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, GAMES as LIST } from '../build.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../..'), require = createRequire(import.meta.url);
const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const { GAMES } = await import(pathToFileURL(build(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'no2lb-')), 'games.js'), only.length ? only : null)).href);
const { replay, decode } = await import('../src/replay.js');
const LB = require(path.join(repo, 'src/shell/leaderboard.js'));
const LIMITS = { maxRuns: 50000, maxSteps: 432000 }, HOLD = 120 * 40, CAP = 120 * 60 * 30;
// After the pilot lets go, most games run out on their own. Lunar Lander (1979) only ends when the fuel is gone and
// fuel only burns under thrust, so there the hand holds the throttle open instead.
const LET_GO = { 'lunch-lander': { throttle: 1 } };

// The pilot's input with a little noise on numbers and some dropped presses, so the recording is not a perfect demo.
function shake(input, rnd) {
  const out = {};
  for (const [k, v] of Object.entries(input || {})) out[k] = typeof v === 'number' ? v * (1 - .3 * rnd()) : typeof v === 'boolean' ? v && rnd() > .15 : v;
  return out;
}

function play(id, game, seed) {
  const C = game.core.CONFIG, engine = game.create(seed);
  const rec = new LB.Recorder(id, seed, game.core);
  let r = seed * 7 + 3; const rnd = () => ((r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296);
  let i = 0;
  for (; engine.state !== 'end' && i < CAP; i++) engine.step(C.step, rec.take(i < HOLD ? shake(engine.pilot(), rnd) : LET_GO[id] || {}, true, engine));
  return { engine, rec, steps: i };
}

let passed = 0, failed = 0;
for (const { id } of LIST) {
  if (only.length && !only.includes(id)) continue;
  const game = GAMES[id];
  if (!game) { failed++; console.log('FAIL ' + id + ': its core declares no CONFIG.record'); continue; }
  try {
    assert(LB.games.includes(id), 'listed in the client');
    for (const seed of [1979, 31337]) {
      const p = play(id, game, seed);
      assert.equal(p.engine.state, 'end', `seed ${seed}: the game never ended after ${p.steps} steps`);
      assert(!p.rec.bad, `seed ${seed}: the recorder marked the run unusable`);
      const { inputs } = JSON.parse(JSON.stringify(p.rec.data()));
      const shape = decode(inputs, { ...LIMITS, layout: game.record });
      assert(!shape.error, `seed ${seed}: decode refused it (${shape.error})`);
      const out = replay(game, seed, inputs);
      assert(!out.error, `seed ${seed}: replay error ${out.error}`);
      assert.equal(out.score, p.engine.score, `seed ${seed}: replay score`);
      assert.equal(out.steps, p.steps, `seed ${seed}: replay steps`);
      const other = replay(game, seed + 1, inputs);
      // Some cabinets barely use chance (Frogger's lanes, the lander's fixed moon): there another seed may play the same.
      if (!other.error && other.score === out.score && other.steps === out.steps && seed === 1979) console.log(`note ${id}: the seed does not change this run`);
      if (seed === 1979) console.log(`PASS ${id}: score ${out.score}, ${(p.steps / 120).toFixed(0)} s, ${JSON.stringify(inputs).length} bytes`);
    }
    passed++;
  } catch (e) { failed++; console.log(`FAIL ${id}: ${e.message.split('\n')[0]}`); }
}
console.log(`${passed} games replay exactly${failed ? ', ' + failed + ' failed' : ''}`);
if (failed) process.exit(1);
