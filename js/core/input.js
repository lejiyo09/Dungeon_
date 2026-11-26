'use strict';
// ════════════════════════════════════════════
// 입력
// ════════════════════════════════════════════
// [사용자 결정] 조작키 변경 (좌·우·가운데 클릭 포함): 게임 코드는 원래 키(logical)를 그대로 보고, 누른 키를 여기서 바꿔 줌
//  메뉴·대사·결과 창에서는 바꾸지 않음(remap=false) — 메뉴 클릭·Esc·Enter는 언제나 그대로
const KEY_ACTIONS = [
  { id: 'up', name: '위로 이동', logical: 'KeyW', def: ['KeyW', null] },
  { id: 'down', name: '아래로 이동', logical: 'KeyS', def: ['KeyS', null] },
  { id: 'left', name: '왼쪽으로 이동', logical: 'KeyA', def: ['KeyA', null] },
  { id: 'right', name: '오른쪽으로 이동', logical: 'KeyD', def: ['KeyD', null] },
  { id: 'attack', name: '공격 (누르고 있기)', logical: 'Mouse0', def: ['Mouse0', null] },
  { id: 'skill', name: '스킬', logical: 'KeyF', def: ['KeyF', 'Mouse2'] },
  { id: 'dash', name: '대시', logical: 'Space', def: ['Space', null] },
  { id: 'treasure', name: '보구', logical: 'KeyR', def: ['KeyR', null] },
  { id: 'swap', name: '무기 교체', logical: 'KeyQ', def: ['KeyQ', null] },
  { id: 'interact', name: '상호작용', logical: 'KeyE', def: ['KeyE', null] },
  { id: 'raise', name: '시체 부활 (망자의 군주)', logical: 'KeyG', def: ['KeyG', null] }
];
const GAME_KEYS = new Set(KEY_ACTIONS.map((a) => a.logical).concat(['Mouse2']));
function keyLabel(c) { // 화면 표시용 키 이름
  if (!c) return '—';
  const M = { Mouse0: '좌클릭', Mouse1: '휠 클릭', Mouse2: '우클릭', Mouse3: '마우스 4', Mouse4: '마우스 5', Space: 'Space', ShiftLeft: '왼쪽 Shift', ShiftRight: '오른쪽 Shift', ControlLeft: '왼쪽 Ctrl', ControlRight: '오른쪽 Ctrl', AltLeft: '왼쪽 Alt', AltRight: '오른쪽 Alt', Tab: 'Tab', CapsLock: 'CapsLock', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
  if (M[c]) return M[c]; if (/^Key[A-Z]$/.test(c)) return c.slice(3); if (/^Digit\d$/.test(c)) return c.slice(5); if (/^Numpad/.test(c)) return '숫자패드 ' + c.slice(6); return c;
}
function keysRow(i, slot) { return { x: slot < 0 ? 60 : 250 + slot * 104, y: 46 + i * 17, w: slot < 0 ? 180 : 96, h: 15 }; } // 조작키 설정 창: 줄 · 칸(0 주 키, 1 보조 키)
function keysBtn(k) { return { x: k === 0 ? 150 : 270, y: 46 + KEY_ACTIONS.length * 17 + 10, w: 96, h: 15 }; } // 0 기본값으로 · 1 닫기
class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.typed = []; // 누른 순서대로 (방 코드 입력 등)
    this.pasted = ''; // 붙여넣기(Ctrl+V)로 들어온 글자 (선물 코드·방 코드 입력)
    this.mouse = { x: VIEW_W / 2, y: VIEW_H / 2, down: false, rdown: false };
    this.remap = false; this.raw = []; this.held = new Map(); this.loadBinds(); /* 조작키 변경 */
    const blocked = new Set(['Space', 'Tab', 'KeyQ', 'KeyE', 'KeyR', 'KeyF']);
    const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'); // 로그인 입력칸에서는 게임 키 무시
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (blocked.has(e.code)) e.preventDefault();
      if (!this.held.has(e.code)) { this.raw.push(e.code); this.typed.push(e.ctrlKey || e.metaKey ? 'Mod+' + e.code : e.code); this.press(e.code); } /* Ctrl·⌘와 함께 누른 키는 글자로 치지 않음 (Ctrl+V 붙여넣기) · 조작키 변경을 거쳐 게임 키로 */
    });
    window.addEventListener('keyup', (e) => this.release(e.code));
    window.addEventListener('paste', (e) => { if (typing(e)) return; const t = (e.clipboardData || window.clipboardData) ? (e.clipboardData || window.clipboardData).getData('text') : ''; if (t) { this.pasted += String(t).slice(0, 64); e.preventDefault(); } });
    window.addEventListener('blur', () => { this.down.clear(); this.held.clear(); this.mouse.down = false; });
    window.addEventListener('mousemove', (e) => this.updatePointer(e));
    window.addEventListener('mousedown', (e) => { /* 캔버스 밖(화면 비율이 달라 생긴 검은 여백)을 눌러도 게임 클릭으로 — 로그인 화면은 제외 */
      if (e.target && e.target.closest && e.target.closest('#login')) return;
      this.updatePointer(e);
      const c = 'Mouse' + e.button; if (!this.held.has(c)) { this.raw.push(c); this.press(c); }
    });
    window.addEventListener('mouseup', (e) => this.release('Mouse' + e.button));
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
  loadBinds() { let b = null; try { b = JSON.parse(localStorage.getItem('pd_keys') || 'null'); } catch (e) { b = null; }
    this.binds = {}; for (const A of KEY_ACTIONS) { const v = b && Array.isArray(b[A.id]) ? b[A.id] : A.def; this.binds[A.id] = [v[0] || null, v[1] || null]; } this.buildMap(); }
  saveBinds() { try { localStorage.setItem('pd_keys', JSON.stringify(this.binds)); } catch (e) { /* 저장 안 되는 환경 */ } this.buildMap(); }
  resetBinds() { for (const A of KEY_ACTIONS) this.binds[A.id] = A.def.slice(); this.saveBinds(); }
  setBind(id, slot, code) { if (code) for (const A of KEY_ACTIONS) this.binds[A.id] = this.binds[A.id].map((k) => (k === code ? null : k)); this.binds[id][slot] = code || null; this.saveBinds(); } // 같은 키는 한 동작에만
  buildMap() { this.map = new Map(); for (const A of KEY_ACTIONS) for (const k of this.binds[A.id]) if (k) this.map.set(k, A.logical); }
  translate(c) { if (!this.remap) return c; if (this.map.has(c)) return this.map.get(c); return GAME_KEYS.has(c) ? null : c; } // 게임 동작 키인데 어디에도 묶이지 않았으면 무시
  press(c) { const L = this.translate(c); this.held.set(c, L); if (!L) return; this.pressed.add(L); if (L === 'Mouse0') this.mouse.down = true; else this.down.add(L); }
  release(c) { const L = this.held.has(c) ? this.held.get(c) : (c === 'Mouse0' ? 'Mouse0' : c); this.held.delete(c); if (!L) return; if (L === 'Mouse0') this.mouse.down = false; else this.down.delete(L); }
  isDown(c) { return this.down.has(c); }
  wasPressed(c) { return this.pressed.has(c); }
  endStep() { this.pressed.clear(); this.typed.length = 0; this.pasted = ''; this.raw.length = 0; }
}
