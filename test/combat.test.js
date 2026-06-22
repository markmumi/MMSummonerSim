const { createGameContext, card, newGame, deploy } = require('./util.js');
const T = createGameContext();

function inShrine(T, pi, c) { return T.G.players[pi].shrine.includes(c); }
function onField(T, pi, fc) {
  return T.G.players[pi].atLine.includes(fc) || T.G.players[pi].dfLine.includes(fc);
}

describe('dealDamage resolution', () => {
  test('attacker beats defender → defender to shrine', () => {
    newGame(T);
    const att = deploy(T, 1, 0, 'at');
    const def = deploy(T, 2, 1, 'at'); // Golden Horn: at5 df6
    T.dealDamage(att, def, 10, 'test', 0, 1, 'at');
    assert(!onField(T, 1, def), 'defender removed from field');
    assert(inShrine(T, 1, def.card), 'defender card in its owner shrine');
    assert(onField(T, 0, att), 'attacker survives');
  });

  test('attacker loses on At Line → counterattack kills attacker', () => {
    newGame(T);
    const att = deploy(T, 1, 0, 'at');
    const def = deploy(T, 2, 1, 'at'); // at5
    T.dealDamage(att, def, 3, 'test', 0, 1, 'at'); // 3 < 5
    assert(!onField(T, 0, att), 'attacker removed (countered)');
    assert(inShrine(T, 0, att.card), 'attacker card in its shrine');
    assert(onField(T, 1, def), 'defender survives');
  });

  test('attacker loses vs Df Line → blocked, no counter', () => {
    newGame(T);
    const att = deploy(T, 1, 0, 'at');
    const def = deploy(T, 2, 1, 'df'); // df6
    T.dealDamage(att, def, 3, 'test', 0, 1, 'df'); // 3 < 6
    assert(onField(T, 0, att), 'attacker survives (Df line never counters)');
    assert(onField(T, 1, def), 'defender survives');
  });

  // Bug 2 characterization: Mor Mercenary compares At vs the target's Df while standing on the
  // At Line (cmpLine='df', defLine='at'), so it MUST still risk a counterattack when it loses.
  test('Mor-style Df comparison on At Line still counters the loser', () => {
    newGame(T);
    const att = deploy(T, 1, 0, 'at');
    const def = deploy(T, 2, 1, 'at'); // df6
    T.dealDamage(att, def, 3, 'Mor Mercenary', 0, 1, 'at', false, 'df'); // compares vs df6, loses
    assert(!onField(T, 0, att), 'Mor dies on a failed Df-comparison attack (Bug 2)');
    assert(onField(T, 1, def), 'defender survives');
  });
});
