'use strict';
// ════════════════════════════════════════════
// 뽑기 전설 스킨 4종 전용 연출: 스킬 이펙트 · 대시 이펙트 (+ actors.js 의 방향별 무기 드는 위치)
//  · lejiyo09/Dungeon_ 의 전설 스킨 연출(skinSkill · skinDash)을 이쪽 스킨 4종에 맞춰 옮김
//      심연의 기사 ← abyss_knight · 성역의 성자 ← star_paladin · 공허의 마도사 ← void_empress · 진홍의 칼날 ← crimson_lotus
//  · 그림만 바꿈: 판정·수치·난수 흐름은 건드리지 않음 (장식 난수는 따로)
// ════════════════════════════════════════════
const LEGEND_VFX = { // 스킨 그림 이름 → 색 (main: 선, soft: 빛·점)
  leg_abyss: { key: 'abyss', main: '#43e5d4', soft: '#b2fff6' },
  leg_star: { key: 'star', main: '#ffdc75', soft: '#fff5c8' },
  leg_void: { key: 'void', main: '#ca8aff', soft: '#f0d2ff' },
  leg_crimson: { key: 'crimson', main: '#ff648d', soft: '#ffc1d3' },
  leg_admiral: { key: 'admiral', main: '#f0c050', soft: '#fff1c0', sea: '#7ad8ff', smoke: '#b8bcc8', dashOnly: true } // 창해의 포격 제독: 대시만 (스킬 이펙트는 아직)
};
let _lvSeed = 0x51ed27; function lvRand() { _lvSeed = (_lvSeed * 1664525 + 1013904223) >>> 0; return _lvSeed / 4294967296; } // 장식 전용 난수

// 이 플레이어가 지금 보이는 스킨 그림 이름 (actors.js 의 render 와 같은 규칙)
function legendSkinSprite(p, game) {
  if (!p || !p.hero) return null;
  if (p.skinShown !== undefined) return p.skinShown; // 멀티 참가자 화면: 방장이 확인해 보낸 값
  if (p.remoteSkin !== undefined) return p.remoteSkin && skinAllowed(p.remoteSkin, p.hero.id, p.line && p.line.id) ? p.remoteSkin : null; // 방장 쪽 동료
  return game && game.player === p && game.skinSprite ? game.skinSprite(p.hero.id, game.playerLineId(p)) : null; // 내 캐릭터
}
function legendOf(p, game) { const s = legendSkinSprite(p, game); return s && LEGEND_VFX[s] ? s : null; }

// ── 이펙트 생성 (Effects 에 붙임)
Effects.prototype.legendDash = function (sk, x, y, dx = 1, dy = 0, first = false) { // 단순하고 화려하게: 빛나는 혜성 꼬리 + 스킨 문양 하나 (+ 출발할 때 섬광)
  const s = LEGEND_VFX[sk]; if (!s) return;
  this.push({ kind: 'legend', fx: 'dash', key: s.key, x, y, angle: Math.atan2(dy, dx), color: s.main, accent: s.soft, sea: s.sea, smoke: s.smoke, first, t: 0, life: first ? 0.42 : 0.32, opacity: 1, seed: lvRand() });
  const n = first ? 10 : 2; // 반짝이 입자: 출발할 땐 사방으로, 달리는 동안엔 뒤로 조금
  for (let i = 0; i < n; i++) { const a = first ? i / n * TAU + lvRand() * 0.4 : Math.atan2(-dy, -dx) + (lvRand() - 0.5) * 1.4, sp = first ? 60 + lvRand() * 30 : 24 + lvRand() * 20;
    this.part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, { color: i % 3 === 0 ? '#ffffff' : i % 2 ? s.main : s.soft, life: 0.22 + lvRand() * 0.12, size: first ? 2.4 : 1.8, size2: 0, drag: 6, add: true }); }
  if (s.key === 'admiral' && lvRand() < 0.5) this.part(x - dx * 6, y - dy * 6 - 2, -dx * 10, -dy * 10 - 8, { color: s.smoke, life: 0.4, size: 2.2, size2: 4.4, drag: 4, shape: 'circle' }); // 포연
};
Effects.prototype.legendSkill = function (sk, x, y, angle = 0) {
  const s = LEGEND_VFX[sk]; if (!s || s.dashOnly) return;
  this.push({ kind: 'legend', fx: 'skill', key: s.key, x, y, angle, color: s.main, accent: s.soft, t: 0, life: 0.72, opacity: 1.15 });
  for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + angle, r = 7 + (i % 3) * 2;
    this.part(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.cos(a) * 48, Math.sin(a) * 48,
      { color: i % 2 ? s.main : s.soft, life: 0.26 + lvRand() * 0.12, size: 2.2, size2: 0, drag: 5, add: true }); }
};

