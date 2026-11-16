'use strict';
// ════════════════════════════════════════════
// 맵 아트: 월드 테마별 바닥·벽·엄폐물·상자, 바닥 장식, 방 장식, 횃불·용암 애니메이션
//  테마(style): moss(숲) / ice(얼음) / basalt(용암) / void(공허) / sand(모래 무덤) / metal(태엽 공장) / swamp(독 늪지) / bone(망자의 성) / mine(수정 광산) / sanctum(기원의 성역) / abyss·starfall(심층) / wood(로비)
//  타일마다 좌표 해시로 무작위를 정해서 같은 타일은 언제 다시 그려도 똑같이 나옴
// ════════════════════════════════════════════
function hash2(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, -1640531535);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function pxs(g, c, pts) { g.fillStyle = c; for (const [x, y, w = 1, h = 1] of pts) g.fillRect(x, y, w, h); }
function fillEll(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.4)) ** 2))); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
}
function pixelCircle(g, cx, cy, r, c, gap = 0) { // 도트 원 테두리
  g.fillStyle = c;
  const n = Math.ceil(r * 6.3);
  for (let i = 0; i < n; i++) { if (gap && (i % gap) === 0) continue; const a = i / n * TAU; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
}

const THEME = {
  moss: { moss: '#3f6a2e', mossHi: '#5a8a3e', grass: '#6aa04a', flower: ['#ffd84a', '#ff8ab0', '#ffffff'], torch: '#ffb040', ambient: [20, 30, 10, 0.25] },
  ice: { torch: '#bfefff', ambient: [20, 40, 70, 0.3] },
  basalt: { lava: '#ff6a2a', lavaHi: '#ffc04a', torch: '#ff8a3a', ambient: [60, 10, 0, 0.32] },
  void: { rune: '#9a6ae0', star: '#d8c8ff', torch: '#c080ff', ambient: [20, 0, 40, 0.42] },
  sand: { sand: '#c8a868', glyph: '#4a3a22', torch: '#ffc060', ambient: [50, 30, 0, 0.22] },
  metal: { rivet: '#9aa2ac', stripe: '#d0a030', pipe: '#6a5a4a', torch: '#7affff', ambient: [0, 20, 30, 0.3] },
  swamp: { water: '#2a4a3a', waterHi: '#4a7a5a', reed: '#6a8a3a', torch: '#9aff5a', ambient: [10, 30, 10, 0.32] },
  bone: { bone: '#c8c0b0', rune: '#7affc0', torch: '#7affc0', ambient: [0, 20, 20, 0.4] },
  mine: { crystal: '#ff7ad0', crystalHi: '#ffc0ec', rail: '#6a5a4a', torch: '#ffb040', ambient: [30, 10, 30, 0.34] },
  sanctum: { gold: '#c8a050', light: '#ffe9a0', torch: '#ffe9a0', ambient: [30, 25, 10, 0.2] },
  abyss: { vein: '#5affd8', torch: '#5affd8', ambient: [0, 20, 20, 0.45] },
  starfall: { star: '#dff8ff', shard: '#9ad8ff', torch: '#9ad8ff', ambient: [10, 10, 40, 0.38] },
  fungal: { glow: '#e07aff', cap: '#c87ad8', moss: '#5a8a4a', torch: '#e07aff', ambient: [30, 0, 40, 0.4] },
  sunken: { water: '#5ac8ff', foam: '#bfefff', coral: '#e06a6a', torch: '#5ac8ff', ambient: [0, 20, 40, 0.42] },
  wood: { torch: '#ffb040', ambient: [30, 15, 0, 0.18] },
  stone: { torch: '#ffb040', ambient: [0, 0, 0, 0.25] }
};

// ── 바닥
function drawFloorTile(g, x, y, base, style, tx = 0, ty = 0) {
  const h = (k) => hash2(tx, ty, k);
  g.fillStyle = base; g.fillRect(x, y, TILE, TILE);
  const hi = shade(base, 1.12), lo = shade(base, 0.74), sp = shade(base, 0.86);
  if (style === 'wood') {
    for (let i = 0; i < TILE; i += 4) { pxs(g, shade(base, 1.1), [[x, y + i, TILE, 1]]); pxs(g, shade(base, 0.78), [[x, y + i + 3, TILE, 1]]); }
    for (let i = 0; i < 4; i++) pxs(g, shade(base, 0.78), [[x + Math.floor(h(10 + i) * TILE), y + i * 4, 1, 3]]);
    return;
  }
  if (style === 'moss') { // 2×2 타일 크기의 큰 석판 + 이끼·풀·꽃
    const T = THEME.moss;
    if (tx % 2 === 0) pxs(g, hi, [[x, y, 1, TILE]]); else pxs(g, lo, [[x + 15, y, 1, TILE]]);
    if (ty % 2 === 0) pxs(g, hi, [[x, y, TILE, 1]]); else pxs(g, lo, [[x, y + 15, TILE, 1]]);
    for (let i = 0; i < 3; i++) pxs(g, sp, [[x + 2 + Math.floor(h(20 + i) * 11), y + 2 + Math.floor(h(30 + i) * 11), 2, 1]]);
    if (h(1) < 0.3) { const mx = x + 3 + Math.floor(h(2) * 9), my = y + 3 + Math.floor(h(3) * 9); fillEll(g, mx, my, 3, 2, T.moss); pxs(g, T.mossHi, [[mx - 1, my - 1, 2, 1], [mx + 1, my, 1, 1]]); }
    if (h(4) < 0.14) { const gx = x + 3 + Math.floor(h(5) * 10), gy = y + 4 + Math.floor(h(6) * 9); pxs(g, T.grass, [[gx, gy, 1, 2], [gx - 1, gy - 1, 1, 2], [gx + 1, gy - 1, 1, 2]]); }
    if (h(7) < 0.05) { const fx = x + 4 + Math.floor(h(8) * 8), fy = y + 4 + Math.floor(h(9) * 8); pxs(g, T.flower[Math.floor(h(11) * 3)], [[fx, fy - 1], [fx - 1, fy], [fx + 1, fy], [fx, fy + 1]]); pxs(g, '#ffe36b', [[fx, fy]]); }
    return;
  }
  if (style === 'ice') { // 얼음판: 반사광 줄무늬, 균열, 눈가루
    pxs(g, hi, [[x, y, TILE - 1, 1], [x, y, 1, TILE - 1]]); pxs(g, lo, [[x + 15, y, 1, TILE], [x, y + 15, TILE, 1]]);
    g.fillStyle = 'rgba(255,255,255,0.09)'; for (let i = 0; i < 6; i++) g.fillRect(x + 3 + i, y + 11 - i, 2, 1);
    if (h(1) < 0.09) { let cx = x + 3 + Math.floor(h(2) * 8), cy = y + 3; g.fillStyle = 'rgba(255,255,255,0.22)'; for (let i = 0; i < 6; i++) { g.fillRect(cx, cy, 1, 1); cx += h(3 + i) < 0.5 ? 1 : 0; cy += 1; } }
    if (h(12) < 0.4) pxs(g, 'rgba(255,255,255,0.6)', [[x + 2 + Math.floor(h(20) * 12), y + 2 + Math.floor(h(30) * 12)]]);
    return;
  }
  if (style === 'basalt') { // 현무암: 불규칙한 이음새, 용암 균열 (빛은 애니메이션으로 따로)
    pxs(g, lo, [[x, y + 15, TILE, 1], [x + 15, y, 1, TILE], [x + 7 + Math.floor(h(1) * 3), y, 1, 6], [x, y + 8 + Math.floor(h(2) * 3), 7, 1]]);
    for (let i = 0; i < 3; i++) pxs(g, sp, [[x + 2 + Math.floor(h(20 + i) * 11), y + 2 + Math.floor(h(30 + i) * 11)]]);
    if (h(5) < 0.1) { const T = THEME.basalt; let cx = x + 2 + Math.floor(h(6) * 6), cy = y + 4 + Math.floor(h(7) * 6); for (let i = 0; i < 7; i++) { pxs(g, i % 3 ? T.lava : T.lavaHi, [[cx, cy]]); cx++; cy += h(8 + i) < 0.4 ? 1 : h(8 + i) > 0.8 ? -1 : 0; } }
    return;
  }
  if (style === 'void') { // 공허: 희미한 격자, 별빛, 룬
    const T = THEME.void;
    g.fillStyle = 'rgba(160,110,255,0.10)'; g.fillRect(x, y, TILE, 1); g.fillRect(x, y, 1, TILE);
    for (let i = 0; i < 2; i++) if (h(10 + i) < 0.45) pxs(g, T.star, [[x + 2 + Math.floor(h(20 + i) * 12), y + 2 + Math.floor(h(30 + i) * 12)]]);
    if (h(1) < 0.06) { const rx = x + 5, ry = y + 4; pxs(g, T.rune, [[rx, ry, 5, 1], [rx + 2, ry, 1, 7], [rx, ry + 3, 1, 3], [rx + 4, ry + 4, 1, 3], [rx, ry + 6, 5, 1]]); }
    return;
  }
  if (style === 'sand') { // 사암 석판 + 모래알 + 가끔 새겨진 문양
    const T = THEME.sand;
    if (tx % 2 === 0) pxs(g, hi, [[x, y, 1, TILE]]); else pxs(g, lo, [[x + 15, y, 1, TILE]]);
    if (ty % 2 === 0) pxs(g, hi, [[x, y, TILE, 1]]); else pxs(g, lo, [[x, y + 15, TILE, 1]]);
    for (let i = 0; i < 4; i++) pxs(g, i % 2 ? T.sand : sp, [[x + 2 + Math.floor(h(20 + i) * 12), y + 2 + Math.floor(h(30 + i) * 12)]]);
    if (h(1) < 0.05) { const gx = x + 5, gy = y + 4; pxs(g, T.glyph, [[gx, gy, 6, 1], [gx, gy + 7, 6, 1], [gx + 1, gy + 2, 1, 4], [gx + 4, gy + 2, 1, 2], [gx + 3, gy + 4, 2, 1]]); }
    return;
  }
  if (style === 'metal') { // 강철판 + 리벳 + 가끔 경고 줄무늬
    const T = THEME.metal;
    pxs(g, hi, [[x, y, TILE - 1, 1], [x, y, 1, TILE - 1]]); pxs(g, lo, [[x + 15, y, 1, TILE], [x, y + 15, TILE, 1]]);
    pxs(g, T.rivet, [[x + 2, y + 2], [x + 13, y + 2], [x + 2, y + 13], [x + 13, y + 13]]);
    if (h(1) < 0.05) for (let i = 0; i < 4; i++) pxs(g, i % 2 ? '#2a2a2a' : T.stripe, [[x + 3 + i * 3, y + 6, 3, 4]]);
    else if (h(2) < 0.12) pxs(g, sp, [[x + 4, y + 7, 8, 1], [x + 7, y + 4, 1, 8]]);
    return;
  }
  if (style === 'swamp') { // 진흙 바닥 + 물웅덩이 + 갈대
    const T = THEME.swamp;
    for (let i = 0; i < 4; i++) pxs(g, i % 2 ? lo : sp, [[x + 1 + Math.floor(h(20 + i) * 13), y + 1 + Math.floor(h(30 + i) * 13), 2, 1]]);
    if (h(1) < 0.12) { const px = x + 3 + Math.floor(h(2) * 6), py = y + 4 + Math.floor(h(3) * 6); fillEll(g, px + 3, py + 2, 4, 2, T.water); pxs(g, T.waterHi, [[px + 1, py + 1, 3, 1]]); }
    else if (h(4) < 0.1) { const gx = x + 4 + Math.floor(h(5) * 8), gy = y + 5 + Math.floor(h(6) * 8); pxs(g, T.reed, [[gx, gy - 3, 1, 4], [gx + 2, gy - 4, 1, 5], [gx - 2, gy - 2, 1, 3]]); }
    return;
  }
  if (style === 'bone') { // 어두운 석판 + 흩어진 뼈 + 희미한 룬
    const T = THEME.bone;
    pxs(g, hi, [[x, y, TILE - 1, 1], [x, y, 1, TILE - 1]]); pxs(g, lo, [[x + 15, y, 1, TILE], [x, y + 15, TILE, 1]]);
    if (h(1) < 0.035) { const bx = x + 3 + Math.floor(h(2) * 6), by = y + 5 + Math.floor(h(3) * 6); pxs(g, T.bone, [[bx, by, 6, 1], [bx - 1, by - 1, 1, 3], [bx + 6, by - 1, 1, 3]]); }
    if (h(4) < 0.02) pxs(g, 'rgba(120,255,190,0.35)', [[x + 5, y + 5, 6, 1], [x + 5, y + 10, 6, 1], [x + 7, y + 5, 2, 6]]);
    return;
  }
  if (style === 'mine') { // 거친 암반 + 수정 조각 + 가끔 광차 레일
    const T = THEME.mine;
    for (let i = 0; i < 4; i++) pxs(g, i % 2 ? lo : hi, [[x + 1 + Math.floor(h(20 + i) * 13), y + 1 + Math.floor(h(30 + i) * 13), 2, 1]]);
    if (h(1) < 0.06) { const cx = x + 5 + Math.floor(h(2) * 6), cy = y + 6 + Math.floor(h(3) * 6); pxs(g, T.crystal, [[cx, cy - 3, 2, 4], [cx - 2, cy - 1, 2, 2], [cx + 2, cy - 2, 1, 3]]); pxs(g, T.crystalHi, [[cx, cy - 3, 1, 2]]); }
    if (tx % 9 === 4) { pxs(g, T.rail, [[x + 4, y, 1, TILE], [x + 11, y, 1, TILE]]); pxs(g, shade(T.rail, 0.7), [[x + 3, y + 3, 10, 2], [x + 3, y + 11, 10, 2]]); }
    return;
  }
  if (style === 'sanctum') { // 창백한 석판 + 금빛 이음선 + 빛 알갱이
    const T = THEME.sanctum;
    pxs(g, hi, [[x, y, TILE - 1, 1], [x, y, 1, TILE - 1]]); pxs(g, lo, [[x + 15, y, 1, TILE], [x, y + 15, TILE, 1]]);
    if ((tx + ty) % 4 === 0) pxs(g, shade(T.gold, 0.8), [[x + 7, y + 7, 2, 2]]);
    if (h(1) < 0.08) pxs(g, T.light, [[x + 2 + Math.floor(h(2) * 12), y + 2 + Math.floor(h(3) * 12)]]);
    return;
  }
  if (style === 'abyss') { // 검은 암반 + 청록빛 맥
    pxs(g, lo, [[x, y + 15, TILE, 1], [x + 15, y, 1, TILE]]);
    for (let i = 0; i < 3; i++) pxs(g, hi, [[x + 2 + Math.floor(h(20 + i) * 12), y + 2 + Math.floor(h(30 + i) * 12)]]);
    if (h(1) < 0.08) { let cx = x + 2 + Math.floor(h(2) * 8), cy = y + 3 + Math.floor(h(3) * 6); for (let i = 0; i < 7; i++) { pxs(g, i % 3 ? 'rgba(90,255,216,0.5)' : '#5affd8', [[cx, cy]]); cx++; cy += h(8 + i) < 0.4 ? 1 : h(8 + i) > 0.8 ? -1 : 0; } }
    return;
  }
  if (style === 'starfall') { // 밤하늘빛 석판 + 별 + 떨어진 별 조각
    const T = THEME.starfall;
    pxs(g, hi, [[x, y, TILE - 1, 1], [x, y, 1, TILE - 1]]); pxs(g, lo, [[x + 15, y, 1, TILE], [x, y + 15, TILE, 1]]);
    for (let i = 0; i < 2; i++) if (h(10 + i) < 0.4) pxs(g, T.star, [[x + 2 + Math.floor(h(20 + i) * 12), y + 2 + Math.floor(h(30 + i) * 12)]]);
    if (h(1) < 0.05) { const sx = x + 6, sy = y + 6; pxs(g, T.shard, [[sx, sy, 3, 1], [sx + 1, sy - 1, 1, 3]]); pxs(g, T.star, [[sx + 1, sy]]); }
    return;
  }
  if (style === 'fungal') { // 축축한 흙 + 빛나는 작은 버섯 + 균사
    const T = THEME.fungal;
    for (let i = 0; i < 3; i++) pxs(g, lo, [[x + 1 + Math.floor(h(20 + i) * 14), y + 1 + Math.floor(h(30 + i) * 14), 2, 1]]);
    if (h(1) < 0.12) { const cx = x + 3 + Math.floor(h(2) * 9), cy = y + 5 + Math.floor(h(3) * 7); pxs(g, '#e8d8c8', [[cx + 1, cy + 1, 1, 2]]); pxs(g, h(4) < 0.5 ? T.glow : T.cap, [[cx, cy, 3, 1], [cx + 1, cy - 1, 1, 1]]); }
    if (h(5) < 0.07) { let cx = x + 1, cy = y + 4 + Math.floor(h(6) * 8); for (let i = 0; i < 12; i++) { pxs(g, 'rgba(224,122,255,0.35)', [[cx, cy]]); cx++; cy += h(9 + i) < 0.3 ? 1 : h(9 + i) > 0.75 ? -1 : 0; } }
    return;
  }
  if (style === 'sunken') { // 물에 잠긴 석판 + 물결 반사 + 해초
    const T = THEME.sunken;
    pxs(g, hi, [[x, y, TILE - 1, 1], [x, y, 1, TILE - 1]]); pxs(g, lo, [[x + 15, y, 1, TILE], [x, y + 15, TILE, 1]]);
    if (h(1) < 0.3) { const cx = x + 2 + Math.floor(h(2) * 9), cy = y + 3 + Math.floor(h(3) * 10); g.fillStyle = 'rgba(191,239,255,0.25)'; g.fillRect(cx, cy, 4, 1); g.fillRect(cx + 2, cy + 2, 3, 1); }
    if (h(4) < 0.06) pxs(g, '#3a8a6a', [[x + 4, y + 8, 1, 6], [x + 5, y + 6, 1, 4], [x + 7, y + 9, 1, 5]]);
    if (h(5) < 0.04) pxs(g, T.coral, [[x + 9, y + 10, 3, 2], [x + 10, y + 8, 1, 2]]);
    return;
  }
  // 기본 석판
  pxs(g, hi, [[x, y, TILE - 1, 1], [x, y, 1, TILE - 1]]); pxs(g, lo, [[x + 15, y, 1, TILE], [x, y + 15, TILE, 1]]);
}

// ── 벽 (face: 아래가 바닥이라 앞면이 보이는 벽)
function drawWallTile(g, x, y, pal, face, style, tx = 0, ty = 0) {
  const h = (k) => hash2(tx, ty, k + 50);
  g.fillStyle = pal.wall; g.fillRect(x, y, TILE, TILE);
  g.fillStyle = shade(pal.wall, 0.8);
  for (let r = 0; r < 4; r++) {
    g.fillRect(x, y + r * 4 + 3, TILE, 1);
    const off = ((ty * 4 + r) % 2) * 4;
    g.fillRect(x + off, y + r * 4, 1, 3); g.fillRect(x + off + 8, y + r * 4, 1, 3);
  }
  g.fillStyle = pal.wallTop; g.fillRect(x, y, TILE, 1);
  if (face) {
    g.fillStyle = pal.wallFace; g.fillRect(x, y + 8, TILE, 8);
    g.fillStyle = shade(pal.wallFace, 1.15); g.fillRect(x, y + 8, TILE, 1);
    g.fillStyle = pal.faceLine;
    g.fillRect(x, y + 12, TILE, 1);
    g.fillRect(x + (tx % 2 ? 4 : 11), y + 9, 1, 3); g.fillRect(x + (tx % 2 ? 11 : 4), y + 13, 1, 3);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + TILE - 1, TILE, 1);
  }
  if (style === 'moss') { // 이끼가 윗면에서 흘러내림
    const T = THEME.moss;
    for (let i = 0; i < 4; i++) { const mx = x + Math.floor(h(i) * 14); pxs(g, T.moss, [[mx, y, 3, 2]]); if (face && h(i + 5) < 0.5) pxs(g, T.moss, [[mx + 1, y + 8, 1, 2 + Math.floor(h(i + 9) * 3)]]); }
    pxs(g, T.mossHi, [[x + Math.floor(h(20) * 14), y, 2, 1]]);
  } else if (style === 'ice') { // 눈 덮인 윗면 + 고드름
    pxs(g, '#f0f8ff', [[x, y, TILE, 2]]); pxs(g, '#ffffff', [[x + Math.floor(h(1) * 12), y + 2, 3, 1]]);
    if (face) for (let i = 0; i < 3; i++) if (h(i + 3) < 0.55) { const ix = x + 2 + i * 5; pxs(g, '#dff4ff', [[ix, y + 16, 2, 2], [ix, y + 18, 1, 2]]); }
  } else if (style === 'basalt') { // 불씨 균열
    if (face && h(1) < 0.4) { let cx = x + 3 + Math.floor(h(2) * 8), cy = y + 9; for (let i = 0; i < 5; i++) { pxs(g, i % 2 ? '#ff6a2a' : '#c03a1a', [[cx, cy]]); cx += h(3 + i) < 0.5 ? 1 : -1; cy++; } }
  } else if (style === 'sand') { // 모래가 쌓인 윗면
    pxs(g, THEME.sand.sand, [[x, y, TILE, 2]]); pxs(g, shade(THEME.sand.sand, 1.15), [[x + Math.floor(h(1) * 12), y, 4, 1]]);
    if (face && h(2) < 0.35) pxs(g, THEME.sand.glyph, [[x + 6, y + 9, 4, 1], [x + 7, y + 10, 2, 2]]);
  } else if (style === 'metal') { // 파이프
    if (face) { pxs(g, THEME.metal.pipe, [[x, y + 9, TILE, 2]]); pxs(g, shade(THEME.metal.pipe, 1.3), [[x, y + 9, TILE, 1]]); if (h(1) < 0.3) pxs(g, '#3a3a3a', [[x + 7, y + 8, 2, 4]]); }
    pxs(g, THEME.metal.rivet, [[x + 3, y + 1], [x + 12, y + 1]]);
  } else if (style === 'swamp') { // 이끼와 덩굴
    pxs(g, THEME.swamp.reed, [[x + Math.floor(h(1) * 12), y, 4, 2]]);
    if (face && h(2) < 0.5) pxs(g, THEME.swamp.reed, [[x + 3 + Math.floor(h(3) * 10), y + 8, 1, 5 + Math.floor(h(4) * 4)]]);
  } else if (style === 'bone') { // 해골 장식
    if (face && h(1) < 0.25) { pxs(g, THEME.bone.bone, [[x + 6, y + 9, 4, 3]]); pxs(g, OUTLINE, [[x + 6, y + 10], [x + 9, y + 10]]); }
  } else if (style === 'mine') { // 나무 버팀목 + 수정
    if (face && tx % 4 === 0) pxs(g, '#7a5530', [[x + 2, y + 8, 3, 8]]);
    if (h(1) < 0.2) pxs(g, THEME.mine.crystal, [[x + 9, y + 2, 2, 3]]);
  } else if (style === 'sanctum') { // 금빛 띠
    if (face) { pxs(g, THEME.sanctum.gold, [[x, y + 10, TILE, 1]]); if (h(1) < 0.25) pxs(g, THEME.sanctum.light, [[x + 7, y + 9, 2, 3]]); }
  } else if (style === 'abyss') { // 맥이 흐르는 벽
    if (face && h(1) < 0.4) { let cx = x + 3 + Math.floor(h(2) * 8), cy = y + 9; for (let i = 0; i < 5; i++) { pxs(g, '#5affd8', [[cx, cy]]); cx += h(3 + i) < 0.5 ? 1 : -1; cy++; } }
  } else if (style === 'starfall') { // 별빛 띠
    if (face) { g.fillStyle = 'rgba(154,216,255,0.4)'; g.fillRect(x, y + 10, TILE, 1); if (h(1) < 0.3) pxs(g, '#dff8ff', [[x + 7, y + 9]]); }
  } else if (style === 'fungal') { // 벽에 붙은 선반 버섯
    if (face && h(1) < 0.35) { const cx = x + 3 + Math.floor(h(2) * 8); pxs(g, '#c87ad8', [[cx, y + 9, 5, 1], [cx + 1, y + 10, 3, 1]]); pxs(g, '#e07aff', [[cx + 1, y + 9]]); }
  } else if (style === 'sunken') { // 물 자국 + 이끼
    if (face) { g.fillStyle = 'rgba(90,200,255,0.3)'; g.fillRect(x, y + 11, TILE, 1); if (h(1) < 0.3) pxs(g, '#3a8a6a', [[x + 5, y + 8, 1, 3], [x + 10, y + 9, 1, 2]]); }
  } else if (style === 'void') { // 보랏빛 룬 띠
    if (face) { g.fillStyle = 'rgba(170,110,255,0.45)'; g.fillRect(x, y + 10, TILE, 1); if (h(1) < 0.3) pxs(g, '#c8a0ff', [[x + 6, y + 9, 3, 3]]); }
  }
}

