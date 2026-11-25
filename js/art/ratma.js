'use strict';
// ════════════════════════════════════════════
// 아트: 네크로맨서 (기본 + 전직 6단계 외형) · 라트마 보스 · 라트마 고유 무기
//  · 전직마다 색만 바꾸지 않고 실루엣 자체가 바뀜 (기획서 2장 '전직 외형 변화')
//  · 공통 색 문자는 js/art/heroes.js 와 같음 (a/b/c 몸 · h/g 포인트 · s 피부 · m 금속 · e 눈 · w 흰색)
// ════════════════════════════════════════════
Object.assign(HERO_PROCS, {
  // 사령술사: 깊은 후드, 보랏빛 눈, 해골 허리 장식, 해진 로브 자락
  necro: { pal: { s: '#d8d0e0', e: '#c89aff', w: '#e8e4d8', m: '#8a8494' }, proc: (P, f) => {
    P.rect(4, 10, 8, 8, 'a'); P.tri(2, 19, 14, 19, 8, 10, 'a'); robeHem(P, f, 'b');                      // 로브
    P.px(3, 19, 'b'); P.px(6, 19, '.'); P.px(10, 19, '.'); P.px(13, 19, 'b');                           // 해진 자락
    P.rect(7, 11, 2, 7, 'b'); P.rect(4, 14, 8, 1, 'h'); P.ell(8, 14.5, 1.2, 1, 'w'); P.px(8, 15, 'k'); // 앞섶·허리띠·해골 버클
    P.rect(2, 11, 2, 4, 'a'); P.rect(12, 11, 2, 4, 'a'); P.rect(2, 14, 2, 1, 's'); P.rect(12, 14, 2, 1, 's'); // 소매·창백한 손
    P.ell(8, 5.5, 4.5, 4.5, 'a'); P.tri(6, 2, 10, 2, 8, 0, 'a'); P.ell(8, 6.5, 3, 3, 'k');            // 후드·그늘
    P.px(7, 6, 'e'); P.px(9, 6, 'e'); P.px(8, 8, 'b');                                                    // 빛나는 눈
    P.rect(3, 9, 10, 1, 'h');                                                                             // 망토 깃
  } },
  // 리치: 해골 얼굴, 높은 뼈 깃, 긴 로브의 마법 문양, 곁에 떠다니는 마력 구슬
  necro_lich: { pal: { s: '#ece6d6', e: '#e0b0ff', w: '#f4f0e4', m: '#b8a8d0' }, proc: (P, f) => {
    P.rect(4, 9, 8, 10, 'a'); P.tri(1, 19, 15, 19, 8, 9, 'a'); robeHem(P, f, 'b');                       // 긴 로브 (자락이 넓게)
    P.px(5, 13, 'h'); P.px(10, 12, 'h'); P.px(6, 16, 'h'); P.px(11, 16, 'h'); P.line(8, 11, 8, 18, 'g');    // 마법 문양
    P.rect(2, 10, 2, 5, 'a'); P.rect(12, 10, 2, 5, 'a'); P.px(2, 15, 'w'); P.px(13, 15, 'w');            // 뼈 손가락
    P.tri(3, 9, 6, 9, 3, 3, 'm'); P.tri(10, 9, 13, 9, 13, 3, 'm');                                        // 높은 뼈 깃
    P.ell(8, 5, 3, 3.2, 's'); P.rect(6, 7, 4, 2, 's');                                                    // 해골
    P.rect(6, 4, 2, 2, 'k'); P.rect(9, 4, 2, 2, 'k'); P.px(6, 5, 'e'); P.px(10, 5, 'e');                 // 눈구멍
    P.px(8, 7, 'k'); P.px(7, 8, 'k'); P.px(9, 8, 'k');                                                    // 코·이빨
    P.px(0, 7, 'h'); P.px(15, 11, 'h'); P.px(1, 6, 'e');                                                  // 떠다니는 마력
  } },
  // 불멸의 군주: 뼈 왕관 가시, 넓은 어깨 갑주, 빛나는 룬 로브, 양옆에 떠 있는 해골
  necro_lichlord: { pal: { s: '#f0ead8', e: '#f0c8ff', w: '#ffffff', m: '#d8c8e8', y: '#c8a0ff' }, proc: (P, f) => {
    P.rect(3, 9, 10, 10, 'a'); P.tri(0, 19, 15, 19, 8, 8, 'a'); robeHem(P, f, 'b');
    for (const [x, y] of [[5, 12], [10, 12], [4, 16], [8, 15], [11, 17], [7, 18]]) P.px(x, y, 'y');         // 빛나는 룬
    P.rect(7, 10, 2, 8, 'g');
    P.ell(3, 9, 2.5, 2, 'm'); P.ell(13, 9, 2.5, 2, 'm'); P.px(2, 8, 'w'); P.px(14, 8, 'w');               // 어깨 갑주
    P.ell(8, 5.5, 3, 3, 's'); P.rect(6, 7, 4, 2, 's');
    P.rect(6, 4, 2, 2, 'k'); P.rect(9, 4, 2, 2, 'k'); P.px(6, 5, 'e'); P.px(10, 5, 'e'); P.px(8, 8, 'k');
    P.line(5, 2, 4, 0, 'm'); P.line(8, 2, 8, 0, 'm'); P.line(11, 2, 12, 0, 'm'); P.rect(5, 2, 7, 1, 'y');  // 뼈 왕관
    P.ell(1, 13, 1, 1, 'w'); P.px(1, 13, 'k'); P.ell(14.5, 13, 1, 1, 'w'); P.px(15, 13, 'k');              // 떠 있는 해골
  } },
  // 망령 지휘관: 반투명 유령 갑옷, 몸을 감은 영혼 사슬, 다리 대신 영혼 꼬리
  necro_wraithcmd: { pal: { s: '#c8f0e8', e: '#e0fff4', m: '#9adcc8', w: '#e8fff8' }, proc: (P, f) => {
    P.tri(5, 15, 11, 15, f ? 6 : 10, 19, 'b'); P.px(f ? 5 : 11, 19, 'c');                                // 영혼 꼬리 (흔들림)
    P.rect(4, 9, 8, 7, 'a'); P.rect(5, 10, 6, 5, 'c'); P.rect(7, 10, 2, 5, 'm');                          // 유령 흉갑
    P.line(4, 10, 11, 15, 'm'); P.line(11, 10, 4, 15, 'm');                                               // 영혼 사슬
    P.ell(3, 9.5, 2, 1.5, 'm'); P.ell(13, 9.5, 2, 1.5, 'm');                                              // 어깨
    P.rect(1, 11, 2, 4, 'a'); P.rect(13, 11, 2, 4, 'a'); P.px(0, 15, 'm'); P.px(15, 15, 'm');             // 팔·사슬 끝
    P.ell(8, 5, 3.5, 3.5, 'a'); P.rect(5, 5, 6, 2, 'k'); P.px(6, 5, 'e'); P.px(9, 5, 'e');                // 투구·눈 틈
    P.tri(6, 2, 10, 2, 8, 0, 'h');                                                                        // 망령 장식
  } },
  // 망자의 군주: 뿔 투구, 넓게 퍼진 망령 망토, 사슬, 떠다니는 해골
  necro_deadlord: { pal: { s: '#d8fff0', e: '#ffffff', m: '#b0e8d8', w: '#f0fffa' }, proc: (P, f) => {
    P.tri(0, 18, 16, 18, 8, 8, 'b'); P.px(1, 19, 'b'); P.px(5, 19, 'b'); P.px(10, 19, 'b'); P.px(14, 19, 'b'); // 망령 망토 (갈라진 끝)
    P.tri(5, 15, 11, 15, f ? 7 : 9, 19, 'a');
    P.rect(4, 9, 8, 7, 'a'); P.rect(5, 10, 6, 4, 'c'); P.line(4, 15, 11, 15, 'm'); P.line(6, 10, 6, 14, 'm'); P.line(9, 10, 9, 14, 'm');
    P.ell(3, 9, 2.5, 2, 'm'); P.ell(13, 9, 2.5, 2, 'm');
    P.ell(8, 5, 3.5, 3.5, 'a'); P.rect(5, 5, 6, 2, 'k'); P.px(6, 5, 'e'); P.px(9, 5, 'e');
    P.line(5, 3, 2, 0, 'w'); P.line(11, 3, 14, 0, 'w');                                                   // 뿔
    P.ell(1, 12, 1, 1, 'w'); P.px(1, 12, 'k'); P.ell(15, 10, 1, 1, 'w'); P.px(15, 10, 'k');               // 떠다니는 해골
  } },
  // 사령 기사: 검은 판금 갑옷, 보랏빛 투구 틈, 어깨의 검은 불꽃
  necro_dknight: { pal: { m: '#3a3442', s: '#c8c0d0', e: '#d8a0ff', l: '#2a2430', d: '#18141e', w: '#d8d0e8' }, proc: (P, f) => {
    P.rect(3, 9, 10, 8, 'g');                                                                             // 망토
    heroLegs(P, f, 'l', 'd');
    P.rect(4, 8, 8, 8, 'm'); P.rect(5, 9, 6, 6, 'a'); P.rect(7, 9, 2, 6, 'h'); P.rect(4, 14, 8, 1, 'k');  // 흉갑·문양
    P.ell(3.5, 9, 2, 1.5, 'm'); P.ell(12.5, 9, 2, 1.5, 'm');                                              // 어깨
    P.px(2, 7, 'h'); P.px(3, 6, 'h'); P.px(13, 7, 'h'); P.px(14, 6, 'h');                                 // 검은 불꽃
    P.rect(2, 11, 2, 3, 'm'); P.rect(12, 11, 2, 3, 'm');
    P.rect(5, 2, 6, 6, 'm'); P.rect(5, 5, 6, 1, 'k'); P.px(6, 5, 'e'); P.px(9, 5, 'e');                   // 투구·빛나는 틈
    P.rect(7, 0, 2, 2, 'h');                                                                              // 투구 장식
  } },
  // 죽음의 집행자: 가시 돋친 큰 어깨, 뿔 투구, 찢긴 망토, 몸을 감싸는 검은 불꽃
  necro_executioner: { pal: { m: '#2e2836', s: '#c8c0d0', e: '#f0c0ff', l: '#221e28', d: '#141018', w: '#e0d8f0' }, proc: (P, f) => {
    P.tri(2, 18, 14, 18, 8, 8, 'g'); P.px(3, 18, '.'); P.px(12, 18, '.');                                // 찢긴 망토
    heroLegs(P, f, 'l', 'd');
    P.rect(4, 8, 8, 8, 'm'); P.rect(5, 9, 6, 6, 'a'); P.line(5, 9, 10, 14, 'h'); P.line(10, 9, 5, 14, 'h'); P.rect(4, 14, 8, 1, 'k');
    P.ell(2.5, 8.5, 2.5, 2, 'm'); P.ell(13.5, 8.5, 2.5, 2, 'm'); P.tri(0, 8, 2, 7, 0, 5, 'w'); P.tri(16, 8, 14, 7, 16, 5, 'w'); // 가시 어깨
    P.px(1, 4, 'h'); P.px(15, 4, 'h'); P.px(0, 11, 'h'); P.px(15, 12, 'h');                               // 검은 불꽃
    P.rect(1, 11, 3, 3, 'm'); P.rect(12, 11, 3, 3, 'm');
    P.rect(5, 2, 6, 6, 'm'); P.rect(5, 5, 6, 1, 'k'); P.px(6, 5, 'e'); P.px(9, 5, 'e');
    P.line(5, 2, 3, 0, 'w'); P.line(10, 2, 12, 0, 'w');                                                   // 뿔
  } }
});

