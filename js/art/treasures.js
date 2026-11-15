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
      for (let i = 0; i <= 17; i++) { const x = 12 + i, y = 19 - i; P.px(x - 1, y, 'w'); P.px(x, y, 's'); P.px(x, y + 1 - 1 + 1, 'd'); } // 날: x+y=30(밝음)·31(중심)·32(그늘)
      P.px(29, 2, 's'); P.px(30, 1, 'w');                                                              // 끝
      for (const [x, y] of [[17, 14], [19, 12], [21, 10]]) P.px(x, y, 'd');                           // 날 위의 새김 (중심선 위)
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
