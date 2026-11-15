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

  // 맵 전체를 한 장의 캔버스에 미리 그림 (테마 타일 + 장식). 횃불·용암 빛은 renderAnim에서 매 프레임
  buildCache() {
    const pal = this.palette, style = pal.style || 'stone';
    const c = document.createElement('canvas');
    c.width = this.width * TILE; c.height = this.height * TILE;
    const g = c.getContext('2d');
    this.cache = c; this.cacheCtx = g;
    this.inRoom = new Uint8Array(this.width * this.height);
    for (const r of this.rooms)
      for (let ty = r.y0; ty < r.y0 + r.h; ty++) for (let tx = r.x0; tx < r.x0 + r.w; tx++) this.inRoom[ty * this.width + tx] = 1;
    const solidish = (t) => t === T_WALL || t === T_DOOR || t === T_COVER || t === T_CRATE;
    // 1) 바닥 (엄폐물·상자 아래에도 바닥을 깔아 둠)
    for (let ty = 0; ty < this.height; ty++)
      for (let tx = 0; tx < this.width; tx++) {
        const t = this.get(tx, ty);
        if (t === T_FLOOR || t === T_COVER || t === T_CRATE) this.drawFloorAt(g, tx, ty);
      }
    // 2) 방 색조 + 방 장식
    const overlay = { boss: 'rgba(200,40,60,0.10)', treasure: 'rgba(220,180,60,0.07)', shop: 'rgba(80,200,120,0.07)', exit: 'rgba(80,160,255,0.08)' };
    for (const r of this.rooms) {
      if (overlay[r.type]) { g.fillStyle = overlay[r.type]; g.fillRect(r.x0 * TILE, r.y0 * TILE, r.w * TILE, r.h * TILE); }
      drawRoomArt(g, r, pal);
    }
    if (this.decorate) this.decorate(g);
    // 3) 벽 (+ 바닥에 드리운 그림자)
    for (let ty = 0; ty < this.height; ty++)
      for (let tx = 0; tx < this.width; tx++) {
        const t = this.get(tx, ty);
        if (t !== T_WALL && t !== T_DOOR) continue;
        const below = this.get(tx, ty + 1), face = below === T_FLOOR || below === T_COVER || below === T_CRATE;
        drawWallTile(g, tx * TILE, ty * TILE, pal, face, style, tx, ty);
        if (face) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(tx * TILE, (ty + 1) * TILE, TILE, 3); }
      }
    // 4) 엄폐물·상자
    for (let ty = 0; ty < this.height; ty++)
      for (let tx = 0; tx < this.width; tx++) {
        const t = this.get(tx, ty);
        if (t === T_COVER) drawCover(g, tx * TILE, ty * TILE, style, tx, ty);
        else if (t === T_CRATE) drawCrate(g, tx * TILE, ty * TILE, style);
      }
    // 5) 애니메이션 위치: 방 윗벽의 횃불, 용암 균열
    this.torches = []; this.glows = [];
    for (const r of this.rooms) {
      const ty = r.y0 - 1;
      for (let tx = r.x0 + 1; tx < r.x0 + r.w - 1; tx++) {
        if ((tx - r.x0) % 4 !== 2 || this.get(tx, ty) !== T_WALL || this.get(tx, ty + 1) !== T_FLOOR) continue;
        if (r.doors.some((d) => Math.abs(d.x - tx) <= 1 && d.y === ty)) continue;
        this.torches.push({ x: tx * TILE + 8, y: ty * TILE + 10, seed: hash2(tx, ty, 7) * 10 });
      }
    }
    if (style === 'basalt')
      for (let ty = 0; ty < this.height; ty++) for (let tx = 0; tx < this.width; tx++)
        if (this.get(tx, ty) === T_FLOOR && hash2(tx, ty, 5) < 0.1) this.glows.push({ x: tx * TILE + 8, y: ty * TILE + 8, seed: hash2(tx, ty, 9) * 10 });
  }
  drawFloorAt(g, tx, ty) {
    const pal = this.palette, cols = this.inRoom[ty * this.width + tx] ? pal.floor : pal.corridor;
    drawFloorTile(g, tx * TILE, ty * TILE, cols[(tx + ty) % 2], pal.style || 'stone', tx, ty);
  }
  // 상자가 부서진 자리를 바닥으로 다시 그림
  redrawTile(tx, ty) {
    if (!this.cacheCtx) return;
    const g = this.cacheCtx;
    this.drawFloorAt(g, tx, ty);
    const above = this.get(tx, ty - 1);
    if (above === T_WALL || above === T_DOOR) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(tx * TILE, ty * TILE, TILE, 3); }
    for (const r of this.rooms) if (tx >= r.x0 && tx < r.x0 + r.w && ty >= r.y0 && ty < r.y0 + r.h && r.type === 'boss') drawRoomArt(g, r, this.palette);
  }
  // 횃불 불꽃·빛, 용암 균열의 맥동
  renderAnim(ctx, time, cam) {
    const T = THEME[this.palette.style] || THEME.stone;
    const vis = (o) => o.x > cam.x - 40 && o.x < cam.x + VIEW_W + 40 && o.y > cam.y - 40 && o.y < cam.y + VIEW_H + 40;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const t of this.torches) {
      if (!vis(t)) continue;
      const f = 0.8 + 0.2 * Math.sin(time * 9 + t.seed) + 0.1 * Math.sin(time * 23 + t.seed * 3);
      const grd = ctx.createRadialGradient(t.x, t.y - 2, 0, t.x, t.y - 2, 30 * f);
      grd.addColorStop(0, T.torch + '55'); grd.addColorStop(1, T.torch + '00');
      ctx.fillStyle = grd; ctx.fillRect(t.x - 32, t.y - 34, 64, 64);
    }
    for (const gl of this.glows) {
      if (!vis(gl)) continue;
      const a = 0.12 + 0.1 * Math.sin(time * 2.5 + gl.seed);
      const grd = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, 14);
      grd.addColorStop(0, `rgba(255,110,40,${a})`); grd.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = grd; ctx.fillRect(gl.x - 14, gl.y - 14, 28, 28);
    }
    ctx.restore();
    for (const t of this.torches) { // 횃대 + 일렁이는 불꽃
      if (!vis(t)) continue;
      const x = Math.round(t.x), y = Math.round(t.y), fr = Math.floor(time * 10 + t.seed) % 3;
      ctx.fillStyle = OUTLINE; ctx.fillRect(x - 2, y, 4, 3); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - 1, y, 2, 4);
      ctx.fillStyle = T.torch; ctx.fillRect(x - 2, y - 3 - (fr === 1 ? 1 : 0), 4, 3); ctx.fillRect(x - 1 + (fr === 2 ? 1 : 0), y - 5 - (fr === 1 ? 1 : 0), 2, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 2, 2, 1);
    }
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
  const SIZES = { start: [11, 9], treasure: [11, 9], shop: [13, 9], exit: [11, 9], boss: [23, 17], fountain: [11, 9], altar: [11, 9], gamble: [11, 9], challenge: [17, 13] };
  for (const c of order) {
    const [w, h] = SIZES[c.type] || [15 + 2 * randInt(0, 2), 11 + 2 * randInt(0, 1)];
    const cx = c.gx * CELL_W + (CELL_W >> 1), cy = c.gy * CELL_H + (CELL_H >> 1);
    const x0 = cx - (w >> 1), y0 = cy - (h >> 1);
    const room = { type: c.type, gx: c.gx, gy: c.gy, x0, y0, w, h, cx, cy, doors: [],
      state: (c.type === 'combat' || c.type === 'boss') ? 'idle' : 'cleared',
      visited: c.type === 'start', wavesLeft: c.type === 'combat' ? opts.waves : 0 };
    c.room = room;
    map.carveRoom(x0, y0, w, h);
    if (c.type === 'combat' || c.type === 'challenge') placeCover(map, room);
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
  for (const r of map.rooms) if (r.type === 'combat') placeCrates(map, r, randInt(2, 5)); else if (r.type === 'start') placeCrates(map, r, 1);
  map.startRoom = start.room;
  map.roomOf = (type) => map.rooms.find((r) => r.type === type) || null;
  return map;
}