// 라트마 보스 (32×32): 해골 장식 두건, 창백한 얼굴과 차분한 눈, 생(초록)·사(보라) 두 색이 섞인 긴 망토, 순환의 고리가 달린 지팡이
PIX.boss_ratma = { tint: '#2a3a44', w: 32, h: 32, pal: { s: '#e8e4dc', e: '#9affd0', y: '#c8b080', g: '#9affd0', v: '#c08aff', w: '#ffffff', m: '#d8d2c4' }, proc: (P) => {
  P.tri(3, 31, 27, 31, 15, 7, 'a'); P.tri(8, 31, 22, 31, 15, 13, 'b');                 // 망토
  P.line(7, 30, 13, 17, 'g'); P.line(23, 30, 17, 17, 'v');                            // 생과 사의 띠
  P.ell(8, 13, 3, 2, 'm'); P.ell(22, 13, 3, 2, 'm'); P.px(7, 12, 'w'); P.px(23, 12, 'w'); // 뼈 어깨
  P.ell(15, 8, 5.5, 6, 'a'); P.ell(15, 9, 3.5, 4, 'k');                               // 두건·그늘
  P.ell(15, 9.5, 2.5, 3, 's'); P.px(14, 9, 'e'); P.px(16, 9, 'e');                    // 얼굴·눈
  P.ell(15, 3, 2, 1.5, 'm'); P.px(14, 3, 'k'); P.px(16, 3, 'k');                      // 두건 위 해골 장식
  P.line(27, 4, 27, 31, 'y');                                                          // 지팡이
  P.ell(27, 4, 3, 3, 'g'); P.ell(27, 4, 1.5, 1.5, 'k'); P.px(29, 2, 'v'); P.px(25, 6, 'v'); // 순환의 고리
  P.ell(26, 17, 1.5, 1.5, 's'); P.ell(5, 19, 1.5, 1.5, 's');                           // 손
  P.px(3, 9, 'g'); P.px(2, 15, 'v'); P.px(30, 21, 'g');                                // 떠다니는 영혼
} };

