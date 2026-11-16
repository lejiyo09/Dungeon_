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
    // 휠은 캔버스 위에만 마우스가 있을 때 놓치는 경우가 있어 window에서 캡처한다.
    // 트랙패드의 작은 deltaY도 방향만으로 판정하고, 수평 스크롤은 무시한다.
    window.addEventListener('wheel', (e) => {
      if (!e.deltaY) return;
      e.preventDefault();
      this.pressed.add('Wheel');
      this.pressed.add(e.deltaY < 0 ? 'WheelUp' : 'WheelDown');
    }, { passive: false, capture: true });
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
