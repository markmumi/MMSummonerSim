// Tests for the shared effect resolvers (applyCurse / healAllCurses) that the player, GUEST,
// and AI skill paths all now route through. These pin the canonical behavior so the three
// callers stay in lockstep.
const { createGameContext, card, newGame, deploy } = require('./util.js');
const T = createGameContext();

describe('applyCurse', () => {
  test('poison: pushes a curse with N-turn expiry (subTurnNum + turns*2)', () => {
    newGame(T);
    const fc = deploy(T, 1, 1, 'at');
    const ok = T.applyCurse(fc, 1, 'at', 'poison', { turns: 3 });
    eq(ok, true);
    eq(fc.curses.length, 1);
    eq(fc.curses[0].type, 'poison');
    eq(fc.curses[0].expiresAtSubTurn, T.subTurnNum + 6);
  });

  test('stone with turns:Infinity → expiresAtSubTurn Infinity', () => {
    newGame(T);
    const fc = deploy(T, 1, 1, 'at');
    T.applyCurse(fc, 1, 'at', 'stone', { turns: Infinity });
    eq(fc.curses[0].expiresAtSubTurn, Infinity);
  });

  test('freeze moves the seal from At Line to Df Line', () => {
    newGame(T);
    const fc = deploy(T, 1, 1, 'at');
    T.applyCurse(fc, 1, 'at', 'freeze', { turns: 1 });
    assert(!T.G.players[1].atLine.includes(fc), 'removed from At Line');
    assert(T.G.players[1].dfLine.includes(fc), 'moved to Df Line');
  });

  test('charm sets control + line, un-exhausts the seal', () => {
    newGame(T);
    const fc = deploy(T, 1, 1, 'at');
    fc.exhausted = true; fc.hasUsedSkill = true;
    T.applyCurse(fc, 1, 'at', 'charm', { turns: 3 });
    eq(fc.charmed, { originalPi: 1, originalLine: 'atLine' });
    eq(fc.exhausted, false, 'un-exhausted so the controller can act with it');
    eq(fc.hasUsedSkill, false);
    assert(fc.curses.some((c) => c.type === 'charm'));
  });

  test('lastDance carries its atBonus', () => {
    newGame(T);
    const fc = deploy(T, 1, 1, 'at');
    T.applyCurse(fc, 1, 'at', 'lastDance', { turns: 2, atBonus: 3 });
    eq(fc.curses[0].atBonus, 3);
    eq(fc.curses[0].expiresAtSubTurn, T.subTurnNum + 4);
  });

  // Canonical behavior: the three immune ids reject every curse and the caller sees false.
  for (const [id, name] of [[20, 'Angel of Sword'], [22, 'Delta-D'], [82, 'Heaven Knight']]) {
    test(`${name} (${id}) is immune → applyCurse returns false, no curse added`, () => {
      newGame(T);
      const fc = deploy(T, id, 1, 'at');
      const ok = T.applyCurse(fc, 1, 'at', 'poison', { turns: 3 });
      eq(ok, false);
      eq(fc.curses.length, 0);
    });
  }

  test('isCurseImmune matches exactly the three ids', () => {
    newGame(T);
    eq(T.isCurseImmune(deploy(T, 20, 0, 'at')), true);
    eq(T.isCurseImmune(deploy(T, 22, 0, 'at')), true);
    eq(T.isCurseImmune(deploy(T, 82, 0, 'at')), true);
    eq(T.isCurseImmune(deploy(T, 1, 0, 'at')), false);
  });
});

describe('applyBoost', () => {
  test('at/df/sp route to the right boost array with the right duration', () => {
    newGame(T);
    const fc = deploy(T, 1, 0, 'at'); // Firat at4 df4 sp4
    T.applyBoost(fc, 'at', 2, 1);
    T.applyBoost(fc, 'df', 3, 1);
    T.applyBoost(fc, 'sp', 1, 2);
    eq(fc.atBoosts[0], { amount: 2, expiresBeforeSubTurn: T.subTurnNum + 1 });
    eq(fc.dfBoosts[0], { amount: 3, expiresBeforeSubTurn: T.subTurnNum + 1 });
    eq(fc.spBoosts[0], { amount: 1, expiresBeforeSubTurn: T.subTurnNum + 2 });
  });

  test('boost feeds through getEffectiveAt and expires on schedule', () => {
    newGame(T);
    const fc = deploy(T, 1, 0, 'at');
    T.applyBoost(fc, 'at', 3, 1);           // 1 sub-turn
    eq(T.getEffectiveAt(fc), 7);
    T.subTurnNum = T.subTurnNum + 1;
    eq(T.getEffectiveAt(fc), 4, 'expired after one sub-turn');
  });

  test('a 2-sub-turn boost survives one sub-turn boundary', () => {
    newGame(T);
    const fc = deploy(T, 1, 0, 'at');
    T.applyBoost(fc, 'at', 3, 2);           // one full turn
    T.subTurnNum = T.subTurnNum + 1;
    eq(T.getEffectiveAt(fc), 7, 'still active after one sub-turn');
    T.subTurnNum = T.subTurnNum + 1;
    eq(T.getEffectiveAt(fc), 4, 'expired after two sub-turns');
  });
});

describe('healAllCurses', () => {
  test('clears all curses and releases charm control', () => {
    newGame(T);
    const fc = deploy(T, 1, 1, 'at');
    fc.curses = [{ type: 'poison', expiresAtSubTurn: 99 }, { type: 'charm', expiresAtSubTurn: 99 }];
    fc.charmed = { originalPi: 1, originalLine: 'atLine' };
    T.healAllCurses(fc);
    eq(fc.curses.length, 0);
    eq(fc.charmed, null);
  });
});
