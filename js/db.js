// ══════════════════════════════════════════════
// CARD DATA — loaded from OGcarddbseal/cards_metadata.json
// ══════════════════════════════════════════════
let CARD_DB = [];

function convertCard(j) {
  const rtMap = {element:'el', tribe:'tribe', card:'card'};
  function cleanAtk(f) {
    const o = {name: f.atk_name, mp: f.atk_mp};
    if(f.atk_at != null) o.at = f.atk_at;
    if(f.atk_df != null) o.df = f.atk_df;
    if(f.atk_all) o.all = true;
    if(f.atk_sp != null) o.sp = f.atk_sp;
    if(f.atk_hits && f.atk_hits > 1) o.hits = f.atk_hits;
    return o;
  }
  return {
    id: j.id, name: j.name, img: j.path,
    lv: j.lv, at: j.at, df: j.df, sp: j.spd,
    mc: j.mp_deploy, ma: j.mp_attack,
    el: j.element[0], tribe: j.tribe[0],
    fuse: (j.fusions||[]).map(f=>({
      req: f.require,
      rt: rtMap[f.require_type]||f.require_type,
      cnt: f.count,
      atk: cleanAtk(f)
    })),
    skill_text: j.skill_text||null,
    ability_text: j.ability_text||null
  };
}

function loadCardDB() {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'OGcarddbseal/cards_metadata.json?v=' + Date.now(), true);
    xhr.onload = () => {
      if(xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)){
        try {
          const data = JSON.parse(xhr.responseText);
          CARD_DB = data.cards.map(convertCard);
          console.log(`Loaded ${CARD_DB.length} cards from JSON`);
          resolve();
        } catch(e){ reject(e); }
      } else { reject(new Error('HTTP '+xhr.status)); }
    };
    xhr.onerror = reject;
    xhr.send();
  });
}

function loadMysticDB(){
  return new Promise(resolve=>{
    const xhr=new XMLHttpRequest();
    xhr.open('GET','OGcarddbseal/mystics_metadata.json?v='+Date.now(),true);
    xhr.onload=()=>{
      if(xhr.status===0||(xhr.status>=200&&xhr.status<300)){
        try{const data=JSON.parse(xhr.responseText);MYSTIC_DB=data.mystics;console.log(`Loaded ${MYSTIC_DB.length} mystic cards`);}
        catch(e){MYSTIC_DB=_MYSTIC_DB_FALLBACK;}
      } else {MYSTIC_DB=_MYSTIC_DB_FALLBACK;}
      resolve();
    };
    xhr.onerror=()=>{MYSTIC_DB=_MYSTIC_DB_FALLBACK;resolve();};
    xhr.send();
  });
}

function drawMysticCard(pi,silent=false,force=false){
  const p=G.players[pi];
  if(!p.mysticDeck||!p.mysticDeck.length)return;
  if(!force){
    const hmax=getMysticHandMax(pi);
    if((p.mysticHand||[]).length>=hmax)return;
  }
  const c=p.mysticDeck.shift();
  if(!p.mysticHand)p.mysticHand=[];
  p.mysticHand.push({...c});
  if(!silent)log(`${p.name} จั่ว Mystic: ${c.name}`,'');
}

function getMysticHandMax(pi){
  const p=G.players[pi];
  let max=MYSTIC_HAND_MAX;
  (p.areaMystics||[]).forEach(am=>{
    if(am.mystic.id===35)max+=1;
    if(am.mystic.id===70)max-=1;
  });
  return Math.max(1,max);
}

