'use strict';
// ════════════════════════════════════════════
// 저장 (로비 진행도: 로비 재화(bank), 해금 캐릭터, 발견 무기)
//  bank: 로비 재화 보유량. 예전 저장의 로비 골드는 같은 칸이라 그대로 이어짐
// ════════════════════════════════════════════
const SAVE_KEY = 'project_dungeon_save_v1';
function freeHeroes() { return DATA_HEROES.filter((h) => h.price === 0).map((h) => h.id); } // 기본 해금 (가격 0)
function defaultSave() {
  return { bank: 0, unlocked: freeHeroes(), selected: 'hero_swordsman', armory: [], loadout: null,
    discovered: DATA_HEROES.map((h) => h.startWeapon), clears: 0, bestStage: 0,
    prologueSeen: false, sanctumReached: false, treasures: [], treasureEquipped: null, run: null, jobLv: {} };
}
// 로그인한 계정의 저장 칸 (게스트는 저장하지 않음)
function loadSave() {
  if (!Auth.current) return defaultSave();
  try {
    const raw = localStorage.getItem(Auth.saveKeyOf(Auth.current));
    if (raw) { const s = Object.assign(defaultSave(), JSON.parse(raw)); for (const id of freeHeroes()) if (!s.unlocked.includes(id)) s.unlocked.push(id); return s; } // 나중에 기본 해금된 직업도 열어 줌
  } catch (e) { /* 저장소 사용 불가 */ }
  return defaultSave();
}
function writeSave(s) {
  if (!Auth.current) return;
  try { localStorage.setItem(Auth.saveKeyOf(Auth.current), JSON.stringify(s)); } catch (e) { /* 무시 */ }
  Auth.touch();
}
