'use strict';
// ════════════════════════════════════════════
// 몬스터 AI
// ════════════════════════════════════════════
function chaseStep(e, tx, ty, speed, dt, map) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (d < 0.01) return;
  moveAndCollide(e, dx / d * speed * dt, dy / d * speed * dt, map);
}
function hasClearPath(e, p, map) {
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
  const ox = -dy / d * (e.half + 2), oy = dx / d * (e.half + 2); // 몸통보다 약간 넓게 → 모서리 스침 방지
  for (const k of [0, -1, 1])
    if (sweepWall(e.x + ox * k, e.y + oy * k, p.x + ox * k, p.y + oy * k, map, 6) >= 0) return false;
  return true;
}
// 직선 경로가 막히면 플로우 필드(BFS 거리맵)를 따라 장애물을 돌아감
function pathStep(e, speed, dt, world) {
  const p = world.player, map = world.map;
  // 1초 동안 거의 못 움직였으면 0.5초간 방 중앙 쪽으로 빠져나옴
  e.stuckCheck = (e.stuckCheck || 0) + dt;
  if (e.stuckCheck >= 1) {
    if (Math.hypot(e.x - (e.sx0 ?? e.x + 99), e.y - (e.sy0 ?? 0)) < 1.5 && speed > 0) e.unstuck = 0.4;
    e.sx0 = e.x; e.sy0 = e.y; e.stuckCheck = 0;
  }
  if (e.unstuck > 0 && e.room) {
    e.unstuck -= dt;
    const c = map.tileCenter(e.room.cx, e.room.cy);
    chaseStep(e, c.x + (e.id % 3 - 1) * 24, c.y + (e.id % 2 ? 20 : -20), speed, dt, map); return;
  }
  if (hasClearPath(e, p, map)) { chaseStep(e, p.x, p.y, speed, dt, map); return; }
  const flow = world.flow, W = map.width;
  const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
  const here = flow[ty * W + tx];
  let best = null, bestD = here >= 0 ? here : 1e9;
  for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const v = flow[(ty + ddy) * W + tx + ddx];
    if (v >= 0 && v < bestD) { bestD = v; best = [tx + ddx, ty + ddy]; }
  }
  if (!best) { chaseStep(e, p.x, p.y, speed, dt, map); return; }
  // 축 분리 이동: 진행 방향의 수직축을 먼저 타일 중앙에 맞춘 뒤 전진 → 모서리에 걸리지 않음
  const c = map.tileCenter(best[0], best[1]), step = speed * dt;
  const toward = (v, t) => clamp(t - v, -step, step);
  if (best[0] !== tx) {
    if (Math.abs(e.y - c.y) > 0.001) moveAndCollide(e, 0, toward(e.y, c.y), map);
    else moveAndCollide(e, toward(e.x, c.x), 0, map);
  } else {
    if (Math.abs(e.x - c.x) > 0.001) moveAndCollide(e, toward(e.x, c.x), 0, map);
    else moveAndCollide(e, 0, toward(e.y, c.y), map);
  }
}

