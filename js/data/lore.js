'use strict';
// ════════════════════════════════════════════
// 데이터: 세계관 연출 문구 / 보구
//  기준: PROJECT_DUNGEON 기획서 v1.6
//  [확정] = 기획서 확정 사항을 옮긴 문장 / [임시] = 연출용 임시 문구 (기획 확정 시 교체)
// ════════════════════════════════════════════

// 프롤로그: 첫 던전 입장 시 1회 (로비 일시정지 메뉴에서 다시 보기)
//  플레이어의 소원은 여기서 밝히지 않는다 (기획서 7.1: 기원의 성역에서 처음 드러남)
const PROLOGUE_LINES = [
  '끝없이 아래로 이어지는 던전.',                                          // [확정] 기획서 표제
  '던전은 인류의 역사보다 오래전부터 그곳에 있었다.',                      // [확정] 2.1
  '여러 시대와 문명에 걸쳐, 던전의 흔적과 탐험 이야기가 전해져 왔다.',      // [확정] 2.1
  '전승에 따르면, 던전은 태초의 신이 창조했다.',                           // [확정] 2.1
  '그리고 신은 미래의 누군가를 위해 자신의 유산을 남겼다고 전해진다.',      // [확정] 2.3
  '어떤 이는 그것을 성배라 불렀고,\n어떤 이는 불멸의 진실, 어떤 이는 신의 지혜와 권능이라 불렀다.', // [확정] 4.1 (전승 속 이름들)
  '하나의 존재, 수많은 전설.',                                             // [확정] 기획서 표제
  '그리고 각자가 품은 단 하나의 소원.',                                    // [확정] 기획서 표제
  '당신은 지금, 그 던전의 입구에 서 있다.'                                 // [임시]
];

// 기원의 성역: 무명의 문지기를 쓰러뜨린 뒤, 성역 깊은 곳에서 전설의 존재와 마주하는 장면
//  전설의 존재의 이름·외형·형태는 미정 → 형체를 그리지 않고 빛으로만 표현
const SANCTUM_LINES = [
  '기원의 성역, 그 가장 깊은 곳.',                       // [임시]
  '형체를 알 수 없는 무언가가 그곳에 있다.',             // [임시] (외형 미정)
  '그것이 당신의 내면을 읽는다.',                        // [확정] 7.2 (내면을 읽음)
  '한 번도 입 밖에 낸 적 없는 소원.',                    // [확정] 7.2 (말한 적 없음)
  '「더 강해지고 싶다」',                                // [확정] 7.2
  '그 앞에 보구들이 모습을 드러낸다.'                    // [확정] 7.3 (보구를 제시함)
];
const SANCTUM_AFTER = '던전은 더 깊은 곳으로 이어진다.';  // [확정] 10.1

// 제10 필드 '기원의 성역' 컷신 (게임 화면 위에서 진행, 처음 한 번만 · Esc로 건너뛰기)
//  모두 [임시] 연출 문구 — 성역의 구조·문지기의 정체 등 미정 설정은 단정하지 않는다
const ORIGIN_ARRIVAL_LINES = [
  '발밑의 돌이 달라졌다. 낡은 석판 사이로 금빛 이음선이 흐른다.',      // [임시]
  '전승 속에 이름만 남아 있던 곳 — 기원의 성역.',                       // [임시] (필드 이름은 기획서 6장)
  '이곳 어딘가에, 신이 남긴 유산이 잠들어 있다고 전해진다.'              // [임시] (2.3 전승을 다시 말함)
];
const GATEKEEPER_INTRO_LINES = [
  '거대한 문이 길을 가로막고 있다.',                                     // [임시]
  '그 앞에, 이름도 얼굴도 알 수 없는 누군가가 서 있다.',                 // [임시] (문지기 외형은 이름의 인상으로 만든 임시 디자인)
  '무명의 문지기. 그는 아무 말 없이 무기를 든다.'                        // [임시]
];
const GATEKEEPER_FALL_LINES = [
  '문지기가 천천히 무릎을 꿇는다.',                                     // [임시]
  '굳게 닫혀 있던 문이, 소리도 없이 열린다.',                            // [임시]
  '문 너머에서 따뜻한 빛이 새어 나온다.'                                 // [임시]
];

