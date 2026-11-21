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
  { id: 'skin_flamewitch', name: '불꽃 마녀', hero: 'hero_mage', line: 'fire', sprite: 'flamewitch', grade: 'special', desc: '불 마도사 외형: 끝이 꺾인 마녀 모자와 붉은 원피스' },
  { id: 'skin_redgunner', name: '붉은 머리 총잡이', hero: 'hero_gunner', line: 'base', sprite: 'redgunner', grade: 'special', desc: '속사 사수 외형: 붉은 머리와 보안관 별을 단 남색 조끼' },
  { id: 'skin_silverelf', name: '은빛 엘프 마법사', hero: 'hero_mage', line: 'light', sprite: 'silverelf', grade: 'special', desc: '빛 마도사 외형: 은발 양갈래 엘프, 흰 옷에 금테 — 상하좌우 걷는 그림이 따로 있음' },
  {id:'skin_abyss_knight',name:'심연의 맹세',hero:'hero_swordsman',line:'sword',sprite:'abyssKnight',grade:'legendary',desc:'청록 균열광의 심연 갑주'},
  {id:'skin_star_paladin',name:'성좌의 집행자',hero:'hero_priest',line:'base',sprite:'starPaladin',grade:'legendary',desc:'별빛 갑주와 황금 성흔'},
  {id:'skin_void_empress',name:'공허의 여제',hero:'hero_mage',line:'dark',sprite:'voidEmpress',grade:'legendary',desc:'검보라 왕관과 공허 망토'},
  {id:'skin_crimson_lotus',name:'홍련의 무희',hero:'hero_assassin',line:'shadow',sprite:'crimsonLotus',grade:'legendary',desc:'진홍 장막과 연꽃 장식'},
  {id:'skin_moon_shrine',name:'월하 무녀',hero:'hero_mage',line:'ice',sprite:'moonShrine',grade:'epic',desc:'청백색 무녀복과 초승달 장식'},
  {id:'skin_arcane_idol',name:'성운 아이돌',hero:'hero_priest',line:'bless',sprite:'arcaneIdol',grade:'epic',desc:'별 리본과 은하 프릴의 오리지널 애니풍 스킨'},
  {id:'skin_dragon_samurai',name:'용혈의 낭인',hero:'hero_berserker',line:'base',sprite:'dragonRonin',grade:'epic',desc:'용뿔 투구와 붉은 비늘 갑주'},
  {id:'skin_clockwork_fox',name:'시계태엽 여우',hero:'hero_engineer',line:'base',sprite:'clockworkFox',grade:'epic',desc:'기계 귀와 황동 고글'}
];
// 스킨 등급 [사용자 결정] 은빛 엘프 마법사 = 특별 등급 (grade 없는 스킨은 등급 표시 없음)
const SKIN_GRADES = { special:{name:'특별',color:'#ffd84a',glow:'#fff2a8'}, epic:{name:'영웅',color:'#b080ff',glow:'#e0c0ff'}, legendary:{name:'전설',color:'#ff9a3a',glow:'#ffe0a0'} };
// 선물 코드: 글자 그대로 두지 않고 해시로만 보관 (giftHash) — 코드 하나에 보상 하나, 계정마다 한 번
const GIFT_CODES = [
  { hash: 'd6b73fd4', skin: 'skin_flamewitch' },
  { hash: 'ca1080ea', skin: 'skin_redgunner' },
  { hash: '8b67ec', skin: 'skin_silverelf' }
];
function giftHash(code) { let h = 0x811c9dc5; for (const ch of 'pd_gift:' + String(code).toUpperCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); }
function skinAllowed(sp, heroId, lineId) { return SKINS.some((k) => k.sprite === sp && k.hero === heroId && (!k.line || k.line === lineId)); } /* [사용자 결정] 스킨은 정해진 갈래일 때만 (불꽃 마녀 = 불 마도사 · 붉은 머리 총잡이 = 속사 사수 · 은빛 엘프 마법사 = 빛 마도사) */
function skinSpriteOk(sp) { return SKINS.some((k) => k.sprite === sp) ? sp : null; } /* 멀티로 받은 외형 이름은 아는 스킨만 */

const SKIN_GACHA={singleCost:120,tenCost:1080,pity:50,featuredId:'skin_void_empress',rates:{legendary:0.02,epic:0.18},duplicateShards:{legendary:80,epic:25,special:40}};
const SKIN_GACHA_POOL=SKINS.filter(k=>k.grade==='legendary'||k.grade==='epic'||k.grade==='special');
function skinGachaRoll(sv){
 const st=sv.skinGacha||(sv.skinGacha={pity:0,shards:0,total:0});
 const forced=st.pity>=SKIN_GACHA.pity-1,r=Math.random();
 let grade=forced?'legendary':r<SKIN_GACHA.rates.legendary?'legendary':r<SKIN_GACHA.rates.legendary+SKIN_GACHA.rates.epic?'epic':'special';
 let pool=SKIN_GACHA_POOL.filter(k=>k.grade===grade);if(!pool.length)pool=SKIN_GACHA_POOL.filter(k=>k.grade==='epic');
 if(grade==='legendary'&&Math.random()<.5){const f=pool.find(k=>k.id===SKIN_GACHA.featuredId);if(f)pool=[f];}
 const skin=pool[Math.floor(Math.random()*pool.length)];st.total++;st.pity=grade==='legendary'?0:st.pity+1;
 const duplicate=sv.skins.includes(skin.id),refund=duplicate?(SKIN_GACHA.duplicateShards[grade]||10):0;
 if(duplicate)st.shards+=refund;else sv.skins.push(skin.id);sv.skinGacha=st;return{skin,grade,duplicate,refund,forced};
}
