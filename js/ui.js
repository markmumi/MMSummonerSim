// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function getEffectiveMa(fc){
  if(fc.fused){
    const atks=getActiveAtks(fc);
    if(atks.length){
      const best=atks.filter(a=>a.at).sort((a,b)=>b.at-a.at)[0]||atks[0];
      return best.mp;
    }
  }
  return Math.max(0,(fc.card.ma||1)-getMysticMaReduction(fc));
}

// ══════════════════════════════════════════════
// CANCEL
// ══════════════════════════════════════════════
function cancelAction(){
  attackerSeal=null;pendingAttackIdx=null;pendingDeploy=null;pendingSacrifice=null;
  if(typeof pendingFusionMaterials!=='undefined'&&pendingFusionMaterials.length){
    const p=G.players[0];
    pendingFusionMaterials.forEach(m=>{p[m._stagedLine||'atLine'].push(m);delete m._stagedLine;});
    pendingFusionMaterials=[];
  }
  fusionMode=false;fusionMainFC=null;handTargetMode=false;skillMode=null;handDiscardMode=null;handPickMode=null;mysticPlayMode=null;sacrificeTargetMode=null;
  // Clear guest-side state vars (if online guest)
  if(window.Online?.isOnline&&!Online.isHost){
    if(guestFusionMainFC){Online.sendGuestAction({action:'guestCancelFusion'});}
    if(guestSkillMode){Online.sendGuestAction({action:'guestCancelSkill'});}
    if(guestMysticPlayMode){Online.sendGuestAction({action:'guestCancelMysticPS'});}
    guestFusionMainFC=null;guestSkillMode=null;guestMysticPlayMode=null;guestHandDiscardMode=null;
  }
  closeAtkPanel();closeDeployModal();closeFAModal();
  if(typeof _chainDisplay!=='undefined'){_chainDisplay=[];_chainCollapsed=true;_nextChainCard=null;if(typeof _updateChainDisplay==='function')_updateChainDisplay();}
  render();
}