// 보구(寶具): 일반 무기 등급과 별개인 독립 분류, 획득하면 사망해도 영구 보유 [확정]
//  [사용자 결정] 무기·스킬과 별개인 제3의 도구, R키로 사용. 로비 '보구 보관대'에서 보유한 보구 중 1개를 골라 런에 들고 감
//  [사용자 결정] 목록·능력은 아래 3종. 쿨타임·수치는 Claude가 정한 값(조정 가능)
//  기원의 성역에서 처음 받는 보구는 이 3종 중 하나를 직접 고름. 추가 보구 획득 방법은 미정
//  [사용자 결정] 보구는 신의 것이면 안 됨 — 주인은 최대 반신, 보통은 인간 (영웅의 도구)
const DATA_TREASURES = [
  { id: 'treasure_gate_of_babylon', name: '게이트 오브 바빌론', origin: '길가메시', use: 'chains', cooldown: 60, sfx: 'gate', icon: 'gate',
    radius: 92, range: 200, duration: 6, damage: 280, weak: 1.7, color: '#ffd84a',
    desc: '전방의 아주 넓은 원형 범위에 황금 사슬을 소환해 적을 6초간 묶고 큰 피해, 묶인 적은 받는 피해 +70%' },
  { id: 'treasure_excalibur', name: '엑스칼리버', origin: '아서왕', use: 'beam', cooldown: 70, sfx: 'excal', icon: 'excalibur',
    damage: 950, width: 28, range: 300, blast: 86, blastRatio: 0.3, stun: 1, color: '#ffe9a0', // blast: 끝 폭발 반경, blastRatio: 폭발 추가 피해 비율 · [사용자 결정] 너프하되 보구 중 가장 강한 한 방은 유지 (예전: 피해 1050 · 폭발 35% · 경직 1.5초 · 쿨 65초)
    desc: '검을 들어 빛기둥을 세운 뒤 조준 방향으로 내려꽂아 일직선에 압도적인 피해(벽 관통), 조준한 지점에서 폭발, 맞은 적은 1초 경직 — 보구 중 가장 강한 한 방' },
  { id: 'treasure_ring_of_solomon', name: '솔로몬의 반지', origin: '솔로몬', use: 'blessing', cooldown: 68, sfx: 'solomon', icon: 'ring',
    duration: 12, atk: 0.6, rate: 0.45, speed: 0.3, guard: 0.4, heal: 0.3, skillHaste: 1.5, color: '#c8a0ff', // [사용자 결정] 너프 (예전: 15초 · 공격력 +90% · 공속 +70% · 이동 +35% · 피해 -60% · 체력 50% · 스킬 2배)
    desc: '12초간 공격력 +60%·공격 속도 +45%·이동 속도 +30%·받는 피해 -40%·스킬 쿨타임 1.5배 빨리 회복, 체력 30%·에너지·보호막 회복, 스킬 쿨타임 초기화' },
  // [사용자 결정] 탐험가 길드의 멀린이 주는 시련을 마치면 얻는 보구 (성역의 보구 선택지에는 나오지 않음). 수치는 Claude가 정한 값
  { id: 'treasure_garden_of_avalon', name: '가든 오브 아발론', origin: '멀린', use: 'garden', cooldown: 58, sfx: 'solomon', icon: 'avalon', questOnly: true,
    duration: 16, atk: 0.55, guard: 0.45, regen: 7, slowK: 0.55, vuln: 0.35, color: '#ffb0d8', // [사용자 결정] 버프 (예전: 쿨 66초 · 12초 · 공격력 +35% · 피해 -30% · 초당 4 회복 · 적 피해 +20%), 멀티에서는 꽃밭 안의 동료 모두
    desc: '방 한가운데 아발론의 탑을 소환하고 16초간 방을 꽃밭으로 — 꽃밭 안의 적은 크게 느려지고 받는 피해 +35%, 꽃밭 안의 아군은 공격력 +55%·받는 피해 -45%·체력 초당 7 회복' },
  // [사용자 결정] 아서왕의 창 롱고미니아드. 얻는 법: 멀린의 두 번째 시련 → 신령 롱고미니아드 보스전 승리 [사용자 결정]. 능력·수치는 Claude가 정한 [제안]
  { id: 'treasure_rhongomyniad', name: '롱고미니아드', origin: '아서왕', use: 'spear', cooldown: 64, sfx: 'excal', icon: 'rhongo', questOnly: true,
    damage: 380, impact: 64, range: 240, radius: 100, duration: 5, tick: 0.5, tickDmg: 36, pull: 70, final: 320, color: '#bfe6ff',
    desc: '빛의 창을 조준 지점에 던져 꽂으면 5초간 거대한 빛의 탑이 솟아 주변 적을 끌어당기며 계속 피해, 마지막에 탑이 무너지며 큰 폭발' },
  // [사용자 결정] 페르세우스(반신)의 하데스의 투구 · 쿠 훌린(반신)의 게이볼그. 능력·수치·획득 방법(심층 보스 처치 시 낮은 확률)은 Claude가 정한 [제안]
  { id: 'treasure_helm_of_hades', name: '하데스의 투구', origin: '페르세우스', use: 'invis', cooldown: 62, sfx: 'solomon', icon: 'helm', questOnly: true, heroDrop: true,
    duration: 6, bossDur: 3, atk: 0.5, speed: 0.2, color: '#9aa8c8',
    desc: '6초간 모습을 감춰 적이 나를 찾지 못함(보스는 처음 3초만), 그동안 공격력 +50%·이동 속도 +20%' },
  { id: 'treasure_gae_bolg', name: '게이볼그', origin: '쿠 훌린', use: 'thorn', cooldown: 63, sfx: 'excal', icon: 'gaebolg', questOnly: true, heroDrop: true,
    damage: 650, thornR: 110, thornDmg: 110, bleed: 5, bleedDps: 40, color: '#ff4a5a',
    desc: '가장 강한 적(보스 우선)에게 절대 빗나가지 않는 창을 던져 큰 피해, 꿰뚫린 자리에서 가시가 터져 주변 적을 찌르고, 맞은 적은 5초간 출혈' },
  // [사용자 결정] 아킬레우스(반신)의 방패: 4초간 피해 없음 + 닿는 적 탄을 그대로 반사 · 이아손의 황금 양털: 체력 50% 회복 + 버티기(한 판 2번)
  //  얻는 법(심층 보스 전리품 heroDrop)·쿨타임·반사 피해 수치는 Claude가 정한 [제안]
  { id: 'treasure_shield_of_achilles', name: '아킬레우스의 방패', origin: '아킬레우스', use: 'reflect', cooldown: 60, sfx: 'solomon', icon: 'achilles', questOnly: true, heroDrop: true,
    duration: 4, reach: 10, damage: 45, mult: 2, color: '#ffc850', // reach: 몸 바깥으로 탄을 받아 내는 거리, 반사 피해 = damage + 탄 피해 × mult
    desc: '4초간 방패를 둘러 어떤 피해도 받지 않고, 몸에 닿는 적 탄을 쏜 쪽으로 그대로 되돌려 보냄 (되돌린 탄은 적에게 큰 피해)' },
  { id: 'treasure_golden_fleece', name: '황금 양털', origin: '이아손', use: 'fleece', cooldown: 70, sfx: 'solomon', icon: 'fleece', questOnly: true, heroDrop: true,
    heal: 0.5, guardDur: 20, endureHp: 0.3, endureMax: 2, color: '#ffd870',
    desc: '체력 50% 회복, 그 뒤 20초 안에 쓰러질 피해를 받으면 체력 30%로 버팀 (버티기는 한 판에 2번까지)' },
  // [사용자 결정] 아서 왕(로드 로그레스) 처치 보상: 성검의 칼집 (전승: 엑스칼리버의 칼집은 지닌 자를 다치지 않게 지킴) — 수치는 Claude가 정한 [제안]
  { id: 'treasure_scabbard', name: '성검의 칼집', origin: '아서 왕', use: 'scabbard', cooldown: 90, sfx: 'solomon', icon: 'scabbard', questOnly: true,
    invuln: 5, guardDur: 15, guard: 0.3, color: '#ffe9a0',
    desc: '체력을 모두 회복하고 5초간 어떤 피해도 받지 않음, 그 뒤 10초 동안 받는 피해 -30% — 왕이 101번째 원탁의 기사에게 맡긴 칼집' }
];
// 심층 보스를 쓰러뜨리면 아직 없는 영웅의 보구(heroDrop) 하나를 얻을 확률: 낮게 시작해 깊이 내려갈수록 조금씩 오름 [사용자 결정], 수치는 [제안]
//  [사용자 결정] 심층 1: 1% → 10까지 깊이마다 +1% (심층 10: 10%) → 그 뒤로 깊이마다 +0.2% (심층 11: 10.2% · 20: 12% · 50: 18%)
const HERO_TREASURE_DROP = { base: 0.01, perDepth: 0.01, until: 10, after: 0.002, max: 1 };
function heroDropChance(depth) { const D = HERO_TREASURE_DROP, d = Math.max(1, depth || 1); return Math.min(D.max, d <= D.until ? D.base + D.perDepth * (d - 1) : D.base + D.perDepth * (D.until - 1) + D.after * (d - D.until)); }
// 탐험가 길드 구석의 마법사 (멀린) — 대사는 모두 [임시] 연출 문구. 정체(아서왕의 궁정 마법사 멀린)와 보구는 [사용자 결정]
const MERLIN_REVEAL_LINES = [
  '후드 아래에서 하얀 머리카락이 흘러내린다.',
  '「…그 빛. 성역에서 받아 온 것이로군.」',
  '「이름을 숨기는 것도 여기까지인가. 나는 멀린 — 한때 아서왕의 궁정에 있던 마법사다.」',
  '「왕의 보물을 알아보는 자라면, 내 꽃밭도 맡겨 볼 만하지.」',
  '「시련을 넘겨라. 그러면 아발론의 정원을 너에게 빌려주마.」'
];
const MERLIN_REWARD_LINES = [
  '「훌륭하군. 약속대로다.」',
  '멀린이 지팡이를 가볍게 두드리자, 발밑에 꽃잎이 흩날린다.',
  '「가든 오브 아발론. 꽃이 지기 전에 싸움을 끝내도록.」'
];
// 멀린의 두 번째 시련 → 신령 롱고미니아드와의 보스전 (대사 [임시], 흐름은 [사용자 결정])
// [사용자 결정] 바빌로니아: 롱고미니아드를 쓰러뜨린 뒤 길드 잡담 탁자에서 소문 → 심층 10-4를 깨면 금빛 포탈 (던전 내부는 아직 없음) — 대사는 모두 [임시]
const BABYLON_RUMOR_LINES = [
  '「이봐, 들었어? 요즘 이상한 소문이 돌아.」',
  '「아득히 먼 옛날, 모든 보물을 가졌다는 왕 — 길가메시의 도시 바빌로니아로 가는 포탈이…」',
  '「어딘지 모를 곳에 소환됐다는 거야. 깊은 곳 어딘가에서 금빛이 새어 나온다나.」',
  '「심층 깊숙이 내려간 녀석들 말로는, 열 번째 필드쯤에서 봤다던데… 믿거나 말거나지.」'
];
const BABYLON_APPEAR_LINES = [ /* 심층 10-4에서 금빛 포탈이 처음 나타날 때 [임시] */
  '보스가 쓰러지자, 붉은 달빛 사이로 낯선 금빛이 스며들기 시작한다.',
  '바닥에 새겨진 적 없는 문양이 하나둘 떠오르고 — 허공이 갈라지며 황금의 문이 열린다.',
  '문 너머에서 오래된 목소리가 울린다. 「…잡종이 여기까지 기어 올라왔나.」',
  '「이 세상의 모든 보물은 본래 나의 것. 그 보고(寶庫)를 엿볼 자격이 있는지 — 보여 보아라.」',
  '길드에서 들었던 소문이 떠오른다. 길가메시의 도시, 바빌로니아로 가는 문이 바로 이것이다.'
];
const BABYLON_GATE_LINES = [
  '금빛 포탈 너머로 높은 성벽과 끝없는 보물고의 그림자가 아른거린다.',
  '…하지만 문은 아직 굳게 닫혀 있다. 무언가가 길을 막고 있는 듯하다.',
  '[임시] 바빌로니아 던전은 아직 준비 중입니다.',
  '이제 로비에서 + 키를 누르면 카멜롯과 바빌로니아로 바로 갈 수 있다.'
];
const MERLIN_SPEAR_LINES = [
  '「아발론의 꽃은 마음에 들었나.」',
  '「…왕에게는 검 말고도 창이 하나 있었다. 세상의 끝을 붙들어 두는 빛의 창이지.」',
  '「그 창은 내가 줄 수 있는 것이 아니다. 창이 스스로 너를 인정해야 해.」',
  '「창에 깃든 신령에게 보내 주겠다. 준비가 되지 않았다면 나중에 와도 좋다.」'
];
const RHONGO_WIN_LINES = [
  '빛의 창이 땅에 꽂힌 채, 금빛 머리의 기사가 천천히 무릎을 꿇는다.',
  '「…좋다. 세상의 끝까지, 너와 함께 가 주지.」',
  '기사의 모습이 빛으로 흩어지고, 한 자루의 창만이 남는다.'
];
// 시련 설정 [제안]: 10필드 보스 단계의 강화 배율 + 따로 준비된 장비 (최종 진화 · 전설/영웅 무기 +3 · 체력 · 축복 4개)
const RHONGO_TRIAL = {
  id: 'rhongo', title: '롱고미니아드의 시련', color: '#bfe6ff', intro: '롱고미니아드가 기다리고 있습니다',
  confirm: ['창에 깃든 신령 — 신령 롱고미니아드와 1:1로 싸웁니다', '지금까지의 어떤 보스보다 강합니다. 고른 진화 단계·축복을 받고, 도감의 무기 중 2개를 골라 +3 강화해 들고 갑니다'],
  questDone: 4, treasure: 'treasure_rhongomyniad', winText: '롱고미니아드가 당신을 인정했습니다', winSub: '보구 롱고미니아드를 얻었습니다 — 로비의 보구 보관대에서 장착할 수 있습니다', winLines: () => RHONGO_WIN_LINES,
  world: 9,
  W: { name: '롱고미니아드의 시련', boss: 'boss_rhongomyniad', trial: true, sanctum: false, deep: false, waves: 0, enemies: [['enemy_ghost_001', 1]],
    palette: { style: 'sanctum', accent: '#bfe6ff', floor: ['#3e4458', '#41475b'], corridor: ['#2c3142', '#2e3344'], wall: '#4a5268', wallTop: '#5c647a',
      wallFace: '#7e8aa4', faceLine: '#6c7892', deco: 'rgba(191,230,255,0.35)' } },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 3, buffs: 4 }
};
// [사용자 결정] 멀린의 세 번째 퀘스트 '로드 투 카멜롯': 아서왕과 원탁의 기사들이 있던 브리튼의 성 카멜롯(이명: 백악의 성)을 던전으로 — 첫 보스는 태양의 원탁의 기사 가웨인
//  대사는 모두 [임시] 연출 문구. 던전 구성(방 3개: 시작·전투 1·보스 [사용자 결정: 전투 방 1개])·장비·보상(결정석)은 Claude가 정한 [제안]
const MERLIN_CAMELOT_LINES = [
  '「창이 너를 인정했군. 그렇다면 이제 길을 알려 줄 때가 됐다.」',
  '「백악의 성, 카멜롯. 왕과 원탁의 기사들이 머물던 브리튼의 성이다.」',
  '「그 성으로 가는 길이 던전 깊은 곳에 열렸다. 성은 아직도 기사들이 지키고 있지.」',
  '「성문 앞에는 태양의 기사 가웨인이 서 있을 거다. 해가 높이 뜰수록 강해지는 사내지.」',
  '「로드 투 카멜롯. 준비가 되면 말하게.」'
];
const GAWAIN_WIN_LINES = [
  '햇빛을 머금은 검이 바닥에 꽂힌다.',
  '「…훌륭하다. 태양이 진 것은 오랜만이군.」',
  '「성문은 열렸다. 하지만 성 안의 기사들은 나만큼 너그럽지 않을 것이다.」',
  '기사의 모습이 햇살 속으로 흩어진다. 백악의 성 깊은 곳에서 또 다른 기척이 느껴진다.'
];
const CAMELOT_TRIAL = {
  id: 'camelot', title: '로드 투 카멜롯', color: '#ffd870', intro: '태양의 기사 가웨인이 성문을 지키고 있습니다', reward: 500, questDone: 6,
  confirm: ['백악의 성 카멜롯 — 성의 기사들을 뚫고 성문을 지키는 태양의 기사 가웨인과 싸웁니다', '롱고미니아드보다 강합니다. 고른 진화 단계로, 도감의 무기 중 2개를 골라 +3 강화해 들고 가고, 축복 3개를 직접 고릅니다'],
  winText: '가웨인을 쓰러뜨리고 성문을 열었습니다', winSub: '결정석 500개를 받았습니다 — 카멜롯 깊은 곳의 이야기는 다음에 이어집니다', winLines: () => GAWAIN_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯', boss: 'boss_gawain', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 3], ['enemy_camxbow_001', 2], ['enemy_cammonk_001', 1]],
    palette: { style: 'sanctum', accent: '#ffd870', floor: ['#b8b2a6', '#bcb6aa'], corridor: ['#a49e92', '#a8a296'], wall: '#d8d4ca', wallTop: '#ece8de',
      wallFace: '#c4beb0', faceLine: '#aea896', deco: 'rgba(255,216,112,0.4)' } },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 3, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯 2층 보스: 반전의 기사 트리스탄 (궁수), 보구 페일노트. 패턴·'반전'(3페이즈부터 화살이 지나간 뒤 되돌아옴)·수치·대사는 Claude가 정한 [제안]/[임시]
