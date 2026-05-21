# Aicardgame — Project Context

## Overview
Browser TCG (MMSummonerMasterSim). โค้ดแยกเป็นหลายไฟล์ใน `js/` — ไม่ใช่ single file อีกต่อไป. Card database: `OGcarddbseal/cards_metadata.js`. UI language: Thai.

## File Map
| File | Purpose |
|------|---------|
| `game.html` | HTML structure + script/style imports |
| `css/game.css` | All styles |
| `js/db.js` | Constants, card DB loader, mystic DB, EL_COLOR |
| `js/ai_decks.js` | AI deck templates |
| `js/online.js` | PeerJS online multiplayer (HOST/GUEST) |
| `js/engine.js` | Core engine: state, deploy, combat, AI, mystics, action queue |
| `js/skills.js` | Skill system: getCardSkills, executeSkill, executeSelfSkill |
| `js/ui.js` | Rendering: render(), cardEl(), log(), card viewer |
| `OGcarddbseal/cards_metadata.js` | Seal card DB |
| `OGcarddbmystic/` | Mystic card images |
| `rulebook.txt` | Game rules (422 KB) — read specific sections only |

Script load order: `db.js` → `ai_decks.js` → `online.js` → `engine.js` → `skills.js` → `ui.js`

## Constants (js/db.js:172)
```js
const MAX_MP=8, MAX_SHRINE=12, HAND_MAX=7;
// LINE_MAX does NOT exist — players can deploy unlimited seals per line
```

## Global State Variables (js/engine.js:1–21)
```js
let G = {};              // full game state
let phase = 'main';      // 'draw'|'main'|'main2'|'battle'|'end'
let turnNum = 1;
let subTurnNum = 0;      // increments each sub-turn; used for boost/curse expiry
let fusionMode = false;
let fusionMainFC = null;
let fieldActionTarget = null; // {fc, line}
let handTargetMode = false;
let handAttackedThisTurn = false;
let skillMode = null;    // {fc, skillIdx}
let pendingCb = null;    // set while action-queue overlay is visible
let handDiscardMode = null; // {fc, skillIdx, onDiscard} — Tiamat interfere
let handPickMode = null;   // {fc, skillIdx} — Blue Wings Pegasus beast deploy
let pendingFusionMain = null; // mainFC in AI fusion AQ window (Gale Garuda hook)
```

## G (Game State) Shape
```js
G.players[0]  // Player (HOST in online)
G.players[1]  // AI (GUEST in online)
// Each player:
{ deck, hand, atLine, dfLine, shrine, mp, name, mysticDeck, mysticHand }
// atLine/dfLine: FieldCard arrays (no max length)
```

## FieldCard (makeFieldCard) Shape
```js
{ uid, card, exhausted, hasAttacked, hasUsedSkill,
  atBoosts: [{amount, expiresBeforeSubTurn}],
  dfBoosts: [...], spBoosts: [...],
  deployedTurn, fromHand, lineSwitchedTurn,
  fusionStack, fusionAtks, fused, fusedSinceTurn,
  activeMultiAtk, hitsLeft,
  curses: [{type, expiresAtSubTurn}],
  charmed: {originalPi, originalLine} | null,
  activeMystics: [...] }
```

## Card Object Fields (from DB)
`id, name, lv, el, tribe, at, df, sp, mc, fuse[], skill_text[], ability_text[]`

**Elements:** `darkness`, `light`, `fire`, `water`, `earth`, `wind`, `neutral`
(Note: "colorless" → renamed to "light". Never use "colorless".)

DB normalization in `db.js`: `el: j.element[0]`, `sp: j.spd`, `mc: j.mp_deploy`, `fuse: (j.fusions||[]).map(...)`

## Key Function Locations

