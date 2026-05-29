// SKILL SYSTEM
// ══════════════════════════════════════════════
// Re-validates that a skill is still available after potential state changes (e.g. Thunder Bolt unfuse during AQ)
function _skillStillValid(fc, skill){
  return getCardSkills(fc).some(s=>s.effect===skill.effect);
}
function isOnAtLine(fc){
  return G.players[0].atLine.some(x=>x.uid===fc.uid)||G.players[1].atLine.some(x=>x.uid===fc.uid);
}
function getCardSkills(fc){
  return _getCardSkillsRaw(fc).map(s=>{
    const red=getMysticMaReduction(fc);
    return red>0?{...s,mp:Math.max(0,s.mp-red)}:s;
  });
}
function _getCardSkillsRaw(fc){
  // helper: detect which player owns this fc (0=host, 1=guest/AI)
  const ownerPi=findFCOwner(fc)?.pi??0;
  const p=G.players[ownerPi];
  const opp=G.players[1-ownerPi];

  // ── Golden Horn Unicorn (id=2): heal all Curses from 1 Seal ──
  if(fc.card.id===2){
    return [{
      label:'✦ [Skill] รักษา Curse ทุกชนิด 1 Seal (Mp 1)',
      mp:1, type:'fieldTarget', effect:'healCurse',
      filter:t=>t.curses?.length>0
    }];
  }
  // ── Punishula (id=5): destroy 1 Evil Seal in field (At Line) ──
  if(fc.card.id===5){
    if(isOnAtLine(fc)){
      return [{
        label:'✦ [Skill] ทำลาย [Evil] 1 ใบในสนาม (Mp 3)',
        mp:3, type:'fieldTarget', effect:'destroyTarget',
        filter:t=>t.card.tribe==='Evil'
      }];
    }
    return[];
  }
  // ── Infernos (id=6): Last Dance Curse At+2 / 2 Turn — fused with Dark + At Line ──
  if(fc.card.id===6){
    const fusedWithDark=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness'))||fc.willMind||fc.magicalEl==='darkness';
    if(fusedWithDark&&isOnAtLine(fc)){
      return [{
        label:'✦ [Skill] Last Dance Curse At+2 / 2 Turn (Mp 2)',
        mp:2, type:'fieldTarget', effect:'lastDanceCurse', atBonus:2, turns:2,
        filter:t=>[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance')
      }];
    }
    return[];
  }
  // ── Desert Chimera (id=7): Poison Curse 3 Turn — fused + At Line ──
  if(fc.card.id===7){
    if((fc.fused||fc.willMind||_isThunderiaFused(fc))&&isOnAtLine(fc)){
      return [{
        label:'✦ [Skill] ติด Poison Curse 3 Turn บน Seal ศัตรู (Mp 2)',
        mp:2, type:'fieldTarget', effect:'poisonCurse', turns:3,
        filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&!t.curses?.some(c=>c.type==='poison')
      }];
    }
    return[];
  }
  // ── Ghost Ship (id=16): return self to deck + shuffle — Double Combination (1 material) ──
  if(fc.card.id===16){
    if((fc.fused&&fc.fusionStack.length>=1)||fc.willMind||_isThunderiaFused(fc)){
      return [{
        label:'✦ [Skill] คืน Ghost Ship สู่กอง + สลับ (Mp 0)',
        mp:0, type:'selfSkill', effect:'returnSelfToDeck'
      }];
    }
    return[];
  }
  // ── Cockatrice (id=11): Stone Curse 1 Turn — fused ──
  if(fc.card.id===11){
    if(fc.fused||fc.willMind||_isThunderiaFused(fc)){
      return [{
        label:'✦ [Skill] ติด Stone Curse 1 Turn (Mp 2)',
        mp:2, type:'fieldTarget', effect:'stoneCurse', turns:1,
        filter:t=>[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='stone')
      }];
    }
    return[];
  }
  // ── Jiu Wei Hu Le (id=12): Charm Curse 3 Turn — fused with Dark ──
  if(fc.card.id===12){
    const fusedWithDark=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness'))||fc.willMind||fc.magicalEl==='darkness';
    if(fusedWithDark){
      return [{
        label:'✦ [Skill] ติด Charm Curse 3 Turn บน Seal ศัตรู (Mp 2)',
        mp:2, type:'fieldTarget', effect:'charmCurse', turns:3,
        filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='charm')
      }];
    }
    return[];
  }
  // ── Armadillon (id=15): Freeze Curse 1 Turn — fused + At Line ──
  if(fc.card.id===15){
    if((fc.fused||fc.willMind||_isThunderiaFused(fc))&&isOnAtLine(fc)){
      return [{
        label:'✦ [Skill] ติด Freeze Curse 1 Turn (Mp 2)',
        mp:2, type:'fieldTarget', effect:'freezeCurse', turns:1,
        filter:t=>[2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='freeze')
      }];
    }
    return[];
  }
  // ── Assassin Doll (id=46): Death Curse on lowest-At enemy — At Line, 2+ enemy Seals ──
  if(fc.card.id===46){
    const allEnemy=[...opp.atLine,...opp.dfLine];
    if(isOnAtLine(fc)&&allEnemy.length>=2){
      const minAt=Math.min(...allEnemy.map(x=>getEffectiveAt(x)));
      return [{
        label:'✦ [Skill] Death Curse บน Seal At น้อยสุดของศัตรู (Mp 2)',
        mp:2, type:'fieldTarget', effect:'deathCurse',
        filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&getEffectiveAt(t)===minAt
      }];
    }
    return[];
  }
  // ── Delta-D (id=22): draw 1 card — Df Line, Mp 3 ──
  if(fc.card.id===22){
    if(p.dfLine.some(x=>x.uid===fc.uid)){
      return [{label:'✦ [Skill] จั่วการ์ด 1 ใบ (Seal/Mystic) (Mp 3)',mp:3,type:'selfSkill',effect:'drawCardChoice'}];
    }
    return[];
  }
  // ── Banshee (id=28): Death Curse Sp 1-3 — fused+Dark+At Line, Mp 3 ──
  if(fc.card.id===28){
    const fusedWithDark=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness'))||fc.willMind||fc.magicalEl==='darkness';
    if(fusedWithDark&&isOnAtLine(fc)){
      return [{
        label:'✦ [Skill] Death Curse บน Seal Sp 1-3 ของศัตรู (Mp 3)',
        mp:3, type:'fieldTarget', effect:'deathCurse',
        filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&[1,2,3].includes(t.card.sp)
      }];
    }
    return[];
  }
  // ── Mysterious Elephant (id=42): Poison 1 Turn Sp 2-5 — fused+At Line, Mp 3 ──
  if(fc.card.id===42){
    if((fc.fused||fc.willMind||_isThunderiaFused(fc))&&isOnAtLine(fc)){
      return [{
        label:'✦ [Skill] ติด Poison Curse 1 Turn บน Seal Sp 2-5 (Mp 3)',
        mp:3, type:'fieldTarget', effect:'poisonCurse', turns:1,
        filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&[2,3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison')
      }];
    }
    return[];
  }
  // ── Blue Wings Pegasus (id=47): deploy Beast from hand — Mp 2 ──
  if(fc.card.id===47){
    const hasBeast=p.hand.some(c=>c.tribe==='Beast');
    if(hasBeast){
      return [{label:'✦ [Skill] นำ [Beast] 1 ใบจากมือเข้าสนาม (Mp 2)',mp:2,type:'handPickBeast',effect:'handPickBeast'}];
    }
    return[];
  }
  // ── Hydra of Warok (id=50): Poison 2 Turn Sp 3-5 — fused+At Line, Mp 2 ──
  if(fc.card.id===50){
    if((fc.fused||fc.willMind||_isThunderiaFused(fc))&&isOnAtLine(fc)){
      return [{
        label:'✦ [Skill] ติด Poison Curse 2 Turn บน Seal Sp 3-5 (Mp 2)',
        mp:2, type:'fieldTarget', effect:'poisonCurse', turns:2,
        filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison')
      }];
    }
    return[];
  }
  // ── Gale Garuda (id=53): interfere deploy+attack during AI fusion — Mp 4 ──
  if(fc.card.id===53){
    return [{
      label:'✦ [Skill/Interfere] ลงสนาม+โจมตี Seal ที่กำลังรวมร่าง (Mp 4)',
      mp:4, type:'garudaInterfere', interfere:false
    }];
  }
  // ── Zalom's Rider (id=87): +At 1 any own seal, 1 subturn, Mp 1 ──
  if(fc.card.id===87){
    return [{
      label:'✦ [Skill] Seal ใบใด +At 1 จนจบ Subturn (Mp 1)',
      mp:1, type:'fieldTarget', effect:'atBoost1SubTurn',
      filter:t=>[...p.atLine,...p.dfLine].some(x=>x.uid===t.uid)
    }];
  }
  // ── Blue Wind Griffin (id=59): +Sp 1 any seal, 1 subturn, Interfere, Mp 2 ──
  if(fc.card.id===59){
    return [{
      label:'✦ [Skill/Interfere] Seal ใบใด +Sp 1 จนจบ Subturn (Mp 2)',
      mp:2, type:'fieldTarget', effect:'spBoost1SubTurn', interfere:false
    }];
  }
  // ── Jormungand (id=84): Freeze Curse ALL enemy 1 Turn — fused+water+At Line, Mp 4 ──
  if(fc.card.id===84){
    if(((fc.fused&&fc.fusionStack.some(m=>m.card.el==='water'))||fc.willMind||fc.magicalEl==='water')&&isOnAtLine(fc)){
      return [{label:'✦ [Skill] Freeze Curse (ALL) ศัตรู 1 Turn (Mp 4)',mp:4,type:'selfSkill',effect:'freezeAll'}];
    }
    return[];
  }
  // ── Yggdrasil (id=77): retrieve seal from shrine to hand when fused, Mp 3 ──
  if(fc.card.id===77){
    if((fc.fused||fc.willMind||_isThunderiaFused(fc))&&p.shrine.length>0){
      return [{label:'✦ [Skill] หยิบ Seal จาก Shrine ขึ้นมือ (Mp 3)',mp:3,type:'selfSkill',effect:'shrineToHand'}];
    }
    return[];
  }
  // ── Alana Princess Cups (id=93): pick frozen seal → hand, At Line, Mp 1 ──
  if(fc.card.id===93){
    const frozen=[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine].filter(x=>x.curses?.some(c=>c.type==='freeze'));
    if(isOnAtLine(fc)&&frozen.length>0){
      return [{
        label:'✦ [Skill] นำ Seal ที่ Freeze Curse ขึ้นมือ (Mp 1)',
        mp:1, type:'fieldTarget', effect:'frozenToHand',
        filter:t=>t.curses?.some(c=>c.type==='freeze')
      }];
    }
    return[];
  }
  // ── Regina Princess Swords (id=94): all own seals move to At Line, fused+wind+At Line, Mp 1 ──
  if(fc.card.id===94){
    const fusedWithWind=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='wind'))||fc.willMind||fc.magicalEl==='wind';
    if(fusedWithWind&&isOnAtLine(fc)){
      return [{label:'✦ [Skill] Seal ทุกใบย้ายไป At Line (Mp 1)',mp:1,type:'selfSkill',effect:'allToAtLine'}];
    }
    return[];
  }
  // ── Wanaan Princess Pentacles (id=95): Interfere Df boost = mc, 1 subturn, Mp 2 ──
  if(fc.card.id===95){
    return [{
      label:'✦ [Skill/Interfere] Seal ใบใด +Df ตาม Mp ค่าร่ายจนจบ Subturn (Mp 2)',
      mp:2, type:'fieldTarget', effect:'dfBoostMc', interfere:false,
      filter:t=>[...p.atLine,...p.dfLine].some(x=>x.uid===t.uid)
    }];
  }
  // ── Blaze Sage (id=74): Sacrifice own seal → another own seal +At=mc for 1 turn, Mp 2 ──
  if(fc.card.id===74){
    const ownField=[...p.atLine,...p.dfLine];
    if(ownField.length>=2){
      return [{
        label:'✦ [Skill] Sacrifice Seal → Seal อื่น +At ตาม Mc 1 Turn (Mp 2)',
        mp:2, type:'fieldTarget', effect:'sacrificeStep1',
        filter:t=>[...p.atLine,...p.dfLine].some(x=>x.uid===t.uid)&&t.uid!==fc.uid
      }];
    }
    return[];
  }
  // ── Wool Wyvern (id=80): Interfere deploy from hand, Mp 4 ──
  if(fc.card.id===80){
    return [{label:'✦ [Skill/Interfere] ลง Wool Wyvern จากมือ (Mp 4)',mp:4,type:'garudaInterfere',interfere:false}];
  }
  // ── Phoenix (id=78): Interfere deploy from shrine (one-time), Mp 2 ──
  if(fc.card.id===78){
    return [{label:'✦ [Skill/Interfere] ลง Phoenix จาก Shrine (Mp 2)',mp:2,type:'phoenixInterfere',interfere:false}];
  }
  if(fc.card.id===3){
    const skills=[{
      label:'✦ [Skill] ส่ง [Dark] ในสนามคืนกอง (Mp 2)',
      mp:2, type:'fieldTarget',
      filter:t=>t.card.el==='darkness'
    }];
    if(fc.fused){
      skills.push({
        label:'✦ [Skill+] ส่ง [Dark]/[Evil] ในสนามคืนกอง (Mp 2)',
        mp:2, type:'fieldTarget',
        filter:t=>t.card.el==='darkness'||t.card.tribe==='Evil'
      });
    }
    return skills;
  }
  if(fc.card.id===85){
    return [{
      label:'✦ [Skill/Interfere] ทิ้ง Seal ในมือ → Tiamat +At 1 Turn (Mp 2)',
      mp:2, type:'handDiscard', interfere:true
    }];
  }
  // ── Angel of Sword (id=20): return self to hand, Mp 3 — always available ──
  if(fc.card.id===20){
    return [{label:'✦ [Skill] นำ Angel of Sword ขึ้นมือ (Mp 3)',mp:3,type:'selfSkill',effect:'returnSelfToHand'}];
  }
  // ── Titania (id=54): destroy 1 mystic on field — fused+Light, Mp 2 ──
  if(fc.card.id===54){
    const fusedWithLight=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='light'))||fc.willMind||fc.magicalEl==='light';
    if(fusedWithLight){
      const allField=[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];
      if(allField.some(t=>getActiveMystics(t).length>0)){
        return [{
          label:'✦ [Skill] ทำลาย Mystic Card 1 ใบในสนาม (Mp 2)',
          mp:2, type:'fieldTarget', effect:'destroyOneMystic',
          filter:t=>getActiveMystics(t).length>0
        }];
      }
    }
    return[];
  }
  // ── Sphinx (id=65): mass reset — all seals to deck, redeploy from hand — fused+Light+AtLine, Mp 4 ──
  if(fc.card.id===65){
    const fusedWithLight=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='light'))||fc.willMind||fc.magicalEl==='light';
    if(fusedWithLight&&isOnAtLine(fc)){
      return [{label:'✦ [Skill] Reset สนาม — Seal ทุกใบกลับกอง จากนั้นทุกคนวางจากมือ (Mp 4)',mp:4,type:'selfSkill',effect:'massReset'}];
    }
    return[];
  }
  // ── Black Wiser (id=41): Interfere Mp drain ──
  if(fc.card.id===41){
    const skills=[];
    skills.push({label:'✦ [Skill/Interfere] ฝ่ายตรงข้าม Mp -1 (Mp 2)',mp:2,type:'selfSkill',effect:'opponentMpDrain',drainAmt:1,interfere:true});
    const fusedWithHellish=(fc.fused&&fc.fusionStack.some(m=>m.card.id===44))||fc.willMind;
    if(fusedWithHellish)skills.push({label:'✦ [Skill/Interfere] ฝ่ายตรงข้าม Mp -2 (รวมกับ Hellish Bird) (Mp 3)',mp:3,type:'selfSkill',effect:'opponentMpDrain',drainAmt:2,interfere:true});
    return skills;
  }
  // ── Hellish Bird (id=44): Last Dance Curse At+2/3T (Dark) or At+3/2T (Black Wiser) — At Line ──
  if(fc.card.id===44){
    const skills=[];
    const fusedWithBW=(fc.fused&&fc.fusionStack.some(m=>m.card.id===41))||fc.willMind;
    const fusedWithDark=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness'))||fc.willMind||fc.magicalEl==='darkness';
    if(fusedWithBW&&isOnAtLine(fc))skills.push({label:'✦ [Skill] Last Dance Curse At+3 / 2 Turn (Black Wiser) (Mp 3)',mp:3,type:'fieldTarget',effect:'lastDanceCurse',atBonus:3,turns:2,filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance')});
    if(fusedWithDark&&isOnAtLine(fc))skills.push({label:'✦ [Skill] Last Dance Curse At+2 / 3 Turn (Dark) (Mp 2)',mp:2,type:'fieldTarget',effect:'lastDanceCurse',atBonus:2,turns:3,filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='lastDance')});
    return skills;
  }
  // ── Succubus (id=45): Charm Curse 1 Turn — fused + At Line, non-Light ──
  if(fc.card.id===45){
    if((fc.fused||fc.willMind||_isThunderiaFused(fc))&&isOnAtLine(fc))return[{label:'✦ [Skill] Charm Curse 1 Turn — Seal ที่ไม่ใช่ [Light] (Mp 2)',mp:2,type:'fieldTarget',effect:'charmCurse',turns:1,filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&t.card.el!=='light'&&!t.curses?.some(c=>c.type==='charm')}];
    return[];
  }
  // ── Medusa (id=48): Stone ∞ (Earth,Mp3) or Poison 3T (Water,Mp2) — fused ──
  if(fc.card.id===48){
    const skills=[];
    const fusedWithEarth=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='earth'))||fc.willMind||fc.magicalEl==='earth';
    const fusedWithWater=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='water'))||fc.willMind||fc.magicalEl==='water';
    const allField=[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];
    if(fusedWithEarth)skills.push({label:'✦ [Skill] Stone Curse ∞ — Seal Sp 1-4 (Mp 3)',mp:3,type:'fieldTarget',effect:'stoneCurse',turns:Infinity,filter:t=>allField.some(x=>x.uid===t.uid)&&t.uid!==fc.uid&&[1,2,3,4].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='stone')});
    if(fusedWithWater)skills.push({label:'✦ [Skill] Poison Curse 3 Turn — Seal Sp 1-3 (Mp 2)',mp:2,type:'fieldTarget',effect:'poisonCurse',turns:3,filter:t=>allField.some(x=>x.uid===t.uid)&&t.uid!==fc.uid&&[1,2,3].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='poison')});
    return skills;
  }
  // ── Siren (id=58): Charm Curse 2 Turn — fused+Dark+At Line, Sp 3-5 ──
  if(fc.card.id===58){
    const fusedWithDark=(fc.fused&&fc.fusionStack.some(m=>m.card.el==='darkness'))||fc.willMind||fc.magicalEl==='darkness';
    if(fusedWithDark&&isOnAtLine(fc))return[{label:'✦ [Skill] Charm Curse 2 Turn — Seal ศัตรู Sp 3-5 (Mp 2)',mp:2,type:'fieldTarget',effect:'charmCurse',turns:2,filter:t=>[...opp.atLine,...opp.dfLine].some(x=>x.uid===t.uid)&&[3,4,5].includes(t.card.sp)&&!t.curses?.some(c=>c.type==='charm')}];
    return[];
  }
  // ── Harison, Knight of Pentacles (id=88): destroy Stone-cursed Seal — At Line, Mp 3 ──
  if(fc.card.id===88){
    const allField=[...G.players[0].atLine,...G.players[0].dfLine,...G.players[1].atLine,...G.players[1].dfLine];
    if(isOnAtLine(fc)&&allField.some(t=>t.uid!==fc.uid&&t.curses?.some(c=>c.type==='stone')))return[{label:'✦ [Skill] ทำลาย Seal ที่ติด Stone Curse (Mp 3)',mp:3,type:'fieldTarget',effect:'destroyTarget',filter:t=>t.uid!==fc.uid&&t.curses?.some(c=>c.type==='stone')}];
    return[];
  }
  // ── Zadin, Knight of Wands (id=91): Dragon Strike ×2 At=8 — fused+Dragon+At Line, Mp 4 ──
  if(fc.card.id===91){
    const fusedWithDragon=(fc.fused&&fc.fusionStack.some(m=>m.card.tribe==='Dragon'))||fc.willMind;
    if(fusedWithDragon&&isOnAtLine(fc)&&[...opp.atLine,...opp.dfLine].length>0)return[{label:'✦ [Skill] Dragon Strike ×2 At=8 (Mp 4)',mp:4,type:'selfSkill',effect:'zadinDoubleAttack'}];
    return[];
  }
  return[];
}