// 전투방 엄폐물 (문 통로를 막지 않고, 큰 적도 지나가도록 2칸 이상 틈 유지)
function placeCover(map, r) {
  const block = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) map.set(x + i, y + j, T_COVER); };
  const { cx, cy } = r;
  switch (randInt(0, 6)) {
    case 0: block(cx - 5, cy - 3, 2, 2); block(cx + 4, cy - 3, 2, 2); block(cx - 5, cy + 2, 2, 2); block(cx + 4, cy + 2, 2, 2); break;
    case 1: block(cx - 3, cy - 3, 7, 1); block(cx - 3, cy + 3, 7, 1); break;
    case 2: block(cx - 1, cy - 1, 3, 3); break;
    case 3: block(cx - 4, cy - 3, 2, 2); block(cx + 3, cy + 2, 2, 2); break;
    case 4: for (const [dx, dy] of [[-4, -3], [0, -3], [4, -3], [-4, 3], [0, 3], [4, 3]]) block(cx + dx, cy + dy, 1, 1); break;
    case 5: block(cx - 4, cy - 2, 1, 5); block(cx + 4, cy - 2, 1, 5); break;
    default: break;
  }
}
// 부서지는 상자: 주변 8칸이 모두 바닥인 자리에만 (길을 막지 않도록), 문 앞·방 중앙 제외
function placeCrates(map, r, n) {
  for (let k = 0, tries = 0; k < n && tries < 80; tries++) {
    const tx = randInt(r.x0 + 1, r.x0 + r.w - 2), ty = randInt(r.y0 + 1, r.y0 + r.h - 2);
    if (Math.abs(tx - r.cx) <= 2 && Math.abs(ty - r.cy) <= 2) continue;
    if (r.doors.some((d) => Math.abs(d.x - tx) + Math.abs(d.y - ty) <= 3)) continue;
    let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (map.get(tx + dx, ty + dy) !== T_FLOOR) { ok = false; break; }
    if (!ok) continue;
    map.set(tx, ty, T_CRATE); k++;
  }
}

