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
    prologueSeen: false, sanctumReached: false, treasures: [], treasureEquipped: null, run: null, runReviveUsed: false, jobLv: {}, skins: [], skinOn: {}, giftsUsed: [], lineChoice: {}, skinGacha:{pity:0,shards:0,total:0} };
}
// 깨진 저장 정리: 형식이 이상한 칸은 기본값으로 (게임이 멈추거나 이어하기 창에 갇히지 않게)
function sanitizeSave(s) {
  const D = defaultSave();
  if (!s || typeof s !== 'object' || Array.isArray(s)) return D;
  for (const k of ['unlocked', 'armory', 'discovered', 'treasures', 'skins', 'giftsUsed']) if (!Array.isArray(s[k])) s[k] = D[k];
  for (const k of ['jobLv', 'skinOn', 'lineChoice']) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = D[k];
  for (const k of ['bank', 'clears', 'bestStage']) if (typeof s[k] !== 'number' || !isFinite(s[k])) s[k] = D[k];
  if (!s.skinGacha || typeof s.skinGacha !== 'object' || Array.isArray(s.skinGacha)) s.skinGacha = D.skinGacha;\n  if (s.stats && typeof s.stats !== 'object') s.stats = {};
  for (const k of ['guild', 'merlin', 'babylon']) if (s[k] && (typeof s[k] !== 'object' || Array.isArray(s[k]))) delete s[k]; // 다시 만들어짐
  if (s.supplies && !Array.isArray(s.supplies)) s.supplies = [];
  if (s.deepCheckpoints && typeof s.deepCheckpoints !== 'object') s.deepCheckpoints = {};
  if (s.gambleCards && !(Array.isArray(s.gambleCards) && s.gambleCards.length === 3)) s.gambleCards = null;
  const r = s.run, okRun = r && typeof r === 'object' && DATA_HEROES.some((h) => h.id === r.hero) && Number.isInteger(r.worldIdx) && r.worldIdx >= 0 && Number.isInteger(r.levelIdx) && r.levelIdx >= 0 && r.levelIdx < STAGES_PER_WORLD && r.p && typeof r.p === 'object' && Array.isArray(r.p.weapons);
  if (r && !okRun) s.run = null; // 이어하기 기록이 깨졌으면 버림
  if (!DATA_HEROES.some((h) => h.id === s.selected)) s.selected = D.selected;
  return s;
}
// 로그인한 계정의 저장 칸 (게스트는 저장하지 않음)
function loadSave() {
  if (!Auth.current) return defaultSave();
  try {
    const raw = localStorage.getItem(Auth.saveKeyOf(Auth.current));
    if (raw) { const s = sanitizeSave(Object.assign(defaultSave(), JSON.parse(raw))); for (const id of freeHeroes()) if (!s.unlocked.includes(id)) s.unlocked.push(id); return s; } // 나중에 기본 해금된 직업도 열어 줌
  } catch (e) { /* 저장소 사용 불가 */ }
  return defaultSave();
}
function writeSave(s) {
  if (!Auth.current) return;
  try { localStorage.setItem(Auth.saveKeyOf(Auth.current), JSON.stringify(s)); } catch (e) { /* 무시 */ }
  Auth.touch();
}
