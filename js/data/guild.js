'use strict';
// ════════════════════════════════════════════
// 데이터: 탐험가 길드 (로비 아래쪽) — 모두 [제안] 단계의 임시 디자인, 기획서에 없는 새 시스템
//  · 접수대(왼쪽): 일일 퀘스트 3개 · 주간 퀘스트 3개 · 칭호
//  · 토벌 게시판(오른쪽): 특정 보스·몬스터 토벌 의뢰 (최대 2개 수락)
//  · 아래쪽: 탐험가들 · 거래상(다음 탐험 보급품) · 결정석 도박
//  보상은 모두 로비 재화(결정석)
// ════════════════════════════════════════════
// 퀘스트 종류: stat = 집계하는 행동 / daily·weekly = [목표, 보상]
const GUILD_QUESTS = [
  { stat: 'kills', name: '몬스터 {n}마리 처치', daily: [80, 25], weekly: [600, 120] },
  { stat: 'bosses', name: '보스 {n}마리 처치', daily: [2, 30], weekly: [12, 150] },
  { stat: 'stages', name: '스테이지 {n}개 돌파', daily: [8, 25], weekly: [50, 120] },
  { stat: 'skills', name: '스킬 {n}번 사용', daily: [25, 20], weekly: [180, 100] },
  { stat: 'reactions', name: '원소 반응 {n}번 일으키기', daily: [10, 25], weekly: [70, 120] },
  { stat: 'elites', name: '정예 몬스터 {n}마리 처치', daily: [6, 25], weekly: [40, 120] },
  { stat: 'gold', name: '골드 {n} 모으기', daily: [600, 25], weekly: [4000, 120] }
];
// 토벌 의뢰: 보스 토벌 / 특정 몬스터 처치. 가 본 필드 안에서만 나옴
const GUILD_HUNT = { offers: 4, maxActive: 2, bossReward: [45, 15], mobCount: [25, 40], mobReward: 30 }; // bossReward: 기본 + 필드당
// 칭호: 평생 기록(save.stats)으로 얻음, 하나를 골라 이름 위에 표시
const GUILD_TITLES = [
  { id: 't_first', name: '첫 걸음', desc: '탐험을 한 번 마침', test: (s, sv) => (s.runs || 0) >= 1 },
  { id: 't_boss', name: '보스 사냥꾼', desc: '보스 10마리 처치', test: (s) => (s.bosses || 0) >= 10 },
  { id: 't_slayer', name: '학살자', desc: '몬스터 1,000마리 처치', test: (s) => (s.kills || 0) >= 1000 },
  { id: 't_element', name: '원소술의 달인', desc: '원소 반응 200번', test: (s) => (s.reactions || 0) >= 200 },
  { id: 't_sanctum', name: '성역의 방문자', desc: '기원의 성역 깊은 곳에 도달', test: (s, sv) => !!sv.sanctumReached },
  { id: 't_deep', name: '심연을 걷는 자', desc: '심층 3번째 필드 도달', test: (s, sv) => (sv.bestDeep || 0) >= 3 },
  { id: 't_worker', name: '길드의 일꾼', desc: '길드 퀘스트 10개 완료', test: (s) => (s.quests || 0) >= 10 },
  { id: 't_hunter', name: '토벌대장', desc: '토벌 의뢰 5개 완료', test: (s) => (s.hunts || 0) >= 5 },
  { id: 't_gambler', name: '행운아', desc: '결정석 도박에서 5번 이김', test: (s) => (s.gambleWins || 0) >= 5 },
  { id: 't_merchant', name: '단골손님', desc: '거래상에게 보급품 10번 구매', test: (s) => (s.trades || 0) >= 10 },
  { id: 't_origin', name: '근본', desc: '캐릭터의 기본 시작 무기로 몬스터 2,000마리 처치', hidden: true, test: (s) => (s.startKills || 0) >= 2000 }, /* [사용자 결정] 히든 칭호: 얻기 전에는 목록에 안 보임 */
  { id: 't_roundtable', name: '101번째 원탁의 기사', desc: '아서 왕에게 원탁의 기사로 인정받음', hidden: true, test: (s, sv) => !!(sv.merlin && sv.merlin.quest >= 22) } /* [사용자 결정] 아서 왕 처치 칭호 — 히든 칭호: 얻기 전에는 목록에 아예 안 보임 */
];
// 거래상 보급품: 하루에 3개가 진열됨(날마다 바뀜), 사면 다음 탐험 시작 때 한 번 적용
const GUILD_SUPPLIES = [
  { id: 's_bless', name: '여행자의 축복', desc: '다음 탐험을 무작위 축복 1개와 함께 시작', price: 40 },
  { id: 's_whet', name: '숫돌', desc: '다음 탐험의 시작 무기 +1 강화', price: 35 },
  { id: 's_purse', name: '두둑한 지갑', desc: '다음 탐험을 골드 80과 함께 시작', price: 30 },
  { id: 's_mana', name: '마나 결정', desc: '다음 탐험 동안 최대 에너지 +60', price: 30 },
  { id: 's_amulet', name: '수호 부적', desc: '다음 탐험 동안 최대 체력 +30', price: 45 }
];
// [사용자 결정] 결정석 도박: 100개를 걸고 뒤집힌 결정석 3개 중 하나를 고름 → 300 / 50 / 0 (기댓값 약 117, 평균적으로 조금 이득)
const GUILD_GAMBLE = { bet: 100, prizes: [300, 50, 0] };
// 길드 사람들의 대사 (꾸밈)
const GUILD_CHATTER = [
  ['탐험가', '심층에서 돌아온 사람은 다들 눈빛이 달라지더라.'],
  ['탐험가', '토벌 게시판은 매일 아침 새로 붙어. 보상이 짭짤하지.'],
  ['견습 마도사', '원소 반응을 잘 쓰면 퀘스트도 금방 끝나요!'],
  ['늙은 용병', '도박은 적당히 해. 결정석은 쉽게 나가지만 어렵게 들어오거든.'],
  ['짐꾼', '거래상 물건은 날마다 바뀌니 자주 들러 봐.']
];
// 날짜·주차 키 (로컬 시간)
function guildDayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function guildWeekKey(d = new Date()) { const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day); return 'w' + guildDayKey(t); } // 월요일 기준
function guildSeedRand(key) { let h = 2166136261; for (const c of key) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
