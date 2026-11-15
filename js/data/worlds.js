'use strict';
// ════════════════════════════════════════════
// 데이터: 월드 / 버프
// ════════════════════════════════════════════
const DATA_WORLDS = [
  { id: 'world_forest', name: '이끼 숲', boss: 'boss_gel_tyrant', waves: 2,
    enemies: [['enemy_slime_001', 4], ['enemy_goblin_001', 3], ['enemy_boar_001', 2], ['enemy_shroom_001', 2]],
    palette: { style: 'moss', accent: '#a0e070', floor: ['#3a4236', '#3e4639'], corridor: ['#1e281a', '#212c1d'], wall: '#2f3b2a', wallTop: '#3a4a33',
      wallFace: '#4f6444', faceLine: '#435638', deco: 'rgba(120,200,90,0.35)' } },
  { id: 'world_ice', name: '서리 동굴', boss: 'boss_frost_golem', waves: 2,
    enemies: [['enemy_iceslime_001', 4], ['enemy_frostarcher_001', 3], ['enemy_yeti_001', 2], ['enemy_icemage_001', 2]],
    palette: { style: 'ice', accent: '#bfefff', floor: ['#34485e', '#384c62'], corridor: ['#222b37', '#252f3c'], wall: '#3a4a66', wallTop: '#4a5d80',
      wallFace: '#7d9cc4', faceLine: '#6a88b0', deco: 'rgba(230,240,255,0.35)' } },
  { id: 'world_lava', name: '용암 요새', boss: 'boss_flame_lord', waves: 2,
    enemies: [['enemy_imp_001', 3], ['enemy_bomber_001', 3], ['enemy_golem_001', 2], ['enemy_flamecaster_001', 2]],
    palette: { style: 'basalt', accent: '#ff8a3a', floor: ['#2e2426', '#322729'], corridor: ['#2a1c1a', '#2e1f1c'], wall: '#4a2a22', wallTop: '#5e352a',
      wallFace: '#8a4a33', faceLine: '#7a3e2a', deco: 'rgba(255,140,60,0.4)' } },
  { id: 'world_void', name: '공허 성채', boss: 'boss_void_eye', waves: 2,
    enemies: [['enemy_wraith_001', 3], ['enemy_hound_001', 3], ['enemy_crystal_001', 2], ['enemy_voidcaster_001', 2]],
    palette: { style: 'void', accent: '#c8a0ff', floor: ['#1e1a2e', '#221d33'], corridor: ['#18152a', '#1b172d'], wall: '#2a2244', wallTop: '#3a2f5c',
      wallFace: '#5a4a8a', faceLine: '#4a3c78', deco: 'rgba(180,120,255,0.4)' } },
  { id: 'world_sand', name: '모래 무덤', boss: 'boss_sarcophagus', waves: 2,
    enemies: [['enemy_scarab_001', 4], ['enemy_skelarcher_001', 3], ['enemy_sandworm_001', 2], ['enemy_sandmage_001', 2]],
    palette: { style: 'sand', accent: '#ffd06a', floor: ['#6a5638', '#6e5a3b'], corridor: ['#4a3c28', '#4d3f2a'], wall: '#7a6440', wallTop: '#8e7650',
      wallFace: '#a88a58', faceLine: '#957a4c', deco: 'rgba(255,210,120,0.35)' } },
  { id: 'world_clock', name: '태엽 공장', boss: 'boss_clock_titan', waves: 2,
    enemies: [['enemy_clockbomb_001', 3], ['enemy_ironknight_001', 3], ['enemy_gunbot_001', 3], ['enemy_teslatower_001', 2]],
    palette: { style: 'metal', accent: '#7affff', floor: ['#3a3e44', '#3d4148'], corridor: ['#2a2d32', '#2c3035'], wall: '#4a4e56', wallTop: '#5c616a',
      wallFace: '#7a808a', faceLine: '#686e78', deco: 'rgba(120,240,255,0.35)' } },
  { id: 'world_swamp', name: '독 늪지', boss: 'boss_toad_king', waves: 2,
    enemies: [['enemy_toad_001', 4], ['enemy_wasp_001', 3], ['enemy_croc_001', 2], ['enemy_witch_001', 2]],
    palette: { style: 'swamp', accent: '#9aff5a', floor: ['#2e3a2a', '#313e2c'], corridor: ['#1e2a1e', '#202c20'], wall: '#33402e', wallTop: '#3e4e36',
      wallFace: '#55684a', faceLine: '#485a3e', deco: 'rgba(150,255,90,0.35)' } },
  { id: 'world_bone', name: '망자의 성', boss: 'boss_lich_king', waves: 2,
    enemies: [['enemy_skelknight_001', 3], ['enemy_ghost_001', 3], ['enemy_skullbomb_001', 2], ['enemy_bonemage_001', 2]],
    palette: { style: 'bone', accent: '#7affc0', floor: ['#2a2830', '#2d2b34'], corridor: ['#1c1a22', '#1e1c24'], wall: '#3a3644', wallTop: '#4a4556',
      wallFace: '#625c70', faceLine: '#544e62', deco: 'rgba(120,255,190,0.35)' } },
  { id: 'world_mine', name: '수정 광산', boss: 'boss_crystal_queen', waves: 2,
    enemies: [['enemy_bat_001', 4], ['enemy_mole_001', 2], ['enemy_cspider_001', 3], ['enemy_cgolem_001', 2]],
    palette: { style: 'mine', accent: '#ff7ad0', floor: ['#3a3230', '#3d3533'], corridor: ['#2a2422', '#2c2624'], wall: '#4a3e3a', wallTop: '#5a4c46',
      wallFace: '#7a6860', faceLine: '#6a5a52', deco: 'rgba(255,120,210,0.35)' } },
  // 제10 필드 '기원의 성역' (기획서 6장). 필드의 실제 층수·고유 몬스터는 미정
  //  → 층 구성은 기존 시스템(4스테이지)을 따르고, 몬스터는 임시로 앞선 필드의 몬스터를 섞어 씀
  { id: 'world_origin', name: '기원의 성역', boss: 'boss_nameless_gatekeeper', waves: 2, sanctum: true,
    enemies: [['enemy_ghost_001', 3], ['enemy_skelknight_001', 2], ['enemy_cgolem_001', 2], ['enemy_crystal_001', 2]],
    palette: { style: 'sanctum', accent: '#ffe9a0', floor: ['#4a4652', '#4d4955'], corridor: ['#34313c', '#36333e'], wall: '#5a5666', wallTop: '#6c6878',
      wallFace: '#8e8a9c', faceLine: '#7c788a', deco: 'rgba(255,233,160,0.35)' } }
];
// ── 심층 (기획서 10장: 전설의 존재 아래로 무한히 이어짐)
//  [사용자 결정] 같은 런에서 계속 내려감 · 무한 · 새 심층 테마와 보스. 아래 테마·몬스터·보스는 세계관과 엮지 않은 임시 디자인
//  심층 필드는 아래 테마가 차례로 반복되고, 깊이 내려갈수록 기존 스테이지 강화 곡선대로 계속 강해짐
const DEEP_WORLDS = [
  { id: 'deep_abyss', name: '잿빛 심연', boss: 'boss_abyss_maw', waves: 2, deep: true,
    enemies: [['enemy_abyssjelly_001', 3], ['enemy_bonecrawler_001', 2], ['enemy_eyebat_001', 4], ['enemy_sporetower_001', 2]],
    palette: { style: 'abyss', accent: '#5affd8', floor: ['#1e2226', '#202428'], corridor: ['#15181b', '#16191c'], wall: '#2a2f34', wallTop: '#353b42',
      wallFace: '#4a525a', faceLine: '#3e454c', deco: 'rgba(90,255,216,0.35)' } },
  { id: 'deep_starfall', name: '부서진 별의 정원', boss: 'boss_fallen_star', waves: 2, deep: true,
    enemies: [['enemy_starwisp_001', 3], ['enemy_meteorgolem_001', 2], ['enemy_cometdog_001', 3], ['enemy_nebulamage_001', 2]],
    palette: { style: 'starfall', accent: '#9ad8ff', floor: ['#1a1e36', '#1c2039'], corridor: ['#12152a', '#13162c'], wall: '#262c4e', wallTop: '#30375e',
      wallFace: '#4a5488', faceLine: '#3e4878', deco: 'rgba(154,216,255,0.35)' } }
];
const DEEP_START = DATA_WORLDS.length; // 이 번호부터 심층
function worldDef(i) {
  if (i < DEEP_START) return DATA_WORLDS[i];
  const d = i - DEEP_START, base = DEEP_WORLDS[d % DEEP_WORLDS.length];
  return Object.assign({}, base, { depth: d + 1, name: `${base.name}` });
}
// 화면 표시용 스테이지 이름: 1-1 ~ 10-4, 심층은 '심층 1-1'
function stageLabel(w, l) { return w >= DEEP_START ? `심층 ${w - DEEP_START + 1}-${l + 1}` : `${w + 1}-${l + 1}`; }
const LOBBY_PALETTE = { style: 'wood', floor: ['#3a2e26', '#3d3129'], corridor: ['#3a2e26', '#3d3129'], wall: '#40354f', wallTop: '#4b3f5c',
  wallFace: '#6a5a82', faceLine: '#5a4c70', deco: null };
const STAGES_PER_WORLD = 4; // x-1 ~ x-3: 일반 / x-4: 보스

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
