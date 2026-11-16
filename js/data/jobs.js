'use strict';
// ════════════════════════════════════════════
// 데이터: 직업 계열 · 2단 진화 (그 판 동안만)
//  · 갈래가 여럿인 직업(검사·마도사)은 판을 시작할 때 하나를 고름
//  · 특수방 '전직의 방'의 상위자와 대결해 이기거나 골드를 내면 다음 단계로 진화 → 스킬이 바뀌고 능력치가 오름
//  · ranks: [기본, 1차 진화, 2차 진화] 이름 / skills: 단계별 스킬
//  스킬 수치(dmg 등)는 기본값이고, 실제 피해는 스테이지 깊이에 따라 조금씩 커짐 (game.skillDmg)
// ════════════════════════════════════════════
const EVOLUTION = {
  price: [180, 320],        // 1차·2차 진화 골드 (상점처럼 스테이지마다 오름)
  hp: [20, 30], energy: [40, 60], // 진화할 때 오르는 최대 체력·에너지
  masterHp: [480, 760]      // 상위자 체력 (스테이지 강화 적용 전)
};

const JOB_LINES = {
  hero_swordsman: {
    title: '검술 선택',
    sword: { name: '검사', desc: '장검 · 균형 잡힌 근접 전투', startWeapon: 'weapon_sword_001', ranks: ['검사', '검성', '검신'], color: '#d8e0e8',
      skills: [
        { id: 'whirlwind', name: '회오리 베기', desc: '주변을 베고 적 탄환을 지움 (도는 동안 무적)', cd: 6 },
        { id: 'whirlwind2', name: '검풍', desc: '회오리 베기 + 사방으로 검기 8줄', cd: 6 },
        { id: 'swordrain', name: '천검난무', desc: '조준 지점 넓은 범위에 빛의 검이 쏟아짐', cd: 9 }] },
    great: { name: '대검사', desc: '대검 · 느리지만 한 방이 강함 (이동 속도 -10)', startWeapon: 'weapon_greatsword_001', moveSpeed: -10, ranks: ['대검사', '파쇄자', '대지의 군주'], color: '#c8a070',
      skills: [
        { id: 'cleave', name: '대지 가르기', desc: '전방 일직선으로 땅을 가르는 충격파', cd: 7 },
        { id: 'cleave3', name: '삼연 가르기', desc: '부채꼴로 충격파 세 줄', cd: 7 },
        { id: 'quake', name: '대지 붕괴', desc: '1초간 힘을 모아(이동 불가) 주변 전체를 내려침', cd: 10 }] }
  },
  hero_mage: {
    title: '속성 선택',
    fire: { name: '불', desc: '화염 지팡이 · 태워서 지속 피해', startWeapon: 'weapon_firestaff_001', ranks: ['불의 마도사', '화염술사', '폭염의 대마도사'], color: '#ff7a3a',
      skills: [
        { id: 'fireball', name: '파이어볼', desc: '폭발하는 큰 불덩이를 발사 (화상)', cd: 4 },
        { id: 'flamestorm', name: '화염 회오리', desc: '5초간 자기 주위에 불길이 휘몰아쳐 지속 피해', cd: 9 },
        { id: 'explosion', name: '익스플로전', desc: '범위를 정하고 2초간 시전(이동 불가) → 범위에 엄청난 피해', cd: 10 }] },
    ice: { name: '얼음', desc: '서리 지팡이 · 얼려서 묶음', startWeapon: 'weapon_frost_001', ranks: ['얼음의 마도사', '빙결술사', '혹한의 대마도사'], color: '#9ad8ff',
      skills: [
        { id: 'icelance', name: '얼음 창', desc: '적을 꿰뚫는 얼음 창 3개 (빙결)', cd: 4 },
        { id: 'frost_nova', name: '서리 폭발', desc: '주변 적 피해 + 강한 빙결, 탄환 제거', cd: 6 },
        { id: 'blizzard', name: '블리자드', desc: '조준 지점에 5초간 눈보라 (지속 피해 + 빙결)', cd: 11 }] },
    nature: { name: '자연', desc: '독안개 지팡이 · 묶고 중독', startWeapon: 'weapon_poisonstaff_001', ranks: ['자연의 마도사', '숲의 술사', '태고의 대마도사'], color: '#7adf4a',
      skills: [
        { id: 'thorns', name: '가시 덩굴', desc: '주변 적을 덩굴로 묶고 중독', cd: 7 },
        { id: 'bog', name: '독 늪', desc: '조준 지점에 6초간 독 늪 (중독 + 지속 피해)', cd: 9 },
        { id: 'worldtree', name: '세계수의 분노', desc: '1.5초 시전(이동 불가) → 넓은 범위를 오래 묶고 강한 중독, 체력 회복', cd: 13 }] },
    lightning: { name: '번개', desc: '테슬라 코일 · 연쇄 번개', startWeapon: 'weapon_tesla_001', ranks: ['번개의 마도사', '뇌전술사', '뇌신의 대마도사'], color: '#bfe8ff',
      skills: [
        { id: 'shockorb', name: '전격구', desc: '튕겨 다니며 연쇄 번개를 일으키는 구체 (전격)', cd: 4 },
        { id: 'thunder', name: '낙뢰', desc: '가까운 적 6명에게 번개가 떨어짐 (전격)', cd: 6 },
        { id: 'thundergod', name: '뇌신강림', desc: '6초간 주변 적에게 번개가 계속 떨어짐 (전격)', cd: 12 }] },
    light: { name: '빛', desc: '견습 마법봉 · 회복과 정화', startWeapon: 'weapon_wand_001', ranks: ['빛의 마도사', '정화술사', '성광의 대마도사'], color: '#fff4c0',
      skills: [
        { id: 'lightarrow', name: '빛의 화살', desc: '적을 따라가 꿰뚫는 빛의 화살 5개 (실명)', cd: 4 },
        { id: 'radiance', name: '광휘', desc: '체력 회복 + 주변 적 피해(실명), 탄환 제거', cd: 6 },
        { id: 'judgment', name: '심판의 빛', desc: '1.5초 시전(이동 불가) → 조준 지점에 빛기둥, 큰 피해(실명) + 체력 회복', cd: 11 }] },
    dark: { name: '어둠', desc: '저주 지팡이 · 약점과 흡인', startWeapon: 'weapon_cursestaff_001', ranks: ['어둠의 마도사', '저주술사', '공허의 대마도사'], color: '#a070e0',
      skills: [
        { id: 'curseshot', name: '저주탄', desc: '맞은 적이 오래 약해지는(받는 피해 +40%) 저주 구체 (저주)', cd: 4 },
        { id: 'abyss', name: '심연 소용돌이', desc: '조준 지점에 적을 빨아들이는 어둠 (저주)', cd: 8 },
        { id: 'voidcollapse', name: '블랙홀', desc: '2초 시전(이동 불가)하며 블랙홀로 주변 적을 모두 빨아들인 뒤 터뜨려 엄청난 피해', cd: 13 }] }
  },
  hero_gunner: { base: { ranks: ['사수', '건마스터', '데드아이'], color: '#ffd84a',
    skills: [
      { id: 'overdrive', name: '과부하 사격', desc: '5초간 공격 속도 2배, 에너지 무소모', cd: 15 },
      { id: 'overdrive2', name: '탄막 폭주', desc: '7초간 공격 속도 2배·공격력 +40%, 에너지 무소모', cd: 15 },
      { id: 'deadeye', name: '데드아이', desc: '1초 조준(이동 불가) → 보이는 모든 적을 한 발씩 저격', cd: 14 }] } },
  hero_engineer: { base: { ranks: ['기술자', '기계공학자', '전쟁 설계자'], color: '#f0c030',
    skills: [
      { id: 'turret', name: '자동 포탑', desc: '12초간 적을 쏘는 포탑 설치', cd: 13 },
      { id: 'turret2', name: '포대 전개', desc: '15초간 강한 포탑 2개 설치', cd: 13 },
      { id: 'barrage', name: '궤도 폭격', desc: '1초 신호(이동 불가) → 조준 지점에 포격 14발', cd: 13 }] } },
  hero_assassin: { base: { ranks: ['암살자', '그림자 군주', '그림자 그 자체'], color: '#b080ff',
    skills: [
      { id: 'blink', name: '그림자 습격', desc: '조준 방향으로 순간이동하며 지나간 적을 벰 (잠깐 무적)', cd: 5 },
      { id: 'blink2', name: '그림자 연무', desc: '습격을 연달아 3번 (피해 증가)', cd: 5 },
      { id: 'execution', name: '그림자 처형', desc: '그림자 분신 둘과 함께 셋이서 주변 적을 연달아 습격 (무적), 체력 25% 이하(보스 10%)인 적은 즉시 처형', cd: 11 }] } },
  hero_priest: { base: { ranks: ['사제', '대사제', '성자'], color: '#ffe9a0',
    skills: [
      { id: 'sanctuary', name: '성역', desc: '6초간 빛의 원: 안에 있으면 회복, 원 안의 적 지속 피해, 들어오는 적 탄 소멸', cd: 13 },
      { id: 'sanctuary2', name: '대성역', desc: '더 넓고 오래, 회복·피해 2배, 안에 있으면 공격력 +35%', cd: 13 },
      { id: 'descent', name: '신성 강림', desc: '1초 기도(이동 불가) → 2초 무적, 체력 40% 회복, 주변 큰 피해', cd: 15 }] } },
  hero_berserker: { base: { ranks: ['광전사', '전쟁광', '피의 군주'], color: '#ff5a3a',
    skills: [
      { id: 'rage', name: '분노', desc: '5초간 공격력 +70%, 이동 속도 +20%', cd: 12 },
      { id: 'rage2', name: '광란', desc: '8초간 공격력 +100%·이동 속도 +20%, 처치할 때마다 체력 +5', cd: 10 },
      { id: 'bloodstorm', name: '피의 폭풍', desc: '6초간 광란 + 자기 주위에 피의 소용돌이 (지속 피해·흡혈)', cd: 16 }] } },
  hero_druid: { base: { ranks: ['드루이드', '대드루이드', '숲의 군주'], color: '#9ad8ff',
    skills: [
      { id: 'wolves', name: '영혼 늑대', desc: '12초간 적을 물어뜯는 늑대 3마리 소환', cd: 13 },
      { id: 'wolves2', name: '야수의 무리', desc: '16초간 강한 늑대 4마리 (물면 둔화)', cd: 13 },
      { id: 'guardian', name: '대지의 수호수', desc: '18초간 거대한 곰(내려치기 범위 피해) + 강한 늑대 3마리 소환', cd: 15 }] } }
};
// 직업의 갈래 목록 (title 제외)
function jobLines(heroId) { const J = JOB_LINES[heroId] || {}; return Object.keys(J).filter((k) => k !== 'title').map((k) => Object.assign({ id: k }, J[k])); }

