'use strict';
// ════════════════════════════════════════════
// 시스템: 라트마 퀘스트 · 보스 · 가르침 선택 · 네크로맨서 · 라트마 고유 무기 · 연출
//  기존 Game 메서드를 감싸서(wrap) 붙이는 방식 — 기존 캐릭터·전직·무기·무기고·보스·저장 구조를 그대로 재사용
//  데이터: js/data/ratma.js · 아트: js/art/ratma.js
//
//  퀘스트 단계 (save.ratma.step)
//   0 → 모래 무덤(5필드) 일반 스테이지의 숨겨진 석관 → 생명의 파편 (1)
//   1 → 망자의 성 8-4 라트마의 환영 · 망자의 왕 처치 → 영혼의 인장 (2)
//   2 → 기원의 성역 10-4 무명의 문지기 처치 → 숨겨진 문양 → 숨겨진 문 (3)
//   3 → 생사의 경계(신규 지역) → 라트마 보스 3페이즈 → 가르침 선택 (defeated)
// ════════════════════════════════════════════
const NECRO_ID = 'hero_necromancer';
function ratmaSave(sv) {
  const R = sv.ratma = sv.ratma && typeof sv.ratma === 'object' ? sv.ratma : {};
  if (typeof R.step !== 'number') R.step = 0;
  if (!Array.isArray(R.got)) R.got = [];
  R.rematchWins = R.rematchWins | 0; R.hardWins = R.hardWins | 0; R.phantomWins = R.phantomWins | 0;
  if (!R.cleaned2) { R.cleaned2 = true; // [사용자 결정] 사령 기사 계열·라트마의 인내 삭제 — 예전 저장 정리
    const gone = (id) => RATMA_REMOVED_WEAPONS.includes(id);
    for (const k of ['armory', 'discovered']) if (Array.isArray(sv[k])) sv[k] = sv[k].filter((id) => !gone(id));
    R.got = R.got.filter((id) => !gone(id)); if (gone(sv.loadout)) sv.loadout = null;
    if (R.line === 'knight') R.line = 'lich'; if (sv.lineChoice && sv.lineChoice[NECRO_ID] === 'knight') delete sv.lineChoice[NECRO_ID]; }
  return R;
}
function isRatmaUnique(def) { return !!(def && (def.unique || def.ratma)); }
function ratmaWeaponDroppable(def) { return !!def && !def.questOnly && !def.unique; } // 일반 드롭·상점·진열대·행운의 기계·제련 후보 판정

// ── 망령 (네크로맨서 스킬 · 라트마의 고뇌): 벽을 통과해 떠다니며 가까운 적을 할큄
class NecroWraith {
  constructor(x, y, owner, o = {}) {
    this.x = x; this.y = y; this.owner = owner; this.big = !!o.big; this.dmg = o.dmg || 6; this.life = o.life || 10; this.skill = o.skill !== false;
    this.wmods = o.wmods || null; this.onEnd = o.onEnd || null; this.tag = o.tag || null; this.color = o.color || '#9affd0'; this.color2 = o.color2 || '#c08aff';
    this.rate = o.rate || (this.big ? 0.9 : 0.7); this.cd = 0.25; this.t = Math.random() * 6; this.idx = o.idx || 0; this.face = 1; this.alive = true; this.half = this.big ? 8 : 5; this.atkT = 0; this.small = !!o.small;
  }
  update(dt, world) {
    this.t += dt; this.life -= dt; this.cd -= dt; this.atkT = Math.max(0, this.atkT - dt);
    const P = this.owner;
    if (this.life <= 0 || P.state === 'DEAD') { this.alive = false; world.effects.burst(this.x, this.y - 4, this.color, 10); if (this.onEnd) this.onEnd(world, this); return; }
    let best = null, bd = this.big ? 240 : 220;
    for (const e of world.enemies) { if (!e.targetable || (e.def.dummy && world.mode !== 'lobby')) continue; const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < bd) { bd = d; best = e; } }
    const a = this.t * 1.4 + this.idx * 1.3;
    const tx = best ? best.x : P.x + Math.cos(a) * (16 + this.idx * 3), ty = best ? best.y - 2 : P.y - 8 + Math.sin(a) * 7;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, stop = best ? best.radius + 5 : 3;
    if (d > stop) { const v = Math.min((this.big ? 125 : 165) * NECRO.summonSpeed * dt, d - stop); this.x += dx / d * v; this.y += dy / d * v; }
    if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1;
    if (Math.hypot(this.x - P.x, this.y - P.y) > 280) { this.x = P.x; this.y = P.y - 8; }
    if (best && d < best.radius + 12 && this.cd <= 0) {
      this.cd = this.rate; this.atkT = 0.18;
      const src = { damage: this.skill ? world.skillDmg(this.dmg) : this.dmg, mods: this.wmods ? this.wmods() : P.mods, knockback: this.big ? 8 : 2, minion: true };
      if (this.big) { world.explodeAt(best.x, best.y, 32, { color: this.color, hurtEnemies: true, src }); world.addShake(0.06, 2); }
      else world.damageEnemy(best, src, dx / d, dy / d, { quiet: true });
      world.effects.slash(this.x, this.y - 2, Math.atan2(dy, dx), this.big ? 22 : 11, 1.3, this.color);
    }
    if (Math.random() < 0.3) world.effects.part(this.x + randInt(-3, 3), this.y + 3, randInt(-6, 6), 10, { color: Math.random() < 0.5 ? this.color : this.color2, life: 0.4, size: 1.6, size2: 0, drag: 1, add: true });
  }
  render(ctx) {
    if (this.life < 1.5 && Math.floor(this.life * 10) % 2 === 0) return; // 사라지기 직전 깜박임
    const s = this.big ? 1.7 : this.small ? 0.8 : 1, x = Math.round(this.x), y = Math.round(this.y + Math.sin(this.t * 5) * 1.5), f = this.face, lunge = this.atkT > 0 ? 2 * f : 0;
    ctx.save(); ctx.translate(x + lunge, y); ctx.scale(s * f, s);
    ctx.globalAlpha = 0.22; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, -2, 8, 0, TAU); ctx.fill();          // 영혼 빛
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.quadraticCurveTo(0, -12, 5, -6); ctx.lineTo(5, 2); ctx.lineTo(3, 6); ctx.lineTo(1, 3); ctx.lineTo(-1, 7); ctx.lineTo(-3, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = this.big ? '#3a4a5a' : '#cfeee6'; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(0, -11, 4, -6); ctx.lineTo(4, 1); ctx.lineTo(2.5, 4.5); ctx.lineTo(1, 2); ctx.lineTo(-1, 5.5); ctx.lineTo(-2.5, 2); ctx.lineTo(-4, 4.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = OUTLINE; ctx.fillRect(-3, -6, 2, 2); ctx.fillRect(1, -6, 2, 2); ctx.fillStyle = this.color; ctx.fillRect(-2, -6, 1, 1); ctx.fillRect(2, -6, 1, 1); // 눈
    if (this.big) { ctx.fillStyle = '#9aa8b8'; ctx.fillRect(-4, -9, 8, 2); ctx.fillStyle = this.color2; ctx.fillRect(4, -4, 5, 1); ctx.fillRect(8, -6, 1, 5); } // 망령 기사: 투구 테·검
    ctx.restore(); ctx.globalAlpha = 1;
  }
}

