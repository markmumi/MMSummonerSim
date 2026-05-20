// ══════════════════════════════════════════════
// GAME STATE
// ══════════════════════════════════════════════
let G = {};
let pendingDeploy = null;
let attackerSeal = null;
let pendingAttackIdx = null;
let phase = 'main';
let turnNum = 1;
let subTurnNum = 0;
let fusionMode = false;
let fusionMainFC = null;
let fieldActionTarget = null; // {fc, line}
let handTargetMode = false;
let handAttackedThisTurn = false;
let skillMode = null; // {fc, skillIdx}
let pendingCb = null;
let handDiscardMode = null; // {fc, skillIdx, onDiscard}
let handPickMode = null;   // {fc, skillIdx} — Blue Wings Pegasus beast deploy
let pendingFusionMain = null; // mainFC currently in AI fusion action queue (Gale Garuda hook)
let pendingSacrifice = null;  // {skillFC, mc} — Blaze Sage two-step sacrifice boost
let MYSTIC_DB = [];
let mysticPlayMode = null; // {mysticCard, mysticIdx} — waiting to paste PS to a field seal
let sacrificeTargetMode = null; // {mysticCard, mysticIdx} — waiting to click field seal to destroy
const MYSTIC_HAND_MAX = 7;
let drawsRemaining = 0;

const _SFX={};
['Deploy','Draw','Flip','Skill','Confirm','Damage','Fusion Complete',
 'Card destroyed by effect','Error','Spell','Poison','Freeze','Stone','Charm'
].forEach(n=>{const a=new Audio(`SoundEffect/${n}.wav`);a.preload='auto';_SFX[n]=a;});

function playSound(name){
  if(localStorage.getItem('bgm_muted')==='1')return;
  const vol=parseFloat(localStorage.getItem('bgm_volume')||'0.5');
  if(!_SFX[name]){_SFX[name]=new Audio(`SoundEffect/${name}.wav`);_SFX[name].preload='auto';}
  const a=_SFX[name].cloneNode();
  a.volume=vol;
  a.play().catch(()=>{});
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
}

function makeFieldCard(card, fromHand=false){
  return {
    uid: Math.random().toString(36).slice(2),
    card,
    exhausted: false,
    hasAttacked: false,
    hasUsedSkill: false,
    sevenSilverFree: false,
    atBoosts: [],
    spBoosts: [],
    dfBoosts: [],
    curses: [],
    mystics: [],
    deployedTurn: turnNum,
    fromHand,
    lineSwitchedTurn: -1,
    fusionStack: [],
    fusionAtks: [],
    fused: false,
    fusedSinceTurn: null,
    activeMultiAtk: null,
    hitsLeft: 0,
    willMind: false
  };
}

function sealCopyMax(lv){return lv>=5?2:lv>=3?3:4;}

function buildDeck(){
  const pool=[], counts={};
  while(pool.length<25){
    const avail=CARD_DB.filter(c=>(counts[c.id]||0)<sealCopyMax(c.lv));
    if(!avail.length)break;
    const c=avail[Math.floor(Math.random()*avail.length)];
    pool.push({...c});
    counts[c.id]=(counts[c.id]||0)+1;
  }
  return shuffle(pool);
}

function buildMysticDeck(){
  if(!MYSTIC_DB.length)return [];
  const pool=[], counts={};
  while(pool.length<20){
    const avail=MYSTIC_DB.filter(c=>(counts[c.id]||0)<2);
    if(!avail.length)break;
    const c=avail[Math.floor(Math.random()*avail.length)];
    pool.push({...c});
    counts[c.id]=(counts[c.id]||0)+1;
  }
  return shuffle(pool);
}

function buildDeckFromTemplate(tpl){
  const pool=[];
  for(const e of(tpl.seals||[])){
    const c=CARD_DB.find(x=>x.id===e.id);
    if(c)for(let i=0;i<e.count;i++)pool.push({...c});
  }
  return shuffle(pool);
}

function buildMysticDeckFromTemplate(tpl){
  const pool=[];
  for(const e of(tpl.mystics||[])){
    const m=MYSTIC_DB.find(x=>x.id===e.id);
    if(m)for(let i=0;i<e.count;i++)pool.push({...m});
  }
  return shuffle(pool);
}

function initDragDrop(){
  ['player-at','player-df'].forEach(id=>{
    const el=document.getElementById(id);
    const targetLine=id==='player-at'?'at':'df';
    el.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';el.classList.add('drag-over');});
    el.addEventListener('dragleave',e=>{if(!el.contains(e.relatedTarget))el.classList.remove('drag-over');});
    el.addEventListener('drop',e=>{
      e.preventDefault();el.classList.remove('drag-over');
      try{
        const data=JSON.parse(e.dataTransfer.getData('text/plain'));
        if(data.type==='hand'){
          const card=G.players[0].hand[data.idx];
          if(!card)return;
          pendingDeploy={card,idx:data.idx};
          doDeploy(targetLine);
        } else if(data.type==='field'){
          const fc=[...G.players[0].atLine,...G.players[0].dfLine].find(f=>f.uid===data.uid);
          if(fc&&data.fromLine!==targetLine)doLineSwitch(fc,data.fromLine,targetLine);
        } else if(data.type==='mystic'){
          const mc=(G.players[0].mysticHand||[])[data.idx];
          if(!mc)return;
          const inMainPhase=(phase==='main'||phase==='main2')&&G.currentPlayer===0;
          const inInterfere=!!pendingCb;
          if(G.players[0].mp>=mc.mc&&(inMainPhase||(mc.interfere&&inInterfere)))showMysticAction(mc,data.idx);
        }
      }catch(err){}
    });
  });
}

function loadPlayerDeckFromStorage(){
  const saved=localStorage.getItem('mm_playerDeck');
  if(!saved)return null;
  try{
    const data=JSON.parse(saved);
    const seals=[];
    for(const e of(data.seals||[])){
      const c=CARD_DB.find(x=>x.id===e.id);
      if(c)for(let i=0;i<e.count;i++)seals.push({...c});
    }
    const mystics=[];
    for(const e of(data.mystics||[])){
      const m=MYSTIC_DB.find(x=>x.id===e.id);
      if(m)for(let i=0;i<e.count;i++)mystics.push({...m});
    }
    if(seals.length>=25){
      console.log('Loaded player deck from localStorage: seals=',seals.length,'mystics=',mystics.length);
      return{seals:shuffle(seals),mystics:shuffle(mystics)};
    }
  }catch(e){console.warn('Failed to load deck from localStorage:',e);}
  return null;
}

function initGame(){
  const saved=loadPlayerDeckFromStorage();
  const d0=saved?saved.seals:buildDeck();
  const md0=saved?saved.mystics:buildMysticDeck();
  const aiKey=sessionStorage.getItem('mm_aiDeck')||'random';
  const aiTpl=(typeof AI_DECK_TEMPLATES!=='undefined')&&AI_DECK_TEMPLATES[aiKey];
  const d1=aiTpl?buildDeckFromTemplate(aiTpl):buildDeck();
  const md1=aiTpl?buildMysticDeckFromTemplate(aiTpl):buildMysticDeck();
  const aiName=aiTpl?aiTpl.name:'AI';
  G={
    players:[
      {deck:d0,hand:[],atLine:[],dfLine:[],shrine:[],mp:5,name:"Player",mysticDeck:md0,mysticHand:[],areaMystics:[]},
      {deck:d1,hand:[],atLine:[],dfLine:[],shrine:[],mp:MAX_MP,name:aiName,mysticDeck:md1,mysticHand:[],areaMystics:[]}
    ],
    currentPlayer:0
  };
  for(let i=0;i<5;i++){drawCard(0,true);drawCard(1,true);}
  drawMysticCard(0,true);drawMysticCard(0,true);
  drawMysticCard(1,true);drawMysticCard(1,true);
  console.log('initGame: MYSTIC_DB=',MYSTIC_DB.length,'player mysticDeck=',G.players[0].mysticDeck.length,'mysticHand=',G.players[0].mysticHand.length);
  initDragDrop();
  phase='main';
  log(`Turn ${turnNum} — Player's turn | MAIN PHASE`,'hi');
  render();
}

function getEffectiveHandMax(pi){
  const p=G.players[pi];
  let max=HAND_MAX;
  if((p.areaMystics||[]).some(am=>am.mystic.id===35))max+=1;
  if((p.areaMystics||[]).some(am=>am.mystic.id===70))max-=1;
  return Math.max(1,max);
}
function getEffectiveMpMax(pi){
  const p=G.players[pi];
  let max=MAX_MP;
  if((p.areaMystics||[]).some(am=>am.mystic.id===70))max+=1;
  return max;
}

function drawCard(pi,silent=false,force=false){
  const p=G.players[pi];
  if(!p.deck.length){if(!silent)log(`${p.name} deck empty!`,'bad');checkLose();return;}
  if(!force&&p.hand.length>=getEffectiveHandMax(pi)){if(!silent)log(`${p.name} hand full`,'');return;}
  const c=p.deck.shift();
  p.hand.push(c);
  if(!silent){log(`${p.name} drew ${c.name}`);playSound('Draw');}
}

// ══════════════════════════════════════════════
// PHASE MANAGEMENT
// ══════════════════════════════════════════════
function onNextPhaseBtn(){
  if(phase==='battle'){endBattle();}
  else skipToNextPhase();
}

function skipToNextPhase(){
  cancelAction();
  if(phase==='draw'){phase='main';log('MAIN PHASE','hi');}
  else if(phase==='main'){phase='battle';log('BATTLE PHASE — select a Seal then click enemy','hi');}
  else if(phase==='main2'){endTurnFromMain2();return;}
  render();
}

function endBattle(){
  cancelAction();
  phase='main2';
  log('MAIN PHASE 2','hi');
  render();
}

function endTurnFromMain2(){
  phase='end';
  endTurn();
}

function afterForcedDiscard(){
  const p=G.players[0];
  const combined=p.hand.length+(p.mysticHand||[]).length;
  if(combined<=HAND_COMBINED_MAX&&p.hand.length<=getEffectiveHandMax(0)){
    onPlayerDrawDone();
  } else {
    render();
  }
}

function doForcedDiscardSeal(idx){
  if(phase!=='discard')return;
  const p=G.players[0];
  if(p.hand.length+(p.mysticHand||[]).length<=HAND_COMBINED_MAX&&p.hand.length<=getEffectiveHandMax(0))return;
  const card=p.hand.splice(idx,1)[0];
  p.shrine.push(card);
  playSound('Flip');
  log(`ทิ้ง ${card.name} → Shrine (Discard Step)`,'bad');
  checkLose();
  afterForcedDiscard();
}

function doForcedDiscardMystic(idx){
  if(phase!=='discard')return;
  const p=G.players[0];
  if(p.hand.length+(p.mysticHand||[]).length<=HAND_COMBINED_MAX&&p.hand.length<=getEffectiveHandMax(0))return;
  const card=p.mysticHand.splice(idx,1)[0];
  playSound('Flip');
  log(`ทิ้ง ${card.name} (Mystic) — Discard Step`,'bad');
  afterForcedDiscard();
}

function tickCurses(){
  // Heaven Knight (82): cancel all curses on itself only
  [0,1].forEach(pi=>{
    [...G.players[pi].atLine,...G.players[pi].dfLine].filter(x=>x.card.id===82).forEach(hk=>{
      if(hk.curses?.length){hk.curses=[];hk.charmed=null;log(`Heaven Knight: ยกเลิก Curse ของตัวเอง!`,'');}
    });
  });
  let needCheck=false;
  [0,1].forEach(pi=>{
    ['atLine','dfLine'].forEach(lineKey=>{
      const arr=G.players[pi][lineKey];
      for(let i=arr.length-1;i>=0;i--){
        const fc=arr[i];
        if(!fc.curses?.length)continue;
        const expired=fc.curses.filter(c=>subTurnNum>=c.expiresAtSubTurn);
        fc.curses=fc.curses.filter(c=>subTurnNum<c.expiresAtSubTurn);
        if(!expired.length)continue;
        // Poison / LastDance → destroy
        if(expired.some(c=>c.type==='poison'||c.type==='lastDance')){
          arr.splice(i,1);
          playSound('Card destroyed by effect');
          if(fc.fusionStack?.length)fc.fusionStack.forEach(m=>G.players[pi].shrine.push(m.card));
          G.players[pi].shrine.push(fc.card);
          const cname=expired.find(c=>c.type==='lastDance')?'Last Dance Curse':'Poison Curse';
          log(`☠ ${fc.card.name} ถูกทำลายจาก ${cname}!`,'bad');
          needCheck=true;
        }
        // Charm → just release control, card stays in place
        if(expired.some(c=>c.type==='charm')&&fc.charmed){
          fc.charmed=null;
          log(`${fc.card.name} หายจาก Charm Curse — กลับสู่เจ้าของเดิม`,'');
        }
        // Stone / Freeze → just expire (no destroy, no move)
      }
    });
  });
  if(needCheck)checkLose();
}

