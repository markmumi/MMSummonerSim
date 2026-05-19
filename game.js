const AVAILABLE_CARD_IDS = [
  1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,
  21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
  42,43,46,47,50,51,52,53,54,56,57,59,60,61,62,63,64,65,66,67,68,69,70,
  71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,92,93,94,95
];
const TOTAL_CARDS = AVAILABLE_CARD_IDS.length;
const DECK_SIZE = 40;
const MAX_HAND = 6;
const players = [];
let currentPlayerIndex = 0;
let selectedCard = null;
let selectedTarget = null;
let selectedPlacement = 'seal';
let gameActive = false;

const state = {
  currentPhase: 'play',
};

const dom = {
  p1Health: document.getElementById('p1Health'),
  p1Mp: document.getElementById('p1Mp'),
  p1Deck: document.getElementById('p1Deck'),
  p2Health: document.getElementById('p2Health'),
  p2Mp: document.getElementById('p2Mp'),
  p2Deck: document.getElementById('p2Deck'),
  p1Attack: document.getElementById('p1Attack'),
  p1Defense: document.getElementById('p1Defense'),
  p1Seal: document.getElementById('p1Seal'),
  p2Attack: document.getElementById('p2Attack'),
  p2Defense: document.getElementById('p2Defense'),
  p2Seal: document.getElementById('p2Seal'),
  p1Hand: document.getElementById('p1Hand'),
  p2Hand: document.getElementById('p2Hand'),
  currentPlayer: document.getElementById('currentPlayer'),
  placementLabel: document.getElementById('placementLabel'),
  attackLineBtn: document.getElementById('attackLineBtn'),
  defenseLineBtn: document.getElementById('defenseLineBtn'),
  sealLineBtn: document.getElementById('sealLineBtn'),
  log: document.getElementById('log'),
  playCardBtn: document.getElementById('playCardBtn'),
  attackBtn: document.getElementById('attackBtn'),
  newGameBtn: document.getElementById('newGameBtn'),
  endTurnBtn: document.getElementById('endTurnBtn'),
  switchBtn: document.getElementById('switchBtn'),
  player1Panel: document.getElementById('player1Panel'),
  player2Panel: document.getElementById('player2Panel'),
};

function createCard(id) {
  const cost = 1 + ((id - 1) % 5);
  const attack = 1 + (((id - 1) >> 2) % 8);
  const health = 2 + ((id - 1) % 6);
  return {
    id,
    name: `Card ${id}`,
    image: `OGcarddb/card_${id}.jpg`,
    type: 'Seal',
    cost,
    attack,
    health,
    maxHealth: health,
    owner: null,
    inPlay: false,
    canAttack: false,
  };
}

function shuffle(array) {
  let current = array.length;
  while (current > 0) {
    const randomIndex = Math.floor(Math.random() * current);
    current -= 1;
    [array[current], array[randomIndex]] = [array[randomIndex], array[current]];
  }
  return array;
}

function buildDeck() {
  const ids = [...AVAILABLE_CARD_IDS];
  shuffle(ids);
  return ids.slice(0, DECK_SIZE).map(createCard);
}

function buildPlayer(name) {
  const deck = buildDeck();
  return {
    name,
    health: 30,
    mp: 0,
    maxMp: 0,
    deck,
    hand: [],
    boardAttack: [],
    boardDefense: [],
    boardSeal: [],
  };
}

function log(message) {
  const entry = document.createElement('div');
  entry.textContent = message;
  dom.log.prepend(entry);
}

function startGame() {
  players[0] = buildPlayer('Player 1');
  players[1] = buildPlayer('Player 2');
  currentPlayerIndex = 0;
  selectedCard = null;
  selectedTarget = null;
  selectedPlacement = 'seal';
  gameActive = true;
  players.forEach(player => {
    player.hand = [];
    player.boardAttack = [];
    player.boardDefense = [];
    player.boardSeal = [];
    player.maxMp = 8;
    player.mp = 8;
    drawCards(player, 5);
  });
  setPlacement('seal');
  endTurn(false);
  log('New game started. Both decks are random 40-card decks.');
  render();
}

