'use strict';
// ════════════════════════════════════════════
// 데이터: 라트마 & 히든 캐릭터 네크로맨서 (기획서: 라트마 & 히든 캐릭터 네크로맨서 통합 개발 기획서)
//  · js/data/index.js 보다 먼저 읽혀야 함 (DATA_HEROES · DATA_WEAPONS · DATA_ENEMIES 인덱스에 들어가도록)
//  · 동작(퀘스트·보스·선택지·무기 효과·연출)은 js/systems/ratma.js
//  · 수치 중 기획서에 없는 것(스킬 피해·보스 체력·지속시간 등)은 [제안] 표시
// ════════════════════════════════════════════

// ── 9번째 캐릭터: 네크로맨서 (히든 — 라트마를 쓰러뜨리기 전엔 로비 단상에 나오지 않음)
DATA_HEROES.push({
  id: 'hero_necromancer', name: '라트마의 사제', title: '죽음과 생명의 균형을 지키는 자', price: 0, hidden: true,
  maxHp: 105, maxShield: 50, maxEnergy: 250, moveSpeed: 114, startWeapon: 'weapon_necrostaff_001',
  skill: 'necro_none', skillName: '액티브 스킬 없음', skillDesc: '사령술사는 액티브 스킬이 없습니다 — 해골 부하가 대신 싸웁니다', skillCooldown: 0.3,
  passiveName: '해골 군세', passiveDesc: '기본 해골 2마리가 늘 따라다니며 싸움 · 전직 단계가 오를 때마다 1마리 추가 (최대 4)',
  look: { sprite: 'necro', body: '#24232b', accent: '#c5a66c' }
});

// [사용자 결정] 네크로맨서 개편: 해골 군세 + 시체 활용 · 계열은 망령·리치 둘 (사령 기사 계열과 그 고유 무기 삭제)
//  수치 중 개편안에 없는 것(피해·체력·묘지 재사용 대기 등)은 [제안]
// [밸런스 조정 · Claude] tools/jobs.js 측정(같은 무기·축복·필드, 봇 전투)으로 다른 직업과 비교해 맞춤 — 조정 전엔 같은 단계 1위 직업의 3~4배였음
//  해골 한 방 = 두 무기 합 × skeleton.atk · 골렘 한 방 = 두 무기 합 × golem.atk (둘 다 × 층수 배율) · 시체 창·자폭 해골·정신지배 자폭 피해도 낮춤
const NECRO = {
  summonSpeed: 1.5,                                                                             // [사용자 결정] 네크로맨서 소환수 이동 속도 1.5배 (해골·골렘·부활 부하·망령)
  floorDmg: 0.5,                                                                                // [사용자 결정] 소환수 층수 비례 버프: 공격력이 몬스터 체력 곡선의 50%만큼 자람 (1이면 몬스터와 같은 속도) · 체력은 몬스터 공격력 곡선 그대로
  weaponAtk: 1,                                                                                 // [사용자 결정] 해골·골렘 한 방 피해 = 들고 있는 두 무기 한 방의 합 × 100% (강화·공격력 보너스 포함)                                                                               // [사용자 결정] 네크로맨서 소환수 이동 속도 1.5배 (3배 → 절반으로 · 해골·골렘·부활 부하·망령)
  skeleton: { atk: 0.12, base: 2, perRank: 1, dmg: 6, rate: 1.0, speed: 120, tempLife: 10, hpMul: 2, regen: 0.02, respawn: 4, taunt: 90, bias: 30 }, // [사용자 결정] 해골도 탱킹: 체력 플레이어의 2배(층수 비례)·초당 2% 회복 · 근처 적의 어그로를 나눠 받음(플레이어보다 30 더 멀어도 해골을 노림) · 적 탄을 몸으로 막음 · 쓰러지면 4초 뒤 다시 일어남          // 기본 해골: 사령술사 2 · 1차 3 · 2차 4 · 추가 소환 해골은 10초
  golem: { atk: 0.25, dmg: 30, rate: 1.6, stun: 0.5, hpMul: 25, regen: 0.01, corpseChance: 0.7, slamEvery: 6, slamR: 54, slamStun: 1, respawn: 5, taunt: 150, speed: 70 }, // [사용자 결정] 골렘 = CC 탱커: 체력 플레이어의 25배 · 초당 최대 체력 1% 회복 · 타격 시 70% 확률로 시체 생성 · 공격력 낮춤(두 무기 합 × 0.25) · 맞힌 적 0.5초 기절 + 6초마다 내려찍기(주변 1초 기절) · 어그로 범위 넓힘
  corpse: { life: 25, max: 30, pick: 16 },                                                      // 시체: 적이 쓰러진 자리 · 마우스로 고르는 거리
  thrall: { max: 5, hpMul: 20 / 3, dmgMul: 1 }, // [사용자 결정] 부활 부하·정신지배된 적: 체력 6.7배(10배의 2/3) · 공격력은 밸런스 조정으로 원본 그대로 (2배 → 1배)
  lichFeed: { hp: 12, energy: 10 },  // (회복량 20 → 12: 60%)                                                             // [사용자 결정] 리치 계열 패시브: 시체를 쓸 때마다 체력 20 · 에너지 10 회복
  blast: { r: 64, dmg: 25, hpPct: 0.06 },                                                     // [사용자 결정] 시체 폭발(망령 1차부터 F): 시체 1구를 터뜨려 주변 피해 = 스킬 피해 35 + 그 몬스터 최대 체력의 12%
  spear: { count: 3, dmg: 10, speed: 260, range: 200, debuffs: 2 },                             // 리치: 시체 창 3개 · 무작위 디버프 2종
  grave: { r: 92, life: 10, every: 2, corpses: [2, 4], charm: 0.3, charmLife: 10, charmDmg: 60, charmR: 46, cd: 24 } // 불멸의 군주: 묘지 10초 · [사용자 결정] 2초마다 시체 2~4구 (자폭 해골 대신) · 일반 적 30% 정신지배(보스 면역)
};
const NECRO_DEBUFFS = [
  { type: 'burn', chance: 1, duration: 3, dps: 10 }, { type: 'freeze', chance: 1, duration: 1.6, slow: 0.5 }, { type: 'poison', chance: 1, duration: 4, dps: 12 },
  { type: 'shock', chance: 1, duration: 3 }, { type: 'blind', chance: 1, duration: 3 }, { type: 'curse', chance: 1, duration: 5 }];

