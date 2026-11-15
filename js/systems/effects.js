'use strict';
// ════════════════════════════════════════════
// 이펙트: 파티클(중력·감속·크기 변화·색 변화·가산 혼합) + 특수 효과
//  add: true 인 효과는 'lighter' 혼합으로 빛나 보임
// ════════════════════════════════════════════
const MAX_FX = 2600;
class Effects {
  constructor() { this.list = []; }
  clear() { this.list.length = 0; }
  push(fx) { if (this.list.length < MAX_FX) this.list.push(fx); }
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
  excalibur(x, y, x1, y1, w, px, py) { // 금빛 검기: 휘두르는 빛의 검 → 앞으로 뻗는 빛줄기 → 남는 잔광
    const L = Math.hypot(x1 - x, y1 - y) || 1, dx = (x1 - x) / L, dy = (y1 - y) / L;
    this.push({ kind: 'excal', x, y, x1, y1, w, t: 0, life: 0.8, add: true, seed: Math.random() * 100 });
    this.push({ kind: 'excalSword', x: px, y: py - 3, ang: Math.atan2(dy, dx), t: 0, life: 0.5, add: false });
    this.push({ kind: 'shock', x, y, r: 26, color: '#ffe9a0', t: 0, life: 0.35, add: true });
    for (let d = 0; d < L; d += 5) { // 빛줄기가 지나간 자리에 늦게 피어나는 빛 알갱이
      const s = (Math.random() - 0.5) * w * 2, px2 = x + dx * d - dy * s, py2 = y + dy * d + dx * s, lag = d / L * 0.1;
      this.push(Object.assign({ kind: 'p', x: px2, y: py2, vx: dx * 30 + (Math.random() - 0.5) * 30, vy: dy * 30 - 20 - Math.random() * 30, t: -lag, life: 0.45 + Math.random() * 0.4,
        size: 2, size2: 0, color: Math.random() < 0.5 ? '#fff4c0' : '#ffd84a', color2: '#c8a050', drag: 2, grav: 0, add: true, shape: Math.random() < 0.35 ? 'plus' : undefined }));
    }
  }
  solomonSeal(x, y) { // 솔로몬의 인장: 육각별 마법진이 펼쳐지고 빛기둥이 솟음
    this.push({ kind: 'seal', x, y, t: 0, life: 1.1, add: true });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; this.push({ kind: 'pillar', x: x + Math.cos(a) * 30, y: y + 6 + Math.sin(a) * 18, t: -i * 0.04, life: 0.6, add: true }); }
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

  update(dt) {
    for (const fx of this.list) {
      fx.t += dt;
      if (fx.kind === 'text') fx.y -= 20 * dt;
      else if (fx.kind === 'p') {
        const d = Math.exp(-fx.drag * dt); fx.vx *= d; fx.vy = fx.vy * d + fx.grav * dt;
        fx.x += fx.vx * dt; fx.y += fx.vy * dt;
      }
    }
    this.list = this.list.filter((fx) => fx.t < fx.life);
  }
  render(ctx) {
    // 1) 일반 혼합
    for (const fx of this.list) if (!fx.add && fx.kind !== 'boom' && fx.kind !== 'flash') this.draw(ctx, fx);
    // 2) 빛나는 효과는 가산 혼합
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const fx of this.list) if (fx.add || fx.kind === 'boom' || fx.kind === 'flash') this.draw(ctx, fx);
    ctx.restore();
    ctx.globalAlpha = 1;
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
      case 'excal': {
        if (fx.t < 0) break;
        const p = fx.t / fx.life, reach = Math.min(1, p / 0.09), fade = p < 0.3 ? 1 : 1 - (p - 0.3) / 0.7;
        const ang = Math.atan2(fx.y1 - fx.y, fx.x1 - fx.x), L = Math.hypot(fx.x1 - fx.x, fx.y1 - fx.y) * reach;
        const W = fx.w * (p < 0.12 ? 0.5 + 4 * p : 1) * (0.25 + 0.75 * fade);
        ctx.globalAlpha = 1; ctx.save(); ctx.translate(Math.round(fx.x), Math.round(fx.y)); ctx.rotate(ang);
        const band = (hw, col) => { const h = Math.max(1, Math.round(hw)); ctx.fillStyle = col; ctx.fillRect(0, -h, L, h * 2); }; // 또렷한 픽셀 띠
        band(W * 1.5, `rgba(200,140,40,${0.35 * fade})`); band(W, `rgba(255,200,70,${0.75 * fade})`); band(W * 0.55, `rgba(255,236,170,${fade})`); band(W * 0.22, `rgba(255,255,255,${fade})`);
        for (let i = 0; i < 18; i++) { // 가장자리에서 튀는 빛 조각
          const r = (Math.sin(fx.seed + i * 12.9898) * 43758.5453) % 1, rx = Math.abs(r) * L, side = i % 2 ? 1 : -1;
          ctx.fillStyle = `rgba(255,244,192,${fade})`; ctx.fillRect(Math.round(rx), side * Math.round(W * (1.1 + Math.abs(r) * 0.8)), 2, 1);
        }
        ctx.strokeStyle = `rgba(255,244,192,${0.9 * fade})`; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const cx = ((p * 1.8 + i / 3) % 1) * L; ctx.beginPath(); ctx.arc(cx - W * 2.2, 0, W * 2.5, -0.85, 0.85); ctx.stroke(); } // 흐르는 초승달 검기
        if (reach < 1 || p < 0.2) { ctx.fillStyle = `rgba(255,255,255,${fade})`; ctx.beginPath(); ctx.arc(L, 0, W * 0.9, 0, TAU); ctx.fill(); } // 뻗어 나가는 머리
        else { ctx.fillStyle = `rgba(255,230,140,${0.6 * fade})`; ctx.beginPath(); ctx.arc(L, 0, W * 0.8, 0, TAU); ctx.fill(); }
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
        const p = fx.t / fx.life, R = 14 + 26 * Math.min(1, p / 0.3), rot = p * 2.5, a = 1 - Math.max(0, (p - 0.6) / 0.4);
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