function isSkillTarget(fc){
  if(!skillMode)return false;
  if(fc.uid===skillMode.fc.uid)return false;
  if(skillMode.skillIdx===-99){
    // Blaze Sage step 2: any own seal (excluding the skill caster which was already removed)
    return pendingSacrifice&&[...G.players[0].atLine,...G.players[0].dfLine].some(x=>x.uid===fc.uid);
  }
  const skills=getCardSkills(skillMode.fc);
  const skill=skills[skillMode.skillIdx];
  if(!skill)return false;
  return skill.filter(fc);
}

function startSkillMode(fc,skillIdx){
  skillMode={fc,skillIdx};
  broadcastSound('Skill');
  log(`${fc.card.name} — เลือกเป้าหมายสกิล (คลิก ${getCardSkills(fc)[skillIdx]?.label||'Skill'})`,'hi');
  render();
}

function getInterfereSkills(){
  const p=G.players[0];
  const charmedEnemy=[...G.players[1].atLine,...G.players[1].dfLine].filter(fc=>fc.charmed);
  return [...p.atLine,...p.dfLine,...charmedEnemy].flatMap(fc=>{
    if(fc.hasUsedSkill||fc.exhausted)return[];
    return getCardSkills(fc)
      .map((skill,idx)=>({fc,skillIdx:idx,skill}))
      .filter(({skill})=>skill.interfere&&p.mp>=skill.mp&&(skill.type!=='handDiscard'||p.hand.length>0));
  });
}