// ── 전직 계열 (사령술사 → 1차 → 2차) · looks: 단계마다 실루엣 자체가 바뀌는 외형 (js/art/ratma.js)
const NECRO_NONE = { id: 'necro_none', name: '액티브 스킬 없음', desc: '해골 부하 2마리가 늘 따라다니며 싸웁니다', cd: 0.3 };
JOB_LINES.hero_necromancer = {
  title: '사령의 길 선택',
  wraith: { name: '망령', desc: '소환과 부활 · CC 탱커 골렘이 어그로를 끌고, 시체를 터뜨리고, 쓰러진 적을 되살려 군세로 거느림', ranks: ['사령술사', '망령', '망자의 군주'], color: '#7affc0',
    looks: [{ sprite: 'necro', body: '#24232b', accent: '#c5a66c' }, { sprite: 'necro_wraithcmd', body: '#263235', accent: '#83bba9' }, { sprite: 'necro_deadlord', body: '#1b2428', accent: '#a5d8c2' }],
    fx: { trail: '#9affd8', trail2: '#3a8a7a', kind: 'mist' },
    skills: [NECRO_NONE,
      { id: 'necro_blast', name: '시체 폭발', desc: '시체에 마우스를 올리고 F → 시체를 터뜨려 주변 적에게 피해 (그 몬스터 최대 체력에 비례) · 해골 3 + 골렘(CC 탱커) 상시', cd: 0.3 },
      { id: 'necro_blast', name: '시체 폭발', desc: 'F: 시체 폭발 · G: 시체에 마우스를 올리고 → 그 몬스터를 원본 그대로 부하로 되살림 (최대 5) · 골렘 유지', cd: 0.3 }],
    gSkills: [null, null, { id: 'necro_raise', name: '시체 부활', cd: 0 }] }, // G키 스킬 (재사용 대기시간 없음)
  lich: { name: '리치', desc: '시체와 저주 · 시체를 창으로 바꾸고, 묘지로 적을 지배해 자폭시킴', ranks: ['사령술사', '리치', '불멸의 군주'], color: '#b47aff',
    looks: [{ sprite: 'necro', body: '#24232b', accent: '#c5a66c' }, { sprite: 'necro_lich', body: '#2c2528', accent: '#d6c8a0' }, { sprite: 'necro_lichlord', body: '#17171f', accent: '#e0c77d' }],
    fx: { trail: '#b47aff', trail2: '#5a2a9a', kind: 'crack' },
    skills: [NECRO_NONE,
      { id: 'necro_spear', name: '시체 창', desc: '시체에 마우스를 올리고 F → 시체 1개를 써서 시체 창 3개 (주변 적 자동 추적 · 무작위 디버프 2종) · 패시브: 시체를 쓸 때마다 체력 12 · 에너지 10 회복', cd: 0.3 },
      { id: 'necro_spear', name: '시체 창', desc: 'F: 시체 창 · G: 마우스 위치에 10초 묘지 (재사용 대기 24초) — 2초마다 시체 2~4구가 솟아남(묘지 시체는 시체 창 자동), 주변 일반 적 30% 정신지배(10초 뒤 자폭, 보스 면역)', cd: 0.3 }],
    gSkills: [null, null, { id: 'necro_grave', name: '묘지', cd: NECRO.grave.cd }] } // G키 스킬
};

