const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../app.js', `file://${__filename}`), 'utf8');
const match = source.match(/function secureRandomIndex\(max\)\s*\{[\s\S]*?\n  \}/);
if (!match) throw new Error('Could not locate secureRandomIndex in app.js');

function makeSelector(values, cryptoAvailable = true) {
  let calls = 0;
  const context = {
    MAX_PLAYERS: 6,
    Number,
    RangeError,
    Error,
    Uint32Array,
    window: cryptoAvailable ? {
      crypto: { getRandomValues(array) { array[0] = values[Math.min(calls, values.length - 1)]; calls++; return array; } }
    } : { crypto: undefined }
  };
  vm.runInNewContext(`${match[0]}; this.selector = secureRandomIndex;`, context);
  return { selector: context.selector, calls: () => calls };
}

test('returns an in-range index for each supported player count 1–6', () => {
  for (let max = 1; max <= 6; max++) {
    const { selector } = makeSelector([0xffffffff % (0x100000000 - (0x100000000 % max))]);
    const result = selector(max);
    assert.ok(Number.isInteger(result));
    assert.ok(result >= 0 && result < max);
  }
});

test('rejects invalid participant counts', () => {
  const { selector } = makeSelector([0]);
  for (const max of [0, -1, 1.5, 7, NaN]) assert.throws(() => selector(max), RangeError);
});

test('uses rejection sampling when the 32-bit value is outside the accepted range', () => {
  // For max=3, 0xffffffff is rejected because 2^32 is not divisible by 3.
  const { selector, calls } = makeSelector([0xffffffff, 8]);
  assert.equal(selector(3), 2);
  assert.equal(calls(), 2);
});

test('fails closed when Web Crypto is unavailable', () => {
  const { selector } = makeSelector([0], false);
  assert.throws(() => selector(2), /Secure randomness is unavailable/);
});

test('source retains six-player cap and all touch lifecycle handlers', () => {
  assert.match(source, /const MAX_PLAYERS = 6/);
  assert.match(source, /addEventListener\("touchstart"/);
  assert.match(source, /addEventListener\("touchmove"/);
  assert.match(source, /addEventListener\("touchend"/);
  assert.match(source, /addEventListener\("touchcancel"/);
  assert.match(source, /activeGardenTouches\.set\(id/);
});

test('round cancellation clears transient reveal and anticipation UI', () => {
  assert.match(source, /function cancelRound\(message\)[\s\S]*?countdown\.classList\.remove\("visible"\)/);
  assert.match(source, /function cancelRound\(message\)[\s\S]*?garden\.classList\.remove\("anticipation"\)/);
  assert.match(source, /function cancelRound\(message\)[\s\S]*?banner\.classList\.remove\("visible"\)/);
});

test('reset invalidates callbacks from the previous round before clearing timers', () => {
  assert.match(source, /function resetRound\(\)[\s\S]*?roundToken\+\+;[\s\S]*?clearAllTimers\(\)/);
  assert.match(source, /if \(token !== roundToken \|\| state !== State\.COUNTDOWN\) return/);
});

test('participants cannot exceed six and input is ignored during countdown or result', () => {
  assert.match(source, /if \(state === State\.COUNTDOWN \|\| state === State\.RESULT\) return;[\s\S]*?if \(plants\.has\(key\)\) return;[\s\S]*?if \(plants\.size >= MAX_PLAYERS\)/);
});
