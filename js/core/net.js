'use strict';
// ════════════════════════════════════════════
// 멀티 연결 (1단계: 방 만들기·참가 + 로비에서 서로 보이기)
//  · 서버: server/server.js (Render). 게임을 Render 주소에서 열면 같은 주소로 자동 연결
//  · 다른 곳(예: 아티팩트 페이지)에서 열 때는 NET_CONFIG.server에 Render 주소를 적어 둠
//  · 게임 계산은 방장 브라우저가 맡을 예정 (2단계). 지금은 위치·외형만 주고받음
// ════════════════════════════════════════════
const NET_CONFIG = {
  server: 'wss://project-dungeon.onrender.com/ws', // Render 서버 (아티팩트 등 다른 주소에서 열어도 이 서버로 연결·랭킹 기록)
  maxPlayers: 4,
  sendHz: 10, // 위치를 보내는 최대 횟수 (초당) — 가만히 있으면 2초에 한 번만 보냄 (데이터 절약)
  idleSend: 2
};
const Net = {
  ws: null, status: 'off', id: null, code: null, players: [], peers: new Map(), error: null, ping: null, handlers: [],
  url() {
    if (this.onServer()) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; // 게임을 서버 주소에서 열었으면 그 서버
    return NET_CONFIG.server || null; // GitHub Pages·아티팩트 등 다른 곳에서 열었으면 Render 서버
  },
  onServer() { // 게임 서버(server/server.js)가 직접 연 페이지인지: Render 주소 또는 내 컴퓨터·같은 와이파이에서 띄운 서버
    if (!/^https?:$/.test(location.protocol)) return false;
    const h = location.hostname, S = NET_CONFIG.server; let sh = ''; try { sh = new URL(S.replace(/^ws/, 'http')).hostname; } catch (e) { /* 주소 없음 */ }
    return h === sh || /\.onrender\.com$/.test(h) || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  },
  get inRoom() { return !!this.code; },
  get isHost() { const me = this.players.find((p) => p.id === this.id); return !!(me && me.host); },
  connect(then) {
    if (this.status === 'online') { if (then) then(); return; }
    const url = this.url();
    if (!url) { this.error = '멀티 서버 주소가 설정되지 않았습니다 (Render에 올린 주소에서 열거나 NET_CONFIG.server를 설정)'; this.status = 'off'; return; }
    if (this.status === 'connecting') return;
    this.status = 'connecting'; this.error = null; this.pendingThen = then;
    let ws; try { ws = new WebSocket(url); } catch (e) { this.status = 'off'; this.error = '연결할 수 없습니다'; return; }
    this.ws = ws;
    ws.onopen = () => { this.status = 'online'; this.pingT = setInterval(() => { if (!document.hidden) this.raw({ t: 'ping', at: performance.now() }); }, 5000); const f = this.pendingThen; this.pendingThen = null; if (f) f(); };
    ws.onclose = () => { clearInterval(this.pingT); const was = this.status; this.reset(); if (was === 'connecting') this.error = '서버에 연결하지 못했습니다 (Render 무료 서버는 처음 깨어나는 데 30초~1분 걸릴 수 있어요)'; else if (was === 'online') this.error = '서버와 연결이 끊어졌습니다'; };
    ws.onerror = () => {};
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.onMessage(m); };
  },
  reset() { this.ws = null; this.status = 'off'; this.id = null; this.code = null; this.players = []; this.peers.clear(); this.ping = null; },
  raw(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); },
  create(name, hero) { this.connect(() => this.raw({ t: 'create', name, hero })); },
  join(code, name, hero) { this.connect(() => this.raw({ t: 'join', code, name, hero })); },
  leave() { this.raw({ t: 'leave' }); this.code = null; this.players = []; this.peers.clear(); this.disconnect(); }, // 방을 나가면 연결도 끊음 → 서버가 잠들 수 있음
  disconnect() { const ws = this.ws; if (!ws) return; clearInterval(this.pingT); this.reset(); try { ws.onclose = null; ws.close(); } catch (e) { /* 무시 */ } },
  profile(name, hero) { if (this.inRoom) this.raw({ t: 'profile', name, hero }); },
  relay(data, to) { if (this.inRoom) this.raw({ t: 'relay', data, to }); },
  on(fn) { this.handlers.push(fn); },
  onMessage(m) {
    if (m.t === 'hello') this.id = m.id;
    else if (m.t === 'players') {
      this.code = m.code; this.id = m.you; this.players = m.players || []; this.error = null;
      for (const id of [...this.peers.keys()]) if (!this.players.some((p) => p.id === id)) this.peers.delete(id);
    } else if (m.t === 'left') this.peers.delete(m.id);
    else if (m.t === 'error') this.error = m.msg;
    else if (m.t === 'pong') this.ping = Math.round(performance.now() - m.at);
    else if (m.t === 'relay') {
      const d = m.data || {};
      if (d.k === 'pos') { // 다른 사람의 위치·외형
        const P = this.peers.get(m.from) || { id: m.from, x: d.x, y: d.y }; Object.assign(P, { tx: d.x, ty: d.y, face: d.f, hero: d.h, look: d.l, mode: d.m, moving: d.mv, seen: performance.now() });
        if (P.x === undefined || Math.hypot(P.x - d.x, P.y - d.y) > 120) { P.x = d.x; P.y = d.y; } // 멀리 떨어지면 순간이동
        this.peers.set(m.from, P);
      }
    }
    for (const fn of this.handlers) fn(m);
  },
  httpBase() { // 랭킹판 API 주소 (게임을 연 주소, 또는 NET_CONFIG.server에서)
    if (this.onServer()) return location.origin;
    return NET_CONFIG.server ? NET_CONFIG.server.replace(/^ws/, 'http').replace(/\/ws$/, '') : null;
  },
  async fetchScores() { // 브라우저가 ETag로 다시 확인 → 바뀌지 않았으면 서버는 내용 없이 응답 (데이터 절약)
    const b = this.httpBase(); if (!b) throw new Error('랭킹판은 서버 주소(Render)에서 열었을 때만 볼 수 있어요');
    if (this.scoreMem && performance.now() - this.scoreMem.at < 60000) return Object.assign({}, this.scoreMem.d); // 1분 안에 다시 열면 서버에 묻지 않음
    const r = await fetch(b + '/api/scores', { cache: 'no-cache' }); if (!r.ok) throw new Error('랭킹을 불러오지 못했습니다 (서버 응답 ' + r.status + ')');
    const d = await r.json(); this.scoreMem = { at: performance.now(), d }; return Object.assign({}, d); },
  // 랭킹 사본: 본 적 있는 기록을 이 브라우저에 보관 → 서버가 비어 있으면 다시 채워 넣음 (서버 재시작 대비)
  scoreKey(cat, r) { return cat === 'coop' ? r.party : r.name; },
  async syncScores() {
    const b = this.httpBase(); if (!b) throw new Error('랭킹판은 서버 주소(Render)에서 열었을 때만 볼 수 있어요');
    const d = await this.fetchScores(); let cache = {}; try { cache = JSON.parse(localStorage.getItem('pd_scores_cache') || '{}'); } catch (e) { cache = {}; }
    const missing = {}; let need = false;
    for (const cat of ['stage', 'kills', 'deep', 'coop']) { const have = new Map((d[cat] || []).map((r) => [this.scoreKey(cat, r), r]));
      missing[cat] = (cache[cat] || []).filter((r) => { const s = have.get(this.scoreKey(cat, r)); return !s || (cat === 'kills' ? r.kills > s.kills : cat === 'deep' ? r.deep > s.deep : r.stage > s.stage); });
      if (missing[cat].length) need = true; }
    if (need) { this.scoreMem = null; try { await fetch(b + '/api/scores/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(missing) }); const d2 = await this.fetchScores(); Object.assign(d, d2); d.restored = true; } catch (e) { /* 다음에 다시 */ } }
    const merged = {}; for (const cat of ['stage', 'kills', 'deep', 'coop']) { const m = new Map(); for (const r of [...(cache[cat] || []), ...(d[cat] || [])]) m.set(this.scoreKey(cat, r), r); merged[cat] = [...m.values()].slice(-60); }
    try { localStorage.setItem('pd_scores_cache', JSON.stringify(merged)); } catch (e) { /* 저장 공간 없음 */ }
    return d;
  },
  // 기록 보내기: 실패하면(서버가 깨어나는 중·연결 막힘·너무 자주 보냄) 이 기기에 보관했다가 다음 접속·랭킹 열기 때 다시 보냄
  submitScore(row) { const b = this.httpBase(); if (!b) return; this.scoreMem = null;
    const keep = () => { try { const q = JSON.parse(localStorage.getItem('pd_score_queue') || '[]'); q.push(row); localStorage.setItem('pd_score_queue', JSON.stringify(q.slice(-10))); } catch (e) { /* 저장 공간 없음 */ } };
    return fetch(b + '/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }).then((r) => { if (!r.ok) keep(); return r.ok; }).catch(() => { keep(); return false; }); },
  async flushScores() { // 보내지 못한 기록 다시 보내기 (같은 이름은 서버가 15초에 한 번만 받으므로 이름마다 가장 좋은 기록 하나씩)
    let q = []; try { q = JSON.parse(localStorage.getItem('pd_score_queue') || '[]'); localStorage.removeItem('pd_score_queue'); } catch (e) { return; }
    const best = new Map(); for (const r of q) { const o = best.get(r.name); if (!o) best.set(r.name, r); else best.set(r.name, Object.assign({}, r, { stage: Math.max(o.stage, r.stage), kills: Math.max(o.kills, r.kills), deep: Math.max(o.deep || 0, r.deep || 0), label: r.stage >= o.stage ? r.label : o.label, victory: o.victory || r.victory })); }
    for (const r of best.values()) await this.submitScore(r);
  },
  scoreErr(e) { // 연결 실패를 알아보기 쉬운 말로
    if (e && /랭킹|서버 주소/.test(e.message)) return e.message;
    return '랭킹 서버에 연결하지 못했어요 (무료 서버가 깨어나는 중일 수 있어요 — 30초~1분 뒤 다시 열어 주세요. 계속 안 되면 ' + this.httpBase() + ' 에서 열어 주세요)';
  },
  nameOf(id) { const p = this.players.find((q) => q.id === id); return p ? p.name : '?'; }
};
