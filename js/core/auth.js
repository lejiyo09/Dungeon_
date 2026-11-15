'use strict';
// ════════════════════════════════════════════
// 계정(프로필): 닉네임 + 선택적 4자리 PIN, 계정별로 진행도를 따로 저장
//  ※ 서버가 없는 정적 사이트용 "기기 안의 계정"입니다. 같은 브라우저에서만 유효하고,
//    PIN은 해시로만 저장하지만 기기에 접근할 수 있는 사람으로부터 데이터를 지켜주지는 못합니다.
// ════════════════════════════════════════════
const PROFILE_KEY = 'project_dungeon_profiles_v1';
const Auth = {
  current: null, // null = 게스트(저장 안 함)
  list() {
    try { const a = JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  },
  saveList(a) { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(a)); } catch (e) { /* 저장소 사용 불가 */ } },
  saveKeyOf(p) { return SAVE_KEY + '::' + p.id; },
  async hashPin(pin, salt) {
    const text = salt + ':' + pin;
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { // crypto.subtle을 못 쓰는 환경용 대체 해시
      let h = 2166136261; for (let i = 0; i < 2000; i++) for (const ch of text) { h ^= ch.charCodeAt(0) + i; h = Math.imul(h, 16777619); }
      return 'f' + (h >>> 0).toString(16);
    }
  },
  validName(name) { return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 12; },
  async create(name, pin) {
    name = (name || '').trim();
    if (!this.validName(name)) throw new Error('닉네임은 1~12자로 입력해 주세요');
    if (pin && !/^\d{4}$/.test(pin)) throw new Error('PIN은 숫자 4자리이거나 비워 두세요');
    const all = this.list();
    if (all.some((p) => p.name === name)) throw new Error('이미 있는 닉네임입니다');
    if (all.length >= 8) throw new Error('계정은 최대 8개까지 만들 수 있습니다');
    const salt = Array.from(crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(8)) : [Date.now() & 255]).map((b) => b.toString(16)).join('');
    const p = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name, salt,
      pinHash: pin ? await this.hashPin(pin, salt) : null, created: Date.now(), last: Date.now() };
    all.push(p); this.saveList(all);
    return p;
  },
  async verify(p, pin) { return !p.pinHash || (await this.hashPin(pin || '', p.salt)) === p.pinHash; },
  remove(p) {
    this.saveList(this.list().filter((x) => x.id !== p.id));
    try { localStorage.removeItem(this.saveKeyOf(p)); } catch (e) { /* 무시 */ }
  },
  // 이 기기에서 다음부터 로그인 화면 없이 바로 시작할 계정 (로그아웃하면 해제)
  AUTO_KEY: 'project_dungeon_autologin_v1',
  getAuto() { try { const id = localStorage.getItem(this.AUTO_KEY); return id ? this.list().find((p) => p.id === id) || null : null; } catch (e) { return null; } },
  setAuto(p) { try { if (p) localStorage.setItem(this.AUTO_KEY, p.id); else localStorage.removeItem(this.AUTO_KEY); } catch (e) { /* 무시 */ } },
  // 계정 목록에 보여줄 진행 요약
  summary(p) {
    try { const s = JSON.parse(localStorage.getItem(this.saveKeyOf(p)) || 'null'); if (!s) return null;
      return { bank: s.bank || 0, best: s.bestStage || 0, run: s.run ? `${s.run.worldIdx + 1}-${s.run.levelIdx + 1}` : null, clears: s.clears || 0 }; } catch (e) { return null; }
  },
  touch() {
    if (!this.current) return;
    const all = this.list(), me = all.find((x) => x.id === this.current.id);
    if (me) { me.last = Date.now(); this.saveList(all); }
  },
  // 계정 시스템 이전의 진행도가 있으면 계정 하나로 옮김
  migrateLegacy() {
    try {
      const legacy = localStorage.getItem(SAVE_KEY);
      if (!legacy || this.list().length) return;
      const p = { id: 'p_legacy', name: '플레이어', salt: '', pinHash: null, created: Date.now(), last: Date.now() };
      localStorage.setItem(this.saveKeyOf(p), legacy); this.saveList([p]);
    } catch (e) { /* 무시 */ }
  }
};
