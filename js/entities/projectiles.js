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
        this.x = sx + (ex - sx) * t; this.y = sy + (ey - sy) * t; this.detonate(world); return;
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
  constructor(x, y, owner, o = {}) { this.x = x; this.y = y; this.owner = owner; this.life = o.life || 12; this.dmg = o.damage || 8; this.rate = o.rate || 0.2; this.range = o.range || 220; this.cd = 0.3; this.ang = 0; this.alive = true; }
  update(dt, world) {
    this.life -= dt; this.cd -= dt;
    if (this.life <= 0) { this.alive = false; world.effects.burst(this.x, this.y, '#aaa', 6); return; }
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
        speed: 380, range: this.range + 40, damage: this.dmg, pierce: 0, knockback: 1, mods: this.owner.mods, color: '#ffe36b', size: 1 }));
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
  constructor(owner, def, idx) { this.owner = owner; this.def = def; this.idx = idx; this.x = owner.x; this.y = owner.y - 16; this.life = def.summon.life; this.cd = 0.3; this.ang = 0; this.t = 0; this.alive = true; }
  update(dt, world) {
    this.t += dt; this.life -= dt; this.cd -= dt;
    if (this.life <= 0 || this.owner.state === 'DEAD') { this.alive = false; world.effects.burst(this.x, this.y, '#aabbcc', 6); return; }
    const a = this.t * 1.6 + this.idx * Math.PI, tx = this.owner.x + Math.cos(a) * 22, ty = this.owner.y - 14 + Math.sin(a) * 10;
    const k = 1 - Math.exp(-8 * dt); this.x += (tx - this.x) * k; this.y += (ty - this.y) * k;
    let best = null, bd = this.def.range;
    for (const e of world.enemies) { if (!e.targetable) continue; const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < bd && hasLineOfSight(this, e, world.map)) { bd = d; best = e; } }
    if (!best) return;
    this.ang = Math.atan2(best.y - this.y, best.x - this.x);
    if (this.cd <= 0) {
      this.cd = this.def.summon.rate;
      world.projectiles.push(new Projectile({ x: this.x, y: this.y, dx: Math.cos(this.ang), dy: Math.sin(this.ang), speed: this.def.projectileSpeed, range: this.def.range,
        damage: this.def.damage, pierce: 0, knockback: 1, mods: this.owner.mods, color: this.def.bulletColor, size: 1 }));
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
