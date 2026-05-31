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
let pendingFusionMaterials = []; // staged (chosen) materials before fusion is confirmed
let _battleAnimPlaying = false;
let _guestBattleAnimFired = false;
let _aiAttackerFC = null; // AI's current attacking seal — set in doAIBattle for field highlight
let _turnAnimPlaying = false;
let _turnAnimToGuest = false;
let _ddDiscardResume = null; // resume callback paused by Dark Destiny shrine discard
let fieldActionTarget = null; // {fc, line}
let handTargetMode = false;
let handAttackedThisTurn = false;
let _noSealAtStart = [false, false]; // track no-field-seals at turn start [player, ai/guest]
let skillMode = null; // {fc, skillIdx}
let pendingCb = null;
let handDiscardMode = null; // {fc, skillIdx, onDiscard}
let handPickMode = null;   // {fc, skillIdx} — Blue Wings Pegasus beast deploy
let pendingFusionMain = null; // mainFC currently in AI fusion action queue (Gale Garuda hook)
let _aqTimerId = null;
let _interfereStack = []; // LIFO queue of interfere effects: [{desc, cb}]; last pushed resolves first
let _pendingMysticCard = null; // PS mystic card currently held in pendingCb (Thunder Bolt, Galahad, etc.)
let _chainDisplay = [];       // visual chain stack: [{img, name}] for AQ overlay display
let _nextChainCard = null;    // set by mystic-play functions before showActionQueue; consumed inside
let _chainCollapsed = false;  // chain box starts expanded; user can collapse; resets on new chain

function _updateChainDisplay(){
  const el=document.getElementById('chain-stack-display');
  if(!el)return;
  if(!_chainDisplay||_chainDisplay.length===0){el.style.display='none';el.innerHTML='';return;}
  el.style.display='flex';
  const toggleIcon=_chainCollapsed?'▶':'▼';
  const cards=_chainDisplay.map((c,i)=>
    (i>0?'<span class="chain-arrow">→</span>':'')+
    `<div class="chain-card-thumb">`+
    (c.img?`<img src="${c.img}" alt="${c.name}" title="${c.name}">`:`<div class="chain-card-noimg">${c.name}</div>`)+
    `<div class="chain-lbl">${c.name}</div></div>`
  ).join('');
  el.innerHTML=
    `<div style="display:flex;flex-direction:column;gap:4px;flex:1">`+
    `<div class="chain-header"><span id="chain-drag" style="cursor:grab;color:#6b7280;font-size:13px;padding:0 6px 0 0;user-select:none;touch-action:none;pointer-events:auto;line-height:1.6" title="ลากย้ายตำแหน่ง">⠿</span><span class="chain-title">⛓ Chain (${_chainDisplay.length})</span>`+
    `<button class="chain-toggle" onclick="_chainCollapsed=!_chainCollapsed;_updateChainDisplay()" title="collapse/expand">${toggleIcon}</button></div>`+
    `<div class="chain-cards-row" style="display:${_chainCollapsed?'none':'flex'}">${cards}</div>`+
    `</div>`;
  const handle=document.getElementById('chain-drag');
  if(handle){
    handle.onmousedown=e=>{e.preventDefault();_startChainDrag(e.clientX,e.clientY);};
    handle.ontouchstart=e=>{e.preventDefault();const t=e.touches[0];_startChainDrag(t.clientX,t.clientY);};
  }
}
let _chainDragging=false,_chainDragOx=0,_chainDragOy=0;
function _startChainDrag(cx,cy){
  const el=document.getElementById('chain-stack-display');
  if(!el)return;
  const r=el.getBoundingClientRect();
  el.style.position='fixed';el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.transform='none';
  _chainDragging=true;_chainDragOx=cx-r.left;_chainDragOy=cy-r.top;
}
document.addEventListener('mousemove',e=>{
  if(!_chainDragging)return;
  const el=document.getElementById('chain-stack-display');if(!el)return;
  el.style.left=Math.max(0,Math.min(window.innerWidth-el.offsetWidth,e.clientX-_chainDragOx))+'px';
  el.style.top=Math.max(0,Math.min(window.innerHeight-el.offsetHeight,e.clientY-_chainDragOy))+'px';
});
document.addEventListener('mouseup',()=>{_chainDragging=false;});
document.addEventListener('touchmove',e=>{
  if(!_chainDragging)return;
  e.preventDefault();
  const t=e.touches[0];
  const el=document.getElementById('chain-stack-display');if(!el)return;
  el.style.left=Math.max(0,Math.min(window.innerWidth-el.offsetWidth,t.clientX-_chainDragOx))+'px';
  el.style.top=Math.max(0,Math.min(window.innerHeight-el.offsetHeight,t.clientY-_chainDragOy))+'px';
},{passive:false,capture:false});
document.addEventListener('touchend',()=>{_chainDragging=false;});

// ── BGM system ──
const _AI_BGM={zadin:'Zalom',andre:'Tidebound Sigil',sigmund:'Windbound Duel',harison:'Bone Drum Ritual'};
const _BATTLE_BGM_POOL=['Summoner Clash','Tidebound Sigil','Zalom','Windbound Duel','Bone Drum Ritual'];
let _currentBGMTrack=null;
function _setBGM(track){
  if(_currentBGMTrack===track)return;
  _currentBGMTrack=track;
  const bgm=document.getElementById('bgm');
  if(!bgm)return;
  bgm.src=`SoundEffect/music/${track}.mp3`;
  bgm.load();
  if(localStorage.getItem('bgm_muted')!=='1')bgm.play().catch(()=>{});
}
function initBattleBGM(){
  const aiKey=sessionStorage.getItem('mm_aiDeck')||'random';
  const track=_AI_BGM[aiKey]||_BATTLE_BGM_POOL[Math.floor(Math.random()*_BATTLE_BGM_POOL.length)];
  _currentBGMTrack=null;
  _setBGM(track);
}
function _startAQTimer(ms){
  _stopAQTimer();
  const wrap=document.getElementById('aq-timer-wrap');
  const bar=document.getElementById('aq-timer-bar');
  if(wrap)wrap.style.display='block';
  if(bar){
    bar.style.transition='none';bar.style.animation='none';bar.style.width='100%';
    bar.offsetWidth; // force reflow
    bar.style.transition=`width ${ms/1000}s linear`;
    bar.style.animation=`aq-tc ${ms/1000}s linear forwards`;
    bar.style.width='0%';
  }
  _aqTimerId=setTimeout(()=>{if(pendingCb)proceedAction();},ms);
}
function _stopAQTimer(){
  if(_aqTimerId){clearTimeout(_aqTimerId);_aqTimerId=null;}
  const wrap=document.getElementById('aq-timer-wrap');
  const bar=document.getElementById('aq-timer-bar');
  if(wrap)wrap.style.display='none';
  if(bar){bar.style.transition='none';bar.style.animation='none';bar.style.width='100%';}
}
let gameWinner = null;        // null | 0 | 1 — winning player index (0=host, 1=guest)
let pendingSacrifice = null;  // {skillFC, mc} — Blaze Sage two-step sacrifice boost
let MYSTIC_DB = [];
let mysticPlayMode = null; // {mysticCard, mysticIdx} — waiting to paste PS to a field seal
let sacrificeTargetMode = null; // {mysticCard, mysticIdx} — waiting to click field seal to destroy
let holyPrayerCureMode = null;  // {targets:[fc], onSelect:(fc)=>void} — waiting to click seal to cure
const MYSTIC_HAND_MAX = 7;
let drawsRemaining = 0;
let _deltaDDrawCb = null;
let guestSkillMode = null;       // {fc, skillIdx} — guest's active skill targeting
let guestFusionMainFC = null;    // fc — guest's active fusion main card
let guestHandDiscardMode = null; // {fc, skillIdx} — guest interfere hand-discard
let guestMysticPlayMode = null;  // {mysticCard, mysticIdx} — guest PS placement
let guestPendingAtkIdx = null;   // fusion attack index chosen by guest

let _hostLogBuffer = []; // accumulated log messages to send with next broadcastState
let _aqPassBits = 0;    // chain-mode pass tracking: 0b01=host passed, 0b10=guest passed
let _aqChainMode = false; // true after any interfere card played — both must pass to resolve
let _pendingSoundBuffer = []; // sounds queued by HOST to broadcast to GUEST

const _SFX={}; // loaded Audio cache — populated on first use

function playSound(name){
  if(localStorage.getItem('bgm_muted')==='1')return;
  const vol=parseFloat(localStorage.getItem('bgm_volume')||'0.3');
  if(_SFX[name]){
    const a=_SFX[name];
    a.volume=vol;a.currentTime=0;a.play().catch(()=>{});
    return;
  }
  const ext=(name==='swordslice'||name==='Charm'||name==='Blocked')?'mp3':'wav';
  const a=new Audio(`SoundEffect/${name}.${ext}`);
  a.preload='auto';a.volume=vol;
  a.addEventListener('canplaythrough',()=>{_SFX[name]=a;a.play().catch(()=>{});},{once:true});
  a.load();
}
function broadcastSound(name){
  playSound(name);
  if(window.Online?.isOnline&&Online.isHost) _pendingSoundBuffer.push(name);
}

// Run fn immediately, or defer it until after Dark Destiny shrine discard resolves
function afterDD(fn){
  if(G._ddDiscardPending){_ddDiscardResume=fn;}
  else{fn();}
}

function showBattlePhaseAnim(cb){
  _battleAnimPlaying=true;
  const overlay=document.getElementById('battle-anim-overlay');
  const btnNext=document.getElementById('btn-next');
  if(btnNext)btnNext.disabled=true;
  if(!overlay){_battleAnimPlaying=false;if(btnNext)btnNext.disabled=false;if(cb)cb();return;}
  playSound('swordslice');
  // Reset animation by removing/re-adding class
  overlay.classList.remove('active');
  overlay.querySelectorAll('#battle-phase-text,#battle-flash').forEach(el=>{
    el.style.animation='none';void el.offsetWidth;el.style.animation='';
  });
  overlay.classList.add('active');
  setTimeout(()=>{_battleAnimPlaying=false;overlay.classList.remove('active');if(btnNext)btnNext.disabled=false;if(cb)cb();},1200);
}

function showTurnAnim(type,cb){
  _turnAnimPlaying=true;
  const overlay=document.getElementById('turn-anim-overlay');
  const txt=document.getElementById('turn-anim-text');
  const btnNext=document.getElementById('btn-next');
  if(btnNext)btnNext.disabled=true;
  if(!overlay||!txt){_turnAnimPlaying=false;if(btnNext)btnNext.disabled=false;if(cb)cb();return;}
  txt.textContent=type==='yours'?'YOUR TURN':'END TURN';
  overlay.classList.remove('active','yours','end');
  overlay.querySelectorAll('#turn-anim-text,#turn-anim-flash').forEach(el=>{el.style.animation='none';void el.offsetWidth;el.style.animation='';});
  overlay.classList.add('active',type);
  setTimeout(()=>{_turnAnimPlaying=false;overlay.classList.remove('active','yours','end');if(btnNext)btnNext.disabled=false;if(cb)cb();},1000);
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
    fusedAtTurn: null,
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
          if(window.Online?.isOnline&&!Online.isHost){
            const card=G.players[1].hand[data.idx];
            if(!card)return;
            Online.sendGuestAction({action:'deploy',cardIdx:data.idx,line:targetLine});
          } else {
            const card=G.players[0].hand[data.idx];
            if(!card)return;
            pendingDeploy={card,idx:data.idx};
            doDeploy(targetLine);
          }
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
  _noSealAtStart=[false,false];
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
      {deck:d0,hand:[],atLine:[],dfLine:[],shrine:[],mp:5,name:"Player",mysticDeck:md0,mysticHand:[],mysticGrave:[],areaMystics:[]},
      {deck:d1,hand:[],atLine:[],dfLine:[],shrine:[],mp:MAX_MP,name:aiName,mysticDeck:md1,mysticHand:[],mysticGrave:[],areaMystics:[]}
    ],
    currentPlayer:0
  };
  for(let i=0;i<5;i++){drawCard(0,true);drawCard(1,true);}
  drawMysticCard(0,true);drawMysticCard(0,true);
  drawMysticCard(1,true);drawMysticCard(1,true);
  console.log('initGame: MYSTIC_DB=',MYSTIC_DB.length,'player mysticDeck=',G.players[0].mysticDeck.length,'mysticHand=',G.players[0].mysticHand.length);
  initDragDrop();
  initBattleBGM();
  phase='main';
  log(`Turn ${turnNum} — Player's turn | MAIN PHASE`,'hi');
  render();
  showTurnAnim('yours',()=>{});
}

function getEffectiveHandMax(pi){
  const p=G.players[pi];
  let max=HAND_MAX;
  if((p.areaMystics||[]).some(am=>am.mystic.id===35))max+=1;
  if((p.areaMystics||[]).some(am=>am.mystic.id===70))max-=1;
  return Math.max(1,max);
}
function getEffectiveCombinedMax(pi){
  const p=G.players[pi];
  let max=HAND_COMBINED_MAX;
  if((p.areaMystics||[]).some(am=>am.mystic.id===35))max+=1;
  if((p.areaMystics||[]).some(am=>am.mystic.id===70))max-=1;
  return max;
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
  if(!silent){
    if(window.Online?.isOnline&&Online.isHost&&pi===0){
      // Online HOST drawing own card: show card name locally, send generic log to GUEST
      log(`${p.name} จั่วการ์ด 1 ใบ`);
      const logBox=document.getElementById('log');
      if(logBox?.firstChild&&typeof _linkifyLog==='function')
        logBox.firstChild.innerHTML=_linkifyLog(`${p.name} drew ${c.name}`);
    }else{
      log(`${p.name} drew ${c.name}`);
    }
    broadcastSound('Draw');
  }
}

// ══════════════════════════════════════════════
// PHASE MANAGEMENT
// ══════════════════════════════════════════════
function onNextPhaseBtn(){
  if(_battleAnimPlaying||_turnAnimPlaying)return;
  if(window.Online?.isOnline&&!Online.isHost){
    if(G.currentPlayer!==1)return;
    if(phase==='main'&&turnNum!==1){
      _guestBattleAnimFired=true;
      showBattlePhaseAnim(()=>{});
    }
    if(phase==='main2'){
      showTurnAnim('end',()=>{Online.sendGuestAction({action:'nextPhase'});});
      return;
    }
    Online.sendGuestAction({action:'nextPhase'});
    return;
  }
  if(G.currentPlayer!==0)return;
  if(phase==='battle'){endBattle();}
  else skipToNextPhase();
}

function skipToNextPhase(){
  cancelAction();
  if(phase==='draw'){phase='main';log('MAIN PHASE','hi');}
  else if(phase==='main'){
    if(turnNum===1){endTurnFromMain2();return;}
    phase='battle';
    log('BATTLE PHASE — select a Seal then click enemy','hi');
    render();
    if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
    showBattlePhaseAnim(()=>{});
    return;
  }
  else if(phase==='main2'){endTurnFromMain2();return;}
  render();
  if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
}

function endBattle(){
  cancelAction();
  phase='main2';
  log('MAIN PHASE 2','hi');
  render();
  if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
}

function endTurnFromMain2(){
  if(_noSealAtStart[0]&&G.players[0].atLine.length===0&&G.players[0].dfLine.length===0){
    log('ไม่มี Seal ในสนามตลอดเทิร์น — แพ้ทันที!','bad');
    showWin(1,'ไม่มี Seal ในสนามตลอดทั้งเทิร์น');return;
  }
  showTurnAnim('end',()=>{phase='end';endTurn();});
}

function afterForcedDiscard(){
  const p=G.players[0];
  const combined=p.hand.length+(p.mysticHand||[]).length;
  if(combined<=getEffectiveCombinedMax(0)&&p.hand.length<=getEffectiveHandMax(0)){
    onPlayerDrawDone();
  } else {
    render();
  }
}

function doForcedDiscardSeal(idx){
  if(phase!=='discard')return;
  const p=G.players[0];
  if(p.hand.length+(p.mysticHand||[]).length<=getEffectiveCombinedMax(0)&&p.hand.length<=getEffectiveHandMax(0))return;
  const card=p.hand.splice(idx,1)[0];
  p.shrine.push(card);
  broadcastSound('Flip');
  log(`ทิ้ง ${card.name} → Shrine (Discard Step)`,'bad');
  checkLose();
  afterForcedDiscard();
}