const AI_BEHAVIORS = {
  dummy() {},

  melee_chase(e, dt, world, ctx) {
    const def = e.def, p = world.player;
    const inRange = ctx.dist <= def.attackRange + p.radius;
    switch (e.state) {
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE':
        if (!ctx.playerAlive) { e.setState('IDLE'); break; }
        if (inRange && e.attackCd <= 0) { e.setState('TELEGRAPH'); break; }
        if (ctx.dist > def.attackRange * 0.6) pathStep(e, def.moveSpeed, dt, world);
        break;
      case 'TELEGRAPH': if (e.stateTime >= def.telegraphTime) e.setState('ATTACK'); break;
      case 'ATTACK':
        if (ctx.playerAlive && inRange) world.damagePlayer(e.damage);
        world.effects.ring(e.x, e.y, def.attackRange, '#ff7070');
        e.attackCd = def.attackCooldown; e.setState('RECOVERY');
        break;
      case 'RECOVERY': if (e.stateTime >= def.recoveryTime) e.setState(ctx.playerAlive ? 'CHASE' : 'IDLE'); break;
    }
  },

  ranged_kite(e, dt, world, ctx) {
    const def = e.def, p = world.player, map = world.map;
    switch (e.state) {
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE': {
        if (!ctx.playerAlive) { e.setState('IDLE'); break; }
        if (!hasLineOfSight(e, p, map)) { pathStep(e, def.moveSpeed, dt, world); break; }
        e.strafeT -= dt;
        if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = 1.2 + Math.random() * 1.8; }
        const nx = ctx.dx / ctx.dist, ny = ctx.dy / ctx.dist;
        let mx = 0, my = 0;
        if (ctx.dist > def.preferredRange + 25) { mx = nx; my = ny; }
        else if (ctx.dist < def.preferredRange - 35) { mx = -nx; my = -ny; }
        mx += -ny * e.strafe * 0.7; my += nx * e.strafe * 0.7;
        const ml = Math.hypot(mx, my) || 1;
        const hit = moveAndCollide(e, mx / ml * def.moveSpeed * dt, my / ml * def.moveSpeed * dt, map);
        if (hit.x || hit.y) e.strafe *= -1;
        if (e.attackCd <= 0 && ctx.dist < def.attackRange) { e.aimAng = Math.atan2(ctx.dy, ctx.dx); e.setState('TELEGRAPH'); }
        break;
      }
      case 'TELEGRAPH':
        if (e.stateTime < def.telegraphTime - 0.15) e.aimAng = Math.atan2(ctx.dy, ctx.dx);
        if (e.stateTime >= def.telegraphTime) {
          const n = def.bulletCount || 1, sp = def.bulletSpread || 0;
          for (let i = 0; i < n; i++)
            world.enemyShoot(e.x, e.y, e.aimAng + (n > 1 ? (i / (n - 1) - 0.5) * sp * (n - 1) : 0), def.bulletSpeed, e.damage, def.bulletColor || '#ff6a4a', 3);
          e.attackCd = def.attackCooldown + Math.random() * 0.6;
          e.setState('RECOVERY');
        }
        break;
      case 'RECOVERY': if (e.stateTime >= def.recoveryTime) e.setState(ctx.playerAlive ? 'CHASE' : 'IDLE'); break;
    }
  },

  charger(e, dt, world, ctx) {
    const def = e.def, p = world.player, map = world.map;
    switch (e.state) {
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE':
        if (!ctx.playerAlive) { e.setState('IDLE'); break; }
        pathStep(e, def.moveSpeed, dt, world);
        if (e.attackCd <= 0 && ctx.dist < def.attackRange && hasLineOfSight(e, p, map)) {
          e.dashX = ctx.dx / ctx.dist; e.dashY = ctx.dy / ctx.dist; e.setState('TELEGRAPH');
        }
        break;
      case 'TELEGRAPH': if (e.stateTime >= def.telegraphTime) { e.dashHit = false; e.setState('ATTACK'); } break;
      case 'ATTACK': {
        const hit = moveAndCollide(e, e.dashX * def.dashSpeed * dt, e.dashY * def.dashSpeed * dt, map);
        if (!e.dashHit && ctx.playerAlive && Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.half + 3)
          if (world.damagePlayer(e.damage)) e.dashHit = true;
        if (hit.x || hit.y) {
          world.effects.spark(e.x + e.dashX * 8, e.y + e.dashY * 8, '#ffe08a'); world.addShake(0.1, 2);
          e.attackCd = def.attackCooldown; e.setState('STUN'); break;
        }
        if (e.stateTime >= def.dashDuration) { e.attackCd = def.attackCooldown; e.setState('RECOVERY'); }
        break;
      }
      case 'STUN': if (e.stateTime >= def.stunTime) e.setState('CHASE'); break;
      case 'RECOVERY': if (e.stateTime >= def.recoveryTime) e.setState(ctx.playerAlive ? 'CHASE' : 'IDLE'); break;
    }
  },

  caster(e, dt, world, ctx) {
    const def = e.def, p = world.player, map = world.map;
    switch (e.state) {
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE':
        if (!ctx.playerAlive) { e.setState('IDLE'); break; }
        e.strafeT -= dt;
        if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = 2 + Math.random() * 2; }
        if (ctx.dist > 180 || !hasLineOfSight(e, p, map)) pathStep(e, def.moveSpeed, dt, world);
        else moveAndCollide(e, -ctx.dy / ctx.dist * e.strafe * def.moveSpeed * dt, ctx.dx / ctx.dist * e.strafe * def.moveSpeed * dt, map);
        if (e.attackCd <= 0 && ctx.dist < def.attackRange) e.setState('TELEGRAPH');
        break;
      case 'TELEGRAPH':
        if (e.stateTime >= def.telegraphTime) {
          e.spin += 0.35;
          for (let i = 0; i < def.bulletCount; i++)
            world.enemyShoot(e.x, e.y - 4, e.spin + i * TAU / def.bulletCount, def.bulletSpeed, e.damage, def.bulletColor || '#c070ff', 3);
          e.attackCd = def.attackCooldown; e.setState('RECOVERY');
        }
        break;
      case 'RECOVERY': if (e.stateTime >= def.recoveryTime) e.setState(ctx.playerAlive ? 'CHASE' : 'IDLE'); break;
    }
  },

  // 자폭병: 붙으면 점멸 후 폭발 (처치당해도 폭발)
  exploder(e, dt, world, ctx) {
    const def = e.def;
    switch (e.state) {
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE':
        if (!ctx.playerAlive) { e.setState('IDLE'); break; }
        pathStep(e, def.moveSpeed, dt, world);
        if (ctx.dist < 26) e.setState('TELEGRAPH');
        break;
      case 'TELEGRAPH':
        if (e.stateTime >= def.telegraphTime) {
          e.alive = false; e.rewardGiven = true; e.setState('DEAD');
          world.enemyExplode(e);
        }
        break;
    }
  },

  // 보스: 데이터에 정의된 패턴 목록을 돌아가며 사용, 체력 50% 이하 격노
  boss(e, dt, world, ctx) {
    const def = e.def, p = world.player;
    const enr = e.hp < e.maxHp * 0.5 ? 1.4 : 1;
    // 격노 전환: 한 번만, 진행 중인 패턴을 끊고 포효
    if (enr > 1 && !e.enraged) { e.enraged = true; e.jumpH = 0; world.onBossEnrage(e); e.setState('RECOVERY'); return; }
    switch (e.state) {
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE':
        if (!ctx.playerAlive) break;
        if (ctx.dist > 50) pathStep(e, def.moveSpeed * enr, dt, world);
        if (e.stateTime >= def.attackCooldown / enr) {
          const pool = e.enraged ? def.patterns.concat(def.enragePatterns || []) : def.patterns;
          const opts = pool.filter((x) => x !== e.lastPat);
          e.pat = pick(opts); e.lastPat = e.pat; e.pd = { shots: 0, timer: 0 };
          const P = BOSS_PATTERNS[e.pat.type];
          if (P.begin) P.begin(e, world, ctx);
          e.setState('TELEGRAPH');
        }
        break;
      case 'TELEGRAPH':
        if (e.stateTime >= (e.pat.telegraph || (e.pat.type === 'slam' ? 0.8 : 0.5)) / enr) { e.pd.sx = e.x; e.pd.sy = e.y; e.setState('ATTACK'); }
        break;
      case 'ATTACK':
        if (BOSS_PATTERNS[e.pat.type].update(e, dt, world, ctx, enr)) e.setState('RECOVERY');
        break;
      case 'RECOVERY': if (e.stateTime >= (e.roarT || 0.6) / enr) { e.roarT = 0; e.setState('CHASE'); } break;
    }
  }
};

