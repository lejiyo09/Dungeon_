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
// 마지막 안전장치: 예상 못 한 오류가 나도 서버(방·랭킹)가 통째로 꺼지지 않게 기록만 하고 계속
process.on('uncaughtException', (e) => { console.error('uncaught', e && e.stack || e); });
process.on('unhandledRejection', (e) => { console.error('unhandled', e && e.stack || e); });

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
  msgPerSec: 80,               // 한 사람이 1초에 보낼 수 있는 메시지 (넘치면 버림)
  maxRooms: 200
};
const fileCache = new Map(); // 경로 → { mtime, etag, raw, gz } : 같은 파일을 매번 읽고 압축하지 않게

// ── 랭킹판 (성적): 메모리 + 파일, GH_TOKEN이 있으면 GitHub 저장소의 별도 브랜치에도 저장 (Render 무료 서버는 재시작하면 파일이 사라짐)
//  분야: stage(최고 도달) · kills(한 판 처치) · deep(심층 깊이) · coop(멀티 최고 도달, 파티 이름)
const SCORE_FILE = path.join(__dirname, 'scores.json');
const SCORE_KEEP = 30;
const GH = { token: process.env.GH_TOKEN || '', repo: process.env.GH_REPO || '', branch: process.env.GH_BRANCH || 'scores', file: 'scores.json', sha: null };
let scores = { stage: [], kills: [], deep: [], coop: [] }, scoresDirty = false;
try { scores = Object.assign(scores, JSON.parse(fs.readFileSync(SCORE_FILE, 'utf8'))); } catch (e) { /* 처음 */ }
const ghApi = async (p, opt = {}) => { const r = await fetch('https://api.github.com/repos/' + GH.repo + p, Object.assign({}, opt, { headers: { Authorization: 'Bearer ' + GH.token, Accept: 'application/vnd.github+json', 'User-Agent': 'project-dungeon-server' } })); return r; };
async function ghLoad() {
  if (!GH.token || !GH.repo) return;
  try { const r = await ghApi('/contents/' + GH.file + '?ref=' + GH.branch);
    if (r.ok) { const j = await r.json(); GH.sha = j.sha; const remote = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')); for (const k of Object.keys(scores)) for (const row of remote[k] || []) addScoreRow(k, row, true); console.log('scores loaded from GitHub'); }
    else if (r.status === 404) { scoresDirty = true; console.log('no scores file yet → will create'); } // 처음: 빈 랭킹 파일을 만들어 저장이 되는지 바로 확인
    else console.log('GitHub load failed', r.status);
  } catch (e) { console.log('GitHub load failed', e.message); }
}
async function ghSave() {
  if (!GH.token || !GH.repo || !scoresDirty) return; scoresDirty = false;
  try {
    let r = await ghApi('/git/ref/heads/' + GH.branch);
    if (r.status === 404) { const main = await (await ghApi('/git/ref/heads/main')).json(); await ghApi('/git/refs', { method: 'POST', body: JSON.stringify({ ref: 'refs/heads/' + GH.branch, sha: main.object.sha }) }); }
    r = await ghApi('/contents/' + GH.file, { method: 'PUT', body: JSON.stringify({ message: 'scores update', branch: GH.branch, sha: GH.sha || undefined, content: Buffer.from(JSON.stringify(scores)).toString('base64') }) });
    if (r.ok) GH.sha = (await r.json()).content.sha; else { if (r.status === 409 || r.status === 422) GH.sha = null; scoresDirty = true; console.log('GitHub save failed', r.status); }
  } catch (e) { scoresDirty = true; console.log('GitHub save failed', e.message); }
}
const SCORE_SORT = { stage: (a, b) => b.stage - a.stage || b.kills - a.kills, kills: (a, b) => b.kills - a.kills || b.stage - a.stage, deep: (a, b) => b.deep - a.deep || b.stage - a.stage, coop: (a, b) => b.stage - a.stage || b.kills - a.kills };
const SCORE_VAL = { stage: (r) => r.stage, kills: (r) => r.kills, deep: (r) => r.deep, coop: (r) => r.stage };
function addScoreRow(cat, row, quiet) {
  const list = scores[cat], key = cat === 'coop' ? row.party : row.name, i = list.findIndex((x) => (cat === 'coop' ? x.party : x.name) === key);
  if (i >= 0) { if (SCORE_SORT[cat](row, list[i]) >= 0) return false; list.splice(i, 1); } // 같은 이름(파티)은 최고 기록만
  list.push(row); list.sort(SCORE_SORT[cat]); list.length = Math.min(list.length, SCORE_KEEP);
  if (!quiet) scoresDirty = true; markDirty(); return true;
}
const scoreIpAt = new Map();
function submitScore(ip, b) {
  const name = String(b.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12); if (!name || name === '게스트') return '이름이 필요합니다';
  const now = Date.now(), key = ip + '|' + name; if (now - (scoreIpAt.get(key) || 0) < 15000) return '잠시 뒤에 다시 보내 주세요'; // 너무 자주 보내기 막기 (같은 집에서 함께 해도 사람마다 따로)
  if (scoreIpAt.size > 5000) scoreIpAt.clear();
  const n = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const row = { name, hero: String(b.hero || '').slice(0, 32), stage: n(b.stage, 400), label: String(b.label || '').slice(0, 16), deep: n(b.deep, 300), kills: n(b.kills, 50000), party: n(b.partySize, 4) || 1, victory: !!b.victory, at: now };
  scoreIpAt.set(key, now);
  if (row.stage > 0) addScoreRow('stage', row); if (row.kills > 0) addScoreRow('kills', row); if (row.deep > 0) addScoreRow('deep', row); // 지난 기록 올리기는 처치 수가 없을 수 있음
  if (row.party > 1 && Array.isArray(b.partyNames)) { const names = b.partyNames.map((x) => String(x).replace(/[\u0000-\u001f<>]/g, '').slice(0, 12)).filter(Boolean).slice(0, 4); if (names.length > 1) addScoreRow('coop', Object.assign({}, row, { party: names.join(' · ') })); }
  return null;
}
// 복구: 서버가 다시 시작돼 기록이 비었을 때, 랭킹을 본 적 있는 브라우저가 가진 사본으로 다시 채움
const restoreIpAt = new Map();
function restoreScores(ip, b) {
  const now = Date.now(); if (now - (restoreIpAt.get(ip) || 0) < 60000) return 0; restoreIpAt.set(ip, now); if (restoreIpAt.size > 5000) restoreIpAt.clear();
  const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n), num = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  let added = 0;
  for (const cat of ['stage', 'kills', 'deep', 'coop']) for (const r of (Array.isArray(b[cat]) ? b[cat] : []).slice(0, SCORE_KEEP)) {
    const name = clean(r.name, 12); if (!name || name === '게스트') continue;
    const row = { name, hero: clean(r.hero, 32), stage: num(r.stage, 400), label: clean(r.label, 16), deep: num(r.deep, 300), kills: num(r.kills, 50000), party: cat === 'coop' ? clean(r.party, 60) : num(r.party, 4) || 1, victory: !!r.victory, at: Math.min(now, num(r.at, now)) };
    if (cat === 'coop' && !row.party) continue; if (cat === 'deep' && !row.deep) continue;
    if (addScoreRow(cat, row)) added++;
  }
  return added;
}
// 저장은 모아서 (파일 1분, GitHub 5분마다 바뀐 게 있을 때만) + 서버가 꺼질 때(잠들기·재배포) 바로 저장
let fileDirty = false;
const markDirty = () => { fileDirty = true; scoresView = null; };
setInterval(() => { if (fileDirty) { fileDirty = false; try { fs.writeFileSync(SCORE_FILE, JSON.stringify(scores)); } catch (e) { /* 무시 */ } } }, 60000);
setInterval(() => { ghSave(); }, 5 * 60000);
let shuttingDown = false;
process.on('SIGTERM', async () => { if (shuttingDown) return; shuttingDown = true; try { fs.writeFileSync(SCORE_FILE, JSON.stringify(scores)); } catch (e) { /* 무시 */ } try { await Promise.race([ghSave(), new Promise((r) => setTimeout(r, 8000))]); } catch (e) { /* 무시 */ } process.exit(0); });
// 보여 줄 랭킹은 분야별 상위 15개만, 한 번 만든 응답(압축본·ETag)을 바뀔 때까지 재사용 → 같은 내용이면 304(내용 없음)
const SCORE_VIEW = 15;
let scoresView = null;
function scoresResponse() {
  if (scoresView) return scoresView;
  const v = { persist: !!(GH.token && GH.repo) }; for (const k of Object.keys(scores)) v[k] = scores[k].slice(0, SCORE_VIEW).map((r) => ({ name: r.name, hero: r.hero, stage: r.stage, label: r.label, deep: r.deep, kills: r.kills, victory: r.victory, party: r.party }));
  const raw = Buffer.from(JSON.stringify(v)); scoresView = { raw, gz: zlib.gzipSync(raw), etag: '"s' + crypto.createHash('sha1').update(raw).digest('base64').slice(0, 12) + '"' };
  return scoresView;
}
ghLoad();

