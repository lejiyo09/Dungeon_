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
        world.eachTarget((q) => { if (Math.hypot(q.x - e.x, q.y - e.y) <= def.attackRange + q.radius) world.damagePlayer(e.damage); }); // 멀티: 범위 안의 모두
        world.effects.ring(e.x, e.y, def.attackRange, '#ff7070'); traitOn(e, 'attack', world, ctx);
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
          const n = traitOn(e, 'fire', world, ctx) ? 0 : def.bulletCount || 1, sp = def.bulletSpread || 0;
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
      case 'TELEGRAPH': if (e.stateTime >= def.telegraphTime) { e.dashHit = false; e.hits = null; e.setState('ATTACK'); } break;
      case 'ATTACK': {
        const hit = moveAndCollide(e, e.dashX * def.dashSpeed * dt, e.dashY * def.dashSpeed * dt, map); traitOn(e, 'dash', dt, world);
        world.eachTarget((q) => { if (Math.hypot(q.x - e.x, q.y - e.y) < e.radius + q.half + 3) world.hitOnce(e, 'hits', q, () => world.damagePlayer(e.damage)); }); // 돌진 경로의 모두 (사람마다 한 번)
        if (hit.x || hit.y) {
          world.effects.spark(e.x + e.dashX * 8, e.y + e.dashY * 8, '#ffe08a'); world.addShake(0.1, 2);
          if (traitOn(e, 'dashEnd', world, ctx)) { e.setState('TELEGRAPH'); break; }
          e.attackCd = def.attackCooldown; e.setState('STUN'); break;
        }
        if (e.stateTime >= def.dashDuration) { if (traitOn(e, 'dashEnd', world, ctx)) { e.setState('TELEGRAPH'); break; } e.attackCd = def.attackCooldown; e.setState('RECOVERY'); }
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
          if (!traitOn(e, 'fire', world, ctx)) for (let i = 0; i < def.bulletCount; i++)
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
    const spd = [1, 1, 1.25, 1.5][phase] * (e.rampage ? def.rampage : 1); /* 모드레드 '폭주': 모든 행동이 빨라짐 */
    const ratio = e.hp / e.maxHp, want = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
    const channeling = e.pd && ((e.pd.tower && e.pd.tower.alive) || e.pd.lock); /* 롱고미니아드(빛의 탑)가 서 있는 동안은 페이즈도 넘기지 않고 다른 행동 없음 — 탑이 무너진 뒤에 넘어감 */
    if (want > phase && e.state !== 'INTRO' && !channeling) {
      if (e.ult) { e.ult = false; e.damage = e.dmg0; }
      e.phase = want; e.jumpH = 0; e.laser = null; e.fade = 1; e.finalCd = e.ultUsed ? Math.max(e.finalCd ?? 0, 1.5) : 1.5; /* 이미 궁극기를 썼으면 페이즈가 바뀌어도 쿨타임 유지 */
      if (def.wall && want === 3) { e.wallCone = def.wall.cone3; e.wallMult = def.wall.mult3; world.announceBossSkill(e, '철벽 — 무너지지 않는 성채'); }
      if (def.negate && want === 3) { e.negateOn = true; e.negCd = 1.5; world.announceBossSkill(e, '부정 — 모든 칼날을 거부하는 빛'); }
      if (def.rampage && want === 3) { e.rampage = true; world.announceBossSkill(e, '폭주 — 멈추지 않는 반역'); }
      if (def.rev && want === 3) { e.revAll = true; world.announceBossSkill(e, '반전 — 되돌아오는 화살'); } /* 트리스탄: 이제 화살이 지나간 뒤 되돌아옴 */
      if (def.noon && want === 3) { e.damage = Math.round(e.damage * (1 + def.noon)); e.dmg0 = e.damage; world.announceBossSkill(e, '정오 — 태양의 가호'); } /* 가웨인: 해가 가장 높이 뜸 */
      world.onBossPhase(e, want); e.setState('PHASE'); return;
    }
    e.finalCd = (e.finalCd ?? 0) - dt;
    if (e.negateT > 0) e.negateT -= dt;
    if (def.wall) { /* 갤러해드: 방패 방향 — 쫓는 동안만 천천히 플레이어 쪽으로 돎 */
      const want = Math.atan2(world.player.y - e.y, world.player.x - e.x); if (e.shieldAng == null) e.shieldAng = want;
      if (e.state === 'CHASE' || e.state === 'RECOVERY' || e.state === 'INTRO') { let df = want - e.shieldAng; df = Math.atan2(Math.sin(df), Math.cos(df)); e.shieldAng += clamp(df, -def.wall.turn * dt, def.wall.turn * dt); } }
    if (e.negateOn && e.state !== 'PHASE') { e.negCd -= dt; if (e.negCd <= 0) { e.negCd = def.negate.every + def.negate.dur; e.negateT = def.negate.dur; world.effects.ring(e.x, e.y, 30, '#ffffff'); world.effects.ring(e.x, e.y, 20, '#d8f0ff'); SFX.play('shield', 0.1); } } /* 가레스: 주기적으로 피해 무효 */
    switch (e.state) {
      case 'INTRO': break; // 등장 연출은 Game이 진행
      case 'PHASE': if (e.stateTime >= 1.3) e.setState('CHASE'); break; // 페이즈 전환 중 무적
      case 'IDLE': if (ctx.playerAlive) e.setState('CHASE'); break;
      case 'CHASE': {
        if (!ctx.playerAlive) break;
        if (ctx.dist > 50) pathStep(e, def.moveSpeed * spd, dt, world);
        if (e.stateTime < def.attackCooldown * (e.cdMul || 1) / spd) break;
        let pat;
        if (phase >= (def.ultFrom || 3) && def.finalPatterns && e.finalCd <= 0) { // 궁극기: 규모를 키우고 피해 +20%, 끝나면 마무리 폭발
          pat = boostUltimate(pick(def.finalPatterns)); e.finalCd = def.ultCd || 9; e.ultUsed = true;
          e.ult = true; e.dmg0 = e.damage; e.damage = Math.round(e.damage * 1.2); if (world.onBossUltimate) world.onBossUltimate(e, pat);
        }
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
        { const n0 = world.enemyBullets.length, fin = BOSS_PATTERNS[e.pat.type].update(e, dt, world, ctx, spd);
          if (e.revAll) for (let i = n0; i < world.enemyBullets.length; i++) { const b = world.enemyBullets[i]; if (b.flipT === undefined && !b.noFlip) b.flipT = def.rev; } /* 반전: 새로 쏜 화살에 되돌아올 시간 */
          if (fin) { e.laser = null; e.fade = 1; if (e.ult) endUltimate(e, world); e.setState('RECOVERY'); } }
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
            const ox = e.x, oy = e.y; world.effects.ring(e.x, e.y, 10, def.bulletColor); e.x = x; e.y = y; world.effects.ring(x, y, 14, def.bulletColor); traitOn(e, 'teleport', world, ox, oy);
            break;
          }
          e.fade = 1;
          const base = Math.atan2(p.y - e.y, p.x - e.x), n = def.bulletCount;
          if (!traitOn(e, 'fire', world, ctx)) for (let i = 0; i < n; i++) world.enemyShoot(e.x, e.y, base + (i - (n - 1) / 2) * def.bulletSpread, def.bulletSpeed, e.damage, def.bulletColor, 3);
          e.attackCd = def.attackCooldown + Math.random() * 0.5; traitOn(e, 'attack', world, ctx); e.setState('RECOVERY');
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
          if (!traitOn(e, 'fire', world, ctx)) for (let i = 0; i < def.bulletCount; i++) world.enemyShoot(e.x, e.y - 4, e.aimAng, def.bulletSpeed * (1 + i * 0.09), e.damage, '#d8a0ff', 3);
          e.attackCd = def.attackCooldown; e.setState('RECOVERY');
        }
        break;
      case 'RECOVERY': if (e.stateTime >= def.recoveryTime) e.setState('CHASE'); break;
    }
  }
};