function endTurn(){
  const prevPi=G.currentPlayer;
  G.players[prevPi].atLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
  G.players[prevPi].dfLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
  handAttackedThisTurn=false;
  G.currentPlayer=G.currentPlayer===0?1:0;
  const pi=G.currentPlayer;
  subTurnNum++;
  G.players[pi].atLine.forEach(s=>{s.exhausted=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
  G.players[pi].dfLine.forEach(s=>{s.exhausted=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
  tickCurses();
  tickMystics();
  if(pi===0){
    // Player's turn: draw choice modal (from endAITurn, not called here normally)
    drawCard(pi);
    drawMysticCard(pi);
    G.players[pi].mp=getEffectiveMpMax(pi);
    turnNum++;
    phase='draw';
    log(`Turn ${turnNum} — Player's turn | DRAW PHASE`,'hi');
    setTimeout(()=>{phase='main';log('MAIN PHASE','hi');render();},400);
    render();
  } else {
    // AI's turn: Draw Phase — interfere window before drawing
    const _aiPreReset=G.players[1].mp;
    G.players[pi].mp=getEffectiveMpMax(pi);
    // Player Vioria (56): player gains AI's unspent Mp at start of AI's turn (available for Interfere)
    {const viorias=[...G.players[0].atLine,...G.players[0].dfLine].filter(x=>x.card.id===56);
    if(viorias.length>0&&_aiPreReset>0){
      G.players[0].mp=Math.min(G.players[0].mp+_aiPreReset,MAX_MP);
      log(`Vioria [Ability]: AI เหลือ ${_aiPreReset} Mp → เรา +${_aiPreReset} Mp!`,'good');
    }}
    phase='draw';
    log(`AI's turn — Draw Phase`,'hi');
    render();
    showActionQueue('🤖 AI: Draw Phase', ()=>{
      phase='main';
      if(turnNum===1){
        render();
        setTimeout(()=>aiTurn(),400);
      } else {
        aiDrawCards(pi,()=>{
          render();
          setTimeout(()=>aiTurn(),400);
        });
      }
    });
  }
}

// ══════════════════════════════════════════════
// DEPLOY
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// MYSTIC HELPERS
// ══════════════════════════════════════════════
function getActiveMystics(fc){
  return (fc.mystics||[]).filter(m=>m.expiresBeforeSubTurn===Infinity||subTurnNum<m.expiresBeforeSubTurn);
}
function _mysticOwnerPi(fc){
  for(let pi=0;pi<2;pi++){if([...G.players[pi].atLine,...G.players[pi].dfLine].some(x=>x.uid===fc.uid))return pi;}
  return -1;
}
function _gregoryNegates(fc){
  const pi=_mysticOwnerPi(fc);
  return pi>=0&&G.players[pi].atLine.some(x=>x.card.id===67);
}
function getMysticAtBonus(fc){
  if(_gregoryNegates(fc))return 0;
  return getActiveMystics(fc).reduce((s,m)=>{
    let b=m.atBonus||0;
    if(fc.card.id===4&&m.mystic?.subtype_name==='The Moon')b*=2;
    return s+b;
  },0);
}
function getMysticDfBonus(fc){
  if(_gregoryNegates(fc))return 0;
  return getActiveMystics(fc).reduce((s,m)=>{
    let b=m.dfBonus||0;
    if(fc.card.id===4&&m.mystic?.subtype_name==='The Moon')b*=2;
    return s+b;
  },0);
}
function getMysticSpBonus(fc){
  if(_gregoryNegates(fc))return 0;
  return getActiveMystics(fc).reduce((s,m)=>{
    let b=m.spBonus||0;
    if(fc.card.id===4&&m.mystic?.subtype_name==='The Moon')b*=2;
    return s+b;
  },0);
}
function getMysticMaReduction(fc){
  if(_gregoryNegates(fc))return 0;
  return getActiveMystics(fc).reduce((s,m)=>s+(m.maReduction||0),0);
}
function hasMysticProtect(fc){
  if(_gregoryNegates(fc))return false;
  return getActiveMystics(fc).some(m=>m.protects);
}
function hasMysticDoubleAtk(fc){
  if(_gregoryNegates(fc))return false;
  return getActiveMystics(fc).some(m=>m.doubleAtk);
}

function canAttachMystic(mysticCard,targetFC){
  if(mysticCard.exception_lv!=null&&targetFC.card.lv>=mysticCard.exception_lv)return false;
  if(mysticCard.exception_tribes?.length&&mysticCard.exception_tribes.includes(targetFC.card.tribe))return false;
  if(mysticCard.exception_els?.length&&mysticCard.exception_els.includes(targetFC.card.el))return false;
  return true;
}

function findFCOwner(fc){
  for(let pi=0;pi<2;pi++){
    const p=G.players[pi];
    if([...p.atLine,...p.dfLine].some(x=>x.uid===fc.uid))return{p,pi};
  }
  return null;
}

function showMysticPicker(title,opts,onPick){
  document.getElementById('fa-title').textContent=title;
  const div=document.getElementById('fa-opts');
  div.innerHTML='';
  opts.forEach(({label,data})=>{
    const btn=document.createElement('button');
    btn.className='fopt';
    btn.textContent=label;
    btn.onclick=()=>{closeFAModal();onPick(data);};
    div.appendChild(btn);
  });
  const cancel=document.createElement('button');
  cancel.className='btn btn-gray';
  cancel.style.cssText='margin-top:4px;width:100%';
  cancel.textContent='Cancel';
  cancel.onclick=()=>{closeFAModal();mysticPlayMode=null;render();};
  div.appendChild(cancel);
  document.getElementById('fa-modal').classList.add('show');
}

function getEffectiveMc(card){
  let mc=card.mc;
  const p=G.players[0];
  // Albino Gryption (75): own Beasts in hand cost mc -1
  if(card.tribe==='Beast'&&[...p.atLine,...p.dfLine].some(x=>x.card.id===75))mc=Math.max(0,mc-1);
  return mc;
}

function clickHandCard(card,idx){
  if(G.currentPlayer!==0)return;
  if(phase!=='main'&&phase!=='main2'){log('Can only deploy during Main Phase','');return;}
  if(handPickMode){executeHandPickBeast(card,idx);return;}
  const mc=getEffectiveMc(card);
  if(G.players[0].mp<mc){logErr(`Not enough Mp (need ${mc}, have ${G.players[0].mp})`);return;}
  pendingDeploy={card,idx};
  const mcNote=mc!==card.mc?` (${card.mc}→${mc})`:'';
  document.getElementById('deploy-title').textContent=`Deploy ${card.name} (Mp ${mc}${mcNote})`;
  document.getElementById('deploy-modal').classList.add('show');
}

function doDeploy(line){
  if(!pendingDeploy)return;
  const {card,idx}=pendingDeploy;
  if((phase!=='main'&&phase!=='main2')||G.currentPlayer!==0){logErr('Deploy ได้เฉพาะ Main Phase ของผู้เล่น');closeDeployModal();return;}
  const mc=getEffectiveMc(card);
  if(G.players[0].mp<mc){logErr(`Mp ไม่พอ (ต้องการ ${mc})`);closeDeployModal();return;}
  const p=G.players[0];
  // Dread Knight (63): must always be in At Line
  if(card.id===63){line='at';}
  const target=line==='at'?p.atLine:p.dfLine;
  p.hand.splice(idx,1);
  p.mp-=mc;
  target.push(makeFieldCard(card,true));
  playSound('Deploy');
  log(`You deployed ${card.name} to ${line==='at'?'At':'Df'} Line`,'good');
  if(card.id===67&&line==='at') triggerGregoryCancel(0);
  if(card.id===90) triggerAndreAbility(0);
  closeDeployModal();
  // Dark Destiny (72): on deploy, optionally take 1 mystic from mystic deck
  if(card.id===72&&(p.mysticDeck||[]).length>0){
    document.getElementById('fa-title').textContent='Dark Destiny [Ability]: หยิบ Mystic จากกองการ์ด?';
    const opts=document.getElementById('fa-opts');opts.innerHTML='';
    addFAOpt('✅ หยิบ Mystic 1 ใบ',()=>{
      closeFAModal();
      drawMysticCard(0,false,true);
      log(`Dark Destiny [Ability]: จั่ว Mystic 1 ใบ!`,'good');
      render();
    });
    addFAOpt('✗ ไม่ต้องการ',()=>{closeFAModal();render();});
    document.getElementById('fa-modal').classList.add('show');
    return;
  }
  render();
}

// Deploy from hand by dragging to a specific line slot position
function doDeployAtSlot(card,cardIdx,lineKey,insertAt){
  if((phase!=='main'&&phase!=='main2')||G.currentPlayer!==0){logErr('Deploy ได้เฉพาะ Main Phase ของผู้เล่น');return;}
  const mc=getEffectiveMc(card);
  if(G.players[0].mp<mc){logErr(`Mp ไม่พอ (ต้องการ ${mc})`);return;}
  const p=G.players[0];
  let targetLine=lineKey;
  if(card.id===63)targetLine='at';
  const target=targetLine==='at'?p.atLine:p.dfLine;
  p.hand.splice(cardIdx,1);
  p.mp-=mc;
  const fc=makeFieldCard(card,true);
  if(insertAt===0)target.splice(0,0,fc);else target.push(fc);
  playSound('Deploy');
  log(`You deployed ${card.name} to ${targetLine==='at'?'At':'Df'} Line`,'good');
  if(card.id===67&&targetLine==='at') triggerGregoryCancel(0);
  if(card.id===90) triggerAndreAbility(0);
  if(card.id===72&&(p.mysticDeck||[]).length>0){
    document.getElementById('fa-title').textContent='Dark Destiny [Ability]: หยิบ Mystic จากกองการ์ด?';
    const opts=document.getElementById('fa-opts');opts.innerHTML='';
    addFAOpt('✅ หยิบ Mystic 1 ใบ',()=>{closeFAModal();drawMysticCard(0,false,true);log('Dark Destiny [Ability]: จั่ว Mystic 1 ใบ!','good');render();});
    addFAOpt('✗ ไม่ต้องการ',()=>{closeFAModal();render();});
    document.getElementById('fa-modal').classList.add('show');
    return;
  }
  render();
}

function triggerAndreAbility(andrePi){
  // Andre (90): on enter field, move ALL seals on both sides with Sp < Andre's Sp to their Df Line
  // "สนาม" = entire field (both players). Not considered a "line switch".
  const own=G.players[andrePi];
  const andreFC=[...own.atLine,...own.dfLine].find(x=>x.card.id===90);
  if(!andreFC)return;
  const andreSp=getEffectiveSp(andreFC);
  [0,1].forEach(pi=>{
    const p=G.players[pi];
    const toMove=[...p.atLine].filter(x=>x.uid!==andreFC.uid&&getEffectiveSp(x)<andreSp);
    toMove.forEach(fc=>{
      const i=p.atLine.findIndex(x=>x.uid===fc.uid);
      if(i>=0){
        p.atLine.splice(i,1);
        p.dfLine.push(fc);
        log(`${andreFC.card.name} [Ability]: ${fc.card.name} ย้ายไป Df Line`,'hi');
      }
    });
  });
}

function closeDeployModal(){
  pendingDeploy=null;
  document.getElementById('deploy-modal').classList.remove('show');
}

// ══════════════════════════════════════════════
// FIELD ACTION (line switch, fusion)
// ══════════════════════════════════════════════
function showFieldAction(fc,line){
  fieldActionTarget={fc,line};
  document.getElementById('fa-title').textContent=fc.card.name;
  const opts=document.getElementById('fa-opts');
  opts.innerHTML='';

  // View card
  addFAOpt('👁 View Card',()=>{closeFAModal();openCardViewer(fc.card,fc);});

  // Stone Curse: no actions allowed except viewing
  if(fc.curses?.some(c=>c.type==='stone')){
    const lbl=addFAOpt('🪨 Stone Curse — สั่งการไม่ได้',()=>{});
    lbl.disabled=true;
    document.getElementById('fa-modal').classList.add('show');
    return;
  }

  // Line switch: not exhausted/used skill AND deployed before this turn
  const p=G.players[0];
  const canSwitch=!fc.exhausted && !fc.hasUsedSkill && fc.deployedTurn<turnNum && fc.lineSwitchedTurn<turnNum;
  const otherLine=line==='at'?'df':'at';
  const otherArr=otherLine==='at'?p.atLine:p.dfLine;
  const switchBtn=addFAOpt(`⟷ Move to ${otherLine==='at'?'At':'Df'} Line`,()=>{doLineSwitch(fc,line,otherLine);});
  if(!canSwitch)switchBtn.disabled=true;

  const isCharmedCard=!!fc.charmed;

  // Fuse: has fuse data and still has materials to absorb (skip for charmed/exhausted/used-skill)
  if(!isCharmedCard&&!fc.exhausted&&!fc.hasUsedSkill&&fc.card.fuse&&fc.card.fuse.length>0){
    const materials=findFusionMaterials(fc);
    const fuseBtn=addFAOpt('⚡ Fuse',()=>{closeFAModal();startFusionMode(fc);});
    if(!materials.length)fuseBtn.disabled=true;
  }

  // Unfuse: is fused, fused on previous turn, not exhausted/used-skill (skip for charmed)
  if(!isCharmedCard&&!fc.exhausted&&!fc.hasUsedSkill&&fc.fused&&fc.fusedSinceTurn<turnNum){
    addFAOpt('↩ Unfuse',()=>{doUnfuse(fc);closeFAModal();});
  }

  // Skills
  const skills=getCardSkills(fc);
  skills.forEach((skill,idx)=>{
    const canUse=!fc.hasUsedSkill&&p.mp>=skill.mp&&(skill.type!=='handDiscard'||p.hand.length>0);
    const btn=addFAOpt(skill.label,()=>{
      closeFAModal();
      if(skill.type==='handDiscard')startInterfereSkill(fc,idx);
      else if(skill.type==='selfSkill')executeSelfSkill(fc,idx);
      else if(skill.type==='handPickBeast'){handPickMode={fc,skillIdx:idx};log(`${fc.card.name} [Skill] — เลือก [Beast] ในมือเพื่อนำลงสนาม`,'hi');render();}
      else if(skill.type==='garudaInterfere'){logErr(`${fc.card.name} [Interfere] ใช้ได้เฉพาะในช่วง Action Queue`);}
      else if(skill.type==='phoenixInterfere'){logErr(`Phoenix [Interfere] ฟื้นจาก Shrine ได้ในช่วง Action Queue`);}
      else startSkillMode(fc,idx);
    });
    if(!canUse)btn.disabled=true;
  });

  document.getElementById('fa-modal').classList.add('show');
}

function addFAOpt(label,fn){
  const btn=document.createElement('button');
  btn.className='fopt';
  btn.textContent=label;
  btn.onclick=fn;
  document.getElementById('fa-opts').appendChild(btn);
  return btn;
}

function closeFAModal(){
  document.getElementById('fa-modal').classList.remove('show');
  fieldActionTarget=null;
}

function doLineSwitch(fc,fromLine,toLine){
  if(phase!=='main'&&phase!=='main2'){logErr('เปลี่ยน line ได้เฉพาะ Main Phase');closeFAModal();return;}
  if(fc.exhausted){logErr(`${fc.card.name} inactive ไม่สามารถเปลี่ยน line ได้`);closeFAModal();return;}
  if(fc.deployedTurn>=turnNum){logErr(`${fc.card.name} ลงในเทิร์นนี้ ยังเปลี่ยน line ไม่ได้`);closeFAModal();return;}
  if(fc.lineSwitchedTurn>=turnNum){logErr(`${fc.card.name} เปลี่ยน line ไปแล้วในเทิร์นนี้`);closeFAModal();return;}
  if(fc.card.id===63&&toLine==='df'){logErr('Dread Knight ต้องอยู่ใน At Line เสมอ!');closeFAModal();return;}
  const owner=findFCOwner(fc);
  const p=owner?owner.p:G.players[0];
  const fromArr=fromLine==='at'?p.atLine:p.dfLine;
  const toArr=toLine==='at'?p.atLine:p.dfLine;
  const i=fromArr.findIndex(x=>x.uid===fc.uid);
  if(i>=0)fromArr.splice(i,1);
  toArr.push(fc);
  fc.lineSwitchedTurn=turnNum;
  playSound('Deploy');
  log(`${fc.card.name} moved to ${toLine==='at'?'At':'Df'} Line`,'good');
  if(fc.card.id===67&&toLine==='at') triggerGregoryCancel(owner?owner.pi:0);
  closeFAModal();
  render();
}

function triggerGregoryCancel(ownerPi){
  const p=G.players[ownerPi];
  [...p.atLine,...p.dfLine].forEach(seal=>{
    if(!seal.mystics?.length)return;
    seal.mystics.forEach(m=>log(`Gregory [Ability]: ยกเลิก ${m.mystic.name} บน ${seal.card.name}`,'bad'));
    seal.mystics=[];
    seal.magicalEl=null;
  });
}

// ── FUSION ──
function _unlockedAtksForStack(fuseEntries, stackCards){
  const result=[];
  for(const f of fuseEntries){
    const cards=[...stackCards];
    let ok=true;
    for(const req of f.reqs){
      const idx=cards.findIndex(c=>matchesReq(req,c));
      if(idx>=0)cards.splice(idx,1);else{ok=false;break;}
    }
    if(ok)result.push({...f.atk});
  }
  return result;
}

function getUnlockedAtks(mainFC){
  return _unlockedAtksForStack(mainFC.card.fuse||[], mainFC.fusionStack.map(m=>m.card));
}

function fuseMaterialHelps(mainFC,card){
  // A material is only valid if adding it immediately unlocks at least one NEW fusion attack
  const fuse=mainFC.card.fuse||[];
  const stack=mainFC.fusionStack.map(m=>m.card);
  const before=_unlockedAtksForStack(fuse,stack).length;
  const after=_unlockedAtksForStack(fuse,[...stack,card]).length;
  return after>before;
}

// Rule 613.8.3: card deployed from hand this turn cannot be Support Seal
function newFromHand(m){return m.fromHand && m.deployedTurn >= turnNum;}

function hasPSMystic(fc){return getActiveMystics(fc).some(m=>m.mystic?.pasted==='PS');}

function findFusionMaterials(mainFC){
  const p=G.players[0];
  const all=[...p.atLine,...p.dfLine];
  return all.filter(m=>{
    if(m.uid===mainFC.uid||m.fused||newFromHand(m)||hasPSMystic(m))return false;
    return fuseMaterialHelps(mainFC,m.card);
  });
}

function canBeFusionMaterial(fc){
  if(!fusionMode||!fusionMainFC)return false;
  if(fc.uid===fusionMainFC.uid||fc.fused||newFromHand(fc)||hasPSMystic(fc))return false;
  if(fc.curses?.length>0)return false;
  if(fc.wasMainFusedTurn===turnNum)return false;
  return fuseMaterialHelps(fusionMainFC,fc.card);
}

function startFusionMode(fc){
  fusionMode=true;
  fusionMainFC=fc;
  log(`Select material card to fuse with ${fc.card.name}...`,'hi');
  render();
}

function doFuse(mainFC,materialFC){
  if(!fuseMaterialHelps(mainFC,materialFC.card)){logErr('การ์ดนี้ไม่ตรง requirement');return;}
  const p=G.players[0];
  const removeFrom=arr=>{const i=arr.findIndex(x=>x.uid===materialFC.uid);if(i>=0)arr.splice(i,1);};
  removeFrom(p.atLine);removeFrom(p.dfLine);
  mainFC.fusionStack.push(materialFC);
  mainFC.fusionAtks=getUnlockedAtks(mainFC);
  mainFC.fused=true;
  playSound('Fusion Complete');
  if(!mainFC.fusedSinceTurn)mainFC.fusedSinceTurn=turnNum;
  const atkNames=mainFC.fusionAtks.map(a=>a.name).join(', ')||'(กำลังสะสม...)';
  log(`+${materialFC.card.name} → ${mainFC.card.name}: ${atkNames}`,'good');
  // Keep fusion mode active if more materials can still be added
  const moreMats=findFusionMaterials(mainFC);
  if(moreMats.length>0){
    log(`เลือกการ์ดต่อ หรือกด Cancel เพื่อหยุด`,'hi');
    render();
  } else {
    cancelFusion();
  }
}

function doUnfuse(fc){
  const p=G.players[0];
  fc.fusionStack.forEach(mfc=>{p.atLine.push(mfc);});
  fc.fusionStack=[];
  fc.fusionAtks=[];
  fc.fused=false;
  fc.fusedSinceTurn=null;
  fc.wasMainFusedTurn=turnNum;
  log(`${fc.card.name} unfused`,'');
  render();
}

function cancelFusion(){
  fusionMode=false;
  fusionMainFC=null;
  render();
}

// ══════════════════════════════════════════════
// BATTLE
// ══════════════════════════════════════════════
function clickFieldSeal(fc,pi,line){
  if(pendingCb){
    // During action queue: allow mystic interfere PS
    if(mysticPlayMode&&mysticPlayMode.mysticCard.interfere){
      attachPSMystic(mysticPlayMode.mysticCard,mysticPlayMode.mysticIdx,fc);
      return;
    }
    // During action queue: show skill picker for own cards with available interfere skills
    if(!handDiscardMode&&pi===0&&!fc.hasUsedSkill){
      const p=G.players[0];
      const avail=getCardSkills(fc)
        .map((s,i)=>({s,i}))
        .filter(({s})=>s.interfere&&p.mp>=s.mp&&(s.type!=='handDiscard'||p.hand.length>0));
      if(avail.length>0){
        document.getElementById('fa-title').textContent=`${fc.card.name} [Interfere]`;
        const opts=document.getElementById('fa-opts');opts.innerHTML='';
        avail.forEach(({s,i})=>{
          addFAOpt(s.label,()=>{
            closeFAModal();
            if(s.type==='selfSkill')executeInterfereSelfSkill(fc,i);
            else startInterfereSkill(fc,i);
          });
        });
        addFAOpt('✗ ยกเลิก',()=>{closeFAModal();});
        document.getElementById('fa-modal').classList.add('show');
      }
    }
    return;
  }
  if(G.currentPlayer!==0)return;

  // Mystic PS target selection
  if(mysticPlayMode){
    attachPSMystic(mysticPlayMode.mysticCard,mysticPlayMode.mysticIdx,fc);
    return;
  }

  // Sacrifice field target selection
  if(sacrificeTargetMode){
    const {mysticCard,mysticIdx}=sacrificeTargetMode;
    if((mysticCard.exception_tribes||[]).includes(fc.card.tribe)){logErr(`${fc.card.name} ไม่สามารถเป็นเป้าหมาย Sacrifice ได้`);return;}
    const targetFC=fc;
    sacrificeTargetMode=null;
    const hand=G.players[0].hand;
    showMysticPicker('Sacrifice — เลือก Seal ที่จะทิ้ง (1/2)',hand.map(c=>({label:`${c.name} (${c.tribe} Lv${c.lv})`,data:c})),c1=>{
      const rest=hand.filter(c=>c!==c1);
      showMysticPicker('Sacrifice — เลือก Seal ที่จะทิ้ง (2/2)',rest.map(c=>({label:`${c.name} (${c.tribe} Lv${c.lv})`,data:c})),c2=>{
        showActionQueue(`Sacrifice → ทำลาย ${targetFC.card.name} + ทิ้ง ${c1.name}, ${c2.name}`,()=>{
          const p=G.players[0];
          p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);
          const owner=findFCOwner(targetFC);
          if(owner){destroyByEffect(targetFC,owner.pi);}
          [c1,c2].forEach(c=>{const i=p.hand.indexOf(c);if(i>=0){p.hand.splice(i,1);p.shrine.push(c);playSound('Flip');}});
          log(`Sacrifice: ทำลาย ${targetFC.card.name}! ทิ้ง ${c1.name}, ${c2.name}!`,'bad');
          checkLose();render();
        });
      });
    });
    return;
  }

  if(skillMode){
    if(hasMysticProtect(fc)){logErr(`${fc.card.name} ถูกป้องกัน Silent Prohibitor — Skill ไม่ได้!`);return;}
    if(isSkillTarget(fc)){executeSkill(skillMode.fc,skillMode.skillIdx,fc,pi,line);}
    else{cancelAction();}
    return;
  }

  // ── Charmed enemy card: player controls it ──
  const isCharmed=pi===1&&fc.curses?.some(c=>c.type==='charm');
  if(isCharmed){
    updatePlayerPreview(fc.card,fc);
    if(phase==='main'||phase==='main2'){
      showFieldAction(fc,line);
    } else if(phase==='battle'){
      if(fc.exhausted||fc.hasUsedSkill){log(`${fc.card.name} already acted`,'');return;}
      if(fc.curses?.some(c=>c.type==='stone')){logErr(`${fc.card.name} ติด Stone — โจมตีไม่ได้`);return;}
      if(fc.curses?.some(c=>c.type==='freeze')){logErr(`${fc.card.name} ติด Freeze — โจมตีไม่ได้`);return;}
      if(turnNum===1){logErr('เทิร์นแรก ยังโจมตีไม่ได้');return;}
      attackerSeal={fc,pi:1,line};
      cancelAtkPanel();
      log(`💗 ${fc.card.name} [Charmed] — คลิก Seal ศัตรูของมันเพื่อสั่งโจมตี`,'hi');
      render();
    }
    return;
  }

  if(pi===0){
    updatePlayerPreview(fc.card,fc);
    if(fusionMode){
      if(canBeFusionMaterial(fc)){doFuse(fusionMainFC,fc);return;}
      cancelFusion();return;
    }
    if(phase==='main'||phase==='main2'){
      showFieldAction(fc,line);
    } else if(phase==='battle'){
      if(fc.exhausted||fc.hasUsedSkill){log(`${fc.card.name} already acted this turn`,'');return;}
      if(fc.curses?.some(c=>c.type==='stone')){logErr(`${fc.card.name} ติด Stone Curse — โจมตีไม่ได้`);return;}
      if(fc.curses?.some(c=>c.type==='freeze')){logErr(`${fc.card.name} ติด Freeze Curse — โจมตีไม่ได้`);return;}
      // Scalo (id=10) and Centaur Scout (id=52) can attack from Df Line
      if(line==='df'&&fc.card.id!==10&&fc.card.id!==52){log(`${fc.card.name} อยู่ใน Df Line ไม่สามารถโจมตีได้`,'');return;}
      if(turnNum===1){logErr('เทิร์นแรก ยังโจมตีไม่ได้');return;}
      attackerSeal={fc,pi,line};
      cancelAtkPanel();
      const enemy=G.players[1];
      const noEnemyField=enemy.atLine.filter(s=>!s.curses?.some(c=>c.type==='charm')).length===0&&enemy.dfLine.filter(s=>!s.curses?.some(c=>c.type==='charm')).length===0;
      if(noEnemyField&&enemy.hand.length>0){
        handTargetMode=true;
        log(`ไม่มี Seal ของ AI ในสนาม! คลิกการ์ดหลังของ AI เพื่อโจมตี`,'hi');
      } else {
        handTargetMode=false;
        log(`Selected ${fc.card.name} — click enemy or use Attack/Special`,'hi');
      }
      render();
    }
  } else {
    if(phase!=='battle'){return;}
    if(!attackerSeal){log('Select YOUR Seal first','');return;}
    if(fusionMode)cancelFusion();
    const attFC=attackerSeal.fc;
    // Silent Prohibitor: target cannot be attacked
    if(hasMysticProtect(fc)&&!fc.curses?.some(c=>c.type==='charm')){log(`${fc.card.name} ถูกป้องกันด้วย Silent Prohibitor — โจมตีไม่ได้!`,'bad');return;}
    // Charmed attacker (pi=1) attacks another AI card
    if(attackerSeal.pi===1){
      if(fc.curses?.some(c=>c.type==='charm')){log('ไม่สามารถโจมตีเพื่อนที่โดน Charm ได้','bad');return;}
      if(line==='df'&&attFC.card.id!==52){
        const remainingAt=G.players[1].atLine.filter(s=>!s.curses?.some(c=>c.type==='charm'));
        if(remainingAt.length>0){log(`ต้องตี AI At Line ให้หมดก่อน (เหลือ ${remainingAt.length} ใบ)`,'bad');return;}
      }
      const maCost=Math.max(0,(attFC.card.ma||1)-getMysticMaReduction(attFC));
      const p=G.players[0];
      if(p.mp<maCost){log(`Mp ไม่พอ (ต้องการ ${maCost})`,'bad');return;}
      p.mp-=maCost;
      const attAt=getEffectiveAt(attFC);
      showActionQueue(`💗 ${attFC.card.name} [Charmed] ⚔ ${fc.card.name}`,()=>{
        combatAnim(attFC,fc,attAt,line,false,()=>{
          dealDamage(attFC,fc,attAt,'charmed attack',1,1,line);
          attFC.exhausted=true;attFC.hasAttacked=true;
          checkLose();render();
        });
      });
      return;
    }
    const isCS=attFC.card.id===52, csLine=attackerSeal.line;
    const isDK=attFC.card.id===63; // Dread Knight can attack Df Line directly
    // Standard line enforcement (skip for Centaur Scout cross-attacks and Dread Knight)
    if(!isCS&&!isDK&&line==='df'&&G.players[1].atLine.length>0){log('ต้องโจมตี At Line ของ AI ก่อน!','bad');return;}
    // Centaur Scout: At→Df, Df→At cross-line enforcement
    if(isCS&&csLine==='at'&&line==='at'&&G.players[1].dfLine.length>0){log(`Centaur Scout ต้องโจมตี Df Line ของ AI!`,'bad');return;}
    if(isCS&&csLine==='df'&&line==='df'&&G.players[1].atLine.length>0){log(`Centaur Scout ต้องโจมตี At Line ของ AI!`,'bad');return;}
    // Mysterious Elephant (id=42): fused Seals can't attack ME
    if(fc.card.id===42&&attFC.fused){log(`${attFC.card.name} รวมร่างอยู่ — ไม่สามารถโจมตี Mysterious Elephant ได้`,'bad');attackerSeal=null;render();return;}
    // Brigitte the Valkyrie (id=51): Seals with lower Sp can't attack
    if(fc.card.id===51&&getEffectiveSp(attFC)<getEffectiveSp(fc)){log(`${attFC.card.name} Sp น้อยกว่า Brigitte — โจมตีไม่ได้`,'bad');attackerSeal=null;render();return;}
    // Cerberus (id=49): can attack support seals inside fused enemies
    if(attFC.card.id===49&&!attFC.activeMultiAtk&&fc.fused&&fc.fusionStack.length>0&&pendingAttackIdx===null){
      showCerberusPicker(attFC,fc,line);return;
    }
    if(attFC.hitsLeft>0&&attFC.activeMultiAtk){
      executeMultiStrikeHit(attFC,fc,line);
    } else if(attFC.card.id===57&&pendingAttackIdx===null&&!attFC.hitsLeft){
      // Mor Mercenary: choose At or Df comparison
      showMorMercenaryPicker(attFC,fc,line);
    } else {
      resolveAttack(attFC,fc,pendingAttackIdx,line);
    }
    pendingAttackIdx=null;
  }
}

function showMorMercenaryPicker(attFC,defFC,defLine){
  const div=document.getElementById('atk-opts');
  div.innerHTML='<div style="font-size:9px;color:#fde68a;margin-bottom:4px">⚔ Mor Mercenary — เปรียบ At กับ?</div>';
  [{label:`At${getEffectiveAt(defFC)}`,stat:'at'},{label:`Df${getEffectiveDf(defFC)}`,stat:'df'}].forEach(({label,stat})=>{
    const btn=document.createElement('button');
    btn.className='atk-opt';
    btn.innerHTML=`เปรียบ vs ${defFC.card.name} [${label}]`;
    btn.onclick=()=>{
      closeAtkPanel();
      if(stat==='at'){resolveAttack(attFC,defFC,null,defLine);}
      else{
        // Attack comparing At vs target's Df
        const att=attFC.card, p=G.players[0];
        const maCost=Math.max(0,(att.ma||1)-getMysticMaReduction(attFC));
        if(p.mp<maCost){log(`Mp ไม่พอ (ต้องการ ${maCost})`,'bad');return;}
        p.mp-=maCost;
        const attAt=getEffectiveAt(attFC);
        showActionQueue(`${att.name} → ⚔ ${defFC.card.name} [Df]`,()=>{
          combatAnim(attFC,defFC,attAt,'df',false,()=>{
            dealDamage(attFC,defFC,attAt,'Mor Mercenary',0,1,'df');
            attFC.exhausted=true;attFC.hasAttacked=true;attackerSeal=null;
            checkLose();render();
          });
        });
      }
    };
    div.appendChild(btn);
  });
  document.getElementById('atk-panel').classList.add('show');
}

function getActiveAtks(fc){
  if(fc.fused&&fc.fusionAtks.length>0)return fc.fusionAtks;
  if(fc.willMind&&fc.card.fuse?.length)return fc.card.fuse.map(f=>f.atk).filter(Boolean);
  // Thunderia (64): while Thunderia is fused, own non-fused Beasts count as Double Combination
  if(!fc.fused&&fc.card.tribe==='Beast'&&fc.card.fuse?.length){
    const pi=_mysticOwnerPi(fc);
    if(pi>=0&&[...G.players[pi].atLine,...G.players[pi].dfLine].some(x=>x.card.id===64&&x.fused)){
      return fc.card.fuse.map(f=>f.atk).filter(Boolean);
    }
  }
  return [];
}

function executeAllAttack(attFC,atk){
  const p=G.players[0];
  if(p.mp<atk.mp){log(`Mp ไม่พอสำหรับ ${atk.name} (ต้องการ ${atk.mp})`,'bad');return;}
  showActionQueue(`${attFC.card.name} → <b>${atk.name}</b> (ALL)`,()=>{
    p.mp-=atk.mp;
    const attAt=atk.at??getEffectiveAt(attFC);
    log(`${attFC.card.name} ใช้ ${atk.name}! (ALL)`,'hi');
    const allTargets=[...G.players[1].atLine.map(fc=>({fc,line:'at'})),...G.players[1].dfLine.map(fc=>({fc,line:'df'}))];
    attFC.exhausted=true;attFC.hasAttacked=true;attackerSeal=null;pendingAttackIdx=null;
    animateAllTargets(attFC,allTargets,attAt,atk.name,0,1,()=>{checkLose();render();});
  });
}

function declareAttack(){
  if(!attackerSeal){log('Select a Seal first','');return;}
  const fc=attackerSeal.fc;
  if(fc.activeMultiAtk&&fc.hitsLeft>0){
    log(`${fc.card.name}: ${fc.activeMultiAtk.name} ×${fc.hitsLeft} เหลือ — เลือกเป้าหมาย`,'hi');
    render();return;
  }
  const fusionAtks=getActiveAtks(fc);
  if(fusionAtks.length>1){
    openFusionPicker(fusionAtks);
    return;
  } else if(fusionAtks.length===1){
    const atk=fusionAtks[0];
    if(atk.all){executeAllAttack(fc,atk);return;}
    pendingAttackIdx=0;
    log(`${fc.card.name} → ${atk.name}! เลือกเป้าหมาย`,'hi');
  } else if(fc.sevenSilverFree){
    log(`${fc.card.name} [Seven Silver 2nd] — คลิก Seal ศัตรูเพื่อโจมตีฟรี!`,'hi');
  } else {
    log('Click an enemy Seal to attack','hi');
  }
  render();
}

function openFusionPicker(fusionAtks){
  const div=document.getElementById('atk-opts');
  div.innerHTML='<div style="font-size:9px;color:#fde68a;margin-bottom:4px">⚡ เลือกท่าโจมตี</div>';
  fusionAtks.forEach((atk,i)=>{
    const btn=document.createElement('button');
    btn.className='atk-opt';
    const canAfford=G.players[0].mp>=atk.mp;
    btn.disabled=!canAfford;
    const val=[atk.at?`At${atk.at}`:'',atk.df?`Df${atk.df}`:''].filter(Boolean).join('/');
    btn.innerHTML=`${atk.name} <span>${val} Mp${atk.mp}${atk.all?' ALL':''}</span>`;
    btn.onclick=()=>{
      closeAtkPanel();
      if(atk.all){executeAllAttack(attackerSeal.fc,atk);return;}
      pendingAttackIdx=i;
      log(`${atk.name}! เลือกเป้าหมาย`,'hi');
      render();
    };
    div.appendChild(btn);
  });
  document.getElementById('atk-panel').classList.add('show');
}

function showCerberusPicker(attFC,mainFC,mainLine){
  const div=document.getElementById('atk-opts');
  div.innerHTML='<div style="font-size:9px;color:#fde68a;margin-bottom:4px">⚔ Cerberus — เลือกเป้าหมาย</div>';
  // Option: attack main seal
  const mainBtn=document.createElement('button');
  mainBtn.className='atk-opt';
  mainBtn.innerHTML=`${mainFC.card.name} <span>(Main) At${getEffectiveAt(mainFC)} Df${getEffectiveDf(mainFC)}</span>`;
  mainBtn.onclick=()=>{closeAtkPanel();resolveAttack(attFC,mainFC,pendingAttackIdx,mainLine);pendingAttackIdx=null;};
  div.appendChild(mainBtn);
  // Options: attack each support
  mainFC.fusionStack.forEach(matFC=>{
    const btn=document.createElement('button');
    btn.className='atk-opt';
    btn.innerHTML=`${matFC.card.name} <span>(Support) At${matFC.card.at}</span>`;
    btn.onclick=()=>{
      closeAtkPanel();
      showActionQueue(`${attFC.card.name} [Cerberus] ⚔ ${matFC.card.name} (Support)`,()=>{
        const p=G.players[0];const maCost=Math.max(0,(attFC.card.ma||1)-getMysticMaReduction(attFC));
        if(p.mp<maCost){log(`Mp ไม่พอ (ต้องการ ${maCost})`,'bad');return;}
        p.mp-=maCost;
        const attAt=getEffectiveAt(attFC);
        combatAnim(attFC,matFC,attAt,'at',false,()=>{
          // Support seal fight: at vs at
          const defAt=matFC.card.at;
          const attSp=getEffectiveSp(attFC),defSp=matFC.card.sp;
          const attWins=attAt>defAt||(attAt===defAt&&attSp>defSp);
          if(attWins){
            log(`${attFC.card.name}[At${attAt}] > ${matFC.card.name}[At${defAt}] → Support ถูกทำลาย!`,'good');
            const i=mainFC.fusionStack.findIndex(x=>x.uid===matFC.uid);
            if(i>=0){mainFC.fusionStack.splice(i,1);G.players[1].shrine.push(matFC.card);}
            mainFC.fusionAtks=getUnlockedAtks(mainFC);
            if(mainFC.fusionStack.length===0){mainFC.fused=false;mainFC.fusedSinceTurn=null;mainFC.wasMainFusedTurn=turnNum;}
          } else {
            log(`${attFC.card.name}[At${attAt}] ≤ ${matFC.card.name}[At${defAt}] → ${attFC.card.name} Shrine!`,'bad');
            sendToShrine(attFC,0);
          }
          attFC.exhausted=true;attFC.hasAttacked=true;attackerSeal=null;pendingAttackIdx=null;
          checkLose();render();
        });
      });
    };
    div.appendChild(btn);
  });
  document.getElementById('atk-panel').classList.add('show');
}

function openSpecialPanel(){
  if(!attackerSeal)return;
  const atks=getActiveAtks(attackerSeal.fc);
  if(!atks.length){
    const fc=attackerSeal.fc;
    if(!fc.fused&&fc.card.fuse&&fc.card.fuse.length)log(`${fc.card.name} ต้องรวมร่างก่อนถึงจะใช้ท่าพิเศษได้ (Main Phase)`,'');
    else log('ไม่มีท่าพิเศษ','');
    return;
  }
  const div=document.getElementById('atk-opts');
  div.innerHTML='';
  const isFuseAtk=attackerSeal.fc.fused&&attackerSeal.fc.fusionAtks.length>0;
  if(isFuseAtk){
    const label=document.createElement('div');
    label.style.cssText='font-size:9px;color:#fde68a;margin-bottom:4px';
    label.textContent='⚡ FUSION ATTACKS';
    div.appendChild(label);
  }
  atks.forEach((atk,i)=>{
    const btn=document.createElement('button');
    btn.className='atk-opt';
    const canAfford=G.players[0].mp>=atk.mp;
    btn.disabled=!canAfford;
    btn.innerHTML=`${atk.name} <span>At${atk.at} | Mp${atk.mp}${atk.all?' ALL':''}</span>`;
    btn.onclick=()=>{
      pendingAttackIdx=i;
      closeAtkPanel();
      log(`Charged ${atk.name}! Click target`,'hi');
      render();
    };
    div.appendChild(btn);
  });
  document.getElementById('atk-panel').classList.add('show');
}

function closeAtkPanel(){document.getElementById('atk-panel').classList.remove('show');}
function cancelAtkPanel(){closeAtkPanel();pendingAttackIdx=null;}

function resolveAttack(attFC,defFC,specialAtkIdx,defLine='at'){
  const att=attFC.card;
  const p=G.players[0];
  let attAt=getEffectiveAt(attFC), atkLabel='normal attack';
  let maCost=attFC.sevenSilverFree?0:Math.max(0,(att.ma||1)-getMysticMaReduction(attFC));
  let usedAtk=null;

  if(specialAtkIdx!==null){
    const pool=getActiveAtks(attFC);
    const sa=pool[specialAtkIdx];
    if(!sa)return;
    if(p.mp<sa.mp){log(`Mp ไม่พอสำหรับ ${sa.name} (ต้องการ ${sa.mp})`,'bad');return;}
    p.mp-=sa.mp;
    attAt=sa.at??getEffectiveAt(attFC);
    atkLabel=sa.name;
    usedAtk=sa;
    if(sa.all){
      showActionQueue(`${att.name} → <b>${atkLabel}</b> (ALL)`,()=>{
        if(attFC.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${att.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'bad');attackerSeal=null;render();return;}
        log(`${att.name} ใช้ ${atkLabel}! (ALL enemies)`,'hi');
        const allTargets=[...G.players[1].atLine.map(fc=>({fc,line:'at'})),...G.players[1].dfLine.map(fc=>({fc,line:'df'}))];
        attFC.exhausted=true;attFC.hasAttacked=true;attackerSeal=null;pendingAttackIdx=null;
        animateAllTargets(attFC,allTargets,attAt,atkLabel,0,1,()=>{checkLose();render();});
      });
      return;
    }
  } else {
    if(p.mp<maCost){log(`Mp ไม่พอในการโจมตี (ต้องการ ${maCost})`,'bad');return;}
    p.mp-=maCost;
  }
  showActionQueue(`${att.name} → <b>${atkLabel}</b> ⚔ ${defFC.card.name}`,()=>{
    if(attFC.curses?.some(c=>c.type==='stone'||c.type==='freeze')){
      log(`${att.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'bad');
      attackerSeal=null;render();return;
    }
    const hitLabel=usedAtk?.hits>1?` (1/${usedAtk.hits})`:'';
    log(`${att.name} → ${atkLabel}${hitLabel}!`,'hi');
    combatAnim(attFC,defFC,attAt,defLine,false,()=>{
      dealDamage(attFC,defFC,attAt,atkLabel,0,1,defLine);
      if(usedAtk?.hits>1){
        attFC.activeMultiAtk={...usedAtk};
        attFC.hitsLeft=usedAtk.hits-1;
        log(`${att.name} ยังตีได้อีก ${usedAtk.hits-1} ครั้ง! เลือกการ์ด แล้วเลือกเป้าหมาย`,'hi');
        attackerSeal=null;
      } else {
        // Felasia Dragon (60): 2 attacks when fused with Dragon
        const felasiaAlive=!usedAtk&&att.id===60&&attFC.fused&&
          attFC.fusionStack.some(m=>m.card.tribe==='Dragon')&&
          [...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.uid===attFC.uid);
        const sevenSilverAlive=hasMysticDoubleAtk(attFC)&&!attFC.hasAttacked&&!attFC.sevenSilverFree&&
          [...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.uid===attFC.uid);
        if(felasiaAlive&&!attFC.hasAttacked){
          attFC.activeMultiAtk={name:'Dragon Double',at:getEffectiveAt(attFC),mp:0,hits:2};
          attFC.hitsLeft=1;
          log(`${att.name} [Ability]: รวมร่างกับมังกร — โจมตีได้อีกครั้ง!`,'hi');
          attackerSeal=null;
        } else if(sevenSilverAlive){
          attFC.hasAttacked=true;
          attFC.sevenSilverFree=true;
          log(`${att.name} [Seven Silver]: โจมตีได้อีกครั้ง (ฟรี)! เลือก ${att.name} แล้วตีเลย`,'hi');
          attackerSeal=null;
        } else {
          attFC.exhausted=true;attFC.hasAttacked=true;attFC.sevenSilverFree=false;attackerSeal=null;
        }
      }
      checkLose();render();
    });
  });
}

function executeMultiStrikeHit(attFC,defFC,defLine){
  const atk=attFC.activeMultiAtk;
  const attAt=atk.at??getEffectiveAt(attFC);
  const hitNum=atk.hits-attFC.hitsLeft+1;
  attackerSeal=null;
  showActionQueue(`${attFC.card.name} → <b>${atk.name}</b> ⚔ ${defFC.card.name} (${hitNum}/${atk.hits})`,()=>{
    log(`${attFC.card.name}: ${atk.name} (${hitNum}/${atk.hits})!`,'hi');
    combatAnim(attFC,defFC,attAt,defLine,false,()=>{
      dealDamage(attFC,defFC,attAt,atk.name,0,1,defLine);
      attFC.hitsLeft--;
      if(attFC.hitsLeft<=0){
        attFC.exhausted=true;attFC.hasAttacked=true;attFC.activeMultiAtk=null;
        log(`${attFC.card.name} exhausted`,'');
      } else {
        log(`ยังตีได้อีก ${attFC.hitsLeft} ครั้ง! เลือกการ์ดตัวเอง แล้วเลือกเป้าหมาย`,'hi');
      }
      checkLose();render();
    });
  });
}

function combatAnim(attFC,defFC,attAt,defLine,isAll,callback){
  attAt=applyPassiveAbilities(attFC,defFC,attAt);
  const defStat=getDefStatWithPassive(defFC,attFC,defLine);
  const attSp=getEffectiveSp(attFC), defSp=getEffectiveSp(defFC);
  const attWins=attAt>defStat||(attAt===defStat&&attSp>defSp);
  const isTie=attAt===defStat;
  const attPan=document.getElementById('ca-att-panel');
  const defPan=document.getElementById('ca-def-panel');
  attPan.classList.remove('ca-dead');defPan.classList.remove('ca-dead');
  document.getElementById('ca-att-img').src=attFC.card.img;
  document.getElementById('ca-att-name').textContent=attFC.card.name;
  document.getElementById('ca-def-img').src=defFC.card.img;
  document.getElementById('ca-def-name').textContent=defFC.card.name;
  document.getElementById('ca-result').textContent='';
  const modal=document.getElementById('combat-anim');
  modal.style.display='flex';
  setTimeout(()=>{
    playSound('Damage');
    if(attWins){
      defPan.classList.add('ca-dead');
      const note=isTie?` (Spd ${attSp}>${defSp})`:'';
      document.getElementById('ca-result').textContent=`${defFC.card.name} destroyed!${note}`;
    } else if(!isAll){
      attPan.classList.add('ca-dead');
      const note=isTie?` (Spd ${defSp}>=${attSp})`:'';
      document.getElementById('ca-result').textContent=`${attFC.card.name} destroyed!${note}`;
    } else {
      document.getElementById('ca-result').textContent='Blocked!';
    }
    setTimeout(()=>{modal.style.display='none';callback();},600);
  },500);
}

function handAttackAnim(attFC,revealCard,callback){
  const attPan=document.getElementById('ca-att-panel');
  const defPan=document.getElementById('ca-def-panel');
  attPan.classList.remove('ca-dead');defPan.classList.remove('ca-dead');
  document.getElementById('ca-att-img').src=attFC.card.img;
  document.getElementById('ca-att-name').textContent=attFC.card.name;
  document.getElementById('ca-def-img').src='cardback/seal.jpg';
  document.getElementById('ca-def-name').textContent='???';
  document.getElementById('ca-result').textContent='';
  const modal=document.getElementById('combat-anim');
  modal.style.display='flex';
  setTimeout(()=>{
    playSound('Damage');
    document.getElementById('ca-def-img').src=revealCard.img;
    document.getElementById('ca-def-name').textContent=revealCard.name;
    defPan.classList.add('ca-dead');
    document.getElementById('ca-result').textContent=`${revealCard.name} sent to Shrine!`;
    setTimeout(()=>{modal.style.display='none';callback();},600);
  },500);
}

function animateAllTargets(attFC,targets,attAt,atkName,attPi,defPi,onDone){
  function next(i){
    if(i>=targets.length){onDone();return;}
    const {fc:defFC,line:defLine}=targets[i];
    const stillHere=[...G.players[defPi].atLine,...G.players[defPi].dfLine].some(x=>x.uid===defFC.uid);
    if(!stillHere){next(i+1);return;}
    combatAnim(attFC,defFC,attAt,defLine,true,()=>{
      dealDamage(attFC,defFC,attAt,atkName,attPi,defPi,defLine,true);
      render();next(i+1);
    });
  }
  next(0);
}

function getEffectiveEl(fc){return fc.magicalEl||fc.card.el;}

function getEffectiveAt(fc){
  let base=fc.card.at;
  if(fc.fused&&fc.fusionAtks.length){
    const best=fc.fusionAtks.filter(a=>a.at).sort((a,b)=>b.at-a.at)[0];
    if(best)base=best.at;
  }
  if(fc.atBoosts?.length)base+=fc.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn).reduce((s,b)=>s+b.amount,0);
  if(fc.curses?.length)base+=fc.curses.filter(c=>c.type==='lastDance').reduce((s,c)=>s+(c.atBonus||0),0);
  // Context-sensitive passives
  let ownerPi=-1;
  for(let pi=0;pi<2;pi++){if([...G.players[pi].atLine,...G.players[pi].dfLine].some(x=>x.uid===fc.uid)){ownerPi=pi;break;}}
  if(ownerPi>=0){
    const own=G.players[ownerPi],opp=G.players[1-ownerPi];
    const ownField=[...own.atLine,...own.dfLine],oppField=[...opp.atLine,...opp.dfLine];
    // Evil Fire Warrior (62): +3 if enemy has more seals, -3 if fewer
    if(fc.card.id===62){if(oppField.length>ownField.length)base+=3;else if(oppField.length<ownField.length)base-=3;}
    // Salamandera (83): +ownAtLine, -enemyAtLine
    if(fc.card.id===83)base+=own.atLine.length-opp.atLine.length;
    // Divine Dragon (86): +enemy count
    if(fc.card.id===86)base+=oppField.length;
    // Golden Fur Griffin (79): +N other own Beasts
    if(fc.card.id===79)base+=ownField.filter(x=>x.uid!==fc.uid&&x.card.tribe==='Beast').length;
    // Undine (81) passive: other own seals +At 1
    if(fc.card.id!==81&&ownField.some(x=>x.card.id===81))base+=1;
    // Black Night Griffin (55): other own Beast seals +At 1
    if(fc.card.id!==55&&fc.card.tribe==='Beast'&&ownField.some(x=>x.card.id===55))base+=1;
    // Nerimor Princess Wands (92): own Fire +At 1 when Nerimor in Df Line
    if(fc.card.id!==92&&fc.card.el==='fire'&&own.dfLine.some(x=>x.card.id===92))base+=1;
  }
  base+=getMysticAtBonus(fc);
  return Math.max(0,base);
}
function getEffectiveDf(fc){
  let base=fc.card.df;
  if(fc.fused&&fc.fusionAtks.length){
    const best=fc.fusionAtks.filter(a=>a.df).sort((a,b)=>b.df-a.df)[0];
    if(best)base=best.df;
  }
  if(fc.dfBoosts?.length)base+=fc.dfBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn).reduce((s,b)=>s+b.amount,0);
  let ownerPi=-1;
  for(let pi=0;pi<2;pi++){if([...G.players[pi].atLine,...G.players[pi].dfLine].some(x=>x.uid===fc.uid)){ownerPi=pi;break;}}
  if(ownerPi>=0){
    const own=G.players[ownerPi];
    const ownField=[...own.atLine,...own.dfLine];
    // Golden Fur Griffin (79): -N other own Beasts
    if(fc.card.id===79)base-=ownField.filter(x=>x.uid!==fc.uid&&x.card.tribe==='Beast').length;
    // Undine (81) passive: other own seals +Df 2
    if(fc.card.id!==81&&ownField.some(x=>x.card.id===81))base+=2;
    // Nerimor Princess Wands (92): own Fire -Df 3 when Nerimor in Df Line
    if(fc.card.id!==92&&fc.card.el==='fire'&&own.dfLine.some(x=>x.card.id===92))base-=3;
    // Yggdrasil (77): other seals in same Df Line get Df=11
    if(fc.card.id!==77&&own.dfLine.some(x=>x.uid===fc.uid)&&own.dfLine.some(x=>x.card.id===77))base=11;
  }
  base+=getMysticDfBonus(fc);
  return Math.max(0,base);
}
function getEffectiveSp(fc){
  if(fc.fused&&fc.fusionAtks.length){
    const best=fc.fusionAtks.filter(a=>a.sp!=null).sort((a,b)=>b.sp-a.sp)[0];
    if(best)return best.sp;
  }
  // Coy Crab (id=14): if 2+ Coy Crabs on player field, all enemy Seals Sp = 0
  const isEnemy=[...G.players[1].atLine,...G.players[1].dfLine].some(x=>x.uid===fc.uid);
  if(isEnemy){
    const coyCrabs=[...G.players[0].atLine,...G.players[0].dfLine].filter(x=>x.card.id===14).length;
    if(coyCrabs>=2)return 0;
  }
  // Akim (id=23): while fused, all own Seals Sp = 4
  const isPlayer=[...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.uid===fc.uid);
  if(isPlayer&&[...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.card.id===23&&x.fused))return 4;
  if(isEnemy&&[...G.players[1].atLine,...G.players[1].dfLine].some(x=>x.card.id===23&&x.fused))return 4;
  // Yggdrasil (77): other seals in same Df Line get Sp=0
  if(fc.card.id!==77){
    if(isPlayer&&G.players[0].dfLine.some(x=>x.uid===fc.uid)&&G.players[0].dfLine.some(x=>x.card.id===77))return 0;
    if(isEnemy&&G.players[1].dfLine.some(x=>x.uid===fc.uid)&&G.players[1].dfLine.some(x=>x.card.id===77))return 0;
  }
  let baseSp=fc.card.sp;
  if(fc.spBoosts?.length)baseSp+=fc.spBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn).reduce((s,b)=>s+b.amount,0);
  // Blue Wind Griffin (59): other own Beasts +Sp 1
  if(isPlayer&&fc.card.tribe==='Beast'&&fc.card.id!==59&&[...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.card.id===59))baseSp++;
  if(isEnemy&&fc.card.tribe==='Beast'&&fc.card.id!==59&&[...G.players[1].atLine,...G.players[1].dfLine].some(x=>x.card.id===59))baseSp++;
  baseSp+=getMysticSpBonus(fc);
  return Math.max(0,baseSp);
}

function applyPassiveAbilities(attFC,defFC,attAt){
  if(attFC.card.id===85&&defFC.card.el==='light')attAt=Math.max(0,attAt-3);
  // Scalo (id=10): when attacking a fused Seal, use Df if Df > At
  if(attFC.card.id===10&&defFC.fused){
    const scaloDf=getEffectiveDf(attFC);
    if(scaloDf>attAt)attAt=scaloDf;
  }
  // Hydra of Warok (id=50): At -3 when fighting Earth
  if(attFC.card.id===50&&defFC.card.el==='earth')attAt=Math.max(0,attAt-3);
  // Wool Wyvern (id=80): At -2 when fighting Fire
  if(attFC.card.id===80&&defFC.card.el==='fire')attAt=Math.max(0,attAt-2);
  // Jormungand (id=84): At -3 when fighting Earth
  if(attFC.card.id===84&&defFC.card.el==='earth')attAt=Math.max(0,attAt-3);
  // Python (id=73): At -3 when fighting Wind
  if(attFC.card.id===73&&defFC.card.el==='wind')attAt=Math.max(0,attAt-3);
  // Divine Dragon (id=86): At -2 when fighting Knight tribe
  if(attFC.card.id===86&&defFC.card.tribe==='Knight')attAt=Math.max(0,attAt-2);
  // Centaur Ranger (id=9): At +2 when attacking a Seal with lower Sp
  if(attFC.card.id===9&&getEffectiveSp(defFC)<getEffectiveSp(attFC))attAt+=2;
  // Sigmund 3rd (id=89): attacker At ignores benefit; but we apply to attacker side here as AT boost
  return attAt;
}
function getDefStatWithPassive(defFC,attFC,defLine){
  let s=defLine==='at'?getEffectiveAt(defFC):getEffectiveDf(defFC);
  // Python (73): always defends with Df regardless of line
  if(defFC.card.id===73)s=getEffectiveDf(defFC);
  if(defFC.card.id===85&&attFC.card.el==='light')s=Math.max(0,s-3);
  // Magamouth (id=13): Df +1 when fighting a fused attacker
  if(defFC.card.id===13&&attFC.fused)s+=1;
  // Sigmund 3rd (id=89): defender Df -2 when defender's Sp < Sigmund's Sp
  if(attFC.card.id===89&&getEffectiveSp(defFC)<getEffectiveSp(attFC))s=Math.max(0,s-2);
  return s;
}

function dealDamage(attFC,defFC,attAt,label,attPi=0,defPi=1,defLine='at',isAll=false){
  const att=attFC.card, def=defFC.card;
  attAt=applyPassiveAbilities(attFC,defFC,attAt);
  const defStat=getDefStatWithPassive(defFC,attFC,defLine);
  const defLabel=defLine==='at'?`At${defStat}`:`Df${defStat}`;
  const lineNote=defLine==='at'?'(At↔At)':'(At↔Df)';
  const attSp=getEffectiveSp(attFC), defSp=getEffectiveSp(defFC);
  const attWins=attAt>defStat||(attAt===defStat&&attSp>defSp);
  if(attWins){
    const spdStr=attAt===defStat?` Spd${attSp}>${defSp}`:'';
    log(`${att.name}[At${attAt}]${spdStr} > ${def.name}[${defLabel}] ${lineNote} → ${def.name} Shrine! +Lv${def.lv}`,'good');
    sendToShrine(defFC,defPi);
    // Stone Lizard (id=43): after successful attack → Stone Curse self until next battle sub-turn
    if(attFC.card.id===43){
      attFC.curses=(attFC.curses||[]);
      if(!attFC.curses.some(c=>c.type==='stone'))attFC.curses.push({type:'stone',expiresAtSubTurn:subTurnNum+4});
      log(`🪨 Stone Lizard ติด Stone Curse หลังโจมตีสำเร็จ`,'');
    }
  } else if(isAll){
    log(`${att.name}[At${attAt}] ≤ ${def.name}[${defLabel}] → blocked`,'');
  } else if(defLine==='df'){
    const spdStr=attAt===defStat?` Spd${defSp}>=${attSp}`:'';
    log(`${att.name}[At${attAt}]${spdStr} ≤ ${def.name}[${defLabel}] (At↔Df) → blocked (Df Line ไม่ตีสวน)`,'');
  } else {
    const spdStr=attAt===defStat?` Spd${defSp}>=${attSp}`:'';
    if(hasMysticProtect(attFC)){
      log(`${att.name}[At${attAt}]${spdStr} ≤ ${def.name}[${defLabel}] ${lineNote} → blocked (Silent Prohibitor ป้องกัน counter-attack!)`,'');
    } else {
      log(`${att.name}[At${attAt}]${spdStr} ≤ ${def.name}[${defLabel}] ${lineNote} → ${att.name} Shrine!`,'bad');
      sendToShrine(attFC,attPi);
    }
  }
}

function destroyByEffect(fc,ownerPi){
  playSound('Card destroyed by effect');
  sendToShrine(fc,ownerPi);
}

function sendToShrine(fc,ownerPi){
  // Charmed card always goes to original owner's shrine
  if(fc.charmed&&fc.charmed.originalPi!==undefined)ownerPi=fc.charmed.originalPi;
  const p=G.players[ownerPi];
  const op=G.players[1-ownerPi];
  const rm=arr=>{const i=arr.findIndex(x=>x.uid===fc.uid);if(i>=0)arr.splice(i,1);};
  rm(p.atLine);rm(p.dfLine);rm(op.atLine);rm(op.dfLine);
  p.shrine.push(fc.card);
  if(fc.fused&&fc.fusionStack.length>0){
    fc.fusionStack.forEach(mfc=>{
      p.shrine.push(mfc.card);
      log(`${mfc.card.name} also sent to shrine (fusion collapse)`,'bad');
    });
  }
  // Dark Destiny (72): when sent to shrine, owner must discard 1 mystic from hand
  if(fc.card.id===72){
    const owner=G.players[ownerPi];
    if((owner.mysticHand||[]).length>0){
      if(ownerPi===0){
        setTimeout(()=>{
          document.getElementById('fa-title').textContent='Dark Destiny [Ability]: ต้องทิ้ง Mystic 1 ใบ';
          const opts=document.getElementById('fa-opts');opts.innerHTML='';
          owner.mysticHand.forEach((mc,i)=>{
            addFAOpt(`ทิ้ง ${mc.name}`,()=>{
              closeFAModal();
              owner.mysticHand.splice(i,1);
              log(`Dark Destiny [Ability]: ทิ้ง Mystic ${mc.name}!`,'bad');
              render();
            });
          });
          document.getElementById('fa-modal').classList.add('show');
        },300);
      } else {
        const mc=owner.mysticHand.splice(Math.floor(Math.random()*owner.mysticHand.length),1)[0];
        log(`Dark Destiny [Ability]: AI ทิ้ง Mystic ${mc.name}!`,'bad');
      }
    }
  }
  // Volcanic Minotaur (id=8): when sent to shrine from field, all opponent Seals break fusion
  if(fc.card.id===8){
    const opponent=G.players[1-ownerPi];
    let broke=false;
    [...opponent.atLine,...opponent.dfLine].forEach(ofc=>{
      if(!ofc.fused)return;
      ofc.fusionStack.forEach(mfc=>{opponent.atLine.push(mfc);});
      ofc.fusionStack=[];ofc.fusionAtks=[];ofc.fused=false;ofc.fusedSinceTurn=null;ofc.wasMainFusedTurn=turnNum;
      broke=true;
    });
    if(broke)log(`☄ Volcanic Minotaur: Seal ฝ่ายตรงข้ามแยกการรวมร่างทั้งหมด!`,'bad');
  }
}

function shrineTotal(pi){return G.players[pi].shrine.reduce((s,c)=>s+c.lv,0);}

function checkLose(){
  for(let pi=0;pi<2;pi++){
    if(shrineTotal(pi)>=MAX_SHRINE){showWin(1-pi);return;}
    if(!G.players[pi].deck.length&&!G.players[pi].hand.length){showWin(1-pi);return;}
  }
}

function showWin(pi){
  document.getElementById('win-title').textContent=pi===0?'YOU WIN!':'YOU LOSE!';
  document.getElementById('win-sub').textContent=pi===0?'Enemy shrine overflowed!':'Your shrine overflowed!';
  document.getElementById('win-screen').classList.add('show');
  if(pi===0){
    const bgm=document.getElementById('bgm');
    if(bgm){bgm.pause();bgm.currentTime=0;}
    const win=new Audio('SoundEffect/music/Summoner Win Chime.mp3');
    win.volume=parseFloat(localStorage.getItem('bgm_volume')||'0.5');
    win.play().catch(()=>{});
  }
}

// ══════════════════════════════════════════════
// AI TURN — step by step with preview
// ══════════════════════════════════════════════
function aiTurn(){
  const ai=G.players[1];

  // Build deploy list
  const toPlay=[];
  let tempMp=ai.mp, atLen=ai.atLine.length;
  const sorted=[...ai.hand].sort((a,b)=>b.lv-a.lv);
  for(const card of sorted){
    if(tempMp<card.mc)continue;
    toPlay.push({card,line:'at'});tempMp-=card.mc;atLen++;
  }

  function doAIFuse(callback){
    const pairs=[];
    const usedUids=new Set();
    for(const mainFC of [...ai.atLine]){
      if(mainFC.fused||!mainFC.card.fuse?.length)continue;
      if(usedUids.has(mainFC.uid))continue;  // already committed as someone's material
      const mats=[...ai.dfLine,...ai.atLine].filter(m=>{
        if(m.uid===mainFC.uid||m.fused||usedUids.has(m.uid)||newFromHand(m))return false;
        if(m.wasMainFusedTurn===turnNum)return false;
        return fuseMaterialHelps(mainFC,m.card);
      });
      if(!mats.length)continue;
      pairs.push({mainFC,mat:mats[0]});
      usedUids.add(mats[0].uid);
      usedUids.add(mainFC.uid);  // mainFC can't also become a material
    }
    function doFusePair(idx){
      if(idx>=pairs.length){callback();return;}
      const {mainFC,mat}=pairs[idx];
      // Safety: verify mainFC is still on field (wasn't consumed in a prior pair)
      const stillOnField=[...ai.atLine,...ai.dfLine].some(fc=>fc.uid===mainFC.uid);
      if(!stillOnField){doFusePair(idx+1);return;}
      updateAIPreview(mainFC.card,'⚡ Fusing...');
      showActionQueue(`🤖 รวมร่าง <b>${mainFC.card.name}</b> + ${mat.card.name}`,()=>{
        // Guard: mainFC could be destroyed by Gale Garuda interfere
        const stillThere=[...ai.atLine,...ai.dfLine].some(x=>x.uid===mainFC.uid);
        if(!stillThere){doFusePair(idx+1);return;}
        // Guard: mainFC stoned = can't act; mat cursed = can't be support seal
        if(mainFC.curses?.some(c=>c.type==='stone')){
          log(`AI: รวมร่างล้มเหลว — ${mainFC.card.name} ติด Stone Curse ระหว่างประกาศ`,'');
          doFusePair(idx+1);return;
        }
        const matStillValid=[...ai.atLine,...ai.dfLine].some(x=>x.uid===mat.uid)&&!(mat.curses?.length>0);
        if(!matStillValid){
          log(`AI: รวมร่างล้มเหลว — ${mat.card.name} ถูก Curse ระหว่างประกาศ`,'');
          doFusePair(idx+1);return;
        }
        const removeFrom=arr=>{const i=arr.findIndex(x=>x.uid===mat.uid);if(i>=0)arr.splice(i,1);};
        removeFrom(ai.atLine);removeFrom(ai.dfLine);
        mainFC.fusionStack.push(mat);
        mainFC.fusionAtks=getUnlockedAtks(mainFC);
        mainFC.fused=true;
        playSound('Fusion Complete');
        if(!mainFC.fusedSinceTurn)mainFC.fusedSinceTurn=turnNum;
        const atkNames=mainFC.fusionAtks.map(a=>a.name).join(', ')||'(accumulating)';
        log(`AI: ${mainFC.card.name} + ${mat.card.name} → ${atkNames}`);
        render();
        doFusePair(idx+1);
      },mainFC);
    }
    doFusePair(0);
  }

  function getAICardSkill(fc){
    const player=G.players[0];
    const allPlayer=[...player.atLine,...player.dfLine];
    const allAI=[...ai.atLine,...ai.dfLine];
    const id=fc.card.id;
    // Infernos (id=6): LastDance on player card sp 3-5, fused with dark + at line
    if(id===6&&fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness')&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance'));
      if(t)return{mp:2,label:'Last Dance Curse',execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'lastDance',atBonus:2,expiresAtSubTurn:subTurnNum+4});
        log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Last Dance Curse At+2 / 2 Turn!`,'bad');
      }};
    }
    // Desert Chimera (id=7): Poison on player card, fused + at line
    if(id===7&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>!t.curses?.some(c=>c.type==='poison'));
      if(t)return{mp:2,label:'Poison Curse',execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+6});
        log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Poison Curse 3 Turn!`,'bad');
      }};
    }
    // Cockatrice (id=11): Stone on player card sp 1-4, fused
    if(id===11&&fc.fused&&ai.mp>=2){
      const t=allPlayer.find(t=>[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='stone'));
      if(t)return{mp:2,label:'Stone Curse',execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'stone',expiresAtSubTurn:subTurnNum+2});
        log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Stone Curse 1 Turn!`,'bad');
      }};
    }
    // Jiu Wei Hu Le (id=12): Charm on player card sp 1-3, fused with dark
    if(id===12&&fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness')&&ai.mp>=2){
      const t=allPlayer.find(t=>[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='charm'));
      if(t){
        const fromLine=player.atLine.includes(t)?'atLine':'dfLine';
        return{mp:2,label:'Charm Curse',execute:()=>{
          t.charmed={originalPi:0,originalLine:fromLine};
          t.curses=(t.curses||[]);t.curses.push({type:'charm',expiresAtSubTurn:subTurnNum+6});
          t.exhausted=false;t.hasUsedSkill=false;
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Charm Curse 3 Turn!`,'bad');
        }};
      }
    }
    // Armadillon (id=15): Freeze on player card sp 2-4, fused + at line
    if(id===15&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>[2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='freeze'));
      if(t){
        const fromLine=player.atLine.includes(t)?'atLine':'dfLine';
        return{mp:2,label:'Freeze Curse',execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'freeze',expiresAtSubTurn:subTurnNum+2});
          if(fromLine==='atLine'){const i=player.atLine.findIndex(x=>x.uid===t.uid);
            if(i>=0){player.atLine.splice(i,1);player.dfLine.push(t);}}
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Freeze Curse 1 Turn!`,'bad');
        }};
      }
    }
    // Assassin Doll (id=46): Death Curse on lowest-At player card, At Line, 2+ player seals
    if(id===46&&ai.atLine.some(x=>x.uid===fc.uid)&&allPlayer.length>=2&&ai.mp>=2){
      const minAt=Math.min(...allPlayer.map(x=>getEffectiveAt(x)));
      const t=allPlayer.find(x=>getEffectiveAt(x)===minAt);
      if(t)return{mp:2,label:'Death Curse',execute:()=>{
        destroyByEffect(t,0);
        log(`AI: ${fc.card.name} [Skill] ☠ Death Curse → ${t.card.name} ถูกทำลาย!`,'bad');
      }};
    }
    // Punishula (id=5): destroy Evil on player field, at line
    if(id===5&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=3){
      const t=allPlayer.find(t=>t.card.tribe==='Evil');
      if(t)return{mp:3,label:'Destroy Evil',execute:()=>{
        destroyByEffect(t,0);
        log(`AI: ${fc.card.name} [Skill] → ${t.card.name} ถูกทำลาย!`,'bad');
      }};
    }
    // Ghost Ship (id=16): return self to deck, Double Combination (1 material), Mp 0
    if(id===16&&fc.fused&&fc.fusionStack.length>=1){
      return{mp:0,label:'Return to deck',execute:()=>{
        fc.fusionStack.forEach(mfc=>{ai.atLine.push(mfc);});
        const rmA=ai.atLine.findIndex(x=>x.uid===fc.uid);if(rmA>=0)ai.atLine.splice(rmA,1);
        const rmD=ai.dfLine.findIndex(x=>x.uid===fc.uid);if(rmD>=0)ai.dfLine.splice(rmD,1);
        ai.deck.push(fc.card);shuffle(ai.deck);
        log(`AI: ${fc.card.name} [Skill]: กลับสู่กองและสลับ`,'');
      }};
    }
    // Golden Horn Unicorn (id=2): heal own cursed card
    if(id===2&&ai.mp>=1){
      const t=allAI.find(t=>t.curses?.length>0);
      if(t)return{mp:1,label:'Heal Curse',execute:()=>{
        t.curses=[];
        log(`AI: ${fc.card.name} [Skill] → ${t.card.name} หาย Curse ทุกชนิด!`,'');
      }};
    }
    // Banshee (id=28): Death Curse Sp 1-3, fused+dark+at line, Mp 3
    if(id===28&&fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness')&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=3){
      const t=allPlayer.find(t=>[1,2,3].includes(t.card.sp));
      if(t)return{mp:3,label:'Death Curse',execute:()=>{
        sendToShrine(t,0);
        log(`AI: ${fc.card.name} [Skill] ☠ Death Curse → ${t.card.name} ถูกทำลาย!`,'bad');
      }};
    }
    // Mysterious Elephant (id=42): Poison 1 Turn Sp 2-5, fused+at line, Mp 3
    if(id===42&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=3){
      const t=allPlayer.find(t=>[2,3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison'));
      if(t)return{mp:3,label:'Poison Curse 1 Turn',execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+2});
        log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Poison Curse 1 Turn!`,'bad');
      }};
    }
    // Hydra of Warok (id=50): Poison 2 Turn Sp 3-5, fused+at line, Mp 2
    if(id===50&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison'));
      if(t)return{mp:2,label:'Poison Curse 2 Turn',execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+4});
        log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Poison Curse 2 Turn!`,'bad');
      }};
    }
    // Black Wiser (41): drain player Mp, prefer 2-drain if fused with Hellish Bird
    if(id===41&&player.mp>0){
      const hasDrainPlus=fc.fused&&fc.fusionStack.some(m=>m.card.id===44)&&ai.mp>=3;
      if(hasDrainPlus)return{mp:3,label:'Player Mp -2',execute:()=>{
        player.mp=Math.max(0,player.mp-2);
        log(`AI: ${fc.card.name} [Skill] → ผู้เล่น Mp -2!`,'bad');
      }};
      if(ai.mp>=2)return{mp:2,label:'Player Mp -1',execute:()=>{
        player.mp=Math.max(0,player.mp-1);
        log(`AI: ${fc.card.name} [Skill] → ผู้เล่น Mp -1!`,'bad');
      }};
    }
    // Hellish Bird (44): Last Dance Curse on player seal
    if(id===44){
      const atLine=ai.atLine.some(x=>x.uid===fc.uid);
      const fusedBW=fc.fused&&fc.fusionStack.some(m=>m.card.id===41);
      const fusedDark=fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness');
      if(fusedBW&&atLine&&ai.mp>=3){
        const t=allPlayer.find(t=>[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance'));
        if(t)return{mp:3,label:'Last Dance At+3/2T',execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'lastDance',atBonus:3,expiresAtSubTurn:subTurnNum+4});
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Last Dance At+3 / 2T!`,'bad');
        }};
      }
      if(fusedDark&&atLine&&ai.mp>=2){
        const t=allPlayer.find(t=>[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance'));
        if(t)return{mp:2,label:'Last Dance At+2/3T',execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'lastDance',atBonus:2,expiresAtSubTurn:subTurnNum+6});
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Last Dance At+2 / 3T!`,'bad');
        }};
      }
    }
    // Succubus (45): Charm Curse 1T on non-Light player seal, fused + at line
    if(id===45&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>t.card.el!=='light'&&!t.curses?.some(c=>c.type==='charm'));
      if(t){const fromLine=player.atLine.some(x=>x.uid===t.uid)?'atLine':'dfLine';
        return{mp:2,label:'Charm Curse 1T',execute:()=>{
          t.charmed={originalPi:0,originalLine:fromLine};
          t.curses=(t.curses||[]);t.curses.push({type:'charm',expiresAtSubTurn:subTurnNum+2});
          t.exhausted=false;t.hasUsedSkill=false;
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Charm Curse 1T!`,'bad');
        }};
      }
    }
    // Medusa (48): Stone ∞ (Earth Mp3) or Poison 3T (Water Mp2)
    if(id===48){
      if(fc.fused&&fc.fusionStack.some(m=>m.card.el==='earth')&&ai.mp>=3){
        const t=allPlayer.find(t=>[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='stone'));
        if(t)return{mp:3,label:'Stone Curse ∞',execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'stone',expiresAtSubTurn:Infinity});
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Stone Curse ∞!`,'bad');
        }};
      }
      if(fc.fused&&fc.fusionStack.some(m=>m.card.el==='water')&&ai.mp>=2){
        const t=allPlayer.find(t=>[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison'));
        if(t)return{mp:2,label:'Poison Curse 3T',execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+6});
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Poison Curse 3T!`,'bad');
        }};
      }
    }
    // Siren (58): Charm Curse 2T on player seal sp 3-5, fused+Dark+at line
    if(id===58&&fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness')&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='charm'));
      if(t){const fromLine=player.atLine.some(x=>x.uid===t.uid)?'atLine':'dfLine';
        return{mp:2,label:'Charm Curse 2T',execute:()=>{
          t.charmed={originalPi:0,originalLine:fromLine};
          t.curses=(t.curses||[]);t.curses.push({type:'charm',expiresAtSubTurn:subTurnNum+4});
          t.exhausted=false;t.hasUsedSkill=false;
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Charm Curse 2T!`,'bad');
        }};
      }
    }
    // Harison (88): destroy Stone-cursed seal, at line, Mp 3 — prefer enemy seals
    if(id===88&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=3){
      const t=allPlayer.find(t=>t.curses?.some(c=>c.type==='stone'))
        ||allAI.find(t=>t.uid!==fc.uid&&t.curses?.some(c=>c.type==='stone'));
      if(t){const tPi=allPlayer.some(x=>x.uid===t.uid)?0:1;
        return{mp:3,label:'Destroy Stone Cursed',execute:()=>{
          sendToShrine(t,tPi);
          log(`AI: ${fc.card.name} [Skill] → ${t.card.name} ถูกทำลาย (Stone Curse)!`,'bad');
        }};
      }
    }
    // Zadin (91): Dragon Strike ×2 At=8, fused+Dragon+at line, Mp 4
    if(id===91&&fc.fused&&fc.fusionStack.some(m=>m.card.tribe==='Dragon')&&ai.atLine.some(x=>x.uid===fc.uid)&&allPlayer.length>0&&ai.mp>=4){
      return{mp:4,label:'Dragon Strike ×2 At=8',execute:()=>{
        const sorted=[...allPlayer].sort((a,b)=>getEffectiveAt(b)-getEffectiveAt(a));
        const t1=sorted[0];
        const t1line=player.atLine.some(x=>x.uid===t1.uid)?'at':'df';
        dealDamage(fc,t1,8,'Zadin Skill',1,0,t1line);
        const remaining=[...player.atLine,...player.dfLine];
        if(remaining.length>0){
          const t2=remaining.sort((a,b)=>getEffectiveAt(b)-getEffectiveAt(a))[0];
          const t2line=player.atLine.some(x=>x.uid===t2.uid)?'at':'df';
          dealDamage(fc,t2,8,'Zadin Skill',1,0,t2line);
        }
        fc.exhausted=true;fc.hasAttacked=true;
        log(`AI: ${fc.card.name} [Skill] Dragon Strike ×2 At=8!`,'bad');
      }};
    }
    return null;
  }

  function doAISkill(callback){
    const aiSeals=[...ai.atLine,...ai.dfLine];
    for(const fc of aiSeals){
      if(fc.hasUsedSkill||fc.curses?.some(c=>c.type==='stone'))continue;
      const skill=getAICardSkill(fc);
      if(!skill)continue;
      fc.hasUsedSkill=true;
      ai.mp=Math.max(0,ai.mp-skill.mp);
      showActionQueue(`🤖 ${fc.card.name} [Skill] → ${skill.label}`,()=>{
        skill.execute();
        checkLose();render();
        doAISkill(callback);
      });
      return;
    }
    callback();
  }

  function doDeployStep(idx){
    if(idx>=toPlay.length){doAIFuse(()=>doAISkill(()=>setTimeout(doAIBattle,200)));return;}
    const {card,line}=toPlay[idx];
    updateAIPreview(card,`⬇ Deploying to ${line==='at'?'At':'Df'} Line`);
    showActionQueue(`🤖 ลงการ์ด <b>${card.name}</b> → ${line==='at'?'At':'Df'} Line (ลง ${card.mc} Mp)`,()=>{
      if(ai.mp<card.mc){log(`AI: ${card.name} ลงไม่ได้ — Mp ไม่พอ`,'');doDeployStep(idx+1);return;}
      const hi=ai.hand.findIndex(c=>c===card||c.id===card.id);
      if(hi>=0)ai.hand.splice(hi,1);
      ai.mp-=card.mc;
      (line==='at'?ai.atLine:ai.dfLine).push(makeFieldCard(card,true));
      playSound('Deploy');
      log(`AI deployed ${card.name}`);
      if(card.id===90) triggerAndreAbility(1);
      render();
      doDeployStep(idx+1);
    });
  }

  function doAIBattle(){
    // Also include Centaur Scout (52) in Df Line as attacker
    const attackers=[...ai.atLine,...ai.dfLine.filter(s=>s.card.id===52)].filter(s=>!s.exhausted&&!s.curses?.some(c=>c.type==='stone'||c.type==='freeze'||c.type==='charm'));
    if(!attackers.length){endAITurn();return;}

    function doAttackStep(idx){
      if(idx>=attackers.length){updateAIPreview(null);setTimeout(()=>endAITurn(),400);return;}
      const afc=attackers[idx];
      updateAIPreview(afc.card,'⚔ Attacking...');
      // Centaur Scout (52): cross-line targeting
      const isCSAt=afc.card.id===52&&ai.atLine.some(x=>x.uid===afc.uid);
      const isCSdf=afc.card.id===52&&ai.dfLine.some(x=>x.uid===afc.uid);
      let atT=G.players[0].atLine.map(fc=>({fc,line:'at'}));
      let dfT=G.players[0].dfLine.map(fc=>({fc,line:'df'}));
      // Filter Mysterious Elephant (42): fused attackers can't target it
      const filterME=t=>!(t.fc.card.id===42&&afc.fused);
      // Filter Brigitte (51): attackers with lower Sp can't target it
      const filterBrig=t=>!(t.fc.card.id===51&&getEffectiveSp(afc)<getEffectiveSp(t.fc));
      atT=atT.filter(filterME).filter(filterBrig);
      dfT=dfT.filter(filterME).filter(filterBrig);
      // Centaur Scout: at→df cross, df→at cross
      let targets;
      if(isCSAt){targets=dfT.length>0?dfT:atT;}
      else if(isCSdf){targets=atT.length>0?atT:dfT;}
      else targets=atT.length>0?atT:dfT;

      if(!targets.length){
        // Only hand-attack if player's field is genuinely empty (not just filtered by abilities)
        const playerHasFieldSeals=G.players[0].atLine.length>0||G.players[0].dfLine.length>0;
        if(!playerHasFieldSeals&&!handAttackedThisTurn&&G.players[0].hand.length>0&&turnNum>1){
          const hand=G.players[0].hand;
          const ridx=Math.floor(Math.random()*hand.length);
          const card=hand[ridx];
          showActionQueue(`🤖 ${afc.card.name} ⚔ โจมตีมือ Player`,()=>{
          const actualIdx=hand.indexOf(card);if(actualIdx>=0)hand.splice(actualIdx,1);
          handAttackAnim(afc,card,()=>{
            G.players[0].shrine.push(card);
            log(`AI: ${afc.card.name} โจมตีมือ Player → ${card.name} ลง Shrine! (+Lv${card.lv})`);
            afc.exhausted=true;handAttackedThisTurn=true;
            checkLose();render();
            doAttackStep(idx+1);
          });
          });
        } else {
          afc.exhausted=true;
          doAttackStep(idx+1);
        }
        return;
      }

      const maCost=afc.card.ma||1;
      const allSp=(afc.fused?afc.fusionAtks:[]).filter(a=>a.all&&a.at&&ai.mp>=a.mp).sort((a,b)=>b.at-a.at)[0];
      const winSp=(afc.fused?afc.fusionAtks:[]).filter(a=>!a.all&&a.at&&ai.mp>=a.mp).filter(a=>{
        const bestT=targets.reduce((best,{fc:d,line:dl})=>{
          const ds=dl==='at'?getEffectiveAt(d):getEffectiveDf(d);
          return (!best||a.at>ds)?{fc:d,dl,ds}:best;
        },null);
        return bestT&&(a.at>bestT.ds||(a.at===bestT.ds&&getEffectiveSp(afc)>getEffectiveSp(bestT.fc)));
      }).sort((a,b)=>b.at-a.at)[0];
      const myAt=getEffectiveAt(afc);
      const bestTarget=targets.reduce((best,{fc:d,line:dl})=>{
        const ds=dl==='at'?getEffectiveAt(d):getEffectiveDf(d);
        return (!best||ds<best.ds)?{fc:d,line:dl,ds}:best;
      },null);
      const normalWins=bestTarget&&(myAt>bestTarget.ds||(myAt===bestTarget.ds&&getEffectiveSp(afc)>getEffectiveSp(bestTarget.fc)))&&ai.mp>=maCost;

      function done(){
        afc.exhausted=true;
        checkLose();render();
        doAttackStep(idx+1);
      }

      if(allSp){
        ai.mp-=allSp.mp;
        const allTargets=[...G.players[0].atLine.map(fc=>({fc,line:'at'})),...G.players[0].dfLine.map(fc=>({fc,line:'df'}))];
        showActionQueue(`🤖 ${afc.card.name} → <b>${allSp.name}</b> (ALL)`,()=>{
          if(afc.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${afc.card.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'');done();return;}
          log(`AI: ${afc.card.name} uses ${allSp.name} (ALL)`);
          animateAllTargets(afc,allTargets,allSp.at,allSp.name,1,0,done);
        });
      } else if(winSp){
        ai.mp-=winSp.mp;
        const hitCount=winSp.hits||1;
        let hitsDone=0;
        function doHit(){
          const curT=[...G.players[0].atLine.map(f=>({fc:f,line:'at'})),...G.players[0].dfLine.map(f=>({fc:f,line:'df'}))];
          if(!curT.length||hitsDone>=hitCount){done();return;}
          const htgt=curT.find(({fc:d,line:dl})=>winSp.at>(dl==='at'?getEffectiveAt(d):getEffectiveDf(d)))||curT.reduce((b,{fc:d,line:dl})=>{const ds=dl==='at'?getEffectiveAt(d):getEffectiveDf(d);return(!b||ds<b.ds)?{fc:d,line:dl,ds}:b;},null);
          if(htgt){
            combatAnim(afc,htgt.fc,winSp.at,htgt.line,false,()=>{
              dealDamage(afc,htgt.fc,winSp.at,winSp.name,1,0,htgt.line);
              hitsDone++;render();doHit();
            });
          } else {hitsDone++;doHit();}
        }
        showActionQueue(`🤖 ${afc.card.name} → <b>${winSp.name}</b>${hitCount>1?' ×'+hitCount:''}`,()=>{
          if(afc.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${afc.card.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'');done();return;}
          log(`AI: ${afc.card.name} uses ${winSp.name}${hitCount>1?` (×${hitCount})`:''}`);
          doHit();
        });
      } else if(normalWins){
        ai.mp-=maCost;
        showActionQueue(`🤖 ${afc.card.name} ⚔ ${bestTarget.fc.card.name}`,()=>{
          if(afc.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${afc.card.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'');done();return;}
          combatAnim(afc,bestTarget.fc,myAt,bestTarget.line,false,()=>{
            dealDamage(afc,bestTarget.fc,myAt,'normal attack',1,0,bestTarget.line);
            done();
          });
        });
      } else {
        const hasAffordableFusion=(afc.fused?afc.fusionAtks:[]).some(a=>a.at&&ai.mp>=a.mp);
        if(!hasAffordableFusion&&ai.mp<maCost){
          doAttackStep(idx+1);
        } else {
          afc.exhausted=true;
          doAttackStep(idx+1);
        }
      }
    }
    doAttackStep(0);
  }

  function endAITurn(){
    updateAIPreview(null);
    G.players[1].atLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
    G.players[1].dfLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
    handAttackedThisTurn=false;
    G.currentPlayer=0;
    subTurnNum++;
    [0,1].forEach(rpi=>{
      G.players[rpi].atLine.forEach(s=>{s.exhausted=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
      G.players[rpi].dfLine.forEach(s=>{s.exhausted=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
    });
    // Thor Thunder God (76): enforce At Line if enemy has At Line seals
    {const ai=G.players[1];const p=G.players[0];
    const thor=p.dfLine.find(s=>s.card.id===76);
    if(thor&&ai.atLine.length>0){p.dfLine.splice(p.dfLine.findIndex(s=>s.uid===thor.uid),1);p.atLine.push(thor);log('Thor [Ability]: ย้ายไป At Line อัตโนมัติ','');}}
    // Dread Knight (63): always in At Line
    {const p=G.players[0];const dk=p.dfLine.find(s=>s.card.id===63);
    if(dk){p.dfLine.splice(p.dfLine.findIndex(s=>s.uid===dk.uid),1);p.atLine.push(dk);log('Dread Knight [Ability]: ย้ายไป At Line อัตโนมัติ','');}}
    // Heaven Knight (82): return to deck after 3 turns on field
    {for(let pi=0;pi<2;pi++){const owner=G.players[pi];
      for(const lk of['atLine','dfLine']){
        const idx=owner[lk].findIndex(s=>s.card.id===82&&turnNum-s.deployedTurn>=3);
        if(idx>=0){const hk=owner[lk].splice(idx,1)[0];
          if(hk.fusionStack?.length)hk.fusionStack.forEach(m=>owner.shrine.push(m.card));
          owner.deck.push(hk.card);shuffle(owner.deck);
          log(`Heaven Knight [Ability]: อยู่ในสนามครบ 3 Turn — กลับสู่กอง!`,'');
        }
      }
    }}
    tickCurses();
    tickMystics();
    startPlayerDraw();
  }

  doDeployStep(0);
}

// ══════════════════════════════════════════════
// ACTION QUEUE (interfere window)
// ══════════════════════════════════════════════
function showActionQueue(desc, onProceed, fusionMainFC=null){
  if(pendingCb){
    // Nested call during interfere window: execute the effect immediately, preserve original queue
    onProceed();
    render();
    return;
  }
  pendingCb=onProceed;
  pendingFusionMain=fusionMainFC;
  document.getElementById('aq-desc').innerHTML=desc;
  document.getElementById('action-queue').style.display='flex';
  const p=G.players[0];
  // Gale Garuda: only during AI fusion
  const canGaruda=fusionMainFC&&p.hand.some(c=>c.id===53)&&p.mp>=4;
  document.getElementById('btn-aq-garuda').style.display=canGaruda?'inline-block':'none';
  // Wool Wyvern: any action queue window
  const canWyvern=p.hand.some(c=>c.id===80)&&p.mp>=4;
  document.getElementById('btn-aq-woolwyvern').style.display=canWyvern?'inline-block':'none';
  // Phoenix: in shrine, any action queue window
  const canPhoenix=p.shrine.some(c=>c.id===78)&&p.mp>=2;
  document.getElementById('btn-aq-phoenix').style.display=canPhoenix?'inline-block':'none';
  render(); // re-render so interfere mystics get canPlay=true
}

function executeGarudaInterfere(){
  const p=G.players[0];
  const garuda=p.hand.find(c=>c.id===53);
  const mainFC=pendingFusionMain;
  if(!garuda||p.mp<4||!mainFC){return;}
  const hi=p.hand.indexOf(garuda);p.hand.splice(hi,1);
  p.mp-=4;
  const garudaFC=makeFieldCard(garuda,false);
  garudaFC.deployedTurn=turnNum;
  p.atLine.push(garudaFC);
  document.getElementById('btn-aq-garuda').style.display='none';
  pendingFusionMain=null;
  const attAt=garudaFC.card.at;
  log(`Gale Garuda [Interfere]: ลงสนามและโจมตี ${mainFC.card.name}!`,'good');
  combatAnim(garudaFC,mainFC,attAt,'at',false,()=>{
    dealDamage(garudaFC,mainFC,attAt,'Gale Garuda Interfere',0,1,'at');
    garudaFC.exhausted=true;garudaFC.hasAttacked=true;
    checkLose();render();
    proceedAction();
  });
}
function executeWoolWyvernInterfere(){
  const p=G.players[0];
  const wyvern=p.hand.find(c=>c.id===80);
  if(!wyvern||p.mp<4){return;}
  const hi=p.hand.indexOf(wyvern);p.hand.splice(hi,1);
  p.mp-=4;
  const wyvernFC=makeFieldCard(wyvern,false);
  wyvernFC.deployedTurn=turnNum;
  p.atLine.push(wyvernFC);
  document.getElementById('btn-aq-woolwyvern').style.display='none';
  log('Wool Wyvern [Interfere]: ลงสนาม! (Fire At −2 passive active)','good');
  checkLose();render();
}

function executePhoenixInterfere(){
  const p=G.players[0];
  const phoenix=p.shrine.find(c=>c.id===78);
  if(!phoenix||p.mp<2){return;}
  p.mp-=2;
  const si=p.shrine.indexOf(phoenix);
  if(si>=0)p.shrine.splice(si,1);
  const phoenixFC=makeFieldCard(phoenix,false);
  phoenixFC.deployedTurn=turnNum;
  p.atLine.push(phoenixFC);
  document.getElementById('btn-aq-phoenix').style.display='none';
  log('Phoenix [Interfere]: ฟื้นคืนชีพจาก Shrine!','good');
  checkLose();render();
}

function proceedAction(){
  document.getElementById('action-queue').style.display='none';
  const cb=pendingCb;
  pendingCb=null;
  if(cb)cb();
}

// ══════════════════════════════════════════════
// DRAW CHOICE SYSTEM
// ══════════════════════════════════════════════
const HAND_COMBINED_MAX = 7; // total seal + mystic combined hand limit

function showDrawModal(){
  const p=G.players[0];
  const canSeal=p.deck.length>0;
  const canMystic=(p.mysticDeck||[]).length>0;
  const mhand=(p.mysticHand||[]).length;
  const combined=p.hand.length+mhand;
  document.getElementById('draws-left').textContent=drawsRemaining;
  document.getElementById('draw-choice-seal').classList.toggle('disabled',!canSeal);
  document.getElementById('draw-choice-mystic').classList.toggle('disabled',!canMystic);
  document.getElementById('draw-seal-count').textContent=`Seal ${p.hand.length} ใบ | กอง ${p.deck.length}`;
  document.getElementById('draw-mystic-count').textContent=`Mystic ${mhand} ใบ | กอง ${(p.mysticDeck||[]).length}`;
  const combinedEl=document.getElementById('draw-combined-count');
  combinedEl.textContent=`มือรวม ${combined}/${HAND_COMBINED_MAX} ใบ`;
  combinedEl.style.color=combined>=HAND_COMBINED_MAX?'#fbbf24':'#9ca3af';
  document.getElementById('draw-modal').style.display='block';
  if(!canSeal&&!canMystic){
    hideDrawModal();
    enterDiscardStep();
  }
}

function hideDrawModal(){
  document.getElementById('draw-modal').style.display='none';
}

function doDrawChoice(type){
  const p=G.players[0];
  if(type==='seal'){
    if(p.deck.length>0)drawCard(0,false,true);
    else{log('Seal Deck ว่าง','bad');}
  } else {
    if((p.mysticDeck||[]).length>0)drawMysticCard(0,false,true);
    else{log('Mystic Deck ว่าง','bad');}
  }
  drawsRemaining--;
  render();
  if(drawsRemaining<=0){hideDrawModal();enterDiscardStep();}
  else showDrawModal();
}

function onPlayerDrawDone(){
  const _playerMpLeft=G.players[0].mp;
  G.players[0].mp=getEffectiveMpMax(0);
  // AI Vioria (56): AI gains player's unspent Mp at start of player's turn (available for Interfere)
  {const viorias=[...G.players[1].atLine,...G.players[1].dfLine].filter(x=>x.card.id===56);
  if(viorias.length>0&&_playerMpLeft>0){
    G.players[1].mp=Math.min(G.players[1].mp+_playerMpLeft,MAX_MP);
    log(`Vioria [Ability]: Player เหลือ ${_playerMpLeft} Mp → AI +${_playerMpLeft} Mp!`,'');
  }}
  turnNum++;
  phase='main';
  log(`Turn ${turnNum} — Your turn | MAIN PHASE`,'hi');
  render();
}

function enterDiscardStep(){
  const p=G.players[0];
  const combined=p.hand.length+(p.mysticHand||[]).length;
  const sealMax=getEffectiveHandMax(0);
  const overCombined=Math.max(0,combined-HAND_COMBINED_MAX);
  const overSeal=Math.max(0,p.hand.length-sealMax);
  const excess=Math.max(overCombined,overSeal);
  if(excess>0){
    phase='discard';
    log(`DISCARD STEP — ทิ้งการ์ดให้เหลือ Seal ≤${sealMax} รวม ≤${HAND_COMBINED_MAX} (เกินมา ${excess} ใบ)`,'bad');
    render();
  } else {
    onPlayerDrawDone();
  }
}

function startPlayerDraw(){
  drawsRemaining=2;
  render();
  showDrawModal();
}

function aiDrawCards(pi,onDone){
  const p=G.players[pi];
  const drawn=[];
  for(let i=0;i<2;i++){
    const canSeal=p.deck.length>0;
    const canMystic=(p.mysticDeck||[]).length>0;
    if(!canSeal&&!canMystic)break;
    let type;
    if(canSeal&&canMystic)type=Math.random()<0.5?'seal':'mystic';
    else type=canSeal?'seal':'mystic';
    drawn.push(type);
    if(type==='seal')drawCard(pi,true,true);
    else drawMysticCard(pi,true,true);
  }
  // AI Discard Step: trim to combined HAND_COMBINED_MAX
  const excess=p.hand.length+(p.mysticHand||[]).length-HAND_COMBINED_MAX;
  if(excess>0){
    for(let i=0;i<excess;i++){
      if((p.mysticHand||[]).length>0){p.mysticHand.pop();}
      else if(p.hand.length>0){const c=p.hand.pop();p.shrine.push(c);}
    }
  }
  if(drawn.length){
    const aiDiv=document.getElementById('ai-prev-body');
    aiDiv.innerHTML=`<div style="padding:8px;text-align:center">
      <div style="font-size:10px;color:#9ca3af;margin-bottom:6px">AI จั่ว ${drawn.length} ใบ</div>
      <div style="display:flex;gap:6px;justify-content:center">
        ${drawn.map(t=>`<img src="cardback/${t}.jpg" style="width:44px;height:63px;object-fit:cover;border-radius:4px;border:2px solid ${t==='seal'?'#4b5563':'#7c3aed'}">`).join('')}
      </div>
    </div>`;
    playSound('Draw');
    setTimeout(()=>onDone(),900);
  } else {
    onDone();
  }
}

// ══════════════════════════════════════════════
// MYSTIC ACTIONS
// ══════════════════════════════════════════════
function showMysticAction(mysticCard,mysticIdx){
  if(G.currentPlayer!==0&&!pendingCb)return;
  const inMainPhase=phase==='main'||phase==='main2';
  const inInterfere=!!pendingCb;
  if(!inMainPhase&&!inInterfere)return;
  if(!inMainPhase&&!mysticCard.interfere){logErr(`${mysticCard.name} ไม่สามารถใช้ระหว่าง Action Queue`);return;}
  const p=G.players[0];
  if(p.mp<mysticCard.mc){logErr(`Mp ไม่พอ (ต้องการ ${mysticCard.mc}, มี ${p.mp})`);return;}
  if(mysticCard.pasted==='PS'){
    if(mysticPlayMode&&mysticPlayMode.mysticIdx===mysticIdx){mysticPlayMode=null;render();return;}
    mysticPlayMode={mysticCard,mysticIdx};
    log(`${mysticCard.name} [Mystic PS] — คลิก Seal ที่จะติด (คลิกอีกครั้งเพื่อยกเลิก)`,'hi');
    render();
  } else if(mysticCard.pasted==='PA'){
    playPAMystic(mysticCard,mysticIdx);
  } else {
    playNonPMystic(mysticCard,mysticIdx);
  }
}

function attachPSMystic(mysticCard,mysticIdx,targetFC){
  const p=G.players[0];
  mysticPlayMode=null;
  if(!canAttachMystic(mysticCard,targetFC)){
    logErr(`ไม่สามารถติด ${mysticCard.name} กับ ${targetFC.card.name} ได้`);
    render();return;
  }
  // Gregory the Bishop (67): while in At Line, own seals cannot receive mystics
  const targetOwner=findFCOwner(targetFC);
  if(targetOwner&&G.players[targetOwner.pi].atLine.some(x=>x.card.id===67)){
    log(`Gregory the Bishop [Ability]: ยกเลิก Mystic — Seal ฝ่าย${targetOwner.pi===0?'เรา':'AI'} รับ Mystic ไม่ได้ขณะอยู่ใน At Line`,'bad');
    render();return;
  }
  // Heaven Knight (82): cannot have opponent's Mystic Cards attached to itself
  if(targetFC.card.id===82){
    log(`Heaven Knight [Ability]: ยกเลิก Mystic ฝ่ายตรงข้าม!`,'bad');
    render();return;
  }
  // Silent Prohibitor: target is protected from mystics
  if(hasMysticProtect(targetFC)){
    log(`${targetFC.card.name} ถูกป้องกันด้วย Silent Prohibitor — ติด Mystic ไม่ได้!`,'bad');
    render();return;
  }
  const id=mysticCard.id;
  const fc=targetFC;

  function doAttach(atBonus=0,dfBonus=0,spBonus=0,flags={}){
    p.mp-=mysticCard.mc;
    p.mysticHand.splice(mysticIdx,1);
    playSound('Spell');
    const expires=mysticCard.turns===999?Infinity:subTurnNum+(mysticCard.turns*2);
    if(mysticCard.turns!==0){
      fc.mystics=(fc.mystics||[]);
      fc.mystics.push({mystic:mysticCard,atBonus,dfBonus,spBonus,...flags,expiresBeforeSubTurn:expires});
      // PS curse: apply curse tied to this PS (no own timer — lasts until PS expires/falls)
      if(flags.curseType){
        fc.curses=(fc.curses||[]);
        fc.curses.push({type:flags.curseType,expiresAtSubTurn:Infinity,fromPS:mysticCard.id});
        playSound(flags.curseType==='stone'?'Stone':flags.curseType==='freeze'?'Freeze':flags.curseType==='poison'?'Poison':flags.curseType==='charm'?'Charm':'Skill');
      }
    }
    log(`${mysticCard.name} [Mystic] ติดกับ ${fc.card.name}!`,'good');
    checkLose();render();
  }

  // ── Thunder Bolt (37): instant, split fusion ──
  if(id===37){
    if(!fc.fused||!fc.fusionStack?.length){log(`${fc.card.name} ไม่ได้รวมร่าง`,'bad');render();return;}
    showActionQueue(`${mysticCard.name} → แยกการรวมร่าง ${fc.card.name}`,()=>{
      p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);
      const owner=findFCOwner(fc);
      if(owner){
        fc.fusionStack.forEach(m=>{owner.p.atLine.push(m);});
      }
      fc.fusionStack=[];fc.fusionAtks=[];fc.fused=false;fc.fusedSinceTurn=null;fc.wasMainFusedTurn=turnNum;
      log(`${mysticCard.name}: ${fc.card.name} แยกการรวมร่าง!`,'good');
      checkLose();render();
    });
    return;
  }

  // ── Will of True Mind (68): instant, grant willMind flag ──
  if(id===68){
    showActionQueue(`${mysticCard.name} → ${fc.card.name} ใช้ท่า/Skill โดยไม่ต้องรวมร่าง 1 ครั้ง`,()=>{
      p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);
      fc.willMind=true;
      log(`${mysticCard.name}: ${fc.card.name} willMind ON!`,'good');
      checkLose();render();
    });
    return;
  }

  // ── Houdini (30): PS Stone Curse — lasts while PS attached (1 turn) ──
  if(id===30){
    showActionQueue(`${mysticCard.name} → ${fc.card.name} ติด Stone Curse ตราบที่ Houdini ยังติดอยู่`,()=>doAttach(0,0,0,{curseType:'stone'}));
    return;
  }

  // ── Cupid and Psyche (69): PS Charm Curse — lasts while PS attached ──
  if(id===69){
    const owner=findFCOwner(fc);
    const fromLine=owner&&owner.p.atLine.includes(fc)?'atLine':'dfLine';
    showActionQueue(`${mysticCard.name} → ${fc.card.name} ติด Charm Curse ตราบที่ PS ยังติดอยู่`,()=>{
      fc.charmed={originalPi:owner?owner.pi:1,originalLine:fromLine};
      fc.exhausted=false;fc.hasUsedSkill=false;
      doAttach(0,0,0,{curseType:'charm'});
    });
    return;
  }

  // ── Choice cards ──
  if(id===18){ // Galahad
    const opts=[];
    if(fc.card.tribe==='Knight')opts.push({label:'[Knight] At +2',data:{at:2}});
    if(fc.card.el==='wind')opts.push({label:'[Wind] At +2 Sp +1',data:{at:2,sp:1}});
    if(!opts.length){log(`${fc.card.name} ไม่ตรงเงื่อนไข Galahad`,'bad');render();return;}
    const apply=d=>showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d.at||0,0,d.sp||0));
    if(opts.length===1)apply(opts[0].data);
    else showMysticPicker(mysticCard.name,opts,d=>apply(d));
    return;
  }
  if(id===19){ // Crescent
    const opts=[];
    if(fc.card.el==='darkness')opts.push({label:'[Dark] At +2',data:{at:2}});
    if(fc.card.el==='water')opts.push({label:'[Water] At +1, Ma -1',data:{at:1,maRed:1}});
    if(!opts.length){log(`${fc.card.name} ไม่ตรงเงื่อนไข Crescent`,'bad');render();return;}
    const apply=d=>showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d.at||0,0,0,{maReduction:d.maRed||0}));
    if(opts.length===1)apply(opts[0].data);
    else showMysticPicker(mysticCard.name,opts,d=>apply(d));
    return;
  }
  if(id===21){ // Holy Sun
    const el=getEffectiveEl(fc);
    if(el==='light'||el==='fire'||el==='divine'){showActionQueue(`${mysticCard.name} → ${fc.card.name} At +2`,()=>doAttach(2));}
    else{log(`${fc.card.name} ไม่ตรงเงื่อนไข Holy Sun (ธาตุ: ${el})`,'bad');render();}
    return;
  }
  if(id===24){ // Werrian Wesley
    const opts=[];
    if(fc.card.tribe==='Mage')opts.push({label:'[Mage] At +2',data:{at:2}});
    if(fc.card.el==='earth')opts.push({label:'[Earth] At +2 Df +1',data:{at:2,df:1}});
    if(!opts.length){log(`${fc.card.name} ไม่ตรงเงื่อนไข Werrian Wesley`,'bad');render();return;}
    const apply=d=>showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d.at||0,d.df||0));
    if(opts.length===1)apply(opts[0].data);
    else showMysticPicker(mysticCard.name,opts,d=>apply(d));
    return;
  }
  if(id===25){ // Beauty & the Beast
    const t=fc.card.tribe;
    const atB=(t==='Monster'||t==='Beast')?2:t==='Dragon'?1:0;
    if(!atB){log(`${fc.card.name} ไม่ตรงเงื่อนไข Beauty & the Beast`,'bad');render();return;}
    showActionQueue(`${mysticCard.name} → ${fc.card.name} At +${atB}`,()=>doAttach(atB));
    return;
  }
  if(id===29){ // Release from Hell
    if(fc.card.tribe!=='Evil'){log(`${fc.card.name} ต้องเป็น [Evil]`,'bad');render();return;}
    showActionQueue(`${mysticCard.name} → ${fc.card.name} At+2 Df+1 Sp+1`,()=>doAttach(2,1,1));
    return;
  }
  if(id===31){ // Yang: -Df×Lv (1 turn)
    showActionQueue(`${mysticCard.name} → ${fc.card.name} Df-${fc.card.lv} (1 Turn)`,()=>doAttach(0,-fc.card.lv));
    return;
  }
  if(id===32){ // Yin: -At×Lv (1 turn)
    showActionQueue(`${mysticCard.name} → ${fc.card.name} At-${fc.card.lv} (1 Turn)`,()=>doAttach(-fc.card.lv));
    return;
  }
  if(id===33){ // Magical World: change element (display + fusion + bonuses)
    const elements=['fire','water','earth','wind','light','darkness'].filter(e=>e!==fc.card.el);
    showMysticPicker(`Magical World — เลือกธาตุสำหรับ ${fc.card.name}`,
      elements.map(el=>({label:el,data:el})),
      el=>showActionQueue(`${mysticCard.name} → ${fc.card.name} ธาตุ ${el}`,()=>{
        fc.magicalEl=el;
        doAttach(0,0,0,{elFusion:el});
      }));
    return;
  }
  if(id===36){ // Silent Prohibitor: protection 1 turn
    showActionQueue(`${mysticCard.name} → ${fc.card.name} ป้องกัน 1 Turn`,()=>doAttach(0,0,0,{protects:true}));
    return;
  }
  if(id===38){ // Whirl to Win: swap At/Df using effective (not base) stats so fused cards work correctly
    const effAt=getEffectiveAt(fc), effDf=getEffectiveDf(fc);
    const atB=effDf-effAt, dfB=effAt-effDf;
    showActionQueue(`${mysticCard.name} → ${fc.card.name} สลับ At↔Df (1 Turn)`,()=>doAttach(atB,dfB,0,{swapAtDf:true}));
    return;
  }
  if(id===39){ // Chaotic World: change element permanently
    const elements=['fire','water','earth','wind','light','darkness'].filter(e=>e!==fc.card.el);
    showMysticPicker(`Chaotic World — เปลี่ยนธาตุ ${fc.card.name} เป็น?`,
      elements.map(el=>({label:el,data:el})),
      el=>showActionQueue(`${mysticCard.name} → ${fc.card.name} ธาตุเป็น ${el}`,()=>{
        doAttach();
        fc.card={...fc.card,el};
      }));
    return;
  }
  if(id===61){ // Seven Silver: double attack 1 turn
    showActionQueue(`${mysticCard.name} → ${fc.card.name} โจมตีได้ 2 ครั้ง (1 Turn)`,()=>doAttach(0,0,0,{doubleAtk:true}));
    return;
  }

  // Default: just attach (no computed bonus)
  showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach());
}