// ── 무기: 시작 무기 1종 + 라트마 고유 무기 8종
//  고유 무기: rarity는 기존 '전설' 등급 체계를 그대로 쓰고, unique · questOnly 로 일반 드롭 풀과 분리 (js/systems/ratma.js · game.randomWeaponDef · 제련소)
//  ratma: 고유 효과 키 (js/systems/ratma.js RATMA_FX)
DATA_WEAPONS.push(
  { id: 'weapon_necrostaff_001', name: '사령의 지팡이', rarity: 'common', type: 'gun', shape: 'staff',
    damage: 14, fireRate: 3, energyCost: 0, range: 360, projectileSpeed: 300, projectileCount: 1, spreadDeg: 2, homing: 1.2,
    status: { type: 'curse', chance: 0.15, duration: 2 }, pierce: 0, knockback: 2, color: '#5a4a6a', len: 14, bulletColor: '#b48aff', bulletSize: 2,
    desc: '네크로맨서의 시작 무기. 천천히 휘어 들어가는 영혼탄, 가끔 저주.' },
  { id: 'weapon_ratma_insight_001', name: '라트마의 이해', rarity: 'legendary', unique: true, questOnly: true, ratma: 'insight', type: 'gun', shape: 'staff',
    damage: 38, fireRate: 2.2, energyCost: 2, range: 400, projectileSpeed: 380, projectileCount: 1, spreadDeg: 1,
    status: { type: 'curse', chance: 1, duration: 4 }, pierce: 0, knockback: 3, color: '#3a2a50', len: 16, bulletColor: '#b070ff', bulletSize: 3, glow: '#7a3ad0',
    trait: '고유 · 저주 · 영혼 폭발',
    desc: '영혼의 본질과 죽음의 흐름을 이해하도록 라트마가 남긴 지팡이. 맞은 적은 반드시 4초 저주, 저주받은 적을 쓰러뜨리면 영혼 파편이 튀고, 5마리째엔 영혼 폭발.' },
  { id: 'weapon_ratma_anguish_001', name: '라트마의 고뇌', rarity: 'legendary', unique: true, questOnly: true, ratma: 'anguish', type: 'gun', shape: 'staff',
    damage: 24, fireRate: 1.5, energyCost: 3, range: 360, projectileSpeed: 230, projectileCount: 1, spreadDeg: 0, homing: 4,
    pierce: 0, knockback: 1, color: '#2a3a3a', len: 16, bulletColor: '#7affc0', bulletSize: 3, glow: '#3aa080',
    trait: '고유 · 망령 소환 ×3',
    desc: '수많은 영혼을 지휘하는 자가 짊어져야 할 고통을 담은 지팡이. 맞힌 자리에 작은 망령(6초, 최대 3)을 부르고, 망령이 사라질 때 영혼 파동.' },
  { id: 'weapon_ratma_record_001', name: '라트마의 기록', rarity: 'legendary', unique: true, questOnly: true, ratma: 'record', type: 'gun', shape: 'staff',
    damage: 22, fireRate: 2.8, energyCost: 1, range: 350, projectileSpeed: 340, projectileCount: 1, spreadDeg: 2,
    pierce: 0, knockback: 2, color: '#6a4a2a', len: 12, bulletColor: '#ffe9a0', bulletSize: 2,
    trait: '고유 · 기록 30 폭발',
    desc: '생명과 죽음, 그 사이에서 일어나는 모든 일을 기록한 마도서. 처치 1·정예 5·보스 15씩 기록, 30이 되면 주변에 공격력 180% 피해와 둔화 — 소환수가 있으면 5초간 공격력 +20%. 어느 직업이든 쓸 수 있다.' },
  { id: 'weapon_ratma_balance_001', name: '생사의 균형추', rarity: 'legendary', unique: true, questOnly: true, ratma: 'balance', type: 'gun', shape: 'gun',
    damage: 30, fireRate: 1.8, energyCost: 1, range: 380, projectileSpeed: 420, projectileCount: 1, spreadDeg: 1,
    pierce: 0, knockback: 3, color: '#5a5a6a', len: 12, bulletColor: '#c8ffe0', bulletSize: 2,
    trait: '고유 · 위기 회복',
    desc: '삶과 죽음 어느 쪽으로도 기울지 않는 추. 체력 35% 이하일 때 맞히면 체력 8% 회복, 에너지 20% 이하일 때 맞히면 에너지 10 회복 (각각 30초에 한 번).' },
  { id: 'weapon_ratma_oath_001', name: '망자의 서약', rarity: 'legendary', unique: true, questOnly: true, ratma: 'oath', type: 'melee', shape: 'sword',
    damage: 42, fireRate: 2, energyCost: 0, range: 42, arcDeg: 110, knockback: 4, color: '#3a4a44', len: 18,
    trait: '고유 · 처치 중첩',
    desc: '생사의 경계 숨겨진 방에 잠들어 있던 검. 처치할 때마다 5초간 공격력 +4% (최대 5중첩), 5중첩에서 처치하면 영혼 파동(공격력 100%).' },
  { id: 'weapon_ratma_lantern_001', name: '영혼의 등불', rarity: 'legendary', unique: true, questOnly: true, ratma: 'lantern', type: 'beam', shape: 'gun',
    damage: 3.6, tickRate: 0.1, energyPerSec: 3, range: 250, pierce: 1, knockback: 0, focus: 0.5, color: '#4a5a5a', len: 12, bulletColor: '#9affe8',
    trait: '고유 · 영혼 흡수',
    desc: '심층에서 라트마의 환영이 건넨 등불. 처치 시 20% 확률로 영혼이 생기고, 흡수하면 에너지 +3 — 10개를 흡수하면 다음 공격 피해 +50%.' },
  { id: 'weapon_ratma_crown_001', name: '경계의 왕관', rarity: 'legendary', unique: true, questOnly: true, ratma: 'crown', type: 'charge', shape: 'staff',
    damage: 55, fireRate: 1, energyCost: 5, chargeTime: 1.2, range: 500, projectileSpeed: 520, projectileCount: 1,
    pierce: 1, knockback: 6, color: '#3a3a4a', len: 14, bulletColor: '#e0c8ff', bulletSize: 3,
    trait: '고유 · 보스 특화',
    desc: '생사의 경계를 다스리는 자의 왕관. 보스 피해 +20%(체력 30% 이하 보스에겐 차지 공격 +15% 더), 정예 피해 +15% — 대신 일반 적에게 받는 피해 +10%.' }
);
const RATMA_UNIQUE_IDS = DATA_WEAPONS.filter((d) => d.ratma).map((d) => d.id); // 라트마 고유 무기 8종
// 전직 → 전용 고유 무기
const RATMA_LINE_WEAPON = { lich: 'weapon_ratma_insight_001', wraith: 'weapon_ratma_anguish_001' };
const RATMA_REMOVED_WEAPONS = ['weapon_ratma_endurance_001']; // [사용자 결정] 사령 기사 계열과 함께 삭제된 고유 무기 — 예전 저장에서 정리
const RATMA_RECORD_ID = 'weapon_ratma_record_001';