// ── placeholder until JSON loads ──
const _CARD_DB_FALLBACK = [
  {id:1,name:"Firat",lv:1,mc:1,ma:1,at:4,df:4,sp:4,el:"fire",tribe:"Beast",img:"OGcarddbseal/card_1.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Blaze Tail",at:7,mp:1}},{req:"Firat",rt:"card",cnt:1,atk:{name:"Flame Flock",at:12,mp:3}}],skill_text:null,ability_text:null},
  {id:2,name:"Golden Horn Unicorn",lv:1,mc:2,ma:1,at:5,df:6,sp:3,el:"light",tribe:"Beast",img:"OGcarddbseal/card_2.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Holy Horn",at:9,mp:2}}],skill_text:["[Skill]- รักษา Curse ทุกชนิดให้กับ Seal 1 ใบ (Mp 1)"],ability_text:null},
  {id:3,name:"Fairy Music Box",lv:1,mc:1,ma:1,at:3,df:5,sp:0,el:"light",tribe:"Musician",img:"OGcarddbseal/card_3.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Melodies of Light",at:7,mp:1}}],skill_text:["[Skill]- นำ [Dark] 1 ใบในสนามเข้ากองการ์ด จากนั้นสลับกองการ์ดนั้น (Mp 2)","[Skill]- นำ [Dark] และ/หรือ [Evil] 1 ใบในสนามเข้ากองการ์ด จากนั้นสลับกองการ์ดนั้น เมื่อ Fairy Music Box รวมร่าง (Mp 2)"],ability_text:null},
  {id:4,name:"White Werewolf",lv:1,mc:2,ma:1,at:5,df:6,sp:3,el:"darkness",tribe:"Beast",img:"OGcarddbseal/card_4.jpg",fuse:[{req:"darkness",rt:"el",cnt:1,atk:{name:"Rough Roar",at:7,mp:1}},{req:"darkness",rt:"el",cnt:2,atk:{name:"Fury Fang",at:9,mp:2}}],skill_text:null,ability_text:["ผลของ Mystic Card ประเภท [Tarot]: The Moon ที่ติดบน White Werewolf ให้ผล 2 เท่า"]},
  {id:5,name:"Purachale",lv:1,mc:1,ma:1,at:4,df:7,sp:2,el:"light",tribe:"Beast",img:"OGcarddbseal/card_5.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Tall Lashes",at:8,mp:2}},{req:"light",rt:"el",cnt:2,atk:{name:"Sacred Horn",at:10,mp:3}}],skill_text:["[Skill]- ทำลาย [Evil] 1 ใบในสนาม (At Line) (Mp 3)"],ability_text:null},
  {id:6,name:"Infernos",lv:1,mc:2,ma:1,at:5,df:5,sp:3,el:"fire",tribe:"Monster",img:"OGcarddbseal/card_6.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Scythe Lashes",at:9,mp:2}},{req:"fire",rt:"el",cnt:2,atk:{name:"Power Bern",at:8,mp:2}}],skill_text:["[Skill]- Seal 1 ใบที่มี Sp 3, 4, 5 ติด Last Dance Curse At +2 / 2 Turn เมื่อ Infernos รวมร่างกับ [Dark] (At Line) (Mp 2)"],ability_text:null},
  {id:7,name:"Desert Chimera",lv:2,mc:3,ma:1,at:7,df:8,sp:3,el:"fire",tribe:"Beast",img:"OGcarddbseal/card_7.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Fire Claw",at:10,mp:3}},{req:"fire",rt:"el",cnt:2,atk:{name:"Desert Venom",at:8,mp:2}}],skill_text:["[Skill]- Seal 1 ใบที่มี Sp 3, 4, 5 ติด Poison Curse 3 Turn เมื่อ Desert Chimara รวมร่างกับ [Dark] (At Line) (Mp 2)"],ability_text:null},
  {id:8,name:"Volcanic Minotaur",lv:1,mc:1,ma:1,at:4,df:5,sp:2,el:"fire",tribe:"Titan",img:"OGcarddbseal/card_8.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Burning Horn",at:7,mp:1}},{req:"fire",rt:"el",cnt:2,atk:{name:"Fire Gore",at:9,mp:2}}],skill_text:null,ability_text:["เมื่อ Volcanic Minotaur ตก Shrine จากสนาม Seal ทุกใบในสนามฝ่ายตรงข้ามแยกการรวมร่าง"]},
  {id:10,name:"Scalo",lv:1,mc:1,ma:1,at:3,df:6,sp:1,el:"earth",tribe:"Beast",img:"OGcarddbseal/card_10.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Roller",df:9,mp:2}},{req:"earth",rt:"el",cnt:2,atk:{name:"Fasten Roller",df:11,mp:3}}],skill_text:null,ability_text:["เมื่อ Scalo โจมตี Seal ที่รวมร่าง เราสามารถใช้ Df ของ Scalo เทียบกับค่าพลังของ Seal ที่ถูกโจมตี","Scalo สามารถโจมตีจาก Df Line ได้"]},
  {id:11,name:"Cockatrice",lv:1,mc:1,ma:1,at:4,df:6,sp:1,el:"earth",tribe:"Beast",img:"OGcarddbseal/card_11.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Dry Glow",at:7,mp:1}},{req:"earth",rt:"el",cnt:2,atk:{name:"Spur Stub",at:9,mp:2}}],skill_text:["[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3, 4 ติด Stone Curse 1 Turn เมื่อ Cockatrice รวมร่าง (Mp 2)"],ability_text:null},
  {id:12,name:"Jiu Wei Hu Te",lv:1,mc:2,ma:1,at:5,df:6,sp:3,el:"earth",tribe:"Beast",img:"OGcarddbseal/card_12.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Maya Indulge",at:9,mp:2}},{req:"darkness",rt:"el",cnt:1,atk:{name:"Blow Claw",df:7,mp:1}}],skill_text:["[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3 ติด Charm Curse 3 Turn เมื่อ Jiu Wei Hu Le รวมร่างกับ [Dark] (Mp 2)"],ability_text:null},
  {id:13,name:"Magamouth",lv:1,mc:1,ma:1,at:5,df:6,sp:3,el:"water",tribe:"Fish",img:"OGcarddbseal/card_13.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Sharp Canine",at:9,mp:2}},{req:"water",rt:"el",cnt:2,atk:{name:"Acute Assault",at:10,mp:3}}],skill_text:null,ability_text:["ขณะที่ Magamouth ต่อสู้กับ Seal ที่รวมร่าง Magamouth Df +1"]},
  {id:14,name:"Coy Crab",lv:1,mc:1,ma:1,at:3,df:5,sp:2,el:"water",tribe:"Beast",img:"OGcarddbseal/card_14.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Hide In Shell",df:8,mp:1}},{req:"water",rt:"el",cnt:2,atk:{name:"Sharp Shell",at:9,mp:2}}],skill_text:null,ability_text:["ตราบเท่าที่มี Coy Crab ตั้งแต่ 2 ใบขึ้นไปในสนามฝ่ายเรา Seal ทุกใบในสนามฝ่ายตรงข้าม Sp = 0"]},
  {id:15,name:"Armadillon",lv:2,mc:2,ma:1,at:7,df:9,sp:2,el:"water",tribe:"Beast",img:"OGcarddbseal/card_15.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Ice Scale",at:8,mp:1}},{req:"water",rt:"el",cnt:2,atk:{name:"Ice Dorsal",at:10,mp:2}}],skill_text:["[Skill]- Seal 1 ใบที่มี Sp 2, 3, 4 ติด Freeze Curse 1 Turn เมื่อ Armadillon รวมร่าง (At Line) (Mp 2)"],ability_text:null},
  {id:16,name:"Ghost Ship",lv:1,mc:2,ma:1,at:6,df:8,sp:2,el:"water",tribe:"Machine",img:"OGcarddbseal/card_16.jpg",fuse:[{req:"any",rt:"el",cnt:1,atk:{name:"Artillery",at:9,mp:2}},{req:"any",rt:"el",cnt:1,atk:{name:"Vehicle",at:7,mp:1}}],skill_text:["[Skill]- นำ Ghost Ship กลับเข้ากองการ์ด จากนั้นสลับกองการ์ดนั้น เมื่อ Ghost Ship อยู่ในท่า Double Combination (Mp 0)"],ability_text:null},
  {id:20,name:"Angel of Sword",lv:2,mc:3,ma:1,at:6,df:8,sp:4,el:"light",tribe:"Divine",img:"OGcarddbseal/card_20.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Sword of Order",at:8,mp:2}},{req:"light",rt:"el",cnt:2,atk:{name:"Sword of Law",at:9,mp:3,sp:5}}],skill_text:["[Skill]- ผู้เล่นฝ่ายตรงข้าม 1 คน ทิ้ง Mystic Card 1 ใบในมือแบบสุ่ม เมื่อ Francessca, the Angel of Swords รวมร่าง (At Line) (Mp 3)"],ability_text:null},
  {id:22,name:"Biotek-D",lv:1,mc:1,ma:1,at:4,df:5,sp:3,el:"wind",tribe:"Scientist",img:"OGcarddbseal/card_22.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Flash Ray",at:10,mp:3}},{req:"wind",rt:"el",cnt:2,atk:{name:"Burning Beam",at:9,mp:2}}],skill_text:["[Skill]- ผู้เล่น 1 คนจั่วการ์ด 1 ใบ (Df Line) (Mp 3)"],ability_text:null},
  {id:23,name:"Aklem",lv:1,mc:2,ma:1,at:5,df:6,sp:4,el:"wind",tribe:"Machine",img:"OGcarddbseal/card_23.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Sand Storm",at:8,mp:2}},{req:"wind",rt:"el",cnt:2,atk:{name:"Whirl Wind",at:10,mp:3}}],skill_text:null,ability_text:["ตราบเท่าที่ Akim รวมร่าง Seal ทุกใบในสนามฝ่ายเรา Sp = 4"]},
  {id:28,name:"Banshee",lv:1,mc:1,ma:1,at:3,df:4,sp:3,el:"wind",tribe:"Evil",img:"OGcarddbseal/card_28.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Scare Song",at:8,mp:2}},{req:"darkness",rt:"el",cnt:1,atk:{name:"Death Song",at:6,mp:1}}],skill_text:["[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3 ติด Death Curse เมื่อ Benshee รวมร่างกับ [Dark] (At Line) (Mp 3)"],ability_text:null},
  {id:42,name:"Mysterious Elephant",lv:1,mc:1,ma:1,at:5,df:7,sp:3,el:"water",tribe:"Beast",img:"OGcarddbseal/card_42.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Venom Ivory",at:7,mp:1}}],skill_text:["[Skill]- Seal 1 ใบที่มี Sp 2, 3, 4, 5 ติด Poison Curse 1 Turn เมื่อ Mysterious Elephant รวมร่าง (At Line) (Mp 3)"],ability_text:["ผู้เล่นไม่สามารถสั่ง Seal ที่รวมร่างโจมตี Mysterious Elephant ได้"]},
  {id:43,name:"Stone Lizard",lv:2,mc:2,ma:1,at:3,df:7,sp:2,el:"earth",tribe:"Beast",img:"OGcarddbseal/card_43.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Rock Arm",at:10,mp:3}},{req:"earth",rt:"el",cnt:2,atk:{name:"Roll Attach",at:11,mp:4}}],skill_text:null,ability_text:["เมื่อ Stone Lizard โจมตีสำเร็จ Stone Lizard ติด Stone Curse จนจบ Subturn โจมตีต่อไปของเรา"]},
  {id:46,name:"Assassin Doll",lv:1,mc:1,ma:1,at:3,df:4,sp:2,el:"darkness",tribe:"Machine",img:"OGcarddbseal/card_46.jpg",fuse:[{req:"darkness",rt:"el",cnt:1,atk:{name:"Pretty Chop",at:8,mp:2}}],skill_text:["[Skill]- Seal 1 ใบฝ่ายตรงข้ามที่มี At น้อยที่สุด ติด Death Curse เมื่อมี Seal ตั้งแต่ 2 ใบขึ้นไปในสนามฝ่ายตรงข้าม (At Line) (Mp 2)"],ability_text:null},
  {id:47,name:"Blue Wings Pegasus",lv:2,mc:2,ma:1,at:5,df:7,sp:4,el:"light",tribe:"Beast",img:"OGcarddbseal/card_47.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Flash Kick",at:9,mp:2}},{req:"light",rt:"el",cnt:2,atk:{name:"Soar Charge",at:10,mp:3}}],skill_text:["[Skill]- นำ [Beast] 1 ใบเข้ามาในสนามจากมือเรา (Mp 2)"],ability_text:null},
  {id:49,name:"Saber Marlin",lv:2,mc:3,ma:2,at:7,df:6,sp:4,el:"water",tribe:"Beast",img:"OGcarddbseal/card_49.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Twin Blade",at:8,mp:2,hits:2}},{req:"Beast",rt:"tribe",cnt:1,atk:{name:"Triple Assault",at:7,mp:3,hits:3}}],skill_text:null,ability_text:["Cerberus สามารถโจมตี Seal ใบรองรวมร่างได้"]},
  {id:50,name:"Hydra of Warok",lv:2,mc:3,ma:2,at:8,df:7,sp:2,el:"water",tribe:"Monster",img:"OGcarddbseal/card_50.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Venom Fang",at:9,mp:2}},{req:"water",rt:"el",cnt:2,atk:{name:"Whirl Strike",at:11,mp:4}}],skill_text:["[Skill]- Seal 1 ใบที่มี Sp 3, 4, 5 ติด Poison Curse 2 Turn เมื่อ Hydra of Warok รวมร่าง (At Line) (Mp 2)"],ability_text:["ขณะที่ Hydra of Warok ต่อสู้กับ [Earth] Hydra of Warok At -3"]},
  {id:51,name:"Brigitte the Valkyrie",lv:2,mc:3,ma:1,at:7,df:9,sp:3,el:"light",tribe:"Divine",img:"OGcarddbseal/card_51.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Light Lance",at:11,mp:3}},{req:"light",rt:"el",cnt:2,atk:{name:"Rushing Lash",at:11,mp:4}}],skill_text:null,ability_text:["Seal ที่มี Sp น้อยกว่า Brigitte, the Valkyrie ไม่สามารถโจมตี Brigitte, the Valkyrie ได้"]},
  {id:52,name:"Centaur Scout",lv:2,mc:3,ma:2,at:6,df:7,sp:4,el:"earth",tribe:"Beast",img:"OGcarddbseal/card_52.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Aim Arrow",at:8,mp:3}},{req:"earth",rt:"el",cnt:2,atk:{name:"Zap Shot",at:10,mp:4}}],skill_text:null,ability_text:["ตราบเท่าที่ Centaur Scout อยู่ที่ At Line ต้องโจมตีข้ามไปยัง Seal ฝ่ายตรงข้ามที่อยู่ใน Df Line","ตราบเท่าที่ Centaur Scout อยู่ที่ Df Line ต้องโจมตีข้ามไปยัง Seal ฝ่ายตรงข้ามที่อยู่ใน At Line"]},
  {id:53,name:"Gale Garuda",lv:2,mc:3,ma:2,at:8,df:7,sp:5,el:"wind",tribe:"Beast",img:"OGcarddbseal/card_53.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Soar Slash",at:9,mp:2}},{req:"wind",rt:"el",cnt:2,atk:{name:"Soar Strike",at:11,mp:3}}],skill_text:["[Skill]- เมื่อผู้เล่นฝ่ายตรงข้ามสั่ง Seal รวมร่าง นำ Gale Garuda เข้ามาที่ At Line จากมือ จากนั้นสั่ง Gale Garuda โจมตี Seal ที่กำลังรวมร่าง Interfere (Mp 4)"],ability_text:null},
  {id:54,name:"Ekinda",lv:2,mc:2,ma:1,at:6,df:7,sp:3,el:"light",tribe:"Aria",img:"OGcarddbseal/card_54.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Aura Disposal",at:9,mp:2}},{req:"light",rt:"el",cnt:2,atk:{name:"Aura Barrier",df:11,mp:1}}],skill_text:["[Skill]- ทำลาย Mystic Card 1 ใบในสนาม เมื่อ Titania รวมร่างกับ [Light] (Mp 2)"],ability_text:null},
  {id:56,name:"Vioria the Frigid Witch",lv:2,mc:3,ma:1,at:6,df:7,sp:3,el:"water",tribe:"Mage",img:"OGcarddbseal/card_56.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Iceblink",at:9,mp:2}},{req:"water",rt:"el",cnt:2,atk:{name:"Frigidity",at:10,mp:2}}],skill_text:null,ability_text:["เมื่อเข้าสู่ Mp Clean Up Step ของฝ่ายตรงข้าม เรา +Mp ตาม Mp ที่เหลือของฝ่ายตรงข้าม"]},
  {id:57,name:"Mor Mercenary",lv:2,mc:2,ma:2,at:6,df:6,sp:3,el:"fire",tribe:"Bandit",img:"OGcarddbseal/card_57.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Close Thrust",at:8,mp:3}},{req:"fire",rt:"el",cnt:2,atk:{name:"Assassin Stab",at:9,mp:3}}],skill_text:null,ability_text:["เมื่อ Mor Mercenary โจมตี เราสามารถเลือกให้ Mor Mercenary เทียบค่าพลังของ Mor Mercenary กับ At หรือ Df ของ Seal ที่ถูกโจมตี"]},
  {id:59,name:"Blue Wind Griffin",lv:2,mc:3,ma:1,at:7,df:8,sp:4,el:"wind",tribe:"Beast",img:"OGcarddbseal/card_59.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Cyanic Feather",at:9,mp:2}},{req:"wind",rt:"el",cnt:2,atk:{name:"Blow Beak",at:11,mp:3}}],skill_text:["[Skill]- Seal 1 ใบในสนาม Sp +1 จนจบ Subturn Interfere (Mp 2)"],ability_text:["[Beast] ใบอื่นทุกใบในสนามฝ่ายเรา Sp +1"]},
  {id:60,name:"Felasia Dragon",lv:2,mc:3,ma:2,at:8,df:7,sp:3,el:"wind",tribe:"Dragon",img:"OGcarddbseal/card_60.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Lance Assault",at:9,mp:2}},{req:"Dragon",rt:"tribe",cnt:1,atk:{name:"Double Assault",at:9,mp:2}}],skill_text:["[Skill]- สั่ง Felasia Dragoon โจมตี 2 ครั้ง เมื่อ Felasia Dragoon รวมร่างกับ [Dragon] (At Line) (Mp 3)"],ability_text:null},
  {id:62,name:"Evil Fire Warrior",lv:2,mc:2,ma:1,at:6,df:8,sp:3,el:"fire",tribe:"Evil",img:"OGcarddbseal/card_62.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Cruel Fire Die Sword",at:8,mp:2}}],skill_text:null,ability_text:["ตราบเท่าที่ Seal ในสนามฝ่ายตรงข้ามมากกว่าเรา Evil Fire Warrior At +3","ตราบเท่าที่ Seal ในสนามฝ่ายตรงข้ามน้อยกว่าเรา Evil Fire Warrior At -3"]},
  {id:63,name:"Dread Knight",lv:2,mc:3,ma:3,at:8,df:0,sp:3,el:"darkness",tribe:"Knight",img:"OGcarddbseal/card_63.jpg",fuse:[{req:"darkness",rt:"el",cnt:1,atk:{name:"Frenzied Cleave",at:11,mp:4}}],skill_text:null,ability_text:["Dread Knight สามารถโจมตีข้ามไปยัง Df Line ได้","ผู้เล่นไม่สามารถกำหนด Line ให้ Dread Knight อยู่ที่ Df Line ได้"]},
  {id:64,name:"Thunderia",lv:2,mc:3,ma:1,at:6,df:7,sp:5,el:"fire",tribe:"Beast",img:"OGcarddbseal/card_64.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Thunder Tail",at:9,mp:2}},{req:"fire",rt:"el",cnt:2,atk:{name:"Electric Crest",at:11,mp:3}}],skill_text:null,ability_text:["ตราบเท่าที่ Thunderix รวมร่าง [Beast] ที่ไม่ได้รวมร่างทุกใบในสนาม นับว่าอยู่ในสภาพ Double Combination"]},
  {id:65,name:"Sphinx",lv:2,mc:2,ma:1,at:5,df:7,sp:3,el:"earth",tribe:"Beast",img:"OGcarddbseal/card_65.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Sand Scratch",at:9,mp:2}},{req:"earth",rt:"el",cnt:2,atk:{name:"Riddle",at:8,mp:2}}],skill_text:["[Skill]- ผู้เล่นทุกคนนำ Seal และ Mystic Card ทั้งหมดในสนามเข้ากองการ์ดแล้วสลับกองการ์ดนั้น จากนั้นผู้เล่นทุกคนนำ Seal ทุกใบเข้ามาในสนามจากมือ เมื่อ Sphinx รวมร่างกับ [Light] (At Line) (Mp 4)"],ability_text:null},
  {id:67,name:"Gregory the Bishop",lv:2,mc:3,ma:1,at:7,df:8,sp:2,el:"light",tribe:"Mage",img:"OGcarddbseal/card_67.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Holy Words",at:8,mp:2}},{req:"light",rt:"el",cnt:2,atk:{name:"Halo Radiant",at:11,mp:3}}],skill_text:null,ability_text:["Seal ทุกใบในสนามฝ่ายเรายกเลิก Mystic Card (At Line)"]},
  {id:72,name:"Dark Destiny",lv:1,mc:2,ma:1,at:5,df:5,sp:5,el:"darkness",tribe:"Dragon",img:"OGcarddbseal/card_72.jpg",fuse:[{req:"darkness",rt:"el",cnt:1,atk:{name:"Shadow Sharp",at:9,mp:2}}],skill_text:null,ability_text:["เมื่อ Dark Destiny เข้ามาในสนาม เราสามารถนำ Mystic Card 1 ใบใน Shrine เราขึ้นมือ","เมื่อ Dark Destiny ตก Shrine เราต้องทิ้ง Mystic Card 1 ใบในมือเรา"]},
  {id:73,name:"Python Guardian",lv:2,mc:4,ma:1,at:7,df:10,sp:2,el:"earth",tribe:"Beast",img:"OGcarddbseal/card_73.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Guardian Anger",at:10,mp:3}},{req:"earth",rt:"el",cnt:2,atk:{name:"Brow Breaker",at:11,mp:4}}],skill_text:null,ability_text:["เมื่อ Python ถูกโจมตี เทียบ Df ของ Python กับค่าพลังของ Seal ที่โจมตี Python","ขณะที่ Python ต่อสู้กับ [Wind] Python At -3"]},
  {id:74,name:"Blaze Sage",lv:2,mc:3,ma:1,at:6,df:6,sp:3,el:"fire",tribe:"Mage",img:"OGcarddbseal/card_74.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Glowing Fire",at:9,mp:2}},{req:"fire",rt:"el",cnt:2,atk:{name:"Burning Blaze",at:10,mp:3}}],skill_text:["[Skill]- Sacrifice Seal 1 ใบ; Seal 1 ใบ +At ตาม Mp ค่าร่ายของ Seal ที่ถูก Sacrifice 1 Turn (Mp 2)"],ability_text:null},
  {id:75,name:"Albino Gryption",lv:2,mc:3,ma:1,at:6,df:7,sp:4,el:"water",tribe:"Beast",img:"OGcarddbseal/card_75.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"White Wing",at:9,mp:2}},{req:"Beast",rt:"tribe",cnt:1,atk:{name:"Wild Beak",at:10,mp:3}}],skill_text:null,ability_text:["[Beast] ทุกใบในมือเรา Mp ค่าร่าย -1"]},
  {id:76,name:"Thor Thunder God",lv:4,mc:5,ma:3,at:10,df:10,sp:5,el:"wind",tribe:"Divine",img:"OGcarddbseal/card_76.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Bolt Hammer",at:11,mp:3}},{req:"wind",rt:"el",cnt:2,atk:{name:"Shock Smash",at:13,mp:4}}],skill_text:null,ability_text:["ตราบเท่าที่ฝ่ายตรงข้ามมี Seal ที่ At Line นำ Thor, the Thunder God ในสนาม ไปที่ At Line เสมอ"]},
  {id:77,name:"Yggdrasil",lv:3,mc:5,ma:1,at:3,df:12,sp:0,el:"earth",tribe:"Plant",img:"OGcarddbseal/card_77.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Leaf of Life",df:3,mp:1}}],skill_text:["[Skill]- นำ Seal 1 ใบใน Shrine เราขึ้นมือ เมื่อ Yggdrasil รวมร่าง (Mp 3)"],ability_text:["Seal ที่อยู่ข้าง Yggdrasil Df =11 Sp =0 (Df Line)"]},
  {id:78,name:"Phoenix",lv:2,mc:2,ma:1,at:5,df:7,sp:4,el:"fire",tribe:"Beast",img:"OGcarddbseal/card_78.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Fire Wing",at:8,mp:2}},{req:"fire",rt:"el",cnt:2,atk:{name:"Rising Sun",at:11,mp:3}}],skill_text:["[Skill]- นำ Phoenix เข้ามาในสนามจาก Shrine เรา Interfere (Mp 2)"],ability_text:null},
  {id:79,name:"Golden Fur Griffin",lv:3,mc:3,ma:2,at:7,df:8,sp:3,el:"fire",tribe:"Beast",img:"OGcarddbseal/card_79.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Fire Wing Cutter",at:9,mp:3}}],skill_text:null,ability_text:["Golden Fur Griffin +At และ -Df ตามจำนวน [Beast] ใบอื่นในสนามฝ่ายเรา"]},
  {id:80,name:"Wool Wyvern",lv:2,mc:4,ma:2,at:8,df:9,sp:5,el:"wind",tribe:"Dragon",img:"OGcarddbseal/card_80.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Wave Wing",at:10,mp:3}},{req:"Dragon",rt:"tribe",cnt:1,atk:{name:"Soar Charge",at:12,mp:4}}],skill_text:["[Skill]- นำ Wool Wyvern เข้ามาในสนามจากมือ Interfere (Mp 4)"],ability_text:["ขณะที่ Wool Wyvern ต่อสู้กับ [Fire] Wool Wyvern At -2"]},
  {id:81,name:"Undine",lv:2,mc:4,ma:1,at:7,df:8,sp:4,el:"water",tribe:"Aria",img:"OGcarddbseal/card_81.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Silent Lake",at:9,mp:2}},{req:"water",rt:"el",cnt:2,atk:{name:"Wave Lashes",at:11,mp:3}}],skill_text:null,ability_text:["Seal ใบอื่นทุกใบในสนามฝ่ายเรา At +1 Df +2"]},
  {id:82,name:"Heaven Knight",lv:4,mc:5,ma:3,at:10,df:11,sp:5,el:"light",tribe:"Knight",img:"OGcarddbseal/card_82.jpg",fuse:[{req:"light",rt:"el",cnt:2,atk:{name:"Holy Light",at:12,mp:4}},{req:"wind",rt:"el",cnt:1,atk:{name:"Holy War",at:9,mp:5,all:true}}],skill_text:null,ability_text:["เมื่อ Heaven Knight อยู่ในสนาม ครบ 3 Turn นำ Heaven Knight เข้ากองการ์ดจากนั้นสลับกองการ์ดนั้น","Heaven Knight ยกเลิก Curse ของผู้เล่นทุกคนและ Mystic Card ฝ่ายตรงข้าม"]},
  {id:83,name:"Salamandera",lv:3,mc:4,ma:2,at:8,df:9,sp:3,el:"fire",tribe:"Dragon",img:"OGcarddbseal/card_83.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Dragon Fire",at:11,mp:3}},{req:"fire",rt:"el",cnt:2,atk:{name:"Blaze Breath",at:12,mp:4}}],skill_text:null,ability_text:["Salamandara +At ตามจำนวน Seal ที่อยู่ใน At Line ฝ่ายเรา","Salamandara -At ตามจำนวน Seal ที่อยู่ใน At Line ฝ่ายตรงข้าม"]},
  {id:84,name:"Jormungand",lv:3,mc:5,ma:3,at:10,df:11,sp:2,el:"water",tribe:"Dragon",img:"OGcarddbseal/card_84.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Freeze Breath",at:11,mp:3}},{req:"water",rt:"el",cnt:2,atk:{name:"Tidal Wave",at:10,mp:5,all:true}}],skill_text:["[Skill]- Freeze Curse (All) 1 Turn เมื่อ Jormungand รวมร่างกับ [Water] (At Line) (Mp 4)"],ability_text:["ขณะที่ Jormungand ต่อสู้กับ [Earth] Jormungand At -3"]},
  {id:85,name:"Tiamat Black Dragon",lv:3,mc:5,ma:2,at:9,df:10,sp:2,el:"darkness",tribe:"Dragon",img:"OGcarddbseal/card_85.jpg",fuse:[{req:"darkness",rt:"el",cnt:1,atk:{name:"Dark Fang",at:10,mp:3}},{req:"darkness",rt:"el",cnt:2,atk:{name:"Acid Breath",at:11,mp:4}}],skill_text:["[Skill]- ทิ้ง Seal 1 ใบในมือเรา; Tiamat, the Black Dragon + At ตาม Lv ของ Seal ใบนั้น 1 Turn Interfere (Mp 2)"],ability_text:["ขณะที่ Tiamat, the Black Dragon ต่อสู้กับ [Light] Tiamat, the Black Dragon At -3"]},
  {id:86,name:"Divine Dragon",lv:3,mc:5,ma:2,at:7,df:9,sp:3,el:"light",tribe:"Dragon",img:"OGcarddbseal/card_86.jpg",fuse:[{req:"light",rt:"el",cnt:1,atk:{name:"Albino Flame",at:9,mp:3}},{req:"light",rt:"el",cnt:2,atk:{name:"Aurora Beam",at:10,mp:4}}],skill_text:null,ability_text:["Divine Dragon +At ตามจำนวน Seal ในสนามฝ่ายตรงข้าม","ขณะที่ Divine Dragon ต่อสู้กับ [Knight] Divine Dragon At -2"]},
  {id:87,name:"Zalom's Rider",lv:2,mc:2,ma:1,at:6,df:6,sp:3,el:"fire",tribe:"Knight",img:"OGcarddbseal/card_87.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Golden Spear",at:9,mp:2}}],skill_text:["[Skill]- Seal 1 ใบ At +1 จนจบ Subturn (Mp 1)"],ability_text:null},
  {id:92,name:"Nerimor Princess Wands",lv:3,mc:4,ma:3,at:9,df:9,sp:4,el:"fire",tribe:"Aria",img:"OGcarddbseal/card_92.jpg",fuse:[{req:"fire",rt:"el",cnt:1,atk:{name:"Furious Flame",at:11,mp:3}},{req:"fire",rt:"el",cnt:2,atk:{name:"Burn Ruination",at:10,mp:5,all:true}}],skill_text:null,ability_text:["[Fire] ทุกใบในสนามฝ่ายเรา At +1 Df -3 (Df Line)"]},
  {id:93,name:"Alana Princess Cups",lv:3,mc:4,ma:2,at:9,df:10,sp:3,el:"water",tribe:"Aria",img:"OGcarddbseal/card_93.jpg",fuse:[{req:"water",rt:"el",cnt:1,atk:{name:"Diamond Mist",at:10,mp:3}},{req:"water",rt:"el",cnt:2,atk:{name:"Snowstorm",at:10,mp:5,all:true}}],skill_text:["[Skill]- นำ Seal ที่ติด Freeze Curse 1 ใบขึ้นมือ (At Line) (Mp 1)"],ability_text:null},
  {id:94,name:"Regina Princess Swords",lv:3,mc:4,ma:3,at:9,df:9,sp:5,el:"wind",tribe:"Aria",img:"OGcarddbseal/card_94.jpg",fuse:[{req:"wind",rt:"el",cnt:1,atk:{name:"Dancing Sword",at:11,mp:4}},{req:"wind",rt:"el",cnt:2,atk:{name:"Million Slash",at:10,mp:5,all:true}}],skill_text:["[Skill]- ผู้เล่นทุกคนนำ Seal ทุกใบในสนามฝ่ายตนไปที่ At Line เมื่อ Regina, Princess of Swords รวมร่างกับ [Wind] (At Line) (Mp 1)"],ability_text:null},
  {id:95,name:"Wanaan Princess Pentacles",lv:3,mc:4,ma:2,at:8,df:12,sp:3,el:"earth",tribe:"Aria",img:"OGcarddbseal/card_95.jpg",fuse:[{req:"earth",rt:"el",cnt:1,atk:{name:"Voice of Earth",at:10,mp:3}},{req:"earth",rt:"el",cnt:2,atk:{name:"Cry of Earth",at:10,mp:5,all:true}}],skill_text:["[Skill]- Seal ใบอื่น 1 ใบ +Df ตาม Mp ค่าร่ายของ Seal นั้นจนจบ Subturn Interfere (Mp 2)"],ability_text:null},
]; // _CARD_DB_FALLBACK ends here (not used when JSON loads successfully)