function playNonPMystic(mysticCard,mysticIdx){
  const p=G.players[0];
  const id=mysticCard.id;
  function spend(){p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);playSound('Spell');}
  const allField=()=>[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];

  if(id===17){ // Holy Prayer
    showMysticPicker('Holy Prayer — เลือก',[
      {label:'รักษา Curse ทุกชนิดให้ Seal 1 ใบ',data:'cure'},
      {label:'ทำลาย [PS] Mystic Card 1 ใบในสนาม',data:'destroy'}
    ],choice=>{
      if(choice==='cure'){
        const cursed=allField().filter(fc=>fc.curses?.length);
        if(!cursed.length){log('ไม่มี Seal ที่ติด Curse','bad');return;}
        showMysticPicker('เลือก Seal ที่จะรักษา',cursed.map(fc=>({label:`${fc.card.name} (${fc.curses.map(c=>c.type).join(',')})`,data:fc})),tfc=>{
          showActionQueue(`Holy Prayer → รักษา Curse ${tfc.card.name}`,()=>{
            spend();tfc.curses=[];
            log(`Holy Prayer: รักษา Curse ${tfc.card.name}!`,'good');
            checkLose();render();
          });
        });
      } else {
        const withPS=allField().filter(fc=>(fc.mystics||[]).some(m=>m.expiresBeforeSubTurn===Infinity||subTurnNum<m.expiresBeforeSubTurn));
        if(!withPS.length){log('ไม่มี [PS] Mystic ในสนาม','bad');return;}
        showMysticPicker('เลือก Seal',withPS.map(fc=>({label:`${fc.card.name} [${getActiveMystics(fc).map(m=>m.mystic.name).join(',')}]`,data:fc})),tfc=>{
          const actMys=getActiveMystics(tfc);
          showMysticPicker('เลือก Mystic ที่จะทำลาย',actMys.map((m,i)=>({label:m.mystic.name,data:i})),mIdx=>{
            showActionQueue(`Holy Prayer → ทำลาย ${actMys[mIdx].mystic.name}`,()=>{
              spend();tfc.mystics.splice(tfc.mystics.indexOf(actMys[mIdx]),1);
              log(`Holy Prayer: ทำลาย Mystic!`,'good');checkLose();render();
            });
          });
        });
      }
    });
    return;
  }

  if(id===26){ // Inquisition — destroy any mystic (PS on seal OR PA area)
    const psTargets=allField().filter(fc=>getActiveMystics(fc).length);
    const paTargets=[];
    [0,1].forEach(pi=>{(G.players[pi].areaMystics||[]).forEach((am,i)=>{paTargets.push({pi,amIdx:i,am});});});
    if(!psTargets.length&&!paTargets.length){log('ไม่มี Mystic ในสนาม','bad');return;}
    const opts=[
      ...psTargets.map(fc=>({label:`[PS] ${fc.card.name}: ${getActiveMystics(fc).map(m=>m.mystic.name).join(',')}`,data:{type:'ps',fc}})),
      ...paTargets.map(({pi,amIdx,am})=>({label:`[PA] ${am.mystic.name} (${pi===0?'Player':'AI'})`,data:{type:'pa',pi,amIdx}}))
    ];
    showMysticPicker('Inquisition — เลือก Mystic',opts,choice=>{
      if(choice.type==='pa'){
        showActionQueue(`Inquisition → ทำลาย [PA] ${G.players[choice.pi].areaMystics[choice.amIdx].mystic.name}`,()=>{
          spend();G.players[choice.pi].areaMystics.splice(choice.amIdx,1);
          log(`Inquisition: ทำลาย PA Mystic!`,'good');checkLose();render();
        });
      } else {
        const actMys=getActiveMystics(choice.fc);
        if(actMys.length===1){
          showActionQueue(`Inquisition → ทำลาย ${actMys[0].mystic.name}`,()=>{
            spend();choice.fc.mystics.splice(choice.fc.mystics.indexOf(actMys[0]),1);
            log(`Inquisition: ทำลาย Mystic!`,'good');checkLose();render();
          });
        } else {
          showMysticPicker('เลือก Mystic ที่จะทำลาย',actMys.map((m,i)=>({label:m.mystic.name,data:i})),mIdx=>{
            showActionQueue(`Inquisition → ทำลาย ${actMys[mIdx].mystic.name}`,()=>{
              spend();choice.fc.mystics.splice(choice.fc.mystics.indexOf(actMys[mIdx]),1);
              log(`Inquisition: ทำลาย Mystic!`,'good');checkLose();render();
            });
          });
        }
      }
    });
    return;
  }

  if(id===27){ // Lighthouse
    showMysticPicker('Lighthouse — เลือก',[
      {label:'ดูการ์ดทุกใบในมือฝ่ายตรงข้าม',data:'hand'},
      {label:'ดูการ์ดใบบนสุด 1 ใบของกองการ์ดเราทุกกอง',data:'deck'}
    ],choice=>{
      spend();
      if(choice==='hand'){
        const ai=G.players[1];
        showRevealModal('🔍 Lighthouse: มือ AI',[...ai.hand,...(ai.mysticHand||[])]);
      } else {
        const topSeal=p.deck.slice(0,1);
        const topMystic=(p.mysticDeck||[]).slice(0,1);
        const combined=[...topSeal,...topMystic];
        showRevealModal('🔍 Lighthouse: ใบบนสุดของกองเรา',combined);
      }
      render();
    });
    return;
  }

  if(id===40){ // Benediction
    const valid=p.shrine.filter(c=>!(mysticCard.exception_tribes||[]).includes(c.tribe));
    if(!valid.length){log('ไม่มี Seal ที่เหมาะสมใน Shrine','bad');return;}
    showMysticPicker('Benediction — เลือก Seal',valid.map(c=>({label:`${c.name} (${c.tribe} Lv${c.lv})`,data:c})),c=>{
      showActionQueue(`Benediction → นำ ${c.name} ขึ้นมือ`,()=>{
        spend();
        const i=p.shrine.indexOf(c);
        if(i>=0&&p.hand.length<HAND_MAX){p.shrine.splice(i,1);p.hand.push(c);log(`Benediction: ${c.name} ขึ้นมือ!`,'good');}
        else log('มือเต็ม!','bad');
        checkLose();render();
      });
    });
    return;
  }

  if(id===66){ // Sacrifice
    if(p.hand.length<2){log('ต้องมี Seal ในมือ 2 ใบขึ้นไปจึงจะใช้ Sacrifice ได้','bad');return;}
    const validSeals=allField().filter(fc=>!(mysticCard.exception_tribes||[]).includes(fc.card.tribe));
    if(!validSeals.length){log('ไม่มี Seal ที่สามารถทำลายได้','bad');return;}
    sacrificeTargetMode={mysticCard,mysticIdx};
    log('Sacrifice — คลิก Seal ที่จะทำลาย (คลิกขวาเพื่อยกเลิก)','hi');
    render();
    return;
  }

  // Fallback
  showActionQueue(`${mysticCard.name}`,()=>{spend();log(`${mysticCard.name} ใช้แล้ว`,'');render();});
}