// ── 그리기 (effects.js draw 의 'legend')
function drawLegendFx(ctx, fx, x, y) {
  const p = Math.min(1, fx.t / fx.life), k = 1 - p;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = fx.color; ctx.fillStyle = fx.accent;
  if (fx.fx === 'dash') { // 대시: 빛나는 혜성 꼬리(공통) + 스킨 문양 하나 + 출발 섬광
    const sd = fx.seed || 0; ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
    if (fx.first) { // 출발 섬광: 퍼지는 고리 + 짧은 빛살 8줄
      const r = 4 + p * 16; ctx.rotate(0); ctx.globalAlpha = k; ctx.strokeStyle = fx.accent; ctx.lineWidth = 1 + 2.5 * k; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + sd; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.35); ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5) * 0.7); ctx.stroke(); }
    }
    ctx.rotate(fx.angle);
    const Lc = 16 + p * 8, w = 1 + 4 * k; // 혜성 꼬리: 넓은 빛 → 밝은 속 → 흰 심
    const comet = (ww, col, al) => { ctx.globalAlpha = al; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-Lc * 0.25, -ww); ctx.lineTo(-Lc, 0); ctx.lineTo(-Lc * 0.25, ww); ctx.closePath(); ctx.fill(); };
    const cc = fx.key === 'admiral' ? fx.sea : fx.color;
    comet(w, cc, 0.45 * k); comet(w * 0.5, fx.accent, 0.85 * k); ctx.globalAlpha = k; ctx.fillStyle = '#ffffff'; ctx.fillRect(-Math.round(Lc * 0.6), 0, Math.round(Lc * 0.6), 1);
    ctx.globalAlpha = Math.min(1, k * 1.6);
    if (fx.key === 'abyss') { // 심연: 굵은 지그재그 균열 (청록 빛 + 흰 심) + 튀는 파편
      const zz = [[-1, -7], [-7, -2], [-4, 2], [-12, 7]], line = (col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); zz.forEach(([a, b], i) => (i ? ctx.lineTo(a - p * 4, b) : ctx.moveTo(a - p * 4, b))); ctx.stroke(); };
      line(fx.color, 4 * k + 1); line('#ffffff', 1);
      ctx.fillStyle = fx.accent; ctx.fillRect(Math.round(-9 - p * 8), Math.round(-5 - p * 4), 2, 2); ctx.fillRect(Math.round(-6 - p * 6), Math.round(5 + p * 4), 2, 2);
    } else if (fx.key === 'crimson') { // 진홍: 크게 흩어지며 도는 꽃잎 셋 + 붉은 초승달 베기
      for (let i = 0; i < 3; i++) { const off = (i - 1) * (3 + p * 9); ctx.save(); ctx.translate(-6 - i * 3 - p * 6, off); ctx.rotate(p * 4 + i * 2.1); ctx.fillStyle = i === 1 ? fx.accent : fx.color; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 5.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -2, 1, 2); ctx.restore(); }
      ctx.strokeStyle = fx.color; ctx.lineWidth = 2 * k + 1; ctx.beginPath(); ctx.arc(-4, 0, 9, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-4, 0, 9, -0.7, 0.7); ctx.stroke();
    } else if (fx.key === 'void') { // 공허: 빨려 들며 줄어드는 소용돌이 고리 + 별빛 두 점
      const r = 9 * k + 2; ctx.strokeStyle = fx.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(-8, 0, r, r * 0.6, p * 3, 0.3, TAU - 0.6); ctx.stroke();
      ctx.strokeStyle = fx.accent; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-8, 0, r * 0.55, r * 0.33, -p * 4, 0, TAU - 1.2); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(-8 + Math.cos(p * 6) * r), Math.round(Math.sin(p * 6) * r * 0.6), 1, 1); ctx.fillRect(Math.round(-8 - Math.cos(p * 6) * r * 0.55), Math.round(-Math.sin(p * 6) * r * 0.33), 1, 1);
    } else if (fx.key === 'star') { // 성역: 크게 번쩍이는 네 갈래 별 + 금빛 가루
      const g = 6 * (1 - Math.abs(2 * p - 1)) + 2; ctx.save(); ctx.translate(-9, 0); ctx.rotate(-fx.angle);
      for (const [col, lw, s] of [[fx.color, 3, 1], ['#ffffff', 1, 0.85]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-g * s, 0); ctx.lineTo(g * s, 0); ctx.moveTo(0, -g * 0.9 * s); ctx.lineTo(0, g * 0.9 * s); ctx.stroke(); }
      ctx.fillStyle = fx.accent; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
      ctx.fillStyle = fx.color; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(-14 - i * 4 - p * 6), Math.round((i - 1) * (3 + p * 4)), 1, 1);
    } else if (fx.key === 'admiral') { // 제독: V자 항적(바다빛·흰 물거품) + 똑바로 선 금빛 닻 + 포연 고리
      const L2 = 10 + p * 18, open = 3 + p * 8;
      for (const [col, lw] of [[fx.sea, 3], ['#ffffff', 1]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(2, s2 * 2); for (let j = 1; j <= 4; j++) { const u = j / 4; ctx.lineTo(2 - L2 * u, s2 * (2 + open * u) + Math.sin(u * 7 + p * 9) * 1.2); } ctx.stroke(); } }
      ctx.save(); ctx.translate(-L2 * 0.55, 0); ctx.rotate(-fx.angle); ctx.fillStyle = fx.color; // 닻
      ctx.fillRect(-0.5, -5, 1.5, 9); ctx.fillRect(-3, -4, 6, 1.5); ctx.fillRect(-1.5, -6.5, 3, 1.5); ctx.fillRect(-4, 2, 1.5, 1.5); ctx.fillRect(2.5, 2, 1.5, 1.5); ctx.fillRect(-3, 3.5, 6, 1.5); ctx.fillStyle = '#ffffff'; ctx.fillRect(-0.5, -6.5, 1, 1); ctx.restore();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = fx.smoke; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-L2 - 2, 0, 2 + p * 6, 0, TAU); ctx.stroke();
    }
  } else if (fx.fx === 'skill') { // 스킬: 시전자 위치에 크게 펼쳐지는 스킨별 인장
    const reach = 14 + p * 23; ctx.translate(x, y - 4); ctx.rotate(fx.angle);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, fx.opacity * (0.9 + 0.1 * k)) * Math.min(1, k * 2.2);
    if (fx.key === 'abyss') { // 봉인핵에서 터져 나오는 균열 세 갈래와 깨진 칼날 조각
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(5, -2); ctx.lineTo(11, -13); ctx.moveTo(4, 0); ctx.lineTo(14, 4); ctx.lineTo(22, 1); ctx.moveTo(1, 5); ctx.lineTo(-8, 12); ctx.stroke();
      ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const q = i * Math.PI / 2 + p * 1.4; ctx.beginPath(); ctx.moveTo(Math.cos(q) * 8, Math.sin(q) * 8); ctx.lineTo(Math.cos(q) * (reach + 7), Math.sin(q) * (reach + 7)); ctx.stroke(); }
      ctx.fillRect(10, -5, 4, 4); ctx.fillRect(-8, 9, 3, 3);
    } else if (fx.key === 'star') { // 성좌의 집행: 대형 별 인장과 사방으로 쏟아지는 성광
      ctx.lineWidth = 2.6; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + p * 0.2, r = i % 2 ? 9 : reach, px = Math.cos(a) * r, py = Math.sin(a) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.stroke();
      ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.lineTo(Math.cos(a) * (reach + 8), Math.sin(a) * (reach + 8)); ctx.stroke(); }
      ctx.fillRect(-3, -3, 6, 6);
    } else if (fx.key === 'void') { // 공허의 문: 역방향 초승달 두 겹과 안쪽에서 뻗는 마력 파편
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, reach, -2.1, 1.15); ctx.stroke();
      ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(0, 0, reach * 0.67, 1.2, 4.4); ctx.stroke();
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - p * 0.7; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * (reach + 8), Math.sin(a) * (reach + 8)); ctx.stroke(); }
      ctx.fillRect(-2, -2, 5, 5);
    } else if (fx.key === 'crimson') { // 홍련 개화: 여섯 장의 꽃잎이 펼쳐지며 붉은 곡선이 가로지름
      ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + p * 0.35; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -reach * 0.62, 4, reach * 0.34, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(-reach, -4); ctx.quadraticCurveTo(0, reach * 0.55, reach, -4); ctx.stroke();
      ctx.fillRect(-3, -3, 6, 6);
    }
  }
  ctx.restore(); ctx.lineWidth = 1;
}