// ════════════════════════════════════════════
// 혼합 전직 (제안 단계 · 지금은 마검사 하나)
//  2차 진화 차례에 전직의 방에 들어가면 일정 확률로 내 직업 대신 다른 직업의 상위자가 나옴
//  → 그 상위자를 이기거나 골드를 내면 혼합 직업으로 진화 (능력치 상승은 2차 진화와 같음)
//  속성은 나온 상위자(마도사 갈래)를 따라감
// ════════════════════════════════════════════
const HYBRID_JOBS = {
  spellblade: { from: 'hero_swordsman', master: 'hero_mage', chance: 0.3, name: '마검사',
    skill: { id: 'spellblade', name: '마력 검무', desc: '회오리 베기 + 사방으로 속성 검기 8줄, 맞은 적에게 속성 상태이상', cd: 6 },
    passiveChance: 0.15 } // 근접 공격에 붙는 속성 상태이상 확률
};
// 마도사 갈래 → 그 속성의 상태이상
const ELEMENT_STATUS = {
  fire: { type: 'burn', chance: 1, duration: 3, dps: 10 },
  ice: { type: 'freeze', chance: 1, duration: 2, slow: 0.45 },
  nature: { type: 'poison', chance: 1, duration: 4, dps: 10 },
  lightning: { type: 'shock', chance: 1, duration: 3 },
  light: { type: 'blind', chance: 1, duration: 3 },
  dark: { type: 'curse', chance: 1, duration: 4 }
};
