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
    skill: 'overdrive', skillName: '과부하 사격', skillDesc: '5초간 공격 속도 2배, 에너지 무소모', skillCooldown: 15,
    passiveName: '탄약 절약', passiveDesc: '무기 에너지 소모 -20%', energySave: 0.2,
    look: { sprite: 'gunslinger', body: '#3a5a8a', accent: '#8a5a34' } },
  { id: 'hero_mage', name: '마도사 엘린', title: '원소 마법사', price: 0,
    maxHp: 115, maxShield: 50, maxEnergy: 290, moveSpeed: 116, startWeapon: 'weapon_wand_001',
    skill: 'frost_nova', skillName: '서리 폭발', skillDesc: '주변 적 피해 + 빙결, 탄환 제거', skillCooldown: 6,
    passiveName: '원소 친화', passiveDesc: '모든 상태이상 효과 +30%', statusBoost: 0.3,
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
    maxHp: 120, maxShield: 70, maxEnergy: 230, moveSpeed: 112, startWeapon: 'weapon_ironstaff_001',
    skill: 'sanctuary', skillName: '성역', skillDesc: '6초간 빛의 원: 안에 있으면 회복, 원 안의 적 지속 피해, 들어오는 적 탄 소멸', skillCooldown: 13,
    passiveName: '축복', passiveDesc: '전투방을 정리할 때마다 체력 +8', roomHeal: 8,
    look: { sprite: 'priest', body: '#e8e0d0', accent: '#d0a040' } },
  { id: 'hero_berserker', name: '광전사 바르그', title: '피에 굶주린 전사', price: 500,
    maxHp: 150, maxShield: 45, maxEnergy: 160, moveSpeed: 114, startWeapon: 'weapon_club_001',
    skill: 'rage', skillName: '분노', skillDesc: '5초간 공격력 +70%, 이동 속도 +20%', skillCooldown: 12,
    passiveName: '피의 갈증', passiveDesc: '체력 50% 이하일 때 공격력 +30%', lowHpBonus: 0.3,
    look: { sprite: 'berserker', body: '#8a5a3a', accent: '#a02a2a' } },
  { id: 'hero_druid', name: '드루이드 이반', title: '숲의 부름', price: 600,
    maxHp: 120, maxShield: 60, maxEnergy: 240, moveSpeed: 118, startWeapon: 'weapon_sling_001',
    skill: 'wolves', skillName: '영혼 늑대', skillDesc: '12초간 적을 물어뜯는 늑대 3마리 소환', skillCooldown: 13,
    passiveName: '자연의 가호', passiveDesc: '보호막 회복 속도 +60%', shieldRegenMul: 1.6,
    look: { sprite: 'druid', body: '#4a7a3a', accent: '#6a4628' } }
];
// ── 스킨 (외형만 바뀜, 능력은 그대로) [사용자 결정] 선물 코드로 얻음 — 일시정지(Esc) → G 선물 코드
const SKINS = [
  { id: 'skin_flamewitch', name: '불꽃 마녀', hero: 'hero_mage', line: 'fire', sprite: 'flamewitch', source: 'code', desc: '불 마도사 외형: 끝이 꺾인 마녀 모자와 붉은 원피스' },
  { id: 'skin_redgunner', name: '붉은 머리 총잡이', hero: 'hero_gunner', line: 'base', sprite: 'redgunner', source: 'code', desc: '속사 사수 외형: 붉은 머리와 보안관 별을 단 남색 조끼' },
  { id: 'skin_silverelf', name: '은발 엘프 마도사', hero: 'hero_mage', line: 'light', sprite: 'silverelf', source: 'code', desc: '빛 마도사 외형: 은발 트윈테일과 뾰족한 귀, 금테 흰 망토' },
  // ── 전설 등급 스킨 (애니메이션, 고퀄) — assets/legskins.png (4행 × 3프레임, 셀 106×108)
  { id: 'skin_leg_abyss', name: '심연의 기사', hero: 'hero_swordsman', sprite: 'leg_abyss', rarity: 'legendary', source: 'gacha', desc: '검사 전설 외형 — 심연에서 돌아온 뿔투구 기사 (전직: 심연)' },
  { id: 'skin_leg_crimson', name: '진홍의 그림자', hero: 'hero_assassin', sprite: 'leg_crimson', rarity: 'legendary', source: 'gacha', desc: '암살자 전설 외형 — 핏빛 장막을 두른 그림자 (전직: 그림자)' },
  { id: 'skin_leg_void', name: '공허의 마도사', hero: 'hero_mage', sprite: 'leg_void', rarity: 'legendary', source: 'gacha', desc: '마법사 전설 외형 — 어둠을 휘감은 공허의 현자 (전직: 어둠)' },
  { id: 'skin_leg_star', name: '성역의 성자', hero: 'hero_priest', sprite: 'leg_star', rarity: 'legendary', source: 'gacha', desc: '사제 전설 외형 — 별빛 성역의 성자 (전직: 성역)' },
  // ── 변신 드루이드 스킨: 평소 반디(앞/옆/뒤) ↔ 변신 시 샘(대기=22·공격=21, 좌우 반전만)
  { id: 'skin_bandi', name: '반디', hero: 'hero_druid', sprite: 'druid_bandi', rarity: 'legendary', source: 'code', druid: true, desc: '드루이드 변신 스킨 — 평소엔 반디, 변신하면 날개 돋친 샘으로 (선물 코드)' },
  // ── 일반 등급 스킨 (앞모습 1포즈, 좌우 반전) — assets/commonskins.png · 뽑기 일반 풀
  { id: 'skin_c_sw_1', name: '붉은 기사', hero: 'hero_swordsman', sprite: 'c_swordsman_1', rarity: 'common', source: 'common', desc: '검사 일반 외형 — 핏빛 강철 갑옷' },
  { id: 'skin_c_sw_2', name: '황금 성기사', hero: 'hero_swordsman', sprite: 'c_swordsman_2', rarity: 'common', source: 'common', desc: '검사 일반 외형 — 백금빛 성기사' },
  { id: 'skin_c_sw_3', name: '자수정 기사', hero: 'hero_swordsman', sprite: 'c_swordsman_3', rarity: 'common', source: 'common', desc: '검사 일반 외형 — 보랏빛 뿔투구' },
  { id: 'skin_c_gn_1', name: '진홍 보안관', hero: 'hero_gunner', sprite: 'c_gunner_1', rarity: 'common', source: 'common', desc: '사수 일반 외형 — 붉은 외투의 보안관' },
  { id: 'skin_c_gn_2', name: '금장 총사', hero: 'hero_gunner', sprite: 'c_gunner_2', rarity: 'common', source: 'common', desc: '사수 일반 외형 — 남색·금장 제복' },
  { id: 'skin_c_gn_3', name: '청록 총잡이', hero: 'hero_gunner', sprite: 'c_gunner_3', rarity: 'common', source: 'common', desc: '사수 일반 외형 — 청록빛 코트' },
  { id: 'skin_c_mg_1', name: '서리 마법사', hero: 'hero_mage', sprite: 'c_mage_1', rarity: 'common', source: 'common', desc: '마도사 일반 외형 — 푸른 서리 로브' },
  { id: 'skin_c_mg_2', name: '보라 현자', hero: 'hero_mage', sprite: 'c_mage_2', rarity: 'common', source: 'common', desc: '마도사 일반 외형 — 보랏빛 현자 복장' },
  { id: 'skin_c_mg_3', name: '황혼 마도사', hero: 'hero_mage', sprite: 'c_mage_3', rarity: 'common', source: 'common', desc: '마도사 일반 외형 — 자금빛 황혼 예복' },
  { id: 'skin_c_en_1', name: '고글 기술자', hero: 'hero_engineer', sprite: 'c_engineer_1', rarity: 'common', source: 'common', desc: '기술자 일반 외형 — 고글 쓴 정비사' },
  { id: 'skin_c_en_2', name: '두건 정비공', hero: 'hero_engineer', sprite: 'c_engineer_2', rarity: 'common', source: 'common', desc: '기술자 일반 외형 — 갈색 두건 작업복' },
  { id: 'skin_c_en_3', name: '황금 기공사', hero: 'hero_engineer', sprite: 'c_engineer_3', rarity: 'common', source: 'common', desc: '기술자 일반 외형 — 금빛 기공 장비' },
  { id: 'skin_c_as_1', name: '핏빛 자객', hero: 'hero_assassin', sprite: 'c_assassin_1', rarity: 'common', source: 'common', desc: '암살자 일반 외형 — 붉은 두건의 자객' },
  { id: 'skin_c_as_2', name: '서리 그림자', hero: 'hero_assassin', sprite: 'c_assassin_2', rarity: 'common', source: 'common', desc: '암살자 일반 외형 — 푸른 서리 장막' },
  { id: 'skin_c_as_3', name: '보랏빛 자객', hero: 'hero_assassin', sprite: 'c_assassin_3', rarity: 'common', source: 'common', desc: '암살자 일반 외형 — 자줏빛 암영' },
  { id: 'skin_c_pr_1', name: '홍련 사제', hero: 'hero_priest', sprite: 'c_priest_1', rarity: 'common', source: 'common', desc: '사제 일반 외형 — 홍련빛 사제복' },
  { id: 'skin_c_pr_2', name: '백색 천사', hero: 'hero_priest', sprite: 'c_priest_2', rarity: 'common', source: 'common', desc: '사제 일반 외형 — 흰 날개의 천사' },
  { id: 'skin_c_pr_3', name: '황금 세라핌', hero: 'hero_priest', sprite: 'c_priest_3', rarity: 'common', source: 'common', desc: '사제 일반 외형 — 금빛 세라핌' },
  { id: 'skin_c_be_1', name: '서리뿔 전사', hero: 'hero_berserker', sprite: 'c_berserker_1', rarity: 'common', source: 'common', desc: '광전사 일반 외형 — 푸른 뿔 투구' },
  { id: 'skin_c_be_2', name: '홍염 광전사', hero: 'hero_berserker', sprite: 'c_berserker_2', rarity: 'common', source: 'common', desc: '광전사 일반 외형 — 붉은·금빛 뿔갑옷' },
  { id: 'skin_c_be_3', name: '황금 뿔 군주', hero: 'hero_berserker', sprite: 'c_berserker_3', rarity: 'common', source: 'common', desc: '광전사 일반 외형 — 금빛 뿔의 군주' },
  { id: 'skin_c_dr_1', name: '단풍 드루이드', hero: 'hero_druid', sprite: 'c_druid_1', rarity: 'common', source: 'common', desc: '드루이드 일반 외형 — 단풍빛 망토' },
  { id: 'skin_c_dr_2', name: '버섯 드루이드', hero: 'hero_druid', sprite: 'c_druid_2', rarity: 'common', source: 'common', desc: '드루이드 일반 외형 — 붉은 버섯 모자' },
  { id: 'skin_c_dr_3', name: '큰뿔 드루이드', hero: 'hero_druid', sprite: 'c_druid_3', rarity: 'common', source: 'common', desc: '드루이드 일반 외형 — 큰 사슴뿔' }
];
// 일반 스킨 시트(assets/commonskins.png) 좌표 [x,y,w,h] — 앞모습 1포즈 (좌우 반전만)
const COMMON_SKIN = { c_swordsman_1: [2, 0, 22, 22], c_gunner_1: [30, 0, 18, 22], c_mage_1: [56, 0, 18, 22], c_engineer_1: [82, 0, 18, 22], c_assassin_1: [107, 0, 20, 22], c_priest_1: [133, 0, 20, 22], c_berserker_1: [158, 0, 22, 22], c_druid_1: [184, 0, 22, 22], c_swordsman_2: [3, 22, 20, 22], c_gunner_2: [29, 22, 20, 22], c_mage_2: [54, 22, 22, 22], c_engineer_2: [82, 22, 18, 22], c_assassin_2: [106, 22, 22, 22], c_priest_2: [132, 22, 22, 22], c_berserker_2: [157, 22, 24, 22], c_druid_2: [184, 22, 22, 22], c_swordsman_3: [2, 44, 22, 22], c_gunner_3: [28, 44, 22, 22], c_mage_3: [54, 44, 22, 22], c_engineer_3: [81, 44, 20, 22], c_assassin_3: [105, 44, 24, 22], c_priest_3: [132, 44, 22, 22], c_berserker_3: [156, 44, 26, 22], c_druid_3: [183, 44, 24, 22] };
// 드루이드 스킨 시트(assets/druidskin.png) 스프라이트 좌표 [x,y,w,h] — 이미 인게임 크기로 구움
const DRUID_SKIN = { bandi_down: [0, 13, 26, 27], bandi_up: [27, 13, 27, 27], bandi_side: [55, 13, 23, 27], sam_idle: [237, 0, 62, 40], sam_atk: [300, 14, 49, 26] };
// 반디 걷기: 방향별 2프레임(발 교차) 좌표 — 이동 중 번갈아 그림
const BANDI_WALK = { bandi_down: [[79, 13, 26, 27], [106, 13, 26, 27]], bandi_up: [[133, 13, 27, 27], [161, 13, 27, 27]], bandi_side: [[189, 13, 23, 27], [213, 13, 23, 27]] };
// 전설 스킨 시트 매핑: sprite 이름 → 스킨 번호. assets/legskins.png = 3열(걷기 프레임) × (스킨×3방향)행
//  행 = 스킨*3 + 방향(0=앞/아래, 1=뒤/위, 2=옆) · 셀은 이미 인게임 크기로 구워둠(저해상도 청키) → 런타임은 1:1 drawImage
const LEG_SKINS = { leg_abyss: 0, leg_crimson: 1, leg_void: 2, leg_star: 3 };
const LEG_SHEET = { cellW: 22, cellH: 27, frames: 3, dirs: 3 };
// 선물 코드: 글자 그대로 두지 않고 해시로만 보관 (giftHash) — 코드 하나에 보상 하나, 계정마다 한 번
const GIFT_CODES = [
  { hash: 'd6b73fd4', skin: 'skin_flamewitch' },
  { hash: 'ca1080ea', skin: 'skin_redgunner' },
  { hash: '8b67ec', skin: 'skin_silverelf' },
  { hash: '30fbc0b', skin: 'skin_bandi' } // FireFly
];
function giftHash(code) { let h = 0x811c9dc5; for (const ch of 'pd_gift:' + String(code).toUpperCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); }
function skinsForMenu(save) { const owned = save && Array.isArray(save.skins) ? save.skins : []; return SKINS.filter((k) => (k.source !== 'code' && k.source !== 'common') || owned.includes(k.id)); } // 코드·일반 스킨은 보유해야 목록에 나옴
// ── 스킨 뽑기 [사용자 결정] 재화=결정석, 1뽑/5뽑. 5%로 배너 스킨 "전설 조각" → 20개 모으면 스킨 완성. 나머지는 스킨 마일리지. 마일리지 상점 별도
const GACHA = {
  costSingle: 300, cost5: 1500,           // 결정석 비용 (1뽑 300, 5뽑 1500)
  shardRate: 0.05, shardsNeeded: 20,       // 전설 조각 5%, 20개 = 스킨 완성
  commonRate: 0.25,                        // 일반 스킨 25% · 나머지 70% = 탐험 보급품(보관함에 쌓임)
  dupeMileage: 250, commonDupeMileage: 15, // [사용자 결정] 마일리지는 스킨 중복일 때만: 전설 조각(보유 스킨) 250 · 일반 스킨 중복 15
  shopPrice: 400,                          // 마일리지 상점 스킨 1개 가격
  mileageName: '스킨 마일리지', mileageColor: '#ffb0d8', shardName: '전설 조각', shardColor: '#ffe9a0',
  banners: { skin_leg_abyss: 'abyss', skin_leg_crimson: 'crimson', skin_leg_void: 'void', skin_leg_star: 'star' } // 스킨별 배너 이미지 키 (assets/banners/<key>.jpg)
};
function gachaPool() { return SKINS.filter((k) => k.source === 'gacha'); } // 전설 배너 뽑기 대상
function commonPool() { return SKINS.filter((k) => k.source === 'common'); } // 일반 뽑기 풀
function skinKey(K) { return K.line ? K.hero + '|' + K.line : K.hero; } /* 장착 칸: 직업·계열마다 하나 (마도사 불·빛 스킨을 따로 켜 둘 수 있게) */
function skinAllowed(sp, heroId, lineId) { return SKINS.some((k) => k.sprite === sp && k.hero === heroId && (!k.line || k.line === lineId)); } /* [사용자 결정] 스킨은 정해진 갈래일 때만 (불꽃 마녀 = 불 마도사 · 붉은 머리 총잡이 = 속사 사수) */
function skinSpriteOk(sp) { return SKINS.some((k) => k.sprite === sp) ? sp : null; } /* 멀티로 받은 외형 이름은 아는 스킨만 */