function doForcedDiscardMystic(idx){
  if(phase!=='discard')return;
  const p=G.players[0];
  if(p.hand.length+(p.mysticHand||[]).length<=getEffectiveCombinedMax(0)&&p.hand.length<=getEffectiveHandMax(0))return;
  const card=p.mysticHand.splice(idx,1)[0];
  (p.mysticGrave=p.mysticGrave||[]).push(card);
  broadcastSound('Flip');
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
  // Delta-D (22): cancel all curses on itself
  [0,1].forEach(pi=>{
    [...G.players[pi].atLine,...G.players[pi].dfLine].filter(x=>x.card.id===22).forEach(dd=>{
      if(dd.curses?.length){dd.curses=[];dd.charmed=null;log(`Delta-D [Ability]: ยกเลิก Curse ของตัวเอง!`,'');}
    });
  });
  // Angel of Sword (20): cancel all curses on itself
  [0,1].forEach(pi=>{
    [...G.players[pi].atLine,...G.players[pi].dfLine].filter(x=>x.card.id===20).forEach(as=>{
      if(as.curses?.length){as.curses=[];as.charmed=null;log(`Angel of Sword [Ability]: ยกเลิก Curse ของตัวเอง!`,'');}
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
          broadcastSound('Card destroyed by effect');
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
  _chainDisplay=[];_chainCollapsed=false;_nextChainCard=null;_updateChainDisplay();
  const prevPi=G.currentPlayer;
  // Vioria on AI/GUEST side: gain player's leftover MP before player refills
  {const _playerMpLeft=G.players[0].mp;
  const _vioOpp=[...G.players[1].atLine,...G.players[1].dfLine].filter(x=>x.card.id===56);
  if(_vioOpp.length>0&&_playerMpLeft>0){
    G.players[1].mp=Math.min(G.players[1].mp+_playerMpLeft,getEffectiveMpMax(1));
    log(`Vioria [Ability]: Player เหลือ ${_playerMpLeft} Mp → ${window.Online?.isOnline?'Guest':'AI'} +${_playerMpLeft} Mp!`,'');
  }}
  // Player MP refills at end of their turn
  G.players[0].mp=getEffectiveMpMax(0);
  G.players[prevPi].atLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
  G.players[prevPi].dfLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
  handAttackedThisTurn=false;
  G.currentPlayer=G.currentPlayer===0?1:0;
  const pi=G.currentPlayer;
  subTurnNum++;
  G.players[pi].atLine.forEach(s=>{s.exhausted=false;s.hasAttacked=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
  G.players[pi].dfLine.forEach(s=>{s.exhausted=false;s.hasAttacked=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
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
    // pi===1 turn — online: Guest turn; offline: AI turn
    if(window.Online?.isOnline && Online.isHost){
      startGuestTurn();
    } else {
      _noSealAtStart[1]=G.players[1].atLine.length===0&&G.players[1].dfLine.length===0;
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
}

// ══════════════════════════════════════════════
// ONLINE: INIT GAME + GUEST TURN MANAGEMENT
// ══════════════════════════════════════════════
function initGameOnline(guestDeckJSON){
  _noSealAtStart=[false,false];
  // Host (pi=0): own deck. Guest (pi=1): deck received from guest client.
  const saved=loadPlayerDeckFromStorage();
  const d0=saved?saved.seals:buildDeck();
  const md0=saved?saved.mystics:buildMysticDeck();
  let d1,md1;
  try{
    const gd=JSON.parse(guestDeckJSON||'{}');
    d1=buildDeckFromTemplate(gd);
    md1=buildMysticDeckFromTemplate(gd);
    if(!d1.length){d1=buildDeck();md1=buildMysticDeck();}
  }catch(e){d1=buildDeck();md1=buildMysticDeck();}
  G={
    players:[
      {deck:d0,hand:[],atLine:[],dfLine:[],shrine:[],mp:5,name:'Host',mysticDeck:md0,mysticHand:[],mysticGrave:[],areaMystics:[]},
      {deck:d1,hand:[],atLine:[],dfLine:[],shrine:[],mp:MAX_MP,name:'Guest',mysticDeck:md1,mysticHand:[],mysticGrave:[],areaMystics:[]}
    ],
    currentPlayer:0
  };
  for(let i=0;i<5;i++){drawCard(0,true);drawCard(1,true);}
  drawMysticCard(0,true);drawMysticCard(0,true);
  drawMysticCard(1,true);drawMysticCard(1,true);
  initDragDrop();
  initBattleBGM();
  phase='main';
  Online.onStatusChange=(status)=>{
    if(status==='disconnected'){
      const ov=document.getElementById('disconnect-overlay');
      if(ov&&!document.getElementById('win-screen')?.classList.contains('show'))ov.style.display='flex';
    }
  };
  log(`Turn ${turnNum} — Host's turn | MAIN PHASE`,'hi');
  render();
  Online.broadcastState();
  showTurnAnim('yours',()=>{});
}

function startGuestTurn(){
  _noSealAtStart[1]=G.players[1].atLine.length===0&&G.players[1].dfLine.length===0;
  drawsRemaining=turnNum>1?2:0;
  if(drawsRemaining===0){
    phase='main';
    log(`Turn ${turnNum} — Guest's turn | MAIN PHASE`,'hi');
    render();
    _turnAnimToGuest=true;Online.broadcastState();_turnAnimToGuest=false;
  } else {
    phase='draw';
    log(`Turn ${turnNum} — Guest's turn | DRAW PHASE`,'hi');
    render();
    _turnAnimToGuest=true;Online.broadcastState();_turnAnimToGuest=false;
  }
}

function endGuestTurn(){
  if(_noSealAtStart[1]&&G.players[1].atLine.length===0&&G.players[1].dfLine.length===0){
    log('Guest ไม่มี Seal ในสนามตลอดเทิร์น — Host ชนะ!','good');
    showWin(0,'Guest ไม่มี Seal ในสนามตลอดทั้งเทิร์น');Online.broadcastState();return;
  }
  // Vioria on player side: gain Guest's leftover MP before Guest refills
  {const _guestMpLeft=G.players[1].mp;
  const _vioP=[...G.players[0].atLine,...G.players[0].dfLine].filter(x=>x.card.id===56);
  if(_vioP.length>0&&_guestMpLeft>0){
    G.players[0].mp=Math.min(G.players[0].mp+_guestMpLeft,getEffectiveMpMax(0));
    log(`Vioria [Ability]: Guest เหลือ ${_guestMpLeft} Mp → Host +${_guestMpLeft} Mp!`,'good');
  }}
  // Guest MP refills at end of their turn
  G.players[1].mp=getEffectiveMpMax(1);
  G.players[1].atLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
  G.players[1].dfLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
  handAttackedThisTurn=false;
  G.currentPlayer=0;
  subTurnNum++;
  [0,1].forEach(rpi=>{
    G.players[rpi].atLine.forEach(s=>{s.exhausted=false;s.hasAttacked=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
    G.players[rpi].dfLine.forEach(s=>{s.exhausted=false;s.hasAttacked=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
  });
  {const p=G.players[0];const thor=p.dfLine.find(s=>s.card.id===76);
  if(thor&&G.players[1].atLine.length>0){p.dfLine.splice(p.dfLine.findIndex(s=>s.uid===thor.uid),1);p.atLine.push(thor);log('Thor [Ability]: ย้ายไป At Line อัตโนมัติ','');}}
  {const p=G.players[0];const dk=p.dfLine.find(s=>s.card.id===63);
  if(dk){p.dfLine.splice(p.dfLine.findIndex(s=>s.uid===dk.uid),1);p.atLine.push(dk);log('Dread Knight [Ability]: ย้ายไป At Line อัตโนมัติ','');}}
  {for(let rpi=0;rpi<2;rpi++){const owner=G.players[rpi];
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

function guestDeploy(card,idx,line){
  if(G.currentPlayer!==1){return;}
  if(pendingCb){logErr('ไม่สามารถลงการ์ดระหว่าง Interfere Step');Online.broadcastState();return;}
  if(phase!=='main'&&phase!=='main2'){logErr('Deploy ได้เฉพาะ Main Phase');Online.broadcastState();return;}
  const p=G.players[1];
  const mc=getEffectiveMc(card);
  if(p.mp<mc){logErr(`Mp ไม่พอ (ต้องการ ${mc})`);Online.broadcastState();return;}
  if(card.id===63)line='at';
  const target=line==='at'?p.atLine:p.dfLine;
  showActionQueue(`⬇ Guest ลงการ์ด <b>${card.name}</b> → ${line==='at'?'At':'Df'} Line`,()=>{
    p.hand.splice(idx,1);p.mp-=mc;
    target.push(makeFieldCard(card,true));
    broadcastSound('Deploy');
    log(`Guest deployed ${card.name} to ${line==='at'?'At':'Df'} Line`,'good');
    if(card.id===90) triggerAndreAbility(1);
    if(card.id===20){const oppMH=G.players[0].mysticHand||[];log(`Angel of Sword [Ability]: เห็น Mystic ฝ่ายตรงข้าม — ${oppMH.length>0?oppMH.map(m=>m.name).join(', '):'(ไม่มี)'}`,'');}
    if(card.id===72&&(p.mysticGrave||[]).length>0){G._pendingGuestDD=true;}
    checkLose();render();Online.broadcastState();
  },null,card,'⬇ Guest Deploying...');
}

function guestLineSwitch(fc,fromLine,toLine){
  if(G.currentPlayer!==1)return;
  if(pendingCb){logErr('ไม่สามารถเปลี่ยน Line ระหว่าง Interfere Step');Online.broadcastState();return;}
  if(phase!=='main'&&phase!=='main2'){logErr('เปลี่ยน Line ได้เฉพาะ Main Phase');Online.broadcastState();return;}
  if(fc.exhausted){logErr(`${fc.card.name} inactive`);Online.broadcastState();return;}
  if(fc.deployedTurn>=turnNum){logErr(`${fc.card.name} ลงในเทิร์นนี้ ยังเปลี่ยน line ไม่ได้`);Online.broadcastState();return;}
  if(fc.lineSwitchedTurn>=turnNum){logErr(`${fc.card.name} เปลี่ยน line ไปแล้วในเทิร์นนี้`);Online.broadcastState();return;}
  if(fc.curses?.some(c=>c.type==='freeze'||c.type==='stone')){logErr(`${fc.card.name} ติด Freeze/Stone Curse — เปลี่ยน line ไม่ได้`);Online.broadcastState();return;}
  const p=G.players[1];
  const src=fromLine==='at'?p.atLine:p.dfLine;
  const dst=toLine==='at'?p.atLine:p.dfLine;
  if(!src.some(f=>f.uid===fc.uid))return;
  showActionQueue(`${fc.card.name} → ย้ายไป ${toLine==='at'?'At':'Df'} Line`,()=>{
    const i=src.findIndex(f=>f.uid===fc.uid);
    if(i>=0)src.splice(i,1);
    fc.lineSwitchedTurn=turnNum;
    dst.push(fc);
    broadcastSound('Deploy');
    log(`Guest moved ${fc.card.name} to ${toLine==='at'?'At':'Df'} Line`,'good');
    render();
    Online.broadcastState();
  },null,fc.card,`→ ${toLine==='at'?'At':'Df'} Line`);
}

function guestNextPhase(){
  if(G.currentPlayer!==1)return;
  if(_battleAnimPlaying)return;
  if(phase==='draw'&&drawsRemaining>0)return; // block Next Phase while draws are pending
  cancelAction();
  if(phase==='draw'){phase='main';log(`Turn ${turnNum} — Guest's turn | MAIN PHASE`,'hi');}
  else if(phase==='main'){
    phase='battle';attackerSeal=null;handAttackedThisTurn=false;log('Guest: BATTLE PHASE','hi');
    render();Online.broadcastState();
    showBattlePhaseAnim(()=>{});
    return;
  }
  else if(phase==='battle'){phase='main2';attackerSeal=null;log('Guest: MAIN PHASE 2','hi');}
  else if(phase==='main2'){phase='end';endGuestTurn();return;}
  render();
  Online.broadcastState();
}

function guestDeclareAttack(atkIdx){
  if(!attackerSeal)return;
  const fc=attackerSeal.fc;
  if(fc.activeMultiAtk&&fc.hitsLeft>0){
    log(`${fc.card.name}: ${fc.activeMultiAtk.name} ×${fc.hitsLeft} เหลือ — เลือกเป้าหมาย`,'hi');
    Online.broadcastState();return;
  }
  const fusionAtks=getActiveAtks(fc);
  guestPendingAtkIdx=(atkIdx!=null&&fusionAtks[atkIdx])?atkIdx:null;
  if(fusionAtks.length>0&&guestPendingAtkIdx!==null){
    log(`${fc.card.name}: ${fusionAtks[guestPendingAtkIdx].name} — คลิก Seal ของ Host เพื่อโจมตี`,'hi');
  } else if(fusionAtks.length>0){
    log(`${fc.card.name}: ${fusionAtks[0].name} — คลิก Seal ของ Host เพื่อโจมตี`,'hi');
    guestPendingAtkIdx=0;
  } else {
    log(`${fc.card.name} — คลิก Seal ของ Host เพื่อโจมตี`,'hi');
  }
  render();
  Online.broadcastState();
}

function guestResolveAttack(attFC,defFC,defLine){
  const attPi=1,defPi=0;
  const att=attFC.card;
  const p=G.players[attPi];
  let attAt=getEffectiveAt(attFC);
  const fusionAtks=getActiveAtks(attFC);
  let usedAtk=null;
  if(fusionAtks.length>0){
    const atkIdx=(guestPendingAtkIdx!=null&&fusionAtks[guestPendingAtkIdx])?guestPendingAtkIdx:0;
    usedAtk=fusionAtks[atkIdx];
    guestPendingAtkIdx=null;
    const usedAtkNetMp=Math.max(0,usedAtk.mp-getMysticMaReduction(attFC));
    if(p.mp<usedAtkNetMp){logErr(`Mp ไม่พอ (ต้องการ ${usedAtkNetMp})`);Online.broadcastState();return;}
    p.mp-=usedAtkNetMp;
    attAt=_fusionAtkAt(usedAtk.at,attFC);
    if(usedAtk.all){
      showActionQueue(`${att.name} → <b>${usedAtk.name}</b> (ALL)`,()=>{
        if(attFC.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${att.name} ถูก Stone/Freeze — โจมตีถูกยกเลิก!`,'bad');attackerSeal=null;render();Online.broadcastState();return;}
        log(`${att.name}: ${usedAtk.name} (ALL)!`,'hi');
        const allTargets=[...G.players[defPi].atLine.map(f=>({fc:f,line:'at'})),...G.players[defPi].dfLine.map(f=>({fc:f,line:'df'}))];
        attFC.exhausted=true;attFC.hasAttacked=true;attackerSeal=null;
        animateAllTargets(attFC,allTargets,attAt,usedAtk.name,attPi,defPi,()=>{checkLose();render();Online.broadcastState();});
      },null,attFC.card,'⚔ Attacking...');
      return;
    }
  } else {
    const maCost=attFC.sevenSilverFree?0:Math.max(0,(att.ma||1)-getMysticMaReduction(attFC));
    if(p.mp<maCost){logErr(`Mp ไม่พอ (ต้องการ ${maCost})`);Online.broadcastState();return;}
    p.mp-=maCost;
  }
  showActionQueue(`${att.name} → ⚔ ${defFC.card.name}`,()=>{
    if(attFC.curses?.some(c=>c.type==='stone'||c.type==='freeze')){
      log(`${att.name} ถูก Stone/Freeze — โจมตีถูกยกเลิก!`,'bad');
      attackerSeal=null;render();Online.broadcastState();return;
    }
    attAt=usedAtk?_fusionAtkAt(usedAtk.at,attFC):getEffectiveAt(attFC);
    log(`${att.name} ⚔ ${defFC.card.name}!`,'hi');
    combatAnim(attFC,defFC,attAt,defLine,false,()=>{
      dealDamage(attFC,defFC,attAt,'normal attack',attPi,defPi,defLine);
      if(usedAtk?.hits>1){
        attFC.activeMultiAtk={...usedAtk};
        attFC.hitsLeft=usedAtk.hits-1;
        attackerSeal=null;
      } else {
        const sevenSilverAlive=hasMysticDoubleAtk(attFC)&&!attFC.hasAttacked&&!attFC.sevenSilverFree&&
          [...G.players[attPi].atLine,...G.players[attPi].dfLine].some(x=>x.uid===attFC.uid);
        if(sevenSilverAlive){
          attFC.hasAttacked=true;
          attFC.sevenSilverFree=true;
          log(`${att.name} [Seven Silver]: โจมตีได้อีกครั้ง (ฟรี)! เลือก ${att.name} แล้วตีเลย`,'hi');
          attackerSeal=null;
        } else {
          attFC.exhausted=true;attFC.hasAttacked=true;attFC.sevenSilverFree=false;attackerSeal=null;
        }
      }
      checkLose();render();Online.broadcastState();
    });
  },null,attFC.card,'⚔ Attacking...');
}

// ── Guest field-click handler (called from clickFieldSeal for online guest) ──
function _clickFieldSealGuest(fc,pi,line){
  const localPi=1,remotePi=0;

  // Interfere window: allow guest to use interfere skills or attach PS mystic
  if(pendingCb){
    if(guestMysticPlayMode&&guestMysticPlayMode.mysticCard.interfere&&pi!==localPi){
      Online.sendGuestAction({action:'guestMysticPSTarget',targetUid:fc.uid});
      guestMysticPlayMode=null;render();return;
    }
    if(guestHandDiscardMode)return; // hand-card picker active
    // Unified choice modal for guest: interfere skills (own, unused) + view + cancel
    const p=G.players[localPi];
    const avail=(pi===localPi&&!fc.hasUsedSkill&&G.currentPlayer!==localPi)
      ? getCardSkills(fc).filter(s=>s.interfere&&p.mp>=s.mp&&(s.type!=='handDiscard'||p.hand.length>0))
      : [];
    document.getElementById('fa-title').textContent=fc.card.name;
    const _opts=document.getElementById('fa-opts');_opts.innerHTML='';
    avail.forEach(s=>{
      const idx=getCardSkills(fc).indexOf(s);
      addFAOpt(s.label,()=>{
        closeFAModal();
        Online.sendGuestAction({action:'interfere',uid:fc.uid,skillIdx:idx});
      });
    });
    addFAOpt('👁 ดูการ์ด',()=>{closeFAModal();openCardViewer(fc.card,fc);});
    addFAOpt('✗ ยกเลิก',()=>{closeFAModal();});
    document.getElementById('fa-modal').classList.add('show');
    return;
  }

  if(G.currentPlayer!==localPi)return;

  // Guest PS mystic targeting: click any seal to attach
  if(guestMysticPlayMode){
    const mc=guestMysticPlayMode.mysticCard;
    const _sendPS=(extraData)=>{
      Online.sendGuestAction({action:'guestMysticPSTarget',targetUid:fc.uid,...(extraData&&{extraData})});
      guestMysticPlayMode=null;render();
    };
    // Magical World / Chaotic World: pick element locally on guest
    if(mc.id===33||mc.id===39){
      const allEls=['fire','water','earth','wind','light','darkness'];
      const elements=mc.id===33?allEls:allEls.filter(e=>e!==fc.card.el);
      showMysticPicker(`${mc.name} — เลือกธาตุสำหรับ ${fc.card.name}`,elements.map(el=>({label:el,data:el})),el=>_sendPS({element:el}));
      return;
    }
    // Galahad/Crescent/WW: pick bonus locally if card qualifies for multiple options
    if(mc.id===18||mc.id===19||mc.id===24){
      const mid=mc.id;let opts=[];
      if(mid===18){if(fc.card.tribe==='Knight')opts.push({label:'[Knight] At +2',data:{at:2}});if(fc.card.el==='wind')opts.push({label:'[Wind] At +2 Sp +1',data:{at:2,sp:1}});}
      if(mid===19){if(fc.card.el==='darkness')opts.push({label:'[Dark] At +2',data:{at:2}});if(fc.card.el==='water')opts.push({label:'[Water] At +1, Ma -1',data:{at:1,maRed:1}});}
      if(mid===24){if(fc.card.tribe==='Mage')opts.push({label:'[Mage] At +2',data:{at:2}});if(fc.card.el==='earth')opts.push({label:'[Earth] At +2 Df +1',data:{at:2,df:1}});}
      if(opts.length>1){showMysticPicker(mc.name,opts,d=>_sendPS(d));return;}
    }
    _sendPS();return;
  }

  // Guest skill targeting: click valid target to execute
  if(guestSkillMode){
    const skill=(getCardSkills(guestSkillMode.fc)||[])[guestSkillMode.skillIdx];
    if(skill&&skill.filter&&skill.filter(fc)){
      Online.sendGuestAction({action:'guestSkillTarget',targetUid:fc.uid,targetPi:pi,targetLine:line});
      guestSkillMode=null;render();
    } else {
      guestSkillMode=null;Online.sendGuestAction({action:'guestCancelSkill'});render();
    }
    return;
  }

  // Guest fusion material selection
  if(guestFusionMainFC){
    if(pi===localPi&&canBeGuestFusionMaterial(fc)){
      Online.sendGuestAction({action:'guestFuseMaterial',uid:fc.uid});
    } else {
      guestFusionMainFC=null;Online.sendGuestAction({action:'guestCancelFusion'});render();
    }
    return;
  }

  if(phase==='main'||phase==='main2'){
    if(pi===localPi){updatePlayerPreview(fc.card,fc);showFieldActionGuest(fc,line);}
    return;
  }
  if(phase==='battle'){
    if(pi===localPi&&!attackerSeal){
      if(fc.exhausted||(fc.hasAttacked&&!fc.sevenSilverFree)){log(`${fc.card.name} already acted`,'');return;}
      if(fc.curses?.some(c=>c.type==='stone')){logErr(`Stone Curse — โจมตีไม่ได้`);return;}
      if(fc.curses?.some(c=>c.type==='freeze')){logErr(`Freeze Curse — โจมตีไม่ได้`);return;}
      if(line==='df'&&fc.card.id!==10&&fc.card.id!==52){log('Df Line ไม่สามารถโจมตีได้','');return;}
      attackerSeal={fc,line};
      Online.sendGuestAction({action:'selectAttacker',uid:fc.uid,line});
      render();return;
    }
    if(pi===remotePi&&attackerSeal){
      if(hasMysticProtect(fc)){log(`${fc.card.name} ถูกป้องกัน Silent Prohibitor — โจมตีไม่ได้!`,'bad');return;}
      Online.sendGuestAction({action:'selectTarget',targetUid:fc.uid,targetLine:line});
      return;
    }
  }
}

// Guest FA modal: full options (line switch, fusion, unfuse, skills)
function showFieldActionGuest(fc,line){
  document.getElementById('fa-title').textContent=fc.card.name;
  const opts=document.getElementById('fa-opts');opts.innerHTML='';
  addFAOpt('👁 View Card',()=>{closeFAModal();openCardViewer(fc.card,fc);});
  if(fc.curses?.some(c=>c.type==='stone')){
    const b=addFAOpt('🪨 Stone Curse — สั่งการไม่ได้',()=>{});b.disabled=true;
    document.getElementById('fa-modal').classList.add('show');return;
  }
  const p=G.players[1];
  const isFrozenOrStoned=fc.curses?.some(c=>c.type==='freeze'||c.type==='stone');
  const canSwitch=!fc.exhausted&&!fc.hasUsedSkill&&!isFrozenOrStoned&&fc.deployedTurn<turnNum&&(fc.lineSwitchedTurn||0)<turnNum;
  const otherLine=line==='at'?'df':'at';
  const sw=addFAOpt(`⟷ Move to ${otherLine==='at'?'At':'Df'} Line`,()=>{
    closeFAModal();
    Online.sendGuestAction({action:'lineSwitch',uid:fc.uid,fromLine:line,toLine:otherLine});
  });
  if(!canSwitch)sw.disabled=true;
  if(!fc.charmed&&!fc.exhausted&&!fc.hasUsedSkill&&fc.fusedAtTurn!==turnNum&&fc.card.fuse&&fc.card.fuse.length>0){
    const mats=findGuestFusionMaterials(fc);
    const fuseBtn=addFAOpt('⚡ Fuse',()=>{
      closeFAModal();
      guestFusionMainFC=fc;
      Online.sendGuestAction({action:'guestStartFusion',uid:fc.uid});
      log(`${fc.card.name} — เลือกการ์ดวัสดุรวมร่าง (คลิก Cancel เพื่อยกเลิก)`,'hi');
      render();
    });
    if(!mats.length)fuseBtn.disabled=true;
  }
  if(!fc.charmed&&!fc.exhausted&&!fc.hasUsedSkill&&fc.fused&&fc.fusedSinceTurn<turnNum){
    addFAOpt('↩ Unfuse',()=>{
      closeFAModal();
      Online.sendGuestAction({action:'guestUnfuse',uid:fc.uid});
    });
  }
  const skills=getCardSkills(fc);
  skills.forEach((skill,idx)=>{
    const canUse=!fc.hasUsedSkill&&p.mp>=skill.mp&&(skill.type!=='handDiscard'||p.hand.length>0);
    const btn=addFAOpt(skill.label,()=>{
      closeFAModal();
      if(skill.type==='handDiscard'){
        Online.sendGuestAction({action:'guestStartHandDiscard',uid:fc.uid,skillIdx:idx});
      } else if(skill.type==='selfSkill'){
        if(skill.effect==='drawCardChoice'){
          showDeltaDDrawModal((type)=>{Online.sendGuestAction({action:'guestSelfSkill',uid:fc.uid,skillIdx:idx,drawType:type});});
        } else {
          Online.sendGuestAction({action:'guestSelfSkill',uid:fc.uid,skillIdx:idx});
        }
      } else if(skill.type==='garudaInterfere'||skill.type==='phoenixInterfere'){
        logErr(`ใช้ได้เฉพาะ Action Queue`);
      } else if(skill.type==='handPickBeast'){
        const beasts=p.hand.map((c,i)=>({c,i})).filter(({c})=>c.tribe==='Beast');
        if(!beasts.length){logErr('ไม่มี [Beast] ในมือ');return;}
        document.getElementById('fa-title').textContent=`${fc.card.name}: เลือก [Beast] ลงสนาม`;
        const div=document.getElementById('fa-opts');div.innerHTML='';
        beasts.forEach(({c,i})=>{
          addFAOpt(`${c.name} (Lv${c.lv} At${c.at})`,()=>{
            closeFAModal();
            Online.sendGuestAction({action:'guestHandPickBeast',uid:fc.uid,skillIdx:idx,cardIdx:i});
          });
        });
        document.getElementById('fa-modal').classList.add('show');
      } else {
        Online.sendGuestAction({action:'guestStartSkill',uid:fc.uid,skillIdx:idx});
        guestSkillMode={fc,skillIdx:idx};
        log(`${fc.card.name} — เลือกเป้าหมาย (คลิกขวาเพื่อยกเลิก)`,'hi');
        render();
      }
    });
    if(!canUse)btn.disabled=true;
  });
  document.getElementById('fa-modal').classList.add('show');
}

// ══════════════════════════════════════════════
// GUEST ACTIONS (host-side execution)
// ══════════════════════════════════════════════

function guestDrawSeal(){
  if(G.currentPlayer!==1||phase!=='draw'||drawsRemaining<=0)return;
  const p=G.players[1];
  if(p.deck.length>0){drawCard(1,true,true);log('Guest จั่ว Seal','good');}
  else{log('Guest Seal Deck ว่าง','bad');}
  drawsRemaining--;
  if(drawsRemaining<=0){guestEnterDiscardOrMain();}
  else{render();Online.broadcastState();}
}

function guestDrawMystic(){
  if(G.currentPlayer!==1||phase!=='draw'||drawsRemaining<=0)return;
  const p=G.players[1];
  if((p.mysticDeck||[]).length>0){drawMysticCard(1,true,true);log('Guest จั่ว Mystic','good');}
  else{log('Guest Mystic Deck ว่าง','bad');}
  drawsRemaining--;
  if(drawsRemaining<=0){guestEnterDiscardOrMain();}
  else{render();Online.broadcastState();}
}

function guestEnterDiscardOrMain(){
  const p=G.players[1];
  const combined=p.hand.length+(p.mysticHand||[]).length;
  const sealMax=getEffectiveHandMax(1);
  const combinedMax=getEffectiveCombinedMax(1);
  const excess=Math.max(Math.max(0,combined-combinedMax),Math.max(0,p.hand.length-sealMax));
  if(excess>0){
    phase='discard';
    log(`Guest DISCARD STEP — ทิ้งการ์ดให้เหลือ ${combinedMax} (เกิน ${excess} ใบ)`,'bad');
    render();
    Online.broadcastState();
  } else {
    guestOnDrawDone();
  }
}

function guestOnDrawDone(){
  phase='main';
  log(`Turn ${turnNum} — Guest's turn | MAIN PHASE`,'hi');
  render();
  Online.broadcastState();
}

function guestForceDiscardSeal(cardIdx){
  if(G.currentPlayer!==1||phase!=='discard')return;
  const p=G.players[1];
  if(cardIdx<0||cardIdx>=p.hand.length)return;
  const card=p.hand.splice(cardIdx,1)[0];
  p.shrine.push(card);
  broadcastSound('Flip');
  log(`Guest ทิ้ง ${card.name} ไปยัง Shrine`,'bad');
  _afterGuestForcedDiscard();
}

function guestForceDiscardMystic(mysticIdx){
  if(G.currentPlayer!==1||phase!=='discard')return;
  const mhand=G.players[1].mysticHand||[];
  if(mysticIdx<0||mysticIdx>=mhand.length)return;
  const card=mhand.splice(mysticIdx,1)[0];
  (G.players[1].mysticGrave=G.players[1].mysticGrave||[]).push(card);
  log(`Guest ทิ้ง Mystic ${card.name}`,'bad');
  _afterGuestForcedDiscard();
}

function _afterGuestForcedDiscard(){
  const p=G.players[1];
  const combined=p.hand.length+(p.mysticHand||[]).length;
  const sealMax=getEffectiveHandMax(1);
  const combinedMax=getEffectiveCombinedMax(1);
  const excess=Math.max(Math.max(0,combined-combinedMax),Math.max(0,p.hand.length-sealMax));
  render();
  if(excess<=0){guestOnDrawDone();}
  else{Online.broadcastState();}
}

function findGuestFusionMaterials(mainFC){
  const p=G.players[1];
  return [...p.atLine,...p.dfLine].filter(m=>{
    if(m.uid===mainFC.uid||m.fused||newFromHand(m)||hasPSMystic(m))return false;
    return fuseMaterialHelps(mainFC,m.card);
  });
}

function canBeGuestFusionMaterial(fc){
  if(!guestFusionMainFC)return false;
  if(fc.uid===guestFusionMainFC.uid||fc.fused||newFromHand(fc)||hasPSMystic(fc))return false;
  if(fc.curses?.length>0)return false;
  if(fc.wasMainFusedTurn===turnNum)return false;
  return fuseMaterialHelps(guestFusionMainFC,fc.card);
}

function guestDoFusion(mainFC,materialFC){
  if(!fuseMaterialHelps(mainFC,materialFC.card)){logErr('การ์ดนี้ไม่ตรง requirement');Online.broadcastState();return;}
  showActionQueue(`${mainFC.card.name} + ${materialFC.card.name} รวมร่าง`,()=>{
    // Re-validate after AQ window — PS mystic may have been attached during interfere
    if(hasPSMystic(materialFC)){
      log(`${materialFC.card.name} มี PS Mystic — รวมร่างถูกยกเลิก`,'bad');
      guestFusionMainFC=null;render();Online.broadcastState();return;
    }
    const p=G.players[1];
    const rm=arr=>{const i=arr.findIndex(x=>x.uid===materialFC.uid);if(i>=0)arr.splice(i,1);};
    rm(p.atLine);rm(p.dfLine);
    mainFC.fusionStack.push(materialFC);
    mainFC.fusionAtks=getUnlockedAtks(mainFC);
    mainFC.fused=true;
    if(!mainFC.fusedSinceTurn)mainFC.fusedSinceTurn=turnNum;
    mainFC.fusedAtTurn=turnNum;
    broadcastSound('Fusion Complete');
    const atkNames=mainFC.fusionAtks.map(a=>a.name).join(', ')||'(กำลังสะสม...)';
    log(`+${materialFC.card.name} → ${mainFC.card.name}: ${atkNames}`,'good');
    if(!findGuestFusionMaterials(mainFC).length){guestFusionMainFC=null;}
    else{log('เลือกการ์ดต่อ หรือกด Cancel เพื่อหยุด','hi');}
    render();
    Online.broadcastState();
  },mainFC,mainFC.card,'⚡ Guest Fusing...');
}

function guestDoUnfuse(fc){
  showActionQueue(`${fc.card.name} แยกรวมร่าง`,()=>{
    const p=G.players[1];
    const mainLine=p.atLine.some(x=>x.uid===fc.uid)?'atLine':'dfLine';
    fc.fusionStack.forEach(mfc=>{p[mainLine].push(mfc);});
    fc.fusionStack=[];fc.fusionAtks=[];fc.fused=false;fc.fusedSinceTurn=null;fc.wasMainFusedTurn=turnNum;
    guestFusionMainFC=null;
    log(`${fc.card.name} unfused`,'');
    render();
    Online.broadcastState();
  },null,fc.card,'↩ Unfusing...');
}

function guestExecuteHandDiscard(cardIdx){
  if(!guestHandDiscardMode)return;
  const {fc,skillIdx}=guestHandDiscardMode;
  const p=G.players[1];
  const skill=getCardSkills(fc)[skillIdx];
  if(!skill||p.mp<skill.mp){logErr('Mp ไม่พอ');guestHandDiscardMode=null;render();Online.broadcastState();return;}
  if(cardIdx<0||cardIdx>=p.hand.length)return;
  const card=p.hand[cardIdx];
  p.mp-=skill.mp;fc.hasUsedSkill=true;
  p.hand.splice(cardIdx,1);p.shrine.push(card);
  broadcastSound('Flip');
  fc.atBoosts=(fc.atBoosts||[]);
  fc.atBoosts.push({amount:card.lv,expiresBeforeSubTurn:subTurnNum+2});
  log(`${fc.card.name} [Interfere]: ทิ้ง ${card.name} (Lv${card.lv}) → At +${card.lv}!`,'good');
  guestHandDiscardMode=null;
  checkLose();render();Online.broadcastState();
}

function guestExecuteSelfSkill(skillFC,skillIdx,drawType){
  const p=G.players[1],opp=G.players[0];
  const skill=getCardSkills(skillFC)[skillIdx];
  if(!skill||p.mp<skill.mp){logErr('Mp ไม่พอ');return;}
  broadcastSound('Skill');
  if(skill.effect==='drawCardChoice'){
    showActionQueue(`${skillFC.card.name} [Skill] จั่วการ์ด 1 ใบ`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(drawType==='mystic'){
        if((p.mysticDeck||[]).length){drawMysticCard(1,true,true);log(`${skillFC.card.name} [Skill]: จั่ว Mystic 1 ใบ!`,'good');}
        else log(`${skillFC.card.name} [Skill]: ไม่มี Mystic ในกอง`,'bad');
      } else {
        if(p.deck.length){drawCard(1,true,true);log(`${skillFC.card.name} [Skill]: จั่ว Seal 1 ใบ!`,'good');}
        else log(`${skillFC.card.name} [Skill]: ไม่มีการ์ดในกอง`,'bad');
      }
      checkLose();render();Online.broadcastState();
    });return;
  }
  if(skill.effect==='returnSelfToDeck'){
    showActionQueue(`${skillFC.card.name} [Skill] คืนตัวเองสู่กอง + สลับ`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      skillFC.fusionStack.forEach(mfc=>{p.atLine.push(mfc);});
      const rmA=p.atLine.findIndex(x=>x.uid===skillFC.uid);if(rmA>=0)p.atLine.splice(rmA,1);
      const rmD=p.dfLine.findIndex(x=>x.uid===skillFC.uid);if(rmD>=0)p.dfLine.splice(rmD,1);
      p.deck.push(skillFC.card);shuffle(p.deck);
      log(`${skillFC.card.name} [Skill]: กลับสู่กองและสลับแล้ว!`,'good');
      checkLose();render();Online.broadcastState();
    });return;
  }
  if(skill.effect==='freezeAll'){
    showActionQueue(`${skillFC.card.name} [Skill] Freeze Curse ศัตรูทุกตัว 1 Turn`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      const enemies=[...opp.atLine,...opp.dfLine];
      enemies.forEach(t=>{t.curses=(t.curses||[]);if(!t.curses.some(c=>c.type==='freeze'))t.curses.push({type:'freeze',expiresAtSubTurn:subTurnNum+2});});
      broadcastSound('Freeze');
      [...opp.atLine].forEach(t=>{const i=opp.atLine.findIndex(x=>x.uid===t.uid);if(i>=0){opp.atLine.splice(i,1);opp.dfLine.push(t);}});
      log(`${skillFC.card.name} [Skill]: ศัตรู ${enemies.length} ตัวติด Freeze!`,'good');
      checkLose();render();Online.broadcastState();
    });return;
  }
  if(skill.effect==='shrineToHand'){
    if(!p.shrine.length){logErr('Shrine ว่างเปล่า');return;}
    document.getElementById('fa-title').textContent=`${skillFC.card.name}: เลือกจาก Shrine`;
    const div=document.getElementById('fa-opts');div.innerHTML='';
    p.shrine.forEach(card=>{
      addFAOpt(`${card.name} (Lv${card.lv} At${card.at})`,()=>{
        closeFAModal();
        showActionQueue(`${skillFC.card.name} [Skill] → ${card.name} ขึ้นมือ`,()=>{
          p.mp-=skill.mp;skillFC.hasUsedSkill=true;
          if(p.hand.length>=getEffectiveHandMax(1)){logErr('มือเต็ม!');return;}
          const si=p.shrine.indexOf(card);if(si>=0)p.shrine.splice(si,1);
          p.hand.push(card);
          log(`${skillFC.card.name} [Skill]: ${card.name} ขึ้นมือ!`,'good');
          checkLose();render();Online.broadcastState();
        });
      });
    });
    document.getElementById('fa-modal').classList.add('show');return;
  }
  if(skill.effect==='allToAtLine'){
    showActionQueue(`${skillFC.card.name} [Skill] Seal ทุกใบย้ายไป At Line`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      const toMove=[...p.dfLine];p.dfLine.length=0;
      toMove.forEach(fc=>{p.atLine.push(fc);});
      const oppMove2=[...opp.dfLine];opp.dfLine.length=0;
      oppMove2.forEach(fc=>{opp.atLine.push(fc);});
      log(`${skillFC.card.name} [Skill]: Seal ทุกใบย้ายไป At Line!`,'good');
      checkLose();render();Online.broadcastState();
    });return;
  }
  if(skill.effect==='returnSelfToHand'){
    showActionQueue(`${skillFC.card.name} [Skill] กลับสู่มือ`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      const rmA=p.atLine.findIndex(x=>x.uid===skillFC.uid);if(rmA>=0)p.atLine.splice(rmA,1);
      const rmD=p.dfLine.findIndex(x=>x.uid===skillFC.uid);if(rmD>=0)p.dfLine.splice(rmD,1);
      const ok=bounceSealToHand(skillFC,1);
      log(`${skillFC.card.name} [Skill]: ${ok?'กลับสู่มือ!':'ลง Shrine (มือเต็ม)!'}`,ok?'good':'bad');
      checkLose();render();Online.broadcastState();
    });return;
  }
  if(skill.effect==='massReset'){
    showActionQueue(`${skillFC.card.name} [Skill] Reset สนาม`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      for(let pi=0;pi<2;pi++){const own=G.players[pi];const all=[...own.atLine,...own.dfLine];own.atLine=[];own.dfLine=[];all.forEach(fc=>{_drainAllMystics(fc,pi);if(fc.fusionStack?.length)fc.fusionStack.forEach(m=>{_drainAllMystics(m,pi);own.deck.push(m.card);});own.deck.push(fc.card);});shuffle(own.deck);}
      for(let pi=0;pi<2;pi++){const own=G.players[pi];const tp=[...own.hand];own.hand=[];tp.forEach(c=>{own.atLine.push(makeFieldCard(c,true));});}
      log(`${skillFC.card.name} [Skill]: Reset สนาม!`,'good');
      checkLose();render();Online.broadcastState();
    });return;
  }
  if(skill.effect==='opponentMpDrain'){
    const amt=skill.drainAmt||1;
    showActionQueue(`${skillFC.card.name} [Skill] ฝ่ายตรงข้าม Mp -${amt}`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      opp.mp=Math.max(0,opp.mp-amt);
      log(`${skillFC.card.name} [Skill]: Host Mp -${amt}!`,'good');
      checkLose();render();Online.broadcastState();
    });return;
  }
  if(skill.effect==='zadinDoubleAttack'){
    function zadinHit(n,done){
      const cur=[...opp.atLine.map(fc=>({fc,line:'at'})),...opp.dfLine.map(fc=>({fc,line:'df'}))];
      if(!cur.length){done();return;}
      document.getElementById('fa-title').textContent=`Zadin [Skill] ครั้งที่ ${n}/2`;
      const div=document.getElementById('fa-opts');div.innerHTML='';
      cur.forEach(t=>{addFAOpt(`${t.fc.card.name} [${t.line==='at'?'At':'Df'}]`,()=>{
        closeFAModal();
        showActionQueue(`${skillFC.card.name} [Skill] (${n}/2) → ⚔ ${t.fc.card.name}`,()=>{
          combatAnim(skillFC,t.fc,8,t.line,false,()=>{
            dealDamage(skillFC,t.fc,8,'Zadin Skill',1,0,t.line);
            checkLose();render();Online.broadcastState();done();
          });
        });
      });});
      document.getElementById('fa-modal').classList.add('show');
    }
    showActionQueue(`${skillFC.card.name} [Skill] → Dragon Strike ×2`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      zadinHit(1,()=>{zadinHit(2,()=>{skillFC.exhausted=true;skillFC.hasAttacked=true;log(`${skillFC.card.name} [Skill]: โจมตีสำเร็จ 2 ครั้ง!`,'good');checkLose();render();Online.broadcastState();});});
    });return;
  }
}

function guestExecuteSkill(skillFC,skillIdx,targetFC,targetPi,targetLine){
  const p=G.players[1];
  const skill=(getCardSkills(skillFC)||[])[skillIdx];
  if(!skill)return;
  if(p.mp<skill.mp){logErr('Mp ไม่พอ');guestSkillMode=null;render();Online.broadcastState();return;}
  guestSkillMode=null;
  const _done=()=>{checkLose();render();Online.broadcastState();};
  if(skill.effect==='healCurse'){
    showActionQueue(`${skillFC.card.name} [Skill] → รักษา Curse ${targetFC.card.name}`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;targetFC.curses=[];
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} หาย Curse!`,'good');_done();
    });return;
  }
  if(skill.effect==='destroyTarget'){
    showActionQueue(`${skillFC.card.name} [Skill] → ทำลาย ${targetFC.card.name}`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;destroyByEffect(targetFC,targetPi);
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ถูกทำลาย!`,'good');_done();
    });return;
  }
  if(skill.effect==='deathCurse'){
    targetFC.curses=(targetFC.curses||[]);
    targetFC.curses.push({type:'death',expiresAtSubTurn:Infinity});
    broadcastSound('Skill');
    showActionQueue(`${skillFC.card.name} [Skill] → ☠ Death Curse ${targetFC.card.name}`,()=>{
      const _cleanDC=()=>{targetFC.curses=(targetFC.curses||[]).filter(c=>c.type!=='death');};
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      const hasDeath=(targetFC.curses||[]).some(c=>c.type==='death');
      _cleanDC();
      if(hasDeath){destroyByEffect(targetFC,targetPi);log(`${skillFC.card.name} [Skill]: ☠ Death Curse → ${targetFC.card.name} ถูกทำลาย!`,'good');}
      else log(`${skillFC.card.name} [Skill]: ☠ Death Curse ถูกแก้ไขระหว่าง Interfere!`,'bad');
      _done();
    });return;
  }
  if(skill.effect==='poisonCurse'){
    const turns=skill.turns||3;
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} ☠Poison ${turns}T`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      targetFC.curses=(targetFC.curses||[]);targetFC.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+(turns*2)});
      broadcastSound('Poison');log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ☠Poison!`,'good');_done();
    });return;
  }
  if(skill.effect==='stoneCurse'){
    const turns=skill.turns||1;const tl=turns===Infinity?'∞':turns+'';
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} 🪨Stone ${tl}T`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      targetFC.curses=(targetFC.curses||[]);targetFC.curses.push({type:'stone',expiresAtSubTurn:turns===Infinity?Infinity:subTurnNum+(turns*2)});
      broadcastSound('Stone');log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} 🪨Stone!`,'good');_done();
    });return;
  }
  if(skill.effect==='freezeCurse'){
    const turns=skill.turns||1;
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} ❄Freeze ${turns}T`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      targetFC.curses=(targetFC.curses||[]);targetFC.curses.push({type:'freeze',expiresAtSubTurn:subTurnNum+(turns*2)});
      broadcastSound('Freeze');
      const owner=G.players[targetPi];
      if(targetLine==='at'){const i=owner.atLine.findIndex(x=>x.uid===targetFC.uid);if(i>=0){owner.atLine.splice(i,1);owner.dfLine.push(targetFC);}}
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ❄Freeze!`,'good');_done();
    });return;
  }
  if(skill.effect==='charmCurse'){
    const turns=skill.turns||3;
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} 💗Charm ${turns}T`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      targetFC.charmed={originalPi:targetPi,originalLine:targetLine+'Line'};
      targetFC.curses=(targetFC.curses||[]);targetFC.curses.push({type:'charm',expiresAtSubTurn:subTurnNum+(turns*2)});
      targetFC.exhausted=false;targetFC.hasUsedSkill=false;
      broadcastSound('Charm');log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} 💗Charm!`,'good');_done();
    });return;
  }
  if(skill.effect==='lastDanceCurse'){
    const turns=skill.turns||2,atBonus=skill.atBonus||0;
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} Last Dance`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      targetFC.curses=(targetFC.curses||[]);targetFC.curses.push({type:'lastDance',atBonus,expiresAtSubTurn:subTurnNum+(turns*2)});
      broadcastSound('Skill');log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} Last Dance!`,'good');_done();
    });return;
  }
  if(skill.effect==='atBoost1SubTurn'){
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} +At1`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      targetFC.atBoosts=(targetFC.atBoosts||[]);targetFC.atBoosts.push({amount:1,expiresBeforeSubTurn:subTurnNum+1});
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} +At1!`,'good');_done();
    });return;
  }
  if(skill.effect==='spBoost1SubTurn'){
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} +Sp1`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      targetFC.spBoosts=(targetFC.spBoosts||[]);targetFC.spBoosts.push({amount:1,expiresBeforeSubTurn:subTurnNum+1});
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} +Sp1!`,'good');_done();
    });return;
  }
  if(skill.effect==='dfBoostMc'){
    const boostAmt=targetFC.card.mc;
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} +Df${boostAmt}`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      targetFC.dfBoosts=(targetFC.dfBoosts||[]);targetFC.dfBoosts.push({amount:boostAmt,expiresBeforeSubTurn:subTurnNum+1});
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} +Df${boostAmt}!`,'good');_done();
    });return;
  }
  if(skill.effect==='frozenToHand'){
    showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} ขึ้นมือ`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      const owner=G.players[targetPi];
      const fromArr=targetLine==='at'?owner.atLine:owner.dfLine;
      const i=fromArr.findIndex(x=>x.uid===targetFC.uid);
      if(i>=0){fromArr.splice(i,1);const ok=bounceSealToHand(targetFC,targetPi);log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ${ok?'ขึ้นมือ':'ลง Shrine (มือเต็ม)'}!`,ok?'good':'bad');}
      _done();
    });return;
  }
  if(skill.effect==='destroyOneMystic'){
    const actMys=getActiveMystics(targetFC);
    const doDestroy=mEntry=>{
      showActionQueue(`${skillFC.card.name} [Skill] → ทำลาย ${mEntry.mystic.name}`,()=>{
        p.mp-=skill.mp;skillFC.hasUsedSkill=true;
        _mysticSplice(targetFC,mEntry);
        log(`${skillFC.card.name} [Skill]: ทำลาย ${mEntry.mystic.name}!`,'good');_done();
      });
    };
    if(actMys.length===1){doDestroy(actMys[0]);}
    else{showMysticPicker(`เลือก Mystic บน ${targetFC.card.name}`,actMys.map(m=>({label:m.mystic.name,data:m})),m=>doDestroy(m));}
    return;
  }
  if(skill.effect==='sacrificeStep1'){
    const mc=targetFC.card.mc;
    showActionQueue(`${skillFC.card.name} [Skill] → Sacrifice ${targetFC.card.name} (Mc=${mc})`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      destroyByEffect(targetFC,targetPi);
      const remaining=[...G.players[1].atLine,...G.players[1].dfLine];
      if(!remaining.length){log(`${skillFC.card.name} [Skill]: ไม่มี Seal ให้ +At`,'');_done();return;}
      showMysticPicker(`Blaze Sage — เลือก Seal ที่จะ +At${mc} (1 Turn)`,remaining.map(bfc=>({label:bfc.card.name,data:bfc})),boostFC=>{
        boostFC.atBoosts=(boostFC.atBoosts||[]);
        boostFC.atBoosts.push({amount:mc,expiresBeforeSubTurn:subTurnNum+2});
        log(`${skillFC.card.name} [Skill]: Sacrifice ${targetFC.card.name}! +At${mc} → ${boostFC.card.name}!`,'hi');
        _done();
      });
    });
    return;
  }
  // Default: return to deck (Fairy Music Box)
  showActionQueue(`${skillFC.card.name} [Skill] → ${targetFC.card.name} คืนกอง`,()=>{
    p.mp-=skill.mp;skillFC.hasUsedSkill=true;
    const owner=G.players[targetPi];
    const fromArr=targetLine==='at'?owner.atLine:owner.dfLine;
    const i=fromArr.findIndex(x=>x.uid===targetFC.uid);
    if(i>=0)fromArr.splice(i,1);
    if(targetFC.fusionStack?.length)targetFC.fusionStack.forEach(m=>owner.shrine.push(m.card));
    owner.deck.push(targetFC.card);shuffle(owner.deck);
    log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} คืนกอง!`,'good');_done();
  });
}

function guestAttachPSMystic(mysticCard,mysticIdx,targetFC,extraData){
  const p=G.players[1];
  guestMysticPlayMode=null;
  if(!canAttachMystic(mysticCard,targetFC)){logErr(`ไม่สามารถติด ${mysticCard.name} กับ ${targetFC.card.name}`);render();Online.broadcastState();return;}
  const targetOwner=findFCOwner(targetFC);
  if(targetOwner&&G.players[targetOwner.pi].atLine.some(x=>x.card.id===67)){log(`Gregory the Bishop: ยกเลิก Mystic`,'bad');render();Online.broadcastState();return;}
  if(targetFC.card.id===82&&(!targetOwner||targetOwner.pi!==1)){log(`Heaven Knight: ยกเลิก Mystic ฝ่ายตรงข้าม!`,'bad');render();Online.broadcastState();return;}
  if(targetFC.card.id===22){log(`Delta-D [Ability]: ยกเลิก Mystic!`,'bad');render();Online.broadcastState();return;}
  if(hasMysticProtect(targetFC)){log(`${targetFC.card.name} ถูกป้องกัน — ติด Mystic ไม่ได้!`,'bad');render();Online.broadcastState();return;}
  _pendingMysticCard=mysticCard;
  _nextChainCard=mysticCard;
  const id=mysticCard.id,fc=targetFC;
  function spend(){p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);broadcastSound('Spell');}
  function addMysticEntry(atBonus=0,dfBonus=0,spBonus=0,flags={}){
    const expires=mysticCard.turns===999?Infinity:subTurnNum+(mysticCard.turns*2);
    if(mysticCard.turns!==0){
      fc.mystics=(fc.mystics||[]);
      fc.mystics.push({mystic:mysticCard,atBonus,dfBonus,spBonus,...flags,expiresBeforeSubTurn:expires,casterPi:G.players.indexOf(p)});
      if(flags.curseType){fc.curses=(fc.curses||[]);fc.curses.push({type:flags.curseType,expiresAtSubTurn:Infinity,fromPS:mysticCard.id});playSound(flags.curseType==='stone'?'Stone':flags.curseType==='freeze'?'Freeze':flags.curseType==='poison'?'Poison':flags.curseType==='charm'?'Charm':'Skill');}
    } else {
      (p.mysticGrave=p.mysticGrave||[]).push(mysticCard);
    }
    log(`${mysticCard.name} [Mystic] ติดกับ ${fc.card.name}!`,'good');
    checkLose();render();
    if(pendingCb)_enterChainMode(mysticCard.name);else Online.broadcastState();
  }
  function doAttach(atBonus=0,dfBonus=0,spBonus=0,flags={}){addMysticEntry(atBonus,dfBonus,spBonus,flags);}
  if(id===37){
    if(!fc.fused||!fc.fusionStack?.length){log(`${fc.card.name} ไม่ได้รวมร่าง`,'bad');render();Online.broadcastState();return;}
    spend();(p.mysticGrave=p.mysticGrave||[]).push(mysticCard);
    showActionQueue(`${mysticCard.name} → แยกการรวมร่าง ${fc.card.name}`,()=>{
      const owner=findFCOwner(fc);if(owner){const mainLine=owner.p.atLine.some(x=>x.uid===fc.uid)?'atLine':'dfLine';fc.fusionStack.forEach(m=>{owner.p[mainLine].push(m);});}
      fc.fusionStack=[];fc.fusionAtks=[];fc.fused=false;fc.fusedSinceTurn=null;fc.wasMainFusedTurn=turnNum;
      log(`${mysticCard.name}: ${fc.card.name} แยกรวมร่าง!`,'good');checkLose();render();Online.broadcastState();
    });return;
  }
  if(id===68){
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} willMind`,()=>{
      fc.willMind=true;
      (fc.mystics=fc.mystics||[]).push({mystic:mysticCard,atBonus:0,dfBonus:0,spBonus:0,willMind:true,expiresBeforeSubTurn:subTurnNum+1});
      log(`${mysticCard.name}: ${fc.card.name} willMind ON!`,'good');checkLose();render();Online.broadcastState();
    });return;
  }
  if(id===18){
    const opts=[];
    if(fc.card.tribe==='Knight')opts.push({label:'[Knight] At +2',data:{at:2}});
    if(fc.card.el==='wind')opts.push({label:'[Wind] At +2 Sp +1',data:{at:2,sp:1}});
    if(!opts.length){log(`${fc.card.name} ไม่ตรงเงื่อนไข Galahad`,'bad');render();return;}
    const d18=extraData||opts[0].data;
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d18.at||0,0,d18.sp||0));return;
  }
  if(id===19){
    const opts=[];
    if(fc.card.el==='darkness')opts.push({label:'[Dark] At +2',data:{at:2}});
    if(fc.card.el==='water')opts.push({label:'[Water] At +1, Ma -1',data:{at:1,maRed:1}});
    if(!opts.length){log(`${fc.card.name} ไม่ตรงเงื่อนไข Crescent`,'bad');render();return;}
    const d19=extraData||opts[0].data;
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d19.at||0,0,0,{maReduction:d19.maRed||0}));return;
  }
  if(id===21){
    const el=getEffectiveEl(fc);
    if(el==='light'||el==='fire'||el==='divine'||fc.card.tribe==='Divine'){spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} At +2`,()=>doAttach(2));}
    else{log(`${fc.card.name} ไม่ตรงเงื่อนไข Holy Sun (ธาตุ: ${el})`,'bad');render();}
    return;
  }
  if(id===24){
    const opts=[];
    if(fc.card.tribe==='Mage')opts.push({label:'[Mage] At +2',data:{at:2}});
    if(fc.card.el==='earth')opts.push({label:'[Earth] At +2 Df +1',data:{at:2,df:1}});
    if(!opts.length){log(`${fc.card.name} ไม่ตรงเงื่อนไข Werrian Wesley`,'bad');render();return;}
    const d24=extraData||opts[0].data;
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d24.at||0,d24.df||0));return;
  }
  if(id===25){
    const t=fc.card.tribe;const atB=(t==='Monster'||t==='Beast')?2:t==='Dragon'?1:0;
    if(!atB){log(`${fc.card.name} ไม่ตรงเงื่อนไข Beauty & the Beast`,'bad');render();return;}
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} At +${atB}`,()=>doAttach(atB));return;
  }
  if(id===29){
    if(fc.card.tribe!=='Evil'){log(`${fc.card.name} ต้องเป็น [Evil]`,'bad');render();return;}
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} At+2 Df+1 Sp+1`,()=>doAttach(2,1,1));return;
  }
  if(id===30){spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ติด Stone Curse ตราบที่ Houdini ยังติดอยู่`,()=>doAttach(0,0,0,{curseType:'stone'}));return;}
  if(id===31){spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} Df-${fc.card.lv} (1 Turn)`,()=>doAttach(0,-fc.card.lv));return;}
  if(id===32){spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} At-${fc.card.lv} (1 Turn)`,()=>doAttach(-fc.card.lv));return;}
  if(id===33){
    const el33=extraData?.element||'fire';
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ธาตุ ${el33}`,()=>{
      if(!_mwBenefitsFromEl(fc,el33)){log(`Magical World: ${fc.card.name} ไม่มีเงื่อนไขธาตุ ${el33} — Magical World ถูกทำลาย!`,'bad');checkLose();render();Online.broadcastState();return;}
      fc.magicalEl=el33;if(fc.fused)fc.fusionAtks=getUnlockedAtks(fc);doAttach(0,0,0,{elFusion:el33});
    });
    return;
  }
  if(id===36){spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ป้องกัน 1 Turn`,()=>doAttach(0,0,0,{protects:true}));return;}
  if(id===38){
    const effAt=getEffectiveAt(fc),effDf=getEffectiveDf(fc);const atB=effDf-effAt,dfB=effAt-effDf;
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} สลับ At↔Df (1 Turn)`,()=>doAttach(atB,dfB,0,{swapAtDf:true}));return;
  }
  if(id===39){
    const el39=extraData?.element||fc.card.el;
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ธาตุเป็น ${el39}`,()=>{doAttach();fc.card={...fc.card,el:el39};});
    return;
  }
  if(id===61){spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} โจมตีได้ 2 ครั้ง (1 Turn)`,()=>doAttach(0,0,0,{doubleAtk:true}));return;}
  if(id===69){
    const owner=findFCOwner(fc);
    const fromLine=owner&&owner.p.atLine.includes(fc)?'atLine':'dfLine';
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ติด Charm Curse ตราบที่ PS ยังติดอยู่`,()=>{
      fc.charmed={originalPi:owner?owner.pi:0,originalLine:fromLine};
      fc.exhausted=false;fc.hasUsedSkill=false;
      doAttach(0,0,0,{curseType:'charm'});
    });return;
  }
  spend();showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach());
}

