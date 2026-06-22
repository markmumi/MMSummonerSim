const { createGameContext, card, newGame, deploy } = require('./util.js');
const T = createGameContext();

describe('curse expiry (tickCurses)', () => {
  test('poison expiry destroys the seal and sends it to shrine', () => {
    newGame(T);
    const fc = deploy(T, 1, 0, 'at');
    fc.curses.push({ type: 'poison', expiresAtSubTurn: T.subTurnNum });
    T.tickCurses();
    assert(!T.G.players[0].atLine.includes(fc), 'poisoned seal removed from field');
    assert(T.G.players[0].shrine.includes(fc.card), 'poisoned seal in shrine');
  });

  // Bug 1 characterization: a poison/last-dance death must route through sendToShrine so
  // on-shrine abilities fire. Volcanic Minotaur (8) breaks all enemy fusions when it hits shrine.
  test('Volcanic Minotaur on-shrine ability fires when it dies to poison', () => {
    newGame(T);
    const minotaur = deploy(T, 8, 0, 'at');
    const enemy = deploy(T, 1, 1, 'at');
    enemy.fused = true;
    enemy.fusionStack = [T.makeFieldCard(card(T, 1))];
    minotaur.curses.push({ type: 'poison', expiresAtSubTurn: T.subTurnNum });
    T.tickCurses();
    assert(!T.G.players[0].atLine.includes(minotaur), 'Minotaur removed');
    assert(T.G.players[0].shrine.includes(minotaur.card), 'Minotaur in shrine');
    eq(enemy.fused, false, 'enemy fusion broken by Volcanic on-shrine ability (Bug 1)');
  });

  test('charm expiry releases control, seal stays on field', () => {
    newGame(T);
    const fc = deploy(T, 1, 1, 'at');
    fc.charmed = { originalPi: 1, originalLine: 'atLine' };
    fc.curses.push({ type: 'charm', expiresAtSubTurn: T.subTurnNum });
    T.tickCurses();
    assert(T.G.players[1].atLine.includes(fc), 'charmed seal stays on field after release');
    eq(fc.charmed, null, 'charmed flag cleared on expiry');
  });

  // Bug 10 / immunity: Angel of Sword (20), Delta-D (22), Heaven Knight (82) shed all curses each tick.
  for (const [id, name] of [[20, 'Angel of Sword'], [22, 'Delta-D'], [82, 'Heaven Knight']]) {
    test(`${name} (${id}) is curse-immune (curses cleared each tick)`, () => {
      newGame(T);
      const fc = deploy(T, id, 0, 'at');
      fc.curses.push({ type: 'stone', expiresAtSubTurn: T.subTurnNum + 99 });
      T.tickCurses();
      eq(fc.curses.length, 0, `${name} should shed the curse`);
      assert(T.G.players[0].atLine.includes(fc), `${name} stays on field`);
    });
  }

  test('stone curse does NOT destroy on expiry (just clears)', () => {
    newGame(T);
    const fc = deploy(T, 1, 0, 'at');
    fc.curses.push({ type: 'stone', expiresAtSubTurn: T.subTurnNum });
    T.tickCurses();
    assert(T.G.players[0].atLine.includes(fc), 'stone-cursed seal survives expiry');
    eq(fc.curses.length, 0, 'stone curse cleared');
  });
});
