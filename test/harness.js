// Node test harness for MMSummonerMasterSim game logic.
// The game runs in the browser, but most core logic (fusion unlock, stats, curses,
// combat) only touches the global G state — not the DOM. We load db.js/engine.js/skills.js
// into a vm context with stubbed DOM + no-op UI functions, then drive the pure logic.
//
// Usage: node test/run.js   (run.js requires this harness + the *.test.js files)

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const noop = () => {};

// Minimal DOM/browser stubs — enough to let the files load without throwing at top level.
function makeEl() {
  const el = {
    style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: noop, addEventListener: noop, removeEventListener: noop,
    querySelector: () => makeEl(), querySelectorAll: () => [],
    textContent: '', innerHTML: '', value: '', children: [], dataset: {},
    setAttribute: noop, getAttribute: () => null, remove: noop, focus: noop, click: noop,
    play: () => ({ catch: noop }), pause: noop, load: noop, currentTime: 0,
  };
  return el;
}
const documentStub = {
  addEventListener: noop, removeEventListener: noop,
  createElement: () => makeEl(), createTextNode: () => makeEl(),
  getElementById: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [],
  head: { appendChild: noop }, body: makeEl(),
};
const localStorageStub = { getItem: () => null, setItem: noop, removeItem: noop };

// UI / external functions (defined in ui.js / online.js, which we don't load).
// Stubbed as no-ops so engine.js logic can call them harmlessly.
const UI_NOOPS = [
  'log', 'logErr', 'render', 'renderLine', 'cardEl', 'broadcastSound', 'playSound',
  'updateAIPreview', 'updatePlayerPreview', 'showTurnAnim', 'showWin', 'openCardViewer',
  'openMysticViewer', 'showActionQueueUI', 'updateChainDisplay', '_updateChainDisplay',
  'showBattlePhaseAnim', 'combatAnim', 'handAttackAnim', 'animateAllTargets',
  'initBattleBGM', '_setBGM', 'showFieldAction', 'closeFAModal', 'addFAOpt',
  'showMysticPicker', 'showLineChoicePicker', 'showDrawModal', 'hideDrawModal',
];

function createGameContext() {
  const sandbox = {
    console, Math, Date, JSON, Object, Array, String, Number, Boolean, Symbol,
    parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    document: documentStub, localStorage: localStorageStub,
    Audio: function () {
      return {
        play: () => ({ catch: noop }), pause: noop, load: noop, currentTime: 0,
        addEventListener: noop, removeEventListener: noop, cloneNode: function () { return this; },
      };
    },
    Image: function () { return makeEl(); },
    requestAnimationFrame: (fn) => { if (fn) fn(); return 0; },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  for (const name of UI_NOOPS) sandbox[name] = noop;

  vm.createContext(sandbox);

  // IMPORTANT: top-level `let`/`const` do NOT attach to the vm context, and separate
  // runInContext calls don't share lexical scope. So we must concatenate all source files
  // into ONE script (so they share one top-level scope) and append an export footer that
  // closes over the let/const/function declarations to expose them to the test.
  const sources = ['js/db.js', 'js/engine.js', 'js/skills.js']
    .map((f) => `\n//# ${f}\n` + fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n');

  const footer = `
    ;CARD_DB = _CARD_DB_FALLBACK;  // use inline fallback DB (skip async JSON loader)
    globalThis.__T = {
      get CARD_DB(){return CARD_DB;}, set CARD_DB(v){CARD_DB=v;},
      get G(){return G;}, set G(v){G=v;},
      get subTurnNum(){return subTurnNum;}, set subTurnNum(v){subTurnNum=v;},
      get turnNum(){return turnNum;}, set turnNum(v){turnNum=v;},
      get phase(){return phase;}, set phase(v){phase=v;},
      matchesReq, _unlockedAtksForStack, getUnlockedAtks, _countSat,
      getEffectiveAt, getEffectiveDf, getEffectiveSp, getDefStatWithPassive,
      applyPassiveAbilities, getActiveAtks, getCardSkills, shrineTotal, makeFieldCard,
      _passiveAtBonus, getEffectiveEl, _validFuseEntries, _fuseStackCards, getEffectiveMc,
      getEffectiveHandMax, getEffectiveCombinedMax,
      findFCOwner, sendToShrine, tickCurses, dealDamage, checkLose, shrineTotal,
      applyCurse, healAllCurses, isCurseImmune, applyBoost,
    };
  `;

  vm.runInContext(sources + footer, sandbox, { filename: 'bundle.js' });
  return sandbox.__T;
}

// Look up a card definition by id from the loaded DB. `T` is the export object from createGameContext.
function card(T, id) {
  const c = T.CARD_DB.find((c) => c.id === id);
  if (!c) throw new Error(`card id ${id} not in CARD_DB`);
  return c;
}

module.exports = { createGameContext, card, noop };