function guestPlayNonPMystic(mysticCard,mysticIdx){
  const p=G.players[1];
  const id=mysticCard.id;
  _nextChainCard=mysticCard;
  let _spd=false;function spend(){if(_spd)return;_spd=true;p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);(p.mysticGrave=p.mysticGrave||[]).push(mysticCard);broadcastSound('Spell');}
  const allField=()=>[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];
  if(id===17){ // Holy Prayer — pick target first, THEN enter interfere chain
    const inInterfere=!!pendingCb;
    const ownSeals=[...G.players[1].atLine,...G.players[1].dfLine];
    const cursed=allField().filter(fc=>fc.curses?.length);
    const cureTargets=inInterfere?ownSeals:cursed;
    const withPS=allField().filter(fc=>getActiveMystics(fc).length&&!hasMysticProtect(fc));
    const _aqDescNow=document.getElementById('aq-desc')?.textContent||'';
    const pendingPSItem=(_pendingMysticCard?.pasted==='PS')&&pendingCb&&_aqDescNow?[{label:`[ยกเลิก] ${_aqDescNow}`,data:{_cancelPending:true,desc:_aqDescNow}}]:[];
    const modeOpts=[];
    if(cureTargets.length)modeOpts.push({label:'รักษา Curse ทุกชนิด',data:'cure'});
    if(withPS.length||pendingPSItem.length)modeOpts.push({label:'ทำลาย [PS] Mystic Card',data:'destroy'});
    if(!modeOpts.length){log('Holy Prayer: ไม่มีเป้าหมายที่ใช้ได้','bad');return;}
    showMysticPicker('Holy Prayer — เลือก',modeOpts,mode=>{
      if(mode==='cure'){
        log('Holy Prayer: คลิก Seal ที่ต้องการรักษา (คลิกขวาเพื่อยกเลิก)','hi');
        holyPrayerCureMode={targets:cureTargets,onSelect:(tfc)=>{
          holyPrayerCureMode=null;
          spend();
          const _prePi=findFCOwner(tfc)?.pi??0;
          const _wasAtLine=G.players[_prePi].atLine.some(x=>x.uid===tfc.uid);
          const _hpDesc=`Holy Prayer → รักษา ${tfc.card.name}`;
          const _hpCb=()=>{
            const _hadFreeze=(tfc.curses||[]).some(c=>c.type==='freeze');
            tfc.curses=[];
            if(_hadFreeze&&_wasAtLine){
              const _cpi=findFCOwner(tfc)?.pi??0;const _cp=G.players[_cpi];
              const _di=_cp.dfLine.findIndex(x=>x.uid===tfc.uid);
              if(_di>=0){_cp.dfLine.splice(_di,1);_cp.atLine.push(tfc);}
            }
            log(`Holy Prayer: รักษา Curse!`,'good');checkLose();render();Online.broadcastState();
          };
          if(inInterfere){
            if(_interfereStack.length>0){_interfereStack.unshift({desc:_hpDesc,cb:_hpCb});}
            else{const _o=pendingCb;pendingCb=()=>{_o();_hpCb();};}
            _enterChainMode(_hpDesc);
          }else{showActionQueue(_hpDesc,_hpCb);}
        }};
        render();
      } else {
        const sealOpts=withPS.map(fc=>({label:`${fc.card.name} [${getActiveMystics(fc).map(m=>m.mystic.name).join(',')}]`,data:fc}));
        showMysticPicker('Holy Prayer — เลือก PS Mystic',[...sealOpts,...pendingPSItem],tfc=>{
          if(tfc._cancelPending){
            spend();_stopAQTimer();_nextChainCard=mysticCard;
            // Thunder Bolt is in _interfereStack → pop it out; original action still proceeds
            // Otherwise it's in pendingCb itself → null it out
            const inStack=_interfereStack.length>0&&_pendingMysticCard?.pasted==='PS';
            showActionQueue(`Holy Prayer → ยกเลิก: ${tfc.desc}`,()=>{
              if(inStack){_interfereStack.pop();}else{pendingCb=null;}
              _pendingMysticCard=null;
              log(`Holy Prayer: ยกเลิก Effect!`,'good');checkLose();render();Online.broadcastState();
            });
            return;
          }
          const actMys=getActiveMystics(tfc);
          showMysticPicker('เลือก Mystic ที่จะทำลาย',actMys.map((m,i)=>({label:m.mystic.name,data:i})),mIdx=>{
            spend();
            showActionQueue(`Holy Prayer → ทำลาย ${actMys[mIdx].mystic.name}`,()=>{
              const _m=actMys[mIdx];_mysticSplice(tfc,_m);
              log(`Holy Prayer: ทำลาย Mystic!`,'good');checkLose();render();Online.broadcastState();
            });
          });
        });
      }
    });return;
  }
  if(id===40){
    const valid=p.shrine.filter(c=>!(mysticCard.exception_tribes||[]).includes(c.tribe));
    if(!valid.length){log('ไม่มี Seal ใน Shrine','bad');return;}
    spend();
    showActionQueue(`Benediction`,()=>{
      showMysticPicker('Benediction — เลือก Seal',valid.map(c=>({label:`${c.name} (Lv${c.lv})`,data:c})),c=>{
        const i=p.shrine.indexOf(c);
        if(i>=0&&p.hand.length<HAND_MAX){p.shrine.splice(i,1);p.hand.push(c);log(`Benediction: ${c.name} ขึ้นมือ!`,'good');}
        else log('มือเต็ม!','bad');
        checkLose();render();Online.broadcastState();
      });
    });return;
  }
  if(id===26){ // Inquisition — destroy any mystic (PS on seal OR PA area)
    const psTargets=allField().filter(fc=>getActiveMystics(fc).length);
    const paTargets=[];
    [0,1].forEach(pi=>{(G.players[pi].areaMystics||[]).forEach((am,i)=>{paTargets.push({pi,amIdx:i,am});});});
    if(!psTargets.length&&!paTargets.length){log('ไม่มี Mystic ในสนาม','bad');return;}
    const opts=[
      ...psTargets.map(fc=>({label:`[PS] ${fc.card.name}: ${getActiveMystics(fc).map(m=>m.mystic.name).join(',')}`,data:{type:'ps',fc}})),
      ...paTargets.map(({pi,amIdx,am})=>({label:`[PA] ${am.mystic.name} (${pi===0?'Host':'Guest'})`,data:{type:'pa',pi,amIdx}}))
    ];
    showMysticPicker('Inquisition — เลือก Mystic',opts,choice=>{
      if(choice.type==='pa'){
        spend();showActionQueue(`Inquisition → ทำลาย [PA] ${G.players[choice.pi].areaMystics[choice.amIdx].mystic.name}`,()=>{
          const _am=G.players[choice.pi].areaMystics.splice(choice.amIdx,1)[0];
          if(_am)(G.players[choice.pi].mysticGrave=G.players[choice.pi].mysticGrave||[]).push(_am.mystic);
          log(`Inquisition: ทำลาย PA Mystic!`,'good');checkLose();render();Online.broadcastState();
        });
      } else {
        const actMys=getActiveMystics(choice.fc);
        if(actMys.length===1){
          spend();showActionQueue(`Inquisition → ทำลาย ${actMys[0].mystic.name}`,()=>{
            const _m0=actMys[0];_mysticSplice(choice.fc,_m0);
            log(`Inquisition: ทำลาย Mystic!`,'good');checkLose();render();Online.broadcastState();
          });
        } else {
          showMysticPicker('เลือก Mystic ที่จะทำลาย',actMys.map((m,i)=>({label:m.mystic.name,data:i})),mIdx=>{
            spend();showActionQueue(`Inquisition → ทำลาย ${actMys[mIdx].mystic.name}`,()=>{
              const _mN=actMys[mIdx];_mysticSplice(choice.fc,_mN);
              log(`Inquisition: ทำลาย Mystic!`,'good');checkLose();render();Online.broadcastState();
            });
          });
        }
      }
    });
    return;
  }
  if(id===66){ // Sacrifice — destroy target seal + discard 2 hand cards
    if(p.hand.length<2){log('ต้องมี Seal ในมือ 2 ใบขึ้นไปจึงจะใช้ Sacrifice ได้','bad');return;}
    const allF=[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];
    const validSeals=allF.filter(fc=>!(mysticCard.exception_tribes||[]).includes(fc.card.tribe));
    if(!validSeals.length){log('ไม่มี Seal ที่สามารถทำลายได้','bad');return;}
    spend();
    showActionQueue(`Sacrifice [Guest]`,()=>{
      showMysticPicker('Sacrifice — เลือก Seal เป้าหมาย',validSeals.map(fc=>({label:`${fc.card.name} (${fc.card.tribe} Lv${fc.card.lv})`,data:fc})),targetFC=>{
        showMysticPicker('Sacrifice — เลือก Seal ทิ้ง (1/2)',p.hand.map(c=>({label:`${c.name} (${c.tribe} Lv${c.lv})`,data:c})),c1=>{
          const rest=p.hand.filter(c=>c!==c1);
          showMysticPicker('Sacrifice — เลือก Seal ทิ้ง (2/2)',rest.map(c=>({label:`${c.name} (${c.tribe} Lv${c.lv})`,data:c})),c2=>{
            const owner=findFCOwner(targetFC);
            if(owner){destroyByEffect(targetFC,owner.pi);}
            [c1,c2].forEach(c=>{const i=p.hand.indexOf(c);if(i>=0){p.hand.splice(i,1);p.shrine.push(c);broadcastSound('Flip');}});
            log(`Sacrifice: ทำลาย ${targetFC.card.name}! ทิ้ง ${c1.name}, ${c2.name}!`,'bad');
            checkLose();render();Online.broadcastState();
          });
        });
      });
    });
    return;
  }
  spend();showActionQueue(`${mysticCard.name}`,()=>{log(`${mysticCard.name} ใช้แล้ว`,'');render();Online.broadcastState();});
}

function guestPlayPAMystic(mysticCard,mysticIdx){
  const p=G.players[1],opp=G.players[0];
  const id=mysticCard.id;
  _nextChainCard=mysticCard;
  function spend(){p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);broadcastSound('Spell');}
  function addAreaMystic(){
    const expires=mysticCard.turns===999?Infinity:subTurnNum+(mysticCard.turns*2);
    if(!p.areaMystics)p.areaMystics=[];
    p.areaMystics.push({mystic:mysticCard,ownerPi:1,expiresBeforeSubTurn:expires});
  }
  if(id===34){
    spend();(p.mysticGrave=p.mysticGrave||[]).push(mysticCard);log(`Cunning Clown [Guest] → สลับ Line Host (non-Machine)!`,'good');
    showActionQueue(`Cunning Clown → สลับ Line Host (non-Machine)`,()=>{
      const mv_at=opp.atLine.filter(fc=>fc.card.tribe!=='Machine');
      const mv_df=opp.dfLine.filter(fc=>fc.card.tribe!=='Machine');
      const kp_at=opp.atLine.filter(fc=>fc.card.tribe==='Machine');
      const kp_df=opp.dfLine.filter(fc=>fc.card.tribe==='Machine');
      opp.atLine=[...mv_df,...kp_at];opp.dfLine=[...mv_at,...kp_df];
      log(`Cunning Clown: สลับ Line Host สำเร็จ!`,'good');checkLose();render();Online.broadcastState();
    });return;
  }
  if(id===35){
    spend();showActionQueue(`Nebuchadnezzar → มือสูงสุด +1`,()=>{addAreaMystic();log(`Nebuchadnezzar: มือสูงสุด +1!`,'good');checkLose();render();Online.broadcastState();});return;
  }
  if(id===70){
    spend();showActionQueue(`Marie Antoinette → Mp+1, มือ-1`,()=>{addAreaMystic();log(`Marie Antoinette: Mp+1!`,'good');checkLose();render();Online.broadcastState();});return;
  }
  spend();showActionQueue(`${mysticCard.name}`,()=>{addAreaMystic();log(`${mysticCard.name} ใช้แล้ว`,'');render();Online.broadcastState();});}

