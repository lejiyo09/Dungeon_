'use strict';
// ════════════════════════════════════════════
// 투사체
// ════════════════════════════════════════════
class Projectile {
  constructor(o) {
    Object.assign(this, o);
    if (!this.owner && typeof game !== 'undefined') this.owner = game.player; // 쏜 사람 (멀티: 참가자의 탄은 그 사람 기준으로 처리 — 처치 에너지·흡혈·부메랑 귀환 등)
    this.pierceLeft = o.pierce || 0; this.radius = o.flame ? 5 : 2; this.traveled = 0; this.alive = true;
    this.bouncesLeft = o.bounce || 0;
    this.hitTargets = new Set();
  }
  update(dt, world) {
    if (!this.alive) return;
    this.age = (this.age || 0) + dt;
    if (this.mine && this.planted) { // 설치된 지뢰: 적이 가까이 오거나 시간이 다 되면 폭발
      this.mineLeft -= dt;
      if (this.mineLeft <= 0 || world.enemies.some((e) => e.targetable && !e.def.dummy && Math.hypot(e.x - this.x, e.y - this.y) < this.mine.trigger + e.radius)
        || (world.mode === 'lobby' && world.enemies.some((e) => e.targetable && Math.hypot(e.x - this.x, e.y - this.y) < this.mine.trigger + e.radius))) this.detonate(world);
      return;
    }
    if (this.orbit) { // 궤도 구슬
      const o = this.orbit, P = o.owner;
      if (this.age > o.life || P.state === 'DEAD') { this.alive = false; return; }
      o.ang += o.speed * dt; this.x = P.x + Math.cos(o.ang) * o.r; this.y = P.y + Math.sin(o.ang) * o.r * 0.85;
      if (this.rehit) { this.rehitT = (this.rehitT || 0) + dt; if (this.rehitT >= this.rehit) { this.rehitT = 0; this.hitTargets.clear(); } }
      for (const e of world.enemies) {
        if (!e.targetable || this.hitTargets.has(e.id)) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) < e.radius + this.radius + 2) { this.hitTargets.add(e.id); world.damageEnemy(e, this, Math.cos(o.ang), Math.sin(o.ang)); }
      }
      return;
    }
    if (this.grenade) { // 수류탄: 점점 느려지며 굴러가다 시한 폭발
      this.speed *= Math.exp(-this.grenade.drag * dt);
      if (this.age >= this.grenade.fuse) { this.detonate(world); return; }
    }
    if (this.firework && this.age >= this.firework.fuse) { this.alive = false; this.end(world); return; } // 폭죽: 날아가다 터짐
    if (this.trail) { this.trailT = (this.trailT || 0) - dt; if (this.trailT <= 0) { this.trailT = this.trail.every; world.zones.push(new Puddle(this.x, this.y, this.trail.puddle, this.mods)); } } // 지나간 자리에 장판
    if (this.close) { this.baseDmg = this.baseDmg || this.damage; this.damage = this.baseDmg * (1 + this.close * (1 - Math.min(1, this.traveled / this.range))); } // 가까울수록 강함
    if (this.grow) { this.baseDmg = this.baseDmg || this.damage; const g = Math.min(1, this.traveled / this.range); this.damage = this.baseDmg * (1 + this.grow * g); this.size = 2 + Math.round(g * 3); this.radius = 2 + g * 3; } // 멀리 갈수록 커짐
    if (this.bubble) { const w = Math.sin(this.age * 7) * 18 * dt; this.x += -this.dy * w; this.y += this.dx * w; } // 거품: 일렁임
    if (this.homing) this.steer(dt, world);
    if (this.rehit) { this.rehitT = (this.rehitT ?? this.rehit) - dt; if (this.rehitT <= 0) { this.rehitT = this.rehit; this.hitTargets.clear(); } }
    if (this.pull) { // 공허: 주변 적을 끌어당김
      for (const e of world.enemies) {
        if (!e.targetable || e.def.dummy) continue;
        const ddx = this.x - e.x, ddy = this.y - e.y, d = Math.hypot(ddx, ddy);
        if (d < this.pull.radius && d > 4) { const k = this.pull.force * dt * (1 - (e.def.knockbackResist || 0)); moveAndCollide(e, ddx / d * k, ddy / d * k, world.map); }
      }
    }
    if (this.boomerang && (this.back || this.age > 4)) { // 부메랑 귀환: 벽 통과, 플레이어에게 돌아옴
      const p = world.player, ddx = p.x - this.x, ddy = p.y - this.y, d = Math.hypot(ddx, ddy);
      if (d < 10 || this.age > 6) { this.alive = false; return; }
      this.dx = ddx / d; this.dy = ddy / d;
      const st = Math.min(d, this.speed * 1.15 * dt), bx = this.x + this.dx * st, by = this.y + this.dy * st;
      for (const e of world.enemies) {
        if (!e.targetable || this.hitTargets.has(e.id)) continue;
        if (segmentCircleHit(this.x, this.y, bx, by, e.x, e.y, e.radius + this.radius) >= 0) { this.hitTargets.add(e.id); world.damageEnemy(e, this, this.dx, this.dy); }
      }
      this.x = bx; this.y = by; return;
    }
    let dist = this.speed * dt, endByRange = false;
    if (this.traveled + dist >= this.range) { dist = this.range - this.traveled; endByRange = true; }
    const sx = this.x, sy = this.y, ex = sx + this.dx * dist, ey = sy + this.dy * dist;
    const wallT = sweepWall(sx, sy, ex, ey, world.map);
    const limitT = wallT >= 0 ? wallT : 1;

    const hits = [];
    if (!this.grenade) for (const e of world.enemies) {
      if (!e.targetable || this.hitTargets.has(e.id)) continue;
      const t = segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + this.radius);
      if (t >= 0 && t <= limitT) hits.push({ e, t });
    }
    hits.sort((a, b) => a.t - b.t);
    for (const { e, t } of hits) {
      if (this.explodeRadius && !this.mine) {
        this.x = sx + (ex - sx) * t; this.y = sy + (ey - sy) * t;
        if (this.pierceLeft > 0) { // 관통 폭발탄: 맞은 자리에서 터지고 계속 날아감
          this.pierceLeft--; for (const o of world.enemies) if (Math.hypot(o.x - this.x, o.y - this.y) < this.explodeRadius + o.radius) this.hitTargets.add(o.id);
          world.explodeAt(this.x, this.y, this.explodeRadius, { src: this, color: this.color, hurtEnemies: true }); continue;
        }
        this.detonate(world); return;
      }
      this.hitTargets.add(e.id);
      world.damageEnemy(e, this, this.dx, this.dy);
      if (this.ricochet > 0) { // 튕김 원반: 가까운 다른 적에게 날아감
        let nx = null, bd = 140;
        for (const o of world.enemies) { if (!o.targetable || this.hitTargets.has(o.id)) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; nx = o; } }
        if (nx) {
          this.x = sx + (ex - sx) * t; this.y = sy + (ey - sy) * t; this.ricochet--; this.traveled = 0;
          const dd = Math.hypot(nx.x - this.x, nx.y - this.y) || 1; this.dx = (nx.x - this.x) / dd; this.dy = (nx.y - this.y) / dd;
          world.effects.spark(this.x, this.y, '#ffffff'); return;
        }
      }
      if (this.pierceLeft <= 0) {
        this.x = sx + (ex - sx) * t; this.y = sy + (ey - sy) * t; this.alive = false; this.end(world);
        if (!this.flame) world.effects.impact(this.x, this.y, this.color, Math.atan2(this.dy, this.dx)); return;
      }
      this.pierceLeft--;
    }
    if (wallT >= 0) {
      const px = sx + (ex - sx) * wallT, py = sy + (ey - sy) * wallT;
      world.hitTile(px + this.dx * 3, py + this.dy * 3); // 부서지는 상자
      if (this.mine) { this.x = px - this.dx * 4; this.y = py - this.dy * 4; this.planted = true; this.mineLeft = this.mine.life; return; }
      if (this.explodeRadius) { this.x = px; this.y = py; this.detonate(world); return; }
      if (this.boomerang) { this.x = px - this.dx * 2; this.y = py - this.dy * 2; this.back = true; this.hitTargets.clear(); return; }
      if (this.bouncesLeft > 0) {
        this.bouncesLeft--;
        const hx = world.map.isSolidAt(px + this.dx * 3, py), hy = world.map.isSolidAt(px, py + this.dy * 3);
        if (hx) this.dx = -this.dx;
        if (hy) this.dy = -this.dy;
        if (!hx && !hy) { this.dx = -this.dx; this.dy = -this.dy; }
        this.x = px; this.y = py; this.traveled += dist * wallT;
        this.hitTargets.clear();
        world.effects.impact(px, py, this.color, Math.atan2(this.dy, this.dx));
        return;
      }
      this.x = px - this.dx * 3; this.y = py - this.dy * 3; this.alive = false; this.end(world);
      if (!this.flame) world.effects.impact(this.x, this.y, this.color, Math.atan2(this.dy, this.dx)); return;
    }
    this.x = ex; this.y = ey; this.traveled += dist;
    if (endByRange) {
      if (this.boomerang) { this.back = true; this.hitTargets.clear(); }
      else if (this.mine) { this.planted = true; this.mineLeft = this.mine.life; }
      else if (this.explodeRadius) this.detonate(world);
      else { this.alive = false; this.end(world); }
    }
  }
  // 소멸 시 파편 분열
  end(world) {
    if (this.puddle) { world.zones.push(new Puddle(this.x, this.y, this.puddle, this.mods)); world.effects.burst(this.x, this.y, this.puddle.color, 10); SFX.play('flame', 0.1); }
    if (!this.split) return;
    const S = this.split, a0 = Math.random() * TAU;
    for (let i = 0; i < S.count; i++) {
      const a = a0 + i * TAU / S.count;
      world.projectiles.push(new Projectile({ x: this.x, y: this.y, dx: Math.cos(a), dy: Math.sin(a), speed: S.speed, range: S.range,
        damage: S.damage, pierce: 0, knockback: 1, mods: this.mods, color: S.colors ? pick(S.colors) : this.color, size: 1, explodeRadius: S.explode || 0 }));
    }
    world.effects.burst(this.x, this.y, this.color, 6);
  }
  steer(dt, world) {
    let best = null, bestD = 170;
    for (const e of world.enemies) {
      if (!e.targetable || e.def.dummy && world.mode !== 'lobby') continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestD) { best = e; bestD = d; }
    }
    if (!best) return;
    const cur = Math.atan2(this.dy, this.dx), want = Math.atan2(best.y - this.y, best.x - this.x);
    let diff = want - cur;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    const ang = cur + clamp(diff, -this.homing * dt, this.homing * dt);
    this.dx = Math.cos(ang); this.dy = Math.sin(ang);
  }
  detonate(world) {
    this.alive = false;
    world.explodeAt(this.x, this.y, this.explodeRadius, { src: this, color: this.color, hurtEnemies: true });
    this.end(world);
  }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), s = this.size || 1;
    if (this.bubble) { // 거품
      const r = 4 + Math.sin(this.age * 9) * 0.6;
      ctx.fillStyle = 'rgba(190,240,255,0.25)'; ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 2, 2, 1); return;
    }
    if (this.wave) { // 검기 (초승달)
      const a = Math.atan2(this.dy, this.dx), cx = this.x - this.dx * 6, cy = this.y - this.dy * 6;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = this.color; ctx.lineWidth = 4; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(cx, cy, 11, a - 1.1, a + 1.1); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(cx, cy, 11, a - 0.8, a + 0.8); ctx.stroke();
      ctx.restore(); return;
    }
    if (this.mine && this.planted) {
      ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a5a3a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = Math.floor(this.age * (this.mineLeft < 1.5 ? 12 : 3)) % 2 ? '#ff3a2a' : '#5a1a1a'; ctx.fillRect(x - 1, y - 1, 2, 2);
      return;
    }
    if (this.spriteDef) { // 회전하는 투척물
      const sp = weaponSprite(this.spriteDef);
      ctx.save(); ctx.translate(x, y); ctx.rotate((this.age || 0) * 18); ctx.drawImage(sp.n, -sp.w / 2, -sp.h / 2); ctx.restore(); return;
    }
    if (this.pull) { // 공허 구체
      ctx.strokeStyle = this.color; ctx.globalAlpha = 0.25;
      const a = (this.age || 0) * 6;
      ctx.beginPath(); ctx.arc(x, y, this.pull.radius * 0.6, a, a + 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, this.pull.radius * 0.4, -a, -a + 2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#1a0a2a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = this.color; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.stroke(); return;
    }
    if (this.flame) {
      const k = this.traveled / this.range;
      ctx.globalAlpha = 0.8 * (1 - k);
      ctx.fillStyle = k < 0.3 ? '#ffe36b' : k < 0.6 ? this.color : '#a03a1a';
      const r = 2 + k * 6; ctx.fillRect(Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
      ctx.globalAlpha = 1; return;
    }
    // 궤적(속도에 비례하는 꼬리) + 가산 혼합 빛
    const tl = Math.min(14, 3 + this.speed / 45);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = this.color; ctx.globalAlpha = 0.55; ctx.lineWidth = s + 0.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - this.dx * tl, y - this.dy * tl); ctx.stroke();
    ctx.globalAlpha = 0.3; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, s * 2 + 2.5, 0, TAU); ctx.fill();
    ctx.restore(); ctx.lineWidth = 1;
    if (this.arrow) { ctx.strokeStyle = this.color; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - this.dx * 8, y - this.dy * 8); ctx.stroke(); }
    ctx.fillStyle = this.color; ctx.fillRect(x - s, y - s, s * 2 + 1, s * 2 + 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
  }
}

