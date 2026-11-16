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
const zlib = require('zlib');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 4;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
const BLOCK = ['server', 'tools', 'node_modules', '.git', 'versions']; // 밖으로 내보내지 않는 폴더
// ── 사용량 아끼기 (Render 무료 요금제: 아무도 안 쓰면 잠들게, 오가는 데이터는 작게)
const LIMIT = {
  lobbyIdleMs: 2 * 60 * 1000,  // 방에 안 들어간 연결은 2분 뒤 끊음 → 아무도 없으면 서버가 잠들 수 있게
  roomIdleMs: 10 * 60 * 1000,  // 10분 동안 아무 움직임 없는 방은 닫음 (창만 켜 두고 자리 비움)
  msgPerSec: 40,               // 한 사람이 1초에 보낼 수 있는 메시지 (넘치면 버림)
  maxRooms: 200
};
const fileCache = new Map(); // 경로 → { mtime, etag, raw, gz } : 같은 파일을 매번 읽고 압축하지 않게

// ── 정적 파일
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok ' + rooms.size + ' rooms'); return; }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || BLOCK.includes(rel.split(path.sep)[0])) { res.writeHead(404); res.end('not found'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    const send200 = (c) => {
      const headers = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: c.etag, Vary: 'Accept-Encoding' };
      if ((req.headers['if-none-match'] || '') === c.etag) { res.writeHead(304, headers); res.end(); return; } // 바뀌지 않았으면 내용 없이 응답 (데이터 절약)
      const gz = c.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
      if (gz) headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers); res.end(gz ? c.gz : c.raw);
    };
    const hit = fileCache.get(file);
    if (hit && hit.mtime === st.mtimeMs) { send200(hit); return; }
    fs.readFile(file, (e2, raw) => {
      if (e2) { res.writeHead(404); res.end('not found'); return; }
      const ext = path.extname(file), c = { mtime: st.mtimeMs, raw, etag: '"' + crypto.createHash('sha1').update(raw).digest('base64').slice(0, 16) + '"' };
      if (['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.md'].includes(ext)) c.gz = zlib.gzipSync(raw, { level: 9 }); // 글 파일은 압축해서 보냄 (약 1/4 크기)
      fileCache.set(file, c); send200(c);
    });
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
  ws.id = nextId++; ws.alive = true; ws.room = null; ws.since = Date.now(); ws.win = 0; ws.winAt = Date.now();
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (buf) => {
    const now = Date.now(); if (now - ws.winAt >= 1000) { ws.winAt = now; ws.win = 0; } if (++ws.win > LIMIT.msgPerSec) return; // 너무 많이 보내면 버림
    let m; try { m = JSON.parse(buf); } catch (e) { return; }
    if (ws.room && m.t !== 'ping') ws.room.last = now;
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'create' || m.t === 'join') {
      leave(ws);
      ws.name = clean(m.name, 12) || '모험가'; ws.hero = clean(m.hero, 32);
      let room;
      if (m.t === 'create') { if (rooms.size >= LIMIT.maxRooms) { send(ws, { t: 'error', msg: '지금은 방이 너무 많습니다. 잠시 뒤 다시 시도해 주세요' }); return; } room = { code: newCode(), players: [], last: Date.now() }; rooms.set(room.code, room); }
      else {
        room = rooms.get(clean(m.code, 4).toUpperCase());
        if (!room) { send(ws, { t: 'error', msg: '없는 방 코드입니다' }); return; }
        if (room.players.length >= MAX_PLAYERS) { send(ws, { t: 'error', msg: `방이 가득 찼습니다 (최대 ${MAX_PLAYERS}명)` }); return; }
        if (room.started) { send(ws, { t: 'error', msg: '이미 탐험을 시작한 방입니다' }); return; }
      }
      room.players.push(ws); ws.room = room; room.last = Date.now();
      broadcastPlayers(room);
    } else if (m.t === 'leave') { leave(ws); ws.since = Date.now(); send(ws, { t: 'players', code: null, you: ws.id, players: [] }); }
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
// 정리 (30초마다): 끊긴 연결 · 방에 안 들어간 채 오래된 연결 · 오래 조용한 방
setInterval(() => {
  const now = Date.now();
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    if (!ws.room && now - ws.since > LIMIT.lobbyIdleMs) { ws.close(4000, 'idle'); continue; }
    ws.alive = false; ws.ping();
  }
  for (const room of rooms.values()) if (now - room.last > LIMIT.roomIdleMs) {
    for (const p of room.players) { send(p, { t: 'error', msg: '오랫동안 움직임이 없어 방이 닫혔습니다' }); p.room = null; p.close(4001, 'room idle'); }
    rooms.delete(room.code);
  }
}, 30000);

server.listen(PORT, () => console.log(`PROJECT: DUNGEON server on :${PORT}`));
