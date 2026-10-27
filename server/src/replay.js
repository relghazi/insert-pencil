// Replay verification: the client sends the seed and every fixed step's input, run-length encoded as a flat
// list [steps, cell, cell, ..., steps, ...]. Each game's core declares the cells (CONFIG.record, the same list the
// client's recorder in src/shell/leaderboard.js reads): b on/off, n a number in [lo,hi] on a 1/d grid, e an index
// into a list of values, p an optional point (present, x, y). The server re-runs the game's own core on them at its
// fixed step and only the score it computes counts.

export const width = layout => 1 + layout.reduce((s, f) => s + (f[1] === 'p' ? 3 : 1), 0);

const onGrid = (v, lo, hi, d) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi && (!d || Math.round(v * d) / d === v);

function cellsOk(layout, c, i) {
  for (const [, t, a, b, d] of layout) {
    if (t === 'b') { if (c[i] !== 0 && c[i] !== 1) return false; i++; }
    else if (t === 'n') { if (!onGrid(c[i], a, b, d)) return false; i++; }
    else if (t === 'e') { if (!Number.isInteger(c[i]) || c[i] < 0 || c[i] >= a.length) return false; i++; }
    else if (t === 'p') { if ((c[i] !== 0 && c[i] !== 1) || !onGrid(c[i + 1], a, b, d) || !onGrid(c[i + 2], a, b, d)) return false; i += 3; }
    else return false;
  }
  return true;
}

export function cells(layout, c, i) {
  const o = {};
  for (const [k, t, a] of layout) {
    if (t === 'b') o[k] = c[i++] === 1;
    else if (t === 'n') o[k] = c[i++];
    else if (t === 'e') o[k] = a[c[i++]];
    else if (t === 'p') { if (c[i] === 1) o[k] = { x: c[i + 1], y: c[i + 2] }; i += 3; }
  }
  return o;
}

export function decode(inputs, { maxRuns, maxSteps, layout }) {
  const w = width(layout);
  if (!Array.isArray(inputs) || !inputs.length || inputs.length % w) return { error: 'bad inputs' };
  if (inputs.length / w > maxRuns) return { error: 'replay too long' };
  let steps = 0;
  for (let i = 0; i < inputs.length; i += w) {
    const n = inputs[i];
    if (!Number.isInteger(n) || n < 1 || !cellsOk(layout, inputs, i + 1)) return { error: 'bad inputs' };
    steps += n;
    if (steps > maxSteps) return { error: 'replay too long' };
  }
  return { steps };
}

// Runs the core from the seed. The recording must end exactly on the step the game ends.
export function replay(game, seed, inputs) {
  const engine = game.create(seed), w = width(game.record);
  let steps = 0;
  for (let i = 0; i < inputs.length; i += w) {
    for (let k = 0; k < inputs[i]; k++) {
      if (engine.state === 'end') return { error: 'inputs after game over' };
      // A fresh object each step, as the client builds one each step: a core may change what it was given.
      engine.step(game.step, cells(game.record, inputs, i + 1)); steps++;
    }
  }
  if (engine.state !== 'end') return { error: 'game not finished' };
  return { score: engine.score, steps, wave: engine.wave };
}
