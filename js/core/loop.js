'use strict';
// ════════════════════════════════════════════
// 고정 timestep 루프
// ════════════════════════════════════════════
// 자동 품질: 초당 프레임이 오래 낮으면 가벼운 모드(해상도↓·파티클 절반), 다시 부드러워지면 원래대로
const PERF = {
  fps: 60, low: false, lowT: 0, hiT: 0, onChange: null,
  tick(raw) { // raw: 실제 프레임 간격(초)
    if (raw <= 0 || raw > 0.5 || document.hidden) return; // 탭을 비웠던 시간 등은 제외
    this.fps += (1 / raw - this.fps) * 0.05;
    if (this.fps < 42) { this.lowT += raw; this.hiT = 0; if (!this.low && this.lowT > 2) this.set(true); }
    else if (this.fps > 56) { this.hiT += raw; this.lowT = 0; if (this.low && this.hiT > 8) this.set(false); }
    else { this.lowT = Math.max(0, this.lowT - raw); this.hiT = 0; }
  },
  set(v) { this.low = v; this.lowT = 0; this.hiT = 0; if (this.onChange) this.onChange(v); }
};
// 캔버스 저장 깊이 추적: 그리다 오류가 나도 다음 프레임은 깨끗한 상태에서 시작 (혼합 방식·투명도·이동이 남지 않게)
function trackCtxDepth(ctx) {
  if (ctx.__depthTracked) return ctx; const S = ctx.save, R = ctx.restore; ctx.__d = 0;
  ctx.save = function () { this.__d++; S.call(this); }; ctx.restore = function () { if (this.__d > 0) { this.__d--; R.call(this); } };
  ctx.__depthTracked = true; return ctx;
}
function resetCtx(ctx) { trackCtxDepth(ctx); while (ctx.__d > 0) ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = 1; ctx.setLineDash && ctx.setLineDash([]); }
class GameLoop {
  constructor(update, render) {
    this.update = update; this.render = render; this.acc = 0; this.last = 0;
    this.frame = this.frame.bind(this);
  }
  start() { this.last = performance.now(); requestAnimationFrame(this.frame); document.addEventListener('visibilitychange', () => this.background()); }
  // 창을 내리면 브라우저가 화면 갱신을 멈춤 → 멀티 방장은 작은 워커 타이머로 계산을 계속 (동료 화면이 멈추지 않게, 그리기는 생략)
  background() {
    const want = document.hidden && this.runHidden && this.runHidden();
    if (want && !this.worker) { try { this.worker = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 33)'], { type: 'text/javascript' }))); this.worker.onmessage = () => this.hiddenTick(); this.hLast = performance.now(); } catch (e) { this.worker = null; } }
    else if (!want && this.worker) { this.worker.terminate(); this.worker = null; this.last = performance.now(); }
  }
  hiddenTick() {
    if (!document.hidden || !(this.runHidden && this.runHidden())) { this.background(); return; }
    const now = performance.now(), dt = Math.min(0.25, (now - this.hLast) / 1000); this.hLast = now; this.acc += dt; let n = 0;
    try { while (this.acc >= STEP && n < 15) { this.update(STEP); this.acc -= STEP; n++; } } catch (e) { this.acc = 0; this.report(e); }
  }
  frame(now) {
    requestAnimationFrame(this.frame); // 먼저 다음 프레임을 예약 → 한 프레임에서 오류가 나도 게임이 멈추지 않음
    let dt = (now - this.last) / 1000;
    this.last = now; PERF.tick(dt);
    if (dt > 0.25) dt = 0.25;
    this.acc += dt;
    let steps = 0;
    try { while (this.acc >= STEP && steps < 8) { this.update(STEP); this.acc -= STEP; steps++; } } catch (e) { this.acc = 0; this.report(e); }
    if (steps === 8) this.acc = 0;
    try { this.render(); } catch (e) { this.report(e); }
  }
  report(e) { // 오류는 그대로 알리되(콘솔·테스트 도구) 같은 오류는 5초에 한 번만
    const k = String(e && e.message), now = performance.now(); this.seen = this.seen || new Map();
    if (now - (this.seen.get(k) || -1e9) < 5000) return; this.seen.set(k, now); setTimeout(() => { throw e; });
  }
}
