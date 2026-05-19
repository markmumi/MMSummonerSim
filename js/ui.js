// ══════════════════════════════════════════════
// CANCEL
// ══════════════════════════════════════════════
function cancelAction(){
  attackerSeal=null;pendingAttackIdx=null;pendingDeploy=null;pendingSacrifice=null;
  fusionMode=false;fusionMainFC=null;handTargetMode=false;skillMode=null;handDiscardMode=null;handPickMode=null;mysticPlayMode=null;
  closeAtkPanel();closeDeployModal();closeFAModal();
  render();
}

// ══════════════════════════════════════════════
// PREVIEW PANELS
// ══════════════════════════════════════════════
function fuseReqLabel(f){
  if(f.rt==='el')return f.cnt>1?`${f.cnt}x ${f.req}`:`${f.req}`;
  if(f.rt==='tribe')return f.cnt>1?`${f.cnt}x ${f.req} tribe`:`${f.req} tribe`;
  return f.cnt>1?`${f.cnt}x "${f.req}"`:`"${f.req}"`;
}
function updatePlayerPreview(card,fc=null){
  const el=EL_COLOR[card.el]||'#fff';
  let atksHtml='';
  if(fc?.fused&&fc.fusionAtks.length){
    atksHtml=fc.fusionAtks.map(a=>{const v=[a.at?'At'+a.at:'',a.df?'Df'+a.df:''].filter(Boolean).join('/');return`<div>⚡${a.name}: <span style="color:#fde68a">${v} Mp${a.mp}${a.all?' ALL':''}</span></div>`;}).join('');
  } else {
    atksHtml=(card.fuse||[]).map(f=>`<div style="font-size:9px;color:#9ca3af">+${fuseReqLabel(f)} → ${f.atk.name}</div>`).join('');
  }
  const skillTexts=Array.isArray(card.skill_text)?card.skill_text:(card.skill_text?[card.skill_text]:[]);
  const abilTexts=Array.isArray(card.ability_text)?card.ability_text:(card.ability_text?[card.ability_text]:[]);
  const skillHtml=skillTexts.length
    ?`<div style="border-top:1px solid #374151;padding-top:4px;margin-top:4px;color:#34d399;font-size:8px;line-height:1.4">${skillTexts.map(s=>`<div style="margin-bottom:2px">${s}</div>`).join('')}</div>`:'';
  const abilHtml=abilTexts.length
    ?`<div style="${skillTexts.length?'':'border-top:1px solid #374151;padding-top:4px;margin-top:4px;'}color:#9ca3af;font-size:8px;line-height:1.4">${abilTexts.map(s=>`<div style="margin-bottom:2px">${s}</div>`).join('')}</div>`:'';
  document.getElementById('pp-body').innerHTML=`
    <img src="${card.img}" class="prev-img" onerror="this.style.background='${el}22'">
    <div class="prev-info" style="overflow-y:auto;flex:1;min-height:0">
      <div style="font-weight:bold;color:#f9fafb">${card.name}</div>
      <div style="color:${el}">◆${card.el}</div>
      <div style="color:#9ca3af">${card.tribe} Lv${card.lv}</div>
      <div>At<b ${fc?.fused&&getEffectiveAt(fc)!==card.at?'style="color:#fde68a"':''}>${fc?getEffectiveAt(fc):card.at}</b> Df<b ${fc?.fused&&getEffectiveDf(fc)!==card.df?'style="color:#fde68a"':''}>${fc?getEffectiveDf(fc):card.df}</b> Sp<b ${fc?.fused&&getEffectiveSp(fc)!==card.sp?'style="color:#fde68a"':''}>${fc?getEffectiveSp(fc):card.sp}</b></div>
      <div><span style="color:#38bdf8">ลง${card.mc}</span> <span style="color:#fbbf24">ตี${card.ma||1}</span></div>
      ${fc?.fused?'<div style="color:#fde68a">⚡ Fused</div>':''}
      <div style="margin-top:3px;border-top:1px solid #374151;padding-top:3px">${atksHtml}</div>
      ${fc?.fusionStack?.length?'<div style="color:#a78bfa;font-size:8px;margin-top:3px">🔗 '+fc.fusionStack.map(m=>m.card.name).join(', ')+'</div>':''}
      ${skillHtml}${abilHtml}
    </div>`;
}

function updateAIPreview(card,action=''){
  if(!card){document.getElementById('ai-prev-body').innerHTML='<div class="prev-ph">-</div>';return;}
  const el=EL_COLOR[card.el]||'#fff';
  document.getElementById('ai-prev-body').innerHTML=`
    <img src="${card.img}" class="prev-img" onerror="this.style.background='${el}22'">
    <div class="prev-info">
      <div style="font-weight:bold;color:#f9fafb">${card.name}</div>
      <div style="color:${el}">◆${card.el} Lv${card.lv}</div>
      ${action?`<div class="prev-action">${action}</div>`:''}
    </div>`;
}

