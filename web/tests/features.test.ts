/**
 * Parity tests: the TypeScript port must reproduce the original Python numbers.
 * Fixtures come from the desktop app's own `_extract_features` + scaler.pkl
 * (see tests/fixtures/features.json — regenerate with the Python snippet in the README).
 *
 * Run:  npm test
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

import { applyScaler, extractFeatures, isEmptyFeatures, NUM_FEATURES, type Landmark } from "../src/lib/features";
import { VoteBuffer, smoothLetter, smoothWord } from "../src/lib/smoothing";
import { ALL_CLASSES, NUM_LETTERS, NUM_WORDS } from "../src/lib/labels";

const root = join(__dirname, "..");
const fixtures = JSON.parse(readFileSync(join(__dirname, "fixtures", "features.json"), "utf8")) as {
  cases: { name: string; hands: number[][][]; features: number[]; scaled: number[] }[];
};
const scaler = JSON.parse(readFileSync(join(root, "public", "models", "scaler.json"), "utf8"));

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}\n       ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

function maxAbsDiff(a: ArrayLike<number>, b: ArrayLike<number>) {
  assert.equal(a.length, b.length);
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

console.log("features.ts vs original Python");
for (const c of fixtures.cases) {
  test(`features + scaler: ${c.name}`, () => {
    const hands: Landmark[][] = c.hands.map((h) => h.map(([x, y, z]) => ({ x, y, z })));
    const f = extractFeatures(hands);
    assert.equal(f.length, NUM_FEATURES);
    const d1 = maxAbsDiff(f, c.features);
    assert.ok(d1 < 1e-4, `raw features differ by ${d1}`);
    const d2 = maxAbsDiff(applyScaler(f, scaler), c.scaled);
    assert.ok(d2 < 1e-3, `scaled features differ by ${d2}`);
  });
}

test("a degenerate hand leaves its slot at zero but keeps the other hand", () => {
  const c = fixtures.cases.find((x) => x.name === "degenerate_first_hand")!;
  const f = extractFeatures(c.hands.map((h) => h.map(([x, y, z]) => ({ x, y, z }))));
  assert.ok(f.slice(0, 78).every((v) => v === 0));
  assert.ok(f.slice(78).some((v) => v !== 0));
  assert.equal(isEmptyFeatures(f), false);
  assert.equal(isEmptyFeatures(new Float32Array(NUM_FEATURES)), true);
});

console.log("labels");
test("label tables have the trained class counts", () => {
  assert.equal(NUM_LETTERS, 31);
  assert.equal(NUM_WORDS, 32);
  assert.equal(new Set(ALL_CLASSES.map((c) => c.id)).size, 63);
});

console.log("smoothing");
const onehot = (n: number, i: number, p = 0.9) => {
  const a = new Array(n).fill((1 - p) / (n - 1));
  a[i] = p;
  return a;
};

test("words: stable after 3 agreeing frames, low-confidence frames never enter the buffer", () => {
  const buf = new VoteBuffer(6);
  assert.equal(smoothWord(buf, onehot(32, 5, 0.3), 0.6).isStable, false);
  assert.equal(buf.length, 0);
  assert.equal(smoothWord(buf, onehot(32, 5), 0.6).isStable, false);
  assert.equal(smoothWord(buf, onehot(32, 5), 0.6).isStable, false);
  const r = smoothWord(buf, onehot(32, 5), 0.6);
  assert.equal(r.isStable, true);
  assert.equal(r.index, 5);
});

test("letters: needs 4 samples, a one-frame glitch does not flip the winner", () => {
  const buf = new VoteBuffer(8);
  for (let i = 0; i < 3; i++) assert.equal(smoothLetter(buf, onehot(31, 2), 0.55).isStable, false);
  assert.equal(smoothLetter(buf, onehot(31, 2), 0.55).isStable, true);
  const glitch = smoothLetter(buf, onehot(31, 9), 0.55);
  assert.equal(glitch.index, 2, "voted winner stays");
  assert.equal(glitch.isStable, true);
});

test("ties resolve to the smallest class index (numpy.unique + argmax behaviour)", () => {
  const buf = new VoteBuffer(6);
  [7, 3, 7, 3].forEach((i) => buf.push(i));
  assert.equal(buf.vote(3)?.index, 3);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
