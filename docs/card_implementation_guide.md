# Card Implementation Guide
## MMSummonerMasterSim — Seal & Mystic Skills / Abilities

This document is the authoritative recipe for implementing new card effects correctly.
Read every section that applies to your card before writing any code.

---

## 1. Reading `cards_metadata.js`

Each card JSON has:
```js
{
  "id": 89,
  "name": "Sigmund 3rd, Knight of Swords",
  "lv": 3,
  "at": 9, "df": 10, "spd": 4,
  "mp_deploy": 4, "mp_attack": 3,
  "element": ["wind"],          // ELEMENT — always lowercase: darkness|light|fire|water|earth|wind|neutral
  "tribe": ["Knight"],          // TRIBE   — always PascalCase: Beast|Dragon|Knight|Evil|Mage|Divine|Monster|Plant|Machine|Scientist|Angel
  "fusions": [...],
  "skill_text": ["[Skill]- …"], // null if no skill
  "ability_text": ["…"]         // null if no passive ability
}
```

DB normalization in `db.js` maps these to:
| metadata field | `fc.card` field |
|---|---|
| `element[0]` | `.el` |
| `tribe[0]` | `.tribe` |
| `spd` | `.sp` |
| `mp_deploy` | `.mc` |
| `mp_attack` | `.ma` |
| `fusions` | `.fuse[]` (each: `{reqs:[…], atk:{name,at,df,mp,all,hits}}`) |

**CRITICAL — never confuse tribe and element:**
- `.card.el` holds element values: `'darkness'`, `'light'`, `'fire'`, `'water'`, `'earth'`, `'wind'`, `'neutral'`
- `.card.tribe` holds tribe values: `'Beast'`, `'Dragon'`, `'Knight'`, `'Evil'`, `'Mage'`, `'Divine'`, `'Monster'`, `'Plant'`, `'Machine'`, `'Scientist'`, `'Angel'`
- **Never** write `.el==='Beast'` or `.tribe==='fire'` — these are always wrong.

---

## 2. Seal Skills — `_getCardSkillsRaw` in `skills.js`

### 2a. Skill object shape
```js
{
  label: '✦ [Skill] Thai description (Mp N)',
  mp: N,
  type: 'fieldTarget' | 'selfSkill' | 'handDiscard' | 'handPickBeast' | 'garudaInterfere' | 'phoenixInterfere',
  effect: 'effectName',   // for fieldTarget and selfSkill
  interfere: true,        // only if usable during opponent's AQ window
  filter: t => boolean,   // only for fieldTarget — returns true for valid targets
  // extra fields depending on effect:
  atBonus: N, turns: N,   // lastDanceCurse
  drainAmt: N,            // opponentMpDrain
}
```

### 2b. Condition checks (fused/line/element)

**Fused (any):**
```js
(fc.fused || fc.willMind || _isThunderiaFused(fc))
```

**Fused with a specific element:**
```js
(fc.fused && fc.fusionStack.some(m => m.card.el === 'darkness')) || fc.willMind || fc.magicalEl === 'darkness'
```
Replace `'darkness'` with the required element. Use `.card.el` not `.card.tribe`.

**Fused with a specific tribe:**
```js
(fc.fused && fc.fusionStack.some(m => m.card.tribe === 'Dragon')) || fc.willMind
```
Note: `fc.magicalEl` is element-only — no `fc.magicalTribe`. Do NOT add a `magicalEl` fallback for tribe-based fusions.

**Fused with a specific card (by id):**
```js
(fc.fused && fc.fusionStack.some(m => m.card.id === 41)) || fc.willMind
```

**At Line:**
```js
isOnAtLine(fc)
```

**Df Line:**
```js
G.players[ownerPi].dfLine.some(x => x.uid === fc.uid)
```
(Use `p.dfLine` where `p = G.players[ownerPi]`)

### 2c. Target filters for `fieldTarget`

Enemy field:
```js
filter: t => [...opp.atLine, ...opp.dfLine].some(x => x.uid === t.uid)
```