// ══════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════
function cardEl(fc,pi,lineKey,isField){
  const c=fc.card;
  const div=document.createElement('div');
  div.className='card';
  if(fc.exhausted)div.classList.add('exhausted');
  if(fc===attackerSeal?.fc)div.classList.add('attacker');
  if(attackerSeal&&pi===1)div.classList.add('targetable');
  if(fusionMode&&pi===0&&canBeFusionMaterial(fc))div.classList.add('fusion-target');
  if(skillMode&&isSkillTarget(fc))div.classList.add('skill-target');
  if(mysticPlayMode&&canAttachMystic(mysticPlayMode.mysticCard,fc))div.classList.add('mystic-attach');
  if(pendingCb&&pi===0&&!fc.hasUsedSkill&&getCardSkills(fc).some(s=>s.interfere&&G.players[0].mp>=s.mp&&G.players[0].hand.length>0))div.classList.add('interfere-avail');
  if(fc.fused)div.classList.add('fused');
  const ec=EL_COLOR[c.el]||'#fff';
  // Curse classes
  const curses=fc.curses||[];
  const poisonC=curses.find(c=>c.type==='poison');
  const stoneC=curses.find(c=>c.type==='stone');
  const freezeC=curses.find(c=>c.type==='freeze');
  const charmC=curses.find(c=>c.type==='charm');
  const ldC=curses.find(c=>c.type==='lastDance');
  if(poisonC)div.classList.add('poison-cursed');
  if(stoneC)div.classList.add('stone-cursed');
  if(freezeC)div.classList.add('freeze-cursed');
  if(charmC)div.classList.add('charm-cursed');
  if(ldC)div.classList.add('lastdance-cursed');
  function curseTurns(c){return c?Math.max(1,Math.ceil((c.expiresAtSubTurn-subTurnNum)/2)):0;}
  const curseBadges=[
    poisonC?`<span style="background:#4d7c0f;color:#a3e635">☠${curseTurns(poisonC)}</span>`:'',
    stoneC?`<span style="background:#92400e;color:#fef3c7">🪨${curseTurns(stoneC)}</span>`:'',
    freezeC?`<span style="background:#075985;color:#bae6fd">❄${curseTurns(freezeC)}</span>`:'',
    charmC?`<span style="background:#9d174d;color:#fce7f3">💗${curseTurns(charmC)}</span>`:'',
    ldC?`<span style="background:#78350f;color:#fde68a">💃${curseTurns(ldC)}</span>`:'',
  ].filter(Boolean).join('');
  div.innerHTML=`
    <div class="card-lv">Lv${c.lv}</div>
    <img src="${c.img}" alt="${c.name}" onerror="this.style.background='${ec}22';this.style.height='70px'">
    <div class="card-info">
      <div class="card-name">${c.name}</div>
      <div class="card-stats"><span style="color:${ec}">◆${c.el[0].toUpperCase()}</span><span>At${c.at}</span><span>Df${c.df}</span><span style="color:#fbbf24">ตี${c.ma||1}</span></div>
    </div>
    ${fc.fused?`<div class="fused-badge">⚡${fc.fusionStack.length}</div>`:''}
    ${newFromHand(fc)?`<div style="position:absolute;bottom:26px;right:2px;background:#6b7280;color:#fff;font-size:7px;font-weight:bold;border-radius:2px;padding:0 3px;z-index:5">NEW</div>`:''}
    ${fc.hitsLeft>0?`<div style="position:absolute;top:1px;left:2px;background:#ef4444;color:#fff;font-size:8px;font-weight:bold;border-radius:2px;padding:0 3px;z-index:5">×${fc.hitsLeft}</div>`:''}
    ${curseBadges?`<div style="position:absolute;bottom:26px;left:2px;display:flex;gap:2px;z-index:5;font-size:7px;font-weight:bold">${curseBadges}</div>`:''}
    ${getActiveMystics(fc).length?`<div class="mystic-on-seal">✦${getActiveMystics(fc).length}</div>`:''}
  `;
  if(fc.fused&&fc.fusionStack.length){
    const matImg=document.createElement('img');
    matImg.src=fc.fusionStack[0].card.img;
    matImg.className='mat-peek';
    div.appendChild(matImg);
  }
  div.onclick=()=>clickFieldSeal(fc,pi,lineKey);
  div.ondblclick=e=>{e.stopPropagation();openCardViewer(c,fc);};
  if(pi===0){
    div.draggable=true;
    div.ondragstart=e=>{e.stopPropagation();e.dataTransfer.setData('text/plain',JSON.stringify({type:'field',uid:fc.uid,fromLine:lineKey}));e.dataTransfer.effectAllowed='move';};
    div.ondragover=e=>{if(e.dataTransfer.types.includes('text/plain'))e.preventDefault();};
    div.ondrop=e=>{
      e.preventDefault();e.stopPropagation();
      try{
        const data=JSON.parse(e.dataTransfer.getData('text/plain'));
        if(data.type!=='mystic')return;
        const mc=(G.players[0].mysticHand||[])[data.idx];
        if(!mc)return;
        const inMainPhase=(phase==='main'||phase==='main2')&&G.currentPlayer===0;
        const inInterfere=!!pendingCb;
        if(!(G.players[0].mp>=mc.mc&&(inMainPhase||(mc.interfere&&inInterfere))))return;
        if(mc.pasted==='PS'&&canAttachMystic(mc,fc)){attachPSMystic(mc,data.idx,fc);}
        else{showMysticAction(mc,data.idx);}
      }catch(err){}
    };
  }
  div.onmouseenter=e=>{
    updatePlayerPreview(c,fc);
    const tip=document.getElementById('tip');
    const atkLines=fc.fused
      ?getActiveAtks(fc).map(a=>{const v=[a.at?'At'+a.at:'',a.df?'Df'+a.df:''].filter(Boolean).join('/');return`⚡${a.name}: ${v} Mp${a.mp}${a.all?' ALL':''}`;})

      :(c.fuse||[]).map(f=>`+${fuseReqLabel(f)} → ${f.atk.name}`);
    const atks=atkLines.join('<br>');
    const effAt=getEffectiveAt(fc), effDf=getEffectiveDf(fc), effSp=getEffectiveSp(fc);
    const atStr=fc.fused&&effAt!==c.at?`<span style="color:#fde68a">At${effAt}</span>`:(`At${c.at}`);
    const dfStr=fc.fused&&effDf!==c.df?`<span style="color:#fde68a">Df${effDf}</span>`:(`Df${c.df}`);
    const spStr=fc.fused&&effSp!==c.sp?`<span style="color:#fde68a">Sp${effSp}</span>`:(`Sp${c.sp}`);
    tip.innerHTML=`<b>${c.name}</b><br>Lv${c.lv}|${c.tribe}|${c.el}<br>${atStr} ${dfStr} ${spStr}<br>ลง:${c.mc} ตี:${c.ma||1} Mp<br>${atks}${fc.fused?'<br><span style="color:#fde68a">⚡FUSED</span>':''}`;
    tip.style.display='block';moveTip(e);
  };
  div.onmousemove=moveTip;
  div.onmouseleave=()=>{document.getElementById('tip').style.display='none';};
  return div;
}