// ════════════════════════════════════════════
// 네크로맨서 개편: 해골 군세 · 골렘 · 부활 부하 · 시체 창 · 묘지 · 시체
// ════════════════════════════════════════════
// ── 해골 (기본 상시 해골 · 추가 소환 10초 해골 · 묘지의 자폭 해골)
class NecroSkeleton {
  constructor(x, y, owner, o = {}) { this.initTank(owner); this.x = x; this.y = y; this.owner = owner; this.idx = o.idx || 0; this.temp = o.temp || 0; this.bomb = !!o.bomb; this.life = this.temp || Infinity; this.half = 4; this.cd = 0.3; this.t = Math.random() * 5; this.face = 1; this.alive = true; this.atkT = 0; this.spawnT = 0.35; }
  initTank(owner) { // [사용자 결정] 해골도 맞으며 버팀 — 적이 노릴 때 쓰는 대역 (골렘·부하와 같은 방식)
    const S = NECRO.skeleton, fl = typeof game !== 'undefined' && game.necroFloor ? game.necroFloor().hp : 1, self = this;
    this.maxHp = Math.round(owner.maxHp * S.hpMul * fl); this.hp = this.maxHp; this.hurtT = 0;
    this.guard = Object.create(owner); Object.defineProperty(this.guard, 'isInvulnerable', { get: () => !self.alive });
    Object.assign(this.guard, { state: 'NORMAL', hadesT: 0, endured: false, feast: 0, hp: this.hp, x: 0, y: 0, takeDamage(a) { self.hurt(a); return true; } });
  }
  hurt(a) { if (!this.alive || this.bomb) return; this.hp -= a; this.guard.hp = this.hp; this.hurtT = 0.12;
    if (this.hp <= 0) { this.alive = false; if (typeof game !== 'undefined') { game.effects.burst(this.x, this.y - 4, '#e8e0d0', 10); for (let k = 0; k < 6; k++) game.effects.part(this.x, this.y - 4, randInt(-40, 40), -30 - Math.random() * 30, { color: '#d8d0c0', life: 0.5, size: 2, size2: 0, drag: 1.5 });
      if (!this.temp) this.owner.skelBackAt = Math.max(this.owner.skelBackAt || 0, game.time + NECRO.skeleton.respawn); } } } // 쓰러지면 4초 뒤 다시 일어남
  update(dt, world) {
    this.t += dt; this.cd -= dt; this.atkT = Math.max(0, this.atkT - dt); this.spawnT = Math.max(0, this.spawnT - dt); this.hurtT = Math.max(0, (this.hurtT || 0) - dt);
    if (!this.bomb && this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * NECRO.skeleton.regen * dt); }
    if (!this.bomb) { this.guard.x = this.x; this.guard.y = this.y; this.guard.hp = this.hp;
      for (const b of world.enemyBullets) if (b.alive && !b.blade && Math.hypot(b.x - this.x, b.y - (this.y - 5)) < this.half + 3) { b.alive = false; this.hurt(b.damage || 5); world.effects.spark(b.x, b.y, '#e8e0d0'); if (!this.alive) return; } } // 적 탄을 몸으로 막음
    const P = this.owner, S = NECRO.skeleton;
    if (this.life !== Infinity) { this.life -= dt; if (this.life <= 0) { this.alive = false; if (this.bomb) this.blow(world); else world.effects.burst(this.x, this.y - 3, '#d8d0c0', 8); return; } }
    if (P.state === 'DEAD' && !this.bomb) return;
    let best = null, bd = this.bomb ? 260 : 170;
    for (const e of world.enemies) { if (!e.targetable || (e.def.dummy && world.mode !== 'lobby')) continue; const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < bd && (this.bomb || Math.hypot(e.x - P.x, e.y - P.y) < 240)) { bd = d; best = e; } }
    const a = this.idx * 2.1 + this.t * 0.4, hx = P.x + Math.cos(a) * 18, hy = P.y + 8 + Math.sin(a) * 8;
    const tx = best ? best.x : this.bomb ? this.x : hx, ty = best ? best.y : this.bomb ? this.y : hy, dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, stop = best ? best.radius + 5 : 6;
    if (!this.bomb && Math.hypot(this.x - P.x, this.y - P.y) > 300) { this.x = P.x; this.y = P.y + 6; }
    if (d > stop && this.spawnT <= 0) { const v = (this.bomb ? 150 : S.speed) * NECRO.summonSpeed * dt; moveAndCollide(this, dx / d * Math.min(v, d - stop), dy / d * Math.min(v, d - stop), world.map); }
    if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1;
    if (best && d < best.radius + 9 && this.spawnT <= 0) {
      if (this.bomb) { this.alive = false; this.blow(world); return; }
      if (this.cd <= 0) { this.cd = S.rate; this.atkT = 0.16; world.damageEnemy(best, world.necroWeaponSrc(P, 2, S.atk), dx / d, dy / d, { quiet: true }); world.effects.slash(this.x + this.face * 3, this.y - 3, Math.atan2(dy, dx), 9, 1.2, '#e8e0d0'); }
    }
  }
  blow(world) { // 자폭 해골 병
    const R0 = 36; world.explodeAt(this.x, this.y, R0, { color: '#ff9a5a', hurtEnemies: true, src: { damage: world.skillDmg(20), mods: this.owner.mods, knockback: 6 } });
    world.effects.ring(this.x, this.y, R0, '#c08aff'); for (let i = 0; i < 6; i++) world.effects.part(this.x, this.y - 3, randInt(-50, 50), -40 - Math.random() * 40, { color: '#e8e0d0', life: 0.6, size: 2, size2: 0, drag: 1 });
  }
  render(ctx) {
    if (this.temp && this.life < 1.5 && Math.floor(this.life * 10) % 2 === 0) return;
    const f = this.face, x = Math.round(this.x), y = Math.round(this.y) + 4 - Math.round(this.spawnT * 20), st = this.atkT > 0 ? 1 : Math.floor(this.t * 8) % 2, R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(f > 0 ? x + dx : x - dx - w, y + dy, w, h); };
    const bone = this.hurtT > 0 ? '#ffffff' : '#e8e0d0', dark = this.hurtT > 0 ? '#ffffff' : '#9a9284';
    if (!this.bomb && this.hp < this.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 15, 10, 2); ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x - 5, y - 15, Math.round(10 * Math.max(0, this.hp / this.maxHp)), 2); }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 4, y + 1, 8, 2);
    if (this.bomb) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 14); ctx.fillStyle = '#ff7a3a'; ctx.beginPath(); ctx.arc(x, y - 6, 6, 0, TAU); ctx.fill(); ctx.restore(); }
    R(-3, -11, 6, 5, OUTLINE); R(-2, -10, 4, 3, bone); R(-2, -8, 1, 1, OUTLINE); R(0, -8, 1, 1, OUTLINE); R(1, -9, 1, 1, this.bomb ? '#ff5a3a' : '#7affc0'); // 두개골·눈
    R(-2, -6, 5, 4, OUTLINE); R(-1, -6, 3, 3, dark); R(-1, -5, 3, 1, bone);                                                                 // 갈비
    R(-2, -2, 1, st ? 2 : 3, bone); R(1, -2, 1, st ? 3 : 2, bone);                                                                            // 다리
    R(2, -6 - (this.atkT > 0 ? 2 : 0), 1, 3, bone); R(3, -8 - (this.atkT > 0 ? 2 : 0), 1, 4, this.bomb ? '#ff9a5a' : '#b8b0a0');         // 팔·뼈 칼(심지)
  }
}
// ── 망령 골렘: 느리지만 맞힌 적을 확정 0.5초 기절 · 근처 일반 적의 어그로를 끎(적 탄을 몸으로 막음) · 쓰러지면 5초 뒤 부활
class NecroGolem {
  constructor(x, y, owner) {
    this.x = x; this.y = y; this.owner = owner; this.half = 7; this.maxHp = Math.round(owner.maxHp * NECRO.golem.hpMul * (typeof game !== 'undefined' && game.necroFloor ? game.necroFloor().hp : 1)); this.hp = this.maxHp; this.up = true; this.respawnT = 0;
    this.cd = 0.5; this.t = 0; this.face = 1; this.alive = true; this.atkT = 0; this.hurtT = 0;
    const self = this, px = Object.create(owner); // 어그로용 대역: 적 AI가 '플레이어'로 보는 동안 맞는 피해는 골렘이 받음
    Object.defineProperty(px, 'isInvulnerable', { get: () => !self.up });
    Object.assign(px, { state: 'NORMAL', hadesT: 0, endured: false, feast: 0, hp: this.hp, x, y, takeDamage(a) { self.hurt(a); return true; } });
    this.proxy = px;
  }
  hurt(a) { if (!this.up) return; this.hp -= a; this.proxy.hp = this.hp; this.hurtT = 0.12; if (this.hp <= 0) { this.up = false; this.respawnT = NECRO.golem.respawn; this.proxy.state = 'DEAD'; if (typeof game !== 'undefined') { game.effects.burst(this.x, this.y - 8, '#c8c0b0', 18); game.effects.text(this.x, this.y - 24, '골렘 붕괴 — 5초 뒤 부활', '#c8c0b0'); } } }
  update(dt, world) {
    const P = this.owner, G = NECRO.golem; this.t += dt; this.cd -= dt; this.atkT = Math.max(0, this.atkT - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    if (!this.up) { this.respawnT -= dt; if (this.respawnT <= 0 && P.state !== 'DEAD') { this.up = true; this.maxHp = Math.round(P.maxHp * G.hpMul * world.necroFloor().hp); this.hp = this.maxHp; this.proxy.hp = this.hp; this.proxy.state = 'NORMAL'; this.x = P.x - 16; this.y = P.y + 8;
        world.zones.push(new RatmaSigil(this.x, this.y, 20, '#9affd8', 0.9)); world.effects.burst(this.x, this.y - 6, '#9affd8', 14); world.effects.text(this.x, this.y - 26, '골렘 부활', '#9affd8'); } return; }
    if (this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * G.regen * dt); this.proxy.hp = this.hp; } // [사용자 결정] 초당 최대 체력 1% 회복
    this.slamT = (this.slamT == null ? G.slamEvery * 0.5 : this.slamT) - dt;
    if (this.slamT <= 0) { // 내려찍기: 주변 적 전부 1초 기절 (CC 탱커)
      const near = world.enemies.filter((e) => e.targetable && !(e.def.dummy && world.mode !== 'lobby') && Math.hypot(e.x - this.x, e.y - this.y) < G.slamR + e.radius);
      if (near.length) { this.slamT = G.slamEvery; this.atkT = 0.45;
        for (const e of near) { world.damageEnemy(e, world.necroWeaponSrc(P, 8, G.atk), Math.sign(e.x - this.x) || 1, 0, { quiet: true }); if (e.alive && !e.def.ccImmune) e.stunT = Math.max(e.stunT || 0, G.slamStun); }
        world.effects.ring(this.x, this.y, G.slamR, '#c8c0b0'); world.effects.ring(this.x, this.y, G.slamR * 0.6, '#9affd8'); world.effects.dust(this.x, this.y + 4);
        for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; world.effects.part(this.x + Math.cos(a) * 10, this.y + 4 + Math.sin(a) * 5, Math.cos(a) * 90, Math.sin(a) * 45, { color: k % 2 ? '#8a8274' : '#c8c0b0', life: 0.45, size: 3, size2: 0, drag: 3 }); }
        world.effects.text(this.x, this.y - 28, '내려찍기 — 기절', '#c8c0b0'); world.addShake(0.15, 3); SFX.play('heavy', 0.12); }
      else this.slamT = 0.5; }
    if (Math.hypot(this.x - P.x, this.y - P.y) > 280) { this.x = P.x - 16; this.y = P.y + 8; }
    let best = null, bd = 210;
    for (const e of world.enemies) { if (!e.targetable || (e.def.dummy && world.mode !== 'lobby')) continue; const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < bd && Math.hypot(e.x - P.x, e.y - P.y) < 260) { bd = d; best = e; } }
    const tx = best ? best.x : P.x - (P.faceVis || 1) * 20, ty = best ? best.y : P.y + 8, dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, stop = best ? best.radius + 8 : 10;
    const gv = G.speed * NECRO.summonSpeed * dt; if (d > stop) moveAndCollide(this, dx / d * Math.min(gv, d - stop), dy / d * Math.min(gv, d - stop), world.map);
    if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1;
    if (best && d < best.radius + 14 && this.cd <= 0) { this.cd = G.rate; this.atkT = 0.35;
      world.damageEnemy(best, world.necroWeaponSrc(P, 6, G.atk), dx / d, dy / d);
      if (Math.random() < G.corpseChance && !best.def.boss && !best.def.master && !best.def.dummy && !best.necroAlly) world.necroAddCorpse({ x: best.x + randInt(-8, 8), y: best.y + randInt(2, 8), def: best.def, elite: best.elite, maxHp: best.maxHp, damage: best.damage }); // [사용자 결정] 골렘 타격 시 50% 확률로 그 몬스터의 시체 생성
      if (best.alive && !best.def.ccImmune) { best.stunT = Math.max(best.stunT || 0, G.stun); world.effects.text(best.x, best.y - best.radius - 8, '기절', '#c8c0b0'); } // 확정 0.5초 기절
      world.effects.ring(best.x, best.y, 16, '#c8c0b0'); world.addShake(0.06, 2); }
    for (const b of world.enemyBullets) if (b.alive && !b.blade && Math.hypot(b.x - this.x, b.y - (this.y - 6)) < this.half + 5) { b.alive = false; this.hurt(b.damage || 5); world.effects.spark(b.x, b.y, '#c8c0b0'); } // 몸으로 막기
    this.proxy.x = this.x; this.proxy.y = this.y;
    if (Math.random() < 0.15) world.effects.part(this.x + randInt(-6, 6), this.y - 8, 0, -10, { color: '#7affc0', life: 0.5, size: 1.5, size2: 0, drag: 1, add: true });
  }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), f = this.face, R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(f > 0 ? x + dx : x - dx - w, y + dy, w, h); };
    if (!this.up) { ctx.fillStyle = '#6a6458'; ctx.fillRect(x - 7, y + 2, 14, 4); ctx.fillStyle = '#9a9284'; ctx.fillRect(x - 5, y + 1, 4, 2); ctx.fillRect(x + 2, y + 2, 3, 2); // 무너진 잔해 + 부활 시계
      ctx.strokeStyle = '#9affd8'; ctx.beginPath(); ctx.arc(x, y - 4, 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - this.respawnT / NECRO.golem.respawn)); ctx.stroke(); return; }
    const sl = this.atkT > 0 ? Math.round(this.atkT / 0.35 * 4) : 0, bob = Math.floor(this.t * 3) % 2, body = this.hurtT > 0 ? '#ffffff' : '#a8a092', dark = '#7a7466';
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 9, y + 6, 18, 3);
    R(-8, -15 + bob, 16, 19, OUTLINE); R(-7, -14 + bob, 14, 17, body); R(-7, -14 + bob, 14, 3, '#c8c0b0'); for (let i = 0; i < 3; i++) R(-5, -9 + i * 3 + bob, 10, 1, dark); // 뼈를 엮은 몸통
    R(-4, -20 + bob, 8, 6, OUTLINE); R(-3, -19 + bob, 6, 4, '#d8d0c0'); R(-2, -18 + bob, 1, 2, OUTLINE); R(1, -18 + bob, 1, 2, OUTLINE); R(2, -18 + bob, 1, 1, '#7affc0'); // 해골 머리
    R(-1, -10 + bob, 2, 4, '#7affc0');                                                                                                // 망령의 핵
    R(-13, -13 + bob - sl, 5, 11, OUTLINE); R(-12, -12 + bob - sl, 3, 9, dark); R(8, -13 + bob - sl, 5, 11, OUTLINE); R(9, -12 + bob - sl, 3, 9, dark); // 팔
    R(-6, 3, 4, 3, OUTLINE); R(2, 3, 4, 3, OUTLINE);
    if (this.hp < this.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(x - 8, y - 25, 16, 2); ctx.fillStyle = '#9affd8'; ctx.fillRect(x - 8, y - 25, Math.round(16 * Math.max(0, this.hp / this.maxHp)), 2); }
  }
}
// ── 부하가 된 몬스터 (망자의 군주 부활 · 묘지 정신지배)
//  [사용자 결정] 별도 소환수로 바꾸지 않고 '죽기 전 원본 몬스터'를 그대로 되살림 — 같은 Enemy 데이터·체력·공격력·AI(근접·투사체·돌진)·특수 능력,
//  적대 관계만 아군으로 뒤집음: 원래 AI를 그대로 돌리되 '플레이어' 자리에 노리는 적을 넣고, 그 몬스터가 쏜 탄·장판·소환은 아군 것으로 바꿈
class NecroThrall {
  constructor(e, owner, o = {}) {
    this.e = e; this.owner = owner; this.rec = o.rec || null; this.charm = !!o.charm; this.life = o.life || Infinity; this.onEnd = o.onEnd || null; this.alive = true; this.t = 0;
    if (!e.def.necroFast) e.def = Object.assign(Object.create(e.def), { moveSpeed: (e.def.moveSpeed || 0) * NECRO.summonSpeed, necroFast: true }); // 이동 속도만 3배 (체력·공격·AI·특수 능력은 원본 그대로)
    e.necroAlly = true; e.rewardGiven = true; e.alive = true; if (e.state === 'SPAWN' || e.state === 'DEAD') e.setState('IDLE');
    this.col = this.charm ? '#d8a0ff' : '#9affd8';
    const self = this; this.tgt = null;
    this.aim = Object.create(owner); Object.defineProperty(this.aim, 'isInvulnerable', { get: () => false }); // 이 몬스터의 AI가 보는 '플레이어' = 노리는 적
    Object.assign(this.aim, { state: 'NORMAL', hadesT: 0, endured: false, feast: 0, x: e.x, y: e.y, takeDamage(a) { self.hitTarget(a); return true; } });
    this.guard = Object.create(owner); Object.defineProperty(this.guard, 'isInvulnerable', { get: () => !self.alive }); // 적들이 이 몬스터를 노릴 때 쓰는 대역 (원본 체력으로 버팀)
    Object.assign(this.guard, { state: 'NORMAL', hadesT: 0, endured: false, feast: 0, x: e.x, y: e.y, takeDamage(a) { self.hurt(a); return true; } });
    this.hpBar = 0;
  }
  get x() { return this.e.x; } get y() { return this.e.y; }
  hitTarget(a) { const T = this.tgt; if (!T || !T.alive || typeof game === 'undefined') return; game.damageEnemy(T, { damage: a, mods: { attackBonus: 0, critChance: 0, critMultiplier: 1 }, knockback: 3, minion: true }, Math.sign(T.x - this.e.x) || 1, 0, { quiet: true }); }
  hurt(a) { const e = this.e; if (!this.alive) return; e.hp -= a; e.hurtFlash = 0.12; this.hpBar = 2; if (this.rec) this.rec.hpFrac = e.hp / e.maxHp; if (e.hp <= 0) this.die(typeof game !== 'undefined' ? game : null, true); }
  die(world, killed) {
    if (!this.alive) return; this.alive = false; const e = this.e; e.alive = false;
    if (!world) return; world.effects.death(e.x, e.y, this.col, e.def.hitboxHalf * 2);
    const P = this.owner; if (this.rec && P.thralls) { const i = P.thralls.indexOf(this.rec); if (i >= 0) P.thralls.splice(i, 1); }
    if (killed && !this.charm && world.necroAddCorpse) world.necroAddCorpse(Object.assign(Object.create(e), { elite: e.elite, maxHp: Math.round(e.maxHp / NECRO.thrall.hpMul), damage: Math.round(e.damage / NECRO.thrall.dmgMul), necroSHp: world.scale.hp, necroSDmg: world.scale.dmg })); // 원본 수치로 (다시 살리면 또 2배) // 쓰러진 부하는 다시 시체로
  }
  update(dt, world) {
    const e = this.e, P = this.owner; this.t += dt; this.hpBar = Math.max(0, this.hpBar - dt);
    if (this.life !== Infinity) { this.life -= dt; if (this.life <= 0) { this.alive = false; e.alive = false; if (this.onEnd) this.onEnd(world, this); return; } } // 정신지배 10초: 묘지가 사라져도 따로 흘러감
    if (!e.alive || e.state === 'DEAD') { if (this.alive) this.die(world, false); return; } // 자폭형 등 스스로 쓰러짐
    if (P.state === 'DEAD' && !this.charm) return;
    let best = null, bd = this.charm ? 280 : 240;
    for (const o of world.enemies) { if (!o.targetable || o.necroAlly || (o.def.dummy && world.mode !== 'lobby')) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd && (this.charm || Math.hypot(o.x - P.x, o.y - P.y) < 280)) { bd = d; best = o; } }
    this.tgt = best;
    if (!this.charm && Math.hypot(e.x - P.x, e.y - P.y) > 340) { e.x = P.x; e.y = P.y + 8; }
    if (!best) { // 노릴 적이 없으면 주인 곁으로
      if (this.charm) return; const a = this.t * 0.3 + (this.rec ? this.rec.k * 6 : 0), hx = P.x + Math.cos(a) * 26, hy = P.y + 10 + Math.sin(a) * 10, dx = hx - e.x, dy = hy - e.y, d = Math.hypot(dx, dy) || 1;
      const fv = ((e.def.moveSpeed || 50) + 20) * dt; if (d > 10) moveAndCollide(e, dx / d * Math.min(fv, d - 10), dy / d * Math.min(fv, d - 10), world.map);
      if (Math.abs(dx) > 1) e.face = dx > 0 ? 1 : -1; if (e.state !== 'SPAWN') e.state = 'IDLE'; e.stateTime = 0; this.guard.x = e.x; this.guard.y = e.y; this.blockBullets(world); return; }
    // 원래 AI 실행: '플레이어' = 노리는 적 (근접 피해는 그 적에게, 쏜 탄·장판·소환은 아군 것으로 바꿈)
    this.aim.x = best.x; this.aim.y = best.y; this.aim.half = best.radius; this.aim.radius = best.radius;
    e.room = world.map.roomAtPoint(best.x, best.y) || e.room;
    const o = world.player, hf = world.hurtFlash, nB = world.enemyBullets.length, nH = world.hazards.length, nE = world.enemies.length, aim = this.aim;
    world.player = aim; world.damagePlayer = function () { aim.takeDamage(arguments[0]); return true; };
    try { NecroThrall.baseUpdate(e, dt, world); }
    finally { world.player = o; world.hurtFlash = hf; delete world.damagePlayer; }
    for (const b of world.enemyBullets.splice(nB)) { const sp = Math.hypot(b.vx, b.vy) || 150; // 투사체: 아군 탄으로
      world.projectiles.push(new Projectile({ x: b.x, y: b.y, dx: b.vx / sp, dy: b.vy / sp, speed: sp, range: Math.max(160, sp * (b.life || 2.2)), damage: b.damage, pierce: 0, knockback: 2, mods: { attackBonus: 0, critChance: 0, critMultiplier: 1 }, color: this.col, size: Math.max(2, Math.min(4, b.r || 3)), owner: P })); }
    for (const h of world.hazards.splice(nH)) { const H = h; world.zones.push(new DelayCall(Math.max(0, (H.delay || 0.6) - H.t), (w) => { w.explodeAt(H.x, H.y, H.r || 24, { color: this.col, hurtEnemies: true, src: { damage: H.damage || 10, mods: { attackBonus: 0, critChance: 0, critMultiplier: 1 }, knockback: 4 } }); })); } // 장판: 적에게 터지게
    for (const s of world.enemies.splice(nE)) world.allies.push(new NecroThrall(s, P, { life: 12 })); // 소환한 몬스터도 아군 (12초)
    this.guard.x = e.x; this.guard.y = e.y; this.blockBullets(world);
    if (Math.random() < 0.12) world.effects.part(e.x + randInt(-4, 4), e.y + 4, 0, -12, { color: this.col, life: 0.5, size: 1.5, size2: 0, drag: 1, add: true });
  }
  blockBullets(world) { // [사용자 결정] 소환수가 맞아 준 투사체는 사라짐
    const e = this.e, h = (e.def.hitboxHalf || 6) + 3;
    for (const b of world.enemyBullets) if (b.alive && !b.blade && Math.hypot(b.x - e.x, b.y - e.y) < h + (b.r || 2)) { b.alive = false; this.hurt(b.damage || 5); world.effects.spark(b.x, b.y, this.col); if (!this.alive) return; }
  }
  render(ctx) {
    const e = this.e; if (this.charm && this.life < 3 && Math.floor(this.life * (this.life < 1 ? 16 : 8)) % 2 === 0) return; // 자폭이 가까울수록 빠르게 깜박임
    const x = Math.round(e.x), y = Math.round(e.y), h = e.def.hitboxHalf || 6;
    ctx.save(); ctx.translate(x, y + h + 1); ctx.scale(1, 0.4); ctx.globalAlpha = 0.6; ctx.strokeStyle = this.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, h + 4, 0, TAU); ctx.stroke(); ctx.restore(); ctx.lineWidth = 1; // 아군 표시 고리
    e.render(ctx);
    ctx.fillStyle = this.col; ctx.fillRect(x - 1, y - h - 10, 2, 3);
    if (this.hpBar > 0 || e.hp < e.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(x - 8, y - h - 6, 16, 2); ctx.fillStyle = this.col; ctx.fillRect(x - 8, y - h - 6, Math.round(16 * Math.max(0, e.hp / e.maxHp)), 2); }
  }
}
// ── 시체 창 (리치): 시체에서 뼈 창이 솟아올라 주변 적을 쫓아가 꽂힘 — 피해 + 무작위 디버프 2종
//  [사용자 결정] 눈에 띄게: 큰 뼈 창(가시 돋친 촉 · 보랏빛 혼불) · 솟아오를 때 땅 균열 · 날아갈 때 보랏빛 혼불 꼬리 · 꽂힐 때 뼈 파편과 영혼 폭발
class NecroSpear {
  constructor(x, y, owner, dmg, i) { this.x = x; this.y = y; this.sx = x; this.sy = y; this.owner = owner; this.dmg = dmg; this.i = i; this.t = 0; this.alive = true; this.ang = -Math.PI / 2 + (i - 1) * 0.35; this.tgt = null; this.trail = []; this.flown = false; }
  update(dt, world) {
    const S = NECRO.spear; this.t += dt; const rise = 0.28 + this.i * 0.08;
    if (this.t < rise) { // 솟아오름: 땅에서 뼈가 비집고 나옴
      this.y -= 55 * dt;
      if (Math.random() < 0.7) world.effects.part(this.sx + randInt(-4, 4), this.sy + 2, randInt(-20, 20), -30 - Math.random() * 30, { color: Math.random() < 0.5 ? '#6a5a4a' : '#e8e0d0', life: 0.4, size: 2, size2: 0, drag: 1.5 });
      if (Math.random() < 0.5) world.effects.part(this.x + randInt(-2, 2), this.y, 0, -10, { color: '#c08aff', life: 0.35, size: 3, size2: 0, drag: 1, add: true });
      return; }
    if (!this.flown) { this.flown = true; world.effects.ring(this.x, this.y, 9, '#e0c8ff'); SFX.play('magic', 0.08); }
    if (!this.tgt || !this.tgt.targetable) { let best = null, bd = S.range + 60, taken = world.zones.filter((z) => z instanceof NecroSpear && z !== this && z.tgt).map((z) => z.tgt);
      for (const e of world.enemies) { if (!e.targetable || (e.def.dummy && world.mode !== 'lobby')) continue; const d = Math.hypot(e.x - this.x, e.y - this.y) + (taken.includes(e) ? 40 : 0); if (d < bd) { bd = d; best = e; } }
      this.tgt = best; if (!best) { if (this.t > 1.6) { this.alive = false; this.shatter(world, false); } return; } }
    const e = this.tgt, want = Math.atan2(e.y - this.y, e.x - this.x), df = Math.atan2(Math.sin(want - this.ang), Math.cos(want - this.ang)); this.ang += clamp(df, -11 * dt, 11 * dt);
    this.x += Math.cos(this.ang) * S.speed * dt; this.y += Math.sin(this.ang) * S.speed * dt; this.trail.push([this.x, this.y]); if (this.trail.length > 12) this.trail.shift();
    for (let k = 0; k < 2; k++) world.effects.part(this.x - Math.cos(this.ang) * 8 + randInt(-2, 2), this.y - Math.sin(this.ang) * 8 + randInt(-2, 2), -Math.cos(this.ang) * 30 + randInt(-10, 10), -Math.sin(this.ang) * 30 + randInt(-10, 10), { color: k ? '#b47aff' : '#f0e0ff', life: 0.35, size: k ? 3 : 2, size2: 0, drag: 2, add: true }); // 혼불 꼬리
    if (Math.hypot(e.x - this.x, e.y - this.y) < e.radius + 4) {
      const pool = shuffled(NECRO_DEBUFFS).slice(0, S.debuffs);
      world.damageEnemy(e, { damage: this.dmg, mods: this.owner.mods, knockback: 5, status: pool[0] }, Math.cos(this.ang), Math.sin(this.ang));
      if (e.alive && pool[1]) e.applyStatus(pool[1], this.owner.mods);
      this.alive = false; this.shatter(world, true); }
    if (this.t > 3.2) { this.alive = false; this.shatter(world, false); }
  }
  shatter(world, hit) { // 꽂힘: 뼈 파편 + 보랏빛 영혼 폭발
    const x = this.x, y = this.y;
    for (let k = 0; k < (hit ? 12 : 6); k++) { const a = Math.random() * TAU, sp = 40 + Math.random() * 80; world.effects.part(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 20, { color: k % 3 ? '#e8e0d0' : '#9a9284', life: 0.5, size: 2, size2: 0, drag: 2.5 }); }
    if (!hit) return;
    world.effects.ring(x, y, 14, '#ffffff'); world.effects.ring(x, y, 22, '#b47aff'); world.effects.impact(x, y, '#e0c8ff', this.ang);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; world.effects.part(x, y, Math.cos(a) * 60, Math.sin(a) * 40, { color: '#c08aff', life: 0.4, size: 3, size2: 0, drag: 3, add: true }); }
    world.addShake(0.05, 1.5); SFX.play('hit', 0.06);
  }
  render(ctx) {
    const rising = !this.flown, c = Math.cos(this.ang), s = Math.sin(this.ang), x = this.x, y = this.y, L = 13, T = this.t;
    if (rising) { // 땅 균열
      ctx.save(); ctx.translate(this.sx, this.sy + 3); ctx.scale(1, 0.4); ctx.globalAlpha = 0.8; ctx.strokeStyle = '#c08aff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 6 + T * 20, 0, TAU); ctx.stroke(); ctx.restore(); ctx.lineWidth = 1; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; // 혼불 꼬리 · 창 둘레 빛
    for (let k = 1; k < this.trail.length; k++) { const [x0, y0] = this.trail[k - 1], [x1, y1] = this.trail[k], f = k / this.trail.length; ctx.globalAlpha = 0.6 * f; ctx.strokeStyle = '#a060ff'; ctx.lineWidth = 1 + f * 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(T * 30); ctx.fillStyle = '#b47aff'; ctx.beginPath(); ctx.arc(x + c * 4, y + s * 4, 7, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + c * 9, y + s * 9, 2.5, 0, TAU); ctx.fill(); ctx.restore();
    const seg = (w, col, a0, a1) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x + c * a0, y + s * a0); ctx.lineTo(x + c * a1, y + s * a1); ctx.stroke(); };
    seg(5, OUTLINE, -L, L - 2); seg(3, '#e8e0d0', -L + 1, L - 3); seg(1, '#ffffff', -L + 2, L - 6);                         // 뼈 자루
    const px = -s, py = c; ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.moveTo(x + c * (L + 5), y + s * (L + 5)); ctx.lineTo(x + c * (L - 4) + px * 4, y + s * (L - 4) + py * 4); ctx.lineTo(x + c * (L - 4) - px * 4, y + s * (L - 4) - py * 4); ctx.closePath(); ctx.fill(); // 촉 외곽
    ctx.fillStyle = '#d8a0ff'; ctx.beginPath(); ctx.moveTo(x + c * (L + 3), y + s * (L + 3)); ctx.lineTo(x + c * (L - 3) + px * 2.5, y + s * (L - 3) + py * 2.5); ctx.lineTo(x + c * (L - 3) - px * 2.5, y + s * (L - 3) - py * 2.5); ctx.closePath(); ctx.fill(); // 보랏빛 촉
    for (const k of [-4, 3]) { ctx.fillStyle = '#e8e0d0'; ctx.fillRect(Math.round(x + c * k + px * 3) - 1, Math.round(y + s * k + py * 3) - 1, 2, 2); ctx.fillRect(Math.round(x + c * k - px * 3) - 1, Math.round(y + s * k - py * 3) - 1, 2, 2); } // 가시 (갈비뼈 마디)
    ctx.lineWidth = 1;
  }
}
// ── 묘지 (불멸의 군주): 10초 · 2초마다 자폭 해골 2~4 · 주변 일반 적 30% 정신지배 (보스 면역)
class NecroGraveyard {
  constructor(x, y, owner) { this.x = x; this.y = y; this.owner = owner; this.t = 0; this.next = 0.3; this.scan = 0; this.alive = true; this.id = Math.random();
    this.stones = []; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + Math.random() * 0.5, r = NECRO.grave.r * (0.45 + Math.random() * 0.35); this.stones.push([Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), randInt(0, 1)]); } }
  update(dt, world) {
    const G = NECRO.grave; this.t += dt;
    if (this.t >= G.life) { this.alive = false; world.effects.burst(this.x, this.y, '#b47aff', 14); return; }
    this.next -= dt;
    if (this.next <= 0) { this.next = G.every; const n = randInt(G.corpses[0], G.corpses[1]); // [사용자 결정] 자폭 해골 대신 시체가 솟아남 (리치: 곧바로 시체 창 + 회복)
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = Math.random() * G.r * 0.6, bx = this.x + Math.cos(a) * r, by = this.y + Math.sin(a) * r * 0.6; if (world.map.isSolidAt(bx, by)) continue;
        world.effects.dust(bx, by); for (let k = 0; k < 5; k++) world.effects.part(bx + randInt(-3, 3), by, randInt(-14, 14), -34, { color: k % 2 ? '#6a5a4a' : '#e8e0d0', life: 0.45, size: 2, size2: 0, drag: 1 });
        world.necroAddCorpse(world.necroGraveCorpse(bx, by), true); } // 묘지 시체는 곧바로 시체 창
      SFX.play('crate', 0.1); }
    this.scan -= dt;
    if (this.scan <= 0) { this.scan = 0.25;
      for (const e of world.enemies) { if (!e.targetable || e.graveRoll === this.id) continue; if (Math.hypot(e.x - this.x, (e.y - this.y) / 0.75) > G.r + e.radius) continue;
        e.graveRoll = this.id; // 묘지마다 한 번만 판정
        if (e.def.boss || e.def.master || e.def.dummy) { if (e.def.boss) world.effects.text(e.x, e.y - e.radius - 10, '정신지배 면역', '#aaaaaa'); continue; }
        if (Math.random() < G.charm) world.necroCharm(e, this.owner); } }
    if (Math.random() < 0.6) { const a = Math.random() * TAU, r = Math.random() * G.r; world.effects.part(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r * 0.6, 0, -10, { color: Math.random() < 0.5 ? '#7affc0' : '#b47aff', life: 0.9, size: 3, size2: 0, drag: 0.5, add: true }); }
  }
  render(ctx) {
    const G = NECRO.grave, k = Math.min(1, this.t / 0.3, (G.life - this.t) / 0.6);
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, 0.6); ctx.globalAlpha = 0.22 * k; ctx.fillStyle = '#3a2a4a'; ctx.beginPath(); ctx.arc(0, 0, G.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = '#b47aff'; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -this.t * 10; ctx.beginPath(); ctx.arc(0, 0, G.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    ctx.globalAlpha = k; for (const [sx, sy, kind] of this.stones) { ctx.fillStyle = OUTLINE; ctx.fillRect(sx - 3, sy - 8, 7, 9); ctx.fillStyle = '#6a6474'; ctx.fillRect(sx - 2, sy - 7, 5, 8); ctx.fillStyle = '#8a8494'; ctx.fillRect(sx - 2, sy - 7, 5, 1);
      if (kind) { ctx.fillStyle = '#3a3444'; ctx.fillRect(sx, sy - 6, 1, 4); ctx.fillRect(sx - 1, sy - 5, 3, 1); } } ctx.globalAlpha = 1; // 비석
  }
}
// ── 망자의 군대: 죽음의 계곡
// 디아블로 III의 Army of the Dead / Death Valley처럼 지정 지점에 망자 군단이 솟아나 타격하고, 적을 중심으로 끌어모은다.
class NecroArmyOfDead {
  constructor(x, y, owner) {
    this.x = x; this.y = y; this.owner = owner; this.t = 0;
    this.life = NECRO.army.life; this.next = 0.12; this.pulse = 0; this.alive = true;
    this.r = NECRO.army.r;
    // 실제 게임의 스켈레톤 기사 도트 스프라이트를 연출용으로 크게 사용한다.
    this.skeletonSprite = typeof getSprite === 'function'
      ? getSprite('skelknight', '#d8d0c0', '#9affd8') : null;
    // 14명의 망자 기사가 서로 다른 방향에서 솟아나 같은 중심을 향해 돌격한다.
    this.soldiers = Array.from({ length: 14 }, (_, i) => ({
      angle: i / 14 * TAU + (Math.random() - 0.5) * 0.12,
      radius: this.r * (0.66 + Math.random() * 0.28),
      phase: i / 14 * 0.82,
      scale: 1.85 + Math.random() * 0.42,
      tint: i % 3
    }));
  }
  update(dt, world) {
    this.t += dt; this.life -= dt; this.next -= dt;
    if (this.life <= 0 || !this.owner || this.owner.state === 'DEAD') {
      this.alive = false; world.effects.burst(this.x, this.y, '#9affd8', 24); return;
    }
    if (this.next <= 0) {
      this.next += NECRO.army.every; this.pulse++;
      // 군단이 중심을 강타할 때마다 지면에서 충격파와 뼛조각이 솟는다.
      world.effects.ring(this.x, this.y, this.r * (0.76 + (this.pulse % 2) * 0.1), '#9affd8');
      world.effects.rays(this.x, this.y, '#e0fff4', 16, this.r, 0.42);
      for (const e of world.enemies) {
        if (!e.targetable) continue;
        const dx = this.x - e.x, dy = this.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d > this.r + e.radius) continue;
        world.damageEnemy(e, { damage: world.skillDmg(NECRO.army.dmg), mods: this.owner.mods,
          knockback: 0, from: this.owner, minion: true }, 0, 0, { quiet: true });
        if (!e.alive) continue;
        if (e.def.boss || e.def.ccImmune) {
          e.slow = Math.max(e.slow || 0, 0.5); e.slowK = Math.min(e.slowK || 1, 0.72);
        } else e.stunT = Math.max(e.stunT || 0, 0.18);
        if (d > 20) {
          const pull = Math.min(NECRO.army.pull, d - 20);
          moveAndCollide(e, dx / d * pull, dy / d * pull, world.map);
        }
        world.effects.slash(e.x, e.y - 3, Math.atan2(dy, dx), 22, 1.25, '#eafff5');
        world.effects.part(e.x, e.y - 3, 0, -20, { color: '#dffff0', life: 0.42, size: 2.8, size2: 0, drag: 1 });
      }
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * TAU + this.pulse * 0.13, d = this.r * (0.28 + Math.random() * 0.68);
        world.effects.part(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d * 0.62,
          Math.cos(a) * 32, -28 - Math.random() * 38,
          { color: i % 3 ? '#d8d0c0' : '#9affd8', life: 0.5, size: 2.2 + Math.random() * 1.4, size2: 0, drag: 1.6, add: i % 3 === 0 });
      }
      SFX.play('magic', 0.05);
    }
    if (Math.random() < 0.82) {
      const a = Math.random() * TAU, d = 16 + Math.random() * this.r;
      world.effects.part(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d * 0.62,
        -Math.cos(a) * 24, -Math.sin(a) * 17 - 14,
        { color: Math.random() < 0.55 ? '#9affd8' : '#e8e0d0', life: 0.72, size: 2.2, size2: 0, drag: 1 });
    }
  }
  render(ctx) {
    const k = Math.max(0, Math.min(1, this.life / 0.48, this.t / 0.12));
    const wave = (this.t % NECRO.army.every) / NECRO.army.every;
    // 지면에 넓게 번지는 낮은 명도의 사령진: 병사 실루엣을 가리지 않게 절제한다.
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, 0.62);
    ctx.globalAlpha = 0.15 * k; ctx.fillStyle = '#12231f'; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.54 * k; ctx.strokeStyle = '#91d9be'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, this.r * (0.96 + Math.sin(this.t * 3.4) * 0.018), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.25 * k; ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, this.r * 0.72, 0, TAU); ctx.stroke();
    // 중앙으로 빠르게 수축하는 충격파 고리
    for (let i = 0; i < 3; i++) {
      const f = (wave + i / 3) % 1, radius = this.r * (0.12 + (1 - f) * 0.72);
      ctx.globalAlpha = (0.04 + 0.12 * f) * k;
      ctx.strokeStyle = i === 1 ? '#c08aff' : '#dffff0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke();
    }
    // 균열은 가장자리에서 중심으로 뻗어 군단이 솟아나는 방향을 강조한다.
    ctx.globalAlpha = 0.3 * k; ctx.strokeStyle = '#b8d8c8'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + 0.08 * Math.sin(this.t * 2);
      const r0 = this.r * 0.7, r1 = this.r * 0.96;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a + 0.035) * r1, Math.sin(a + 0.035) * r1); ctx.stroke();
    }
    ctx.restore();

    // 실제 스켈레톤 기사 스프라이트가 지면에서 일어나 무기를 들고 중심을 난타한다.
    for (const s of this.soldiers) {
      const cycle = (this.t * 0.92 + s.phase) % 1;
      const rise = Math.max(0, Math.min(1, cycle / 0.16));
      const charge = Math.max(0, Math.min(1, (cycle - 0.16) / 0.48));
      const fade = cycle > 0.82 ? Math.max(0, (1 - cycle) / 0.18) : 1;
      const radius = s.radius * (1 - charge * 0.82);
      const x = this.x + Math.cos(s.angle) * radius;
      const y = this.y + Math.sin(s.angle) * radius * 0.58;
      const faceX = this.x - x;
      const swing = Math.sin(this.t * 19 + s.phase * 13);
      const alpha = k * fade * (0.42 + rise * 0.58);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y + 5), 10 * s.scale, 3.2 * s.scale, 0, 0, TAU); ctx.fill();

      // 솟아오르는 순간 뼈 주변에만 희미한 녹색 혼불을 두른다.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * (0.12 + 0.1 * (1 - charge));
      ctx.fillStyle = '#8affcb'; ctx.beginPath(); ctx.arc(x, y - 10, 13 * s.scale, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;

      if (this.skeletonSprite && typeof drawSprite === 'function') {
        // drawSprite의 y는 스프라이트 하단 좌표다. 픽셀 아트의 선명함을 유지한다.
        drawSprite(ctx, this.skeletonSprite, Math.round(x), Math.round(y + 7), {
          flip: faceX < 0, scale: s.scale
        });
      } else {
        // 스프라이트 초기화가 실패한 경우에도 실루엣은 남도록 하는 최소 대체형
        ctx.fillStyle = '#d8d0c0';
        ctx.fillRect(Math.round(x - 5), Math.round(y - 12), 10, 18);
        ctx.fillStyle = '#27332f';
        ctx.fillRect(Math.round(x - 3), Math.round(y - 9), 2, 2);
        ctx.fillRect(Math.round(x + 1), Math.round(y - 9), 2, 2);
      }

      // 병사들이 중앙에 닿는 순간 검격이 교차한다.
      if (charge > 0.78 && charge < 1) {
        ctx.globalAlpha = alpha * (1 - Math.abs(0.88 - charge) * 4) * 0.7;
        ctx.strokeStyle = '#eafff5'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - 8, 12 * s.scale, -0.8 + swing * 0.3, 0.9 + swing * 0.3);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 중심부에 짧고 강한 혼불 기둥이 반복해서 솟아 군단의 타격 지점을 명확히 한다.
    const impact = 1 - Math.min(1, this.next / NECRO.army.every);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 * k * (0.5 + 0.5 * Math.sin(impact * Math.PI));
    ctx.fillStyle = '#9affd8'; ctx.beginPath();
    ctx.ellipse(this.x, this.y - 7, 17 + impact * 8, 26 + impact * 12, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
// ── 망자의 땅: 얼어붙는 땅 (10초 · 이동/공격 속도 -50% · 받는 피해 +50%)
class NecroLandOfDead {
  constructor(owner) {
    this.owner = owner; this.x = owner.x; this.y = owner.y;
    this.t = 0; this.life = NECRO.land.life; this.pulse = 0; this.alive = true;
    this.r = 520; // 던전 전역에 걸쳐 적용
  }
  update(dt, world) {
    this.t += dt; this.life -= dt;
    if (!this.owner || this.owner.state === 'DEAD' || this.life <= 0) {
      this.alive = false; world.effects.burst(this.x, this.y, '#9affd8', 24); return;
    }
    this.x = this.owner.x; this.y = this.owner.y;
    // 상태이상 면역 보스도 포함한 모든 적에게 짧은 유효기간을 계속 갱신한다.
    // Enemy.speedMul에서 이동·공격 속도를 절반으로, damageEnemy에서 받는 피해를 1.5배로 적용한다.
    for (const e of world.enemies) if (e.alive && !(e.def && e.def.dummy)) e.necroLandUntil = world.time + Math.max(0.2, dt * 2.5);
    this.pulse -= dt;
    if (this.pulse <= 0) {
      this.pulse = 0.55;
      for (const e of world.enemies) {
        if (!e.targetable) continue;
        world.effects.ring(e.x, e.y + 2, e.radius + 5, '#9affd8');
        world.effects.part(e.x, e.y - e.radius, randInt(-8, 8), -18, { color: '#d8fff0', life: 0.48, size: 2, size2: 0, drag: 1 });
      }
      world.effects.ring(this.x, this.y, 160 + Math.sin(this.t * 3) * 12, '#9affd8');
      SFX.play('magic', 0.035);
    }
    if (Math.random() < 0.6) {
      const a = Math.random() * TAU, d = Math.random() * this.r;
      world.effects.part(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d * 0.62,
        randInt(-8, 8), -14 - Math.random() * 18,
        { color: Math.random() < 0.5 ? '#9affd8' : '#c08aff', life: 0.8, size: 2, size2: 0, drag: 0.6, add: true });
    }
  }
  render(ctx) {
    const k = Math.max(0, Math.min(1, this.life / 0.8, this.t / 0.2));
    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1, 0.66);
    ctx.globalAlpha = 0.065 * k; ctx.fillStyle = '#173a33'; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.3 * k; ctx.strokeStyle = '#9affd8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, this.r * (0.96 + Math.sin(this.t * 2) * 0.025), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.22 * k; ctx.lineWidth = 1; ctx.strokeStyle = '#c08aff';
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + this.t * 0.12, r = this.r * (0.55 + (i % 3) * 0.12);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 14), Math.sin(a) * (r - 14));
      ctx.lineTo(Math.cos(a) * (r + 14), Math.sin(a) * (r + 14)); ctx.stroke();
    }
    ctx.restore();
  }
}
if (typeof COOP_CLASSES !== 'undefined') {
  COOP_CLASSES.NecroArmyOfDead = NecroArmyOfDead;
  COOP_CLASSES.NecroLandOfDead = NecroLandOfDead;
}

