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
const DATA_TREASURES = [
  { id: 'treasure_gate_of_babylon', name: '게이트 오브 바빌론', origin: '길가메시', use: 'chains', cooldown: 60, sfx: 'gate', icon: 'gate',
    radius: 92, range: 200, duration: 6, damage: 280, weak: 1.7, color: '#ffd84a',
    desc: '전방의 아주 넓은 원형 범위에 황금 사슬을 소환해 적을 6초간 묶고 큰 피해, 묶인 적은 받는 피해 +70%' },
  { id: 'treasure_excalibur', name: '엑스칼리버', origin: '아서왕', use: 'beam', cooldown: 65, sfx: 'excal', icon: 'excalibur',
    damage: 1050, width: 28, range: 300, blast: 86, blastRatio: 0.35, stun: 1.5, color: '#ffe9a0', // blast: 끝 폭발 반경, blastRatio: 폭발 추가 피해 비율
    desc: '검을 들어 빛기둥을 세운 뒤 조준 방향으로 내려꽂아 일직선에 압도적인 피해(벽 관통), 조준한 지점에서 큰 폭발, 맞은 적은 1.5초 경직 — 보구 중 가장 강한 한 방' },
  { id: 'treasure_ring_of_solomon', name: '솔로몬의 반지', origin: '솔로몬', use: 'blessing', cooldown: 68, sfx: 'solomon', icon: 'ring',
    duration: 15, atk: 0.9, rate: 0.7, speed: 0.35, guard: 0.6, heal: 0.5, skillHaste: 2, color: '#c8a0ff',
    desc: '15초간 공격력 +90%·공격 속도 +70%·이동 속도 +35%·받는 피해 -60%·스킬 쿨타임 2배 빨리 회복, 체력 50%·에너지·보호막 회복, 스킬 쿨타임 초기화' },
  // [사용자 결정] 탐험가 길드의 멀린이 주는 시련을 마치면 얻는 보구 (성역의 보구 선택지에는 나오지 않음). 수치는 Claude가 정한 값
  { id: 'treasure_garden_of_avalon', name: '가든 오브 아발론', origin: '멀린', use: 'garden', cooldown: 66, sfx: 'solomon', icon: 'avalon', questOnly: true,
    duration: 12, atk: 0.35, guard: 0.3, regen: 4, slowK: 0.65, color: '#ffb0d8',
    desc: '방 한가운데 아발론의 탑을 소환하고 12초간 방을 꽃밭으로 — 꽃밭 안의 적은 느려지고 받는 피해 +20%, 나는 공격력 +35%·받는 피해 -30%·체력 초당 4 회복' },
  // [사용자 결정] 아서왕의 창 롱고미니아드. 능력·수치·획득 방법(멀린의 두 번째 시련)은 Claude가 정한 [제안]
  { id: 'treasure_rhongomyniad', name: '롱고미니아드', origin: '아서왕', use: 'spear', cooldown: 64, sfx: 'excal', icon: 'rhongo', questOnly: true,
    damage: 380, impact: 64, range: 240, radius: 100, duration: 5, tick: 0.5, tickDmg: 36, pull: 70, final: 320, color: '#bfe6ff',
    desc: '빛의 창을 조준 지점에 던져 꽂으면 5초간 거대한 빛의 탑이 솟아 주변 적을 끌어당기며 계속 피해, 마지막에 탑이 무너지며 큰 폭발' }
];
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
// 멀린의 두 번째 시련 → 롱고미니아드 (대사 [임시])
const MERLIN_SPEAR_LINES = [
  '「아발론의 꽃은 마음에 들었나.」',
  '「…왕에게는 검 말고도 창이 하나 있었다. 세상의 끝을 붙들어 두는 빛의 창이지.」',
  '「깊은 곳의 주인들을 더 쓰러뜨려 와라. 그 창을 들 자격이 있는지 보겠다.」'
];
const MERLIN_SPEAR_REWARD_LINES = [
  '「충분하다. 왕도 너를 탓하지는 않겠지.」',
  '멀린의 손끝에서 하얀 빛이 길게 뻗어 한 자루의 창이 된다.',
  '「롱고미니아드. 던지면 탑이 서고, 탑이 서면 아무도 도망치지 못한다.」'
];
// 탐험가 길드 '이야기 기록' 책장: 지금까지 본 이야기를 다시 보기 (unlocked: 볼 수 있는 조건)
const STORY_ARCHIVE = [
  { id: 'prologue', name: '프롤로그', kind: 'story', lines: () => PROLOGUE_LINES, unlocked: () => true },
  { id: 'origin_arrival', name: '기원의 성역 도착', kind: 'cut', lines: () => ORIGIN_ARRIVAL_LINES, unlocked: (sv) => (sv.scenesSeen || []).includes('origin_arrival') },
  { id: 'gatekeeper_intro', name: '무명의 문지기', kind: 'cut', lines: () => GATEKEEPER_INTRO_LINES, unlocked: (sv) => (sv.scenesSeen || []).includes('gatekeeper_intro') },
  { id: 'gatekeeper_fall', name: '열리는 문', kind: 'cut', lines: () => GATEKEEPER_FALL_LINES, unlocked: (sv) => (sv.scenesSeen || []).includes('gatekeeper_fall') },
  { id: 'sanctum', name: '성역 깊은 곳', kind: 'sanctum', lines: () => SANCTUM_LINES, unlocked: (sv) => !!sv.sanctumReached },
  { id: 'merlin', name: '후드를 쓴 마법사', kind: 'cut', lines: () => MERLIN_REVEAL_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.revealed) },
  { id: 'avalon', name: '아발론의 정원', kind: 'cut', lines: () => MERLIN_REWARD_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 2) },
  { id: 'spear_trial', name: '왕의 창', kind: 'cut', lines: () => MERLIN_SPEAR_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 3) },
  { id: 'rhongomyniad', name: '롱고미니아드', kind: 'cut', lines: () => MERLIN_SPEAR_REWARD_LINES, unlocked: (sv) => !!(sv.merlin && sv.merlin.quest >= 4) }
];
const MERLIN_TRIAL = { gate: 1, deep: 2 }; // 시련: 무명의 문지기 다시 처치 1번 + 심층 보스 2마리 처치 [제안]
const MERLIN_TRIAL2 = { deep: 3 }; // 두 번째 시련: 심층 보스 3마리 더 처치 → 롱고미니아드 [제안]
const MERLIN_CHATTER = ['「꽃은 금방 시든다. 그래서 아름답지.」', '「탑 위에서 보면, 이 던전도 꽤 볼만하다네.」', '「왕은 잘 지내려나… 아니, 혼잣말일세.」'];