function handCardEl(card,idx){
  const div=document.createElement('div');
  div.className='card hand-card';
  const p=G.players[0];
  const effMc=getEffectiveMc(card);
  const canPlay=p.mp>=effMc&&(phase==='main'||phase==='main2')&&G.currentPlayer===0;
  if(canPlay)div.classList.add('playable');
  const ec=EL_COLOR[card.el]||'#fff';
  const mcDisp=effMc!==card.mc?`<span style="color:#fde68a">${effMc}</span>`:effMc;
  div.innerHTML=`
    <div class="card-lv">Lv${card.lv}</div>
    <img src="${card.img}" alt="${card.name}" onerror="this.style.background='${ec}22';this.style.height='70px'">
    <div class="card-info">
      <div class="card-name">${card.name}</div>
      <div class="card-stats"><span style="color:${ec}">◆${card.el[0].toUpperCase()}</span><span>At${card.at}</span><span style="color:#38bdf8">ลง${mcDisp}</span><span style="color:#fbbf24">ตี${card.ma||1}</span></div>
    </div>
  `;
  if(phase==='discard'&&p.hand.length+(p.mysticHand||[]).length>HAND_COMBINED_MAX){
    div.classList.add('discard-sel');
    div.onclick=()=>doForcedDiscardSeal(idx);
  } else if(handPickMode&&card.tribe==='Beast'){
    div.classList.add('discard-sel');
    div.onclick=()=>executeHandPickBeast(card,idx);
  } else if(handDiscardMode){
    div.classList.add('discard-sel');
    div.onclick=()=>executeInterfere(card);
  } else if(canPlay){
    div.onclick=()=>clickHandCard(card,idx);
  }
  div.ondblclick=e=>{e.stopPropagation();openCardViewer(card);};
  if(!handDiscardMode&&canPlay){
    div.draggable=true;
    div.ondragstart=e=>{e.dataTransfer.setData('text/plain',JSON.stringify({type:'hand',idx}));e.dataTransfer.effectAllowed='move';};
  }
  div.onmouseenter=e=>{
    updatePlayerPreview(card);
    const tip=document.getElementById('tip');
    const atks=(card.fuse||[]).map(f=>`• +${fuseReqLabel(f)} → ${f.atk.name}`).join('<br>');
    tip.innerHTML=`<b>${card.name}</b><br>Lv${card.lv}|${card.tribe}|${card.el}<br>At${card.at} Df${card.df} Sp${card.sp}<br>ลง:${card.mc} ตี:${card.ma||1} Mp<br>${atks||'(no fusion attacks)'}`;
    tip.style.display='block';moveTip(e);
  };
  div.onmousemove=moveTip;
  div.onmouseleave=()=>{document.getElementById('tip').style.display='none';};
  return div;
}

function moveTip(e){
  const tip=document.getElementById('tip');
  let x=e.clientX+12,y=e.clientY-10;
  if(x+170>window.innerWidth)x=e.clientX-180;
  if(y+200>window.innerHeight)y=e.clientY-200;
  tip.style.left=x+'px';tip.style.top=y+'px';
}

function renderLine(id,seals,pi,lineKey){
  const line=document.getElementById(id);
  line.innerHTML='';
  const totalSlots=Math.max(seals.length+1,3);
  const emptyCount=totalSlots-seals.length;
  // Distribute empties: multiple→split evenly; single→alternate left/right per seal count
  const emptyLeft=emptyCount>1?Math.floor(emptyCount/2):(seals.length%2===0?1:0);
  const emptyRight=emptyCount-emptyLeft;
  const mkEmpty=()=>{const s=document.createElement('div');s.className='slot-empty';s.textContent='—';return s;};
  for(let i=0;i<emptyLeft;i++)line.appendChild(mkEmpty());
  seals.forEach(fc=>line.appendChild(cardEl(fc,pi,lineKey,true)));
  for(let i=0;i<emptyRight;i++)line.appendChild(mkEmpty());
}