// ── 시체 (적이 쓰러진 자리) · 마우스를 올리면 강조
class NecroCorpseLayer {
  constructor() { this.alive = true; this.t = 0; this.L = []; this.hover = null; }
  update(dt, world) { this.t += dt; const L = world.necroCorpses || []; for (let i = L.length - 1; i >= 0; i--) if (world.time - L[i].t > NECRO.corpse.life) L.splice(i, 1); this.L = L; this.now = world.time;
    this.hover = world.player && /^necro_(raise|spear|grave|blast)$/.test(world.player.skillId || '') ? (world.necroCorpseAtMouse() || (world.player.skillId === 'necro_blast' ? world.necroCorpseNearMouse(48) : null)) : null; this.col = world.player && world.player.line && world.player.line.id === 'wraith' ? '#9affd8' : '#c08aff'; }
  render(ctx) {
    for (const c of this.L) { const x = Math.round(c.x), y = Math.round(c.y), fade = Math.min(1, (NECRO.corpse.life - (this.now - c.t)) / 3);
      ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = OUTLINE; ctx.fillRect(x - 5, y + 1, 10, 4); ctx.fillStyle = '#8a8274'; ctx.fillRect(x - 4, y + 2, 8, 2); ctx.fillStyle = '#d8d0c0'; ctx.fillRect(x - 3, y + 1, 3, 2); ctx.fillRect(x + 2, y + 2, 2, 1); // 뼈 무더기
      if (c === this.hover) { ctx.globalAlpha = 0.6 + 0.3 * Math.sin(this.t * 8); ctx.strokeStyle = this.col; ctx.beginPath(); ctx.ellipse(x, y + 3, 9, 4, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = this.col; ctx.fillRect(x - 1, y - 8, 2, 4); } }
    ctx.globalAlpha = 1;
  }
}
// 골렘 어그로: 적 AI가 도는 동안 '플레이어' 자리를 골렘 대역으로 바꿔 줌 (보스는 제외)
if (typeof updateEnemy === 'function') {
  const _updateEnemy = updateEnemy; NecroThrall.baseUpdate = _updateEnemy; // 부하는 원래 AI를 그대로 (어그로 대역 없이)
  const _enemySpeedMul = Object.getOwnPropertyDescriptor(Enemy.prototype, 'speedMul');
  if (_enemySpeedMul && _enemySpeedMul.get) Object.defineProperty(Enemy.prototype, 'speedMul', { configurable: true, get() { return _enemySpeedMul.get.call(this) * (this.necroLandSlow ? NECRO.land.slow : 1); } });
  // eslint-disable-next-line no-global-assign
  updateEnemy = function (e, dt, world) {
    e.necroLandSlow = !!(e.necroLandUntil && e.necroLandUntil > world.time);
    const G = !e.necroAlly && world.necroTauntFor ? world.necroTauntFor(e) : null; if (!G) return _updateEnemy(e, dt, world);
    const o = world.player, hf = world.hurtFlash; world.player = G.proxy;
    try { return _updateEnemy(e, dt, world); } finally { world.player = o; world.hurtFlash = hf; }
  };
}

// ── 바닥 사령 마법진 (영혼 폭발 · 사령 폭발)
class RatmaSigil {
  constructor(x, y, r, color, life = 0.9) { this.x = x; this.y = y; this.r = r; this.color = color; this.life = life; this.t = 0; this.alive = true; }
  update(dt) { this.t += dt; if (this.t >= this.life) this.alive = false; }
  render(ctx) {
    const k = Math.min(1, this.t / 0.15, (this.life - this.t) / 0.35), rot = this.t * 2.4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(this.x, this.y + 3); ctx.scale(1, 0.62); ctx.globalAlpha = 0.8 * Math.max(0, k);
    ctx.strokeStyle = this.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, this.r * 0.72, 0, TAU); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i <= 5; i++) { const a = rot + i * TAU * 2 / 5; const px = Math.cos(a) * this.r * 0.72, py = Math.sin(a) * this.r * 0.72; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); // 오각 별
    ctx.fillStyle = this.color; for (let i = 0; i < 10; i++) { const a = -rot * 0.7 + i * TAU / 10; ctx.fillRect(Math.cos(a) * this.r * 0.86 - 1, Math.sin(a) * this.r * 0.86 - 1, 2, 3); } // 문자
    ctx.restore(); ctx.lineWidth = 1;
  }
}
// ── 영혼 (영혼의 등불): 처치 자리에서 떠올라 주인에게 날아가 흡수됨
class RatmaSoulOrb {
  constructor(x, y, owner, onAbsorb) { this.x = x; this.y = y; this.owner = owner; this.onAbsorb = onAbsorb; this.t = 0; this.alive = true; this.vx = randInt(-30, 30); this.vy = -40; }
  update(dt, world) {
    this.t += dt; const P = this.owner, dx = P.x - this.x, dy = P.y - 4 - this.y, d = Math.hypot(dx, dy) || 1, pull = this.t < 0.35 ? 0 : 420;
    this.vx += dx / d * pull * dt; this.vy += dy / d * pull * dt; this.vx *= 0.94; this.vy *= 0.94; this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.random() < 0.6) world.effects.part(this.x, this.y, 0, 0, { color: '#9affe8', life: 0.25, size: 2, size2: 0, drag: 0, add: true });
    if ((d < 8 && this.t > 0.35) || this.t > 3) { this.alive = false; if (P.state !== 'DEAD') this.onAbsorb(world); }
  }
  render(ctx) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#9affe8'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(this.x) - 1, Math.round(this.y) - 1, 2, 2); ctx.restore(); }
}
// ── 라트마 처치: 영혼이 흩어졌다가 플레이어에게 흡수되는 연출
class RatmaSoulAbsorb {
  constructor(x, y, target) { this.target = target; this.t = 0; this.alive = true; this.p = []; for (let i = 0; i < 46; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 90; this.p.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, c: i % 2 ? '#9affd0' : '#c08aff' }); } }
  update(dt) {
    this.t += dt; const T = this.target;
    for (const q of this.p) { if (this.t < 0.7) { q.vx *= 0.93; q.vy *= 0.93; } else { const dx = T.x - q.x, dy = T.y - 6 - q.y, d = Math.hypot(dx, dy) || 1; q.vx += dx / d * 900 * dt; q.vy += dy / d * 900 * dt; q.vx *= 0.9; q.vy *= 0.9; if (d < 6) q.done = true; } q.x += q.vx * dt; q.y += q.vy * dt; }
    if (this.t > 2.6 || (this.t > 0.9 && this.p.every((q) => q.done))) this.alive = false;
  }
  render(ctx) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const q of this.p) { if (q.done) continue; ctx.fillStyle = q.c; ctx.globalAlpha = 0.85; ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3); ctx.globalAlpha = 0.3; ctx.fillRect(Math.round(q.x - q.vx * 0.03) - 1, Math.round(q.y - q.vy * 0.03) - 1, 2, 2); } ctx.restore(); }
}
// ── 8-4 라트마의 환영: 잠시 서 있다가 흩어짐 (연출용)
class RatmaShade {
  constructor(x, y) { this.x = x; this.y = y; this.t = 0; this.alive = true; }
  update(dt, world) { this.t += dt; if (Math.random() < 0.3) world.effects.part(this.x + randInt(-10, 10), this.y + randInt(-4, 8), 0, -16, { color: Math.random() < 0.5 ? '#9affd0' : '#c08aff', life: 0.7, size: 1.5, size2: 0, drag: 1, add: true }); if (this.t > 9) this.alive = false; }
  render(ctx) { const k = Math.min(1, this.t / 1, (9 - this.t) / 2); ctx.save(); ctx.globalAlpha = 0.45 * Math.max(0, k) * (0.8 + 0.2 * Math.sin(this.t * 4)); drawSprite(ctx, getSprite('boss_ratma'), Math.round(this.x), Math.round(this.y) + 14, {}); ctx.restore(); }
}

