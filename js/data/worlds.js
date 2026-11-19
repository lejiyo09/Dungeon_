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
      wallFace: '#4a5488', faceLine: '#3e4878', deco: 'rgba(154,216,255,0.35)' } },
  { id: 'deep_fungal', name: '뒤틀린 버섯숲', boss: 'boss_myco_queen', waves: 2, deep: true,
    enemies: [['enemy_sporeling_001', 4], ['enemy_shroomknight_001', 2], ['enemy_puffcap_001', 2], ['enemy_vinelasher_001', 3]],
    palette: { style: 'fungal', accent: '#e07aff', floor: ['#2a1e2e', '#2d2031'], corridor: ['#1e1522', '#201724'], wall: '#3a2a40', wallTop: '#46334e',
      wallFace: '#5e4468', faceLine: '#503a5a', deco: 'rgba(224,122,255,0.35)' } },
  { id: 'deep_sunken', name: '가라앉은 신전', boss: 'boss_tide_warden', waves: 2, deep: true,
    enemies: [['enemy_drowned_001', 4], ['enemy_eel_001', 3], ['enemy_bubblemage_001', 2], ['enemy_coraltower_001', 2]],
    palette: { style: 'sunken', accent: '#5ac8ff', floor: ['#16303a', '#18333e'], corridor: ['#10242c', '#11262e'], wall: '#1e3e4a', wallTop: '#264a58',
      wallFace: '#3a6878', faceLine: '#305a68', deco: 'rgba(90,200,255,0.35)' } },
  { id: 'deep_sky', name: '뒤집힌 하늘섬', boss: 'boss_storm_lord', waves: 2, deep: true,
    enemies: [['enemy_windsprite_001', 4], ['enemy_thunderhawk_001', 3], ['enemy_cloudmage_001', 2], ['enemy_galetotem_001', 2]],
    palette: { style: 'sky', accent: '#dff8ff', floor: ['#8a9ab8', '#8e9ebc'], corridor: ['#6a7a98', '#6c7c9a'], wall: '#5a6a8a', wallTop: '#6e7ea0',
      wallFace: '#9aaac8', faceLine: '#8494b4', deco: 'rgba(255,255,255,0.35)' } },
  { id: 'deep_mirror', name: '거울의 미궁', boss: 'boss_mirror_face', waves: 2, deep: true,
    enemies: [['enemy_mirrorknight_001', 3], ['enemy_shardbat_001', 4], ['enemy_prismmage_001', 2], ['enemy_prismtower_001', 2]],
    palette: { style: 'mirror', accent: '#e0c8ff', floor: ['#2e2a3a', '#312d3e'], corridor: ['#221f2c', '#24212e'], wall: '#3e3a50', wallTop: '#4c4862',
      wallFace: '#8a86a8', faceLine: '#76729a', deco: 'rgba(224,200,255,0.35)' } },
  { id: 'deep_clock', name: '멈춘 태엽탑', boss: 'boss_clock_giant', waves: 2, deep: true,
    enemies: [['enemy_gearsoldier_001', 3], ['enemy_cogbug_001', 4], ['enemy_clockmage_001', 2], ['enemy_belltower_001', 2]],
    palette: { style: 'clock', accent: '#e8c070', floor: ['#3a3026', '#3d3329'], corridor: ['#2a231c', '#2c251e'], wall: '#4a3e30', wallTop: '#5a4c3a',
      wallFace: '#8a7450', faceLine: '#76643f', deco: 'rgba(232,192,112,0.35)' } },
  { id: 'deep_ember', name: '잿불 성채', boss: 'boss_ash_king', waves: 2, deep: true,
    enemies: [['enemy_emberimp_001', 4], ['enemy_ashhound_001', 3], ['enemy_cinderpriest_001', 2], ['enemy_brazier_001', 2]],
    palette: { style: 'ember', accent: '#ff8a3a', floor: ['#2e2422', '#312624'], corridor: ['#211a18', '#231b19'], wall: '#3e302c', wallTop: '#4c3a34',
      wallFace: '#6e544a', faceLine: '#5e463e', deco: 'rgba(255,138,58,0.35)' } },
  { id: 'deep_library', name: '잠긴 서고', boss: 'boss_sealed_tome', waves: 2, deep: true,
    enemies: [['enemy_bookmite_001', 4], ['enemy_inkblob_001', 2], ['enemy_libghost_001', 2], ['enemy_candle_001', 2]],
    palette: { style: 'library', accent: '#9a7aff', floor: ['#2e2622', '#312824'], corridor: ['#221c19', '#241e1a'], wall: '#3e2e28', wallTop: '#4c3a32',
      wallFace: '#6a5040', faceLine: '#5a4436', deco: 'rgba(154,122,255,0.35)' } },
  { id: 'deep_bloodmoon', name: '붉은 달의 들판', boss: 'boss_moon_hunter', waves: 2, deep: true,
    enemies: [['enemy_redwolf_001', 3], ['enemy_bloodbat_001', 4], ['enemy_moonmaiden_001', 2], ['enemy_bloodobelisk_001', 2]],
    palette: { style: 'bloodmoon', accent: '#ff5a6a', floor: ['#2a1a1e', '#2d1c20'], corridor: ['#1e1215', '#201316'], wall: '#3a2228', wallTop: '#482a32',
      wallFace: '#6a3a44', faceLine: '#5a3038', deco: 'rgba(255,90,106,0.35)' } },
  { id: 'deep_theater', name: '실 끊긴 인형극장', boss: 'boss_puppeteer', waves: 2, deep: true,
    enemies: [['enemy_puppet_001', 4], ['enemy_jester_001', 2], ['enemy_threadspider_001', 3], ['enemy_spotlight_001', 2]],
    palette: { style: 'theater', accent: '#ffd86a', floor: ['#3a2a22', '#3d2c24'], corridor: ['#281d18', '#2a1f19'], wall: '#4a1a22', wallTop: '#5a2028',
      wallFace: '#8a2a34', faceLine: '#74222c', deco: 'rgba(255,216,106,0.35)' } },
  { id: 'deep_hive', name: '호박빛 벌집', boss: 'boss_amber_queen', waves: 2, deep: true,
    enemies: [['enemy_drone_bee_001', 4], ['enemy_beetle_001', 3], ['enemy_honeymage_001', 2], ['enemy_waxtower_001', 2]],
    palette: { style: 'hive', accent: '#ffb02a', floor: ['#4a3618', '#4d391a'], corridor: ['#352610', '#372811'], wall: '#5a3e14', wallTop: '#6a4a18',
      wallFace: '#a0701e', faceLine: '#8a601a', deco: 'rgba(255,176,42,0.35)' } },
  { id: 'deep_saltmine', name: '소금 결정 광산', boss: 'boss_salt_king', waves: 2, deep: true,
    enemies: [['enemy_saltgolem_001', 3], ['enemy_crystalbat_001', 4], ['enemy_minerghost_001', 2], ['enemy_saltpillar_001', 2]],
    palette: { style: 'salt', accent: '#ff8ac0', floor: ['#4a4248', '#4d454b'], corridor: ['#332d32', '#352f34'], wall: '#5a5058', wallTop: '#6a6068',
      wallFace: '#a898a4', faceLine: '#908490', deco: 'rgba(255,138,192,0.35)' } },
  { id: 'deep_wreck', name: '안개 낀 난파선 묘지', boss: 'boss_mist_captain', waves: 2, deep: true,
    enemies: [['enemy_anchorknight_001', 3], ['enemy_bonegull_001', 4], ['enemy_lampkeeper_001', 2], ['enemy_wreckcannon_001', 2]],
    palette: { style: 'wreck', accent: '#9affd0', floor: ['#3a3026', '#3d3329'], corridor: ['#29231c', '#2b251e'], wall: '#33291f', wallTop: '#3e3226',
      wallFace: '#5a4632', faceLine: '#4a3a2a', deco: 'rgba(154,255,208,0.35)' } },
  { id: 'deep_frost', name: '서리 궁전', boss: 'boss_winter_empress', waves: 2, deep: true,
    enemies: [['enemy_frostguard_001', 3], ['enemy_blizzardwisp_001', 3], ['enemy_icepriestess_001', 2], ['enemy_iciclespire_001', 2]],
    palette: { style: 'frost', accent: '#bfe8ff', floor: ['#3a4a62', '#3d4d66'], corridor: ['#2a364a', '#2c384c'], wall: '#4a5a7a', wallTop: '#5a6c90',
      wallFace: '#9ab8d8', faceLine: '#86a4c4', deco: 'rgba(191,232,255,0.35)' } },
  { id: 'deep_vault', name: '잠긴 황금 보물고', boss: 'boss_vault_keeper', waves: 2, deep: true,
    enemies: [['enemy_mimic_001', 3], ['enemy_goldstatue_001', 3], ['enemy_coinwisp_001', 3], ['enemy_vaulteye_001', 2]],
    palette: { style: 'vault', accent: '#ffd84a', floor: ['#4a2a24', '#4d2c26'], corridor: ['#3a201b', '#3c221d'], wall: '#4a3a2a', wallTop: '#5a4632',
      wallFace: '#8a6a3a', faceLine: '#7a5a30', deco: 'rgba(255,216,74,0.35)' } },
  { id: 'deep_arena', name: '잊힌 투기장', boss: 'boss_arena_champion', waves: 2, deep: true,
    enemies: [['enemy_gladghost_001', 3], ['enemy_bonelion_001', 3], ['enemy_javelineer_001', 3], ['enemy_ballista_001', 2]],
    palette: { style: 'arena', accent: '#ffd84a', floor: ['#8a7048', '#8d734a'], corridor: ['#5a4a32', '#5c4c34'], wall: '#6a5a46', wallTop: '#7a6a54',
      wallFace: '#a8987c', faceLine: '#968670', deco: 'rgba(255,176,96,0.35)' } },
  { id: 'deep_alchemy', name: '연금술 공방', boss: 'boss_mad_alchemist', waves: 2, deep: true,
    enemies: [['enemy_flaskslime_001', 3], ['enemy_alchgolem_001', 3], ['enemy_poisonalch_001', 2], ['enemy_stilltower_001', 2]],
    palette: { style: 'alchemy', accent: '#7aff6a', floor: ['#26282c', '#282a2e'], corridor: ['#1c1d20', '#1d1e22'], wall: '#3a3430', wallTop: '#46403a',
      wallFace: '#6a5a4a', faceLine: '#5a4c3e', deco: 'rgba(122,255,106,0.35)' } },
  { id: 'deep_dream', name: '꿈의 회랑', boss: 'boss_dream_tapir', waves: 2, deep: true,
    enemies: [['enemy_dreamsheep_001', 3], ['enemy_sleepknight_001', 3], ['enemy_candyfairy_001', 2], ['enemy_moonlamp_001', 2]],
    palette: { style: 'dream', accent: '#d8b8ff', floor: ['#4a3e6a', '#4d416e'], corridor: ['#382e52', '#3a3054'], wall: '#5a4a80', wallTop: '#6a5a94',
      wallFace: '#9a82c8', faceLine: '#8670b4', deco: 'rgba(216,184,255,0.35)' } },
  { id: 'deep_jungle', name: '덩굴 삼킨 정글 신전', boss: 'boss_jungle_idol', waves: 2, deep: true,
    enemies: [['enemy_vinesnake_001', 3], ['enemy_stoneguard_001', 3], ['enemy_dartshooter_001', 3], ['enemy_jungletotem_001', 2]],
    palette: { style: 'jungle', accent: '#6aba4a', floor: ['#4a4a3a', '#4d4d3c'], corridor: ['#34342a', '#36362c'], wall: '#4a5040', wallTop: '#5a6050',
      wallFace: '#7a806a', faceLine: '#6a705a', deco: 'rgba(106,186,74,0.35)' } }
];
const DEEP_START = DATA_WORLDS.length; // 이 번호부터 심층
function worldDef(i) {
  if (i < DEEP_START) return DATA_WORLDS[i];
  const d = i - DEEP_START, base = DEEP_WORLDS[d % DEEP_WORLDS.length];
  return Object.assign({}, base, { depth: d + 1, name: `${base.name}` });
}
// [사용자 결정] 바빌로니아 지하: 길가메시에게 떨어진 뒤의 별도 지역 (worldIdx는 몬스터 세기용으로만 씀 — 기본 무기·1진으로 7필드급을 상대) [임시 디자인]
const ZONES = {
  babylon_under: { id: 'babylon_under', zone: 'babylon_under', name: '바빌로니아 지하 수로', short: '지하', scaleWorld: 6, boss: 'boss_abzu_lamassu', waves: 3, /* [사용자 결정] 난이도 높게: 7필드 곡선 + 웨이브 3 */
    enemies: [['enemy_clayscribe_001', 3], ['enemy_mudbrick_001', 2], ['enemy_chainhound_001', 3], ['enemy_abzuserpent_001', 3]],
    palette: { style: 'abzu', accent: '#3ac8b8', floor: ['#3a3226', '#3d3428'], corridor: ['#262620', '#282822'], wall: '#4a3a2a', wallTop: '#5a4a36',
      wallFace: '#7a6046', faceLine: '#6a5240', deco: 'rgba(58,200,184,0.35)' } }
};
function zoneLabel(z, l) { const Z = ZONES[z]; return `${Z ? Z.short : '?'} ${l + 1}`; }
function runLabel(r) { return r.zone && ZONES[r.zone] ? zoneLabel(r.zone, r.levelIdx) : stageLabel(r.worldIdx, r.levelIdx); } // 이어하기 표시용
function runWorld(r) { return (r.zone && ZONES[r.zone]) || worldDef(r.worldIdx); }
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