// ── 정적 파일
const server = http.createServer((req, res) => {
  let p; try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { res.writeHead(400); res.end('bad request'); return; } // 잘못된 주소(%가 깨진 것 등)로 서버가 꺼지지 않게
  if (p === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok ' + rooms.size + ' rooms'); return; }
  if (p === '/api/scores') { // 랭킹판
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    if (req.method === 'GET') { const v = scoresResponse(), h = Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', ETag: v.etag, Vary: 'Accept-Encoding' }, cors);
      if ((req.headers['if-none-match'] || '') === v.etag) { res.writeHead(304, h); res.end(); return; }
      const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || ''); if (gz) h['Content-Encoding'] = 'gzip'; res.writeHead(200, h); res.end(gz ? v.gz : v.raw); return; }
    if (req.method === 'POST') { let body = ''; req.on('data', (c) => { body += c; if (body.length > 4000) req.destroy(); });
      req.on('end', () => { let b = {}; try { b = JSON.parse(body); } catch (e) { /* 무시 */ } const err = submitScore(req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress, b);
        res.writeHead(err ? 429 : 200, Object.assign({ 'Content-Type': 'application/json' }, cors)); res.end(JSON.stringify({ ok: !err, error: err })); }); return; }
    res.writeHead(405, cors); res.end(); return;
  }
  if (p === '/api/scores/restore' && (req.method === 'POST' || req.method === 'OPTIONS')) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    let body = ''; req.on('data', (c) => { body += c; if (body.length > 60000) req.destroy(); });
    req.on('end', () => { let b = {}; try { b = JSON.parse(body); } catch (e) { /* 무시 */ } const ip = req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress;
      const n = restoreScores(ip, b); res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors)); res.end(JSON.stringify({ ok: true, added: n })); }); return;
  }
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

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024, // 화면 공유 한 번이 커져도 연결이 끊기지 않게 (보통 수 KB)
  // 압축: 화면 공유(JSON)는 반복이 많아 크게 줄어듦 → Render 전송량 절약. 작은 메시지(위치·핑)는 압축하지 않음
  perMessageDeflate: { threshold: 512, zlibDeflateOptions: { level: 3, memLevel: 7 }, serverMaxWindowBits: 13, clientMaxWindowBits: 13, concurrencyLimit: 4 } });