function render(){
  const p0=G.players[0],p1=G.players[1];
  renderLine('enemy-df',p1.dfLine,1,'df');
  renderLine('enemy-at',p1.atLine,1,'at');
  renderLine('player-at',p0.atLine,0,'at');
  renderLine('player-df',p0.dfLine,0,'df');

  // Area mystics strip
  const amDiv=document.getElementById('player-area-mystics');
  const ams=p0.areaMystics||[];
  if(ams.length){
    amDiv.style.display='flex';
    amDiv.innerHTML='<span style="font-size:9px;color:#a78bfa;margin-right:2px">✦ PA:</span>';
    ams.forEach(am=>{
      const mx=am.mystic;
      const dur=am.expiresBeforeSubTurn===Infinity?'∞':Math.max(0,Math.ceil((am.expiresBeforeSubTurn-subTurnNum)/2))+'T';
      const chip=document.createElement('div');
      chip.className='area-mystic-chip';
      chip.title=`${mx.name}\n${(mx.ability_text||[]).join('\n')}`;
      chip.innerHTML=`<img src="${mx.img}" onerror="this.src='cardback/mystic.jpg'"><span>${mx.name}</span><span style="color:#fde68a">${dur}</span>`;
      chip.onclick=()=>updatePlayerPreviewMystic(mx);
      amDiv.appendChild(chip);
    });
  } else {
    amDiv.style.display='none';
  }

  const hand=document.getElementById('hand');
  hand.innerHTML='';
  p0.hand.forEach((c,i)=>hand.appendChild(handCardEl(c,i)));
  document.getElementById('hand-label').textContent=p0.hand.length;

  // Mystic hand — same row, separated by a thin divider
  const mysticCards=p0.mysticHand||[];
  document.getElementById('mystic-hand-label').textContent=mysticCards.length;
  if(mysticCards.length){
    const sep=document.createElement('div');
    sep.style.cssText='width:2px;background:#2d1b69;border-radius:1px;margin:2px 4px;align-self:stretch;min-height:80px';
    hand.appendChild(sep);
    mysticCards.forEach((m,i)=>hand.appendChild(mysticCardEl(m,i)));
  }

  // Mp pips
  const pips=document.getElementById('p0-mp');
  pips.innerHTML='';
  for(let i=0;i<MAX_MP;i++){
    const d=document.createElement('div');
    d.className='pip'+(i<p0.mp?' on':'');
    pips.appendChild(d);
  }
  document.getElementById('p0-mp-num').textContent=`${p0.mp}/${MAX_MP}`;

  // Shrine
  const s0=shrineTotal(0),s1=shrineTotal(1);
  const sb=document.getElementById('p0-shrine');
  sb.textContent=`${s0}/${MAX_SHRINE}`;
  sb.className='shrine-box'+(s0>=6?' danger':'');
  document.getElementById('p1-shrine-label').textContent=`${s1}/${MAX_SHRINE}`;
  document.getElementById('p1-mp-label').textContent=p1.mp;
  {const ap=document.getElementById('p1-mp-pips');ap.innerHTML='';for(let i=0;i<MAX_MP;i++){const d=document.createElement('div');d.className='pip'+(i<p1.mp?' on':'');ap.appendChild(d);}}
  document.getElementById('p1-deck-count').textContent=p1.deck.length;
  document.getElementById('p1-mystic-deck-count').textContent=(p1.mysticDeck||[]).length;
  document.getElementById('p0-deck-count').textContent=p0.deck.length;
  document.getElementById('p0-mystic-deck-count').textContent=(p0.mysticDeck||[]).length;
  document.getElementById('p0-hand-count').textContent=p0.hand.length;

  // Phase label (header)
  document.getElementById('phase-label').textContent=
    G.currentPlayer===1?'AI TURN':{draw:'DRAW',main:'MAIN',discard:'DISCARD',battle:'BATTLE',main2:'MAIN2',end:'END'}[phase]||phase;
  if(fusionMode)document.getElementById('phase-label').textContent='⚡ FUSION';
  if(skillMode)document.getElementById('phase-label').textContent='✦ SKILL';
  if(mysticPlayMode)document.getElementById('phase-label').textContent='✦ MYSTIC';

  // Controls phase label
  const cp=document.getElementById('controls-phase');
  if(G.currentPlayer===1){cp.textContent='AI TURN';cp.style.color='#ef4444';}
  else if(fusionMode){cp.textContent='⚡ FUSION';cp.style.color='#a78bfa';}
  else if(skillMode){cp.textContent='✦ SKILL';cp.style.color='#34d399';}
  else if(mysticPlayMode){cp.textContent='✦ MYSTIC — เลือก Seal';cp.style.color='#a78bfa';}
  else if(handDiscardMode){cp.textContent='✦ INTERFERE — เลือกทิ้ง';cp.style.color='#f97316';}
  else if(handTargetMode){cp.textContent='🎯 HAND TARGET';cp.style.color='#ef4444';}
  else if(phase==='main'){cp.textContent='MAIN PHASE';cp.style.color='#34d399';}
  else if(phase==='discard'){
    const p=G.players[0];
    const combined=p.hand.length+(p.mysticHand||[]).length;
    cp.textContent=`DISCARD STEP — ทิ้ง ${combined-HAND_COMBINED_MAX} ใบ (รวม ${combined}/${HAND_COMBINED_MAX})`;
    cp.style.color='#f97316';
  }
  else if(phase==='main2'){cp.textContent='MAIN PHASE 2';cp.style.color='#6ee7b7';}
  else if(phase==='battle'){cp.textContent='BATTLE PHASE';cp.style.color='#f87171';}
  else{cp.textContent=phase.toUpperCase();cp.style.color='#9ca3af';}

  // Attack button text
  const myTurn=G.currentPlayer===0&&!pendingCb;
  const atkBtn=document.getElementById('btn-atk');
  if(attackerSeal){
    const fc=attackerSeal.fc;
    if(fc.activeMultiAtk&&fc.hitsLeft>0){
      atkBtn.textContent=`⚔ Strike ×${fc.hitsLeft} (${fc.activeMultiAtk.name})`;
    } else {
      const atks=getActiveAtks(fc);
      if(atks.length===1)atkBtn.textContent=`⚔ Attack (${atks[0].name})`;
      else if(atks.length>1)atkBtn.textContent='⚔ Attack (choose)';
      else atkBtn.textContent='⚔ Attack';
    }
  } else {
    atkBtn.textContent='⚔ Attack';
  }

  atkBtn.disabled=!(myTurn&&phase==='battle'&&attackerSeal&&!handTargetMode);
  document.getElementById('btn-special').disabled=!(myTurn&&phase==='battle'&&attackerSeal);
  const btnNext=document.getElementById('btn-next');
  btnNext.disabled=!myTurn||phase==='discard'||fusionMode;
  if(phase==='battle'){btnNext.textContent='✓ End Battle';btnNext.className='btn btn-blue';}
  else if(phase==='main2'){btnNext.textContent='⏹ End Turn';btnNext.className='btn btn-red';}
  else{btnNext.textContent='▶ Next Phase';btnNext.className='btn btn-gray';}
  document.getElementById('btn-cancel').style.display=(attackerSeal||pendingDeploy||fusionMode||handTargetMode||skillMode||handDiscardMode||mysticPlayMode)?'inline-block':'none';
  // Action queue controls
  const btnProceed=document.getElementById('btn-proceed');
  const btnInterfere=document.getElementById('btn-interfere');
  if(btnProceed)btnProceed.disabled=!!handDiscardMode;
  const btnAqCancel=document.getElementById('btn-aq-cancel');
  if(btnAqCancel)btnAqCancel.style.display=handDiscardMode?'inline-block':'none';

  // AI hand display
  const aiHandDiv=document.getElementById('ai-hand-display');
  aiHandDiv.innerHTML='';
  G.players[1].hand.forEach((c,i)=>{
    const img=document.createElement('img');
    img.src='cardback/seal.jpg';
    img.className='ai-hcard'+(handTargetMode?' htarget':'');
    img.title=handTargetMode?`คลิกเพื่อโจมตีการ์ดในมือ AI`:'AI hand card';
    if(handTargetMode)img.onclick=()=>clickAIHandCard(i);
    aiHandDiv.appendChild(img);
  });
  (G.players[1].mysticHand||[]).forEach(()=>{
    const img=document.createElement('img');
    img.src='cardback/mystic.jpg';
    img.className='ai-hcard';
    img.title='AI mystic card';
    img.style.opacity='0.8';
    aiHandDiv.appendChild(img);
  });
}

