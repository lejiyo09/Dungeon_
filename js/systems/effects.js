'use strict';
// ════════════════════════════════════════════
// 이펙트
// ════════════════════════════════════════════
class Effects {
  constructor() { this.list = []; }
  clear() { this.list.length = 0; }
  text(x, y, str, color, big = false) { this.list.push({ kind: 'text', x: x + (big ? 0 : randInt(-3, 3)), y, str, color, big, t: 0, life: big ? 0.8 : 0.6 }); }
  spark(x, y, color) { this.list.push({ kind: 'spark', x, y, color, t: 0, life: 0.1 }); }
  ring(x, y, r, color) { this.list.push({ kind: 'ring', x, y, r, color, t: 0, life: 0.15 }); }
  slash(x, y, ang, r, arc, color) { this.list.push({ kind: 'slash', x, y, ang, r, arc, color, t: 0, life: 0.14 }); }
  lightning(x0, y0, x1, y1) { this.list.push({ kind: 'bolt', x: x0, y: y0, x1, y1, t: 0, life: 0.15 }); }
  explosion(x, y, r, color) { this.list.push({ kind: 'boom', x, y, r, color, t: 0, life: 0.25 }); this.burst(x, y, color, 12); }
  burst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + Math.random() * 0.4, s = 40 + Math.random() * 50;
      this.list.push({ kind: 'particle', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, t: 0, life: 0.35 });
    }
  }
  update(dt) {
    for (const fx of this.list) {
      fx.t += dt;
      if (fx.kind === 'text') fx.y -= 20 * dt;
      if (fx.kind === 'particle') { fx.x += fx.vx * dt; fx.y += fx.vy * dt; }
    }
    this.list = this.list.filter((fx) => fx.t < fx.life);
  }
  render(ctx) {
    for (const fx of this.list) {
      const k = 1 - fx.t / fx.life, x = Math.round(fx.x), y = Math.round(fx.y);
      ctx.globalAlpha = k;
      switch (fx.kind) {
        case 'text':
          { const pop = 1 + (fx.big ? 0.8 : 0.3) * Math.max(0, 1 - fx.t / 0.12); // 튀어나왔다 줄어듦
            ctx.font = `bold ${Math.round((fx.big ? 12 : 9) * pop)}px monospace`; }
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#000'; ctx.fillText(fx.str, x + 1, y + 1);
          ctx.fillStyle = fx.color; ctx.fillText(fx.str, x, y); break;
        case 'spark': ctx.fillStyle = fx.color; ctx.fillRect(x - 2, y - 2, 4, 4); break;
        case 'particle': ctx.fillStyle = fx.color; ctx.fillRect(x, y, 2, 2); break;
        case 'ring': ctx.strokeStyle = fx.color; ctx.beginPath(); ctx.arc(x, y, fx.r, 0, TAU); ctx.stroke(); break;
        case 'boom': ctx.fillStyle = fx.color; ctx.beginPath(); ctx.arc(x, y, fx.r * (0.6 + 0.4 * (1 - k)), 0, TAU); ctx.fill(); break;
        case 'slash':
          ctx.strokeStyle = fx.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, fx.r * 0.85, fx.ang - fx.arc / 2, fx.ang + fx.arc / 2); ctx.stroke();
          ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, fx.r * 0.55, fx.ang - fx.arc / 2.5, fx.ang + fx.arc / 2.5); ctx.stroke();
          break;
        case 'bolt': {
          ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y);
          const n = 5;
          for (let i = 1; i < n; i++) {
            const t = i / n;
            ctx.lineTo(fx.x + (fx.x1 - fx.x) * t + randInt(-4, 4), fx.y + (fx.y1 - fx.y) * t + randInt(-4, 4));
          }
          ctx.lineTo(fx.x1, fx.y1); ctx.stroke(); ctx.lineWidth = 1; break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