// ── 로비 맵 (고정 레이아웃)
function buildLobby() {
  const map = new DungeonMap(34, 24, LOBBY_PALETTE);
  const room = { type: 'lobby', gx: 0, gy: 0, x0: 3, y0: 4, w: 28, h: 16, cx: 17, cy: 12, doors: [], state: 'cleared', visited: true, wavesLeft: 0 };
  map.carveRoom(room.x0, room.y0, room.w, room.h);
  // 기둥
  for (const [x, y] of [[4, 5], [29, 5], [6, 16], [27, 16]]) map.set(x, y, T_WALL);
  map.rooms.push(room);
  map.startRoom = room;
  map.decorate = (g) => {
    // 카펫
    g.fillStyle = '#5a2a2a'; g.fillRect(12 * TILE, 10 * TILE, 10 * TILE, 7 * TILE);
    g.fillStyle = '#7a3a34'; g.fillRect(12 * TILE + 3, 10 * TILE + 3, 10 * TILE - 6, 7 * TILE - 6);
    g.fillStyle = '#c89a40';
    g.fillRect(12 * TILE + 6, 10 * TILE + 6, 10 * TILE - 12, 1); g.fillRect(12 * TILE + 6, 17 * TILE - 7, 10 * TILE - 12, 1);
    // 캐릭터 단상 바닥 띠
    g.fillStyle = 'rgba(255,220,150,0.06)'; g.fillRect(5 * TILE, 4 * TILE, 24 * TILE, 5 * TILE);
  };
  return map;
}