Own field:
```js
filter: t => [...p.atLine, ...p.dfLine].some(x => x.uid === t.uid)
```

Any field (both sides):
```js
const allField = [...G.players[0].atLine, ...G.players[0].dfLine, ...G.players[1].atLine, ...G.players[1].dfLine];
filter: t => allField.some(x => x.uid === t.uid)
```

Combine with other conditions using `&&`:
```js
filter: t => [...opp.atLine, ...opp.dfLine].some(x => x.uid === t.uid)
          && [1, 2, 3].includes(t.card.sp)
          && !t.curses?.some(c => c.type === 'freeze')
```

Sp range shorthand: always use `[1,2,3].includes(t.card.sp)` — never `t.card.sp <= 3`.

### 2d. Curse type strings
| In-game name | `type` string |
|---|---|
| Freeze Curse | `'freeze'` |
| Stone Curse | `'stone'` |
| Poison Curse | `'poison'` |
| Charm Curse | `'charm'` |
| Death Curse | `'death'` |
| Last Dance Curse | `'lastDance'` |

### 2e. Curse duration formula
```js
// N turns (1 full turn = 2 subTurns):
{ type: 'freeze', expiresAtSubTurn: subTurnNum + (N * 2) }
```
1 turn = `subTurnNum+2`. 2 turns = `subTurnNum+4`. 3 turns = `subTurnNum+6`.
Permanent (∞): use `turns: Infinity` and do NOT add `expiresAtSubTurn`.

### 2f. Boost duration formula
```js
// 1 sub-turn boost (expires at end of current sub-turn):
{ amount: X, expiresBeforeSubTurn: subTurnNum + 1 }
// 1 full turn (2 sub-turns):
{ amount: X, expiresBeforeSubTurn: subTurnNum + 2 }
```

### 2g. Immunity check (before applying curses)
Some seals are immune to curses. Always check before applying:
```js
if (t.card.id === 82 || t.card.id === 22 || t.card.id === 20) {
  log(`${t.card.name} [Ability]: ยกเลิก Curse!`, 'bad'); return;
}
```
- id=82: Heaven Knight (enemy-only mystic block + curse immunity)
- id=22: Delta-D (Biotek-D) — curse immune
- id=20: Angel of Sword — curse immune

In `executeSkill` / `executeSelfSkill` apply this check inside the `showActionQueue` callback, before pushing the curse.

---

## 3. Seal Skill Types — Implementation Checklist

