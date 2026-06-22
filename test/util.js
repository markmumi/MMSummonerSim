// Shared helpers for building game state in tests.
const { createGameContext, card } = require('./harness.js');

function emptyPlayer() {
  return {
    // Non-empty deck so checkLose() doesn't fire the spurious "deck out" loss during tests.
    deck: [{ id: 0, lv: 1, name: '_filler' }, { id: 0, lv: 1, name: '_filler' }],
    hand: [], atLine: [], dfLine: [], shrine: [], mp: 8, name: 'P',
    mysticDeck: [], mysticHand: [], mysticGrave: [], areaMystics: [],
  };
}

// Reset the loaded context to a clean 2-player game at turn 1, main phase.
function newGame(T) {
  T.G = { players: [emptyPlayer(), emptyPlayer()], currentPlayer: 0 };
  T.subTurnNum = 0;
  T.turnNum = 1;
  T.phase = 'main';
  return T.G;
}

// Build a FieldCard for card `id` and place it on player `pi`'s line ('at'|'df').
function deploy(T, id, pi, line) {
  const fc = T.makeFieldCard(card(T, id));
  (line === 'df' ? T.G.players[pi].dfLine : T.G.players[pi].atLine).push(fc);
  return fc;
}

module.exports = { createGameContext, card, newGame, deploy };