class EnemyBullet {
  constructor(x, y, vx, vy, damage, color, r) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.damage = damage;
    this.color = color; this.r = r; this.alive = true; this.life = 6;
  }
  update(dt, world) {
    this.life -= dt;
    if (this.flipT !== undefined) { this.flipT -= dt; if (this.flipT <= 0) { this.flipT = undefined; this.vx = -this.vx; this.vy = -this.vy; this.life = Math.max(this.life, 2.5); this.flipped = true; } } /* 반전 화살: 되돌아옴 */
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0) { this.alive = false; return; }
    if (world.map.isSolidAt(this.x, this.y)) { world.hitTile(this.x, this.y); this.alive = false; world.effects.impact(this.x, this.y, this.color); return; }
    for (const p of world.allPlayers()) { // 멀티: 모든 플레이어와 부딪힘 — 참가자는 위치가 조금 늦게 오므로 맞는 범위를 25% 작게 (내 화면에서 피했는데 맞는 일 줄임)
      if (p.aegisT > 0 && p.state !== 'DEAD' && world.reflectBullet && Math.hypot(p.x - this.x, p.y - this.y) < p.half + this.r + ((p.treasure && p.treasure.reach) || 10)) { world.reflectBullet(this, p); return; } /* 아킬레우스의 방패: 되돌려 보냄 */
      const h = world.coop && world.coop.host && p !== world.coop.me ? p.half * 0.75 : p.half;
      if (p.state !== 'DEAD' && Math.abs(p.x - this.x) < h + this.r - 1 && Math.abs(p.y - this.y) < h + this.r - 1) {
        if (world.withPlayer(p, () => world.damagePlayer(this.damage))) { this.alive = false; world.effects.spark(this.x, this.y, '#fff'); break; }
      } }
  }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.fillStyle = this.color; // 적 탄 빛 (위험 가시성)
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 3, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(x, y, this.r + 1, 0, TAU); ctx.fill();
    ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(x, y, this.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}

// 지연 폭발 장판 (보스 패턴)
/* 가레스의 부정 장판: delay(=지속 시간) 동안 안에 선 플레이어는 공격·스킬을 쓸 수 없음 (피해는 없음) */
class DenyZone {
  constructor(x, y, o) { Object.assign(this, o); this.x = x; this.y = y; this.t = 0; this.alive = true; this.kind = 'deny'; }
  update(dt, world) {
    this.t += dt; if (this.t >= this.delay) { this.alive = false; return; }
    if (this.t < 0.35) return; /* 처음 잠깐은 경고만 */
    for (const p of world.allPlayers()) if (p.state !== 'DEAD' && Math.hypot(p.x - this.x, p.y - this.y) < this.r) p.denyT = 0.15;
  }
  render(ctx) {
    const k = Math.min(1, this.t / 0.35, (this.delay - this.t) / 0.4), x = Math.round(this.x), y = Math.round(this.y), R = this.r, arm = this.t >= 0.35;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.6);
    ctx.globalAlpha = (arm ? 0.22 : 0.1) * k; ctx.fillStyle = '#d8f0ff'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85 * k; ctx.strokeStyle = arm ? '#ffffff' : '#d8f0ff'; ctx.lineWidth = arm ? 1.5 : 1; ctx.setLineDash(arm ? [] : [3, 3]); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = '#ff8a8a'; ctx.lineWidth = 2; const q = R * 0.35; /* 가운데 금지 표시 */
    ctx.beginPath(); ctx.moveTo(-q, -q); ctx.lineTo(q, q); ctx.moveTo(q, -q); ctx.lineTo(-q, q); ctx.stroke();
    ctx.restore(); ctx.lineWidth = 1; ctx.globalAlpha = 1;
  }
}
/* 아그라베인의 감시의 눈: 공중에 떠서 delay(=지속 시간) 동안 interval마다 가장 가까운 플레이어에게 조준 사격 — 플레이어 공격으로 부술 수 있음 (hp) */
class WatchEye {
  constructor(x, y, o) { Object.assign(this, o); this.x = x; this.y = y; this.t = 0; this.alive = true; this.kind = 'eye'; this.r = 9; this.fireT = 0.8 + Math.random() * 0.5; }
  update(dt, world) {
    this.t += dt; if (this.t >= this.delay || this.hp <= 0) { this.alive = false; world.effects.burst(this.x, this.y, '#d8b070', 8); return; }
    for (const q of world.projectiles) if (q.alive && !q.hitEyes?.has(this) && Math.hypot(q.x - this.x, q.y - this.y) < this.r + 3) { /* 플레이어 탄에 맞으면 깎임 */
      (q.hitEyes || (q.hitEyes = new Set())).add(this); this.hp -= q.damage * (1 + ((q.mods && q.mods.attackBonus) || 0)); world.effects.spark(this.x, this.y, '#ffffff'); if (!(q.pierceLeft > 0)) q.alive = false; }
    this.fireT -= dt; if (this.fireT > 0) return;
    this.fireT = this.interval; let tgt = null, best = 1e9;
    for (const p of world.allPlayers()) if (p.state !== 'DEAD') { const d = Math.hypot(p.x - this.x, p.y - this.y); if (d < best) { best = d; tgt = p; } }
    if (!tgt) return; const base = Math.atan2(tgt.y - this.y, tgt.x - this.x), h = (this.volley - 1) / 2;
    for (let i = 0; i < this.volley; i++) world.enemyShoot(this.x, this.y, base + (i - h) * this.spread, this.speed, this.dmg, this.color, 3);
    world.effects.ring(this.x, this.y, 10, this.color);
  }
  render(ctx) {
    const k = Math.min(1, this.t / 0.3, (this.delay - this.t) / 0.3), x = Math.round(this.x), y = Math.round(this.y), P = typeof game !== 'undefined' && game.player;
    const a = P ? Math.atan2(P.y - y, P.x - x) : 0, blink = (this.fireT != null && this.fireT < 0.25) ? 1 : 0;
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(20,14,8,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 12, 6, 2, 0, 0, TAU); ctx.fill(); /* 그림자 */
    ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.ellipse(x, y, 10, 6.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.ellipse(x, y, 8.5, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = blink ? '#ffffff' : this.color; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 2, 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a0a0a'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3.4, y + Math.sin(a) * 2.2, 1.4, 0, TAU); ctx.fill();
    if (blink) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = '#ff5a3a'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
class Hazard {
  constructor(x, y, o) { Object.assign(this, o); this.x = x; this.y = y; this.t = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.alive = false;
    for (const p of world.allPlayers()) if (p.state !== 'DEAD' && Math.hypot(p.x - this.x, p.y - this.y) < this.r + p.half) world.withPlayer(p, () => world.damagePlayer(this.damage));
    world.effects.explosion(this.x, this.y, this.r, this.color);
    for (let i = 0; i < this.bullets; i++)
      world.enemyShoot(this.x, this.y, i * TAU / this.bullets + Math.random() * 0.3, 110, Math.round(this.damage * 0.7), this.color, 3);
    world.addShake(0.08, 2);
  }
  render(ctx) {
    if (this.t < 0) return;
    const k = clamp(this.t / this.delay, 0, 1), x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = `rgba(255,60,40,${0.1 + 0.25 * k})`; ctx.beginPath(); ctx.arc(x, y, this.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = this.color; ctx.beginPath(); ctx.arc(x, y, this.r * k, 0, TAU); ctx.stroke();
  }
}

// 기술자 포탑
class Turret {
  constructor(x, y, owner, o = {}) { this.x = x; this.y = y; this.owner = owner; this.follow = o.follow || null; this.life = o.life || 12; this.dmg = o.damage || 8; this.rate = o.rate || 0.2; this.range = o.range || 220; this.cd = 0.3; this.ang = 0; this.alive = true; }
  update(dt, world) {
    this.life -= dt; this.cd -= dt;
    if (this.life <= 0) { this.alive = false; world.effects.burst(this.x, this.y, '#aaa', 6); return; }
    if (this.follow) { this.t = (this.t || 0) + dt; const a = this.t * 1.6 + this.follow.slot, P = this.owner; this.x += (P.x + Math.cos(a) * 20 - this.x) * Math.min(1, dt * 6); this.y += (P.y - 10 + Math.sin(a) * 8 - this.y) * Math.min(1, dt * 6); } // 드론: 플레이어 주위를 돎
    let best = null, bestD = this.range;
    for (const e of world.enemies) {
      if (!e.targetable) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestD && hasLineOfSight(this, e, world.map)) { best = e; bestD = d; }
    }
    if (!best) return;
    this.ang = Math.atan2(best.y - this.y, best.x - this.x);
    if (this.cd <= 0) {
      this.cd = this.rate;
      world.projectiles.push(new Projectile({ x: this.x, y: this.y - 3, dx: Math.cos(this.ang), dy: Math.sin(this.ang),
        speed: 380, range: this.range + 40, damage: this.dmg, pierce: 0, knockback: 1, mods: this.wmods ? this.wmods() : this.owner.mods, color: '#ffe36b', size: 1 }));
    }
  }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.life < 2 && Math.floor(this.life * 10) % 2 === 0) return;
    if (this.follow) { // 드론: 떠다니는 작은 기계 + 프로펠러
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 4, y + 10, 8, 2);
      ctx.fillStyle = OUTLINE; ctx.fillRect(x - 5, y - 3, 10, 6); ctx.fillStyle = '#5a6a7a'; ctx.fillRect(x - 4, y - 2, 8, 4); ctx.fillStyle = '#7ad0ff'; ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.fillStyle = Math.floor(this.life * 20) % 2 ? '#c8d0dc' : '#8a94a4'; ctx.fillRect(x - 7, y - 5, 5, 1); ctx.fillRect(x + 2, y - 5, 5, 1); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 6, y + 4, 12, 2);
    ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x - 6, y - 2, 12, 7);
    ctx.fillStyle = '#c08a30'; ctx.fillRect(x - 4, y - 6, 8, 5);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + Math.cos(this.ang) * 9, y - 3 + Math.sin(this.ang) * 9); ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// 지역 장악 웅덩이 (화염병 등): 범위 안 적에게 주기적으로 피해 + 상태이상
class Puddle {
  constructor(x, y, o, mods) { this.x = x; this.y = y; this.r = o.r; this.life = o.life; this.tick = o.tick; this.dmg = o.dmg; this.status = o.status; this.color = o.color; this.mods = mods; this.t = 0; this.next = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt; this.next -= dt;
    if (this.t >= this.life) { this.alive = false; return; }
    if (this.next <= 0) {
      this.next = this.tick;
      for (const e of world.enemies) if (e.targetable && Math.hypot(e.x - this.x, (e.y - this.y) / 0.6) < this.r + e.radius)
        world.damageEnemy(e, { damage: this.dmg, mods: this.mods, knockback: 0, status: this.status }, 0, 0, { quiet: true });
      for (let i = 0; i < 2; i++) world.effects.part(this.x + randInt(-this.r + 4, this.r - 4), this.y + randInt(-this.r / 2 + 2, this.r / 2 - 2), 0, -25, { color: this.color, life: 0.4, size: 2, size2: 0, drag: 1, add: true });
    }
  }
  render(ctx) {
    const k = Math.min(1, (this.life - this.t) / 0.5, this.t / 0.15);
    ctx.globalAlpha = 0.3 * k; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r, this.r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = this.color; ctx.stroke(); ctx.globalAlpha = 1;
  }
}

// 전투 드론: 플레이어 주위를 따라다니며 가장 가까운 적을 사격
class Drone {
  constructor(owner, def, idx) { this.owner = owner; this.def = def; this.idx = idx; this.x = owner.x; this.y = owner.y - 16; this.half = 5; this.life = def.summon.life; this.cd = 0.3; this.ang = 0; this.t = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt; this.life -= dt; this.cd -= dt;
    if (this.life <= 0 || this.owner.state === 'DEAD') { this.alive = false; world.effects.burst(this.x, this.y, '#aabbcc', 6); return; }
    const map = world.map, a = this.t * 1.6 + this.idx * Math.PI, margin = this.half + 2;
    const minX = TILE + margin, maxX = map.width * TILE - TILE - margin;
    const minY = TILE + margin, maxY = map.height * TILE - TILE - margin;
    // 플레이어 주위를 도는 네 위치 중 벽·맵 밖에 걸리지 않는 위치를 선택
    let target = null;
    for (const ang of [a, a + Math.PI / 2, a - Math.PI / 2, a + Math.PI]) {
      const tx = Math.max(minX, Math.min(maxX, this.owner.x + Math.cos(ang) * 22));
      const ty = Math.max(minY, Math.min(maxY, this.owner.y - 14 + Math.sin(ang) * 10));
      if (!overlapsSolid(tx, ty, this.half, map)) { target = { x: tx, y: ty }; break; }
    }
    if (!target) target = { x: this.owner.x, y: this.owner.y };
    // 이전 프레임의 위치가 벽 안이나 플레이어에게서 너무 멀리 이탈했다면 안전한 위치로 복귀
    if (overlapsSolid(this.x, this.y, this.half, map) || Math.hypot(this.x - this.owner.x, this.y - this.owner.y) > 50) {
      this.x = this.owner.x; this.y = this.owner.y;
    }
    const k = 1 - Math.exp(-8 * dt);
    moveAndCollide(this, (target.x - this.x) * k, (target.y - this.y) * k, map);
    // 맵 경계·벽을 넘어가지 못하게 최종 위치도 검증
    if (overlapsSolid(this.x, this.y, this.half, map)) { this.x = this.owner.x; this.y = this.owner.y; }
    let best = null, bd = this.def.range;
    for (const e of world.enemies) { if (!e.targetable) continue; const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < bd && hasLineOfSight(this, e, world.map)) { bd = d; best = e; } }
    if (!best) return;
    this.ang = Math.atan2(best.y - this.y, best.x - this.x);
    if (this.cd <= 0) {
      this.cd = this.def.summon.rate;
      world.projectiles.push(new Projectile({ x: this.x, y: this.y, dx: Math.cos(this.ang), dy: Math.sin(this.ang), speed: this.def.projectileSpeed, range: this.def.range,
        damage: this.def.damage, pierce: 0, knockback: 1, mods: this.wmods ? this.wmods() : this.owner.mods, color: this.def.bulletColor, size: 1 }));
      world.effects.muzzle(this.x + Math.cos(this.ang) * 5, this.y + Math.sin(this.ang) * 5, this.ang, this.def.bulletColor);
    }
  }
  render(ctx) {
    if (this.life < 2 && Math.floor(this.life * 10) % 2 === 0) return;
    const x = Math.round(this.x), y = Math.round(this.y + Math.sin(this.t * 6));
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 4, Math.round(this.owner.y) + 4, 8, 2);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 5, y - 3, 10, 6); ctx.fillStyle = '#8a9aaa'; ctx.fillRect(x - 4, y - 2, 8, 4);
    ctx.fillStyle = '#c8d0d8'; ctx.fillRect(x - 4, y - 2, 8, 1);
    ctx.fillStyle = Math.floor(this.t * 20) % 2 ? '#dfe8f0' : '#6a7a8a'; ctx.fillRect(x - 7, y - 4, 4, 1); ctx.fillRect(x + 3, y - 4, 4, 1);
    ctx.fillStyle = this.def.bulletColor; ctx.fillRect(x + Math.round(Math.cos(this.ang) * 2) - 1, y - 1, 2, 2);
  }
}