### engine.js
| Function | Line |
|----------|------|
| `makeFieldCard()` | ~77 |
| `drawCard(pi, silent, force)` | ~241 |
| `endTurn()` | ~352 |
| `initGameOnline()` | ~408 |
| `guestDeploy / guestLineSwitch` | ~480–519 |
| `findFCOwner(fc)` | ~1600 |
| `doDeploy(line)` | ~1648 |
| `doLineSwitch(fc,from,to)` | ~1825 |
| `doFuse / doUnfuse` | ~1916–1947 |
| `clickFieldSeal(fc,pi,line)` | ~1956 |
| `getEffectiveAt/Df/Sp()` | ~2500–2590 |
| `applyPassiveAbilities()` | ~2591 |
| `getDefStatWithPassive()` | ~2613 |
| `dealDamage()` | ~2625 |
| `combatAnim()` | ~2428 |
| `sendToShrine(fc,ownerPi)` | ~2664 |
| `checkLose()` | ~2718 |
| `showWin(pi)` | ~2725 |
| `aiTurn()` | ~2741 |
| `showActionQueue(desc,cb,fusionMainFC)` | ~3224 |
| `proceedAction()` | ~3313 |
| `doDrawChoice(type)` | ~3361 |
| `attachPSMystic()` | ~3478 |
| `playNonPMystic()` | ~3665 |
| `playPAMystic()` | ~3787 |

### skills.js
| Function | Line |
|----------|------|
| `isOnAtLine(fc)` | 3 |
| `getCardSkills(fc)` | 6 |
| `startSkillMode(fc,skillIdx)` | ~360 |
| `executeSkill(...)` | ~627 |
| `executeSelfSkill(...)` | ~452 |
| `executeInterfere(card)` | ~414 |

### ui.js
| Function | Line |
|----------|------|
| `render()` | ~310 |
| `renderLine(id,seals,pi,lineKey)` | ~269 |
| `cardEl(fc,pi,lineKey,isField)` | ~85 |
| `log(msg,type)` | ~814 |
| `logErr(msg)` | ~754 |

## Core Mechanics

### Turn Structure
- Player sub-turn → AI sub-turn = 1 full turn
- `subTurnNum` increments at each sub-turn boundary (`endTurn` and `endAITurn`)
- `turnNum` increments only at start of player's sub-turn (in `endAITurn`)
- Phases: `draw` → `main` → `battle` → `main2` → `end`

### Action Queue (Interfere Window)
Every action wraps in `showActionQueue(desc, callback)` before resolving.
- `pendingCb !== null` → overlay visible
- `proceedAction()` hides overlay and fires `pendingCb`
- Player can activate Interfere skills during window
- AQ buttons: `btn-aq-garuda` (AI fusion), `btn-aq-woolwyvern` (any AQ), `btn-aq-phoenix` (any AQ)

### Skill System
Skill types in `getCardSkills(fc)`:
- `type:'fieldTarget'` — pick target card on field; `skillMode` + `clickFieldSeal`
- `type:'selfSkill'` — no target; `executeSelfSkill`
- `type:'handDiscard'` — pick hand card; `handDiscardMode` + hand click
  - `interfere:true` → usable during opponent's AQ window
- `type:'handPickBeast'` — pick Beast from hand (Blue Wings Pegasus)
- `type:'garudaInterfere'` / `type:'phoenixInterfere'` — informational; triggered via AQ buttons

`getCardSkills` uses `findFCOwner(fc)?.pi??0` to determine owner — skills work correctly for both HOST and GUEST.

### Boost / Curse Durations
- 1 sub-turn boost: `expiresBeforeSubTurn = subTurnNum+1`
- 1 full turn (2 sub-turns): `expiresBeforeSubTurn = subTurnNum+2`
- Curse N turns: `expiresAtSubTurn = subTurnNum + (N*2)`
- Expiry filter: `.filter(b => subTurnNum < b.expiresBeforeSubTurn)` — NOT `=[]`

### Passive Abilities (getEffectiveSp — engine.js ~2558)
`getEffectiveSp` checks both `isP0` and `isP1` symmetrically for:
- **Coy Crab (id=14)**: 2+ Coy Crabs on a player's field → all enemy Seals Sp=0
- **Akim (id=23)**: fused Akim on field → all own Seals Sp=4
- **Yggdrasil (id=77)**: other Df Line seals → Sp=0
- **Blue Wind Griffin (id=59)**: own Beasts +Sp 1

### Fusion
- Main Seal absorbs Support Seals via `fusionStack`
- `fusionAtks` array unlocked; `getEffectiveAt` picks highest
- `fromHand` + `deployedTurn >= turnNum` → blocks same-turn support-seal use
- `willMind` flag (Will of True Mind mystic) → bypasses fusion condition check for skills

### Loss Condition
`checkLose()` — called after shrine changes. `MAX_SHRINE=12` → lose.