// ── 몬스터 특성: 기본 AI 위에 얹는 추가 패턴 (심층 잡몹). 적 데이터에 traits: ['pounce', ...]
//  tick: 매 프레임 (true면 이번 프레임 기본 AI를 건너뜀) / attack: 근접 공격 직후 / fire: 원거리 발사 직전 (true면 기본 발사 대신)
//  dash·dashEnd: 돌진 중·끝 (dashEnd가 true면 다시 돌진) / teleport: 순간이동 직후 / death: 처치될 때
function traitOn(e, hook, ...a) {
  const T = e.def.traits; if (!T) return false; let r = false;
  for (const k of T) { const f = ENEMY_TRAITS[k] && ENEMY_TRAITS[k][hook]; if (f && f(e, ...a)) r = true; }
  return r;
}
function traitRing(world, e, n, speed, col, dmgMul = 0.8, off = Math.random()) {
  for (let i = 0; i < n; i++) world.enemyShoot(e.x, e.y, off + i * TAU / n, speed, Math.round(e.damage * dmgMul), col || e.def.bulletColor || e.def.color, 3);
}
const ENEMY_TRAITS = {
  // 도약: 거리를 두면 잠깐 웅크렸다가(조준선 표시) 플레이어 자리로 뛰어듦
  pounce: {
    tick(e, dt, world, ctx) {
      const t = e.tp || (e.tp = { cd: 1.2 + Math.random() * 2 }), p = world.player;
      if (e.state === 'POUNCE') { if (e.stateTime >= 0.5) { e.setState('LEAP'); t.hit = false; } return true; }
      if (e.state === 'LEAP') {
        const hit = moveAndCollide(e, t.vx * dt, t.vy * dt, world.map);
        world.eachTarget((q) => { if (Math.hypot(q.x - e.x, q.y - e.y) < e.radius + q.half + 4) world.hitOnce(t, 'hits', q, () => world.damagePlayer(e.damage)); });
        if (e.stateTime >= 0.3 || hit.x || hit.y) { world.effects.ring(e.x, e.y, 14, e.def.color); t.cd = 3 + Math.random() * 1.5; t.hits = null; e.setState('RECOVERY'); }
        return true;
      }
      t.cd -= dt;
      if (e.state === 'CHASE' && t.cd <= 0 && ctx.playerAlive && ctx.dist > 45 && ctx.dist < 130 && hasLineOfSight(e, p, world.map)) {
        const sp = Math.min(440, (ctx.dist + 12) / 0.3); e.aimAng = Math.atan2(ctx.dy, ctx.dx); t.vx = Math.cos(e.aimAng) * sp; t.vy = Math.sin(e.aimAng) * sp;
        e.setState('POUNCE'); return true;
      }
      return false;
    }
  },
  // 충격파: 근접 공격과 함께 느린 탄 고리
  shockwave: { attack(e, world) { traitRing(world, e, 8, 90, null, 0.6); } },
  // 단말마: 처치되면 탄이 사방으로 흩어짐
  deathBurst: { death(e, world) { traitRing(world, e, 8, 105, null, 0.7); } },
  // 분열: 처치되면 작은 개체 둘로 갈라짐 (작은 개체는 다시 갈라지지 않음)
  splitDeath: {
    death(e, world) {
      if (e.small || !world.spawnEnemy) return;
      for (const s of [-1, 1]) { const ox = overlapsSolid(e.x + s * 8, e.y, e.half, world.map) ? 0 : s * 8, c = world.spawnEnemy(e.def.id, e.x + ox, e.y, e.room); /* 벽 속에 생기지 않게 */ c.small = true; c.maxHp = c.hp = Math.max(1, Math.round(e.maxHp * 0.3)); c.state = 'CHASE'; c.attackCd = 0.8; }
    }
  },
  // 덫 놓기: 지나간 자리에 잠시 뒤 터지는 장판
  minelay: {
    tick(e, dt, world, ctx) {
      e.mineT = (e.mineT ?? 1 + Math.random() * 2) - dt;
      if (e.mineT <= 0 && ctx.playerAlive) { e.mineT = 2.6 + Math.random(); world.hazards.push(new Hazard(e.x, e.y, { r: 16, delay: 1.4, damage: Math.round(e.damage * 0.8), bullets: 0, color: e.def.bulletColor || e.def.color })); }
      return false;
    }
  },
  // 돌진 자국: 돌진하는 동안 양옆으로 느린 탄을 흘림
  dashTrail: {
    dash(e, dt, world) {
      e.trailT = (e.trailT || 0) - dt; if (e.trailT > 0) return;
      e.trailT = 0.07; const a = Math.atan2(e.dashY, e.dashX), col = e.def.bulletColor || e.def.color;
      for (const s of [-1, 1]) world.enemyShoot(e.x, e.y, a + s * Math.PI / 2, 60, Math.round(e.damage * 0.6), col, 3);
    }
  },
  // 돌진 끝 폭발: 멈추는 자리에서 탄 고리
  dashBurst: { dashEnd(e, world) { traitRing(world, e, 10, 115, null, 0.7); return false; } },
  // 연속 돌진: 한 번 더 방향을 바꿔 돌진
  redash: {
    dashEnd(e, world, ctx) {
      if ((e.redashN || 0) >= 1 || !ctx.playerAlive) { e.redashN = 0; return false; }
      e.redashN = (e.redashN || 0) + 1; e.dashX = ctx.dx / ctx.dist; e.dashY = ctx.dy / ctx.dist; return true;
    }
  },
  // 섞어 쓰기 (술사): 원형 탄막 → 조준 부채꼴 → 발밑 장판 순서로 번갈아
  castMix: {
    fire(e, world, ctx) {
      const n = e.castN = ((e.castN || 0) + 1) % 3, col = e.def.bulletColor, p = world.player;
      if (n === 1) { const a = Math.atan2(ctx.dy, ctx.dx); for (let i = 0; i < 5; i++) world.enemyShoot(e.x, e.y - 4, a + (i - 2) * 0.16, e.def.bulletSpeed * 1.5, e.damage, col, 3); return true; }
      if (n === 2) { for (let i = 0; i < 3; i++) { const a = Math.random() * TAU, r = i ? 26 + Math.random() * 20 : 0; world.hazards.push(new Hazard(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, { r: 20, delay: 0.9, damage: e.damage, bullets: 0, color: col })); } return true; }
      return false;
    }
  },
  // 장판 시전: 탄막과 함께 플레이어 발밑에 장판 하나
  zoneCast: { fire(e, world) { const p = world.player; world.hazards.push(new Hazard(p.x, p.y, { r: 22, delay: 1.1, damage: e.damage, bullets: 0, color: e.def.bulletColor || e.def.color })); return false; } },
  // 부채 쓸기 (포탑): 두 번에 한 번은 넓은 부채꼴로
  turretSweep: {
    fire(e, world) {
      if ((e.fireN = (e.fireN || 0) + 1) % 2) return false;
      for (let i = 0; i < 11; i++) world.enemyShoot(e.x, e.y - 4, e.aimAng + (i - 5) * 0.12, e.def.bulletSpeed * 0.75, e.damage, e.def.bulletColor, 3);
      return true;
    }
  },
  // 고리 (포탑): 세 번에 한 번은 사방으로 두 겹 고리
  turretRing: {
    fire(e, world) {
      if ((e.fireN = (e.fireN || 0) + 1) % 3) return false;
      traitRing(world, e, 14, e.def.bulletSpeed * 0.55, e.def.bulletColor, 1); traitRing(world, e, 14, e.def.bulletSpeed * 0.42, e.def.bulletColor, 1, Math.PI / 14);
      return true;
    }
  },
  // 잔상: 순간이동한 원래 자리가 잠시 뒤 터짐
  afterimage: { teleport(e, world, ox, oy) { world.hazards.push(new Hazard(ox, oy, { r: 22, delay: 0.6, damage: e.damage, bullets: 6, color: e.def.bulletColor })); } },
  // 연속 이동: 사격 뒤 곧바로 한 번 더 순간이동해 쏨
  doubleTap: { attack(e) { e.tap2 = !e.tap2; if (e.tap2) e.attackCd = 0.55; } }
};