function guestShowMysticAction(mysticCard,mysticIdx){
  const p=G.players[1];
  const inInterfere=!!pendingCb&&mysticCard.interfere;
  if(G.currentPlayer!==1&&!inInterfere)return;
  const inMain=phase==='main'||phase==='main2';
  if(!inMain&&!inInterfere)return;
  if(pendingCb&&!mysticCard.interfere){logErr(`${mysticCard.name} ไม่มี Interfere — ใช้ไม่ได้ระหว่าง Action Queue`);return;}
  if(p.mp<mysticCard.mc){logErr(`Mp ไม่พอ (ต้องการ ${mysticCard.mc}, มี ${p.mp})`);return;}
  if(mysticCard.pasted==='PS'){
    if(guestMysticPlayMode&&guestMysticPlayMode.mysticIdx===mysticIdx){
      Online.sendGuestAction({action:'guestCancelMysticPS'});
      guestMysticPlayMode=null;render();return;
    }
    Online.sendGuestAction({action:'guestStartMysticPS',mysticIdx});
    guestMysticPlayMode={mysticCard,mysticIdx};
    log(`${mysticCard.name} [Mystic PS] — คลิก Seal ที่จะติด (คลิกอีกครั้งเพื่อยกเลิก)`,'hi');
    render();
  } else if(mysticCard.pasted==='PA'){
    showMysticPicker(mysticCard.name,[{label:'▶ เล่น',data:'play'},{label:'👁 View Card',data:'view'}],choice=>{
      if(choice==='view'){openMysticViewer(mysticCard);return;}
      Online.sendGuestAction({action:'guestMysticPA',mysticIdx});
    });
  } else if(mysticCard.id===27){ // Lighthouse — send choice to HOST; HOST builds reveal and broadcasts back
    showMysticPicker('Lighthouse — เลือก',[
      {label:'ดูการ์ดทุกใบในมือฝ่ายตรงข้าม',data:'hand'},
      {label:'ดูการ์ดใบบนสุด 1 ใบของกองการ์ดเราทุกกอง',data:'deck'}
    ],choice=>{
      Online.sendGuestAction({action:'guestLighthouse',mysticIdx,choice});
    });
  } else if(mysticCard.id===17){ // Holy Prayer — check targets first, then pick locally on guest
    const allF=()=>[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];
    const inInterfere=!!pendingCb;
    const ownSealsG=[...G.players[1].atLine,...G.players[1].dfLine];
    const cursed=allF().filter(fc=>fc.curses?.length);
    const cureTargets=inInterfere?ownSealsG:cursed;
    const withPS=allF().filter(fc=>getActiveMystics(fc).length&&!hasMysticProtect(fc));
    const modeOpts=[];
    if(cureTargets.length)modeOpts.push({label:'รักษา Curse ทุกชนิด',data:'cure'});
    if(withPS.length)modeOpts.push({label:'ทำลาย [PS] Mystic Card',data:'destroy'});
    if(!modeOpts.length){log('Holy Prayer: ไม่มีเป้าหมายที่ใช้ได้','bad');return;}
    showMysticPicker('Holy Prayer — เลือก',modeOpts,mode=>{
      if(mode==='cure'){
        const cureLabel=fc=>fc.curses?.length?`${fc.card.name} (${fc.curses.map(c=>c.type).join(',')})`:`${fc.card.name} (รักษาหลัง AQ)`;
        showMysticPicker('เลือก Seal ที่จะรักษา',cureTargets.map(fc=>({label:cureLabel(fc),data:fc})),tfc=>{
          Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:17,type:'cure',targetUid:tfc.uid}});
        });
      } else {
        showMysticPicker('Holy Prayer — เลือก PS Mystic',withPS.map(fc=>({label:`${fc.card.name} [${getActiveMystics(fc).map(m=>m.mystic.name).join(',')}]`,data:fc})),tfc=>{
          const actMys=getActiveMystics(tfc);
          if(actMys.length===1){
            Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:17,type:'destroyPS',targetUid:tfc.uid,mIdx:0}});
          } else {
            showMysticPicker('เลือก Mystic ที่จะทำลาย',actMys.map((m,i)=>({label:m.mystic.name,data:i})),mIdx=>{
              Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:17,type:'destroyPS',targetUid:tfc.uid,mIdx}});
            });
          }
        });
      }
    });
  } else if(mysticCard.id===26){ // Inquisition — pick target locally on guest
    const allF=()=>[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];
    const psTargets=allF().filter(fc=>getActiveMystics(fc).length);
    const paTargets=[];
    [0,1].forEach(pi=>{(G.players[pi].areaMystics||[]).forEach((am,i)=>{paTargets.push({pi,amIdx:i,am});});});
    const stackItems=_interfereStack.map((item,i)=>({label:`[Queued] ${item.desc}`,data:{type:'stack',stackIdx:i}}));
    const aqDesc=document.getElementById('aq-desc')?.textContent||'';
    const pendingItem=pendingCb&&aqDesc&&!_aqChainMode?[{label:`[ยกเลิก] ${aqDesc}`,data:{type:'pending',desc:aqDesc}}]:[];
    if(!psTargets.length&&!paTargets.length&&!stackItems.length&&!pendingItem.length){log('ไม่มี Mystic ในสนาม','bad');return;}
    const opts=[
      ...psTargets.map(fc=>({label:`[PS] ${fc.card.name}: ${getActiveMystics(fc).map(m=>m.mystic.name).join(',')}`,data:{type:'ps',fc}})),
      ...paTargets.map(({pi,amIdx,am})=>({label:`[PA] ${am.mystic.name} (${pi===0?'Host':'Guest'})`,data:{type:'pa',pi,amIdx}})),
      ...stackItems,
      ...pendingItem
    ];
    showMysticPicker('Inquisition — เลือก Mystic',opts,choice=>{
      if(choice.type==='pending'){
        Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:26,type:'pending'}});
      } else if(choice.type==='stack'){
        Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:26,type:'stack',stackIdx:choice.stackIdx}});
      } else if(choice.type==='pa'){
        Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:26,type:'pa',pi:choice.pi,amIdx:choice.amIdx}});
      } else {
        const actMys=getActiveMystics(choice.fc);
        if(actMys.length===1){
          Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:26,type:'ps',targetUid:choice.fc.uid,mIdx:0}});
        } else {
          showMysticPicker('เลือก Mystic ที่จะทำลาย',actMys.map((m,i)=>({label:m.mystic.name,data:i})),mIdx=>{
            Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:26,type:'ps',targetUid:choice.fc.uid,mIdx}});
          });
        }
      }
    });
  } else if(mysticCard.id===40){ // Benediction — pick shrine seal locally on guest
    const valid=p.shrine.filter(c=>!(mysticCard.exception_tribes||[]).includes(c.tribe));
    if(!valid.length){log('ไม่มี Seal ใน Shrine','bad');return;}
    showMysticPicker('Benediction — เลือก Seal',valid.map(c=>({label:`${c.name} (Lv${c.lv})`,data:c})),c=>{
      const idx=p.shrine.indexOf(c);
      Online.sendGuestAction({action:'guestNonPResolved',mysticIdx,resolution:{id:40,shrineIdx:idx}});
    });
  } else {
    showMysticPicker(mysticCard.name,[{label:'▶ เล่น',data:'play'},{label:'👁 View Card',data:'view'}],choice=>{
      if(choice==='view'){openMysticViewer(mysticCard);return;}
      Online.sendGuestAction({action:'guestMysticInstant',mysticIdx});
    });
  }
}

function guestPlayNonPMysticResolved(mysticCard,mysticIdx,resolution){
  const p=G.players[1];
  let _spd=false;function spend(){if(_spd)return;_spd=true;p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);broadcastSound('Spell');}
  const allF=[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];
  if(resolution.id===17){ // Holy Prayer
    if(resolution.type==='cure'){
      const tfc=allF.find(fc=>fc.uid===resolution.targetUid);if(!tfc)return;
      spend();showActionQueue(`Holy Prayer → รักษา ${tfc.card.name}`,()=>{tfc.curses=[];log(`Holy Prayer: รักษา Curse!`,'good');checkLose();render();Online.broadcastState();});
    } else {
      const tfc=allF.find(fc=>fc.uid===resolution.targetUid);if(!tfc)return;
      const actMys=getActiveMystics(tfc);const mEntry=actMys[resolution.mIdx];if(!mEntry)return;
      spend();showActionQueue(`Holy Prayer → ทำลาย ${mEntry.mystic.name}`,()=>{_mysticSplice(tfc,mEntry);log(`Holy Prayer: ทำลาย Mystic!`,'good');checkLose();render();Online.broadcastState();});
    }
    return;
  }
  if(resolution.id===26){ // Inquisition
    if(resolution.type==='pending'){
      spend();_stopAQTimer();
      _nextChainCard=mysticCard;
      showActionQueue(`Inquisition → ยกเลิก`,()=>{
        pendingCb=null; // cancel the original queued effect when Inquisition resolves
        log(`Inquisition: ยกเลิก Effect!`,'good');checkLose();render();Online.broadcastState();
      });
    } else if(resolution.type==='stack'){
      const idx=resolution.stackIdx;const targetItem=_interfereStack[idx];if(!targetItem)return;
      spend();showActionQueue(`Inquisition → ยกเลิก: ${targetItem.desc}`,()=>{_interfereStack.splice(idx,1);log(`Inquisition: ยกเลิก Effect!`,'good');checkLose();render();Online.broadcastState();});
    } else if(resolution.type==='pa'){
      const amArr=G.players[resolution.pi].areaMystics;const am=amArr?.[resolution.amIdx];if(!am)return;
      spend();showActionQueue(`Inquisition → ทำลาย [PA] ${am.mystic.name}`,()=>{amArr.splice(resolution.amIdx,1);log(`Inquisition: ทำลาย PA Mystic!`,'good');checkLose();render();Online.broadcastState();});
    } else {
      const tfc=allF.find(fc=>fc.uid===resolution.targetUid);if(!tfc)return;
      const actMys=getActiveMystics(tfc);const mEntry=actMys[resolution.mIdx];if(!mEntry)return;
      spend();showActionQueue(`Inquisition → ทำลาย ${mEntry.mystic.name}`,()=>{_mysticSplice(tfc,mEntry);log(`Inquisition: ทำลาย Mystic!`,'good');checkLose();render();Online.broadcastState();});
    }
    return;
  }
  if(resolution.id===40){ // Benediction
    const c=p.shrine[resolution.shrineIdx];if(!c)return;
    spend();showActionQueue(`Benediction → ${c.name} ขึ้นมือ`,()=>{
      const i=p.shrine.indexOf(c);
      if(i>=0&&p.hand.length<HAND_MAX){p.shrine.splice(i,1);p.hand.push(c);log(`Benediction: ${c.name} ขึ้นมือ!`,'good');}
      else log('มือเต็ม!','bad');
      checkLose();render();Online.broadcastState();
    });
    return;
  }
}

