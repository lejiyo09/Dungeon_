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
    if (d > stop) { const v = Math.min((this.big ? 125 : 165) * dt, d - stop); this.x += dx / d * v; this.y += dy / d * v; }
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
      const n = Math.floor(((P.souls || 0) % NECRO_SOUL.need) / 2); // 2개마다 한 칸 (5칸)
      for (let i = 0; i < 5; i++) { ctx.globalAlpha = i < n ? 0.95 : 0.22; ctx.fillStyle = i < n ? fx.trail : '#666'; ctx.fillRect(x - 7 + i * 3, y + 10, 2, 1); }
    }
    if (w && w.ratma === 'insight') for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; ctx.globalAlpha = 0.85; ctx.fillStyle = i ? '#e0c8ff' : '#b070ff'; ctx.fillRect(Math.round(x + Math.cos(a) * 11) - 1, Math.round(y - 4 + Math.sin(a) * 5) - 1, 2, 2); } // 지팡이 주변을 도는 영혼
    if (w && w.ratma === 'anguish' && typeof game !== 'undefined') { ctx.globalAlpha = 0.35; ctx.strokeStyle = '#7affc0'; // 플레이어와 소환수 사이의 영혼 연결선
      for (const a of game.allies) if (a instanceof NecroWraith && a.owner === P && a.tag === 'anguish') { ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.quadraticCurveTo((x + a.x) / 2, Math.min(y, a.y) - 14 + Math.sin(t * 4) * 3, a.x, a.y - 2); ctx.stroke(); } }
    if (w && w.ratma === 'record') { const k = Math.min(1, (P.ratmaRecord || 0) / RATMA_FX.record.need); // 떠다니는 기록 페이지 · 기록이 쌓일수록 밝아짐
      for (let i = 0; i < 3; i++) { const a = t * 1.2 + i * TAU / 3; ctx.globalAlpha = 0.35 + 0.55 * k; ctx.fillStyle = '#ffe9a0'; ctx.fillRect(Math.round(x + Math.cos(a) * 13) - 2, Math.round(y - 8 + Math.sin(a) * 4) - 1, 3, 4); }
      ctx.globalAlpha = 0.15 + 0.45 * k; ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(x + P.aim.x * 10, y - 1 + P.aim.y * 8, 3 + 3 * k, 0, TAU); ctx.fill(); }
    if (P.endGuardUntil > (typeof game !== 'undefined' ? game.time : 0)) for (let i = 0; i < 6; i++) { const a = t * 2.5 + i * TAU / 6; ctx.globalAlpha = 0.9; ctx.fillStyle = i % 2 ? '#3a3046' : '#a060ff'; ctx.fillRect(Math.round(x + Math.cos(a) * 12) - 1, Math.round(y - 4 + Math.sin(a) * 7) - 2, 3, 4); } // 검은 갑옷 조각
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
  if (this.necroBladeUntil > t) b += 0.3;
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
  wrap('setJob', function (orig, p, line, rank) { const r = orig.call(this, p, line, rank); if (p && p.necroFrom) this.applyNecroIdentity(p); return r; });
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
    // 영혼 수확 (네크로맨서 패시브)
    if (p.hero.id === NECRO_ID && p.state !== 'DEAD') {
      const S = NECRO_SOUL, gain = boss ? S.perBoss : enemy.elite ? S.perElite : S.perKill, b = p.souls || 0; p.souls = b + gain;
      this.effects.part(enemy.x, enemy.y - 4, 0, -30, { color: ratmaLineFx(p).trail, life: 0.6, size: 2, size2: 0, drag: 1, add: true });
      const charges = Math.floor(p.souls / S.need) - Math.floor(b / S.need);
      if (charges > 0) { p.energy = Math.min(p.maxEnergy, p.energy + S.energy * charges); p.skillCooldown = Math.max(0, p.skillCooldown - S.cdCut * charges);
        this.effects.text(p.x, p.y - 24, '사령 에너지 충전', ratmaLineFx(p).trail); this.effects.ring(p.x, p.y, 16, ratmaLineFx(p).trail); }
    }
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
    if (enemy.necroMarkT > now) mult *= 1 + RATMA_FX.endurance.mark;                              // 사령 표식: 추가 영혼 피해 +20%
    if (key === 'crown') { const F = RATMA_FX.crown; if (enemy.def.boss) mult *= 1 + F.boss + (enemy.hp < enemy.maxHp * F.low ? F.lowBonus : 0); else if (enemy.elite) mult *= 1 + F.elite; }
    if (key === 'lantern' && p && p.lanternBoostUntil > now) mult *= RATMA_FX.lantern.mult;
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
    if (key === 'endurance') { const F = RATMA_FX.endurance; // 흡혈 4% · 사령 표식
      if (dealt > 0) { const h = Math.max(1, Math.round(dealt * F.leech)); p.hp = Math.min(p.maxHp, p.hp + h); }
      if (enemy.alive) { if (!(enemy.necroMarkT > now)) this.effects.text(enemy.x, enemy.y - 22, '사령 표식', '#c070ff'); enemy.necroMarkT = now + F.markDur; }
      for (let i = 0; i < 3; i++) this.effects.part(enemy.x + randInt(-4, 4), enemy.y - 4, randInt(-20, 20), -30, { color: i ? '#2a1a34' : '#a060ff', life: 0.45, size: 2.5, size2: 0, drag: 2 }); // 검은 불꽃
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
      if (w.ratma === 'endurance') { const F = RATMA_FX.endurance;
        if (!(p.endGuardCd > now) && (p.hp - amount) <= p.maxHp * F.lowHp && !p.isInvulnerable) { p.endGuardUntil = now + F.guardDur; p.endGuardCd = now + F.cd; // 1회 발동 후 재사용 대기
          this.effects.text(p.x, p.y - 30, '죽음을 견디는 자', '#c070ff', true); this.effects.ring(p.x, p.y, 22, '#a060ff'); SFX.play('shield', 0.2); }
        if (p.endGuardUntil > now) amount = Math.max(1, Math.round(amount * (1 - F.guard))); }
    }
    return orig.call(this, amount);
  });

  // ── 네크로맨서 스킬 ──
  const NECRO_SKILLS = new Set(['necro_army', 'necro_curse', 'necro_nova', 'necro_march', 'necro_legion', 'necro_blade', 'necro_charge']);
  wrap('useSkill', function (orig) {
    const p = this.player;
    if (!NECRO_SKILLS.has(p.skillId)) return orig.call(this);
    if (p.castLock > 0 || p.skillCooldown > 0) return;
    if (p.denyT > 0) { this.effects.text(p.x, p.y - 20, '부정됨', '#d8f0ff'); return; }
    if (!this.zoneRight('job')) { this.effects.text(p.x, p.y - 20, '직업의 권리를 빼앗겼다', '#ffd84a'); return; }
    p.skillCooldown = p.skillCdMax; this.guildEvent('skills'); SFX.play('skill');
    if (p.rank === 2) this.ultimateFx(p);
    this.castNecroSkill(p);
  });
  G.castNecroSkill = function (p) {
    const D = (b) => this.skillDmg(b), mw = this.mouseWorld(), A = Math.atan2(p.aim.y, p.aim.x), fx = ratmaLineFx(p);
    const at = (range) => { const dx = mw.x - p.x, dy = mw.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, range / d); return { x: p.x + dx * k, y: p.y + dy * k }; };
    const summon = (n, o) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; this.allies.push(new NecroWraith(p.x + Math.cos(a) * 14, p.y - 6 + Math.sin(a) * 8, p, Object.assign({ idx: i, color: fx.kind === 'mist' ? '#9affd8' : '#b8a0ff', color2: fx.trail2 }, o))); }
      for (let i = 0; i < 16; i++) { const a = Math.random() * TAU; this.effects.part(p.x + Math.cos(a) * 24, p.y + Math.sin(a) * 14, -Math.cos(a) * 40, -Math.sin(a) * 30 - 10, { color: i % 2 ? fx.trail : '#ffffff', life: 0.6, size: 2, size2: 0, drag: 1.2, add: true }); } };
    const cracks = (x, y, r, col) => { for (let i = 0; i < 7; i++) { const a = Math.random() * TAU, d = r * (0.4 + Math.random() * 0.6); this.effects.beamline(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.65, 1.5, col); } }; // 보라색 균열
    switch (p.skillId) {
      case 'necro_army': summon(3, { dmg: 6, life: 10 }); break;
      case 'necro_march': summon(5, { dmg: 8, life: 14 }); this.effects.ring(p.x, p.y, 30, fx.trail); break;
      case 'necro_legion': { // 망자의 군주: 강력한 망령 군단
        summon(7, { dmg: 9, life: 16 }); this.allies.push(new NecroWraith(p.x, p.y - 14, p, { big: true, dmg: 30, life: 16, color: '#b8ffe8', color2: '#c08aff' }));
        for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 130 + e.radius) e.applyStatus({ type: 'freeze', chance: 1, duration: 2, slow: 0.5 }, p.mods);
        this.zones.push(new RatmaSigil(p.x, p.y, 70, '#9affd8', 1.2)); this.effects.rays(p.x, p.y, '#9affd8', 16, 90, 0.8); this.addShake(0.25, 4); SFX.play('solomon', 0.4); break; }
      case 'necro_curse': { // 리치: 저주 폭발
        const c = at(190), R = 70;
        this.explodeAt(c.x, c.y, R, { color: '#b47aff', hurtEnemies: true, src: { damage: D(40), mods: p.mods, knockback: 4, mark: { mult: 1.3, dur: 5 }, status: { type: 'curse', chance: 1, duration: 6 } } });
        for (const e of this.enemies) if (e.alive && Math.hypot(e.x - c.x, e.y - c.y) < R + e.radius) e.necroBurstUntil = this.time + 6;
        this.zones.push(new RatmaSigil(c.x, c.y, R, '#b47aff', 0.9)); cracks(c.x, c.y, R, '#c08aff'); SFX.play('magic'); break; }
      case 'necro_nova': { // 불멸의 군주: 광범위 사령 폭발
        const R = 150; this.zones.push(new RatmaSigil(p.x, p.y, R, '#d8a0ff', 1.6));
        this.zones.push(new SkillCast(p, p.x, p.y, { r: R, time: 0.8, color: '#b47aff' }, () => {
          this.explodeAt(p.x, p.y, R, { color: '#b47aff', hurtEnemies: true, src: { damage: D(300), mods: p.mods, knockback: 12, status: { type: 'curse', chance: 1, duration: 6 } } });
          let n = 0; for (const C of this.corpses || []) { if (n >= 8 || C.used || Math.hypot(C.x - p.x, C.y - p.y) > R) continue; C.used = true; n++; const cx = C.x, cy = C.y; // 시체 연쇄 폭발
            this.zones.push(new DelayCall(0.1 + n * 0.07, (w) => { w.explodeAt(cx, cy, 40, { color: '#d8a0ff', hurtEnemies: true, src: { damage: D(80), mods: p.mods, knockback: 6 } }); if (w.effects.corpseBlast) w.effects.corpseBlast(cx, cy, 40); })); }
          this.effects.rays(p.x, p.y, '#d8a0ff', 22, R + 20, 0.9); this.effects.ring(p.x, p.y, R, '#ffffff'); cracks(p.x, p.y, R, '#b47aff'); this.screenFlash = 0.25; this.flashColor = '180,122,255'; this.addShake(0.45, 8); this.hitStop(0.06); SFX.play('explode'); })); break; }
      case 'necro_blade': { // 사령 기사: 사령검 베기
        const range = 70, arc = 2.6; let dealt = 0;
        for (const e of this.enemies) { if (!e.targetable) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
          if (d - e.radius <= range && (d < 6 || angleDiff(Math.atan2(dy, dx), A) < arc / 2)) { const h0 = e.hp; this.damageEnemy(e, { damage: D(70), mods: p.mods, knockback: 8 }, dx / (d || 1), dy / (d || 1)); dealt += Math.max(0, h0 - Math.max(0, e.hp)); } }
        const heal = Math.min(Math.round(p.maxHp * 0.1), Math.round(dealt * 0.15)); if (heal > 0) { p.hp = Math.min(p.maxHp, p.hp + heal); this.effects.text(p.x, p.y - 22, '+' + heal, '#7be36b'); }
        p.necroBladeUntil = p.time + 4; p.swing = { t: 0, dur: 0.2, ang: A, arc, thrust: false };
        this.effects.slash(p.x, p.y - 1, A, range, arc, '#a060ff'); this.effects.slash(p.x, p.y - 1, A, range * 0.7, arc * 0.8, 'rgba(30,20,40,0.9)');
        for (let i = 0; i < 10; i++) { const a = A + (Math.random() - 0.5) * arc, d = Math.random() * range; this.effects.part(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 0, -30, { color: i % 2 ? '#1a1020' : '#a060ff', life: 0.5, size: 3, size2: 0, drag: 2 }); }
        this.addShake(0.15, 3); SFX.play('heavy'); break; }
      case 'necro_charge': { // 죽음의 집행자: 거대한 사령검 돌진 베기
        const sx = p.x, sy = p.y; moveAndCollide(p, p.aim.x * 150, p.aim.y * 150, this.map); p.blinkInv = 0.45;
        const ex = p.x + p.aim.x * 24, ey = p.y + p.aim.y * 24; let hit = 0;
        for (const e of this.enemies) if (e.targetable && segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + 16) >= 0) { this.damageEnemy(e, { damage: D(260), mods: p.mods, knockback: 10 }, p.aim.x, p.aim.y); hit++; }
        this.zones.push(new DelayCall(0.12, (w) => { w.explodeAt(p.x, p.y, 70, { color: '#a060ff', hurtEnemies: true, src: { damage: D(120), mods: p.mods, knockback: 12 } }); w.effects.ring(p.x, p.y, 70, '#1a1020'); w.addShake(0.3, 6); }));
        const heal = Math.min(Math.round(p.maxHp * 0.2), hit * Math.round(p.maxHp * 0.03)); if (heal > 0) { p.hp = Math.min(p.maxHp, p.hp + heal); this.effects.text(p.x, p.y - 22, '+' + heal, '#7be36b'); }
        this.effects.beamline(sx, sy, ex, ey, 14, '#1a1020'); this.effects.beamline(sx, sy, ex, ey, 7, '#a060ff'); this.effects.beamline(sx, sy, ex, ey, 2, '#ffffff', true);
        for (let d = 0; d < Math.hypot(ex - sx, ey - sy); d += 10) { const k = d / (Math.hypot(ex - sx, ey - sy) || 1); this.effects.part(sx + (ex - sx) * k, sy + (ey - sy) * k, randInt(-15, 15), -25, { color: d % 20 ? '#2a1a34' : '#a060ff', life: 0.6, size: 3, size2: 0, drag: 2 }); }
        this.hitStop(0.06); SFX.play('heavy'); break; }
    }
  };

  // ── 매 프레임: 연출 (이동 잔상 · 대시 망령 흔적 · 고유 무기 상시 VFX · 라트마 등장/페이즈) ──
  G.ratmaWantsAura = function (p) { return !!p && p.state !== 'DEAD' && (p.hero.id === NECRO_ID || p.weapons.some((w) => w.def.ratma) || p.endGuardUntil > this.time); };
  wrap('updateSkillEffects', function (orig, dt) { const r = orig.call(this, dt); this.ratmaTick(dt); return r; });
  G.ratmaTick = function (dt) {
    const p = this.player; if (!p) return;
    if (this.ratmaWantsAura(p) && !this.zones.some((z) => z.isNecroAura && z.owner === p)) this.zones.push(new NecroAura(p));
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
        if (w.ratma === 'endurance') { this.effects.part(hx + randInt(-3, 3), hy - 2, randInt(-4, 4), -22, { color: Math.random() < 0.6 ? '#1a1020' : '#a060ff', life: 0.45, size: 2, size2: 0, drag: 1 }); // 검에서 흘러나오는 검은 불꽃
          if (p.moving && Math.random() < 0.5) this.effects.part(p.x, p.y, 0, 0, { color: 'rgba(40,20,60,0.6)', life: 0.35, size: 5, size2: 2, drag: 0 }); } // 검은 영혼 잔상
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
  const choiceRect = (i) => cRect(i, 2, 214, 150, 62), rankRect = (i) => cRect(i, 3, 158, 166, 52), menuRect = (i) => ({ x: VIEW_W / 2 - 120, y: 104 + i * 26, w: 240, h: 22 });
  const hit = (m, r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
  G.ratmaAltarItems = function () { const R = ratmaSave(this.save); return [
    { key: 'talk', label: '1  라트마와 이야기하기', ok: true },
    { key: 'rematch', label: `2  재대결 — 생사의 경계${R.rematchWins ? ` (승리 ${R.rematchWins})` : ' (첫 승리: 생사의 균형추)'}`, ok: true },
    { key: 'hard', label: R.rematchWins ? `3  고난도 재대결${R.hardWins ? ` (승리 ${R.hardWins})` : ' (첫 승리: 경계의 왕관)'}` : '3  고난도 재대결 (재대결에서 한 번 이기면 열림)', ok: R.rematchWins > 0 },
    { key: 'close', label: '4  닫기', ok: true }]; };
  G.ratmaTalk = function () {
    const sv = this.save, nec = sv.selected === NECRO_ID, line = nec && sv.lineChoice && sv.lineChoice[NECRO_ID], R = ratmaSave(sv);
    const pool = nec ? RATMA_TALK.necro.concat(RATMA_TALK[line] || []) : RATMA_TALK.common.slice();
    if (R.choice === 'follow' && R.line) pool.push(...RATMA_TALK[R.line]);
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
      if (o.t > 0.5) for (let i = 0; i < 3; i++) if (input.wasPressed('Digit' + (i + 1))) k = i;
      if (click) for (let i = 0; i < 3; i++) if (hit(m, rankRect(i))) k = i;
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
      hudText(ctx, '1~3 또는 클릭: 전직   ·   Esc: 가르침 다시 고르기   ·   공통 고유 무기 「라트마의 기록」도 함께 받습니다', VIEW_W / 2, VIEW_H - 18, '#888', 'center', 8);
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