// ══════════════════════════════════════════════
// PREVIEW PANELS
// ══════════════════════════════════════════════
function fuseReqLabel(f){
  // f.reqs is an array of strings e.g. ["fire","fire"] or ["darkness","water"]
  const counts={};
  (f.reqs||[]).forEach(r=>{counts[r]=(counts[r]||0)+1;});
  return Object.entries(counts).map(([r,n])=>n>1?`${n}x ${r}`:r).join('+');
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
  if(typeof _aqPreviewCard!=='undefined')_aqPreviewCard=card||null;
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
  const lpi=(window.Online?.isOnline&&!Online.isHost)?1:0;
  const rpi=1-lpi;
  const c=fc.card;
  const div=document.createElement('div');
  div.className='card';
  if(fc.exhausted)div.classList.add('exhausted');
  if(fc===attackerSeal?.fc||fc===_aiAttackerFC)div.classList.add('attacker');
  if(attackerSeal&&pi===rpi)div.classList.add('targetable');
  if(fusionMode&&pi===lpi&&canBeFusionMaterial(fc))div.classList.add('fusion-target');
  if(guestFusionMainFC&&pi===lpi&&canBeGuestFusionMaterial(fc))div.classList.add('fusion-target');
  if(skillMode&&isSkillTarget(fc))div.classList.add('skill-target');
  if(guestSkillMode&&pi!==lpi){const s=(getCardSkills(guestSkillMode.fc)||[])[guestSkillMode.skillIdx];if(s&&s.filter&&s.filter(fc))div.classList.add('skill-target');}
  if(sacrificeTargetMode&&!(sacrificeTargetMode.mysticCard.exception_tribes||[]).includes(fc.card.tribe))div.classList.add('skill-target');
  if(mysticPlayMode&&canAttachMystic(mysticPlayMode.mysticCard,fc))div.classList.add('mystic-attach');
  if(guestMysticPlayMode&&canAttachMystic(guestMysticPlayMode.mysticCard,fc))div.classList.add('mystic-attach');
  if(pendingCb&&pi===lpi&&G.currentPlayer!==lpi&&!fc.hasUsedSkill&&getCardSkills(fc).some(s=>s.interfere&&G.players[lpi].mp>=s.mp&&G.players[lpi].hand.length>0))div.classList.add('interfere-avail');
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
  function curseTurns(c){return c&&!c.fromPS?Math.max(1,Math.ceil((c.expiresAtSubTurn-subTurnNum)/2)):'';}
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
      <div class="card-stats"><span style="color:${EL_COLOR[getEffectiveEl(fc)]||ec}">${fc.magicalEl?'✦':'◆'}${getEffectiveEl(fc)[0].toUpperCase()}</span><span${getEffectiveAt(fc)!==c.at?' style="color:#fde68a"':''}>At${getEffectiveAt(fc)}</span><span${getEffectiveDf(fc)!==c.df?' style="color:#fde68a"':''}>Df${getEffectiveDf(fc)}</span><span style="color:#fbbf24">ตี${getEffectiveMa(fc)}</span></div>
    </div>
    ${fc.fused?`<div class="fused-badge">⚡${fc.fusionStack.length}</div>`:''}
    ${newFromHand(fc)?`<div style="position:absolute;bottom:26px;right:2px;background:#6b7280;color:#fff;font-size:7px;font-weight:bold;border-radius:2px;padding:0 3px;z-index:5">NEW</div>`:''}
    ${fc.hitsLeft>0?`<div style="position:absolute;top:1px;left:2px;background:#ef4444;color:#fff;font-size:8px;font-weight:bold;border-radius:2px;padding:0 3px;z-index:5">×${fc.hitsLeft}</div>`:''}
    ${curseBadges?`<div style="position:absolute;top:2px;left:2px;display:flex;gap:2px;z-index:5;font-size:10px;font-weight:bold;flex-wrap:wrap">${curseBadges}</div>`:''}
    ${getActiveMystics(fc).length?`<div class="mystic-on-seal">✦${getActiveMystics(fc).length}</div>`:''}
  `;
  div.onclick=()=>clickFieldSeal(fc,pi,lineKey);
  div.ondblclick=e=>{e.stopPropagation();openCardViewer(c,fc);};
  if(pi===lpi&&lpi===0){
    // Drag-drop only for offline/host (pi=0)
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
    const atStr=effAt!==c.at?`<span style="color:#fde68a">At${effAt}</span>`:`At${c.at}`;
    const dfStr=effDf!==c.df?`<span style="color:#fde68a">Df${effDf}</span>`:`Df${c.df}`;
    const spStr=effSp!==c.sp?`<span style="color:#fde68a">Sp${effSp}</span>`:`Sp${c.sp}`;
    tip.innerHTML=`<b>${c.name}</b><br>Lv${c.lv}|${c.tribe}|${c.el}<br>${atStr} ${dfStr} ${spStr}<br>ลง:${c.mc} ตี:${getEffectiveMa(fc)} Mp<br>${atks}${fc.fused?'<br><span style="color:#fde68a">⚡FUSED</span>':''}`;
    tip.style.display='block';moveTip(e);
  };
  div.onmousemove=moveTip;
  div.onmouseleave=()=>{document.getElementById('tip').style.display='none';};
  if(fc.fused&&fc.fusionStack.length){
    const wrap=document.createElement('div');
    wrap.className='fused-wrap';
    const n=fc.fusionStack.length;
    const peekStep=22;
    wrap.style.width=(88+n*peekStep)+'px';
    fc.fusionStack.forEach((sfc,i,arr)=>{
      const peek=document.createElement('img');
      peek.src=sfc.card.img;
      peek.className='stack-peek';
      const rot=arr.length===1?-8:-14+i*(14/(arr.length-1));
      peek.style.left=(i*peekStep)+'px';
      peek.style.transform=`rotate(${rot}deg)`;
      peek.style.zIndex=i+1;
      wrap.appendChild(peek);
    });
    div.style.left=(n*peekStep)+'px';
    wrap.appendChild(div);
    return wrap;
  }
  return div;
}

function handCardEl(card,idx,pi=0){
  const div=document.createElement('div');
  div.className='card hand-card';
  const p=G.players[pi];
  const effMc=getEffectiveMc(card);
  const canPlay=p.mp>=effMc&&(phase==='main'||phase==='main2')&&G.currentPlayer===pi&&!pendingCb;
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
  const isGuest=window.Online?.isOnline&&!Online.isHost&&pi===1;
  const guestDiscardStep=isGuest&&phase==='discard'&&p.hand.length+(p.mysticHand||[]).length>getEffectiveCombinedMax(pi);
  if(phase==='discard'&&pi===0&&p.hand.length+(p.mysticHand||[]).length>getEffectiveCombinedMax(pi)){
    div.classList.add('discard-sel');
    div.onclick=()=>doForcedDiscardSeal(idx);
  } else if(guestDiscardStep){
    div.classList.add('discard-sel');
    div.onclick=()=>Online.sendGuestAction({action:'guestDiscardSeal',cardIdx:idx});
  } else if(handPickMode&&card.tribe==='Beast'&&!isGuest){
    div.classList.add('discard-sel');
    div.onclick=()=>executeHandPickBeast(card,idx);
  } else if(handDiscardMode&&!isGuest){
    div.classList.add('discard-sel');
    div.onclick=()=>executeInterfere(card);
  } else if(handDiscardMode&&isGuest){
    div.classList.add('discard-sel');
    div.onclick=()=>Online.sendGuestAction({action:'handDiscard',cardIdx:idx});
  } else if(guestHandDiscardMode&&isGuest){
    div.classList.add('discard-sel');
    div.onclick=()=>Online.sendGuestAction({action:'guestHandDiscard',cardIdx:idx});
  } else if(canPlay){
    if(isGuest){
      // Guest: clicking shows deploy modal (doDeploy sends action to host)
      div.onclick=()=>{pendingDeploy={card,idx};const mc=effMc!==card.mc?` (${card.mc}→${effMc})`:'';document.getElementById('deploy-title').textContent=`Deploy ${card.name} (Mp ${effMc}${mc})`;document.getElementById('deploy-modal').classList.add('show');};
    } else {
      div.onclick=()=>clickHandCard(card,idx);
    }
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
  const lpi=(window.Online?.isOnline&&!Online.isHost)?1:0;
  const line=document.getElementById(id);
  line.innerHTML='';
  const mkEmpty=()=>{const s=document.createElement('div');s.className='slot-empty';s.textContent='—';return s;};
  if(pi===lpi){
    // Player line with space: deploy slots at far left and far right
    const mkDeploy=(insertAt)=>{
      const s=document.createElement('div');
      s.className='slot-empty slot-deploy';
      s.textContent='＋';
      s.ondragover=e=>{if(e.dataTransfer.types.includes('text/plain')){e.preventDefault();s.classList.add('drag-over');}};
      s.ondragleave=()=>s.classList.remove('drag-over');
      s.ondrop=e=>{
        e.preventDefault();s.classList.remove('drag-over');
        try{
          const data=JSON.parse(e.dataTransfer.getData('text/plain'));
          if(data.type!=='hand')return; // let 'field'/'mystic' bubble to LINE handler
          e.stopPropagation(); // only block bubble for hand deploys (prevent double-deploy)
          const card=G.players[lpi].hand[data.idx];
          if(!card)return;
          if(window.Online?.isOnline&&!Online.isHost){
            Online.sendGuestAction({action:'deploy',cardIdx:data.idx,line:lineKey});
          } else {
            doDeployAtSlot(card,data.idx,lineKey,insertAt);
          }
        }catch(err){}
      };
      return s;
    };
    line.appendChild(mkDeploy(0));
    seals.forEach(fc=>line.appendChild(cardEl(fc,pi,lineKey,true)));
    line.appendChild(mkDeploy(-1));
  } else {
    // AI lines or full player line
    const totalSlots=Math.max(seals.length,3);
    const emptyCount=totalSlots-seals.length;
    const emptyLeft=Math.floor(emptyCount/2);
    const emptyRight=emptyCount-emptyLeft;
    for(let i=0;i<emptyLeft;i++)line.appendChild(mkEmpty());
    seals.forEach(fc=>line.appendChild(cardEl(fc,pi,lineKey,true)));
    for(let i=0;i<emptyRight;i++)line.appendChild(mkEmpty());
  }
}

function render(){
  // Online: lpi = local player index (0=host/offline, 1=guest), rpi = remote
  const lpi=(window.Online?.isOnline&&!Online.isHost)?1:0;
  const rpi=1-lpi;
  if(window.Online?.isOnline&&!Online.isHost){
    console.log('[GUEST render] lpi='+lpi+' rpi='+rpi+' G.currentPlayer='+G.currentPlayer+' phase='+phase+' pendingCb='+!!pendingCb+' isOnline='+Online.isOnline+' isHost='+Online.isHost);
  }
  const pL=G.players[lpi],pR=G.players[rpi];

  renderLine('enemy-df',pR.dfLine,rpi,'df');
  renderLine('enemy-at',pR.atLine,rpi,'at');
  renderLine('player-at',pL.atLine,lpi,'at');
  renderLine('player-df',pL.dfLine,lpi,'df');

  // Area mystics strip (both players): local left, opponent right
  const amDiv=document.getElementById('player-area-mystics');
  const amsL=pL.areaMystics||[];
  const amsR=pR.areaMystics||[];
  const mkChip=(am,tint)=>{
    const mx=am.mystic;
    const dur=am.expiresBeforeSubTurn===Infinity?'∞':Math.max(0,Math.ceil((am.expiresBeforeSubTurn-subTurnNum)/2))+'T';
    const chip=document.createElement('div');
    chip.className='area-mystic-chip';
    if(tint)chip.style.outline='1px solid #f8717166';
    chip.title=`${mx.name}\n${(mx.ability_text||[]).join('\n')}`;
    chip.innerHTML=`<img src="${mx.img}" onerror="this.src='cardback/mystic.jpg'"><span>${mx.name}</span><span style="color:#fde68a">${dur}</span>`;
    chip.onclick=()=>updatePlayerPreviewMystic(mx);
    return chip;
  };
  if(amsL.length||amsR.length){
    amDiv.style.display='flex';
    amDiv.innerHTML='';
    // Local side (left)
    if(amsL.length){
      const lbl=document.createElement('span');lbl.style.cssText='font-size:9px;color:#34d399;margin-right:2px;white-space:nowrap';lbl.textContent='✦ PA:';
      amDiv.appendChild(lbl);
      amsL.forEach(am=>amDiv.appendChild(mkChip(am,false)));
    }
    // Divider
    if(amsL.length&&amsR.length){
      const div=document.createElement('div');div.style.cssText='width:1px;background:#4b5563;margin:0 6px;align-self:stretch';
      amDiv.appendChild(div);
    }
    // Opponent side (right)
    if(amsR.length){
      const lbl=document.createElement('span');lbl.style.cssText='font-size:9px;color:#f87171;margin-right:2px;white-space:nowrap';lbl.textContent='⚔ PA:';
      amDiv.appendChild(lbl);
      amsR.forEach(am=>amDiv.appendChild(mkChip(am,true)));
    }
  } else {
    amDiv.style.display='none';
  }

  // Local player's hand
  const hand=document.getElementById('hand');
  hand.innerHTML='';
  pL.hand.forEach((c,i)=>hand.appendChild(handCardEl(c,i,lpi)));
  document.getElementById('hand-label').textContent=pL.hand.length;

  // Mystic hand — same row, separated by a thin divider (both host and guest)
  const mysticCards=pL.mysticHand||[];
  document.getElementById('mystic-hand-label').textContent=mysticCards.length;
  if(mysticCards.length){
    const sep=document.createElement('div');
    sep.style.cssText='width:2px;background:#2d1b69;border-radius:1px;margin:2px 4px;align-self:stretch;min-height:80px';
    hand.appendChild(sep);
    mysticCards.forEach((m,i)=>hand.appendChild(mysticCardEl(m,i,lpi)));
  }

  // Mp pips (local player)
  const pips=document.getElementById('p0-mp');
  pips.innerHTML='';
  const mpMaxL=getEffectiveMpMax(lpi);
  for(let i=0;i<mpMaxL;i++){
    const d=document.createElement('div');
    d.className='pip'+(i<pL.mp?' on':'');
    pips.appendChild(d);
  }
  document.getElementById('p0-mp-num').textContent=`${pL.mp}/${mpMaxL}`;

  // Shrine (local / remote)
  const sL=shrineTotal(lpi),sR=shrineTotal(rpi);
  const sb=document.getElementById('p0-shrine');
  sb.textContent=`${sL}/${MAX_SHRINE}`;
  sb.className='shrine-box'+(sL>=6?' danger':'');
  sb.style.cursor='pointer';
  sb.title='คลิกดูการ์ดใน Shrine';
  sb.onclick=()=>showShrineModal(lpi);
  document.getElementById('p1-shrine-label').textContent=`${sR}/${MAX_SHRINE}`;
  {const el=document.getElementById('opp-name-label');if(el)el.textContent=`⚔ ${pR.name}`;}
  {const el=document.getElementById('ai-action-label');if(el)el.textContent=`🤖 ${pR.name} Action`;}
  document.getElementById('p1-mp-label').textContent=pR.mp;
  {const ap=document.getElementById('p1-mp-pips');ap.innerHTML='';const mpMaxR=getEffectiveMpMax(rpi);for(let i=0;i<mpMaxR;i++){const d=document.createElement('div');d.className='pip'+(i<pR.mp?' on':'');ap.appendChild(d);}}
  document.getElementById('p1-deck-count').textContent=pR.deck.length;
  document.getElementById('p1-mystic-deck-count').textContent=(pR.mysticDeck||[]).length;
  document.getElementById('p0-deck-count').textContent=pL.deck.length;
  document.getElementById('p0-mystic-deck-count').textContent=(pL.mysticDeck||[]).length;
  document.getElementById('p0-hand-count').textContent=pL.hand.length;

  // Phase label (header)
  const isOnlineGuest=window.Online?.isOnline&&!Online.isHost;
  const activeFusion=fusionMode||!!guestFusionMainFC;
  const activeSkill=skillMode||!!guestSkillMode;
  const activeMystic=mysticPlayMode||!!guestMysticPlayMode;
  const activeHandDiscard=handDiscardMode||!!guestHandDiscardMode;
  let isOpponentTurn=G.currentPlayer===rpi;
  // Safety: if GUEST's deploy modal is open, it's GUEST's turn — don't show OPPONENT TURN
  if(isOnlineGuest&&pendingDeploy)isOpponentTurn=false;
  const opponentLabel=window.Online?.isOnline?'OPPONENT TURN':'AI TURN';
  // Mode badge
  const modeEl=document.getElementById('mode-label');
  if(modeEl){
    if(window.Online?.isOnline){
      modeEl.textContent=Online.isHost?'🌐 Online (Host)':'🌐 Online (Guest)';
      modeEl.style.cssText='font-size:10px;padding:2px 8px;background:#052e16;border:1px solid #16a34a;border-radius:4px;color:#4ade80';
    } else {
      modeEl.textContent='🤖 VS AI';
      modeEl.style.cssText='font-size:10px;padding:2px 8px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#64748b';
    }
  }
  document.getElementById('phase-label').textContent=
    isOpponentTurn?opponentLabel:{draw:'DRAW',main:'MAIN',discard:'DISCARD',battle:'BATTLE',main2:'MAIN2',end:'END'}[phase]||phase;
  if(activeFusion){
    const staged=typeof pendingFusionMaterials!=='undefined'&&pendingFusionMaterials.length;
    document.getElementById('phase-label').textContent=staged?`⚡ FUSION (${staged})` :'⚡ FUSION';
  }
  if(activeSkill)document.getElementById('phase-label').textContent='✦ SKILL';
  if(activeMystic)document.getElementById('phase-label').textContent='✦ MYSTIC';

  // Controls phase label
  const cp=document.getElementById('controls-phase');
  if(isOpponentTurn){cp.textContent=opponentLabel;cp.style.color='#ef4444';}
  else if(activeFusion){
    const staged=typeof pendingFusionMaterials!=='undefined'&&pendingFusionMaterials.length;
    cp.textContent=staged?`⚡ FUSION — เลือกแล้ว ${staged} ใบ`:'⚡ FUSION — เลือก Material';
    cp.style.color='#a78bfa';
  }
  else if(activeSkill){cp.textContent='✦ SKILL';cp.style.color='#34d399';}
  else if(activeMystic){cp.textContent='✦ MYSTIC — เลือก Seal';cp.style.color='#a78bfa';}
  else if(activeHandDiscard){cp.textContent='✦ INTERFERE — เลือกทิ้ง';cp.style.color='#f97316';}
  else if(handTargetMode){cp.textContent='🎯 HAND TARGET';cp.style.color='#ef4444';}
  else if(phase==='main'){cp.textContent='MAIN PHASE';cp.style.color='#34d399';}
  else if(phase==='discard'){
    const combined=pL.hand.length+(pL.mysticHand||[]).length;
    const effCombMax=getEffectiveCombinedMax(lpi);
    cp.textContent=`DISCARD STEP — ทิ้ง ${combined-effCombMax} ใบ (รวม ${combined}/${effCombMax})`;
    cp.style.color='#f97316';
  }
  else if(phase==='main2'){cp.textContent='MAIN PHASE 2';cp.style.color='#6ee7b7';}
  else if(phase==='battle'){cp.textContent='BATTLE PHASE';cp.style.color='#f87171';}
  else{cp.textContent=phase.toUpperCase();cp.style.color='#9ca3af';}

  // Attack button
  const myTurn=G.currentPlayer===lpi&&!pendingCb;
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
  btnNext.disabled=!myTurn||phase==='discard'||fusionMode||!!guestFusionMainFC;
  if(phase==='battle'){btnNext.textContent='✓ End Battle';btnNext.className=myTurn?'btn btn-blue':'btn btn-gray';}
  else if(phase==='main2'){btnNext.textContent='⏹ End Turn';btnNext.className=myTurn?'btn btn-red':'btn btn-gray';}
  else{btnNext.textContent='▶ Next Phase';btnNext.className='btn btn-gray';}
  document.getElementById('btn-cancel').style.display=(attackerSeal||pendingDeploy||fusionMode||handTargetMode||skillMode||handDiscardMode||mysticPlayMode||sacrificeTargetMode||guestFusionMainFC||guestSkillMode||guestMysticPlayMode||guestHandDiscardMode)?'inline-block':'none';
  const btnCF=document.getElementById('btn-confirm-fusion');
  if(btnCF){
    const hasPending=typeof pendingFusionMaterials!=='undefined'&&pendingFusionMaterials.length>0;
    btnCF.style.display=(fusionMode&&hasPending)?'inline-block':'none';
    btnCF.disabled=fusionMode&&hasPending&&typeof checkPendingFusionValid==='function'&&!checkPendingFusionValid();
  }
  // Action queue controls
  const btnProceed=document.getElementById('btn-proceed');
  if(btnProceed)btnProceed.disabled=!!(handDiscardMode||guestHandDiscardMode);
  const btnAqCancel=document.getElementById('btn-aq-cancel');
  if(btnAqCancel)btnAqCancel.style.display=(handDiscardMode||guestHandDiscardMode)?'inline-block':'none';

  // Remote player's hand display (face-down card backs)
  const aiHandDiv=document.getElementById('ai-hand-display');
  aiHandDiv.innerHTML='';
  pR.hand.forEach((_c,i)=>{
    const img=document.createElement('img');
    img.src='cardback/seal.jpg';
    img.className='ai-hcard'+(handTargetMode&&lpi===0?' htarget':'');
    img.title=handTargetMode&&lpi===0?'คลิกเพื่อโจมตีการ์ดในมือ':'card in opponent hand';
    if(handTargetMode&&lpi===0)img.onclick=()=>clickAIHandCard(i);
    aiHandDiv.appendChild(img);
  });
  (pR.mysticHand||[]).forEach((_mc,i)=>{
    const img=document.createElement('img');
    img.src='cardback/mystic.jpg';
    img.className='ai-hcard'+(handTargetMode&&lpi===0?' htarget':'');
    img.title=handTargetMode&&lpi===0?'คลิกเพื่อโจมตี Mystic ในมือ':'mystic card in opponent hand';
    if(handTargetMode&&lpi===0)img.onclick=()=>clickAIHandMystic(i);
    else img.style.opacity='0.8';
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
      row.onclick=()=>openMysticViewer(c);
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

function showShrineModal(lpi){
  const p=G.players[lpi];
  document.getElementById('fa-title').textContent=`⚰ Shrine (${p.shrine.length}/${MAX_SHRINE})`;
  const opts=document.getElementById('fa-opts');
  opts.innerHTML='';
  if(!p.shrine.length){
    const d=document.createElement('div');
    d.textContent='Shrine ว่างเปล่า';
    d.style.cssText='color:#9ca3af;font-size:11px;padding:8px 0';
    opts.appendChild(d);
  }
  p.shrine.forEach(c=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;border-radius:4px';
    row.onmouseenter=()=>row.style.background='#374151';
    row.onmouseleave=()=>row.style.background='';
    const ec=EL_COLOR[c.el]||'#fff';
    row.innerHTML=`<img src="${c.img}" style="width:28px;height:38px;object-fit:cover;border-radius:2px;flex-shrink:0"><div style="font-size:9px;line-height:1.5"><div style="font-weight:bold;color:#f9fafb">${c.name}</div><div>Lv${c.lv} <span style="color:${ec}">◆${c.el[0].toUpperCase()}</span> ${c.tribe} | At${c.at} Df${c.df}</div></div>`;
    row.onclick=()=>openCardViewer(c);
    opts.appendChild(row);
  });
  // Phoenix interfere: only when AQ window is open (pendingCb set = host/offline)
  if(pendingCb && p.shrine.some(c=>c.id===78) && p.mp>=2){
    const btn=addFAOpt('🔥 [Interfere] ลง Phoenix จาก Shrine (Mp 2)',()=>{
      closeFAModal();
      executePhoenixInterfere();
    });
    btn.style.cssText='background:#7c2d12;color:#fed7aa;border-color:#ea580c';
  }
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
        const dur=c.fromPS?'(ติดตาม PS)':Math.max(1,Math.ceil((c.expiresAtSubTurn-subTurnNum)/2))+' Turn เหลือ';
        return `<div>${cNames[c.type]||c.type} Curse — ${dur}</div>`;
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

function mysticCardEl(mysticCard,idx,pi=0){
  const div=document.createElement('div');
  div.className='mystic-card';
  const isGuest=window.Online?.isOnline&&!Online.isHost&&pi===1;
  const p=G.players[pi];
  const inMainPhase=(phase==='main'||phase==='main2')&&G.currentPlayer===pi;
  const inInterfere=!!pendingCb;
  const canPlay=p.mp>=mysticCard.mc&&(inMainPhase||(mysticCard.interfere&&inInterfere));
  if(canPlay)div.classList.add('playable');
  const activeSel=isGuest?(guestMysticPlayMode&&guestMysticPlayMode.mysticIdx===idx):(mysticPlayMode&&mysticPlayMode.mysticIdx===idx);
  if(activeSel)div.classList.add('mystic-sel');
  div.innerHTML=`
    <div class="mystic-type-badge">${mysticCard.pasted}${mysticCard.interfere?'⚡':''}</div>
    <img src="${mysticCard.img}" alt="${mysticCard.name}" onerror="this.src='cardback/mystic.jpg'">
    <div class="mystic-card-info">
      <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold">${mysticCard.name}</div>
      <div style="color:#6d28d9">Mp:${mysticCard.mc} ${mysticCard.turns===999?'∞':mysticCard.turns+'T'}</div>
    </div>
  `;
  const mysticOverLimit=phase==='discard'&&p.hand.length+(p.mysticHand||[]).length>getEffectiveCombinedMax(pi);
  if(mysticOverLimit)div.classList.add('discard-sel');
  div.onclick=()=>{
    if(mysticOverLimit){
      if(isGuest){Online.sendGuestAction({action:'guestDiscardMystic',mysticIdx:idx});}
      else{doForcedDiscardMystic(idx);}
      return;
    }
    updatePlayerPreviewMystic(mysticCard);
    if(canPlay){
      if(isGuest){guestShowMysticAction(mysticCard,idx);}
      else{showMysticAction(mysticCard,idx);}
    } else {
      openMysticViewer(mysticCard);
    }
  };
  div.ondblclick=e=>{e.stopPropagation();openMysticViewer(mysticCard);};
  if(canPlay&&!isGuest){
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
    tip.innerHTML=`<b style="color:#a78bfa">${mysticCard.name}</b><br>${mysticCard.pasted}${mysticCard.interfere?' ⚡Interfere':''}<br>Mp:${mysticCard.mc} | ${mysticCard.turns===999?'∞':mysticCard.turns+'T'}<br>${(mysticCard.ability_text||[]).join('<br>')}${exTxt.length?'<br><span style="color:#f87171">'+exTxt.join(' | ')+'</span>':''}`;
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
  document.getElementById('cv-stats').innerHTML=`<span style="color:#38bdf8">Mp ${m.mc}</span> &nbsp; <span style="color:#a78bfa">Turns: ${m.turns===999?'∞':m.turns}</span>`;
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
  document.getElementById('cv-skill').innerHTML='';
  document.getElementById('cv-ability').innerHTML='';
  document.getElementById('card-viewer').style.display='flex';
}

// ══════════════════════════════════════════════
// LOG
// ══════════════════════════════════════════════
function logErr(msg){log(msg,'bad');playSound('Error');}

// Build sorted name→card lookup (longest names first to avoid partial matches)
let _logCardMap=null;
function _getLogCardMap(){
  if(_logCardMap)return _logCardMap;
  _logCardMap=[];
  if(typeof CARD_DB!=='undefined')CARD_DB.forEach(c=>{if(c.name)_logCardMap.push({id:c.id,name:c.name,type:'seal',card:c});});
  if(typeof MYSTIC_DB!=='undefined')MYSTIC_DB.forEach(c=>{if(c.name)_logCardMap.push({id:c.id,name:c.name,type:'mystic',card:c});});
  _logCardMap.sort((a,b)=>b.name.length-a.name.length);
  return _logCardMap;
}
// Invalidate cache when DB loads
function _resetLogCardMap(){_logCardMap=null;}

function _linkifyLog(text){
  // Escape HTML special chars first
  let s=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const map=_getLogCardMap();
  // Use a placeholder strategy to avoid re-replacing already-replaced spans
  const marks=[];
  for(const {id,name,type} of map){
    if(name.length<2)continue;
    const esc=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    s=s.replace(new RegExp(esc,'g'),m=>{
      const idx=marks.length;
      marks.push(`<span class="log-card-link" data-cid="${id}" data-ctype="${type}">${name}</span>`);
      return `\x00${idx}\x00`;
    });
  }
  // Restore placeholders
  s=s.replace(/\x00(\d+)\x00/g,(_,i)=>marks[parseInt(i)]);
  return s;
}

function _showLogCardPopup(cid,ctype,clientX,clientY){
  const db=ctype==='seal'?CARD_DB:MYSTIC_DB;
  const card=(db||[]).find(c=>c.id===parseInt(cid));
  if(!card)return;
  const pop=document.getElementById('log-card-popup');
  const el=card.el||'';
  const elColor={'fire':'#f87171','water':'#38bdf8','earth':'#86efac','wind':'#a3e635','light':'#fde68a','darkness':'#c084fc','neutral':'#9ca3af'}[el]||'#e5e7eb';
  let info=`<b style="color:#c4b5fd">${card.name}</b><br>`;
  if(card.lv)info+=`Lv${card.lv}`;
  if(el)info+=` · <span style="color:${elColor}">${el}</span>`;
  if(card.tribe)info+=` · ${card.tribe}`;
  if(ctype==='seal')info+=`<br>At:${card.at} Df:${card.df} Sp:${card.sp??'-'} Mc:${card.mc}`;
  else info+=`<br>Mc:${card.mc}`;
  (card.ability_text||[]).forEach(t=>{info+=`<br><span style="color:#fbbf24;font-size:9px">${t}</span>`;});
  (card.skill_text||[]).forEach(t=>{info+=`<br><span style="color:#34d399;font-size:9px">${t}</span>`;});
  pop.innerHTML=`<img src="${card.img||''}" onerror="this.style.display='none'"><div class="lcp-info">${info}</div>`;
  pop.style.display='block';
  const W=window.innerWidth,H=window.innerHeight,pw=190,ph=Math.min(320,pop.scrollHeight||300);
  let px=clientX+14,py=clientY-20;
  if(px+pw>W)px=clientX-pw-4;
  if(py+ph>H)py=H-ph-4;
  if(py<4)py=4;
  pop.style.left=px+'px';pop.style.top=py+'px';
}

function log(msg,type=''){
  const box=document.getElementById('log');
  const d=document.createElement('div');
  d.className='log-line'+(type?' '+type:'');
  d.innerHTML=_linkifyLog(msg);
  box.prepend(d);
  while(box.children.length>30)box.removeChild(box.lastChild);
  // Buffer for online host so guest can replay the same log messages
  if(window.Online?.isOnline&&Online.isHost&&typeof _hostLogBuffer!=='undefined'){
    _hostLogBuffer.push({msg,type});
  }
}

// Log card link click → popup
document.getElementById('log').addEventListener('click',e=>{
  const link=e.target.closest('.log-card-link');
  if(!link){document.getElementById('log-card-popup').style.display='none';return;}
  e.stopPropagation();
  _showLogCardPopup(link.dataset.cid,link.dataset.ctype,e.clientX,e.clientY);
});
document.addEventListener('click',()=>{
  const pop=document.getElementById('log-card-popup');
  if(pop)pop.style.display='none';
});

// Right-click to cancel active selection modes
document.addEventListener('contextmenu',e=>{
  if(sacrificeTargetMode){
    e.preventDefault();
    sacrificeTargetMode=null;render();
  } else if(mysticPlayMode){
    e.preventDefault();
    mysticPlayMode=null;render();
  } else if(handDiscardMode){
    e.preventDefault();
    handDiscardMode=null;render();
  } else if(skillMode){
    e.preventDefault();
    cancelAction();
  } else if(guestMysticPlayMode){
    e.preventDefault();
    Online.sendGuestAction({action:'guestCancelMysticPS'});
    guestMysticPlayMode=null;render();
  } else if(guestHandDiscardMode){
    e.preventDefault();
    guestHandDiscardMode=null;render();
  } else if(guestSkillMode){
    e.preventDefault();
    Online.sendGuestAction({action:'guestCancelSkill'});
    guestSkillMode=null;render();
  } else if(guestFusionMainFC){
    e.preventDefault();
    Online.sendGuestAction({action:'guestCancelFusion'});
    guestFusionMainFC=null;render();
  }
});

// ══════════════════════════════════════════════
// BUTTON SOUND
// ══════════════════════════════════════════════
document.addEventListener('click',function(e){
  const el=e.target.closest('#controls button');
  if(el&&typeof playSound==='function'&&el.id!=='btn-atk'&&el.id!=='btn-cancel')playSound('Confirm');
},{capture:true});

// ══════════════════════════════════════════════
// START
// ══════════════════════════════════════════════
loadMysticDB()
  .then(()=>loadCardDB())
  .then(()=>{
    _resetLogCardMap();
    const isOnlineMode=new URLSearchParams(location.search).get('mode')==='online';
    if(isOnlineMode){
      const lobby=document.getElementById('online-lobby');
      if(lobby)lobby.style.display='flex';
      // Guest: wait for host to broadcast initial state (no initGame call)
      // Host: doStartOnlineGame() calls initGameOnline() after guest connects
    } else {
      initGame();
    }
  })
  .catch(err=>{
    console.warn('JSON load failed, using fallback:',err);
    CARD_DB=_CARD_DB_FALLBACK;
    _resetLogCardMap();
    const isOnlineMode=new URLSearchParams(location.search).get('mode')==='online';
    if(isOnlineMode){
      const lobby=document.getElementById('online-lobby');
      if(lobby)lobby.style.display='flex';
    } else {
      initGame();
    }
  });
