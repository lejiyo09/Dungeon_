'use strict';
// ════════════════════════════════════════════
// 입력
// ════════════════════════════════════════════
class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.typed = []; // 누른 순서대로 (방 코드 입력 등)
    this.mouse = { x: VIEW_W / 2, y: VIEW_H / 2, down: false, rdown: false };
    const blocked = new Set(['Space', 'Tab', 'KeyQ', 'KeyE', 'KeyR', 'KeyF']);
    const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'); // 로그인 입력칸에서는 게임 키 무시
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (blocked.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) { this.pressed.add(e.code); this.typed.push(e.code); }
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => { this.down.clear(); this.mouse.down = false; });
    window.addEventListener('mousemove', (e) => this.updatePointer(e));
    window.addEventListener('mousedown', (e) => { /* 캔버스 밖(화면 비율이 달라 생긴 검은 여백)을 눌러도 게임 클릭으로 — 로그인 화면은 제외 */
      if (e.target && e.target.closest && e.target.closest('#login')) return;
      this.updatePointer(e);
      if (e.button === 0) { this.mouse.down = true; this.pressed.add('Mouse0'); }
      if (e.button === 2) this.pressed.add('Mouse2');
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
    // 휠: window에서 캡처 (캔버스 밖으로 살짝 나가도 놓치지 않게), 수평 스크롤은 무시, 로그인 화면 목록 스크롤은 그대로
    this.wheelAcc = 0; this.wheelT = 0;
    window.addEventListener('wheel', (e) => {
      if (!e.deltaY || (e.target && e.target.closest && e.target.closest('#login'))) return;
      e.preventDefault(); this.pressed.add('Wheel'); this.pressed.add(e.deltaY < 0 ? 'WheelUp' : 'WheelDown');
      // 페이지 넘김용: 트랙패드처럼 잘게 여러 번 오는 휠을 모아서 한 칸씩 (한 번 넘기면 잠시 쉼)
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 300 : 1), now = performance.now();
      if (Math.sign(dy) !== Math.sign(this.wheelAcc)) this.wheelAcc = 0;
      this.wheelAcc += dy;
      if (now - this.wheelT > 280 && Math.abs(this.wheelAcc) >= 50) { this.pressed.add(this.wheelAcc > 0 ? 'WheelPageDown' : 'WheelPageUp'); this.wheelAcc = 0; this.wheelT = now; }
      else if (now - this.wheelT <= 280) this.wheelAcc = 0;
    }, { passive: false, capture: true });
    window.addEventListener('contextmenu', (e) => { if (!(e.target && e.target.closest && e.target.closest('#login'))) e.preventDefault(); });
    this.setupCursor();
  }
  /* 조준선을 진짜 마우스 커서(그림)로: 화면에 그리는 방식은 한두 프레임 늦게 따라와서, 운영체제가 바로 움직이는 커서로 바꿈 — 화면 배율에 맞춰 크기를 다시 만듦 */
  setupCursor() {
    let lastS = 0;
    const apply = () => {
      const r = this.canvas.getBoundingClientRect(); if (!r.width) return;
      const s = clamp(Math.round(r.width / VIEW_W), 1, 5); if (s === lastS) return; lastS = s;
      const n = 11 * s, c = document.createElement('canvas'); c.width = n; c.height = n; const g = c.getContext('2d'), m = 5 * s;
      const arms = (col, pad) => { g.fillStyle = col; /* 가운데를 비운 십자 (예전 화면 조준선과 같은 모양) */
        g.fillRect(m - 4 * s - pad, m - pad, 3 * s + pad * 2, s + pad * 2); g.fillRect(m + 2 * s - pad, m - pad, 3 * s + pad * 2, s + pad * 2);
        g.fillRect(m - pad, m - 4 * s - pad, s + pad * 2, 3 * s + pad * 2); g.fillRect(m - pad, m + 2 * s - pad, s + pad * 2, 3 * s + pad * 2); };
      arms('rgba(0,0,0,0.75)', Math.max(1, s >> 1)); arms('#ffffff', 0);
      const css = `url(${c.toDataURL()}) ${m + (s >> 1)} ${m + (s >> 1)}, crosshair`;
      document.body.style.cursor = css; this.canvas.style.cursor = css; document.documentElement.style.cursor = css;
    };
    apply(); setTimeout(apply, 150); window.addEventListener('resize', apply); setInterval(apply, 1000);
  }
  updatePointer(e) {
    const r = this.canvas.getBoundingClientRect();
    /* 화면 밖으로 나가도 조준선이 화면 가장자리에 남도록 (여백으로 마우스가 빠져나가 조준선이 사라지던 문제) */
    this.mouse.x = clamp((e.clientX - r.left) * (VIEW_W / r.width), 0, VIEW_W - 1);
    this.mouse.y = clamp((e.clientY - r.top) * (VIEW_H / r.height), 0, VIEW_H - 1);
  }
  isDown(c) { return this.down.has(c); }
  wasPressed(c) { return this.pressed.has(c); }
  endStep() { this.pressed.clear(); this.typed.length = 0; }
}
