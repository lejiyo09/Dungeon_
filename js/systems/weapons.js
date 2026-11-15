'use strict';
// ════════════════════════════════════════════
// 무기 시스템
// ════════════════════════════════════════════
class WeaponInstance {
  constructor(def) { this.def = def; this.cooldown = 0; this.charge = 0; this.burstLeft = 0; this.burstTimer = 0; this.beamTick = 0; this.beamActive = false; this.beamEnd = null; }
}

class WeaponSystem {
  constructor(world) { this.world = world; this.noEnergyMsgT = 0; }
  noEnergy(player) {
    if (this.noEnergyMsgT <= 0) { this.world.effects.text(player.x, player.y - 18, '에너지 부족', '#7fb0ff'); this.noEnergyMsgT = 0.8; SFX.play('deny'); }
    this.world.noEnergyFlash = 0.4;
  }
  spend(player, cost) {
    if (player.overdrive > 0 || !cost) return true;
    if (player.energy < cost) { this.noEnergy(player); return false; }
    player.energy -= cost; return true;
  }
  getFireRate(player, w) { return w.def.fireRate * (1 + player.stats.fireRateBonus + (player.overdrive > 0 ? 1 : 0)) * (w.def.spinUp ? 0.25 + 0.75 * Math.min(1, (w.spin || 0) / w.def.spinUp) : 1); }
  update(player, dt, input) {
    this.noEnergyMsgT = Math.max(0, this.noEnergyMsgT - dt);
    const w = player.weapon;
    for (const o of player.weapons) if (o !== w) { o.cooldown = Math.max(0, o.cooldown - dt); o.charge = 0; o.beamActive = false; o.burstLeft = 0; }
    if (!w) return;
    w.cooldown = Math.max(w.cooldown - dt, -STEP);
    if (player.state === 'DEAD') { w.beamActive = false; w.charge = 0; return; }
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
            if (w.charge === 0 && player.overdrive <= 0 && player.energy < w.def.energyCost) this.noEnergy(player);
            else w.charge = Math.min(w.def.chargeTime, w.charge + dt * (1 + player.stats.fireRateBonus + (player.overdrive > 0 ? 1 : 0)));
          }
        } else if (w.charge > 0) this.releaseCharge(player, w);
        break;
      case 'beam': this.updateBeam(player, w, dt, down); break;
    }
    if (!down) w.cooldown = Math.max(w.cooldown, 0);
  }
  fireGun(player, w) {
    if (!this.spend(player, w.def.energyCost)) return;
    w.cooldown += 1 / this.getFireRate(player, w);
    this.shootGun(player, w);
    if (w.def.burst) { w.burstLeft = w.def.burst.count - 1; w.burstTimer = w.def.burst.interval; }
  }
  shootGun(player, w, override = {}) {
    const def = w.def;
    const base = Math.atan2(player.aim.y, player.aim.x);
    const spread = (def.spreadDeg || 0) * Math.PI / 180;
    const n = def.projectileCount || 1;
    for (let i = 0; i < n; i++) {
      let ang = base + (Math.random() * 2 - 1) * spread;
      if (def.fanDeg && n > 1) ang = base + (i / (n - 1) - 0.5) * def.fanDeg * Math.PI / 180;
      if (def.parallel) ang = base + (Math.random() * 2 - 1) * spread;
      const off = def.parallel ? (i - (n - 1) / 2) * def.parallel : 0;
      this.world.projectiles.push(new Projectile(Object.assign({
        x: player.x - Math.sin(base) * off, y: player.y - 1 + Math.cos(base) * off, dx: Math.cos(ang), dy: Math.sin(ang),
        boomerang: !!def.boomerang, split: def.split || null, pull: def.pull || null, rehit: def.rehit || 0, mine: def.mine || null,
        spriteDef: def.boomerang || def.spinSprite ? def : null,
        speed: def.projectileSpeed, range: def.range, damage: def.damage,
        pierce: def.pierce, knockback: def.knockback || 0,
        mods: def.critBonus ? Object.assign(player.mods, { critChance: player.stats.critChance + def.critBonus }) : player.mods,
        explodeRadius: def.explodeRadius || 0, color: def.bulletColor, size: def.bulletSize || 1,
        homing: def.homing || 0, bounce: def.bounce || 0, chain: def.chain || null, status: def.status || null, flame: !!def.flame
      }, override)));
    }
    const L = weaponLength(def) + 4; // 총구 위치에 섬광
    if (!def.flame) this.world.effects.spark(player.x + player.aim.x * L, player.y + 2 + player.aim.y * L * 0.75, '#fff6c0');
    player.recoil = Math.min(1, player.recoil + (def.damage * (def.projectileCount || 1) >= 40 ? 1 : def.fireRate > 8 ? 0.35 : 0.6));
    SFX.play(weaponSound(def), def.fireRate > 8 ? 0.06 : 0.03);
  }
  releaseCharge(player, w) {
    const def = w.def, k = 0.3 + 0.7 * Math.min(1, w.charge / def.chargeTime), full = w.charge >= def.chargeTime;
    w.charge = 0;
    if (!this.spend(player, def.energyCost)) return;
    w.cooldown = 1 / this.getFireRate(player, w);
    this.shootGun(player, w, { damage: def.damage * k, speed: def.projectileSpeed * (0.6 + 0.4 * k),
      pierce: full ? def.pierce : 0, arrow: true, size: full ? 2 : 1 });
  }
  fireMelee(player, w) {
    const def = w.def, world = this.world;
    if (!this.spend(player, def.energyCost)) return;
    w.cooldown += 1 / this.getFireRate(player, w);
    const ang = Math.atan2(player.aim.y, player.aim.x), arc = def.arcDeg * Math.PI / 180;
    const src = { damage: def.damage, mods: player.mods, knockback: def.knockback, status: def.status || null };
    let hits = 0;
    for (const e of world.enemies) {
      if (!e.targetable) continue;
      const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
      if (d - e.radius > def.range) continue;
      if (d > 4 && angleDiff(Math.atan2(dy, dx), ang) > arc / 2 + Math.atan2(e.radius, d)) continue;
      world.damageEnemy(e, src, dx / (d || 1), dy / (d || 1)); hits++;
    }
    if (def.lifesteal && hits > 0) player.hp = Math.min(player.maxHp, player.hp + Math.min(3, hits * def.lifesteal));
    if (def.deflect) {
      for (const b of world.enemyBullets) {
        const dx = b.x - player.x, dy = b.y - player.y, d = Math.hypot(dx, dy);
        if (d <= def.range + 6 && angleDiff(Math.atan2(dy, dx), ang) <= arc / 2 + 0.2) { b.alive = false; world.effects.spark(b.x, b.y, '#ffffff'); }
      }
    }
    const thrust = def.arcDeg < 40;
    player.swing = { t: 0, dur: thrust ? 0.15 : 0.16, ang, arc, thrust };
    SFX.play('melee');
    world.effects.slash(player.x, player.y - 1, ang, def.range, arc, thrust ? '#e0f0ff' : 'rgba(230,240,255,0.9)');
    if (def.shake) world.addShake(0.1, 3);
  }
  updateBeam(player, w, dt, down) {
    const def = w.def, world = this.world;
    if (!down) { w.beamActive = false; w.beamTick = Math.max(w.beamTick, 0); return; }
    if (player.overdrive <= 0) {
      if (player.energy <= 0) { w.beamActive = false; this.noEnergy(player); return; }
      player.energy = Math.max(0, player.energy - def.energyPerSec * dt);
    }
    w.beamActive = true;
    SFX.play('beam', 0.08);
    const sx = player.x + player.aim.x * 10, sy = player.y - 1 + player.aim.y * 10;
    let ex = sx + player.aim.x * def.range, ey = sy + player.aim.y * def.range;
    const wt = sweepWall(sx, sy, ex, ey, world.map);
    let limit = wt >= 0 ? wt : 1, target = null;
    for (const e of world.enemies) {
      if (!e.targetable) continue;
      const t = segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + 2);
      if (t >= 0 && t <= limit) { limit = t; target = e; }
    }
    w.beamEnd = { sx, sy, x: sx + (ex - sx) * limit, y: sy + (ey - sy) * limit };
    // 누적식 틱: 간격을 이어서 더해야 공속 버프가 프레임 단위로 잘리지 않음
    w.beamTick -= dt;
    const interval = def.tickRate / (1 + player.stats.fireRateBonus + (player.overdrive > 0 ? 1 : 0));
    while (w.beamTick <= 0) {
      w.beamTick += interval;
      if (target) world.damageEnemy(target, { damage: def.damage, mods: player.mods, knockback: 0 }, player.aim.x, player.aim.y, { quiet: true });
    }
  }
}