const MERLIN_TRISTAN_LINES = [
  '「성문을 넘었다지. 가웨인이 길을 내준 건 오랜만일 거다.」',
  '「성 안 두 번째 층에는 트리스탄이 있다. 활 솜씨로 그를 따를 기사는 없었지.」',
  '「사람들은 그를 반전의 기사라 부른다. 그의 화살은 지나간 뒤에도 돌아온다 — 등 뒤를 조심하게.」',
  '「그가 페일노트를 당기면, 화살은 결코 빗나가지 않는다.」',
  '「로드 투 카멜롯, 두 번째 층. 준비가 되면 말하게.」'
];
const TRISTAN_WIN_LINES = [
  '활시위가 끊어지는 소리가 성 안에 길게 울린다.',
  '「…슬픈 일이군. 내 화살이 빗나가다니.」',
  '「길은 위로 이어진다. 그 끝에서 무엇을 보게 될지는… 직접 확인하게.」',
  '기사의 모습이 희미한 선율과 함께 흩어진다.'
];
const CAMELOT2_TRIAL = {
  id: 'camelot2', title: '로드 투 카멜롯 — 2층', color: '#ff8aa0', intro: '반전의 기사 트리스탄이 기다리고 있습니다', reward: 600, questDone: 8,
  confirm: ['백악의 성 2층 — 성의 기사들을 뚫고 반전의 기사 트리스탄과 싸웁니다', '가웨인보다 강합니다. 고른 진화 단계로, 도감의 무기 중 2개를 골라 +4 강화해 들고 가고, 축복 3개를 직접 고릅니다'],
  winText: '트리스탄을 쓰러뜨리고 2층을 지났습니다', winSub: '결정석 600개를 받았습니다 — 카멜롯의 위층은 다음에 이어집니다', winLines: () => TRISTAN_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯 — 2층', boss: 'boss_tristan', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 2], ['enemy_camxbow_001', 3], ['enemy_cammonk_001', 1]],
    palette: CAMELOT_TRIAL.W.palette },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 4, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯 3층 보스: 폭주의 기사 모드레드. 보구 이름 '클래런트'(전승 속 모드레드가 든 검)·패턴·'폭주'(3페이즈부터 더 빨라짐)·수치·대사는 Claude가 정한 [제안]/[임시]