// ── 플레이어 곁 연출: 네크로맨서 발밑 문양 · 영혼 수확 표시 · 고유 무기 상시 VFX
class NecroAura {
  constructor(owner) { this.owner = owner; this.x = owner.x; this.y = owner.y; this.t = 0; this.alive = true; this.isNecroAura = true; }
  update(dt, world) { this.t += dt; this.x = this.owner.x; this.y = this.owner.y; if (!world.ratmaWantsAura(this.owner)) this.alive = false; }
  render(ctx) {
    const P = this.owner; if (P.state === 'DEAD') return;
    const x = Math.round(P.x), y = Math.round(P.y), t = this.t, w = P.weapon && P.weapon.def, fx = ratmaLineFx(P);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (P.hero.id === NECRO_ID) { // 발밑 사령 문양 + 영혼 조각 표시
      ctx.save(); ctx.translate(x, y + 7); ctx.scale(1, 0.45); ctx.globalAlpha = P.moving ? 0.55 : 0.28; ctx.strokeStyle = fx.trail;
      ctx.beginPath(); ctx.arc(0, 0, 9, t * 1.5, t * 1.5 + 4.5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 6, -t * 2, -t * 2 + 3.6); ctx.stroke();
      ctx.restore();
    }
    if (w && w.ratma === 'insight') for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; ctx.globalAlpha = 0.85; ctx.fillStyle = i ? '#e0c8ff' : '#b070ff'; ctx.fillRect(Math.round(x + Math.cos(a) * 11) - 1, Math.round(y - 4 + Math.sin(a) * 5) - 1, 2, 2); } // 지팡이 주변을 도는 영혼
    if (w && w.ratma === 'anguish' && typeof game !== 'undefined') { ctx.globalAlpha = 0.35; ctx.strokeStyle = '#7affc0'; // 플레이어와 소환수 사이의 영혼 연결선
      for (const a of game.allies) if (a instanceof NecroWraith && a.owner === P && a.tag === 'anguish') { ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.quadraticCurveTo((x + a.x) / 2, Math.min(y, a.y) - 14 + Math.sin(t * 4) * 3, a.x, a.y - 2); ctx.stroke(); } }
    if (w && w.ratma === 'record') { const k = Math.min(1, (P.ratmaRecord || 0) / RATMA_FX.record.need); // 떠다니는 기록 페이지 · 기록이 쌓일수록 밝아짐
      for (let i = 0; i < 3; i++) { const a = t * 1.2 + i * TAU / 3; ctx.globalAlpha = 0.35 + 0.55 * k; ctx.fillStyle = '#ffe9a0'; ctx.fillRect(Math.round(x + Math.cos(a) * 13) - 2, Math.round(y - 8 + Math.sin(a) * 4) - 1, 3, 4); }
      ctx.globalAlpha = 0.15 + 0.45 * k; ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(x + P.aim.x * 10, y - 1 + P.aim.y * 8, 3 + 3 * k, 0, TAU); ctx.fill(); }
    if (w && w.ratma === 'lantern') { ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 6); ctx.fillStyle = '#9affe8'; ctx.beginPath(); ctx.arc(x + P.aim.x * 11, y + P.aim.y * 8, 4, 0, TAU); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
function ratmaLineFx(P) { const L = P && P.hero && P.hero.id === NECRO_ID && P.line && P.line.fx; return L || { trail: '#b48aff', trail2: '#5a3a8a', kind: 'crack' }; }

// ── 소품: 퀘스트 오브젝트
class RatmaSarcophagus { // 모래 무덤: 숨겨진 석관
  constructor(x, y) { this.x = x; this.y = y; this.radius = 22; this.used = false; }
  label() { return this.used ? null : '[E] 반쯤 묻힌 석관'; }
  get labelColor() { return '#ffd06a'; }
  interact(game) { if (this.used) return; this.used = true; game.ratmaFoundSarcophagus(this); }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 13, y + 5, 26, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 12, y - 7, 24, 13); ctx.fillStyle = '#9a8460'; ctx.fillRect(x - 11, y - 6, 22, 11); ctx.fillStyle = '#b89e70'; ctx.fillRect(x - 11, y - 6, 22, 2);
    ctx.fillStyle = '#6a5838'; ctx.fillRect(x - 3, y - 4, 6, 6); ctx.fillStyle = '#e8e0cc'; ctx.fillRect(x - 2, y - 3, 4, 3); ctx.fillStyle = OUTLINE; ctx.fillRect(x - 1, y - 2, 1, 1); ctx.fillRect(x + 1, y - 2, 1, 1); // 해골 문양
    ctx.fillStyle = '#7ad06a'; ctx.fillRect(x - 2, y + 1, 1, 2); ctx.fillRect(x + 2, y + 1, 1, 2); // 새싹
    ctx.fillStyle = '#c8b080'; ctx.fillRect(x - 12, y + 3, 6, 3); ctx.fillRect(x + 7, y + 2, 5, 4); // 덮인 모래
    if (!this.used) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3); ctx.fillStyle = '#9affd0'; ctx.fillRect(x - 1, y - 10, 2, 2); ctx.globalAlpha = 1; }
  }
}
class RatmaGlyph { // 기원의 성역: 숨겨진 문양
  constructor(x, y) { this.x = x; this.y = y; this.radius = 24; }
  label(game) { const R = ratmaSave(game.save); return R.step >= 3 ? (game.portals.some((p) => p.ratmaDoor) ? null : '[E] 숨겨진 문 다시 열기') : '[E] 바닥의 희미한 문양'; }
  get labelColor() { return '#9affd0'; }
  interact(game) { game.ratmaTouchGlyph(this); }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0, on = game && ratmaSave(game.save).step >= 3;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55); ctx.globalAlpha = on ? 0.9 : 0.25 + 0.15 * Math.sin(t * 2);
    ctx.strokeStyle = on ? '#9affd0' : '#c8c0b0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(-4, 0, 6, -1.2, 1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(4, 0, 6, Math.PI - 1.2, Math.PI + 1.2); ctx.stroke(); // 맞물린 생과 사
    ctx.restore(); ctx.lineWidth = 1;
  }
}
class SoulAltar { // 로비: 영혼의 제단 (라트마 재등장)
  constructor(x, y) { this.x = x; this.y = y; this.radius = 22; }
  label() { return '[E] 영혼의 제단 — 라트마'; }
  get labelColor() { return '#9affd0'; }
  interact(game) { game.overlay = { type: 'ratma_altar', msg: null, t: 0 }; game.input.mouse.down = false; SFX.play('ui'); }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 11, y + 6, 22, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 10, y - 4, 20, 11); ctx.fillStyle = '#3a4048'; ctx.fillRect(x - 9, y - 3, 18, 9); ctx.fillStyle = '#4e5660'; ctx.fillRect(x - 9, y - 3, 18, 2);
    ctx.fillStyle = '#9affd0'; ctx.fillRect(x - 6, y, 4, 1); ctx.fillStyle = '#c08aff'; ctx.fillRect(x + 2, y, 4, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const a = t * 1.6 + i * TAU / 3; ctx.globalAlpha = 0.7; ctx.fillStyle = i % 2 ? '#c08aff' : '#9affd0'; ctx.fillRect(Math.round(x + Math.cos(a) * 9) - 1, Math.round(y - 12 + Math.sin(a) * 3) - 1, 2, 2); }
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 2); ctx.fillStyle = '#9affd0'; ctx.beginPath(); ctx.arc(x, y - 10, 7, 0, TAU); ctx.fill(); ctx.restore();
    ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 1.3); drawSprite(ctx, getSprite('boss_ratma'), x, y - 6, { scale: 0.6 }); ctx.globalAlpha = 1;
  }
}
class RatmaPhantom { // 심층: 라트마의 환영 (추가 시험)
  constructor(x, y, room) { this.x = x; this.y = y; this.room = room; this.radius = 24; this.gone = false; }
  label() { return this.gone ? null : '[E] 라트마의 환영'; }
  get labelColor() { return '#9affd0'; }
  interact(game) { if (this.gone) return; game.playCutscene(RATMA_PHANTOM_LINES, { id: 'ratma_phantom', focus: { x: this.x, y: this.y }, done: () => { game.overlay = { type: 'ratma_phantom', npc: this, t: 0 }; game.input.mouse.down = false; } }); }
  render(ctx, game) {
    if (this.gone) return; const t = game ? game.time : 0;
    if (game && Math.random() < 0.2) game.effects.part(this.x + randInt(-10, 10), this.y + randInt(-6, 8), 0, -14, { color: Math.random() < 0.5 ? '#9affd0' : '#c08aff', life: 0.7, size: 1.5, size2: 0, drag: 1, add: true });
    ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 3); drawSprite(ctx, getSprite('boss_ratma'), Math.round(this.x), Math.round(this.y) + 12, { scale: 0.75 }); ctx.globalAlpha = 1;
  }
}
class RatmaHiddenCoffin { // 생사의 경계: 숨겨진 방의 관 → 망자의 서약
  constructor(x, y) { this.x = x; this.y = y; this.radius = 20; this.used = false; }
  label() { return this.used ? null : '[E] 벽 틈에 숨겨진 관'; }
  get labelColor() { return '#9affd0'; }
  interact(game) { if (this.used) return; this.used = true; game.effects.rays(this.x, this.y, '#9affd0', 14, 60, 0.8); SFX.play('solomon', 0.4);
    const r = game.grantRatmaWeapon('weapon_ratma_oath_001', { inRun: true, at: this });
    game.showBanner(r.dupe ? '이미 지닌 서약' : '고유 무기 — 망자의 서약', r.dupe ? `대체 보상: ${CUR.name} +${RATMA_DUPE_REWARD}` : '생사의 경계 숨겨진 방에 잠들어 있던 검 (무기고에도 보관됨)', '#9affd0'); }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 6, y + 9, 12, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 6, y - 10, 12, 20); ctx.fillStyle = this.used ? '#3a3a40' : '#4a5258'; ctx.fillRect(x - 5, y - 9, 10, 18);
    ctx.fillStyle = this.used ? '#555' : '#9affd0'; ctx.fillRect(x - 1, y - 6, 2, 8); ctx.fillRect(x - 3, y - 4, 6, 2);
    if (!this.used) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 4); ctx.fillStyle = '#9affd0'; ctx.fillRect(x - 7, y - 11, 14, 22); ctx.globalAlpha = 1; }
  }
}

// ── 보스 전용 패턴: 순환의 종말 — 생명(초록)·죽음(보라) 나선이 서로 반대로 돌고, 1초마다 발밑에 사령 마법진
BOSS_PATTERNS.lifedeath = {
  update(e, dt, world, ctx, enr) {
    const P = e.pat, d = e.pd; d.timer -= dt; d.a = (d.a || 0) + P.spin * dt * enr; const k0 = d.k || 0; d.k = k0 + dt;
    while (d.timer <= 0) {
      for (let i = 0; i < 3; i++) { world.enemyShoot(e.x, e.y, d.a + i * TAU / 3, e.def.bulletSpeed * 0.85, e.damage, P.color, 3); world.enemyShoot(e.x, e.y, -d.a + i * TAU / 3 + 0.5, e.def.bulletSpeed * 0.85, e.damage, P.color2, 3); }
      d.timer += P.interval;
    }
    if (Math.floor(d.k) !== Math.floor(k0)) { const p = world.player; world.hazards.push(new Hazard(p.x, p.y, { r: 30, delay: 0.8, damage: Math.round(e.damage * 1.2), bullets: 6, color: P.color2 })); }
    return e.stateTime >= P.duration;
  }
};

// ── 공격력 보너스 (망자의 서약 중첩 · 기록의 소환수 강화 · 사령검 베기): Player.mods 에서 더함
Player.prototype.ratmaAtkBonus = function () {
  const t = this.time; let b = 0;
  if (this.oathN && this.oathUntil > t) b += RATMA_FX.oath.atk * this.oathN;
  if (this.recordBuffUntil > t) b += RATMA_FX.record.minionAtk;
  return b;
};

