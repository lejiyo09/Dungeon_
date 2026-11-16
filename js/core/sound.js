'use strict';
// ════════════════════════════════════════════
// 효과음: WebAudio로 즉석 합성 (외부 파일 없음)
//  브라우저 정책상 첫 클릭/키 입력 뒤에 소리가 켜짐
// ════════════════════════════════════════════
class SoundSystem {
  constructor() {
    this.ctx = null; this.master = null; this.noiseBuf = null;
    this.muted = false; this.volume = 0.32; this.last = {};
    const unlock = () => this.unlock();
    window.addEventListener('keydown', unlock); window.addEventListener('mousedown', unlock);
  }
  unlock() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        // 잔향(홀 울림): 서서히 줄어드는 노이즈로 만든 임펄스 → 보구처럼 웅장한 소리에 사용
        const rl = Math.floor(this.ctx.sampleRate * 2.4), ir = this.ctx.createBuffer(2, rl, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const b = ir.getChannelData(ch); for (let i = 0; i < rl; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
        this.verb = this.ctx.createConvolver(); this.verb.buffer = ir;
        const vg = this.ctx.createGain(); vg.gain.value = 0.55; this.verb.connect(vg); vg.connect(this.master);
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  // 보스전 배경음악: 16스텝 베이스 + 킥/스네어/하이햇 루프를 조금씩 앞서 예약
  startMusic(theme) {
    this.theme = theme || null;
    if (!this.ctx || this.musicTimer) return;
    this.beat = 0; this.nextT = this.ctx.currentTime + 0.05;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 90);
  }
  stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } }
  scheduleMusic() {
    if (!this.ctx) return;
    const BASS = [55, 55, 82.4, 55, 49, 49, 73.4, 49, 58.3, 58.3, 87.3, 58.3, 41.2, 49, 55, 61.7];
    if (this.theme === 'sanctum') { // 기원의 성역: 낮은 북 + 길게 울리는 화음 (Am - F - C - G)
      const CH = [[110, 130.8, 164.8], [87.3, 110, 130.8], [65.4, 82.4, 98], [98, 123.5, 146.8]];
      while (this.nextT < this.ctx.currentTime + 0.25) {
        const b = this.beat % 32, d = Math.max(0, this.nextT - this.ctx.currentTime);
        if (!this.muted) {
          if (b % 8 === 0) for (const f of CH[(b / 8) | 0]) { this.tone('sine', f * 2, f * 2, 1.7, 0.03, d); this.tone('triangle', f, f, 1.7, 0.025, d); }
          if (b % 8 === 0 || b % 8 === 3) this.tone('sine', 70, 30, 0.35, 0.14, d);
          if (b % 4 === 2) this.noise(0.12, 0.02, 'bandpass', 900, d);
        }
        this.nextT += 0.22; this.beat++;
      }
      return;
    }
    while (this.nextT < this.ctx.currentTime + 0.25) {
      const b = this.beat % 16, d = Math.max(0, this.nextT - this.ctx.currentTime);
      if (!this.muted) {
        this.tone('sawtooth', BASS[b], BASS[b] * 0.98, 0.18, 0.045, d);
        if (b % 4 === 0) this.tone('sine', 140, 40, 0.16, 0.12, d);
        if (b % 8 === 4) this.noise(0.1, 0.05, 'bandpass', 1800, d);
        if (b % 2 === 1) this.noise(0.03, 0.015, 'highpass', 7000, d);
      }
      this.nextT += 0.15; this.beat++;
    }
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : this.volume; }
  // 기본 음: 주파수 f → f2로 미끄러지는 짧은 소리
  tone(type, f, f2, dur, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  // 웅장한 음: 천천히 부풀었다 사라지는 음 (저역 필터 + 잔향으로 보냄)
  pad(type, f, dur, vol, delay = 0, attack = 0.08, f2 = 0, cutoff = 2400) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.type = 'lowpass'; fl.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(this.master); if (this.verb) g.connect(this.verb);
    o.start(t); o.stop(t + dur + 0.05);
  }
  rumble(dur, vol, freq, delay = 0) { // 잔향이 있는 낮은 굉음
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(60, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); if (this.verb) g.connect(this.verb); s.start(t); s.stop(t + dur + 0.05);
  }
  noise(dur, vol, filterType, freq, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = filterType; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  }
  // 같은 소리가 너무 자주 겹치지 않도록 이름별 최소 간격
  play(name, gap = 0.035) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    const S = SOUNDS[name];
    if (S) S(this);
  }
}