// ── 엄폐물 (통과 불가, 테마별 바위·얼음·흑요석·수정)
function drawCover(g, x, y, style, tx, ty) {
  const h = (k) => hash2(tx, ty, k + 90);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 2, y + 12, 12, 3); // 그림자
  if (style === 'ice') {
    pxs(g, OUTLINE, [[x + 1, y + 1, 14, 14]]); pxs(g, '#9ad0f0', [[x + 2, y + 2, 12, 12]]); pxs(g, '#cfeeff', [[x + 2, y + 2, 12, 3]]);
    pxs(g, '#ffffff', [[x + 3, y + 3, 4, 1], [x + 3, y + 4, 1, 3]]); pxs(g, '#6aa8d0', [[x + 2, y + 11, 12, 3]]);
  } else if (style === 'basalt') {
    fillEll(g, x + 8, y + 9, 7, 6, OUTLINE); fillEll(g, x + 8, y + 9, 6, 5, '#2a1a1c'); fillEll(g, x + 7, y + 7, 4, 2, '#3e2a2c');
    let cx = x + 5, cy = y + 8; for (let i = 0; i < 6; i++) { pxs(g, i % 2 ? '#ff6a2a' : '#ffb04a', [[cx, cy]]); cx++; cy += h(i) < 0.5 ? 1 : 0; }
  } else if (style === 'void') {
    fillEll(g, x + 8, y + 13, 6, 2, '#2a2244');
    pxs(g, OUTLINE, [[x + 6, y + 1, 4, 14], [x + 4, y + 4, 8, 9]]); pxs(g, '#7a4ac0', [[x + 7, y + 2, 2, 12], [x + 5, y + 5, 6, 7]]);
    pxs(g, '#c8a0ff', [[x + 7, y + 3, 1, 5], [x + 5, y + 6, 1, 3]]); pxs(g, '#4a2a7a', [[x + 9, y + 7, 2, 5]]);
  } else if (style === 'sand') { // 부서진 사암 기둥
    pxs(g, OUTLINE, [[x + 3, y + 1, 10, 14]]); pxs(g, '#b89860', [[x + 4, y + 2, 8, 12]]); pxs(g, '#d0b078', [[x + 4, y + 2, 8, 2]]);
    pxs(g, '#8a7040', [[x + 4, y + 12, 8, 2], [x + 7, y + 5, 1, 6]]); pxs(g, '#c8a868', [[x + 9, y + 1, 3, 1]]);
  } else if (style === 'metal') { // 강철 블록
    pxs(g, OUTLINE, [[x + 1, y + 2, 14, 13]]); pxs(g, '#6a707a', [[x + 2, y + 3, 12, 11]]); pxs(g, '#8a909a', [[x + 2, y + 3, 12, 2]]);
    pxs(g, '#4a4e56', [[x + 2, y + 12, 12, 2]]); pxs(g, '#b0b8c0', [[x + 3, y + 6], [x + 12, y + 6], [x + 3, y + 10], [x + 12, y + 10]]);
  } else if (style === 'swamp') { // 썩은 나무 그루터기
    fillEll(g, x + 8, y + 9, 6, 6, OUTLINE); fillEll(g, x + 8, y + 9, 5, 5, '#5a4a2a'); fillEll(g, x + 8, y + 6, 4, 2, '#8a7040');
    pxs(g, '#6a5a30', [[x + 6, y + 6, 4, 1]]); pxs(g, THEME.swamp.reed, [[x + 4, y + 11, 2, 2], [x + 11, y + 10, 2, 2]]);
  } else if (style === 'bone') { // 묘비
    pxs(g, OUTLINE, [[x + 3, y + 2, 10, 13]]); pxs(g, '#6a6878', [[x + 4, y + 3, 8, 11]]); pxs(g, '#8a8898', [[x + 4, y + 3, 8, 2]]);
    pxs(g, '#4a4858', [[x + 7, y + 6, 2, 6], [x + 5, y + 8, 6, 1]]);
  } else if (style === 'mine') { // 수정 덩어리
    fillEll(g, x + 8, y + 12, 6, 2, '#2a2422');
    pxs(g, OUTLINE, [[x + 6, y + 1, 4, 13], [x + 2, y + 5, 4, 9], [x + 10, y + 4, 4, 10]]);
    pxs(g, '#c05aa0', [[x + 7, y + 2, 2, 11], [x + 3, y + 6, 2, 7], [x + 11, y + 5, 2, 8]]); pxs(g, '#ffc0ec', [[x + 7, y + 2, 1, 5], [x + 3, y + 6, 1, 3]]);
  } else if (style === 'sanctum') { // 흰 돌기둥
    pxs(g, OUTLINE, [[x + 4, y + 1, 8, 14]]); pxs(g, '#c8c4d0', [[x + 5, y + 2, 6, 12]]); pxs(g, '#e8e4f0', [[x + 5, y + 2, 2, 12]]);
    pxs(g, '#c8a050', [[x + 4, y + 1, 8, 1], [x + 4, y + 14, 8, 1]]);
  } else if (style === 'abyss') { // 맥이 박힌 검은 바위
    fillEll(g, x + 8, y + 9, 7, 6, OUTLINE); fillEll(g, x + 8, y + 9, 6, 5, '#262b30'); fillEll(g, x + 7, y + 7, 4, 2, '#343a40');
    pxs(g, '#5affd8', [[x + 5, y + 9], [x + 6, y + 10], [x + 7, y + 10], [x + 9, y + 8]]);
  } else if (style === 'fungal') { // 커다란 버섯
    pxs(g, OUTLINE, [[x + 6, y + 8, 4, 7]]); pxs(g, '#e8d8c8', [[x + 7, y + 8, 2, 6]]);
    fillEll(g, x + 8, y + 7, 7, 4, OUTLINE); fillEll(g, x + 8, y + 7, 6, 3, '#8a4aa0'); fillEll(g, x + 7, y + 6, 4, 1.5, '#b06ac8'); pxs(g, '#e07aff', [[x + 5, y + 6], [x + 10, y + 7], [x + 8, y + 5]]);
  } else if (style === 'sunken') { // 무너진 기둥 조각
    fillEll(g, x + 8, y + 9, 7, 6, OUTLINE); fillEll(g, x + 8, y + 9, 6, 5, '#4a6a74'); fillEll(g, x + 7, y + 7, 4, 2, '#6a8a94'); pxs(g, '#3a8a6a', [[x + 4, y + 10, 2, 1], [x + 11, y + 11, 2, 1]]);
  } else if (style === 'starfall') { // 떨어진 별 덩어리
    fillEll(g, x + 8, y + 9, 7, 6, OUTLINE); fillEll(g, x + 8, y + 9, 6, 5, '#3a4270'); fillEll(g, x + 7, y + 7, 4, 2, '#4a548a');
    pxs(g, '#9ad8ff', [[x + 6, y + 8, 3, 1], [x + 7, y + 7, 1, 3]]); pxs(g, '#ffffff', [[x + 7, y + 8]]);
  } else { // moss / 기본: 이끼 낀 바위
    fillEll(g, x + 8, y + 9, 7, 6, OUTLINE); fillEll(g, x + 8, y + 9, 6, 5, '#6a6f66'); fillEll(g, x + 7, y + 7, 4, 2, '#868b80');
    pxs(g, '#4a4e48', [[x + 3, y + 12, 10, 1]]);
    if (style === 'moss') { fillEll(g, x + 8, y + 5, 4, 1, THEME.moss.moss); pxs(g, THEME.moss.mossHi, [[x + 6, y + 4, 2, 1]]); }
  }
}