// ── 연결
(function () {
  if (typeof Game === 'undefined') return;
  const G = Game.prototype;
  // 스킬: 실제로 시전됐을 때만 (쿨타임·충전 칸이 줄었을 때) — 멀티에서는 방장이 판정하고 'legendSkill' 연출을 동료 화면에도 보냄
  const _useSkill = G.useSkill;
  G.useSkill = function (...a) {
    const p = this.player, cd = p && p.skillCooldown, ch = p && p.dsCharges, r = _useSkill.apply(this, a);
    if (p && (p.skillCooldown !== cd || p.dsCharges !== ch)) { const sk = legendOf(p, this); if (sk && this.effects) this.effects.legendSkill(sk, p.x, p.y, Math.atan2(p.aim.y, p.aim.x)); }
    return r;
  };
  // 대시: 화면마다 보이는 플레이어 모두를 직접 그림 (참가자의 대시는 방장이 모르므로 보내지 않음)
  //  내 캐릭터는 대시 상태로, 다른 사람은 위치 변화 속도로 판단
  const _update = G.update;
  G.update = function (dt, ...a) {
    const r = _update.call(this, dt, ...a);
    if (this.mode === 'dungeon' && this.effects && this.player && !(dt > 0.2)) {
      const list = [this.player]; if (this.remotes) for (const R of this.remotes.values()) if (R && R.p) list.push(R.p);
      const dashV = (typeof DATA_PLAYER_BASE !== 'undefined' && DATA_PLAYER_BASE.dashSpeed) || 400;
      for (const P of list) {
        if (!P || P.state === 'DEAD') { if (P) P._lvx = undefined; continue; }
        const lx = P._lvx, ly = P._lvy; P._lvx = P.x; P._lvy = P.y;
        const sk = legendOf(P, this); if (!sk || lx === undefined || !(dt > 0)) continue;
        const mx = P.x - lx, my = P.y - ly, d = Math.hypot(mx, my), v = d / dt;
        const dashing = P === this.player ? P.state === 'DASH' : v > dashV * 0.6 && d < 40; // 순간이동(40px 넘게)은 대시가 아님
        if (!dashing) { P._lvT = 0; P._lvOn = false; continue; }
        const first = !P._lvOn; P._lvOn = true;
        P._lvT = (P._lvT || 0) - dt; if (P._lvT > 0 && !first) continue; P._lvT = 0.04;
        const ux = d > 0.01 ? mx / d : (P.dashDir ? P.dashDir.x : 1), uy = d > 0.01 ? my / d : (P.dashDir ? P.dashDir.y : 0);
        this.effects.legendDash(sk, lx, ly + 3, ux, uy, first);
      }
    }
    return r;
  };
})();
if (typeof COOP !== 'undefined' && COOP.fx && !COOP.fx.includes('legendSkill')) COOP.fx.push('legendSkill'); // 스킬 연출은 동료 화면에도
