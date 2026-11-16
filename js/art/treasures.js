'use strict';
// ════════════════════════════════════════════
// 보구 아이콘 (16×16, 도형으로 그린 뒤 자동 외곽선) — 선택 카드·보관대·HUD에 사용
// ════════════════════════════════════════════
const TREASURE_ICONS = {
  // 게이트 오브 바빌론: 일렁이는 금빛 문과 그 안에서 뻗어 나오는 사슬
  gate: { pal: { y: '#ffd84a', o: '#c8a050', w: '#fff4c0', m: '#8a6a20' }, proc: (P) => {
    P.ell(7, 6, 6, 5, 'o'); P.ell(7, 6, 4.6, 3.8, 'y'); P.ell(7, 6, 3, 2.4, 'w'); P.ell(7, 6, 1.5, 1.1, 'y');
    for (let i = 0; i < 6; i++) { const x = 9 + i, y = 9 + i; if (i % 2) P.rect(x, y, 2, 1, 'm'); else P.rect(x, y - 1, 1, 2, 'y'); }
    P.px(3, 3, 'w'); P.px(12, 2, 'w');
  } },
  // 엑스칼리버 (작은 칸용 16×16)
  excalibur: { pal: { w: '#ffffff', s: '#d8dce8', d: '#9aa4bc', y: '#ffd84a', o: '#b08a30', b: '#26357a', c: '#4a64b8' }, proc: (P) => {
    const M = (x, y, ch) => { P.px(x, y, ch); P.px(15 - y, 15 - x, ch); };          // 날 중심선 x+y=15 기준 대칭
    for (let i = 0; i <= 8; i++) { const x = 6 + i, y = 9 - i; P.px(x - 1, y, 'w'); P.px(x, y, 's'); P.px(x, y + 1, 'd'); } // 날
    P.px(14, 0, 'w');
    for (const [x, y] of [[5, 10], [4, 9], [4, 8], [3, 7], [3, 6]]) M(x, y, 'y');   // 휘어진 날밑
    M(4, 10, 'o'); P.px(6, 9, 'b');                                                   // 안쪽·푸른 장식
    for (let i = 0; i < 3; i++) { const x = 4 - i, y = 11 + i; P.px(x, y, 'b'); M(x - 1, y, 'b'); } // 손잡이
    P.px(1, 14, 'y'); M(1, 13, 'y');                                                  // 끝장식
  },
    // 큰 화면용 32×32: 길고 가는 은빛 날과 날 위의 새김, 날 쪽으로 휘어진 넓은 금빛 날밑, 금테 두른 푸른 마름모 장식, 남색 손잡이, 금빛 끝장식
    big: { size: 32, proc: (P) => {
      // 날의 중심선 x+y=31을 축으로 정확히 좌우대칭: M()은 점과 그 거울상을 함께 찍음
      const M = (x, y, ch) => { P.px(x, y, ch); P.px(31 - y, 31 - x, ch); };
      for (let i = 0; i <= 17; i++) { // 날: 중심선(x+y=31) 양옆으로 두 칸씩, 끝으로 갈수록 가늘어짐
        const x = 12 + i, y = 19 - i, wide = i < 14;
        if (wide) { P.px(x - 2, y, 'w'); P.px(x, y + 2, 'd'); }
        P.px(x - 1, y, 'w'); P.px(x, y, i > 3 && i < 13 && i % 3 !== 0 ? 'd' : 's'); P.px(x, y + 1, 's'); // 가운데 홈
      }
      P.px(29, 2, 's'); P.px(30, 1, 'w');                                                              // 끝
      // 날밑: 한쪽 팔만 정해 두고 거울로 반대쪽을 그림 (중심 10,21 → 날 쪽으로 휘어 올라감)
      const arm = [[10, 21], [9, 20], [9, 19], [8, 18], [8, 17], [7, 16], [7, 15], [7, 14], [7, 13]];
      for (const [x, y] of arm) { M(x, y, 'y'); M(x - 1, y, 'y'); }
      for (const [x, y] of arm.slice(1, -1)) M(x - 1, y, 'o');                                          // 안쪽 줄
      M(7, 12, 'y'); M(8, 12, 'y');                                                                     // 팔 끝
      P.px(11, 20, 'y'); P.px(12, 19, 'y'); P.px(15, 16, 'y'); M(12, 18, 'y'); M(14, 16, 'y'); M(13, 17, 'b'); P.px(13, 18, 'b'); P.px(14, 17, 'b'); P.px(13, 17, 'c'); // 금테 두른 푸른 마름모 장식 (중심선 위)
      for (let i = 0; i < 6; i++) { const x = 9 - i, y = 22 + i; P.px(x, y, 'b'); M(x - 1, y, 'b'); }  // 손잡이 (3겹, 대칭)
      for (let i = 1; i < 5; i++) P.px(9 - i, 22 + i, 'c');
      for (const [x, y] of [[3, 28], [2, 28], [3, 29], [2, 29]]) M(x, y, 'y'); P.px(2, 29, 'o');          // 끝장식
    } } },
  // 가든 오브 아발론: 꽃밭 위의 하얀 탑, 보랏빛 지붕과 꼭대기의 빛
  avalon: { pal: { w: '#ecebf6', s: '#c8c4d8', p: '#8a6ab0', f: '#ffb0d8', y: '#ffe9a0', g: '#5a9a4a' }, proc: (P) => {
    P.rect(1, 13, 14, 3, 'g'); for (const [x, c] of [[2, 'f'], [5, 'y'], [11, 'f'], [13, 'w'], [4, 'w']]) P.px(x, 13, c);   // 꽃밭
    P.rect(6, 5, 4, 9, 'w'); P.rect(8, 5, 2, 9, 's'); P.px(7, 8, 'f');                                                      // 탑·창
    P.tri(5, 5, 11, 5, 8, 1, 'p'); P.px(8, 0, 'y');                                                                          // 지붕·빛
  } },
  // 롱고미니아드: 하얀 빛을 두른 긴 창 (대각선), 금빛 날밑과 푸른 손잡이
  rhongo: { pal: { w: '#ffffff', s: '#cfe8ff', b: '#7ac8ff', d: '#3a5aa0', y: '#ffd84a' }, proc: (P) => {
    for (let i = 0; i < 11; i++) { const x = 2 + i, y = 13 - i; P.px(x, y, i < 6 ? 'd' : 's'); if (i >= 6) P.px(x, y - 1, 'b'); } // 자루·창대
    P.px(13, 2, 's'); P.px(14, 1, 'w'); P.px(13, 1, 'w'); P.px(14, 2, 'b'); P.px(12, 1, 'b'); P.px(14, 3, 'b'); P.px(15, 0, 'w'); // 창날
    P.px(7, 7, 'y'); P.px(9, 9, 'y'); P.px(8, 8, 'y'); P.px(6, 8, 'y'); P.px(8, 6, 'y');                                        // 날밑
    P.px(1, 14, 'y'); P.px(11, 0, 'w'); P.px(15, 4, 'w');
  } },
  // 하데스의 투구: 어두운 청동 투구와 깃 장식, 눈 틈의 희미한 빛
  helm: { pal: { b: '#5a5a6a', s: '#8a8a9c', d: '#2a2a36', w: '#c8d0e8', r: '#7a2a3a' }, proc: (P) => {
    P.ell(8, 9, 5.5, 5.5, 'b'); P.ell(7, 8, 3, 3, 's'); P.rect(3, 9, 11, 5, 'b');                                   // 투구 몸
    P.rect(5, 9, 7, 2, 'd'); P.px(6, 9, 'w'); P.px(10, 9, 'w'); P.rect(7, 11, 3, 4, 'd');                           // 눈 틈·코 가리개
    for (let i = 0; i < 6; i++) P.px(4 + i * 1.5, 3 - Math.sin(i / 5 * Math.PI) * 2, 'r'); P.rect(5, 3, 7, 1, 'r'); // 깃 장식
  } },
  // 게이볼그: 붉은 창대와 거꾸로 난 가시
  gaebolg: { pal: { r: '#ff4a5a', d: '#8a1a2a', w: '#ffb0b8', y: '#c8a050' }, proc: (P) => {
    for (let i = 0; i < 12; i++) P.px(2 + i, 13 - i, i < 9 ? 'd' : 'r');                                           // 창대
    P.px(13, 1, 'r'); P.px(14, 1, 'w'); P.px(14, 0, 'r'); P.px(13, 2, 'r'); P.px(12, 1, 'r');                      // 창날
    for (const i of [4, 6, 8]) { P.px(2 + i - 1, 13 - i - 1, 'w'); P.px(2 + i + 1, 13 - i + 1, 'w'); }            // 가시
    P.px(1, 14, 'y'); P.px(2, 13, 'y');
  } },
  // 솔로몬의 반지: 금반지와 보랏빛 보석, 보석에 새겨진 육각별
  ring: { pal: { y: '#ffd84a', o: '#c8a050', p: '#a070e0', q: '#d8b8ff', w: '#ffffff' }, proc: (P) => {
    P.ell(8, 10.5, 5.5, 4, 'y'); P.ell(8, 11, 5, 3, 'o'); P.ell(8, 10.5, 3.3, 2.3, '.');  // 반지 (가운데 비움)
    P.ell(8, 5, 3, 3, 'p'); P.px(7, 4, 'q'); P.px(9, 4, 'q'); P.px(8, 6, 'q'); P.px(8, 3, 'q'); P.px(7, 6, 'q'); P.px(9, 6, 'q'); // 보석·육각별
    P.px(5, 7, 'o'); P.px(11, 7, 'o'); P.px(6, 4, 'w');
  } }
};
function treasureIcon(T, big) {
  const D = TREASURE_ICONS[T.icon], useBig = big && D && D.big, key = 'trs|' + T.id + (useBig ? '|big' : ''); let s = spriteCache.get(key);
  if (s === undefined) {
    const pal = D ? Object.assign({ k: OUTLINE }, D.pal) : null;
    s = !D ? null : useBig ? bakeProc(D.big.size, D.big.size, D.big.proc, pal) : bakeProc(16, 16, D.proc, pal);
    spriteCache.set(key, s);
  }
  return s;
}
// scale: 16px 기준 배율. 2배 이상이면 고해상도 그림(big)이 있으면 그것을 씀
function drawTreasureIcon(ctx, T, cx, cy, scale = 1) {
  const s = treasureIcon(T, scale >= 2); if (!s) return;
  const px = 16 * scale, k = px / s.w;
  ctx.drawImage(s.n, Math.round(cx - s.w * k / 2), Math.round(cy - s.h * k / 2), s.w * k, s.h * k);
}