function cancelHandDiscard(){
  handDiscardMode=null;
  handPickMode=null;
  render();
}

function executeHandPickBeast(card,idx){
  if(!handPickMode)return;
  const {fc,skillIdx}=handPickMode;
  const p=G.players[0];
  const skill=getCardSkills(fc)[skillIdx];
  if(!skill||p.mp<skill.mp){logErr('Mp ไม่พอ');handPickMode=null;render();return;}
  if(card.tribe!=='Beast'){logErr('ต้องเลือก [Beast] เท่านั้น');return;}
  showActionQueue(`${fc.card.name} [Skill] → นำ <b>${card.name}</b> ลงสนาม`,()=>{
    p.mp-=skill.mp;fc.hasUsedSkill=true;
    p.hand.splice(idx,1);
    p.atLine.push(makeFieldCard(card,true));
    log(`${fc.card.name} [Skill]: ${card.name} ลงสนามจากมือ!`,'good');
    handPickMode=null;checkLose();render();
  });
}

function openInterferePicker(){
  const opts=getInterfereSkills();
  if(!opts.length)return;
  // For now: auto-pick first (future: show picker when multiple)
  startInterfereSkill(opts[0].fc,opts[0].skillIdx);
}

function startInterfereSkill(fc,skillIdx){
  handDiscardMode={fc,skillIdx};
  broadcastSound('Skill');
  log(`${fc.card.name} [Interfere] — เลือก Seal ในมือเพื่อทิ้ง`,'hi');
  render();
}

