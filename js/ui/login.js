'use strict';
// ════════════════════════════════════════════
// 로그인 화면 (HTML 오버레이): 계정 선택 / PIN 입력 / 새 계정 / 게스트 / 계정 삭제
// ════════════════════════════════════════════
const LoginUI = {
  root: null, game: null,
  show(game) {
    this.game = game;
    if (!this.root) {
      this.root = document.createElement('div'); this.root.id = 'login';
      document.body.appendChild(this.root);
    }
    this.root.style.display = 'flex';
    this.renderList();
  },
  hide() { if (this.root) this.root.style.display = 'none'; },
  esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  ago(t) {
    const m = Math.floor((Date.now() - t) / 60000);
    return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`;
  },
  frame(inner) {
    this.root.innerHTML = `<div class="lg-panel"><div class="lg-title">PROJECT: DUNGEON</div><div class="lg-sub">로그라이크 던전 슈터</div>${inner}
      <div class="lg-note">계정은 이 브라우저에만 저장됩니다. 다른 기기와는 공유되지 않아요.</div></div>`;
  },
  renderList(msg) {
    const list = Auth.list().sort((a, b) => b.last - a.last);
    const rows = list.map((p) => `<div class="lg-row"><button class="lg-prof" data-id="${p.id}"><b>${this.esc(p.name)}</b>
      <span>${p.pinHash ? '🔒 ' : ''}${this.ago(p.last)}</span></button><button class="lg-del" data-del="${p.id}" title="계정 삭제">✕</button></div>`).join('');
    this.frame(`${msg ? `<div class="lg-msg">${this.esc(msg)}</div>` : ''}
      <div class="lg-list">${rows || '<div class="lg-empty">아직 계정이 없습니다</div>'}</div>
      <button class="lg-btn lg-main" id="lg-new">새 계정 만들기</button>
      <button class="lg-btn" id="lg-guest">게스트로 시작 (저장 안 됨)</button>`);
    this.root.querySelectorAll('.lg-prof').forEach((b) => b.onclick = () => this.pick(list.find((p) => p.id === b.dataset.id)));
    this.root.querySelectorAll('.lg-del').forEach((b) => b.onclick = () => this.askDelete(list.find((p) => p.id === b.dataset.del)));
    this.root.querySelector('#lg-new').onclick = () => this.renderNew();
    this.root.querySelector('#lg-guest').onclick = () => this.enter(null);
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
      Auth.remove(p); this.renderList(`'${p.name}' 계정을 삭제했습니다`);
    };
    if (p.pinHash) this.renderPin(p, '삭제', go, '이 계정의 진행도가 모두 지워집니다');
    else this.renderConfirm(`'${p.name}' 계정과 진행도를 모두 지울까요?`, () => go(''));
  },
  renderPin(p, verb, onOk, warn) {
    this.frame(`<div class="lg-h">${this.esc(p.name)} — ${verb}</div>${warn ? `<div class="lg-msg">${this.esc(warn)}</div>` : ''}
      <input class="lg-in" id="lg-pin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN 4자리" autocomplete="off">
      <div class="lg-err" id="lg-err"></div>
      <button class="lg-btn lg-main" id="lg-ok">${verb}</button><button class="lg-btn" id="lg-back">뒤로</button>`);
    const inp = this.root.querySelector('#lg-pin'), err = this.root.querySelector('#lg-err');
    const ok = async () => { const e = await onOk(inp.value); if (e) { err.textContent = e; inp.value = ''; inp.focus(); } };
    this.root.querySelector('#lg-ok').onclick = ok;
    inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    this.root.querySelector('#lg-back').onclick = () => this.renderList();
    inp.focus();
  },
  renderConfirm(text, onYes) {
    this.frame(`<div class="lg-msg">${this.esc(text)}</div><button class="lg-btn lg-danger" id="lg-yes">삭제</button><button class="lg-btn" id="lg-back">취소</button>`);
    this.root.querySelector('#lg-yes').onclick = onYes;
    this.root.querySelector('#lg-back').onclick = () => this.renderList();
  },
  renderNew() {
    this.frame(`<div class="lg-h">새 계정</div>
      <input class="lg-in" id="lg-name" maxlength="12" placeholder="닉네임 (1~12자)" autocomplete="off">
      <input class="lg-in" id="lg-pin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN 4자리 (선택)" autocomplete="off">
      <div class="lg-err" id="lg-err"></div>
      <button class="lg-btn lg-main" id="lg-ok">만들고 시작하기</button><button class="lg-btn" id="lg-back">뒤로</button>`);
    const name = this.root.querySelector('#lg-name'), pin = this.root.querySelector('#lg-pin'), err = this.root.querySelector('#lg-err');
    const ok = async () => {
      try { const p = await Auth.create(name.value, pin.value); this.enter(p); } catch (e) { err.textContent = e.message; }
    };
    this.root.querySelector('#lg-ok').onclick = ok;
    [name, pin].forEach((el) => el.onkeydown = (e) => { if (e.key === 'Enter') ok(); });
    this.root.querySelector('#lg-back').onclick = () => this.renderList();
    name.focus();
  },
  enter(p) { this.hide(); SFX.unlock(); SFX.play('clear'); this.game.login(p); }
};