const _MYSTIC_DB_FALLBACK = [
  {id:17,name:"Holy Prayer",subtype:2,subtype_name:"The High Priestess",mc:2,pasted:"nonP",interfere:true,turns:0,rarity:"Common",img:"OGcarddbmystic/card_17.jpg",ability_text:["เลือก 1 อย่าง","★ รักษา Curse ทุกชนิดให้กับ Seal 1 ใบ","★ ทำลาย Mystic Card ชนิด [PS] 1 ใบในสนาม"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:18,name:"Galahad",subtype:7,subtype_name:"The Chariot",mc:2,pasted:"PS",interfere:false,turns:999,rarity:"Common",img:"OGcarddbmystic/card_18.jpg",ability_text:["เลือก 1 อย่าง","★ ถ้า Seal ที่ Galahad ติดคือ [Knight] → At +2","★ ถ้า Seal ที่ Galahad ติดคือ [Wind] → At +2 Sp +1"],exception_lv:3,exception_tribes:["Machine"],exception_els:[]},
  {id:19,name:"Crescent",subtype:18,subtype_name:"The Moon",mc:2,pasted:"PS",interfere:false,turns:999,rarity:"Common",img:"OGcarddbmystic/card_19.jpg",ability_text:["เลือก 1 อย่าง","★ ถ้า Seal ที่ Crescent ติดคือ [Dark] → At +2","★ ถ้า Seal ที่ Crescent ติดคือ [Water] → At +1, Ma -1"],exception_lv:3,exception_tribes:["Machine"],exception_els:[]},
  {id:21,name:"Holy Sun",subtype:19,subtype_name:"The Sun",mc:2,pasted:"PS",interfere:false,turns:999,rarity:"Common",img:"OGcarddbmystic/card_21.jpg",ability_text:["เลือก 1 อย่าง","★ ถ้า Seal ที่ Holy Sun ติดคือ [Light] → At +2","★ ถ้า Seal ที่ Holy Sun ติดคือ [Fire] → At +2","★ ถ้า Seal ที่ Holy Sun ติดคือ [Divine] → At +2"],exception_lv:3,exception_tribes:["Machine"],exception_els:[]},
  {id:24,name:"Werrian Wesley",subtype:1,subtype_name:"The Magician",mc:2,pasted:"PS",interfere:false,turns:999,rarity:"Common",img:"OGcarddbmystic/card_24.jpg",ability_text:["เลือก 1 อย่าง","★ ถ้า Seal ที่ Werrian Wesley ติดคือ [Mage] → At +2","★ ถ้า Seal ที่ Werrian Wesley ติดคือ [Earth] → At +2 Df +1"],exception_lv:3,exception_tribes:["Machine"],exception_els:[]},
  {id:25,name:"Beauty & the Beast",subtype:8,subtype_name:"Strength",mc:2,pasted:"PS",interfere:false,turns:999,rarity:"Common",img:"OGcarddbmystic/card_25.jpg",ability_text:["เลือก 1 อย่าง","★ ถ้า Seal ที่ติดคือ [Monster] → At +2","★ ถ้า Seal ที่ติดคือ [Beast] → At +2","★ ถ้า Seal ที่ติดคือ [Dragon] → At +1"],exception_lv:3,exception_tribes:["Machine"],exception_els:[]},
  {id:26,name:"Inquisition",subtype:5,subtype_name:"The Hierophant",mc:2,pasted:"nonP",interfere:true,turns:0,rarity:"Common",img:"OGcarddbmystic/card_26.jpg",ability_text:["ทำลาย Mystic Card ใบอื่น 1 ใบในสนาม"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:27,name:"Lighthouse",subtype:16,subtype_name:"The Tower",mc:1,pasted:"nonP",interfere:true,turns:0,rarity:"Common",img:"OGcarddbmystic/card_27.jpg",ability_text:["เลือก 1 อย่าง","★ ดูการ์ดทุกใบในมือฝ่ายตรงข้าม","★ ดูการ์ดใบบนสุด 1 ใบของกองการ์ดเราทุกกอง"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:29,name:"Release from Hell",subtype:15,subtype_name:"The Devil",mc:2,pasted:"PS",interfere:false,turns:999,rarity:"Common",img:"OGcarddbmystic/card_29.jpg",ability_text:["ถ้า Seal ที่ Release from Hell ติดคือ [Evil] → At +2 Df +1 Sp +1"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:30,name:"Houdini",subtype:12,subtype_name:"The Hanged Man",mc:2,pasted:"PS",interfere:true,turns:1,rarity:"Common",img:"OGcarddbmystic/card_30.jpg",ability_text:["Seal ที่ Houdini ติด ติด Stone Curse"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:31,name:"Yang",subtype:11,subtype_name:"Justice",mc:2,pasted:"PS",interfere:true,turns:1,rarity:"Common",img:"OGcarddbmystic/card_31.jpg",ability_text:["Seal ที่ Yang ติด -Df ตาม Lv ของ Seal ใบนั้น"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:32,name:"Yin",subtype:11,subtype_name:"Justice",mc:2,pasted:"PS",interfere:true,turns:1,rarity:"Common",img:"OGcarddbmystic/card_32.jpg",ability_text:["Seal ที่ Yin ติด -At ตาม Lv ของ Seal ใบนั้น"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:33,name:"Magical World",subtype:21,subtype_name:"The World",mc:2,pasted:"PS",interfere:false,turns:999,rarity:"Uncommon",img:"OGcarddbmystic/card_33.jpg",ability_text:["เลือกธาตุ 1 ธาตุ จากนั้น Seal ที่ Magical World ติดนับว่ารวมร่างกับธาตุที่เลือก (ถ้าธาตุที่เลือกไม่ตรงตามเงื่อนไขการรวมร่าง ทำลาย Magical World)"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:34,name:"Cunning Clown",subtype:0,subtype_name:"The Fool",mc:2,pasted:"PA",interfere:false,turns:0,rarity:"Uncommon",img:"OGcarddbmystic/card_34.jpg",ability_text:["ผู้เล่นฝ่ายตรงข้ามสลับ Seal ทุกใบ (ไม่ใช่ [Machine]) ระหว่าง At Line และ Df Line"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:35,name:"Nebuchadnezzar",subtype:4,subtype_name:"The Emperor",mc:3,pasted:"PA",interfere:false,turns:999,rarity:"Uncommon",img:"OGcarddbmystic/card_35.jpg",ability_text:["เราจำนวนการ์ดในมือสูงสุด +1"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:36,name:"Silent Prohibitor",subtype:9,subtype_name:"The Hermit",mc:2,pasted:"PS",interfere:false,turns:1,rarity:"Uncommon",img:"OGcarddbmystic/card_36.jpg",ability_text:["Seal ที่ Silent Prohibitor ติด ป้องกัน Mystic Card, Skill, การโจมตี และการถูกทำลายจากการสวนกลับ"],exception_lv:null,exception_tribes:["Evil"],exception_els:["darkness"]},
  {id:37,name:"Thunder Bolt",subtype:16,subtype_name:"The Tower",mc:3,pasted:"PS",interfere:true,turns:0,rarity:"Uncommon",img:"OGcarddbmystic/card_37.jpg",ability_text:["Seal ที่ Thunder Bolt ติด แยกการรวมร่าง"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:38,name:"Whirl to Win",subtype:10,subtype_name:"Wheel of Fortune",mc:3,pasted:"PS",interfere:true,turns:1,rarity:"Uncommon",img:"OGcarddbmystic/card_38.jpg",ability_text:["Seal ที่ Whirl to Win ติด สลับ At กับ Df"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:39,name:"Chaotic World",subtype:21,subtype_name:"The World",mc:2,pasted:"PS",interfere:true,turns:999,rarity:"Uncommon",img:"OGcarddbmystic/card_39.jpg",ability_text:["เลือกธาตุ 1 ธาตุ จากนั้น Seal ที่ Chaotic World ติดเปลี่ยนเป็นธาตุที่เลือก"],exception_lv:null,exception_tribes:[],exception_els:["divine"]},
  {id:40,name:"Benediction",subtype:20,subtype_name:"Judgement",mc:3,pasted:"nonP",interfere:false,turns:0,rarity:"Uncommon",img:"OGcarddbmystic/card_40.jpg",ability_text:["นำ Seal 1 ใบใน Shrine เราขึ้นมือ"],exception_lv:null,exception_tribes:["Evil","Machine"],exception_els:[]},
  {id:61,name:"Seven Silver",subtype:17,subtype_name:"The Star",mc:3,pasted:"PS",interfere:false,turns:1,rarity:"Uncommon",img:"OGcarddbmystic/card_61.jpg",ability_text:["Seal ที่ Seven Silver ติดสามารถใช้ท่าโจมตีได้ 2 ครั้ง โดยจ่าย Mp ค่าโจมตีเพียงครั้งเดียว"],exception_lv:4,exception_tribes:["Machine"],exception_els:[]},
  {id:66,name:"Sacrifice",subtype:13,subtype_name:"Death",mc:5,pasted:"nonP",interfere:false,turns:0,rarity:"Rare",img:"OGcarddbmystic/card_66.jpg",ability_text:["ทำลาย Seal 1 ใบในสนาม และทิ้ง Seal 2 ใบจากมือเรา"],exception_lv:null,exception_tribes:["Machine"],exception_els:[]},
  {id:68,name:"Will of True Mind",subtype:14,subtype_name:"Temperance",mc:2,pasted:"PS",interfere:false,turns:0,rarity:"Rare",img:"OGcarddbmystic/card_68.jpg",ability_text:["Seal ที่ Will of True Mind ติดสามารถใช้ท่าโจมตีหรือ Skill ได้โดยไม่ต้องตรงตามเงื่อนไขการรวมร่าง 1 ครั้งใน Subturn นี้"],exception_lv:null,exception_tribes:[],exception_els:[]},
  {id:69,name:"Cupid and Psyche",subtype:6,subtype_name:"The Lovers",mc:4,pasted:"PS",interfere:false,turns:999,rarity:"Rare",img:"OGcarddbmystic/card_69.jpg",ability_text:["Seal ที่ Cupid and Psyche ติด ติด Charm Curse"],exception_lv:3,exception_tribes:["Machine"],exception_els:["light"]},
  {id:70,name:"Marie Antoinette",subtype:3,subtype_name:"The Empress",mc:3,pasted:"PA",interfere:false,turns:999,rarity:"Rare",img:"OGcarddbmystic/card_70.jpg",ability_text:["เรา Mp สูงสุด +1 และ การ์ดในมือสูงสุด -1"],exception_lv:null,exception_tribes:[],exception_els:[]}
]; // _MYSTIC_DB_FALLBACK

const EL_COLOR={fire:"#f97316",water:"#38bdf8",earth:"#a16207",wind:"#4ade80",light:"#fde68a",darkness:"#a78bfa",colorless:"#94a3b8"};
const MAX_MP=8, MAX_SHRINE=15, HAND_MAX=7, LINE_MAX=4;