// 고유 무기 효과 수치 (기획서 그대로, 지속시간이 빠진 곳만 [제안])
const RATMA_FX = {
  insight: { shards: 4, shardMult: 0.5, burstNeed: 5, burstR: 78, burstMult: 2.5 },          // 파편 수·피해 · 영혼 폭발 범위·피해 [제안]
  anguish: { life: 6, max: 3, atk: 0.45, rate: 0.6, waveR: 42, waveMult: 0.6 },                // 망령 6초·최대 3·공격력 45% · 파동 [제안]
  record: { kill: 1, elite: 5, boss: 15, need: 30, mult: 1.8, r: 96, slow: 1.2, minionAtk: 0.2, minionDur: 5 }, // 범위·둔화 시간 [제안]
  balance: { hp: 0.35, heal: 0.08, en: 0.2, energy: 10, cd: 30 },
  oath: { atk: 0.04, dur: 5, max: 5, waveMult: 1, waveR: 60 },                                    // 파동 범위 [제안]
  lantern: { chance: 0.2, energy: 3, need: 10, mult: 1.5, window: 1.5 },                          // 광선은 '다음 공격' = 1.5초 [제안]
  crown: { boss: 0.2, elite: 0.15, taken: 0.1, low: 0.3, lowBonus: 0.15 }
};
// 중복 보상일 때 대체 보상 (결정석) [제안]
const RATMA_DUPE_REWARD = 300;