function executeInterfere(card){
  if(!handDiscardMode)return;
  const {fc,skillIdx}=handDiscardMode;
  const p=G.players[0];
  const skill=getCardSkills(fc)[skillIdx];
  if(!skill||p.mp<skill.mp){logErr('Mp ไม่พอ');handDiscardMode=null;render();return;}
  p.mp-=skill.mp;
  fc.hasUsedSkill=true;
  const hi=p.hand.indexOf(card);
  if(hi>=0)p.hand.splice(hi,1);
  p.shrine.push(card);
  broadcastSound('Flip');
  fc.atBoosts=(fc.atBoosts||[]);
  fc.atBoosts.push({amount:card.lv, expiresBeforeSubTurn: subTurnNum+2});
  log(`${fc.card.name} [Interfere]: ทิ้ง ${card.name} (Lv${card.lv}) → At +${card.lv} turn นี้!`,'good');
  handDiscardMode=null;
  checkLose();render();
  _enterChainMode(fc.card.name);
}

// Inline executor for interfere selfSkill — does NOT nest showActionQueue.
// Called when pendingCb is already set (we're inside an action queue window).
function executeInterfereSelfSkill(skillFC,skillIdx){
  const p=G.players[0];
  const skill=getCardSkills(skillFC)[skillIdx];
  if(!skill||p.mp<skill.mp){logErr('Mp ไม่พอ');return;}
  if(skill.effect==='opponentMpDrain'){
    const amt=skill.drainAmt||1;
    p.mp-=skill.mp;skillFC.hasUsedSkill=true;
    broadcastSound('Skill');
    G.players[1].mp=Math.max(0,G.players[1].mp-amt);
    log(`${skillFC.card.name} [Interfere]: ฝ่ายตรงข้าม Mp -${amt}!`,'good');
    checkLose();render();
    return;
  }
  // Fallback: effects that need a queue can't run inline — notify user
  logErr(`${skillFC.card.name} [Interfere]: ใช้ได้เฉพาะนอก Action Queue`);
}