### Charm Curse
- Charmed cards stay on original field; player controls them in-place
- `fc.charmed = {originalPi, originalLine}` — set on curse, cleared on expiry
- `sendToShrine` overrides ownerPi with `fc.charmed.originalPi` if set

## Online Multiplayer (js/online.js)

PeerJS P2P — HOST (pi=0) runs all engine logic; GUEST (pi=1) sends action commands.

- **HOST**: runs `initGame()`, calls `Online.broadcastState()` after every state change
- **GUEST**: calls `Online.sendGuestAction({action:'...', ...})` for all actions
- `_applyHostState(data)` — GUEST side applies full G snapshot from host
- `_hostLogBuffer` — logs accumulated on HOST, sent to GUEST via `broadcastState()`
- `broadcastState()` payload includes `pendingFusionMainUid` for Garuda targeting
- Draw card logs: opponent never sees card name — `drawCard(pi, silent=true)` for masked draw
- Win/lose music: reads `bgm_muted` localStorage to respect mute toggle

## CSS Classes (card highlights)
| Class | Meaning |
|-------|---------|
| `.skill-target` | Green pulse — valid skill target |
| `.fusion-target` | Blue pulse — valid fusion material |
| `.interfere-avail` | Orange pulse — can interfere during AQ |
| `.hand-card.discard-sel` | Orange pulse — selectable for discard |
| `.card.attacker` | Red border — currently attacking |

## Implemented Cards (Seals)

### Skill Cards
| ID | Name | Skill |
|----|------|-------|
| 2 | Golden Horn Unicorn | healCurse, fieldTarget, Mp 1 |
| 3 | Fairy Music Box | bounce Dark cards (fused: Dark or Evil tribe), fieldTarget |
| 5 | Punishula | destroyTarget Evil enemy at AtLine, fieldTarget, Mp 3 |
| 6 | Infernos | lastDanceCurse At+2/2Turn, fused+Dark+AtLine, fieldTarget |
| 7 | Desert Chimera | poisonCurse 3Turn, fused+AtLine, fieldTarget |
| 11 | Cockatrice | stoneCurse 1Turn, fused, fieldTarget |
| 12 | Jiu Wei Hu Le | charmCurse 3Turn, fused+Dark, fieldTarget |
| 15 | Armadillon | freezeCurse 1Turn, fused+AtLine, fieldTarget |
| 16 | Ghost Ship | returnSelfToDeck, fused+1material, selfSkill |
| 20 | Angel of Sword | discardRandomMystic, fused+AtLine, selfSkill, Mp 3 |
| 22 | Delta-D | drawCard while DfLine, selfSkill |
| 28 | Banshee | deathCurse Sp1-3, fused+Dark+AtLine, fieldTarget |
| 42 | Mysterious Elephant | poisonCurse 1Turn Sp2-5, fused+AtLine, fieldTarget |
| 44 | Skull Dragon Venomus | stoneCurse+poisonCurse fused+Dark, fieldTarget |
| 45 | Jade Dragon | healCurse, fused+AtLine, fieldTarget |
| 46 | Assassin Doll | deathCurse lowest-At, fused+2enemies, fieldTarget |
| 47 | Blue Wings Pegasus | deploy Beast from hand, handPickBeast |
| 48 | Night Shadow | charmCurse 1Turn Sp1-5, fused+Dark+AtLine, fieldTarget |
| 50 | Hydra of Warok | poisonCurse 2Turn Sp3-5, fused+AtLine, fieldTarget |
| 53 | Gale Garuda | interfere deploy+attack during enemy fusion, garudaInterfere |
| 54 | Titania | destroyOneMystic, fused+Light, fieldTarget, Mp 2 |
| 58 | Siren | charmCurse 2Turn Sp3-5, fused+Dark+AtLine, fieldTarget, Mp 2 |
| 59 | Blue Wind Griffin | spBoost1SubTurn own seal, fieldTarget, Mp 2 |
| 65 | Sphinx | massReset all field seals to decks, fused+Light+AtLine, selfSkill, Mp 4 |
| 74 | Blaze Sage | sacrifice own seal → another +At(Mc) 1Turn, two-step fieldTarget |
| 77 | Yggdrasil | shrineToHand, fused+shrine>0, selfSkill, Mp 3 |
| 78 | Phoenix | interfere deploy from shrine during any AQ, phoenixInterfere |
| 80 | Wool Wyvern | interfere deploy from hand during any AQ, garudaInterfere type |
| 84 | Jormungand | freezeAll enemy 1Turn, fused+water+AtLine, selfSkill, Mp 4 |
| 85 | Tiamat | handDiscard→+At(Lv) 1Turn, interfere, Mp 2 |
| 87 | Zalom's Rider | atBoost1SubTurn own seal, fieldTarget, Mp 1 |
| 88 | Harison Knight of Pentacles | destroyStoneCursed seal AtLine, fieldTarget, Mp 3 |
| 91 | Zadin | destroyTarget, fused+enemy exists, fieldTarget |
| 93 | Alana Princess Cups | frozenToHand frozen seal AtLine, fieldTarget, Mp 1 |
| 94 | Regina Princess Swords | allToAtLine, fused+wind+AtLine, selfSkill, Mp 1 |
| 95 | Wanaan Princess Pentacles | dfBoostMc own seal, interfere fieldTarget, Mp 2 |