// ── 적: 생사의 경계 신규 망령 몬스터 + 라트마 보스 (story · 재대결 · 고난도)
DATA_ENEMIES.push(
  { id: 'enemy_ratma_wraith_001', name: '경계의 망령', sprite: 'wraith', color: '#5affb0', aiType: 'teleporter',
    health: 120, damage: 16, moveSpeed: 55, hitboxHalf: 6, preferredRange: 120, attackRange: 260,
    telegraphTime: 0.55, attackCooldown: 2.2, recoveryTime: 0.35, bulletSpeed: 160, bulletCount: 5, bulletSpread: 0.18,
    bulletColor: '#9affd0', rewardGold: 5 },
  { id: 'enemy_ratma_revenant_001', name: '되살아난 망자', sprite: 'skelknight', color: '#9adcc0', aiType: 'melee_chase',
    health: 240, damage: 18, moveSpeed: 50, hitboxHalf: 8, attackRange: 26, telegraphTime: 0.5,
    attackCooldown: 1.3, recoveryTime: 0.45, knockbackResist: 0.75, rewardGold: 6 }
);
// 라트마 보스 패턴: 1페이즈 망자의 시험 / 2페이즈 생사의 경계 / 3페이즈 순환의 종말 (lifedeath = js/systems/ratma.js 의 전용 패턴)
function ratmaBossDef(id, o) {
  return Object.assign({ id, name: '라트마', title: '생명과 죽음의 순환을 지키는 자', sprite: 'boss_ratma', color: '#2a3a44', phaseColors: ['#2a3a44', '#1a4a40', '#3a1a4a'],
    boss: true, ratma: true, aiType: 'boss', hitboxHalf: 14, knockbackResist: 1, rewardGold: 0, float: true, ultFrom: 3,
    phaseNames: ['망자의 시험', '생사의 경계', '순환의 종말'],
    patterns: [
      { type: 'summon', enemyId: 'enemy_ratma_wraith_001', count: 2 },                           // 망령 소환
      { type: 'aimed', volleys: 4, count: 5, spread: 0.15, color: '#b48aff' },                    // 영혼 탄막
      { type: 'radial', rings: 2, count: 20, color: '#9affd0' },                                  // 기본 사령 마법
      { type: 'teleport', bullets: 14, color: '#b48aff' }],
    phase2Patterns: [
      { type: 'meteor', count: 6, radius: 28, delay: 0.85, stagger: 0.32, bullets: 6, color: '#7affc0' }, // 플레이어 위치를 추적하는 사령 마법진
      { type: 'summon', enemyId: 'enemy_ratma_revenant_001', count: 2 },                          // 부활한 적
      { type: 'spiral', duration: 2.4, arms: 4, interval: 0.08, spin: 2.0, color: '#b48aff' },
      { type: 'radial', rings: 3, count: 24, color: '#7affc0' }],                                 // 공격 범위·패턴 강화
    finalPatterns: [
      { type: 'lifedeath', name: '순환의 종말', duration: 3.4, interval: 0.09, spin: 1.9, color: '#9affd0', color2: '#c08aff' }, // 생명과 죽음을 동시에
      { type: 'lances', name: '끝없는 사령', count: 16, delay: 0.7, speed: 300, color: '#c08aff' }] // 강력한 연속 사령 마법
  }, o);
}
DATA_ENEMIES.push(
  ratmaBossDef('boss_ratma', { health: 2600, damage: 23, moveSpeed: 40, attackCooldown: 1.0, bulletSpeed: 140, ultCd: 8 }),                   // 첫 대결 (탐험 중 캐릭터) [제안]
  ratmaBossDef('boss_ratma_rematch', { health: 6000, damage: 36, moveSpeed: 60, attackCooldown: 0.55, bulletSpeed: 160, ultCd: 9 }),         // 재대결 (시련 장비) [제안]
  ratmaBossDef('boss_ratma_hard', { title: '경계의 주인 — 고난도', health: 8200, damage: 44, moveSpeed: 72, attackCooldown: 0.42, bulletSpeed: 175, ultFrom: 2, ultCd: 7 }) // 고난도 [제안]
);