const MERLIN_MORDRED_LINES = [
  '「트리스탄까지 넘었나. …그렇다면 다음은 그 녀석이군.」',
  '「모드레드. 원탁에 앉았던 기사이자, 왕에게 칼을 겨눈 반역의 기사다.」',
  '「사람들은 그를 폭주의 기사라 부른다. 상처를 입을수록 멈추지 않고 날뛰지.」',
  '「그가 클래런트를 들어 올리면 붉은 번개가 성을 가른다. 정면에 서 있지 말게.」',
  '「로드 투 카멜롯, 세 번째 층. 준비가 되면 말하게.」'
];
const MORDRED_WIN_LINES = [
  '붉은 번개가 잦아들고, 금이 간 투구가 바닥을 구른다.',
  '「…쳇. 아직도 나를 막아서는 녀석이 있다니.」',
  '「위로 가. 거기서 네가 찾는 게 있을지도 모르니까.」',
  '반역의 기사는 끝까지 등을 보이지 않은 채 붉은 빛으로 흩어진다.'
];
const CAMELOT3_TRIAL = {
  id: 'camelot3', title: '로드 투 카멜롯 — 3층', color: '#ff5a5a', intro: '폭주의 기사 모드레드가 기다리고 있습니다', reward: 700, questDone: 10,
  confirm: ['백악의 성 3층 — 성의 기사들을 뚫고 폭주의 기사 모드레드와 싸웁니다', '트리스탄보다 강합니다. 고른 진화 단계로, 도감의 무기 중 2개를 골라 +5 강화해 들고 가고, 축복 3개를 직접 고릅니다'],
  winText: '모드레드를 쓰러뜨리고 3층을 지났습니다', winSub: '결정석 700개를 받았습니다 — 카멜롯의 위층은 다음에 이어집니다', winLines: () => MORDRED_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯 — 3층', boss: 'boss_mordred', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 3], ['enemy_camxbow_001', 2], ['enemy_cammonk_001', 1]],
    palette: CAMELOT_TRIAL.W.palette },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 5, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯 4층 보스: 부정의 기사 가레스. 보구 '보마인'(전승 속 가레스의 별명 '고운 손')·'부정'(하얀 원 안에서는 공격 불가, 3페이즈부터 주기적으로 모든 피해 무효)·수치·대사는 Claude가 정한 [제안]/[임시]
