'use strict';
// ════════════════════════════════════════════
// 적·보스 스프라이트
//  일반 적: 16×16 문자 격자 (a/b/c = def.color 기반 주색/어두운/밝은, k = 외곽선)
//  보스: 32×32, 도형(타원·사각형·삼각형·선)으로 그린 뒤 외곽선을 자동으로 두름
// ════════════════════════════════════════════

// 도형 기반 픽셀 그리기 → 자동 외곽선 → 문자 격자로 변환
function bakeProc(w, h, draw, pal) {
  const buf = new Array(w * h).fill('.');
  const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = ch; };
  const P = {
    px: put,
    rect(x, y, rw, rh, ch) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) put(x + i, y + j, ch); },
    ell(cx, cy, rx, ry, ch) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if (((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2 <= 1) put(x, y, ch);
    },
    tri(x1, y1, x2, y2, x3, y3, ch) {
      const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
      const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
      const s = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const d1 = s(x, y, x1, y1, x2, y2), d2 = s(x, y, x2, y2, x3, y3), d3 = s(x, y, x3, y3, x1, y1);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) put(x, y, ch);
      }
    },
    line(x0, y0, x1, y1, ch) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) put(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch);
    }
  };
  draw(P);
  // 자동 외곽선: 그려진 픽셀에 맞닿은 빈칸을 외곽선으로
  const out = buf.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (buf[y * w + x] !== '.') continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < w && ny < h && buf[ny * w + nx] !== '.' && buf[ny * w + nx] !== 'k';
    });
    if (n) out[y * w + x] = 'k';
  }
  const rows = [];
  for (let y = 0; y < h; y++) rows.push(out.slice(y * w, y * w + w).join(''));
  return bakeSprite(rows, pal);
}

// 술사 3종 공용 몸통 (x = 지팡이 끝 수정)
const CASTER_BODY = [
  '..kaaaaaaak.....',
  '..kakkkkkak..k..',
  '..kakekekak.kxk.',
  '..kakkkkkak..k..',
  '.kaaaaaaaaak.n..',
  '.kbaaayaaabk.n..',
  'kbaaaayaaaabksn.',
  'kbaaaayaaaabk.n.',
  'kbaaaayaaaabk.n.',
  'kbbbbbbbbbbbk.n.',
  '.kkkkkkkkkkk..k.'];

