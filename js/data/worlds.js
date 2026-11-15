'use strict';
// ════════════════════════════════════════════
// 데이터: 월드 / 버프
// ════════════════════════════════════════════
const DATA_WORLDS = [
  { id: 'world_forest', name: '이끼 숲', boss: 'boss_gel_tyrant', waves: 2,
    enemies: [['enemy_slime_001', 4], ['enemy_goblin_001', 3], ['enemy_boar_001', 2], ['enemy_shroom_001', 2]],
    palette: { floor: ['#24301f', '#283522'], corridor: ['#1e281a', '#212c1d'], wall: '#2f3b2a', wallTop: '#3a4a33',
      wallFace: '#4f6444', faceLine: '#435638', deco: 'rgba(120,200,90,0.35)' } },
  { id: 'world_ice', name: '서리 동굴', boss: 'boss_frost_golem', waves: 2,
    enemies: [['enemy_iceslime_001', 4], ['enemy_frostarcher_001', 3], ['enemy_yeti_001', 2], ['enemy_icemage_001', 2]],
    palette: { floor: ['#26313f', '#2a3646'], corridor: ['#222b37', '#252f3c'], wall: '#3a4a66', wallTop: '#4a5d80',
      wallFace: '#7d9cc4', faceLine: '#6a88b0', deco: 'rgba(230,240,255,0.35)' } },
  { id: 'world_lava', name: '용암 요새', boss: 'boss_flame_lord', waves: 2,
    enemies: [['enemy_imp_001', 3], ['enemy_bomber_001', 3], ['enemy_golem_001', 2], ['enemy_flamecaster_001', 2]],
    palette: { floor: ['#33221f', '#382622'], corridor: ['#2a1c1a', '#2e1f1c'], wall: '#4a2a22', wallTop: '#5e352a',
      wallFace: '#8a4a33', faceLine: '#7a3e2a', deco: 'rgba(255,140,60,0.4)' } }
];
const LOBBY_PALETTE = { style: 'wood', floor: ['#3a2e26', '#3d3129'], corridor: ['#3a2e26', '#3d3129'], wall: '#40354f', wallTop: '#4b3f5c',
  wallFace: '#6a5a82', faceLine: '#5a4c70', deco: null };
const STAGES_PER_WORLD = 3; // x-1, x-2: 일반 / x-3: 보스

const DATA_BUFFS = [
  { id: 'buff_atk', name: '날카로운 칼날', desc: '공격력 +20%', apply: (p) => { p.stats.attackBonus += 0.2; } },
  { id: 'buff_hp', name: '강인함', desc: '최대 체력 +25, 회복', apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { id: 'buff_shield', name: '수호의 갑옷', desc: '최대 보호막 +20', apply: (p) => { p.maxShield += 20; p.shield = p.maxShield; } },
  { id: 'buff_crit', name: '매의 눈', desc: '치명타 확률 +12%', apply: (p) => { p.stats.critChance += 0.12; } },
  { id: 'buff_rate', name: '빠른 손', desc: '공격 속도 +20%', apply: (p) => { p.stats.fireRateBonus += 0.2; } },
  { id: 'buff_energy', name: '마나의 샘', desc: '최대 에너지 +100, 충전', apply: (p) => { p.maxEnergy += 100; p.energy = p.maxEnergy; } },
  { id: 'buff_dash', name: '바람걸음', desc: '대시 쿨타임 -35%', apply: (p) => { p.dashCdMax *= 0.65; } },
  { id: 'buff_speed', name: '날렵함', desc: '이동 속도 +15%', apply: (p) => { p.moveSpeed *= 1.15; } },
  { id: 'buff_vamp', name: '흡혈', desc: '적 처치 시 체력 +2', apply: (p) => { p.vampire += 2; } },
  { id: 'buff_skill', name: '집중', desc: '스킬 쿨타임 -30%', apply: (p) => { p.skillCdMax *= 0.7; } }
];
