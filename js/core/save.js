'use strict';
// ════════════════════════════════════════════
// 저장 (로비 진행도: 로비 재화(bank), 해금 캐릭터, 발견 무기)
//  bank: 로비 재화 보유량. 예전 저장의 로비 골드는 같은 칸이라 그대로 이어짐
// ════════════════════════════════════════════
const SAVE_KEY = 'project_dungeon_save_v1';
function defaultSave() {
  return { bank: 0, unlocked: ['hero_swordsman', 'hero_gunner'], selected: 'hero_swordsman', armory: [], loadout: null,
    discovered: DATA_HEROES.map((h) => h.startWeapon), clears: 0, bestStage: 0,
    prologueSeen: false, sanctumReached: false, treasures: [], treasureEquipped: null, run: null };
}
// 로그인한 계정의 저장 칸 (게스트는 저장하지 않음)
function loadSave() {
  if (!Auth.current) return defaultSave();
  try {
    const raw = localStorage.getItem(Auth.saveKeyOf(Auth.current));
    if (raw) return Object.assign(defaultSave(), JSON.parse(raw));
  } catch (e) { /* 저장소 사용 불가 */ }
  return defaultSave();
}
function writeSave(s) {
  if (!Auth.current) return;
  try { localStorage.setItem(Auth.saveKeyOf(Auth.current), JSON.stringify(s)); } catch (e) { /* 무시 */ }
  Auth.touch();
}