// ── 대사 (기획서 문구 + [임시] 연출 문구)
const RATMA_SARCOPHAGUS_LINES = [
  '모래에 반쯤 묻힌 석관이 있다. 뚜껑에는 해골과 새싹이 맞물린 문양이 새겨져 있다.',
  '뚜껑을 밀어내자, 안은 비어 있고 — 희미하게 맥동하는 파편 하나만 남아 있다.',
  '「…살아 있는 것은 언젠가 죽고, 죽은 것은 다시 무언가를 살린다.」',
  '「그 순환을 두려워하지 않는 자라면, 망자의 성에서 다시 만나게 되겠지.」',
  '목소리는 모래바람 속으로 사라졌다. (생명의 파편을 얻었다)'
];
const RATMA_APPARITION_LINES = [
  '성의 냉기 속에서, 누군가 당신을 지켜보고 있다.',
  '희미한 환영이 기둥 사이에 서 있다. 해골 장식 아래로, 차분한 눈이 빛난다.',
  '「생명의 파편을 지닌 자로군. 이 성의 왕은 죽음을 붙잡고 놓지 않으려 한다.」',
  '「죽음을 지배하려는 자의 끝을 보여 다오. 그 뒤에 남는 것을, 내가 거두겠다.」'
];
const RATMA_SEAL_LINES = [
  '망자의 왕이 쓰러진 자리에서 차가운 빛이 떠오른다.',
  '「그는 죽음을 붙잡으려 했고, 결국 죽음에게 삼켜졌다.」',
  '「이 인장을 가져가라. 세상이 시작된 곳 — 기원의 성역에서, 문지기 너머의 문양을 찾아라.」',
  '(영혼의 인장을 얻었다)'
];
const RATMA_GLYPH_LINES = [
  '문지기가 지키던 바닥 한쪽에서, 영혼의 인장이 차갑게 떨린다.',
  '먼지를 걷어 내자 해골과 새싹이 맞물린 문양 — 모래 무덤의 석관과 같은 문양이 드러난다.',
  '생명의 파편과 영혼의 인장을 문양 위에 올리자, 벽 너머로 숨겨진 문이 열린다.',
  '「…왔구나. 생과 사의 경계로 들어오너라.」'
];
const RATMA_BOUNDARY_LINES = [
  '빛도 어둠도 아닌 잿빛 공간. 발밑으로 산 자와 죽은 자의 기척이 함께 흐른다.',
  '「여기는 생사의 경계. 내가 만든 시험의 장소다.」',
  '「죽음을 두려워하는가? 아니면 지배하려 하는가? 어느 쪽이든 — 이 길 끝에서 드러나겠지.」'
];
const RATMA_WIN_LINES = [
  '흩어지던 영혼들이 천천히 가라앉는다. 라트마가 지팡이를 내린다.',
  '「너는 죽음을 지배하려 하지 않았다. 생명을 거스르지도 않았지. 이제 너에게 가르쳐 줄 수 있겠구나.」'
];
const RATMA_REMATCH_WIN_LINES = [
  '「…여전하구나. 균형은 너를 기억하고 있다.」',
  '라트마의 모습이 영혼의 빛 속으로 잦아든다.'
];
const RATMA_HARD_WIN_LINES = [
  '경계의 공간이 흔들리고, 라트마가 처음으로 한쪽 무릎을 꿇는다.',
  '「경계를 넘나들고도 무너지지 않는 자… 이 왕관은 이제 너의 것이다.」'
];
const RATMA_PHANTOM_LINES = [
  '심층의 어둠 속에서 라트마의 환영이 모습을 드러낸다.',
  '「이 깊은 곳까지 왔구나. 균형이 아직 너를 붙들고 있는지 — 한 번 더 보여 다오.」'
];
// 선택지 (기획서 4장)
const RATMA_CHOICES = [
  { id: 'remember', name: '라트마의 가르침을 기억하기', desc: '그의 가르침을 기억하고, 죽음과 생명의 순환을 이해한다.', color: '#9affd0',
    effects: ['네크로맨서 영구 해금 — 이후 로비에서 선택 가능', '지금 캐릭터·직업·전직 상태는 그대로', '특별 3차 전직·고유 무기는 받지 않음'] },
  { id: 'follow', name: '라트마의 가르침을 따르기', desc: '그의 가르침을 직접 따르고, 생사 순환의 일부가 된다.', color: '#c08aff',
    effects: ['네크로맨서 영구 해금', '지금 캐릭터의 직업이 네크로맨서로 — 즉시 최종 전직', '전직 전용 고유 무기 + 라트마의 기록'] }
];
// 전직별·로비 대사 (영혼 제단)
const RATMA_TALK = {
  common: [
    '「생명은 죽음으로 흘러가고, 죽음은 다시 생명으로 돌아온다. 나는 그 흐름이 막히지 않게 지킬 뿐이다.」',
    '「죽음을 미워하지 마라. 죽음을 탐하지도 마라. 둘 다 균형을 무너뜨린다.」',
    '「던전의 깊은 곳에서도 영혼은 흐른다. 심층에서 다시 나를 보게 될지도 모르지.」'
  ],
  necro: [
    '「사령술은 죽은 자를 부리는 기술이 아니다. 죽은 자에게 잠시 길을 빌리는 일이다.」',
    '「네가 부른 영혼은 언젠가 돌려보내야 한다. 그걸 잊지 마라, 제자여.」'
  ],
  lich: [
    '「죽음의 본질을 아는 자는 저주를 함부로 쓰지 않는다. 저주는 균형을 되돌리는 무게일 뿐이다.」',
    '「불멸의 군주여, 영원은 상이 아니라 짐이다. 끝나지 않는 것은 흐르지 않는 것이니.」'
  ],
  wraith: [
    '「영혼을 지휘하는 자는 그들의 고통까지 함께 짊어진다. 그것이 고뇌라는 이름의 무게다.」',
    '「망자의 군주여, 군단은 너를 따르지만 — 네 것은 아니다. 언젠가 모두 돌려보내라.」'
  ],
};