// update()가 true를 돌려주면 패턴 종료
// 보스 광선 길이: 벽에서 멈춤
function beamLength(e, a, map) {
  const L = 420, t = sweepWall(e.x, e.y, e.x + Math.cos(a) * L, e.y + Math.sin(a) * L, map, 4);
  return t < 0 ? L : t * L;
}
// 궁극기 강화: 같은 패턴을 더 크게 (탄 수·겹·시간·끌어당김 증가, 간격·예고 단축)
function boostUltimate(P) {
  const q = Object.assign({}, P);
  if (q.rings) q.rings += 1; if (q.count) q.count = Math.round(q.count * 1.15); if (q.bullets) q.bullets += 2; if (q.arms && q.type !== 'vortex') q.arms += 1;
  if (q.duration) q.duration *= 1.15; if (q.pull) q.pull *= 1.1; if (q.spin) q.spin *= 1.1; if (q.delay) q.delay *= 0.92; if (q.interval) q.interval *= 0.9;
  if (q.gap) q.gap = Math.max(4, q.gap - 1); if (q.volleys) q.volleys += 2; if (q.dashes) q.dashes += 1; if (q.chain !== undefined) q.chain += 1;
  return q;
}
// 궁극기가 끝날 때: 피해 원래대로 + 사방으로 터지는 마무리 탄막
function endUltimate(e, world) {
  e.ult = false; e.damage = e.dmg0;
  const n = 28, col = (e.pat && e.pat.color) || '#ff5a5a';
  for (let i = 0; i < n; i++) world.enemyShoot(e.x, e.y, i * TAU / n + 0.11, e.def.bulletSpeed * 1.15, e.damage, col, 4);
  world.effects.ring(e.x, e.y, 60, '#ffffff'); world.effects.ring(e.x, e.y, 40, col); if (world.effects.rays) world.effects.rays(e.x, e.y, col, 16, 90, 0.6);
  world.addShake(0.35, 6); SFX.play('explode', 0.05);
}
const BOSS_PATTERNS = {
  // 방벽 행진 (갤러해드): 방패가 향한 방향으로, 가로로 늘어선 탄의 벽이 여러 겹 밀려옴 — 겹마다 다른 자리에 빈틈
  rampart: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.waves) {
        const a = e.shieldAng != null ? e.shieldAng : Math.atan2(world.player.y - e.y, world.player.x - e.x), nx = -Math.sin(a), ny = Math.cos(a), h = (P.width - 1) / 2, gap = randInt(1, P.width - P.gapN - 1);
        for (let i = 0; i < P.width; i++) { if (i >= gap && i < gap + P.gapN) continue; const o = (i - h) * P.step;
          const b = new EnemyBullet(e.x + Math.cos(a) * 14 + nx * o, e.y + Math.sin(a) * 14 + ny * o, Math.cos(a) * P.speed, Math.sin(a) * P.speed, e.damage, P.color, 4); b.life = 4; world.enemyBullets.push(b); }
        world.effects.ring(e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14, 18, P.color); d.shots++; d.timer = P.interval / spd;
      }
      return d.shots >= P.waves && d.timer <= 0;
    }
  },
  // 시즈 페릴러스 (갤러해드의 보구): 방패를 세우고 성채가 됨 — 그동안 모든 피해 무효, 방 가장자리에서 틈 있는 고리가 계속 좁혀 오고 보스에게서도 탄이 퍼짐 → 끝날 때 크게 터짐. 쓰는 동안 페이즈 전환 없음
  perilous: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, r = e.room, fx = world.effects; d.t = (d.t || 0) + dt; d.lock = true;
      if (d.t < P.charge) { if (Math.random() < 0.7) { const a = Math.random() * TAU; fx.part(e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26, -Math.cos(a) * 60, -Math.sin(a) * 60, { color: '#ffffff', life: 0.35, size: 2, size2: 0, drag: 0, add: true }); } return false; }
      const T = d.t - P.charge;
      if (T < P.duration) {
        e.negateT = Math.max(e.negateT || 0, 0.15); /* 성채: 피해 무효 (하얀 빛) */
        if (!d.on) { d.on = true; d.ringT = 0; d.burstT = 0.3; d.rings = 0; fx.rays(e.x, e.y, '#ffffff', 18, 90, 0.7); world.addShake(0.3, 5); SFX.play('excal'); }
        d.ringT -= dt; if (d.ringT <= 0 && d.rings < P.rings) { d.ringT = P.ringEvery; d.rings++;
          const c = world.map.tileCenter(r.cx, r.cy), R = Math.min(r.w, r.h) * TILE / 2 - 14, gapAt = randInt(0, P.count - 1);
          for (let i = 0; i < P.count; i++) { if (((i - gapAt + P.count) % P.count) < P.gap) continue; const a = i * TAU / P.count;
            const b = new EnemyBullet(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R, -Math.cos(a) * P.ringSpeed, -Math.sin(a) * P.ringSpeed, e.damage, P.color, 4); b.life = R / P.ringSpeed + 0.2; world.enemyBullets.push(b); } }
        d.burstT -= dt; if (d.burstT <= 0) { d.burstT = P.burstEvery; const a0 = Math.random() * TAU; for (let i = 0; i < P.burst; i++) world.enemyShoot(e.x, e.y, a0 + i * TAU / P.burst, e.def.bulletSpeed * 0.8, e.damage, '#ffd8d8', 3); }
        return false;
      }
      if (!d.done) { d.done = true; for (let i = 0; i < P.final; i++) world.enemyShoot(e.x, e.y, i * TAU / P.final, e.def.bulletSpeed, Math.round(e.damage * 1.1), P.color, 4); fx.ring(e.x, e.y, 60, '#ffffff'); world.addShake(0.3, 5); }
      if (T >= P.duration + 0.5) { d.lock = false; return true; }
      return false;
    }
  },
  // 부정의 원 (가레스): 플레이어 자리와 그 주변에 하얀 원(안에서는 공격·스킬 불가)을 깔고, 원 밖으로 피하는 동안 조준 사격
  denyfield: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player, r = e.room; d.timer -= dt;
      if (!d.placed) { d.placed = true; d.timer = 0.5;
        for (let i = 0; i < P.zones; i++) { const a = Math.random() * TAU, q = i === 0 ? 0 : 30 + Math.random() * P.around;
          const x = clamp(p.x + Math.cos(a) * q, r.x0 * TILE + P.zr, (r.x0 + r.w) * TILE - P.zr), y = clamp(p.y + Math.sin(a) * q, r.y0 * TILE + P.zr, (r.y0 + r.h) * TILE - P.zr);
          world.hazards.push(new DenyZone(x, y, { r: P.zr, delay: P.life, color: P.color })); }
        world.effects.ring(e.x, e.y, 26, '#ffffff'); SFX.play('magic', 0.05); }
      if (d.timer <= 0 && d.shots < P.volleys) { const base = Math.atan2(p.y - e.y, p.x - e.x), h = (P.count - 1) / 2;
        for (let i = 0; i < P.count; i++) world.enemyShoot(e.x, e.y, base + (i - h) * P.spread, e.def.bulletSpeed, e.damage, P.color, 3);
        d.shots++; d.timer = 0.42 / spd; }
      return d.shots >= P.volleys && d.timer <= 0;
    }
  },
  // 보마인 (가레스의 보구, '고운 손'): 빛을 모은 뒤 플레이어 둘레를 돌며 여러 번 순간이동 — 나타날 때마다 부채꼴 사격, 마지막에 사방으로 터짐. 쓰는 동안 페이즈 전환 없음
  beaumains: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player, r = e.room, fx = world.effects; d.t = (d.t || 0) + dt; d.lock = true;
      if (d.t < P.charge) { if (Math.random() < 0.7) { const a = Math.random() * TAU; fx.part(e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, -Math.cos(a) * 50, -Math.sin(a) * 50, { color: '#ffffff', life: 0.35, size: 2, size2: 0, drag: 0, add: true }); } d.a0 = d.a0 ?? Math.random() * TAU; return false; }
      d.timer = (d.timer ?? 0) - dt;
      if (d.timer <= 0 && d.shots < P.blinks) {
        const a = d.a0 + d.shots * (TAU / P.blinks) * 1.5, x = clamp(p.x + Math.cos(a) * P.ring, r.x0 * TILE + 20, (r.x0 + r.w) * TILE - 20), y = clamp(p.y + Math.sin(a) * P.ring, r.y0 * TILE + 20, (r.y0 + r.h) * TILE - 20);
        fx.ring(e.x, e.y, 16, '#ffffff'); if (!world.map.isSolidAt(x, y)) { e.x = x; e.y = y; }
        fx.ring(e.x, e.y, 22, P.color); SFX.play('swing', 0.04);
        const base = Math.atan2(p.y - e.y, p.x - e.x), h = (P.count - 1) / 2;
        for (let i = 0; i < P.count; i++) world.enemyShoot(e.x, e.y, base + (i - h) * (P.spread / P.count), P.speed, Math.round(e.damage * 1.1), i % 2 ? P.color : '#ffffff', 3);
        d.shots++; d.timer = P.interval / spd;
        if (d.shots >= P.blinks) { d.endAt = d.t + 0.45; }
      }
      if (d.endAt && d.t >= d.endAt && !d.burst) { d.burst = true; for (let i = 0; i < P.final; i++) world.enemyShoot(e.x, e.y, i * TAU / P.final, e.def.bulletSpeed, e.damage, P.color, 4); fx.rays(e.x, e.y, '#ffffff', 16, 80, 0.6); world.addShake(0.25, 4); }
      if (d.burst && d.t >= d.endAt + 0.5) { d.lock = false; return true; }
      return false;
    }
  },
  // 폭주 돌진 (모드레드): 짧게 노린 뒤 플레이어 쪽으로 돌진, 지나간 자리에 붉은 번개가 차례로 떨어지고 멈춘 곳에서 사방으로 탄 — 여러 번 연속
  rampage: {
    begin(e) { e.pd.n = 0; e.pd.phase = 'aim'; e.pd.pt = 0; },
    update(e, dt, world, ctx, spd) {
      const d = e.pd, P = e.pat, p = world.player; d.pt += dt;
      if (d.phase === 'aim') {
        const dx = p.x - e.x, dy = p.y - e.y, dd = Math.hypot(dx, dy) || 1; e.dashX = dx / dd; e.dashY = dy / dd;
        if (d.pt >= P.aim / spd) { d.phase = 'dash'; d.pt = 0; d.went = 0; d.lastStep = 0; e.hits = null; world.effects.ring(e.x, e.y, 16, P.color); }
        return false;
      }
      const mv = P.speed * dt, hit = moveAndCollide(e, e.dashX * mv, e.dashY * mv, world.map); d.went += mv;
      world.eachTarget((q) => { if (Math.hypot(q.x - e.x, q.y - e.y) < e.radius + q.half + 3) world.hitOnce(e, 'hits', q, () => world.damagePlayer(Math.round(e.damage * 1.2))); });
      if (d.went - d.lastStep >= P.step) { d.lastStep = d.went; world.hazards.push(new Hazard(e.x, e.y, { r: P.radius, delay: P.delay, damage: e.damage, bullets: 0, color: P.color })); /* 붉은 번개 자국 */
        world.effects.part(e.x, e.y, randInt(-20, 20), -30, { color: '#ffb0b0', life: 0.3, size: 2, size2: 0, drag: 1, add: true }); }
      if (hit.x || hit.y || d.went >= P.dist || d.pt > 0.7) {
        for (let i = 0; i < P.burst; i++) world.enemyShoot(e.x, e.y, i * TAU / P.burst + Math.random() * 0.3, e.def.bulletSpeed, e.damage, P.color, 3);
        world.addShake(0.15, 3); world.effects.ring(e.x, e.y, 26, P.color); d.n++; d.phase = 'aim'; d.pt = 0;
      }
      return d.n >= P.dashes;
    }
  },
  // 클래런트 (모드레드의 보구): 검을 들어 붉은 번개를 모음(조준선 표시) → 플레이어를 천천히 따라가는 굵은 붉은 광선, 끝나면 광선 자리를 따라 번개가 차례로 떨어짐. 쓰는 동안 페이즈 전환 없음
  clarent: {
    begin(e, world, ctx) { const a = Math.atan2(ctx.dy, ctx.dx); e.pd.ang = a; e.laser = { angs: [a], width: e.pat.width, color: e.pat.color, live: false }; },
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player, fx = world.effects; d.t = (d.t || 0) + dt; d.lock = true;
      const want = Math.atan2(p.y - e.y, p.x - e.x); let df = want - d.ang; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
      if (d.t < P.charge) { /* 붉은 번개를 모으는 동안 조준선이 플레이어를 따라감 */
        d.ang += clamp(df, -2.5 * dt, 2.5 * dt); e.laser.angs[0] = d.ang; e.laser.live = false;
        if (Math.random() < 0.8) { const a = Math.random() * TAU, q = 24 + Math.random() * 16; fx.part(e.x + Math.cos(a) * q, e.y - 6 + Math.sin(a) * q, -Math.cos(a) * q * 2.5, -Math.sin(a) * q * 2.5, { color: Math.random() < 0.5 ? '#ff3a3a' : '#ffffff', life: 0.3, size: 2, size2: 0, drag: 0, add: true }); }
        return false;
      }
      if (d.t < P.charge + P.duration) { /* 광선: 천천히 따라감 */
        if (!d.fired) { d.fired = true; world.addShake(0.4, 7); world.screenFlash = 0.2; world.flashColor = '255,60,60'; SFX.play('excal'); }
        d.ang += clamp(df, -P.turn * dt, P.turn * dt); e.laser.angs[0] = d.ang; e.laser.live = true;
        const len = beamLength(e, d.ang, world.map), ex = e.x + Math.cos(d.ang) * len, ey = e.y + Math.sin(d.ang) * len; d.len = len;
        world.eachTarget((q) => { if (segmentCircleHit(e.x, e.y, ex, ey, q.x, q.y, P.width + q.half) >= 0) world.damagePlayer(Math.round(e.damage * 1.3)); });
        if (Math.random() < 0.6) { const k = Math.random() * len; fx.part(e.x + Math.cos(d.ang) * k, e.y + Math.sin(d.ang) * k, randInt(-40, 40), randInt(-40, 40), { color: '#ffb0b0', life: 0.25, size: 2, size2: 0, drag: 2, add: true }); }
        if (Math.floor(d.t * 10) !== Math.floor((d.t - dt) * 10)) SFX.play('beam', 0.08);
        return false;
      }
      if (!d.struck) { d.struck = true; e.laser = null; /* 광선 자리를 따라 번개 */
        for (let i = 1; i <= P.strikes; i++) { const k = (d.len || 200) * i / P.strikes; world.hazards.push(new Hazard(e.x + Math.cos(d.ang) * k, e.y + Math.sin(d.ang) * k, { r: P.radius, delay: P.delay + i * 0.04, damage: Math.round(e.damage * 1.1), bullets: P.bullets, color: P.color })); } }
      if (d.t >= P.charge + P.duration + P.delay + 0.6) { d.lock = false; return true; }
      return false;
    }
  },
  // 되돌아오는 고리 (트리스탄): 틈 있는 원형 화살을 쏘고, flip초 뒤 모든 화살이 방향을 뒤집어 보스 쪽으로 되돌아옴 (지나간 틈으로 다시 피해야 함)
  reverse: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.rings) {
        const gapAt = randInt(0, P.count - 1);
        for (let i = 0; i < P.count; i++) { if (((i - gapAt) % P.count + P.count) % P.count < P.gap) continue;
          const a = i * TAU / P.count + d.shots * 0.11, b = new EnemyBullet(e.x, e.y, Math.cos(a) * P.speed, Math.sin(a) * P.speed, e.damage, P.color, 3); b.flipT = P.flip / spd; b.life = 5; world.enemyBullets.push(b); }
        world.effects.ring(e.x, e.y, 22, P.color); d.shots++; d.timer = (P.interval || 0.5) / spd;
      }
      return d.shots >= P.rings && d.timer <= 0;
    }
  },
  // 페일노트 (트리스탄의 보구): 활을 당겨 플레이어를 조준(이동 없음) → 부채꼴 화살 + 플레이어를 끝까지 쫓는 필중의 화살을 여러 번. 쓰는 동안 페이즈 전환 없음
  failnot: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player, fx = world.effects; d.t = (d.t || 0) + dt; d.lock = true; d.list = d.list || [];
      if (d.t < P.draw) { /* 조준: 플레이어 위에 붉은 조준선 */
        d.warn = (d.warn || 0) - dt; if (d.warn <= 0) { d.warn = 0.15; fx.ring(p.x, p.y, 14 - d.t * 6, P.color); }
        if (Math.random() < 0.6) { const a = Math.random() * TAU; fx.part(e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, -Math.cos(a) * 50, -Math.sin(a) * 50, { color: P.color, life: 0.35, size: 1.5, size2: 0, drag: 0, add: true }); }
        return false;
      }
      d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.volleys) {
        const base = Math.atan2(p.y - e.y, p.x - e.x);
        for (let i = 0; i < P.fan; i++) world.enemyShoot(e.x, e.y, base + (i / (P.fan - 1) - 0.5) * P.spread, P.speed * 1.2, e.damage, '#ffffff', 3);
        for (let i = 0; i < P.homing; i++) { const a = base + (i / (P.homing - 1) - 0.5) * 2.4, b = new EnemyBullet(e.x, e.y, Math.cos(a) * P.speed, Math.sin(a) * P.speed, Math.round(e.damage * 1.1), P.color, 4);
          b.homeT = P.homeT; b.noFlip = true; b.life = 4; world.enemyBullets.push(b); d.list.push(b); }
        fx.ring(e.x, e.y, 26, P.color); SFX.play('magic', 0.05); d.shots++; d.timer = P.interval / spd;
      }
      for (const b of d.list) if (b.alive && b.homeT > 0) { /* 필중: 플레이어 쪽으로 휘어 들어감 */
        b.homeT -= dt; const want = Math.atan2(p.y - b.y, p.x - b.x), cur = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy);
        let df = want - cur; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
        const na = cur + clamp(df, -P.turn * dt, P.turn * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
      if (d.shots >= P.volleys && d.list.every((b) => !b.alive || !(b.homeT > 0))) { d.lock = false; return true; }
      return false;
    }
  },
  // 작은 태양 (가웨인): 보스 위에 생긴 태양이 플레이어를 천천히 쫓으며 사방으로 탄을 뿌리다가, 멈춘 자리에서 터짐
  solar: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player, fx = world.effects; d.t = (d.t || 0) + dt;
      if (!d.sun) { d.sun = { x: e.x, y: e.y - 14 }; d.timer = 0.2; fx.ring(e.x, e.y - 14, 18, P.color); }
      const s = d.sun;
      if (d.t < P.duration) {
        const dx = p.x - s.x, dy = p.y - s.y, dd = Math.hypot(dx, dy) || 1; s.x += dx / dd * P.speed * spd * dt; s.y += dy / dd * P.speed * spd * dt;
        d.timer -= dt; if (d.timer <= 0) { d.timer += P.interval / spd; const a0 = Math.random() * TAU; for (let i = 0; i < P.bullets; i++) world.enemyShoot(s.x, s.y, a0 + i * TAU / P.bullets, e.def.bulletSpeed * 0.7, e.damage, P.color, 3); }
        fx.part(s.x, s.y, 0, 0, { color: '#ffffff', life: 0.08, size: 5, size2: 3, drag: 0, add: true }); fx.part(s.x, s.y, 0, 0, { color: P.color, life: 0.12, size: 9, size2: 6, drag: 0, add: true });
        if (Math.random() < 0.5) { const a = Math.random() * TAU; fx.part(s.x + Math.cos(a) * 8, s.y + Math.sin(a) * 8, Math.cos(a) * 30, Math.sin(a) * 30, { color: '#ffe9a0', life: 0.3, size: 1.5, size2: 0, drag: 1, add: true }); }
        return false;
      }
      world.hazards.push(new Hazard(s.x, s.y, { r: P.radius, delay: 0.55, damage: Math.round(e.damage * 1.3), bullets: P.burst, color: P.color }));
      fx.ring(s.x, s.y, P.radius, '#ffffff'); return true;
    }
  },
  // 갈라틴 (가웨인의 보구): 검을 들어 머리 위에 큰 태양을 만듦(이동 없음) → 플레이어 쪽으로 불꽃 부채꼴 3파 + 태양이 플레이어 자리에 떨어져 대폭발. 쓰는 동안 페이즈 전환 없음
  galatine: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player, fx = world.effects; d.t = (d.t || 0) + dt; d.lock = true;
      const r = e.room, tx = clamp(p.x, r.x0 * TILE + 16, (r.x0 + r.w) * TILE - 16), ty = clamp(p.y, r.y0 * TILE + 16, (r.y0 + r.h) * TILE - 16);
      if (d.t < P.charge) { /* 태양을 모음 */
        const k = d.t / P.charge, sy = e.y - 30, R = 4 + k * 14; d.tx = tx; d.ty = ty;
        fx.part(e.x, sy, 0, 0, { color: '#ffffff', life: 0.08, size: R * 0.7, size2: R * 0.5, drag: 0, add: true }); fx.part(e.x, sy, 0, 0, { color: P.color, life: 0.1, size: R * 1.3, size2: R, drag: 0, add: true });
        if (Math.random() < 0.7) { const a = Math.random() * TAU, q = 30 + Math.random() * 20; fx.part(e.x + Math.cos(a) * q, sy + Math.sin(a) * q, -Math.cos(a) * q * 2, -Math.sin(a) * q * 2, { color: '#ffd870', life: 0.4, size: 2, size2: 0, drag: 0, add: true }); }
        d.warn = (d.warn || 0) - dt; if (d.warn <= 0) { d.warn = 0.25; fx.ring(tx, ty, P.radius, '#ff7a3a'); }
        return false;
      }
      if (!d.dropped) { d.dropped = true; d.timer = 0; /* 태양이 떨어짐 */
        world.hazards.push(new Hazard(d.tx, d.ty, { r: P.radius, delay: 0.95, damage: Math.round(e.damage * 1.6), bullets: P.bullets, color: P.color }));
        fx.rays(e.x, e.y - 30, '#ffd870', 18, 90, 0.7); world.addShake(0.3, 5); SFX.play('excal'); }
      d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.waves) { /* 불꽃 부채꼴 */
        const base = Math.atan2(p.y - e.y, p.x - e.x), n = P.count;
        for (let i = 0; i < n; i++) world.enemyShoot(e.x, e.y, base + (i / (n - 1) - 0.5) * P.fan + (d.shots % 2 ? P.fan / n / 2 : 0), P.speed * (1 + d.shots * 0.12), Math.round(e.damage * 1.1), i % 3 ? P.color : '#ffffff', 4);
        fx.ring(e.x, e.y, 30, P.color); d.shots++; d.timer = P.interval / spd;
      }
      if (d.shots >= P.waves && d.t >= P.charge + 1.1) { d.lock = false; return true; }
      return false;
    }
  },
  // 십자 성창: 플레이어 자리를 중심으로 십자(+)·엑스(×) 모양 줄을 따라 빛의 창이 꽂힘 → 잠시 뒤 터짐 (줄 사이로 피해야 함), 매 파마다 플레이어를 다시 노림
  cross: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player, r = e.room; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.waves) {
        const cx = clamp(p.x, r.x0 * TILE + 12, (r.x0 + r.w) * TILE - 12), cy = clamp(p.y, r.y0 * TILE + 12, (r.y0 + r.h) * TILE - 12), off = d.shots % 2 ? Math.PI / 4 : 0;
        const put = (x, y) => { if (!world.map.isSolidAt(x, y)) world.hazards.push(new Hazard(x, y, { r: P.radius, delay: P.delay, damage: Math.round(e.damage * 1.1), bullets: P.bullets || 0, color: P.color })); };
        put(cx, cy);
        for (let a = 0; a < 4; a++) { const ang = off + a * Math.PI / 2; for (let k = 1; k <= P.len; k++) put(cx + Math.cos(ang) * k * P.step, cy + Math.sin(ang) * k * P.step); }
        world.effects.ring(e.x, e.y, 24, P.color); SFX.play('magic', 0.05); d.shots++; d.timer = P.interval / spd;
      }
      return d.shots >= P.waves && d.timer <= 0;
    }
  },
  // ── 심층 보스용 새 패턴
  // 탄막 벽: 방 한쪽 끝에서 반대쪽으로 밀려오는 탄의 벽, 매번 다른 자리에 빈틈
  wall: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, r = e.room; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.waves) {
        const s0 = ((d.side0 ??= randInt(0, 3)) + d.shots) % 4, sides = P.pair ? [s0, s0 ^ 1] : [s0], sp = P.speed; /* pair: 마주 보는 두 벽에서 동시에 (닫히는 문) */
        for (const side of sides) { const horiz = side < 2, n = horiz ? r.w : r.h, gap = randInt(1, n - P.gap - 1);
        for (let i = 0; i < n; i++) { if (i >= gap && i < gap + P.gap) continue;
          const t = i + 0.5, x = horiz ? (r.x0 + t) * TILE : side === 2 ? (r.x0 + 0.6) * TILE : (r.x0 + r.w - 0.6) * TILE, y = horiz ? (side === 0 ? (r.y0 + 0.6) * TILE : (r.y0 + r.h - 0.6) * TILE) : (r.y0 + t) * TILE;
          const b = new EnemyBullet(x, y, horiz ? 0 : side === 2 ? sp : -sp, horiz ? (side === 0 ? sp : -sp) : 0, e.damage, P.color, 4); b.life = (horiz ? r.h : r.w) * TILE / sp + 0.3; world.enemyBullets.push(b); } }
        world.effects.ring(e.x, e.y, 26, P.color); d.shots++; d.timer = P.interval / spd;
      }
      return d.shots >= P.waves && d.timer <= 0;
    }
  },
  // 분열탄: 큰 탄을 플레이어 쪽으로 쏘고, 잠시 뒤 사방으로 터짐
  split: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, p = world.player; d.timer -= dt; d.list = d.list || []; d.t = (d.t || 0) + dt;
      if (d.timer <= 0 && d.shots < P.volleys) {
        const base = Math.atan2(p.y - e.y, p.x - e.x), h = (P.count - 1) / 2;
        for (let i = 0; i < P.count; i++) { const a = base + (i - h) * P.spread, b = new EnemyBullet(e.x, e.y, Math.cos(a) * P.speed, Math.sin(a) * P.speed, Math.round(e.damage * 1.2), P.color, 6); b.splitAt = d.t + P.splitAfter; world.enemyBullets.push(b); d.list.push(b); }
        d.shots++; d.timer = 0.45 / spd;
      }
      for (const b of d.list) if (b.alive && !b.split && d.t >= b.splitAt) { b.split = true; b.alive = false; world.effects.ring(b.x, b.y, 12, P.color);
        for (let k = 0; k < P.splitN; k++) world.enemyShoot(b.x, b.y, k * TAU / P.splitN + d.t, e.def.bulletSpeed * 0.75, e.damage, P.color, 3); }
      return d.shots >= P.volleys && d.list.every((b) => b.split || !b.alive);
    }
  },
  // 회전 고리: 보스 둘레에 탄이 돌며 넓어지다가 한꺼번에 바깥으로 날아감
  orbit: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd; d.t = (d.t || 0) + dt;
      if (!d.list) { d.list = []; for (let i = 0; i < P.count; i++) { const b = new EnemyBullet(e.x, e.y, 0, 0, e.damage, P.color, 4); b.life = 6; b.oa = i * TAU / P.count; world.enemyBullets.push(b); d.list.push(b); } }
      const k = Math.min(1, d.t / P.spinTime), R = 14 + (P.radius - 14) * k, rot = d.t * (P.spin || 3) * spd;
      if (d.t < P.spinTime) { for (const b of d.list) if (b.alive) { b.x = e.x + Math.cos(b.oa + rot) * R; b.y = e.y + Math.sin(b.oa + rot) * R; } return false; }
      for (const b of d.list) if (b.alive) { const a = b.oa + rot + (P.curve || 0.35); b.vx = Math.cos(a) * P.speed; b.vy = Math.sin(a) * P.speed; b.life = 3; }
      world.effects.ring(e.x, e.y, P.radius, P.color); SFX.play('react', 0.05); return true;
    }
  },
  // 탄막 비: 방 위쪽에서 탄이 비처럼 쏟아짐 (조금씩 비스듬히)
  rain: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd, r = e.room; d.timer -= dt; d.t = (d.t || 0) + dt;
      while (d.timer <= 0) { d.timer += P.interval / spd;
        const x = (r.x0 + 0.5 + Math.random() * (r.w - 1)) * TILE, y = (r.y0 + 0.6) * TILE, a = Math.PI / 2 + (P.slant || 0) * (Math.random() - 0.3);
        const b = new EnemyBullet(x, y, Math.cos(a) * P.speed, Math.sin(a) * P.speed, e.damage, P.color, 3); b.life = r.h * TILE / P.speed + 0.5; world.enemyBullets.push(b); }
      return d.t >= P.duration;
    }
  },
  // 롱고미니아드 (신령 롱고미니아드의 궁극기): 플레이어 자리로 빛의 창 → 빛의 탑이 끌어당기며 탄막 → 무너지며 대폭발 (반경 밖으로 피해야 함)
  rhongo: {
    begin(e, world) {
      const r = e.room, p = world.player, x = clamp(p.x, r.x0 * TILE + 16, (r.x0 + r.w) * TILE - 16), y = clamp(p.y, r.y0 * TILE + 16, (r.y0 + r.h) * TILE - 16);
      e.pd.tower = new BossRhongoTower(e, x, y, e.pat); world.zones.push(e.pd.tower);
    },
    update(e) { return !e.pd.tower.alive; }
  },
  // 추격 낙하: 플레이어가 서 있던 자리에 차례로 떨어지는 장판 (멈추면 맞음)
  meteor: {
    update(e, dt, world) {
      const P = e.pat, d = e.pd, p = world.player; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.count) {
        const r = e.room, x = clamp(p.x, r.x0 * TILE + 8, (r.x0 + r.w) * TILE - 8), y = clamp(p.y, r.y0 * TILE + 8, (r.y0 + r.h) * TILE - 8);
        world.hazards.push(new Hazard(x, y, { r: P.radius, delay: P.delay, damage: Math.round(e.damage * 1.2), bullets: P.bullets || 0, color: P.color }));
        d.shots++; d.timer = P.stagger;
      }
      return d.shots >= P.count && d.timer <= 0;
    }
  },
  // 퍼지는 고리: 보스에서 바깥으로 퍼지는 원형 탄막, 틈이 매번 돌아감
  ringOut: {
    update(e, dt, world, ctx, spd) {
      const P = e.pat, d = e.pd; d.timer -= dt;
      if (d.timer <= 0 && d.shots < P.rings) {
        const gapAt = (d.gap0 ?? (d.gap0 = randInt(0, P.count - 1))) + d.shots * Math.max(2, Math.round(P.count / 6));
        for (let i = 0; i < P.count; i++) { if (((i - gapAt) % P.count + P.count) % P.count < P.gap) continue; world.enemyShoot(e.x, e.y, i * TAU / P.count, P.speed || e.def.bulletSpeed, e.damage, P.color, 4); }
        d.shots++; d.timer = (P.interval || 0.5) / spd;
      }
      return d.shots >= P.rings && d.timer <= 0;
    }
  },
  // 창 세우기: 주위에 탄을 천천히 흩뿌려 멈춰 세운 뒤, 한꺼번에 플레이어를 향해 빠르게 발사
  lances: {
    update(e, dt, world) {
      const P = e.pat, d = e.pd, p = world.player; d.t = (d.t || 0) + dt;
      if (!d.list) { d.list = [];
        for (let i = 0; i < P.count; i++) { const a = i * TAU / P.count, b = new EnemyBullet(e.x, e.y, Math.cos(a) * 70, Math.sin(a) * 70, e.damage, P.color, 4); b.life = 4; world.enemyBullets.push(b); d.list.push(b); } }
      if (d.t < 0.45) return false;
      if (!d.stopped) { d.stopped = true; for (const b of d.list) { b.vx = 0; b.vy = 0; } world.effects.ring(e.x, e.y, 40, P.color); }
      if (d.t < (P.delay || 0.7)) return false;
      for (const b of d.list) if (b.alive) { const dx = p.x - b.x, dy = p.y - b.y, dd = Math.hypot(dx, dy) || 1; b.vx = dx / dd * (P.speed || 300); b.vy = dy / dd * (P.speed || 300); b.life = 2.5; }
      SFX.play('react', 0.05); return true;
    }
  },
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
      world.eachTarget((q) => { if (Math.hypot(q.x - e.x, q.y - e.y) < P.radius + q.half) world.damagePlayer(Math.round(e.damage * 1.5)); }); // 내려찍기: 범위 안의 모두
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
        if (d.pt >= 0.45 / enr) { d.phase = 'dash'; d.pt = 0; e.dashHit = false; e.hits = null; }
        return false;
      }
      const hit = moveAndCollide(e, e.dashX * P.speed * dt, e.dashY * P.speed * dt, world.map);
      world.eachTarget((q) => { if (Math.hypot(q.x - e.x, q.y - e.y) < e.radius + q.half + 3) world.hitOnce(e, 'hits', q, () => world.damagePlayer(Math.round(e.damage * 1.2))); });
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
      const segs = d.angs.map((a) => { const len = beamLength(e, a, world.map); return [e.x + Math.cos(a) * len, e.y + Math.sin(a) * len]; });
      world.eachTarget((q) => { for (const [ex, ey] of segs) if (segmentCircleHit(e.x, e.y, ex, ey, q.x, q.y, P.width + q.half) >= 0) { world.damagePlayer(e.damage); break; } }); // 광선: 닿은 모두
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
      world.eachTarget((q) => { if (q.state === 'DASH') return; const dx = q.x - e.x, dy = q.y - e.y, dd = Math.hypot(dx, dy) || 1; moveAndCollide(q, -dx / dd * P.pull * dt, -dy / dd * P.pull * dt, world.map); }); // 모두 끌어당김
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
  e.burn = Math.max(0, e.burn - dt); e.poison = Math.max(0, e.poison - dt); e.slow = Math.max(0, e.slow - dt); e.shock = Math.max(0, (e.shock || 0) - dt); e.blind = Math.max(0, (e.blind || 0) - dt); e.curse = Math.max(0, (e.curse || 0) - dt); if (e.markT > 0) e.markT -= dt; e.reactCd = Math.max(0, e.reactCd - dt);
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
  if (e.stunT > 0) { e.stunT -= dt; return; } // 엑스칼리버 빛에 맞아 경직
  if (e.chainT > 0) { e.chainT -= dt; return; } // 황금 사슬에 묶임: 이동·공격 정지 (지속 피해는 계속)
  const sdt = dt * e.speedMul; // 빙결 시 이동/행동 모두 느려짐
  e.stateTime += sdt;
  const p = world.player;
  const dx = p.x - e.x, dy = p.y - e.y;
  const hidden = p.hadesT > 0 && (!e.def.boss || p.hadesT > p.treasure.duration - p.treasure.bossDur); // 하데스의 투구: 적이 나를 못 찾음 (보스는 처음 몇 초만)
  const ctx = { dx, dy, dist: Math.hypot(dx, dy) || 0.001, playerAlive: p.state !== 'DEAD' && !hidden };
  if (!(e.state === 'ATTACK' && e.def.aiType === 'charger')) e.face = dx < 0 ? -1 : 1;
  e.attackCd = Math.max(0, e.attackCd - sdt * (e.blind > 0 ? (e.def.boss ? 0.8 : 0.55) : 1)); // 실명: 공격 준비가 느려짐
  const behavior = AI_BEHAVIORS[e.def.aiType];
  if (!behavior) throw new Error('알 수 없는 aiType: ' + e.def.aiType);
  if (e.def.traits && e.state !== 'DEAD' && traitOn(e, 'tick', sdt, world, ctx)) return; // 특성이 이번 프레임 행동을 맡음 (도약 등)
  behavior(e, sdt, world, ctx);
}
