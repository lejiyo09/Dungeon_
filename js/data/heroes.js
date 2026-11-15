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
    look: { body: '#b84a4a', head: '#c9d6e0', hat: 'helm', accent: '#e04848' } },
  { id: 'hero_gunner', name: '사수 미라', title: '총기 전문가', price: 0,
    maxHp: 90, maxShield: 50, maxEnergy: 200, moveSpeed: 120, startWeapon: 'weapon_pistol_001',
    skill: 'overdrive', skillName: '과부하 사격', skillDesc: '4초간 공격 속도 2배, 에너지 무소모', skillCooldown: 13,
    look: { body: '#3a8fd0', head: '#f0c8a0', hat: 'cap', accent: '#7a5a3a' } },
  { id: 'hero_mage', name: '마도사 엘린', title: '원소 마법사', price: 100,
    maxHp: 100, maxShield: 45, maxEnergy: 290, moveSpeed: 116, startWeapon: 'weapon_wand_001',
    skill: 'frost_nova', skillName: '서리 폭발', skillDesc: '주변 적 피해 + 빙결, 탄환 제거', skillCooldown: 7,
    look: { body: '#6a4ab0', head: '#f0c8a0', hat: 'wizard', accent: '#4a3290' } },
  { id: 'hero_engineer', name: '기술자 보로', title: '포탑 설계자', price: 200,
    maxHp: 100, maxShield: 45, maxEnergy: 220, moveSpeed: 112, startWeapon: 'weapon_rivet_001',
    skill: 'turret', skillName: '자동 포탑', skillDesc: '12초간 적을 쏘는 포탑 설치', skillCooldown: 13,
    look: { body: '#c08a30', head: '#f0c8a0', hat: 'goggles', accent: '#5a4a3a' } }
];
