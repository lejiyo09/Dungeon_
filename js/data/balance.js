'use strict';
// ════════════════════════════════════════════
// 밸런스 설정: 난이도 곡선 / 경제 / 드롭률
//  밸런스 패치는 대부분 이 파일과 data/*.js의 수치만 고치면 됨
// ════════════════════════════════════════════
const BALANCE = {
  // 스테이지 진행(0~8)에 따른 적 강화: 체력 ×(1 + hp×i), 공격력 ×(1 + dmg×i)
  stageScale: { hp: 0.12, dmg: 0.06 },
  // 전투방 웨이브당 적 수 = min(max, base + 월드 + 레벨 + 0~rand)
  waveSize: { base: 3, rand: 1, max: 8 },
  // 적 처치 보상
  killGoldMult: 0.5,          // def.rewardGold × 배율 (최소 1)
  killEnergyChance: 0.5, killEnergyValue: 5,
  killHpChance: 0.04, killHpValue: 15,
  // 방 클리어 보상
  roomEnergyOrbs: [4, 6], roomEnergyValue: 8,
  roomChestChance: 0.3,
  roomHpChance: 0.25, roomHpValue: 15,
  // 상점 (스테이지마다 가격 +inflate)
  shopInflate: 0.1,
  shopPrice: { common: 20, uncommon: 35, rare: 55, epic: 85, hp: 15, energy: 12 },
  // 로비 무기고 해금 가격
  armoryPrice: { common: 30, uncommon: 60, rare: 120, epic: 220 },
  // 무기 드롭 가중치 (영웅은 월드마다 +epicPerWorld)
  rarityWeight: { common: 5, uncommon: 4, rare: 3, epic: 1.5 }, epicPerWorld: 0.8,
  victoryBonusGold: 50
};
