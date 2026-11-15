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
  // 보스: 3페이즈(66% / 33%) — 페이즈마다 패턴이 추가되고 빨라짐, 3페이즈에는 궁극기를 주기적으로 사용
  boss(e, dt, world, ctx) {
    const def = e.def, phase = e.phase || 1;
    const spd = [1, 1, 1.25, 1.5][phase];
    const ratio = e.hp / e.maxHp, want = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
    if (want > phase && e.state !== 'INTRO') {
      e.phase = want; e.jumpH = 0; e.laser = null; e.fade = 1; e.finalCd = 1.5;
      world.onBossPhase(e, want); e.setState('PHASE'); return;
    }
    e.finalCd = (e.finalCd ?? 0) - dt;
    switch (e.state) {
      case 'INTRO': break; // 등장 연출은 Game이 진행
      case 'PHASE': if (e.stateTime >= 1.3) e.setState('CHASE'); break; // 페이즈 전환 중 무적
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE': {
        if (!ctx.playerAlive) break;
        if (ctx.dist > 50) pathStep(e, def.moveSpeed * spd, dt, world);
        if (e.stateTime < def.attackCooldown * (e.cdMul || 1) / spd) break;
        let pat;
        if (phase >= 3 && def.finalPatterns && e.finalCd <= 0) { pat = pick(def.finalPatterns); e.finalCd = 11; }
        else {
          const pool = def.patterns.concat(phase >= 2 ? def.phase2Patterns || [] : []);
          pat = pick(pool.filter((x) => x !== e.lastPat));
        }
        e.pat = pat; e.lastPat = pat; e.pd = { shots: 0, timer: 0 };
        const P = BOSS_PATTERNS[pat.type];
        if (P.begin) P.begin(e, world, ctx);
        if (pat.name) world.announceBossSkill(e, pat.name);
        e.setState('TELEGRAPH');
        break;
      }
      case 'TELEGRAPH':
        if (BOSS_PATTERNS[e.pat.type].aim) BOSS_PATTERNS[e.pat.type].aim(e, world, ctx);
        if (e.stateTime >= (e.pat.telegraph || (e.pat.type === 'slam' ? 0.8 : 0.5)) / spd) { e.pd.sx = e.x; e.pd.sy = e.y; e.setState('ATTACK'); }
        break;
      case 'ATTACK':
        if (BOSS_PATTERNS[e.pat.type].update(e, dt, world, ctx, spd)) { e.laser = null; e.fade = 1; e.setState('RECOVERY'); }
        break;
      case 'RECOVERY': if (e.stateTime >= (e.pat && e.pat.name ? 1.1 : 0.6) / spd) e.setState('CHASE'); break;
    }
  },

  // 순간이동 사격수: 사라졌다가 플레이어 근처에 나타나 부채꼴 사격
  teleporter(e, dt, world, ctx) {
    const def = e.def, p = world.player, map = world.map;
    switch (e.state) {
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE':
        if (!ctx.playerAlive) { e.setState('IDLE'); break; }
        if (ctx.dist > def.preferredRange + 30 || !hasLineOfSight(e, p, map)) pathStep(e, def.moveSpeed, dt, world);
        else if (ctx.dist < def.preferredRange - 40) moveAndCollide(e, -ctx.dx / ctx.dist * def.moveSpeed * dt, -ctx.dy / ctx.dist * def.moveSpeed * dt, map);
        if (e.attackCd <= 0) e.setState('TELEGRAPH');
        break;
      case 'TELEGRAPH':
        e.fade = Math.max(0.15, 1 - e.stateTime / def.telegraphTime);
        if (e.stateTime >= def.telegraphTime) {
          for (let i = 0; i < 24; i++) { // 플레이어 주변 빈 자리로 순간이동
            const a = Math.random() * TAU, r = 105 + Math.random() * 50, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
            if (e.room && map.roomAtPoint(x, y) !== e.room) continue;
            if (overlapsSolid(x, y, e.half, map)) continue;
            world.effects.ring(e.x, e.y, 10, def.bulletColor); e.x = x; e.y = y; world.effects.ring(x, y, 14, def.bulletColor);
            break;
          }
          e.fade = 1;
          const base = Math.atan2(p.y - e.y, p.x - e.x), n = def.bulletCount;
          for (let i = 0; i < n; i++) world.enemyShoot(e.x, e.y, base + (i - (n - 1) / 2) * def.bulletSpread, def.bulletSpeed, e.damage, def.bulletColor, 3);
          e.attackCd = def.attackCooldown + Math.random() * 0.5; e.setState('RECOVERY');
        }
        break;
      case 'RECOVERY': if (e.stateTime >= def.recoveryTime) e.setState(ctx.playerAlive ? 'CHASE' : 'IDLE'); break;
    }
  },

  // 고정 포탑: 레이저로 조준(마지막 0.25초는 고정) → 일직선 탄 연사
  turret(e, dt, world, ctx) {
    const def = e.def, p = world.player;
    switch (e.state) {
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE':
        if (!ctx.playerAlive) { e.setState('IDLE'); break; }
        if (e.attackCd <= 0 && ctx.dist < def.attackRange && hasLineOfSight(e, p, world.map)) { e.aimAng = Math.atan2(ctx.dy, ctx.dx); e.setState('TELEGRAPH'); }
        break;
      case 'TELEGRAPH':
        if (e.stateTime < def.telegraphTime - 0.25) e.aimAng = Math.atan2(ctx.dy, ctx.dx);
        if (e.stateTime >= def.telegraphTime) {
          for (let i = 0; i < def.bulletCount; i++) world.enemyShoot(e.x, e.y - 4, e.aimAng, def.bulletSpeed * (1 + i * 0.09), e.damage, '#d8a0ff', 3);
          e.attackCd = def.attackCooldown; e.setState('RECOVERY');
        }
        break;
      case 'RECOVERY': if (e.stateTime >= def.recoveryTime) e.setState('CHASE'); break;
    }
  }
};

