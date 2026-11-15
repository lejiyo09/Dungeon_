'use strict';
// ════════════════════════════════════════════
// 데이터: 적 / 보스
// ════════════════════════════════════════════
const DATA_ENEMIES = [
  // ── 1월드: 이끼 숲
  { id: 'enemy_slime_001', name: '슬라임', sprite: 'slime', color: '#6fd35f', aiType: 'melee_chase',
    health: 40, damage: 10, moveSpeed: 62, hitboxHalf: 6, attackRange: 18, telegraphTime: 0.45,
    attackCooldown: 1.4, recoveryTime: 0.5, rewardGold: 2 },
  { id: 'enemy_goblin_001', name: '고블린 궁수', sprite: 'goblin', color: '#9cc050', aiType: 'ranged_kite',
    health: 30, damage: 8, moveSpeed: 55, hitboxHalf: 6, preferredRange: 120, attackRange: 230,
    telegraphTime: 0.5, attackCooldown: 1.8, recoveryTime: 0.3, bulletSpeed: 150, bulletCount: 1, rewardGold: 2 },
  { id: 'enemy_boar_001', name: '돌진 멧돼지', sprite: 'boar', color: '#8a4a3a', aiType: 'charger',
    health: 70, damage: 14, moveSpeed: 45, hitboxHalf: 7, attackRange: 150, telegraphTime: 0.6,
    dashSpeed: 290, dashDuration: 0.55, attackCooldown: 2.0, recoveryTime: 0.4, stunTime: 1.0, rewardGold: 3 },
  { id: 'enemy_shroom_001', name: '포자 버섯', sprite: 'shroom', color: '#d04a4a', aiType: 'caster',
    health: 45, damage: 8, moveSpeed: 22, hitboxHalf: 6, attackRange: 240, telegraphTime: 0.8,
    attackCooldown: 3.0, recoveryTime: 0.4, bulletSpeed: 80, bulletCount: 6, bulletColor: '#c0ff70', rewardGold: 2 },
  // ── 2월드: 서리 동굴
  { id: 'enemy_iceslime_001', name: '얼음 슬라임', sprite: 'slime', color: '#7ac8ff', aiType: 'melee_chase',
    health: 55, damage: 12, moveSpeed: 70, hitboxHalf: 6, attackRange: 18, telegraphTime: 0.4,
    attackCooldown: 1.3, recoveryTime: 0.45, rewardGold: 2 },
  { id: 'enemy_frostarcher_001', name: '서리 궁수', sprite: 'goblin', color: '#7ab0e0', aiType: 'ranged_kite',
    health: 40, damage: 10, moveSpeed: 58, hitboxHalf: 6, preferredRange: 130, attackRange: 240,
    telegraphTime: 0.55, attackCooldown: 2.0, recoveryTime: 0.3, bulletSpeed: 150, bulletCount: 3, bulletSpread: 0.22,
    bulletColor: '#9ad8ff', rewardGold: 3 },
  { id: 'enemy_yeti_001', name: '설인', sprite: 'yeti', color: '#e8f0ff', aiType: 'charger',
    health: 110, damage: 15, moveSpeed: 48, hitboxHalf: 8, attackRange: 160, telegraphTime: 0.6,
    dashSpeed: 310, dashDuration: 0.55, attackCooldown: 2.0, recoveryTime: 0.4, stunTime: 0.9, knockbackResist: 0.4, rewardGold: 4 },
  { id: 'enemy_icemage_001', name: '빙결 술사', sprite: 'mage', color: '#2a4a8a', aiType: 'caster',
    health: 60, damage: 10, moveSpeed: 28, hitboxHalf: 6, attackRange: 260, telegraphTime: 0.7,
    attackCooldown: 2.5, recoveryTime: 0.4, bulletSpeed: 100, bulletCount: 12, bulletColor: '#9ad8ff', rewardGold: 3 },
  // ── 3월드: 용암 요새
  { id: 'enemy_imp_001', name: '화염 임프', sprite: 'imp', color: '#e04a2a', aiType: 'ranged_kite',
    health: 40, damage: 10, moveSpeed: 78, hitboxHalf: 5, preferredRange: 110, attackRange: 230,
    telegraphTime: 0.45, attackCooldown: 1.8, recoveryTime: 0.25, bulletSpeed: 170, bulletCount: 3, bulletSpread: 0.15,
    bulletColor: '#ff8a3a', rewardGold: 3 },
  { id: 'enemy_bomber_001', name: '자폭병', sprite: 'bomber', color: '#2a2a2a', aiType: 'exploder',
    health: 30, damage: 26, moveSpeed: 88, hitboxHalf: 6, telegraphTime: 0.55, explodeRadius: 34, rewardGold: 2 },
  { id: 'enemy_golem_001', name: '용암 골렘', sprite: 'golem', color: '#7a4a2a', aiType: 'melee_chase',
    health: 170, damage: 17, moveSpeed: 38, hitboxHalf: 8, attackRange: 26, telegraphTime: 0.6,
    attackCooldown: 1.6, recoveryTime: 0.6, knockbackResist: 0.7, rewardGold: 5 },
  { id: 'enemy_flamecaster_001', name: '화염 술사', sprite: 'mage', color: '#8a2a1a', aiType: 'caster',
    health: 70, damage: 12, moveSpeed: 28, hitboxHalf: 6, attackRange: 260, telegraphTime: 0.7,
    attackCooldown: 2.8, recoveryTime: 0.4, bulletSpeed: 105, bulletCount: 12, bulletColor: '#ff7a3a', rewardGold: 4 },
  // ── 로비 허수아비
  { id: 'dummy_001', name: '훈련용 허수아비', sprite: 'dummy', aiType: 'dummy', dummy: true,
    health: 99999, damage: 0, moveSpeed: 0, hitboxHalf: 7, knockbackResist: 1, rewardGold: 0 },
  // ── 보스 (patterns: BOSS_PATTERNS 키 + 파라미터)
  { id: 'boss_gel_tyrant', name: '젤리 폭군', sprite: 'boss_gel', color: '#c060c0', enrageColor: '#e0508a', boss: true, aiType: 'boss',
    health: 900, damage: 12, moveSpeed: 40, hitboxHalf: 14, knockbackResist: 0.9, attackCooldown: 1.5, bulletSpeed: 120,
    rewardGold: 30, patterns: [
      { type: 'radial', rings: 3, count: 18, color: '#ff70d0' },
      { type: 'aimed', volleys: 3, count: 5, spread: 0.16, color: '#ffb0f0' },
      { type: 'summon', enemyId: 'enemy_slime_001', count: 3 },
      { type: 'slam', radius: 44, color: '#ff70d0' }],
    enragePatterns: [{ type: 'zones', count: 6, radius: 24, delay: 0.9, bullets: 4, spreadAround: 90, stagger: 0.1, color: '#ff70d0' }] },
  { id: 'boss_frost_golem', name: '서리 거상', sprite: 'boss_frost', color: '#7a9ac8', enrageColor: '#9ac0ff', boss: true, aiType: 'boss',
    health: 1150, damage: 14, moveSpeed: 36, hitboxHalf: 15, knockbackResist: 0.95, attackCooldown: 1.4, bulletSpeed: 125,
    rewardGold: 40, patterns: [
      { type: 'radial', rings: 2, count: 24, color: '#9ad8ff' },
      { type: 'charge', dashes: 3, speed: 330, color: '#cfefff' },
      { type: 'zones', count: 5, radius: 26, delay: 0.9, bullets: 6, spreadAround: 70, color: '#9ad8ff' },
      { type: 'aimed', volleys: 4, count: 3, spread: 0.2, color: '#cfefff' }],
    enragePatterns: [{ type: 'spiral', duration: 2.2, arms: 3, interval: 0.09, spin: 1.8, color: '#9ad8ff' },
      { type: 'charge', dashes: 4, speed: 390, color: '#ffffff' }] },
  { id: 'boss_flame_lord', name: '화염 군주', sprite: 'boss_flame', color: '#3a1a1a', enrageColor: '#5a1010', boss: true, aiType: 'boss',
    health: 900, damage: 15, moveSpeed: 42, hitboxHalf: 14, knockbackResist: 0.95, attackCooldown: 1.3, bulletSpeed: 130,
    rewardGold: 60, patterns: [
      { type: 'spiral', duration: 2.6, arms: 3, interval: 0.07, spin: 2.2, color: '#ff8a3a' },
      { type: 'zones', count: 6, radius: 32, delay: 1.1, bullets: 0, spreadAround: 110, stagger: 0.12, color: '#ff5a2a' },
      { type: 'aimed', volleys: 4, count: 7, spread: 0.13, color: '#ffb070' },
      { type: 'summon', enemyId: 'enemy_imp_001', count: 2 }],
    enragePatterns: [{ type: 'radial', rings: 3, count: 22, color: '#ffb040' }] }
];
