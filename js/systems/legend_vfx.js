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
  leg_admiral: { key: 'admiral', main: '#f0c050', soft: '#fff1c0', sea: '#9ad8ff', smoke: '#eef6ff', navy: '#26355e' } // 천공함대 제독: 하늘빛 비행운 · 구름 · 금빛 날개 닻
};
// 천공함대 비행함 도트 (오른쪽을 봄 · 외곽선 자동) — a/b/c = 남색 기낭, y 금, h 나무, w 흰, r 붉은 깃발, e 창문 불빛
if (typeof PIX !== 'undefined') Object.assign(PIX, {
  fleet_flag: { tint: '#2c3d70', w: 36, h: 20, pal: { y: '#f0c050', z: '#a8782a', h: '#6a4428', j: '#4a2e1a', w: '#ffffff', r: '#d8404a', e: '#ffe9a0', d: '#1a2240' }, proc: (P) => {
    P.tri(1, 2, 7, 7, 1, 12, 'z'); P.tri(2, 4, 6, 7, 2, 10, 'y'); // 꼬리 날개
    P.ell(18, 7, 13, 5, 'a'); P.ell(18, 5, 11, 2, 'c'); P.rect(6, 7, 25, 1, 'y'); // 기낭 · 윗빛 · 금띠
    for (const x of [10, 15, 20, 25]) P.line(x, 3, x, 11, 'b'); P.px(30, 7, 'y'); P.px(31, 7, 'e'); // 늑골 · 뱃머리 등
    P.line(11, 12, 12, 14, 'd'); P.line(24, 12, 23, 14, 'd'); P.line(17, 12, 17, 14, 'd'); // 줄
    P.rect(9, 14, 17, 4, 'h'); P.rect(9, 14, 17, 1, 'y'); P.rect(10, 17, 15, 1, 'j'); P.tri(26, 14, 30, 15, 26, 18, 'h'); P.px(27, 15, 'y'); // 선체 · 금테 · 뱃머리
    P.px(12, 15, 'e'); P.px(16, 15, 'e'); P.px(20, 15, 'e'); P.rect(13, 18, 1, 2, 'd'); P.rect(18, 18, 1, 2, 'd'); P.rect(22, 18, 1, 2, 'd'); // 창문 · 아래 포구
    P.line(18, 0, 18, 2, 'y'); P.rect(19, 0, 3, 1, 'r'); P.px(19, 1, 'r'); // 깃발
    P.rect(0, 6, 1, 3, 'w'); // 프로펠러
  } },
  fleet_escort: { tint: '#2c3d70', w: 24, h: 13, pal: { y: '#f0c050', z: '#a8782a', h: '#6a4428', w: '#ffffff', e: '#ffe9a0', d: '#1a2240' }, proc: (P) => {
    P.tri(1, 1, 5, 4, 1, 8, 'z'); P.ell(12, 4, 9, 3, 'a'); P.ell(12, 3, 7, 1, 'c'); P.rect(4, 4, 17, 1, 'y'); P.px(20, 4, 'e');
    P.line(8, 7, 9, 9, 'd'); P.line(16, 7, 15, 9, 'd'); P.rect(7, 9, 11, 3, 'h'); P.rect(7, 9, 11, 1, 'y'); P.tri(18, 9, 21, 10, 18, 12, 'h'); P.px(10, 10, 'e'); P.px(14, 10, 'e'); P.rect(0, 3, 1, 3, 'w');
  } }
});
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
  if (s.key === 'abyss') { // 심연: 반짝이 대신 가라앉는 검푸른 안개
    const n2 = first ? 5 : (lvRand() < 0.6 ? 1 : 0);
    for (let i = 0; i < n2; i++) { const a = first ? i / n2 * TAU : Math.atan2(-dy, -dx) + (lvRand() - 0.5) * 1.2, sp = first ? 26 : 12;
      this.part(x, y, Math.cos(a) * sp, Math.sin(a) * sp + 6, { color: i % 2 ? '#13283a' : '#0a1420', life: 0.5 + lvRand() * 0.2, size: 2.5, size2: 5, drag: 4, grav: 10, shape: 'circle' }); }
    if (first || lvRand() < 0.35) this.part(x + (lvRand() - 0.5) * 6, y, 0, 14, { color: s.main, life: 0.35, size: 1.2, size2: 0, drag: 2, add: true }); // 아래로 떨어지는 청록 불씨 하나
    return;
  }
  const n = first ? 5 : (lvRand() < 0.5 ? 1 : 0); // 반짝이 입자: 출발할 땐 사방으로 조금, 달리는 동안엔 가끔
  for (let i = 0; i < n; i++) { const a = first ? i / n * TAU + lvRand() * 0.4 : Math.atan2(-dy, -dx) + (lvRand() - 0.5) * 1.4, sp = first ? 60 + lvRand() * 30 : 24 + lvRand() * 20;
    this.part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, { color: i % 2 ? s.main : s.soft, life: 0.2 + lvRand() * 0.1, size: first ? 1.9 : 1.5, size2: 0, drag: 6, add: true }); }
  if (s.key === 'admiral' && lvRand() < 0.5) this.part(x - dx * 6, y - dy * 6 - 2, -dx * 8, -dy * 8 - 4, { color: s.smoke, life: 0.45, size: 2, size2: 4.6, drag: 4, shape: 'circle' }); // 흩어지는 구름 조각
};
Effects.prototype.legendSkill = function (sk, x, y, angle = 0, targets = null) {
  const s = LEGEND_VFX[sk]; if (!s || s.dashOnly) return;
  if (s.key === 'admiral') { // 천공함대 포격 지원: 신호탄 → 폭발 지점마다 조준 표식 → 머리 위로 지나가는 함대가 그 순간 포탄을 내리꽂음
    const T = targets && targets.length ? targets : [[x + Math.cos(angle) * 60, y + Math.sin(angle) * 60, 0.45]];
    const last = Math.max(...T.map((q) => q[2]));
    this.push({ kind: 'legend', fx: 'skill', key: s.key, x, y, angle, targets: T, color: s.main, accent: s.soft, sea: s.sea, smoke: s.smoke, t: 0, life: last + 0.75, opacity: 1 });
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + angle; this.part(x + Math.cos(a) * 10, y + 6 + Math.sin(a) * 4, Math.cos(a) * 26, Math.sin(a) * 10 - 6, { color: i % 2 ? s.main : s.smoke, life: 0.35, size: 1.6, size2: 0, drag: 5, add: i % 2 === 1 }); }
    return;
  }
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
      const r = 4 + p * 14; ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = fx.key === 'abyss' ? fx.color : fx.accent; ctx.lineWidth = 1 + 1.5 * k; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, 0, TAU); ctx.stroke();
      if (fx.key !== 'abyss') { ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; } for (let i = 0; i < (fx.key === 'abyss' ? 0 : 4); i++) { const a = i * TAU / 4 + sd + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.35); ctx.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5) * 0.7); ctx.stroke(); }
    }
    ctx.rotate(fx.angle);
    const Lc = 16 + p * 8, w = 1 + 4 * k; // 혜성 꼬리: 넓은 빛 → 밝은 속 → 흰 심
    const comet = (ww, col, al) => { ctx.globalAlpha = al; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-Lc * 0.25, -ww); ctx.lineTo(-Lc, 0); ctx.lineTo(-Lc * 0.25, ww); ctx.closePath(); ctx.fill(); };
    const cc = fx.key === 'admiral' ? fx.sea : fx.color;
    if (fx.key === 'abyss') { ctx.globalCompositeOperation = 'source-over'; comet(w + 1, '#06101a', 0.7 * k); comet(w * 0.55, '#16324a', 0.8 * k); } // 심연: 빛 대신 검푸른 그림자 꼬리
    else { comet(w, cc, 0.32 * k); comet(w * 0.5, fx.accent, 0.6 * k); ctx.globalAlpha = 0.6 * k; ctx.fillStyle = '#ffffff'; ctx.fillRect(-Math.round(Lc * 0.5), 0, Math.round(Lc * 0.5), 1); }
    ctx.globalAlpha = Math.min(0.85, k * 1.4);
    if (fx.key === 'abyss') { // 심연: 발자국마다 땅이 꺼지듯 열리는 검은 구멍 + 그 가장자리의 청록 테두리, 아래로 늘어지는 그림자 촉수
      ctx.save(); ctx.translate(-6, 2); ctx.rotate(-fx.angle); // 바닥 기준(화면 기준)으로
      const r = 3 + 5 * Math.min(1, p * 2.5) * (1 - p * 0.4);
      ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#04080e'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.45, 0, 0, TAU); ctx.fill(); // 검은 구멍
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = fx.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.45, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); // 앞 테두리만 희미하게
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = '#0c1c2a'; ctx.lineWidth = 2; // 구멍에서 위로 솟았다 가라앉는 촉수 둘
      for (const sx of [-1, 1]) { const h = 7 * Math.sin(Math.min(1, p * 1.6) * Math.PI); ctx.beginPath(); ctx.moveTo(sx * r * 0.4, 0); ctx.quadraticCurveTo(sx * (r * 0.6 + 3), -h * 0.6, sx * (r * 0.3 + Math.sin(p * 8 + sd * 6) * 2), -h); ctx.stroke(); }
      ctx.restore();
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
    } else if (fx.key === 'admiral') { // 천공함대 제독: 엔진 비행운 두 줄 + 금빛 날개 닻 문장 + 구름 고리
      const L2 = 12 + p * 18, open = 2 + p * 3;
      for (const [col, lw, al] of [[fx.sea, 3, 0.55], ['#ffffff', 1, 0.9]]) { ctx.globalAlpha = al * k; ctx.strokeStyle = col; ctx.lineWidth = lw; for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(1, s2 * 2.5); ctx.lineTo(-L2, s2 * (2.5 + open)); ctx.stroke(); } }
      ctx.save(); ctx.translate(-L2 * 0.5, 0); ctx.rotate(-fx.angle); ctx.globalAlpha = Math.min(0.9, k * 1.5); ctx.fillStyle = fx.color; // 날개 달린 닻 (천공함대 문장)
      ctx.fillRect(-0.5, -4, 1.5, 7); ctx.fillRect(-2, -3, 4.5, 1); ctx.fillRect(-1, -5, 2.5, 1); ctx.fillRect(-3, 2, 1, 1); ctx.fillRect(2.5, 2, 1, 1); ctx.fillRect(-2, 3, 4.5, 1);
      ctx.fillStyle = fx.accent; for (const sx of [-1, 1]) { ctx.fillRect(sx < 0 ? -6 : 3, -4, 3, 1); ctx.fillRect(sx < 0 ? -5 : 3, -3, 2, 1); } ctx.restore();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.45 * k; ctx.fillStyle = fx.smoke; // 출발점의 작은 구름
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-L2 - 2 + i * 3, (i - 1) * 2, 1.5 + p * 3 - i * 0.4, 0, TAU); ctx.fill(); }
    }
  } else if (fx.fx === 'skill' && fx.key === 'admiral') { drawAdmiralSkill(ctx, fx);
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

// 천공함대 포격 지원 (제독 스킬)
//  ① 신호탄: 시전자에게서 금빛 신호가 하늘로 솟음 + 발밑 지휘 문장
//  ② 조준 표식: 실제 폭발 지점마다 금빛 표식이 좁혀지며 깜박임 (폭발 순간에 맞춤)
//  ③ 함대: 기함 + 호위함 둘이 조준 방향으로 폭발 지점 위를 지나감 (땅에 그림자, 비행운)
//  ④ 포격: 폭발 직전 가장 가까운 배에서 포탄이 내리꽂히고, 터지는 순간 빛기둥 + 충격 고리
function drawAdmiralSkill(ctx, fx) {
  const t = fx.t, T = fx.targets, life = fx.life, ux = Math.cos(fx.angle), uy = Math.sin(fx.angle), dir = ux >= 0 ? 1 : -1;
  const fin = Math.min(1, t / 0.12) * Math.min(1, (life - t) / 0.3);
  const cx = T.reduce((a, q) => a + q[0], 0) / T.length, cy = T.reduce((a, q) => a + q[1], 0) / T.length, tm = T.reduce((a, q) => a + q[2], 0) / T.length;
  const ALT = 40, V = 150, ships = [['fleet_flag', 0, 0], ['fleet_escort', -22, -16], ['fleet_escort', -22, 16]]; // [그림, 뒤로, 옆으로]
  const span = Math.max(0, ...T.map((q) => Math.abs((q[0] - cx) * ux + (q[1] - cy) * uy))); // 융단 폭격처럼 길게 늘어선 경우 함대가 그 길이를 따라감
  const shipAt = (i, tt) => { const [, back, side] = ships[i], sp = (span > 40 ? span * 2.2 / Math.max(0.3, (T[T.length - 1][2] - T[0][2]) || 0.6) : V), s0 = sp * (tt - tm) + back; const gx = cx + ux * s0 - uy * side, gy = cy + uy * s0 + ux * side; return { gx, gy, ax: gx, ay: gy - ALT + Math.sin(tt * 4 + i) * 1.2 }; };
  ctx.save();
  // ① 지휘 문장 + 신호탄
  if (t < 0.9) { const f = Math.min(1, t / 0.15) * Math.min(1, (0.9 - t) / 0.3), R = 9 + 5 * Math.min(1, t * 5);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75 * f; ctx.strokeStyle = fx.color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(fx.x, fx.y + 6, R, R * 0.4, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = fx.accent; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 2; ctx.fillRect(Math.round(fx.x + Math.cos(a) * (R + 2)), Math.round(fx.y + 6 + Math.sin(a) * (R + 2) * 0.4), 2, 1); } }
  if (t < 0.55) { const g = Math.min(1, t / 0.22), h = 8 + g * 70, a = 1 - Math.max(0, (t - 0.22) / 0.33), X = Math.round(fx.x), Y0 = Math.round(fx.y - 8);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * a; ctx.fillStyle = fx.color; ctx.fillRect(X - 1, Y0 - h, 3, h);
    ctx.globalAlpha = 0.9 * a; ctx.fillStyle = fx.accent; ctx.fillRect(X, Y0 - h, 1, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 1, Y0 - h - 1, 3, 3); // 솟는 신호 + 밝은 머리
    if (g >= 1) { const r = (t - 0.22) * 40; ctx.globalAlpha = 0.6 * a; ctx.strokeStyle = fx.accent; ctx.beginPath(); ctx.arc(X, Y0 - h, r, 0, TAU); ctx.stroke(); } } // 하늘에서 터지는 신호
  // ② 조준 표식 (폭발 지점, 폭발할 때까지)
  for (const [tx, ty, d] of T) { if (t > d + 0.05) continue; const q = Math.min(1, t / Math.max(0.05, d)), r = 11 - 5 * q, blink = q > 0.6 ? (Math.floor(t * 16) % 2 ? 1 : 0.45) : 1;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.35 + 0.5 * q) * blink * fin; ctx.strokeStyle = q > 0.75 ? '#ff9a4a' : fx.color; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + t * 3; ctx.beginPath(); ctx.ellipse(tx, ty, r, r * 0.5, 0, a, a + 0.9); ctx.stroke(); }
    ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(Math.round(tx - r - 3), Math.round(ty), 3, 1); ctx.fillRect(Math.round(tx + r + 1), Math.round(ty), 3, 1); ctx.fillRect(Math.round(tx), Math.round(ty - r * 0.5 - 3), 1, 2); ctx.fillRect(Math.round(tx), Math.round(ty + r * 0.5 + 1), 1, 2); }
  // ③ 함대: 그림자 → 비행운 → 배
  ships.forEach(([spr], i) => { const S = shipAt(i, t), big = i === 0;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.28 * fin; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(S.gx, S.gy + 4, big ? 15 : 10, big ? 4 : 3, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 * fin; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = big ? 2 : 1; const L = big ? 46 : 32, bx = S.ax - ux * (big ? 17 : 11), by = S.ay - uy * (big ? 17 : 11);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - ux * L, by - uy * L); ctx.stroke();
    const G = typeof getSprite === 'function' ? getSprite(spr) : null; if (G) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fin; ctx.drawImage(dir > 0 ? G.n : G.f, Math.round(S.ax - G.w / 2), Math.round(S.ay - G.h / 2)); } });
  // ④ 포탄 · 착탄
  T.forEach(([tx, ty, d], j) => { const i = j === 0 ? 0 : j % 3, tl = d - 0.24;
    if (t >= tl && t < d) { const S = shipAt(i, tl), f = (t - tl) / 0.24, e = f * f, sx = S.ax + dir * 4, sy = S.ay + (i === 0 ? 10 : 6); const hx = sx + (tx - sx) * e, hy = sy + (ty - sy) * e, e0 = Math.max(0, e - 0.3), tx0 = sx + (tx - sx) * e0, ty0 = sy + (ty - sy) * e0;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ff9a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = fx.accent; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(hx, hy); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 2, 2);
      if (f < 0.25) { ctx.globalAlpha = 0.8 * (1 - f * 4); ctx.fillStyle = fx.accent; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, TAU); ctx.fill(); } } // 포구 섬광
    if (t >= d && t < d + 0.32) { const g = (t - d) / 0.32, k2 = 1 - g;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 * k2; ctx.fillStyle = fx.color; const w = Math.max(1, Math.round(5 * k2)); ctx.fillRect(Math.round(tx - w / 2), Math.round(ty - 44 * k2), w, Math.round(44 * k2)); // 빛기둥
      ctx.globalAlpha = 0.8 * k2; ctx.strokeStyle = fx.accent; ctx.lineWidth = 1 + 2 * k2; ctx.beginPath(); ctx.ellipse(tx, ty, 6 + g * 20, (6 + g * 20) * 0.5, 0, 0, TAU); ctx.stroke(); } // 충격 고리
  });
  ctx.restore();
}

// ── 연결
(function () {
  if (typeof Game === 'undefined') return;
  const G = Game.prototype;
  // 스킬: 실제로 시전됐을 때만 (쿨타임·충전 칸이 줄었을 때) — 멀티에서는 방장이 판정하고 'legendSkill' 연출을 동료 화면에도 보냄
  const _useSkill = G.useSkill;
  G.useSkill = function (...a) {
    const p = this.player, cd = p && p.skillCooldown, ch = p && p.dsCharges, z0 = this.zones ? this.zones.length : 0, r = _useSkill.apply(this, a);
    if (p && (p.skillCooldown !== cd || p.dsCharges !== ch)) { const sk = legendOf(p, this);
      if (sk && this.effects) { const strikes = (this.zones || []).slice(z0).filter((z) => typeof Strike !== 'undefined' && z instanceof Strike).slice(0, 16).map((z) => [Math.round(z.x), Math.round(z.y), Math.round(z.delay * 100) / 100]); // 이번 스킬이 만든 폭발 지점·터지는 시간
        this.effects.legendSkill(sk, p.x, p.y, Math.atan2(p.aim.y, p.aim.x), strikes.length ? strikes : null); } }
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