// ══════════════════════════════════════════════
// DEPLOY
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
// MYSTIC HELPERS
// ══════════════════════════════════════════════
function getActiveMystics(fc){
  // expiresBeforeSubTurn===Infinity serializes to null over JSON (GUEST side) — treat null as Infinity
  return (fc.mystics||[]).filter(m=>{const e=m.expiresBeforeSubTurn;return e===Infinity||e===null||subTurnNum<e;});
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
  const sc=document.getElementById('fa-cancel-btn');if(sc)sc.style.display='none';
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

function showLineChoicePicker(cardName,onPick){
  document.getElementById('fa-title').textContent=`วาง ${cardName} ที่ Line ใด?`;
  const div=document.getElementById('fa-opts');
  div.innerHTML='';
  [{label:'⚔ Attack Line',data:'at'},{label:'🛡 Defense Line',data:'df'}].forEach(({label,data})=>{
    const btn=document.createElement('button');
    btn.className='fopt';
    btn.textContent=label;
    btn.onclick=()=>{closeFAModal();onPick(data);};
    div.appendChild(btn);
  });
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
  if(pendingCb){logErr('ไม่สามารถลงการ์ดระหว่าง Interfere Step');return;}
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
  if(window.Online?.isOnline&&!Online.isHost){
    if(!pendingDeploy)return;
    if(pendingCb){logErr('ไม่สามารถลงการ์ดระหว่าง Interfere Step');pendingDeploy=null;closeDeployModal();return;}
    const{idx}=pendingDeploy;
    Online.sendGuestAction({action:'deploy',cardIdx:idx,line});
    pendingDeploy=null;closeDeployModal();
    return;
  }
  if(!pendingDeploy)return;
  const {card,idx}=pendingDeploy;
  if(pendingCb){logErr('ไม่สามารถลงการ์ดระหว่าง Interfere Step');pendingDeploy=null;closeDeployModal();return;}
  if((phase!=='main'&&phase!=='main2')||G.currentPlayer!==0){logErr('Deploy ได้เฉพาะ Main Phase ของผู้เล่น');closeDeployModal();return;}
  const mc=getEffectiveMc(card);
  if(G.players[0].mp<mc){logErr(`Mp ไม่พอ (ต้องการ ${mc})`);closeDeployModal();return;}
  const p=G.players[0];
  if(card.id===63){line='at';}
  const target=line==='at'?p.atLine:p.dfLine;
  pendingDeploy=null;
  closeDeployModal();
  function _applyDeploy(){
    p.hand.splice(idx,1);p.mp-=mc;
    target.push(makeFieldCard(card,true));
    broadcastSound('Deploy');
    log(`Host deployed ${card.name} to ${line==='at'?'At':'Df'} Line`,'good');
    if(card.id===67&&line==='at') triggerGregoryCancel(0);
    if(card.id===90) triggerAndreAbility(0);
    if(card.id===20){
      const oppMH=G.players[1].mysticHand||[];
      if(oppMH.length>0){
        document.getElementById('fa-title').textContent='Angel of Sword [Ability]: Mystic ของฝ่ายตรงข้าม';
        const opts=document.getElementById('fa-opts');opts.innerHTML='';
        const _asCancelBtn=document.getElementById('fa-cancel-btn');if(_asCancelBtn)_asCancelBtn.style.display='none';
        oppMH.forEach(mc=>{const d=document.createElement('div');d.style.cssText='padding:3px 2px;color:#fde68a;font-size:10px';d.textContent=mc.name;opts.appendChild(d);});
        const okBtn=document.createElement('button');okBtn.className='btn btn-gray';okBtn.style.cssText='margin-top:4px;width:100%';okBtn.textContent='OK';
        okBtn.onclick=()=>{if(_asCancelBtn)_asCancelBtn.style.display='';document.getElementById('fa-modal').classList.remove('show');};
        opts.appendChild(okBtn);
        document.getElementById('fa-modal').classList.add('show');
        log(`Angel of Sword [Ability]: เห็น Mystic ฝ่ายตรงข้าม — ${oppMH.map(m=>m.name).join(', ')}`,'');
      } else {
        log(`Angel of Sword [Ability]: ฝ่ายตรงข้ามไม่มี Mystic ในมือ`,'');
      }
    }
    if(card.id===72&&(p.mysticGrave||[]).length>0){
      document.getElementById('fa-title').textContent='Dark Destiny [Ability]: นำ Mystic จาก Shrine ขึ้นมือ?';
      const opts=document.getElementById('fa-opts');opts.innerHTML='';
      const _ddCancelBtn=document.getElementById('fa-cancel-btn');
      if(_ddCancelBtn)_ddCancelBtn.style.display='none';
      const _ddDone=()=>{if(_ddCancelBtn)_ddCancelBtn.style.display='';};
      p.mysticGrave.forEach((mc,i)=>{
        addFAOpt(`✅ ${mc.name}`,()=>{
          _ddDone();closeFAModal();
          p.mysticGrave.splice(i,1);
          (p.mysticHand=p.mysticHand||[]).push(mc);
          log(`Dark Destiny [Ability]: นำ ${mc.name} จาก Shrine ขึ้นมือ!`,'good');
          checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
        });
      });
      addFAOpt('✗ ไม่ต้องการ',()=>{_ddDone();closeFAModal();checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();});
      document.getElementById('fa-modal').classList.add('show');
      return;
    }
    checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  }
  if(window.Online?.isOnline&&Online.isHost){
    showActionQueue(`⬇ Host ลงการ์ด <b>${card.name}</b> → ${line==='at'?'At':'Df'} Line`,_applyDeploy,null,card,'⬇ Deploying...');
  }else{
    _applyDeploy();
  }
}

// Deploy from hand by dragging to a specific line slot position
function doDeployAtSlot(card,cardIdx,lineKey,insertAt){
  if(pendingCb){logErr('ไม่สามารถลงการ์ดระหว่าง Interfere Step');return;}
  if((phase!=='main'&&phase!=='main2')||G.currentPlayer!==0){logErr('Deploy ได้เฉพาะ Main Phase ของผู้เล่น');return;}
  const mc=getEffectiveMc(card);
  if(G.players[0].mp<mc){logErr(`Mp ไม่พอ (ต้องการ ${mc})`);return;}
  const p=G.players[0];
  let targetLine=lineKey;
  if(card.id===63)targetLine='at';
  const target=targetLine==='at'?p.atLine:p.dfLine;
  function _applyDeploy(){
    p.hand.splice(cardIdx,1);p.mp-=mc;
    const fc=makeFieldCard(card,true);
    if(insertAt===0)target.splice(0,0,fc);else target.push(fc);
    broadcastSound('Deploy');
    log(`Host deployed ${card.name} to ${targetLine==='at'?'At':'Df'} Line`,'good');
    if(card.id===67&&targetLine==='at') triggerGregoryCancel(0);
    if(card.id===90) triggerAndreAbility(0);
    if(card.id===72&&(p.mysticGrave||[]).length>0){
      document.getElementById('fa-title').textContent='Dark Destiny [Ability]: นำ Mystic จาก Shrine ขึ้นมือ?';
      const opts=document.getElementById('fa-opts');opts.innerHTML='';
      const _ddCancelBtn=document.getElementById('fa-cancel-btn');
      if(_ddCancelBtn)_ddCancelBtn.style.display='none';
      const _ddDone=()=>{if(_ddCancelBtn)_ddCancelBtn.style.display='';};
      p.mysticGrave.forEach((mc,i)=>{
        addFAOpt(`✅ ${mc.name}`,()=>{
          _ddDone();closeFAModal();
          p.mysticGrave.splice(i,1);
          (p.mysticHand=p.mysticHand||[]).push(mc);
          log(`Dark Destiny [Ability]: นำ ${mc.name} จาก Shrine ขึ้นมือ!`,'good');
          checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
        });
      });
      addFAOpt('✗ ไม่ต้องการ',()=>{_ddDone();closeFAModal();checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();});
      document.getElementById('fa-modal').classList.add('show');
      return;
    }
    checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  }
  if(window.Online?.isOnline&&Online.isHost){
    showActionQueue(`⬇ Host ลงการ์ด <b>${card.name}</b> → ${targetLine==='at'?'At':'Df'} Line`,_applyDeploy,null,card,'⬇ Deploying...');
  }else{
    _applyDeploy();
  }
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
  const isFrozenOrStoned=fc.curses?.some(c=>c.type==='freeze'||c.type==='stone');
  const canSwitch=!fc.exhausted && !fc.hasUsedSkill && !isFrozenOrStoned && fc.deployedTurn<turnNum && fc.lineSwitchedTurn<turnNum;
  const otherLine=line==='at'?'df':'at';
  const otherArr=otherLine==='at'?p.atLine:p.dfLine;
  const switchBtn=addFAOpt(`⟷ Move to ${otherLine==='at'?'At':'Df'} Line`,()=>{doLineSwitch(fc,line,otherLine);});
  if(!canSwitch)switchBtn.disabled=true;

  const isCharmedCard=!!fc.charmed;

  // Fuse: has fuse data and still has materials to absorb (skip for charmed/exhausted/used-skill/already fused this turn)
  if(!isCharmedCard&&!fc.exhausted&&!fc.hasUsedSkill&&fc.fusedAtTurn!==turnNum&&fc.card.fuse&&fc.card.fuse.length>0){
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
  if(G._ddDiscardPending)return; // forced discard — cannot cancel
  document.getElementById('fa-modal').classList.remove('show');
  const sc=document.getElementById('fa-cancel-btn');if(sc)sc.style.display='';
  fieldActionTarget=null;
}

function doLineSwitch(fc,fromLine,toLine){
  if(pendingCb){logErr('ไม่สามารถเปลี่ยน Line ระหว่าง Interfere Step');closeFAModal();return;}
  if(phase!=='main'&&phase!=='main2'){logErr('เปลี่ยน line ได้เฉพาะ Main Phase');closeFAModal();return;}
  updateAIPreview(fc.card,`→ ${toLine==='at'?'At':'Df'} Line`);
  if(fc.exhausted){logErr(`${fc.card.name} inactive ไม่สามารถเปลี่ยน line ได้`);closeFAModal();return;}
  if(fc.deployedTurn>=turnNum){logErr(`${fc.card.name} ลงในเทิร์นนี้ ยังเปลี่ยน line ไม่ได้`);closeFAModal();return;}
  if(fc.lineSwitchedTurn>=turnNum){logErr(`${fc.card.name} เปลี่ยน line ไปแล้วในเทิร์นนี้`);closeFAModal();return;}
  if(fc.curses?.some(c=>c.type==='freeze'||c.type==='stone')){logErr(`${fc.card.name} ติด Freeze/Stone Curse — เปลี่ยน line ไม่ได้`);closeFAModal();return;}
  if(fc.card.id===63&&toLine==='df'){logErr('Dread Knight ต้องอยู่ใน At Line เสมอ!');closeFAModal();return;}
  const owner=findFCOwner(fc);
  const p=owner?owner.p:G.players[0];
  const fromArr=fromLine==='at'?p.atLine:p.dfLine;
  const toArr=toLine==='at'?p.atLine:p.dfLine;
  closeFAModal();
  showActionQueue(`${fc.card.name} → ย้ายไป ${toLine==='at'?'At':'Df'} Line`,()=>{
    const i=fromArr.findIndex(x=>x.uid===fc.uid);
    if(i>=0)fromArr.splice(i,1);
    toArr.push(fc);
    fc.lineSwitchedTurn=turnNum;
    broadcastSound('Deploy');
    log(`${fc.card.name} moved to ${toLine==='at'?'At':'Df'} Line`,'good');
    if(fc.card.id===67&&toLine==='at') triggerGregoryCancel(owner?owner.pi:0);
    render();
    if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  });
}

function triggerGregoryCancel(ownerPi){
  const p=G.players[ownerPi];
  [...p.atLine,...p.dfLine].forEach(seal=>{
    if(!seal.mystics?.length)return;
    seal.mystics.forEach(m=>{
      log(`Gregory [Ability]: ยกเลิก ${m.mystic.name} บน ${seal.card.name}`,'bad');
      const _gcpi=m.casterPi??ownerPi;
      (G.players[_gcpi].mysticGrave=G.players[_gcpi].mysticGrave||[]).push(m.mystic);
    });
    seal.mystics=[];
    seal.magicalEl=null;
  });
}

// ── FUSION ──
function _unlockedAtksForStack(fuseEntries, stackCards){
  // Each fusion entry is evaluated independently against the full stack so that
  // e.g. Sigmund + Delta-D(wind) + Blue Wind Griffin(wind,Beast) correctly unlocks
  // both the Beast entry AND the wind+wind entry.
  const unlocked=[];
  for(let i=0;i<fuseEntries.length;i++){
    const pool=[...stackCards];
    let ok=true;
    for(const req of fuseEntries[i].reqs){
      const hit=pool.findIndex(c=>matchesReq(req,c));
      if(hit>=0){pool.splice(hit,1);}else{ok=false;break;}
    }
    if(ok)unlocked.push(i);
  }
  // Drop any attack whose reqs are a sub-multiset of another unlocked attack's reqs
  // (e.g. +light when +light+light is also unlocked — higher tier supersedes lower tier)
  const result=[];
  for(const i of unlocked){
    const ri=fuseEntries[i].reqs;
    const superseded=unlocked.some(j=>{
      if(j===i)return false;
      const rj=fuseEntries[j].reqs;
      if(rj.length<=ri.length)return false;
      const rem=[...rj];
      for(const req of ri){const k=rem.indexOf(req);if(k>=0)rem.splice(k,1);else return false;}
      return true;
    });
    if(!superseded)result.push({...fuseEntries[i].atk});
  }
  return result;
}

function getUnlockedAtks(mainFC){
  const stack=mainFC.fusionStack.map(m=>m.card);
  if(mainFC.magicalEl)stack.push({el:mainFC.magicalEl,tribe:'',name:''});
  return _unlockedAtksForStack(mainFC.card.fuse||[],stack);
}

// Used by GUEST (step-by-step) and AI — considers only mainFC.fusionStack
function fuseMaterialHelps(mainFC,card){
  const fuse=mainFC.card.fuse||[];
  const stack=mainFC.fusionStack.map(m=>m.card);
  const countSat=(cards,reqs)=>{let n=0;const rem=[...cards];for(const req of reqs){const i=rem.findIndex(c=>matchesReq(req,c));if(i>=0){rem.splice(i,1);n++;}}return n;};
  for(const f of fuse){
    if(_unlockedAtksForStack([f],stack).length>0)continue;
    if(countSat([...stack,card],f.reqs)>countSat(stack,f.reqs))return true;
  }
  return false;
}

// Used by HOST batch system — also considers already-staged pendingFusionMaterials
function fuseMaterialHelpsForStaging(mainFC,card){
  const fuse=mainFC.card.fuse||[];
  const stack=[...mainFC.fusionStack.map(m=>m.card),...pendingFusionMaterials.map(m=>m.card)];
  const countSat=(cards,reqs)=>{let n=0;const rem=[...cards];for(const req of reqs){const i=rem.findIndex(c=>matchesReq(req,c));if(i>=0){rem.splice(i,1);n++;}}return n;};
  for(const f of fuse){
    if(_unlockedAtksForStack([f],stack).length>0)continue;
    if(countSat([...stack,card],f.reqs)>countSat(stack,f.reqs))return true;
  }
  return false;
}

function checkPendingFusionValid(){
  if(!fusionMainFC||!pendingFusionMaterials.length)return false;
  const fuse=fusionMainFC.card.fuse||[];
  const cur=fusionMainFC.fusionStack.map(m=>m.card);
  const withP=[...cur,...pendingFusionMaterials.map(m=>m.card)];
  const curNames=_unlockedAtksForStack(fuse,cur).map(a=>a.name);
  const newNames=_unlockedAtksForStack(fuse,withP).map(a=>a.name);
  // Valid if any newly unlocked attack wasn't already available (handles subsumption upgrades)
  return newNames.some(n=>!curNames.includes(n));
}

function confirmFusion(){
  if(pendingCb!==null)return;
  if(!checkPendingFusionValid()){logErr('combination ยังไม่สมบูรณ์ — เลือกการ์ดเพิ่ม');return;}
  const mainFC=fusionMainFC;
  const materials=[...pendingFusionMaterials];
  const fuse=mainFC.card.fuse||[];
  const cur=mainFC.fusionStack.map(m=>m.card);
  const withP=[...cur,...materials.map(m=>m.card)];
  const prevAtks=_unlockedAtksForStack(fuse,cur);
  const newAtks=_unlockedAtksForStack(fuse,withP).filter(a=>!prevAtks.some(b=>b.name===a.name));
  const matNames=materials.map(m=>m.card.name).join(' + ');
  const atkNames=newAtks.map(a=>a.name).join(', ')||'(สะสม)';
  // Lock fusion state before opening AQ so cancelAction() during interfere phase
  // cannot return materials to the field while the closure still holds them.
  pendingFusionMaterials=[];fusionMode=false;fusionMainFC=null;
  showActionQueue(`⚡ ${mainFC.card.name} + ${matNames} → ${atkNames}`,()=>{
    // Re-validate: interfere could have attached PS mystic to a support seal during the AQ window
    const psBlocked=materials.filter(m=>hasPSMystic(m));
    if(psBlocked.length){
      materials.forEach(m=>{const p=G.players[0];(p[m._stagedLine||'atLine']).push(m);delete m._stagedLine;});
      log(`รวมร่างถูกยกเลิก — ${psBlocked.map(m=>m.card.name).join(',')} มี PS Mystic ติดอยู่`,'bad');
      render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();return;
    }
    materials.forEach(m=>{mainFC.fusionStack.push(m);delete m._stagedLine;});
    mainFC.fusionAtks=getUnlockedAtks(mainFC);
    mainFC.fused=true;
    if(!mainFC.fusedSinceTurn)mainFC.fusedSinceTurn=turnNum;
    mainFC.fusedAtTurn=turnNum;
    broadcastSound('Fusion Complete');
    log(`+${matNames} → ${mainFC.card.name}: ${atkNames}`,'good');
    render();
    if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  },null,mainFC.card,'⚡ Fusing...');
}

// Rule 613.8.3: card deployed from hand this turn cannot be Support Seal
function newFromHand(m){return m.fromHand && m.deployedTurn >= turnNum;}

function hasPSMystic(fc){return getActiveMystics(fc).some(m=>m.mystic?.pasted==='PS');}

function findFusionMaterials(mainFC){
  const p=G.players[0];
  const stagedUids=new Set(pendingFusionMaterials.map(m=>m.uid));
  const all=[...p.atLine,...p.dfLine];
  return all.filter(m=>{
    if(m.uid===mainFC.uid||m.fused||newFromHand(m)||hasPSMystic(m))return false;
    if(stagedUids.has(m.uid))return false;
    return fuseMaterialHelpsForStaging(mainFC,m.card);
  });
}

function canBeFusionMaterial(fc){
  if(!fusionMode||!fusionMainFC)return false;
  if(fc.uid===fusionMainFC.uid||fc.fused||newFromHand(fc)||hasPSMystic(fc))return false;
  if(fc.curses?.length>0)return false;
  if(fc.wasMainFusedTurn===turnNum)return false;
  if(pendingFusionMaterials.some(m=>m.uid===fc.uid))return false;
  return fuseMaterialHelpsForStaging(fusionMainFC,fc.card);
}

function startFusionMode(fc){
  fusionMode=true;
  fusionMainFC=fc;
  pendingFusionMaterials=[];
  log(`เลือก Seal วัสดุสำหรับ ${fc.card.name} — กด ⚡ Confirm เมื่อเลือกครบ (หรือ Cancel เพื่อยกเลิก)`,'hi');
  render();
}

// Stage a material card (no AQ per step — confirm triggers one AQ for the full fusion)
function doFuse(mainFC,materialFC){
  if(!fuseMaterialHelpsForStaging(mainFC,materialFC.card)){logErr('การ์ดนี้ไม่ตรง requirement');return;}
  const p=G.players[0];
  let sl='atLine';
  ['atLine','dfLine'].forEach(lk=>{const i=p[lk].findIndex(x=>x.uid===materialFC.uid);if(i>=0){sl=lk;p[lk].splice(i,1);}});
  materialFC._stagedLine=sl;
  pendingFusionMaterials.push(materialFC);
  log(`+${pendingFusionMaterials.map(m=>m.card.name).join(' + ')} — กด ⚡ Confirm เมื่อพร้อม`,'hi');
  render();
  if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
}

function doUnfuse(fc){
  showActionQueue(`${fc.card.name} แยกรวมร่าง`,()=>{
    const p=G.players[0];
    const mainLine=p.atLine.some(x=>x.uid===fc.uid)?'atLine':'dfLine';
    fc.fusionStack.forEach(mfc=>{p[mainLine].push(mfc);});
    fc.fusionStack=[];fc.fusionAtks=[];fc.fused=false;fc.fusedSinceTurn=null;fc.wasMainFusedTurn=turnNum;
    log(`${fc.card.name} unfused`,'');
    render();
    if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  });
}

function cancelFusion(){
  if(pendingFusionMaterials.length){
    const p=G.players[0];
    pendingFusionMaterials.forEach(m=>{p[m._stagedLine||'atLine'].push(m);delete m._stagedLine;});
    pendingFusionMaterials=[];
  }
  fusionMode=false;
  fusionMainFC=null;
  render();
}

// ══════════════════════════════════════════════
// BATTLE
// ══════════════════════════════════════════════
function clickFieldSeal(fc,pi,line){
  if(window.Online?.isOnline&&!Online.isHost){_clickFieldSealGuest(fc,pi,line);return;}
  if(holyPrayerCureMode){
    if(holyPrayerCureMode.targets.some(t=>t.uid===fc.uid)){holyPrayerCureMode.onSelect(fc);}
    else{log('Holy Prayer: คลิก Seal ที่ highlight เท่านั้น','bad');}
    return;
  }
  if(pendingCb){
    if(mysticPlayMode&&mysticPlayMode.mysticCard.interfere){
      attachPSMystic(mysticPlayMode.mysticCard,mysticPlayMode.mysticIdx,fc);return;
    }
    if(handDiscardMode)return; // hand-card picker active
    // Unified choice modal: interfere skills (own pi=0, unused) + view card + cancel
    const p=G.players[0];
    const avail=(pi===0&&!fc.hasUsedSkill)
      ? getCardSkills(fc).map((s,i)=>({s,i}))
          .filter(({s})=>s.interfere&&p.mp>=s.mp&&(s.type!=='handDiscard'||p.hand.length>0))
      : [];
    document.getElementById('fa-title').textContent=fc.card.name;
    const opts=document.getElementById('fa-opts');opts.innerHTML='';
    avail.forEach(({s,i})=>{
      addFAOpt(s.label,()=>{
        closeFAModal();
        if(s.type==='selfSkill')executeInterfereSelfSkill(fc,i);
        else startInterfereSkill(fc,i);
      });
    });
    addFAOpt('👁 ดูการ์ด',()=>{closeFAModal();openCardViewer(fc.card,fc);});
    addFAOpt('✗ ยกเลิก',()=>{closeFAModal();});
    document.getElementById('fa-modal').classList.add('show');
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
        const p=G.players[0];p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);(p.mysticGrave=p.mysticGrave||[]).push(mysticCard);broadcastSound('Spell');
        showActionQueue(`Sacrifice → ทำลาย ${targetFC.card.name} + ทิ้ง ${c1.name}, ${c2.name}`,()=>{
          const owner=findFCOwner(targetFC);
          if(owner){destroyByEffect(targetFC,owner.pi);}
          [c1,c2].forEach(c=>{const i=p.hand.indexOf(c);if(i>=0){p.hand.splice(i,1);p.shrine.push(c);broadcastSound('Flip');}});
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
      const noEnemyField=enemy.atLine.length===0&&enemy.dfLine.length===0;
      if(noEnemyField&&(enemy.hand.length>0||(enemy.mysticHand||[]).length>0)){
        handTargetMode=true;
        log(`ไม่มี Seal ของ AI ในสนาม! คลิกการ์ดในมือของ AI เพื่อโจมตี (Seal หรือ Mystic)`,'hi');
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
      // Auto-select fusion attack if player clicked target directly without pressing Attack/Special
      if(pendingAttackIdx===null){
        const pool=getActiveAtks(attFC);
        if(pool.length===1){pendingAttackIdx=0;}
        else if(pool.length>1){openFusionPicker(pool);return;}
      }
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
        showActionQueue(`${att.name} → ⚔ ${defFC.card.name} [Df]`,()=>{
          const attAt=getEffectiveAt(attFC);
          combatAnim(attFC,defFC,attAt,'df',false,()=>{
            dealDamage(attFC,defFC,attAt,'Mor Mercenary',0,1,'df');
            attFC.exhausted=true;attFC.hasAttacked=true;attackerSeal=null;
            checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
          });
        });
      }
    };
    div.appendChild(btn);
  });
  document.getElementById('atk-panel').classList.add('show');
}

function _isThunderiaFused(fc){
  if(fc.fused||fc.card.id===64||fc.card.tribe!=='Beast')return false;
  const owner=findFCOwner(fc);
  if(!owner)return false;
  const p=G.players[owner.pi];
  return[...p.atLine,...p.dfLine].some(x=>x.card.id===64&&(x.fused||x.magicalEl));
}
// Returns fusion attacks a Beast can use via Thunderia — limited to Thunderia's fusion tier
// (1 material fused = only single-req attacks; 2 materials = up to 2-req; etc.)
function _getThunderiaFuseAtks(fc){
  if(!fc.card.fuse?.length)return[];
  const owner=findFCOwner(fc);if(!owner)return[];
  const p=G.players[owner.pi];
  const thr=[...p.atLine,...p.dfLine].find(x=>x.card.id===64&&(x.fused||x.magicalEl));
  if(!thr)return[];
  const maxReqs=thr.fused?thr.fusionStack.length:(thr.magicalEl?1:0);
  if(maxReqs===0)return[];
  return fc.card.fuse.filter(f=>f.reqs.length<=maxReqs).map(f=>f.atk).filter(Boolean);
}
function getActiveAtks(fc){
  if(fc.fused&&fc.fusionAtks.length>0)return fc.fusionAtks;
  if(!fc.fused&&fc.magicalEl&&fc.card.fuse?.length){
    const atks=_unlockedAtksForStack(fc.card.fuse,[{el:fc.magicalEl,tribe:'',name:''}]);
    if(atks.length)return atks;
  }
  if(fc.willMind&&fc.card.fuse?.length)return fc.card.fuse.map(f=>f.atk).filter(Boolean);
  if(_isThunderiaFused(fc))return _getThunderiaFuseAtks(fc);
  return [];
}

function executeAllAttack(attFC,atk){
  const p=G.players[0];
  const atkNetMp=Math.max(0,atk.mp-getMysticMaReduction(attFC));
  if(p.mp<atkNetMp){log(`Mp ไม่พอสำหรับ ${atk.name} (ต้องการ ${atkNetMp})`,'bad');return;}
  showActionQueue(`${attFC.card.name} → <b>${atk.name}</b> (ALL)`,()=>{
    p.mp-=atkNetMp;
    const attAt=_fusionAtkAt(atk.at,attFC);
    log(`${attFC.card.name} ใช้ ${atk.name}! (ALL)`,'hi');
    const allTargets=[...G.players[1].atLine.map(fc=>({fc,line:'at'})),...G.players[1].dfLine.map(fc=>({fc,line:'df'}))];
    attFC.exhausted=true;attFC.hasAttacked=true;attackerSeal=null;pendingAttackIdx=null;
    animateAllTargets(attFC,allTargets,attAt,atk.name,0,1,()=>{checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();});
  });
}

function declareAttack(){
  if(window.Online?.isOnline&&!Online.isHost){
    if(!attackerSeal)return;
    const fc=attackerSeal.fc;
    const fusionAtks=getActiveAtks(fc);
    if(fusionAtks.length>1){
      // Show picker on guest side before sending
      const div=document.getElementById('atk-opts');
      div.innerHTML='<div style="font-size:9px;color:#fde68a;margin-bottom:4px">⚡ เลือกท่าโจมตี</div>';
      fusionAtks.forEach((atk,i)=>{
        const btn=document.createElement('button');
        btn.className='atk-opt';
        const v=[atk.at?'At'+atk.at:'',atk.df?'Df'+atk.df:''].filter(Boolean).join('/');
        btn.innerHTML=`⚡${atk.name}<span style="color:#fde68a;margin-left:4px">${v} Mp${atk.mp}${atk.all?' ALL':''}</span>`;
        btn.onclick=()=>{closeAtkPanel();Online.sendGuestAction({action:'declareAttack',atkIdx:i});};
        div.appendChild(btn);
      });
      document.getElementById('atk-panel').classList.add('show');
      return;
    }
    Online.sendGuestAction({action:'declareAttack',atkIdx:fusionAtks.length===1?0:null});
    return;
  }
  if(!attackerSeal){log('Select a Seal first','');return;}
  const fc=attackerSeal.fc;
  if(fc.activeMultiAtk&&fc.hitsLeft>0){
    log(`${fc.card.name}: ${fc.activeMultiAtk.name} ×${fc.hitsLeft} เหลือ — คลิก Seal ศัตรูเพื่อโจมตีต่อ`,'hi');
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
  const pickerFC=attackerSeal?.fc;
  fusionAtks.forEach((atk,i)=>{
    const btn=document.createElement('button');
    btn.className='atk-opt';
    const netMp=Math.max(0,atk.mp-(pickerFC?getMysticMaReduction(pickerFC):0));
    const canAfford=G.players[0].mp>=netMp;
    btn.disabled=!canAfford;
    const val=[atk.at?`At${atk.at}`:'',atk.df?`Df${atk.df}`:''].filter(Boolean).join('/');
    btn.innerHTML=`${atk.name} <span>${val} Mp${netMp}${atk.all?' ALL':''}</span>`;
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
  mainBtn.onclick=()=>{
    closeAtkPanel();
    // Auto-select fusion attack for the main-seal hit so multi-hit attacks (e.g. Fire Breath×3) work
    let atkIdx=pendingAttackIdx;
    if(atkIdx===null){const pool=getActiveAtks(attFC);if(pool.length===1)atkIdx=0;}
    pendingAttackIdx=null;
    resolveAttack(attFC,mainFC,atkIdx,mainLine);
  };
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
  const spFC=attackerSeal?.fc;
  atks.forEach((atk,i)=>{
    const btn=document.createElement('button');
    btn.className='atk-opt';
    const netMp=Math.max(0,atk.mp-(spFC?getMysticMaReduction(spFC):0));
    const canAfford=G.players[0].mp>=netMp;
    btn.disabled=!canAfford;
    btn.innerHTML=`${atk.name} <span>At${atk.at} | Mp${netMp}${atk.all?' ALL':''}</span>`;
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
  updateAIPreview(att,'⚔ Attacking...');
  const p=G.players[0];
  let attAt=getEffectiveAt(attFC), atkLabel='normal attack';
  let maCost=attFC.sevenSilverFree?0:Math.max(0,(att.ma||1)-getMysticMaReduction(attFC));
  let usedAtk=null;

  if(specialAtkIdx!==null){
    const pool=getActiveAtks(attFC);
    const sa=pool[specialAtkIdx];
    if(!sa){
      // Fusion attack no longer valid (e.g. Magical World destroyed during AQ) — fall back to normal attack
      if(p.mp<maCost){log(`Mp ไม่พอในการโจมตี (ต้องการ ${maCost})`,'bad');return;}
      p.mp-=maCost;
      // fall through to normal attack with base attAt and maCost already handled
    } else {
    const saNetMp=Math.max(0,sa.mp-getMysticMaReduction(attFC));
    if(p.mp<saNetMp){log(`Mp ไม่พอสำหรับ ${sa.name} (ต้องการ ${saNetMp})`,'bad');return;}
    p.mp-=saNetMp;
    attAt=_fusionAtkAt(sa.at,attFC);
    atkLabel=sa.name;
    usedAtk=sa;
    if(sa.all){
      showActionQueue(`${att.name} → <b>${atkLabel}</b> (ALL)`,()=>{
        if(attFC.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${att.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'bad');attackerSeal=null;render();return;}
        log(`${att.name} ใช้ ${atkLabel}! (ALL enemies)`,'hi');
        const allTargets=[...G.players[1].atLine.map(fc=>({fc,line:'at'})),...G.players[1].dfLine.map(fc=>({fc,line:'df'}))];
        attFC.exhausted=true;attFC.hasAttacked=true;attackerSeal=null;pendingAttackIdx=null;
        animateAllTargets(attFC,allTargets,attAt,atkLabel,0,1,()=>{checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();});
      });
      return;
    }
    } // close else-sa block
  } else {
    if(p.mp<maCost){log(`Mp ไม่พอในการโจมตี (ต้องการ ${maCost})`,'bad');return;}
    p.mp-=maCost;
  }
  showActionQueue(`${att.name} → <b>${atkLabel}</b> ⚔ ${defFC.card.name}`,()=>{
    if(attFC.curses?.some(c=>c.type==='stone'||c.type==='freeze')){
      log(`${att.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'bad');
      attackerSeal=null;render();return;
    }
    // Intercept: Wool Wyvern / Phoenix landed on defender's At Line during the AQ window,
    // blocking this Df Line attack — player must retarget (Dread Knight exempt)
    if(defLine==='df'&&attFC.card.id!==63&&G.players[1].atLine.length>0){
      log(`${att.name}: โจมตีถูกยกเลิก — ${G.players[1].atLine.map(x=>x.card.name).join(', ')} ปรากฏที่ At Line ศัตรู! (เลือกเป้าหมายใหม่)`,'bad');
      attackerSeal=null;render();return;
    }
    attAt=usedAtk?_fusionAtkAt(usedAtk.at,attFC):getEffectiveAt(attFC);
    const hitLabel=usedAtk?.hits>1?` (1/${usedAtk.hits})`:'';
    log(`${att.name} → ${atkLabel}${hitLabel}!`,'hi');
    combatAnim(attFC,defFC,attAt,defLine,false,()=>{
      dealDamage(attFC,defFC,attAt,atkLabel,0,1,defLine);
      if(usedAtk?.hits>1){
        attFC.activeMultiAtk={...usedAtk};
        attFC.hitsLeft=usedAtk.hits-1;
        const _multiAlive=[...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.uid===attFC.uid);
        if(_multiAlive){log(`${att.name} ยังตีได้อีก ${usedAtk.hits-1} ครั้ง! เลือกเป้าหมาย`,'hi');}
        else{attackerSeal=null;}
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
      if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
    });
  });
}

function executeMultiStrikeHit(attFC,defFC,defLine){
  const atk=attFC.activeMultiAtk;
  const attAt=atk.at??getEffectiveAt(attFC);
  const hitNum=atk.hits-attFC.hitsLeft+1;
  const _savedSeal=attackerSeal;
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
        const _alive=[...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.uid===attFC.uid);
        if(_alive){attackerSeal=_savedSeal;log(`ยังตีได้อีก ${attFC.hitsLeft} ครั้ง! เลือกเป้าหมาย`,'hi');}
      }
      checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
    });
  });
}

function combatAnim(attFC,defFC,attAt,defLine,isAll,callback){
  attAt=applyPassiveAbilities(attFC,defFC,attAt);
  const defStat=getDefStatWithPassive(defFC,attFC,defLine);
  const attSp=getEffectiveSp(attFC), defSp=getEffectiveSp(defFC);
  const attWins=attAt>defStat||(attAt===defStat&&attSp>defSp);
  const isTie=attAt===defStat;
  const bothDie=!attWins&&!isAll&&defLine!=='df'&&isTie&&attSp===defSp;
  let result='',defDies=false,attDies=false;
  if(attWins){defDies=true;const note=isTie?` (Spd ${attSp}>${defSp})`:'';result=`${defFC.card.name} destroyed!${note}`;}
  else if(bothDie){attDies=true;defDies=true;result=`ทั้งคู่ถูกทำลาย! (At${attAt}=Def${defStat}, Spd${attSp}=${defSp})`;}
  else if(!isAll&&defLine!=='df'){attDies=true;const note=isTie?` (Spd ${defSp}>${attSp})`:'';result=`${attFC.card.name} destroyed!${note}`;}
  else{result='Blocked!';}
  const isBlocked=!attWins&&!bothDie&&(defLine==='df'||isAll);
  if(window.Online?.isOnline&&Online.isHost){
    Online.broadcastAnim({attImg:attFC.card.img,attName:attFC.card.name,defImg:defFC.card.img,defName:defFC.card.name,result,defDies,attDies,isBlocked});
  }
  const attPan=document.getElementById('ca-att-panel');
  const defPan=document.getElementById('ca-def-panel');
  attPan.classList.remove('ca-dead');defPan.classList.remove('ca-dead');defPan.classList.remove('ca-blocked');
  document.getElementById('ca-att-img').src=attFC.card.img;
  document.getElementById('ca-att-name').textContent=attFC.card.name;
  document.getElementById('ca-def-img').src=defFC.card.img;
  document.getElementById('ca-def-name').textContent=defFC.card.name;
  document.getElementById('ca-result').textContent='';
  const modal=document.getElementById('combat-anim');
  modal.style.display='flex';
  setTimeout(()=>{
    if(isBlocked){
      playSound('Blocked');
      defPan.classList.add('ca-blocked');
    } else {
      playSound('Damage');
      if(defDies)defPan.classList.add('ca-dead');
      if(attDies)attPan.classList.add('ca-dead');
    }
    document.getElementById('ca-result').textContent=result;
    setTimeout(()=>{modal.style.display='none';defPan.classList.remove('ca-blocked');callback();},600);
  },500);
}

function handAttackAnim(attFC,revealCard,callback,backImg='cardback/seal.jpg',resultText=null){
  if(window.Online?.isOnline&&Online.isHost){
    Online.broadcastAnim({attImg:attFC.card.img,attName:attFC.card.name,defImg:backImg,defName:'???',result:'',defDies:false,attDies:false,isHandReveal:true,revealImg:revealCard.img,revealName:revealCard.name});
  }
  const attPan=document.getElementById('ca-att-panel');
  const defPan=document.getElementById('ca-def-panel');
  attPan.classList.remove('ca-dead');defPan.classList.remove('ca-dead');
  document.getElementById('ca-att-img').src=attFC.card.img;
  document.getElementById('ca-att-name').textContent=attFC.card.name;
  document.getElementById('ca-def-img').src=backImg;
  document.getElementById('ca-def-name').textContent='???';
  document.getElementById('ca-result').textContent='';
  const modal=document.getElementById('combat-anim');
  modal.style.display='flex';
  setTimeout(()=>{
    playSound('Damage');
    document.getElementById('ca-def-img').src=revealCard.img;
    document.getElementById('ca-def-name').textContent=revealCard.name;
    defPan.classList.add('ca-dead');
    document.getElementById('ca-result').textContent=resultText||`${revealCard.name} sent to Shrine!`;
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
      afterDD(()=>{render();next(i+1);});
    });
  }
  next(0);
}

function getEffectiveEl(fc){return fc.magicalEl||fc.card.el;}

function _passiveAtBonus(fc){
  let ownerPi=-1;
  for(let pi=0;pi<2;pi++){if([...G.players[pi].atLine,...G.players[pi].dfLine].some(x=>x.uid===fc.uid)){ownerPi=pi;break;}}
  if(ownerPi<0)return 0;
  const own=G.players[ownerPi],opp=G.players[1-ownerPi];
  const ownField=[...own.atLine,...own.dfLine],oppField=[...opp.atLine,...opp.dfLine];
  let bonus=0;
  if(fc.card.id===62){if(oppField.length>ownField.length)bonus+=3;else if(oppField.length<ownField.length)bonus-=3;}
  if(fc.card.id===83)bonus+=own.atLine.length-opp.atLine.length;
  if(fc.card.id===86)bonus+=oppField.length;
  if(fc.card.id===79)bonus+=ownField.filter(x=>x.uid!==fc.uid&&x.card.tribe==='Beast').length;
  bonus+=ownField.filter(x=>x.card.id===81&&x.uid!==fc.uid).length;
  if(fc.card.tribe==='Beast')bonus+=ownField.filter(x=>x.card.id===55&&x.uid!==fc.uid).length;
  if(fc.card.el==='fire')bonus+=own.dfLine.filter(x=>x.card.id===92&&x.uid!==fc.uid).length;
  return bonus;
}
function _fusionAtkAt(atkAt,fc){
  // If seal was unfused during AQ (Thunder Bolt interfere), ignore the pre-captured fusion AT
  if(atkAt!=null&&!fc.fused&&!fc.willMind&&!_isThunderiaFused(fc))return getEffectiveAt(fc);
  if(atkAt==null)return getEffectiveAt(fc);
  const boost=(fc.atBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn).reduce((s,b)=>s+b.amount,0);
  const ld=(fc.curses||[]).filter(c=>c.type==='lastDance').reduce((s,c)=>s+(c.atBonus||0),0);
  return Math.max(0,atkAt+boost+ld+getMysticAtBonus(fc)+_passiveAtBonus(fc));
}

function getEffectiveAt(fc){
  let base=fc.card.at;
  if(fc.fused&&fc.fusionAtks.length){
    const best=fc.fusionAtks.filter(a=>a.at).sort((a,b)=>b.at-a.at)[0];
    if(best)base=best.at;
  }
  if(!fc.fused&&fc.magicalEl&&fc.card.fuse?.length){
    const atks=_unlockedAtksForStack(fc.card.fuse,[{el:fc.magicalEl,tribe:'',name:''}]).filter(a=>a.at);
    if(atks.length){const best=atks.sort((a,b)=>b.at-a.at)[0];if(best.at>base)base=best.at;}
  }
  if(_isThunderiaFused(fc)){
    const fuseAtks=_getThunderiaFuseAtks(fc).filter(a=>a?.at);
    if(fuseAtks.length){const best=fuseAtks.sort((a,b)=>b.at-a.at)[0];base=best.at;}
  }
  if(fc.atBoosts?.length)base+=fc.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn).reduce((s,b)=>s+b.amount,0);
  if(fc.curses?.length)base+=fc.curses.filter(c=>c.type==='lastDance').reduce((s,c)=>s+(c.atBonus||0),0);
  // Context-sensitive passives (shared with _fusionAtkAt via _passiveAtBonus)
  base+=_passiveAtBonus(fc);
  base+=getMysticAtBonus(fc);
  return Math.max(0,base);
}
function getEffectiveDf(fc){
  let base=fc.card.df;
  if(fc.fused&&fc.fusionAtks.length){
    const best=fc.fusionAtks.filter(a=>a.df).sort((a,b)=>b.df-a.df)[0];
    if(best)base=best.df;
  }
  if(_isThunderiaFused(fc)){
    const fuseAtks=_getThunderiaFuseAtks(fc).filter(a=>a?.df);
    if(fuseAtks.length){const best=fuseAtks.sort((a,b)=>b.df-a.df)[0];base=best.df;}
  }
  if(fc.dfBoosts?.length)base+=fc.dfBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn).reduce((s,b)=>s+b.amount,0);
  let ownerPi=-1;
  for(let pi=0;pi<2;pi++){if([...G.players[pi].atLine,...G.players[pi].dfLine].some(x=>x.uid===fc.uid)){ownerPi=pi;break;}}
  if(ownerPi>=0){
    const own=G.players[ownerPi];
    const ownField=[...own.atLine,...own.dfLine];
    // Golden Fur Griffin (79): -N other own Beasts
    if(fc.card.id===79)base-=ownField.filter(x=>x.uid!==fc.uid&&x.card.tribe==='Beast').length;
    // Undine (81) passive: other own seals +Df 2 per Undine (each Undine buffs others, not itself)
    base+=ownField.filter(x=>x.card.id===81&&x.uid!==fc.uid).length*2;
    // Nerimor Princess Wands (92): all own Fire seals -Df 3 per Nerimor in Df Line (including other Nerimors)
    if(fc.card.el==='fire')base-=own.dfLine.filter(x=>x.card.id===92&&x.uid!==fc.uid).length*3;
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
  if(_isThunderiaFused(fc)){
    const fuseAtks=_getThunderiaFuseAtks(fc).filter(a=>a?.sp!=null);
    if(fuseAtks.length)return fuseAtks.sort((a,b)=>b.sp-a.sp)[0].sp;
  }
  // Coy Crab (id=14): if 2+ Coy Crabs on a player's field, all enemy Seals Sp = 0
  const isP0=[...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.uid===fc.uid);
  const isP1=[...G.players[1].atLine,...G.players[1].dfLine].some(x=>x.uid===fc.uid);
  if(isP0){
    const coyCrabs=[...G.players[1].atLine,...G.players[1].dfLine].filter(x=>x.card.id===14).length;
    if(coyCrabs>=2)return 0;
  }
  if(isP1){
    const coyCrabs=[...G.players[0].atLine,...G.players[0].dfLine].filter(x=>x.card.id===14).length;
    if(coyCrabs>=2)return 0;
  }
  // Akim (id=23): while fused, all own Seals Sp = 4
  const isPlayer=isP0;
  const isEnemy=isP1;
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
  const defEl=getEffectiveEl(defFC);
  if(attFC.card.id===85&&defEl==='light')attAt=Math.max(0,attAt-3);
  // Scalo (id=10): when attacking a fused Seal, use Df if Df > At
  if(attFC.card.id===10&&defFC.fused){
    const scaloDf=getEffectiveDf(attFC);
    if(scaloDf>attAt)attAt=scaloDf;
  }
  // Hydra of Warok (id=50): At -3 when fighting Earth
  if(attFC.card.id===50&&defEl==='earth')attAt=Math.max(0,attAt-3);
  // Wool Wyvern (id=80): At -2 when fighting Fire
  if(attFC.card.id===80&&defEl==='fire')attAt=Math.max(0,attAt-2);
  // Jormungand (id=84): At -3 when fighting Earth
  if(attFC.card.id===84&&defEl==='earth')attAt=Math.max(0,attAt-3);
  // Python (id=73): At -3 when fighting Wind
  if(attFC.card.id===73&&defEl==='wind')attAt=Math.max(0,attAt-3);
  // Divine Dragon (id=86): At -2 when fighting Knight tribe
  if(attFC.card.id===86&&defFC.card.tribe==='Knight')attAt=Math.max(0,attAt-2);
  // Centaur Ranger (id=9): At +2 when attacking a Seal with lower Sp
  if(attFC.card.id===9&&getEffectiveSp(defFC)<getEffectiveSp(attFC))attAt+=2;
  return attAt;
}
function getDefStatWithPassive(defFC,attFC,defLine){
  let s=defLine==='at'?getEffectiveAt(defFC):getEffectiveDf(defFC);
  // Python (73): always defends with Df regardless of line
  if(defFC.card.id===73)s=getEffectiveDf(defFC);
  if(defFC.card.id===85&&attFC.card.el==='light')s=Math.max(0,s-3);
  // Jormungand (84): At -3 when fighting Earth — applies whether Jormungand attacks or defends
  if(defFC.card.id===84&&defLine==='at'&&getEffectiveEl(attFC)==='earth')s=Math.max(0,s-3);
  // Centaur Ranger (id=9): At +2 when fighting a Seal with lower Sp — also applies when defending in At Line
  if(defFC.card.id===9&&defLine==='at'&&getEffectiveSp(attFC)<getEffectiveSp(defFC))s+=2;
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
    if(hasMysticProtect(defFC)){
      log(`${att.name}[At${attAt}] > ${def.name}[${defLabel}] ${lineNote} → blocked (Silent Prohibitor ป้องกันการโจมตี!)`,'');
    } else {
      const spdStr=attAt===defStat?` Spd${attSp}>${defSp}`:'';
      log(`${att.name}[At${attAt}]${spdStr} > ${def.name}[${defLabel}] ${lineNote} → ${def.name} Shrine! +Lv${def.lv}`,'good');
      sendToShrine(defFC,defPi);
      // Stone Lizard (id=43): after successful attack → Stone Curse self until next battle sub-turn
      if(attFC.card.id===43){
        attFC.curses=(attFC.curses||[]);
        if(!attFC.curses.some(c=>c.type==='stone'))attFC.curses.push({type:'stone',expiresAtSubTurn:subTurnNum+4});
        log(`🪨 Stone Lizard ติด Stone Curse หลังโจมตีสำเร็จ`,'');
      }
    }
  } else if(isAll){
    log(`${att.name}[At${attAt}] ≤ ${def.name}[${defLabel}] → blocked`,'');
  } else if(defLine==='df'){
    const spdStr=attAt===defStat?` Spd${defSp}>=${attSp}`:'';
    log(`${att.name}[At${attAt}]${spdStr} ≤ ${def.name}[${defLabel}] (At↔Df) → blocked (Df Line ไม่ตีสวน)`,'');
  } else if(attAt===defStat&&attSp===defSp){
    // Exact tie: both At and Sp equal → both die
    if(hasMysticProtect(attFC)){
      log(`${att.name}[At${attAt}] = ${def.name}[${defLabel}] Spd${attSp}=${defSp} → blocked (Silent Prohibitor)`,'');
    } else {
      log(`${att.name}[At${attAt}] = ${def.name}[${defLabel}] Spd${attSp}=${defSp} → ทั้งคู่ถูกทำลาย!`,'bad');
      sendToShrine(defFC,defPi);
      sendToShrine(attFC,attPi);
    }
  } else {
    const spdStr=attAt===defStat?` Spd${defSp}>${attSp}`:'';
    if(hasMysticProtect(attFC)){
      log(`${att.name}[At${attAt}]${spdStr} ≤ ${def.name}[${defLabel}] ${lineNote} → blocked (Silent Prohibitor ป้องกัน counter-attack!)`,'');
    } else {
      log(`${att.name}[At${attAt}]${spdStr} ≤ ${def.name}[${defLabel}] ${lineNote} → ${att.name} Shrine!`,'bad');
      sendToShrine(attFC,attPi);
    }
  }
}

function destroyByEffect(fc,ownerPi){
  broadcastSound('Card destroyed by effect');
  sendToShrine(fc,ownerPi);
}

function sendToShrine(fc,ownerPi){
  // Charmed card always goes to original owner's shrine
  if(fc.charmed&&fc.charmed.originalPi!==undefined)ownerPi=fc.charmed.originalPi;
  const p=G.players[ownerPi];
  const op=G.players[1-ownerPi];
  // Send any attached PS mystics to owner's mysticGrave before removing from field
  _drainAllMystics(fc,ownerPi);
  if(fc.fusionStack?.length)fc.fusionStack.forEach(mfc=>_drainAllMystics(mfc,ownerPi));
  const rm=arr=>{const i=arr.findIndex(x=>x.uid===fc.uid);if(i>=0)arr.splice(i,1);};
  rm(p.atLine);rm(p.dfLine);rm(op.atLine);rm(op.dfLine);
  p.shrine.push(fc.card);
  if(fc.fused&&fc.fusionStack.length>0){
    fc.fusionStack.forEach(mfc=>{
      p.shrine.push(mfc.card);
      log(`${mfc.card.name} also sent to shrine (fusion collapse)`,'bad');
    });
  }
  // Dark Destiny (72): when sent to shrine, owner must discard 1 mystic from hand immediately
  if(fc.card.id===72){
    const owner=G.players[ownerPi];
    if((owner.mysticHand||[]).length>0){
      if(ownerPi===0){
        G._ddDiscardPending=true;
        document.getElementById('fa-title').textContent='Dark Destiny [Ability]: ต้องทิ้ง Mystic 1 ใบ';
        const opts=document.getElementById('fa-opts');opts.innerHTML='';
        const cancelBtn=document.getElementById('fa-cancel-btn');
        if(cancelBtn)cancelBtn.style.display='none';
        owner.mysticHand.forEach((mc,i)=>{
          addFAOpt(`ทิ้ง ${mc.name}`,()=>{
            if(cancelBtn)cancelBtn.style.display='';
            document.getElementById('fa-modal').classList.remove('show');
            owner.mysticHand.splice(i,1);
            (owner.mysticGrave=owner.mysticGrave||[]).push(mc);
            log(`Dark Destiny [Ability]: ทิ้ง Mystic ${mc.name}!`,'bad');
            G._ddDiscardPending=false;
            render();
            if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
            if(_ddDiscardResume){const r=_ddDiscardResume;_ddDiscardResume=null;r();}
          });
        });
        document.getElementById('fa-modal').classList.add('show');
      } else if(window.Online?.isOnline&&Online.isHost){
        // GUEST player's Dark Destiny died — signal GUEST to pick which mystic to discard
        G._pendingGuestDDShrine=true;
      } else {
        // Offline AI auto-discard random
        const mc=owner.mysticHand.splice(Math.floor(Math.random()*owner.mysticHand.length),1)[0];
        (owner.mysticGrave=owner.mysticGrave||[]).push(mc);
        log(`Dark Destiny [Ability]: AI ทิ้ง Mystic ${mc.name}!`,'bad');
        render();
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

function shrineTotal(pi){return G.players[pi].shrine.reduce((s,c)=>s+(c?c.lv:0),0);}

function checkLose(){
  for(let pi=0;pi<2;pi++){
    if(shrineTotal(pi)>=MAX_SHRINE){
      const who=pi===0?'Your':'Enemy';
      showWin(1-pi,`${who} shrine overflowed!`);return;
    }
    if(!G.players[pi].deck.length&&!G.players[pi].hand.length){
      const who=pi===0?'คุณ':'ศัตรู';
      showWin(1-pi,`${who} หมดการ์ด Seal ทั้งกอง`);return;
    }
  }
}

function showWin(pi,reason=null){
  gameWinner=pi;
  document.getElementById('win-title').textContent=pi===0?'YOU WIN!':'YOU LOSE!';
  const defaultReason=pi===0?'Enemy shrine overflowed!':'Your shrine overflowed!';
  document.getElementById('win-sub').textContent=reason||defaultReason;
  document.getElementById('win-screen').classList.add('show');
  const bgm=document.getElementById('bgm');
  if(bgm){bgm.pause();bgm.currentTime=0;}
  const vol=parseFloat(localStorage.getItem('bgm_volume')||'0.3');
  const muted=localStorage.getItem('bgm_muted')==='1';
  const winSnd=new Audio(pi===0?'SoundEffect/music/Summoner Win Chime.mp3':'SoundEffect/music/Summoner Lose.mp3');
  winSnd.volume=vol;winSnd.muted=muted;winSnd.play().catch(()=>{});
  if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
}

// ══════════════════════════════════════════════
// AI TURN — step by step with preview
// ══════════════════════════════════════════════
// Returns true if targetFC is immune to any AI mystic attachment.
// Centralised check used by _attachPS, _attachPSInterfere, and Thunder-Bolt finders.
function _aiMysticBlocked(targetFC){
  // Heaven Knight (82): blocks ENEMY mystics only — AI (pi=1) is blocked from targeting player's (pi=0) HK
  if(targetFC.card.id===82){const o=findFCOwner(targetFC);if(!o||o.pi===0)return true;}
  // Delta-D (22): blocks all mystics regardless of side
  if(targetFC.card.id===22)return true;
  // Gregory (67) in AtLine: blocks all seals on the same side from receiving mystics
  const owner=findFCOwner(targetFC);
  if(owner&&G.players[owner.pi].atLine.some(x=>x.card.id===67))return true;
  return false;
}

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
      if(mainFC.curses?.some(c=>c.type==='charm'))continue; // charmed — player controls it
      const mats=[...ai.dfLine,...ai.atLine].filter(m=>{
        if(m.uid===mainFC.uid||m.fused||usedUids.has(m.uid)||newFromHand(m)||hasPSMystic(m))return false;
        if(m.wasMainFusedTurn===turnNum)return false;
        if(m.curses?.some(c=>c.type==='charm'))return false;
        if(!fuseMaterialHelps(mainFC,m.card))return false;
        // Only fuse if this material actually unlocks at least one attack
        const testStack=[...mainFC.fusionStack.map(x=>x.card),m.card];
        return _unlockedAtksForStack(mainFC.card.fuse||[],testStack).length>0;
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
        broadcastSound('Fusion Complete');
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
      const t=allPlayer.find(t=>[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t)return{mp:2,label:`Last Dance Curse → ${t.card.name}`,execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'lastDance',atBonus:2,expiresAtSubTurn:subTurnNum+4});
        broadcastSound('Skill');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Last Dance Curse At+2 / 2 Turn!`,'bad');
      }};
    }
    // Desert Chimera (id=7): Poison on player card, fused + at line
    if(id===7&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>!t.curses?.some(c=>c.type==='poison')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t)return{mp:2,label:`Poison Curse → ${t.card.name}`,execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+6});
        broadcastSound('Poison');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Poison Curse 3 Turn!`,'bad');
      }};
    }
    // Cockatrice (id=11): Stone on player card sp 1-4, fused
    if(id===11&&fc.fused&&ai.mp>=2){
      const t=allPlayer.find(t=>[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='stone')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t)return{mp:2,label:`Stone Curse → ${t.card.name}`,execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'stone',expiresAtSubTurn:subTurnNum+2});
        broadcastSound('Stone');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Stone Curse 1 Turn!`,'bad');
      }};
    }
    // Jiu Wei Hu Le (id=12): Charm on player card sp 1-3, fused with dark
    if(id===12&&fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness')&&ai.mp>=2){
      const t=allPlayer.find(t=>[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='charm')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t){
        const fromLine=player.atLine.includes(t)?'atLine':'dfLine';
        return{mp:2,label:`Charm Curse → ${t.card.name}`,execute:()=>{
          t.charmed={originalPi:0,originalLine:fromLine};
          t.curses=(t.curses||[]);t.curses.push({type:'charm',expiresAtSubTurn:subTurnNum+6});
          t.exhausted=false;t.hasUsedSkill=false;
          broadcastSound('Charm');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Charm Curse 3 Turn!`,'bad');
        }};
      }
    }
    // Armadillon (id=15): Freeze on player card sp 2-4, fused + at line
    if(id===15&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>[2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='freeze')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t){
        const fromLine=player.atLine.includes(t)?'atLine':'dfLine';
        return{mp:2,label:`Freeze Curse → ${t.card.name}`,execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'freeze',expiresAtSubTurn:subTurnNum+2});
          if(fromLine==='atLine'){const i=player.atLine.findIndex(x=>x.uid===t.uid);
            if(i>=0){player.atLine.splice(i,1);player.dfLine.push(t);}}
          broadcastSound('Freeze');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Freeze Curse 1 Turn!`,'bad');
        }};
      }
    }
    // Assassin Doll (id=46): Death Curse on lowest-At player card, At Line, 2+ player seals
    if(id===46&&ai.atLine.some(x=>x.uid===fc.uid)&&allPlayer.length>=2&&ai.mp>=2){
      const _dc46=allPlayer.filter(x=>x.card.id!==82&&x.card.id!==22);
      const minAt=_dc46.length?Math.min(..._dc46.map(x=>getEffectiveAt(x))):Infinity;
      const t=_dc46.find(x=>getEffectiveAt(x)===minAt);
      if(t)return{mp:2,label:`Death Curse → ${t.card.name}`,_dcTarget:t,execute:()=>{
        const hasDeath=(t.curses||[]).some(c=>c.type==='death');
        t.curses=(t.curses||[]).filter(c=>c.type!=='death');
        if(hasDeath){destroyByEffect(t,0);log(`AI: ${fc.card.name} [Skill] ☠ Death Curse → ${t.card.name} ถูกทำลาย!`,'bad');}
        else log(`AI: ${fc.card.name} [Skill] ☠ Death Curse ถูกแก้ไขระหว่าง Interfere!`,'');
      }};
    }
    // Punishula (id=5): destroy Evil on player field, at line
    if(id===5&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=3){
      const t=allPlayer.find(t=>t.card.tribe==='Evil');
      if(t)return{mp:3,label:`Destroy Evil → ${t.card.name}`,execute:()=>{
        destroyByEffect(t,0);
        log(`AI: ${fc.card.name} [Skill] → ${t.card.name} ถูกทำลาย!`,'bad');
      }};
    }
    // Ghost Ship (id=16): return self to deck, Double Combination (1 material), Mp 0
    if(id===16&&fc.fused&&fc.fusionStack.length>=1){
      return{mp:0,label:'Return to deck',execute:()=>{
        fc.fusionStack.forEach(mfc=>{ai.atLine.push(mfc);});
        _drainAllMystics(fc,1);
        const rmA=ai.atLine.findIndex(x=>x.uid===fc.uid);if(rmA>=0)ai.atLine.splice(rmA,1);
        const rmD=ai.dfLine.findIndex(x=>x.uid===fc.uid);if(rmD>=0)ai.dfLine.splice(rmD,1);
        ai.deck.push(fc.card);shuffle(ai.deck);
        log(`AI: ${fc.card.name} [Skill]: กลับสู่กองและสลับ`,'');
      }};
    }
    // Golden Horn Unicorn (id=2): heal own cursed card
    if(id===2&&ai.mp>=1){
      const t=allAI.find(t=>t.curses?.length>0);
      if(t)return{mp:1,label:`Heal Curse → ${t.card.name}`,execute:()=>{
        t.curses=[];
        broadcastSound('Skill');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} หาย Curse ทุกชนิด!`,'');
      }};
    }
    // Banshee (id=28): Death Curse Sp 1-3, fused+dark+at line, Mp 3
    if(id===28&&fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness')&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=3){
      const t=allPlayer.find(t=>[1,2,3].includes(t.card.sp)&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t)return{mp:3,label:`Death Curse → ${t.card.name}`,_dcTarget:t,execute:()=>{
        const hasDeath=(t.curses||[]).some(c=>c.type==='death');
        t.curses=(t.curses||[]).filter(c=>c.type!=='death');
        if(hasDeath){destroyByEffect(t,0);log(`AI: ${fc.card.name} [Skill] ☠ Death Curse → ${t.card.name} ถูกทำลาย!`,'bad');}
        else log(`AI: ${fc.card.name} [Skill] ☠ Death Curse ถูกแก้ไขระหว่าง Interfere!`,'');
      }};
    }
    // Mysterious Elephant (id=42): Poison 1 Turn Sp 2-5, fused+at line, Mp 3
    if(id===42&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=3){
      const t=allPlayer.find(t=>[2,3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t)return{mp:3,label:`Poison Curse 1 Turn → ${t.card.name}`,execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+2});
        broadcastSound('Poison');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Poison Curse 1 Turn!`,'bad');
      }};
    }
    // Hydra of Warok (id=50): Poison 2 Turn Sp 3-5, fused+at line, Mp 2
    if(id===50&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t)return{mp:2,label:`Poison Curse 2 Turn → ${t.card.name}`,execute:()=>{
        t.curses=(t.curses||[]);t.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+4});
        broadcastSound('Poison');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Poison Curse 2 Turn!`,'bad');
      }};
    }
    // Black Wiser (41): drain player Mp, prefer 2-drain if fused with Hellish Bird
    if(id===41&&player.mp>0){
      const hasDrainPlus=fc.fused&&fc.fusionStack.some(m=>m.card.id===44)&&ai.mp>=3;
      if(hasDrainPlus)return{mp:3,label:'Player Mp -2',execute:()=>{
        player.mp=Math.max(0,player.mp-2);
        broadcastSound('Skill');log(`AI: ${fc.card.name} [Skill] → ผู้เล่น Mp -2!`,'bad');
      }};
      if(ai.mp>=2)return{mp:2,label:'Player Mp -1',execute:()=>{
        player.mp=Math.max(0,player.mp-1);
        broadcastSound('Skill');log(`AI: ${fc.card.name} [Skill] → ผู้เล่น Mp -1!`,'bad');
      }};
    }
    // Hellish Bird (44): Last Dance Curse on player seal
    if(id===44){
      const atLine=ai.atLine.some(x=>x.uid===fc.uid);
      const fusedBW=fc.fused&&fc.fusionStack.some(m=>m.card.id===41);
      const fusedDark=fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness');
      if(fusedBW&&atLine&&ai.mp>=3){
        const t=allPlayer.find(t=>[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
        if(t)return{mp:3,label:`Last Dance At+3/2T → ${t.card.name}`,execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'lastDance',atBonus:3,expiresAtSubTurn:subTurnNum+4});
          broadcastSound('Skill');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Last Dance At+3 / 2T!`,'bad');
        }};
      }
      if(fusedDark&&atLine&&ai.mp>=2){
        const t=allPlayer.find(t=>[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
        if(t)return{mp:2,label:`Last Dance At+2/3T → ${t.card.name}`,execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'lastDance',atBonus:2,expiresAtSubTurn:subTurnNum+6});
          broadcastSound('Skill');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Last Dance At+2 / 3T!`,'bad');
        }};
      }
    }
    // Succubus (45): Charm Curse 1T on non-Light player seal, fused + at line
    if(id===45&&fc.fused&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>t.card.el!=='light'&&!t.curses?.some(c=>c.type==='charm')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t){const fromLine=player.atLine.some(x=>x.uid===t.uid)?'atLine':'dfLine';
        return{mp:2,label:`Charm Curse 1T → ${t.card.name}`,execute:()=>{
          t.charmed={originalPi:0,originalLine:fromLine};
          t.curses=(t.curses||[]);t.curses.push({type:'charm',expiresAtSubTurn:subTurnNum+2});
          t.exhausted=false;t.hasUsedSkill=false;
          broadcastSound('Charm');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Charm Curse 1T!`,'bad');
        }};
      }
    }
    // Medusa (48): Stone ∞ (Earth Mp3) or Poison 3T (Water Mp2)
    if(id===48){
      if(fc.fused&&fc.fusionStack.some(m=>m.card.el==='earth')&&ai.mp>=3){
        const t=allPlayer.find(t=>[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='stone')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
        if(t)return{mp:3,label:`Stone Curse ∞ → ${t.card.name}`,execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'stone',expiresAtSubTurn:Infinity});
          broadcastSound('Stone');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Stone Curse ∞!`,'bad');
        }};
      }
      if(fc.fused&&fc.fusionStack.some(m=>m.card.el==='water')&&ai.mp>=2){
        const t=allPlayer.find(t=>[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
        if(t)return{mp:2,label:`Poison Curse 3T → ${t.card.name}`,execute:()=>{
          t.curses=(t.curses||[]);t.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+6});
          broadcastSound('Poison');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Poison Curse 3T!`,'bad');
        }};
      }
    }
    // Siren (58): Charm Curse 2T on player seal sp 3-5, fused+Dark+at line
    if(id===58&&fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness')&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=2){
      const t=allPlayer.find(t=>[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='charm')&&t.card.id!==82&&t.card.id!==22&&t.card.id!==20);
      if(t){const fromLine=player.atLine.some(x=>x.uid===t.uid)?'atLine':'dfLine';
        return{mp:2,label:`Charm Curse 2T → ${t.card.name}`,execute:()=>{
          t.charmed={originalPi:0,originalLine:fromLine};
          t.curses=(t.curses||[]);t.curses.push({type:'charm',expiresAtSubTurn:subTurnNum+4});
          t.exhausted=false;t.hasUsedSkill=false;
          broadcastSound('Charm');log(`AI: ${fc.card.name} [Skill] → ${t.card.name} Charm Curse 2T!`,'bad');
        }};
      }
    }
    // Harison (88): destroy Stone-cursed seal, at line, Mp 3 — prefer enemy seals
    if(id===88&&ai.atLine.some(x=>x.uid===fc.uid)&&ai.mp>=3){
      const t=allPlayer.find(t=>t.curses?.some(c=>c.type==='stone'))
        ||allAI.find(t=>t.uid!==fc.uid&&t.curses?.some(c=>c.type==='stone'));
      if(t){const tPi=allPlayer.some(x=>x.uid===t.uid)?0:1;
        return{mp:3,label:`Destroy Stone Cursed → ${t.card.name}`,execute:()=>{
          destroyByEffect(t,tPi);
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
      if(fc.hasUsedSkill||fc.curses?.some(c=>c.type==='stone'||c.type==='charm'))continue;
      const skill=getAICardSkill(fc);
      if(!skill)continue;
      fc.hasUsedSkill=true;
      ai.mp=Math.max(0,ai.mp-skill.mp);
      if(skill._dcTarget){skill._dcTarget.curses=(skill._dcTarget.curses||[]);skill._dcTarget.curses.push({type:'death',expiresAtSubTurn:Infinity});}
      showActionQueue(`🤖 ${fc.card.name} [Skill] → ${skill.label}`,()=>{
        // Re-validate: temporarily restore MP and re-check conditions (e.g. Thunder Bolt unfused during AQ)
        ai.mp+=skill.mp;
        const recheck=getAICardSkill(fc);
        if(!recheck||fc.curses?.some(c=>c.type==='stone'||c.type==='freeze')){
          if(skill._dcTarget)skill._dcTarget.curses=(skill._dcTarget.curses||[]).filter(c=>c.type!=='death');
          log(`${fc.card.name} [Skill] ยกเลิก — ติด Curse ระหว่างประกาศ`,'bad');
          render();doAISkill(callback);return;
        }
        ai.mp=Math.max(0,ai.mp-skill.mp);
        skill.execute();
        checkLose();render();
        doAISkill(callback);
      });
      return;
    }
    callback();
  }

  function doAIMystic(callback){
    const player=G.players[0];
    // Helpers defined once outside the loop to avoid function-in-loop issues
    function _playMC(mc,mi,aqDesc,execCb){
      ai.mp-=mc.mc; ai.mysticHand.splice(mi,1); (ai.mysticGrave=ai.mysticGrave||[]).push(mc); broadcastSound('Spell');
      showActionQueue(`🤖 ${aqDesc}`,()=>{
        execCb();
        checkLose();render();
        if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
        doAIMystic(callback);
      });
    }
    function _attachPS(mc,mi,targetFC,atB,dfB,spB,flags,desc){
      if(_aiMysticBlocked(targetFC)){log(`${targetFC.card.name} [Ability]: ยกเลิก Mystic!`,'');return;}
      const expires=mc.turns===999?Infinity:subTurnNum+(mc.turns*2);
      _playMC(mc,mi,`${mc.name} → ${targetFC.card.name}${desc?' ('+desc+')':''}`,()=>{
        if(mc.turns!==0){
          targetFC.mystics=(targetFC.mystics||[]);
          targetFC.mystics.push({mystic:mc,atBonus:atB,dfBonus:dfB,spBonus:spB,...(flags||{}),expiresBeforeSubTurn:expires,casterPi:1});
          if(flags&&flags.curseType){
            targetFC.curses=(targetFC.curses||[]);
            targetFC.curses.push({type:flags.curseType,expiresAtSubTurn:Infinity,fromPS:mc.id});
            playSound(flags.curseType==='stone'?'Stone':'Skill');
          }
        }
        log(`AI: ${mc.name} → ${targetFC.card.name}!`,'bad');
      });
    }

    for(let mi=0;mi<ai.mysticHand.length;mi++){
      const mc=ai.mysticHand[mi];
      if(ai.mp<mc.mc)continue;
      if(mc.interfere)continue; // hold interfere cards for the player's action queue window
      const id=mc.id;

      // id:32 Yin — weaken player's highest-At AtLine seal (-At by Lv)
      if(id===32){
        const tgts=[...player.atLine].filter(fc=>canAttachMystic(mc,fc)&&!fc.curses?.some(c=>c.type==='stone')&&!_aiMysticBlocked(fc));
        if(tgts.length){const t=tgts.sort((a,b)=>getEffectiveAt(b)-getEffectiveAt(a))[0];_attachPS(mc,mi,t,-t.card.lv,0,0,{},`-At${t.card.lv}`);return;}
      }

      // id:37 Thunder Bolt — unfuse player's fused seal
      if(id===37){
        const t=[...player.atLine,...player.dfLine].find(fc=>fc.fused&&canAttachMystic(mc,fc)&&!_aiMysticBlocked(fc));
        if(t){
          const _mc37=mc,_mi37=mi;
          ai.mp-=_mc37.mc;ai.mysticHand.splice(_mi37,1);(ai.mysticGrave=ai.mysticGrave||[]).push(_mc37);broadcastSound('Spell');
          showActionQueue(`🤖 ${_mc37.name} → แยกรวมร่าง ${t.card.name}`,()=>{
            const owner=findFCOwner(t);
            if(owner){const mainLine=owner.p.atLine.some(x=>x.uid===t.uid)?'atLine':'dfLine';t.fusionStack.forEach(m=>{owner.p[mainLine].push(m);});}
            t.fusionStack=[];t.fusionAtks=[];t.fused=false;t.fusedSinceTurn=null;t.wasMainFusedTurn=turnNum;
            log(`AI: ${_mc37.name} → ${t.card.name} แยกรวมร่าง!`,'bad');
            checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
            doAIMystic(callback);
          });
          return;
        }
      }

      // id:17 Holy Prayer — cure own cursed seal first; else destroy player PS mystic
      if(id===17){
        const cursed=[...ai.atLine,...ai.dfLine].find(fc=>fc.curses?.length>0);
        if(cursed){
          _playMC(mc,mi,`Holy Prayer → รักษา ${cursed.card.name}`,()=>{cursed.curses=[];log(`AI: Holy Prayer → รักษา ${cursed.card.name}!`,'bad');});
          return;
        }
        const psT=[...player.atLine,...player.dfLine].filter(fc=>getActiveMystics(fc).length&&!hasMysticProtect(fc));
        if(psT.length){
          const t=psT[0],m0=getActiveMystics(t)[0];
          _playMC(mc,mi,`Holy Prayer → ทำลาย ${m0.mystic.name}`,()=>{
            _mysticSplice(t,m0);
            log(`AI: Holy Prayer → ทำลาย ${m0.mystic.name}!`,'bad');
          });
          return;
        }
      }

      // id:26 Inquisition — destroy player's PS mystic
      if(id===26){
        const psT=[...player.atLine,...player.dfLine].filter(fc=>getActiveMystics(fc).length&&!hasMysticProtect(fc));
        if(psT.length){
          const t=psT[0],m0=getActiveMystics(t)[0];
          _playMC(mc,mi,`Inquisition → ทำลาย ${m0.mystic.name}`,()=>{
            _mysticSplice(t,m0);
            log(`AI: Inquisition → ทำลาย ${m0.mystic.name}!`,'bad');
          });
          return;
        }
      }

      // id:30 Houdini — stone-curse player's strongest non-stoned AtLine seal
      if(id===30){
        const tgts=[...player.atLine].filter(fc=>canAttachMystic(mc,fc)&&!fc.curses?.some(c=>c.type==='stone')&&!_aiMysticBlocked(fc)&&fc.card.id!==20);
        if(tgts.length){const t=tgts.sort((a,b)=>getEffectiveAt(b)-getEffectiveAt(a))[0];_attachPS(mc,mi,t,0,0,0,{curseType:'stone'},'Stone Curse');return;}
      }

      // id:66 Sacrifice — destroy player's strongest seal + discard 2 own hand cards
      if(id===66&&ai.hand.length>=2){
        const valid=[...player.atLine,...player.dfLine].filter(fc=>!(mc.exception_tribes||[]).includes(fc.card.tribe));
        if(valid.length){
          const t=valid.sort((a,b)=>getEffectiveAt(b)-getEffectiveAt(a))[0];
          const d1=ai.hand[0],d2=ai.hand[1];
          _playMC(mc,mi,`Sacrifice → ทำลาย ${t.card.name}`,()=>{
            const owner=findFCOwner(t);if(owner)destroyByEffect(t,owner.pi);
            [d1,d2].forEach(c=>{const i=ai.hand.indexOf(c);if(i>=0){ai.hand.splice(i,1);ai.shrine.push(c);}});
            log(`AI: Sacrifice → ทำลาย ${t.card.name}! ทิ้ง ${d1.name}, ${d2.name}!`,'bad');
          });
          return;
        }
      }

      // id:40 Benediction — recover highest-Lv shrined seal to hand
      if(id===40&&ai.shrine.length>0&&ai.hand.length<HAND_MAX){
        const valid=ai.shrine.filter(c=>!(mc.exception_tribes||[]).includes(c.tribe));
        if(valid.length){
          const pick=valid.sort((a,b)=>b.lv-a.lv)[0];
          _playMC(mc,mi,`Benediction → ${pick.name} ขึ้นมือ`,()=>{
            const i=ai.shrine.indexOf(pick);if(i>=0){ai.shrine.splice(i,1);ai.hand.push(pick);}
            log(`AI: Benediction → ${pick.name} ขึ้นมือ!`,'bad');
          });
          return;
        }
      }

      // id:34 Cunning Clown — swap player lines (only if player has DfLine seals to expose)
      if(id===34&&player.dfLine.filter(fc=>fc.card.tribe!=='Machine').length>0){
        _playMC(mc,mi,`Cunning Clown → สลับ Line Player`,()=>{
          const mv_at=player.atLine.filter(fc=>fc.card.tribe!=='Machine');
          const mv_df=player.dfLine.filter(fc=>fc.card.tribe!=='Machine');
          const kp_at=player.atLine.filter(fc=>fc.card.tribe==='Machine');
          const kp_df=player.dfLine.filter(fc=>fc.card.tribe==='Machine');
          player.atLine=[...mv_df,...kp_at];player.dfLine=[...mv_at,...kp_df];
          log(`AI: Cunning Clown → สลับ Line Player!`,'bad');
        });
        return;
      }

      // id:29 Release from Hell — buff own Evil seal in AtLine
      if(id===29){
        const t=[...ai.atLine,...ai.dfLine].find(fc=>fc.card.tribe==='Evil'&&canAttachMystic(mc,fc));
        if(t){_attachPS(mc,mi,t,2,1,1,{},'At+2 Df+1 Sp+1');return;}
      }
      // id:27 Lighthouse — skip (AI already knows all information)
    }
    callback();
  }

  function doDeployStep(idx){
    if(idx>=toPlay.length){doAIMystic(()=>doAIFuse(()=>doAISkill(()=>setTimeout(doAIBattle,200))));return;}
    const {card,line}=toPlay[idx];
    updateAIPreview(card,`⬇ Deploying to ${line==='at'?'At':'Df'} Line`);
    showActionQueue(`🤖 ลงการ์ด <b>${card.name}</b> → ${line==='at'?'At':'Df'} Line (ลง ${card.mc} Mp)`,()=>{
      if(ai.mp<card.mc){log(`AI: ${card.name} ลงไม่ได้ — Mp ไม่พอ`,'');doDeployStep(idx+1);return;}
      const hi=ai.hand.findIndex(c=>c===card||c.id===card.id);
      if(hi>=0)ai.hand.splice(hi,1);
      ai.mp-=card.mc;
      (line==='at'?ai.atLine:ai.dfLine).push(makeFieldCard(card,true));
      broadcastSound('Deploy');
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
    log('AI: BATTLE PHASE','hi');
    render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();

    function doAttackStep(idx){
      if(idx>=attackers.length){_aiAttackerFC=null;updateAIPreview(null);setTimeout(()=>endAITurn(),400);return;}
      const afc=attackers[idx];
      _aiAttackerFC=afc;
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
      // Filter Silent Prohibitor: protected seals cannot be attacked
      const filterSP=t=>!hasMysticProtect(t.fc);
      atT=atT.filter(filterME).filter(filterBrig).filter(filterSP);
      dfT=dfT.filter(filterME).filter(filterBrig).filter(filterSP);
      // Centaur Scout: at→df cross, df→at cross
      // Use raw At Line count for line enforcement — filtered-out seals still block Df access
      const rawAtLen=G.players[0].atLine.length;
      let targets;
      if(isCSAt){targets=dfT.length>0?dfT:atT;}
      else if(isCSdf){targets=atT.length>0?atT:dfT;}
      else targets=rawAtLen>0?atT:dfT;

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

      const maMod=getMysticMaReduction(afc);
      const _aiActiveAtks=getActiveAtks(afc);
      const _aiBestAtk=_aiActiveAtks.filter(a=>a.at).sort((a,b)=>b.at-a.at)[0]||_aiActiveAtks[0];
      const maCost=_aiBestAtk?Math.max(0,(_aiBestAtk.mp||1)-maMod):Math.max(0,(afc.card.ma||1)-maMod);
      const allSp=_aiActiveAtks.filter(a=>a.all&&a.at&&ai.mp>=Math.max(0,a.mp-maMod)).sort((a,b)=>b.at-a.at)[0];
      const winSp=_aiActiveAtks.filter(a=>!a.all&&a.at&&ai.mp>=Math.max(0,a.mp-maMod)).filter(a=>{
        const bestT=targets.reduce((best,{fc:d,line:dl})=>{
          const ds=dl==='at'?getEffectiveAt(d):getEffectiveDf(d);
          return (!best||a.at>ds)?{fc:d,dl,ds}:best;
        },null);
        return bestT&&(a.at>bestT.ds||(a.at===bestT.ds&&getEffectiveSp(afc)>getEffectiveSp(bestT.fc)));
      }).sort((a,b)=>b.at-a.at)[0];
      const myAtBase=getEffectiveAt(afc);
      const bestTarget=targets.reduce((best,{fc:d,line:dl})=>{
        const ds=dl==='at'?getEffectiveAt(d):getEffectiveDf(d);
        const myAtVs=applyPassiveAbilities(afc,d,myAtBase);
        const wins=myAtVs>ds||(myAtVs===ds&&getEffectiveSp(afc)>getEffectiveSp(d));
        if(!best)return{fc:d,line:dl,ds,myAtVs,wins};
        // prefer winning targets; among equal, prefer weakest
        if(wins&&!best.wins)return{fc:d,line:dl,ds,myAtVs,wins};
        if(!wins&&best.wins)return best;
        return ds<best.ds?{fc:d,line:dl,ds,myAtVs,wins}:best;
      },null);
      const myAt=bestTarget?.myAtVs??myAtBase;
      const normalWins=bestTarget&&bestTarget.wins&&ai.mp>=maCost;

      function done(){
        afc.exhausted=true;
        checkLose();render();
        doAttackStep(idx+1);
      }

      if(allSp){
        ai.mp-=Math.max(0,allSp.mp-maMod);
        const allTargets=[...G.players[0].atLine.map(fc=>({fc,line:'at'})),...G.players[0].dfLine.map(fc=>({fc,line:'df'}))];
        showActionQueue(`🤖 ${afc.card.name} → <b>${allSp.name}</b> (ALL)`,()=>{
          if(afc.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${afc.card.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'');done();return;}
          log(`AI: ${afc.card.name} uses ${allSp.name} (ALL)`);
          animateAllTargets(afc,allTargets,_fusionAtkAt(allSp.at,afc),allSp.name,1,0,done);
        });
      } else if(winSp){
        ai.mp-=Math.max(0,winSp.mp-maMod);
        const hitCount=winSp.hits||1;
        let hitsDone=0;
        function doHit(){
          const curT=[...G.players[0].atLine.map(f=>({fc:f,line:'at'})),...G.players[0].dfLine.map(f=>({fc:f,line:'df'}))].filter(filterME).filter(filterBrig);
          if(!curT.length||hitsDone>=hitCount){done();return;}
          const effAt=_fusionAtkAt(winSp.at,afc); // recalculate — includes mystic debuffs applied during interfere
          const htgt=curT.find(({fc:d,line:dl})=>effAt>(dl==='at'?getEffectiveAt(d):getEffectiveDf(d)))||curT.reduce((b,{fc:d,line:dl})=>{const ds=dl==='at'?getEffectiveAt(d):getEffectiveDf(d);return(!b||ds<b.ds)?{fc:d,line:dl,ds}:b;},null);
          if(htgt){
            combatAnim(afc,htgt.fc,effAt,htgt.line,false,()=>{
              dealDamage(afc,htgt.fc,effAt,winSp.name,1,0,htgt.line);
              afterDD(()=>{hitsDone++;render();doHit();});
            });
          } else {hitsDone++;doHit();}
        }
        {
          const preT=[...G.players[0].atLine.map(f=>({fc:f,line:'at'})),...G.players[0].dfLine.map(f=>({fc:f,line:'df'}))].filter(filterME).filter(filterBrig);
          const firstTgt=preT.find(({fc:d,line:dl})=>winSp.at>(dl==='at'?getEffectiveAt(d):getEffectiveDf(d)))||preT.reduce((b,{fc:d,line:dl})=>{const ds=dl==='at'?getEffectiveAt(d):getEffectiveDf(d);return(!b||ds<b.ds)?{fc:d,line:dl,ds}:b;},null);
          showActionQueue(`🤖 ${afc.card.name} → <b>${winSp.name}</b>${hitCount>1?' ×'+hitCount:''} ⚔ ${firstTgt?.fc.card.name||'?'}`,()=>{
            if(afc.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${afc.card.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'');done();return;}
            log(`AI: ${afc.card.name} uses ${winSp.name}${hitCount>1?` (×${hitCount})`:''}`);
            doHit();
          });
        }
      } else if(normalWins){
        ai.mp-=maCost;
        showActionQueue(`🤖 ${afc.card.name} ⚔ ${bestTarget.fc.card.name}`,()=>{
          if(afc.curses?.some(c=>c.type==='stone'||c.type==='freeze')){log(`${afc.card.name} ถูก Stone/Freeze Curse — โจมตีถูกยกเลิก!`,'');done();return;}
          // Intercept: Wool Wyvern / Phoenix appeared on player's At Line during AQ window
          let tgt=bestTarget;
          if(tgt.line==='df'&&G.players[0].atLine.length>0){
            const intercept=G.players[0].atLine.find(x=>!hasMysticProtect(x))||G.players[0].atLine[0];
            if(intercept){log(`AI: ${afc.card.name} → ${intercept.card.name} ขวาง (At Line ใหม่)!`,'bad');tgt={fc:intercept,line:'at'};}
          }
          const curAt=getEffectiveAt(afc); // recalculate after interfere window (e.g. Yin debuff)
          combatAnim(afc,tgt.fc,curAt,tgt.line,false,()=>{
            dealDamage(afc,tgt.fc,curAt,'normal attack',1,0,tgt.line);
            afterDD(done);
          });
        });
      } else {
        const hasAffordableFusion=_aiActiveAtks.some(a=>a.at&&ai.mp>=Math.max(0,a.mp-maMod));
        if(!hasAffordableFusion&&ai.mp<maCost){
          doAttackStep(idx+1);
        } else {
          afc.exhausted=true;
          doAttackStep(idx+1);
        }
      }
    }
    showBattlePhaseAnim(()=>{doAttackStep(0);});
  }

  function endAITurn(){
    if(_noSealAtStart[1]&&G.players[1].atLine.length===0&&G.players[1].dfLine.length===0){
      log('AI ไม่มี Seal ในสนามตลอดเทิร์น — Player ชนะ!','good');
      showWin(0,'AI ไม่มี Seal ในสนามตลอดทั้งเทิร์น');return;
    }
    _chainDisplay=[];_chainCollapsed=false;_nextChainCard=null;_updateChainDisplay();
    // Vioria on player side: gain AI's leftover MP before AI refills
    {const _aiMpLeft=G.players[1].mp;
    const _vioP=[...G.players[0].atLine,...G.players[0].dfLine].filter(x=>x.card.id===56);
    if(_vioP.length>0&&_aiMpLeft>0){
      G.players[0].mp=Math.min(G.players[0].mp+_aiMpLeft,getEffectiveMpMax(0));
      log(`Vioria [Ability]: AI เหลือ ${_aiMpLeft} Mp → Player +${_aiMpLeft} Mp!`,'good');
    }}
    // AI MP refills at end of their turn
    G.players[1].mp=getEffectiveMpMax(1);
    updateAIPreview(null);
    G.players[1].atLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
    G.players[1].dfLine.forEach(s=>{s.activeMultiAtk=null;s.hitsLeft=0;});
    handAttackedThisTurn=false;
    G.currentPlayer=0;
    subTurnNum++;
    [0,1].forEach(rpi=>{
      G.players[rpi].atLine.forEach(s=>{s.exhausted=false;s.hasAttacked=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
      G.players[rpi].dfLine.forEach(s=>{s.exhausted=false;s.hasAttacked=false;s.hasUsedSkill=false;s.willMind=false;s.sevenSilverFree=false;s.atBoosts=s.atBoosts.filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.spBoosts=(s.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);s.dfBoosts=(s.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);});
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
          _drainAllMystics(hk,pi);
          if(hk.fusionStack?.length)hk.fusionStack.forEach(m=>{_drainAllMystics(m,pi);owner.shrine.push(m.card);});
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
let _aqPreviewCard=null;
// Called after any interfere card is played — resets pass state so both players can respond again
function _enterChainMode(cardName){
  _aqChainMode=true;
  _aqPassBits=0;
  document.getElementById('aq-desc').innerHTML=`🔗 <b>${cardName}</b> — Interfere เพิ่ม หรือกด "ไปต่อ"`;
  const bp=document.getElementById('btn-proceed');
  const aw=document.getElementById('aq-waiting');
  if(bp)bp.style.display='inline-block';
  if(aw)aw.style.display='none';
  // Re-show interfere buttons for HOST (may have been hidden)
  const p=G.players[0];
  document.getElementById('btn-aq-garuda').style.display=(pendingFusionMain&&p.hand.some(c=>c.id===53)&&p.mp>=4)?'inline-block':'none';
  document.getElementById('btn-aq-woolwyvern').style.display=(p.hand.some(c=>c.id===80)&&p.mp>=4)?'inline-block':'none';
  document.getElementById('btn-aq-phoenix').style.display=(p.shrine.some(c=>c.id===78&&!c._hasRevived)&&p.mp>=2)?'inline-block':'none';
  render();
  if(window.Online?.isOnline&&Online.isHost){Online.broadcastState();_startAQTimer(20000);}
}

// Called during the player's AQ window — AI decides whether to use an interfere mystic
function _maybeAIInterfere(){
  if(!pendingCb)return; // AQ already closed
  if(window.Online?.isOnline)return; // online: GUEST uses separate pathway
  if(G.currentPlayer!==0)return; // only during player's turn
  const ai=G.players[1], player=G.players[0];

  function _spendInterfere(mc,mi,aqDesc,execCb){
    ai.mp-=mc.mc; ai.mysticHand.splice(mi,1); (ai.mysticGrave=ai.mysticGrave||[]).push(mc); broadcastSound('Spell');
    _nextChainCard=mc;
    showActionQueue(`🤖 [Interfere] ${aqDesc}`,()=>{
      execCb();
      checkLose();render();
    });
  }
  function _attachPSInterfere(mc,mi,targetFC,atB,dfB,spB,flags,desc){
    if(_aiMysticBlocked(targetFC)){log(`${targetFC.card.name} [Ability]: ยกเลิก Mystic!`,'');return;}
    const expires=mc.turns===999?Infinity:subTurnNum+(mc.turns*2);
    _spendInterfere(mc,mi,`${mc.name} → ${targetFC.card.name}${desc?' ('+desc+')':''}`,()=>{
      if(mc.turns!==0){
        targetFC.mystics=(targetFC.mystics||[]);
        targetFC.mystics.push({mystic:mc,atBonus:atB,dfBonus:dfB,spBonus:spB,...(flags||{}),expiresBeforeSubTurn:expires});
        if(flags&&flags.curseType){
          targetFC.curses=(targetFC.curses||[]);
          targetFC.curses.push({type:flags.curseType,expiresAtSubTurn:Infinity,fromPS:mc.id});
          playSound(flags.curseType==='stone'?'Stone':'Skill');
        }
      }
      log(`AI [Interfere]: ${mc.name} → ${targetFC.card.name}!`,'bad');
    });
  }

  for(let mi=0;mi<ai.mysticHand.length;mi++){
    const mc=ai.mysticHand[mi];
    if(!mc.interfere||ai.mp<mc.mc)continue;
    const id=mc.id;

    // id:30 Houdini — stone-curse player's strongest unexhausted AtLine seal (best during battle)
    if(id===30&&phase==='battle'){
      const tgts=[...player.atLine].filter(fc=>!fc.exhausted&&canAttachMystic(mc,fc)&&!fc.curses?.some(c=>c.type==='stone')&&!_aiMysticBlocked(fc)&&fc.card.id!==20);
      if(tgts.length){const t=tgts.sort((a,b)=>getEffectiveAt(b)-getEffectiveAt(a))[0];_attachPSInterfere(mc,mi,t,0,0,0,{curseType:'stone'},'Stone Curse');return;}
    }

    // id:32 Yin — weaken player's strongest unexhausted AtLine seal during battle
    if(id===32&&phase==='battle'){
      const tgts=[...player.atLine].filter(fc=>!fc.exhausted&&canAttachMystic(mc,fc)&&!fc.curses?.some(c=>c.type==='stone')&&!_aiMysticBlocked(fc));
      if(tgts.length){const t=tgts.sort((a,b)=>getEffectiveAt(b)-getEffectiveAt(a))[0];_attachPSInterfere(mc,mi,t,-t.card.lv,0,0,{},`-At${t.card.lv}`);return;}
    }

    // id:37 Thunder Bolt — unfuse player's fused seal (any phase)
    if(id===37){
      const t=[...player.atLine,...player.dfLine].find(fc=>fc.fused&&canAttachMystic(mc,fc)&&!_aiMysticBlocked(fc));
      if(t){
        const _mc=mc,_mi=mi;
        ai.mp-=_mc.mc;ai.mysticHand.splice(_mi,1);broadcastSound('Spell');
        _pendingMysticCard=_mc;
        _nextChainCard=_mc;
        showActionQueue(`🤖 [Interfere] ${_mc.name} → แยกรวมร่าง ${t.card.name}`,()=>{
          _pendingMysticCard=null;
          const owner=findFCOwner(t);
          if(owner){const mainLine=owner.p.atLine.some(x=>x.uid===t.uid)?'atLine':'dfLine';t.fusionStack.forEach(m=>{owner.p[mainLine].push(m);});}
          t.fusionStack=[];t.fusionAtks=[];t.fused=false;t.fusedSinceTurn=null;t.wasMainFusedTurn=turnNum;
          log(`AI [Interfere]: ${_mc.name} → ${t.card.name} แยกรวมร่าง!`,'bad');
          checkLose();render();
        });
        return;
      }
    }

    // id:17 Holy Prayer — cure own curse (any phase); else destroy player PS mystic
    if(id===17){
      const cursed=[...ai.atLine,...ai.dfLine].find(fc=>fc.curses?.length>0);
      if(cursed){
        _spendInterfere(mc,mi,`Holy Prayer → รักษา ${cursed.card.name}`,()=>{
          cursed.curses=[];log(`AI [Interfere]: Holy Prayer → รักษา ${cursed.card.name}!`,'bad');
        });
        return;
      }
      const psT=[...player.atLine,...player.dfLine].filter(fc=>getActiveMystics(fc).length&&!hasMysticProtect(fc));
      if(psT.length){
        const t=psT[0],m0=getActiveMystics(t)[0];
        _spendInterfere(mc,mi,`Holy Prayer → ทำลาย ${m0.mystic.name}`,()=>{
          _mysticSplice(t,m0);
          log(`AI [Interfere]: Holy Prayer → ทำลาย ${m0.mystic.name}!`,'bad');
        });
        return;
      }
    }

    // id:26 Inquisition — destroy player's PS mystic (any phase)
    if(id===26){
      const psT=[...player.atLine,...player.dfLine].filter(fc=>getActiveMystics(fc).length&&!hasMysticProtect(fc));
      if(psT.length){
        const t=psT[0],m0=getActiveMystics(t)[0];
        _spendInterfere(mc,mi,`Inquisition → ทำลาย ${m0.mystic.name}`,()=>{
          _mysticSplice(t,m0);
          log(`AI [Interfere]: Inquisition → ทำลาย ${m0.mystic.name}!`,'bad');
        });
        return;
      }
    }
    // id:27 Lighthouse — skip
  }
}

function showActionQueue(desc, onProceed, fusionMainFC=null, previewCard=null, previewAction=''){
  if(pendingCb){
    // Queue this effect on the interfere stack (LIFO) instead of resolving immediately.
    // Card cost was already paid before showActionQueue() was called.
    _interfereStack.push({desc, cb: onProceed});
    if(_nextChainCard){_chainDisplay.push({img:_nextChainCard.img||null,name:_nextChainCard.name});_nextChainCard=null;_chainCollapsed=false;_updateChainDisplay();}
    _enterChainMode(desc);
    return;
  }
  // Fresh AQ — start a new chain (expanded by default)
  _chainDisplay=[];
  _chainCollapsed=false;
  if(_nextChainCard){_chainDisplay.push({img:_nextChainCard.img||null,name:_nextChainCard.name});}
  _nextChainCard=null;
  _updateChainDisplay();
  pendingCb=onProceed;
  _aqPassBits=0;
  _aqChainMode=false;
  _interfereStack=[];
  pendingFusionMain=fusionMainFC;
  if(previewCard){_aqPreviewCard=previewCard;updateAIPreview(previewCard,previewAction);}
  document.getElementById('aq-desc').innerHTML=desc;
  document.getElementById('action-queue').style.display='flex';
  const p=G.players[0];
  // Gale Garuda: only during AI fusion
  const canGaruda=fusionMainFC&&p.hand.some(c=>c.id===53)&&p.mp>=4;
  document.getElementById('btn-aq-garuda').style.display=canGaruda?'inline-block':'none';
  // Wool Wyvern: any action queue window
  const canWyvern=p.hand.some(c=>c.id===80)&&p.mp>=4;
  document.getElementById('btn-aq-woolwyvern').style.display=canWyvern?'inline-block':'none';
  // Phoenix: in shrine, any action queue window (one revival per card per game)
  const canPhoenix=p.shrine.some(c=>c.id===78&&!c._hasRevived)&&p.mp>=2;
  document.getElementById('btn-aq-phoenix').style.display=canPhoenix?'inline-block':'none';
  // Online: when host acted (G.currentPlayer===0), host waits — guest is defender
  const _aqWait=document.getElementById('aq-waiting');
  const _btnP=document.getElementById('btn-proceed');
  if(window.Online?.isOnline&&Online.isHost&&G.currentPlayer===0){
    if(_btnP)_btnP.style.display='none';
    if(_aqWait)_aqWait.style.display='inline-block';
    ['btn-aq-garuda','btn-aq-woolwyvern','btn-aq-phoenix'].forEach(id=>{document.getElementById(id).style.display='none';});
  }else{
    if(_btnP)_btnP.style.display='inline-block';
    if(_aqWait)_aqWait.style.display='none';
  }
  render(); // re-render so interfere mystics get canPlay=true
  if(window.Online?.isOnline&&Online.isHost){
    Online.broadcastState();
    _startAQTimer(20000); // 10-second interfere window for both sides
  }
  // Offline: give AI a chance to use interfere cards during player's action queue
  if(!window.Online?.isOnline&&G.currentPlayer===0){
    setTimeout(_maybeAIInterfere,700);
  }
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
  document.getElementById('btn-aq-woolwyvern').style.display='none';
  showLineChoicePicker('Wool Wyvern',line=>{
    const hi=p.hand.indexOf(wyvern);p.hand.splice(hi,1);
    p.mp-=4;
    const wyvernFC=makeFieldCard(wyvern,false);
    wyvernFC.deployedTurn=turnNum;
    p[line==='at'?'atLine':'dfLine'].push(wyvernFC);
    log(`Wool Wyvern [Interfere]: ลงสนาม (${line==='at'?'At':'Df'} Line)!`,'good');
    checkLose();render();
    _enterChainMode('Wool Wyvern');
    if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  });
}

function executePhoenixInterfere(){
  const p=G.players[0];
  const phoenix=p.shrine.find(c=>c.id===78&&!c._hasRevived);
  if(!phoenix||p.mp<2){return;}
  p.mp-=2;
  phoenix._hasRevived=true;
  const si=p.shrine.indexOf(phoenix);
  if(si>=0)p.shrine.splice(si,1);
  const phoenixFC=makeFieldCard(phoenix,false);
  phoenixFC.deployedTurn=turnNum;
  p.atLine.push(phoenixFC);
  document.getElementById('btn-aq-phoenix').style.display='none';
  log('Phoenix [Interfere]: ฟื้นคืนชีพจาก Shrine!','good');
  checkLose();render();
  _enterChainMode('Phoenix');
}

function proceedAction(){
  _stopAQTimer();
  const _isGuestAct=!!(window.Online?.isOnline&&Online.isHost&&G.currentPlayer===1);
  if(!_isGuestAct){_aqPreviewCard=null;updateAIPreview(null);}

  // GUEST side: send proceed signal, keep AQ open in chain mode
  if(window.Online?.isOnline&&!Online.isHost){
    Online.sendGuestAction({action:'proceed'});
    if(_aqChainMode){
      // Keep AQ visible — wait for HOST to confirm both passed
      const bp=document.getElementById('btn-proceed');
      const aw=document.getElementById('aq-waiting');
      if(bp)bp.style.display='none';
      if(aw)aw.style.display='inline-block';
    } else {
      document.getElementById('action-queue').style.display='none';
      pendingCb=null;
    }
    return;
  }

  // HOST in chain mode: require bilateral pass
  if(window.Online?.isOnline&&Online.isHost&&_aqChainMode){
    _aqPassBits|=0b01;
    if(!(_aqPassBits&0b10)){
      // GUEST hasn't passed yet
      const bp=document.getElementById('btn-proceed');
      const aw=document.getElementById('aq-waiting');
      if(bp)bp.style.display='none';
      if(aw)aw.style.display='inline-block';
      Online.broadcastState();
      return;
    }
    // Both passed — fall through to resolve
    _aqChainMode=false;
    _aqPassBits=0;
  }

  // LIFO: pop and execute the top queued interfere effect before resolving original action
  if(_interfereStack.length > 0){
    const item=_interfereStack.pop();
    item.cb();
    if(pendingCb){
      _enterChainMode(item.desc+' ✓');
    } else if(_interfereStack.length===0){
      // pendingCb was cancelled inside cb() and stack is now empty — close AQ immediately
      document.getElementById('action-queue').style.display='none';
      const _bp=document.getElementById('btn-proceed');if(_bp)_bp.style.display='inline-block';
      const _aw=document.getElementById('aq-waiting');if(_aw)_aw.style.display='none';
      _aqChainMode=false;_aqPassBits=0;
      _chainDisplay=[];_chainCollapsed=false;_nextChainCard=null;_updateChainDisplay();
    }
    if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
    return;
  }

  // Stack empty — execute original action
  document.getElementById('action-queue').style.display='none';
  const _bp=document.getElementById('btn-proceed');if(_bp)_bp.style.display='inline-block';
  const _aw=document.getElementById('aq-waiting');if(_aw)_aw.style.display='none';
  const cb=pendingCb;
  pendingCb=null;
  _pendingMysticCard=null;
  _nextChainCard=null;
  _interfereStack=[];
  _chainDisplay=[];_chainCollapsed=false;_updateChainDisplay();
  if(cb)cb();
  if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
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
  combinedEl.textContent=`มือรวม ${combined}/${getEffectiveCombinedMax(0)} ใบ`;
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

function showDeltaDDrawModal(cb){
  _deltaDDrawCb=cb;
  document.getElementById('deltad-draw-modal').style.display='block';
}

function onDeltaDDrawChoice(type){
  document.getElementById('deltad-draw-modal').style.display='none';
  if(_deltaDDrawCb){const cb=_deltaDDrawCb;_deltaDDrawCb=null;cb(type);}
}

function doDrawChoice(type){
  const p=G.players[0];
  if(type==='seal'){
    if(p.deck.length>0){drawCard(0,true,true);log('จั่ว Seal','good');}
    else{log('Seal Deck ว่าง','bad');}
  } else {
    if((p.mysticDeck||[]).length>0){drawMysticCard(0,true,true);log('จั่ว Mystic','good');}
    else{log('Mystic Deck ว่าง','bad');}
  }
  drawsRemaining--;
  render();
  if(drawsRemaining<=0){hideDrawModal();enterDiscardStep();}
  else showDrawModal();
}

function onPlayerDrawDone(){
  turnNum++;
  phase='main';
  log(`Turn ${turnNum} — Your turn | MAIN PHASE`,'hi');
  render();
  if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
}

function enterDiscardStep(){
  const p=G.players[0];
  const combined=p.hand.length+(p.mysticHand||[]).length;
  const sealMax=getEffectiveHandMax(0);
  const combinedMax=getEffectiveCombinedMax(0);
  const overCombined=Math.max(0,combined-combinedMax);
  const overSeal=Math.max(0,p.hand.length-sealMax);
  const excess=Math.max(overCombined,overSeal);
  if(excess>0){
    phase='discard';
    log(`DISCARD STEP — ทิ้งการ์ดให้เหลือ Seal ≤${sealMax} รวม ≤${combinedMax} (เกินมา ${excess} ใบ)`,'bad');
    render();
    if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  } else {
    onPlayerDrawDone();
  }
}

function startPlayerDraw(){
  _noSealAtStart[0]=G.players[0].atLine.length===0&&G.players[0].dfLine.length===0;
  phase='draw';
  drawsRemaining=2;
  render();
  if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  showTurnAnim('yours',()=>showDrawModal());
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
      if((p.mysticHand||[]).length>0){const c=p.mysticHand.pop();(p.mysticGrave=p.mysticGrave||[]).push(c);}
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
    broadcastSound('Draw');
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
  if(inInterfere&&!mysticCard.interfere){logErr(`${mysticCard.name} ไม่มี Interfere — ใช้ไม่ได้ระหว่าง Action Queue`);return;}
  if(!inMainPhase&&!mysticCard.interfere){logErr(`${mysticCard.name} ไม่สามารถใช้ระหว่าง Action Queue`);return;}
  const p=G.players[0];
  if(p.mp<mysticCard.mc){logErr(`Mp ไม่พอ (ต้องการ ${mysticCard.mc}, มี ${p.mp})`);return;}
  if(mysticCard.pasted==='PS'){
    if(mysticPlayMode&&mysticPlayMode.mysticIdx===mysticIdx){mysticPlayMode=null;render();return;}
    mysticPlayMode={mysticCard,mysticIdx};
    log(`${mysticCard.name} [Mystic PS] — คลิก Seal ที่จะติด (คลิกอีกครั้งเพื่อยกเลิก)`,'hi');
    render();
  } else if(mysticCard.pasted==='PA'){
    showMysticPicker(mysticCard.name,[{label:'▶ เล่น',data:'play'},{label:'👁 View Card',data:'view'}],choice=>{
      if(choice==='view'){openMysticViewer(mysticCard);return;}
      playPAMystic(mysticCard,mysticIdx);
    });
  } else {
    showMysticPicker(mysticCard.name,[{label:'▶ เล่น',data:'play'},{label:'👁 View Card',data:'view'}],choice=>{
      if(choice==='view'){openMysticViewer(mysticCard);return;}
      playNonPMystic(mysticCard,mysticIdx);
    });
  }
}

function _mwBenefitsFromEl(fc,el){
  // Check fusion attack conditions (dynamic from card DB)
  if((fc.card.fuse||[]).some(f=>(f.reqs||[]).includes(el)))return true;
  // Check skill conditions (cards with fusedWith[element] in skills.js)
  const skillMap={darkness:[6,12,28,44,58],water:[48,84],wind:[94],light:[54,65],earth:[48]};
  return(skillMap[el]||[]).includes(fc.card.id);
}

function attachPSMystic(mysticCard,mysticIdx,targetFC){
  updateAIPreview(mysticCard,'🃏 Mystic');
  const p=G.players[0];
  mysticPlayMode=null;
  if(!canAttachMystic(mysticCard,targetFC)){
    logErr(`ไม่สามารถติด ${mysticCard.name} กับ ${targetFC.card.name} ได้`);
    render();return;
  }
  // Gregory the Bishop (67): while in At Line, own seals cannot receive mystics
  const targetOwner=findFCOwner(targetFC);
  if(targetOwner&&G.players[targetOwner.pi].atLine.some(x=>x.card.id===67)){
    log(`Gregory the Bishop [Ability]: ยกเลิก Mystic — Seal ฝ่าย${G.players[targetOwner.pi].name} รับ Mystic ไม่ได้ขณะอยู่ใน At Line`,'bad');
    render();return;
  }
  // Heaven Knight (82): blocks only ENEMY mystics (own player can still attach to own HK)
  if(targetFC.card.id===82&&targetOwner?.pi!==0){
    log(`Heaven Knight [Ability]: ยกเลิก Mystic ฝ่ายตรงข้าม!`,'bad');
    render();return;
  }
  // Delta-D (22): cancels all Mystic Cards
  if(targetFC.card.id===22){
    log(`Delta-D [Ability]: ยกเลิก Mystic!`,'bad');
    render();return;
  }
  // Silent Prohibitor: target is protected from mystics
  if(hasMysticProtect(targetFC)){
    log(`${targetFC.card.name} ถูกป้องกันด้วย Silent Prohibitor — ติด Mystic ไม่ได้!`,'bad');
    render();return;
  }
  _pendingMysticCard=mysticCard;
  _nextChainCard=mysticCard;
  const id=mysticCard.id;
  const fc=targetFC;

  let _spd=false;
  function spend(){if(_spd)return;_spd=true;p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);broadcastSound('Spell');}
  function _mwDestroy(el){log(`Magical World: ${fc.card.name} ไม่มีเงื่อนไขธาตุ ${el} — Magical World ถูกทำลาย!`,'bad');checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();}
  function doAttach(atBonus=0,dfBonus=0,spBonus=0,flags={}){
    const expires=mysticCard.turns===999?Infinity:subTurnNum+(mysticCard.turns*2);
    if(mysticCard.turns!==0){
      fc.mystics=(fc.mystics||[]);
      fc.mystics.push({mystic:mysticCard,atBonus,dfBonus,spBonus,...flags,expiresBeforeSubTurn:expires,casterPi:G.players.indexOf(p)});
      // PS curse: apply curse tied to this PS (no own timer — lasts until PS expires/falls)
      if(flags.curseType){
        fc.curses=(fc.curses||[]);
        fc.curses.push({type:flags.curseType,expiresAtSubTurn:Infinity,fromPS:mysticCard.id});
        playSound(flags.curseType==='stone'?'Stone':flags.curseType==='freeze'?'Freeze':flags.curseType==='poison'?'Poison':flags.curseType==='charm'?'Charm':'Skill');
      }
    } else {
      (p.mysticGrave=p.mysticGrave||[]).push(mysticCard);
    }
    log(`${mysticCard.name} [Mystic] ติดกับ ${fc.card.name}!`,'good');
    checkLose();render();
    if(pendingCb)_enterChainMode(mysticCard.name);
    else if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
  }

  // ── Thunder Bolt (37): instant, split fusion ──
  if(id===37){
    if(!fc.fused||!fc.fusionStack?.length){log(`${fc.card.name} ไม่ได้รวมร่าง`,'bad');render();return;}
    spend();(p.mysticGrave=p.mysticGrave||[]).push(mysticCard);
    showActionQueue(`${mysticCard.name} → แยกการรวมร่าง ${fc.card.name}`,()=>{
      const owner=findFCOwner(fc);
      if(owner){
        const mainLine=owner.p.atLine.some(x=>x.uid===fc.uid)?'atLine':'dfLine';
        fc.fusionStack.forEach(m=>{owner.p[mainLine].push(m);});
      }
      fc.fusionStack=[];fc.fusionAtks=[];fc.fused=false;fc.fusedSinceTurn=null;fc.wasMainFusedTurn=turnNum;
      log(`${mysticCard.name}: ${fc.card.name} แยกการรวมร่าง!`,'good');
      checkLose();render();
    });
    return;
  }

  // ── Will of True Mind (68): instant, grant willMind flag ──
  if(id===68){
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ใช้ท่า/Skill โดยไม่ต้องรวมร่าง 1 ครั้ง`,()=>{
      fc.willMind=true;
      (fc.mystics=fc.mystics||[]).push({mystic:mysticCard,atBonus:0,dfBonus:0,spBonus:0,willMind:true,expiresBeforeSubTurn:subTurnNum+1});
      log(`${mysticCard.name}: ${fc.card.name} willMind ON!`,'good');
      checkLose();render();
      if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
    });
    return;
  }

  // ── Houdini (30): PS Stone Curse — lasts while PS attached (1 turn) ──
  if(id===30){
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ติด Stone Curse ตราบที่ Houdini ยังติดอยู่`,()=>doAttach(0,0,0,{curseType:'stone'}));
    return;
  }

  // ── Cupid and Psyche (69): PS Charm Curse — lasts while PS attached ──
  if(id===69){
    const owner=findFCOwner(fc);
    const fromLine=owner&&owner.p.atLine.includes(fc)?'atLine':'dfLine';
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ติด Charm Curse ตราบที่ PS ยังติดอยู่`,()=>{
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
    const apply=d=>{spend();showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d.at||0,0,d.sp||0));};
    if(opts.length===1)apply(opts[0].data);
    else showMysticPicker(mysticCard.name,opts,d=>apply(d));
    return;
  }
  if(id===19){ // Crescent
    const opts=[];
    if(fc.card.el==='darkness')opts.push({label:'[Dark] At +2',data:{at:2}});
    if(fc.card.el==='water')opts.push({label:'[Water] At +1, Ma -1',data:{at:1,maRed:1}});
    if(!opts.length){log(`${fc.card.name} ไม่ตรงเงื่อนไข Crescent`,'bad');render();return;}
    const apply=d=>{spend();showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d.at||0,0,0,{maReduction:d.maRed||0}));};
    if(opts.length===1)apply(opts[0].data);
    else showMysticPicker(mysticCard.name,opts,d=>apply(d));
    return;
  }
  if(id===21){ // Holy Sun
    const el=getEffectiveEl(fc);
    if(el==='light'||el==='fire'||el==='divine'||fc.card.tribe==='Divine'){spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} At +2`,()=>doAttach(2));}
    else{log(`${fc.card.name} ไม่ตรงเงื่อนไข Holy Sun (ธาตุ: ${el})`,'bad');render();}
    return;
  }
  if(id===24){ // Werrian Wesley
    const opts=[];
    if(fc.card.tribe==='Mage')opts.push({label:'[Mage] At +2',data:{at:2}});
    if(fc.card.el==='earth')opts.push({label:'[Earth] At +2 Df +1',data:{at:2,df:1}});
    if(!opts.length){log(`${fc.card.name} ไม่ตรงเงื่อนไข Werrian Wesley`,'bad');render();return;}
    const apply=d=>{spend();showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach(d.at||0,d.df||0));};
    if(opts.length===1)apply(opts[0].data);
    else showMysticPicker(mysticCard.name,opts,d=>apply(d));
    return;
  }
  if(id===25){ // Beauty & the Beast
    const t=fc.card.tribe;
    const atB=(t==='Monster'||t==='Beast')?2:t==='Dragon'?1:0;
    if(!atB){log(`${fc.card.name} ไม่ตรงเงื่อนไข Beauty & the Beast`,'bad');render();return;}
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} At +${atB}`,()=>doAttach(atB));
    return;
  }
  if(id===29){ // Release from Hell
    if(fc.card.tribe!=='Evil'){log(`${fc.card.name} ต้องเป็น [Evil]`,'bad');render();return;}
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} At+2 Df+1 Sp+1`,()=>doAttach(2,1,1));
    return;
  }
  if(id===31){ // Yang: -Df×Lv (1 turn)
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} Df-${fc.card.lv} (1 Turn)`,()=>doAttach(0,-fc.card.lv));
    return;
  }
  if(id===32){ // Yin: -At×Lv (1 turn)
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} At-${fc.card.lv} (1 Turn)`,()=>doAttach(-fc.card.lv));
    return;
  }
  if(id===33){ // Magical World: seal acts as fused with chosen element; destroyed if seal has no condition for it
    const elements=['fire','water','earth','wind','light','darkness'];
    showMysticPicker(`Magical World — เลือกธาตุสำหรับ ${fc.card.name}`,
      elements.map(el=>({label:el,data:el})),
      el=>{spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ธาตุ ${el}`,()=>{
        if(!_mwBenefitsFromEl(fc,el)){_mwDestroy(el);return;}
        fc.magicalEl=el;
        if(fc.fused)fc.fusionAtks=getUnlockedAtks(fc);
        doAttach(0,0,0,{elFusion:el});
      });});
    return;
  }
  if(id===36){ // Silent Prohibitor: protection 1 turn
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ป้องกัน 1 Turn`,()=>doAttach(0,0,0,{protects:true}));
    return;
  }
  if(id===38){ // Whirl to Win: swap At/Df using effective (not base) stats so fused cards work correctly
    const effAt=getEffectiveAt(fc), effDf=getEffectiveDf(fc);
    const atB=effDf-effAt, dfB=effAt-effDf;
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} สลับ At↔Df (1 Turn)`,()=>doAttach(atB,dfB,0,{swapAtDf:true}));
    return;
  }
  if(id===39){ // Chaotic World: change element permanently
    const elements=['fire','water','earth','wind','light','darkness'].filter(e=>e!==fc.card.el);
    showMysticPicker(`Chaotic World — เปลี่ยนธาตุ ${fc.card.name} เป็น?`,
      elements.map(el=>({label:el,data:el})),
      el=>{spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} ธาตุเป็น ${el}`,()=>{
        doAttach();
        fc.card={...fc.card,el};
      });});
    return;
  }
  if(id===61){ // Seven Silver: double attack 1 turn
    spend();showActionQueue(`${mysticCard.name} → ${fc.card.name} โจมตีได้ 2 ครั้ง (1 Turn)`,()=>doAttach(0,0,0,{doubleAtk:true}));
    return;
  }

  // Default: just attach (no computed bonus)
  spend();showActionQueue(`${mysticCard.name} → ${fc.card.name}`,()=>doAttach());
}

