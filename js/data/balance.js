'use strict';
// ════════════════════════════════════════════
// 밸런스 설정: 난이도 곡선 / 경제 / 드롭률
//  밸런스 패치는 대부분 이 파일과 data/*.js의 수치만 고치면 됨
// ════════════════════════════════════════════
const BALANCE = {
  // 스테이지 진행(0~23)에 따른 적 강화: 체력 ×(1 + hp×i), 공격력 ×(1 + dmg×i)
  //  taperFrom 이후(5월드~)는 증가폭 ×taper (5·6월드 적은 기본 능력치가 이미 높음)
  stageScale: { hp: 0.13, dmg: 0.045, taperFrom: 15, taper: 0.5 },
  // 전투방 웨이브당 적 수 = min(max, base + 월드 + 레벨×perLevel(내림) + 0~rand)
  waveSize: { base: 3, perLevel: 0.5, rand: 1, max: 8 },
  // 적 처치 보상
  killGoldMult: 0.5,          // def.rewardGold × 배율 (최소 1)
  killEnergyChance: 0.5, killEnergyValue: 5,
  killHpChance: 0.04, killHpValue: 15,
  // 방 클리어 보상
  roomEnergyOrbs: [4, 6], roomEnergyValue: 8,
  roomChestChance: 0.3,
  roomHpChance: 0.3, roomHpValue: 15,
  // 상점 (스테이지마다 가격 +inflate)
  shopInflate: 0.06,
  shopPrice: { common: 20, uncommon: 35, rare: 55, epic: 85, legendary: 130, hp: 15, energy: 12 },
  // 로비 무기고 해금 가격
  armoryPrice: { common: 30, uncommon: 60, rare: 120, epic: 220, legendary: 400 },
  // 무기 드롭 가중치 (영웅은 월드마다 +epicPerWorld, 전설은 +legendaryPerWorld)
  rarityWeight: { common: 5, uncommon: 4, rare: 3, epic: 1.5, legendary: 0.25 }, epicPerWorld: 0.8, legendaryPerWorld: 0.2,
  // 로비 재화: 던전 골드와 별도. 런이 끝날 때 결과에 따라 지급 (캐릭터 해금·무기고에 사용)
  //  기존 골드 적립 속도와 비슷하게 맞춘 값 (조정 가능)
  lobbyCurrency: { name: '결정석', color: '#7ad0ff', perStage: 15, perBoss: 40, victory: 80 },
  bossHealRatio: 0.5,         // 월드 보스 처치 시 최대 체력 대비 회복
  // 정예 몬스터: 2월드부터 등장, 확률 = base + perWorld × (월드-1)
  elite: { fromWorld: 1, base: 0.08, perWorld: 0.03, hp: 2.2, dmg: 1.2, gold: 3 }
};