### Ability-Only Cards (Passive)
| ID | Name | Ability |
|----|------|---------|
| 4 | White Werewolf | Tarot:Moon mystic bonuses ×2 |
| 10 | Scalo | can attack from Df Line |
| 14 | Coy Crab | 2+ on field → all enemy Seals Sp=0 |
| 23 | Akim | fused → all own Seals Sp=4 |
| 43 | Stone Lizard | stone curse on self after successful attack |
| 49 | Cerberus | can attack fusion support seals |
| 51 | Brigitte the Valkyrie | seals with lower Sp can't attack her |
| 52 | Centaur Scout | cross-line attacks |
| 56 | Vioria the Frigid Witch | player gains AI's remaining Mp at AI turn end |
| 57 | Mor Mercenary | choose At or Df comparison when attacking |
| 60 | Felasia Dragon | 2 attacks when fused with Dragon |
| 62 | Evil Fire Warrior | At+3 if enemy has more seals; At-3 if fewer |
| 63 | Dread Knight | always At Line; can attack Df Line directly |
| 64 | Thunderia | non-fused own Beasts get Thunderia's fusion attacks |
| 67 | Gregory the Bishop | blocks attachPSMystic + negates mystic bonuses while on AtLine |
| 72 | Dark Destiny | deploy→optional drawMystic; shrine→force discard mystic |
| 73 | Python | always defends with Df; At-3 vs wind |
| 75 | Albino Gryption | own Beasts in hand cost mc-1 |
| 76 | Thor Thunder God | auto-moves to At Line when enemy has At Line seals |
| 77 | Yggdrasil | other Df Line seals Sp=0 |
| 79 | Golden Fur Griffin | At+1 per own Beast; Df-1 per own Beast |
| 80 | Wool Wyvern | At-2 vs Fire element |
| 81 | Undine | all own seals +At1 +Df2 |
| 82 | Heaven Knight | clears all curses; blocks attachPSMystic; returns to deck after 3 turns |
| 83 | Salamandera | At +(own AtLine − enemy AtLine) |
| 84 | Jormungand | At-3 vs earth |
| 85 | Tiamat | At-3 vs light |
| 86 | Divine Dragon | At +enemy field count; At-2 vs Knight tribe |
| 92 | Nerimor Princess Wands | own fire seals +At1 -Df3 when in Df Line |
| 59 | Blue Wind Griffin | own Beasts +Sp 1 |

## Patterns & Conventions
- **No JSON caching**: always append `?v=Date.now()` when fetching card DB
- **Sequential async**: callbacks chain, not Promise.all — preserve animation order
- **Render after state change**: always call `render()` after mutating `G` or mode flags
- **Thai UI**: log messages and button labels in Thai
- **Right-click cancel**: `contextmenu` listener — cancels `handDiscardMode` (keeps AQ) or `skillMode` (full cancel via `cancelAction()`)
- **Cancel button**: `#btn-aq-cancel` lives INSIDE `#action-queue` overlay — shows only during `handDiscardMode`
- **Online broadcast**: HOST must call `Online.broadcastState()` after every state change in all callbacks
- **Guest draw logging**: use `drawCard(pi, silent=true)` to suppress card name in log; outer log handles description
- **findFCOwner(fc)**: always use this to find which player owns a FieldCard — never hardcode pi=0 for skills
- **Siren skill**: requires AtLine — if card is in DfLine, no skill appears (by design)
