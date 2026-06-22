const { createGameContext, card, newGame, deploy } = require('./util.js');
const T = createGameContext();

describe('effective stats', () => {
  test('base At/Df with no modifiers', () => {
    newGame(T);
    const fc = deploy(T, 1, 0, 'at'); // Firat: at4 df4
    eq(T.getEffectiveAt(fc), 4);
    eq(T.getEffectiveDf(fc), 4);
  });

  test('atBoost applies, then expires on the right sub-turn', () => {
    newGame(T);
    const fc = deploy(T, 1, 0, 'at');
    fc.atBoosts.push({ amount: 3, expiresBeforeSubTurn: T.subTurnNum + 1 });
    eq(T.getEffectiveAt(fc), 7, 'boost active this sub-turn');
    T.subTurnNum = T.subTurnNum + 1;
    eq(T.getEffectiveAt(fc), 4, 'boost gone next sub-turn');
  });

  test('Undine (81) buffs OTHER own seals +At1 +Df2 but not itself', () => {
    newGame(T);
    const firat = deploy(T, 1, 0, 'at');   // at4 df4
    const undine = deploy(T, 81, 0, 'at'); // at7 df8
    eq(T.getEffectiveAt(firat), 5, 'Firat +1 from Undine');
    eq(T.getEffectiveDf(firat), 6, 'Firat +2 from Undine');
    eq(T.getEffectiveAt(undine), 7, 'Undine does not buff itself (At)');
    eq(T.getEffectiveDf(undine), 8, 'Undine does not buff itself (Df)');
  });

  test('two Undines stack on a third seal (+At2 +Df4)', () => {
    newGame(T);
    const firat = deploy(T, 1, 0, 'at');
    deploy(T, 81, 0, 'at');
    deploy(T, 81, 0, 'at');
    eq(T.getEffectiveAt(firat), 6, 'Firat +2 from two Undines');
    eq(T.getEffectiveDf(firat), 8, 'Firat +4 from two Undines');
  });
});