const MERLIN_GARETH_LINES = [
  '「모드레드를 넘다니… 이제 남은 층은 많지 않다.」',
  '「다음은 가레스. 부엌일부터 시작해 원탁에 오른, 손이 고운 기사지.」',
  '「사람들은 그를 부정의 기사라 부른다. 그 앞에서는 무기도, 기술도 거부당한다.」',
  '「하얀 원 안에 서면 너는 공격할 수 없다. 그리고 그가 하얀 빛을 두르면 어떤 칼날도 닿지 않지.」',
  '「로드 투 카멜롯, 네 번째 층. 준비가 되면 말하게.」'
];
const GARETH_WIN_LINES = [
  '하얀 빛이 걷히고, 젊은 기사가 조용히 검을 내려놓는다.',
  '「…그렇군요. 당신만은 부정할 수가 없었네요.」',
  '「위층의 분들은 저처럼 물러서지 않을 거예요. 부디 조심하세요.」',
  '기사는 고운 손을 가슴에 얹어 인사한 뒤 빛 속으로 사라진다.'
];
const CAMELOT4_TRIAL = {
  id: 'camelot4', title: '로드 투 카멜롯 — 4층', color: '#d8f0ff', intro: '부정의 기사 가레스가 기다리고 있습니다', reward: 800, questDone: 12,
  confirm: ['백악의 성 4층 — 성의 기사들을 뚫고 부정의 기사 가레스와 싸웁니다', '모드레드보다 강합니다. 고른 진화 단계로, 도감의 무기 중 2개를 골라 +6 강화해 들고 가고, 축복 3개를 직접 고릅니다'],
  winText: '가레스를 쓰러뜨리고 4층을 지났습니다', winSub: '결정석 800개를 받았습니다 — 카멜롯의 위층은 다음에 이어집니다', winLines: () => GARETH_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯 — 4층', boss: 'boss_gareth', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 2], ['enemy_camxbow_001', 2], ['enemy_cammonk_001', 2]],
    palette: CAMELOT_TRIAL.W.palette },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 6, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯 5층 보스: 철벽의 기사 갤러해드. 보구 '로드 카멜롯' [사용자 결정]·'철벽'(정면 공격은 방패가 막아 크게 줄어듦, 옆·뒤로 돌아가야 함)·수치·대사는 Claude가 정한 [제안]/[임시]
const MERLIN_GALAHAD_LINES = [
  '「가레스도 길을 비켰나. 이제 성의 가장 높은 곳이 가깝다.」',
  '「다섯 번째 층에는 갤러해드가 있다. 원탁의 위험한 자리에 앉고도 살아남은 유일한 기사지.」',
  '「사람들은 그를 철벽의 기사라 부른다. 그 방패 앞에서는 어떤 공격도 제대로 닿지 않는다.」',
  '「정면으로 부딪치지 말게. 그가 공격하느라 방패를 돌리지 못하는 틈에, 옆이나 뒤로 파고들어야 해.」',
  '「로드 투 카멜롯, 다섯 번째 층. 준비가 되면 말하게.」'
];
const GALAHAD_WIN_LINES = [
  '금이 간 방패가 소리 없이 바닥에 내려앉는다.',
  '「…이 방패가 무너진 것은 처음입니다.」',
  '「당신이라면 저 위의 문을 열 수 있을지도 모르겠군요.」',
  '기사는 무너진 방패 곁에 무릎을 꿇은 채, 맑은 빛이 되어 흩어진다.'
];
const CAMELOT5_TRIAL = {
  id: 'camelot5', title: '로드 투 카멜롯 — 5층', color: '#f4f4ff', intro: '철벽의 기사 갤러해드가 기다리고 있습니다', reward: 900, questDone: 14,
  confirm: ['백악의 성 5층 — 성의 기사들을 뚫고 철벽의 기사 갤러해드와 싸웁니다', '가레스보다 강합니다. 정면 공격은 방패에 막히니 옆·뒤를 노리세요. 고른 진화 단계 · +7 강화 무기 2개 · 직접 고르는 축복 3개를 들고 갑니다'],
  winText: '갤러해드를 쓰러뜨리고 5층을 지났습니다', winSub: '결정석 900개를 받았습니다 — 카멜롯의 위층은 다음에 이어집니다', winLines: () => GALAHAD_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯 — 5층', boss: 'boss_galahad', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 3], ['enemy_camxbow_001', 2], ['enemy_cammonk_001', 1]],
    palette: CAMELOT_TRIAL.W.palette },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 7, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯 6층 보스: 치열의 기사 랜슬롯. 보구 '아론다이트'(전승 속 랜슬롯의 검)·'치열'(반격 자세 + 3페이즈부터 쉬지 않는 연격)·수치·대사는 Claude가 정한 [제안]/[임시]