function executeSelfSkill(skillFC,skillIdx){
  const p=G.players[0];
  const skill=getCardSkills(skillFC)[skillIdx];
  if(!skill||p.mp<skill.mp){logErr('Mp ไม่พอ');return;}
  updateAIPreview(skillFC.card,'✦ Skill');
  broadcastSound('Skill');
  if(skill.effect==='drawCardChoice'){
    showActionQueue(`${skillFC.card.name} [Skill] จั่วการ์ด 1 ใบ`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      showDeltaDDrawModal((type)=>{
        const p2=G.players[0];
        if(type==='mystic'){
          if((p2.mysticDeck||[]).length){drawMysticCard(0,true,true);log(`${skillFC.card.name} [Skill]: จั่ว Mystic 1 ใบ!`,'good');}
          else log(`${skillFC.card.name} [Skill]: ไม่มี Mystic ในกอง`,'bad');
        } else {
          if(p2.deck.length){drawCard(0,true,true);log(`${skillFC.card.name} [Skill]: จั่ว Seal 1 ใบ!`,'good');}
          else log(`${skillFC.card.name} [Skill]: ไม่มีการ์ดในกอง`,'bad');
        }
        checkLose();render();
        if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
      });
    });
    return;
  }
  if(skill.effect==='returnSelfToDeck'){
    showActionQueue(`${skillFC.card.name} [Skill] คืนตัวเองสู่กอง + สลับ`,()=>{
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      // Return support seals to same line as Ghost Ship
      const ghostLine=p.atLine.some(x=>x.uid===skillFC.uid)?'atLine':'dfLine';
      skillFC.fusionStack.forEach(mfc=>{p[ghostLine].push(mfc);});
      // Drain mystics from Ghost Ship before returning to deck
      _drainAllMystics(skillFC,pi);
      // Remove Ghost Ship from field
      const rmA=p.atLine.findIndex(x=>x.uid===skillFC.uid);
      if(rmA>=0)p.atLine.splice(rmA,1);
      const rmD=p.dfLine.findIndex(x=>x.uid===skillFC.uid);
      if(rmD>=0)p.dfLine.splice(rmD,1);
      p.deck.push(skillFC.card);
      shuffle(p.deck);
      log(`${skillFC.card.name} [Skill]: กลับสู่กองและสลับแล้ว!`,'good');
      checkLose();render();
    });
    return;
  }
  if(skill.effect==='freezeAll'){
    showActionQueue(`${skillFC.card.name} [Skill] Freeze Curse ศัตรูทุกตัว 1 Turn`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      const ai=G.players[1];
      const allEnemy=[...ai.atLine,...ai.dfLine];
      allEnemy.forEach(t=>{
        if(t.card.id===82||t.card.id===22||t.card.id===20){log(`${t.card.name} [Ability]: ยกเลิก Curse!`,'bad');return;}
        t.curses=(t.curses||[]);
        if(!t.curses.some(c=>c.type==='freeze'))t.curses.push({type:'freeze',expiresAtSubTurn:subTurnNum+2});
      });
      broadcastSound('Freeze');
      // Move frozen At Line seals to Df Line
      [...ai.atLine].forEach(t=>{
        const i=ai.atLine.findIndex(x=>x.uid===t.uid);
        if(i<0)return;
        ai.atLine.splice(i,1);ai.dfLine.push(t);
      });
      log(`${skillFC.card.name} [Skill]: ศัตรูทุกตัว (${allEnemy.length}) ติด Freeze Curse 1 Turn!`,'good');
      checkLose();render();
    });
    return;
  }
  if(skill.effect==='shrineToHand'){
    if(!p.shrine.length){logErr('Shrine ว่างเปล่า');return;}
    // Show shrine picker via fa-modal
    document.getElementById('fa-title').textContent=`${skillFC.card.name}: เลือกจาก Shrine`;
    const opts=document.getElementById('fa-opts');opts.innerHTML='';
    p.shrine.forEach((card)=>{
      addFAOpt(`${card.name} (Lv${card.lv} At${card.at})`,()=>{
        closeFAModal();
        showActionQueue(`${skillFC.card.name} [Skill] → <b>${card.name}</b> จาก Shrine ขึ้นมือ`,()=>{
          p.mp-=skill.mp;skillFC.hasUsedSkill=true;
          if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
          if(p.hand.length>=getEffectiveHandMax(0)){logErr('มือเต็ม!');return;}
          const si=p.shrine.indexOf(card);if(si>=0)p.shrine.splice(si,1);
          p.hand.push(card);
          log(`${skillFC.card.name} [Skill]: ${card.name} จาก Shrine ขึ้นมือ!`,'good');
          checkLose();render();
        });
      });
    });
    document.getElementById('fa-modal').classList.add('show');
    return;
  }
  if(skill.effect==='allToAtLine'){
    showActionQueue(`${skillFC.card.name} [Skill] Seal ทุกใบย้ายไป At Line`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      const toMove=[...p.dfLine];
      p.dfLine.length=0;
      toMove.forEach(fc=>{p.atLine.push(fc);});
      log(`${skillFC.card.name} [Skill]: Seal ทุกใบย้ายไป At Line!`,'good');
      checkLose();render();
    });
    return;
  }
  if(skill.effect==='returnSelfToHand'){
    showActionQueue(`${skillFC.card.name} [Skill] กลับสู่มือ`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      const rmA=p.atLine.findIndex(x=>x.uid===skillFC.uid);if(rmA>=0)p.atLine.splice(rmA,1);
      const rmD=p.dfLine.findIndex(x=>x.uid===skillFC.uid);if(rmD>=0)p.dfLine.splice(rmD,1);
      const ok=bounceSealToHand(skillFC,pi);
      log(`${skillFC.card.name} [Skill]: ${ok?'กลับสู่มือ!':'ลง Shrine (มือเต็ม)!'}`,ok?'good':'bad');
      checkLose();render();
    });
    return;
  }
  if(skill.effect==='massReset'){
    showActionQueue(`${skillFC.card.name} [Skill] Reset สนาม — Seal ทุกใบกลับกองและทุกคนวางจากมือ`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      // Step 1: All field seals (+ their mystics/fusions) return to owners' decks
      for(let pi=0;pi<2;pi++){
        const owner=G.players[pi];
        const allFC=[...owner.atLine,...owner.dfLine];
        owner.atLine=[];owner.dfLine=[];
        allFC.forEach(fc=>{
          _drainAllMystics(fc,pi);
          if(fc.fusionStack?.length)fc.fusionStack.forEach(m=>{_drainAllMystics(m,pi);owner.deck.push(m.card);});
          owner.deck.push(fc.card);
        });
        shuffle(owner.deck);
      }
      // Step 2: AI auto-deploys hand to AtLine
      const ai=G.players[1];
      const aiHand=[...ai.hand];ai.hand=[];
      aiHand.forEach(card=>{ai.atLine.push(makeFieldCard(card,true));});
      // Step 3: Player chooses line for each hand card one-by-one
      const pHand=[...p.hand];p.hand=[];
      function _deployNext(i){
        if(i>=pHand.length){
          log(`${skillFC.card.name} [Skill]: Reset สนาม! Seal ทุกใบกลับกองและวางใหม่จากมือ!`,'good');
          checkLose();render();
          if(window.Online?.isOnline&&Online.isHost)Online.broadcastState();
          return;
        }
        const card=pHand[i];
        render();
        showLineChoicePicker(card.name,line=>{
          (line==='at'?p.atLine:p.dfLine).push(makeFieldCard(card,true));
          _deployNext(i+1);
        });
      }
      _deployNext(0);
    });
    return;
  }
  // ── Black Wiser (41): drain opponent Mp ──
  if(skill.effect==='opponentMpDrain'){
    const amt=skill.drainAmt||1;
    showActionQueue(`${skillFC.card.name} [Skill] ฝ่ายตรงข้าม Mp -${amt}`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      G.players[1].mp=Math.max(0,G.players[1].mp-amt);
      log(`${skillFC.card.name} [Skill]: ฝ่ายตรงข้าม Mp -${amt}!`,'good');
      checkLose();render();
    });
    return;
  }
  // ── Zadin (91): double attack At=8 vs any enemy seal ──
  if(skill.effect==='zadinDoubleAttack'){
    function zadinDoHit(hitNum,done){
      const current=[
        ...G.players[1].atLine.map(fc=>({fc,line:'at'})),
        ...G.players[1].dfLine.map(fc=>({fc,line:'df'}))
      ];
      if(!current.length){done();return;}
      document.getElementById('fa-title').textContent=`Zadin [Skill] เลือกเป้าหมายครั้งที่ ${hitNum}/2`;
      const opts=document.getElementById('fa-opts');opts.innerHTML='';
      current.forEach(t=>{
        addFAOpt(`${t.fc.card.name} [${t.line==='at'?'At':'Df'} Line]`,()=>{
          closeFAModal();
          showActionQueue(`${skillFC.card.name} [Skill] (${hitNum}/2) → ⚔ ${t.fc.card.name} [At=8]`,()=>{
            combatAnim(skillFC,t.fc,8,t.line,false,()=>{
              dealDamage(skillFC,t.fc,8,'Zadin Skill',0,1,t.line);
              checkLose();render();done();
            });
          });
        });
      });
      document.getElementById('fa-modal').classList.add('show');
    }
    showActionQueue(`${skillFC.card.name} [Skill] → Dragon Strike ×2 (At=8)`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      zadinDoHit(1,()=>{
        zadinDoHit(2,()=>{
          skillFC.exhausted=true;skillFC.hasAttacked=true;
          log(`${skillFC.card.name} [Skill]: โจมตีสำเร็จ 2 ครั้ง!`,'good');
          checkLose();render();
        });
      });
    });
    return;
  }
}