// ── 부서지는 상자 (테마별 나무 상자·통·항아리·룬 상자)
function drawCrate(g, x, y, style) {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 2, y + 13, 12, 2);
  if (style === 'ice') {
    pxs(g, OUTLINE, [[x + 3, y + 2, 10, 13]]); pxs(g, '#6a7a8a', [[x + 4, y + 3, 8, 11]]); pxs(g, '#8a9aaa', [[x + 4, y + 3, 3, 11]]);
    pxs(g, '#3a4a5a', [[x + 4, y + 6, 8, 1], [x + 4, y + 11, 8, 1]]); pxs(g, '#ffffff', [[x + 3, y + 2, 10, 2]]);
  } else if (style === 'basalt') {
    fillEll(g, x + 8, y + 10, 5, 5, OUTLINE); fillEll(g, x + 8, y + 10, 4, 4, '#a0583a'); pxs(g, OUTLINE, [[x + 6, y + 2, 4, 4]]);
    pxs(g, '#a0583a', [[x + 7, y + 3, 2, 3]]); pxs(g, '#c87a50', [[x + 6, y + 8, 2, 3]]); pxs(g, '#6a3020', [[x + 4, y + 11, 8, 1]]);
  } else if (style === 'void') {
    pxs(g, OUTLINE, [[x + 2, y + 3, 12, 12]]); pxs(g, '#2a2040', [[x + 3, y + 4, 10, 10]]); pxs(g, '#3a3058', [[x + 3, y + 4, 10, 2]]);
    pxs(g, '#b080ff', [[x + 6, y + 7, 4, 1], [x + 7, y + 7, 2, 5], [x + 6, y + 11, 4, 1]]);
  } else if (style === 'sand') { // 토기 항아리
    fillEll(g, x + 8, y + 10, 5, 5, OUTLINE); fillEll(g, x + 8, y + 10, 4, 4, '#c08050'); pxs(g, OUTLINE, [[x + 5, y + 2, 6, 4]]);
    pxs(g, '#c08050', [[x + 6, y + 3, 4, 3]]); pxs(g, '#4a3a22', [[x + 4, y + 9, 8, 1]]); pxs(g, '#e0a070', [[x + 6, y + 7, 2, 2]]);
  } else if (style === 'metal') { // 철통
    pxs(g, OUTLINE, [[x + 3, y + 2, 10, 13]]); pxs(g, '#a05a2a', [[x + 4, y + 3, 8, 11]]); pxs(g, '#c07a3a', [[x + 4, y + 3, 3, 11]]);
    pxs(g, '#5a3a20', [[x + 4, y + 6, 8, 1], [x + 4, y + 11, 8, 1]]); pxs(g, '#ffe36b', [[x + 7, y + 8, 2, 2]]);
  } else if (style === 'swamp') { // 썩은 통
    pxs(g, OUTLINE, [[x + 3, y + 2, 10, 13]]); pxs(g, '#6a5030', [[x + 4, y + 3, 8, 11]]); pxs(g, '#4a6a3a', [[x + 4, y + 3, 8, 2]]);
    pxs(g, '#3a2a1a', [[x + 4, y + 7, 8, 1], [x + 4, y + 11, 8, 1]]);
  } else if (style === 'bone') { // 관
    pxs(g, OUTLINE, [[x + 4, y + 1, 8, 14]]); pxs(g, '#5a3a2a', [[x + 5, y + 2, 6, 12]]); pxs(g, '#7a5a3a', [[x + 5, y + 2, 6, 1]]);
    pxs(g, '#c8c0b0', [[x + 7, y + 4, 2, 6], [x + 6, y + 6, 4, 1]]);
  } else if (style === 'mine') { // 광석 수레
    pxs(g, OUTLINE, [[x + 2, y + 4, 12, 9]]); pxs(g, '#6a5a4a', [[x + 3, y + 5, 10, 7]]); pxs(g, '#c05aa0', [[x + 4, y + 4, 3, 2], [x + 8, y + 3, 3, 3]]);
    pxs(g, OUTLINE, [[x + 3, y + 12, 3, 3], [x + 10, y + 12, 3, 3]]); pxs(g, '#8a8a94', [[x + 4, y + 13], [x + 11, y + 13]]);
  } else if (style === 'sanctum') { // 돌 상자
    pxs(g, OUTLINE, [[x + 2, y + 3, 12, 12]]); pxs(g, '#a8a4b4', [[x + 3, y + 4, 10, 10]]); pxs(g, '#c8c4d0', [[x + 3, y + 4, 10, 2]]);
    pxs(g, '#c8a050', [[x + 7, y + 6, 2, 6]]);
  } else if (style === 'abyss') { // 검은 돌함
    pxs(g, OUTLINE, [[x + 2, y + 3, 12, 12]]); pxs(g, '#2a3036', [[x + 3, y + 4, 10, 10]]); pxs(g, '#3a4148', [[x + 3, y + 4, 10, 2]]); pxs(g, '#5affd8', [[x + 7, y + 7, 2, 4]]);
  } else if (style === 'fungal') { // 버섯 덮인 상자
    pxs(g, OUTLINE, [[x + 2, y + 3, 12, 12]]); pxs(g, '#5a3a3a', [[x + 3, y + 4, 10, 10]]); pxs(g, '#6a4a48', [[x + 3, y + 4, 10, 1]]); pxs(g, '#c87ad8', [[x + 4, y + 3, 3, 1], [x + 10, y + 3, 2, 1]]);
  } else if (style === 'sunken') { // 물먹은 상자
    pxs(g, OUTLINE, [[x + 2, y + 3, 12, 12]]); pxs(g, '#3a5a5a', [[x + 3, y + 4, 10, 10]]); pxs(g, '#4a6a6a', [[x + 3, y + 4, 10, 1]]); pxs(g, '#5ac8ff', [[x + 4, y + 12, 8, 1]]);
  } else if (style === 'starfall') { // 별 상자
    pxs(g, OUTLINE, [[x + 2, y + 3, 12, 12]]); pxs(g, '#2a3058', [[x + 3, y + 4, 10, 10]]); pxs(g, '#3a4270', [[x + 3, y + 4, 10, 2]]); pxs(g, '#dff8ff', [[x + 6, y + 8, 4, 1], [x + 7, y + 7, 2, 3]]);
  } else { // 나무 상자
    pxs(g, OUTLINE, [[x + 2, y + 3, 12, 12]]); pxs(g, '#9a6a3a', [[x + 3, y + 4, 10, 10]]); pxs(g, '#b88450', [[x + 3, y + 4, 10, 1]]);
    pxs(g, '#6a4422', [[x + 3, y + 8, 10, 1]]); for (let i = 0; i < 8; i++) pxs(g, '#6a4422', [[x + 4 + i, y + 5 + i]]);
  }
}

