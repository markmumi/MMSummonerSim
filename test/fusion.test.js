const { createGameContext, card } = require('./util.js');
const T = createGameContext();

describe('fusion unlock', () => {
  test('a fire material unlocks the element attack', () => {
    const firat = card(T, 1);       // fuse: fire->Blaze Tail, Firat->Flame Flock
    const fireMat = card(T, 6);      // Infernos: fire element, not named Firat
    const names = T._unlockedAtksForStack(firat.fuse, [fireMat]).map((a) => a.name);
    includes(names, 'Blaze Tail');
    assert(!names.includes('Flame Flock'), 'name-required attack should stay locked');
  });

  test('a name-matching material unlocks the name attack', () => {
    const firat = card(T, 1);
    // Firat is fire AND named "Firat", so it satisfies both reqs.
    const names = T._unlockedAtksForStack(firat.fuse, [firat]).map((a) => a.name);
    includes(names, 'Flame Flock');
  });

  test('empty stack unlocks nothing', () => {
    const firat = card(T, 1);
    eq(T._unlockedAtksForStack(firat.fuse, []).length, 0);
  });

  test('matchesReq matches by element and by card name', () => {
    const firat = card(T, 1);
    assert(T.matchesReq('fire', firat), 'fire element should match');
    assert(T.matchesReq('Firat', firat), 'card name should match');
    assert(!T.matchesReq('water', firat), 'wrong element should not match');
  });
});
