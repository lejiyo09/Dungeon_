'use strict';
// ════════════════════════════════════════════
// 저장 (로비 진행도: 골드, 해금 캐릭터, 발견 무기)
// ════════════════════════════════════════════
const SAVE_KEY = 'project_dungeon_save_v1';
function defaultSave() {
  return { bank: 0, unlocked: ['hero_swordsman', 'hero_gunner'], selected: 'hero_swordsman', armory: [], loadout: null,
    discovered: DATA_HEROES.map((h) => h.startWeapon), clears: 0, bestStage: 0 };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return Object.assign(defaultSave(), JSON.parse(raw));
  } catch (e) { /* 저장소 사용 불가 */ }
  return defaultSave();
}
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* 무시 */ } }
