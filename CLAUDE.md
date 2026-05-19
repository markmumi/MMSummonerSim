# Aicardgame — Project Context

## Overview
Single-file browser TCG. All game logic lives in `game.html` (~95 KB). `style.css` and `game.js` are supplementary. Card database: `OGcarddbseal/cards_metadata.json`. Rules reference: `rulebook.txt`. UI language: Thai.

## File Map
| File | Purpose |
|------|---------|
| `game.html` | Everything — HTML, CSS (`<style>`), JS (`<script>`) |
| `style.css` | Minor extra styles (mostly overridden by inline) |
| `game.js` | Minor helpers |
| `OGcarddbseal/cards_metadata.json` | Card DB — always fetch with `?v=Date.now()` to bust cache |
| `rulebook.txt` | Game rules (422 KB) — read specific sections only |

## Key Line Numbers in game.html
| Section | Line |
|---------|------|
| Constants (`MAX_MP=8`, `MAX_SHRINE=9`, `HAND_MAX=7`, `LINE_MAX=4`) | 404 |
| Global state variables | 409–423 |
| `makeFieldCard()` | 430 |
| `drawCard()` | 501 |
| `endTurn()` | 527 |
| `getCardSkills()` — id=3 (Fairy Music Box), id=85 (Tiamat) | 775 |
| Interfere helpers (`getInterfereSkills`, `cancelHandDiscard`, `startInterfereSkill`, `executeInterfere`) | 815–857 |
| `executeSkill()` | 861 |
| `clickFieldSeal()` | 906 |
| `combatAnim()` | 1134 |
| `getEffectiveAt()` | 1200 |
| `applyPassiveAbilities()` / `getDefStatWithPassive()` | 1224–1233 |
| `dealDamage()` | 1235 |
| `checkLose()` | 1272 |
| AI turn loop + `endAITurn()` | 1352–1473 |
| `showActionQueue()` / `proceedAction()` | 1475–1486 |
| `renderLine()` / `render()` | 1643–1655 |

## Global State Variables (game.html:409–423)
```js
let G = {};              // full game state
let phase = 'main';      // 'draw'|'main'|'battle'|'end'
let turnNum = 1;
let subTurnNum = 0;      // increments each sub-turn (player OR AI), used for atBoosts expiry
let fusionMode = false;
let fusionMainFC = null;
let fieldActionTarget = null; // {fc, line}
let handTargetMode = false;
let handAttackedThisTurn = false;
let skillMode = null;    // {fc, skillIdx}
let pendingCb = null;    // set while action-queue is visible
let handDiscardMode = null; // {fc, skillIdx} — Tiamat interfere hand-pick mode
```

## G (Game State) Shape
```js
G.players[0]  // Player
G.players[1]  // AI
// Each player:
{ deck, hand, atLine, dfLine, shrine, mp, name }
// atLine/dfLine arrays contain FieldCards (see makeFieldCard)
```

## FieldCard (makeFieldCard) Shape
```js
{ uid, card, exhausted, hasAttacked, hasUsedSkill,
  atBoosts: [{amount, expiresBeforeSubTurn}],  // temp AT boosts
  deployedTurn, fromHand, lineSwitchedTurn,
  fusionStack, fusionAtks, fused, fusedSinceTurn,
  activeMultiAtk, hitsLeft }
```

## Card Object Fields (from JSON)
`id, name, lv, el, tribe, at, df, mc, skill_text[], ability_text[]`

**Elements:** `darkness`, `light`, `fire`, `water`, `earth`, `wind`, `neutral`
(Note: "colorless" was renamed to "light" — do not use "colorless" anywhere)

## Core Mechanics

### Turn Structure
- Player sub-turn → AI sub-turn = 1 full turn
- `subTurnNum` increments at each sub-turn boundary (in `endTurn` and `endAITurn`)
- `turnNum` increments only at start of player's sub-turn (in `endAITurn`)

### Action Queue (Interfere Window)
Every action is wrapped in `showActionQueue(desc, callback)` before it resolves.
- While `pendingCb !== null`, the action queue overlay is visible
- `proceedAction()` hides overlay and fires `pendingCb`
- During this window, player can activate Interfere skills from field cards
- `clickFieldSeal` checks `pendingCb` and allows `startInterfereSkill` calls

### Skill System
Two skill types defined in `getCardSkills(fc)`:
- `type:'fieldTarget'` — player picks a target card on field; handled by `skillMode` + `clickFieldSeal`
- `type:'handDiscard'` — player picks a hand card to discard; handled by `handDiscardMode` + hand click
  - `interfere:true` means usable during action queue window (opponent's turn)

### atBoosts / 1-Turn Duration
- `executeInterfere` pushes `{amount: card.lv, expiresBeforeSubTurn: subTurnNum+2}`
- `endTurn` and `endAITurn` both do `.filter(b => subTurnNum < b.expiresBeforeSubTurn)` (NOT `=[]`)
- "1 turn" = 2 sub-turns. Used during opponent's sub-turn → expires end of your sub-turn. Used during your sub-turn → expires end of opponent's sub-turn.

### Passive Abilities (game.html:1224)
`applyPassiveAbilities(attFC, defFC, attAt)` — modifies attacker AT
`getDefStatWithPassive(defFC, attFC, defLine)` — modifies defender stat
Both called at top of `combatAnim` and `dealDamage`.
- Tiamat (id=85): AT −3 when fighting Light element cards

### Fusion
- Main Seal absorbs Support Seals via `fusionStack`
- Unlocks `fusionAtks` (array of fusion attack objects with `.at`)
- `getEffectiveAt` picks highest fusion AT if fused
- Cards deployed from hand cannot be Support Seal same turn (`fromHand` flag + `newFromHand()`)
- Rule 613.8.3: `deployedTurn >= turnNum` blocks same-turn support-seal use

### Loss Condition
`checkLose()` — called after shrine changes. `MAX_SHRINE=9` cards → lose.

## CSS Classes (card highlights)
| Class | Meaning |
|-------|---------|
| `.skill-target` | Green pulse — valid skill target |
| `.fusion-target` | Blue pulse — valid fusion material |
| `.interfere-avail` | Orange pulse — can interfere during action queue |
| `.hand-card.discard-sel` | Orange pulse — hand card selectable for discard |
| `.card.attacker` | Red border — currently attacking |

## Implemented Cards
| ID | Name | Notes |
|----|------|-------|
| 3 | Fairy Music Box | fieldTarget skill: bounce Dark cards (fused: Dark or Evil tribe) |
| 85 | Tiamat the Black Dragon | handDiscard/interfere skill: discard hand card → +At(Lv) for 1 turn, Mp 2. Passive: At−3 vs Light |

## Patterns & Conventions
- **No JSON caching**: always append `?v=Date.now()` when fetching `cards_metadata.json`
- **Sequential async**: callbacks chain, not Promise.all — preserve order for animations
- **Render after state change**: always call `render()` after mutating `G` or mode flags
- **Thai UI**: log messages and button labels in Thai
- **Right-click cancel**: `contextmenu` listener — cancels `handDiscardMode` (keeps action queue) or `skillMode` (full cancel via `cancelAction()`)
- **Cancel button**: `#btn-aq-cancel` lives INSIDE `#action-queue` overlay (not outside) — shows only during `handDiscardMode`
- **Action queue button layout**: `flex-direction:row` inline with description text, no `flex:1` on button
