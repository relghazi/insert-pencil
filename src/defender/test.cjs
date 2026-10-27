'use strict';
// node src/defender/test.cjs: run the Scribble Defender rule checks against the core, like the other notebooks, plus the
// determinism check the leaderboard replays rely on (seed 1 plays a full wave the same way twice).
const fs = require('fs'), path = require('path'), vm = require('vm');
const c = vm.createContext({ console: { log() {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'core.js'), 'utf8'), c);
c.__SCRIBBLE_API__ = {};
vm.runInContext(fs.readFileSync(path.join(__dirname, 'deterministic-tests.js'), 'utf8'), c);
try {
  const rules = c.__SCRIBBLE_API__.runDeterministicTests();
  const { ScribbleEngine, CONFIG } = c.ScribbleCore, a = new ScribbleEngine(1), b = new ScribbleEngine(1);
  for (let i = 0; i < 6000 && a.wave < 2; i++) { a.step(CONFIG.step, a.pilot()); b.step(CONFIG.step, b.pilot()); }
  const state = e => JSON.stringify(e, (k, v) => ['carrier', 'target', 'human'].includes(k) && v ? v.id : v);
  if (state(a) !== state(b) || a.wave !== 2) throw Error('seed 1 does not play the same way twice');
  console.log(rules.passed + ' Scribble Defender rule checks passed');
} catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