### Type: `fieldTarget`
1. Add entry in `_getCardSkillsRaw` with `type:'fieldTarget'`, `effect:'effectName'`, and `filter`.
2. In `executeSkill(skillFC, skillIdx, targetFC, targetPi, targetLine)`:
   ```js
   if (skill.effect === 'effectName') {
     showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b>`, () => {
       if (!_skillStillValid(skillFC, skill)) { log('…ยกเลิก…', 'bad'); render(); return; }
       p.mp -= skill.mp;
       skillFC.hasUsedSkill = true;
       // … apply effect …
       checkLose(); render();
     });
     return;
   }
   ```
3. Always call `_skillStillValid` inside the AQ callback.
4. Always set `skillFC.hasUsedSkill = true` and deduct `p.mp -= skill.mp` inside the callback (NOT before AQ).

### Type: `selfSkill`
1. Add entry with `type:'selfSkill'`, `effect:'effectName'`.
2. In `executeSelfSkill(skillFC, skillIdx)`:
   ```js
   if (skill.effect === 'effectName') {
     showActionQueue(`…`, () => {
       if (!_skillStillValid(skillFC, skill)) { … return; }
       p.mp -= skill.mp;
       skillFC.hasUsedSkill = true;
       // … apply effect …
       checkLose(); render();
     });
     return;
   }
   ```

### Type: `handDiscard` (Interfere)
Used for: card gives a buff in exchange for discarding a seal from hand (e.g. Tiamat).
- `interfere: true` in skill object
- Execution is in `executeInterfere(card)` in `skills.js`
- Discarded card goes to `p.shrine` (not `p.deck`)
- Buff goes onto the skill caster (`skillFC`), typically an atBoost

### Type: `garudaInterfere` / `phoenixInterfere`
These are informational — they make the AQ button glow. Execution is in the dedicated AQ button handlers (`btn-aq-garuda`, `btn-aq-phoenix`), not in `executeSkill`.

### Two-step `fieldTarget` (Blaze Sage pattern)
Step 1: normal fieldTarget picks the sacrifice seal. In `executeSkill`, instead of resolving immediately, save context and re-enter skill mode with `skillIdx = -99`:
```js
pendingSacrifice = { skillFC, mc: targetFC.card.mc };
// remove the sacrifice seal from field
p.mp -= skill.mp; skillFC.hasUsedSkill = true;
const rmLine = p.atLine.findIndex(…); …
skillMode = { fc: skillFC, skillIdx: -99 };
render();
```
Step 2 (`skillIdx === -99`): in `executeSkill`, apply the saved boost to the newly-clicked target.

---

## 4. Passive Abilities — `getEffectiveAt/Df/Sp` in `engine.js`

Passive abilities that modify At/Df/Sp go inside the three stat getters. Key rules:

- **Always handle symmetrically for BOTH pi=0 and pi=1.** Use `findFCOwner(fc)` where needed.
- Use the `ownField`, `own`, `opp` locals already built inside each getter — do NOT re-query `G.players` manually.
- `base` is the running total; add/subtract from it.

### Template: `getEffectiveAt`
```js
// MyCard (id=N): description
if (fc.card.id !== N) base += ownField.filter(x => x.card.id === N).length * AMOUNT;
// or for self-modifying:
if (fc.card.id === N) {
  const cnt = ownField.filter(x => x.card.tribe === 'Beast').length;
  base += cnt;
}
```

### "ใบอื่น" vs "ทุกใบ" — critical distinction

Read the ability text before writing the filter:

| Thai text | Meaning | Correct filter pattern |
|---|---|---|
| `ใบอื่น` (other seals) | The card buffs seals OTHER than itself; if 2+ copies exist each buffs the others | `x.uid !== fc.uid` — exclude only this specific instance |
| `ทุกใบ` (all seals) | The card buffs ALL matching seals including itself; but still uses `uid!==fc.uid` to avoid self-counting its own passive | `x.uid !== fc.uid` on the SOURCE filter |

**Rule: never use `fc.card.id !== N` as the self-exclusion guard.** That pattern blocks ALL copies of the card from receiving each other's buffs. Always use `x.uid !== fc.uid` to filter out just the specific source instance.

```js
// WRONG — blocks 2 Undines from buffing each other:
if (fc.card.id !== 81) base += ownField.filter(x => x.card.id === 81).length;

