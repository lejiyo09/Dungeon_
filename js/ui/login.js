'use strict';
// ════════════════════════════════════════════
// 로그인 화면 (HTML 오버레이)
//  · 마지막에 쓴 계정은 맨 위 '계속하기' 버튼 (Enter로 바로 시작)
//  · 계정마다 진행 요약 (결정석 · 최고 도달 · 진행 중인 탐험)
//  · PIN 4자리를 다 치면 자동 확인, Esc로 뒤로
//  · '다음부터 바로 시작': 이 기기에서 로그인 화면을 건너뜀 (로그아웃하면 해제)
// ════════════════════════════════════════════
const LoginUI = {
  root: null, game: null, keyHandler: null, auto: false,
  show(game) {
    this.game = game;
    if (!this.root) {
      this.root = document.createElement('div'); this.root.id = 'login';
      document.body.appendChild(this.root);
    }
    this.root.style.display = 'flex';
    this.renderList();
  },
  hide() { if (this.root) this.root.style.display = 'none'; this.setKeys(null); },
  setKeys(fn) { // 화면마다 하나의 키 처리기
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = fn; if (fn) document.addEventListener('keydown', fn);
  },
  esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  ago(t) {
    const m = Math.floor((Date.now() - t) / 60000);
    return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`;
  },
  stageName(n) { return n > 0 ? `${Math.floor((n - 1) / STAGES_PER_WORLD) + 1}-${(n - 1) % STAGES_PER_WORLD + 1}` : '-'; },
  sumLine(p) {
    const s = Auth.summary(p);
    if (!s) return '새 계정';
    return `${CUR.name} ${s.bank} · 최고 ${this.stageName(s.best)}` + (s.run ? ` · <b class="lg-run">탐험 중 ${s.run}</b>` : '');
  },
  frame(inner) {
    this.root.innerHTML = `<div class="lg-panel"><div class="lg-title">PROJECT: DUNGEON</div><div class="lg-sub">로그라이크 던전 슈터</div>${inner}
      <div class="lg-note">계정은 이 브라우저에만 저장됩니다. 다른 기기와는 공유되지 않아요.</div></div>`;
  },
  renderList(msg) {
    Auth.fixAdmin();
    const list = Auth.list().sort((a, b) => b.last - a.last), last = list[0];
    const rows = list.slice(1).map((p) => `<div class="lg-row"><button class="lg-prof" data-id="${p.id}"><span class="lg-name"><b>${this.esc(p.name)}</b>${p.admin ? ' 👑' : ''}${p.pinHash ? ' 🔒' : ''}</span>
      <span class="lg-sum">${this.sumLine(p)} · ${this.ago(p.last)}</span></button><button class="lg-del" data-del="${p.id}" title="계정 삭제">✕</button></div>`).join('');
    this.frame(`${msg ? `<div class="lg-msg">${this.esc(msg)}</div>` : ''}
      ${last ? `<div class="lg-row"><button class="lg-cont" id="lg-cont"><span class="lg-cont-t">▶ 계속하기 — ${this.esc(last.name)}${last.admin ? ' 👑' : ''}${last.pinHash ? ' 🔒' : ''}</span>
        <span class="lg-sum">${this.sumLine(last)} · ${this.ago(last.last)}</span></button><button class="lg-del" data-del="${last.id}" title="계정 삭제">✕</button></div>` : ''}
      ${rows ? `<div class="lg-cap">다른 계정</div><div class="lg-list">${rows}</div>` : ''}
      ${last ? '' : '<div class="lg-empty">아직 계정이 없습니다. 닉네임만 정하면 바로 시작할 수 있어요.</div>'}
      ${last ? `<label class="lg-chk"><input type="checkbox" id="lg-auto" ${this.auto ? 'checked' : ''}> 이 기기에서 다음부터 바로 시작</label>` : ''}
      <button class="lg-btn ${last ? '' : 'lg-main'}" id="lg-new">새 계정 만들기</button>
      <button class="lg-btn" id="lg-guest">게스트로 시작 (저장 안 됨)</button>
      ${list.some((p) => p.admin) ? '' : '<button class="lg-btn lg-admin" id="lg-admin">👑 관리자 계정 (모든 것 해금)</button>'}`);
    const auto = this.root.querySelector('#lg-auto'); if (auto) auto.onchange = () => { this.auto = auto.checked; };
    if (last) this.root.querySelector('#lg-cont').onclick = () => this.pick(last);
    this.root.querySelectorAll('.lg-prof').forEach((b) => b.onclick = () => this.pick(list.find((p) => p.id === b.dataset.id)));
    this.root.querySelectorAll('.lg-del').forEach((b) => b.onclick = () => this.askDelete(list.find((p) => p.id === b.dataset.del)));
    this.root.querySelector('#lg-new').onclick = () => this.renderNew();
    this.root.querySelector('#lg-guest').onclick = () => this.enter(null);
    const adm = this.root.querySelector('#lg-admin'); if (adm) adm.onclick = () => this.renderPin({ name: '관리자 계정' }, '로그인', async (pin) => { if (await Auth.verifyAdminPin(pin)) this.enter(Auth.admin()); else return 'PIN이 맞지 않습니다'; });
    const first = this.root.querySelector(last ? '#lg-cont' : '#lg-new'); if (first) first.focus();
    this.setKeys(null); // Enter는 포커스된 버튼(기본: 계속하기)이 처리
  },
  pick(p) {
    if (!p.pinHash) { this.enter(p); return; }
    this.renderPin(p, '로그인', async (pin) => {
      if (await Auth.verify(p, pin)) this.enter(p); else return 'PIN이 맞지 않습니다';
    });
  },
  askDelete(p) {
    const go = async (pin) => {
      if (p.pinHash && !(await Auth.verify(p, pin))) return 'PIN이 맞지 않습니다';
      Auth.remove(p); if (Auth.getAuto() && Auth.getAuto().id === p.id) Auth.setAuto(null);
      this.renderList(`'${p.name}' 계정을 삭제했습니다`);
    };
    if (p.pinHash) this.renderPin(p, '삭제', go, '이 계정의 진행도가 모두 지워집니다');
    else this.renderConfirm(`'${p.name}' 계정과 진행도를 모두 지울까요?`, () => go(''));
  },
  renderPin(p, verb, onOk, warn) {
    this.frame(`<div class="lg-h">${this.esc(p.name)} — ${verb}</div>${warn ? `<div class="lg-msg">${this.esc(warn)}</div>` : ''}
      <input class="lg-in lg-pin" id="lg-pin" type="password" inputmode="numeric" placeholder="PIN 4자리" autocomplete="off">
      <div class="lg-err" id="lg-err"></div>
      <button class="lg-btn lg-main" id="lg-ok">${verb}</button><button class="lg-btn" id="lg-back">뒤로 (Esc)</button>`);
    const inp = this.root.querySelector('#lg-pin'), err = this.root.querySelector('#lg-err');
    let busy = false;
    const ok = async () => { if (busy) return; busy = true; const e = await onOk(inp.value); busy = false; if (e) { err.textContent = e; inp.value = ''; inp.focus(); } };
    this.root.querySelector('#lg-ok').onclick = ok;
    inp.oninput = () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); err.textContent = ''; if (inp.value.length === 4) ok(); }; // 4자리면 자동 확인
    inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    this.root.querySelector('#lg-back').onclick = () => this.renderList();
    this.setKeys((e) => { if (e.key === 'Escape') this.renderList(); });
    inp.focus();
  },
  renderConfirm(text, onYes) {
    this.frame(`<div class="lg-msg">${this.esc(text)}</div><button class="lg-btn lg-danger" id="lg-yes">삭제</button><button class="lg-btn" id="lg-back">취소 (Esc)</button>`);
    this.root.querySelector('#lg-yes').onclick = onYes;
    this.root.querySelector('#lg-back').onclick = () => this.renderList();
    this.setKeys((e) => { if (e.key === 'Escape') this.renderList(); });
    this.root.querySelector('#lg-back').focus();
  },
  renderNew() {
    this.frame(`<div class="lg-h">새 계정</div>
      <input class="lg-in" id="lg-name" maxlength="12" placeholder="닉네임 (1~12자)" autocomplete="off">
      <input class="lg-in lg-pin" id="lg-pin" type="password" inputmode="numeric" placeholder="PIN 4자리 (선택 · 비워도 됨)" autocomplete="off">
      <label class="lg-chk"><input type="checkbox" id="lg-auto" ${this.auto ? 'checked' : ''}> 이 기기에서 다음부터 바로 시작</label>
      <div class="lg-err" id="lg-err"></div>
      <button class="lg-btn lg-main" id="lg-ok">만들고 시작하기</button><button class="lg-btn" id="lg-back">뒤로 (Esc)</button>`);
    const name = this.root.querySelector('#lg-name'), pin = this.root.querySelector('#lg-pin'), err = this.root.querySelector('#lg-err');
    const auto = this.root.querySelector('#lg-auto'); auto.onchange = () => { this.auto = auto.checked; };
    const ok = async () => {
      try { const p = await Auth.create(name.value, pin.value); this.enter(p); } catch (e) { err.textContent = e.message; }
    };
    this.root.querySelector('#lg-ok').onclick = ok;
    name.onkeydown = (e) => { if (e.key === 'Enter') { if (name.value.trim()) pin.focus(); else err.textContent = '닉네임을 입력해 주세요'; } };
    name.oninput = () => { err.textContent = ''; };
    pin.oninput = () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 4); };
    pin.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    this.root.querySelector('#lg-back').onclick = () => this.renderList();
    this.setKeys((e) => { if (e.key === 'Escape') this.renderList(); });
    name.focus();
  },
  enter(p) {
    Auth.setAuto(p && this.auto && !p.admin ? p : null); // 관리자는 자동 로그인 안 됨
    this.hide(); SFX.unlock(); SFX.play('clear'); this.game.login(p);
  }
};