function executeSkill(skillFC,skillIdx,targetFC,targetPi,targetLine){
  updateAIPreview(skillFC.card,'✦ Skill');
  // Blaze Sage step 2: apply At boost to the chosen boost target
  if(skillIdx===-99&&pendingSacrifice){
    const {skillFC:blazeFC,mc}=pendingSacrifice;
    targetFC.atBoosts=(targetFC.atBoosts||[]);
    targetFC.atBoosts.push({amount:mc,expiresBeforeSubTurn:subTurnNum+2});
    log(`${blazeFC.card.name} [Skill]: ${targetFC.card.name} +At${mc} (1 Turn)!`,'good');
    pendingSacrifice=null;skillMode=null;render();
    return;
  }
  const p=G.players[0];
  const skills=getCardSkills(skillFC);
  const skill=skills[skillIdx];
  if(!skill)return;
  if(p.mp<skill.mp){logErr('Mp ไม่พอ');skillMode=null;render();return;}
  skillMode=null;

  if(skill.effect==='healCurse'){
    showActionQueue(`${skillFC.card.name} [Skill] → รักษา Curse <b>${targetFC.card.name}</b>`,()=>{
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      targetFC.curses=[];
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} หาย Curse ทุกชนิด!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='destroyTarget'){
    showActionQueue(`${skillFC.card.name} [Skill] → ทำลาย <b>${targetFC.card.name}</b>`,()=>{
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      destroyByEffect(targetFC,targetPi);
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ถูกทำลาย!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='deathCurse'){
    if(targetFC.card.id===82||targetFC.card.id===22||targetFC.card.id===20){log(`${targetFC.card.name} [Ability]: ยกเลิก Curse!`,'bad');render();return;}
    targetFC.curses=(targetFC.curses||[]);
    targetFC.curses.push({type:'death',expiresAtSubTurn:Infinity});
    broadcastSound('Skill');
    showActionQueue(`${skillFC.card.name} [Skill] → ☠ Death Curse <b>${targetFC.card.name}</b>`,()=>{
      const _cleanDC=()=>{targetFC.curses=(targetFC.curses||[]).filter(c=>c.type!=='death');};
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){_cleanDC();log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      const hasDeath=(targetFC.curses||[]).some(c=>c.type==='death');
      _cleanDC();
      if(hasDeath){
        destroyByEffect(targetFC,targetPi);
        log(`${skillFC.card.name} [Skill]: ☠ Death Curse → ${targetFC.card.name} ถูกทำลายทันที!`,'good');
      } else {
        log(`${skillFC.card.name} [Skill]: ☠ Death Curse ถูกแก้ไขระหว่าง Interfere!`,'bad');
      }
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='poisonCurse'){
    const turns=skill.turns||3;
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> ติด ☠Poison Curse ${turns} Turn`,()=>{
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      if(targetFC.card.id===82||targetFC.card.id===22||targetFC.card.id===20){log(`${targetFC.card.name} [Ability]: ยกเลิก Curse!`,'bad');render();return;}
      targetFC.curses=(targetFC.curses||[]);
      targetFC.curses.push({type:'poison',expiresAtSubTurn:subTurnNum+(turns*2)});
      broadcastSound('Poison');
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ติด Poison Curse ${turns} Turn!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='stoneCurse'){
    const turns=skill.turns||1;
    const turnsLabel=turns===Infinity?'∞':`${turns}`;
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> ติด 🪨Stone Curse ${turnsLabel} Turn`,()=>{
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      if(targetFC.card.id===82||targetFC.card.id===22||targetFC.card.id===20){log(`${targetFC.card.name} [Ability]: ยกเลิก Curse!`,'bad');render();return;}
      targetFC.curses=(targetFC.curses||[]);
      targetFC.curses.push({type:'stone',expiresAtSubTurn:turns===Infinity?Infinity:subTurnNum+(turns*2)});
      broadcastSound('Stone');
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ติด Stone Curse ${turnsLabel} Turn — สั่งการไม่ได้!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='freezeCurse'){
    const turns=skill.turns||1;
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> ติด ❄Freeze Curse ${turns} Turn`,()=>{
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      if(targetFC.card.id===82||targetFC.card.id===22||targetFC.card.id===20){log(`${targetFC.card.name} [Ability]: ยกเลิก Curse!`,'bad');render();return;}
      targetFC.curses=(targetFC.curses||[]);
      targetFC.curses.push({type:'freeze',expiresAtSubTurn:subTurnNum+(turns*2)});
      broadcastSound('Freeze');
      // Force to Df Line
      const owner=G.players[targetPi];
      if(targetLine==='at'){
        const i=owner.atLine.findIndex(x=>x.uid===targetFC.uid);
        if(i>=0){owner.atLine.splice(i,1);owner.dfLine.push(targetFC);}
      }
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ติด Freeze Curse ${turns} Turn — ถูกย้ายไป Df Line!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='lastDanceCurse'){
    const turns=skill.turns||2;
    const atBonus=skill.atBonus||0;
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> Last Dance Curse At+${atBonus} / ${turns} Turn`,()=>{
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      if(targetFC.card.id===82||targetFC.card.id===22||targetFC.card.id===20){log(`${targetFC.card.name} [Ability]: ยกเลิก Curse!`,'bad');render();return;}
      targetFC.curses=(targetFC.curses||[]);
      targetFC.curses.push({type:'lastDance',atBonus,expiresAtSubTurn:subTurnNum+(turns*2)});
      broadcastSound('Skill');
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} Last Dance Curse — At+${atBonus} แล้วถูกทำลายใน ${turns} Turn!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='charmCurse'){
    const turns=skill.turns||3;
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> ติด 💗Charm Curse ${turns} Turn`,()=>{
      p.mp-=skill.mp;
      skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      if(targetFC.card.id===82||targetFC.card.id===22||targetFC.card.id===20){log(`${targetFC.card.name} [Ability]: ยกเลิก Curse!`,'bad');render();return;}
      targetFC.charmed={originalPi:targetPi,originalLine:targetLine+'Line'};
      targetFC.curses=(targetFC.curses||[]);
      targetFC.curses.push({type:'charm',expiresAtSubTurn:subTurnNum+(turns*2)});
      targetFC.exhausted=false;targetFC.hasUsedSkill=false;
      broadcastSound('Charm');
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ติด Charm Curse — อยู่ภายใต้การควบคุมของเรา ${turns} Turn!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='atBoost1SubTurn'){
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> +At 1 จนจบ Subturn`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      targetFC.atBoosts=(targetFC.atBoosts||[]);
      targetFC.atBoosts.push({amount:1,expiresBeforeSubTurn:subTurnNum+1});
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} +At 1 จนจบ Subturn!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='spBoost1SubTurn'){
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> +Sp 1 จนจบ Subturn`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      targetFC.spBoosts=(targetFC.spBoosts||[]);
      targetFC.spBoosts.push({amount:1,expiresBeforeSubTurn:subTurnNum+1});
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} +Sp 1 จนจบ Subturn!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='dfBoostMc'){
    const boostAmt=targetFC.card.mc;
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> +Df${boostAmt} จนจบ Subturn`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      targetFC.dfBoosts=(targetFC.dfBoosts||[]);
      targetFC.dfBoosts.push({amount:boostAmt,expiresBeforeSubTurn:subTurnNum+1});
      log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} +Df${boostAmt} (Mc=${boostAmt}) จนจบ Subturn!`,'good');
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='frozenToHand'){
    showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> (Freeze) ขึ้นมือ`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      const owner=G.players[targetPi];
      const fromArr=targetLine==='at'?owner.atLine:owner.dfLine;
      const i=fromArr.findIndex(x=>x.uid===targetFC.uid);
      if(i>=0){
        fromArr.splice(i,1);
        const ok=bounceSealToHand(targetFC,targetPi);
        log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ${ok?'กลับสู่มือ':'ลง Shrine (มือเต็ม)'}!`,ok?'good':'bad');
      }
      checkLose();render();
    });
    return;
  }

  if(skill.effect==='destroyOneMystic'){
    const actMys=getActiveMystics(targetFC);
    const doDestroy=mEntry=>{
      showActionQueue(`${skillFC.card.name} [Skill] → ทำลาย Mystic <b>${mEntry.mystic.name}</b> บน ${targetFC.card.name}`,()=>{
        p.mp-=skill.mp;skillFC.hasUsedSkill=true;
        if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
        const mIdx=(targetFC.mystics||[]).indexOf(mEntry);
        if(mIdx>=0){
          targetFC.mystics.splice(mIdx,1);clearPSCurseFromEntry(targetFC,mEntry);
          if(mEntry.mystic?.id===33)targetFC.magicalEl=null;
          const tOwner=findFCOwner(targetFC);
          if(tOwner)(G.players[tOwner.pi].mysticGrave=G.players[tOwner.pi].mysticGrave||[]).push(mEntry.mystic);
        }
        log(`${skillFC.card.name} [Skill]: ทำลาย ${mEntry.mystic.name} บน ${targetFC.card.name}!`,'good');
        checkLose();render();
      });
    };
    if(actMys.length===1){doDestroy(actMys[0]);}
    else{
      showMysticPicker(`Titania: เลือก Mystic ที่จะทำลายบน ${targetFC.card.name}`,
        actMys.map(m=>({label:m.mystic.name,data:m})),
        m=>doDestroy(m));
    }
    return;
  }
  if(skill.effect==='sacrificeStep1'){
    const mc=targetFC.card.mc;
    showActionQueue(`${skillFC.card.name} [Skill] → Sacrifice <b>${targetFC.card.name}</b> (Mc=${mc})`,()=>{
      p.mp-=skill.mp;skillFC.hasUsedSkill=true;
      if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
      destroyByEffect(targetFC,0);
      pendingSacrifice={skillFC,mc};
      skillMode={fc:skillFC,skillIdx:-99};
      log(`${skillFC.card.name} [Skill]: Sacrifice ${targetFC.card.name}! เลือก Seal ที่จะ +At${mc} (1 Turn)...`,'hi');
      checkLose();render();
    });
    return;
  }

  // Default: return to deck (Fairy Music Box id=3)
  showActionQueue(`${skillFC.card.name} [Skill] → <b>${targetFC.card.name}</b> คืนกอง`,()=>{
    p.mp-=skill.mp;
    skillFC.hasUsedSkill=true;
    if(!_skillStillValid(skillFC,skill)){log(`${skillFC.card.name} [Skill] ยกเลิก — เงื่อนไขไม่ตรงแล้ว`,'bad');render();return;}
    const owner=G.players[targetPi];
    const fromArr=targetLine==='at'?owner.atLine:owner.dfLine;
    const i=fromArr.findIndex(x=>x.uid===targetFC.uid);
    if(i>=0)fromArr.splice(i,1);
    if(targetFC.fusionStack&&targetFC.fusionStack.length){
      targetFC.fusionStack.forEach(m=>owner.shrine.push(m.card));
    }
    owner.deck.push(targetFC.card);
    shuffle(owner.deck);
    log(`${skillFC.card.name} [Skill]: ${targetFC.card.name} ถูกส่งคืนกอง!`,'good');
    checkLose();render();
  });
}

function clickAIHandCard(idx){
  if(!handTargetMode||!attackerSeal)return;
  if(handAttackedThisTurn){logErr('โจมตีมือได้แค่ครั้งเดียวต่อเทิร์น');cancelAction();return;}
  const ai=G.players[1];
  if(idx>=ai.hand.length)return;
  const card=ai.hand[idx];
  const attFC=attackerSeal.fc;
  handTargetMode=false;attackerSeal=null;
  handAttackAnim(attFC,card,()=>{
    ai.hand.splice(ai.hand.indexOf(card),1);
    ai.shrine.push(card);
    log(`${attFC.card.name} โจมตีมือ AI → ${card.name} ลง Shrine! (+Lv${card.lv})`,'good');
    attFC.exhausted=true;attFC.hasAttacked=true;
    handAttackedThisTurn=true;
    checkLose();render();
  });
}

function clickAIHandMystic(idx){
  if(!handTargetMode||!attackerSeal)return;
  if(handAttackedThisTurn){logErr('โจมตีมือได้แค่ครั้งเดียวต่อเทิร์น');cancelAction();return;}
  const ai=G.players[1];
  const mh=ai.mysticHand||[];
  if(idx>=mh.length)return;
  const mc=mh[idx];
  const attFC=attackerSeal.fc;
  handTargetMode=false;attackerSeal=null;
  handAttackAnim(attFC,mc,()=>{
    mh.splice(idx,1);
    (ai.mysticGrave=ai.mysticGrave||[]).push(mc);
    log(`${attFC.card.name} โจมตีมือ AI → ${mc.name} [Mystic] ถูกทิ้ง!`,'good');
    attFC.exhausted=true;attFC.hasAttacked=true;
    handAttackedThisTurn=true;
    checkLose();render();
  },'cardback/mystic.jpg',`${mc.name} ทิ้งแล้ว!`);
}

// ══════════════════════════════════════════════
