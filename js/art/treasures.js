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
  // 엑스칼리버: 대각선으로 놓인 빛나는 검, 금빛 날밑과 푸른 손잡이
  excalibur: { pal: { w: '#ffffff', s: '#d8e4f4', y: '#ffd84a', b: '#3a5aa0', o: '#c8a050' }, proc: (P) => {
    P.line(5, 10, 14, 1, 's'); P.line(6, 10, 14, 2, 's'); P.line(5, 9, 13, 1, 'w');      // 날
    P.line(2, 8, 7, 13, 'y'); P.px(4, 10, 'b'); P.px(5, 11, 'b');                         // 날밑·보석
    P.line(1, 14, 4, 11, 'b'); P.px(0, 15, 'y');                                          // 손잡이·끝장식
    P.px(11, 1, 'w'); P.px(15, 4, 'w');                                                   // 반짝임
  } },
  // 솔로몬의 반지: 금반지와 보랏빛 보석, 보석에 새겨진 육각별
  ring: { pal: { y: '#ffd84a', o: '#c8a050', p: '#a070e0', q: '#d8b8ff', w: '#ffffff' }, proc: (P) => {
    P.ell(8, 10.5, 5.5, 4, 'y'); P.ell(8, 11, 5, 3, 'o'); P.ell(8, 10.5, 3.3, 2.3, '.');  // 반지 (가운데 비움)
    P.ell(8, 5, 3, 3, 'p'); P.px(7, 4, 'q'); P.px(9, 4, 'q'); P.px(8, 6, 'q'); P.px(8, 3, 'q'); P.px(7, 6, 'q'); P.px(9, 6, 'q'); // 보석·육각별
    P.px(5, 7, 'o'); P.px(11, 7, 'o'); P.px(6, 4, 'w');
  } }
};
function treasureIcon(T) {
  const key = 'trs|' + T.id; let s = spriteCache.get(key);
  if (!s) { const D = TREASURE_ICONS[T.icon]; s = D ? bakeProc(16, 16, D.proc, Object.assign({ k: OUTLINE }, D.pal)) : null; spriteCache.set(key, s); }
  return s;
}
function drawTreasureIcon(ctx, T, cx, cy, scale = 1) {
  const s = treasureIcon(T); if (!s) return;
  ctx.drawImage(s.n, Math.round(cx - s.w * scale / 2), Math.round(cy - s.h * scale / 2), s.w * scale, s.h * scale);
}
