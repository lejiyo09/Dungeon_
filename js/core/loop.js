'use strict';
// ════════════════════════════════════════════
// 고정 timestep 루프
// ════════════════════════════════════════════
class GameLoop {
  constructor(update, render) {
    this.update = update; this.render = render; this.acc = 0; this.last = 0;
    this.frame = this.frame.bind(this);
  }
  start() { this.last = performance.now(); requestAnimationFrame(this.frame); }
  frame(now) {
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.25) dt = 0.25;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 8) { this.update(STEP); this.acc -= STEP; steps++; }
    if (steps === 8) this.acc = 0;
    this.render();
    requestAnimationFrame(this.frame);
  }
}