function showRevealModal(title,cards){
  document.getElementById('fa-title').textContent=title;
  const opts=document.getElementById('fa-opts');
  opts.innerHTML='';
  if(!cards.length){
    const d=document.createElement('div');
    d.textContent='ไม่มีการ์ด';d.style.cssText='color:#9ca3af;font-size:11px;padding:8px 0';
    opts.appendChild(d);
  }
  cards.forEach(c=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;border-radius:4px';
    row.onmouseenter=()=>row.style.background='#374151';
    row.onmouseleave=()=>row.style.background='';
    const isMystic=!!c.pasted;
    if(isMystic){
      const abilityStr=(c.ability_text||[]).join(' / ');
      row.innerHTML=`<img src="${c.img}" style="width:28px;height:50px;object-fit:cover;border-radius:2px;flex-shrink:0"><div style="font-size:9px;line-height:1.5"><div style="font-weight:bold;color:#e9d5ff">${c.name}</div><div style="color:#a78bfa">Mystic · Mc${c.mc} · ${c.pasted}</div><div style="color:#c4b5fd;font-size:8px;max-width:180px">${abilityStr}</div></div>`;
      row.style.cursor='default';
    } else {
      const ec=EL_COLOR[c.el]||'#fff';
      row.innerHTML=`<img src="${c.img}" style="width:28px;height:38px;object-fit:cover;border-radius:2px;flex-shrink:0"><div style="font-size:9px;line-height:1.5"><div style="font-weight:bold;color:#f9fafb">${c.name}</div><div>Lv${c.lv} <span style="color:${ec}">◆${c.el[0].toUpperCase()}</span> ${c.tribe} | At${c.at} Df${c.df}</div></div>`;
      row.onclick=()=>openCardViewer(c);
    }
    opts.appendChild(row);
  });
  addFAOpt('✕ ปิด',()=>closeFAModal());
  document.getElementById('fa-modal').classList.add('show');
}