function playNonPMystic(mysticCard,mysticIdx){
  updateAIPreview(mysticCard,'🃏 Mystic');
  const p=G.players[0];
  const id=mysticCard.id;
  _nextChainCard=mysticCard;
  let _spd=false;function spend(){if(_spd)return;_spd=true;p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);(p.mysticGrave=p.mysticGrave||[]).push(mysticCard);broadcastSound('Spell');}
  const allField=()=>[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];

  if(id===17){ // Holy Prayer — pick target first, THEN enter interfere chain
    const inInterfere=!!pendingCb;
    const ownSeals=[...G.players[0].atLine,...G.players[0].dfLine];
    const cursed=allField().filter(fc=>fc.curses?.length);
    const cureTargets=inInterfere?ownSeals:cursed; // interfere: any own seal (pre-cure incoming curse)
    const withPS=allField().filter(fc=>getActiveMystics(fc).length&&!hasMysticProtect(fc));
    const _aqDescNow=document.getElementById('aq-desc')?.textContent||'';
    const pendingPSItem=(_pendingMysticCard?.pasted==='PS')&&pendingCb&&_aqDescNow?[{label:`[ยกเลิก] ${_aqDescNow}`,data:{_cancelPending:true,desc:_aqDescNow}}]:[];
    const modeOpts=[];
    if(cureTargets.length)modeOpts.push({label:'รักษา Curse ทุกชนิดให้ Seal 1 ใบ',data:'cure'});
    if(withPS.length||pendingPSItem.length)modeOpts.push({label:'ทำลาย [PS] Mystic Card 1 ใบในสนาม',data:'destroy'});
    if(!modeOpts.length){log('Holy Prayer: ไม่มีเป้าหมายที่ใช้ได้','bad');return;}
    showMysticPicker('Holy Prayer — เลือก',modeOpts,mode=>{
      if(mode==='cure'){
        log('Holy Prayer: คลิก Seal ที่ต้องการรักษา (คลิกขวาเพื่อยกเลิก)','hi');
        holyPrayerCureMode={targets:cureTargets,onSelect:(tfc)=>{
          holyPrayerCureMode=null;
          spend();
          const _prePi=findFCOwner(tfc)?.pi??0;
          const _wasAtLine=G.players[_prePi].atLine.some(x=>x.uid===tfc.uid);
          const _hpDesc=`Holy Prayer → รักษา ${tfc.card.name}`;
          const _hpCb=()=>{
            const _hadFreeze=(tfc.curses||[]).some(c=>c.type==='freeze');
            tfc.curses=[];
            if(_hadFreeze&&_wasAtLine){
              const _cpi=findFCOwner(tfc)?.pi??0;const _cp=G.players[_cpi];
              const _di=_cp.dfLine.findIndex(x=>x.uid===tfc.uid);
              if(_di>=0){_cp.dfLine.splice(_di,1);_cp.atLine.push(tfc);}
            }
            log(`Holy Prayer: รักษา Curse ${tfc.card.name}!`,'good');checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
          };
          if(inInterfere){
            if(_interfereStack.length>0){_interfereStack.unshift({desc:_hpDesc,cb:_hpCb});}
            else{const _origCb=pendingCb;pendingCb=()=>{_origCb();_hpCb();};}
            _enterChainMode(_hpDesc);
          } else {
            showActionQueue(_hpDesc,_hpCb);
          }
        }};
        render();
      } else {
        const sealOpts=withPS.map(fc=>({label:`${fc.card.name} [${getActiveMystics(fc).map(m=>m.mystic.name).join(',')}]`,data:fc}));
        showMysticPicker('Holy Prayer — เลือก PS Mystic',[...sealOpts,...pendingPSItem],tfc=>{
          if(tfc._cancelPending){
            spend();_stopAQTimer();_nextChainCard=mysticCard;
            const inStack=_interfereStack.length>0&&_pendingMysticCard?.pasted==='PS';
            showActionQueue(`Holy Prayer → ยกเลิก: ${tfc.desc}`,()=>{
              if(inStack){_interfereStack.pop();}else{pendingCb=null;}
              _pendingMysticCard=null;
              log(`Holy Prayer: ยกเลิก Effect!`,'good');checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
            });
            return;
          }
          const actMys=getActiveMystics(tfc);
          showMysticPicker('เลือก Mystic ที่จะทำลาย',actMys.map((m,i)=>({label:m.mystic.name,data:i})),mIdx=>{
            spend();
            showActionQueue(`Holy Prayer → ทำลาย ${actMys[mIdx].mystic.name}`,()=>{
              const _m=actMys[mIdx];_mysticSplice(tfc,_m);
              log(`Holy Prayer: ทำลาย Mystic!`,'good');checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
            });
          });
        });
      }
    });
    return;
  }

  if(id===26){ // Inquisition — destroy any mystic (PS on seal OR PA area) or cancel a queued/pending interfere effect
    const psTargets=allField().filter(fc=>getActiveMystics(fc).length);
    const paTargets=[];
    [0,1].forEach(pi=>{(G.players[pi].areaMystics||[]).forEach((am,i)=>{paTargets.push({pi,amIdx:i,am});});});
    const stackItems=_interfereStack.map((item,i)=>({label:`[Queued] ${item.desc}`,data:{type:'stack',stackIdx:i}}));
    const aqDesc=document.getElementById('aq-desc')?.textContent||'';
    const pendingItem=pendingCb&&aqDesc&&!_aqChainMode?[{label:`[ยกเลิก] ${aqDesc}`,data:{type:'pending',desc:aqDesc}}]:[];
    if(!psTargets.length&&!paTargets.length&&!stackItems.length&&!pendingItem.length){log('ไม่มี Mystic ในสนาม','bad');return;}
    const opts=[
      ...psTargets.map(fc=>({label:`[PS] ${fc.card.name}: ${getActiveMystics(fc).map(m=>m.mystic.name).join(',')}`,data:{type:'ps',fc}})),
      ...paTargets.map(({pi,amIdx,am})=>({label:`[PA] ${am.mystic.name} (${G.players[pi].name})`,data:{type:'pa',pi,amIdx}})),
      ...stackItems,
      ...pendingItem
    ];
    showMysticPicker('Inquisition — เลือก Mystic',opts,choice=>{
      if(choice.type==='pending'){
        spend();_stopAQTimer();
        _nextChainCard=mysticCard;
        showActionQueue(`Inquisition → ยกเลิก: ${choice.desc}`,()=>{
          pendingCb=null; // cancel the original queued effect when Inquisition resolves
          log(`Inquisition: ยกเลิก Effect!`,'good');checkLose();render();
          if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
        });
      } else if(choice.type==='stack'){
        const idx=choice.stackIdx;const targetItem=_interfereStack[idx];if(!targetItem)return;
        spend();
        showActionQueue(`Inquisition → ยกเลิก: ${targetItem.desc}`,()=>{
          _interfereStack.splice(idx,1);
          log(`Inquisition: ยกเลิก Effect!`,'good');checkLose();render();
        });
      } else if(choice.type==='pa'){
        spend();
        showActionQueue(`Inquisition → ทำลาย [PA] ${G.players[choice.pi].areaMystics[choice.amIdx].mystic.name}`,()=>{
          const _am=G.players[choice.pi].areaMystics.splice(choice.amIdx,1)[0];
          if(_am)(G.players[choice.pi].mysticGrave=G.players[choice.pi].mysticGrave||[]).push(_am.mystic);
          log(`Inquisition: ทำลาย PA Mystic!`,'good');checkLose();render();
        });
      } else {
        const actMys=getActiveMystics(choice.fc);
        if(actMys.length===1){
          spend();
          showActionQueue(`Inquisition → ทำลาย ${actMys[0].mystic.name}`,()=>{
            const _m0=actMys[0];_mysticSplice(choice.fc,_m0);
            log(`Inquisition: ทำลาย Mystic!`,'good');checkLose();render();
          });
        } else {
          showMysticPicker('เลือก Mystic ที่จะทำลาย',actMys.map((m,i)=>({label:m.mystic.name,data:i})),mIdx=>{
            spend();
            showActionQueue(`Inquisition → ทำลาย ${actMys[mIdx].mystic.name}`,()=>{
              const _mN=actMys[mIdx];_mysticSplice(choice.fc,_mN);
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
      const lhLabel=choice==='hand'?'เปิดดูมือฝ่ายตรงข้าม':'เปิดดูใบบนสุดกอง';
      showActionQueue(`Lighthouse → ${lhLabel}`,()=>{
        if(choice==='hand'){
          const opp=G.players[1];
          showRevealModal('🔍 Lighthouse: มือฝั่งตรงข้าม',[...opp.hand,...(opp.mysticHand||[])]);
        } else {
          const topSeal=p.deck.slice(0,1);
          const topMystic=(p.mysticDeck||[]).slice(0,1);
          showRevealModal('🔍 Lighthouse: ใบบนสุดของกองเรา',[...topSeal,...topMystic]);
        }
        render();
        if(window.Online?.isOnline&&Online.isHost) Online.broadcastState();
      });
    });
    return;
  }

  if(id===40){ // Benediction
    const valid=p.shrine.filter(c=>!(mysticCard.exception_tribes||[]).includes(c.tribe));
    if(!valid.length){log('ไม่มี Seal ที่เหมาะสมใน Shrine','bad');return;}
    spend();
    showActionQueue(`Benediction`,()=>{
      showMysticPicker('Benediction — เลือก Seal',valid.map(c=>({label:`${c.name} (${c.tribe} Lv${c.lv})`,data:c})),c=>{
        const i=p.shrine.indexOf(c);
        if(i>=0&&p.hand.length<HAND_MAX){p.shrine.splice(i,1);p.hand.push(c);log(`Benediction: ${c.name} ขึ้นมือ!`,'good');}
        else log('มือเต็ม!','bad');
        checkLose();render();if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
      });
    });
    return;
  }

  if(id===66){ // Sacrifice
    if(p.hand.length<2){log('ต้องมี Seal ในมือ 2 ใบขึ้นไปจึงจะใช้ Sacrifice ได้','bad');return;}
    const validSeals=allField().filter(fc=>!(mysticCard.exception_tribes||[]).includes(fc.card.tribe));
    if(!validSeals.length){log('ไม่มี Seal ที่สามารถทำลายได้','bad');return;}
    spend();
    showActionQueue(`Sacrifice`,()=>{
      showMysticPicker('Sacrifice — เลือก Seal เป้าหมาย',validSeals.map(fc=>({label:`${fc.card.name} (${fc.card.tribe} Lv${fc.card.lv})`,data:fc})),targetFC=>{
        showMysticPicker('Sacrifice — เลือก Seal ที่จะทิ้ง (1/2)',p.hand.map(c=>({label:`${c.name} (${c.tribe} Lv${c.lv})`,data:c})),c1=>{
          const rest=p.hand.filter(c=>c!==c1);
          showMysticPicker('Sacrifice — เลือก Seal ที่จะทิ้ง (2/2)',rest.map(c=>({label:`${c.name} (${c.tribe} Lv${c.lv})`,data:c})),c2=>{
            const owner=findFCOwner(targetFC);
            if(owner){destroyByEffect(targetFC,owner.pi);}
            [c1,c2].forEach(c=>{const i=p.hand.indexOf(c);if(i>=0){p.hand.splice(i,1);p.shrine.push(c);broadcastSound('Flip');}});
            log(`Sacrifice: ทำลาย ${targetFC.card.name}! ทิ้ง ${c1.name}, ${c2.name}!`,'bad');
            checkLose();render();_bcPA();
          });
        });
      });
    });
    return;
  }

  // Fallback
  spend();showActionQueue(`${mysticCard.name}`,()=>{log(`${mysticCard.name} ใช้แล้ว`,'');render();});
}

function playPAMystic(mysticCard,mysticIdx){
  updateAIPreview(mysticCard,'🃏 Mystic');
  const p=G.players[0];
  const id=mysticCard.id;
  _nextChainCard=mysticCard;
  function spend(){p.mp-=mysticCard.mc;p.mysticHand.splice(mysticIdx,1);broadcastSound('Spell');}
  function addAreaMystic(){
    const expires=mysticCard.turns===999?Infinity:subTurnNum+(mysticCard.turns*2);
    if(!p.areaMystics)p.areaMystics=[];
    p.areaMystics.push({mystic:mysticCard,ownerPi:0,expiresBeforeSubTurn:expires});
  }

  const _bcPA=()=>{if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();};

  if(id===34){ // Cunning Clown: swap enemy non-Machine seals
    const ai=G.players[1];
    spend();(p.mysticGrave=p.mysticGrave||[]).push(mysticCard);log(`Cunning Clown [Host] → สลับ Line Guest (non-Machine)!`,'good');
    showActionQueue(`Cunning Clown → สลับ Line ศัตรู (non-Machine)`,()=>{
      const movers_at=ai.atLine.filter(fc=>fc.card.tribe!=='Machine');
      const movers_df=ai.dfLine.filter(fc=>fc.card.tribe!=='Machine');
      const keep_at=ai.atLine.filter(fc=>fc.card.tribe==='Machine');
      const keep_df=ai.dfLine.filter(fc=>fc.card.tribe==='Machine');
      ai.atLine=[...movers_df,...keep_at];
      ai.dfLine=[...movers_at,...keep_df];
      log(`Cunning Clown: สลับ Line สำเร็จ!`,'good');
      checkLose();render();_bcPA();
    });
    return;
  }
  if(id===35){ // Nebuchadnezzar: hand max +1
    spend();showActionQueue(`Nebuchadnezzar → จำนวนการ์ดในมือ +1`,()=>{
      addAreaMystic();
      log(`Nebuchadnezzar: มือสูงสุด +1!`,'good');checkLose();render();_bcPA();
    });
    return;
  }
  if(id===70){ // Marie Antoinette: Mp max +1, hand -1
    spend();showActionQueue(`Marie Antoinette → Mp สูงสุด +1, มือ -1`,()=>{
      addAreaMystic();
      log(`Marie Antoinette: Mp+1, การ์ดในมือสูงสุด -1!`,'good');checkLose();render();_bcPA();
    });
    return;
  }

  spend();showActionQueue(`${mysticCard.name}`,()=>{addAreaMystic();log(`${mysticCard.name} ใช้แล้ว`,'');render();_bcPA();});
}

function clearPSCurseFromEntry(fc,mEntry){
  if(mEntry.curseType){
    fc.curses=(fc.curses||[]).filter(c=>!(c.type===mEntry.curseType&&c.fromPS===mEntry.mystic.id));
    if(mEntry.curseType==='charm')fc.charmed=null;
  }
}
// Remove one mystic entry from a field card and send it to the seal owner's mysticGrave.
function _mysticSplice(fc,mEntry){
  const i=(fc.mystics||[]).indexOf(mEntry);if(i>=0)fc.mystics.splice(i,1);
  clearPSCurseFromEntry(fc,mEntry);
  if(mEntry.mystic?.id===33)fc.magicalEl=null;
  const casterPi=mEntry.casterPi??findFCOwner(fc)?.pi??0;
  (G.players[casterPi].mysticGrave=G.players[casterPi].mysticGrave||[]).push(mEntry.mystic);
}
// Clear all mystics from a field card and send them to ownerPi's mysticGrave.
function _drainAllMystics(fc,ownerPi){
  if(!fc.mystics?.length)return;
  fc.mystics.forEach(m=>{
    clearPSCurseFromEntry(fc,m);
    if(m.mystic?.id===33)fc.magicalEl=null;
    const _cpi=m.casterPi??ownerPi;
    (G.players[_cpi].mysticGrave=G.players[_cpi].mysticGrave||[]).push(m.mystic);
  });
  fc.mystics=[];
}

// Bounce a FieldCard (Active Seal) back to hand, following the fusion-bounce rule:
// Sub Seals in fusionStack also return to hand; PS Mystics on any of them go to owner's mysticGrave.
// Returns true if main seal went to hand, false if hand was full (sent to shrine instead).
function bounceSealToHand(fc, ownerPi){
  const owner=G.players[ownerPi];
  function drainPS(fieldCard){
    for(const m of (fieldCard.mystics||[])){
      clearPSCurseFromEntry(fieldCard,m);
      if(m.mystic?.id===33)fieldCard.magicalEl=null;
      const _cpi=m.casterPi??ownerPi;
      (G.players[_cpi].mysticGrave=G.players[_cpi].mysticGrave||[]).push(m.mystic);
      log(`${m.mystic.name} [Mystic] ตก Shrine เนื่องจากสูญเสียเป้าหมาย`,'bad');
    }
    fieldCard.mystics=[];
  }
  function toHand(rawCard){
    if(owner.hand.length<getEffectiveHandMax(ownerPi)){
      owner.hand.push(rawCard);
      return true;
    }
    owner.shrine.push(rawCard);
    return false;
  }
  drainPS(fc);
  for(const sub of (fc.fusionStack||[])){
    drainPS(sub);
    const ok=toHand(sub.card);
    log(`${sub.card.name} (Sub Seal) ${ok?'กลับขึ้นมือ':'ลง Shrine (มือเต็ม)'}`,ok?'good':'bad');
  }
  return toHand(fc.card);
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
          const _cpi=m.casterPi??pi;
          (G.players[_cpi].mysticGrave=G.players[_cpi].mysticGrave||[]).push(m.mystic);
          if(m.mystic?.id===33)fc.magicalEl=null;
          if(m.willMind)fc.willMind=false;
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
      expired.forEach(am=>{log(`${am.mystic.name} [Mystic Area] หมดอายุ`,'');(p.mysticGrave=p.mysticGrave||[]).push(am.mystic);});
    }
  });
}

