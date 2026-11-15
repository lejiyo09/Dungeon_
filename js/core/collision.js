'use strict';
// ════════════════════════════════════════════
// 충돌
// ════════════════════════════════════════════
function overlapsSolid(x, y, half, map) {
  const x0 = Math.floor((x - half) / TILE), x1 = Math.floor((x + half - EPS) / TILE);
  const y0 = Math.floor((y - half) / TILE), y1 = Math.floor((y + half - EPS) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      if (map.isSolidTile(tx, ty)) return true;
  return false;
}

function moveAndCollide(ent, dx, dy, map) {
  const hit = { x: false, y: false };
  if (dx !== 0) {
    ent.x += dx;
    if (overlapsSolid(ent.x, ent.y, ent.half, map)) {
      if (dx > 0) ent.x = Math.floor((ent.x + ent.half - EPS) / TILE) * TILE - ent.half;
      else ent.x = (Math.floor((ent.x - ent.half) / TILE) + 1) * TILE + ent.half;
      hit.x = true;
    }
  }
  if (dy !== 0) {
    ent.y += dy;
    if (overlapsSolid(ent.x, ent.y, ent.half, map)) {
      if (dy > 0) ent.y = Math.floor((ent.y + ent.half - EPS) / TILE) * TILE - ent.half;
      else ent.y = (Math.floor((ent.y - ent.half) / TILE) + 1) * TILE + ent.half;
      hit.y = true;
    }
  }
  return hit;
}

function sweepWall(x0, y0, x1, y1, map, stepLen = 2) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / stepLen));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (map.isSolidAt(x0 + dx * t, y0 + dy * t)) return (i - 1) / n;
  }
  return -1;
}
const hasLineOfSight = (a, b, map) => sweepWall(a.x, a.y, b.x, b.y, map, 6) < 0;

function segmentCircleHit(x0, y0, x1, y1, cx, cy, r) {
  const dx = x1 - x0, dy = y1 - y0, fx = x0 - cx, fy = y0 - cy;
  const a = dx * dx + dy * dy;
  let t = a === 0 ? 0 : -(fx * dx + fy * dy) / a;
  t = Math.max(0, Math.min(1, t));
  const px = fx + dx * t, py = fy + dy * t;
  return px * px + py * py <= r * r ? t : -1;
}

function separateEnemies(enemies, map) {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (!a.alive || a.state === 'SPAWN' || a.def.dummy) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (!b.alive || b.state === 'SPAWN' || b.def.dummy) continue;
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      const min = a.radius + b.radius;
      if (d >= min) continue;
      if (d < 0.0001) { dx = 1; dy = 0; d = 1; }
      const overlap = min - d, nx = dx / d, ny = dy / d;
      const wa = b.radius / min, wb = a.radius / min;
      moveAndCollide(a, -nx * overlap * wa, -ny * overlap * wa, map);
      moveAndCollide(b, nx * overlap * wb, ny * overlap * wb, map);
    }
  }
}

// 피해 계산: D = B × (1 + A) × C
function rollDamage(base, mods) {
  const crit = Math.random() < mods.critChance;
  const amount = base * (1 + mods.attackBonus) * (crit ? mods.critMultiplier : 1);
  return { amount: Math.max(1, Math.round(amount)), crit };
}
