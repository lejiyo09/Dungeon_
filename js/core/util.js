'use strict';
// ════════════════════════════════════════════
// 상수 / 유틸
// ════════════════════════════════════════════
const VIEW_W = 512, VIEW_H = 288, TILE = 16, STEP = 1 / 60, TAU = Math.PI * 2;
const EPS = 0.001;
const T_VOID = 0, T_FLOOR = 1, T_WALL = 2, T_DOOR = 3, T_COVER = 4, T_CRATE = 5; // COVER: 엄폐물, CRATE: 부서지는 상자
const GRID_W = 5, GRID_H = 5, CELL_W = 30, CELL_H = 24;
const SPAWN_TIME = 0.8;
const RARITY_COLOR = { common: '#d0d0d0', uncommon: '#6fd36f', rare: '#5aa0ff', epic: '#c070ff' };
const RARITY_NAME = { common: '일반', uncommon: '고급', rare: '희귀', epic: '영웅' };
const RARITY_WEIGHT = BALANCE.rarityWeight;
const RARITY_PRICE = BALANCE.shopPrice;
const TYPE_NAME = { gun: '사격', melee: '근접', charge: '차지', beam: '광선' };

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };
function weightedPick(items, wfn) {
  let total = 0;
  for (const it of items) total += wfn(it);
  let r = Math.random() * total;
  for (const it of items) { r -= wfn(it); if (r <= 0) return it; }
  return items[items.length - 1];
}
function shuffled(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
