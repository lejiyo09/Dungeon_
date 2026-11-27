'use strict';
// ═══════════════════════════════════════════════════════════════
// 드루이드 야수 계열: 자연의 동맹
// 소환 편성 · 개별 유대 · 고유 연계 · 조합 연계 · 진화 슬롯
// 가시 / 변신 계열 및 다른 직업에는 영향을 주지 않는다.
// ═══════════════════════════════════════════════════════════════
(function () {
  const DRUID = 'hero_druid';
  const BASE = 'base';
  const MAX_SPIRITS = 5;
  const COLORS = {
    wolf: '#9ad8ff', bear: '#c8a070', stag: '#9affb0',
    hawk: '#70d8ff', snake: '#8ddd55', fox: '#d8a0ff'
  };
  const SPIRITS = {
    wolf: { name: '월영', short: '늑', role: '공격', desc: '표식 · 공격 속도 +4%', bonus: '표식 대상에게 플레이어 피해 +6%', damage: 8, rate: 0.82, range: 220, speed: 174, stop: 10, color: '#9ad8ff', accent: '#fff4c0' },
    bear: { name: '거암', short: '곰', role: '수호', desc: '범위 공격 · 받는 피해 -3%', bonus: '받는 피해 3% 감소', damage: 16, rate: 1.42, range: 52, speed: 128, stop: 12, color: '#c8a070', accent: '#e8d0a0' },
    stag: { name: '비화', short: '사', role: '회복', desc: '회복 · 에너지 소비 -5%', bonus: '8초마다 최대 체력의 1% 회복', damage: 6, rate: 1.35, range: 245, speed: 142, stop: 82, color: '#9affb0', accent: '#fff4c0', ranged: true },
    hawk: { name: '청익', short: '매', role: '정밀', desc: '관통 공격 · 치명타 +2%', bonus: '치명타 확률 +2%', damage: 7, rate: 1.02, range: 280, speed: 158, stop: 100, color: '#70d8ff', accent: '#ffffff', ranged: true },
    snake: { name: '녹린', short: '뱀', role: '제어', desc: '중독 · 상태 이상 지속 +8%', bonus: '상태 이상 지속시간 +8%', damage: 6, rate: 1.22, range: 205, speed: 146, stop: 70, color: '#8ddd55', accent: '#d8ff9a', ranged: true },
    fox: { name: '은월', short: '여', role: '기동', desc: '기습 · 이동 속도 +3%', bonus: '이동 속도 +3% · 대시 회복 +4%', damage: 7, rate: 1.04, range: 220, speed: 196, stop: 10, color: '#d8a0ff', accent: '#fff4ff' }
  };
  const PAIRS = [
    { a: 'wolf', b: 'hawk', id: 'moonhunt', name: '월광 추적' },
    { a: 'bear', b: 'stag', id: 'lifecradle', name: '생명의 요람' },
    { a: 'snake', b: 'fox', id: 'venomgrove', name: '환영의 독림' }
  ];
  const isBeast = (p) => !!p && p.hero && p.hero.id === DRUID && p.line && p.line.id === BASE;
  const rankMax = (p) => Math.min(MAX_SPIRITS, 3 + Math.max(0, Math.min(2, p.rank || 0)));
  const bondMap = (p) => (p.druidBonds || (p.druidBonds = { wolf: 0, bear: 0, stag: 0, hawk: 0, snake: 0, fox: 0 }));
  const getMine = (world, p) => world.allies.filter((a) => a instanceof DruidSpirit && a.alive && a.owner === p);
  const activeSet = (world, p) => new Set(getMine(world, p).map((a) => a.kind));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const targetable = (e, world) => e && e.targetable && !(e.def && e.def.dummy && world.mode !== 'lobby');
  function findTarget(world, x, y, range) {
    let best = null, score = Infinity;
    for (const e of world.enemies) {
      if (!targetable(e, world)) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > range + e.radius) continue;
      const s = d * (e.def.boss ? 0.86 : 1);
      if (s < score) { score = s; best = e; }
    }
    return best;
  }
  function awardHit(world, owner, kind, amount) {
    const ally = world.allies.find((a) => a instanceof DruidSpirit && a.owner === owner && a.kind === kind && a.alive);
    if (ally) ally.gainBond(amount, world);
  }
  function hit(world, owner, enemy, baseDamage, color, options) {
    if (!targetable(enemy, world)) return false;
    const o = options || {};
    const d = Math.hypot(enemy.x - owner.x, enemy.y - owner.y) || 1;
    const src = {
      damage: world.skillDmg(baseDamage), mods: owner.mods,
      knockback: o.knockback == null ? 3 : o.knockback,
      from: owner, minion: true, druidOwner: owner,
      status: o.status || null
    };
    world.damageEnemy(enemy, src, (enemy.x - owner.x) / d, (enemy.y - owner.y) / d, { quiet: !!o.quiet });
    return true;
  }
  function aoe(world, owner, radius, baseDamage, color, options) {
    const o = options || {};
    let count = 0;
    for (const e of world.enemies) {
      if (!targetable(e, world) || Math.hypot(e.x - owner.x, e.y - owner.y) > radius + e.radius) continue;
      hit(world, owner, e, baseDamage, color, { knockback: o.knockback == null ? 4 : o.knockback, status: o.status || null, quiet: true });
      if (e.alive && o.stun) {
        if (e.def.boss || e.def.ccImmune) { e.slow = Math.max(e.slow || 0, o.bossSlow || 0.45); e.slowK = Math.min(e.slowK || 1, o.bossSlowK || 0.72); }
        else e.stunT = Math.max(e.stunT || 0, o.stun);
      }
      count++;
    }
    if (count) {
      world.effects.ring(owner.x, owner.y, radius, color);
      world.effects.ring(owner.x, owner.y, radius * 0.62, '#ffffff');
    }
    return count;
  }
  function priorityTargets(world, owner, range, count) {
    return world.enemies.filter((e) => targetable(e, world) && Math.hypot(e.x - owner.x, e.y - owner.y) <= range + e.radius)
      .sort((a, b) => (b.def.boss ? 1 : 0) - (a.def.boss ? 1 : 0) || b.hp - a.hp).slice(0, count);
  }
  function syncBuffs(world, p) {
    const kinds = activeSet(world, p), temporaryGuard = p.druidTempGuardUntil > world.time ? (p.druidTempGuard || 0) : 0;
    const temporaryMove = p.druidTempMoveUntil > world.time ? (p.druidTempMove || 0) : 0;
    p.druidBuffs = {
      fireRate: kinds.has('wolf') ? 0.04 : 0,
      guard: Math.max(kinds.has('bear') ? 0.03 : 0, temporaryGuard),
      energySave: kinds.has('stag') ? 0.05 : 0,
      critChance: kinds.has('hawk') ? 0.02 : 0,
      statusDuration: kinds.has('snake') ? 0.08 : 0,
      moveSpeed: (kinds.has('fox') ? 0.03 : 0) + temporaryMove,
      dashRecovery: kinds.has('fox') ? 0.04 : 0
    };
  }
  class DruidSpirit {
    constructor(owner, kind, life) {
      const C = SPIRITS[kind];
      this.owner = owner; this.kind = kind; this.x = owner.x + (Math.random() - 0.5) * 18;
      this.y = owner.y + 7 + (Math.random() - 0.5) * 10;
      this.life = Math.max(0.1, life); this.t = 0; this.attackCd = 0.4 + Math.random() * 0.25;
      this.supportCd = 8; this.gainWindow = -10; this.gainInWindow = 0;
      this.face = 1; this.alive = true; this.half = kind === 'bear' ? 9 : kind === 'stag' ? 7 : 5;
      this.stuckT = 0; this.lastX = this.x; this.lastY = this.y; this.flashT = 0;
      if (bondMap(owner)[kind] == null) bondMap(owner)[kind] = 0;
    }
    gainBond(amount, world) {
      if (this.owner.jobSkillFx === 'guardian') amount *= 1.25;
      const t = world.time;
      if (t - this.gainWindow >= 1) { this.gainWindow = t; this.gainInWindow = 0; }
      const allowed = Math.max(0, 10 - this.gainInWindow);
      const add = Math.min(allowed, amount);
      if (add <= 0) return;
      this.gainInWindow += add;
      const B = bondMap(this.owner), old = B[this.kind] || 0;
      B[this.kind] = Math.min(100, old + add);
      if (old < 100 && B[this.kind] >= 100) {
        world.effects.ring(this.owner.x, this.owner.y, 26, SPIRITS[this.kind].color);
        world.effects.text(this.owner.x, this.owner.y - 28, SPIRITS[this.kind].name + '와 완전한 유대!', SPIRITS[this.kind].color);
        SFX.play('magic', 0.08);
      }
    }
    update(dt, world) {
      const p = this.owner, C = SPIRITS[this.kind];
      this.t += dt; this.life -= dt; this.attackCd -= dt; this.supportCd -= dt; this.flashT = Math.max(0, this.flashT - dt);
      if (this.life <= 0 || p.state === 'DEAD') { this.alive = false; return; }
      if (this.kind === 'stag' && this.supportCd <= 0) {
        this.supportCd = 8;
        const heal = Math.max(1, Math.round(p.maxHp * 0.01));
        const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + heal);
        if (p.hp > before) { world.effects.heal(p.x, p.y); world.effects.text(p.x, p.y - 22, '+' + (p.hp - before), '#9affb0'); }
      }
      const target = findTarget(world, this.x, this.y, C.range);
      let tx, ty, stop;
      if (target) {
        tx = target.x; ty = target.y;
        stop = C.ranged ? C.stop : target.radius + (this.kind === 'bear' ? 12 : 7);
      } else {
        const a = this.t * 1.1 + Object.keys(SPIRITS).indexOf(this.kind) * 1.25;
        tx = p.x + Math.cos(a) * (18 + (Object.keys(SPIRITS).indexOf(this.kind) % 2) * 5);
        ty = p.y + 7 + Math.sin(a) * 10;
        stop = 4;
      }
      let dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
      if (target && C.ranged && d < C.stop * 0.45) { dx = -dx; dy = -dy; d = Math.hypot(dx, dy) || 1; tx = this.x + dx; ty = this.y + dy; }
      if (d > stop) {
        const speed = C.speed * (p.jobSkillFx === 'guardian' ? 1.08 : 1);
        moveAndCollide(this, dx / d * Math.min(speed * dt, d - stop), dy / d * Math.min(speed * dt, d - stop), world.map);
      }
      if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1;
      if (Math.hypot(this.x - p.x, this.y - p.y) > 310) { this.x = p.x + randInt(-12, 12); this.y = p.y + 8; }
      if (Math.hypot(this.x - this.lastX, this.y - this.lastY) < 0.4 && target) this.stuckT += dt; else this.stuckT = 0;
      this.lastX = this.x; this.lastY = this.y;
      if (this.stuckT > 2.2 && target) { this.x = p.x + randInt(-16, 16); this.y = p.y + 6; this.stuckT = 0; }
      if (!target || this.attackCd > 0 || target.negateT > 0) return;
      const td = Math.hypot(target.x - this.x, target.y - this.y);
      if (td > C.range + target.radius) return;
      this.attackCd = C.rate; this.flashT = 0.16;
      const source = {
        damage: world.skillDmg(C.damage), mods: p.mods, knockback: this.kind === 'bear' ? 5 : 2,
        from: p, minion: true, druidOwner: p
      };
      if (this.kind === 'snake') source.status = { type: 'poison', chance: 1, duration: 3, dps: world.skillDmg(3) };
      const wasAlive = target.alive;
      world.damageEnemy(target, source, (target.x - this.x) / (td || 1), (target.y - this.y) / (td || 1), { quiet: true });
      if (wasAlive && target.alive !== false) this.gainBond(3, world);
      if (wasAlive && !target.alive) this.gainBond(5, world);
      if (this.kind === 'wolf') {
        target.druidMarkUntil = world.time + 3.2; target.druidMarkOwner = p;
        world.effects.ring(target.x, target.y, target.radius + 7, '#9ad8ff');
      } else if (this.kind === 'bear') {
        world.effects.ring(target.x, target.y, 20, '#c8a070');
        if (target.alive && !target.def.boss && !target.def.ccImmune) target.stunT = Math.max(target.stunT || 0, 0.15);
      } else if (this.kind === 'hawk') world.effects.beamline(this.x, this.y - 7, target.x, target.y, 1.5, '#70d8ff');
      else if (this.kind === 'snake') world.effects.part(target.x, target.y - 3, randInt(-10, 10), -18, { color: '#8ddd55', life: 0.45, size: 2, size2: 0, drag: 2 });
      else if (this.kind === 'fox') world.effects.slash(this.x, this.y, Math.atan2(target.y - this.y, target.x - this.x), 12, 1, '#d8a0ff');
      else world.effects.slash(this.x, this.y, Math.atan2(target.y - this.y, target.x - this.x), 12, 1, '#9ad8ff');
    }
    render(ctx) {
      const C = SPIRITS[this.kind], x = Math.round(this.x), y = Math.round(this.y + Math.sin(this.t * 5) * 1.2);
      const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
      const O = '#14101c', base = this.flashT > 0 ? '#ffffff' : C.color;
      ctx.save();
      ctx.globalAlpha = this.life < 1.5 && Math.floor(this.life * 10) % 2 === 0 ? 0.35 : 0.96;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x - 8, y + 8, 16, 3);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.16; ctx.fillStyle = C.color;
      ctx.beginPath(); ctx.ellipse(x, y - 2, this.kind === 'bear' ? 15 : 11, 7, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = this.life < 1.5 && Math.floor(this.life * 10) % 2 === 0 ? 0.35 : 0.96;
      if (this.kind === 'wolf') {
        R(-7, -3, 13, 8, O); R(-6, -2, 11, 6, base); R(3, -7, 7, 6, O); R(4, -6, 5, 4, '#dff6ff');
        R(4, -10, 2, 4, O); R(8, -9, 2, 3, O); R(6, -4, 1, 1, '#1b2030');
        R(-10, -1, 4, 3, O); R(-11, -4, 3, 4, base); R(-4, 5, 3, 4, O); R(3, 5, 3, 4, O);
      } else if (this.kind === 'bear') {
        R(-9, -6, 18, 15, O); R(-8, -5, 16, 13, base); R(-7, -11, 14, 8, O); R(-6, -10, 12, 7, '#e8d0a0');
        R(-8, -13, 4, 4, O); R(4, -13, 4, 4, O); R(-4, -7, 2, 2, O); R(3, -7, 2, 2, O);
        R(-10, 4, 5, 5, O); R(5, 4, 5, 5, O); R(-2, -2, 4, 3, '#9a7050');
      } else if (this.kind === 'stag') {
        R(-6, -2, 12, 8, O); R(-5, -1, 10, 6, base); R(3, -8, 6, 7, O); R(4, -7, 4, 5, '#eaffec');
        R(4, -12, 1, 6, C.accent); R(2, -13, 1, 3, C.accent); R(6, -14, 1, 4, C.accent);
        R(-3, 5, 2, 4, O); R(4, 5, 2, 4, O); R(-8, -2, 3, 3, C.accent);
      } else if (this.kind === 'hawk') {
        const flap = Math.round(Math.sin(this.t * 12) * 3);
        R(-4, -2, 9, 7, O); R(-3, -1, 7, 5, base); R(3, -5, 5, 5, O); R(4, -4, 3, 3, '#e8f8ff');
        R(-9, -4 - flap, 7, 3, O); R(-8, -3 - flap, 6, 2, base); R(4, -4 + flap, 7, 3, O); R(5, -3 + flap, 6, 2, base);
        R(7, -2, 3, 2, C.accent); R(6, 1, 2, 1, '#182338');
      } else if (this.kind === 'snake') {
        R(-9, 2, 7, 4, O); R(-7, 0, 7, 4, base); R(-2, -2, 7, 5, O); R(0, -1, 7, 3, base);
        R(4, -5, 7, 6, O); R(5, -4, 5, 4, base); R(8, -3, 1, 1, '#1a2412');
        R(2, 4, 7, 2, C.accent);
      } else {
        R(-7, -2, 13, 8, O); R(-6, -1, 11, 6, base); R(3, -7, 7, 7, O); R(4, -6, 5, 5, '#f4e8ff');
        R(4, -11, 3, 5, O); R(8, -10, 3, 4, O); R(6, -4, 1, 1, '#20162a');
        R(-9, 0, 4, 3, O); R(-11, -2, 4, 3, base); R(-4, 5, 2, 4, O); R(3, 5, 2, 4, O);
      }
      ctx.globalAlpha = 0.9; ctx.fillStyle = C.accent; ctx.fillRect(x + (this.face > 0 ? 4 : -5), y - 3, 1, 1);
      ctx.restore();
    }
  }

  if (typeof COOP_CLASSES !== 'undefined') COOP_CLASSES.DruidSpirit = DruidSpirit;

  function drawHit(world, p, e, damage, color, options) {
    if (!e || !e.alive) return;
    const o = options || {}, dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    const src = { damage: world.skillDmg(damage), mods: p.mods, knockback: o.knockback || 3, from: p, minion: true, druidOwner: p, status: o.status || null };
    world.damageEnemy(e, src, dx / d, dy / d, { quiet: true });
  }
  function mark(world, p, e, duration, vulnerability) {
    if (!e) return;
    e.druidMarkUntil = world.time + duration; e.druidMarkOwner = p;
    if (vulnerability) { e.druidMarkBonus = 1 + vulnerability; }
    world.effects.ring(e.x, e.y, e.radius + 10, '#9ad8ff');
    world.effects.text(e.x, e.y - e.radius - 12, '사냥 표식', '#9ad8ff');
  }
  function doIndividual(world, p, kind) {
    const C = SPIRITS[kind], targets = priorityTargets(world, p, 420, 3), first = targets[0];
    if (kind === 'wolf') {
      if (!first) return;
      for (let i = 0; i < 3; i++) drawHit(world, p, first, 13, C.color);
      mark(world, p, first, 4.5, 0.10); world.effects.beamline(p.x, p.y, first.x, first.y, 3, C.color);
    } else if (kind === 'bear') {
      aoe(world, p, 82, 42, C.color, { knockback: 8, stun: 0.65, bossSlow: 0.5, bossSlowK: 0.68 });
      p.shield = Math.min(p.maxShield, p.shield + Math.round(p.maxShield * 0.08));
      world.effects.rays(p.x, p.y, C.color, 14, 88, 0.6); world.addShake(0.16, 3);
    } else if (kind === 'stag') {
      const hp = Math.round(p.maxHp * 0.07), sh = Math.round(p.maxShield * 0.05);
      p.hp = Math.min(p.maxHp, p.hp + hp); p.shield = Math.min(p.maxShield, p.shield + sh); p.energy = Math.min(p.maxEnergy, p.energy + 22);
      world.effects.heal(p.x, p.y); world.effects.ring(p.x, p.y, 54, C.color);
      world.effects.text(p.x, p.y - 25, '생명의 축복', C.color);
    } else if (kind === 'hawk') {
      for (const e of targets) {
        drawHit(world, p, e, 13, C.color); drawHit(world, p, e, 13, C.color);
        world.effects.beamline(p.x, p.y - 18, e.x, e.y, 1.5, C.color);
      }
    } else if (kind === 'snake') {
      aoe(world, p, 86, 25, C.color, { knockback: 1, status: { type: 'poison', chance: 1, duration: 5, dps: world.skillDmg(4) }, stun: 0.7, bossSlow: 1.2, bossSlowK: 0.78 });
      world.effects.rays(p.x, p.y, C.color, 18, 86, 0.6);
    } else if (kind === 'fox') {
      for (const e of targets) { drawHit(world, p, e, 20, C.color); world.effects.slash(e.x, e.y, Math.atan2(e.y - p.y, e.x - p.x), 24, 1.5, C.color); }
      p.druidTempMove = 0.15; p.druidTempMoveUntil = world.time + 4;
      p.dashCooldown = Math.max(0, p.dashCooldown - p.dashCdMax * 0.35);
      world.effects.ring(p.x, p.y, 36, C.color);
    }
    world.effects.text(p.x, p.y - 28, C.name + ' · 유대 발현', C.color);
  }
  function doPair(world, p, pair) {
    if (pair.id === 'moonhunt') {
      const e = priorityTargets(world, p, 500, 1)[0]; if (!e) return;
      for (let i = 0; i < 4; i++) drawHit(world, p, e, 14, '#9ad8ff');
      mark(world, p, e, 5.5, 0.12);
      world.effects.beamline(p.x, p.y, e.x, e.y, 5, '#9ad8ff');
      world.effects.rays(e.x, e.y, '#70d8ff', 10, 34, 0.45);
    } else if (pair.id === 'lifecradle') {
      aoe(world, p, 90, 36, '#9affb0', { knockback: 6, stun: 0.6, bossSlow: 0.45, bossSlowK: 0.75 });
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.10));
      p.shield = Math.min(p.maxShield, p.shield + Math.round(p.maxShield * 0.12));
      p.druidTempGuard = 0.10; p.druidTempGuardUntil = world.time + 5;
      world.effects.heal(p.x, p.y); world.effects.rays(p.x, p.y, '#9affb0', 16, 95, 0.7);
    } else {
      aoe(world, p, 94, 27, '#8ddd55', { knockback: 1, status: { type: 'poison', chance: 1, duration: 5, dps: world.skillDmg(4.5) }, stun: 0.8, bossSlow: 1.1, bossSlowK: 0.78 });
      p.druidTempMove = 0.12; p.druidTempMoveUntil = world.time + 4;
      world.effects.ring(p.x, p.y, 94, '#d8a0ff'); world.effects.rays(p.x, p.y, '#8ddd55', 16, 92, 0.65);
    }
    world.effects.text(p.x, p.y - 30, pair.name + '!', '#c8ffb0');
    SFX.play('magic', 0.08);
  }
  function doAncientPulse(world, p) {
    aoe(world, p, 108, 48, '#9affb0', { knockback: 8, stun: 0.8, bossSlow: 1.3, bossSlowK: 0.72 });
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.05));
    world.effects.heal(p.x, p.y); world.effects.rays(p.x, p.y, '#9affb0', 24, 116, 0.9);
    world.effects.ring(p.x, p.y, 108, '#ffffff'); world.addShake(0.25, 5);
    world.effects.text(p.x, p.y - 38, '태고의 파동', '#9affb0', true);
  }

  Game.prototype.necroGSkill = (function (original) {
    return function (p) {
      if (isBeast(p)) return { id: 'druid_bond', name: (p.rank || 0) >= 2 ? '대자연의 합일' : (p.rank || 0) >= 1 ? '정령의 합주' : '유대 명령', cd: [16, 15, 14][Math.min(2, p.rank || 0)] };
      return original ? original.call(this, p) : null;
    };
  })(Game.prototype.necroGSkill);
  Game.prototype.necroHudParts = (function (original) {
    return function (p) {
      if (isBeast(p)) {
        const roster = p.natureRoster || [], B = bondMap(p), ready = roster.filter((k) => (B[k] || 0) >= 100).length;
        const active = this.coop && this.coop.guest
          ? (p.druidBuffs && Object.values(p.druidBuffs).some((v) => Number(v) > 0) ? roster.length : 0)
          : getMine(this, p).length;
        return { text: '동료 ' + active + '/' + roster.length + ' · 완전한 유대 ' + ready + '/' + roster.length, color: '#9affb0' };
      }
      return original ? original.call(this, p) : null;
    };
  })(Game.prototype.necroHudParts);

  Game.prototype.druidOpenSelection = function (p) {
    if (!isBeast(p)) return false;
    const current = Array.isArray(p.natureRoster) ? p.natureRoster.slice() : [];
    const goal = rankMax(p);
    if (current.length >= goal) return false;
    const remote = this.coop && this.coop.host && this.remotes
      ? [...this.remotes.values()].find((R) => R.p === p) : null;
    const remoteContext = !!(remote && remote.overlay);
    const previousOverlay = this.overlay;
    this.overlay = { type: 'druid_select', goal: goal, selected: current.slice(), locked: current.slice(), msg: null };
    this.input.mouse.down = false;
    // 원격 참가자의 최초 F키는 전역(방장) 창을 점유하지 않고 참가자 전용 창으로 전달한다.
    // 진화 창에서 선택을 처리 중이면 coopRemoteOverlay가 새 창을 보존·전송하므로 여기서는 건드리지 않는다.
    if (remote && !remoteContext) {
      remote.overlay = this.overlay;
      this.overlay = previousOverlay;
      this.coopSendOverlay(remote);
    }
    return true;
  };
  Game.prototype.druidSummon = function (p, freeRefresh) {
    if (!isBeast(p) || !Array.isArray(p.natureRoster) || !p.natureRoster.length) return false;
    const duration = [18, 21, 24][Math.min(2, p.rank || 0)] * (p.jobSkillFx === 'guardian' ? 1.2 : 1);
    p.druidSummonUntil = this.time + duration;
    for (const kind of p.natureRoster) {
      let ally = this.allies.find((a) => a instanceof DruidSpirit && a.owner === p && a.kind === kind && a.alive);
      if (ally) ally.life = duration;
      else {
        ally = new DruidSpirit(p, kind, duration);
        this.allies.push(ally);
        const C = SPIRITS[kind];
        this.effects.sparkle(ally.x, ally.y - 6, C.color);
        this.effects.ring(ally.x, ally.y, 12, C.color);
        bondMap(p)[kind] = Math.min(100, (bondMap(p)[kind] || 0) + ([10, 12, 15][Math.min(2, p.rank || 0)]));
      }
    }
    this.effects.rays(p.x, p.y - 3, '#9affb0', 12 + p.rank * 3, 52 + p.rank * 8, 0.6);
    this.effects.ring(p.x, p.y, 32 + p.rank * 7, '#9affb0');
    if (!freeRefresh) this.effects.text(p.x, p.y - 24, '자연의 동맹!', '#9affb0', true);
    this.druidSyncBuffs(p);
    return true;
  };
  Game.prototype.druidSyncBuffs = function (p) { if (isBeast(p)) syncBuffs(this, p); };
  Game.prototype.druidTick = function (dt) {
    const players = this.allPlayers ? this.allPlayers() : [this.player];
    const seen = new Set();
    for (const p of players) {
      if (!p || seen.has(p) || !isBeast(p)) continue;
      seen.add(p);
      if (p.state !== 'DEAD' && p.druidSummonUntil > this.time && Array.isArray(p.natureRoster)) {
        const remaining = p.druidSummonUntil - this.time;
        for (const kind of p.natureRoster) {
          if (!this.allies.some((a) => a instanceof DruidSpirit && a.owner === p && a.kind === kind && a.alive))
            this.allies.push(new DruidSpirit(p, kind, remaining));
        }
      }
      syncBuffs(this, p);
      // ratmaTick은 현재 플레이어의 graveCd만 줄이므로, 원격 드루이드의 G 재사용 대기시간은 여기서 별도 처리한다.
      if (p !== this.player && p.graveCd > 0) p.graveCd = Math.max(0, p.graveCd - dt);
    }
    // 방장과 참가자 모두 각자의 G 명령을 처리한다. 실제 피해 계산은 반드시 해당 소유자로 전환해 적용한다.
    for (const p of players) {
      const remote = p && this.remotes ? [...this.remotes.values()].find((R) => R.p === p) : null;
      const ownOverlay = p === this.player ? this.overlay : remote && remote.overlay;
      if (!p || !isBeast(p) || !(p.druidCommandAt > this.time - 0.25) || ownOverlay || p.state === 'DEAD') continue;
      p.druidCommandAt = -1;
      const invoke = () => {
        const g = this.necroGSkill(p), active = getMine(this, p), B = bondMap(p);
        const ready = active.filter((a) => (B[a.kind] || 0) >= 100);
        const say = (s) => this.effects.text(p.x, p.y - 24, s, '#9affb0');
        if (!this.zoneRight('job')) { say('직업의 권리를 빼앗겼다'); return; }
        if (!ready.length) { say('아직 완전한 유대에 도달한 동료가 없습니다'); return; }
        if ((p.graveCd || 0) > 0) { say('유대 명령 대기 ' + Math.ceil(p.graveCd) + '초'); return; }
        const used = new Set(), types = new Set(ready.map((a) => a.kind));
        for (const pair of PAIRS) {
          if (types.has(pair.a) && types.has(pair.b)) {
            doPair(this, p, pair); used.add(pair.a); used.add(pair.b);
          }
        }
        for (const ally of ready) if (!used.has(ally.kind)) doIndividual(this, p, ally.kind);
        if ((p.rank || 0) >= 2 && ready.length >= 3) doAncientPulse(this, p);
        for (const ally of ready) B[ally.kind] = 25;
        p.graveCd = g.cd;
        this.guildEvent('skills'); SFX.play('skill', 0.08);
        this.effects.text(p.x, p.y - 48, ready.length + '개의 유대가 공명한다', '#9affb0', true);
      };
      if (this.player === p || !this.withPlayer) invoke();
      else this.withPlayer(p, invoke);
    }
  };

  const baseUseSkill = Game.prototype.useSkill;
  Game.prototype.useSkill = function () {
    const p = this.player;
    if (!isBeast(p)) return baseUseSkill.call(this);
    if (p.castLock > 0 || p.skillCooldown > 0 || p.denyT > 0 || !this.zoneRight('job')) return baseUseSkill.call(this);
    if (!Array.isArray(p.natureRoster) || p.natureRoster.length < rankMax(p)) {
      this.druidOpenSelection(p); return;
    }
    const originalId = p.skillId, before = p.skillCooldown;
    p.skillId = 'druid_nature_call_internal';
    try { baseUseSkill.call(this); }
    finally { p.skillId = originalId; }
    if (p.skillCooldown > before) this.druidSummon(p, false);
  };

  const baseEvolve = Game.prototype.evolve;
  Game.prototype.evolve = function () {
    const p = this.player, before = p ? p.rank : -1;
    const r = baseEvolve.apply(this, arguments);
    if (p && isBeast(p) && p.rank > before) this.druidOpenSelection(p);
    return r;
  };
  const baseUpdateOverlay = Game.prototype.updateOverlay;
  Game.prototype.updateOverlay = function (input) {
    const o = this.overlay;
    if (!o || o.type !== 'druid_select') return baseUpdateOverlay.call(this, input);
    const p = this.player, m = input.mouse;
    const toggle = (kind) => {
      if (o.locked.includes(kind)) return;
      const i = o.selected.indexOf(kind);
      if (i >= 0) o.selected.splice(i, 1);
      else if (o.selected.length < o.goal) o.selected.push(kind);
      else o.msg = '편성할 수 있는 동료 수를 모두 선택했습니다';
    };
    if (input.wasPressed('Escape')) { this.overlay = null; input.mouse.down = false; return; }
    for (let i = 0; i < 6; i++) if (input.wasPressed('Digit' + (i + 1))) toggle(Object.keys(SPIRITS)[i]);
    if (input.wasPressed('Mouse0')) {
      let hit = false;
      for (let i = 0; i < 6; i++) {
        const x = 22 + (i % 3) * 156, y = 56 + Math.floor(i / 3) * 70;
        if (m.x >= x && m.x < x + 148 && m.y >= y && m.y < y + 60) { toggle(Object.keys(SPIRITS)[i]); hit = true; break; }
      }
      if (!hit && m.x >= 176 && m.x < 336 && m.y >= 214 && m.y < 244) {
        if (o.selected.length === o.goal) {
          p.natureRoster = o.selected.slice(); this.overlay = null; input.mouse.down = false;
          if (o.locked.length === 0) this.useSkill();
          else this.druidSummon(p, true);
          return;
        }
        o.msg = '동료 ' + o.goal + '종을 모두 선택해야 합니다';
      }
      input.mouse.down = false;
    }
    if (input.wasPressed('Enter')) {
      if (o.selected.length === o.goal) {
        p.natureRoster = o.selected.slice(); this.overlay = null;
        if (o.locked.length === 0) this.useSkill();
        else this.druidSummon(p, true);
        return;
      }
      o.msg = '동료 ' + o.goal + '종을 모두 선택해야 합니다';
    }
    return;
  };

  const baseUpdate = Game.prototype.update;
  Game.prototype.update = function (dt) {
    if (isBeast(this.player) && !this.overlay && this.input && this.input.wasPressed('KeyG')) this.player.druidCommandAt = this.time;
    return baseUpdate.call(this, dt);
  };
  if (typeof Game.prototype.coopHostTickRemotes === 'function') {
    const baseCoopHostTickRemotes = Game.prototype.coopHostTickRemotes;
    Game.prototype.coopHostTickRemotes = function (dt) {
      if (this.remotes) for (const R of this.remotes.values()) {
        if (R.p && R.vin && isBeast(R.p) && R.vin.wasPressed('KeyG')) R.p.druidCommandAt = this.time;
      }
      return baseCoopHostTickRemotes.call(this, dt);
    };
  }
  const baseSkillEffects = Game.prototype.updateSkillEffects;
  Game.prototype.updateSkillEffects = function (dt) {
    const r = baseSkillEffects.call(this, dt);
    this.druidTick(dt);
    return r;
  };

  const baseDamageEnemy = Game.prototype.damageEnemy;
  Game.prototype.damageEnemy = function (enemy, src, kx, ky, opts) {
    let source = src;
    if (enemy && source) {
      const owner = enemy.druidMarkOwner;
      if (owner && isBeast(owner) && enemy.druidMarkUntil > this.time && this.player === owner && !source.minion && !source.trap) {
        source = Object.assign({}, source, { damage: source.damage * (enemy.druidMarkBonus || 1.06) });
        awardHit(this, owner, 'wolf', 2);
      }
      const statusOwner = source.druidOwner || (isBeast(this.player) ? this.player : null);
      if (source.status && statusOwner && statusOwner.druidBuffs && statusOwner.druidBuffs.statusDuration) {
        source = Object.assign({}, source, { status: Object.assign({}, source.status, { duration: source.status.duration * (1 + statusOwner.druidBuffs.statusDuration) }) });
      }
    }
    return baseDamageEnemy.call(this, enemy, source, kx, ky, opts);
  };

  const basePlayerTakeDamage = Player.prototype.takeDamage;
  Player.prototype.takeDamage = function (amount) {
    const b = isBeast(this) && this.druidBuffs ? this.druidBuffs : null;
    if (b && b.guard) amount *= 1 - Math.min(0.2, b.guard);
    return basePlayerTakeDamage.call(this, amount);
  };
  const basePlayerUpdate = Player.prototype.update;
  Player.prototype.update = function (dt, input, map, mouseWorld) {
    const b = isBeast(this) && this.druidBuffs ? this.druidBuffs : null, oldSpeed = this.moveSpeed;
    if (b && b.moveSpeed) this.moveSpeed = oldSpeed * (1 + b.moveSpeed);
    try { basePlayerUpdate.call(this, dt, input, map, mouseWorld); }
    finally { this.moveSpeed = oldSpeed; }
    if (b && b.dashRecovery) this.dashCooldown = Math.max(0, this.dashCooldown - dt * b.dashRecovery);
  };
  const modsDescriptor = Object.getOwnPropertyDescriptor(Player.prototype, 'mods');
  if (modsDescriptor && modsDescriptor.get) Object.defineProperty(Player.prototype, 'mods', {
    configurable: true, enumerable: modsDescriptor.enumerable,
    get: function () {
      const m = modsDescriptor.get.call(this), b = isBeast(this) && this.druidBuffs ? this.druidBuffs : null;
      if (b && b.critChance) m.critChance += b.critChance;
      return m;
    }
  });
  const baseFireRate = WeaponSystem.prototype.getFireRate;
  WeaponSystem.prototype.getFireRate = function (player, weapon) {
    const rate = baseFireRate.call(this, player, weapon);
    const b = isBeast(player) && player.druidBuffs ? player.druidBuffs : null;
    return rate * (1 + (b ? b.fireRate : 0));
  };
  const baseSpend = WeaponSystem.prototype.spend;
  WeaponSystem.prototype.spend = function (player, cost) {
    const b = isBeast(player) && player.druidBuffs ? player.druidBuffs : null;
    return baseSpend.call(this, player, cost * (1 - (b ? b.energySave : 0)));
  };

  const baseHudOverlay = HUD.prototype.overlay;
  HUD.prototype.overlay = function (ctx, game) {
    baseHudOverlay.call(this, ctx, game);
    const o = game.overlay;
    if (!o || o.type !== 'druid_select') return;
    ctx.fillStyle = 'rgba(7,12,10,0.97)'; ctx.fillRect(12, 10, 488, 268);
    ctx.strokeStyle = '#6aa884'; ctx.lineWidth = 2; ctx.strokeRect(13, 11, 486, 266);
    hudText(ctx, '자연의 동맹', VIEW_W / 2, 18, '#9affb0', 'center', 17);
    hudText(ctx, '함께할 정령을 선택하세요  ·  선택 ' + o.selected.length + '/' + o.goal, VIEW_W / 2, 39, '#d8e8d8', 'center', 8);
    for (let i = 0; i < 6; i++) {
      const kind = Object.keys(SPIRITS)[i], C = SPIRITS[kind], x = 22 + (i % 3) * 156, y = 56 + Math.floor(i / 3) * 70;
      const chosen = o.selected.includes(kind), locked = o.locked.includes(kind);
      ctx.fillStyle = chosen ? 'rgba(100,190,130,0.22)' : 'rgba(255,255,255,0.045)'; ctx.fillRect(x, y, 148, 60);
      ctx.strokeStyle = chosen ? C.color : locked ? '#9affb0' : '#4a5d50'; ctx.lineWidth = chosen ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, 147, 59);
      ctx.fillStyle = C.color; ctx.fillRect(x + 8, y + 9, 15, 15);
      hudText(ctx, String(i + 1), x + 15.5, y + 10, '#101810', 'center', 8);
      hudText(ctx, C.name + ' · ' + C.role, x + 29, y + 7, C.color, 'left', 9);
      hudText(ctx, C.desc, x + 8, y + 25, '#d8e0d8', 'left', 7);
      hudText(ctx, chosen ? (locked ? '편성 유지' : '선택됨 · 클릭 해제') : '클릭 또는 ' + (i + 1) + '번', x + 8, y + 43, chosen ? '#9affb0' : '#8d9a8d', 'left', 7);
    }
    ctx.fillStyle = o.selected.length === o.goal ? '#285d3d' : '#292d2a'; ctx.fillRect(176, 214, 160, 30);
    ctx.strokeStyle = o.selected.length === o.goal ? '#9affb0' : '#59635a'; ctx.strokeRect(176.5, 214.5, 159, 29);
    hudText(ctx, '편성 확정 · Enter', VIEW_W / 2, 222, o.selected.length === o.goal ? '#ffffff' : '#889088', 'center', 9);
    hudText(ctx, o.msg || '진화 시 새로운 동료를 1종 더 편성합니다  ·  Esc 취소', VIEW_W / 2, 253, o.msg ? '#ffb0a0' : '#9aab9d', 'center', 7);
  };
  const baseHudRender = HUD.prototype.render;
  HUD.prototype.render = function (ctx, game) {
    baseHudRender.call(this, ctx, game);
    const p = game.player;
    if (!isBeast(p) || game.overlay || !Array.isArray(p.natureRoster) || !p.natureRoster.length) return;
    const B = bondMap(p), x0 = 4, y0 = 48, width = Math.min(166, 27 * p.natureRoster.length + 8);
    ctx.fillStyle = 'rgba(0,0,0,0.48)'; ctx.fillRect(x0, y0, width, 20);
    p.natureRoster.forEach((kind, i) => {
      const C = SPIRITS[kind], x = x0 + 5 + i * 27, value = B[kind] || 0;
      hudText(ctx, C.short, x + 9, y0 + 2, value >= 100 ? '#ffffff' : C.color, 'center', 7);
      hudBar(ctx, x, y0 + 12, 19, 3, clamp01(value / 100), value >= 100 ? '#ffd84a' : C.color);
    });
  };
})();