// ══════════════════════════════════════════════
// CARD VIEWER
// ══════════════════════════════════════════════
function openCardViewer(c,fc=null){
  const el=EL_COLOR[c.el]||'#fff';
  document.getElementById('cv-img').src=c.img;
  document.getElementById('cv-name').textContent=c.name;
  document.getElementById('cv-tribe').textContent=`${c.tribe} | Lv ${c.lv}`;
  document.getElementById('cv-el').innerHTML=`<span style="color:${el}">◆ ${c.el.charAt(0).toUpperCase()+c.el.slice(1)}</span>`;
  const effAt=fc?getEffectiveAt(fc):c.at, effDf=fc?getEffectiveDf(fc):c.df, effSp=fc?getEffectiveSp(fc):c.sp;
  // Build stat breakdown for any modified stat
  const atMods=[], dfMods=[], spMods=[];
  if(fc){
    let atCmp=c.at;
    if(fc.fused&&fc.fusionAtks?.length){const b=fc.fusionAtks.filter(a=>a.at).sort((a,b)=>b.at-a.at)[0];if(b){atMods.push(`Fusion→${b.at}`);atCmp=b.at;}}
    {const ab=(fc.atBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);const s=ab.reduce((s,b)=>s+b.amount,0);if(s){atMods.push(`Boost+${s}`);atCmp+=s;}}
    {const ld=(fc.curses||[]).filter(cu=>cu.type==='lastDance');const s=ld.reduce((s,cu)=>s+(cu.atBonus||0),0);if(s){atMods.push(`LastDance+${s}`);atCmp+=s;}}
    {const ms=getMysticAtBonus(fc);if(ms){atMods.push(`Mystic+${ms}`);atCmp+=ms;}}
    const atP=effAt-atCmp;if(atP!==0)atMods.push(`Ability${atP>0?'+':''}${atP}`);
    let dfCmp=c.df;
    if(fc.fused&&fc.fusionAtks?.length){const b=fc.fusionAtks.filter(a=>a.df).sort((a,b)=>b.df-a.df)[0];if(b){dfMods.push(`Fusion→${b.df}`);dfCmp=b.df;}}
    {const db=(fc.dfBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);const s=db.reduce((s,b)=>s+b.amount,0);if(s){dfMods.push(`Boost+${s}`);dfCmp+=s;}}
    {const ms=getMysticDfBonus(fc);if(ms){dfMods.push(`Mystic+${ms}`);dfCmp+=ms;}}
    const dfP=effDf-dfCmp;if(dfP!==0)dfMods.push(`Ability${dfP>0?'+':''}${dfP}`);
    let spCmp=c.sp;
    {const sb=(fc.spBoosts||[]).filter(b=>subTurnNum<b.expiresBeforeSubTurn);const s=sb.reduce((s,b)=>s+b.amount,0);if(s){spMods.push(`Boost+${s}`);spCmp+=s;}}
    {const ms=getMysticSpBonus(fc);if(ms){spMods.push(`Mystic+${ms}`);spCmp+=ms;}}
    const spP=effSp-spCmp;if(spP!==0)spMods.push(`Ability${spP>0?'+':''}${spP}`);
  }
  const atStar=fc&&effAt!==c.at?'*':'', dfStar=fc&&effDf!==c.df?'*':'', spStar=fc&&effSp!==c.sp?'*':'';
  const atColor=atStar?'#fde68a':'#ef4444', dfColor=dfStar?'#fde68a':'#38bdf8', spColor=spStar?'#fde68a':'#4ade80';
  const atStr=`<span style="color:${atColor}">⚔ At ${effAt}${atStar}</span>`;
  const dfStr=`<span style="color:${dfColor}">🛡 Df ${effDf}${dfStar}</span>`;
  const spStr=`<span style="color:${spColor}">💨 Sp ${effSp}${spStar}</span>`;
  const brkParts=[];
  if(atMods.length)brkParts.push(`At${c.at} ${atMods.join(' ')}`);
  if(dfMods.length)brkParts.push(`Df${c.df} ${dfMods.join(' ')}`);
  if(spMods.length)brkParts.push(`Sp${c.sp} ${spMods.join(' ')}`);
  const brkHtml=brkParts.length?`<div style="color:#6b7280;font-size:9px;margin-top:1px">${brkParts.join(' | ')}</div>`:'';
  document.getElementById('cv-stats').innerHTML=`${atStr} &nbsp; ${dfStr} &nbsp; ${spStr}${brkHtml}`;
  document.getElementById('cv-mp').innerHTML=
    `<span style="color:#38bdf8">ค่าลง: ${c.mc} Mp</span> &nbsp; <span style="color:#fbbf24">ค่าตี: ${c.ma||1} Mp</span>`;
  const fuseDiv=document.getElementById('cv-fuse');
  function fuseAtkStats(a){
    const v=[a.at?`At ${a.at}`:'',a.df?`Df ${a.df}`:'',a.sp!=null?`Sp ${a.sp}`:''].filter(Boolean).join(' ');
    const ex=[a.all?'ALL':'',a.hits>1?`×${a.hits} hits`:''].filter(Boolean).join(' ');
    return `${v} Mp ${a.mp}${ex?' '+ex:''}`;
  }
  function fuseTable(fuseArr){
    return '<div style="color:#6b7280;font-size:10px;margin-bottom:3px;margin-top:6px">FUSION</div>'+
      fuseArr.map(f=>`<div style="color:#fde68a;margin-bottom:4px">⚡ +${fuseReqLabel(f)} → <b>${f.atk.name}</b><br><span style="color:#9ca3af">${fuseAtkStats(f.atk)}</span></div>`).join('');
  }
  if(fc?.fused&&fc.fusionStack?.length){
    document.getElementById('cv-atks').innerHTML=
      '<div style="color:#fde68a;font-size:10px;margin-bottom:5px">⚡ FUSION ATTACKS</div>'+
      fc.fusionAtks.map(a=>{
        return `<div style="margin-bottom:4px"><b style="color:#fde68a">${a.name}</b>${a.all?` <span style="color:#f87171">[ALL]</span>`:''}<br><span style="color:#9ca3af">${fuseAtkStats(a)}</span></div>`;
      }).join('')+(fc.fusionAtks.length===0?'<div style="color:#9ca3af">(กำลังสะสม...)</div>':'');
    fuseDiv.innerHTML='<div style="color:#a78bfa;font-size:10px;margin-bottom:5px;margin-top:8px">🔗 FUSED WITH</div>'+
      fc.fusionStack.map(mfc=>{
        const mel=EL_COLOR[mfc.card.el]||'#fff';
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <img src="${mfc.card.img}" style="width:36px;height:50px;object-fit:cover;border-radius:4px;border:1px solid #a78bfa66">
          <div>
            <div style="color:#f9fafb;font-size:12px">${mfc.card.name}</div>
            <div style="color:${mel};font-size:11px">◆${mfc.card.el} · ${mfc.card.tribe}</div>
            <div style="color:#9ca3af;font-size:11px">At${mfc.card.at} Df${mfc.card.df} Sp${mfc.card.sp}</div>
          </div>
        </div>`;
      }).join('')+(c.fuse?.length?fuseTable(c.fuse):'');
  } else {
    document.getElementById('cv-atks').innerHTML='';
    fuseDiv.innerHTML=c.fuse?.length?fuseTable(c.fuse):'';
  }
  // Skills display
  const skillTexts=Array.isArray(c.skill_text)?c.skill_text:(c.skill_text?[c.skill_text]:[]);
  const skillHtml=skillTexts.length
    ?'<div style="color:#34d399;font-size:10px;margin-top:8px;border-top:1px solid #374151;padding-top:6px">'+
      skillTexts.map(s=>`<div style="margin-bottom:4px">${s}</div>`).join('')+'</div>'
    :'';
  const abilTexts=Array.isArray(c.ability_text)?c.ability_text:(c.ability_text?[c.ability_text]:[]);
  const abilHtml=abilTexts.length
    ?'<div style="color:#9ca3af;font-size:10px;margin-top:6px">'+
      abilTexts.map(s=>`<div style="margin-bottom:3px">${s}</div>`).join('')+'</div>'
    :'';
  let curseHtml='';
  if(fc&&fc.curses&&fc.curses.length>0){
    const cNames={poison:'☠ Poison',stone:'🪨 Stone',freeze:'❄ Freeze',charm:'💗 Charm',lastDance:'💃 Last Dance',death:'☠ Death'};
    curseHtml='<div style="color:#f87171;font-size:10px;margin-top:6px;border-top:1px solid #374151;padding-top:6px">'+
      fc.curses.map(c=>{
        const turns=Math.max(1,Math.ceil((c.expiresAtSubTurn-subTurnNum)/2));
        return `<div>${cNames[c.type]||c.type} Curse — ${turns} Turn เหลือ</div>`;
      }).join('')+'</div>';
  }
  let mysticHtml='';
  if(fc&&getActiveMystics(fc).length){
    mysticHtml='<div style="color:#a78bfa;font-size:10px;margin-top:8px;border-top:1px solid #374151;padding-top:6px">✦ PS MYSTICS ที่ติดอยู่</div>'+
      getActiveMystics(fc).map(ms=>{
        const mx=ms.mystic||ms;
        const bonuses=[ms.atBonus?`At+${ms.atBonus}`:'',ms.dfBonus?`Df+${ms.dfBonus}`:'',ms.spBonus?`Sp+${ms.spBonus}`:''].filter(Boolean).join(' ');
        const dur=ms.expiresBeforeSubTurn===Infinity?'∞':`${Math.max(0,Math.ceil((ms.expiresBeforeSubTurn-subTurnNum)/2))}T เหลือ`;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <img src="${mx.img||'cardback/mystic.jpg'}" style="width:32px;height:46px;object-fit:cover;border-radius:3px;border:1px solid #a78bfa66" onerror="this.src='cardback/mystic.jpg'">
          <div>
            <div style="color:#e9d5ff;font-size:11px;font-weight:bold">${mx.name}</div>
            <div style="color:#7c3aed;font-size:10px">${mx.pasted||'PS'} | ${dur}</div>
            ${bonuses?`<div style="color:#fde68a;font-size:10px">${bonuses}</div>`:''}
          </div>
        </div>`;
      }).join('');
  }
  document.getElementById('cv-skill').innerHTML=skillHtml;
  document.getElementById('cv-ability').innerHTML=abilHtml;
  if(curseHtml||mysticHtml){
    document.getElementById('cv-fuse').innerHTML=(document.getElementById('cv-fuse').innerHTML||'')+curseHtml+mysticHtml;
  }
  document.getElementById('card-viewer').style.display='flex';
}