function drawCards(player, count) {
  for (let i = 0; i < count && player.deck.length > 0; i += 1) {
    player.hand.push(player.deck.shift());
  }
}

function setPlacement(line) {
  if (line !== 'seal') {
    line = 'seal';
  }
  selectedPlacement = line;
  dom.attackLineBtn.classList.toggle('active', false);
  dom.defenseLineBtn.classList.toggle('active', false);
  dom.sealLineBtn.classList.toggle('active', true);
  dom.placementLabel.textContent = line.charAt(0).toUpperCase() + line.slice(1);
  render();
}

function render() {
  const p1 = players[0];
  const p2 = players[1];
  const currentPlayer = players[currentPlayerIndex];

  dom.p1Health.textContent = `Health: ${p1.health}`;
  dom.p1Mp.textContent = `MP: ${p1.mp}/${p1.maxMp}`;
  dom.p1Deck.textContent = `Deck: ${p1.deck.length}`;
  dom.p2Health.textContent = `Health: ${p2.health}`;
  dom.p2Mp.textContent = `MP: ${p2.mp}/${p2.maxMp}`;
  dom.p2Deck.textContent = `Deck: ${p2.deck.length}`;

  dom.currentPlayer.textContent = currentPlayer.name;
  dom.player1Panel.classList.toggle('active', currentPlayerIndex === 0);
  dom.player2Panel.classList.toggle('active', currentPlayerIndex === 1);

  renderCards(dom.p1Hand, p1.hand, 'hand', 0);
  renderCards(dom.p2Hand, p2.hand, 'hand', 1);
  renderCards(dom.p1Attack, p1.boardAttack, 'attack', 0);
  renderCards(dom.p1Defense, p1.boardDefense, 'defense', 0);
  renderCards(dom.p1Seal, p1.boardSeal, 'seal', 0);
  renderCards(dom.p2Attack, p2.boardAttack, 'attack', 1);
  renderCards(dom.p2Defense, p2.boardDefense, 'defense', 1);
  renderCards(dom.p2Seal, p2.boardSeal, 'seal', 1);

  dom.placementLabel.textContent = selectedPlacement.charAt(0).toUpperCase() + selectedPlacement.slice(1);
  dom.playCardBtn.disabled = !gameActive;
  dom.attackBtn.disabled = !gameActive;
  dom.endTurnBtn.disabled = !gameActive;
}

function renderCards(container, cards, section, playerIndex) {
  container.innerHTML = '';
  cards.forEach(card => {
    const tile = document.createElement('div');
    tile.className = 'card-tile';
      if (selectedCard === card && section === 'hand' && players[currentPlayerIndex].hand.includes(card)) {
      tile.classList.add('selected');
    }
    if (section === 'attack' && playerIndex === currentPlayerIndex && selectedCard === card) {
      tile.classList.add('selected');
    }
    if (section === 'seal' && playerIndex === currentPlayerIndex && selectedCard === card && players[currentPlayerIndex].boardSeal.includes(card)) {
      tile.classList.add('selected');
    }
    if (selectedTarget?.card === card && playerIndex !== currentPlayerIndex) {
      tile.classList.add('selected');
    }
    tile.innerHTML = `
      <img src="${card.image}" alt="${card.name}" onerror="this.style.opacity=0.2" />
      <div class="card-meta">
        <strong>${card.name}</strong>
        <span>${card.type}</span>
        <span>Cost: ${card.cost}</span>
        <span>ATK: ${card.attack} / HP: ${card.health}</span>
      </div>
    `;
    tile.addEventListener('click', () => onCardClick(card, section, playerIndex));
    container.appendChild(tile);
  });
}

function onCardClick(card, section, playerIndex) {
  if (section === 'hand' && playerIndex === currentPlayerIndex) {
    selectedCard = card;
    selectedTarget = null;
    log(`${players[currentPlayerIndex].name} selected ${card.name} from hand.`);
  }
  if (section === 'seal' && playerIndex === currentPlayerIndex) {
    selectedCard = card;
    selectedTarget = null;
    log(`${players[currentPlayerIndex].name} selected ${card.name} from seal line.`);
  }
  if (section === 'seal' && playerIndex !== currentPlayerIndex) {
    selectedTarget = { card, playerIndex };
    log(`${players[currentPlayerIndex].name} selected ${card.name} as attack target.`);
  }
  render();
}