// CORRECT — each Undine/Griffin/Nerimor buffs others of the same kind:
base += ownField.filter(x => x.card.id === 81 && x.uid !== fc.uid).length;
// For tribe-gated: (e.g. Black Night Griffin buffs Beasts)
if (fc.card.tribe === 'Beast') base += ownField.filter(x => x.card.id === 55 && x.uid !== fc.uid).length;
```

### Template: `getEffectiveSp`
```js
// Check symmetrically for both sides
for (let isP0 of [true, false]) {
  const side = G.players[isP0 ? 0 : 1];
  const sideField = [...side.atLine, ...side.dfLine];
  if (sideField.some(x => x.card.id === N)) {
    // apply effect to the relevant seals
  }
}
```

### Passive vs skill distinction
- **Passive** = always active, no player action, no Mp cost → `getEffectiveAt/Df/Sp` or `applyPassiveAbilities`
- **Ability triggered by event** (on-attack, on-deploy, on-shrine) → hook into `dealDamage`, `doDeploy`, or `sendToShrine` with an `if(fc.card.id===N)` block

### Common passive patterns

**Stat bonus based on own field count:**
```js
// Golden Fur Griffin (79): +At per Beast, -Df per Beast
if (fc.card.id === 79) {
  const cnt = ownField.filter(x => x.uid !== fc.uid && x.card.tribe === 'Beast').length;
  base += cnt; // in getEffectiveAt
}
if (fc.card.id === 79) {
  const cnt = ownField.filter(x => x.uid !== fc.uid && x.card.tribe === 'Beast').length;
  base -= cnt; // in getEffectiveDf
}
```

**Conditional At modifier vs specific enemy:**
The `vs enemy` check happens in `dealDamage` / `getEffectiveCombatAt`, not in `getEffectiveAt`.
Pattern:
```js
// In combat resolution, before computing damage:
if (attFC.card.id === 84 && defFC.card.el === 'earth') effAt -= 3; // Jormungand vs earth
if (attFC.card.id === 85 && defFC.card.el === 'light') effAt -= 3; // Tiamat vs light
```

**Force line / auto-move:**
```js
// Thor (76): moves to AtLine when enemy has AtLine seals
// In applyPassiveAbilities():
if (fc.card.id === 76) {
  const opp = G.players[1 - pi];
  if (opp.atLine.length > 0) {
    // move fc from dfLine to atLine
  }
}
```

**Blocking attacks:**
```js
// Brigitte (51): lower-Sp attackers can't attack
// In clickFieldSeal combat handler:
if (fc.card.id === 51 && getEffectiveSp(attFC) < getEffectiveSp(fc)) { log('…', 'bad'); return; }
```

**On-attack trigger (after successful attack):**
```js
// Stone Lizard (43): stone curse on self after attacking
// In dealDamage() after attacker wins:
if (attFC.card.id === 43 && !attFC.curses?.some(c => c.type === 'stone')) {
  attFC.curses = (attFC.curses || []);
  attFC.curses.push({ type: 'stone', expiresAtSubTurn: subTurnNum + 2 });
}
```

---

## 5. Mystic Cards — PS, PA, nonP

### 5a. Mystic types
| `pasted` | Type | How played |
|---|---|---|
| `"PS"` | Permanent Seal attached | `attachPSMystic(fc, mysticCard)` → stays on seal |
| `"PA"` | Permanent Area | `playPAMystic(mysticCard)` → goes to `areaMystics[]` |
| `"nonP"` | Non-Permanent (one-shot) | `playNonPMystic(mysticCard)` → effect fires, then card goes to `mysticGrave` |

### 5b. PS Mystic — `attachPSMystic` pattern

Each PS mystic has a block `if(id===N){...}` in `attachPSMystic()`.
The `doAttach(atBonus=0, dfBonus=0, spBonus=0, extras={})` helper:
- Spends Mp, removes from hand, adds to seal's `activeMystics`
- Fires `showActionQueue` for the interfere window
- `extras` keys: `maReduction`, `curseType`, `protects`, `swapAtDf`, `doubleAtk`, `elFusion`

```js
// Basic: At +N for tribe/element check
if (id === N) {
  const ok = fc.card.tribe === 'Knight' || fc.card.el === 'wind';
  if (!ok) { log(`${fc.card.name} ไม่ตรงเงื่อนไข`, 'bad'); render(); return; }
  spend(); showActionQueue(`${mysticCard.name} → ${fc.card.name} At+2`, () => doAttach(2)); return;
}
```

**Condition check order for PS mystics:**
1. Check element/tribe eligibility → if not met, `log(...,'bad'); render(); return;`
2. Call `spend()` — deducts Mp and removes from hand
3. `showActionQueue(desc, () => doAttach(...))`
4. `return;`

**Multi-option PS mystic (player chooses bonus):**
```js
if (id === N) {
  const opts = [];
  if (fc.card.tribe === 'Knight') opts.push({ label: '[Knight] At +2', data: { at: 2 } });
  if (fc.card.el === 'wind') opts.push({ label: '[Wind] At +2 Sp +1', data: { at: 2, sp: 1 } });
  if (!opts.length) { log(`ไม่ตรงเงื่อนไข`, 'bad'); render(); return; }
  const d = extraData || opts[0].data;
  spend(); showActionQueue(`…`, () => doAttach(d.at || 0, 0, d.sp || 0)); return;
}
```
`extraData` is passed by the AI so it doesn't need to re-show the picker.

**Curse-applying PS:**
```js
spend(); showActionQueue(`…`, () => doAttach(0, 0, 0, { curseType: 'stone' })); return;
// curseType pushes a permanent curse that stays while the mystic is attached
```

### 5c. nonP Mystic — `playNonPMystic` pattern

Structure: `if(id===N){ ... }` block that calls `spend()` then fires the effect.
- `spend()` deducts Mp and removes from mysticHand
- End with `Online.broadcastState()` (HOST only — already called by the outer wrapper in most cases, but add it inside nested callbacks)

```js
if (id === N) {
  const targets = [...G.players[0].atLine, ...G.players[0].dfLine].filter(fc => /* condition */);
  if (!targets.length) { log('ไม่มีเป้าหมาย', 'bad'); return; }
  spend();
  showActionQueue(`${mysticCard.name}`, () => {
    // apply effect to targets
    log(`${mysticCard.name}: …`, 'good');
    checkLose(); render(); Online.broadcastState();
  });
  return;
}
```

**Interfere nonP:**
Set `interfere: true` in mystic DB. At runtime it enters the chain via `_interfereStack` — the effect fires BEFORE `pendingCb` resolves. Pattern is the same but the AQ nesting is handled by `_enterChainMode`.

### 5d. PA Mystic — `playPAMystic` pattern

PA mystics go to `p.areaMystics[]`. They persist and modify global game state.
- Add to `areaMystics`: `p.areaMystics.push({ mystic: mysticCard, ... })`
- Their effects are read in stat getters (`getEffectiveAt`, etc.) or `getMysticAtBonus`
- Removed via Inquisition or when the game state clears

### 5e. `exception_tribes` and `exception_els`

These DB fields on mystics mean the mystic **cannot be attached** to seals of those tribes/elements.
The check is in `attachPSMystic`:
```js
if ((mysticCard.exception_tribes || []).includes(fc.card.tribe)) { /* reject */ }
if ((mysticCard.exception_els || []).includes(fc.card.el)) { /* reject */ }
```
Do NOT forget this check when adding a new PS mystic — add the appropriate `exception_tribes` / `exception_els` to the DB entry.

### 5f. Mystic immunity (Gregory, Heaven Knight)

- **Gregory (id=67)**: blocks `attachPSMystic` while on AtLine AND negates mystic bonuses (checked in `getMysticAtBonus` and related getters)
- **Heaven Knight (id=82)**: blocks `attachPSMystic` on enemy seals (enemy-only block) + blocks all curses

Check before attaching:
```js
if (fc.card.id === 82) { log(`Heaven Knight ป้องกัน Mystic!`, 'bad'); return; }
```

---

## 6. AI Implementation

### 6a. Skill usage — `getAICardSkill(fc)` in `engine.js`

Add a block for each skill the AI should use. Returns `{mp, label, execute}` or `undefined`.

```js
// MyCard (id=N): skill description
if (id === N && /* conditions */ && ai.mp >= COST) {
  const t = allPlayer.find(t => /* target filter */
    && t.card.id !== 82 && t.card.id !== 22 && t.card.id !== 20); // skip immune cards
  if (t) return {
    mp: COST,
    label: 'Skill label',
    execute: () => {
      t.curses = (t.curses || []);
      t.curses.push({ type: 'freeze', expiresAtSubTurn: subTurnNum + 2 });
      broadcastSound('Freeze');
      log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Freeze Curse 1 Turn!`, 'bad');
    }
  };
}
```

**Always** skip immune cards in the target filter: `t.card.id !== 82 && t.card.id !== 22 && t.card.id !== 20`

Use `allPlayer` (enemy seals) or `allAI` (own seals) as needed, both already defined as locals at the top of `getAICardSkill`.

### 6b. AI PS Mystic usage — `_aiPickPSTarget` blocks

For each PS mystic the AI should use, add a block in the AI's mystic-play logic.
The AI calls `attachPSMystic(fc, mysticCard, extraData)` after choosing a target. Pass `extraData` for multi-option mystics so the picker is skipped.

### 6c. AI fusion — important constraint

The AI only fuses ONE material per main card per turn.
The AI only fuses if `_unlockedAtksForStack(fuse, [mat.card]).length > 0` — i.e., the fusion actually unlocks an attack. **Never** rely on partial/accumulation fusion for AI (it creates broken "fused with no attacks" state).

---

## 7. Skill Text → Code Translation Reference

| Skill text keyword | Code pattern |
|---|---|
| `[Skill]-` prefix | normal skill, `type:'selfSkill'` or `type:'fieldTarget'` |
| `[Skill/Interfere]` | add `interfere: true` |
| `รวมร่าง` (fused) | `fc.fused \|\| fc.willMind \|\| _isThunderiaFused(fc)` |
| `รวมร่างกับ [Dark]` | `(fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness'))\|\|fc.willMind\|\|fc.magicalEl==='darkness'` |
| `รวมร่างกับ [Dragon]` (tribe) | `(fc.fused&&fc.fusionStack.some(m=>m.card.tribe==='Dragon'))\|\|fc.willMind` |
| `At Line` condition | `isOnAtLine(fc)` |
| `Df Line` condition | `p.dfLine.some(x=>x.uid===fc.uid)` |
| `Sp N, M` (target range) | `[N,M,...].includes(t.card.sp)` |
| `ทำลาย` (destroy) | `effect:'destroyTarget'` → `destroyByEffect(targetFC, ownerPi)` |
| `คืนกอง` (bounce to deck) | `effect:'returnToDeck'` — add seal back to owner's deck and shuffle |
| `ขึ้นมือ` (to hand) | `bounceSealToHand(fc, pi)` or manual hand push with `getEffectiveHandMax` check |
| `ติด Freeze Curse` | `effect:'freezeCurse'` / `{type:'freeze', expiresAtSubTurn: subTurnNum+N*2}` |
| `ติด Stone Curse` | `effect:'stoneCurse'` / `{type:'stone', expiresAtSubTurn: subTurnNum+N*2}` |
| `ติด Poison Curse` | `effect:'poisonCurse'` / `{type:'poison', expiresAtSubTurn: subTurnNum+N*2}` |
| `ติด Charm Curse` | `effect:'charmCurse'` → also set `fc.charmed={originalPi,originalLine}` |
| `ติด Death Curse` | `effect:'deathCurse'` → `sendToShrine(targetFC, ownerPi)` |
| `ติด Last Dance Curse` | `effect:'lastDanceCurse'` → atBoost with `expiresBeforeSubTurn` |
| `Sacrifice Seal` | two-step fieldTarget (see Blaze Sage pattern) |
| `จั่วการ์ด` (draw) | `drawCard(pi, silent, force)` or `drawMysticCard(pi, silent, force)` |
| `ฝ่ายตรงข้าม Mp -N` | `G.players[opp].mp = Math.max(0, G.players[opp].mp - N)` |
| `รักษา Curse` (heal) | `targetFC.curses = []` |
| `ย้ายไป At Line` | move fc from dfLine to atLine |
| `ย้ายไป Df Line` | move fc from atLine to dfLine (also check freeze/stone block) |
| `Interfere` + no target | `type:'selfSkill'` with `interfere:true` |
| `Interfere` + field target | `type:'fieldTarget'` with `interfere:true` (check in `getInterfereSkills`) |

---

## 8. Step-by-Step Checklist for a New Seal Card

1. **Add card to DB** (`db.js`) with correct `el` (element) and `tribe` (separate fields, correct case).
2. **Determine card type:**
   - Skill only → add block in `_getCardSkillsRaw` + execution in `executeSkill`/`executeSelfSkill`
   - Passive only → add in `getEffectiveAt`, `getEffectiveDf`, or `getEffectiveSp`
   - Event-triggered ability → hook into the relevant engine function (`doDeploy`, `dealDamage`, `sendToShrine`, `endTurn`)
3. **Identify all conditions** (fused, fused+element, fused+tribe, line, Sp range, own/enemy, etc.)
4. **Write `_getCardSkillsRaw` entry** — return `[]` when conditions not met.
5. **Write execution block** — always inside `showActionQueue`, always `_skillStillValid`, always deduct Mp and set `hasUsedSkill` inside the callback.
6. **Apply immunity checks** (id 82, 22, 20) before pushing any curse.
7. **Add AI skill block** in `getAICardSkill` — filter out immune seals.
8. **Online:** ensure HOST calls `Online.broadcastState()` at the end of all callbacks.
9. **Test:** deploy, use skill/ability, test on both pi=0 (player) and pi=1 (AI/GUEST).

---

## 9. Step-by-Step Checklist for a New Mystic Card

1. **Add card to DB** (`db.js` mystic section) with correct `pasted`, `mc`, `interfere`, `turns`, `exception_tribes`, `exception_els`.
2. **Determine type:**
   - PS → block in `attachPSMystic` (and mirror block in `guestAttachPSMystic` / `aiAttachPSMystic`)
   - nonP → block in `playNonPMystic` (player) and `guestPlayNonPMystic` (guest)
   - PA → block in `playPAMystic`; effect read in stat getters
3. **PS mystics:** always call `spend()` before `showActionQueue`, always check `exception_tribes/els`.
4. **nonP interfere mystics:** set `interfere:true` in DB; the chain system handles timing.
5. **PA mystics:** effect is always-on — read in `getEffectiveAt/Df/Sp` or `getMysticAtBonus`.
6. **Multi-option mystics:** use `showMysticPicker` for player, pass `extraData` for AI to skip picker.
7. **AI:** add AI targeting logic for PS mystics in the AI's mystic-selection code.

---

## 10. Common Mistakes to Avoid

| Mistake | Correct approach |
|---|---|
| `.card.el === 'Beast'` | `.card.tribe === 'Beast'` |
| `.card.tribe === 'fire'` | `.card.el === 'fire'` |
| `t.card.sp <= 3` | `[1,2,3].includes(t.card.sp)` |
| Deduct Mp BEFORE `showActionQueue` | Deduct **inside** the AQ callback (first line, before validity checks) |
| `_skillStillValid` check before Mp deduction | Mp is consumed even when Thunder Bolt cancels — put `p.mp-=skill.mp; skillFC.hasUsedSkill=true;` FIRST, then check |
| Forget immunity check (82/22/20) for curses | Always skip immune cards in target filter |
| `fc.fused` alone for fusion condition | Add `\|\| fc.willMind \|\| _isThunderiaFused(fc)` |
| `fc.fused && fc.fusionStack.some(m=>m.card.tribe==='darkness')` | tribe check uses `.tribe`, not `.el`; darkness is an **element** |
| AI fuses with partial material (no attack unlocked) | Check `_unlockedAtksForStack(...).length > 0` before fusing |
| Hardcoding `pi=0` in skills | Always use `findFCOwner(fc)?.pi ?? 0` |
| Missing `Online.broadcastState()` in HOST callback | Every HOST state-changing callback must end with broadcast |
| Using `t.card.sp` for "Sp range" checks without array | Use `[min,...,max].includes(t.card.sp)` |
| `fc.card.id !== N` as self-exclusion in passive | Use `x.uid !== fc.uid` on the SOURCE filter — `id!==N` blocks all copies from buffing each other |
| Thunder Bolt unfuse: support seals go to `atLine` always | Detect main seal's current line first: `const mainLine = owner.p.atLine.some(x=>x.uid===fc.uid)?'atLine':'dfLine'` |
