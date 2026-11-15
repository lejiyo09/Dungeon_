'use strict';
// ════════════════════════════════════════════
// 맵
// ════════════════════════════════════════════
class DungeonMap {
  constructor(w, h, palette) {
    this.width = w; this.height = h; this.palette = palette;
    this.tiles = new Uint8Array(w * h);
    this.rooms = []; this.edges = []; this.cache = null; this.decorate = null;
  }
  get(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return T_VOID;
    return this.tiles[ty * this.width + tx];
  }
  set(tx, ty, v) {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return;
    this.tiles[ty * this.width + tx] = v;
  }
  isSolidTile(tx, ty) { return this.get(tx, ty) !== T_FLOOR; }
  isSolidAt(px, py) { return this.isSolidTile(Math.floor(px / TILE), Math.floor(py / TILE)); }
  tileCenter(tx, ty) { return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }; }
  roomAtPoint(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    for (const r of this.rooms)
      if (tx >= r.x0 && tx < r.x0 + r.w && ty >= r.y0 && ty < r.y0 + r.h) return r;
    return null;
  }
  isFullyInside(ent, r) {
    const m = TILE / 2;
    return ent.x - ent.half >= r.x0 * TILE + m && ent.x + ent.half <= (r.x0 + r.w) * TILE - m &&
           ent.y - ent.half >= r.y0 * TILE + m && ent.y + ent.half <= (r.y0 + r.h) * TILE - m;
  }
  setDoors(room, closed) { for (const d of room.doors) this.set(d.x, d.y, closed ? T_DOOR : T_FLOOR); }
  carveRoom(x0, y0, w, h) {
    for (let ty = y0 - 1; ty <= y0 + h; ty++)
      for (let tx = x0 - 1; tx <= x0 + w; tx++) this.set(tx, ty, T_WALL);
    for (let ty = y0; ty < y0 + h; ty++)
      for (let tx = x0; tx < x0 + w; tx++) this.set(tx, ty, T_FLOOR);
  }

  buildCache() {
    const pal = this.palette;
    const c = document.createElement('canvas');
    c.width = this.width * TILE; c.height = this.height * TILE;
    const g = c.getContext('2d');
    const floorAt = (tx, ty) => this.get(tx, ty) === T_FLOOR;
    const inRoom = new Uint8Array(this.width * this.height);
    for (const r of this.rooms)
      for (let ty = r.y0; ty < r.y0 + r.h; ty++) for (let tx = r.x0; tx < r.x0 + r.w; tx++) inRoom[ty * this.width + tx] = 1;
    for (let ty = 0; ty < this.height; ty++)
      for (let tx = 0; tx < this.width; tx++) {
        if (!floorAt(tx, ty)) continue;
        const cols = inRoom[ty * this.width + tx] ? pal.floor : pal.corridor;
        drawFloorTile(g, tx * TILE, ty * TILE, cols[(tx + ty) % 2], pal.style);
        if (pal.deco && Math.random() < 0.07) { g.fillStyle = pal.deco; g.fillRect(tx * TILE + randInt(2, 12), ty * TILE + randInt(2, 12), 2, 1); }
      }
    const overlay = { boss: 'rgba(200,40,60,0.13)', treasure: 'rgba(220,180,60,0.10)', shop: 'rgba(80,200,120,0.10)',
      exit: 'rgba(80,160,255,0.12)', start: 'rgba(80,140,255,0.05)' };
    for (const r of this.rooms)
      if (overlay[r.type]) { g.fillStyle = overlay[r.type]; g.fillRect(r.x0 * TILE, r.y0 * TILE, r.w * TILE, r.h * TILE); }
    if (this.decorate) this.decorate(g);
    for (let ty = 0; ty < this.height; ty++)
      for (let tx = 0; tx < this.width; tx++) {
        const t = this.get(tx, ty);
        if (t !== T_WALL && t !== T_DOOR) continue;
        const face = floorAt(tx, ty + 1);
        drawWallTile(g, tx * TILE, ty * TILE, pal, face);
        if (face) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(tx * TILE, (ty + 1) * TILE, TILE, 3); }
      }
    this.cache = c;
  }
  render(ctx, cam) {
    if (!this.cache) this.buildCache();
    const sx = Math.max(0, Math.floor(cam.x)), sy = Math.max(0, Math.floor(cam.y));
    const sw = Math.min(VIEW_W + 2, this.cache.width - sx), sh = Math.min(VIEW_H + 2, this.cache.height - sy);
    if (sw > 0 && sh > 0) ctx.drawImage(this.cache, sx, sy, sw, sh, sx, sy, sw, sh);
  }
  renderDoors(ctx, time) {
    for (const r of this.rooms) {
      if (r.state !== 'active') continue;
      for (const d of r.doors) {
        const x = d.x * TILE, y = d.y * TILE;
        ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#2a1c10';
        for (let i = 2; i < TILE; i += 4) ctx.fillRect(x + i, y, 2, TILE);
        ctx.fillStyle = `rgba(255,80,60,${0.4 + 0.3 * Math.sin(time * 6)})`; ctx.fillRect(x, y, TILE, 2);
      }
    }
  }
}

