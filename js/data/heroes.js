'use strict';
// ════════════════════════════════════════════
// 데이터: 플레이어 공통 / 캐릭터
// ════════════════════════════════════════════
const DATA_PLAYER_BASE = {
  hitboxHalf: 5, dashSpeed: 400, dashDuration: 0.18, dashInvuln: 0.22, dashCooldown: 1.8,
  hurtInvuln: 0.7, critChance: 0.08, critMultiplier: 1.8,
  shieldRegenDelay: 2.5, shieldRegenRate: 15, weaponSlots: 2
};

const DATA_HEROES = [
  { id: 'hero_swordsman', name: '검사 레온', title: '근접 전투의 달인', price: 0,
    maxHp: 130, maxShield: 55, maxEnergy: 190, moveSpeed: 115, startWeapon: 'weapon_sword_001',
    skill: 'whirlwind', skillName: '회오리 베기', skillDesc: '주변을 베고 적 탄환을 지움', skillCooldown: 6,
    passiveName: '단련된 갑옷', passiveDesc: '받는 피해 15% 감소', damageReduction: 0.15,
    look: { sprite: 'knight', body: '#b84a4a', accent: '#e04848' } },
  { id: 'hero_gunner', name: '사수 미라', title: '총기 전문가', price: 0,
    maxHp: 90, maxShield: 50, maxEnergy: 200, moveSpeed: 120, startWeapon: 'weapon_pistol_001',
    skill: 'overdrive', skillName: '과부하 사격', skillDesc: '4초간 공격 속도 2배, 에너지 무소모', skillCooldown: 15,
    passiveName: '탄약 절약', passiveDesc: '무기 에너지 소모 -20%', energySave: 0.2,
    look: { sprite: 'gunslinger', body: '#3a5a8a', accent: '#8a5a34' } },
  { id: 'hero_mage', name: '마도사 엘린', title: '원소 마법사', price: 100,
    maxHp: 115, maxShield: 50, maxEnergy: 290, moveSpeed: 116, startWeapon: 'weapon_wand_001',
    skill: 'frost_nova', skillName: '서리 폭발', skillDesc: '주변 적 피해 + 빙결, 탄환 제거', skillCooldown: 6,
    passiveName: '원소 친화', passiveDesc: '상태이상(화상·빙결·중독) 효과 +30%', statusBoost: 0.3,
    look: { sprite: 'wizard', body: '#6a4ab0', accent: '#3a2a80' } },
  { id: 'hero_engineer', name: '기술자 보로', title: '포탑 설계자', price: 200,
    maxHp: 100, maxShield: 45, maxEnergy: 220, moveSpeed: 112, startWeapon: 'weapon_rivet_001',
    skill: 'turret', skillName: '자동 포탑', skillDesc: '12초간 적을 쏘는 포탑 설치', skillCooldown: 13,
    passiveName: '손재주', passiveDesc: '무기 강화 비용 -20%', upgradeDiscount: 0.2,
    look: { sprite: 'engineer', body: '#d07a2a', accent: '#f0c030' } },
  { id: 'hero_assassin', name: '암살자 카이', title: '그림자 속의 칼날', price: 300,
    maxHp: 85, maxShield: 45, maxEnergy: 180, moveSpeed: 130, startWeapon: 'weapon_dagger_001',
    skill: 'blink', skillName: '그림자 습격', skillDesc: '조준 방향으로 순간이동하며 지나간 적을 벰 (잠깐 무적)', skillCooldown: 5,
    passiveName: '급소 노리기', passiveDesc: '치명타 확률 +15%', critBonus: 0.15,
    look: { sprite: 'assassin', body: '#3a3048', accent: '#c03040' } },
  { id: 'hero_priest', name: '사제 세라', title: '빛의 수호자', price: 400,
    maxHp: 110, maxShield: 60, maxEnergy: 230, moveSpeed: 112, startWeapon: 'weapon_ironstaff_001',
    skill: 'sanctuary', skillName: '성역', skillDesc: '6초간 빛의 원: 안에 있으면 회복, 들어오는 적 탄 소멸', skillCooldown: 16,
    passiveName: '축복', passiveDesc: '전투방을 정리할 때마다 체력 +5', roomHeal: 5,
    look: { sprite: 'priest', body: '#e8e0d0', accent: '#d0a040' } },
  { id: 'hero_berserker', name: '광전사 바르그', title: '피에 굶주린 전사', price: 500,
    maxHp: 150, maxShield: 45, maxEnergy: 160, moveSpeed: 114, startWeapon: 'weapon_club_001',
    skill: 'rage', skillName: '분노', skillDesc: '5초간 공격력 +60%, 이동 속도 +20%', skillCooldown: 14,
    passiveName: '피의 갈증', passiveDesc: '체력 50% 이하일 때 공격력 +30%', lowHpBonus: 0.3,
    look: { sprite: 'berserker', body: '#8a5a3a', accent: '#a02a2a' } },
  { id: 'hero_druid', name: '드루이드 이반', title: '숲의 부름', price: 600,
    maxHp: 120, maxShield: 60, maxEnergy: 240, moveSpeed: 118, startWeapon: 'weapon_sling_001',
    skill: 'wolves', skillName: '영혼 늑대', skillDesc: '12초간 적을 물어뜯는 늑대 3마리 소환', skillCooldown: 13,
    passiveName: '자연의 가호', passiveDesc: '보호막 회복 속도 +60%', shieldRegenMul: 1.6,
    look: { sprite: 'druid', body: '#4a7a3a', accent: '#6a4628' } }
];