// ════════════════════════════════════════════
// Game 확장
// ════════════════════════════════════════════
(function () {
  const G = Game.prototype, wrap = (name, fn) => { const orig = G[name]; G[name] = function (...a) { return fn.call(this, orig, ...a); }; };

  // ── 영웅·로비 ─────────────────────────────
  wrap('selectHero', function (orig, hero, line) { // 히든: 해금 전엔 고를 수 없음
    if (hero && hero.hidden && !this.save.unlocked.includes(hero.id)) { this.effects.text(this.player.x, this.player.y - 18, '아직 만나지 못한 존재입니다', '#9affd0'); SFX.play('deny'); return; }
    return orig.call(this, hero, line);
  });
  wrap('openHeroSelection', function (orig, hero) {
    if (hero && hero.hidden && !this.save.unlocked.includes(hero.id)) { this.effects.text(this.player.x, this.player.y - 18, '아직 만나지 못한 존재입니다', '#9affd0'); SFX.play('deny'); return; }
    return orig.call(this, hero);
  });
  wrap('jobLevelEntries', function (orig) { const sv = this.save; return orig.call(this).filter((e) => !(e.hero.hidden && !sv.unlocked.includes(e.hero.id))); });
  wrap('enterLobby', function (orig, fromVault) {
    const r = orig.call(this, fromVault), sv = this.save, R = ratmaSave(sv);
    // 히든 캐릭터 단상: 해금 전엔 빼고, 9명이 되면 간격을 다시 맞춤
    const peds = this.props.filter((o) => o instanceof Pedestal);
    for (const o of peds) if (o.hero.hidden && !sv.unlocked.includes(o.hero.id)) this.props.splice(this.props.indexOf(o), 1);
    const shown = this.props.filter((o) => o instanceof Pedestal);
    if (shown.length > 8) shown.forEach((o, i) => { const c = this.map.tileCenter(5 + i * 3, 8); o.x = c.x; o.y = c.y; o.row = i % 2; });
    if (R.defeated) { const c = this.map.tileCenter(9, 13); this.props.push(new SoulAltar(c.x, c.y)); }
    return r;
  });

  // ── 전직 외형·정체성 (따르기로 직업을 바꾼 캐릭터: 원래 이름·옷색을 이어받음) ──
  G.applyNecroIdentity = function (p) {
    if (!p || !p.necroFrom || p.hero.id !== NECRO_ID) return;
    const base = this.data.heroes.get(p.necroFrom); if (!base) return;
    const personal = base.name.split(' ').slice(1).join(' ') || base.name, title = p.line ? p.line.ranks[p.rank] : '사령술사';
    const look = Object.assign({}, p.hero.look, { body: shade(base.look.body, 0.62) });
    p.hero = Object.create(p.hero, { name: { value: `${title} ${personal}`, enumerable: true }, look: { value: look, enumerable: true } });
  };
  wrap('setJob', function (orig, p, line, rank) { // 진화 단계별 외형(looks)은 여기서 직접 적용 — game.js가 예전 버전으로 캐시돼 있어도 외형이 바뀌게
    const r = orig.call(this, p, line, rank);
    if (p && line && line.looks) { const lk = line.looks[rank] || line.looks[0]; p.hero = heroWithLook(this.data.heroes.get(p.hero.id) || p.hero, lk); }
    if (p && p.necroFrom) this.applyNecroIdentity(p); return r; });
  wrap('snapshotRun', function (orig) { const s = orig.call(this); if (this.player && this.player.necroFrom) s.p.necroFrom = this.player.necroFrom; return s; });
  wrap('playerFromSnapshot', function (orig, hero, s, p) { const np = orig.call(this, hero, s, p); if (s && s.necroFrom && np.hero.id === NECRO_ID) { np.necroFrom = s.necroFrom; this.applyNecroIdentity(np); } return np; });
  wrap('startRun', function (orig, deep) { this.ratmaSanctumDone = false; this.ratmaRun = false; return orig.call(this, deep); });
  wrap('resumeRun', function (orig) { this.ratmaSanctumDone = false; this.ratmaRun = false; return orig.call(this); });
  wrap('enterSanctum', function (orig) { this.ratmaSanctumDone = true; return orig.call(this); });

  // ── 생사의 경계: 첫 대결은 '탐험 중인 캐릭터' 그대로 들어가므로 부활도 그대로 쓸 수 있게
  wrap('reviveRun', function (orig) { if (!this.ratmaRun) return orig.call(this); const tw = this.trialW; this.trialW = null; try { return orig.call(this); } finally { this.trialW = tw; } });

  // ── 스테이지 진입: 퀘스트 오브젝트 · 환영 · 심층 환영 ──
  wrap('loadStage', function (orig) {
    const r = orig.call(this), W = this.W, sv = this.save, R = ratmaSave(sv);
    if (this.mode !== 'dungeon' || this.areaId || this.coopRunKey) return r;
    if (W.trial) { if (this.trialId === 'ratma' && this.levelIdx === STAGES_PER_WORLD - 1) this.playCutscene(RATMA_BOUNDARY_LINES, { id: 'ratma_boundary', focus: null }); return r; }
    const map = this.map, roomFor = (types) => { for (const t of types) { const rm = map.rooms.find((x) => x.type === t); if (rm) return rm; } return null; };
    if (this.worldIdx === 4 && !this.isBossStage && R.step === 0) { // 1단계: 모래 무덤 — 숨겨진 석관
      const rm = roomFor(['treasure', 'combat', 'exit']); if (rm) { const c = map.tileCenter(rm.cx, rm.cy), s = this.freeSpot(rm, c.x + 28, c.y - 18, 12); this.props.push(new RatmaSarcophagus(s.x, s.y)); }
    }
    if (this.worldIdx === 7 && this.isBossStage && R.step === 1) { // 2단계: 망자의 성 8-4 — 라트마의 환영과 첫 대면
      const s = map.startRoom, c = map.tileCenter(s.cx, s.cy - 2); this.zones.push(new RatmaShade(c.x, c.y));
      this.playCutscene(RATMA_APPARITION_LINES, { id: 'ratma_apparition', focus: { x: c.x, y: c.y } });
    }
    if (W.deep && R.defeated && this.levelIdx === RATMA_PHANTOM.level && Math.random() < RATMA_PHANTOM.chance) { // 심층: 라트마의 환영 (추가 시험)
      const rm = roomFor(['treasure']); if (rm) { const c = map.tileCenter(rm.cx, rm.cy), s = this.freeSpot(rm, c.x - 26, c.y - 10, 12); this.props.push(new RatmaPhantom(s.x, s.y, rm)); }
    }
    return r;
  });
  G.ratmaFoundSarcophagus = function (o) {
    const R = ratmaSave(this.save);
    this.effects.rays(o.x, o.y - 6, '#9affd0', 12, 50, 0.8); this.effects.burst(o.x, o.y - 6, '#ffd06a', 14); SFX.play('solomon', 0.35);
    this.playCutscene(RATMA_SARCOPHAGUS_LINES, { always: true, force: true, focus: { x: o.x, y: o.y }, done: () => {
      R.step = Math.max(R.step, 1); R.fragment = true; writeSave(this.save);
      this.showBanner('생명의 파편', '라트마와 관련된 첫 번째 단서 — 망자의 성에서 그를 다시 만나게 된다', '#9affd0'); } });
  };
  G.ratmaTouchGlyph = function (o) {
    const R = ratmaSave(this.save);
    const openDoor = () => { if (this.portals.some((p) => p.ratmaDoor)) return; const po = new Portal(o.x, o.y - 22, () => this.enterBoundary(), '숨겨진 문 — 생사의 경계', [154, 255, 208]); po.ratmaDoor = true; this.portals.push(po);
      this.effects.rays(o.x, o.y - 22, '#9affd0', 16, 70, 1); this.effects.skyBeam(o.x, o.y - 22, '#c08aff', 0, 8); SFX.play('gate', 0.5); };
    if (this.coop) { this.effects.text(o.x, o.y - 20, '혼자일 때만 열리는 문입니다', '#9affd0'); return; }
    if (R.step >= 3) { openDoor(); return; }
    this.playCutscene(RATMA_GLYPH_LINES, { always: true, force: true, focus: { x: o.x, y: o.y }, done: () => { R.step = 3; writeSave(this.save); openDoor(); this.showBanner('숨겨진 문', '생사의 경계 — 라트마가 만든 시험의 공간', '#9affd0'); } });
  };
  G.enterBoundary = function () { // 4단계: 생사의 경계 (지금 캐릭터 그대로 · 시련 맵 구조 재사용)
    const T = RATMA_TRIAL; this.ratmaRun = true; this.trialId = T.id; this.trialRank = this.player.rank || 0;
    this.trialW = Object.assign({}, worldDef(T.world), T.W); this.worldIdx = T.world; this.levelIdx = STAGES_PER_WORLD - 1;
    this.loadStage();
  };

  // ── 방 정리: 성역 문양 · 경계의 숨겨진 방 · 심층 환영의 시험 ──
  wrap('clearRoom', function (orig, r) {
    const R = ratmaSave(this.save), rt = r.ratmaTrial;
    if (rt) { r.challenge = false; r.ratmaTrial = false; }
    const res = orig.call(this, r);
    if (rt) this.ratmaPhantomReward(r);
    if (!this.trialW && !this.coopRunKey && r.type === 'boss' && this.W.sanctum && !this.areaId && R.step >= 2 && !R.defeated) { // 3단계: 문지기 너머의 숨겨진 문양
      const g = this.freeSpot(r, (r.x0 + 3) * TILE, (r.y0 + r.h - 3) * TILE, 14); this.props.push(new RatmaGlyph(g.x, g.y));
      setTimeout(() => { if (this.mode === 'dungeon' && this.props.some((p) => p instanceof RatmaGlyph)) this.showBanner('영혼의 인장이 떨린다', '방 한쪽 바닥에 희미한 문양이 있다', '#9affd0'); }, 3200);
    }
    if (this.trialW && /^ratma/.test(this.trialId || '') && r.type === 'combat' && !ratmaSave(this.save).got.includes('weapon_ratma_oath_001') && !this.props.some((p) => p instanceof RatmaHiddenCoffin)) { // 생사의 경계 숨겨진 방
      const s = this.freeSpot(r, (r.x0 + r.w - 2) * TILE, (r.y0 + 2) * TILE, 10); this.props.push(new RatmaHiddenCoffin(s.x, s.y));
      this.showBanner('희미한 영혼의 울림', '방 구석 벽 틈에 무언가 숨겨져 있다', '#9affd0');
    }
    return res;
  });
  G.ratmaStartPhantomTrial = function (npc) {
    const r = npc.room; npc.gone = true; this.effects.rays(npc.x, npc.y, '#9affd0', 14, 60, 0.7);
    r.challenge = true; r.ratmaTrial = true; r.wavesLeft = BALANCE.specialRooms.challenge.waves; r.state = 'idle';
    this.showBanner('라트마의 추가 시험', `강화된 정예 몬스터 ${r.wavesLeft}번의 습격을 버티세요`, '#9affd0'); SFX.play('boss'); this.addShake(0.2, 3);
    this.activateRoom(r);
  };
  G.ratmaPhantomReward = function (r) {
    const R = ratmaSave(this.save), p = this.player, c0 = this.map.tileCenter(r.cx, r.cy);
    R.phantomWins++; this.effects.rays(c0.x, c0.y, '#9affd0', 18, 80, 1); SFX.play('solomon', 0.45);
    if (!R.got.includes('weapon_ratma_lantern_001')) { this.grantRatmaWeapon('weapon_ratma_lantern_001', { inRun: true });
      this.showBanner('심층 특별 보상 — 영혼의 등불', '라트마의 환영이 등불을 건넸다 (무기고에도 보관됨)', '#9affe8'); }
    else { const w = p.weapon; // 특별 강화: 든 무기 +1 (최대면 골드)
      if (w && w.lv < BALANCE.upgrade.maxLevel) { w.lv++; this.showBanner('라트마의 특별 강화', `${weaponTitle(w)} — 균형이 무기에 깃들었다`, '#9affd0'); }
      else { this.gold += 300; this.showBanner('라트마의 특별 보상', '골드 +300', '#9affd0'); } }
    writeSave(this.save);
  };

  // ── 처치: 퀘스트 · 영혼 수확 · 무기 효과 · 라트마 연출 ──
  wrap('onEnemyKilled', function (orig, enemy) {
    if (enemy.rewardGiven) return orig.call(this, enemy);
    const res = orig.call(this, enemy); const p = this.player; if (!p || enemy.def.dummy) return res;
    const R = ratmaSave(this.save), boss = !!enemy.def.boss && !enemy.def.master;
    if (this.mode === 'dungeon' && !this.trialW && !this.areaId && !this.coopRunKey && enemy.def.id === 'boss_lich_king' && R.step === 1) { // 2단계 완료: 영혼의 인장
      R.step = 2; R.seal = true; writeSave(this.save);
      const at = { x: enemy.x, y: enemy.y };
      setTimeout(() => { if (this.mode === 'dungeon') this.playCutscene(RATMA_SEAL_LINES, { id: 'ratma_seal', always: true, force: true, focus: at, done: () => this.showBanner('영혼의 인장', '기원의 성역 — 무명의 문지기 너머의 문양을 찾아라', '#9affd0') }); }, 1600);
    }
    if (enemy.def.ratma) { this.zones.push(new RatmaSoulAbsorb(enemy.x, enemy.y, p)); this.screenFlash = 0.3; this.flashColor = '154,255,208'; }
    if (this.mode !== 'dungeon') return res;
    // 시체: 네크로맨서가 있으면 적이 쓰러진 자리에 (보스·허수아비 제외)
    if (p.hero.id === NECRO_ID && !enemy.def.boss && !enemy.def.master && !enemy.necroCharmed) this.necroAddCorpse(enemy);
    const lw = enemy.lastWeapon, w = p.weapon && p.weapon.def, now = this.time;
    if (enemy.necroBurstUntil > now) this.explodeAt(enemy.x, enemy.y, 44, { color: '#b47aff', hurtEnemies: true, src: { damage: this.skillDmg(30), mods: p.mods, knockback: 5 } }); // 저주 폭발: 저주받은 적이 터짐
    // 라트마의 이해: 저주받은 적 처치 → 영혼 파편 · 5마리마다 영혼 폭발
    if (w && w.ratma === 'insight' && enemy.curse > 0) {
      const F = RATMA_FX.insight, mods = weaponMods(p, p.weapon);
      for (let i = 0; i < F.shards; i++) { const a = i / F.shards * TAU + Math.random() * 0.4; this.projectiles.push(new Projectile({ x: enemy.x, y: enemy.y, dx: Math.cos(a), dy: Math.sin(a), speed: 220, range: 140, damage: w.damage * F.shardMult, pierce: 0, knockback: 1, mods, color: '#d8b0ff', size: 2, homing: 5, weaponId: 'ratma_shard' })); }
      p.insightKills = (p.insightKills || 0) + 1;
      if (p.insightKills >= F.burstNeed) { p.insightKills = 0;
        this.zones.push(new RatmaSigil(enemy.x, enemy.y, F.burstR, '#b070ff', 1));
        this.explodeAt(enemy.x, enemy.y, F.burstR, { color: '#b070ff', hurtEnemies: true, src: { damage: w.damage * F.burstMult, mods, knockback: 8, status: { type: 'curse', chance: 1, duration: 4 } } });
        this.effects.rays(enemy.x, enemy.y, '#d8b0ff', 14, F.burstR, 0.6); this.effects.text(enemy.x, enemy.y - 24, '죽음의 문장', '#d8b0ff', true); this.addShake(0.2, 4); SFX.play('explode', 0.08); }
    }
    // 라트마의 기록: 어느 칸에 있든 기록 (사용 조건 없음)
    const rec = p.weapons.find((x) => x.def.ratma === 'record');
    if (rec) { const F = RATMA_FX.record, b = p.ratmaRecord || 0; p.ratmaRecord = b + (boss ? F.boss : enemy.elite ? F.elite : F.kill);
      if (p.ratmaRecord >= F.need) { p.ratmaRecord = 0; const mods = weaponMods(p, rec);
        this.explodeAt(p.x, p.y, F.r, { color: '#ffe9a0', hurtEnemies: true, src: { damage: rec.def.damage * F.mult, mods, knockback: 6, status: { type: 'freeze', chance: 1, duration: F.slow, slow: 0.5 } } });
        this.effects.rays(p.x, p.y - 4, '#ffe9a0', 18, F.r, 0.8); this.effects.ring(p.x, p.y, F.r, '#fff4c0');
        for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; this.effects.part(p.x, p.y - 6, Math.cos(a) * 70, Math.sin(a) * 50 - 20, { color: i % 2 ? '#ffe9a0' : '#c08aff', life: 0.9, size: 2, size2: 0, drag: 1.5, add: true }); } // 영혼 문자
        this.effects.text(p.x, p.y - 28, '생사의 기록', '#ffe9a0', true); SFX.play('solomon', 0.3);
        if (this.allies.some((a) => a.alive && a.owner === p)) { p.recordBuffUntil = p.time + F.minionDur; this.effects.text(p.x, p.y - 38, '소환수 공명 — 공격력 +20%', '#c08aff'); } }
    }
    // 망자의 서약: 처치 시 공격력 +4% (5초, 최대 5) · 5중첩에서 처치하면 영혼 파동
    if (lw && w && w.ratma === 'oath' && lw === w.id) { const F = RATMA_FX.oath; if (!(p.oathUntil > p.time)) p.oathN = 0;
      if (p.oathN >= F.max) { this.explodeAt(enemy.x, enemy.y, F.waveR, { color: '#9affd0', hurtEnemies: true, src: { damage: w.damage * F.waveMult, mods: weaponMods(p, p.weapon), knockback: 6 } }); this.effects.ring(enemy.x, enemy.y, F.waveR, '#9affd0'); this.effects.text(enemy.x, enemy.y - 20, '영혼 파동', '#9affd0'); }
      p.oathN = Math.min(F.max, (p.oathN || 0) + 1); p.oathUntil = p.time + F.dur; this.effects.text(p.x, p.y - 20, `서약 ${p.oathN}`, '#9affd0'); }
    // 영혼의 등불: 처치 시 20% 확률로 영혼
    if (w && w.ratma === 'lantern' && Math.random() < RATMA_FX.lantern.chance) {
      this.zones.push(new RatmaSoulOrb(enemy.x, enemy.y, p, (world) => { const F = RATMA_FX.lantern; p.energy = Math.min(p.maxEnergy, p.energy + F.energy); p.lanternSouls = (p.lanternSouls || 0) + 1; world.effects.text(p.x, p.y - 18, `영혼 ${p.lanternSouls}/${F.need}`, '#9affe8');
        if (p.lanternSouls >= F.need) { p.lanternSouls = 0; p.lanternBoostUntil = world.time + F.window; world.effects.ring(p.x, p.y, 20, '#9affe8'); world.effects.text(p.x, p.y - 28, '다음 공격 +50%', '#9affe8', true); } }));
    }
    return res;
  });

  // ── 피해 (적에게): 고유 무기 효과 ──
  wrap('damageEnemy', function (orig, enemy, src, kx, ky, opts) {
    if (!enemy || !src) return orig.call(this, enemy, src, kx, ky, opts);
    const p = this.player, wid = src.weaponId || (src.wdef && src.wdef.id) || null, def = wid && this.data.weapons.get(wid), key = def && def.ratma, now = this.time;
    let mult = 1;
    if (key === 'crown') { const F = RATMA_FX.crown; if (enemy.def.boss) mult *= 1 + F.boss + (enemy.hp < enemy.maxHp * F.low ? F.lowBonus : 0); else if (enemy.elite) mult *= 1 + F.elite; }
    if (key === 'lantern' && p && p.lanternBoostUntil > now) mult *= RATMA_FX.lantern.mult;
    if (enemy.necroLandUntil > now) mult *= NECRO.land.damageTaken;
    const hp0 = enemy.hp; let res;
    if (mult !== 1 && typeof src.damage === 'number') { const d0 = src.damage; src.damage = d0 * mult; try { res = orig.call(this, enemy, src, kx, ky, opts); } finally { src.damage = d0; } }
    else res = orig.call(this, enemy, src, kx, ky, opts);
    if (!key || !p || p.state === 'DEAD') return res;
    const dealt = Math.max(0, hp0 - Math.max(0, enemy.hp));
    if (key === 'anguish' && dealt > 0) { // 적중 지점에 작은 망령 (6초 · 최대 3 · 공격력 45%)
      const F = RATMA_FX.anguish, inst = p.weapons.find((x) => x.def.id === wid), mine = this.allies.filter((a) => a instanceof NecroWraith && a.owner === p && a.tag === 'anguish' && a.alive);
      while (mine.length >= F.max) { const o = mine.shift(); o.alive = false; o.life = 0; }
      const wm = () => weaponMods(p, inst || { def, lv: 0 });
      this.allies.push(new NecroWraith(enemy.x, enemy.y - 6, p, { dmg: def.damage * F.atk, life: F.life, skill: false, wmods: wm, rate: F.rate, small: true, tag: 'anguish', idx: mine.length,
        onEnd: (world, wr) => { world.explodeAt(wr.x, wr.y, F.waveR, { color: '#7affc0', hurtEnemies: true, src: { damage: def.damage * F.waveMult, mods: wm(), knockback: 3 } }); world.effects.ring(wr.x, wr.y, F.waveR, '#c08aff'); } }));
      this.effects.ring(enemy.x, enemy.y, 10, '#7affc0');
    }
    if (key === 'balance' && dealt > 0) { const F = RATMA_FX.balance;
      if (p.hp <= p.maxHp * F.hp && !(p.balHpAt > now)) { const h = Math.round(p.maxHp * F.heal); p.hp = Math.min(p.maxHp, p.hp + h); p.balHpAt = now + F.cd; this.effects.heal(p.x, p.y); this.effects.text(p.x, p.y - 22, `균형 +${h}`, '#9affd0'); }
      if (p.energy <= p.maxEnergy * F.en && !(p.balEnAt > now)) { p.energy = Math.min(p.maxEnergy, p.energy + F.energy); p.balEnAt = now + F.cd; this.effects.text(p.x, p.y - 30, `균형 +${F.energy}`, '#8ab8ff'); }
    }
    return res;
  });

  // ── 피해 (플레이어가 받는): 라트마의 인내 '죽음을 견디는 자' · 경계의 왕관 대가 ──
  wrap('damagePlayer', function (orig, amount) {
    const p = this.player, w = p && p.weapon && p.weapon.def, now = this.time;
    if (p && w && p.state !== 'DEAD') {
      if (w.ratma === 'crown' && !this.enemies.some((e) => e.alive && e.def.boss)) amount = Math.round(amount * (1 + RATMA_FX.crown.taken));
    }
    return orig.call(this, amount);
  });

  // ── 네크로맨서 F키: 2차 궁극기 (기존 G 기능을 F로 이동)
  const NECRO_SKILLS = new Set(['necro_none', 'necro_blast', 'necro_raise', 'necro_spear', 'necro_grave']);
  wrap('useSkill', function (orig) {
    const p = this.player;
    if (!p || p.hero.id !== NECRO_ID || !NECRO_SKILLS.has(p.skillId)) return orig.call(this);
    if (p.castLock > 0) return;
    if (p.denyT > 0) { this.effects.text(p.x, p.y - 20, '부정됨', '#d8f0ff'); return; }
    if (!this.zoneRight('job')) { this.effects.text(p.x, p.y - 20, '직업의 권리를 빼앗겼다', '#ffd84a'); return; }
    const say = (t) => { if (!(this.necroSayT > this.time)) { this.necroSayT = this.time + 0.8; this.effects.text(p.x, p.y - 22, t, '#c8c0d8'); } };
    const F = this.necroFSkill(p);
    if (!F) { say('F 궁극기는 2차 진화 후 사용할 수 있습니다'); return; }
    if ((p.graveCd || 0) > 0) { say(` ${F.name} 대기 ${Math.ceil(p.graveCd)}초`); return; }
    if (F.id === 'necro_army') {
      p.graveCd = F.cd || NECRO.army.cd; this.ultimateFx(p); this.necroArmyOfDead(p);
    } else if (F.id === 'necro_land') {
      p.graveCd = F.cd || NECRO.land.cd; this.ultimateFx(p); this.necroLandOfDead(p);
    } else if (F.id === 'necro_raise') {
      // 예전 저장·기술 참조 호환: 부활 기술을 망자의 군대로 전환
      p.graveCd = NECRO.army.cd; this.ultimateFx(p); this.necroArmyOfDead(p);
    } else if (F.id === 'necro_grave') {
      // 예전 저장·기술 참조 호환: 묘지를 망자의 땅으로 전환
      p.graveCd = NECRO.land.cd; this.ultimateFx(p); this.necroLandOfDead(p);
    } else { say('사용할 수 없는 사령 기술입니다'); return; }
    this.guildEvent('skills'); SFX.play('skill');
  });
  G.necroBestAutoCorpse = function (p) {
    const corpses = this.necroCorpses || [], enemies = this.enemies.filter((e) => e.targetable && !(e.def && e.def.dummy));
    let best = null, bestScore = 0;
    const blast = p.line && p.line.id === 'wraith', radius = blast ? NECRO.blast.r : NECRO.spear.range;
    for (const c of corpses) {
      let score = 0, nearest = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.x - c.x, e.y - c.y);
        nearest = Math.min(nearest, d);
        if (blast && d <= radius + e.radius) score += e.def.boss ? 3.5 : e.elite ? 1.8 : 1;
        else if (!blast && d <= radius + e.radius) score += (e.def.boss ? 3 : e.elite ? 1.7 : 1) / (1 + d / 180);
      }
      if (!blast && nearest < radius + 24) score += 1 / (1 + nearest / 100);
      score -= Math.max(0, this.time - c.t) * 0.015;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  };
  G.necroLandSpearFree = function (p) {
    return !!(p && p.hero.id === NECRO_ID && p.state !== 'DEAD'
      && p.line && p.line.id === 'lich' && p.skillId === 'necro_spear'
      && (p.necroLandSpearUntil || 0) > this.time);
  };
  G.necroFreeSpearOrigin = function (p) {
    const mw = this.mouseWorld(), dx = mw.x - p.x, dy = mw.y - p.y;
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, 220 / d);
    const x = p.x + dx * k, y = p.y + dy * k;
    return this.map && this.map.isSolidAt(x, y) ? { x: p.x, y: p.y } : { x, y };
  };
  G.necroCorpseCast = function (p, automatic) {
    if (!p || p.hero.id !== NECRO_ID || p.rank < 1 || p.state === 'DEAD') return false;
    if (p.castLock > 0 || p.denyT > 0 || !this.zoneRight('job') || (p.necroCorpseCd || 0) > 0) return false;
    const freeSpear = this.necroLandSpearFree(p);
    const c = freeSpear
      ? this.necroFreeSpearOrigin(p)
      : (automatic ? this.necroBestAutoCorpse(p)
        : (this.necroCorpseAtMouse() || this.necroCorpseNearMouse(48)));
    if (!c) {
      if (!automatic && !(this.necroSayT > this.time)) {
        this.necroSayT = this.time + 0.8;
        this.effects.text(p.x, p.y - 22, '시체에 마우스를 올리거나 V 자동을 켜세요', '#c8c0d8');
      }
      return false;
    }
    if (p.line && p.line.id === 'wraith' && p.skillId === 'necro_blast') this.necroBlast(p, c);
    else if (p.line && p.line.id === 'lich' && p.skillId === 'necro_spear') this.necroSpears(p, c, freeSpear);
    else return false;
    p.necroCorpseCd = NECRO.corpseCast.cd;
    p.necroCorpseAutoNext = this.time + 0.08;
    this.guildEvent('skills');
    return true;
  };
  G.necroAddCorpse = function (e, autoSpear) {
    const L = this.necroCorpses || (this.necroCorpses = []);
    L.push({ x: e.x, y: e.y, def: e.def, elite: !!e.elite, maxHp: e.maxHp, damage: e.damage, sHp: e.necroSHp || this.scale.hp, sDmg: e.necroSDmg || this.scale.dmg, t: this.time }); // 죽은 층의 강화 배율 if (L.length > NECRO.corpse.max) L.shift();
    this.effects.part(e.x, e.y - 2, 0, -12, { color: '#d8d0c0', life: 0.5, size: 2, size2: 0, drag: 1 });
    const p = this.player;
    if (p && p.hero.id === NECRO_ID && p.state !== 'DEAD' && p.line && p.line.id === 'lich' && (p.rank || 0) >= 1 && p.skillId === 'necro_spear' && p.necroCorpseAuto) {
      // 자동 모드의 리치는 시체가 생기는 순간 큐에 넣어 마우스·대상 거리를 기다리지 않는다.
      const c = L[L.length - 1]; p.necroCorpseQueue = p.necroCorpseQueue || [];
      if (!p.necroCorpseQueue.includes(c)) p.necroCorpseQueue.push(c);
    }
  };
  G.necroCorpseAtMouse = function () {
    const mw = this.mouseWorld(), L = this.necroCorpses || []; let best = null, bd = NECRO.corpse.pick;
    for (const c of L) { const d = Math.hypot(c.x - mw.x, c.y - mw.y); if (d < bd) { bd = d; best = c; } } return best;
  };
  G.necroUseCorpse = function (c) { const L = this.necroCorpses || []; const i = L.indexOf(c); if (i >= 0) L.splice(i, 1);
    const p = this.player; if (p && p.hero.id === NECRO_ID && p.state !== 'DEAD' && p.line && p.line.id === 'lich') { const F = NECRO.lichFeed; // 리치 계열 패시브: 시체 소비 → 체력 20 · 에너지 10
      p.hp = Math.min(p.maxHp, p.hp + F.hp); p.energy = Math.min(p.maxEnergy, p.energy + F.energy); this.effects.text(p.x, p.y - 22, `+${F.hp}`, '#7be36b'); this.effects.part(c.x, c.y - 2, (p.x - c.x) * 2, (p.y - c.y) * 2, { color: '#c08aff', life: 0.5, size: 2, size2: 0, drag: 1, add: true }); } };
  G.necroCorpseNearMouse = function (r) { const mw = this.mouseWorld(); let best = null, bd = r; for (const c of this.necroCorpses || []) { const d = Math.hypot(c.x - mw.x, c.y - mw.y); if (d < bd) { bd = d; best = c; } } return best; };
  G.necroGraveCorpse = function (x, y) { // 묘지에서 솟는 시체: 이 필드 몬스터 중 하나 (망자의 군주와는 계열이 달라 부활엔 안 쓰임)
    const pool = (this.W && this.W.enemies) || [], id = pool.length ? pick(pool)[0] : 'enemy_skelknight_001', def = this.data.enemies.get(id) || this.data.enemies.get('enemy_skelknight_001');
    return { x, y, def, elite: false, maxHp: Math.round(def.health * (this.scale ? this.scale.hp : 1)), damage: Math.round(def.damage * (this.scale ? this.scale.dmg : 1)) };
  };
  G.necroBlast = function (p, c) { // [사용자 결정] 시체 폭발: 시체 1구 → 주변 폭발 (스킬 피해 + 그 몬스터 최대 체력 비례)
    const B = NECRO.blast; this.necroUseCorpse(c);
    const dmg = this.skillDmg(B.dmg) + (c.maxHp || 0) * B.hpPct;
    this.explodeAt(c.x, c.y, B.r, { color: '#9affd8', hurtEnemies: true, src: { damage: dmg, mods: p.mods, knockback: 10 } });
    this.effects.ring(c.x, c.y, B.r, '#ffffff'); this.effects.ring(c.x, c.y, B.r * 0.7, '#9affd8'); this.zones.push(new RatmaSigil(c.x, c.y, B.r * 0.8, '#7affc0', 0.6));
    for (let k = 0; k < 18; k++) { const a = Math.random() * TAU, sp = 60 + Math.random() * 120; this.effects.part(c.x, c.y - 2, Math.cos(a) * sp, Math.sin(a) * sp * 0.7 - 30, { color: k % 3 === 0 ? '#9affd8' : k % 3 === 1 ? '#e8e0d0' : '#5a4a3a', life: 0.6, size: k % 3 ? 2 : 3, size2: 0, drag: 2, add: k % 3 === 0 }); } // 뼈 파편·영혼
    this.screenFlash = 0.12; this.flashColor = '154,255,216'; this.addShake(0.15, 4); this.hitStop(0.03); SFX.play('explode', 0.07);
  };
  G.necroRaise = function (p, c) { // 망자의 군주: 시체 부활 (최대 5 — 넘으면 가장 오래된 부하가 돌아감)
    this.necroUseCorpse(c); const T = p.thralls || (p.thralls = []);
    T.push({ id: c.def.id, elite: c.elite, maxHp: c.maxHp, damage: c.damage, hpFrac: 1, sHp: c.sHp || this.scale.hp, sDmg: c.sDmg || this.scale.dmg, k: Math.random() }); // 원본 체력·공격력 그대로
    while (T.length > NECRO.thrall.max) { const old = T.shift(); const a = this.allies.find((x) => x instanceof NecroThrall && x.owner === p && x.rec === old); if (a) { a.alive = false; this.effects.burst(a.x, a.y - 4, '#7affc0', 10); } }
    this.zones.push(new RatmaSigil(c.x, c.y, 18, '#7affc0', 0.8)); this.effects.skyBeam(c.x, c.y, '#9affd8', 0, 5);
    for (let i = 0; i < 12; i++) this.effects.part(c.x + randInt(-8, 8), c.y + 4, randInt(-10, 10), -40 - Math.random() * 30, { color: i % 2 ? '#9affd8' : '#e8f8f0', life: 0.6, size: 2, size2: 0, drag: 1, add: true });
    this.necroSpawnThrall(p, T[T.length - 1], c.x, c.y); this.effects.text(c.x, c.y - 18, `부활 ${T.length}/${NECRO.thrall.max}`, '#9affd8'); SFX.play('solomon', 0.25);
  };
  G.necroSpawnThrall = function (p, rec, x, y) {
    const def = this.data.enemies.get(rec.id); if (!def) return null;
    const e = new Enemy(x, y, def, this.scale, this.map.roomAtPoint(x, y) || this.map.startRoom); // 죽기 전 원본 그대로
    const T = NECRO.thrall; if (rec.maxHp) { e.maxHp = rec.maxHp; e.damage = rec.damage; } e.maxHp = Math.round(e.maxHp * T.hpMul); e.damage = Math.round(e.damage * T.dmgMul); // 체급 2배
    if (rec.sHp) { const S = this.scale; e.maxHp = Math.round(e.maxHp * S.hp / rec.sHp); e.damage = Math.round(e.damage * S.dmg / rec.sDmg); } // 층수 비례: 죽은 층 → 지금 층 강화 곡선
    if (rec.elite) e.elite = true; e.hp = Math.max(1, Math.round(e.maxHp * (rec.hpFrac == null ? 1 : rec.hpFrac)));
    const a = new NecroThrall(e, p, { rec }); this.allies.push(a); return a;
  };
  G.necroSpears = function (p, c, freeCast = false) { // 리치: 시체 1개 또는 망자의 땅 무료 발사 → 시체 창 3개
    if (!freeCast) this.necroUseCorpse(c); const S = NECRO.spear;
    for (let i = 0; i < S.count; i++) this.zones.push(new NecroSpear(c.x + (i - 1) * 7, c.y, p, this.skillDmg(S.dmg), i));
    this.effects.ring(c.x, c.y, 14, '#d8d0c0'); for (let i = 0; i < 10; i++) this.effects.part(c.x + randInt(-6, 6), c.y + 2, randInt(-30, 30), -50, { color: i % 2 ? '#e8e0d0' : '#b47aff', life: 0.5, size: 2, size2: 0, drag: 2 });
    SFX.play('magic', 0.15);
  };
  G.necroArmyOfDead = function (p) { // 망자의 군대: 죽음의 계곡
    const mw = this.mouseWorld(), dx = mw.x - p.x, dy = mw.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, 220 / d);
    let x = p.x + dx * k, y = p.y + dy * k;
    if (this.map.isSolidAt(x, y)) { x = p.x; y = p.y; }
    this.zones.push(new NecroArmyOfDead(x, y, p));
    this.effects.ring(x, y, NECRO.army.r, '#9affd8'); this.effects.rays(x, y, '#9affd8', 18, NECRO.army.r, 0.8);
    this.effects.skyBeam(x, y, '#d8fff0', 0, 8); this.addShake(0.25, 5); SFX.play('gate', 0.2);
  };
  G.necroLandOfDead = function (p) { // 망자의 땅: 얼어붙은 땅
    p.necroLandSpearUntil = this.time + NECRO.land.life; // 지속시간 동안 리치의 시체 창은 시체를 소모하지 않음
    this.zones.push(new NecroLandOfDead(p));
    this.screenFlash = 0.16; this.flashColor = '160,220,255';
    this.effects.ring(p.x, p.y, 110, '#bfefff'); this.effects.rays(p.x, p.y, '#bfefff', 20, 180, 0.8);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU, r = 30 + Math.random() * 150;
      this.effects.part(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.65,
        Math.cos(a) * 28, -18 - Math.random() * 30,
        { color: i % 2 ? '#bfefff' : '#ffffff', life: 0.8, size: 2, size2: 0, drag: 1 });
    }
    this.addShake(0.22, 4); SFX.play('freeze', 0.25);
  };
  G.necroGraveyard = function (p) { return this.necroLandOfDead(p); }; // 구버전 호출 호환
  G.necroCharm = function (e, p) { // 정신지배: 적을 같은 모습의 부하로 바꾸고, 지배 시작 10초 뒤 제자리에서 자폭 (묘지 지속시간과 따로)
    e.necroCharmed = true; e.maxHp = Math.round(e.maxHp * NECRO.thrall.hpMul); e.hp = Math.min(e.maxHp, e.hp * NECRO.thrall.hpMul); e.damage = Math.round(e.damage * NECRO.thrall.dmgMul); // 체급 2배
    const i = this.enemies.indexOf(e); if (i >= 0) this.enemies.splice(i, 1); // 적 목록에서 빼서 아군으로 (같은 몬스터 그대로)
    const a = new NecroThrall(e, p, { charm: true, life: NECRO.grave.charmLife,
      onEnd: (w, t) => { w.explodeAt(t.x, t.y, NECRO.grave.charmR, { color: '#c08aff', hurtEnemies: true, src: { damage: w.skillDmg(NECRO.grave.charmDmg), mods: p.mods, knockback: 8 } });
        w.effects.explosion(t.x, t.y, NECRO.grave.charmR, '#c08aff'); w.effects.ring(t.x, t.y, NECRO.grave.charmR, '#ffffff'); w.addShake(0.15, 3); SFX.play('explode', 0.06); } });
    this.allies.push(a); this.effects.ring(e.x, e.y, 16, '#c08aff'); this.effects.text(e.x, e.y - 22, '정신지배', '#d8a0ff');
    for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; this.effects.part(e.x + Math.cos(ang) * 14, e.y - 4 + Math.sin(ang) * 8, -Math.cos(ang) * 30, -Math.sin(ang) * 20, { color: '#d8a0ff', life: 0.45, size: 2, size2: 0, drag: 1, add: true }); }
  };
  // 골렘 어그로: 골렘 가까이의 일반 적은 플레이어 대신 골렘을 노림 (보스 제외)
  G.necroTauntFor = function (e) {
    if (!e.alive || e.def.boss || e.def.dummy || !this.allies.length) return null;
    if (e.necroAlly) return null;
    for (const a of this.allies) if (a instanceof NecroGolem && a.up && Math.hypot(a.x - e.x, a.y - e.y) < NECRO.golem.taunt) return a;
    const S = NECRO.skeleton; let best = null, bd = S.taunt; const p = this.player, dp = p ? Math.hypot(p.x - e.x, p.y - e.y) : 1e9; // [사용자 결정] 어그로 분산: 근처 해골·부하를 노림 (플레이어보다 조금 멀어도)
    for (const a of this.allies) { if (!a.alive || !(a instanceof NecroThrall || (a instanceof NecroSkeleton && !a.bomb))) continue; const d = Math.hypot(a.x - e.x, a.y - e.y); if (d < bd && d < dp + S.bias) { bd = d; best = a; } }
    return best ? { proxy: best.guard } : null;
  };
  wrap('resetWorldLists', function (orig, map) { this.necroCorpses = []; return orig.call(this, map); });
  wrap('snapshotRun', function (orig) { const s = orig.call(this); if (this.player && this.player.thralls) s.p.thralls = this.player.thralls.slice(); return s; });
  wrap('playerFromSnapshot', function (orig, hero, s, p) { const np = orig.call(this, hero, s, p); if (s && Array.isArray(s.thralls)) np.thralls = s.thralls.filter((r) => r && this.data.enemies.get(r.id)).slice(-NECRO.thrall.max); return np; });
  // 상시 부하 유지: 기본 해골 (단계마다 +1) · 망령 골렘 · 망자의 군주 부활 부하 (스테이지가 바뀌어도 다시 나타남)
  G.necroMaintain = function (p) {
    if (p.hero.id !== NECRO_ID || p.state === 'DEAD') return;
    const mine = (C) => this.allies.filter((a) => a instanceof C && a.owner === p && a.alive);
    const want = NECRO.skeleton.base + NECRO.skeleton.perRank * Math.min(2, p.rank || 0), sk = mine(NecroSkeleton).filter((a) => !a.temp && !a.bomb);
    if (sk.length < want && (p.skelBackAt || 0) > this.time) { /* 쓰러진 해골은 4초 뒤 */ } else for (let i = sk.length; i < want; i++) this.allies.push(new NecroSkeleton(p.x + randInt(-14, 14), p.y + randInt(4, 12), p, { idx: i }));
    for (let i = want; i < sk.length; i++) sk[i].alive = false;
    const wraith = p.line && p.line.id === 'wraith';
    const g = mine(NecroGolem); if (wraith && p.rank >= 1 && !g.length) this.allies.push(new NecroGolem(p.x - 16, p.y + 8, p)); if ((!wraith || p.rank < 1) && g.length) g.forEach((a) => { a.alive = false; });
    if (wraith && p.rank >= 2 && p.thralls && p.thralls.length) { const th = mine(NecroThrall).filter((a) => !a.charm);
      for (const rec of p.thralls) if (!th.some((a) => a.rec === rec)) this.necroSpawnThrall(p, rec, p.x + randInt(-20, 20), p.y + randInt(6, 16)); }
    if (!this.zones.some((z) => z instanceof NecroCorpseLayer)) this.zones.push(new NecroCorpseLayer());
  };
  // [사용자 결정] 소환수 순간이동: 방 전투가 시작돼 문이 닫히면, 방 안에 온전히 들어와 있지 않은 소환수(해골·골렘·부활 부하·늑대·사냥개 등)를 방 중앙으로 옮김
  G.summonFollowsIntoRoom = function (r) {
    if (!r || !this.map) return;
    const c = this.map.tileCenter(r.cx, r.cy); let n = 0;
    for (const a of this.allies) {
      if (!a.alive || !a.owner || a.owner.state === 'DEAD' || a instanceof Turret || a.bomb || a.charm) continue; // 설치형 포탑·자폭 해골·정신지배된 적은 제외
      const ax = a.x, ay = a.y; if (typeof ax !== 'number') continue;
      const half = a.half || (a.e && a.e.half) || 6;
      if (this.map.isFullyInside({ x: ax, y: ay, half }, r, 4)) continue; // 이미 방 안 (문턱·복도에 걸친 건 밖으로 봄)
      const ang = n * 2.4, rad = 10 + 6 * Math.sqrt(n); n++;
      const s = this.freeSpot(r, c.x + Math.cos(ang) * rad, c.y + Math.sin(ang) * rad * 0.7, half);
      this.effects.burst(ax, ay - 4, '#9affd8', 6);
      if (a instanceof NecroThrall) { a.e.x = s.x; a.e.y = s.y; } else { a.x = s.x; a.y = s.y; }
      this.effects.ring(s.x, s.y, 10, '#9affd8'); for (let k = 0; k < 5; k++) this.effects.part(s.x + randInt(-5, 5), s.y, 0, -24, { color: '#9affd8', life: 0.4, size: 2, size2: 0, drag: 1, add: true });
    }
  };
  wrap('activateRoom', function (orig, r, leader) { const res = orig.call(this, r, leader); this.summonFollowsIntoRoom(r); return res; });
  // [사용자 결정] 해골·골렘 한 방 = 들고 있는 두 무기 한 방의 합 (탄 여러 발은 합산 · 광선은 0.5초치 · 무기마다 강화 단계 반영, 공격력 보너스·치명타는 플레이어 기준)
  // [사용자 결정] 소환수 층수 비례 버프 — 공격력: 몬스터 체력 강화 곡선의 floorDmg 만큼 (기본 0.5 = 직업 스킬이 깊이에 따라 자라는 것과 같은 비율) · 체력: 몬스터 공격력 곡선 그대로
  G.necroFloor = function () { const S = this.scale || { hp: 1, dmg: 1 }; return { dmg: 1 + ((S.hp || 1) - 1) * NECRO.floorDmg, hp: S.dmg || 1 }; };
  G.necroWeaponSrc = function (p, knockback, mul = 1) {
    let sum = 0;
    for (const w of p.weapons) { const d = w && w.def; if (!d) continue;
      const base = d.type === 'beam' ? d.damage / (d.tickRate || 0.1) * 0.5 : d.damage * (d.projectileCount || 1);
      sum += base * (1 + (w.lv || 0) * BALANCE.upgrade.perLevel); }
    return { damage: Math.max(5, sum) * NECRO.weaponAtk * mul * this.necroFloor().dmg, mods: p.mods, knockback, minion: true }; // 층수 비례
  };
  // HUD: 소환수 수 (해골 · 골렘 · 부활 부하 · 정신지배 · 시체)
  G.necroGSkill = function (p) { // 공통 G키 궁극기: 드루이드 연계와 호환하기 위해 기존 API 유지
    if (!p || p.hero.id !== NECRO_ID || !p.line || !p.line.gSkills) return null; return p.line.gSkills[Math.min(2, p.rank || 0)] || null;
  };
  G.necroFSkill = function (p) { // 네크로맨서의 기존 G 궁극기를 F로 이동
    return p && p.hero && p.hero.id === NECRO_ID ? this.necroGSkill(p) : null;
  };
  G.necroHudParts = function (p) {
    if (!p || p.hero.id !== NECRO_ID || (this.mode !== 'dungeon' && this.mode !== 'lobby')) return null;
    const mine = this.allies.filter((a) => a.alive && a.owner === p), parts = [];
    const want = NECRO.skeleton.base + NECRO.skeleton.perRank * Math.min(2, p.rank || 0), sk = mine.filter((a) => a instanceof NecroSkeleton && !a.bomb && !a.temp).length, tmp = mine.filter((a) => a instanceof NecroSkeleton && a.temp && !a.bomb).length;
    parts.push(`해골 ${sk}/${want}${tmp ? ` +${tmp}` : ''}`);
    const g = mine.find((a) => a instanceof NecroGolem); if (g) parts.push(g.up ? `골렘 ${Math.round(g.hp / g.maxHp * 100)}%` : `골렘 부활 ${Math.ceil(g.respawnT)}초`);
    if (p.line && p.line.id === 'wraith' && p.rank >= 2) parts.push(`부하 ${(p.thralls || []).length}/${NECRO.thrall.max}`);
    const ch = mine.filter((a) => a instanceof NecroThrall && a.charm).length; if (ch) parts.push(`지배 ${ch}`);
    const cor = (this.necroCorpses || []).length; if (p.line && p.rank >= 1) parts.push(`시체 ${cor}`);
    if (p.line && p.rank >= 1) parts.push(p.necroCorpseAuto ? '자동 소비 ON' : '자동 소비 OFF');
    return { text: parts.join(' · '), color: p.line && p.line.id === 'lich' ? '#d0b0ff' : '#9affd8' };
  };
  G.summonTempSkeletons = function (p, n) { for (let i = 0; i < n; i++) this.allies.push(new NecroSkeleton(p.x + randInt(-12, 12), p.y + randInt(4, 12), p, { temp: NECRO.skeleton.tempLife, idx: 9 + i })); }; // 장비 등 추가 소환: 10초 뒤 소멸

  // ── 매 프레임: 연출 (이동 잔상 · 대시 망령 흔적 · 고유 무기 상시 VFX · 라트마 등장/페이즈) ──
  G.ratmaWantsAura = function (p) { return !!p && p.state !== 'DEAD' && (p.hero.id === NECRO_ID || p.weapons.some((w) => w.def.ratma)); };
  wrap('updateSkillEffects', function (orig, dt) { const r = orig.call(this, dt); this.ratmaTick(dt); return r; });
  wrap('update', function (orig, dt) {
    const p = this.player;
    if (p && p.hero.id === NECRO_ID && this.input && !this.overlay) {
      if (this.input.wasPressed('KeyG')) p.necroCorpseQ = this.time;
      if (this.input.wasPressed('KeyV')) {
        p.necroCorpseAuto = !p.necroCorpseAuto;
        if (!p.necroCorpseAuto) p.necroCorpseQueue = [];
        this.effects.text(p.x, p.y - 22, '시체 자동 ' + (p.necroCorpseAuto ? 'ON' : 'OFF'), p.necroCorpseAuto ? '#9affd8' : '#a8a0b0');
        this.effects.ring(p.x, p.y, 18, p.necroCorpseAuto ? '#9affd8' : '#777080');
        SFX.play('ui', 0.08);
      }
    }
    return orig.call(this, dt);
  });
  if (typeof G.coopHostTickRemotes === 'function') wrap('coopHostTickRemotes', function (orig, dt) {
    if (this.remotes) for (const R of this.remotes.values()) {
      const p = R.p;
      if (!p || p.hero.id !== NECRO_ID || !R.vin) continue;
      if (R.vin.wasPressed('KeyG')) p.necroCorpseQ = this.time;
      if (R.vin.wasPressed('KeyV')) {
        p.necroCorpseAuto = !p.necroCorpseAuto;
        if (!p.necroCorpseAuto) p.necroCorpseQueue = [];
        this.withPlayer(p, () => {
          this.effects.text(p.x, p.y - 22, '시체 자동 ' + (p.necroCorpseAuto ? 'ON' : 'OFF'), p.necroCorpseAuto ? '#9affd8' : '#a8a0b0');
          this.effects.ring(p.x, p.y, 18, p.necroCorpseAuto ? '#9affd8' : '#777080');
        });
      }
    }
    return orig.call(this, dt);
  });
  G.ratmaTick = function (dt) {
    const p = this.player; if (!p) return;
    const players = this.allPlayers ? this.allPlayers() : [p];
    for (const owner of players) {
      if (!owner || owner.hero.id !== NECRO_ID) continue;
      owner.graveCd = Math.max(0, (owner.graveCd || 0) - dt);
      owner.necroCorpseCd = Math.max(0, (owner.necroCorpseCd || 0) - dt);
      const remote = owner === p ? null : this.remotes && [...this.remotes.values()].find((R) => R.p === owner);
      const ownerOverlay = owner === p ? this.overlay : remote && remote.overlay;
      if (owner.state === 'DEAD' || ownerOverlay) continue;
      const runAsOwner = (fn) => owner === this.player || !this.withPlayer ? fn() : this.withPlayer(owner, fn);
      if (owner.necroCorpseQ > this.time - 0.25) {
        owner.necroCorpseQ = -1;
        runAsOwner(() => this.necroCorpseCast(owner, false));
      }
      if (owner.necroCorpseAuto && owner.rank >= 1 && owner.line && owner.line.id === 'lich' && owner.skillId === 'necro_spear') {
        if (this.necroLandSpearFree(owner)) {
          // 망자의 땅 동안에는 실제 시체 대기열과 분리해 0.45초마다 무료 시체 창을 발사한다.
          if (owner.necroCorpseCd <= 0 && this.time >= (owner.necroCorpseAutoNext || 0)) {
            owner.necroCorpseCd = NECRO.corpseCast.cd;
            owner.necroCorpseAutoNext = this.time + NECRO.corpseCast.cd;
            runAsOwner(() => this.necroSpears(owner, this.necroFreeSpearOrigin(owner), true));
          }
        } else {
          const Q = owner.necroCorpseQueue || (owner.necroCorpseQueue = []), L = this.necroCorpses || [];
          // 자동 ON 시 기존 시체도 큐에 넣고, 이미 소비·만료된 항목은 건너뛴다.
          for (const c of L) if (!Q.includes(c)) Q.push(c);
          while (Q.length && !L.includes(Q[0])) Q.shift();
          if (Q.length && this.time >= (owner.necroCorpseAutoNext || 0)) {
            const c = Q.shift(); owner.necroCorpseAutoNext = this.time + 0.08;
            runAsOwner(() => this.necroSpears(owner, c));
          }
        }
      } else if (owner.necroCorpseAuto && owner.rank >= 1 && owner.line && owner.line.id === 'wraith' && this.time >= (owner.necroCorpseAutoNext || 0) && owner.necroCorpseCd <= 0) {
        owner.necroCorpseAutoNext = this.time + 0.12;
        runAsOwner(() => this.necroCorpseCast(owner, true));
      }
    }
    this.summonRoomT = (this.summonRoomT || 0) - dt; if (this.summonRoomT <= 0) { this.summonRoomT = 0.5; const R = this.activeRoom; if (R && this.mode === 'dungeon' && this.map.roomAtPoint(p.x, p.y) === R) this.summonFollowsIntoRoom(R); } // 전투 중에도 방 밖에 갇힌 소환수는 데려옴
    if (this.ratmaWantsAura(p) && !this.zones.some((z) => z.isNecroAura && z.owner === p)) this.zones.push(new NecroAura(p));
    if (this.mode === 'dungeon' || this.mode === 'lobby') this.necroMaintain(p);
    this.ratmaFxT = (this.ratmaFxT || 0) - dt;
    if (p.state !== 'DEAD' && this.ratmaFxT <= 0) {
      const necro = p.hero.id === NECRO_ID, fx = ratmaLineFx(p), w = p.weapon && p.weapon.def;
      if (necro && p.state === 'DASH') { for (let i = 0; i < 2; i++) this.effects.part(p.x + randInt(-4, 4), p.y - 4 + randInt(-4, 4), -p.dashDir.x * 30, -p.dashDir.y * 30 - 6, { color: i ? fx.trail : '#e8f0ff', life: 0.5, size: 3.5, size2: 0, drag: 2, add: true }); this.ratmaFxT = 0.025; } // 대시: 짧은 망령 흔적
      else if (necro && p.moving) { // 이동: 영혼 잔상 · 계열별 파티클
        const col = Math.random() < 0.5 ? fx.trail : fx.trail2;
        if (fx.kind === 'flame') this.effects.part(p.x + randInt(-4, 4), p.y + 5, randInt(-6, 6), -26, { color: Math.random() < 0.6 ? '#1a1020' : '#a060ff', life: 0.5, size: 2.5, size2: 0, drag: 1 });
        else this.effects.part(p.x + randInt(-4, 4), p.y + 5, randInt(-5, 5), fx.kind === 'mist' ? -8 : -18, { color: col, life: fx.kind === 'mist' ? 0.8 : 0.5, size: fx.kind === 'mist' ? 3 : 2, size2: 0, drag: 1, add: true });
        this.ratmaFxT = 0.07;
      } else this.ratmaFxT = 0.12;
      if (w && w.ratma) { const hx = p.x + p.aim.x * 12, hy = p.y + p.aim.y * 9;
        if (w.ratma === 'insight' && Math.random() < 0.5) this.effects.part(hx + randInt(-4, 4), hy - 4, 0, -14, { color: '#b070ff', life: 0.6, size: 1.5, size2: 0, drag: 1, add: true }); // 보라색 마법 문자
        if (w.ratma === 'anguish' && Math.random() < 0.6) this.effects.part(p.x + randInt(-8, 8), p.y + randInt(-2, 6), randInt(-6, 6), -6, { color: Math.random() < 0.5 ? '#7affc0' : '#b48aff', life: 0.9, size: 3, size2: 0, drag: 1, add: true }); // 녹색·보라색 안개
      }
    }
    // 라트마: 등장 시 영혼이 모여듦 · 페이즈마다 배경 영혼 색 · 1페이즈 이름
    for (const e of this.enemies) { if (!e.alive || !e.def.ratma) continue;
      if (e.state === 'INTRO') { for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, d = 110 + Math.random() * 40; this.effects.part(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.7, -Math.cos(a) * d * 1.6, -Math.sin(a) * d * 1.1, { color: i ? '#9affd0' : '#c08aff', life: 0.6, size: 2, size2: 0, drag: 0, add: true }); } }
      else { if (!e.ratmaNamed) { e.ratmaNamed = true; this.showBanner(`라트마 — ${e.def.phaseNames[0]}`, '죽음을 두려워하는가, 지배하려 하는가 — 시험이 시작된다', '#9affd0'); }
        if (Math.random() < 0.35 && this.activeRoom) { const r = this.activeRoom, col = ['#9affd0', '#7affc0', '#c08aff'][(e.phase || 1) - 1]; this.effects.part((r.x0 + Math.random() * r.w) * TILE, (r.y0 + r.h) * TILE - 4, randInt(-6, 6), -24 - Math.random() * 20, { color: col, life: 1.6, size: 1.5, size2: 0, drag: 0.3, add: true }); } }
    }
  };
  wrap('onBossPhase', function (orig, e, phase) {
    const r = orig.call(this, e, phase);
    if (e.def.ratma && e.def.phaseNames) { const n = e.def.phaseNames[phase - 1];
      this.showBanner(`라트마 — ${n}`, phase === 2 ? '사령 마법진이 당신을 쫓고, 쓰러진 자들이 되살아난다' : '생명과 죽음의 힘이 함께 몰아친다 — 궁극기 해금', phase === 3 ? '#c08aff' : '#7affc0');
      this.zones.push(new RatmaSigil(e.x, e.y, 90, phase === 3 ? '#c08aff' : '#7affc0', 1.3)); }
    return r;
  });

  // ── 시련 종료: 첫 대결(선택지) · 재대결 보상 ──
  wrap('endTrial', function (orig, win) {
    const id = this.trialId;
    if (id === 'ratma') return this.ratmaStoryEnd(win);
    if (id === 'ratma_rematch' || id === 'ratma_hard') return this.ratmaRematchEnd(win);
    return orig.call(this, win);
  });
  G.ratmaStoryEnd = function (win) {
    if (!win) { this.trialW = null; this.trialId = null; this.ratmaRun = false; this.endRun(false); return; } // 탐험 중 쓰러짐 = 탐험 종료
    const sv = this.save, R = ratmaSave(sv); R.defeated = true; R.step = Math.max(R.step, 4);
    if (!sv.unlocked.includes(NECRO_ID)) sv.unlocked.push(NECRO_ID); this.discover('weapon_necrostaff_001'); writeSave(sv);
    SFX.play('solomon', 0.6); this.overlay = { type: 'ratma_choice', t: 0 }; this.input.mouse.down = false;
  };
  G.ratmaRematchEnd = function (win) {
    const T = this.trialDef, R = ratmaSave(this.save), RW = RATMA_REMATCH_REWARD[T.id]; SFX.stopMusic();
    if (win) {
      if (T.id === 'ratma_rematch') R.rematchWins++; else R.hardWins++;
      if (!R.got.includes(RW.weapon)) { this.grantRatmaWeapon(RW.weapon, { inRun: false }); T.winSub = `첫 승리 보상 — 고유 무기 ${this.data.weapons.get(RW.weapon).name} (무기고에 보관됨)`; }
      else { this.save.bank += RW.bank; T.winSub = `${CUR.name} +${RW.bank}`; }
    }
    this.guildEvent('runs'); writeSave(this.save);
    this.overlay = { type: 'result', victory: win, stages: 0, bosses: 0, reward: 0, trial: true, trialId: T.id };
  };
  G.ratmaChoose = function (id) {
    const R = ratmaSave(this.save);
    if (id === 'remember') { R.choice = 'remember'; writeSave(this.save);
      this.showBanner('라트마의 가르침을 기억했다', '네크로맨서 해금 — 로비 단상에서 고를 수 있습니다', '#9affd0'); this.effects.rays(this.player.x, this.player.y, '#9affd0', 16, 70, 1); this.finishBoundary(); return; }
    this.overlay = { type: 'ratma_rank', t: 0 }; this.input.mouse.down = false;
  };
  G.ratmaPickLine = function (lineId) {
    const R = ratmaSave(this.save); R.choice = 'follow'; R.line = lineId;
    this.convertToNecro(lineId);
    this.grantRatmaWeapon(RATMA_LINE_WEAPON[lineId], { inRun: true });
    this.grantRatmaWeapon(RATMA_RECORD_ID, { inRun: true });
    const p = this.player, L = p.line; writeSave(this.save);
    this.showBanner(`${L.ranks[2]} (으)로 전직!`, `${this.data.weapons.get(RATMA_LINE_WEAPON[lineId]).name} · 라트마의 기록 — 손이 가득하면 바닥에 놓임 (E로 교체)`, L.color);
    this.effects.ring(p.x, p.y, 30, '#ffffff'); this.effects.ring(p.x, p.y, 56, L.color); this.effects.rays(p.x, p.y, L.color, 20, 90, 1.1); this.zones.push(new RatmaSigil(p.x, p.y, 60, L.color, 1.6));
    this.screenFlash = 0.35; this.flashColor = '192,138,255'; this.addShake(0.3, 4); SFX.play('clear'); SFX.play('solomon', 0.5);
    this.finishBoundary();
  };
  G.convertToNecro = function (lineId) { // 따르기: 지금 탐험 중인 캐릭터 → 네크로맨서 3차 전직 (능력치·무기·축복·보구는 이어받음)
    const p = this.player, base = p.necroFrom || p.hero.id, nh = this.data.heroes.get(NECRO_ID), snap = this.snapshotRun().p, oldRank = p.rank || 0, ratio = p.skillCdMax / (p.skillBaseCd || p.skillCdMax || 1);
    const oldHero = this.data.heroes.get(p.hero.id) || p.hero;
    snap.line = lineId; snap.rank = 2; snap.hybrid = null; delete snap.skillCdMax; snap.necroFrom = base === NECRO_ID ? null : base;
    snap.damageReduction = Math.max(0, (snap.damageReduction || 0) - (oldHero.damageReduction || 0) + (nh.damageReduction || 0)); // 원래 직업 패시브(피해 감소)는 내려놓음
    const np = this.playerFromSnapshot(nh, snap);
    for (let i = oldRank; i < 2; i++) { np.maxHp += EVOLUTION.hp[i]; np.maxEnergy += EVOLUTION.energy[i]; } // 즉시 3차 전직: 빠진 진화 능력치
    np.hp = np.maxHp; np.energy = np.maxEnergy; np.shield = np.maxShield; np.skillCdMax = np.skillBaseCd * (ratio || 1); np.skillCooldown = 0;
    np.x = p.x; np.y = p.y; np.lineChoice = lineId; np.treasureCd = p.treasureCd || 0;
    if (snap.necroFrom) { np.necroFrom = snap.necroFrom; this.applyNecroIdentity(np); }
    this.allies = this.allies.filter((a) => a.owner !== p); this.zones = this.zones.filter((z) => z.owner !== p);
    this.player = np;
  };
  G.finishBoundary = function () { // 경계를 나옴: 성역 이야기·보구 → 심층/귀환 포탈 (이미 봤으면 포탈만)
    this.trialW = null; this.trialId = null; this.ratmaRun = false; this.overlay = null; this.input.mouse.down = false;
    const p = this.player; this.portalSpot = { x: p.x, y: p.y - 30 };
    if (!this.ratmaSanctumDone) { this.enterSanctum(); return; }
    this.ratmaSaveDeepCheckpoint();
    const c = this.portalSpot, next = worldDef(this.worldIdx + 1);
    this.portals = [new Portal(c.x + 26, c.y + 24, () => this.advanceStage(), `${stageLabel(this.worldIdx + 1, 0)} ${next.name}`, [120, 200, 255]), new Portal(c.x - 26, c.y + 24, () => this.endRun(true), '귀환 (탐험 종료)', [255, 210, 90])];
    setTimeout(() => { if (this.mode === 'dungeon') this.showBanner(SANCTUM_AFTER, '심층으로 내려가거나, 여기서 돌아갈 수 있습니다', '#9ad8ff'); }, 2600);
  };
  G.ratmaSaveDeepCheckpoint = function () { // enterSanctum 과 같은 방식으로 10-4 기록 갱신 (전직한 네크로맨서로도 심층 입장 가능)
    if (this.coopRunKey || !this.player) return;
    const c = this.deepCps(), key = this.deepKey(this.player.hero.id, this.player.line && this.player.line.id), cp = Object.assign(this.snapshotRun().p, { gold: this.gold, t: Date.now() });
    c[key] = cp; const archive = this.save.deepCheckpointArchive = this.save.deepCheckpointArchive || {}; archive[key] = JSON.parse(JSON.stringify(cp)); writeSave(this.save);
  };

  // ── 고유 무기 지급: 기존 무기고(armory)·도감(discovered) 저장 구조 · 무기 2개 제한 · 중복 방지 ──
  G.grantRatmaWeapon = function (id, o = {}) {
    const sv = this.save, R = ratmaSave(sv), def = this.data.weapons.get(id); if (!def) return { dupe: false };
    const dupe = R.got.includes(id) || sv.armory.includes(id);
    if (!dupe) { R.got.push(id); if (!sv.armory.includes(id)) sv.armory.push(id); }
    this.discover(id);
    if (o.inRun && this.mode === 'dungeon' && this.player) {
      const p = this.player;
      if (dupe && p.weapons.some((w) => w.def.id === id)) { sv.bank += RATMA_DUPE_REWARD; }
      else if (p.weapons.length < this.data.base.weaponSlots) { p.weapons.push(new WeaponInstance(def)); p.slot = p.weapons.length - 1; this.effects.text(p.x, p.y - 30, def.name, RARITY_COLOR[def.rarity], true); }
      else { const at = o.at || p, n = this.pickups.filter((k) => k.kind === 'weapon').length; this.pickups.push(new Pickup('weapon', at.x + (n % 2 ? 16 : -16), at.y + 18, { def, still: true })); } // 손이 가득: 기존 교체 방식 (바닥에서 E)
      this.effects.skyBeam(p.x, p.y, '#c08aff', 0, 8);
    } else if (dupe) sv.bank += RATMA_DUPE_REWARD; // 이미 지닌 무기: 대체 보상
    writeSave(sv);
    return { dupe };
  };

  // ── 창: 가르침 선택 · 최종 전직 선택 · 영혼의 제단 · 환영의 시험 ──
  const cRect = (i, n, w, h, y) => { const gap = 12, total = n * w + (n - 1) * gap; return { x: Math.round((VIEW_W - total) / 2 + i * (w + gap)), y, w, h }; };
  const choiceRect = (i) => cRect(i, 2, 214, 150, 62), rankRect = (i) => cRect(i, 2, 200, 166, 52), menuRect = (i) => ({ x: VIEW_W / 2 - 120, y: 104 + i * 26, w: 240, h: 22 });
  const hit = (m, r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
  G.ratmaAltarItems = function () { const R = ratmaSave(this.save); return [
    { key: 'talk', label: '1  라트마와 이야기하기', ok: true },
    { key: 'rematch', label: `2  재대결 — 생사의 경계${R.rematchWins ? ` (승리 ${R.rematchWins})` : ' (첫 승리: 생사의 균형추)'}`, ok: true },
    { key: 'hard', label: R.rematchWins ? `3  고난도 재대결${R.hardWins ? ` (승리 ${R.hardWins})` : ' (첫 승리: 경계의 왕관)'}` : '3  고난도 재대결 (재대결에서 한 번 이기면 열림)', ok: R.rematchWins > 0 },
    { key: 'close', label: '4  닫기', ok: true }]; };
  G.ratmaTalk = function () {
    const sv = this.save, nec = sv.selected === NECRO_ID, line = nec && sv.lineChoice && sv.lineChoice[NECRO_ID], R = ratmaSave(sv);
    const pool = nec ? RATMA_TALK.necro.concat(RATMA_TALK[line] || []) : RATMA_TALK.common.slice();
    if (R.choice === 'follow' && R.line) pool.push(...(RATMA_TALK[R.line] || []));
    const altar = this.props.find((x) => x instanceof SoulAltar);
    this.playCutscene(['영혼의 제단 위로 라트마의 모습이 떠오른다.', pick(pool)], { always: true, force: true, focus: altar ? { x: altar.x, y: altar.y } : null });
  };
  wrap('updateOverlay', function (orig, input) {
    const o = this.overlay; if (!o || !/^ratma_/.test(o.type)) return orig.call(this, input);
    o.t = (o.t || 0) + STEP; const m = input.mouse, click = input.wasPressed('Mouse0') && o.t > 0.4;
    if (o.type === 'ratma_choice') { // 두 가지 가르침 (반드시 하나를 고름)
      let k = -1; if (o.t > 0.6) { if (input.wasPressed('Digit1')) k = 0; if (input.wasPressed('Digit2')) k = 1; }
      if (click) for (let i = 0; i < 2; i++) if (hit(m, choiceRect(i))) k = i;
      if (k >= 0) { this.input.mouse.down = false; SFX.play('ui'); this.ratmaChoose(RATMA_CHOICES[k].id); }
    } else if (o.type === 'ratma_rank') { // 최종 전직 셋 중 하나
      const lines = jobLines(NECRO_ID); let k = -1;
      if (o.t > 0.5) for (let i = 0; i < lines.length; i++) if (input.wasPressed('Digit' + (i + 1))) k = i;
      if (click) for (let i = 0; i < lines.length; i++) if (hit(m, rankRect(i))) k = i;
      if (input.wasPressed('Escape')) { this.overlay = { type: 'ratma_choice', t: 1 }; return; }
      if (k >= 0) { this.overlay = null; this.input.mouse.down = false; this.ratmaPickLine(lines[k].id); }
    } else if (o.type === 'ratma_altar') {
      if (o.msg) o.msg.t -= STEP;
      const items = this.ratmaAltarItems(); let k = -1;
      for (let i = 0; i < items.length; i++) if (input.wasPressed('Digit' + (i + 1)) || (click && hit(m, menuRect(i)))) k = i;
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) k = 3;
      if (k < 0) return; const it = items[k]; this.input.mouse.down = false;
      if (!it.ok) { o.msg = { text: '재대결에서 한 번 이기면 열립니다', color: '#ff9a9a', t: 2 }; SFX.play('deny'); return; }
      if (it.key === 'close') { this.overlay = null; return; }
      if (it.key === 'talk') { this.overlay = null; this.ratmaTalk(); return; }
      this.askTrial(it.key === 'hard' ? 'ratma_hard' : 'ratma_rematch');
    } else if (o.type === 'ratma_phantom') {
      if (input.wasPressed('Digit1') || input.wasPressed('Enter') || (click && hit(m, menuRect(0)))) { this.overlay = null; this.input.mouse.down = false; this.ratmaStartPhantomTrial(o.npc); }
      else if (input.wasPressed('Escape') || input.wasPressed('Digit2') || (click && hit(m, menuRect(1)))) { this.overlay = null; this.input.mouse.down = false; }
    }
  });
  const hudOverlay = HUD.prototype.overlay;
  HUD.prototype.overlay = function (ctx, game) {
    const o = game.overlay; if (!o || !/^ratma_/.test(o.type)) return hudOverlay.call(this, ctx, game);
    ctx.fillStyle = 'rgba(6,8,12,0.9)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const m = game.input.mouse, t = o.t || 0, T = game.time;
    if (o.type === 'ratma_choice') {
      hudText(ctx, '라트마의 가르침', VIEW_W / 2, 18, '#e8f0ec', 'center', 16);
      hudText(ctx, '「이제 너에게 가르쳐 줄 수 있겠구나.」 — 어느 쪽을 고르든 네크로맨서는 영구히 해금됩니다', VIEW_W / 2, 40, '#a8b8b0', 'center', 8);
      RATMA_CHOICES.forEach((C, i) => { const r = choiceRect(i), on = hit(m, r), a = Math.min(1, t * 2);
        ctx.globalAlpha = a; ctx.fillStyle = on ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = C.color; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        // 가르침을 상징하는 문양: 기억 = 서로 맞물려 도는 두 원 / 따르기 = 해골을 감싸는 사령 고리
        const cx = r.x + r.w / 2, cy = r.y + 30; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = C.color; ctx.lineWidth = 1.5;
        if (i === 0) { ctx.beginPath(); ctx.arc(cx - 6, cy, 10, T * 1.5, T * 1.5 + 5); ctx.stroke(); ctx.strokeStyle = '#c08aff'; ctx.beginPath(); ctx.arc(cx + 6, cy, 10, -T * 1.5, -T * 1.5 + 5); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.stroke(); for (let k = 0; k < 6; k++) { const aa = T * 2 + k * TAU / 6; ctx.fillStyle = C.color; ctx.fillRect(Math.round(cx + Math.cos(aa) * 14) - 1, Math.round(cy + Math.sin(aa) * 14) - 1, 2, 2); }
          ctx.fillStyle = '#e8e4dc'; ctx.fillRect(cx - 4, cy - 5, 8, 7); ctx.fillStyle = '#000'; ctx.fillRect(cx - 3, cy - 3, 2, 2); ctx.fillRect(cx + 1, cy - 3, 2, 2); }
        ctx.restore(); ctx.lineWidth = 1;
        hudText(ctx, `${i + 1}  ${C.name}`, cx, r.y + 52, C.color, 'center', 10);
        hudWrap(ctx, `"${C.desc}"`, cx, r.y + 68, r.w - 18, '#d8d8d8', 8, 11);
        C.effects.forEach((e, j) => hudText(ctx, '· ' + e, r.x + 10, r.y + 98 + j * 13, '#bfc8c4', 'left', 8));
        ctx.globalAlpha = 1; });
      hudText(ctx, '1 / 2 또는 클릭: 고르기 (되돌릴 수 없음)', VIEW_W / 2, VIEW_H - 18, '#888', 'center', 8);
    } else if (o.type === 'ratma_rank') {
      hudText(ctx, '네크로맨서 — 최종 전직 선택', VIEW_W / 2, 16, '#c08aff', 'center', 15);
      hudText(ctx, '지금 캐릭터의 직업이 네크로맨서로 바뀌고 곧바로 3차 전직합니다 (능력치·무기·축복·보구는 그대로)', VIEW_W / 2, 36, '#a8a0b8', 'center', 8);
      jobLines(NECRO_ID).forEach((L, i) => { const r = rankRect(i), on = hit(m, r), W = game.data.weapons.get(RATMA_LINE_WEAPON[L.id]);
        ctx.fillStyle = on ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = L.color; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        const H = heroWithLook(game.data.heroes.get(NECRO_ID), L.looks[2]); drawHero(ctx, H, r.x + r.w / 2, r.y + 22, 1, Math.floor(T * 3) % 2, false);
        hudText(ctx, `${i + 1}  ${L.ranks[2]}`, r.x + r.w / 2, r.y + 38, L.color, 'center', 11);
        hudText(ctx, `${L.name} 계열 · ${L.ranks[1]} → ${L.ranks[2]}`, r.x + r.w / 2, r.y + 54, '#bbb', 'center', 7);
        hudWrap(ctx, L.desc, r.x + r.w / 2, r.y + 68, r.w - 14, '#ddd', 8, 10);
        hudText(ctx, '최종 스킬: ' + L.skills[2].name, r.x + r.w / 2, r.y + 104, '#ffe9a0', 'center', 8);
        hudText(ctx, '전용 고유 무기', r.x + r.w / 2, r.y + 122, '#999', 'center', 7);
        if (W) { drawWeaponCentered(ctx, W, r.x + r.w / 2, r.y + 136); hudText(ctx, W.name, r.x + r.w / 2, r.y + 148, RARITY_COLOR[W.rarity], 'center', 8); } });
      hudText(ctx, '1·2 또는 클릭: 전직   ·   Esc: 가르침 다시 고르기   ·   공통 고유 무기 「라트마의 기록」도 함께 받습니다', VIEW_W / 2, VIEW_H - 18, '#888', 'center', 8);
    } else if (o.type === 'ratma_altar') {
      hudText(ctx, '영혼의 제단', VIEW_W / 2, 30, '#9affd0', 'center', 16);
      ctx.globalAlpha = 0.85; drawSprite(ctx, getSprite('boss_ratma'), VIEW_W / 2, 92, {}); ctx.globalAlpha = 1;
      game.ratmaAltarItems().forEach((it, i) => { const r = menuRect(i), on = hit(m, r); ctx.fillStyle = on ? 'rgba(154,255,208,0.18)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        hudText(ctx, it.label, r.x + 10, r.y + 6, it.ok ? '#ffffff' : '#777', 'left', 9); });
      if (o.msg && o.msg.t > 0) hudText(ctx, o.msg.text, VIEW_W / 2, VIEW_H - 34, o.msg.color, 'center', 9);
      hudText(ctx, '1~4 / 클릭   ·   Esc: 닫기', VIEW_W / 2, VIEW_H - 18, '#888', 'center', 8);
    } else if (o.type === 'ratma_phantom') {
      hudText(ctx, '라트마의 추가 시험', VIEW_W / 2, 50, '#9affd0', 'center', 15);
      hudText(ctx, '이 방의 문이 닫히고 강화된 정예 몬스터가 몰려옵니다', VIEW_W / 2, 74, '#ddd', 'center', 9);
      hudText(ctx, ratmaSave(game.save).got.includes('weapon_ratma_lantern_001') ? '보상: 들고 있는 무기 특별 강화 (+1)' : '보상: 고유 무기 「영혼의 등불」', VIEW_W / 2, 88, '#ffe9a0', 'center', 9);
      ['1  시험을 받는다', '2  지나친다'].forEach((s, i) => { const r = menuRect(i), on = hit(m, r); ctx.fillStyle = on ? 'rgba(154,255,208,0.18)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x, r.y, r.w, r.h); hudText(ctx, s, r.x + 10, r.y + 6, '#fff', 'left', 9); });
    }
  };

  // ── 관리자 메뉴: 테스트 서버 확인용 ──
  wrap('adminActions', function (orig) {
    const list = orig.call(this), d = this.mode === 'dungeon', R = ratmaSave(this.save);
    return list.concat([
      { name: `라트마 퀘스트 단계 +1 (지금 ${R.defeated ? '완료' : R.step})`, run: () => { if (R.step < 3) R.step++; else R.defeated = true; writeSave(this.save); } },
      { name: '생사의 경계 바로 입장 (지금 캐릭터로)', ok: d && !this.trialW && !this.coop, run: () => { this.transition = { t: 0, swapped: false, action: () => this.enterBoundary() }; } },
      { name: '라트마 재대결 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('ratma_rematch') }; } },
      { name: '라트마 고난도 재대결 바로 시작', ok: !this.trialW, run: () => { this.transition = { t: 0, swapped: false, action: () => this.startQuestTrial('ratma_hard') }; } },
      { name: '라트마 진행 초기화 (고유 무기 기록 포함)', run: () => { const sv = this.save; sv.ratma = {}; sv.armory = sv.armory.filter((id) => !RATMA_UNIQUE_IDS.includes(id)); writeSave(sv); } }
    ]);
  });
})();

// ── 퀘스트 창: 서브 퀘스트 '라트마의 시험'
if (typeof questBook === 'function') {
  const _questBook = questBook;
  // eslint-disable-next-line no-global-assign
  questBook = function (game) {
    const B = _questBook(game), R = ratmaSave(game.save || {});
    const steps = { 1: '망자의 성 8-4 — 망자의 왕을 쓰러뜨려라 (라트마의 환영)', 2: '기원의 성역 10-4 — 무명의 문지기 너머의 문양을 찾아라', 3: '생사의 경계 — 성역의 숨겨진 문 너머, 라트마의 시험' };
    if (R.defeated) { B.sub.push({ title: '라트마의 시험', desc: R.choice === 'follow' ? '가르침을 따라 네크로맨서가 되었다' : '가르침을 기억했다 — 네크로맨서 해금', prog: '완료', state: 'done' });
      B.sub.push({ title: '생사의 경계 — 재대결', desc: '로비 영혼의 제단에서 라트마와 다시 싸우기', prog: `재대결 ${R.rematchWins} · 고난도 ${R.hardWins}`, state: R.hardWins ? 'done' : 'ready' }); }
    else if (R.step >= 1) B.sub.push({ title: '라트마의 시험', desc: steps[R.step], prog: `${R.step}/4 단계`, state: 'now' });
    else B.hidden++;
    return B;
  };
}