// ── 방 장식 (바닥 위)
function drawRoomArt(g, r, pal) {
  const cx = r.cx * TILE + 8, cy = r.cy * TILE + 8, acc = pal.accent || '#c8a0ff';
  if (r.type === 'boss') { // 의식용 룬 원
    pixelCircle(g, cx, cy, 70, acc); pixelCircle(g, cx, cy, 66, shade(acc, 0.7), 3); pixelCircle(g, cx, cy, 40, acc, 4);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rx = Math.round(cx + Math.cos(a) * 54), ry = Math.round(cy + Math.sin(a) * 54); pxs(g, acc, [[rx - 2, ry, 5, 1], [rx, ry - 2, 1, 5]]); }
  } else if (r.type === 'shop') { // 양탄자
    const x0 = (r.cx - 4) * TILE, y0 = (r.cy) * TILE;
    pxs(g, '#5a1a2a', [[x0, y0, 9 * TILE, 2 * TILE]]); pxs(g, '#c89a40', [[x0 + 2, y0 + 2, 9 * TILE - 4, 1], [x0 + 2, y0 + 2 * TILE - 3, 9 * TILE - 4, 1]]);
    for (let i = 0; i < 9; i++) pxs(g, '#8a2a3a', [[x0 + i * TILE + 6, y0 + 12, 4, 4]]);
  } else if (r.type === 'treasure') { // 금테 카펫
    const x0 = (r.cx - 2) * TILE, y0 = (r.cy - 2) * TILE;
    pxs(g, '#2a3a6a', [[x0, y0, 5 * TILE, 5 * TILE]]); pxs(g, '#e0b040', [[x0 + 2, y0 + 2, 5 * TILE - 4, 1], [x0 + 2, y0 + 5 * TILE - 3, 5 * TILE - 4, 1], [x0 + 2, y0 + 2, 1, 5 * TILE - 4], [x0 + 5 * TILE - 3, y0 + 2, 1, 5 * TILE - 4]]);
  } else if (r.type === 'fountain') { // 샘 둘레의 푸른 타일
    pixelCircle(g, cx, cy, 22, '#5aa0d0'); pixelCircle(g, cx, cy, 18, '#3a7ab0', 2);
  } else if (r.type === 'altar') { // 보랏빛 의식 원
    pixelCircle(g, cx, cy, 24, '#9a6ae0'); pixelCircle(g, cx, cy, 20, '#6a4ab0', 3);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, rx = Math.round(cx + Math.cos(a) * 22), ry = Math.round(cy + Math.sin(a) * 22); pxs(g, '#c8a0ff', [[rx - 1, ry, 3, 1], [rx, ry - 1, 1, 3]]); }
  } else if (r.type === 'gamble') { // 체크무늬 카펫
    const x0 = (r.cx - 3) * TILE, y0 = (r.cy - 1) * TILE;
    for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) pxs(g, (i + j) % 2 ? '#5a1a2a' : '#2a1a3a', [[x0 + i * TILE, y0 + j * TILE, TILE, TILE]]);
    pxs(g, '#c89a40', [[x0, y0, 7 * TILE, 1], [x0, y0 + 4 * TILE - 1, 7 * TILE, 1]]);
  } else if (r.type === 'evolve') { // 전직의 방: 금빛 이중 원과 별
    pixelCircle(g, cx, cy, 46, '#ffd84a'); pixelCircle(g, cx, cy, 42, '#a07820', 3); pixelCircle(g, cx, cy, 20, '#ffd84a', 2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rx = Math.round(cx + Math.cos(a) * 32), ry = Math.round(cy + Math.sin(a) * 32); pxs(g, '#ffe9a0', [[rx - 1, ry, 3, 1], [rx, ry - 1, 1, 3]]); }
  } else if (r.type === 'smithy') { // 강화소: 금빛 테두리 원
    pixelCircle(g, cx, cy, 22, '#ffd84a'); pixelCircle(g, cx, cy, 18, '#a07820', 2);
  } else if (r.type === 'forge') { // 그을린 바닥
    pixelCircle(g, cx, cy, 20, '#a05a2a'); pixelCircle(g, cx, cy, 16, '#5a3a2a', 2);
  } else if (r.type === 'blood') { // 핏빛 원
    pixelCircle(g, cx, cy, 22, '#a02020'); pixelCircle(g, cx, cy, 18, '#601010', 2); pixelCircle(g, cx, cy, 10, '#a02020', 3);
  } else if (r.type === 'rack') { // 진열대 카펫
    const x0 = (r.cx - 3) * TILE, y0 = (r.cy) * TILE;
    pxs(g, '#2a3a5a', [[x0, y0, 7 * TILE, 2 * TILE]]); pxs(g, '#c8a050', [[x0 + 2, y0 + 2, 7 * TILE - 4, 1], [x0 + 2, y0 + 2 * TILE - 3, 7 * TILE - 4, 1]]);
  } else if (r.type === 'challenge') { // 붉은 결투장
    pixelCircle(g, cx, cy, 44, '#c04040'); pixelCircle(g, cx, cy, 40, '#802020', 3); pixelCircle(g, cx, cy, 14, '#c04040', 2);
  } else if (r.type === 'exit') { // 순간이동 발판
    pixelCircle(g, cx, cy, 20, '#5aa0ff'); pixelCircle(g, cx, cy, 16, '#3a6ab0', 2); pixelCircle(g, cx, cy, 24, '#2a4a80', 3);
  } else if (r.type === 'start') {
    pixelCircle(g, cx, cy, 18, shade(pal.floor[0], 1.25)); pixelCircle(g, cx, cy, 14, shade(pal.floor[0], 1.15), 2);
  }
}
