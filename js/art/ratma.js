'use strict';
// ════════════════════════════════════════════
// 아트: 네크로맨서 (기본 + 전직 6단계 외형) · 라트마 보스 · 라트마 고유 무기
//  · 전직마다 색만 바꾸지 않고 실루엣 자체가 바뀜 (기획서 2장 '전직 외형 변화')
//  · 공통 색 문자는 js/art/heroes.js 와 같음 (a/b/c 몸 · h/g 포인트 · s 피부 · m 금속 · e 눈 · w 흰색)
// ════════════════════════════════════════════
Object.assign(HERO_PROCS, {
  // 기본 네크로맨서: 디아블로 II 남성 네크로맨서의 수척한 백발·뼈 장식·비대칭 장비를 작은 도트로 압축
  necro: { pal: { s: '#d7cfc4', e: '#d8c1a0', w: '#eee7d9', m: '#8d9290', n: '#71513d' }, proc: (P, f) => {
    heroLegs(P, f, 'l', 'd');
    P.rect(4, 9, 8, 7, 'a'); P.rect(5, 10, 6, 5, 'b'); P.rect(7, 10, 2, 5, 'c'); // 검은 가죽 튜닉
    P.rect(4, 14, 8, 2, 'n'); P.px(8, 14, 'y');                                      // 가죽 벨트·골각 버클
    P.rect(2, 10, 3, 5, 'a'); P.rect(11, 10, 3, 5, 'a');                             // 장갑·팔
    P.rect(1, 8, 4, 3, 'm'); P.px(1, 7, 'w'); P.px(4, 7, 'w');                       // 비대칭 뼈 어깨
    P.line(10, 9, 12, 13, 'm'); P.px(12, 13, 'w');                                   // 갈비뼈 장식
    P.ell(8, 5, 3.5, 3.5, 's'); P.rect(5, 4, 6, 2, 's');                             // 드러난 얼굴
    P.rect(5, 2, 6, 2, 'w'); P.px(4, 4, 'w'); P.px(11, 4, 'w');                      // 짧게 넘긴 백발
    P.px(6, 6, 'b'); P.px(9, 6, 'b'); P.px(6, 7, 'e'); P.px(9, 7, 'e');             // 깊은 눈
    P.px(8, 8, 'n'); P.px(7, 8, 'n');                                                // 수척한 턱수염
  } },
  // 리치: 백골의 얼굴, 척추형 장식과 뼈 왕관을 두른 의식용 장포
  necro_lich: { pal: { s: '#e2d9c8', e: '#e6c88e', w: '#f4eee0', m: '#c6b895', n: '#6c5948' }, proc: (P, f) => {
    P.tri(1, 19, 15, 19, 8, 8, 'a'); P.rect(4, 9, 8, 10, 'a'); robeHem(P, f, 'b');
    P.line(8, 10, 8, 18, 'w'); P.px(6, 12, 'w'); P.px(10, 12, 'w'); P.px(6, 15, 'w'); P.px(10, 15, 'w'); // 척추·갈비
    P.ell(8, 5, 3.5, 3.5, 's'); P.rect(5, 5, 6, 3, 'w'); P.px(6, 5, 'b'); P.px(9, 5, 'b'); P.px(8, 7, 'n');
    P.line(5, 3, 3, 0, 'm'); P.line(11, 3, 13, 0, 'm'); P.px(8, 1, 'y'); P.rect(6, 2, 5, 1, 'm');
    P.rect(2, 10, 3, 5, 'a'); P.rect(11, 10, 3, 5, 'a'); P.px(2, 15, 'w'); P.px(13, 15, 'w');
    P.px(1, 7, 'e'); P.px(15, 9, 'e');
  } },
  // 불멸의 군주: 거대한 뼈 왕관·갈비뼈 흉갑·뼈 어깨갑주, 왕의 망토
  necro_lichlord: { pal: { s: '#e7dfcf', e: '#f4d89c', w: '#fff8e8', m: '#d8c99f', y: '#c5a66c' }, proc: (P, f) => {
    P.tri(0, 19, 16, 19, 8, 8, 'a'); P.rect(3, 9, 10, 9, 'a'); robeHem(P, f, 'b');
    P.rect(6, 10, 4, 8, 'b'); P.line(5, 10, 5, 17, 'w'); P.line(11, 10, 11, 17, 'w');
    P.line(6, 10, 10, 10, 'w'); P.line(6, 13, 10, 13, 'w'); P.line(6, 16, 10, 16, 'w'); // 갈비뼈
    P.ell(2, 9, 3, 2.5, 'm'); P.ell(14, 9, 3, 2.5, 'm'); P.px(1, 7, 'w'); P.px(15, 7, 'w');
    P.ell(8, 5, 3.5, 3.5, 's'); P.rect(5, 5, 6, 3, 'w'); P.px(6, 5, 'b'); P.px(9, 5, 'b');
    P.line(4, 4, 2, 0, 'm'); P.line(8, 3, 8, 0, 'y'); P.line(12, 4, 14, 0, 'm'); P.rect(5, 2, 7, 1, 'y');
    P.ell(0, 13, 1, 1, 'w'); P.ell(16, 13, 1, 1, 'w');
  } },
  // 망령 지휘관: 사슬 갑옷, 해골 가면, 후방으로 흘러내리는 안개 망토
  necro_wraithcmd: { pal: { s: '#d4ded8', e: '#b8f0d8', m: '#9eb5a8', w: '#edf4e9', n: '#475b57' }, proc: (P, f) => {
    P.tri(0, 17, 16, 17, f ? 7 : 10, 20, 'b'); P.px(f ? 2 : 14, 19, 'c');
    P.rect(4, 9, 8, 8, 'a'); P.rect(5, 10, 6, 6, 'c'); P.line(5, 10, 10, 15, 'm'); P.line(10, 10, 5, 15, 'm');
    P.ell(2, 9, 2.5, 2.5, 'm'); P.ell(14, 9, 2.5, 2.5, 'm'); P.px(1, 7, 'w'); P.px(15, 7, 'w');
    P.ell(8, 5, 3.5, 3.5, 's'); P.rect(5, 5, 6, 3, 'w'); P.px(6, 6, 'e'); P.px(9, 6, 'e'); P.px(8, 8, 'n');
    P.line(3, 5, 1, 2, 'm'); P.line(13, 5, 15, 2, 'm');
    P.px(0, 14, 'e'); P.px(15, 16, 'w');
  } },
  // 망자의 군주: 망령의 깃발 같은 넓은 망토, 사슬·뼈 투구, 떠다니는 두개골
  necro_deadlord: { pal: { s: '#d9e5dc', e: '#d7fff0', m: '#b8c8b8', w: '#f3fff5', n: '#51615c' }, proc: (P, f) => {
    P.tri(0, 19, 16, 19, 8, 6, 'b'); P.px(1, 18, 'c'); P.px(5, 19, 'c'); P.px(11, 19, 'c'); P.px(15, 18, 'c');
    P.rect(4, 9, 8, 8, 'a'); P.rect(5, 10, 6, 5, 'c'); P.line(5, 10, 10, 15, 'm'); P.line(10, 10, 5, 15, 'm');
    P.ell(2, 9, 2.5, 2.5, 'm'); P.ell(14, 9, 2.5, 2.5, 'm');
    P.ell(8, 5, 3.5, 3.5, 's'); P.rect(5, 5, 6, 3, 'w'); P.px(6, 6, 'e'); P.px(9, 6, 'e');
    P.line(5, 3, 2, 0, 'w'); P.line(11, 3, 14, 0, 'w'); P.rect(6, 2, 5, 1, 'm');
    P.ell(0, 11, 1, 1, 'w'); P.px(0, 11, 'b'); P.ell(16, 10, 1, 1, 'w'); P.px(16, 10, 'b');
  } },
});

