# Tests

Zero-dependency Node tests for the game logic. The game runs in the browser, but most core
logic (fusion unlock, effective stats, curses, combat) only touches the global `G` state, not
the DOM — so we load `js/db.js` + `js/engine.js` + `js/skills.js` into a `vm` context with
stubbed DOM/UI and drive the real functions.

## Run

```
npm test          # or: node test/run.js
```

Exits non-zero on any failure, so it can gate a deploy.

## Files

| File | Purpose |
|------|---------|
| `harness.js` | Loads the source files into a sandbox; exposes game functions + mutable state (`G`, `subTurnNum`, …) via the returned `T` object. |
| `util.js` | `newGame(T)`, `deploy(T, id, pi, line)`, `card(T, id)` helpers. |
| `run.js` | Tiny runner: `describe` / `test` / `assert` / `eq` / `includes`. Auto-loads every `*.test.js`. |
| `*.test.js` | The suites. |

## How it works (the vm gotcha)

Top-level `let`/`const` do **not** attach to a `vm` context, and separate `runInContext`
calls don't share lexical scope. So `harness.js` concatenates all three source files into one
script (shared top-level scope) and appends an export footer that closes over the
declarations to expose them. To test a new function, add it to that footer's `__T` object.

## Adding tests

```js
const { createGameContext, card, newGame, deploy } = require('./util.js');
const T = createGameContext();

describe('my feature', () => {
  test('does the thing', () => {
    newGame(T);
    const fc = deploy(T, 1, 0, 'at');   // Firat on player 0's At Line
    eq(T.getEffectiveAt(fc), 4);
  });
});
```

Several existing tests intentionally pin behavior around past bug fixes (poison death →
on-shrine abilities, Mor Mercenary counterattack, curse immunity). Keep those green when
refactoring the HOST/GUEST/AI resolution paths.