// ── 시련 정의 (기존 TRIALS 구조 재사용 — 확인 창·결과 창·시련 장비)
const RATMA_BOUNDARY_PALETTE = { style: 'bone', accent: '#9affd0', floor: ['#2a2e32', '#2d3135'], corridor: ['#1c1f22', '#1e2124'], wall: '#363c42', wallTop: '#454c54',
  wallFace: '#5e6872', faceLine: '#505a64', deco: 'rgba(154,255,208,0.32)' };
const RATMA_TRIAL = { // 첫 대결: 탐험 중인 캐릭터 그대로 (시련 장비 없음)
  id: 'ratma', title: '생사의 경계', color: '#9affd0', intro: '경계의 끝에서 라트마가 기다리고 있습니다', story: true,
  winText: '라트마의 시험을 통과했습니다', winSub: '', winLines: () => RATMA_WIN_LINES,
  world: 9,
  W: { name: '생사의 경계', boss: 'boss_ratma', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_skelknight_001', 2], ['enemy_ghost_001', 1], ['enemy_bonemage_001', 1], ['enemy_ratma_wraith_001', 3], ['enemy_ratma_revenant_001', 2]],
    palette: RATMA_BOUNDARY_PALETTE }
};
const RATMA_REMATCH_TRIAL = {
  id: 'ratma_rematch', title: '라트마 재대결', color: '#9affd0', intro: '라트마가 다시 시험을 내립니다', retry: '잃은 것은 없습니다. 영혼의 제단에서 다시 도전할 수 있습니다',
  confirm: ['생사의 경계 — 망령들을 뚫고 라트마와 다시 싸웁니다', '고른 진화 단계로, 도감의 무기 중 2개를 골라 +3 강화해 들고 가고, 축복 3개를 직접 고릅니다 · 첫 승리: 생사의 균형추'],
  winText: '라트마를 다시 쓰러뜨렸습니다', winSub: '', winLines: () => RATMA_REMATCH_WIN_LINES,
  world: 9,
  W: { name: '생사의 경계 — 재대결', boss: 'boss_ratma_rematch', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_ratma_wraith_001', 3], ['enemy_ratma_revenant_001', 2], ['enemy_skelknight_001', 1]], palette: RATMA_BOUNDARY_PALETTE },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 3, buffs: 0, picks: 3 }
};
const RATMA_HARD_TRIAL = {
  id: 'ratma_hard', title: '라트마 고난도 재대결', color: '#c08aff', intro: '경계의 주인이 모든 힘을 드러냅니다', retry: '잃은 것은 없습니다. 영혼의 제단에서 다시 도전할 수 있습니다',
  confirm: ['생사의 경계 — 모든 힘을 드러낸 라트마와 싸웁니다 (2페이즈부터 궁극기)', '재대결보다 훨씬 강합니다. 무기 2개 +4 강화 · 축복 3개 · 첫 승리: 경계의 왕관'],
  winText: '경계의 주인을 넘어섰습니다', winSub: '', winLines: () => RATMA_HARD_WIN_LINES,
  world: 9,
  W: { name: '생사의 경계 — 고난도', boss: 'boss_ratma_hard', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_ratma_wraith_001', 3], ['enemy_ratma_revenant_001', 3]], palette: RATMA_BOUNDARY_PALETTE },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 4, buffs: 0, picks: 3 }
};
Object.assign(TRIALS, { ratma: RATMA_TRIAL, ratma_rematch: RATMA_REMATCH_TRIAL, ratma_hard: RATMA_HARD_TRIAL });
// 재대결 보상 [제안]: 첫 승리 고유 무기, 이후 결정석
const RATMA_REMATCH_REWARD = { ratma_rematch: { weapon: 'weapon_ratma_balance_001', bank: 200 }, ratma_hard: { weapon: 'weapon_ratma_crown_001', bank: 400 } };
// 심층: 라트마의 환영이 나타나는 조건 [제안] — 라트마를 쓰러뜨린 뒤, 심층 일반 스테이지(x-2)에서 이 확률로 보물방에
const RATMA_PHANTOM = { chance: 0.35, level: 1 };