// 라트마 보스 (32×32): 해골 장식 두건, 창백한 얼굴과 차분한 눈, 생(초록)·사(보라) 두 색이 섞인 긴 망토, 순환의 고리가 달린 지팡이
// [사용자 결정] 라트마 보스 외형: 사용자가 준 도트 그림(해골 두건 · 보랏빛 로브 · 청록 눈 · 생(청록)·사(보라)의 띠 · 고리 지팡이)을 36×40으로 옮김
PIX.boss_ratma = { tint: '#48285c', w: 36, h: 40, pal: { k: '#160c1c', d: '#301a3a', a: '#48285c', b: '#623a7a', c: '#8454a0', v: '#a85ae8', t: '#8eeed5', w: '#e8dcd2', s: '#beb2aa', n: '#c8a070', m: '#967350' }, rows: [
  '...............kkkk..........kkk....',
  '.............kkwwwwkk......kktttk...',
  '...........kkawwwwwwdk.....kttttkk..',
  '...........kaawkwwkwak....kttkktttk.',
  '..........kaaakwwwwkaak...ktkkakktk.',
  '.........kaaaakwwwkkaaak..ktkvvvktk.',
  '.........kaaacckkwkccaakk.kttkkkttk.',
  '.........kaaackkkkkkccakk..ktwwwtk..',
  '...kk....kaackkkkkkkkcakk..kkswsk...',
  '...k.....kaackkkkdkkkcakk...kkkkk...',
  '.....k...kaakkttkkttkkakk...kkwk....',
  '.....k..kaaakkssswsskkaak....kak....',
  '........kaaakkswwwwskkaak....knk....',
  '.......kkkaaakkwwwwkkkbakkk..knk....',
  'kv...kkwwwkdakkkwwkkkaakwwwkkknk....',
  'k...kwwwwwwkkakkkkkkadkwwwwwkknk....',
  '...kwwwwwwwwkkaddddakkwwwwwwwknk....',
  '...kwssswsswwkkkkddkkwwsswsmsknk....',
  '...kkkksskkskkkkkkkkkkskksskkknk....',
  '.....kskkkkskkkskkskkkskkkkskknk....',
  '....kbkksksskkkksskdbkskbskkkknk....',
  '...kbkddsdswkbkkkskdbkwkssdakwwwk...',
  '...kkdadscswkbkddsddbkwkssaakwwwk...',
  '....kaaawkwwkckddsdkvkkkswaaksssk...',
  '...kkkkkwkwwkckdasddvvkkwwaakkakk.tk',
  '...kwwwkkkwkkkkaasadkvkkwwkkkknk...k',
  '...kwwwkkkkkkkdaasadkvddkkkkkknk....',
  '...kssskddbktkdassadkvvddkk..knk.k..',
  '....kkkddbkktkasaasakkvdadk..knk....',
  '.....kkddbkttkasdasakdvvkakk.knk....',
  '.....kddbddtkkaassaakdkvdaakkknk....',
  '....kddbddtkkkaaasaakdkvvkaakknk....',
  '....kkkdaatkddaaasaakdkkvdkaaknk....',
  '..kkdkadattkddbaasabkadkvvdkkknk....',
  '..kkkaaaatkkddbaaaackkadkvddkknk....',
  '.kkkaaaattkddkbbbabckkaadvvddknkk...',
  'kkaaaaattkkdkkkkbabkkkaadkvddknkdk..',
  'kkkkkaatkkdadkkkbbckkkaaadvvdkmkk...',
  '..kkkkkkkkkkkkkkkkkkkkkddkkkkkkk....',
  '........kkkkkk......kkkkkkk.........'
] };