// update()가 true를 돌려주면 패턴 종료
const BOSS_PATTERNS = {
  radial: {
    update(e, dt, world, ctx, enr) {
      const P = e.pat, d = e.pd; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.rings) {
        const off = d.shots * (Math.PI / P.count);
        for (let i = 0; i < P.count; i++) world.enemyShoot(e.x, e.y, off + i * TAU / P.count, e.def.bulletSpeed, e.damage, P.color, 4);
        d.shots++; d.timer = 0.3 / enr;
      }
      return d.shots >= P.rings && d.timer <= 0;
    }
  },
  aimed: {
    update(e, dt, world, ctx, enr) {
      const P = e.pat, d = e.pd, p = world.player; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.volleys) {
        const base = Math.atan2(p.y - e.y, p.x - e.x), h = (P.count - 1) / 2;
        for (let i = 0; i < P.count; i++) world.enemyShoot(e.x, e.y, base + (i - h) * P.spread, e.def.bulletSpeed * 1.4, e.damage, P.color, 3);
        d.shots++; d.timer = 0.32 / enr;
      }
      return d.shots >= P.volleys && d.timer <= 0;
    }
  },
  summon: {
    update(e, dt, world) {
      const alive = world.enemies.filter((x) => x.alive).length;
      for (let i = 0; i < e.pat.count && alive + i < 8; i++) {
        const a = Math.random() * TAU;
        const pt = world.findSpawnPoint(e.room, 0, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40);
        world.spawnEnemy(e.pat.enemyId, pt.x, pt.y, e.room);
      }
      return true;
    }
  },
  slam: {
    begin(e, world) {
      const r = e.room, m = e.def.hitboxHalf + 2, p = world.player;
      e.pd.tx = clamp(p.x, r.x0 * TILE + m, (r.x0 + r.w) * TILE - m);
      e.pd.ty = clamp(p.y, r.y0 * TILE + m, (r.y0 + r.h) * TILE - m);
    },
    update(e, dt, world, ctx) {
      const d = e.pd, P = e.pat, t = Math.min(1, e.stateTime / 0.5);
      e.x = d.sx + (d.tx - d.sx) * t; e.y = d.sy + (d.ty - d.sy) * t;
      e.jumpH = Math.sin(t * Math.PI) * 40;
      if (t < 1) return false;
      e.jumpH = 0;
      const p = world.player;
      if (ctx.playerAlive && Math.hypot(p.x - e.x, p.y - e.y) < P.radius + p.half) world.damagePlayer(Math.round(e.damage * 1.5));
      for (let i = 0; i < 14; i++) world.enemyShoot(e.x, e.y, i * TAU / 14, e.def.bulletSpeed * 0.9, e.damage, P.color, 4);
      world.effects.ring(e.x, e.y, P.radius, P.color); world.effects.ring(e.x, e.y, P.radius * 0.7, '#ffffff');
      world.addShake(0.25, 5);
      return true;
    }
  },
  charge: {
    begin(e) { e.pd.n = 0; e.pd.phase = 'aim'; e.pd.pt = 0; },
    update(e, dt, world, ctx, enr) {
      const d = e.pd, P = e.pat, p = world.player;
      d.pt += dt;
      if (d.phase === 'aim') {
        e.dashX = ctx.dx / ctx.dist; e.dashY = ctx.dy / ctx.dist;
        if (d.pt >= 0.45 / enr) { d.phase = 'dash'; d.pt = 0; e.dashHit = false; }
        return false;
      }
      const hit = moveAndCollide(e, e.dashX * P.speed * dt, e.dashY * P.speed * dt, world.map);
      if (!e.dashHit && ctx.playerAlive && Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.half + 3)
        if (world.damagePlayer(Math.round(e.damage * 1.2))) e.dashHit = true;
      if (hit.x || hit.y || d.pt > 0.9) {
        if (hit.x || hit.y) {
          world.addShake(0.2, 4);
          for (let i = 0; i < 10; i++) world.enemyShoot(e.x, e.y, i * TAU / 10 + Math.random() * 0.3, e.def.bulletSpeed, e.damage, P.color, 3);
        }
        d.n++; d.phase = 'aim'; d.pt = 0;
      }
      return d.n >= P.dashes;
    }
  },
  zones: {
    update(e, dt, world) {
      const P = e.pat, p = world.player;
      for (let i = 0; i < P.count; i++) {
        const a = Math.random() * TAU, r = i === 0 ? 0 : 20 + Math.random() * P.spreadAround;
        const x = clamp(p.x + Math.cos(a) * r, e.room.x0 * TILE + 8, (e.room.x0 + e.room.w) * TILE - 8);
        const y = clamp(p.y + Math.sin(a) * r, e.room.y0 * TILE + 8, (e.room.y0 + e.room.h) * TILE - 8);
        world.hazards.push(new Hazard(x, y, { r: P.radius, delay: P.delay, damage: Math.round(e.damage * 1.1),
          bullets: P.bullets, color: P.color }));
        if (P.stagger) world.hazards[world.hazards.length - 1].t = -i * P.stagger;
      }
      return true;
    }
  },
  spiral: {
    update(e, dt, world, ctx, enr) {
      const P = e.pat, d = e.pd; d.timer -= dt;
      d.a = (d.a || 0) + P.spin * dt * enr;
      while (d.timer <= 0) {
        for (let i = 0; i < P.arms; i++) world.enemyShoot(e.x, e.y, d.a + i * TAU / P.arms, e.def.bulletSpeed * 0.9, e.damage, P.color, 3);
        d.timer += P.interval;
      }
      return e.stateTime >= P.duration;
    }
  }
};