const SOUNDS = {
  // ── 보구 (잔향 있는 웅장한 소리)
  gate: (s) => { // 게이트 오브 바빌론: 낮은 울림 + 금빛 문이 열리는 반짝임 + 사슬 소리
    s.pad('sine', 73, 1.4, 0.22, 0, 0.02, 36); s.rumble(1.1, 0.25, 700);
    for (const [f, d] of [[147, 0], [220, 0.02], [294, 0.04], [349, 0.06]]) s.pad('sawtooth', f, 1.6, 0.035, d, 0.25, 0, 1400); // 단조 화음
    [1319, 1568, 1976, 2637, 3136].forEach((f, i) => s.pad('sine', f, 0.7, 0.05, 0.05 + i * 0.05, 0.005));           // 문이 열리는 반짝임
    for (let i = 0; i < 6; i++) { const d = 0.18 + i * 0.07 + Math.random() * 0.03;                                 // 사슬이 철컥이며 감김
      s.noise(0.05, 0.09, 'bandpass', 3200 + Math.random() * 1500, d); s.tone('square', 1500 + Math.random() * 600, 900, 0.06, 0.03, d); }
  },
  excal: (s) => { // 엑스칼리버: 빛이 모이는 상승음 → 성가 같은 장조 화음 + 폭발적인 굉음 + 맑은 종소리
    s.pad('sawtooth', 220, 0.22, 0.06, 0, 0.18, 880, 3000);                                                         // 모이는 빛
    for (const [f, dt] of [[220, 0], [277, 0], [330, 0], [440, 0], [554, 0], [660, 0]]) { s.pad('sawtooth', f, 1.9, 0.04, 0.12 + dt, 0.05, 0, 2200); s.pad('sawtooth', f * 1.006, 1.9, 0.03, 0.12, 0.05, 0, 2200); } // 성가 화음(살짝 어긋난 두 겹)
    s.pad('sine', 110, 1.5, 0.3, 0.12, 0.01, 30); s.rumble(1.3, 0.4, 1400, 0.12); s.noise(0.45, 0.18, 'bandpass', 1400, 0.1); // 굉음·검기 바람
    s.pad('sine', 1760, 1.8, 0.08, 0.14, 0.005); s.pad('sine', 2637, 1.4, 0.04, 0.18, 0.005);                       // 종소리
  },
  solomon: (s) => { // 솔로몬의 반지: 하프처럼 올라가는 아르페지오 + 따뜻한 화음 + 맑은 차임
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => s.pad('triangle', f, 0.9, 0.07, i * 0.055, 0.005));
    for (const f of [262, 330, 392, 523]) s.pad('sine', f, 2.0, 0.07, 0.05, 0.3);
    s.pad('sine', 2637, 1.5, 0.05, 0.42, 0.005); s.pad('sine', 3136, 1.2, 0.035, 0.5, 0.005); s.pad('sine', 98, 1.2, 0.15, 0, 0.05);
  },
  gun: (s) => s.tone('square', 560, 240, 0.05, 0.07),
  heavy: (s) => { s.tone('sawtooth', 220, 60, 0.14, 0.12); s.noise(0.08, 0.08, 'lowpass', 1200); },
  magic: (s) => s.tone('triangle', 940, 460, 0.09, 0.08),
  bow: (s) => { s.tone('triangle', 300, 900, 0.06, 0.07); s.noise(0.05, 0.04, 'highpass', 3000); },
  melee: (s) => { s.noise(0.07, 0.09, 'bandpass', 1800); s.tone('triangle', 320, 140, 0.07, 0.05); },
  beam: (s) => s.tone('sine', 1300, 1100, 0.07, 0.03),
  flame: (s) => s.noise(0.06, 0.03, 'bandpass', 900),
  hit: (s) => s.tone('square', 190, 120, 0.035, 0.05),
  crit: (s) => { s.tone('square', 980, 620, 0.06, 0.07); s.tone('square', 1400, 900, 0.04, 0.04, 0.02); },
  kill: (s) => s.tone('triangle', 330, 70, 0.13, 0.1),
  hurt: (s) => { s.tone('sawtooth', 220, 80, 0.16, 0.16); s.noise(0.1, 0.06, 'lowpass', 800); },
  shield: (s) => s.tone('sine', 600, 300, 0.1, 0.1),
  explode: (s) => { s.noise(0.32, 0.2, 'lowpass', 700); s.tone('sine', 110, 35, 0.3, 0.16); },
  coin: (s) => { s.tone('square', 1250, 1250, 0.04, 0.04); s.tone('square', 1680, 1680, 0.06, 0.04, 0.04); },
  energy: (s) => s.tone('sine', 700, 1150, 0.07, 0.05),
  heal: (s) => { s.tone('sine', 520, 520, 0.08, 0.07); s.tone('sine', 780, 780, 0.1, 0.07, 0.07); },
  dash: (s) => s.noise(0.09, 0.07, 'highpass', 2200),
  skill: (s) => { s.tone('triangle', 380, 920, 0.22, 0.12); s.tone('sine', 760, 1840, 0.18, 0.05, 0.03); },
  door: (s) => { s.tone('square', 130, 90, 0.14, 0.1); s.noise(0.12, 0.06, 'lowpass', 500); },
  boss: (s) => { s.tone('sawtooth', 90, 45, 0.7, 0.18); s.tone('square', 60, 40, 0.7, 0.08); },
  clear: (s) => { [523, 659, 784].forEach((f, i) => s.tone('square', f, f, 0.1, 0.06, i * 0.08)); },
  victory: (s) => { [523, 659, 784, 1046].forEach((f, i) => s.tone('square', f, f, 0.16, 0.07, i * 0.12)); },
  crate: (s) => { s.noise(0.09, 0.1, 'bandpass', 900); s.tone('square', 160, 90, 0.07, 0.05); },
  ui: (s) => s.tone('square', 660, 660, 0.03, 0.05),
  buy: (s) => { s.tone('square', 880, 880, 0.05, 0.05); s.tone('square', 1320, 1320, 0.08, 0.05, 0.05); },
  deny: (s) => s.tone('square', 180, 150, 0.12, 0.07),
  react: (s) => { s.tone('square', 1200, 300, 0.18, 0.08); s.noise(0.12, 0.08, 'bandpass', 2400); },
  heart: (s) => { s.tone('sine', 70, 50, 0.1, 0.18); s.tone('sine', 65, 45, 0.1, 0.14, 0.16); }
};

const SFX = new SoundSystem();
// 무기 계열 → 발사음
function weaponSound(def) {
  if (def.type === 'melee') return 'melee';
  if (def.type === 'charge') return 'bow';
  if (def.flame) return 'flame';
  if (def.shape === 'staff') return 'magic';
  if (def.explodeRadius || def.damage >= 40) return 'heavy';
  return 'gun';
}
