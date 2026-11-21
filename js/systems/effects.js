'use strict';
// ════════════════════════════════════════════
// 이펙트: 파티클(중력·감속·크기 변화·색 변화·가산 혼합) + 특수 효과
//  add: true 인 효과는 'lighter' 혼합으로 빛나 보임
// ════════════════════════════════════════════
const MAX_FX = 2600;
class Effects {
  constructor() { this.list = []; this.floorList = []; }
  clear() { this.list.length = 0; this.floorList.length = 0; }
  pushFloor(fx) { if (this.floorList.length < 700) this.floorList.push(fx); }
  push(fx) { // 가벼운 모드: 작은 파티클은 절반만, 전체 개수도 줄임
    if (PERF.low) { if (fx.kind === 'p' && (this.skip = !this.skip)) return; if (this.list.length >= 700) return; }
    if (this.list.length < MAX_FX) this.list.push(fx);
  }
  // 범용 파티클
  part(x, y, vx, vy, o) {
    this.push(Object.assign({ kind: 'p', x, y, vx, vy, t: 0, life: 0.4, size: 2, size2: 0, color: '#fff', drag: 3, grav: 0, add: false }, o));
  }

  // ── 기본 효과 (기존 API)
  text(x, y, str, color, big = false) { this.push({ kind: 'text', x: x + (big ? 0 : randInt(-3, 3)), y, str, color, big, t: 0, life: big ? 0.8 : 0.6 }); }
  spark(x, y, color) { this.push({ kind: 'spark', x, y, color, t: 0, life: 0.08 }); }
  ring(x, y, r, color) { this.push({ kind: 'ring', x, y, r, r0: r * 0.4, color, t: 0, life: 0.22 }); }
  slash(x, y, ang, r, arc, color) {
    this.push({ kind: 'slash', x, y, ang, r, arc, color, t: 0, life: 0.16 });
    for (let i = 0; i < 5; i++) { const a = ang + (Math.random() - 0.5) * arc, d = r * (0.7 + Math.random() * 0.3);
      this.part(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * 40, Math.sin(a) * 40, { color: '#ffffff', life: 0.18, size: 2, add: true }); }
  }
  lightning(x0, y0, x1, y1) {
    this.push({ kind: 'bolt', x: x0, y: y0, x1, y1, t: 0, life: 0.16 });
    this.part(x1, y1, 0, 0, { color: '#dff4ff', life: 0.12, size: 6, size2: 0, add: true, shape: 'circle' });
  }
  burst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + Math.random() * 0.5, s = 40 + Math.random() * 70;
      this.part(x, y, Math.cos(a) * s, Math.sin(a) * s, { color, life: 0.3 + Math.random() * 0.25, size: 2 + Math.random() * 1.5, drag: 4 });
    }
  }

  // ── 무기
  muzzle(x, y, ang, color) { // 총구 화염: 빛나는 원뿔 + 튀는 불티
    this.push({ kind: 'flash', x, y, ang, color, t: 0, life: 0.06 });
    this.part(x, y, 0, 0, { color: '#fff6c0', life: 0.07, size: 5, size2: 1, add: true, shape: 'circle' });
    for (let i = 0; i < 3; i++) { const a = ang + (Math.random() - 0.5) * 0.9, s = 60 + Math.random() * 80;
      this.part(x, y, Math.cos(a) * s, Math.sin(a) * s, { color: color || '#ffd27a', life: 0.12, size: 1.5, size2: 0, add: true, drag: 8 }); }
  }
  impact(x, y, color, ang) { // 착탄: 불꽃이 튀고 작은 고리
    this.part(x, y, 0, 0, { color: '#ffffff', life: 0.06, size: 4, size2: 0, add: true, shape: 'circle' });
    for (let i = 0; i < 5; i++) {
      const a = (ang !== undefined ? ang + Math.PI : Math.random() * TAU) + (Math.random() - 0.5) * 2.2, s = 50 + Math.random() * 90;
      this.part(x, y, Math.cos(a) * s, Math.sin(a) * s, { color, life: 0.15 + Math.random() * 0.12, size: 1.5, size2: 0, drag: 7, grav: 120, add: true });
    }
  }
  explosion(x, y, r, color) { // 섬광 → 충격파 → 화염 → 연기 → 파편
    this.push({ kind: 'boom', x, y, r, color, t: 0, life: 0.22 });
    this.push({ kind: 'shock', x, y, r: r * 1.35, color: '#ffffff', t: 0, life: 0.28 });
    const n = Math.min(26, 8 + r / 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = (0.4 + Math.random()) * r * 2.4;
      this.part(x, y, Math.cos(a) * s, Math.sin(a) * s, { color: pick(['#ffe36b', '#ff9a3a', color]), color2: '#a02a10', life: 0.25 + Math.random() * 0.25, size: 3 + Math.random() * 3, size2: 0.5, drag: 5, grav: -30, add: true, shape: 'circle' });
    }
    for (let i = 0; i < n * 0.6; i++) {
      const a = Math.random() * TAU, s = Math.random() * r * 1.2;
      this.part(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, Math.cos(a) * s, Math.sin(a) * s - 15, { color: 'rgba(60,50,55,0.55)', life: 0.6 + Math.random() * 0.5, size: 3, size2: 8, drag: 3, grav: -20, shape: 'circle' });
    }
    for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, s = 80 + Math.random() * 120;
      this.part(x, y, Math.cos(a) * s, Math.sin(a) * s - 60, { color: '#3a2a2a', life: 0.5, size: 2, drag: 1.5, grav: 380 }); }
  }

  corpseBlast(x, y, r) { // 시체 폭발 (망자의 파수기 = 데스 센트리): 촉매 섬광 → 핏빛 충격파 → 살점·뼛조각이 튀고 → 피 안개 → 바닥 핏자국
    this.push({ kind: 'boom', x, y, r: r * 0.55, color: '#c0203a', t: 0, life: 0.2 });
    this.push({ kind: 'shock', x, y, r: r * 1.15, color: '#ff5a7a', t: 0, life: 0.3 });
    this.push({ kind: 'shock', x, y, r: r * 0.7, color: '#b06aff', t: 0, life: 0.24 });
    this.rays(x, y - 4, '#ff6a8a', 10, r * 0.95, 0.32);
    this.part(x, y + 2, 0, 0, { color: 'rgba(90,8,24,0.42)', life: 2.6, size: r * 0.32, size2: r * 0.42, drag: 9, shape: 'circle' }); /* 바닥 핏자국 (잠시 남음) */
    for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 110; /* 살점: 위로 튀었다가 떨어짐 */
      this.part(x + randInt(-3, 3), y - 4, Math.cos(a) * s, Math.sin(a) * s * 0.6 - 90 - Math.random() * 60, { color: pick(['#8a1020', '#b0182e', '#5a0a18']), life: 0.55 + Math.random() * 0.35, size: 2 + Math.random() * 2, size2: 1, drag: 1.2, grav: 420 }); }
    for (let i = 0; i < 7; i++) { const a = Math.random() * TAU, s = 80 + Math.random() * 120; /* 뼛조각 */
      this.part(x, y - 6, Math.cos(a) * s, Math.sin(a) * s * 0.6 - 110, { color: pick(['#ece4d2', '#cfc4ae']), life: 0.6 + Math.random() * 0.3, size: 1.5, size2: 1, drag: 1, grav: 460 }); }
    for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, s = 30 + Math.random() * 60; /* 피 안개 */
      this.part(x + Math.cos(a) * 6, y - 4 + Math.sin(a) * 4, Math.cos(a) * s, Math.sin(a) * s * 0.6 - 12, { color: 'rgba(150,20,45,0.5)', life: 0.7 + Math.random() * 0.4, size: 3, size2: 9, drag: 3, grav: -8, shape: 'circle' }); }
    for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, s = 50 + Math.random() * 70; /* 보랏빛 촉매 불티 */
      this.part(x, y - 4, Math.cos(a) * s, Math.sin(a) * s * 0.7, { color: pick(['#d08aff', '#ff7ad0']), life: 0.3 + Math.random() * 0.2, size: 1.5, size2: 0, drag: 5, add: true }); }
  }

  // ── 캐릭터·적
  death(x, y, color, size = 12) { // 적 사망: 픽셀로 부서지며 영혼이 떠오름
    const n = Math.round(size * 1.2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 30 + Math.random() * 90;
      this.part(x + randInt(-size / 2, size / 2), y + randInt(-size / 2, size / 2), Math.cos(a) * s, Math.sin(a) * s - 50,
        { color: Math.random() < 0.7 ? color : shadeSafe(color, 0.6), life: 0.45 + Math.random() * 0.35, size: 2, size2: 1, drag: 2.5, grav: 260 });
    }
    for (let i = 0; i < 3; i++) this.part(x + randInt(-4, 4), y, randInt(-8, 8), -30 - Math.random() * 30, { color: '#dfe8ff', life: 0.7, size: 2.5, size2: 0, drag: 1, add: true, shape: 'circle' });
    this.part(x, y, 0, 0, { color: '#ffffff', life: 0.1, size: size * 0.9, size2: 0, add: true, shape: 'circle' });
  }
  // ── 보구 연출
  excalibur(x, y, x1, y1, w, px, py) { // 금빛 검기: 휘두르는 빛의 검 → 한 줄기 굵은 빛 → 가늘어지며 남는 잔광 (단순하지만 묵직하게)
    const L = Math.hypot(x1 - x, y1 - y) || 1, dx = (x1 - x) / L, dy = (y1 - y) / L;
    this.push({ kind: 'excal', x, y, x1, y1, w, t: 0, life: 1.15, add: true });
    // (검을 휘두르는 모습은 ExcaliburRaise가 그림)
    this.push({ kind: 'shock', x, y, r: 34, color: '#ffffff', t: 0, life: 0.3, add: true });                 // 손끝 충격파
    for (let d = 0; d < L; d += 22) { // 빛줄기를 따라 드문드문 떠오르는 금빛 알갱이 (잔광)
      const s = (Math.random() - 0.5) * w * 1.6;
      this.push({ kind: 'p', x: x + dx * d - dy * s, y: y + dy * d + dx * s, vx: 0, vy: -18 - Math.random() * 14, t: -0.25 - d / L * 0.15, life: 0.6, size: 2, size2: 0, color: '#fff4c0', color2: '#c8a050', drag: 1, grav: 0, add: true });
    }
  }
  solomonSeal(x, y, sc = 1) { // 솔로몬의 인장: 육각별 마법진이 펼쳐지고 빛기둥이 솟음
    this.push({ kind: 'seal', x, y, sc, t: 0, life: 1.1, add: true });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; this.push({ kind: 'pillar', x: x + Math.cos(a) * 30 * sc, y: y + 6 + Math.sin(a) * 18 * sc, t: -i * 0.04, life: 0.6, add: true }); }
    for (let i = 0; i < 24; i++) { const a = Math.random() * TAU, s = 30 + Math.random() * 60;
      this.part(x, y, Math.cos(a) * s, Math.sin(a) * s * 0.6 - 30, { color: i % 2 ? '#e0c0ff' : '#ffd84a', life: 0.7, size: 2, size2: 0, drag: 2.5, add: true, shape: 'plus' }); }
  }
  goldBurst(x, y, n = 16) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 40 + Math.random() * 70;
    this.part(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, { color: '#ffd84a', color2: '#c8a050', life: 0.5 + Math.random() * 0.3, size: 2, size2: 0, drag: 3, grav: 60, add: true }); } }
  beamline(x, y, x1, y1, w, color) { this.push({ kind: 'beamline', x, y, x1, y1, w, color, t: 0, life: 0.3, add: true }); }
  afterimage(img, x, y, w, h) { this.push({ kind: 'ghost', img, x, y, w, h, t: 0, life: 0.22 }); } // 대시 잔상
  dust(x, y) { for (let i = 0; i < 2; i++) this.part(x + randInt(-3, 3), y, randInt(-12, 12), -randInt(4, 14), { color: 'rgba(200,190,170,0.5)', life: 0.35, size: 1.5, size2: 3, drag: 4, shape: 'circle' }); }
  sparkle(x, y, color) { // 획득 반짝임
    this.ring(x, y, 8, color);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; this.part(x, y, Math.cos(a) * 50, Math.sin(a) * 50, { color, life: 0.25, size: 2, size2: 0, drag: 6, add: true }); }
  }
  heal(x, y) { for (let i = 0; i < 6; i++) this.part(x + randInt(-7, 7), y + randInt(-4, 6), 0, -30 - Math.random() * 20, { color: '#7be36b', life: 0.6, size: 2, size2: 1, drag: 1, add: true, shape: 'plus' }); }
  status(x, y, type) { // 상태이상: 불꽃·얼음 결정·독 거품
    if (type === 'burn') this.part(x + randInt(-5, 5), y + randInt(-4, 4), randInt(-6, 6), -40 - Math.random() * 20, { color: '#ffb040', color2: '#c02a10', life: 0.4, size: 2.5, size2: 0, drag: 2, add: true });
    else if (type === 'freeze') this.part(x + randInt(-7, 7), y + randInt(-7, 5), randInt(-4, 4), 10, { color: '#e8faff', life: 0.5, size: 1.5, size2: 0, drag: 1, add: true, shape: 'plus' });
    else if (type === 'poison') this.part(x + randInt(-5, 5), y + randInt(-2, 4), randInt(-3, 3), -20, { color: '#9aff5a', life: 0.55, size: 1.5, size2: 3, drag: 1, shape: 'ring' });
  }

  rays(x, y, color, n = 12, len = 60, life = 0.6) { this.push({ kind: 'rays', x, y, color, n, len, rot: Math.random() * TAU, t: 0, life, add: true }); } // 방사형 빛살
  skyBeam(x, y, color, delay = 0, w = 5) { this.push({ kind: 'beamline', x, y: y - 130, x1: x, y1: y, w, color, t: -delay, life: 0.35, add: true }); } // 하늘에서 내리꽂는 빛줄기 (delay초 뒤)
  // 원소 반응: 반응마다 다른 문양(가산 혼합) + 작은 이름표
  reaction(x, y, kind, label, color) {
    const seed = Math.random() * 1000;
    this.push({ kind: 'react', type: kind, x, y, color, seed, t: 0, life: kind === 'plague' ? 0.7 : 0.6, add: true });
    this.push({ kind: 'rlabel', x, y: y - 16, str: label, color, t: 0, life: 1.0 });
    this.ring(x, y, 24, color); this.burst(x, y, color, 8);
  }
  update(dt) {
    for (const fx of this.list) {
      fx.t += dt;
      if (fx.kind === 'text') fx.y -= 20 * dt;
      else if (fx.kind === 'rlabel') fx.y -= 10 * dt;
      else if (fx.kind === 'p') {
        const d = Math.exp(-fx.drag * dt); fx.vx *= d; fx.vy = fx.vy * d + fx.grav * dt;
        fx.x += fx.vx * dt; fx.y += fx.vy * dt;
      }
    }
    let n = 0; const L = this.list; for (let i = 0; i < L.length; i++) if (L[i].t < L[i].life) L[n++] = L[i]; L.length = n; // 새 배열을 만들지 않고 정리
    let g = 0; const F = this.floorList; for (let i = 0; i < F.length; i++) { const fx=F[i]; fx.t += dt; if (fx.t < fx.life) F[g++] = fx; } F.length = g;
  }
  renderFloor(ctx) { for (const fx of this.floorList) this.draw(ctx,fx); ctx.globalAlpha=1; }
  render(ctx) {
    // 1) 일반 혼합
    for (const fx of this.list) if (!fx.add && fx.kind !== 'boom' && fx.kind !== 'flash' && fx.kind !== 'rlabel') this.draw(ctx, fx);
    // 2) 빛나는 효과는 가산 혼합
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const fx of this.list) if (fx.add || fx.kind === 'boom' || fx.kind === 'flash') this.draw(ctx, fx);
    ctx.restore();
    for (const fx of this.list) if (fx.kind === 'rlabel') this.draw(ctx, fx); // 반응 이름표는 맨 위
    ctx.globalAlpha = 1;
  }
  drawReaction(ctx, fx, k, x, y) { // 반응별 문양 (k: 1 → 0)
    const g = 1 - k, R = (a) => { const v = Math.sin(fx.seed + a * 12.9898) * 43758.5453; return v - Math.floor(v); };
    ctx.lineWidth = 1;
    const jag = (x0, y0, x1, y1, n, amp) => { ctx.beginPath(); ctx.moveTo(x0, y0); for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(x0 + (x1 - x0) * t + (Math.random() - 0.5) * amp, y0 + (y1 - y0) * t + (Math.random() - 0.5) * amp); } ctx.lineTo(x1, y1); ctx.stroke(); };
    switch (fx.type) {
      case 'thermal': { // 얼음 파편이 터져 나가고 주황 고리
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + R(i), d = 4 + g * 22;
          ctx.fillStyle = i % 2 ? '#bfefff' : '#ffffff'; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (d + 5), y + Math.sin(a) * (d + 5)); ctx.lineTo(x + Math.cos(a + 0.25) * d, y + Math.sin(a + 0.25) * d); ctx.lineTo(x + Math.cos(a - 0.25) * d, y + Math.sin(a - 0.25) * d); ctx.fill(); }
        ctx.strokeStyle = '#ff9a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6 + g * 18, 0, TAU); ctx.stroke(); break; }
      case 'toxic': { // 초록 불길이 솟음
        for (let i = 0; i < 7; i++) { const ox = (i - 3) * 5, hgt = (10 + R(i) * 14) * Math.min(1, g * 4) * (0.6 + k * 0.4);
          ctx.fillStyle = i % 2 ? '#9aff5a' : '#d8ff7a'; ctx.beginPath(); ctx.moveTo(x + ox - 3, y + 4); ctx.lineTo(x + ox + Math.sin(fx.t * 20 + i) * 2, y + 4 - hgt); ctx.lineTo(x + ox + 3, y + 4); ctx.fill(); }
        ctx.strokeStyle = '#7ad04a'; ctx.beginPath(); ctx.ellipse(x, y + 4, 10 + g * 16, 4 + g * 6, 0, 0, TAU); ctx.stroke(); break; }
      case 'electro': { // 번개 고리가 지직거림
        ctx.strokeStyle = Math.floor(fx.t * 30) % 2 ? '#ffffff' : '#9ae8ff';
        const r = 12 + g * 8; for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU, a1 = a0 + TAU / 6; jag(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, 3, 6); }
        for (let i = 0; i < 4; i++) { const a = R(i) * TAU; jag(x, y, x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4, 4, 5); } break; }
      case 'overload': { // 이중 충격파 + 방사형 빛줄기
        ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 8 + g * 40, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 4 + g * 26, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#fff4c0'; ctx.lineWidth = 1; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, d0 = 6 + g * 20, d1 = d0 + 10; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); ctx.stroke(); } break; }
      case 'paralyze': { // 노란 전기 우리
        ctx.strokeStyle = Math.floor(fx.t * 24) % 2 ? '#e8ff7a' : '#ffffff';
        for (let i = 0; i < 5; i++) { const ox = x - 12 + i * 6; jag(ox, y - 14, ox, y + 8, 4, 3); }
        ctx.beginPath(); ctx.moveTo(x - 13, y - 14); ctx.lineTo(x + 13, y - 14); ctx.moveTo(x - 13, y + 8); ctx.lineTo(x + 13, y + 8); ctx.stroke(); break; }
      case 'eclipse': { // 검은 원판 + 흰 코로나 + 보랏빛 빛살
        ctx.restore(); ctx.save(); ctx.globalAlpha = Math.max(0, k); // 검은 원판은 일반 혼합으로
        ctx.fillStyle = '#0a0612'; ctx.beginPath(); ctx.arc(x, y, 9 + g * 3, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#fff8d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 11 + g * 4, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#b070ff'; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + fx.t, d0 = 14 + g * 4, d1 = d0 + 6 + R(i) * 8; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); ctx.stroke(); } break; }
      case 'plague': { // 점선 원이 퍼져 나감 + 포자
        ctx.strokeStyle = '#9ad05a'; ctx.setLineDash([3, 3]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 10 + g * 60, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#c8ff7a'; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + R(i), d = g * (30 + R(i + 9) * 30); ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d * 0.7), 2, 2); } break; }
      case 'hellfire': { // 보랏빛 불기둥
        const hgt = 34 * Math.min(1, g * 5);
        for (let i = 0; i < 5; i++) { const ox = (i - 2) * 5, hh = hgt * (0.6 + R(i) * 0.4);
          ctx.fillStyle = i % 2 ? '#c060ff' : '#7030c0'; ctx.beginPath(); ctx.moveTo(x + ox - 4, y + 4); ctx.lineTo(x + ox + Math.sin(fx.t * 18 + i) * 3, y + 4 - hh); ctx.lineTo(x + ox + 4, y + 4); ctx.fill(); }
        ctx.strokeStyle = '#e0a0ff'; ctx.beginPath(); ctx.ellipse(x, y + 4, 12 + g * 14, 4 + g * 5, 0, 0, TAU); ctx.stroke(); break; }
      case 'judgment': { // 하늘에서 내려오는 빛기둥 + 십자
        const w = 10 * k + 2; ctx.fillStyle = '#fff4c0'; ctx.fillRect(Math.round(x - w / 2), y - 120, Math.round(w), 124);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - w / 4), y - 120, Math.max(1, Math.round(w / 2)), 124);
        ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - 10, y - 1, 21, 3); ctx.fillRect(x - 1, y - 10, 3, 21); break; }
    }
    ctx.lineWidth = 1;
  }
  draw(ctx, fx) {
    if (fx.t < 0) return; // 늦게 시작하는 효과
    const k = 1 - fx.t / fx.life, x = Math.round(fx.x), y = Math.round(fx.y);
    ctx.globalAlpha = Math.max(0, k);
    switch (fx.kind) {
      case 'p': {
        const s = Math.max(0.5, fx.size + (fx.size2 - fx.size) * (1 - k));
        ctx.fillStyle = fx.color2 && k < 0.5 ? fx.color2 : fx.color; ctx.strokeStyle = ctx.fillStyle;
        if (fx.shape === 'circle') { ctx.beginPath(); ctx.arc(fx.x, fx.y, s, 0, TAU); ctx.fill(); }
        else if (fx.shape === 'plus') { const r = Math.round(s); ctx.fillRect(x - r, y, r * 2 + 1, 1); ctx.fillRect(x, y - r, 1, r * 2 + 1); }
        else if (fx.shape === 'ring') { ctx.beginPath(); ctx.arc(fx.x, fx.y, s, 0, TAU); ctx.stroke(); }
        else { const r = Math.max(1, Math.round(s)); ctx.fillRect(x - (r >> 1), y - (r >> 1), r, r); }
        break;
      }
      case 'skinStep': {
        const k=1-fx.t/fx.life,a=fx.angle||0;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha*=0.78*k;
        ctx.fillStyle=fx.color;ctx.fillRect(-1,-3,2,4);ctx.fillRect(-2,-2,1,2);ctx.fillRect(1,-2,1,2);
        ctx.fillStyle=fx.accent;ctx.fillRect(-1,-4,2,1);ctx.fillRect(-1,2,2,1);ctx.restore();break;
      }
      case 'skinDash': {
        const p=Math.min(1,fx.t/fx.life),R=9+p*15,a=fx.angle,fade=1-p*0.42;
        ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha*=fx.opacity*fade;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=fx.color;ctx.fillStyle=fx.accent;ctx.lineWidth=2;
        if(fx.id==='skin_abyss_knight'){
          ctx.beginPath();ctx.moveTo(-R-8,-5);ctx.lineTo(-R*0.5,-1);ctx.lineTo(-R+2,4);ctx.lineTo(-R*0.2,7);ctx.stroke();
          ctx.beginPath();ctx.moveTo(-R-5,4);ctx.lineTo(-R*0.45,1);ctx.lineTo(-R+5,-4);ctx.stroke();
        }else if(fx.id==='skin_star_paladin'){
          ctx.beginPath();ctx.moveTo(-R-10,0);ctx.lineTo(-R*0.4,0);ctx.lineTo(-3,-2);ctx.lineTo(0,-R*0.55);ctx.lineTo(3,-2);ctx.lineTo(R*0.35,0);ctx.stroke();
          ctx.fillRect(-2,-2,4,4);ctx.fillRect(-R-7,-1,3,2);
        }else if(fx.id==='skin_void_empress'){
          ctx.beginPath();ctx.moveTo(-R-7,4);ctx.bezierCurveTo(-R*0.5,-9,-R*0.1,9,3,-4);ctx.bezierCurveTo(8,-9,12,-5,14,-1);ctx.stroke();
          ctx.fillRect(-R*0.65,-5,2,2);ctx.fillRect(-R*0.18,5,2,2);
        }else if(fx.id==='skin_crimson_lotus'){
          for(let i=0;i<3;i++){ctx.save();ctx.translate(-R*0.7+i*7,(i-1)*3);ctx.rotate(-0.45+i*0.4);ctx.beginPath();ctx.ellipse(0,0,2.4,5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
          ctx.beginPath();ctx.moveTo(-R-5,0);ctx.quadraticCurveTo(-R*0.4,-5,4,0);ctx.stroke();
        }else if(fx.id==='skin_moon_shrine'){
          ctx.beginPath();ctx.moveTo(-R-7,2);ctx.quadraticCurveTo(-R*0.4,-9,4,-2);ctx.stroke();ctx.beginPath();ctx.arc(4,-1,5,-1.1,1.45);ctx.stroke();ctx.fillRect(-R*0.35,3,2,2);
        }else if(fx.id==='skin_arcane_idol'){
          ctx.beginPath();ctx.moveTo(-R-7,2);ctx.lineTo(-5,0);ctx.stroke();ctx.beginPath();ctx.moveTo(-2,-4);ctx.lineTo(0,0);ctx.lineTo(2,-4);ctx.moveTo(0,0);ctx.lineTo(0,5);ctx.stroke();ctx.fillRect(-R*0.5,-3,2,2);ctx.fillRect(5,2,2,2);
        }else if(fx.id==='skin_dragon_samurai'){
          ctx.beginPath();ctx.moveTo(-R-8,5);ctx.lineTo(-R*0.45,-4);ctx.lineTo(2,-1);ctx.stroke();ctx.beginPath();ctx.moveTo(-R*0.65,6);ctx.lineTo(-R*0.1,3);ctx.stroke();ctx.fillRect(-R*0.4,-5,3,2);
        }else if(fx.id==='skin_clockwork_fox'){
          ctx.beginPath();ctx.moveTo(-R-8,0);ctx.lineTo(-R*0.45,0);ctx.lineTo(-R*0.25,-4);ctx.lineTo(-R*0.05,0);ctx.lineTo(5,0);ctx.stroke();ctx.strokeRect(-R*0.6,-3,5,5);ctx.fillRect(2,-2,3,3);
        }
        ctx.restore();break;
      }
      case 'skinWeapon': {
        const p=fx.t/fx.life,k=1-p,a=fx.angle;ctx.save();ctx.translate(x,y);ctx.rotate(a);
        ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=fx.opacity*k;ctx.strokeStyle=fx.color;ctx.fillStyle=fx.accent;ctx.lineCap='round';ctx.lineJoin='round';
        if(fx.id==='skin_abyss_knight'){
          ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-3,-7);ctx.lineTo(2,-2);ctx.lineTo(10,-8);ctx.stroke();
          ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(7,0);ctx.lineTo(13,5);ctx.stroke();ctx.fillRect(7,-2,3,3);
        }else if(fx.id==='skin_star_paladin'){
          ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(0,-3);ctx.lineTo(8,0);ctx.lineTo(0,3);ctx.closePath();ctx.stroke();
          ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,10);ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillRect(-2,-2,4,4);
        }else if(fx.id==='skin_void_empress'){
          ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(0,0,7+p*4,-1.1,1.65);ctx.stroke();
          ctx.beginPath();ctx.moveTo(-8,-5);ctx.quadraticCurveTo(0,-12,8,-5);ctx.stroke();ctx.fillRect(5,3,3,3);
        }else if(fx.id==='skin_crimson_lotus'){
          for(let i=0;i<3;i++){ctx.save();ctx.rotate((i-1)*0.72);ctx.translate(5,0);ctx.beginPath();ctx.ellipse(0,0,3,7,0,0,Math.PI*2);ctx.fill();ctx.restore();}
          ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-8,0);ctx.quadraticCurveTo(0,-7,9,0);ctx.stroke();
        }
        ctx.restore();break;
      }
      case 'skinSkill': {
        const p=fx.t/fx.life,k=1-p,reach=14+p*23;ctx.save();ctx.translate(x,y-4);ctx.rotate(fx.angle);
        ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=fx.opacity*(0.9+0.1*k);
        ctx.strokeStyle=fx.color;ctx.fillStyle=fx.accent;ctx.lineCap='round';ctx.lineJoin='round';
        if(fx.id==='skin_abyss_knight'){
          // 봉인핵에서 터져 나오는 균열 세 갈래와 깨진 칼날 조각
          ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-2,3);ctx.lineTo(5,-2);ctx.lineTo(11,-13);ctx.moveTo(4,0);ctx.lineTo(14,4);ctx.lineTo(22,1);ctx.moveTo(1,5);ctx.lineTo(-8,12);ctx.stroke();
          ctx.lineWidth=1.5;for(let i=0;i<4;i++){const q=i*Math.PI/2+p*1.4;ctx.beginPath();ctx.moveTo(Math.cos(q)*8,Math.sin(q)*8);ctx.lineTo(Math.cos(q)*(reach+7),Math.sin(q)*(reach+7));ctx.stroke();}
          ctx.fillRect(10,-5,4,4);ctx.fillRect(-8,9,3,3);
        }else if(fx.id==='skin_star_paladin'){
          // 성좌의 집행: 대형 별 인장과 네 방향으로 쏟아지는 성광
          ctx.lineWidth=2.6;ctx.beginPath();
          for(let i=0;i<8;i++){const a=i*Math.PI/4+(p*0.2),r=i%2?9:reach;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.stroke();
          ctx.lineWidth=2;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*11,Math.sin(a)*11);ctx.lineTo(Math.cos(a)*(reach+8),Math.sin(a)*(reach+8));ctx.stroke();}
          ctx.fillRect(-3,-3,6,6);
        }else if(fx.id==='skin_void_empress'){
          // 공허의 문: 역방향 초승달 두 겹과 안쪽에서 뻗는 마력 파편
          ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,reach,-2.1,1.15);ctx.stroke();
          ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(0,0,reach*0.67,1.2,4.4);ctx.stroke();
          for(let i=0;i<5;i++){const a=i*TAU/5-p*0.7;ctx.beginPath();ctx.moveTo(Math.cos(a)*7,Math.sin(a)*7);ctx.lineTo(Math.cos(a)*(reach+8),Math.sin(a)*(reach+8));ctx.stroke();}
          ctx.fillRect(-2,-2,5,5);
        }else if(fx.id==='skin_crimson_lotus'){
          // 홍련 개화: 여섯 장의 꽃잎이 차례로 펼쳐지며 붉은 곡선이 가로지름
          ctx.lineWidth=2;for(let i=0;i<6;i++){const a=i*TAU/6+p*0.35;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,-reach*0.62,4,reach*0.34,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
          ctx.beginPath();ctx.moveTo(-reach,-4);ctx.quadraticCurveTo(0,reach*0.55,reach,-4);ctx.stroke();
          ctx.fillRect(-3,-3,6,6);
        }
        ctx.restore();break;
      }
      case 'rlabel': { // 반응 이름표: 작은 글씨로 살짝 튀어나왔다가 떠오름 (배경 없음, 1px 그림자로만 구분)
        const pop = 1 + 0.25 * Math.max(0, 1 - fx.t / 0.1), sz = Math.round(7 * pop);
        ctx.globalAlpha = Math.min(1, k * 2.5);
        ctx.font = `bold ${sz}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tx = Math.round(x), ty = Math.round(y);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(fx.str, tx + 1, ty + 1);
        ctx.fillStyle = fx.color; ctx.fillText(fx.str, tx, ty); ctx.textBaseline = 'alphabetic'; break;
      }
      case 'react': this.drawReaction(ctx, fx, k, x, y); break;
      case 'rays': { // 빛살: 길어지며 돌다가 사라짐
        const g = 1 - k, L = fx.len * (0.4 + 0.6 * Math.min(1, g * 3)); ctx.strokeStyle = fx.color;
        for (let i = 0; i < fx.n; i++) { const a = fx.rot + i / fx.n * TAU + g * 0.6, w = i % 2 ? 1 : 2; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6 * 0.8); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L * 0.8); ctx.stroke(); }
        ctx.lineWidth = 1; break; }
      case 'text': {
        const pop = 1 + (fx.big ? 0.8 : 0.3) * Math.max(0, 1 - fx.t / 0.12);
        ctx.font = `bold ${Math.round((fx.big ? 12 : 9) * pop)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#000'; ctx.fillText(fx.str, x + 1, y + 1);
        ctx.fillStyle = fx.color; ctx.fillText(fx.str, x, y); break;
      }
      case 'spark': ctx.fillStyle = fx.color; ctx.fillRect(x - 2, y - 2, 4, 4); break;
      case 'ring': {
        const r = fx.r0 + (fx.r - fx.r0) * Math.min(1, (1 - k) * 2.2);
        ctx.strokeStyle = fx.color; ctx.lineWidth = 1 + k; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; break;
      }
      case 'shock': {
        const r = fx.r * (0.3 + 0.7 * (1 - k));
        ctx.strokeStyle = fx.color; ctx.lineWidth = 3 * k + 0.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; break;
      }
      case 'boom': {
        const g = ctx.createRadialGradient(x, y, 0, x, y, fx.r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, fx.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, fx.r * (0.7 + 0.3 * (1 - k)), 0, TAU); ctx.fill(); break;
      }
      case 'flash': {
        ctx.save(); ctx.translate(x, y); ctx.rotate(fx.ang);
        ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(9, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = fx.color || '#ffb040'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(13, 0); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
        ctx.restore(); break;
      }
      case 'excal': { // 0~0.07초 가는 섬광이 뻗음 → 0.4초까지 굵은 빛 (흐르는 빛줄기·지직이는 금빛 가장자리·초승달 검기) → 가늘어지며 사라짐
        if (fx.t < 0) break;
        const t = fx.t, ang = Math.atan2(fx.y1 - fx.y, fx.x1 - fx.x), full = Math.hypot(fx.x1 - fx.x, fx.y1 - fx.y), L = full * Math.min(1, t / 0.07);
        const hold = t < 0.4, k = hold ? 1 : Math.max(0, 1 - (t - 0.4) / 0.75);
        const W = t < 0.07 ? 3 : hold ? fx.w * (1 + 0.08 * Math.sin(t * 60)) : fx.w * (0.15 + 0.85 * k * k);
        ctx.globalAlpha = 1; ctx.save(); ctx.translate(Math.round(fx.x), Math.round(fx.y)); ctx.rotate(ang);
        const band = (hw, col) => { const h = Math.max(1, Math.round(hw)); ctx.fillStyle = col; ctx.fillRect(0, -h, L, h * 2); };
        band(W * 2.1, `rgba(200,140,40,${0.2 * k})`); band(W * 1.4, `rgba(255,200,70,${0.55 * k})`); band(W * 0.85, `rgba(255,236,170,${0.95 * k})`); band(W * 0.38, `rgba(255,255,255,${k})`);
        if (t >= 0.07) {
          ctx.fillStyle = `rgba(255,255,255,${0.85 * k})`; // 안쪽을 흐르는 빛줄기 (칼끝 쪽으로)
          for (let i = 0; i < 9; i++) { const off = ((i * 0.37 + t * 2.6) % 1) * L, yy = Math.round((((i * 7) % 9) / 9 - 0.5) * W * 1.4); ctx.fillRect(Math.round(off), yy, 26 + (i % 3) * 10, 1); }
          ctx.strokeStyle = `rgba(255,216,74,${0.9 * k})`; ctx.lineWidth = 1; // 지직이는 금빛 가장자리
          for (const sg of [-1, 1]) { ctx.beginPath(); for (let x = 0; x <= L; x += 8) { const yy = sg * (W * 1.45 + Math.sin(x * 0.7 + t * 50 + sg) * 2.5); x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); }
          ctx.strokeStyle = `rgba(255,244,192,${0.95 * k})`; ctx.lineWidth = 2; // 앞으로 나아가는 초승달 검기 두 개
          for (let i = 0; i < 2; i++) { const cx = ((t * 1.6 + i * 0.5) % 1) * L; ctx.beginPath(); ctx.arc(cx - W * 2, 0, W * 2.4, -0.9, 0.9); ctx.stroke(); }
        }
        if (hold) { // 손끝: 십자 섬광 / 끝: 뾰족한 빛의 칼끝 + 별 모양 빛살
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-W * 0.15, -W * 2.4, Math.max(2, W * 0.3), W * 4.8); ctx.fillRect(-W * 1.8, -1, W * 3.6, 2);
          ctx.fillStyle = 'rgba(255,244,200,0.95)'; ctx.beginPath(); ctx.moveTo(L - 2, -W); ctx.lineTo(L + W * 1.8, 0); ctx.lineTo(L - 2, W); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,240,190,0.8)'; ctx.lineWidth = 1;
          for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 3, r0 = W * 0.8, r1 = W * (i % 2 ? 2.2 : 3.4); ctx.beginPath(); ctx.moveTo(L + Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(L + Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); }
        }
        ctx.restore(); ctx.lineWidth = 1; break;
      }
      case 'excalSword': { // 손에서 조준 방향으로 크게 휘둘러지는 빛의 검 (푸른 손잡이·금빛 날밑)
        const p = fx.t / fx.life, swing = Math.min(1, p / 0.3), a = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5;
        const ang = fx.ang - 1.3 * (1 - swing) * (1 - swing);
        ctx.globalAlpha = a; ctx.save(); ctx.translate(Math.round(fx.x), Math.round(fx.y)); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(255,220,120,0.3)'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.arc(4, 0, 38, -1.3 * (1 - swing) - 0.15, 0.15); ctx.closePath(); ctx.fill(); // 휘두른 궤적
        const blade = () => { ctx.beginPath(); ctx.moveTo(9, -3); ctx.lineTo(36, -3); ctx.lineTo(42, 0); ctx.lineTo(36, 3); ctx.lineTo(9, 3); ctx.closePath(); };
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; blade(); ctx.stroke(); ctx.fillStyle = '#ffe9a0'; blade(); ctx.fill(); // 외곽선 있는 날
        ctx.fillStyle = '#ffffff'; ctx.fillRect(10, -1, 28, 1); ctx.fillStyle = '#c8a050'; ctx.fillRect(10, 2, 26, 1);
        ctx.fillStyle = OUTLINE; ctx.fillRect(5, -8, 4, 16); ctx.fillRect(-1, -2, 7, 4);
        ctx.fillStyle = '#ffd84a'; ctx.fillRect(6, -7, 2, 14); ctx.fillStyle = '#3a5aa0'; ctx.fillRect(1, -1, 5, 2); ctx.fillStyle = '#ffd84a'; ctx.fillRect(0, -1, 1, 2); ctx.lineWidth = 1;
        ctx.restore(); break;
      }
      case 'seal': { // 육각별 + 이중 원 + 회전하는 눈금
        const p = fx.t / fx.life, R = (14 + 26 * Math.min(1, p / 0.3)) * (fx.sc || 1), rot = p * 2.5, a = 1 - Math.max(0, (p - 0.6) / 0.4);
        ctx.globalAlpha = a; ctx.save(); ctx.translate(fx.x, fx.y + 6); ctx.scale(1, 0.6);
        ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#e0c0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, R * 0.82, 0, TAU); ctx.stroke();
        for (let tri = 0; tri < 2; tri++) { ctx.beginPath(); for (let i = 0; i <= 3; i++) { const t = rot + tri * Math.PI / 3 + i * TAU / 3; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(t) * R * 0.78, Math.sin(t) * R * 0.78); } ctx.stroke(); }
        for (let i = 0; i < 12; i++) { const t = -rot * 1.5 + i * TAU / 12; ctx.fillStyle = '#fff4c0'; ctx.fillRect(Math.cos(t) * R * 1.12 - 1, Math.sin(t) * R * 1.12 - 1, 2, 2); }
        ctx.restore(); ctx.lineWidth = 1; break;
      }
      case 'pillar': { // 솟아오르는 빛기둥
        if (fx.t < 0) break;
        const p = fx.t / fx.life, h = 40 * Math.min(1, p / 0.3), a = 1 - p;
        const g = ctx.createLinearGradient(0, fx.y - h, 0, fx.y);
        g.addColorStop(0, 'rgba(224,192,255,0)'); g.addColorStop(1, `rgba(255,230,160,${0.8 * a})`);
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(Math.round(fx.x) - 2, fx.y - h, 4, h); break;
      }
      case 'beamline':
        ctx.strokeStyle = fx.color; ctx.lineWidth = fx.w * 2 * k + 1; ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x1, fx.y1); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, fx.w * 0.7 * k); ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x1, fx.y1); ctx.stroke();
        ctx.lineWidth = 1; break;
      case 'ghost': ctx.globalAlpha = 0.45 * k; ctx.drawImage(fx.img, Math.round(fx.x), Math.round(fx.y), fx.w, fx.h); break;
      case 'slash': {
        const a0 = fx.ang - fx.arc / 2, a1 = fx.ang + fx.arc / 2;
        ctx.strokeStyle = fx.color; ctx.lineWidth = 4 * k + 1;
        ctx.beginPath(); ctx.arc(x, y, fx.r * 0.85, a0, a1); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, fx.r * 0.95, a0 + fx.arc * 0.15, a1 - fx.arc * 0.15); ctx.stroke();
        ctx.lineWidth = 1; break;
      }
      case 'bolt': {
        const pts = [[fx.x, fx.y]];
        for (let i = 1; i < 5; i++) { const t = i / 5; pts.push([fx.x + (fx.x1 - fx.x) * t + randInt(-4, 4), fx.y + (fx.y1 - fx.y) * t + randInt(-4, 4)]); }
        pts.push([fx.x1, fx.y1]);
        for (const [w, c] of [[4, 'rgba(140,200,255,0.5)'], [1.5, '#ffffff']]) {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (const [px, py] of pts) ctx.lineTo(px, py); ctx.stroke();
        }
        ctx.lineWidth = 1; break;
      }
    }
  }
}
// '#rrggbb'만 어둡게, 그 외 색은 그대로
function shadeSafe(c, k) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? shade(c, k) : c; }
