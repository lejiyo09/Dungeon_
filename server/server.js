'use strict';
// ════════════════════════════════════════════
// PROJECT: DUNGEON 멀티 서버 (Render 배포용)
//  · 게임 파일(정적)을 그대로 제공 + /ws 웹소켓으로 방 관리·메시지 중계
//  · 게임 계산은 방장(호스트) 브라우저가 하고, 서버는 방 안의 메시지를 전달만 함 (서버 부담 최소)
//  · 방: 대문자 4글자 코드, 최대 4명. 방장이 나가면 남은 사람 중 가장 먼저 들어온 사람이 방장
// ════════════════════════════════════════════
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 4;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
const BLOCK = ['server', 'tools', 'node_modules', '.git']; // 밖으로 내보내지 않는 폴더

// ── 정적 파일
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok ' + rooms.size + ' rooms'); return; }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || BLOCK.includes(rel.split(path.sep)[0])) { res.writeHead(404); res.end('not found'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ── 방
const rooms = new Map(); // code → { code, players: [ws...] }
let nextId = 1;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 헷갈리는 I·O 제외
function newCode() { for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; if (!rooms.has(c)) return c; } }
const send = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const info = (ws) => ({ id: ws.id, name: ws.name, hero: ws.hero, host: ws.room && ws.room.players[0] === ws });
function broadcastPlayers(room) { const list = room.players.map(info); for (const p of room.players) send(p, { t: 'players', code: room.code, you: p.id, players: list }); }
function leave(ws) {
  const room = ws.room; if (!room) return;
  room.players = room.players.filter((p) => p !== ws); ws.room = null;
  if (!room.players.length) { rooms.delete(room.code); return; }
  for (const p of room.players) send(p, { t: 'left', id: ws.id });
  broadcastPlayers(room); // 방장이 나갔으면 다음 사람이 방장 (players[0])
}
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').slice(0, n);

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
wss.on('connection', (ws) => {
  ws.id = nextId++; ws.alive = true; ws.room = null;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (buf) => {
    let m; try { m = JSON.parse(buf); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'create' || m.t === 'join') {
      leave(ws);
      ws.name = clean(m.name, 12) || '모험가'; ws.hero = clean(m.hero, 32);
      let room;
      if (m.t === 'create') { room = { code: newCode(), players: [] }; rooms.set(room.code, room); }
      else {
        room = rooms.get(clean(m.code, 4).toUpperCase());
        if (!room) { send(ws, { t: 'error', msg: '없는 방 코드입니다' }); return; }
        if (room.players.length >= MAX_PLAYERS) { send(ws, { t: 'error', msg: `방이 가득 찼습니다 (최대 ${MAX_PLAYERS}명)` }); return; }
        if (room.started) { send(ws, { t: 'error', msg: '이미 탐험을 시작한 방입니다' }); return; }
      }
      room.players.push(ws); ws.room = room;
      broadcastPlayers(room);
    } else if (m.t === 'leave') { leave(ws); send(ws, { t: 'players', code: null, you: ws.id, players: [] }); }
    else if (m.t === 'profile') { ws.name = clean(m.name, 12) || ws.name; ws.hero = clean(m.hero, 32) || ws.hero; if (ws.room) broadcastPlayers(ws.room); }
    else if (m.t === 'start') { if (ws.room && ws.room.players[0] === ws) ws.room.started = !!m.on; } // 방장이 탐험 시작/종료 → 시작 중에는 새 참가 막음
    else if (m.t === 'relay') { // 방 안의 다른 사람에게 전달 (to: 특정 id, 없으면 나를 뺀 전원)
      const room = ws.room; if (!room) return;
      const out = JSON.stringify({ t: 'relay', from: ws.id, data: m.data });
      for (const p of room.players) if (p !== ws && (!m.to || p.id === m.to) && p.readyState === 1) p.send(out);
    } else if (m.t === 'ping') send(ws, { t: 'pong', at: m.at });
  });
  ws.on('close', () => leave(ws));
  send(ws, { t: 'hello', id: ws.id });
});
// 끊긴 연결 정리 (30초마다)
setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); } }, 30000);

server.listen(PORT, () => console.log(`PROJECT: DUNGEON server on :${PORT}`));