// 라트마 고유 무기 + 사령의 지팡이 (오른쪽을 향하게, p = 손잡이)
Object.assign(WPIX, {
  necrostaff: { auto: true, p: [3, 2], pal: { w: '#e8e4d8' }, rows: ['...........ww..', 'ddddddddddwkwo.', '...........ww..'] },
  ratma_insight: { auto: true, p: [3, 3], pal: { w: '#f0e8ff', v: '#b070ff', V: '#5a2a9a' }, rows: ['............V.V..', '...........VvvvV.', 'aaaaaaaaaaaVvwvV', '...........VvvvV.', '............V.V..', '..........o......', '.................'] },
  ratma_anguish: { auto: true, p: [3, 3], pal: { w: '#e8fff8', t: '#7affc0', T: '#2a8a6a' }, rows: ['...........T.T.T.', '..........TtttttT', 'aaaaaaaaaaTtwtwtT', '..........TtttttT', '...........T.T.T.'] },
  ratma_endurance: { auto: true, p: [2, 2], pal: { v: '#a060ff', V: '#4a2a6a', w: '#d8d0e8' }, rows: ['..y..................', 'eeyVaaaaaaaaaaaaaaavV', 'eeyVwwwwwwwwwwwwwwvv.', '..y..........v...v...'] },
  ratma_record: { auto: true, p: [2, 3], pal: { p: '#f4ecd8', P: '#c8b890', y: '#e0c060', o: '#ffe9a0' }, rows: ['......yyyyyyy.', '...nn.yppppPy.', 'nnnnnnypopoPy.', '...nn.yppppPy.', '......yyyyyyy.'] },
  ratma_balance: { auto: true, p: [2, 3], pal: { t: '#9affd0', v: '#c08aff', w: '#ffffff' }, rows: ['.......m.....', '..cccccmccc..', '.naaaaamaaaat', '.nbbbbbbbbv..', '.gg..........', '.gg..........'] },
  ratma_oath: { auto: true, p: [2, 2], pal: { t: '#9affd0', T: '#3a7a6a', w: '#e0fff4' }, rows: ['..m...............', 'eemTaaaaaaaaaaaat.', 'eemTwwwwwwwwwwwtt.', '..m...............'] },
  ratma_lantern: { auto: true, p: [2, 3], pal: { t: '#9affe8', w: '#ffffff' }, rows: ['........nnn..', '.......nottn.', 'ddddddddotwtn', '.......nottn.', '........nnn..'] },
  ratma_crown: { auto: true, p: [3, 3], pal: { v: '#e0c8ff', y: '#d8b860', w: '#ffffff' }, rows: ['..........y.y.y.', '..........yvywyv', 'aaaaaaaaaayyyyyy', '..........yvyvyv', '..........y.y.y.'] }
});
Object.assign(WEAPON_SPRITE, {
  weapon_necrostaff_001: 'necrostaff', weapon_ratma_insight_001: 'ratma_insight', weapon_ratma_anguish_001: 'ratma_anguish',
  weapon_ratma_endurance_001: 'ratma_endurance', weapon_ratma_record_001: 'ratma_record', weapon_ratma_balance_001: 'ratma_balance',
  weapon_ratma_oath_001: 'ratma_oath', weapon_ratma_lantern_001: 'ratma_lantern', weapon_ratma_crown_001: 'ratma_crown'
});