wss.on('connection', (ws) => {
  ws.id = nextId++; ws.alive = true; ws.room = null; ws.since = Date.now(); ws.win = 0; ws.winAt = Date.now();
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (buf) => {
    const now = Date.now(); if (now - ws.winAt >= 1000) { ws.winAt = now; ws.win = 0; } if (++ws.win > LIMIT.msgPerSec) return; // 너무 많이 보내면 버림
    let m; try { m = JSON.parse(buf); } catch (e) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return; // null·숫자 같은 이상한 메시지는 무시 (서버가 꺼지지 않게)
    if (ws.room && m.t !== 'ping') ws.room.last = now;
    if (m.t === 'create' || m.t === 'join') {
      leave(ws);
      ws.name = clean(m.name, 12) || '모험가'; ws.hero = clean(m.hero, 32);
      let room;
      if (m.t === 'create') { if (rooms.size >= LIMIT.maxRooms) { send(ws, { t: 'error', msg: '지금은 방이 너무 많습니다. 잠시 뒤 다시 시도해 주세요' }); return; } room = { code: newCode(), players: [], last: Date.now() }; rooms.set(room.code, room); }
      else {
        room = rooms.get(clean(m.code, 4).toUpperCase());
        if (!room) { send(ws, { t: 'error', msg: '없는 방 코드입니다' }); return; }
        if (room.players.length >= MAX_PLAYERS) { send(ws, { t: 'error', msg: `방이 가득 찼습니다 (최대 ${MAX_PLAYERS}명)` }); return; }
        // 탐험 중인 방에도 들어올 수 있음 → 방장이 로비에 있는 새 사람을 진행 중인 탐험으로 불러옴 (예전엔 '이미 시작한 방'이라 막혀서, 방장이 탐험 중에 나가면 방이 계속 막혔음)
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
  ws.on('error', () => { /* 깨진 연결: close가 뒤따름 */ });
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
}, 10000); // 10초마다 확인 → 끊긴 연결을 20초 안에 정리 (동료 화면이 오래 멈춰 있지 않게)

server.listen(PORT, () => console.log(`PROJECT: DUNGEON server on :${PORT}`));
