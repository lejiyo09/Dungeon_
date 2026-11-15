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
    P.line(6, 9, 14, 1, 's'); P.line(7, 9, 15, 1, 'd'); P.line(6, 8, 13, 1, 'w'); P.px(15, 0, 'w');
    P.px(7, 8, 'b');
    P.line(2, 6, 4, 9, 'y'); P.line(4, 9, 7, 11, 'y'); P.px(8, 11, 'y'); P.px(3, 7, 'o'); P.px(5, 10, 'o');
    P.line(1, 12, 4, 9, 'b'); P.px(2, 12, 'b'); P.px(3, 10, 'c');
    P.rect(0, 13, 2, 2, 'y');
  },
    // 큰 화면용 32×32: 길고 가는 은빛 날과 날 위의 새김, 날 쪽으로 휘어진 넓은 금빛 날밑, 금테 두른 푸른 마름모 장식, 남색 손잡이, 금빛 끝장식
    big: { size: 32, proc: (P) => {
      for (let i = 0; i <= 18; i++) { const x = 11 + i, y = 20 - i; P.px(x, y - 1, 'w'); P.px(x, y, 's'); P.px(x + 1, y, 'd'); } // 날 (3겹)
      P.px(30, 1, 'w'); P.px(30, 2, 's');
      for (const [x, y] of [[17, 13], [19, 11], [20, 10], [22, 8]]) P.px(x, y, 'd');                 // 날 위의 새김
      const G = (sv) => { const a = 0.7071, ox = 10 + sv * 7 * a + sv * sv * 3 * a, oy = 22 + sv * 7 * a - sv * sv * 3 * a; return [ox, oy]; };
      for (let k = -1; k <= 1.001; k += 0.05) { const [x, y] = G(k); P.ell(x, y, 1.3, 1.3, 'y'); }  // 휘어진 금빛 날밑
      for (let k = -0.9; k <= 0.9; k += 0.05) { const [x, y] = G(k); P.px(x - 0.6, y + 0.6, 'o'); } // 날밑 안쪽 줄
      P.ell(13.5, 18.5, 1.8, 1.8, 'y'); P.px(13, 18, 'b'); P.px(14, 19, 'b'); P.px(13, 19, 'b'); P.px(14, 18, 'c'); // 금테 두른 푸른 장식
      P.line(9, 23, 4, 28, 'b'); P.line(10, 24, 5, 29, 'b'); P.line(9, 24, 5, 28, 'c');             // 남색 손잡이
      P.ell(3, 29.5, 2, 2, 'y'); P.px(3, 30, 'o'); P.px(2, 29, 'w');                                 // 금빛 끝장식
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