function closeCardViewer(){document.getElementById('card-viewer').style.display='none';}

function updatePlayerPreviewMystic(m){
  const exParts=[];
  if(m.exception_lv)exParts.push(`Lv&lt;${m.exception_lv}`);
  if(m.exception_tribes?.length)exParts.push(`ไม่ใช้: ${m.exception_tribes.join('/')}`);
  if(m.exception_els?.length)exParts.push(`ไม่ใช้: ${m.exception_els.join('/')}`);
  const abilHtml=(m.ability_text||[]).map(s=>`<div style="margin-bottom:3px">${s}</div>`).join('');
  document.getElementById('pp-body').innerHTML=`
    <img src="${m.img}" class="prev-img" onerror="this.src='cardback/mystic.jpg'" style="border:2px solid #4c1d95">
    <div class="prev-info">
      <div style="font-weight:bold;color:#a78bfa">${m.name}</div>
      <div style="color:#7c3aed">${m.pasted}${m.interfere?' ⚡Interfere':''}</div>
      <div style="color:#9ca3af;font-size:9px">${m.subtype_name||''}</div>
      <div style="color:#38bdf8">Mc ${m.mc} &nbsp; <span style="color:#a78bfa">${m.turns===999?'∞':m.turns+'T'}</span></div>
      ${exParts.length?`<div style="color:#f87171;font-size:9px;margin-top:2px">${exParts.join(' | ')}</div>`:''}
      <div style="margin-top:4px;border-top:1px solid #374151;padding-top:4px;color:#e9d5ff;font-size:9px">${abilHtml}</div>
    </div>`;
}

