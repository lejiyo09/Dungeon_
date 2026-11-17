'use strict';
// ════════════════════════════════════════════
// 무기 시스템
// ════════════════════════════════════════════
// 강화 단계만큼 공격력 보너스를 더한 피해 계산용 수치 (치명타 보너스 무기 포함)
function weaponMods(player, w) {
  const def = w.def, m = Object.assign({}, player.mods);
  m.attackBonus += (w.lv || 0) * BALANCE.upgrade.perLevel;
  if (def.critBonus) m.critChance = player.stats.critChance + def.critBonus;
  return m;
}
/* 사수 3진 스킬(탄환의 폭풍) 중: 총알이 2발씩 나란히 나감 */
function odDouble(player) { return player.overdrive > 0 && player.odDouble; }
function weaponTitle(w) { return w.def.name + (w.lv ? ` +${w.lv}` : ''); }
class WeaponInstance {
  constructor(def, lv = 0) { this.lv = lv; this.def = def; this.cooldown = 0; this.charge = 0; this.burstLeft = 0; this.burstTimer = 0; this.beamTick = 0; this.beamActive = false; this.beamEnd = null; }
}

class WeaponSystem {
  constructor(world) { this.world = world; this.noEnergyMsgT = 0; }
  noEnergy(player) {
    if (this.noEnergyMsgT <= 0) { this.world.effects.text(player.x, player.y - 18, '에너지 부족', '#7fb0ff'); this.noEnergyMsgT = 0.8; SFX.play('deny'); }
    this.world.noEnergyFlash = 0.4;
  }
  spend(player, cost) {
    if (player.overdrive > 0 || !cost) return true;
    cost *= 1 - (player.hero.energySave || 0); // 사수 패시브: 탄약 절약
    if (player.energy < cost) { this.noEnergy(player); return false; }
    player.energy -= cost; return true;
  }
  getFireRate(player, w) { return w.def.fireRate * (1 + player.stats.fireRateBonus + (player.overdrive > 0 ? 1 + (player.odRate || 0) : 0) + (player.solomon > 0 ? player.treasure.rate : 0)) * (w.def.spinUp ? 0.25 + 0.75 * Math.min(1, (w.spin || 0) / w.def.spinUp) : 1); }
  update(player, dt, input) {
    this.noEnergyMsgT = Math.max(0, this.noEnergyMsgT - dt);
    const w = player.weapon;
    for (const o of player.weapons) if (o !== w) { o.cooldown = Math.max(0, o.cooldown - dt); o.charge = 0; o.beamActive = false; o.burstLeft = 0; }
    if (!w) return;
    w.cooldown = Math.max(w.cooldown - dt, -STEP);
    if (player.state === 'DEAD' || player.castLock > 0 || player.denyT > 0) { w.beamActive = false; w.charge = 0; return; } // 시전 중엔 공격 불가 (가레스의 부정 장판 안도)
    if ((input.wasPressed('KeyQ') || input.wasPressed('Wheel')) && player.weapons.length > 1) {
      w.charge = 0; w.beamActive = false; w.burstLeft = 0;
      player.slot = (player.slot + 1) % player.weapons.length;
      player.weapon.cooldown = Math.max(player.weapon.cooldown, 0.15);
      return;
    }
    if (w.burstLeft > 0) {
      w.burstTimer -= dt;
      if (w.burstTimer <= 0) { this.shootGun(player, w); w.burstLeft--; w.burstTimer = w.def.burst.interval; }
    }
    const down = input.mouse.down;
    if (w.def.spinUp) w.spin = down ? Math.min(w.def.spinUp, (w.spin || 0) + dt) : 0; // 회전 기관총: 누를수록 연사 증가
    switch (w.def.type) {
      case 'gun': if (down && w.cooldown <= 0 && w.burstLeft === 0) this.fireGun(player, w); break;
      case 'melee': if (down && w.cooldown <= 0) this.fireMelee(player, w); break;
      case 'charge':
        if (down) {
          if (w.cooldown <= 0) {
            if (w.charge === 0 && !this.canPay(player, w.def.energyCost)) this.weakAttack(player, w); // 에너지 부족: 약한 공격
            else w.charge = Math.min(w.def.chargeTime, w.charge + dt * (1 + player.stats.fireRateBonus + (player.overdrive > 0 ? 1 + (player.odRate || 0) : 0)));
          }
        } else if (w.charge > 0) this.releaseCharge(player, w);
        break;
      case 'beam': this.updateBeam(player, w, dt, down); break;
    }
    if (!down) w.cooldown = Math.max(w.cooldown, 0);
  }
  canPay(player, cost) { return player.overdrive > 0 || !cost || player.energy >= cost * (1 - (player.hero.energySave || 0)); }
  // 에너지가 모자랄 때: 아주 약한 공격 (총·지팡이·활·광선은 작은 탄, 근접은 짧은 베기)
  weakAttack(player, w) {
    const world = this.world, A = BALANCE.weakAttack, a = Math.atan2(player.aim.y, player.aim.x), dmg = world.skillDmg(A.damage);
    w.cooldown = A.interval; this.noEnergy(player);
    if (w.def.type === 'melee') {
      for (const e of world.enemies) { if (!e.targetable) continue; const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
        if (d - e.radius <= 22 && (d < 4 || angleDiff(Math.atan2(dy, dx), a) < 0.9)) world.damageEnemy(e, { damage: dmg, mods: player.mods, knockback: 2 }, dx / (d || 1), dy / (d || 1)); }
      player.swing = { t: 0, dur: 0.14, ang: a, arc: 1.6, thrust: false }; world.effects.slash(player.x, player.y - 1, a, 20, 1.6, 'rgba(200,200,210,0.7)'); SFX.play('melee', 0.08);
    } else {
      world.projectiles.push(new Projectile({ x: player.x + player.aim.x * 8, y: player.y + player.aim.y * 8, dx: player.aim.x, dy: player.aim.y, speed: 300, range: 200,
        damage: dmg, pierce: 0, knockback: 1, mods: player.mods, color: '#c8c8d0', size: 1 }));
      SFX.play('magic', 0.08);
    }
  }
  fireGun(player, w) {
    if (!this.canPay(player, w.def.energyCost)) { this.weakAttack(player, w); return; }
    if (!this.spend(player, w.def.energyCost)) return;
    w.cooldown += 1 / this.getFireRate(player, w);
    if (w.def.summon) { // 드론 소환: 최대 수를 넘으면 가장 오래된 드론이 사라짐
      const mine = this.world.allies.filter((a) => a instanceof Drone && a.def === w.def);
      while (mine.length >= w.def.summon.max) mine.shift().alive = false;
      const dr = new Drone(player, w.def, mine.length); dr.wmods = () => weaponMods(player, w); this.world.allies.push(dr);
      this.world.effects.sparkle(player.x, player.y - 10, w.def.bulletColor); SFX.play('skill', 0.1);
      return;
    }
    if (w.def.meteor) { // 유성·화살비: 조준 지점(사거리 안)에 경고 후 낙하
      const M = w.def.meteor, mw = this.world.mouseWorld(), dx = mw.x - player.x, dy = mw.y - player.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, w.def.range / d);
      for (let i = 0; i < M.count; i++) {
        const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * M.spread;
        this.world.zones.push(new Strike(player.x + dx * k + Math.cos(a) * r, player.y + dy * k + Math.sin(a) * r * 0.75, M.delay + i * (M.stagger || 0), M.r,
          { damage: w.def.damage, mods: weaponMods(player, w), knockback: w.def.knockback, status: w.def.status || null }, w.def.bulletColor, !!M.arrow));
      }
      SFX.play(M.arrow ? 'bow' : 'magic'); player.recoil = 0.6; return;
    }
    if (w.def.trap) { // 덫 깔기: 조준 지점(사거리 안)에 덫을 던져 놓음, 최대 수를 넘으면 가장 오래된 덫이 사라짐
      const D = w.def.trap, mine = this.world.zones.filter((z) => z instanceof Trap && z.def === w.def && z.alive);
      while (mine.length >= D.max) mine.shift().alive = false;
      const mw = this.world.mouseWorld(), dx = mw.x - player.x, dy = mw.y - player.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, w.def.range / d);
      let tx = player.x + dx * k, ty = player.y + dy * k; const st = sweepWall(player.x, player.y, tx, ty, this.world.map);
      if (st >= 0) { tx = player.x + (tx - player.x) * Math.max(0, st - 0.05); ty = player.y + (ty - player.y) * Math.max(0, st - 0.05); } // 벽 앞에 떨어짐
      const t = new Trap(tx, ty, w.def, () => weaponMods(player, w)); this.world.zones.push(t);
      this.world.effects.dust(tx, ty); SFX.play('crate'); player.recoil = 0.5; return;
    }
    if (w.def.deploy) { // 포탑 설치: 최대 수를 넘으면 가장 오래된 포탑이 사라짐
      const D = w.def.deploy, mine = this.world.allies.filter((a) => a instanceof Turret && a.def === w.def);
      while (mine.length >= D.max) mine.shift().alive = false;
      let tx = player.x + player.aim.x * 14, ty = player.y + player.aim.y * 14;
      if (this.world.map.isSolidAt(tx, ty)) { tx = player.x; ty = player.y; }
      const t = new Turret(tx, ty, player, { damage: w.def.damage, life: D.life, rate: D.rate, range: w.def.range }); t.def = w.def; t.wmods = () => weaponMods(player, w);
      this.world.allies.push(t); this.world.effects.dust(tx, ty); SFX.play('crate'); return;
    }
    this.shootGun(player, w);
    if (w.def.burst) { w.burstLeft = w.def.burst.count - 1; w.burstTimer = w.def.burst.interval; }
  }
  shootGun(player, w, override = {}) {
    const def = w.def;
    w.shots = (w.shots || 0) + 1;
    const pow = def.nth && w.shots % def.nth.every === 0; // N번째 사격 강화
    if (pow) { override = Object.assign({}, override, { damage: (override.damage ?? def.damage) * def.nth.mult, size: (override.size || def.bulletSize || 1) + 1 });
      this.world.effects.ring(player.x + player.aim.x * 12, player.y + player.aim.y * 12, 10, '#ffffff'); SFX.play('crit', 0.05); }
    const base = Math.atan2(player.aim.y, player.aim.x);
    const spread = (def.spreadDeg || 0) * Math.PI / 180;
    const n = def.projectileCount || 1;
    if (def.orbit) { // 궤도 구슬: 플레이어 주위를 돌며 닿는 적을 공격
      const mine = this.world.projectiles.filter((p) => p.orbit && p.srcId === def.id && p.alive);
      while (mine.length >= def.orbit.max) mine.shift().alive = false;
      this.world.projectiles.push(new Projectile({ x: player.x, y: player.y, dx: 1, dy: 0, speed: 0, range: 9999, damage: def.damage,
        pierce: 99, knockback: def.knockback, mods: weaponMods(player, w), color: def.bulletColor, size: def.bulletSize || 2, rehit: def.rehit, srcId: def.id,
        orbit: { owner: player, r: def.orbit.r, speed: def.orbit.speed, life: def.orbit.life, ang: base } }));
      this.world.effects.sparkle(player.x, player.y, def.bulletColor); SFX.play('magic');
      return;
    }
    for (let i = 0; i < n; i++) {
      let ang = base + (Math.random() * 2 - 1) * spread;
      if (def.fanDeg && n > 1) ang = base + (i / (n - 1) - 0.5) * def.fanDeg * Math.PI / 180;
      if (def.parallel) ang = base + (Math.random() * 2 - 1) * spread;
      const off = def.parallel ? (i - (n - 1) / 2) * def.parallel : 0;
      const opt = Object.assign({
        x: player.x - Math.sin(base) * off, y: player.y - 1 + Math.cos(base) * off, dx: Math.cos(ang), dy: Math.sin(ang),
        boomerang: !!def.boomerang, split: def.split || null, pull: def.pull || null, rehit: def.rehit || 0, mine: def.mine || null,
        spriteDef: def.boomerang || def.spinSprite ? def : null,
        bubble: !!def.bubble, grenade: def.grenade || null, firework: def.firework || null, ricochet: def.ricochet || 0,
        puddle: def.puddle || null, arrow: !!def.arrow, trail: def.trail || null, grow: def.grow || 0,
        close: def.close || 0, execute: def.execute || 0, mark: def.mark || null, killEnergy: def.killEnergy || 0,
        speed: def.projectileSpeed, range: def.range, damage: def.damage, wdef: def, // wdef: 멀티 참가자 화면이 내 탄을 미리 그릴 수 있는지 판단
        pierce: def.pierce, knockback: def.knockback || 0,
        mods: weaponMods(player, w),
        explodeRadius: def.explodeRadius || 0, color: def.bulletColor, size: def.bulletSize || 1,
        homing: def.homing || 0, bounce: def.bounce || 0, chain: def.chain || null, status: def.status || null, flame: !!def.flame
      }, override);
      if (odDouble(player) && !opt.mine) { /* 같은 탄을 옆으로 조금 벌려 한 발 더 */
        const px = -Math.sin(base) * 3, py = Math.cos(base) * 3;
        this.world.projectiles.push(new Projectile(Object.assign({}, opt, { x: opt.x + px, y: opt.y + py })));
        opt.x -= px; opt.y -= py;
      }
      this.world.projectiles.push(new Projectile(opt));
    }
    const L = weaponLength(def) + 4; // 총구 위치에 섬광
    if (!def.flame) this.world.effects.muzzle(player.x + player.aim.x * L, player.y + 2 + player.aim.y * L * 0.75, base, def.bulletColor);
    player.recoil = Math.min(1, player.recoil + (def.damage * (def.projectileCount || 1) >= 40 ? 1 : def.fireRate > 8 ? 0.35 : 0.6));
    SFX.play(weaponSound(def), def.fireRate > 8 ? 0.06 : 0.03);
  }
  releaseCharge(player, w) {
    const def = w.def, k = 0.3 + 0.7 * Math.min(1, w.charge / def.chargeTime), full = w.charge >= def.chargeTime;
    w.charge = 0;
    if (!this.spend(player, def.energyCost)) return;
    w.cooldown = 1 / this.getFireRate(player, w);
    if (def.beamShot) { this.world.fireBeamShot(player, def, k); return; }
    this.shootGun(player, w, { damage: def.damage * k, speed: def.projectileSpeed * (0.6 + 0.4 * k),
      pierce: full ? def.pierce : 0, arrow: true, size: full ? 2 : 1 });
  }
  fireMelee(player, w) {
    const def = w.def, world = this.world;
    if (!this.canPay(player, def.energyCost)) { this.weakAttack(player, w); return; }
    if (!this.spend(player, def.energyCost)) return;
    w.cooldown += 1 / this.getFireRate(player, w);
    const ang = Math.atan2(player.aim.y, player.aim.x), arc = def.arcDeg * Math.PI / 180;
    if (def.lunge) { // 돌격 찌르기: 조준 방향으로 돌진하며 찌름
      world.effects.dust(player.x, player.y + 4);
      let L = def.lunge; // 앞에 적이 있으면 그 바로 앞에서 멈춤
      for (const e of world.enemies) {
        if (!e.targetable) continue;
        const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
        if (d < def.lunge + def.range && angleDiff(Math.atan2(dy, dx), ang) < 0.5) L = Math.min(L, Math.max(0, d - e.radius - 10));
      }
      moveAndCollide(player, player.aim.x * L, player.aim.y * L, world.map);
    }
    w.shots = (w.shots || 0) + 1;
    const pow = def.nth && w.shots % def.nth.every === 0; // N번째 휘두르기 강화
    const src = { damage: def.damage * (pow ? def.nth.mult : 1), knockback: def.knockback * (pow ? 1.5 : 1), status: def.status || (player.hybrid && Math.random() < player.hybrid.passiveChance ? player.hybrid.status : null), // 마검사: 근접 공격에 속성
      mods: weaponMods(player, w),
      execute: def.execute || 0, mark: def.mark || null, killEnergy: def.killEnergy || 0 };
    if (pow) { world.addShake(0.12, 3); SFX.play('crit', 0.05); }
    let hits = 0;
    for (const e of world.enemies) {
      if (!e.targetable) continue;
      const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
      if (d - e.radius > def.range) continue;
      if (d > 4 && angleDiff(Math.atan2(dy, dx), ang) > arc / 2 + Math.atan2(e.radius, d)) continue;
      world.damageEnemy(e, src, dx / (d || 1), dy / (d || 1)); hits++;
    }
    world.breakCratesInArc(player.x, player.y, ang, arc, def.range);
    if (def.slam) // 지면 강타: 내리친 자리에 충격파
      world.explodeAt(player.x + Math.cos(ang) * def.range * 0.8, player.y + Math.sin(ang) * def.range * 0.8, def.slam.r,
        { color: '#d8b070', hurtEnemies: true, src: { damage: def.slam.damage, mods: weaponMods(player, w), knockback: def.knockback, status: def.status || null } });
    if (def.wave) // 검기: 베면 관통하는 초승달 모양 기운이 날아감
      world.projectiles.push(new Projectile({ x: player.x + Math.cos(ang) * 10, y: player.y - 1 + Math.sin(ang) * 10, dx: Math.cos(ang), dy: Math.sin(ang),
        speed: def.wave.speed, range: def.wave.range, damage: def.wave.damage, pierce: 99, knockback: 3, mods: weaponMods(player, w), color: def.color, size: 3, wave: true }));
    if (def.lifesteal && hits > 0) player.hp = Math.min(player.maxHp, player.hp + Math.min(3, hits * def.lifesteal));
    if (def.deflect) {
      for (const b of world.enemyBullets) {
        const dx = b.x - player.x, dy = b.y - player.y, d = Math.hypot(dx, dy);
        if (d <= def.range + 6 && angleDiff(Math.atan2(dy, dx), ang) <= arc / 2 + 0.2) {
          b.alive = false; world.effects.spark(b.x, b.y, '#ffffff');
          if (def.reflect) { // 반사 방패: 적 탄을 조준 방향으로 되돌려 보냄 (2.5배)
            world.projectiles.push(new Projectile({ x: b.x, y: b.y, dx: Math.cos(ang), dy: Math.sin(ang), speed: 380, range: 320,
              damage: b.damage * 2.5, pierce: 0, knockback: 4, mods: weaponMods(player, w), color: '#ffffff', size: 2 }));
            world.effects.ring(b.x, b.y, 8, '#ffffff');
          }
        }
      }
    }
    const thrust = def.arcDeg < 40;
    player.swing = { t: 0, dur: thrust ? 0.15 : 0.16, ang, arc, thrust };
    SFX.play('melee');
    world.effects.slash(player.x, player.y - 1, ang, def.range * (pow ? 1.15 : 1), arc, pow ? '#ffd84a' : thrust ? '#e0f0ff' : 'rgba(230,240,255,0.9)');
    if (def.shake) world.addShake(0.1, 3);
  }
  updateBeam(player, w, dt, down) {
    const def = w.def, world = this.world;
    if (!down) { w.beamActive = false; w.beamTick = Math.max(w.beamTick, 0); w.focusT = 0; w.focusK = 0; return; }
    if (player.overdrive <= 0) {
      if (player.energy <= 0) { w.beamActive = false; if (w.cooldown <= 0) this.weakAttack(player, w); return; } // 에너지 부족: 약한 공격
      player.energy = Math.max(0, player.energy - def.energyPerSec * dt);
    }
    w.beamActive = true;
    SFX.play('beam', 0.08);
    const sx = player.x + player.aim.x * 10, sy = player.y - 1 + player.aim.y * 10;
    let ex = sx + player.aim.x * def.range, ey = sy + player.aim.y * def.range;
    const wt = sweepWall(sx, sy, ex, ey, world.map);
    const wall = wt >= 0 ? wt : 1, hits = [];
    for (const e of world.enemies) {
      if (!e.targetable) continue;
      const t = segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + 2);
      if (t >= 0 && t <= wall) hits.push([t, e]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    const pc = def.pierce || 0, bm = weaponMods(player, w);
    const target = hits.length ? hits[0][1] : null, extra = pc ? hits.slice(1, 1 + pc).map((h) => h[1]) : []; // 관통: 뒤에 있는 적도 함께 지짐
    const limit = !target ? wall : pc && hits.length > 1 + pc ? hits[pc][0] : pc ? wall : hits[0][0];
    w.beamEnd = { sx, sy, x: sx + (ex - sx) * limit, y: sy + (ey - sy) * limit };
    if (def.focus) { w.focusT = target && target === w.focusTarget ? (w.focusT || 0) + dt : 0; w.focusTarget = target; w.focusK = Math.min(1, w.focusT / 1.5); } // 같은 적을 계속 비추면 강해짐
    // 누적식 틱: 간격을 이어서 더해야 공속 버프가 프레임 단위로 잘리지 않음
    w.beamTick -= dt;
    const interval = def.tickRate / (1 + player.stats.fireRateBonus + (player.overdrive > 0 ? 1 + (player.odRate || 0) : 0));
    while (w.beamTick <= 0) {
      w.beamTick += interval;
      if (target) world.damageEnemy(target, { damage: def.damage * (1 + (def.focus || 0) * (w.focusK || 0)), mods: bm, knockback: 0, status: def.status || null }, player.aim.x, player.aim.y, { quiet: true });
      for (const e of extra) if (e.alive) world.damageEnemy(e, { damage: def.damage, mods: bm, knockback: 0, status: def.status || null }, player.aim.x, player.aim.y, { quiet: true });
    }
  }
}
