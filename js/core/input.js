'use strict';
// ════════════════════════════════════════════
// 입력
// ════════════════════════════════════════════
class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: VIEW_W / 2, y: VIEW_H / 2, down: false, rdown: false };
    const blocked = new Set(['Space', 'Tab', 'KeyQ', 'KeyE', 'KeyR', 'KeyF']);
    const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'); // 로그인 입력칸에서는 게임 키 무시
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (blocked.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => { this.down.clear(); this.mouse.down = false; });
    window.addEventListener('mousemove', (e) => this.updatePointer(e));
    canvas.addEventListener('mousedown', (e) => {
      this.updatePointer(e);
      if (e.button === 0) { this.mouse.down = true; this.pressed.add('Mouse0'); }
      if (e.button === 2) this.pressed.add('Mouse2');
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
    this.wheelAcc = 0; this.wheelT = 0;
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault(); this.pressed.add('Wheel'); this.pressed.add(e.deltaY < 0 ? 'WheelUp' : 'WheelDown');
      // 페이지 넘김용: 트랙패드처럼 잘게 여러 번 오는 휠을 모아서 한 칸씩 (한 번 넘기면 잠시 쉼)
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 300 : 1), now = performance.now();
      if (Math.sign(dy) !== Math.sign(this.wheelAcc)) this.wheelAcc = 0;
      this.wheelAcc += dy;
      if (now - this.wheelT > 280 && Math.abs(this.wheelAcc) >= 50) { this.pressed.add(this.wheelAcc > 0 ? 'WheelPageDown' : 'WheelPageUp'); this.wheelAcc = 0; this.wheelT = now; }
      else if (now - this.wheelT <= 280) this.wheelAcc = 0;
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  updatePointer(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = (e.clientX - r.left) * (VIEW_W / r.width);
    this.mouse.y = (e.clientY - r.top) * (VIEW_H / r.height);
  }
  isDown(c) { return this.down.has(c); }
  wasPressed(c) { return this.pressed.has(c); }
  endStep() { this.pressed.clear(); }
}
