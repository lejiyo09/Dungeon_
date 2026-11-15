'use strict';
// ════════════════════════════════════════════
// 투사체
// ════════════════════════════════════════════
class Projectile {
  constructor(o) {
    Object.assign(this, o);
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
    for (const e of world.enemies) {
      if (!e.targetable || this.hitTargets.has(e.id)) continue;
      const t = segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + this.radius);
      if (t >= 0 && t <= limitT) hits.push({ e, t });
    }
    hits.sort((a, b) => a.t - b.t);
    for (const { e, t } of hits) {
      if (this.explodeRadius && !this.mine) {
        this.x = sx + (ex - sx) * t; this.y = sy + (ey - sy) * t; this.detonate(world); return;
      }
      this.hitTargets.add(e.id);
      world.damageEnemy(e, this, this.dx, this.dy);
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
    if (!this.split) return;
    const S = this.split, a0 = Math.random() * TAU;
    for (let i = 0; i < S.count; i++) {
      const a = a0 + i * TAU / S.count;
      world.projectiles.push(new Projectile({ x: this.x, y: this.y, dx: Math.cos(a), dy: Math.sin(a), speed: S.speed, range: S.range,
        damage: S.damage, pierce: 0, knockback: 1, mods: this.mods, color: this.color, size: 1, explodeRadius: S.explode || 0 }));
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
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0) { this.alive = false; return; }
    if (world.map.isSolidAt(this.x, this.y)) { world.hitTile(this.x, this.y); this.alive = false; world.effects.impact(this.x, this.y, this.color); return; }
    const p = world.player;
    if (p.state !== 'DEAD' && Math.abs(p.x - this.x) < p.half + this.r - 1 && Math.abs(p.y - this.y) < p.half + this.r - 1) {
      if (world.damagePlayer(this.damage)) { this.alive = false; world.effects.spark(this.x, this.y, '#fff'); }
    }
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
class Hazard {
  constructor(x, y, o) { Object.assign(this, o); this.x = x; this.y = y; this.t = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt;
    if (this.t < this.delay) return;
    this.alive = false;
    const p = world.player;
    if (p.state !== 'DEAD' && Math.hypot(p.x - this.x, p.y - this.y) < this.r + p.half) world.damagePlayer(this.damage);
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
  constructor(x, y, owner) { this.x = x; this.y = y; this.owner = owner; this.life = 12; this.cd = 0.3; this.ang = 0; this.alive = true; }
  update(dt, world) {
    this.life -= dt; this.cd -= dt;
    if (this.life <= 0) { this.alive = false; world.effects.burst(this.x, this.y, '#aaa', 6); return; }
    let best = null, bestD = 220;
    for (const e of world.enemies) {
      if (!e.targetable) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestD && hasLineOfSight(this, e, world.map)) { best = e; bestD = d; }
    }
    if (!best) return;
    this.ang = Math.atan2(best.y - this.y, best.x - this.x);
    if (this.cd <= 0) {
      this.cd = 0.2;
      world.projectiles.push(new Projectile({ x: this.x, y: this.y - 3, dx: Math.cos(this.ang), dy: Math.sin(this.ang),
        speed: 380, range: 260, damage: 8, pierce: 0, knockback: 1, mods: this.owner.mods, color: '#ffe36b', size: 1 }));
    }
  }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.life < 2 && Math.floor(this.life * 10) % 2 === 0) return;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 6, y + 4, 12, 2);
    ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x - 6, y - 2, 12, 7);
    ctx.fillStyle = '#c08a30'; ctx.fillRect(x - 4, y - 6, 8, 5);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + Math.cos(this.ang) * 9, y - 3 + Math.sin(this.ang) * 9); ctx.stroke();
    ctx.lineWidth = 1;
  }
}