function playPAMystic(mysticCard,mysticIdx){
  const p=G.players[0];
  const id=mysticCard.id;
  function spend(){p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);playSound('Spell');}
  function addAreaMystic(){
    const expires=mysticCard.turns===999?Infinity:subTurnNum+(mysticCard.turns*2);
    if(!p.areaMystics)p.areaMystics=[];
    p.areaMystics.push({mystic:mysticCard,ownerPi:0,expiresBeforeSubTurn:expires});
  }

  if(id===34){ // Cunning Clown: swap enemy non-Machine seals
    const ai=G.players[1];
    showActionQueue(`Cunning Clown → สลับ Line ศัตรู (non-Machine)`,()=>{
      spend();
      const movers_at=ai.atLine.filter(fc=>fc.card.tribe!=='Machine');
      const movers_df=ai.dfLine.filter(fc=>fc.card.tribe!=='Machine');
      const keep_at=ai.atLine.filter(fc=>fc.card.tribe==='Machine');
      const keep_df=ai.dfLine.filter(fc=>fc.card.tribe==='Machine');
      ai.atLine=[...movers_df,...keep_at];
      ai.dfLine=[...movers_at,...keep_df];
      log(`Cunning Clown: สลับ Line AI (non-Machine)!`,'good');
      checkLose();render();
    });
    return;
  }
  if(id===35){ // Nebuchadnezzar: hand max +1
    showActionQueue(`Nebuchadnezzar → จำนวนการ์ดในมือ +1`,()=>{
      spend();addAreaMystic();
      log(`Nebuchadnezzar: มือสูงสุด +1!`,'good');checkLose();render();
    });
    return;
  }
  if(id===70){ // Marie Antoinette: Mp max +1, hand -1
    showActionQueue(`Marie Antoinette → Mp สูงสุด +1, มือ -1`,()=>{
      spend();addAreaMystic();
      log(`Marie Antoinette: Mp+1, การ์ดในมือสูงสุด -1!`,'good');checkLose();render();
    });
    return;
  }

  showActionQueue(`${mysticCard.name}`,()=>{spend();addAreaMystic();log(`${mysticCard.name} ใช้แล้ว`,'');render();});
}

