'use strict';
// ════════════════════════════════════════════
// 적 외형 개편 (16×16, 도형으로 그린 뒤 자동 외곽선) — js/art/enemies.js의 같은 이름을 대체
//  a/b/c = 적 색(def.color) 주색/어두운/밝은, e = 눈 또는 마법 빛(술사는 탄 색)
// ════════════════════════════════════════════
const robe = (P, hem) => { P.rect(4, 8, 7, 7, 'a'); P.tri(3, 15, 12, 15, 7, 8, 'a'); if (hem) P.rect(3, 15, 9, 1, hem); };
Object.assign(PIX, {
  // ── 1필드: 이끼 숲
  slime: { tint: '#6fd35f', w: 16, h: 16, pal: { w: '#ffffff' }, proc: (P) => {
    P.ell(8, 11, 6, 4, 'a'); P.rect(2, 11, 12, 4, 'a'); P.rect(3, 14, 10, 1, 'b'); P.px(1, 14, 'a');
    P.ell(5, 8.5, 1.5, 1, 'c'); P.px(4, 8, 'w');
    P.rect(5, 10, 2, 3, 'k'); P.rect(10, 10, 2, 3, 'k'); P.px(5, 10, 'w'); P.px(10, 10, 'w'); P.rect(7, 13, 2, 1, 'k');
  } },
  goblin: { tint: '#8ab840', w: 16, h: 16, pal: { e: '#ff3020', h: '#6a4a2a', q: '#8a5a2a', d: '#7a5530', s: '#e0d8c0', w: '#f0e8d0' }, proc: (P) => {
    P.rect(5, 13, 2, 3, 'q'); P.rect(8, 13, 2, 3, 'q'); P.rect(4, 9, 6, 5, 'q'); P.rect(4, 11, 6, 1, 'h');
    P.ell(7, 6, 3, 3, 'a'); P.tri(0, 4, 4, 6, 4, 7, 'a'); P.tri(14, 4, 10, 6, 10, 7, 'a');   // 머리·뾰족 귀
    P.rect(4, 2, 6, 2, 'h'); P.px(6, 6, 'e'); P.px(8, 6, 'e'); P.px(6, 8, 'w'); P.px(8, 8, 'w'); // 두건·눈·이빨
    P.line(9, 10, 12, 8, 'a'); P.line(12, 3, 14, 8, 'd'); P.line(14, 8, 12, 13, 'd'); P.line(12, 3, 12, 13, 's'); // 활
  } },
  boar: { tint: '#8a4a3a', w: 16, h: 16, pal: { t: '#f0e8d0', e: '#ffd84a', p: '#e08a8a' }, proc: (P) => {
    P.rect(3, 12, 2, 3, 'b'); P.rect(6, 13, 2, 2, 'b'); P.rect(9, 13, 2, 2, 'b'); P.rect(11, 12, 2, 3, 'b');
    for (let x = 2; x <= 8; x += 2) P.tri(x, 7, x + 2, 7, x + 1, 3, 'b');                 // 등 갈기
    P.ell(7, 9.5, 6, 3.5, 'a'); P.ell(7, 11.5, 4.5, 1, 'c'); P.px(1, 8, 'b');
    P.ell(12, 9, 3, 3, 'a'); P.tri(10, 7, 12, 7, 11, 4, 'b'); P.rect(14, 9, 2, 2, 'p'); P.px(15, 9, 'k');
    P.line(13, 11, 14, 13, 't'); P.px(12, 8, 'e');                                      // 엄니·눈
  } },
  shroom: { tint: '#d04a4a', w: 16, h: 16, pal: { w: '#ffffff', s: '#e8d8b0', m: '#5a3a2a' }, proc: (P) => {
    P.rect(5, 14, 2, 2, 'm'); P.rect(9, 14, 2, 2, 'm'); P.rect(5, 9, 6, 6, 's');
    P.rect(6, 10, 1, 2, 'k'); P.rect(9, 10, 1, 2, 'k'); P.line(6, 10, 7, 11, 'k'); P.rect(7, 13, 2, 1, 'k');
    P.ell(8, 5.5, 7, 4, 'a'); P.rect(1, 6, 14, 2, 'a'); P.rect(2, 8, 12, 1, 'b');
    P.ell(5, 4, 1.3, 1, 'w'); P.ell(10, 3, 1, 1, 'w'); P.ell(12.5, 6, 1, 0.7, 'w'); P.px(7, 6, 'w'); P.px(3, 7, 'w');
  } },
  // ── 2필드: 서리 동굴
  iceslime: { tint: '#7ac8ff', w: 16, h: 16, pal: { w: '#ffffff', i: '#e8faff' }, proc: (P) => {
    P.ell(8, 11, 6, 4, 'a'); P.rect(2, 11, 12, 4, 'a'); P.rect(3, 14, 10, 1, 'b');
    P.tri(3, 9, 6, 9, 4, 4, 'i'); P.tri(7, 8, 10, 8, 8, 2, 'i'); P.tri(11, 9, 13, 9, 12, 5, 'i'); P.px(8, 4, 'w');
    P.rect(5, 10, 2, 2, 'k'); P.rect(10, 10, 2, 2, 'k'); P.px(5, 10, 'w'); P.px(10, 10, 'w'); P.px(8, 13, 'k');
  } },
  frostarcher: { tint: '#5a8ac8', w: 16, h: 16, pal: { f: '#ffffff', i: '#bfefff', e: '#2a5aff', s: '#f0c8a0', g: '#3a4a6a' }, proc: (P) => {
    P.rect(5, 13, 2, 3, 'g'); P.rect(8, 13, 2, 3, 'g'); P.rect(4, 8, 6, 6, 'a'); P.tri(3, 14, 11, 14, 7, 8, 'a'); P.rect(4, 8, 6, 1, 'f');
    P.ell(7, 5, 3, 3, 'a'); P.rect(4, 3, 6, 1, 'f'); P.rect(6, 5, 3, 2, 's'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.line(12, 2, 14, 7, 'i'); P.line(14, 7, 12, 12, 'i'); P.line(12, 2, 12, 12, 'f'); P.line(9, 7, 13, 7, 'f');   // 얼음 활
  } },
  yeti: { tint: '#e8f0ff', w: 16, h: 16, pal: { f: '#7a9ac0', e: '#102040', w: '#ffffff', h: '#c0d0e0' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 'h'); P.rect(9, 13, 3, 3, 'h');
    P.rect(1, 7, 3, 7, 'a'); P.rect(12, 7, 3, 7, 'a'); P.rect(1, 12, 3, 2, 'h'); P.rect(12, 12, 3, 2, 'h'); // 긴 팔
    P.ell(8, 10, 5, 4, 'a'); P.ell(8, 11, 3, 2, 'c');
    P.ell(8, 5, 4, 3.5, 'a'); P.tri(3, 3, 5, 3, 3, 0, 'h'); P.tri(11, 3, 13, 3, 13, 0, 'h');            // 머리·뿔
    P.rect(6, 4, 4, 3, 'f'); P.px(6, 5, 'e'); P.px(9, 5, 'e'); P.rect(7, 7, 2, 1, 'e'); P.px(7, 7, 'w');
  } },
  icemage: { tint: '#2a4a8a', w: 16, h: 16, pal: { i: '#dff4ff', s: '#c8d8f0', n: '#7a5a3a' }, proc: (P) => {
    robe(P, 'i'); P.px(7, 10, 'i'); P.px(7, 12, 'i');
    P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.tri(4, 3, 6, 3, 5, 0, 'i'); P.tri(6, 3, 8, 3, 7, 0, 'i'); P.tri(8, 3, 10, 3, 9, 0, 'i');         // 얼음 왕관
    P.line(10, 9, 13, 9, 'a'); P.line(13, 4, 13, 15, 'n'); P.ell(13, 2.5, 1.5, 1.5, 'e');
  } },
  // ── 3필드: 용암 요새
  imp: { tint: '#e04a2a', w: 16, h: 16, pal: { g: '#3a1a1a', e: '#ffd84a', w: '#ffffff' }, proc: (P) => {
    P.tri(0, 4, 6, 7, 2, 10, 'g'); P.tri(15, 4, 9, 7, 13, 10, 'g');                     // 박쥐 날개
    P.line(9, 12, 12, 14, 'b'); P.tri(12, 13, 14, 13, 13, 15, 'b');                     // 꼬리
    P.ell(8, 9, 3, 3, 'a'); P.px(7, 12, 'b'); P.px(9, 12, 'b');
    P.ell(8, 5, 3, 2.5, 'a'); P.line(5, 3, 4, 0, 'g'); P.line(11, 3, 12, 0, 'g');
    P.px(7, 5, 'e'); P.px(9, 5, 'e'); P.rect(7, 7, 3, 1, 'k'); P.px(8, 7, 'w');
  } },
  bomber: { tint: '#3a3a48', w: 16, h: 16, pal: { s: '#ffe36b', f: '#8a6a4a', m: '#8a8a9a', e: '#ff5a3a' }, proc: (P) => {
    P.line(9, 3, 11, 1, 'f'); P.px(12, 0, 's'); P.px(11, 0, 's'); P.px(12, 1, 's'); P.rect(7, 3, 3, 2, 'm');   // 도화선·불꽃
    P.ell(8, 10, 5, 5, 'a'); P.ell(6, 7.5, 1.2, 1, 'c');
    P.rect(5, 9, 2, 2, 'e'); P.rect(9, 9, 2, 2, 'e'); P.line(4, 8, 6, 9, 'k'); P.line(11, 8, 9, 9, 'k'); P.rect(6, 12, 4, 1, 'k');
    P.rect(5, 15, 2, 1, 'm'); P.rect(9, 15, 2, 1, 'm');
  } },
  golem: { tint: '#7a4a2a', w: 16, h: 16, pal: { l: '#ff7a2a', e: '#ffd84a' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 'b'); P.rect(9, 13, 3, 3, 'b');
    P.rect(3, 6, 10, 8, 'a'); P.ell(3, 7, 2.5, 2, 'a'); P.ell(13, 7, 2.5, 2, 'a');
    P.rect(0, 10, 3, 4, 'b'); P.rect(13, 10, 3, 4, 'b');                                 // 큰 주먹
    P.rect(6, 3, 4, 3, 'a'); P.px(7, 4, 'e'); P.px(9, 4, 'e');
    P.line(5, 8, 7, 11, 'l'); P.line(10, 7, 9, 10, 'l'); P.px(8, 12, 'l'); P.line(1, 11, 2, 12, 'l'); P.px(14, 11, 'l'); // 용암 균열
  } },
  firemage: { tint: '#8a2a1a', w: 16, h: 16, pal: { h: '#e0d0b0', n: '#5a3a2a', y: '#ffb040' }, proc: (P) => {
    robe(P); for (let x = 3; x <= 10; x += 2) P.tri(x, 15, x + 2, 15, x + 1, 12, 'y');  // 불꽃 모양 자락
    P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.line(4, 3, 3, 0, 'h'); P.line(10, 3, 11, 0, 'h');                                 // 뿔
    P.line(10, 9, 13, 9, 'a'); P.line(13, 4, 13, 15, 'n'); P.tri(12, 3, 14, 3, 13, 0, 'e'); P.px(13, 3, 'y'); // 불꽃 지팡이
  } },
  // ── 4필드: 공허 성채
  wraith: { tint: '#8a6ad0', w: 16, h: 16, pal: { e: '#ffe0ff', w: '#e0d0ff' }, proc: (P) => {
    P.ell(8, 6, 4, 4, 'a'); P.rect(4, 6, 8, 6, 'a');
    P.tri(4, 11, 6, 11, 5, 15, 'a'); P.tri(7, 11, 9, 11, 8, 14, 'a'); P.tri(10, 11, 12, 11, 11, 15, 'a');   // 해진 자락
    P.ell(8, 6, 2.5, 2, 'k'); P.px(7, 6, 'e'); P.px(9, 6, 'e');
    P.line(3, 8, 5, 9, 'a'); P.line(13, 8, 11, 9, 'a'); P.line(1, 8, 3, 8, 'w'); P.line(1, 10, 3, 9, 'w'); P.line(15, 8, 13, 8, 'w'); P.line(15, 10, 13, 9, 'w'); // 손톱
  } },
  hound: { tint: '#3a3050', w: 16, h: 16, pal: { e: '#ff3a5a', w: '#ffffff' }, proc: (P) => {
    P.rect(3, 12, 1, 3, 'b'); P.rect(5, 12, 1, 3, 'b'); P.rect(10, 12, 1, 3, 'b'); P.rect(12, 12, 1, 3, 'b');
    P.tri(3, 8, 5, 8, 4, 5, 'b'); P.tri(6, 8, 8, 8, 7, 5, 'b'); P.tri(9, 8, 10, 8, 9, 6, 'b');   // 가시 등
    P.ell(7, 10, 5, 2.5, 'a'); P.line(2, 9, 0, 6, 'b');
    P.ell(12, 8, 2.5, 2, 'a'); P.rect(13, 9, 3, 1, 'a'); P.tri(11, 6, 12, 6, 11, 3, 'b'); P.tri(12, 6, 13, 6, 13, 3, 'b');
    P.px(12, 7, 'e'); P.px(14, 10, 'w');
  } },
  crystal: { tint: '#b070ff', w: 16, h: 16, pal: { s: '#5a5a6a', e: '#ffffff' }, proc: (P) => {
    P.rect(4, 13, 8, 2, 's'); P.rect(3, 15, 10, 1, 's');
    P.tri(5, 7, 11, 7, 8, 1, 'a'); P.tri(5, 7, 11, 7, 8, 12, 'a'); P.tri(8, 1, 8, 12, 5, 7, 'c'); P.px(8, 7, 'e');
    P.tri(1, 5, 3, 5, 2, 3, 'c'); P.tri(13, 9, 15, 9, 14, 7, 'c');                       // 떠다니는 조각
  } },
  voidmage: { tint: '#1a1030', w: 16, h: 16, pal: { x: '#d070ff' }, proc: (P) => {
    robe(P, 'b'); P.ell(7, 11, 1.5, 1, 'e'); P.px(7, 11, 'k');                          // 가슴의 눈 문양
    P.ell(7, 5, 3, 3, 'a'); P.tri(6, 3, 8, 3, 7, 0, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.px(1, 6, 'e'); P.px(13, 8, 'e'); P.px(2, 12, 'e'); P.px(14, 3, 'e');              // 떠다니는 구슬 (지팡이 없음)
  } },
  // ── 5필드 이후 일부 다듬기
  scarab: { tint: '#c8a030', w: 16, h: 16, pal: { e: '#ff5a3a', n: '#3a2a1a', w: '#fff0c0' }, proc: (P) => {
    for (const y of [8, 11, 13]) { P.line(4, y, 1, y + (y > 10 ? 2 : -1), 'n'); P.line(11, y, 14, y + (y > 10 ? 2 : -1), 'n'); } // 다리
    P.ell(8, 10.5, 5, 4.5, 'a'); P.line(8, 7, 8, 15, 'b'); P.ell(6, 9, 1, 1.5, 'w');    // 등딱지·광택
    P.ell(8, 5, 3, 2, 'b'); P.line(8, 3, 8, 0, 'b'); P.px(9, 0, 'b'); P.px(6, 5, 'e'); P.px(10, 5, 'e'); // 머리·뿔
  } },
  sandmage: { tint: '#a0702a', w: 16, h: 16, pal: { y: '#ffd06a', n: '#7a5a3a', s: '#e8c890', w: '#f0e8d0' }, proc: (P) => {
    robe(P, 'y'); P.line(4, 9, 10, 13, 'y');                                            // 비단 띠
    P.ell(7, 3, 3.5, 2, 'w'); P.px(7, 3, 'e'); P.rect(5, 5, 5, 1, 's'); P.px(6, 5, 'k'); P.px(8, 5, 'k'); // 터번·보석·눈
    P.rect(5, 6, 5, 2, 'w');                                                            // 얼굴 가리개
    P.line(10, 9, 13, 9, 'a'); P.line(13, 4, 13, 15, 'n'); P.line(13, 4, 11, 2, 'n'); P.px(11, 3, 'e'); // 굽은 지팡이
  } },
  witch: { tint: '#4a2a5a', w: 16, h: 16, pal: { s: '#9ac070', n: '#5a3a2a', y: '#c8a050' }, proc: (P) => {
    robe(P, 'b'); P.rect(4, 6, 1, 5, 'b');                                              // 로브·머리카락
    P.rect(5, 6, 4, 3, 's'); P.px(9, 7, 's'); P.px(10, 8, 's'); P.px(6, 7, 'e'); P.px(8, 7, 'e'); // 녹색 얼굴·매부리코
    P.rect(1, 5, 13, 1, 'a'); P.tri(4, 5, 10, 5, 7, 0, 'a'); P.line(7, 0, 10, 1, 'a'); P.rect(4, 4, 6, 1, 'y'); // 챙 넓은 고깔
    P.line(12, 4, 12, 13, 'n'); P.rect(11, 13, 3, 2, 'y');                              // 빗자루
  } },
  bonemage: { tint: '#2a3a3a', w: 16, h: 16, pal: { w: '#e8e0d0' }, proc: (P) => {
    robe(P, 'b'); P.rect(6, 10, 3, 1, 'w'); P.rect(6, 12, 3, 1, 'w');                    // 로브·갈비뼈 장식
    P.ell(7, 5, 4, 4, 'a'); P.ell(7, 5, 3, 3, 'w'); P.px(6, 5, 'e'); P.px(8, 5, 'e'); P.rect(6, 7, 3, 1, 'w'); P.px(7, 7, 'k'); // 해골 얼굴
    P.line(10, 9, 13, 9, 'a'); P.line(13, 4, 13, 15, 'w'); P.ell(13, 2.5, 1.5, 1.5, 'w'); P.px(13, 2, 'e'); // 뼈 지팡이
  } },
  ironknight: { tint: '#8a94a4', w: 16, h: 16, pal: { e: '#ff5a3a', r: '#c04040', m: '#d8dde4', n: '#5a5a62' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 'b'); P.rect(9, 13, 3, 3, 'b');
    P.rect(3, 7, 10, 7, 'a'); P.rect(4, 8, 8, 2, 'c'); P.rect(3, 12, 10, 1, 'n');
    P.rect(0, 6, 4, 8, 'a'); P.rect(1, 7, 2, 6, 'r');                                    // 큰 방패
    P.rect(5, 1, 6, 6, 'a'); P.rect(6, 3, 4, 1, 'k'); P.px(7, 3, 'e'); P.px(9, 3, 'e'); P.rect(7, 0, 2, 1, 'r'); // 투구
    P.line(14, 1, 14, 12, 'm'); P.rect(13, 10, 3, 1, 'n');                                // 검
  } },
  cspider: { tint: '#c05aa0', w: 16, h: 16, pal: { n: '#3a2a3a', e: '#ffffff', x: '#ff9ae0' }, proc: (P) => {
    for (let i = 0; i < 4; i++) { const y = 7 + i * 2, k = y - 2 + i; P.line(5, y, 2, k, 'n'); P.line(2, k, 0, y + 1 + i, 'n'); P.line(10, y, 13, k, 'n'); P.line(13, k, 15, y + 1 + i, 'n'); }
    P.ell(8, 11, 4, 3.5, 'a'); P.tri(6, 10, 8, 10, 7, 6, 'x'); P.tri(8, 10, 10, 10, 9, 7, 'x');   // 몸·수정
    P.ell(8, 6, 2.5, 2, 'b'); P.px(7, 6, 'e'); P.px(9, 6, 'e'); P.px(8, 5, 'e');
  } },
  // ── 심층: 잿빛 심연
  abyssjelly: { tint: '#3aa89a', w: 16, h: 16, pal: { w: '#ffffff' }, proc: (P) => {
    for (const x of [4, 7, 10, 12]) P.line(x, 9, x + (x % 2 ? 1 : -1), 15, 'b');          // 늘어진 촉수
    P.ell(8, 6, 6, 5, 'a'); P.rect(2, 7, 12, 3, 'a'); P.ell(8, 9, 6, 1, 'b');              // 갓
    P.ell(6, 4, 1.5, 1, 'c'); P.px(5, 3, 'w'); P.ell(8, 7, 2, 1.5, 'e'); P.px(8, 7, 'w');   // 광택·빛나는 핵
  } },
  bonecrawler: { tint: '#8a8478', w: 16, h: 16, pal: { e: '#ff5a3a', n: '#3a3430' }, proc: (P) => {
    for (const x of [3, 6, 9, 12]) { P.line(x, 11, x - 1, 14, 'n'); }                        // 다리
    P.ell(8, 9, 6, 3.5, 'a'); for (const x of [4, 7, 10]) P.line(x, 6, x, 12, 'b');         // 마디진 등껍질
    P.ell(13, 9, 2, 2, 'b'); P.px(14, 8, 'e'); P.line(15, 10, 15, 12, 'c'); P.line(14, 11, 13, 13, 'c'); // 머리·집게
    P.tri(2, 6, 4, 6, 3, 3, 'c'); P.tri(6, 6, 8, 6, 7, 3, 'c'); P.tri(10, 6, 12, 6, 11, 3, 'c'); // 등뼈 가시
  } },
  eyebat: { tint: '#4a3a5a', w: 16, h: 16, pal: { w: '#ffffff', e: '#5affd8' }, proc: (P) => {
    P.tri(0, 5, 5, 8, 2, 11, 'b'); P.tri(15, 5, 10, 8, 13, 11, 'b');                         // 날개
    P.ell(8, 8, 4, 4, 'a'); P.ell(8, 8, 2.5, 2.5, 'w'); P.ell(8, 8, 1.2, 1.5, 'e'); P.px(8, 8, 'k'); // 커다란 눈알
    P.px(6, 12, 'w'); P.px(10, 12, 'w');                                                     // 이빨
  } },
  sporetower: { tint: '#3a5a4a', w: 16, h: 16, pal: { s: '#2a2f34', e: '#5affd8' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 's'); P.rect(6, 5, 4, 9, 'a'); P.rect(6, 5, 1, 9, 'c');              // 받침·기둥
    P.ell(8, 4, 4, 3, 'b'); P.px(6, 3, 'e'); P.px(10, 4, 'e'); P.px(8, 2, 'e');            // 포자 머리
    P.px(5, 9, 'e'); P.px(10, 11, 'e');
  } },
  // ── 심층: 부서진 별의 정원
  starwisp: { tint: '#9ad8ff', w: 16, h: 16, pal: { w: '#ffffff', e: '#1a2a5a', y: '#ffe9a0' }, proc: (P) => {
    P.tri(8, 0, 6, 6, 10, 6, 'a'); P.tri(2, 6, 14, 6, 8, 10, 'a'); P.tri(3, 14, 8, 8, 6, 9, 'a'); P.tri(13, 14, 8, 8, 10, 9, 'a'); // 별 모양 몸
    P.ell(8, 7, 2.5, 2, 'c'); P.px(7, 7, 'e'); P.px(9, 7, 'e'); P.px(8, 2, 'w'); P.px(1, 4, 'y'); P.px(14, 11, 'y');
  } },
  meteorgolem: { tint: '#4a4a5a', w: 16, h: 16, pal: { l: '#9ad8ff', e: '#ffe9a0' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 'b'); P.rect(9, 13, 3, 3, 'b');
    P.ell(8, 9, 6, 5, 'a'); P.ell(2, 9, 2, 2.5, 'a'); P.ell(14, 9, 2, 2.5, 'a');              // 운석 덩어리 몸·주먹
    P.ell(5, 7, 1.2, 1, 'b'); P.ell(11, 11, 1.5, 1, 'b'); P.ell(9, 6, 1, 1, 'b');           // 패인 자국
    P.line(4, 11, 7, 9, 'l'); P.line(10, 7, 12, 9, 'l'); P.px(7, 6, 'e'); P.px(10, 6, 'e');  // 빛나는 금
  } },
  cometdog: { tint: '#3a4a8a', w: 16, h: 16, pal: { e: '#ffe9a0', w: '#dff8ff' }, proc: (P) => {
    P.line(0, 7, 4, 9, 'w'); P.line(0, 9, 4, 10, 'c'); P.line(1, 11, 4, 11, 'w');             // 혜성 꼬리
    P.rect(4, 12, 1, 3, 'b'); P.rect(6, 12, 1, 3, 'b'); P.rect(10, 12, 1, 3, 'b'); P.rect(12, 12, 1, 3, 'b');
    P.ell(8, 10, 5, 2.5, 'a'); P.ell(12, 8, 2.5, 2, 'a'); P.rect(13, 9, 3, 1, 'a');
    P.tri(11, 6, 12, 6, 11, 3, 'c'); P.tri(12, 6, 13, 6, 13, 3, 'c'); P.px(12, 7, 'e');
  } },
  nebulamage: { tint: '#3a2a6a', w: 16, h: 16, pal: { y: '#ffe9a0', w: '#ffffff' }, proc: (P) => {
    robe(P, 'b'); P.px(5, 10, 'y'); P.px(9, 12, 'y'); P.px(7, 14, 'w'); P.px(10, 9, 'w');      // 별이 박힌 로브
    P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.ell(7, 2, 3.5, 1.2, 'c');                                                              // 머리 위 성운 고리
    P.line(10, 9, 13, 8, 'a'); P.ell(13.5, 6.5, 2, 2, 'e'); P.px(13, 6, 'w');                // 손 위의 작은 별
  } },
  // ── 심층: 뒤틀린 버섯숲
  sporeling: { tint: '#c87ad8', w: 16, h: 16, pal: { w: '#e8d8c8', e: '#2a1a2a' }, proc: (P) => {
    P.rect(5, 13, 2, 3, 'w'); P.rect(9, 13, 2, 3, 'w'); P.ell(8, 11, 3.5, 3, 'w');            // 다리·몸통
    P.ell(8, 7, 6, 4, 'a'); P.ell(8, 9, 5, 1.2, 'b'); P.px(5, 6, 'c'); P.px(10, 5, 'c'); P.px(8, 4, 'c'); // 갓·점무늬
    P.px(7, 11, 'e'); P.px(9, 11, 'e');
  } },
  shroomknight: { tint: '#8a5a9a', w: 16, h: 16, pal: { s: '#a8a8b8', w: '#e8d8c8', e: '#e07aff' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 's'); P.rect(9, 13, 3, 3, 's'); P.rect(4, 8, 8, 6, 's'); P.rect(4, 8, 2, 6, 'w'); // 갑옷
    P.ell(8, 5, 7, 4, 'a'); P.ell(8, 7, 6, 1.2, 'b'); P.px(5, 4, 'c'); P.px(11, 4, 'c');       // 버섯 투구
    P.px(6, 9, 'e'); P.px(9, 9, 'e'); P.line(13, 4, 13, 14, 's'); P.px(13, 3, 'w');            // 눈·창
  } },
  puffcap: { tint: '#a04ac0', w: 16, h: 16, pal: { w: '#e8d8c8', e: '#2a1a2a', y: '#e07aff' }, proc: (P) => {
    P.rect(6, 10, 4, 6, 'w'); P.ell(8, 7, 6, 5, 'a'); P.ell(8, 4, 3, 2, 'c');                  // 줄기·부푼 갓
    for (const [x, y] of [[4, 6], [11, 5], [8, 9], [6, 3]]) P.px(x, y, 'y');                  // 빛나는 포자
    P.px(7, 12, 'e'); P.px(9, 12, 'e'); P.px(2, 2, 'y'); P.px(14, 3, 'y');
  } },
  vinelasher: { tint: '#5a8a4a', w: 16, h: 16, pal: { e: '#e07aff', l: '#9aff5a' }, proc: (P) => {
    P.line(5, 15, 6, 9, 'b'); P.line(10, 15, 9, 9, 'b'); P.ell(8, 8, 4, 4, 'a'); P.ell(8, 5, 3, 2.5, 'a'); // 덩굴 몸
    P.px(7, 5, 'e'); P.px(9, 5, 'e'); P.line(11, 8, 15, 4, 'l'); P.line(4, 8, 1, 11, 'l'); P.px(15, 3, 'e'); // 채찍 덩굴
    P.px(6, 2, 'e'); P.px(10, 2, 'l');
  } },
  // ── 심층: 가라앉은 신전
  drowned: { tint: '#4a7a8a', w: 16, h: 16, pal: { s: '#6a8a8a', e: '#9ae8ff', g: '#3a8a6a' }, proc: (P) => {
    P.rect(5, 12, 2, 4, 'b'); P.rect(9, 12, 2, 4, 'b'); P.rect(4, 7, 8, 6, 's'); P.rect(4, 7, 8, 1, 'c'); // 녹슨 갑옷
    P.ell(8, 4, 3.5, 3.5, 'a'); P.rect(6, 3, 4, 2, 'k'); P.px(6, 3, 'e'); P.px(9, 3, 'e');      // 투구·빛나는 눈
    P.px(5, 9, 'g'); P.px(10, 11, 'g'); P.line(12, 6, 13, 13, 's');                            // 해초·검
  } },
  eel: { tint: '#3a6aa0', w: 16, h: 16, pal: { e: '#ffe94a', w: '#bfefff' }, proc: (P) => {
    P.line(1, 12, 4, 10, 'a'); P.line(4, 10, 8, 12, 'a'); P.line(8, 12, 12, 9, 'a'); P.line(1, 13, 4, 11, 'b'); P.line(4, 11, 8, 13, 'b'); // 구불거리는 몸
    P.ell(13, 8, 2.5, 2, 'a'); P.px(14, 7, 'e'); P.px(15, 9, 'w');                              // 머리
    P.px(3, 9, 'e'); P.px(7, 11, 'e'); P.px(10, 9, 'e');                                       // 전기 반점
  } },
  bubblemage: { tint: '#2a5a7a', w: 16, h: 16, pal: { w: '#bfefff', e: '#9ae8ff' }, proc: (P) => {
    robe(P, 'b'); P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.ell(12.5, 7, 2.5, 2.5, 'w'); P.px(12, 6, 'e'); P.px(3, 3, 'w'); P.px(13, 2, 'w'); P.px(10, 3, 'w'); // 물방울
  } },
  coraltower: { tint: '#e06a6a', w: 16, h: 16, pal: { s: '#4a6a74', e: '#ffe9a0' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 's'); P.rect(7, 6, 2, 8, 'a'); P.line(7, 9, 4, 5, 'a'); P.line(9, 8, 12, 4, 'a'); P.line(4, 5, 4, 3, 'c'); P.line(12, 4, 12, 2, 'c'); // 받침·가지
    P.ell(8, 5, 2, 2, 'b'); P.px(8, 5, 'e'); P.px(4, 2, 'e'); P.px(12, 1, 'e');
  } },
  // ── 심층: 뒤집힌 하늘섬
  windsprite: { tint: '#bfefff', w: 16, h: 16, pal: { w: '#ffffff', e: '#3a5a8a' }, proc: (P) => {
    P.ell(8, 7, 4, 4, 'a'); P.tri(4, 9, 12, 9, 8, 15, 'a'); P.line(2, 5, 5, 7, 'c'); P.line(14, 6, 11, 8, 'c'); P.line(1, 10, 4, 10, 'c'); // 회오리 몸·바람줄기
    P.ell(7, 5, 1.5, 1, 'w'); P.px(7, 7, 'e'); P.px(9, 7, 'e');
  } },
  thunderhawk: { tint: '#6a7ab8', w: 16, h: 16, pal: { y: '#ffe94a', w: '#ffffff', n: '#c8a050' }, proc: (P) => {
    P.tri(0, 6, 7, 8, 2, 12, 'b'); P.tri(15, 6, 9, 8, 13, 12, 'b');                          // 날개
    P.ell(8, 9, 3.5, 3, 'a'); P.ell(8, 6, 2.5, 2, 'a'); P.tri(8, 6, 11, 6, 10, 8, 'n'); P.px(7, 5, 'y'); // 몸·부리·눈
    P.line(1, 4, 3, 7, 'y'); P.line(14, 4, 12, 7, 'y'); P.px(7, 13, 'b'); P.px(9, 13, 'b');   // 날개 끝 번개
  } },
  cloudmage: { tint: '#9aaac8', w: 16, h: 16, pal: { w: '#ffffff', y: '#ffe94a' }, proc: (P) => {
    robe(P, 'w'); P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.ell(7, 1.5, 4, 1.5, 'w'); P.ell(5, 2, 1.5, 1, 'w'); P.ell(9.5, 2, 1.5, 1, 'w');        // 머리 위 구름
    P.line(10, 9, 13, 8, 'a'); P.ell(13.5, 6.5, 2, 1.5, 'w'); P.px(13, 8, 'y');               // 손 위 작은 구름과 번개
  } },
  galetotem: { tint: '#7a8ab0', w: 16, h: 16, pal: { s: '#5a6a8a', w: '#ffffff', e: '#bfefff' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 's'); P.rect(5, 4, 6, 10, 'a'); P.rect(5, 4, 1, 10, 'c'); P.rect(5, 8, 6, 1, 'b'); // 받침·토템 기둥
    P.px(6, 6, 'e'); P.px(9, 6, 'e'); P.rect(7, 10, 2, 1, 'k'); P.tri(3, 4, 13, 4, 8, 1, 'b');            // 얼굴·머리
    P.line(1, 6, 4, 6, 'w'); P.line(12, 7, 15, 7, 'w');                                                     // 바람
  } },
  // ── 심층: 거울의 미궁
  mirrorknight: { tint: '#a8a4c8', w: 16, h: 16, pal: { g: '#e0c8ff', w: '#ffffff', e: '#ff7ad0' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 'b'); P.rect(9, 13, 3, 3, 'b'); P.rect(3, 7, 10, 7, 'a'); P.rect(4, 8, 8, 2, 'c'); // 거울 갑옷
    P.rect(0, 6, 4, 8, 'g'); P.px(1, 7, 'w'); P.px(1, 8, 'w');                                // 거울 방패
    P.rect(5, 1, 6, 6, 'a'); P.rect(6, 3, 4, 1, 'k'); P.px(7, 3, 'e'); P.px(9, 3, 'e');       // 투구
    P.line(14, 1, 14, 12, 'g'); P.px(14, 0, 'w');                                             // 유리 검
  } },
  shardbat: { tint: '#c8b0ff', w: 16, h: 16, pal: { w: '#ffffff', e: '#ff7ad0' }, proc: (P) => {
    P.tri(0, 4, 6, 8, 1, 11, 'b'); P.tri(15, 4, 10, 8, 14, 11, 'b'); P.line(2, 6, 4, 9, 'c'); P.line(13, 6, 11, 9, 'c'); // 유리 조각 날개
    P.tri(8, 4, 5, 10, 11, 10, 'a'); P.px(7, 7, 'e'); P.px(9, 7, 'e'); P.px(8, 5, 'w');     // 다이아몬드 몸
  } },
  prismmage: { tint: '#5a4a7a', w: 16, h: 16, pal: { g: '#e0c8ff', w: '#ffffff' }, proc: (P) => {
    robe(P, 'g'); P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.tri(11, 6, 15, 6, 13, 2, 'g'); P.tri(11, 6, 15, 6, 13, 10, 'g'); P.px(13, 5, 'w');      // 떠 있는 프리즘
    P.px(2, 3, 'g'); P.px(4, 1, 'w');
  } },
  prismtower: { tint: '#d8c8ff', w: 16, h: 16, pal: { s: '#4c4862', w: '#ffffff', e: '#ffb0ff' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 's'); P.tri(4, 12, 12, 12, 8, 1, 'a'); P.tri(8, 1, 8, 12, 4, 12, 'c'); // 받침·큰 프리즘
    P.px(8, 7, 'e'); P.px(7, 4, 'w'); P.px(2, 6, 'e'); P.px(14, 9, 'e');
  } },
  // ── 심층: 멈춘 태엽탑
  gearsoldier: { tint: '#a88a5a', w: 16, h: 16, pal: { y: '#e8c070', w: '#ffffff', e: '#ff6a3a' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 'b'); P.rect(9, 13, 3, 3, 'b'); P.rect(3, 7, 10, 7, 'a'); P.ell(8, 10, 2, 2, 'y'); P.px(8, 10, 'b'); // 놋쇠 몸통·가슴 톱니
    P.rect(5, 1, 6, 6, 'a'); P.rect(6, 3, 4, 1, 'k'); P.px(7, 3, 'e'); P.px(9, 3, 'e');                                     // 머리
    P.line(8, 0, 8, 1, 'y'); P.rect(13, 3, 2, 10, 'c'); P.rect(12, 2, 4, 2, 'y');                                           // 태엽 손잡이·망치
  } },
  cogbug: { tint: '#c8a050', w: 16, h: 16, pal: { w: '#ffffff', e: '#ff6a3a' }, proc: (P) => {
    P.ell(8, 9, 5, 4, 'a'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.px(8 + Math.cos(a) * 6, 9 + Math.sin(a) * 5, 'b'); } // 톱니 몸
    P.ell(8, 9, 2, 1.5, 'c'); P.px(6, 7, 'e'); P.px(10, 7, 'e'); P.line(3, 13, 1, 15, 'b'); P.line(13, 13, 15, 15, 'b');
  } },
  clockmage: { tint: '#4a3e5a', w: 16, h: 16, pal: { y: '#e8c070', w: '#ffffff' }, proc: (P) => {
    robe(P, 'y'); P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.line(12, 1, 12, 9, 'y'); P.ell(12, 11, 2, 2, 'y'); P.px(12, 11, 'w');                                                  // 시계추 지팡이
  } },
  belltower: { tint: '#b08a40', w: 16, h: 16, pal: { s: '#4a3e30', w: '#ffffff', e: '#ffe9a0' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 's'); P.rect(5, 6, 6, 7, 's'); P.tri(3, 7, 13, 7, 8, 2, 'a'); P.ell(8, 9, 2.5, 2.5, 'c'); P.px(8, 11, 'e'); // 받침·지붕·종
    P.px(7, 8, 'w'); P.px(2, 9, 'e'); P.px(14, 9, 'e');
  } },
  // ── 심층: 잿불 성채
  emberimp: { tint: '#c8502a', w: 16, h: 16, pal: { y: '#ffb04a', w: '#ffffff', e: '#ffe94a' }, proc: (P) => {
    P.ell(8, 10, 4, 4, 'a'); P.ell(8, 6, 3, 3, 'a'); P.tri(5, 5, 6, 1, 7, 4, 'b'); P.tri(9, 4, 10, 1, 11, 5, 'b'); // 몸·뿔
    P.px(7, 6, 'e'); P.px(9, 6, 'e'); P.line(12, 11, 15, 9, 'b'); P.px(15, 8, 'y'); P.px(8, 2, 'y'); P.px(4, 13, 'y'); // 꼬리 불씨
  } },
  ashhound: { tint: '#5a4a46', w: 16, h: 16, pal: { y: '#ff8a3a', e: '#ffe94a' }, proc: (P) => {
    P.ell(7, 10, 5, 3, 'a'); P.ell(12, 8, 3, 2.5, 'a'); P.tri(11, 6, 12, 3, 13, 6, 'b');                         // 몸·머리·귀
    P.rect(3, 12, 2, 3, 'b'); P.rect(9, 12, 2, 3, 'b'); P.px(13, 8, 'e'); P.line(2, 9, 0, 7, 'y'); P.px(5, 8, 'y'); P.px(8, 8, 'y'); // 다리·눈·불꼬리·등 불씨
  } },
  cinderpriest: { tint: '#6a2a2a', w: 16, h: 16, pal: { y: '#ff8a3a', w: '#ffe9a0' }, proc: (P) => {
    robe(P, 'y'); P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'e'); P.px(8, 5, 'e');
    P.line(12, 3, 12, 13, 'b'); P.ell(12, 2, 1.5, 2, 'y'); P.px(12, 1, 'w');                                     // 불붙은 지팡이
  } },
  // ── 심층: 잠긴 서고
  bookmite: { tint: '#c8b890', w: 16, h: 16, pal: { w: '#f4ecd8', e: '#2a2a4a', r: '#8a3a3a' }, proc: (P) => {
    P.rect(3, 6, 10, 7, 'a'); P.rect(3, 6, 10, 1, 'r'); P.rect(4, 7, 8, 5, 'w'); P.line(8, 7, 8, 11, 'c');   // 펼쳐진 책 몸
    P.px(6, 9, 'e'); P.px(10, 9, 'e'); for (const x of [3, 6, 10, 13]) P.line(x, 13, x - 1, 15, 'b');     // 눈·다리
  } },
  inkblob: { tint: '#2a2a4a', w: 16, h: 16, pal: { w: '#ffffff', e: '#9a7aff' }, proc: (P) => {
    P.ell(8, 10, 6, 5, 'a'); P.ell(8, 7, 4, 3, 'a'); P.ell(6, 6, 1.5, 1, 'c'); P.px(6, 9, 'e'); P.px(10, 9, 'e'); // 잉크 몸·눈
    P.ell(2, 14, 1.5, 1, 'a'); P.ell(14, 13, 1, 1, 'a'); P.px(7, 12, 'b'); P.px(9, 12, 'b');             // 튄 잉크
  } },
  libghost: { tint: '#8a9ab8', w: 16, h: 16, pal: { w: '#ffffff', e: '#9a7aff', y: '#c8b890' }, proc: (P) => {
    P.ell(7, 6, 4, 4, 'a'); P.rect(3, 6, 9, 7, 'a'); P.tri(3, 13, 12, 13, 7, 15, 'a');                       // 유령 몸
    P.px(5, 6, 'k'); P.px(9, 6, 'k'); P.rect(5, 5, 2, 1, 'w'); P.rect(8, 5, 2, 1, 'w');                       // 안경
    P.rect(11, 8, 4, 5, 'y'); P.line(13, 8, 13, 12, 'e');                                                    // 든 책
  } },
  candle: { tint: '#a88a50', w: 16, h: 16, pal: { w: '#f4ecd8', y: '#ffd890', r: '#ff8a3a' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 'b'); P.rect(7, 8, 2, 5, 'a'); P.rect(3, 8, 10, 1, 'a');                             // 받침·가지
    for (const x of [3, 8, 12]) { P.rect(x, 4, 1, 4, 'w'); P.px(x, 3, 'r'); P.px(x, 2, 'y'); }               // 초 세 자루
  } },
  // ── 심층: 붉은 달의 들판
  redwolf: { tint: '#8a3a3a', w: 16, h: 16, pal: { e: '#ffe94a', w: '#f4ecd8' }, proc: (P) => {
    P.ell(7, 10, 5, 3, 'a'); P.ell(12, 8, 3, 2.5, 'a'); P.tri(11, 6, 12, 3, 13, 6, 'b'); P.tri(13, 6, 14, 3, 15, 7, 'b'); // 몸·머리·귀
    P.rect(3, 12, 2, 3, 'b'); P.rect(9, 12, 2, 3, 'b'); P.px(13, 8, 'e'); P.px(15, 10, 'w'); P.line(2, 9, 0, 6, 'b'); // 다리·눈·이빨·꼬리
  } },
  bloodbat: { tint: '#a02a3a', w: 16, h: 16, pal: { w: '#ffffff', e: '#ffe94a' }, proc: (P) => {
    P.tri(0, 5, 6, 8, 2, 12, 'b'); P.tri(15, 5, 10, 8, 13, 12, 'b'); P.ell(8, 8, 3, 3, 'a'); P.tri(6, 6, 7, 3, 8, 6, 'a'); P.tri(8, 6, 9, 3, 10, 6, 'a');
    P.px(7, 8, 'e'); P.px(9, 8, 'e'); P.px(7, 10, 'w'); P.px(9, 10, 'w');
  } },
  moonmaiden: { tint: '#4a2a4a', w: 16, h: 16, pal: { w: '#f4ecd8', r: '#ff5a6a' }, proc: (P) => {
    robe(P, 'r'); P.ell(7, 5, 3, 3, 'w'); P.rect(4, 3, 7, 2, 'a'); P.px(6, 6, 'k'); P.px(8, 6, 'k');         // 흰 가면·머리
    P.ell(13, 3, 2, 2, 'r'); P.px(14, 2, 'a'); P.line(12, 6, 12, 13, 'b');                                   // 붉은 초승달 지팡이
  } },
  bloodobelisk: { tint: '#4a2a30', w: 16, h: 16, pal: { r: '#ff5a6a', w: '#ffb0b8' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 'b'); P.tri(5, 13, 11, 13, 8, 1, 'a'); P.tri(8, 1, 8, 13, 5, 13, 'c');               // 받침·오벨리스크
    P.line(8, 5, 8, 10, 'r'); P.px(8, 4, 'w'); P.px(2, 8, 'r'); P.px(14, 10, 'r');
  } },
  // ── 심층: 실 끊긴 인형극장
  puppet: { tint: '#c89a6a', w: 16, h: 16, pal: { w: '#e8dcc0', r: '#c02a3a' }, proc: (P) => {
    P.ell(8, 4, 3, 3, 'a'); P.px(7, 4, 'k'); P.px(9, 4, 'k'); P.px(6, 5, 'r'); P.px(10, 5, 'r');            // 둥근 나무 머리·볼
    P.rect(6, 7, 5, 5, 'r'); P.rect(4, 7, 2, 4, 'a'); P.rect(11, 7, 2, 4, 'a'); P.rect(6, 12, 2, 3, 'b'); P.rect(9, 12, 2, 3, 'b'); // 몸·팔다리
    P.line(8, 0, 8, 1, 'w'); P.px(4, 6, 'w'); P.px(12, 6, 'w');                                            // 끊긴 실
  } },
  jester: { tint: '#8a2a6a', w: 16, h: 16, pal: { w: '#f4ecd8', y: '#ffd86a' }, proc: (P) => {
    robe(P, 'y'); P.ell(7, 5, 3, 3, 'w'); P.px(6, 5, 'k'); P.px(8, 5, 'k'); P.line(6, 7, 8, 7, 'k');         // 흰 가면
    P.tri(3, 3, 6, 1, 7, 3, 'a'); P.tri(8, 3, 9, 1, 12, 3, 'b'); P.px(3, 3, 'y'); P.px(12, 3, 'y');         // 광대 모자·방울
  } },
  threadspider: { tint: '#e8dcc0', w: 16, h: 16, pal: { r: '#c02a3a', e: '#ffd86a' }, proc: (P) => {
    P.ell(8, 9, 4, 3.5, 'a'); P.ell(8, 9, 2, 2, 'c'); P.line(6, 8, 10, 10, 'b'); P.line(6, 10, 10, 8, 'b');   // 실뭉치 몸
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) P.line(8 + s * 4, 8 + i * 2, 8 + s * 7, 6 + i * 3, 'k'); // 다리
    P.px(7, 6, 'e'); P.px(9, 6, 'e'); P.line(12, 11, 15, 15, 'r');                                         // 눈·풀린 실
  } },
  spotlight: { tint: '#5a5a6a', w: 16, h: 16, pal: { y: '#fff0a0', w: '#ffffff' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 'b'); P.rect(7, 9, 2, 4, 'b'); P.ell(8, 6, 5, 4, 'a'); P.ell(8, 6, 3, 2.5, 'y'); P.px(8, 6, 'w'); // 받침·조명
  } },
  // ── 심층: 호박빛 벌집
  drone_bee: { tint: '#ffb02a', w: 16, h: 16, pal: { w: '#e8f8ff', e: '#2a1a0a' }, proc: (P) => {
    P.ell(5, 5, 3, 2, 'w'); P.ell(11, 5, 3, 2, 'w'); P.ell(8, 9, 4, 3, 'a'); P.rect(6, 7, 1, 5, 'e'); P.rect(9, 7, 1, 5, 'e'); // 날개·줄무늬 몸
    P.px(12, 9, 'e'); P.px(3, 10, 'e'); P.line(13, 7, 14, 5, 'e');                                         // 침·더듬이
  } },
  beetle: { tint: '#3a4a2a', w: 16, h: 16, pal: { g: '#7aff9a', y: '#ffb02a' }, proc: (P) => {
    P.ell(8, 9, 6, 5, 'a'); P.line(8, 4, 8, 14, 'k'); P.ell(5, 7, 1.5, 1, 'c'); P.ell(11, 7, 1.5, 1, 'c');  // 등껍질
    P.ell(8, 3, 3, 2, 'b'); P.px(7, 3, 'g'); P.px(9, 3, 'g'); P.line(8, 1, 8, 0, 'y');                       // 머리·뿔
    for (const x of [2, 14]) P.line(x, 8, x, 13, 'b');
  } },
  honeymage: { tint: '#a0701e', w: 16, h: 16, pal: { y: '#ffc04a', w: '#ffe9a0' }, proc: (P) => {
    robe(P, 'y'); P.ell(7, 5, 3, 3, 'a'); P.rect(6, 5, 3, 2, 'k'); P.px(6, 5, 'y'); P.px(8, 5, 'y');        // 두건
    P.line(12, 4, 12, 13, 'b'); P.ell(12, 3, 2, 2, 'y'); P.px(12, 2, 'w');                                 // 꿀단지 지팡이
  } },
  waxtower: { tint: '#d8b060', w: 16, h: 16, pal: { y: '#ffb02a', d: '#8a601a' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 'd'); P.rect(5, 4, 6, 9, 'a'); P.rect(5, 4, 6, 1, 'c');                              // 밀랍 기둥
    P.px(7, 7, 'y'); P.px(9, 9, 'y'); P.px(7, 11, 'y'); P.ell(8, 3, 2, 1.5, 'y');                           // 육각 칸·꿀
  } },
  // ── 심층: 소금 결정 광산 [임시 디자인]
  saltgolem: { tint: '#d8ccd4', w: 16, h: 16, pal: { p: '#ff9ac8', e: '#5a2a4a' }, proc: (P) => {
    P.rect(4, 6, 8, 7, 'a'); P.rect(2, 7, 2, 5, 'b'); P.rect(12, 7, 2, 5, 'b'); P.rect(5, 13, 2, 3, 'b'); P.rect(9, 13, 2, 3, 'b'); // 소금 덩이 몸·팔다리
    P.rect(5, 2, 6, 4, 'a'); P.px(6, 4, 'e'); P.px(9, 4, 'e'); P.rect(4, 6, 8, 1, 'c');                       // 머리·눈
    P.tri(5, 2, 6, 0, 7, 2, 'p'); P.tri(9, 2, 10, 0, 11, 2, 'p'); P.px(7, 9, 'p'); P.px(10, 11, 'p');      // 머리 위 결정·몸의 광맥
  } },
  crystalbat: { tint: '#b878a0', w: 16, h: 16, pal: { w: '#ffffff', p: '#ffc0dc' }, proc: (P) => {
    P.tri(0, 6, 6, 5, 4, 11, 'b'); P.tri(16, 6, 10, 5, 12, 11, 'b'); P.ell(8, 8, 3, 3, 'a');                 // 날개·몸
    P.px(7, 7, 'w'); P.px(9, 7, 'w'); P.tri(6, 5, 7, 2, 8, 5, 'p'); P.tri(8, 5, 9, 2, 10, 5, 'p');             // 눈·결정 귀
    P.px(1, 6, 'p'); P.px(15, 6, 'p');                                                                       // 날개 끝 결정
  } },
  minerghost: { tint: '#8a9ab8', w: 16, h: 16, pal: { y: '#ffd86a', w: '#e8f0ff' }, proc: (P) => {
    robe(P, 'w'); P.ell(7, 5, 3, 3, 'a'); P.px(6, 5, 'k'); P.px(8, 5, 'k');                                  // 희미한 광부
    P.rect(4, 1, 7, 2, 'b'); P.px(7, 1, 'y'); P.px(7, 0, 'y');                                               // 안전모·불빛
    P.line(12, 6, 12, 13, 'b'); P.line(10, 5, 14, 7, 'k');                                                   // 곡괭이
  } },
  saltpillar: { tint: '#c8b8c4', w: 16, h: 16, pal: { p: '#ff8ac0', w: '#ffffff' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 'b'); P.tri(4, 13, 8, 1, 12, 13, 'a'); P.line(8, 2, 8, 12, 'c');                      // 받침·결정 기둥
    P.px(7, 6, 'p'); P.px(9, 9, 'p'); P.px(8, 3, 'w');                                                       // 빛나는 광맥
  } },
  // ── 심층: 연금술 공방 [임시 디자인]
  flaskslime: { tint: '#5aca4a', w: 16, h: 16, pal: { w: '#d8fff0', g: '#bfe8d8' }, proc: (P) => {
    P.ell(8, 11, 6, 4, 'a'); P.ell(8, 10, 4, 2, 'c'); P.px(6, 10, 'k'); P.px(10, 10, 'k');                   // 초록 점액
    P.rect(6, 2, 4, 5, 'g'); P.rect(7, 1, 2, 1, 'b'); P.px(8, 4, 'a'); P.px(7, 5, 'w');                        // 머리에 박힌 플라스크
  } },
  alchgolem: { tint: '#6a6a72', w: 16, h: 16, pal: { g: '#7aff6a', r: '#8a5a3a' }, proc: (P) => {
    P.rect(4, 5, 8, 9, 'a'); P.rect(1, 6, 3, 6, 'b'); P.rect(12, 6, 3, 6, 'b'); P.rect(5, 14, 2, 2, 'b'); P.rect(9, 14, 2, 2, 'b'); // 철판 골렘
    P.ell(8, 9, 2.5, 2.5, 'g'); P.px(8, 9, 'k'); P.rect(5, 1, 6, 4, 'b'); P.px(6, 3, 'g'); P.px(9, 3, 'g'); P.px(4, 12, 'r');   // 가슴의 약물 핵·눈
  } },
  poisonalch: { tint: '#3a5a3a', w: 16, h: 16, pal: { g: '#7aff6a', w: '#e8f0e0', p: '#ff6ad8' }, proc: (P) => {
    robe(P, 'g'); P.ell(7, 5, 3, 3, 'w'); P.rect(5, 4, 5, 2, 'k'); P.px(6, 5, 'g'); P.px(8, 5, 'g');            // 방독면
    P.rect(11, 6, 3, 4, 'p'); P.rect(12, 5, 1, 1, 'b');                                                          // 분홍 약병
  } },
  stilltower: { tint: '#8a6a3a', w: 16, h: 16, pal: { g: '#7aff6a', w: '#d8fff0' }, proc: (P) => {
    P.rect(4, 12, 8, 4, 'b'); P.ell(8, 8, 4, 4, 'a'); P.ell(8, 8, 2, 2, 'g'); P.rect(7, 1, 2, 4, 'c'); P.line(9, 2, 13, 5, 'c'); P.px(13, 6, 'g'); P.px(7, 7, 'w'); // 구리 증류기
  } },
  // ── 심층: 꿈의 회랑 [임시 디자인]
  dreamsheep: { tint: '#e8d8ff', w: 16, h: 16, pal: { k2: '#5a4a7a', y: '#fff4c0' }, proc: (P) => {
    P.ell(9, 9, 6, 4, 'a'); P.ell(6, 7, 2, 2, 'c'); P.ell(11, 7, 2, 2, 'c'); for (const x of [5, 8, 11, 13]) P.rect(x, 12, 1, 3, 'k2'); // 구름 털·다리
    P.ell(3, 8, 2.5, 2, 'k2'); P.px(2, 7, 'y'); P.px(4, 7, 'y');                                                 // 얼굴·빛나는 눈
  } },
  sleepknight: { tint: '#7a6aa8', w: 16, h: 16, pal: { w: '#e8e0ff', y: '#fff4c0' }, proc: (P) => {
    P.rect(4, 6, 8, 8, 'a'); P.rect(5, 14, 2, 2, 'b'); P.rect(9, 14, 2, 2, 'b'); P.rect(5, 1, 6, 5, 'a'); P.line(6, 3, 9, 3, 'k'); // 감긴 눈의 투구
    P.tri(9, 0, 12, -1, 11, 2, 'y'); P.line(13, 3, 13, 13, 'w'); P.px(2, 2, 'w'); P.px(3, 1, 'w');                // 잠꼬대 Zz·검
  } },
  candyfairy: { tint: '#ffb8e8', w: 16, h: 16, pal: { w: '#ffffff', y: '#fff4c0', b: '#8ad8ff' }, proc: (P) => {
    P.ell(4, 6, 3, 2, 'b'); P.ell(12, 6, 3, 2, 'b'); P.ell(8, 9, 3, 4, 'a'); P.ell(8, 5, 2.5, 2.5, 'w'); P.px(7, 5, 'k'); P.px(9, 5, 'k'); // 날개·몸·얼굴
    P.line(12, 9, 14, 13, 'y'); P.ell(14, 13, 1.5, 1.5, 'y');                                                    // 별사탕 지팡이
  } },
  moonlamp: { tint: '#9a8ac8', w: 16, h: 16, pal: { y: '#fff4c0', w: '#ffffff' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 'b'); P.rect(7, 6, 2, 7, 'a'); P.ell(8, 4, 4, 4, 'y'); P.ell(9, 3, 3, 3, 'a'); P.px(6, 4, 'w');           // 초승달 등불
  } },
  // ── 심층: 덩굴 삼킨 정글 신전 [임시 디자인]
  vinesnake: { tint: '#4a9a3a', w: 16, h: 16, pal: { y: '#ffd84a', r: '#e83a3a' }, proc: (P) => {
    P.line(1, 13, 5, 10, 'a'); P.line(5, 10, 9, 12, 'a'); P.line(9, 12, 12, 8, 'a'); P.line(2, 13, 6, 11, 'b'); P.line(6, 11, 9, 13, 'b'); // 덩굴 몸
    P.ell(13, 6, 3, 2.5, 'a'); P.px(13, 5, 'y'); P.px(15, 7, 'r'); P.px(4, 9, 'c'); P.px(10, 10, 'c');           // 머리·혀·잎
  } },
  stoneguard: { tint: '#8a8a72', w: 16, h: 16, pal: { g: '#6aba4a', y: '#ffd84a' }, proc: (P) => {
    P.rect(3, 5, 10, 9, 'a'); P.rect(4, 14, 3, 2, 'b'); P.rect(9, 14, 3, 2, 'b'); P.rect(4, 1, 8, 5, 'a'); P.px(6, 3, 'y'); P.px(9, 3, 'y'); // 석상 수호자
    P.rect(3, 5, 3, 2, 'g'); P.rect(10, 9, 3, 2, 'g'); P.line(14, 2, 14, 13, 'b');                                // 이끼·돌창
  } },
  dartshooter: { tint: '#7a5a3a', w: 16, h: 16, pal: { g: '#6aba4a', r: '#e83a3a', s: '#c89a6a' }, proc: (P) => {
    robe(P, 'g'); P.ell(7, 5, 3, 3, 's'); P.rect(4, 3, 7, 1, 'r'); P.px(6, 5, 'k'); P.px(8, 5, 'k');               // 잎 망토·머리띠
    P.line(10, 6, 15, 4, 'b');                                                                                     // 대롱
  } },
  jungletotem: { tint: '#6a4a2a', w: 16, h: 16, pal: { g: '#6aba4a', r: '#e83a3a', y: '#ffd84a' }, proc: (P) => {
    P.rect(5, 2, 6, 14, 'a'); P.rect(4, 5, 8, 1, 'b'); P.rect(4, 10, 8, 1, 'b'); P.px(6, 3, 'y'); P.px(9, 3, 'y'); P.rect(6, 7, 4, 1, 'r'); P.px(7, 12, 'y'); P.px(8, 12, 'y'); // 얼굴 새긴 토템
    P.line(3, 1, 4, 6, 'g'); P.line(12, 1, 11, 6, 'g');                                                            // 잎 장식
  } },
  // ── 바빌로니아 지하 수로 (압주) [임시 디자인 · 원작 디자인]
  clayscribe: { tint: '#a87a50', w: 16, h: 16, pal: { t: '#3ac8b8', y: '#ffd84a', d: '#5a3a24' }, proc: (P) => {
    P.rect(4, 4, 8, 10, 'a'); P.rect(4, 4, 8, 1, 'b'); P.rect(5, 14, 6, 2, 'b');                                   // 떠다니는 점토판 몸
    for (const [x, y] of [[5, 7], [7, 7], [9, 7], [6, 9], [8, 9], [10, 9], [5, 11], [8, 11]]) P.px(x, y, 'd');        // 쐐기 글자
    P.rect(6, 5, 1, 1, 't'); P.rect(9, 5, 1, 1, 't'); P.line(2, 6, 3, 10, 't'); P.line(13, 6, 12, 10, 't');          // 빛나는 눈·물줄기 팔
    P.px(8, 2, 'y');
  } },
  mudbrick: { tint: '#8a6040', w: 16, h: 16, pal: { t: '#3ac8b8', y: '#c8a040' }, proc: (P) => {
    P.rect(3, 4, 10, 10, 'a'); P.rect(3, 8, 10, 1, 'b'); P.rect(7, 4, 1, 4, 'b'); P.rect(5, 9, 1, 5, 'b'); P.rect(10, 9, 1, 5, 'b'); // 진흙벽돌 몸
    P.rect(4, 14, 3, 2, 'b'); P.rect(9, 14, 3, 2, 'b'); P.rect(1, 6, 2, 6, 'a'); P.rect(13, 6, 2, 6, 'a');          // 다리·팔
    P.px(5, 6, 't'); P.px(10, 6, 't'); P.rect(1, 12, 2, 1, 't'); P.rect(13, 12, 2, 1, 't');                        // 물 새는 눈·손
    P.line(3, 3, 6, 2, 'y'); P.line(9, 2, 12, 3, 'y');                                                              // 금 띠 조각
  } },
  chainhound: { tint: '#3a3040', w: 16, h: 16, pal: { y: '#ffd84a', r: '#e83a3a', t: '#3ac8b8' }, proc: (P) => {
    P.ell(8, 10, 6, 3, 'a'); P.ell(13, 7, 3, 2.5, 'a'); P.tri(12, 5, 13, 2, 14, 5, 'b');                           // 몸·머리·귀
    P.rect(3, 12, 2, 3, 'b'); P.rect(10, 12, 2, 3, 'b'); P.px(14, 7, 'r');                                          // 다리·붉은 눈
    for (const x of [4, 7, 10]) { P.px(x, 9, 'y'); P.px(x + 1, 10, 'y'); }                                          // 끊긴 금 사슬
    P.line(1, 9, 3, 10, 'y'); P.px(0, 8, 'y'); P.px(5, 13, 't');
  } },
  abzuserpent: { tint: '#2a7a7a', w: 16, h: 16, pal: { t: '#3ac8b8', w: '#bfefff', y: '#ffd84a' }, proc: (P) => {
    P.ell(8, 13, 6, 2, 't'); P.line(5, 13, 6, 8, 'a'); P.line(6, 8, 9, 5, 'a'); P.line(6, 13, 7, 8, 'b');            // 물웅덩이에서 솟은 몸
    P.ell(10, 4, 3, 2.5, 'a'); P.tri(8, 3, 9, 0, 11, 2, 'b'); P.px(11, 3, 'y'); P.px(13, 5, 'w');                   // 머리·지느러미·눈·물방울
    P.px(3, 12, 'w'); P.px(12, 13, 'w');
  } },
  // 전갈인간 파수병: 사람 상체 + 전갈 하체·꼬리, 금빛 활 [원작 디자인]
  scorpionman: { tint: '#8a5a2a', w: 16, h: 16, pal: { s: '#c89a6a', y: '#ffd84a', r: '#e83a3a' }, proc: (P) => {
    P.ell(8, 12, 5, 2.5, 'a'); for (const x of [3, 5, 11, 13]) P.line(x, 12, x - (x < 8 ? 1 : -1), 15, 'b');   // 전갈 몸·다리
    P.line(12, 11, 15, 7, 'b'); P.line(15, 7, 14, 3, 'b'); P.px(13, 2, 'r');                                     // 꼬리·독침
    P.rect(6, 5, 4, 6, 's'); P.ell(8, 3, 2.5, 2.5, 's'); P.rect(6, 1, 5, 1, 'y'); P.px(7, 3, 'k'); P.px(9, 3, 'k'); // 상체·머리·금 머리띠
    P.line(3, 3, 2, 9, 'y'); P.line(3, 3, 6, 6, 'y'); P.line(2, 9, 6, 6, 'y');                                   // 금빛 활
  } },
  // 새끼 무슈후슈: 청금석 비늘, 뱀 머리·뿔, 사자 앞발·새 뒷발 [원작 디자인]
  mushlet: { tint: '#3a5aa8', w: 16, h: 16, pal: { y: '#ffd84a', r: '#e83a3a', w: '#bfd8ff' }, proc: (P) => {
    P.ell(7, 10, 5, 3, 'a'); P.line(2, 10, 0, 13, 'b'); P.rect(4, 12, 2, 3, 'b'); P.line(9, 12, 10, 15, 'y'); P.line(10, 15, 11, 15, 'y'); // 몸·꼬리·앞발·새 발
    P.line(11, 8, 13, 5, 'a'); P.ell(14, 4, 2.5, 2, 'a'); P.line(13, 2, 12, 0, 'y'); P.px(15, 4, 'r'); P.px(14, 3, 'w');  // 긴 목·뱀 머리·뿔·혀
    for (const x of [4, 6, 8]) P.px(x, 9, 'w');                                                                       // 비늘 무늬
  } },
  // 삼나무 정령: 나무 그루터기 몸, 잎 머리, 빛나는 눈 [원작 디자인]
  cedarling: { tint: '#4a7a3a', w: 16, h: 16, pal: { w: '#6a4a2a', d: '#3a2a1a', y: '#d8ff8a' }, proc: (P) => {
    P.rect(5, 8, 6, 8, 'w'); P.line(4, 15, 2, 15, 'w'); P.line(11, 15, 13, 15, 'w'); P.line(7, 9, 7, 14, 'd');      // 줄기·뿌리
    P.tri(2, 9, 14, 9, 8, 1, 'a'); P.tri(3, 6, 13, 6, 8, 0, 'b'); P.px(6, 6, 'y'); P.px(10, 6, 'y');                  // 잎 머리·눈
    P.px(3, 8, 'c'); P.px(12, 7, 'c');
  } },
  // 황금 근위병: 지구라트를 지키는 금 갑옷 병사, 긴 창과 둥근 방패 [원작 디자인]
  goldguard: { tint: '#c8901a', w: 16, h: 16, pal: { y: '#ffd84a', r: '#a0201e', s: '#c89a6a', w: '#e8f0ff' }, proc: (P) => {
    P.rect(5, 6, 6, 7, 'a'); P.rect(5, 6, 6, 1, 'y'); P.rect(5, 13, 2, 3, 'b'); P.rect(9, 13, 2, 3, 'b');          // 금 갑옷·다리
    P.ell(8, 4, 2.5, 2.5, 's'); P.rect(5, 1, 6, 3, 'y'); P.px(7, 4, 'k'); P.px(9, 4, 'k'); P.tri(7, 1, 8, -1, 9, 1, 'r'); // 얼굴·투구·붉은 깃
    P.ell(3, 9, 2.5, 3.5, 'y'); P.px(3, 9, 'r'); P.line(13, 0, 13, 15, 'b'); P.tri(12, 1, 13, -2, 14, 1, 'w');       // 방패·창
  } },
  // ── 심층: 잊힌 투기장 [임시 디자인]
  gladghost: { tint: '#8a9aa8', w: 16, h: 16, pal: { r: '#c02a24', w: '#e8f0ff', y: '#ffd84a' }, proc: (P) => {
    P.rect(4, 6, 8, 7, 'a'); P.rect(5, 13, 2, 3, 'b'); P.rect(9, 13, 2, 3, 'b'); P.ell(8, 4, 3, 3, 'w'); P.px(7, 4, 'k'); P.px(9, 4, 'k'); // 희미한 검투사
    P.rect(5, 1, 6, 2, 'b'); P.tri(6, 1, 8, -2, 10, 1, 'r');                                                             // 투구·깃털
    P.rect(1, 6, 3, 6, 'y'); P.line(13, 3, 13, 12, 'w'); P.line(12, 11, 14, 11, 'b');                                     // 둥근 방패·단검
  } },
  bonelion: { tint: '#e8dcc0', w: 16, h: 16, pal: { r: '#ff6a3a', y: '#c8901a' }, proc: (P) => {
    P.ell(9, 10, 5, 3, 'a'); for (const x of [5, 7, 11, 13]) P.rect(x, 12, 1, 4, 'b'); P.line(6, 9, 12, 9, 'k');          // 갈비뼈 몸·다리
    P.ell(4, 7, 4, 4, 'y'); P.ell(4, 7, 2.5, 2.5, 'a'); P.px(3, 7, 'r'); P.px(5, 7, 'r'); P.line(14, 9, 16, 6, 'b');       // 갈기·해골 머리·꼬리
  } },
  javelineer: { tint: '#a07a50', w: 16, h: 16, pal: { s: '#e8c8a0', w: '#e8f0ff' }, proc: (P) => {
    robe(P, 'b'); P.ell(7, 5, 3, 3, 's'); P.px(6, 5, 'k'); P.px(8, 5, 'k'); P.rect(4, 2, 6, 2, 'a');                       // 투창병
    P.line(11, 1, 14, 13, 'w'); P.px(11, 0, 'w');                                                                         // 창
  } },
  ballista: { tint: '#6a4a2a', w: 16, h: 16, pal: { w: '#c8d0d8', r: '#a02a24' }, proc: (P) => {
    P.rect(3, 12, 10, 3, 'b'); P.rect(7, 6, 2, 6, 'a'); P.line(1, 5, 15, 5, 'a'); P.line(1, 5, 8, 9, 'k'); P.line(15, 5, 8, 9, 'k'); // 받침·활대·시위
    P.line(8, 1, 8, 8, 'w'); P.px(8, 0, 'w'); P.px(4, 13, 'r');                                                           // 큰 화살
  } },
  // ── 심층: 잠긴 황금 보물고 [임시 디자인]
  mimic: { tint: '#7a2a20', w: 16, h: 16, pal: { y: '#ffd84a', w: '#ffffff', r: '#e8304a' }, proc: (P) => {
    P.rect(2, 8, 12, 7, 'a'); P.rect(2, 3, 12, 4, 'b'); P.rect(2, 7, 12, 1, 'k'); P.rect(7, 3, 2, 12, 'y');               // 상자 몸·뚜껑·금테
    for (const x of [3, 5, 10, 12]) P.px(x, 7, 'w'); P.line(4, 8, 11, 8, 'r'); P.px(5, 5, 'r'); P.px(10, 5, 'r');          // 이빨·혀·눈
  } },
  goldstatue: { tint: '#c8901a', w: 16, h: 16, pal: { y: '#ffe98a', r: '#e8304a' }, proc: (P) => {
    P.rect(4, 6, 8, 8, 'a'); P.rect(5, 14, 2, 2, 'b'); P.rect(9, 14, 2, 2, 'b'); P.rect(5, 1, 6, 5, 'a'); P.rect(6, 3, 4, 1, 'k'); // 황금 갑옷
    P.px(7, 0, 'r'); P.line(5, 6, 10, 6, 'y'); P.rect(1, 5, 3, 8, 'b'); P.px(2, 8, 'r'); P.line(13, 2, 13, 13, 'y');          // 깃 장식·방패의 보석·창
  } },
  coinwisp: { tint: '#ffd84a', w: 16, h: 16, pal: { w: '#fff4c0', o: '#c8901a' }, proc: (P) => {
    P.ell(8, 8, 4, 4, 'a'); P.ell(8, 8, 2, 2, 'w'); P.line(8, 6, 8, 10, 'o');                                               // 빛나는 금화
    P.ell(3, 4, 1.5, 1.5, 'a'); P.ell(13, 5, 1.5, 1.5, 'a'); P.ell(4, 13, 1.5, 1.5, 'a'); P.px(12, 12, 'w');                // 따라다니는 작은 금화
  } },
  vaulteye: { tint: '#5a4a3a', w: 16, h: 16, pal: { y: '#ffd84a', r: '#e8304a', w: '#ffffff' }, proc: (P) => {
    P.rect(4, 12, 8, 4, 'b'); P.rect(6, 7, 4, 5, 'a'); P.ell(8, 5, 4, 3.5, 'y'); P.ell(8, 5, 2, 2, 'r'); P.px(8, 4, 'w');     // 금 받침·감시하는 붉은 눈
  } },
  // ── 심층: 안개 낀 난파선 묘지 [임시 디자인]
  anchorknight: { tint: '#5a6470', w: 16, h: 16, pal: { g: '#7affc0', r: '#8a5a3a' }, proc: (P) => {
    P.rect(4, 6, 8, 8, 'a'); P.rect(5, 14, 2, 2, 'b'); P.rect(9, 14, 2, 2, 'b'); P.rect(5, 1, 6, 5, 'b'); P.rect(6, 3, 4, 1, 'k'); P.px(7, 3, 'g'); P.px(9, 3, 'g'); // 녹슨 투구 갑옷
    P.line(13, 3, 13, 13, 'c'); P.line(11, 12, 15, 12, 'c'); P.px(11, 11, 'c'); P.px(15, 11, 'c'); P.px(4, 9, 'r'); P.px(10, 11, 'r');                       // 닻·녹
  } },
  bonegull: { tint: '#e8e0d0', w: 16, h: 16, pal: { g: '#7affc0', y: '#e8b04a' }, proc: (P) => {
    P.tri(0, 7, 7, 6, 5, 10, 'b'); P.tri(16, 7, 9, 6, 11, 10, 'b'); P.ell(8, 8, 3, 3, 'a'); P.line(2, 8, 6, 8, 'k'); P.line(10, 8, 14, 8, 'k'); // 뼈 날개·몸
    P.px(7, 7, 'g'); P.px(9, 7, 'g'); P.rect(7, 10, 2, 2, 'y');                                                                                // 눈·부리
  } },
  lampkeeper: { tint: '#3a4a4a', w: 16, h: 16, pal: { g: '#9affd0', w: '#e8fff4' }, proc: (P) => {
    robe(P, 'b'); P.ell(7, 5, 3, 3, 'b'); P.px(6, 5, 'g'); P.px(8, 5, 'g');                                                                     // 두건 쓴 망령
    P.line(12, 3, 12, 13, 'c'); P.rect(11, 1, 3, 3, 'g'); P.px(12, 2, 'w');                                                                    // 초록 등불
  } },
  wreckcannon: { tint: '#4a4a52', w: 16, h: 16, pal: { r: '#8a5a3a', y: '#ffd86a' }, proc: (P) => {
    P.rect(3, 11, 10, 3, 'r'); P.ell(5, 14, 2, 2, 'k'); P.ell(11, 14, 2, 2, 'k'); P.rect(4, 6, 9, 5, 'a'); P.rect(12, 7, 3, 3, 'b'); P.px(14, 8, 'k'); // 포가·포신
    P.px(6, 7, 'c'); P.px(5, 5, 'y');                                                                                                          // 심지 불꽃
  } },
  // ── 심층: 서리 궁전 [임시 디자인]
  frostguard: { tint: '#7a9ac8', w: 16, h: 16, pal: { w: '#e8f8ff', i: '#bfe8ff' }, proc: (P) => {
    P.rect(4, 6, 8, 8, 'a'); P.rect(5, 14, 2, 2, 'b'); P.rect(9, 14, 2, 2, 'b'); P.rect(5, 1, 6, 5, 'a'); P.rect(6, 3, 4, 1, 'k'); P.px(8, 0, 'i'); // 얼음 갑옷·투구 장식
    P.rect(1, 6, 3, 7, 'i'); P.px(2, 7, 'w'); P.line(13, 2, 13, 12, 'w');                                                                     // 얼음 방패·창
  } },
  blizzardwisp: { tint: '#bfe8ff', w: 16, h: 16, pal: { w: '#ffffff' }, proc: (P) => {
    P.ell(8, 8, 5, 5, 'a'); P.ell(8, 8, 3, 3, 'w'); P.px(7, 7, 'k'); P.px(9, 7, 'k');                                                          // 눈보라 정령
    P.px(2, 4, 'w'); P.px(14, 5, 'w'); P.px(3, 12, 'w'); P.px(13, 12, 'w'); P.line(1, 8, 3, 8, 'b'); P.line(13, 8, 15, 8, 'b');                // 흩날리는 눈
  } },
  icepriestess: { tint: '#5a7ab0', w: 16, h: 16, pal: { w: '#e8f8ff', i: '#7ac8ff' }, proc: (P) => {
    robe(P, 'w'); P.ell(7, 5, 3, 3, 'w'); P.px(6, 5, 'i'); P.px(8, 5, 'i'); P.tri(4, 3, 7, 0, 10, 3, 'i');                                     // 흰 얼굴·서리 관
    P.line(12, 3, 12, 13, 'c'); P.tri(11, 3, 12, 0, 13, 3, 'w');                                                                               // 고드름 지팡이
  } },
  iciclespire: { tint: '#9ac8e8', w: 16, h: 16, pal: { w: '#ffffff', i: '#7ac8ff' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 'b'); P.tri(4, 13, 6, 2, 8, 13, 'a'); P.tri(7, 13, 10, 0, 12, 13, 'a'); P.line(10, 2, 10, 12, 'w'); P.px(6, 8, 'i'); P.px(10, 6, 'i'); // 고드름 첨탑
  } },
  brazier: { tint: '#6a5a50', w: 16, h: 16, pal: { y: '#ffb04a', r: '#ff6a2a', w: '#ffe94a' }, proc: (P) => {
    P.rect(4, 13, 8, 3, 'b'); P.rect(6, 9, 4, 4, 'a'); P.rect(3, 7, 10, 3, 'a'); P.rect(3, 7, 10, 1, 'c');        // 받침·화로
    P.tri(4, 7, 12, 7, 8, 1, 'r'); P.tri(6, 7, 10, 7, 8, 3, 'y'); P.px(8, 5, 'w');                               // 불꽃
  } },
  // ── 로드 투 카멜롯: 백악의 성 병사들 [제안 디자인]
  camguard: { tint: '#d8dce8', w: 16, h: 16, pal: { e: '#4a8ae0', y: '#f0c040', w: '#ffffff', r: '#3a5aa8', m: '#e8ecf4' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 'b'); P.rect(9, 13, 3, 3, 'b');
    P.rect(3, 7, 10, 7, 'a'); P.rect(5, 8, 6, 6, 'w'); P.rect(7, 9, 2, 4, 'y'); P.rect(3, 12, 10, 1, 'c');   // 갑옷·흰 겉옷·금빛 십자
    P.rect(0, 7, 4, 6, 'r'); P.px(2, 9, 'y'); P.px(2, 10, 'y');                                              // 푸른 방패
    P.rect(5, 1, 6, 6, 'a'); P.rect(6, 3, 4, 1, 'k'); P.px(7, 3, 'e'); P.px(9, 3, 'e'); P.rect(7, 0, 2, 1, 'r'); // 투구·깃
    P.line(14, 1, 14, 14, 'c'); P.px(14, 0, 'm'); P.px(13, 1, 'm'); P.px(15, 1, 'm');                         // 창
  } },
  camxbow: { tint: '#c8ccd8', w: 16, h: 16, pal: { f: '#f4d8b8', w: '#ffffff', y: '#f0c040', n: '#7a5530', m: '#d8d8e0' }, proc: (P) => {
    P.rect(4, 13, 3, 3, 'b'); P.rect(9, 13, 3, 3, 'b');
    P.rect(4, 7, 8, 7, 'a'); P.rect(6, 8, 4, 5, 'w'); P.px(7, 10, 'y'); P.px(8, 10, 'y');                    // 가벼운 갑옷·겉옷
    P.ell(8, 4, 3.5, 3.5, 'c'); P.rect(6, 4, 4, 2, 'f'); P.px(7, 5, 'k'); P.px(9, 5, 'k');                    // 두건·얼굴
    P.rect(10, 9, 6, 1, 'n'); P.line(14, 7, 14, 11, 'm'); P.px(15, 9, 'y');                                   // 석궁
  } },
  cammonk: { tint: '#e8e4da', w: 16, h: 16, pal: { f: '#f4d8b8', y: '#f0c040', w: '#ffffff', n: '#8a6a40' }, proc: (P) => {
    robe(P, 'y'); P.rect(6, 9, 3, 5, 'w'); P.px(7, 11, 'y');                                                 // 흰 수도복·금빛 장식
    P.ell(7, 5, 3.2, 3.2, 'b'); P.rect(5, 5, 4, 3, 'f'); P.px(6, 6, 'k'); P.px(8, 6, 'k');                    // 두건·얼굴
    P.line(12, 5, 12, 15, 'n'); P.ell(12, 3, 2, 2, 'y'); P.px(12, 3, 'w'); P.px(10, 3, 'y'); P.px(14, 3, 'y');  // 태양 지팡이
  } }
});