function playSelectedCard() {
  const player = players[currentPlayerIndex];
  if (!selectedCard) {
    alert('Select a card from hand to play.');
    return;
  }
  const card = selectedCard;
  if (!player.hand.includes(card)) {
    alert('That card is not available to play.');
    return;
  }
  if (player.mp < card.cost) {
    alert('Not enough MP to play this card.');
    return;
  }
  player.mp -= card.cost;
  player.hand = player.hand.filter(c => c !== card);
  card.inPlay = true;
  card.canAttack = false;
  if (player.boardSeal.length >= 5) {
    alert('Seal line is full. Choose another card when there is room.');
    player.hand.push(card);
    player.mp += card.cost;
    return;
  }
  player.boardSeal.push(card);
  log(`${player.name} placed ${card.name} in seal line.`);
  selectedCard = null;
  render();
}

function attackSelectedTarget() {
  const attackerPlayer = players[currentPlayerIndex];
  const defenderPlayer = players[1 - currentPlayerIndex];
  if (!selectedCard) {
    alert('Select one of your seal line cards first.');
    return;
  }
  if (!selectedTarget) {
    alert('Select an enemy seal card target from the opponent board.');
    return;
  }
  const attacker = attackerPlayer.boardSeal.find(card => card === selectedCard);
  const target = defenderPlayer.boardSeal.find(card => card === selectedTarget.card);
  if (!attacker || !target) {
    alert('You must select one of your seal line cards and one opponent seal card.');
    return;
  }
  if (!attacker.canAttack) {
    alert('This card is not ready to attack yet. End your turn and try next turn.');
    return;
  }
  target.health -= attacker.attack;
  attacker.health -= target.attack;
  attacker.canAttack = false;
  log(`${attackerPlayer.name}'s ${attacker.name} attacked ${defenderPlayer.name}'s ${target.name}.`);
  if (target.health <= 0) {
    defenderPlayer.boardSeal = defenderPlayer.boardSeal.filter(c => c !== target);
    log(`${target.name} was destroyed.`);
  }
  if (attacker.health <= 0) {
    attackerPlayer.boardSeal = attackerPlayer.boardSeal.filter(c => c !== attacker);
    log(`${attacker.name} was destroyed after the attack.`);
  }
  selectedCard = null;
  selectedTarget = null;
  render();
  checkForVictory();
}

function checkForVictory() {
  players.forEach((player, index) => {
    if (player.health <= 0) {
      gameActive = false;
      const winner = players[1 - index].name;
      log(`Game over! ${winner} wins.`);
      alert(`${winner} wins!`);
    }
  });
}

function endTurn(displayLog = true) {
  const player = players[currentPlayerIndex];
  player.maxMp = 8;
  player.mp = player.maxMp;
  player.boardSeal.forEach(card => {
    card.canAttack = true;
  });
  drawCards(player, 1);
  if (displayLog) {
    log(`${player.name} begins the turn with ${player.mp} MP.`);
  }
  selectedCard = null;
  selectedTarget = null;
  render();
}

function switchPlayer() {
  currentPlayerIndex = 1 - currentPlayerIndex;
  log(`Switched to ${players[currentPlayerIndex].name}.`);
  selectedCard = null;
  selectedTarget = null;
  render();
}

function initEvents() {
  dom.newGameBtn.addEventListener('click', startGame);
  dom.playCardBtn.addEventListener('click', playSelectedCard);
  dom.attackBtn.addEventListener('click', attackSelectedTarget);
  dom.endTurnBtn.addEventListener('click', () => {
    switchPlayer();
    endTurn();
  });
  dom.switchBtn.addEventListener('click', switchPlayer);

  dom.attackLineBtn.addEventListener('click', () => setPlacement('attack'));
  dom.defenseLineBtn.addEventListener('click', () => setPlacement('defense'));
  dom.sealLineBtn.addEventListener('click', () => setPlacement('seal'));
}

initEvents();
startGame();