// 라트마 고유 무기 + 사령의 지팡이 (오른쪽을 향하게, p = 손잡이)
Object.assign(WPIX, {
  necrostaff: { auto: true, p: [3, 2], pal: { w: '#e8e4d8' }, rows: ['...........ww..', 'ddddddddddwkwo.', '...........ww..'] },
  ratma_insight: { auto: true, p: [3, 3], pal: { w: '#f0e8ff', v: '#b070ff', V: '#5a2a9a' }, rows: ['............V.V..', '...........VvvvV.', 'aaaaaaaaaaaVvwvV', '...........VvvvV.', '............V.V..', '..........o......', '.................'] },
  ratma_anguish: { auto: true, p: [3, 3], pal: { w: '#e8fff8', t: '#7affc0', T: '#2a8a6a' }, rows: ['...........T.T.T.', '..........TtttttT', 'aaaaaaaaaaTtwtwtT', '..........TtttttT', '...........T.T.T.'] },
  ratma_record: { auto: true, p: [2, 3], pal: { p: '#f4ecd8', P: '#c8b890', y: '#e0c060', o: '#ffe9a0' }, rows: ['......yyyyyyy.', '...nn.yppppPy.', 'nnnnnnypopoPy.', '...nn.yppppPy.', '......yyyyyyy.'] },
  ratma_balance: { auto: true, p: [2, 3], pal: { t: '#9affd0', v: '#c08aff', w: '#ffffff' }, rows: ['.......m.....', '..cccccmccc..', '.naaaaamaaaat', '.nbbbbbbbbv..', '.gg..........', '.gg..........'] },
  ratma_oath: { auto: true, p: [2, 2], pal: { t: '#9affd0', T: '#3a7a6a', w: '#e0fff4' }, rows: ['..m...............', 'eemTaaaaaaaaaaaat.', 'eemTwwwwwwwwwwwtt.', '..m...............'] },
  ratma_lantern: { auto: true, p: [2, 3], pal: { t: '#9affe8', w: '#ffffff' }, rows: ['........nnn..', '.......nottn.', 'ddddddddotwtn', '.......nottn.', '........nnn..'] },
  ratma_crown: { auto: true, p: [3, 3], pal: { v: '#e0c8ff', y: '#d8b860', w: '#ffffff' }, rows: ['..........y.y.y.', '..........yvywyv', 'aaaaaaaaaayyyyyy', '..........yvyvyv', '..........y.y.y.'] }
});
Object.assign(WEAPON_SPRITE, {
  weapon_necrostaff_001: 'necrostaff', weapon_ratma_insight_001: 'ratma_insight', weapon_ratma_anguish_001: 'ratma_anguish',
  weapon_ratma_record_001: 'ratma_record', weapon_ratma_balance_001: 'ratma_balance',
  weapon_ratma_oath_001: 'ratma_oath', weapon_ratma_lantern_001: 'ratma_lantern', weapon_ratma_crown_001: 'ratma_crown'
});