// 낙하 공격 (유성·화살비): 바닥에 경고 표시 → 시간이 되면 떨어져 범위 피해
class Strike {
  constructor(x, y, delay, r, src, color, arrow) { this.x = x; this.y = y; this.delay = delay; this.r = r; this.src = src; this.color = color; this.arrow = arrow; this.t = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.alive = false;
    if (this.arrow) { // 작은 화살: 조용히 범위 안 적만 타격
      for (const e of world.enemies) if (e.targetable && Math.hypot(e.x - this.x, e.y - this.y) < this.r + e.radius) world.damageEnemy(e, this.src, 0, 1, { quiet: true });
      world.effects.impact(this.x, this.y, this.color, -Math.PI / 2); world.effects.dust(this.x, this.y);
    } else world.explodeAt(this.x, this.y, this.r, { color: this.color, hurtEnemies: true, src: this.src });
  }
  render(ctx) {
    const k = Math.min(1, this.t / this.delay);
    ctx.globalAlpha = 0.25 + 0.35 * k; ctx.strokeStyle = this.color;
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r, this.r * 0.6, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.18 * k; ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * k, this.r * 0.6 * k, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    if (k > 0.55) { // 떨어지는 유성/화살
      const h = (1 - k) / 0.45 * 90, x = this.x + h * 0.35, y = this.y - h;
      if (this.arrow) { ctx.strokeStyle = this.color; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 8); ctx.stroke(); }
      else {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = this.color; ctx.lineWidth = 4; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y - 30); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.arc(x, y, 3 + this.r / 14, 0, TAU); ctx.fill(); ctx.restore(); ctx.lineWidth = 1;
      }
    }
  }
}

