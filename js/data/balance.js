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
  armoryPrice: { common: 80, uncommon: 160, rare: 320, epic: 600, legendary: 1100 },
  // 무기 드롭 가중치 (영웅은 월드마다 +epicPerWorld, 전설은 +legendaryPerWorld)
  rarityWeight: { common: 5, uncommon: 4, rare: 3, epic: 1.5, legendary: 0.1 }, epicPerWorld: 0.8, legendaryPerWorld: 0.06,
  // 상자·상점 무기 등급 확률(%) — 필드별 [고급, 희귀, 영웅, 전설]. 낮은 층에서는 높은 등급이 드묾 (마지막 줄은 그 뒤 모든 필드)
  rarityByWorld: [[84, 15, 1, 0], [76, 22, 2, 0], [68, 28, 3.8, 0.2], [60, 33, 6.6, 0.4], [54, 37, 8.4, 0.6], [48, 40, 11, 1], [43, 42, 13.5, 1.5], [38, 44, 16, 2], [34, 45, 18.5, 2.5], [30, 46, 21, 3]],
  // 로비 재화: 던전 골드와 별도. 런이 끝날 때 결과에 따라 지급 (캐릭터 해금·무기고에 사용)
  //  기존 골드 적립 속도와 비슷하게 맞춘 값 (조정 가능)
  // 직업 레벨 (결정석으로 영구 소량 강화, 직업마다 따로): 레벨당 능력치, 레벨업 비용 = base + perLevel × (현재 레벨)
  jobLevel: { max: 10, base: 50, perLevel: 30, hp: 3, atk: 0.015, energy: 3 },
  lobbyCurrency: { name: '결정석', color: '#7ad0ff', perStage: 15, perBoss: 40, victory: 80 },
  bossHealRatio: 0.5,         // 월드 보스 처치 시 최대 체력 대비 회복
  // 정예 몬스터: 2월드부터 등장, 확률 = base + perWorld × (월드-1)
  elite: { fromWorld: 1, base: 0.08, perWorld: 0.03, hp: 2.2, dmg: 1.2, gold: 3 },
  // 특수방: 일반 스테이지마다 하나씩 무작위 (가격은 상점처럼 스테이지마다 오름)
  specialRooms: { chance: 0.5, weight: {},
    // 전직의 방: 진화 단계별로 나오기 시작하는 필드(0부터)와 다른 특수방 대비 가중치 → 2차(최종) 진화는 대략 8필드쯤 (모의 실험: 중앙값 8필드, 절반이 7~9필드)
    evolveByRank: [{ fromWorld: 1, weight: 2.3 }, { fromWorld: 6, weight: 8.3 }],
    pool: ['fountain', 'altar', 'gamble', 'challenge', 'forge', 'blood', 'rack', 'smithy', 'evolve'], fountainHeal: 0.4, altarPrice: 60, gamblePrice: 25,
    forgePrice: 50, forgeUpChance: 0.3, bloodCost: 0.2,
    challenge: { waves: 3, extra: 2, hp: 1.3, dmg: 1.15 } }, // 도전방: 웨이브 수, 웨이브당 추가 몬스터, 정예 위에 더 곱하는 체력·공격력
  // 무기 강화 (그 판 동안만): 단계마다 피해 +perLevel, 최대 maxLevel
  //  비용 = base × (다음 단계) × 등급 배율 × 스테이지 물가, 성공률은 다음 단계 기준 (실패해도 단계 유지)
  upgrade: { maxLevel: 5, perLevel: 0.12, base: 30, chance: [1, 0.9, 0.75, 0.6, 0.45],
    rarityMult: { common: 1, uncommon: 1.2, rare: 1.5, epic: 1.8, legendary: 2.2 }, forgeRoomDiscount: 0.7, forgeRoomBonus: 0.1 },
  // 보스 강화 배율 (전직의 방 상위자는 제외): 체력·공격력·공격 간격
  //  boss = 1~10필드 보스, bossDeep = 심층 보스 (보구를 가진 상태를 기준으로 더 강함)
  boss: { hp: 1.7, dmg: 1.25, cooldown: 0.85 },
  bossDeep: { hp: 1.9, dmg: 1.3, cooldown: 0.8 },
  // 에너지가 모자랄 때 나가는 아주 약한 공격 (피해는 깊이에 따라 조금씩 커짐)
  weakAttack: { damage: 5, interval: 0.4 }
};
