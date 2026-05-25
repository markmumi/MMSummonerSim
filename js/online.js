// ══════════════════════════════════════════════
// ONLINE MULTIPLAYER — PeerJS wrapper
// Host = pi=0 (runs all engine logic, broadcasts state)
// Guest = pi=1 (sends action commands, receives & renders state)
// ══════════════════════════════════════════════
var Online = (() => {
  const PEER_PREFIX = 'MMSM2025-';
  let peer = null, conn = null;

  const E = {
    isOnline: false,
    isHost: false,
    localPlayerIdx: 0,  // 0=host, 1=guest
    roomCode: '',
    status: 'idle',     // idle|waiting|connecting|connected|disconnected|error
    onStatusChange: null,
    guestDeckData: null,

    _loadPeerJS(cb) {
      if (window.Peer) { cb(); return; }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = cb;
      s.onerror = () => {
        E._setStatus('error', 'ไม่สามารถโหลด PeerJS ได้ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
        console.error('[Online] Failed to load PeerJS from CDN');
      };
      document.head.appendChild(s);
    },

    _setStatus(s, msg) {
      E.status = s;
      if (E.onStatusChange) E.onStatusChange(s, msg);
    },

    // Host: create a room with a 6-char room code
    createRoom(onWaiting, onGuestConnected) {
      E.isHost = true;
      E.localPlayerIdx = 0;
      E._loadPeerJS(() => {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        E.roomCode = code;
        peer = new Peer(PEER_PREFIX + code, { debug: 0 });
        peer.on('open', () => {
          E._setStatus('waiting', code);
          if (onWaiting) onWaiting(code);
        });
        peer.on('connection', c => {
          conn = c;
          conn.on('open', () => {
            E.isOnline = true;
            E._setStatus('connected', null);
            console.log('[Online] Guest connected! isOnline=true (Host)');
            if(typeof log==='function')log('🌐 Online: Guest เชื่อมต่อแล้ว!','good');
          });
          conn.on('data', data => {
            if (data.type === 'deck') {
              E.guestDeckData = data.deck;
              if (onGuestConnected) onGuestConnected(data.deck);
            } else if (data.type === 'action') {
              E._handleGuestAction(data);
            }
          });
          conn.on('close', () => E._setStatus('disconnected', null));
          conn.on('error', err => console.error('PeerJS conn error:', err));
        });
        peer.on('error', err => {
          // ID taken: try a new code
          if (err.type === 'unavailable-id') {
            peer.destroy();
            peer = null;
            E.createRoom(onWaiting, onGuestConnected);
          } else {
            E._setStatus('error', err.type || String(err));
          }
        });
      });
    },

    // Guest: join a room by code
    joinRoom(code, onConnected) {
      E.isHost = false;
      E.localPlayerIdx = 1;
      E.roomCode = code;
      E._loadPeerJS(() => {
        peer = new Peer(undefined, { debug: 0 });
        peer.on('open', () => {
          E._setStatus('connecting', null);
          conn = peer.connect(PEER_PREFIX + code.toUpperCase().trim(), { reliable: true });
          conn.on('open', () => {
            E.isOnline = true;
            E._setStatus('connected', null);
            console.log('[Online] Connected to host! isOnline=true (Guest)');
            if(typeof log==='function')log('🌐 Online: เชื่อมต่อกับ Host สำเร็จ!','good');
            // Send guest deck data to host
            const deckData = localStorage.getItem('mm_playerDeck') || '{}';
            conn.send({ type: 'deck', deck: deckData });
            if (onConnected) onConnected();
          });
          conn.on('data', data => {
            if (data.type === 'anim') E._playAnim(data);
            else E._applyHostState(data);
          });
          conn.on('close', () => E._setStatus('disconnected', null));
          conn.on('error', err => console.error('PeerJS conn error:', err));
        });
        peer.on('error', err => E._setStatus('error', err.type || String(err)));
      });
    },

    // Host: serialize and send full game state to guest
    broadcastState() {
      if (!E.isHost || !conn || !E.isOnline) return;
      try {
        const aqEl = document.getElementById('aq-desc');
        // Sanitize G before sending to GUEST — strip HOST's private card data.
        // GUEST only needs counts (array length), not actual card objects with img paths.
        const safeG = JSON.parse(JSON.stringify(G));
        const h0 = G.players[0];
        safeG.players[0].hand      = Array(h0.hand.length).fill(null);
        safeG.players[0].deck      = Array(h0.deck.length).fill(null);
        safeG.players[0].mysticHand= Array((h0.mysticHand||[]).length).fill(null);
        safeG.players[0].mysticDeck= Array((h0.mysticDeck||[]).length).fill(null);
        safeG.players[0].shrine    = Array(h0.shrine.length).fill(null);
        const payload = {
          type: 'state',
          G: safeG,
          phase,
          turnNum,
          subTurnNum,
          fusionMode: fusionMode || false,
          handAttackedThisTurn: handAttackedThisTurn || false,
          drawsRemaining: drawsRemaining || 0,
          pendingCb: !!pendingCb,
          aqDesc: (pendingCb && aqEl) ? aqEl.innerHTML : '',
          attackerSealUid: attackerSeal ? attackerSeal.fc.uid : null,
          attackerSealLine: attackerSeal ? attackerSeal.line : null,
          hostLogs: (typeof _hostLogBuffer !== 'undefined') ? _hostLogBuffer.splice(0) : [],
          // Guest-side state (tracked on host, mirrored to guest)
          guestFusionMainUid: guestFusionMainFC ? guestFusionMainFC.uid : null,
          guestSkillModeUid: guestSkillMode ? guestSkillMode.fc.uid : null,
          guestSkillModeIdx: guestSkillMode ? guestSkillMode.skillIdx : null,
          guestHandDiscardActive: !!guestHandDiscardMode,
          guestMysticPlayActive: !!guestMysticPlayMode,
          guestPendingAtkIdx: guestPendingAtkIdx,
          winner: (typeof gameWinner !== 'undefined') ? gameWinner : null,
          pendingFusionMainUid: (typeof pendingFusionMain !== 'undefined' && pendingFusionMain) ? pendingFusionMain.uid : null,
          aqPreviewCard: (pendingCb && typeof _aqPreviewCard !== 'undefined') ? _aqPreviewCard : null,
          aqChainMode: (typeof _aqChainMode !== 'undefined') ? _aqChainMode : false,
          aqPassBits: (typeof _aqPassBits !== 'undefined') ? _aqPassBits : 0,
          interfereStack: (typeof _interfereStack !== 'undefined') ? _interfereStack.map(i=>i.desc) : [],
          lighthouseReveal: E._pendingLighthouseReveal || null,
        };
        conn.send(payload);
      } catch (e) {
        console.error('Online.broadcastState error:', e);
      }
    },

    // Guest: send an action command to host
    sendGuestAction(action) {
      if (E.isHost || !conn || !E.isOnline) return;
      conn.send({ type: 'action', ...action });
    },

    // Host: broadcast animation event to guest (called before playing locally)
    broadcastAnim(data) {
      if (!E.isHost || !conn || !E.isOnline) return;
      try { conn.send({ type: 'anim', ...data }); } catch(e) {}
    },

    // Guest: play animation received from host
    _playAnim(data) {
      if (data.type !== 'anim') return;
      const attPan = document.getElementById('ca-att-panel');
      const defPan = document.getElementById('ca-def-panel');
      if (!attPan || !defPan) return;
      attPan.classList.remove('ca-dead'); defPan.classList.remove('ca-dead');
      document.getElementById('ca-att-img').src = data.attImg;
      document.getElementById('ca-att-name').textContent = data.attName;
      document.getElementById('ca-def-img').src = data.defImg;
      document.getElementById('ca-def-name').textContent = data.defName;
      document.getElementById('ca-result').textContent = '';
      const modal = document.getElementById('combat-anim');
      if (modal) modal.style.display = 'flex';
      setTimeout(() => {
        if (typeof playSound === 'function') playSound('Damage');
        if (data.isHandReveal) {
          document.getElementById('ca-def-img').src = data.revealImg;
          document.getElementById('ca-def-name').textContent = data.revealName;
          defPan.classList.add('ca-dead');
          document.getElementById('ca-result').textContent = `${data.revealName} sent to Shrine!`;
        } else {
          if (data.defDies) defPan.classList.add('ca-dead');
          if (data.attDies) attPan.classList.add('ca-dead');
          document.getElementById('ca-result').textContent = data.result;
        }
        setTimeout(() => { if (modal) modal.style.display = 'none'; }, 600);
      }, 500);
    },

    // Guest: apply received game state from host and re-render
    _applyHostState(data) {
      if (data.type !== 'state') return;

      // Hide lobby if showing
      const lobby = document.getElementById('online-lobby');
      if (lobby && lobby.style.display !== 'none') lobby.style.display = 'none';

      // Replay log messages from host
      if (data.hostLogs && data.hostLogs.length && typeof log === 'function') {
        data.hostLogs.forEach(({msg, type}) => log(msg, type));
      }

      const _prevPhase = phase;
      G = data.G;
      phase = data.phase;
      turnNum = data.turnNum;
      subTurnNum = data.subTurnNum;
      fusionMode = data.fusionMode || false;
      handAttackedThisTurn = data.handAttackedThisTurn || false;
      drawsRemaining = data.drawsRemaining || 0;

      // Restore attackerSeal reference from uid
      if (data.attackerSealUid) {
        const all = [
          ...(G.players[0].atLine || []), ...(G.players[0].dfLine || []),
          ...(G.players[1].atLine || []), ...(G.players[1].dfLine || []),
        ];
        const fc = all.find(f => f.uid === data.attackerSealUid);
        attackerSeal = fc ? { fc, line: data.attackerSealLine || 'at' } : null;
      } else {
        attackerSeal = null;
      }

      // Restore guest-side state vars from host snapshot
      const allField = [
        ...(G.players[1].atLine || []), ...(G.players[1].dfLine || []),
        ...(G.players[0].atLine || []), ...(G.players[0].dfLine || []),
      ];
      guestFusionMainFC = data.guestFusionMainUid
        ? allField.find(f => f.uid === data.guestFusionMainUid) || null
        : null;
      if (data.guestSkillModeUid != null) {
        const sfc = allField.find(f => f.uid === data.guestSkillModeUid);
        guestSkillMode = sfc ? { fc: sfc, skillIdx: data.guestSkillModeIdx } : null;
      } else {
        guestSkillMode = null;
      }
      if (!data.guestHandDiscardActive) guestHandDiscardMode = null;
      if (!data.guestMysticPlayActive) guestMysticPlayMode = null;
      guestPendingAtkIdx = data.guestPendingAtkIdx ?? null;

      // Guest draw modal: show when it's guest's draw phase with draws remaining
      const drawModal = document.getElementById('draw-modal');
      if (G.currentPlayer === 1 && phase === 'draw' && drawsRemaining > 0) {
        if (drawModal) _showGuestDrawModal();
      } else {
        if (drawModal) drawModal.style.display = 'none';
      }

      // Sync chain state from host
      if(typeof _aqChainMode !== 'undefined') _aqChainMode = data.aqChainMode || false;
      if(typeof _aqPassBits !== 'undefined') _aqPassBits = data.aqPassBits || 0;
      // Sync interfere stack (display-only on guest — cb is null; HOST holds actual callbacks)
      if(typeof _interfereStack !== 'undefined') _interfereStack = (data.interfereStack||[]).map(desc=>({desc,cb:null}));

      // Action queue — show/hide based on host state
      const aqEl = document.getElementById('action-queue');
      if (data.pendingCb) {
        const wasAlreadyOpen = !!pendingCb;
        pendingCb = () => {};  // placeholder so render() shows queue UI
        if (aqEl) {
          aqEl.style.display = 'flex';
          const descEl = document.getElementById('aq-desc');
          if (descEl && data.aqDesc) descEl.innerHTML = data.aqDesc;
          if (data.aqPreviewCard) updateAIPreview(data.aqPreviewCard, '');
          // Determine proceed/wait display
          const guestIsDefender = G.currentPlayer === 0;
          const inChain = _aqChainMode || false;
          const guestPassedInChain = inChain && ((_aqPassBits||0) & 0b10);
          const btnProceed = document.getElementById('btn-proceed');
          const aqWait = document.getElementById('aq-waiting');
          if(guestPassedInChain){
            // GUEST already passed, waiting for HOST
            if(btnProceed)btnProceed.style.display='none';
            if(aqWait)aqWait.style.display='inline-block';
          } else if(inChain || guestIsDefender){
            // Chain mode: GUEST can proceed; or normal defender role
            if(btnProceed)btnProceed.style.display='inline-block';
            if(aqWait)aqWait.style.display='none';
          } else {
            // GUEST is attacker (currentPlayer===1) — wait
            if(btnProceed)btnProceed.style.display='none';
            if(aqWait)aqWait.style.display='inline-block';
          }
          // Show special interfere buttons for GUEST
          const p1=G.players[1];
          const pfmUid=data.pendingFusionMainUid;
          const guestCanAct = (inChain || guestIsDefender) && !guestPassedInChain;
          const canGaruda=guestCanAct&&p1.hand.some(c=>c.id===53)&&p1.mp>=4&&!!pfmUid;
          const canWyvern=guestCanAct&&p1.hand.some(c=>c.id===80)&&p1.mp>=4;
          const canPhoenix=guestCanAct&&p1.shrine.some(c=>c.id===78)&&p1.mp>=2;
          const garudaBtn=document.getElementById('btn-aq-garuda');
          const wyvernBtn=document.getElementById('btn-aq-woolwyvern');
          const phoenixBtn=document.getElementById('btn-aq-phoenix');
          if(garudaBtn){garudaBtn.style.display=canGaruda?'inline-block':'none';if(canGaruda)garudaBtn.onclick=()=>{Online.sendGuestAction({action:'guestGaruda',targetUid:pfmUid});garudaBtn.style.display='none';};}
          if(wyvernBtn){wyvernBtn.style.display=canWyvern?'inline-block':'none';if(canWyvern)wyvernBtn.onclick=()=>{Online.sendGuestAction({action:'guestWyvern'});wyvernBtn.style.display='none';};}
          if(phoenixBtn){phoenixBtn.style.display=canPhoenix?'inline-block':'none';if(canPhoenix)phoenixBtn.onclick=()=>{Online.sendGuestAction({action:'guestPhoenix'});phoenixBtn.style.display='none';};};
          // Start/restart guest-side 10s timer on fresh open or chain reset
          if ((!wasAlreadyOpen || (inChain && !guestPassedInChain)) && typeof _startAQTimer === 'function') {
            _startAQTimer(20000);
          }
        }
      } else {
        pendingCb = null;
        if (typeof _stopAQTimer === 'function') _stopAQTimer();
        if (aqEl) aqEl.style.display = 'none';
        updateAIPreview(null);
        // Reset for next open
        const btnP2=document.getElementById('btn-proceed');if(btnP2)btnP2.style.display='inline-block';
        const aqW2=document.getElementById('aq-waiting');if(aqW2)aqW2.style.display='none';
      }

      render();

      // Battle Phase animation for GUEST
      if (_prevPhase === 'main' && phase === 'battle' && typeof showBattlePhaseAnim === 'function') {
        if (!_guestBattleAnimFired) showBattlePhaseAnim();
        _guestBattleAnimFired = false;
      }

      // Dark Destiny GUEST pick — show after state update
      if (!E.isHost && G._pendingGuestDD && (G.players[1].mysticGrave||[]).length > 0) {
        const grave = G.players[1].mysticGrave;
        const faTitle = document.getElementById('fa-title');
        const faOpts = document.getElementById('fa-opts');
        const faModal = document.getElementById('fa-modal');
        if (faModal && !faModal.classList.contains('show')) {
          if (faTitle) faTitle.textContent = 'Dark Destiny [Ability]: นำ Mystic จาก Shrine ขึ้นมือ?';
          if (faOpts) {
            faOpts.innerHTML = '';
            grave.forEach((mc, i) => {
              const btn = document.createElement('button');
              btn.className = 'btn btn-green';
              btn.textContent = `✅ ${mc.name}`;
              btn.onclick = () => {
                faModal.classList.remove('show');
                Online.sendGuestAction({ action: 'guestDarkDestinyPick', graveIdx: i });
              };
              faOpts.appendChild(btn);
            });
            const skipBtn = document.createElement('button');
            skipBtn.className = 'btn btn-gray';
            skipBtn.textContent = '✗ ไม่ต้องการ';
            skipBtn.onclick = () => { faModal.classList.remove('show'); Online.sendGuestAction({ action: 'guestDarkDestinySkip' }); };
            faOpts.appendChild(skipBtn);
          }
          faModal.classList.add('show');
        }
      }

      // Lighthouse reveal: HOST sends actual card data; GUEST shows modal
      if(data.lighthouseReveal && typeof showRevealModal === 'function'){
        showRevealModal(data.lighthouseReveal.title, data.lighthouseReveal.cards);
      }

      // Win/lose screen for guest
      if (data.winner !== null && data.winner !== undefined) {
        const iWin = data.winner === 1; // guest is always pi=1
        const winScreen = document.getElementById('win-screen');
        if (winScreen && !winScreen.classList.contains('show')) {
          const winTitle = document.getElementById('win-title');
          const winSub = document.getElementById('win-sub');
          if (winTitle) winTitle.textContent = iWin ? 'YOU WIN!' : 'YOU LOSE!';
          if (winSub) winSub.textContent = iWin ? 'Enemy shrine overflowed!' : 'Your shrine overflowed!';
          winScreen.classList.add('show');
          const bgm = document.getElementById('bgm');
          if (bgm) { bgm.pause(); bgm.currentTime = 0; }
          const vol = parseFloat(localStorage.getItem('bgm_volume') || '0.5');
          const muted = localStorage.getItem('bgm_muted') === '1';
          const snd = new Audio(iWin ? 'SoundEffect/music/Summoner Win Chime.mp3' : 'SoundEffect/music/Summoner Lose.mp3');
          snd.volume = vol; snd.muted = muted; snd.play().catch(() => {});
        }
      }
    },

    // Host: process incoming guest action
    _handleGuestAction(data) {
      if (!E.isHost || data.type !== 'action') return;
      const g1all = () => [...G.players[1].atLine, ...G.players[1].dfLine];
      const allField = () => [
        ...G.players[0].atLine, ...G.players[0].dfLine,
        ...G.players[1].atLine, ...G.players[1].dfLine,
      ];
      switch (data.action) {
        case 'nextPhase':
          guestNextPhase();
          break;
        case 'proceed':
          if(pendingCb){
            if(_aqChainMode){
              _aqPassBits|=0b10; // GUEST passed in chain mode
              if(_aqPassBits&0b01){
                // HOST already passed → both passed → resolve
                _aqChainMode=false;_aqPassBits=0;
                proceedAction();
              } else {
                // HOST hasn't passed yet → tell GUEST to keep waiting
                E.broadcastState();
              }
            } else {
              proceedAction(); // normal resolve
            }
          }
          break;
        case 'deploy': {
          const card = G.players[1].hand[data.cardIdx];
          if (card){updateAIPreview(card,'⬇ Guest Deploying...');guestDeploy(card, data.cardIdx, data.line);}
          break;
        }
        case 'lineSwitch': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc){updateAIPreview(fc.card,`→ ${data.toLine==='at'?'At':'Df'} Line`);guestLineSwitch(fc, data.fromLine, data.toLine);}
          break;
        }
        case 'selectAttacker': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) {
            updateAIPreview(fc.card,'⚔ Attacking...');
            attackerSeal = { fc, line: data.line };
            log(`Guest selected ${fc.card.name} as attacker`, 'hi');
            render();
            E.broadcastState();
          }
          break;
        }
        case 'declareAttack':
          if(attackerSeal)updateAIPreview(attackerSeal.fc.card,'⚔ Attacking...');
          guestDeclareAttack(data.atkIdx ?? null);
          break;
        case 'selectTarget': {
          const defFC = [...G.players[0].atLine, ...G.players[0].dfLine].find(f => f.uid === data.targetUid);
          if (defFC && attackerSeal){updateAIPreview(attackerSeal.fc.card,'⚔ Attacking...');guestResolveAttack(attackerSeal.fc, defFC, data.targetLine);}
          break;
        }
        case 'interfere': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) startInterfereSkill(fc, data.skillIdx);
          break;
        }
        case 'handDiscard': {
          // Interfere handDiscard (for host's Tiamat-style skills during action queue)
          const card = G.players[1].hand[data.cardIdx];
          if (card){ executeInterfere(card); } // _enterChainMode called inside executeInterfere
          break;
        }
        // ── Draw phase ──
        case 'guestDrawSeal': guestDrawSeal(); break;
        case 'guestDrawMystic': guestDrawMystic(); break;
        // ── Discard step ──
        case 'guestDiscardSeal': guestForceDiscardSeal(data.cardIdx); break;
        case 'guestDiscardMystic': guestForceDiscardMystic(data.mysticIdx); break;
        // ── Fusion ──
        case 'guestStartFusion': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) { updateAIPreview(fc.card,'⚡ Guest Fusing...'); guestFusionMainFC = fc; render(); E.broadcastState(); }
          break;
        }
        case 'guestFuseMaterial': {
          const mat = g1all().find(f => f.uid === data.uid);
          if (mat && guestFusionMainFC){updateAIPreview(guestFusionMainFC.card,'⚡ Fusing...'); guestDoFusion(guestFusionMainFC, mat);}
          break;
        }
        case 'guestUnfuse': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) guestDoUnfuse(fc);
          break;
        }
        case 'guestCancelFusion':
          guestFusionMainFC = null; render(); E.broadcastState(); break;
        // ── Skills ──
        case 'guestStartSkill': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) { updateAIPreview(fc.card,'✦ Guest Skill'); guestSkillMode = { fc, skillIdx: data.skillIdx }; render(); E.broadcastState(); }
          break;
        }
        case 'guestSkillTarget': {
          if (!guestSkillMode) break;
          const targetFC = allField().find(f => f.uid === data.targetUid);
          if (targetFC) guestExecuteSkill(guestSkillMode.fc, guestSkillMode.skillIdx, targetFC, data.targetPi, data.targetLine);
          else { guestSkillMode = null; E.broadcastState(); }
          break;
        }
        case 'guestCancelSkill':
          guestSkillMode = null; render(); E.broadcastState(); break;
        case 'guestHandPickBeast': {
          const fc=g1all().find(f=>f.uid===data.uid);
          if(!fc)break;
          const skill=getCardSkills(fc)[data.skillIdx];
          if(!skill)break;
          const p=G.players[1];
          const ci=data.cardIdx;
          if(ci>=p.hand.length)break;
          const card=p.hand[ci];
          if(card.tribe!=='Beast'){logErr('ต้องเลือก [Beast]');break;}
          showActionQueue(`${fc.card.name} [Skill] → ${card.name} ลงสนาม`,()=>{
            p.mp-=skill.mp;fc.hasUsedSkill=true;
            p.hand.splice(ci,1);
            p.atLine.push(makeFieldCard(card,true));
            log(`${fc.card.name} [Skill]: ${card.name} ลงสนาม!`,'good');
            checkLose();render();E.broadcastState();
          });
          break;
        }
        case 'guestGaruda': {
          const p=G.players[1];
          const garuda=p.hand.find(c=>c.id===53);
          if(garuda)updateAIPreview(garuda,'⚡ Guest Interfere');
          const mainFC=allField().find(f=>f.uid===data.targetUid)||pendingFusionMain;
          if(!garuda||p.mp<4||!mainFC)break;
          const hi=p.hand.indexOf(garuda);p.hand.splice(hi,1);
          p.mp-=4;
          const garudaFC=makeFieldCard(garuda,false);
          garudaFC.deployedTurn=turnNum;
          p.atLine.push(garudaFC);
          const attAt=garudaFC.card.at;
          log(`Gale Garuda (Guest) [Interfere]: ลงสนามและโจมตี ${mainFC.card.name}!`,'good');
          combatAnim(garudaFC,mainFC,attAt,'at',false,()=>{
            dealDamage(garudaFC,mainFC,attAt,'Gale Garuda Interfere',1,0,'at');
            checkLose();render();E.broadcastState();
          });
          break;
        }
        case 'guestWyvern': {
          const p=G.players[1];
          const wyvern=p.hand.find(c=>c.id===80);
          if(wyvern)updateAIPreview(wyvern,'⚡ Guest Interfere');
          if(!wyvern||p.mp<4)break;
          const hi=p.hand.indexOf(wyvern);p.hand.splice(hi,1);
          p.mp-=4;
          const wyvernFC=makeFieldCard(wyvern,false);
          wyvernFC.deployedTurn=turnNum;
          p.atLine.push(wyvernFC);
          log('Wool Wyvern (Guest) [Interfere]: ลงสนาม!','good');
          checkLose();render();_enterChainMode('Wool Wyvern');
          break;
        }
        case 'guestPhoenix': {
          const p=G.players[1];
          const phoenix=p.shrine.find(c=>c.id===78);
          if(phoenix)updateAIPreview(phoenix,'⚡ Guest Interfere');
          if(!phoenix||p.mp<2)break;
          p.mp-=2;
          const si=p.shrine.indexOf(phoenix);if(si>=0)p.shrine.splice(si,1);
          const phoenixFC=makeFieldCard(phoenix,false);
          phoenixFC.deployedTurn=turnNum;
          p.atLine.push(phoenixFC);
          log('Phoenix (Guest) [Interfere]: ฟื้นคืนชีพจาก Shrine!','good');
          checkLose();render();_enterChainMode('Phoenix');
          break;
        }
        case 'guestSelfSkill': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc){updateAIPreview(fc.card,'✦ Guest Skill'); guestExecuteSelfSkill(fc, data.skillIdx);}
          break;
        }
        case 'guestStartHandDiscard': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) { guestHandDiscardMode = { fc, skillIdx: data.skillIdx }; render(); E.broadcastState(); }
          break;
        }
        case 'guestHandDiscard':
          guestExecuteHandDiscard(data.cardIdx); break;
        // ── Mystic ──
        case 'guestStartMysticPS': {
          const m = (G.players[1].mysticHand || [])[data.mysticIdx];
          if (m) { updateAIPreview(m,'🃏 Guest Mystic'); guestMysticPlayMode = { mysticCard: m, mysticIdx: data.mysticIdx }; render(); E.broadcastState(); }
          break;
        }
        case 'guestMysticPSTarget': {
          if (!guestMysticPlayMode) break;
          const targetFC = allField().find(f => f.uid === data.targetUid);
          if (targetFC) guestAttachPSMystic(guestMysticPlayMode.mysticCard, guestMysticPlayMode.mysticIdx, targetFC, data.extraData);
          else { guestMysticPlayMode = null; E.broadcastState(); }
          break;
        }
        case 'guestCancelMysticPS':
          guestMysticPlayMode = null; render(); E.broadcastState(); break;
        case 'guestMysticPA': {
          const m = (G.players[1].mysticHand || [])[data.mysticIdx];
          if (m) guestPlayPAMystic(m, data.mysticIdx);
          break;
        }
        case 'guestMysticInstant': {
          const m = (G.players[1].mysticHand || [])[data.mysticIdx];
          if (m) guestPlayNonPMystic(m, data.mysticIdx);
          break;
        }
        case 'guestLighthouse': {
          const m = (G.players[1].mysticHand || [])[data.mysticIdx];
          if(!m) break;
          const p1 = G.players[1];
          p1.mp -= m.mc;
          p1.mysticHand.splice(data.mysticIdx, 1);
          playSound('Spell');
          let revealCards, revealTitle;
          if(data.choice === 'hand'){
            const hp = G.players[0];
            revealCards = [...hp.hand, ...(hp.mysticHand||[])];
            revealTitle = '🔍 Lighthouse: มือ HOST';
            log(`Lighthouse (Guest): เปิดดูมือ HOST!`, 'good');
          } else {
            revealCards = [...p1.deck.slice(0,1), ...(p1.mysticDeck||[]).slice(0,1)];
            revealTitle = '🔍 Lighthouse: ใบบนสุดกอง Guest';
            log(`Lighthouse (Guest): เปิดดูใบบนสุด!`, 'good');
          }
          checkLose(); render();
          E._pendingLighthouseReveal = {title: revealTitle, cards: revealCards};
          if(pendingCb) _enterChainMode('Lighthouse');
          else E.broadcastState();
          E._pendingLighthouseReveal = null;
          break;
        }
        case 'guestNonPResolved': {
          const m = (G.players[1].mysticHand || [])[data.mysticIdx];
          if (m) guestPlayNonPMysticResolved(m, data.mysticIdx, data.resolution);
          break;
        }
        case 'guestDarkDestinyPick': {
          G._pendingGuestDD = false;
          const p = G.players[1];
          const grave = p.mysticGrave || [];
          if (data.graveIdx >= 0 && data.graveIdx < grave.length) {
            const mc = grave.splice(data.graveIdx, 1)[0];
            (p.mysticHand = p.mysticHand || []).push(mc);
            log(`Guest Dark Destiny [Ability]: นำ ${mc.name} จาก Shrine ขึ้นมือ!`, 'good');
          }
          render(); Online.broadcastState();
          break;
        }
        case 'guestDarkDestinySkip': {
          G._pendingGuestDD = false;
          render(); Online.broadcastState();
          break;
        }
        default:
          console.warn('Unknown guest action:', data.action);
      }
    },
  };

  // Helper: populate guest draw modal using G.players[1] data (called on guest side)
  function _showGuestDrawModal() {
    const p = G.players[1];
    const canSeal = p.deck.length > 0;
    const canMystic = (p.mysticDeck || []).length > 0;
    const mhand = (p.mysticHand || []).length;
    const combined = p.hand.length + mhand;
    const dm = document.getElementById('draw-modal');
    if (!dm) return;
    const dlEl = document.getElementById('draws-left');
    if (dlEl) dlEl.textContent = drawsRemaining;
    const sBtn = document.getElementById('draw-choice-seal');
    const mBtn = document.getElementById('draw-choice-mystic');
    if (sBtn) {
      sBtn.classList.toggle('disabled', !canSeal);
      sBtn.onclick = () => Online.sendGuestAction({ action: 'guestDrawSeal' });
    }
    if (mBtn) {
      mBtn.classList.toggle('disabled', !canMystic);
      mBtn.onclick = () => Online.sendGuestAction({ action: 'guestDrawMystic' });
    }
    const sCount = document.getElementById('draw-seal-count');
    const mCount = document.getElementById('draw-mystic-count');
    const cCount = document.getElementById('draw-combined-count');
    if (sCount) sCount.textContent = `Seal ${p.hand.length} ใบ | กอง ${p.deck.length}`;
    if (mCount) mCount.textContent = `Mystic ${mhand} ใบ | กอง ${(p.mysticDeck || []).length}`;
    if (cCount) {
      cCount.textContent = `มือรวม ${combined}/${HAND_COMBINED_MAX} ใบ`;
      cCount.style.color = combined >= HAND_COMBINED_MAX ? '#fbbf24' : '#9ca3af';
    }
    if (!canSeal && !canMystic) {
      dm.style.display = 'none';
      Online.sendGuestAction({ action: 'guestDrawSeal' }); // triggers guestEnterDiscardOrMain
      return;
    }
    dm.style.display = 'block';
  }

  return E;
})();