const MERLIN_LANCELOT_LINES = [
  '「갤러해드의 방패까지 넘었나. …이제 그가 나설 차례겠지.」',
  '「랜슬롯. 호수의 기사, 원탁에서 가장 강하다고 불린 사내다.」',
  '「사람들은 그를 치열의 기사라 부른다. 싸움이 길어질수록 그의 검은 더 빨라지지.」',
  '「그가 검을 세우고 멈춰 서면 섣불리 베지 말게. 그건 틈이 아니라 반격의 자세다.」',
  '「로드 투 카멜롯, 여섯 번째 층. 준비가 되면 말하게.」'
];
const LANCELOT_WIN_LINES = [
  '푸른 빛을 머금은 검이 처음으로 땅에 닿는다.',
  '「…훌륭하군. 이토록 치열한 싸움은 오랜만이었다.」',
  '「위로 가라. 그 끝에 무엇이 있든, 너라면 마주할 자격이 있다.」',
  '호수의 기사는 검을 거두고, 물안개처럼 흩어진다.'
];
const CAMELOT6_TRIAL = {
  id: 'camelot6', title: '로드 투 카멜롯 — 6층', color: '#8ab8ff', intro: '치열의 기사 랜슬롯이 기다리고 있습니다', reward: 1000, questDone: 16,
  confirm: ['백악의 성 6층 — 성의 기사들을 뚫고 치열의 기사 랜슬롯과 싸웁니다', '갤러해드보다 강합니다. 그가 검을 세우고 멈추면(반격 자세) 공격을 멈추세요. 고른 진화 단계 · +8 강화 무기 2개 · 직접 고르는 축복 3개를 들고 갑니다'],
  winText: '랜슬롯을 쓰러뜨리고 6층을 지났습니다', winSub: '결정석 1000개를 받았습니다 — 카멜롯의 위층은 다음에 이어집니다', winLines: () => LANCELOT_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯 — 6층', boss: 'boss_lancelot', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 3], ['enemy_camxbow_001', 2], ['enemy_cammonk_001', 1]],
    palette: CAMELOT_TRIAL.W.palette },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 8, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯 7층 보스: 아그라베인. 이명 '철완의 기사'(전승 속 별명 '단단한 손')·보구 '단죄의 철완'·'감시의 눈'·'고발'(3페이즈 표식)·수치·대사는 Claude가 정한 [제안]/[임시]
const MERLIN_AGRAVAIN_LINES = [
  '「랜슬롯마저… 이제 이 성에서 너를 막을 자는 몇 남지 않았다.」',
  '「다음은 아그라베인. 가웨인의 동생이자, 원탁의 규율을 누구보다 엄하게 지킨 기사다.」',
  '「사람들은 그를 철완의 기사라 부른다. 그의 손은 쇠처럼 단단하고, 그의 눈은 어디에나 있지.」',
  '「방 곳곳에 떠오르는 눈을 조심하게. 그리고 붉은 표식이 붙으면 절대 멈추지 말고.」',
  '「로드 투 카멜롯, 일곱 번째 층. 준비가 되면 말하게.」'
];
const AGRAVAIN_WIN_LINES = [
  '쇠 장갑이 둔탁한 소리를 내며 바닥에 떨어진다.',
  '「…규율로도 막을 수 없는 자가 있었군.」',
  '「가라. 다만 위에서 무엇을 보든, 그것이 이 성의 진실이라는 걸 잊지 마라.」',
  '감시하던 눈들이 하나씩 감기고, 기사의 모습도 어둠 속으로 사라진다.'
];
const CAMELOT7_TRIAL = {
  id: 'camelot7', title: '로드 투 카멜롯 — 7층', color: '#d8b070', intro: '철완의 기사 아그라베인이 기다리고 있습니다', reward: 1100, questDone: 18,
  confirm: ['백악의 성 7층 — 성의 기사들을 뚫고 철완의 기사 아그라베인과 싸웁니다', '랜슬롯보다 강합니다. 떠오르는 감시의 눈을 먼저 부수고, 붉은 표식이 붙으면 계속 움직이세요. 고른 진화 단계 · +9 강화 무기 2개 · 직접 고르는 축복 3개를 들고 갑니다'],
  winText: '아그라베인을 쓰러뜨리고 7층을 지났습니다', winSub: '결정석 1100개를 받았습니다 — 카멜롯의 위층은 다음에 이어집니다', winLines: () => AGRAVAIN_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯 — 7층', boss: 'boss_agravain', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 2], ['enemy_camxbow_001', 3], ['enemy_cammonk_001', 1]],
    palette: CAMELOT_TRIAL.W.palette },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 9, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯 8층 보스: 충절의 기사 베디비어 — 2페이즈 '스위치 온 아가트람'(은빛 팔이 켜져 강화 + 패턴 추가), 3페이즈 '데드 엔드 아가트람' 해방(강력한 일격을 보구로)
//  패턴·수치·대사는 Claude가 정한 [제안]/[임시]
const MERLIN_BEDIVERE_LINES = [
  '「아그라베인까지 넘었군. …다음 층에서 기다리는 자는, 내가 잘 아는 기사다.」',
  '「베디비어. 왕의 곁을 가장 오래 지킨, 충절의 기사지.」',
  '「그는 한쪽 팔을 잃고도 왕을 떠나지 않았다. 지금 그 자리에는 은빛 팔, 아가트람이 있다.」',
  '「처음엔 검으로만 싸울 거다. 하지만 그가 은빛 팔을 깨우면 싸움은 달라지고 — 끝내 그 팔을 해방하면, 단 한 번의 일격에 모든 것이 끝날 수도 있다.」',
  '「로드 투 카멜롯, 여덟 번째 층. 준비가 되면 말하게.」'
];
const BEDIVERE_WIN_LINES = [
  '은빛 팔의 빛이 천천히 꺼져 간다.',
  '「…그렇군요. 당신이라면, 끝까지 닿을 수 있을지도 모르겠습니다.」',
  '「부디 멈추지 말고 가 주십시오. 저는 이 자리에서 기다리겠습니다.」',
  '충절의 기사는 마지막까지 고개를 숙인 채, 은빛 속으로 사라진다.'
];
const CAMELOT8_TRIAL = {
  id: 'camelot8', title: '로드 투 카멜롯 — 8층', color: '#c8e0ff', intro: '충절의 기사 베디비어가 기다리고 있습니다', reward: 1200, questDone: 20,
  confirm: ['백악의 성 8층 — 성의 기사들을 뚫고 충절의 기사 베디비어와 싸웁니다', '아그라베인보다 강합니다. 3페이즈의 은빛 일격은 조준선이 붉게 바뀌어 고정되면 바로 옆으로 피하세요. 고른 진화 단계 · +10 강화 무기 2개 · 직접 고르는 축복 3개를 들고 갑니다'],
  winText: '베디비어를 쓰러뜨리고 8층을 지났습니다', winSub: '결정석 1200개를 받았습니다 — 카멜롯의 위층은 다음에 이어집니다', winLines: () => BEDIVERE_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯 — 8층', boss: 'boss_bedivere', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 3], ['enemy_camxbow_001', 2], ['enemy_cammonk_001', 1]],
    palette: CAMELOT_TRIAL.W.palette },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 10, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯 마지막 층(왕좌) 보스: 로드 로그레스 [아서 왕] — 이상적인 왕. 체력은 다른 보스의 5/3, 체력바 5개, 엑스칼리버 사용, 롱고미니아드보다 훨씬 어렵게(사실상 못 깨게)