// ── 절차적 던전: 5x5 격자 위 랜덤 트리 → 특수방은 먼 막다른 방부터 배정
function generateDungeon(opts) {
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (x, y) => x + ',' + y;
  const cells = new Map(), order = [], edges = [];
  const add = (gx, gy) => { const c = { gx, gy, links: [] }; cells.set(key(gx, gy), c); order.push(c); return c; };
  const start = add(2, 2);
  let guard = 0;
  while (order.length < opts.roomCount && guard++ < 5000) {
    const from = pick(order);
    if (from.links.length >= 3) continue;
    const [dx, dy] = pick(DIRS);
    const nx = from.gx + dx, ny = from.gy + dy;
    if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H || cells.has(key(nx, ny))) continue;
    const c = add(nx, ny);
    from.links.push(c); c.links.push(from); edges.push([from, c]);
  }
  start.dist = 0;
  const q = [start];
  while (q.length) { const c = q.shift(); for (const n of c.links) if (n.dist === undefined) { n.dist = c.dist + 1; q.push(n); } }
  const leaves = order.filter((c) => c !== start && c.links.length === 1).sort((a, b) => b.dist - a.dist);
  start.type = 'start';
  const assigned = new Set([start]);
  for (const type of opts.specials) {
    const cell = leaves.find((c) => !assigned.has(c)) || pick(order.filter((c) => !assigned.has(c)));
    if (!cell) break;
    cell.type = type; assigned.add(cell);
  }
  for (const c of order) if (!c.type) c.type = 'combat';

  const map = new DungeonMap(GRID_W * CELL_W, GRID_H * CELL_H, opts.palette);
  const SIZES = { start: [11, 9], treasure: [11, 9], shop: [13, 9], exit: [11, 9], boss: [23, 17] };
  for (const c of order) {
    const [w, h] = SIZES[c.type] || [15 + 2 * randInt(0, 2), 11 + 2 * randInt(0, 1)];
    const cx = c.gx * CELL_W + (CELL_W >> 1), cy = c.gy * CELL_H + (CELL_H >> 1);
    const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
    const room = { type: c.type, gx: c.gx, gy: c.gy, x0, y0, w, h, cx, cy, doors: [],
      state: (c.type === 'combat' || c.type === 'boss') ? 'idle' : 'cleared',
      visited: c.type === 'start', wavesLeft: c.type === 'combat' ? opts.waves : 0 };
    c.room = room;
    map.carveRoom(x0, y0, w, h);
    if (c.type === 'combat') placeCover(map, room);
    map.rooms.push(room);
  }
  for (const [a, b] of edges) {
    const ra = a.room, rb = b.room;
    if (a.gy === b.gy) {
      const L = ra.gx < rb.gx ? ra : rb, R = L === ra ? rb : ra, y = L.cy;
      const xs = L.x0 + L.w, xe = R.x0 - 1;
      for (let x = xs; x <= xe; x++) {
        for (let d = -1; d <= 1; d++) map.set(x, y + d, T_FLOOR);
        for (const d of [-2, 2]) if (map.get(x, y + d) === T_VOID) map.set(x, y + d, T_WALL);
      }
      for (let d = -1; d <= 1; d++) { L.doors.push({ x: xs, y: y + d }); R.doors.push({ x: xe, y: y + d }); }
    } else {
      const T = ra.gy < rb.gy ? ra : rb, B = T === ra ? rb : ra, x = T.cx;
      const ys = T.y0 + T.h, ye = B.y0 - 1;
      for (let y = ys; y <= ye; y++) {
        for (let d = -1; d <= 1; d++) map.set(x + d, y, T_FLOOR);
        for (const d of [-2, 2]) if (map.get(x + d, y) === T_VOID) map.set(x + d, y, T_WALL);
      }
      for (let d = -1; d <= 1; d++) { T.doors.push({ x: x + d, y: ys }); B.doors.push({ x: x + d, y: ye }); }
    }
    map.edges.push([ra, rb]);
  }
  map.startRoom = start.room;
  map.roomOf = (type) => map.rooms.find((r) => r.type === type) || null;
  return map;
}

function placeCover(map, r) {
  const block = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) map.set(x + i, y + j, T_WALL); };
  const { cx, cy } = r;
  switch (randInt(0, 3)) {
    case 0: block(cx - 5, cy - 3, 2, 2); block(cx + 4, cy - 3, 2, 2); block(cx - 5, cy + 2, 2, 2); block(cx + 4, cy + 2, 2, 2); break;
    case 1: block(cx - 3, cy - 3, 7, 1); block(cx - 3, cy + 3, 7, 1); break;
    case 2: block(cx - 1, cy - 1, 3, 3); break;
    default: break;
  }
}

// ── 로비 맵 (고정 레이아웃)
function buildLobby() {
  const map = new DungeonMap(34, 24, LOBBY_PALETTE);
  const room = { type: 'lobby', gx: 0, gy: 0, x0: 3, y0: 4, w: 28, h: 16, cx: 17, cy: 12, doors: [], state: 'cleared', visited: true, wavesLeft: 0 };
  map.carveRoom(room.x0, room.y0, room.w, room.h);
  // 기둥
  for (const [x, y] of [[6, 7], [27, 7], [6, 16], [27, 16]]) map.set(x, y, T_WALL);
  map.rooms.push(room);
  map.startRoom = room;
  map.decorate = (g) => {
    // 카펫
    g.fillStyle = '#5a2a2a'; g.fillRect(12 * TILE, 10 * TILE, 10 * TILE, 7 * TILE);
    g.fillStyle = '#7a3a34'; g.fillRect(12 * TILE + 3, 10 * TILE + 3, 10 * TILE - 6, 7 * TILE - 6);
    g.fillStyle = '#c89a40';
    g.fillRect(12 * TILE + 6, 10 * TILE + 6, 10 * TILE - 12, 1); g.fillRect(12 * TILE + 6, 17 * TILE - 7, 10 * TILE - 12, 1);
    // 캐릭터 단상 바닥 띠
    g.fillStyle = 'rgba(255,220,150,0.06)'; g.fillRect(9 * TILE, 4 * TILE, 16 * TILE, 5 * TILE);
  };
  return map;
}