// update()가 true를 돌려주면 패턴 종료
// 보스 광선 길이: 벽에서 멈춤
function beamLength(e, a, map) {
  const L = 420, t = sweepWall(e.x, e.y, e.x + Math.cos(a) * L, e.y + Math.sin(a) * L, map, 4);
  return t < 0 ? L : t * L;
}
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
      const d = e.pd, P = e.pat;
      d.jt = (d.jt || 0) + dt;
      if (d.jt < 0) { e.jumpH = 0; return false; } // 연속 점프 사이 대기 (보간이 0~1을 벗어나지 않게)
      const t = Math.min(1, d.jt / 0.5);
      e.x = d.sx + (d.tx - d.sx) * t; e.y = d.sy + (d.ty - d.sy) * t;
      e.jumpH = Math.sin(t * Math.PI) * 40;
      if (t < 1) return false;
      e.jumpH = 0;
      const p = world.player;
      if (ctx.playerAlive && Math.hypot(p.x - e.x, p.y - e.y) < P.radius + p.half) world.damagePlayer(Math.round(e.damage * 1.5));
      for (let i = 0; i < 14; i++) world.enemyShoot(e.x, e.y, i * TAU / 14, e.def.bulletSpeed * 0.9, e.damage, P.color, 4);
      world.effects.ring(e.x, e.y, P.radius, P.color); world.effects.ring(e.x, e.y, P.radius * 0.7, '#ffffff');
      world.addShake(0.25, 5); SFX.play('explode', 0.05);
      if (d.chainLeft === undefined) d.chainLeft = P.chain || 0;
      if (d.chainLeft > 0) { // 연속 내려찍기: 다음 착지 지점 재조준
        d.chainLeft--; d.jt = -0.35; d.sx = e.x; d.sy = e.y; BOSS_PATTERNS.slam.begin(e, world); return false;
      }
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
  // 레이저: 조준선(예고) → 회전하며 휩쓰는 광선
  laser: {
    begin(e, world, ctx) {
      const P = e.pat, base = Math.atan2(ctx.dy, ctx.dx);
      e.pd.angs = []; for (let i = 0; i < P.beams; i++) e.pd.angs.push(base + (i - (P.beams - 1) / 2) * P.spreadAng);
      e.pd.dir = Math.random() < 0.5 ? -1 : 1; e.pd.t = 0;
      e.laser = { angs: e.pd.angs, width: P.width, color: P.color, live: false };
    },
    update(e, dt, world, ctx) {
      const P = e.pat, d = e.pd, p = world.player;
      d.t += dt;
      for (let i = 0; i < d.angs.length; i++) d.angs[i] += d.dir * P.sweep / P.duration * dt;
      e.laser.live = true;
      if (ctx.playerAlive) for (const a of d.angs) {
        const len = beamLength(e, a, world.map), ex = e.x + Math.cos(a) * len, ey = e.y + Math.sin(a) * len;
        if (segmentCircleHit(e.x, e.y, ex, ey, p.x, p.y, P.width + p.half) >= 0) { world.damagePlayer(e.damage); break; }
      }
      if (Math.floor(d.t * 10) !== Math.floor((d.t - dt) * 10)) SFX.play('beam', 0.08);
      return d.t >= P.duration;
    }
  },
  // 격자 폭격: 방 전체에 장판, 가로·세로 한 줄씩만 안전
  grid: {
    update(e, dt, world) {
      const P = e.pat, r = e.room, map = world.map;
      const safeX = randInt(r.x0 + 1, r.x0 + r.w - 2), safeY = randInt(r.y0 + 1, r.y0 + r.h - 2);
      for (let ty = r.y0 + 1; ty < r.y0 + r.h - 1; ty += P.spacing === 3 ? 2 : P.spacing)
        for (let tx = r.x0 + 1; tx < r.x0 + r.w - 1; tx += P.spacing === 3 ? 2 : P.spacing) {
          if (Math.abs(tx - safeX) <= 1 || Math.abs(ty - safeY) <= 1 || map.isSolidTile(tx, ty)) continue;
          const c = map.tileCenter(tx, ty);
          world.hazards.push(new Hazard(c.x, c.y, { r: P.radius, delay: P.delay, damage: Math.round(e.damage * 1.2), bullets: P.bullets, color: P.color }));
        }
      return true;
    }
  },
  // 조여 오는 고리: 방 가장자리에서 중심으로 모이는 탄막, 틈으로 빠져나가야 함
  ringIn: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, r = e.room; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.rings) {
        const c = world.map.tileCenter(r.cx, r.cy), R = Math.min(r.w, r.h) * TILE / 2 - 14;
        const gapAt = randInt(0, P.count - 1);
        for (let i = 0; i < P.count; i++) {
          if (((i - gapAt + P.count) % P.count) < P.gap) continue;
          const a = i * TAU / P.count, b = new EnemyBullet(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R, -Math.cos(a) * P.speed, -Math.sin(a) * P.speed, e.damage, P.color, 4);
          b.life = R / P.speed + 0.2; world.enemyBullets.push(b);
        }
        d.shots++; d.timer = P.interval / spd;
      }
      return d.shots >= P.rings && d.timer <= 0;
    }
  },
  // 순간이동: 사라졌다가 플레이어에게서 먼 곳에 나타나며 원형 탄막
  teleport: {
    update(e, dt, world) {
      const P = e.pat, d = e.pd;
      d.t = (d.t || 0) + dt;
      if (d.t < 0.35) e.fade = 1 - d.t / 0.35;
      else if (!d.moved) {
        d.moved = true;
        const sp = world.findSpawnPoint(e.room, 110, undefined, undefined, e.def.hitboxHalf);
        world.effects.ring(e.x, e.y, 20, P.color); e.x = sp.x; e.y = sp.y;
      } else if (d.t < 0.6) e.fade = (d.t - 0.35) / 0.25;
      else {
        e.fade = 1;
        for (let i = 0; i < P.bullets; i++) world.enemyShoot(e.x, e.y, i * TAU / P.bullets, e.def.bulletSpeed, e.damage, P.color, 4);
        world.effects.ring(e.x, e.y, 26, P.color);
        return true;
      }
      return false;
    }
  },
  // 소용돌이: 플레이어를 끌어당기며 회전 탄막
  vortex: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player;
      if (ctx.playerAlive && p.state !== 'DASH') moveAndCollide(p, -ctx.dx / ctx.dist * P.pull * dt, -ctx.dy / ctx.dist * P.pull * dt, world.map);
      d.timer -= dt; d.a = (d.a || 0) + P.spin * dt * spd;
      while (d.timer <= 0) {
        for (let i = 0; i < P.arms; i++) world.enemyShoot(e.x, e.y, d.a + i * TAU / P.arms, e.def.bulletSpeed * 0.8, e.damage, P.color, 3);
        d.timer += P.interval;
      }
      return e.stateTime >= P.duration;
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
  e.burn = Math.max(0, e.burn - dt); e.poison = Math.max(0, e.poison - dt); e.slow = Math.max(0, e.slow - dt); if (e.markT > 0) e.markT -= dt; e.reactCd = Math.max(0, e.reactCd - dt);
  if (e.burn > 0 || e.poison > 0) {
    e.dotTimer -= dt;
    if (e.dotTimer <= 0) {
      e.dotTimer = 0.5;
      if (e.burn > 0) { world.dotDamage(e, e.burnDps * 0.5, '#ff9a4a'); world.effects.status(e.x, e.y, 'burn'); }
      if (e.poison > 0 && e.alive) { world.dotDamage(e, e.poisonDps * 0.5, '#9aff5a'); world.effects.status(e.x, e.y, 'poison'); }
      if (!e.alive) return;
    }
  }
  if (e.burn > 0 && Math.random() < 0.25) world.effects.status(e.x, e.y, 'burn');
  if (e.slow > 0 && Math.random() < 0.12) world.effects.status(e.x, e.y, 'freeze');
  if (e.poison > 0 && Math.random() < 0.08) world.effects.status(e.x, e.y, 'poison');
  if (e.chainT > 0) { e.chainT -= dt; return; } // 황금 사슬에 묶임: 이동·공격 정지 (지속 피해는 계속)
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