//  [사용자 결정] 롱고미니아드가 연속 덫으로 격파됨 → 아서 왕은 모든 행동 방해(덫·경직·사슬·빙결·둔화·실명 등)에 면역
//  원탁 기사들의 기술을 모두 쓰는 구성·롱고미니아드(전승 속 아서 왕의 창)도 함께 쓰는 것·3페이즈 '이상적인 왕'·수치·대사·보상은 Claude가 정한 [제안]/[임시]
const MERLIN_ARTHUR_LINES = [
  '「…여기까지 왔나. 베디비어가 길을 열어 주었군.」',
  '「마지막 층, 백악의 성의 왕좌. 그곳에 계신 분이 누구인지는 너도 이미 알고 있겠지.」',
  '「아서 왕 — 로드 로그레스. 사람들이 꿈꾼 이상적인 왕이다. 원탁의 기사들이 쓰던 모든 검술이 그분의 것이었지.」',
  '「솔직히 말하마. 나는 네가 이길 거라 생각하지 않는다. 그 검, 엑스칼리버의 빛 앞에서 살아남은 자는 없었다.」',
  '「그래도 가겠다면… 로드 투 카멜롯, 왕좌로. 준비가 되면 말하게.」'
];
// [사용자 결정] 승리하면 아서 왕이 플레이어를 '101번째 원탁의 기사'로 인정 (대사는 [임시])
const ARTHUR_WIN_LINES = [
  '왕좌 앞에, 빛을 잃은 성검이 천천히 내려앉는다.',
  '「…그런가. 이상은, 언젠가 넘어서야 하는 것이었군.」',
  '「원탁의 자리는 백. 그러나 오늘, 하나를 더 놓겠다.」',
  '「일어나라, 이름 없는 탐험가여. 그대를 101번째 원탁의 기사로 인정한다.」',
  '「이 칼집을 가져가라. 그대가 쓰러지지 않도록 — 왕으로서 주는 선물이다.」',
  '백악의 성에 처음으로 고요가 내려앉는다.'
];
const CAMELOT9_TRIAL = {
  id: 'camelot9', title: '로드 투 카멜롯 — 왕좌', color: '#ffe9a0', intro: '이상적인 왕이 왕좌에서 기다리고 있습니다', reward: 3000, questDone: 22, treasure: 'treasure_scabbard',
  confirm: ['백악의 성 왕좌 — 로드 로그레스, 아서 왕과 싸웁니다 (체력바 5개 · 모든 행동 방해 면역)', '지금까지의 어떤 적과도 비교할 수 없습니다. 이길 수 있다고 생각하지 마세요. 고른 진화 단계 · +10 강화 무기 2개 · 직접 고르는 축복 3개를 들고 갑니다'],
  winText: '101번째 원탁의 기사로 인정받았습니다', winSub: '보구 성검의 칼집 · 칭호 「101번째 원탁의 기사」 · 결정석 3000개 — 칭호는 탐험가 길드에서 장착', winLines: () => ARTHUR_WIN_LINES,
  world: 9,
  W: { name: '백악의 성 카멜롯 — 왕좌', boss: 'boss_arthur', trial: true, rooms: 3, sanctum: false, deep: false, waves: 2,
    enemies: [['enemy_camguard_001', 3], ['enemy_camxbow_001', 2], ['enemy_cammonk_001', 2]],
    palette: CAMELOT_TRIAL.W.palette },
  kit: { hp: 135, rarity: ['legendary', 'epic'], lv: 10, buffs: 0, picks: 3 }
};
// [사용자 결정] 카멜롯: 층이 올라갈 때마다 무기 강화 +1 (1층 +3 → 8층부터 최대 +10), 시작할 때 무작위 축복 대신 '3개 중 1개 고르기'를 3번 (picks)
const TRIALS = { rhongo: RHONGO_TRIAL, camelot: CAMELOT_TRIAL, camelot2: CAMELOT2_TRIAL, camelot3: CAMELOT3_TRIAL, camelot4: CAMELOT4_TRIAL, camelot5: CAMELOT5_TRIAL, camelot6: CAMELOT6_TRIAL, camelot7: CAMELOT7_TRIAL, camelot8: CAMELOT8_TRIAL, camelot9: CAMELOT9_TRIAL };
// 심층에 처음 들어설 때 (대사 [임시] — 심층의 정체·세계관 연결은 미정, 기획서 10장)
const DEEP_ARRIVAL_LINES = [
  '발밑의 돌이 차갑게 식어 간다.',
  '기원의 성역보다 더 아래 — 지도에도, 기록에도 없는 곳.',
  '공기에 섞인 빛의 결이 낯설다. 이곳의 것들은 성역을 지키던 것들과 다르다.',
  '「…아직 끝이 아니었구나.」',
  '길은 보이지 않을 만큼 깊이 이어져 있다. 내려갈수록 돌아오는 길은 멀어질 것이다.'
];
// 탐험가 길드 '이야기 기록' 책장: 지금까지 본 이야기를 다시 보기 (unlocked: 볼 수 있는 조건)
const STORY_ARCHIVE = [
  { id: 'prologue', name: '프롤로그', kind: 'story', lines: () => PROLOGUE_LINES, unlocked: () => true },
  { id: 'origin_arrival', name: '기원의 성역 도착', kind: 'cut', lines: () => ORIGIN_ARRIVAL_LINES, unlocked: (sv) => (sv.scenesSeen || []).includes('origin_arrival') },
  { id: 'gatekeeper_intro', name: '무명의 문지기', kind: 'cut', lines: () => GATEKEEPER_INTRO_LINES, unlocked: (sv) => (sv.scenesSeen || []).includes('gatekeeper_intro') },
  { id: 'gatekeeper_fall', name: '열리는 문', kind: 'cut', lines: () => GATEKEEPER_FALL_LINES, unlocked: (sv) => (sv.scenesSeen || []).includes('gatekeeper_fall') },
  { id: 'sanctum', name: '성역 깊은 곳', kind: 'sanctum', lines: () => SANCTUM_LINES, unlocked: (sv) => !!sv.sanctumReached },
  { id: 'deep_arrival', name: '심층으로', kind: 'cut', lines: () => DEEP_ARRIVAL_LINES, unlocked: (sv) => (sv.scenesSeen || []).includes('deep_arrival') },
  { id: 'merlin', name: '후드를 쓴 마법사', kind: 'cut', lines: () => MERLIN_REVEAL_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.revealed) },
  { id: 'avalon', name: '아발론의 정원', kind: 'cut', lines: () => MERLIN_REWARD_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 2) },
  { id: 'spear_trial', name: '왕의 창', kind: 'cut', lines: () => MERLIN_SPEAR_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 3) },
  { id: 'rhongomyniad', name: '창의 인정', kind: 'cut', lines: () => RHONGO_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 4) },
  { id: 'camelot', name: '로드 투 카멜롯', kind: 'cut', lines: () => MERLIN_CAMELOT_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 5) },
  { id: 'gawain', name: '태양의 기사', kind: 'cut', lines: () => GAWAIN_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 6) },
  { id: 'tristan_road', name: '반전의 기사', kind: 'cut', lines: () => MERLIN_TRISTAN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 7) },
  { id: 'tristan', name: '끊어진 활시위', kind: 'cut', lines: () => TRISTAN_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 8) },
  { id: 'mordred_road', name: '반역의 기사', kind: 'cut', lines: () => MERLIN_MORDRED_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 9) },
  { id: 'mordred', name: '붉은 번개가 잦아들 때', kind: 'cut', lines: () => MORDRED_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 10) },
  { id: 'gareth_road', name: '부정의 기사', kind: 'cut', lines: () => MERLIN_GARETH_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 11) },
  { id: 'gareth', name: '고운 손', kind: 'cut', lines: () => GARETH_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 12) },
  { id: 'galahad_road', name: '철벽의 기사', kind: 'cut', lines: () => MERLIN_GALAHAD_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 13) },
  { id: 'galahad', name: '무너진 방패', kind: 'cut', lines: () => GALAHAD_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 14) },
  { id: 'lancelot_road', name: '호수의 기사', kind: 'cut', lines: () => MERLIN_LANCELOT_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 15) },
  { id: 'lancelot', name: '땅에 닿은 검', kind: 'cut', lines: () => LANCELOT_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 16) },
  { id: 'agravain_road', name: '철완의 기사', kind: 'cut', lines: () => MERLIN_AGRAVAIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 17) },
  { id: 'agravain', name: '감기는 눈', kind: 'cut', lines: () => AGRAVAIN_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 18) },
  { id: 'bedivere_road', name: '충절의 기사', kind: 'cut', lines: () => MERLIN_BEDIVERE_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 19) },
  { id: 'bedivere', name: '꺼져 가는 은빛', kind: 'cut', lines: () => BEDIVERE_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 20) },
  { id: 'arthur_road', name: '왕좌로', kind: 'cut', lines: () => MERLIN_ARTHUR_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 21) },
  { id: 'babylon', name: '금빛의 문', kind: 'cut', lines: () => BABYLON_APPEAR_LINES, unlocked: (sv) => (sv.scenesSeen || []).includes('babylon_appear') },
  { id: 'arthur', name: '101번째 원탁의 기사', kind: 'cut', lines: () => ARTHUR_WIN_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 22) }
];
const MERLIN_TRIAL = { gate: 0, deep: 2 }; // 시련: 심층 보스 2마리 처치 [사용자 결정: 문지기 조건 없앰] (gate: 무명의 문지기 처치 수, 0이면 조건 없음)
// [사용자 결정] 문지기 조건을 없애기 전에 이미 문지기를 잡아 둔 사람은 그 1번을 심층 보스 1마리로 쳐 줌 (한 번만 바꿈)
function merlinGateToDeep(M, save) {
  if (!M) return false;
  let changed = false;
  if (!M.gateMoved) {
    M.gateMoved = true;
    const gate = Math.max(0, Number(M.gate) || 0);
    if (gate > 0 && (Number(M.quest) || 0) <= 1) {
      const next = Math.min(MERLIN_TRIAL.deep, (Number(M.deep) || 0) + gate);
      if (next !== (Number(M.deep) || 0)) { M.deep = next; changed = true; }
    }
    M.gate = 0;
    changed = true;
  }

  // bestDeep는 실제로 도달한 심층 번호다. 다음 심층으로 이동하려면
  // 직전 심층의 보스를 처치해야 하므로, 이전 저장의 처치분을 복원할 수 있다.
  const reachedDepth = Math.max(0, Math.floor(Number(save && save.bestDeep) || 0));
  const provenKills = Math.min(MERLIN_TRIAL.deep, Math.max(0, reachedDepth - 1));
  const current = Math.max(0, Number(M.deep) || 0);
  if (provenKills > current) { M.deep = provenKills; changed = true; }
  return changed;
}
const MERLIN_CHATTER = ['「꽃은 금방 시든다. 그래서 아름답지.」', '「탑 위에서 보면, 이 던전도 꽤 볼만하다네.」', '「왕은 잘 지내려나… 아니, 혼잣말일세.」'];
// 성역에서 고르는 첫 보구 목록: 시련 보상(questOnly)·심층 보스 전리품(heroDrop)은 제외
function treasurePickList() { return DATA_TREASURES.filter((t) => !t.questOnly && !t.heroDrop); }
