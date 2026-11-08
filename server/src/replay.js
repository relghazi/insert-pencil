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

// Packed recordings (the client's Layout.pack, "P1." then base64url bytes): per run a varint step count, a varint bit
// mask of the cells that changed since the run before (the first run against all zeros), then each changed cell as a
// zigzag varint integer, an n cell scaled by its d. Unpacked here into the same flat list as above; null if malformed
// or longer than maxRuns runs.
const scales = layout => layout.flatMap(([, t, , , d]) => t === 'n' ? [d] : t === 'p' ? [1, d, d] : [1]);
export function unpack(text, layout, maxRuns = Infinity) {
  if (typeof text !== 'string' || !text.startsWith('P1.') || !/^[A-Za-z0-9_-]*$/.test(text.slice(3))) return null;
  let bin; try { bin = atob(text.slice(3).replace(/-/g, '+').replace(/_/g, '/')); } catch { return null; }
  const d = scales(layout), cols = d.length, prev = new Array(cols).fill(0), out = [];
  let i = 0, runs = 0;
  const vi = () => { let n = 0, mul = 1; for (let k = 0; k < 8; k++) { if (i >= bin.length) return -1; const b = bin.charCodeAt(i++); n += (b & 127) * mul; if (b < 128) return n; mul *= 128; } return -1; };
  while (i < bin.length) {
    if (++runs > maxRuns) return null;
    const n = vi(), m = vi();
    if (n < 1 || m < 0 || m >= 2 ** cols) return null;
    out.push(n);
    for (let j = 0; j < cols; j++) {
      if (Math.floor(m / 2 ** j) % 2) { const z = vi(); if (z < 0) return null; prev[j] = z % 2 ? -(z + 1) / 2 : z / 2; }
      out.push(d[j] && d[j] !== 1 ? (prev[j] / d[j]) || 0 : prev[j]);
    }
  }
  return out.length ? out : null;
}
// The Worker's cheap check on a packed recording (about 10 ms of CPU per request on the free plan): one pass over the
// bytes that validates every varint and mask and sums the steps without building the cells; the verifier's full
// decode and replay come later. Returns { steps } or { error }.
export function measure(text, layout, { maxRuns, maxSteps }) {
  if (typeof text !== 'string' || !text.startsWith('P1.') || !/^[A-Za-z0-9_-]+$/.test(text.slice(3))) return { error: 'bad inputs' };
  let bin; try { bin = atob(text.slice(3).replace(/-/g, '+').replace(/_/g, '/')); } catch { return { error: 'bad inputs' }; }
  const cols = scales(layout).length, top = 2 ** cols, len = bin.length;
  let i = 0, runs = 0, steps = 0;
  const vi = () => { let n = 0, mul = 1; for (let k = 0; k < 8 && i < len; k++) { const b = bin.charCodeAt(i++); n += (b & 127) * mul; if (b < 128) return n; mul *= 128; } return -1; };
  while (i < len) {
    if (++runs > maxRuns) return { error: 'replay too long' };
    const n = vi(), m = vi();
    if (n < 1 || m < 0 || m >= top) return { error: 'bad inputs' };
    if ((steps += n) > maxSteps) return { error: 'replay too long' };
    for (let x = m; x; x >>>= 1) if (x & 1 && vi() < 0) return { error: 'bad inputs' };
  }
  return { steps };
}
const flat = (inputs, layout, maxRuns) => typeof inputs === 'string' ? unpack(inputs, layout, maxRuns) : inputs;

export function decode(inputs, { maxRuns, maxSteps, layout }) {
  const w = width(layout);
  if (typeof inputs === 'string') { inputs = unpack(inputs, layout, maxRuns); if (!inputs) return { error: 'bad inputs' }; }
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
  inputs = flat(inputs, game.record);
  if (!Array.isArray(inputs)) return { error: 'bad inputs' };
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
