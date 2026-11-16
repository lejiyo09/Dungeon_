'use strict';
// ════════════════════════════════════════════
// 멀티 연결 (1단계: 방 만들기·참가 + 로비에서 서로 보이기)
//  · 서버: server/server.js (Render). 게임을 Render 주소에서 열면 같은 주소로 자동 연결
//  · 다른 곳(예: 아티팩트 페이지)에서 열 때는 NET_CONFIG.server에 Render 주소를 적어 둠
//  · 게임 계산은 방장 브라우저가 맡을 예정 (2단계). 지금은 위치·외형만 주고받음
// ════════════════════════════════════════════
const NET_CONFIG = {
  server: '', // 예: 'wss://project-dungeon.onrender.com/ws' (비워 두면 게임이 열린 주소의 /ws 로 연결)
  maxPlayers: 4,
  sendHz: 10 // 위치를 보내는 횟수 (초당)
};
const Net = {
  ws: null, status: 'off', id: null, code: null, players: [], peers: new Map(), error: null, ping: null, handlers: [],
  url() {
    if (NET_CONFIG.server) return NET_CONFIG.server;
    if (/^https?:$/.test(location.protocol) && !/claude/.test(location.hostname)) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
    return null;
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
    ws.onopen = () => { this.status = 'online'; this.pingT = setInterval(() => this.raw({ t: 'ping', at: performance.now() }), 3000); const f = this.pendingThen; this.pendingThen = null; if (f) f(); };
    ws.onclose = () => { clearInterval(this.pingT); const was = this.status; this.reset(); if (was === 'connecting') this.error = '서버에 연결하지 못했습니다 (Render 무료 서버는 처음 깨어나는 데 30초~1분 걸릴 수 있어요)'; else if (was === 'online') this.error = '서버와 연결이 끊어졌습니다'; };
    ws.onerror = () => {};
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.onMessage(m); };
  },
  reset() { this.ws = null; this.status = 'off'; this.id = null; this.code = null; this.players = []; this.peers.clear(); this.ping = null; },
  raw(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); },
  create(name, hero) { this.connect(() => this.raw({ t: 'create', name, hero })); },
  join(code, name, hero) { this.connect(() => this.raw({ t: 'join', code, name, hero })); },
  leave() { this.raw({ t: 'leave' }); this.code = null; this.players = []; this.peers.clear(); },
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
  nameOf(id) { const p = this.players.find((q) => q.id === id); return p ? p.name : '?'; }
};