// 사제 스킬 '성역': 안에 있으면 회복, 들어오는 적 탄 소멸
class Sanctuary {
  constructor(x, y, owner, o = {}) { this.x = x; this.y = y; this.owner = owner; this.r = o.r || 54; this.life = o.life || 6; this.rate = o.heal || 4; this.boost = !!o.boost; this.dmg = o.dmg || 0; this.tick = 0; this.t = 0; this.heal = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt;
    if (this.t >= this.life) { this.alive = false; return; }
    const p = this.owner;
    if (p.state !== 'DEAD' && Math.hypot(p.x - this.x, p.y - this.y) < this.r) {
      this.heal += this.rate * dt; if (this.boost) p.sancBoost = 0.2; // 대성역: 안에 있으면 공격력 +35%
      if (this.heal >= 1) { const n = Math.floor(this.heal); this.heal -= n; p.hp = Math.min(p.maxHp, p.hp + n); if (Math.random() < 0.5) world.effects.heal(p.x, p.y); }
    }
    for (const b of world.enemyBullets) if (b.alive && Math.hypot(b.x - this.x, b.y - this.y) < this.r) { b.alive = false; world.effects.spark(b.x, b.y, '#ffe9a0'); }
    if (this.dmg && (this.tick -= dt) <= 0) { // 원 안의 적에게 신성 피해 (0.5초마다)
      this.tick = 0.5;
      for (const e of world.enemies) if (e.targetable && Math.hypot(e.x - this.x, e.y - this.y) < this.r + e.radius) world.damageEnemy(e, { damage: world.skillDmg(this.dmg * 0.5), mods: p.mods, knockback: 0 }, 0, 0);
    }
  }
  render(ctx) {
    const k = Math.min(1, (this.life - this.t) / 0.5, this.t / 0.2), pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
    ctx.globalAlpha = (0.12 + 0.05 * pulse) * k; ctx.fillStyle = '#ffe9a0';
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r, this.r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = '#ffe9a0';
    ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r, this.r * 0.7, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.4 * k; ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 0.6, this.r * 0.42, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// 드루이드 스킬 '영혼 늑대': 가까운 적에게 달려가 물어뜯음
class SpiritWolf {
  constructor(x, y, owner, o = {}) { this.x = x; this.y = y; this.owner = owner; this.big = !!o.big; this.slow = !!o.slow; this.half = this.big ? 9 : 5; this.life = o.life || 10; this.dmg = o.dmg || 14; this.cd = 0; this.face = 1; this.t = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt; this.life -= dt; this.cd -= dt;
    if (this.life <= 0 || this.owner.state === 'DEAD') { this.alive = false; world.effects.burst(this.x, this.y, '#9ad8ff', 8); return; }
    let best = null, bd = 220;
    for (const e of world.enemies) { if (!e.targetable || e.def.dummy && world.mode !== 'lobby') continue; const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < bd) { bd = d; best = e; } }
    const tx = best ? best.x : this.owner.x + this.face * -14, ty = best ? best.y : this.owner.y + 6;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    if (d > (best ? best.radius + 6 : 10)) { const v = 150 * dt; moveAndCollide(this, dx / d * v, dy / d * v, world.map); if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1; }
    if (best && d < best.radius + 10 && this.cd <= 0) {
      this.cd = this.big ? 0.8 : 0.75;
      const src = { damage: world.skillDmg(this.dmg), mods: this.owner.mods, knockback: this.big ? 10 : 3, status: this.slow ? { type: 'freeze', chance: 0.25, duration: 1, slow: 0.6 } : null };
      if (this.big) world.explodeAt(best.x, best.y, 30, { color: '#c8a070', hurtEnemies: true, src }); // 곰: 내려치기 범위 피해
      else world.damageEnemy(best, src, dx / d, dy / d);
      world.effects.slash(this.x, this.y, Math.atan2(dy, dx), this.big ? 20 : 10, 1.2, this.big ? '#c8a070' : '#9ad8ff'); if (this.big) world.addShake(0.08, 2);
    }
  }
  render(ctx) {
    if (this.life < 2 && Math.floor(this.life * 10) % 2 === 0) return;
    const spr = getSprite('spiritwolf');
    ctx.globalAlpha = 0.85; drawSprite(ctx, this.big ? getSprite('spiritbear') : spr, Math.round(this.x), Math.round(this.y) + (this.big ? 10 : 7), { flip: this.face < 0, scale: this.big ? 1.5 : 1 }); ctx.globalAlpha = 1;
  }
}

// 게이트 오브 바빌론: 바닥에 회전하는 금빛 문양, 공중에 열린 금빛 문들에서 창이 날아가 꽂히고 사슬이 뻗어 적을 묶음
//  범위 안의 적은 사용한 순간뿐 아니라 범위가 남아 있는 동안 계속 묶음 (막 나타나는 적·페이즈 전환 중인 보스·나중에 들어온 적 포함)
class ChainCircle {
  constructor(x, y, T, owner, world) {
    this.x = x; this.y = y; this.r = T.radius; this.life = T.duration; this.t = 0; this.alive = true; this.T = T; this.owner = owner; this.got = []; this.spears = [];
    this.gates = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * TAU + 0.3; return { x: x + Math.cos(a) * (this.r + 6), y: y - 48 + Math.sin(a) * (this.r * 0.35), ph: Math.random() * TAU }; });
    if (world) this.capture(world);
    for (let i = 0; i < 16; i++) { // 첫 일제 사격: 묶인 적에게 먼저, 나머지는 범위 안 아무 곳
      const e = this.got[i % Math.max(1, this.got.length)], a = Math.random() * TAU, d = Math.sqrt(Math.random()) * this.r * 0.9;
      const tx = e && i < this.got.length * 2 ? e.x + randInt(-4, 4) : x + Math.cos(a) * d, ty = e && i < this.got.length * 2 ? e.y + randInt(-4, 2) : y + Math.sin(a) * d * 0.6;
      this.addSpear(this.gates[i % 10], tx, ty, i * 0.03);
    }
  }
  addSpear(g, tx, ty, delay) { this.spears.push({ sx: g.x, sy: g.y, tx, ty, d: this.t + delay, hit: false }); if (this.spears.length > 60) this.spears.shift(); }
  capture(world) {
    if (this.t >= this.life - 0.3) return;
    for (const e of world.enemies) {
      if (!e.targetable || this.got.includes(e) || Math.hypot(e.x - this.x, e.y - this.y) > this.r + e.radius) continue;
      e.chainT = Math.max(e.chainT || 0, Math.max(1.5, this.life - this.t)); e.chainMax = e.chainT; this.got.push(e);
      world.damageEnemy(e, { damage: this.T.damage * world.scale.hp, mods: this.owner.mods, knockback: 0, mark: { mult: this.T.weak, dur: e.chainT } }, 0, 0); // 묶으며 큰 피해 + 받는 피해 증가
      world.effects.goldBurst(e.x, e.y, 10); world.effects.ring(e.x, e.y, e.radius + 8, '#ffd84a');
      if (this.t > 0.05) for (let k = 0; k < 2; k++) this.addSpear(this.gates[randInt(0, 9)], e.x + randInt(-3, 3), e.y, k * 0.05); // 나중에 묶인 적에게도 창
    }
  }
  update(dt, world) {
    this.t += dt;
    for (const s of this.spears) if (!s.hit && this.t >= s.d + 0.2) { s.hit = true; world.effects.spark(s.tx, s.ty, '#ffffff'); if (Math.random() < 0.5) world.effects.goldBurst(s.tx, s.ty, 4); }
    if (this.t >= this.life) { this.alive = false; for (const e of this.got) if (e.alive) { world.effects.goldBurst(e.x, e.y, 8); e.chainT = Math.min(e.chainT || 0, 0.05); } return; } // 풀릴 때 사슬이 금가루로 부서짐
    this.capture(world);
    if (Math.random() < 0.5) { const a = Math.random() * TAU, d = Math.random() * this.r;
      world.effects.part(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d * 0.6, 0, -20 - Math.random() * 20, { color: '#ffd84a', life: 0.6, size: 1.5, size2: 0, drag: 1, add: true }); }
  }
  render(ctx) {
    const k = Math.min(1, this.t / 0.15, (this.life - this.t) / 0.4), grow = Math.min(1, this.t / 0.3), rot = this.t * 1.2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, 0.6);
    ctx.globalAlpha = 0.18 * k; ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9 * k; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.r * grow, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#c8a050'; ctx.beginPath(); ctx.arc(0, 0, this.r * 0.75 * grow, 0, TAU); ctx.stroke();
    for (let i = 0; i < 16; i++) { const a = rot + i * TAU / 16; ctx.fillStyle = i % 4 ? '#c8a050' : '#fff4c0'; ctx.fillRect(Math.cos(a) * this.r * 0.88 - 1, Math.sin(a) * this.r * 0.88 - 1, 2, 2); }
    ctx.rotate(-rot); ctx.strokeStyle = '#ffd84a'; ctx.strokeRect(-this.r * 0.4, -this.r * 0.4, this.r * 0.8, this.r * 0.8); ctx.rotate(Math.PI / 4); ctx.strokeRect(-this.r * 0.4, -this.r * 0.4, this.r * 0.8, this.r * 0.8);
    ctx.restore();
    for (const s of this.spears) if (s.hit && this.t < s.d + 0.9) { // 바닥에 꽂힌 창 (잠시 남았다가 사라짐)
      const a = Math.atan2(s.ty - s.sy, s.tx - s.sx), f = 1 - (this.t - s.d - 0.2) / 0.7; ctx.globalAlpha = Math.max(0, f) * k;
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.tx, s.ty); ctx.lineTo(s.tx - Math.cos(a) * 10, s.ty - Math.sin(a) * 10); ctx.stroke(); ctx.lineWidth = 1;
    }
    ctx.restore();
  }
  renderTop(ctx) { // 캐릭터보다 위에 그림
    const k = Math.min(1, this.t / 0.15, (this.life - this.t) / 0.4), grow = Math.min(1, this.t / 0.3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const g of this.gates) { // 공중의 금빛 문 (일렁이는 물결)
      const s = grow * (1 + 0.12 * Math.sin(this.t * 6 + g.ph));
      ctx.globalAlpha = 0.9 * k; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(g.x, g.y, 8 * s, 4 * s, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(g.x, g.y, 12 * s, 6 * s, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(255,240,180,${0.7 * k})`; ctx.beginPath(); ctx.ellipse(g.x, g.y, 4 * s, 2 * s, 0, 0, TAU); ctx.fill();
    }
    for (const s of this.spears) { // 날아가는 창: 금빛 자루 + 흰 창끝 + 빛 꼬리
      const q = (this.t - s.d) / 0.2; if (q < 0 || q > 1) continue;
      const hx = s.sx + (s.tx - s.sx) * q, hy = s.sy + (s.ty - s.sy) * q, a = Math.atan2(s.ty - s.sy, s.tx - s.sx), c = Math.cos(a), n = Math.sin(a);
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx - c * 26, hy - n * 26); ctx.lineTo(hx, hy); ctx.stroke(); // 꼬리
      ctx.globalAlpha = 1; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - c * 13, hy - n * 13); ctx.lineTo(hx, hy); ctx.stroke(); ctx.lineWidth = 1; // 자루
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(hx + c * 5, hy + n * 5); ctx.lineTo(hx - n * 2.5, hy + c * 2.5); ctx.lineTo(hx + n * 2.5, hy - c * 2.5); ctx.closePath(); ctx.fill(); // 창끝
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k;
    const list = (typeof game !== 'undefined' ? game.enemies : this.got) || []; let ei = 0;
    for (const e of list) { // 사슬: 문 → 묶인 적 (굵은 고리 + 흐르는 빛)
      if (!e.alive || !(e.chainT > 0) || Math.hypot(e.x - this.x, e.y - this.y) > this.r + 40) continue;
      for (let gi = 0; gi < 2; gi++) {
        const g = this.gates[(ei * 3 + gi * 5) % this.gates.length], dx = e.x - g.x, dy = e.y - 4 - g.y, n = Math.max(4, Math.floor(Math.hypot(dx, dy) / 4));
        for (let i = 0; i < n * grow; i++) {
          const t = i / n, px = Math.round(g.x + dx * t), py = Math.round(g.y + dy * t + Math.sin(t * Math.PI) * 5), glint = Math.abs(((this.t * 1.5) % 1) - t) < 0.08;
          ctx.fillStyle = '#3a2a10'; if (i % 2) ctx.fillRect(px - 2, py - 1, 5, 3); else ctx.fillRect(px - 1, py - 2, 3, 5);
          ctx.fillStyle = glint ? '#ffffff' : i % 2 ? '#e8b040' : '#ffd84a'; if (i % 2) ctx.fillRect(px - 1, py, 3, 1); else ctx.fillRect(px, py - 1, 1, 3);
        }
      }
      ei++;
    }
    ctx.restore();
  }
}

// ── 직업 스킬 효과
// 자기 주위를 따라다니는 지속 피해 장판 (화염 회오리·피의 폭풍·뇌신강림)
class SkillAura {
  constructor(owner, o) { Object.assign(this, { r: 50, life: 5, tick: 0.25, dmg: 10, status: null, color: '#ff7a3a', kind: 'flame', lifesteal: 0 }, o); this.owner = owner; this.x = owner.x; this.y = owner.y; this.t = 0; this.next = 0; this.alive = true; }
  update(dt, world) {
    const p = this.owner; this.t += dt; this.next -= dt; this.x = p.x; this.y = p.y;
    if (this.t >= this.life || p.state === 'DEAD') { this.alive = false; return; }
    if (this.next > 0) return;
    this.next = this.tick;
    if (this.kind === 'thunder') { // 범위 안 무작위 적 2명에게 하늘에서 번개
      const list = world.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < this.r);
      for (let i = 0; i < 2 && list.length; i++) { const e = list.splice(randInt(0, list.length - 1), 1)[0];
        world.damageEnemy(e, { damage: world.skillDmg(this.dmg), mods: p.mods, knockback: 2, status: this.status || null }, 0, 1, { quiet: true }); world.effects.lightning(e.x + randInt(-6, 6), e.y - 90, e.x, e.y); }
      if (list.length || Math.random() < 0.5) SFX.play('react', 0.12);
      return;
    }
    let hit = 0;
    for (const e of world.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < this.r + e.radius) {
      world.damageEnemy(e, { damage: world.skillDmg(this.dmg), mods: p.mods, knockback: 1, status: this.status }, 0, 0, { quiet: true }); hit++; }
    if (this.lifesteal && hit) p.hp = Math.min(p.maxHp, p.hp + Math.min(3, hit * this.lifesteal));
    for (let i = 0; i < 3; i++) { const a = Math.random() * TAU, d = this.r * (0.4 + Math.random() * 0.6);
      world.effects.part(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7, -Math.sin(a) * 60, Math.cos(a) * 40 - 20, { color: this.color, life: 0.45, size: 2.5, size2: 0, drag: 2, add: true }); }
  }
  render(ctx) {
    const k = Math.min(1, this.t / 0.2, (this.life - this.t) / 0.4), rot = this.t * (this.kind === 'thunder' ? 1 : 5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(this.x, this.y + 4); ctx.scale(1, 0.7);
    ctx.globalAlpha = 0.14 * k; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = this.color; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, this.r * (0.55 + i * 0.2), rot + i * 2, rot + i * 2 + 1.6); ctx.stroke(); } // 휘도는 불길·피·번개 고리
    ctx.restore(); ctx.lineWidth = 1;
  }
}
// 시전형 스킬: 범위를 표시하고 time초 동안 모은 뒤 발동 (그동안 시전자는 이동·공격 불가)
class SkillCast {
  constructor(owner, x, y, o, done) { Object.assign(this, { r: 60, time: 2, color: '#ff7a3a' }, o); this.owner = owner; this.x = x; this.y = y; this.done = done; this.t = 0; this.alive = true; owner.castLock = this.time + 0.05; }
  update(dt, world) {
    this.t += dt;
    if (this.owner.state === 'DEAD') { this.alive = false; this.owner.castLock = 0; return; }
    if (Math.random() < 0.6) { const a = Math.random() * TAU; world.effects.part(this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r * 0.6, -Math.cos(a) * this.r * 1.2, -Math.sin(a) * this.r * 0.7, { color: this.color, life: 0.5, size: 2, size2: 0, drag: 0, add: true }); } // 모여드는 빛
    if (Math.random() < 0.4) world.effects.part(this.owner.x + randInt(-6, 6), this.owner.y + 4, 0, -40 - Math.random() * 30, { color: this.color, life: 0.5, size: 1.5, size2: 0, drag: 1, add: true }); // 시전자 주위로 솟는 빛
    if (this.t >= this.time) { this.alive = false; this.owner.castLock = 0; this.done(world, this);
      world.effects.rays(this.x, this.y, this.color, 16, this.r + 24, 0.6); world.effects.ring(this.x, this.y, this.r, '#ffffff'); } // 발동 순간 빛살
  }
  render(ctx) {
    const k = Math.min(1, this.t / this.time), rot = this.t * 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(this.x, this.y); ctx.scale(1, 0.6); // 마법진: 바깥 고리의 육각별 + 안쪽에서 반대로 도는 삼각형
    ctx.globalAlpha = 0.5 + 0.3 * k; ctx.strokeStyle = this.color; ctx.lineWidth = 1;
    const star = (R, n, step, a0) => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = a0 + (i * step % n) / n * TAU; const px = Math.cos(a) * R, py = Math.sin(a) * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); };
    star(this.r * 0.8, 6, 2, rot * 0.5); star(this.r * 0.8, 6, 2, rot * 0.5 + Math.PI / 6); star(this.r * 0.45, 3, 1, -rot);
    ctx.globalAlpha = 0.25 * k; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, this.r * 0.25 * k, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, 0.6);
    ctx.globalAlpha = 0.15 + 0.2 * k; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, this.r * k, 0, TAU); ctx.fill(); // 차오르는 범위
    ctx.globalAlpha = 0.9; ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, this.r * 0.8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = rot + i * TAU / 6; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.cos(a) * this.r * 0.9 - 1.5, Math.sin(a) * this.r * 0.9 - 1.5, 3, 3); } // 도는 문양
    ctx.restore();
    const bar = Math.round(28 * k); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(Math.round(this.owner.x) - 15, Math.round(this.owner.y) - 24, 30, 4);
    ctx.fillStyle = this.color; ctx.fillRect(Math.round(this.owner.x) - 14, Math.round(this.owner.y) - 23, bar, 2); // 시전 막대
  }
}
// 엑스칼리버 1단계: 검을 머리 위로 들어 올리면 칼끝에서 하늘까지 빛기둥이 솟음 (0.6초) → 조준 방향으로 휘둘러 내려찍음 (0.12초) → strike()
class ExcaliburRaise {
  constructor(owner, T, strike) { this.owner = owner; this.T = T; this.strike = strike; this.t = 0; this.alive = true; this.RAISE = 0.6; this.SWING = 0.12; owner.castLock = this.RAISE + this.SWING + 0.05; owner.blinkInv = Math.max(owner.blinkInv || 0, this.RAISE + this.SWING); }
  get x() { return this.owner.x; } get y() { return this.owner.y; }
  update(dt, world) {
    const p = this.owner; this.t += dt;
    if (p.state === 'DEAD') { this.alive = false; p.castLock = 0; return; }
    if (this.t < this.RAISE) { // 모여드는 빛 + 기둥 둘레의 금가루
      if (Math.random() < 0.8) { const a = Math.random() * TAU, d = 40 + Math.random() * 30; world.effects.part(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7, -Math.cos(a) * d * 2.2, -Math.sin(a) * d * 1.6, { color: '#fff4c0', life: 0.4, size: 2, size2: 0, drag: 0, add: true }); }
      if (Math.random() < 0.5) world.effects.part(p.x + randInt(-6, 6), p.y - 30 - Math.random() * 100, randInt(-10, 10), -20, { color: '#ffe9a0', life: 0.5, size: 1.5, size2: 0, drag: 1, add: true });
      if (!this.rung && this.t > this.RAISE * 0.5) { this.rung = true; world.effects.ring(p.x, p.y, 30, '#ffe9a0'); world.addShake(0.15, 2); }
    }
    if (this.t >= this.RAISE + this.SWING) { this.alive = false; p.castLock = 0; this.strike(); }
  }
  render() {}
  renderTop(ctx) { // 캐릭터 위에 그림: 들어 올린 검 + 빛기둥 → 내려찍는 동안 기둥이 조준 방향으로 회전
    const p = this.owner, t = this.t, hx = Math.round(p.x), hy = Math.round(p.y - 8), aim = Math.atan2(p.aim.y, p.aim.x);
    let ang = -Math.PI / 2, len, w;
    const RL = this.T.range; // 기둥 길이 = 실제 사거리
    if (t < this.RAISE) { const k = Math.min(1, t / (this.RAISE * 0.7)); len = 20 + (RL - 20) * k * k; w = 3 + 9 * k; }
    else { const k = Math.min(1, (t - this.RAISE) / this.SWING); let end = aim; // 바라보는 쪽으로 휘둘러 내림 (오른쪽이면 시계 방향, 왼쪽이면 반대)
      if (Math.cos(aim) >= 0) { while (end < -Math.PI / 2) end += TAU; while (end > Math.PI * 1.5) end -= TAU; } else { while (end > -Math.PI / 2) end -= TAU; while (end < -Math.PI * 2.5) end += TAU; }
      ang = -Math.PI / 2 + (end + Math.PI / 2) * k * k; len = RL; w = 12; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(hx, hy); ctx.rotate(ang);
    const band = (hw, col) => { const h = Math.max(1, Math.round(hw)); ctx.fillStyle = col; ctx.fillRect(10, -h, len, h * 2); };
    band(w * 1.9, 'rgba(200,140,40,0.25)'); band(w * 1.2, 'rgba(255,200,70,0.6)'); band(w * 0.7, 'rgba(255,236,170,0.95)'); band(w * 0.3, '#ffffff');
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 5; i++) { const off = 10 + ((i * 0.31 + t * 2.4) % 1) * len; ctx.fillRect(Math.round(off), Math.round((i % 3 - 1) * w * 0.4), 18, 1); } // 기둥을 타고 오르는 빛
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = OUTLINE; ctx.fillRect(-2, -4, 12, 8); ctx.fillStyle = '#ffd84a'; ctx.fillRect(6, -6, 2, 12); ctx.fillStyle = '#3a5aa0'; ctx.fillRect(0, -1, 6, 2); // 손잡이·날밑
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(8, -2, 24, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(8, -1, 24, 1); // 검신
    ctx.restore();
    if (t < this.RAISE) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 30); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.ellipse(hx, Math.round(p.y + 6), 16 + t * 20, 5 + t * 6, 0, 0, TAU); ctx.fill(); ctx.restore(); } // 발밑 빛
  }
}
// 이펙트 방출기: life초 동안 매 프레임 fn(world, x, y, t)을 불러 입자를 뿌림 (follow: 따라다닐 대상)
class FxEmitter {
  constructor(x, y, life, fn, follow) { this.x = x; this.y = y; this.life = life; this.fn = fn; this.follow = follow || null; this.t = 0; this.alive = true; }
  update(dt, world) { this.t += dt; if (this.follow) { this.x = this.follow.x; this.y = this.follow.y; } if (this.t >= this.life || (this.follow && this.follow.state === 'DEAD')) { this.alive = false; return; } this.fn(world, this.x, this.y, this.t); }
  render() {}
}
// 어둠 소용돌이: 범위 안 적을 중심으로 끌어당기며 지속 피해
class DarkHole {
  constructor(x, y, owner, o) { Object.assign(this, { r: 60, life: 2.5, pull: 70, tick: 0.25, dmg: 8 }, o); this.owner = owner; this.x = x; this.y = y; this.t = 0; this.next = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt; this.next -= dt;
    if (this.t >= this.life) { this.alive = false; return; }
    for (const e of world.enemies) {
      if (!e.targetable || (e.def.knockbackResist || 0) >= 1) continue;
      const dx = this.x - e.x, dy = this.y - e.y, d = Math.hypot(dx, dy);
      if (d < this.r + 30 && d > 4) moveAndCollide(e, dx / d * this.pull * dt * (e.def.boss ? 0.3 : 1), dy / d * this.pull * dt * (e.def.boss ? 0.3 : 1), world.map);
    }
    if (this.next <= 0) { this.next = this.tick;
      for (const e of world.enemies) if (e.targetable && Math.hypot(e.x - this.x, e.y - this.y) < this.r) world.damageEnemy(e, { damage: world.skillDmg(this.dmg), mods: this.owner.mods, knockback: 0, status: this.status || null }, 0, 0, { quiet: true }); }
    if (Math.random() < 0.8) { const a = Math.random() * TAU; world.effects.part(this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r * 0.6, -Math.cos(a) * this.r * 1.5 - Math.sin(a) * 30, -Math.sin(a) * this.r + Math.cos(a) * 20, { color: '#a070e0', life: 0.6, size: 2, size2: 0, drag: 0, add: true }); }
  }
  render(ctx) {
    if (this.hole) return; /* 블랙홀은 renderTop에서 (시전 마법진·적보다 위에 그려야 중심이 새까맣게 보임) */
    const k = Math.min(1, this.t / 0.3, (this.life - this.t) / 0.3), rot = -this.t * 4;
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, 0.6);
    ctx.globalAlpha = 0.5 * k; ctx.fillStyle = '#100820'; ctx.beginPath(); ctx.arc(0, 0, this.r * 0.55, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85 * k; ctx.strokeStyle = '#a070e0'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, this.r * (0.4 + i * 0.17), rot + i, rot + i + 2.2); ctx.stroke(); }
    ctx.restore(); ctx.lineWidth = 1;
  }
  renderTop(ctx) { if (this.hole) this.renderHole(ctx); }
  renderHole(ctx) { /* 블랙홀: 빛을 삼키는 새까만 중심 + 빛나는 광자 고리 + 기울어진 강착 원반(뒤쪽은 중심 뒤로 가려짐) + 빨려 드는 나선 + 끝에 수축 */
    const T = this.t, L = this.life, grow = Math.min(1, T / 0.5), col = Math.max(0, Math.min(1, (L - T) / 0.25)), k = grow * col;
    const x = Math.round(this.x), y = Math.round(this.y), R = this.r, core = Math.max(1, R * 0.2 * k), spin = T * 5;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, core, x, y, R * 1.1); g.addColorStop(0, 'rgba(10,0,20,0.75)'); g.addColorStop(0.45, 'rgba(30,8,50,0.35)'); g.addColorStop(1, 'rgba(30,8,50,0)');
    ctx.globalAlpha = grow; ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R * 1.1, R * 0.75, 0, 0, TAU); ctx.fill(); /* 주변이 어두워짐 */
    const disk = (front) => { /* 강착 원반: 위(뒤)쪽 반 / 아래(앞)쪽 반 */
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(1, 0.32);
      const a0 = front ? 0 : Math.PI, a1 = a0 + Math.PI;
      for (let i = 0; i < 5; i++) { const rr = core * 1.5 + (R * 0.62 - core * 1.5) * (i / 4) * k + 2, al = (0.75 - i * 0.12) * k;
        ctx.globalAlpha = al; ctx.strokeStyle = i < 2 ? '#fff0d8' : i < 4 ? '#ffa860' : '#b060ff'; ctx.lineWidth = i < 2 ? 3 : 2;
        ctx.beginPath(); ctx.arc(0, 0, rr, a0, a1); ctx.stroke();
        ctx.globalAlpha = al * 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; /* 도는 밝은 덩어리 */
        for (let j = 0; j < 3; j++) { const s = ((spin * (1.6 - i * 0.2) + j * 2.1 + i) % TAU + TAU) % TAU; if ((s >= a0 && s <= a1) || (s + TAU >= a0 && s + TAU <= a1)) { ctx.beginPath(); ctx.arc(0, 0, rr, s, s + 0.5); ctx.stroke(); } } }
      ctx.restore(); ctx.lineWidth = 1; };
    disk(false);
    ctx.globalAlpha = 1; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(x, y, core, 0, TAU); ctx.fill(); /* 사건의 지평선 */
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9 * k; ctx.strokeStyle = '#e8d0ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, core + 1.5, 0, TAU); ctx.stroke(); /* 광자 고리 */
    ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = '#ffb070'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - core * 0.15, core * 1.35, core * 1.25, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); /* 뒤쪽 원반이 휘어 보이는 빛 */
    ctx.restore();
    disk(true);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(1, 0.6); ctx.strokeStyle = '#a070e0'; /* 빨려 드는 나선 */
    for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.35 * k; ctx.beginPath();
      for (let s = 0; s <= 12; s++) { const u = s / 12, rr = R * (1 - u) + core * u, a = -spin * 0.6 + i * TAU / 6 + u * 2.6; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; s ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); }
    ctx.restore();
    if (col < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - col) * 0.8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R * 0.3 * col + 2, 0, TAU); ctx.stroke(); ctx.restore(); ctx.lineWidth = 1; } /* 수축 */
    ctx.globalAlpha = 1;
  }
}
/* 익스플로전: 범위 위 공중에 불꽃 마법진이 떠오르고, 아래 땅에 작은 불기둥이 하나씩 솟았다가 발동 순간 차례로 터짐 (보이는 연출만, 피해는 SkillCast가 처리) */
class ExplosionSigil {
  constructor(owner, x, y, o) {
    Object.assign(this, { r: 90, time: 2, H: 46 }, o); this.owner = owner; this.x = x; this.y = y; this.t = 0; this.alive = true; this.boomed = 0;
    this.pillars = []; const n = 9;
    for (let i = 0; i < n; i++) { const a = i * 2.4 + Math.random() * 0.6, d = (i === 0 ? 0 : 0.35 + 0.55 * Math.random()) * this.r * 0.85;
      this.pillars.push({ x: Math.round(x + Math.cos(a) * d), y: Math.round(y + Math.sin(a) * d * 0.6), at: 0.35 + i * 0.14, h: 16 + Math.round(Math.random() * 12) }); }
  }
  update(dt, world) {
    this.t += dt;
    if (this.owner && this.owner.state === 'DEAD' && this.t < this.time) { this.alive = false; return; }
    for (const p of this.pillars) if (this.t > p.at && this.t < this.time && Math.random() < 0.25) world.effects.part(p.x + randInt(-1, 1), p.y - p.h * Math.min(1, (this.t - p.at) / 0.25), randInt(-8, 8), -30 - Math.random() * 30, { color: Math.random() < 0.5 ? '#ffd84a' : '#ff7a3a', life: 0.4, size: 1.5, size2: 0, drag: 1, add: true });
    while (this.t >= this.time + this.boomed * 0.045 && this.boomed < this.pillars.length) { /* 발동: 기둥이 차례로 터짐 */
      const p = this.pillars[this.boomed++]; world.effects.explosion(p.x, p.y - 4, 14 + (p.h >> 2), pick(['#ffffff', '#ffd84a', '#ff7a3a']));
      world.effects.skyBeam && world.effects.skyBeam(p.x, p.y, '#ffb04a', 0, 3); }
    if (this.boomed >= this.pillars.length && this.t > this.time + 0.5) this.alive = false;
  }
  render(ctx) {
    const T = this.t, before = T < this.time, k = Math.min(1, T / 0.5), fade = before ? 1 : Math.max(0, 1 - (T - this.time) / 0.4), rot = T * 1.6;
    const cx = Math.round(this.x), cy = Math.round(this.y - this.H), R = this.r * 0.7;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.38); /* 공중 마법진 */
    ctx.globalAlpha = 0.18 * k * fade; ctx.fillStyle = '#ff7a3a'; ctx.beginPath(); ctx.arc(0, 0, R * k, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9 * k * fade; ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R * k, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#ff9a4a'; ctx.beginPath(); ctx.arc(0, 0, R * 0.82 * k, 0, TAU); ctx.stroke();
    const star = (rr, n, step, a0) => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = a0 + (i * step % n) / n * TAU; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); };
    ctx.strokeStyle = '#ffb04a'; star(R * 0.8 * k, 5, 2, rot); ctx.strokeStyle = '#ffe9a0'; star(R * 0.42 * k, 3, 1, -rot * 1.5);
    for (let i = 0; i < 12; i++) { const a = -rot * 0.7 + i * TAU / 12; ctx.fillStyle = i % 2 ? '#ffd84a' : '#ffffff'; ctx.fillRect(Math.round(Math.cos(a) * R * 0.91 * k) - 1, Math.round(Math.sin(a) * R * 0.91 * k) - 1, 2, 2); } /* 룬 */
    ctx.restore();
    ctx.globalAlpha = 0.12 * k * fade; ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.lineTo(this.x + this.r * 0.85, this.y); ctx.lineTo(this.x - this.r * 0.85, this.y); ctx.closePath(); ctx.fill(); /* 마법진에서 내려오는 빛 */
    this.pillars.forEach((p, i) => { /* 땅의 작은 불기둥 */
      if (T < p.at) return; const g = Math.min(1, (T - p.at) / 0.25), boom = i < this.boomed; if (boom) return;
      const h = Math.round(p.h * g), w = 3, fl = 0.75 + 0.25 * Math.sin(T * 30 + i);
      ctx.globalAlpha = 0.35 * fl; ctx.fillStyle = '#ff7a3a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 2, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.8 * fl; ctx.fillStyle = '#ff7a3a'; ctx.fillRect(p.x - w, p.y - h, w * 2, h);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(p.x - 1.5, p.y - h, 3, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - 0.5, p.y - h, 1, h);
      ctx.globalAlpha = 0.25 * fl; ctx.fillStyle = '#ffd84a'; ctx.fillRect(Math.round(p.x) - 0.5, cy, 1, p.y - h - cy); /* 마법진과 이어진 가는 빛 */ });
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
// 전직의 방: 지금 직업의 상위자 (말을 걸면 진화 방법을 고름)
class MasterNPC {
  constructor(x, y, room) { this.x = x; this.y = y; this.room = room; this.radius = 22; this.gone = false; }
  label(game) {
    const p = game.player; if (this.gone) return null;
    if (!p.line || p.rank >= 2) return '더 이상 진화할 수 없습니다';
    if (this.hybrid) return `[E] ${this.hybrid.el.name}의 마도사 상위자 — ${game.hybridTitle(this)}(으)로 진화`;
    if (p.rank === 0 && branchesAtEvolve(p.hero.id)) return this.branch ? `[E] 상위자 — ${this.branch.ranks[1]}(으)로 진화` : '[E] 상위자 — 진화 갈래 고르기';
    return `[E] 상위자 — ${p.line.ranks[p.rank + 1]}(으)로 진화`;
  }
  get labelColor() { return '#ffd84a'; }
  interact(game) {
    const p = game.player; if (this.gone || !p.line || p.rank >= 2) return;
    if (p.rank === 0 && branchesAtEvolve(p.hero.id) && !this.branch) { // 첫 진화: 갈래부터 고름 (암살자)
      game.overlay = { type: 'variant', lines: jobLines(p.hero.id), title: JOB_LINES[p.hero.id].title, branch: true, onPick: (L) => { this.branch = L; game.overlay = { type: 'evolve', npc: this }; } };
      return;
    }
    game.overlay = { type: 'evolve', npc: this };
  }
  render(ctx, game) {
    if (this.gone) return;
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0, p = game.player;
    ctx.fillStyle = `rgba(255,216,74,${0.18 + 0.08 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.ellipse(x, y + 6, 14, 5, 0, 0, TAU); ctx.fill();
    const H = this.hybrid ? this.hybrid.masterHero : p.hero; // 혼합 전직: 다른 직업(마도사)의 상위자
    if (this.hybrid) { ctx.fillStyle = this.hybrid.el.color || '#ffd84a'; ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 3); ctx.beginPath(); ctx.ellipse(x, y + 6, 18, 6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    drawHero(ctx, H, x, y - 2, -1, 0, false);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4); drawSprite(ctx, heroSprite(H, 0), x, y + 5, { flip: true, white: true }); ctx.restore(); // 금빛으로 빛나는 상위자
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 3, y - 22, 7, 2); ctx.fillRect(x - 3, y - 24, 1, 2); ctx.fillRect(x, y - 25, 1, 3); ctx.fillRect(x + 3, y - 24, 1, 2); // 왕관
    hudText(ctx, this.hybrid ? `${this.hybrid.el.name}의 상위자` : '상위자', x, y + 10, this.hybrid ? (this.hybrid.el.color || '#ffd84a') : '#ffd84a', 'center', 7);
  }
}

// 암살자 '그림자 처형': 그림자 분신 둘과 함께 셋이서 대상들을 차례로 습격. 체력이 일정 이하로 남은 적은 즉시 처형
class ShadowStrike {
  constructor(owner, targets, dmg) {
    this.owner = owner; this.targets = targets.slice(); this.dmg = dmg; this.t = 0; this.i = 0; this.alive = true; this.ghosts = [];
    this.pos = [{ x: owner.x, y: owner.y }, { x: owner.x - 14, y: owner.y + 6 }, { x: owner.x + 14, y: owner.y + 6 }]; // [본체, 분신1, 분신2]
    for (let k = 1; k <= 2; k++) this.ghosts.push({ x: this.pos[k].x, y: this.pos[k].y, life: 0.9, face: 1 });
  }
  update(dt, world) {
    this.t += dt;
    for (const gh of this.ghosts) gh.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    if (this.i < this.targets.length && this.t >= this.i * 0.09) { // 0.09초마다 셋이 번갈아 한 명씩 습격
      const e = this.targets[this.i], who = this.i % 3, from = this.pos[who];
      if (e.alive && e.targetable) {
        const side = (who - 1) * 10, tx = e.x - 10 + side, ty = e.y + (who ? 6 : 0);
        world.effects.beamline(from.x, from.y, tx, ty, 2, who ? '#6a4aa0' : '#b080ff');
        world.effects.slash(e.x, e.y, Math.atan2(ty - from.y, tx - from.x), 16, 2.2, who ? '#8a6ac0' : '#e0c8ff');
        this.pos[who] = { x: tx, y: ty }; this.ghosts.push({ x: tx, y: ty, life: 0.45, face: tx < e.x ? 1 : -1, real: who === 0 });
        world.damageEnemy(e, { damage: this.dmg, mods: this.owner.mods, knockback: 2 }, 0, 0);
        const th = e.def.boss ? 0.1 : 0.25; // 처형: 남은 체력이 기준 이하면 즉시 쓰러뜨림
        if (e.alive && e.hp <= e.maxHp * th) {
          const left = e.hp; if (e.takeHit(left)) { world.effects.text(e.x, e.y - 22, '처형!', '#ff4a6a', true); world.effects.burst(e.x, e.y, '#ff4a6a', 18); if (!e.alive) world.onEnemyKilled(e); }
        }
        SFX.play('melee', 0.03); world.hitStop(0.02);
      }
      this.i++;
    }
    if (this.i >= this.targets.length && this.t >= this.i * 0.09 + 0.25) { // 끝나면 본체는 마지막으로 습격한 자리로
      const p = this.owner, d = this.pos[0]; moveAndCollide(p, d.x - p.x, d.y - p.y, world.map);
      world.effects.burst(this.pos[1].x, this.pos[1].y, '#3a3048', 8); world.effects.burst(this.pos[2].x, this.pos[2].y, '#3a3048', 8); this.alive = false;
    }
  }
  render(ctx) { // 반투명한 보랏빛 분신
    const p = this.owner, img = shadowSprite(p.hero);
    for (const g of this.ghosts) { ctx.globalAlpha = Math.min(0.85, g.life * 2) * (g.real ? 1 : 0.8);
      ctx.drawImage(g.face < 0 ? img.f : img.n, Math.round(g.x - img.w / 2), Math.round(g.y + 7 - img.h)); }
    ctx.globalAlpha = 1;
  }
}
// 영웅 스프라이트를 보랏빛 그림자 색으로 칠한 사본 (분신용)
function shadowSprite(hero) {
  const key = 'shadow|' + hero.id; let s = spriteCache.get(key); if (s) return s;
  const base = heroSprite(hero, 0), make = (img) => { const c = document.createElement('canvas'); c.width = base.w; c.height = base.h; const g = c.getContext('2d');
    g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(70,40,120,0.75)'; g.fillRect(0, 0, c.width, c.height); return c; };
  s = { n: make(base.n), f: make(base.f), w: base.w, h: base.h }; spriteCache.set(key, s); return s;
}

// 가든 오브 아발론: 방 한가운데 하얀 탑이 솟고 방 바닥이 꽃밭으로 — 안의 적은 느려지고 약해지며, 나는 강해지고 회복
class AvalonGarden {
  constructor(x, y, room, T, owner) {
    this.x = x; this.y = y; this.room = room; this.T = T; this.owner = owner; this.t = 0; this.life = T.duration; this.alive = true; this.heal = 0;
    const b = this.bounds = room ? { x0: room.x0 * TILE, y0: room.y0 * TILE, x1: (room.x0 + room.w) * TILE, y1: (room.y0 + room.h) * TILE } : { x0: x - 130, y0: y - 90, x1: x + 130, y1: y + 90 };
    this.flowers = []; const n = Math.min(260, Math.round((b.x1 - b.x0) * (b.y1 - b.y0) / 220));
    for (let i = 0; i < n; i++) this.flowers.push({ x: b.x0 + 4 + Math.random() * (b.x1 - b.x0 - 8), y: b.y0 + 6 + Math.random() * (b.y1 - b.y0 - 10), c: pick(['#ffb0d8', '#ffffff', '#ffe9a0', '#d8b8ff', '#ff8ac0']), d: Math.hypot(0, 0) });
    for (const f of this.flowers) f.d = Math.hypot(f.x - x, f.y - y); // 탑에서 가까운 꽃부터 피어남
  }
  inside(o) { const b = this.bounds; return o.x >= b.x0 && o.x <= b.x1 && o.y >= b.y0 && o.y <= b.y1; }
  update(dt, world) {
    this.t += dt; if (this.t >= this.life) { this.alive = false; return; }
    const T = this.T; this.heal += T.regen * dt; const n = Math.floor(this.heal); if (n) this.heal -= n;
    for (const p of world.allPlayers()) if (p.state !== 'DEAD' && this.inside(p)) { p.avalonT = 0.3; p.avalonAtk = T.atk; p.avalonGuard = T.guard; if (n) p.hp = Math.min(p.maxHp, p.hp + n); } // 꽃밭 안의 아군 모두 (멀티: 동료도)
    for (const e of world.enemies) if (e.targetable && this.inside(e)) { e.slow = Math.max(e.slow, 0.4); e.slowK = e.def.boss ? Math.max(0.8, Math.min(e.slowK || 1, 0.85)) : Math.min(e.slowK || 1, T.slowK); e.avalonVuln = T.vuln || 0.2; e.avalonUntil = world.time + 0.3; }
    if (Math.random() < 0.6) { const b = this.bounds; world.effects.part(b.x0 + Math.random() * (b.x1 - b.x0), b.y0 + Math.random() * (b.y1 - b.y0), 12 + Math.random() * 10, -6 - Math.random() * 8, { color: pick(['#ffb0d8', '#ffffff', '#ffd8ec']), life: 1.6, size: 1.5, size2: 0.5, drag: 0.2 }); } // 흩날리는 꽃잎
  }
  render(ctx) { // 바닥의 꽃밭
    const grow = Math.min(1, this.t / 0.9), fade = Math.min(1, (this.life - this.t) / 1), reach = grow * 400;
    ctx.save(); ctx.globalAlpha = 0.18 * fade; ctx.fillStyle = '#ffd8ec'; const b = this.bounds; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.globalAlpha = fade;
    for (const f of this.flowers) { if (f.d > reach) continue; const x = Math.round(f.x), y = Math.round(f.y); ctx.fillStyle = '#4a8a4a'; ctx.fillRect(x, y + 1, 1, 2); ctx.fillStyle = f.c; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x, y, 1, 1); }
    ctx.restore();
  }
  renderTop(ctx) { // 한가운데의 아발론의 탑 (솟아오름)
    const rise = Math.min(1, this.t / 0.6), fade = Math.min(1, (this.life - this.t) / 1), x = Math.round(this.x), y = Math.round(this.y), H = Math.round(64 * rise);
    ctx.save(); ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 16, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 10, y - H, 20, H + 4); ctx.fillStyle = '#e8e4f0'; ctx.fillRect(x - 9, y - H + 1, 18, H + 2); ctx.fillStyle = '#c8c4d8'; ctx.fillRect(x + 3, y - H + 1, 6, H + 2); // 흰 돌탑
    for (let yy = y - H + 8; yy < y; yy += 10) { ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x - 9, yy, 18, 1); }
    if (rise >= 1) { ctx.fillStyle = OUTLINE; ctx.fillRect(x - 3, y - H + 18, 6, 9); ctx.fillStyle = '#ffd8ec'; ctx.fillRect(x - 2, y - H + 19, 4, 7); } // 창
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.moveTo(x - 13, y - H + 1); ctx.lineTo(x, y - H - 16); ctx.lineTo(x + 13, y - H + 1); ctx.closePath(); ctx.fill(); // 지붕
    ctx.fillStyle = '#8a6ab0'; ctx.beginPath(); ctx.moveTo(x - 11, y - H); ctx.lineTo(x, y - H - 14); ctx.lineTo(x + 11, y - H); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; const gl = 0.5 + 0.3 * Math.sin(this.t * 4); ctx.globalAlpha = fade * gl; ctx.fillStyle = '#ffd8ec'; ctx.beginPath(); ctx.arc(x, y - H - 18, 6, 0, TAU); ctx.fill(); // 꼭대기의 빛
    for (let i = 0; i < 4; i++) { const a = this.t * 1.5 + i * TAU / 4; ctx.fillRect(Math.round(x + Math.cos(a) * 16) - 1, Math.round(y - H * 0.6 + Math.sin(a) * 5) - 1, 3, 3); } // 탑을 도는 꽃빛
    ctx.restore();
  }
}

// 덫: 바닥에 놓여 있다가 적이 밟으면 덥석 물어 피해 + 묶음(보스는 절반). 번개 덫은 주변으로 연쇄 번개
// 롱고미니아드: 빛의 창이 날아가 꽂힘(착탄 피해) → 빛의 탑이 서서 주변 적을 끌어당기며 지속 피해 → 무너지며 대폭발
class RhongoTower {
  constructor(owner, tx, ty, T) {
    this.owner = owner; this.T = T; this.sx = owner.x; this.sy = owner.y - 6; this.x = tx; this.y = ty; this.t = 0; this.alive = true;
    this.FLY = 0.22; this.next = 0; this.landed = false; this.ang = Math.atan2(ty - this.sy, tx - this.sx);
    this.end = this.FLY + T.duration;
  }
  src(world, dmg, kb) { return { damage: dmg * world.scale.hp, mods: Object.assign({}, this.owner.mods, { critChance: 0 }), knockback: kb }; }
  update(dt, world) {
    const T = this.T, fx = world.effects; this.t += dt;
    if (this.t < this.FLY) { const k = this.t / this.FLY; fx.part(this.sx + (this.x - this.sx) * k, this.sy + (this.y - this.sy) * k, 0, 0, { color: '#bfe6ff', life: 0.25, size: 2, size2: 0, drag: 1, add: true }); return; }
    if (!this.landed) { // 착탄
      this.landed = true;
      for (const e of world.enemies) if (e.targetable && Math.hypot(e.x - this.x, e.y - this.y) < T.impact + e.radius) world.damageEnemy(e, this.src(world, T.damage, 12), e.x - this.x, e.y - this.y);
      fx.skyBeam(this.x, this.y, '#ffffff', 0, 18); fx.rays(this.x, this.y, '#bfe6ff', 20, 120, 0.8); fx.ring(this.x, this.y, T.impact, '#ffffff'); fx.ring(this.x, this.y, T.radius, '#7ac8ff');
      for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 90; fx.part(this.x, this.y, Math.cos(a) * s, Math.sin(a) * s * 0.6, { color: i % 2 ? '#bfe6ff' : '#ffffff', life: 0.6, size: 2, size2: 0, drag: 3, add: true }); }
      world.addShake(0.4, 7); world.screenFlash = 0.25; world.flashColor = '210,235,255'; world.hitStop(0.08); SFX.play('excal');
      this.next = T.tick;
    }
    if (this.t >= this.end) { // 탑 붕괴 → 대폭발
      this.alive = false;
      world.explodeAt(this.x, this.y, T.radius, { color: '#bfe6ff', hurtEnemies: true, src: this.src(world, T.final, 16) });
      fx.rays(this.x, this.y, '#ffffff', 24, T.radius * 2, 0.9); fx.ring(this.x, this.y, T.radius * 1.4, '#bfe6ff');
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; fx.skyBeam(this.x + Math.cos(a) * T.radius * 0.6, this.y + Math.sin(a) * T.radius * 0.4, i % 2 ? '#bfe6ff' : '#ffffff', i * 0.03, 6); }
      world.addShake(0.45, 8); world.screenFlash = 0.3; world.flashColor = '220,240,255'; SFX.play('explode');
      return;
    }
    for (const e of world.enemies) { // 끌어당김 (보스는 약하게)
      if (!e.targetable || (e.def.knockbackResist || 0) >= 1) continue;
      const dx = this.x - e.x, dy = this.y - e.y, d = Math.hypot(dx, dy);
      if (d < T.radius + 30 && d > 6) { const f = T.pull * dt * (e.def.boss ? 0.3 : 1); moveAndCollide(e, dx / d * f, dy / d * f, world.map); }
    }
    this.next -= dt;
    if (this.next <= 0) { this.next += T.tick;
      for (const e of world.enemies) if (e.targetable && Math.hypot(e.x - this.x, e.y - this.y) < T.radius + e.radius) world.damageEnemy(e, this.src(world, T.tickDmg, 0), 0, 0, { quiet: true });
      fx.ring(this.x, this.y, T.radius * 0.5, '#bfe6ff'); }
    if (Math.random() < 0.9) { const a = Math.random() * TAU, d = T.radius * (0.6 + Math.random() * 0.5); // 빨려 드는 빛 + 탑을 타고 오르는 빛
      fx.part(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d * 0.6, -Math.cos(a) * d * 1.6, -Math.sin(a) * d, { color: '#bfe6ff', life: 0.5, size: 1.5, size2: 0, drag: 0, add: true }); }
    if (Math.random() < 0.6) fx.part(this.x + randInt(-5, 5), this.y - Math.random() * 20, 0, -120 - Math.random() * 60, { color: '#ffffff', life: 0.8, size: 1.5, size2: 0, drag: 0, add: true });
  }
  render(ctx) { // 바닥 문양
    if (!this.landed) return;
    const T = this.T, lt = this.t - this.FLY, k = Math.min(1, lt / 0.2, (this.end - this.t) / 0.3), rot = lt * 1.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(this.x, this.y); ctx.scale(1, 0.6);
    ctx.globalAlpha = 0.16 * k; ctx.fillStyle = '#7ac8ff'; ctx.beginPath(); ctx.arc(0, 0, T.radius, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85 * k; ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, T.radius, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, T.radius * (0.35 + i * 0.2), -rot * (i % 2 ? -1 : 1) + i, -rot * (i % 2 ? -1 : 1) + i + 3.6); ctx.stroke(); } // 안쪽으로 감기는 고리
    for (let i = 0; i < 12; i++) { const a = rot + i * TAU / 12; ctx.fillStyle = i % 3 ? '#7ac8ff' : '#ffffff'; ctx.fillRect(Math.cos(a) * T.radius * 0.9 - 1, Math.sin(a) * T.radius * 0.9 - 1, 3, 3); }
    ctx.restore(); ctx.lineWidth = 1;
  }
  renderTop(ctx) {
    const T = this.T;
    if (!this.landed) { // 날아가는 창
      const k = this.t / this.FLY, x = this.sx + (this.x - this.sx) * k, y = this.sy + (this.y - this.sy) * k;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(this.ang); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(150,210,255,0.35)'; ctx.fillRect(-40, -3, 40, 6); ctx.fillStyle = 'rgba(220,240,255,0.7)'; ctx.fillRect(-30, -1, 30, 2);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#e8f4ff'; ctx.fillRect(-14, -1, 18, 2); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(12, 0); ctx.lineTo(4, 3); ctx.fill();
      ctx.restore(); return;
    }
    const lt = this.t - this.FLY, grow = Math.min(1, lt / 0.25), k = Math.min(1, (this.end - this.t) / 0.3), H = 190 * grow, x = Math.round(this.x), y = Math.round(this.y);
    const pulse = 1 + 0.12 * Math.sin(lt * 14);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
    const col = (hw, c) => { const w = Math.max(1, Math.round(hw * pulse)); ctx.fillStyle = c; ctx.fillRect(x - w, y - H, w * 2, H); };
    col(16, 'rgba(90,160,255,0.18)'); col(10, 'rgba(150,210,255,0.4)'); col(5, 'rgba(220,240,255,0.85)'); col(2, '#ffffff'); // 빛의 탑
    for (let i = 0; i < 4; i++) { const yy = y - ((i * 0.27 + lt * 0.9) % 1) * H, rr = 14 + 6 * Math.sin(lt * 3 + i); // 탑을 타고 오르는 고리
      ctx.strokeStyle = `rgba(200,235,255,${0.7 * k})`; ctx.beginPath(); ctx.ellipse(x, Math.round(yy), rr, rr * 0.35, 0, 0, TAU); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 2, y - 30, 4, 28); ctx.fillStyle = '#e8f4ff'; ctx.fillRect(x - 1, y - 30, 2, 26); // 바닥에 꽂힌 창 자루
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 3, y - 31, 6, 2); ctx.fillStyle = '#7ac8ff'; ctx.fillRect(x - 1, y - 35, 2, 4);
    ctx.restore();
  }
}
// 보스판 롱고미니아드: 같은 모양, 대상은 플레이어. 날아가는 동안 착탄 지점 예고 → 끌어당김·지속 피해·나선 탄막 → 붕괴 폭발
class BossRhongoTower extends RhongoTower {
  constructor(boss, tx, ty, P) {
    super({ x: boss.x, y: boss.y + 6, mods: {} }, tx, ty, P); this.boss = boss; this.FLY = 0.75; this.end = this.FLY + P.duration; this.a = 0; this.timer = 0;
  }
  update(dt, world) {
    const P = this.T, e = this.boss, fx = world.effects; this.t += dt;
    if (!e.alive) { this.alive = false; return; }
    const hitIn = (r, dmg) => world.eachTarget((q) => { if (Math.hypot(q.x - this.x, q.y - this.y) < r + q.half) world.damagePlayer(dmg); }); // 멀티: 범위 안의 모두
    if (this.t < this.FLY) return;
    if (!this.landed) { this.landed = true; this.next = P.tick;
      hitIn(P.impact, Math.round(e.damage * 2.5));
      fx.skyBeam(this.x, this.y, '#ffffff', 0, 18); fx.rays(this.x, this.y, P.color, 20, 120, 0.8); fx.ring(this.x, this.y, P.radius, P.color);
      world.addShake(0.45, 7); world.screenFlash = 0.25; world.flashColor = '210,235,255'; SFX.play('excal'); }
    if (this.t >= this.end) { this.alive = false; // 붕괴: 반경 안이면 치명적
      hitIn(P.radius, Math.round(e.damage * 3.5));
      for (let i = 0; i < 36; i++) world.enemyShoot(this.x, this.y, i * TAU / 36, e.def.bulletSpeed, e.damage, P.color, 4);
      fx.rays(this.x, this.y, '#ffffff', 24, P.radius * 2, 0.9); fx.ring(this.x, this.y, P.radius, '#ffffff'); fx.ring(this.x, this.y, P.radius * 1.3, P.color);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; fx.skyBeam(this.x + Math.cos(a) * P.radius * 0.6, this.y + Math.sin(a) * P.radius * 0.4, '#ffffff', i * 0.03, 6); }
      world.addShake(0.6, 9); world.screenFlash = 0.35; world.flashColor = '220,240,255'; SFX.play('explode'); return; }
    world.eachTarget((q) => { if (q.state === 'DASH') return; const dx = this.x - q.x, dy = this.y - q.y, d = Math.hypot(dx, dy); if (d > 6 && d < P.radius * 1.8) moveAndCollide(q, dx / d * P.pull * dt, dy / d * P.pull * dt, world.map); });
    this.next -= dt; if (this.next <= 0) { this.next += P.tick; hitIn(P.radius * 0.45, Math.round(e.damage * 0.6)); }
    this.timer -= dt; this.a += P.spin * dt;
    while (this.timer <= 0) { for (let i = 0; i < P.arms; i++) world.enemyShoot(this.x, this.y, this.a + i * TAU / P.arms, e.def.bulletSpeed * 0.7, e.damage, P.color, 3); this.timer += P.interval; }
    if (Math.random() < 0.9) { const a = Math.random() * TAU, d = P.radius * (0.7 + Math.random() * 0.4);
      fx.part(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d * 0.6, -Math.cos(a) * d * 1.6, -Math.sin(a) * d, { color: P.color, life: 0.5, size: 1.5, size2: 0, drag: 0, add: true }); }
  }
  render(ctx) {
    if (!this.landed) { // 착탄 예고: 좁혀 드는 붉은 원 + 붕괴 범위
      const k = this.t / this.FLY; ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, 0.6);
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.arc(0, 0, this.T.impact, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.T.impact * (1.6 - 0.6 * k), 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(0, 0, this.T.radius, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore(); ctx.lineWidth = 1; return;
    }
    super.render(ctx);
    const left = this.end - this.t; if (left < 1.2) { ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, 0.6); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(this.t * 30); ctx.strokeStyle = '#ff4a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.T.radius, 0, TAU); ctx.stroke(); ctx.restore(); ctx.lineWidth = 1; } // 붕괴 직전 경고
  }
}
// 게이볼그: 대상을 끝까지 쫓아가는 붉은 창 (벽 무시, 빗나가지 않음). 대상이 없으면 조준 방향으로 날아가 끝에서 터짐
class GaeBolgThrow {
  constructor(owner, tgt, T, aim) {
    this.owner = owner; this.tgt = tgt; this.T = T; this.x = owner.x; this.y = owner.y - 6; this.alive = true; this.t = 0; this.trail = [];
    const a = Math.atan2(aim.y - this.y, aim.x - this.x); this.ang = a; this.free = { x: this.x + Math.cos(a) * 260, y: this.y + Math.sin(a) * 260 };
    this.vx = Math.cos(a) * 200; this.vy = Math.sin(a) * 200 - 120; // 살짝 위로 던졌다가 휘어 꽂힘
  }
  update(dt, world) {
    this.t += dt; const tg = this.tgt && this.tgt.alive ? this.tgt : null, tx = tg ? tg.x : this.free.x, ty = tg ? tg.y : this.free.y;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, sp = 420 + this.t * 900, k = Math.min(1, dt * (6 + this.t * 20));
    this.vx += (dx / d * sp - this.vx) * k; this.vy += (dy / d * sp - this.vy) * k; this.ang = Math.atan2(this.vy, this.vx);
    this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 10) this.trail.shift();
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.random() < 0.8) world.effects.part(this.x, this.y, 0, 0, { color: '#ff4a5a', life: 0.3, size: 2, size2: 0, drag: 1, add: true });
    if (d < 10 || this.t > 1.6) { this.alive = false; world.gaeBolgHit(this.owner, tg ? tg.x : this.x, tg ? tg.y : this.y, tg, this.T); }
  }
  render() {}
  renderTop(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    this.trail.forEach((p, i) => { ctx.fillStyle = `rgba(255,70,90,${i / this.trail.length * 0.5})`; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); });
    ctx.globalCompositeOperation = 'source-over'; ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.rotate(this.ang);
    ctx.fillStyle = OUTLINE; ctx.fillRect(-16, -2, 24, 4); ctx.fillStyle = '#8a1a2a'; ctx.fillRect(-15, -1, 20, 2);              // 붉은 창대
    ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.moveTo(5, -4); ctx.lineTo(13, 0); ctx.lineTo(5, 4); ctx.fill();           // 창날
    ctx.fillStyle = '#ffb0b8'; ctx.fillRect(1, -3, 2, 1); ctx.fillRect(1, 2, 2, 1); ctx.fillRect(-4, -3, 2, 1); ctx.fillRect(-4, 2, 2, 1); // 거꾸로 난 가시
    ctx.restore();
  }
}
// 게이볼그 가시 폭발: 꿰뚫린 자리에서 사방으로 뻗는 붉은 가시
class ThornBurst {
  constructor(x, y, T) { this.x = x; this.y = y; this.T = T; this.t = 0; this.life = 0.55; this.alive = true; this.spikes = Array.from({ length: 24 }, (_, i) => ({ a: i / 24 * TAU + Math.random() * 0.2, l: T.thornR * (0.6 + Math.random() * 0.4) })); }
  update(dt) { this.t += dt; if (this.t >= this.life) this.alive = false; }
  render(ctx) {
    const g = Math.min(1, this.t / 0.12), k = Math.min(1, (this.life - this.t) / 0.25);
    ctx.save(); ctx.globalAlpha = k;
    for (const s of this.spikes) { const L = s.l * g, ex = this.x + Math.cos(s.a) * L, ey = this.y + Math.sin(s.a) * L * 0.7, nx = -Math.sin(s.a) * 2, ny = Math.cos(s.a) * 2;
      ctx.fillStyle = '#5a0a14'; ctx.beginPath(); ctx.moveTo(this.x + nx, this.y + ny); ctx.lineTo(ex, ey); ctx.lineTo(this.x - nx, this.y - ny); ctx.fill();
      ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.moveTo(this.x + nx * 0.4, this.y + ny * 0.4); ctx.lineTo(ex, ey); ctx.lineTo(this.x - nx * 0.4, this.y - ny * 0.4); ctx.fill(); }
    ctx.restore();
  }
}
// 출혈: 맞은 적들에게 일정 시간 지속 피해
class BleedTicker {
  constructor(list, T, hpScale) { this.list = list; this.T = T; this.left = T.bleed; this.next = 0.5; this.dmg = T.bleedDps * 0.5 * hpScale; this.alive = true; this.x = 0; this.y = 0; }
  update(dt, world) {
    this.left -= dt; this.next -= dt; if (this.left <= 0) { this.alive = false; return; }
    for (const e of this.list) if (e.alive && Math.random() < 0.3) world.effects.part(e.x + randInt(-4, 4), e.y - 2, 0, 20, { color: '#c0202a', life: 0.4, size: 1.5, size2: 0, drag: 1 });
    if (this.next <= 0) { this.next += 0.5; for (const e of this.list) if (e.alive) world.dotDamage(e, this.dmg, '#ff4a5a'); }
  }
  render() {}
}
class Trap {
  constructor(x, y, def, mods) { this.x = x; this.y = y; this.def = def; this.D = def.trap; this.getMods = mods; this.t = 0; this.alive = true; this.snapT = -1; }
  update(dt, world) {
    this.t += dt;
    if (this.snapT >= 0) { this.snapT += dt; if (this.snapT > 0.4) this.alive = false; return; }
    if (this.t >= this.D.life) { this.alive = false; return; }
    if (this.t < 0.25) return; // 놓자마자는 무장 안 됨
    const hit = world.enemies.find((e) => e.targetable && !e.def.float && Math.hypot(e.x - this.x, e.y - this.y) < this.D.radius + e.radius);
    if (!hit) return;
    this.snapT = 0; const mods = this.getMods(), src = { damage: this.def.damage, mods, knockback: 0, status: this.def.status || null, chain: this.D.chain || null };
    world.damageEnemy(hit, src, 0, 0);
    for (const e of world.enemies) if (e.targetable && Math.hypot(e.x - this.x, e.y - this.y) < this.D.radius + e.radius) { if (e !== hit) world.damageEnemy(e, Object.assign({}, src, { chain: null, damage: src.damage * 0.5 }), 0, 0); if (e.alive) world.trapRoot(e, e.def.boss ? this.D.root * 0.5 : this.D.root); }
    world.effects.ring(this.x, this.y, this.D.radius + 6, this.D.chain ? '#fff27a' : '#ffffff'); world.effects.burst(this.x, this.y, this.D.chain ? '#fff27a' : '#c8c8d0', 10); world.addShake(0.08, 2); SFX.play(this.D.chain ? 'react' : 'heavy', 0.05);
  }
  render(ctx) { // 톱니 달린 덫 (물면 닫힘). 번개 덫은 금속 상자 + 코일
    const x = Math.round(this.x), y = Math.round(this.y), closed = this.snapT >= 0, blink = this.D.life - this.t < 3 && Math.floor(this.t * 6) % 2 === 0;
    if (blink) return;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 2, this.D.radius * 0.7, 3, 0, 0, TAU); ctx.fill();
    if (this.D.chain) { ctx.fillStyle = OUTLINE; ctx.fillRect(x - 6, y - 4, 12, 8); ctx.fillStyle = '#4a5a8a'; ctx.fillRect(x - 5, y - 3, 10, 6); ctx.fillStyle = '#fff27a'; ctx.fillRect(x - 1, y - 7, 2, 3); if (Math.floor(this.t * 8) % 3 === 0) { ctx.fillRect(x - 4, y - 8, 1, 2); ctx.fillRect(x + 3, y - 9, 1, 2); }
      ctx.strokeStyle = 'rgba(255,242,122,0.35)'; ctx.beginPath(); ctx.arc(x, y, this.D.radius, 0, TAU); ctx.stroke(); return; }
    const w = closed ? 3 : 7;
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 8, y - w - 1, 16, w * 2 + 2); ctx.fillStyle = '#6a6a74'; ctx.fillRect(x - 7, y - 1, 14, 2); // 받침
    ctx.fillStyle = '#a8a8b4'; ctx.fillRect(x - 7, y - w, 14, 1); ctx.fillRect(x - 7, y + w - 1, 14, 1); // 양쪽 턱
    for (let i = -6; i <= 6; i += 3) { ctx.fillRect(x + i, y - w + 1, 1, 2); ctx.fillRect(x + i, y + w - 3, 1, 2); } // 톱니
    ctx.fillStyle = this.def.status && this.def.status.type === 'freeze' ? '#bfefff' : '#c8a050'; ctx.fillRect(x - 1, y - 1, 2, 2); // 발판 (서리 덫은 얼음빛)
    if (this.def.status && this.def.status.type === 'freeze') { ctx.strokeStyle = 'rgba(191,239,255,0.4)'; ctx.beginPath(); ctx.arc(x, y, this.D.radius, 0, TAU); ctx.stroke(); }
  }
}