function tickMystics(){
  [0,1].forEach(pi=>{
    const p=G.players[pi];
    ['atLine','dfLine'].forEach(lk=>{
      p[lk].forEach(fc=>{
        if(!fc.mystics?.length)return;
        const expired=fc.mystics.filter(m=>m.expiresBeforeSubTurn!==Infinity&&subTurnNum>=m.expiresBeforeSubTurn);
        fc.mystics=fc.mystics.filter(m=>m.expiresBeforeSubTurn===Infinity||subTurnNum<m.expiresBeforeSubTurn);
        expired.forEach(m=>{
          log(`${m.mystic.name} [Mystic] หมดอายุจาก ${fc.card.name}`,'');
          // Remove PS-bound curse when its source PS expires
          if(m.curseType){
            fc.curses=(fc.curses||[]).filter(c=>!(c.type===m.curseType&&c.fromPS===m.mystic.id));
            if(m.curseType==='charm')fc.charmed=null;
          }
        });
      });
    });
    if(p.areaMystics?.length){
      const expired=p.areaMystics.filter(am=>am.expiresBeforeSubTurn!==Infinity&&subTurnNum>=am.expiresBeforeSubTurn);
      p.areaMystics=p.areaMystics.filter(am=>am.expiresBeforeSubTurn===Infinity||subTurnNum<am.expiresBeforeSubTurn);
      expired.forEach(am=>log(`${am.mystic.name} [Mystic Area] หมดอายุ`,''));
    }
  });
}