function updateEnemy(e, dt, world) {
  e.hurtFlash = Math.max(0, e.hurtFlash - dt);
  if (e.state === 'DEAD') {
    e.stateTime += dt;
    if (e.stateTime >= (e.def.boss ? 1 : 0.35)) e.removed = true;
    return;
  }
  if (e.state === 'SPAWN') { e.stateTime += dt; if (e.stateTime >= SPAWN_TIME) e.setState('CHASE'); return; }
  // 상태이상
  e.burn = Math.max(0, e.burn - dt); e.poison = Math.max(0, e.poison - dt); e.slow = Math.max(0, e.slow - dt); e.reactCd = Math.max(0, e.reactCd - dt);
  if (e.burn > 0 || e.poison > 0) {
    e.dotTimer -= dt;
    if (e.dotTimer <= 0) {
      e.dotTimer = 0.5;
      if (e.burn > 0) world.dotDamage(e, e.burnDps * 0.5, '#ff9a4a');
      if (e.poison > 0 && e.alive) world.dotDamage(e, e.poisonDps * 0.5, '#9aff5a');
      if (!e.alive) return;
    }
  }
  const sdt = dt * e.speedMul; // 빙결 시 이동/행동 모두 느려짐
  e.stateTime += sdt;
  const p = world.player;
  const dx = p.x - e.x, dy = p.y - e.y;
  const ctx = { dx, dy, dist: Math.hypot(dx, dy) || 0.001, playerAlive: p.state !== 'DEAD' };
  if (!(e.state === 'ATTACK' && e.def.aiType === 'charger')) e.face = dx < 0 ? -1 : 1;
  e.attackCd = Math.max(0, e.attackCd - sdt);
  const behavior = AI_BEHAVIORS[e.def.aiType];
  if (!behavior) throw new Error('알 수 없는 aiType: ' + e.def.aiType);
  behavior(e, sdt, world, ctx);
}