function mysticCardEl(mysticCard,idx){
  const div=document.createElement('div');
  div.className='mystic-card';
  const p=G.players[0];
  const inMainPhase=(phase==='main'||phase==='main2')&&G.currentPlayer===0;
  const inInterfere=!!pendingCb;
  const canPlay=p.mp>=mysticCard.mc&&(inMainPhase||(mysticCard.interfere&&inInterfere));
  if(canPlay)div.classList.add('playable');
  if(mysticPlayMode&&mysticPlayMode.mysticIdx===idx)div.classList.add('mystic-sel');
  div.innerHTML=`
    <div class="mystic-type-badge">${mysticCard.pasted}${mysticCard.interfere?'⚡':''}</div>
    <img src="${mysticCard.img}" alt="${mysticCard.name}" onerror="this.src='cardback/mystic.jpg'">
    <div class="mystic-card-info">
      <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold">${mysticCard.name}</div>
      <div style="color:#6d28d9">Mc:${mysticCard.mc} ${mysticCard.turns===999?'∞':mysticCard.turns+'T'}</div>
    </div>
  `;
  const mysticOverLimit=phase==='discard'&&p.hand.length+(p.mysticHand||[]).length>HAND_COMBINED_MAX;
  if(mysticOverLimit)div.classList.add('discard-sel');
  div.onclick=()=>{
    if(mysticOverLimit){doForcedDiscardMystic(idx);return;}
    updatePlayerPreviewMystic(mysticCard);if(canPlay)showMysticAction(mysticCard,idx);
  };
  div.ondblclick=e=>{e.stopPropagation();openMysticViewer(mysticCard);};
  if(canPlay){
    div.draggable=true;
    div.ondragstart=e=>{e.dataTransfer.setData('text/plain',JSON.stringify({type:'mystic',idx}));e.dataTransfer.effectAllowed='copy';};
  }
  div.onmouseenter=e=>{
    updatePlayerPreviewMystic(mysticCard);
    const tip=document.getElementById('tip');
    const exTxt=[];
    if(mysticCard.exception_lv)exTxt.push(`Lv<${mysticCard.exception_lv}`);
    if(mysticCard.exception_tribes?.length)exTxt.push(`ไม่ใช้: ${mysticCard.exception_tribes.join('/')}`);
    if(mysticCard.exception_els?.length)exTxt.push(`ไม่ใช้: ${mysticCard.exception_els.join('/')}`);
    tip.innerHTML=`<b style="color:#a78bfa">${mysticCard.name}</b><br>${mysticCard.pasted}${mysticCard.interfere?' ⚡Interfere':''}<br>Mc:${mysticCard.mc} | ${mysticCard.turns===999?'∞':mysticCard.turns+'T'}<br>${(mysticCard.ability_text||[]).join('<br>')}${exTxt.length?'<br><span style="color:#f87171">'+exTxt.join(' | ')+'</span>':''}`;
    tip.style.display='block';moveTip(e);
  };
  div.onmousemove=moveTip;
  div.onmouseleave=()=>{document.getElementById('tip').style.display='none';};
  return div;
}

function openMysticViewer(m){
  document.getElementById('cv-img').src=m.img;
  document.getElementById('cv-name').textContent=m.name;
  document.getElementById('cv-tribe').textContent=`${m.pasted} | ${m.subtype_name||''}`;
  document.getElementById('cv-el').innerHTML=`<span style="color:#a78bfa">✦ Mystic${m.interfere?' [Interfere]':''}</span>`;
  document.getElementById('cv-stats').innerHTML=`<span style="color:#38bdf8">Mc ${m.mc}</span> &nbsp; <span style="color:#a78bfa">Turns: ${m.turns===999?'∞':m.turns}</span>`;
  document.getElementById('cv-mp').innerHTML=`<span style="color:#a78bfa">Type: ${m.pasted}</span>`;
  document.getElementById('cv-atks').innerHTML='';
  const abilTexts=Array.isArray(m.ability_text)?m.ability_text:(m.ability_text?[m.ability_text]:[]);
  let html=abilTexts.length?'<div style="color:#a78bfa;font-size:10px;margin-top:8px;border-top:1px solid #374151;padding-top:6px">'+abilTexts.map(s=>`<div style="margin-bottom:4px">${s}</div>`).join('')+'</div>':'';
  const exParts=[];
  if(m.exception_lv)exParts.push(`ไม่ติดกับ Lv ${m.exception_lv}+`);
  if(m.exception_tribes?.length)exParts.push(`ไม่ติดกับ ${m.exception_tribes.join('/')}`);
  if(m.exception_els?.length)exParts.push(`ไม่ติดกับธาตุ ${m.exception_els.join('/')}`);
  if(exParts.length)html+=`<div style="color:#f87171;font-size:10px;margin-top:4px">${exParts.join(' | ')}</div>`;
  document.getElementById('cv-fuse').innerHTML=html;
  document.getElementById('card-viewer').style.display='flex';
}

// ══════════════════════════════════════════════
// LOG
// ══════════════════════════════════════════════
function log(msg,type=''){
  const box=document.getElementById('log');
  const d=document.createElement('div');
  d.className='log-line'+(type?' '+type:'');
  d.textContent=msg;
  box.prepend(d);
  while(box.children.length>30)box.removeChild(box.lastChild);
}

// Right-click to cancel active selection modes
document.addEventListener('contextmenu',e=>{
  if(mysticPlayMode){
    e.preventDefault();
    mysticPlayMode=null;
    render();
  } else if(handDiscardMode){
    e.preventDefault();
    handDiscardMode=null;
    render();
  } else if(skillMode){
    e.preventDefault();
    cancelAction();
  }
});

// ══════════════════════════════════════════════
// START
// ══════════════════════════════════════════════
loadMysticDB()
  .then(()=>loadCardDB())
  .then(()=>initGame())
  .catch(err=>{
    console.warn('JSON load failed, using fallback:',err);
    CARD_DB=_CARD_DB_FALLBACK;
    initGame();
  });