Object.assign(PIX, {
  // ── 1월드
  slime: { tint: '#6fd35f', pal: { w: '#ffffff' }, rows: [
    '................', '................', '................',
    '.......kk.......',
    '......kcak......',
    '....kkcaaakk....',
    '...kcwaaaaaak...',
    '..kcwwaaaaaaak..',
    '..kcaaaaaaaaak..',
    '.kaaakkaaakkaak.',
    '.kaaakwaaakwaak.',
    '.kaaaaakkaaaaak.',
    '.kbaaaaaaaaaabk.',
    '..kbbbbbbbbbbk..',
    '...kkkkkkkkkk...'] },
  goblin: { tint: '#8ab840', pal: { e: '#ff3020', h: '#6a4a2a', g: '#4a3220', q: '#8a5a2a', o: '#a07040', w: '#f0e8d0' }, rows: [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '.kkkhhhhhhhhkkk.',
    '.kaakaaaaaaakaak',
    '..kkkaeaaeakkk..',
    '....kaakkaak....',
    '..kwkkaaaakkk.o.',
    '..kqkhhhhhhkkow.',
    '..kqkhhhhhhkaow.',
    '..kqkhhhhhhk.ow.',
    '..kkkhhhhhhk.o..',
    '....kgggggk.....',
    '....kgk.kgk.....',
    '....kkk.kkk.....'] },
  boar: { tint: '#8a4a3a', pal: { t: '#f0e8d0', e: '#ffd84a', p: '#e08a8a', n: '#5a2020' }, rows: [
    '................', '................', '................',
    '..kk.kk.........',
    '.kbbkbbkkk......',
    '.kbbbbbbbbkk....',
    'kbaaaaaaaaaakk..',
    'kaaaaaaaaaaaaak.',
    'kaaaaaaaaaaeaaak',
    'kcaaaaaaaaaaapnk',
    'kcaaaaaaaaaaktpk',
    '.kbbbbbbbbbbkkk.',
    '.kbk..kbk.kbk...',
    '.kkk..kkk.kkk...'] },
  shroom: { tint: '#d04a4a', pal: { w: '#ffffff', s: '#e8d8b0', m: '#5a3a2a' }, rows: [
    '................', '................',
    '.....kkkkkk.....',
    '...kkaawaaakk...',
    '..kawwaaaaawak..',
    '.kaaaaaawwaaaak.',
    '.kawwaaaawwaaak.',
    '.kbaaaaaaaaaabk.',
    '..kbbbbbbbbbbk..',
    '....kssssssk....',
    '....kskssksk....',
    '....kssmmssk....',
    '...kssssssssk...',
    '...kskk..kksk...',
    '....kk....kk....'] },
  // ── 2월드
  iceslime: { tint: '#7ac8ff', pal: { w: '#ffffff', i: '#e8faff' }, rows: [
    '................',
    '......k....k....',
    '.....kik..kik...',
    '....kkiikkiikk..',
    '...kciiaaaiiaak.',
    '..kcwaaaaaaaaak.',
    '..kcwaaaaaaaaak.',
    '.kcaaaaaaaaaaak.',
    '.kaaakkaaakkaak.',
    '.kaaakwaaakwaak.',
    '.kaaaaakkaaaaak.',
    '.kbaaaaaaaaaabk.',
    '..kbbbbbbbbbbk..',
    '...kkkkkkkkkk...'] },
  yeti: { tint: '#e8f0ff', pal: { f: '#7a9ac0', e: '#102040', w: '#ffffff', h: '#c0d0e0' }, rows: [
    '................',
    '..kk........kk..',
    '..khk......khk..',
    '...khkkkkkkhk...',
    '..kaaaaaaaaaak..',
    '.kaaaffffffaaak.',
    '.kaaafeffefaaak.',
    '.kaaafwwwwfaaak.',
    'kaaaaaffffaaaaak',
    'kaakaaaaaaaakaak',
    'kaakaaaaaaaakaak',
    'kbbkaaaaaaaakbbk',
    '.kk.kbbbbbbk.kk.',
    '....kbbkkbbk....',
    '....kkk..kkk....'] },
  frostarcher: { tint: '#5a8ac8', pal: { a: '#dfe8f8', h: '#5a8ac8', f: '#ffffff', e: '#2a5aff', i: '#bfefff', w: '#ffffff', g: '#3a4a6a', y: '#c0d8ff' }, rows: [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...kfhhhhhhfk...',
    '...kfaaaaaafk...',
    '...kfaeaaeafk...',
    '...kffaaaaffk...',
    '..kkhhffffhhk.i.',
    '..khhhhhhhhhkkiw',
    '..khhhhyhhhhkaiw',
    '..khhhhhhhhhk.iw',
    '..kfffffffffk.i.',
    '...kgggggggk....',
    '....kgk.kgk.....',
    '....kkk.kkk.....'] },
  icemage: { tint: '#2a4a8a', pal: { i: '#dff4ff', x: '#dff4ff', n: '#7a5a3a', s: '#c8d8f0', y: '#bfefff' }, rows: [
    '....k.k.k.......',
    '...kikikik......',
    '...kiiiiik......'].concat(CASTER_BODY) },
  // ── 3월드
  imp: { tint: '#e04a2a', pal: { g: '#3a1a1a', e: '#ffd84a', w: '#ffffff' }, rows: [
    '................',
    '....k......k....',
    '...khk....khk...',
    'kk..kaaaaak..kk.',
    'kgk.kaeaeak.kgk.',
    'kggkkaaaaakkggk.',
    'kgggkaawaakgggk.',
    '.kggkbaaabkggk..',
    '..kkkbaaabkkk...',
    '....kbaaabk.....',
    '.....kbabk......',
    '......kbk.kk....',
    '.......kbbkk....',
    '..........kak...'] },
  bomber: { tint: '#3a3a48', pal: { s: '#ffe36b', f: '#8a6a4a', m: '#8a8a9a', e: '#ff5a3a', d: '#5a3a2a' }, rows: [
    '..........s.....',
    '.........sfs....',
    '..........f.....',
    '.........kfk....',
    '.......kkmmk....',
    '.....kkaaaaakk..',
    '....kaccaaaaaak.',
    '...kaccaaaaaaaak',
    '...kacaakaakaaak',
    '...kaaaeaaeaaaak',
    '...kaaaaaaaaaaak',
    '....kaaakkkaaak.',
    '.....kaaaaaaak..',
    '......kdkkkdk...',
    '.....kddk.kddk..'] },
  golem: { tint: '#7a4a2a', pal: { l: '#ff7a2a', e: '#ffd84a' }, rows: [
    '................',
    '.....kkkkkk.....',
    '....kccaaaak....',
    '...kcaeaaeaak...',
    '...kaaallaaak...',
    '.kkkkbaaaabkkkk.',
    'kccakaalaaakacck',
    'kcaakaaalaakaaak',
    'kaaakalaaaakaaak',
    'kbbbkaaalaakbbbk',
    '.kkkkaaaaaakkkk.',
    '....kbaaaabk....',
    '...kbbbkkbbbk...',
    '..kbbbk..kbbbk..',
    '..kkkkk..kkkkk..'] },
  firemage: { tint: '#8a2a1a', pal: { h: '#e0d0b0', x: '#ffb040', n: '#5a3a2a', s: '#e8c0a0', y: '#ffb040' }, rows: [
    '.kk.......kk....',
    '.khk.....khk....',
    '..khkkkkkhk.....'].concat(CASTER_BODY) },
  // ── 4월드
  wraith: { tint: '#8a6ad0', pal: { e: '#ffe0ff', w: '#e0d0ff' }, rows: [
    '................',
    '.....kkkkk......',
    '....kaaaaak.....',
    '...kaaaaaaak....',
    '...kakkkkkak....',
    '...kakekekak....',
    '..kaakkkkkaak...',
    '.kcaaaaaaaaak...',
    'kwkaaaaaaaaakwk.',
    '.kkkbaaaaabkkk..',
    '...kbaaaaabk....',
    '...kbabaabak....',
    '...kbkbkbkbk....',
    '....k.k.k.k.....'] },
  hound: { tint: '#3a3050', pal: { e: '#ff3a5a', w: '#ffffff' }, rows: [
    '................', '................', '................',
    '...k.k.k...kk...',
    '..kbkbkbk.kaak..',
    '.kbbbbbbbkkaaek.',
    'kbaaaaaaaaaaaaak',
    'kaaaaaaaaaaakwk.',
    '.kaaaaaaaaaak...',
    '.kaakkkkkkaak...',
    '.kak.....kak....',
    '.kak.....kak....',
    '.kk......kk.....'] },
  crystal: { tint: '#b070ff', pal: { s: '#5a5a6a', e: '#ffffff' }, rows: [
    '.......kk.......',
    '......kcak......',
    '.....kccaak.....',
    '....kccaaaak....',
    '....kcaaaaak....',
    '...kcaaeaaaak...',
    '....kaaaaabk....',
    '....kbaaaabk....',
    '.....kbaabk.....',
    '......kbbk......',
    '....kkkkkkkk....',
    '...kssssssssk...',
    '..kssssssssssk..',
    '..kkkkkkkkkkkk..'] },
  voidmage: { tint: '#1a1030', pal: { x: '#d070ff', n: '#3a2a4a', s: '#8a7aa0', y: '#b070ff' }, rows: [
    '................',
    '.....kkk........',
    '....kaaak.......'].concat(CASTER_BODY) },

  // ── 보스 (32×32, 페이즈마다 a/b/c 색이 바뀜)
  boss_gel: { tint: '#c060c0', w: 32, h: 32, pal: { w: '#ffffff', y: '#ffd84a', o: '#c09020', r: '#ff3a5a' }, proc: (P) => {
    P.ell(6, 28, 2, 2, 'b'); P.ell(25, 28, 2, 2, 'b'); P.ell(15, 29, 1, 2, 'b');      // 흘러내리는 점액
    P.ell(16, 21, 14, 8, 'a'); P.ell(16, 16, 11, 10, 'a'); P.rect(3, 20, 26, 7, 'a');
    P.ell(16, 26, 13, 2, 'b');                                                        // 바닥 그림자
    P.ell(9, 12, 3, 2, 'c'); P.px(8, 11, 'w'); P.px(9, 11, 'w');                       // 광택
    P.ell(23, 24, 1, 1, 'c'); P.px(26, 19, 'c'); P.px(6, 23, 'c'); P.px(20, 10, 'c');   // 기포
    P.line(9, 15, 14, 17, 'k'); P.line(18, 17, 23, 15, 'k');                           // 성난 눈썹
    P.rect(10, 17, 4, 3, 'k'); P.rect(18, 17, 4, 3, 'k'); P.px(11, 18, 'w'); P.px(19, 18, 'w');
    P.rect(11, 21, 10, 4, 'k'); P.rect(12, 21, 2, 1, 'w'); P.rect(15, 21, 2, 1, 'w'); P.rect(18, 21, 2, 1, 'w'); P.rect(13, 24, 6, 1, 'r');
    P.rect(10, 3, 12, 4, 'y'); P.rect(10, 6, 12, 1, 'o');                              // 왕관
    P.tri(10, 3, 12, 3, 11, 0, 'y'); P.tri(15, 3, 17, 3, 16, 0, 'y'); P.tri(20, 3, 22, 3, 21, 0, 'y');
    P.px(13, 4, 'r'); P.px(16, 4, 'r'); P.px(19, 4, 'r');
  } },
  boss_frost: { tint: '#7a9ac8', w: 32, h: 32, pal: { i: '#e8faff', e: '#7affff', w: '#ffffff' }, proc: (P) => {
    P.rect(9, 24, 5, 5, 'b'); P.rect(18, 24, 5, 5, 'b'); P.rect(8, 28, 7, 3, 'b'); P.rect(17, 28, 7, 3, 'b');   // 다리
    P.rect(7, 11, 18, 14, 'a'); P.rect(7, 21, 18, 4, 'b');                                                     // 몸통
    P.rect(2, 12, 5, 10, 'a'); P.rect(25, 12, 5, 10, 'a'); P.rect(1, 21, 7, 5, 'c'); P.rect(24, 21, 7, 5, 'c'); // 팔·주먹
    P.tri(0, 13, 7, 13, 2, 3, 'i'); P.tri(4, 13, 9, 13, 6, 6, 'i'); P.tri(25, 13, 31, 13, 29, 3, 'i'); P.tri(23, 13, 28, 13, 26, 6, 'i'); // 어깨 얼음
    P.rect(11, 4, 10, 8, 'a'); P.rect(12, 7, 8, 2, 'k'); P.rect(13, 7, 2, 2, 'e'); P.rect(17, 7, 2, 2, 'e');    // 머리·눈
    P.tri(14, 4, 18, 4, 16, 0, 'i');
    P.tri(13, 17, 19, 17, 16, 13, 'e'); P.tri(13, 17, 19, 17, 16, 21, 'e'); P.px(15, 15, 'w');                  // 심장 핵
    P.line(9, 13, 11, 16, 'b'); P.line(22, 18, 24, 21, 'b'); P.px(4, 15, 'c'); P.px(27, 16, 'c');
  } },
  boss_flame: { tint: '#3a1a1a', w: 32, h: 32, pal: { r: '#a02020', q: '#6a1010', y: '#ffd84a', o: '#ff6a2a', f: '#ffb040', h: '#e0d0b0', e: '#ffd84a' }, proc: (P) => {
    P.tri(2, 31, 30, 31, 16, 9, 'r'); P.rect(6, 20, 20, 11, 'r'); P.tri(8, 31, 24, 31, 16, 16, 'q');           // 망토
    P.rect(10, 12, 12, 14, 'a'); P.rect(10, 20, 12, 2, 'y'); P.ell(16, 16, 3, 2, 'o'); P.px(16, 16, 'f');       // 몸·용암 심장
    P.rect(6, 13, 4, 9, 'a'); P.rect(22, 13, 4, 9, 'a'); P.ell(7, 23, 2, 2, 'o'); P.ell(24, 23, 2, 2, 'o'); P.px(7, 22, 'f'); P.px(24, 22, 'f');
    P.tri(5, 13, 10, 13, 6, 9, 'h'); P.tri(22, 13, 27, 13, 26, 9, 'h');                                       // 어깨 가시
    P.rect(11, 4, 10, 8, 'a'); P.rect(12, 10, 8, 2, 'b'); P.rect(12, 7, 3, 2, 'e'); P.rect(17, 7, 3, 2, 'e');    // 머리
    P.tri(9, 7, 11, 4, 5, 0, 'h'); P.tri(21, 4, 23, 7, 27, 0, 'h');                                           // 뿔
    P.tri(12, 4, 14, 4, 13, 1, 'f'); P.tri(15, 4, 17, 4, 16, 0, 'o'); P.tri(18, 4, 20, 4, 19, 1, 'f');         // 불꽃 왕관
  } },
  boss_void: { tint: '#4a2a7a', w: 32, h: 32, pal: { w: '#f0e8ff', h: '#b070ff', e: '#1a0a2a', r: '#c04070' }, proc: (P) => {
    for (const [x0, x1] of [[8, 3], [13, 11], [19, 21], [24, 29]]) { P.line(x0, 23, x1, 31, 'b'); P.line(x0 + 1, 23, x1 + 1, 31, 'b'); } // 촉수
    P.tri(9, 5, 13, 5, 11, 0, 'b'); P.tri(14, 3, 18, 3, 16, 0, 'b'); P.tri(19, 5, 23, 5, 21, 0, 'b');           // 가시
    P.ell(16, 14, 13, 11, 'a'); P.ell(16, 21, 10, 3, 'b'); P.ell(9, 7, 2, 1, 'c');
    P.ell(16, 14, 9, 7, 'w'); P.line(7, 14, 10, 13, 'r'); P.line(25, 15, 22, 14, 'r'); P.line(9, 18, 11, 17, 'r');  // 흰자·핏줄
    P.ell(16, 14, 5, 5, 'h'); P.ell(16, 14, 2, 4, 'e'); P.px(14, 11, 'w'); P.px(15, 11, 'w');                   // 홍채·동공
  } }
});
