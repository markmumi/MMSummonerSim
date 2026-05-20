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
          conn.on('data', data => E._applyHostState(data));
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
        const payload = {
          type: 'state',
          G: JSON.parse(JSON.stringify(G)),
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
          // Guest-side state (tracked on host, mirrored to guest)
          guestFusionMainUid: guestFusionMainFC ? guestFusionMainFC.uid : null,
          guestSkillModeUid: guestSkillMode ? guestSkillMode.fc.uid : null,
          guestSkillModeIdx: guestSkillMode ? guestSkillMode.skillIdx : null,
          guestHandDiscardActive: !!guestHandDiscardMode,
          guestMysticPlayActive: !!guestMysticPlayMode,
          guestPendingAtkIdx: guestPendingAtkIdx,
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

    // Guest: apply received game state from host and re-render
    _applyHostState(data) {
      if (data.type !== 'state') return;

      // Hide lobby if showing
      const lobby = document.getElementById('online-lobby');
      if (lobby && lobby.style.display !== 'none') lobby.style.display = 'none';

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

      // Action queue — show/hide based on host state
      const aqEl = document.getElementById('action-queue');
      if (data.pendingCb) {
        pendingCb = () => {};  // placeholder so render() shows queue UI
        if (aqEl) {
          aqEl.style.display = 'flex';
          const descEl = document.getElementById('aq-desc');
          if (descEl && data.aqDesc) descEl.innerHTML = data.aqDesc;
          // Proceed button: show only when it's guest's turn
          const btnProceed = document.getElementById('btn-proceed');
          if (btnProceed) btnProceed.style.display = (G.currentPlayer === 1) ? 'inline-block' : 'none';
          // Hide special interfere buttons (guest doesn't control those)
          ['btn-aq-garuda','btn-aq-woolwyvern','btn-aq-phoenix'].forEach(id => {
            const b = document.getElementById(id);
            if (b) b.style.display = 'none';
          });
        }
      } else {
        pendingCb = null;
        if (aqEl) aqEl.style.display = 'none';
      }

      render();
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
          if (pendingCb) proceedAction();
          break;
        case 'deploy': {
          const card = G.players[1].hand[data.cardIdx];
          if (card) guestDeploy(card, data.cardIdx, data.line);
          break;
        }
        case 'lineSwitch': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) guestLineSwitch(fc, data.fromLine, data.toLine);
          break;
        }
        case 'selectAttacker': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) {
            attackerSeal = { fc, line: data.line };
            log(`Guest selected ${fc.card.name} as attacker`, 'hi');
            render();
            E.broadcastState();
          }
          break;
        }
        case 'declareAttack':
          guestDeclareAttack(data.atkIdx ?? null);
          break;
        case 'selectTarget': {
          const defFC = [...G.players[0].atLine, ...G.players[0].dfLine].find(f => f.uid === data.targetUid);
          if (defFC && attackerSeal) guestResolveAttack(attackerSeal.fc, defFC, data.targetLine);
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
          if (card) executeInterfere(card);
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
          if (fc) { guestFusionMainFC = fc; render(); E.broadcastState(); }
          break;
        }
        case 'guestFuseMaterial': {
          const mat = g1all().find(f => f.uid === data.uid);
          if (mat && guestFusionMainFC) guestDoFusion(guestFusionMainFC, mat);
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
          if (fc) { guestSkillMode = { fc, skillIdx: data.skillIdx }; render(); E.broadcastState(); }
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
        case 'guestSelfSkill': {
          const fc = g1all().find(f => f.uid === data.uid);
          if (fc) guestExecuteSelfSkill(fc, data.skillIdx);
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
          if (m) { guestMysticPlayMode = { mysticCard: m, mysticIdx: data.mysticIdx }; render(); E.broadcastState(); }
          break;
        }
        case 'guestMysticPSTarget': {
          if (!guestMysticPlayMode) break;
          const targetFC = allField().find(f => f.uid === data.targetUid);
          if (targetFC) guestAttachPSMystic(guestMysticPlayMode.mysticCard, guestMysticPlayMode.mysticIdx, targetFC);
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
