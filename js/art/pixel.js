'use strict';
// ════════════════════════════════════════════
// 픽셀 아트 (오리지널 도트)
//  문자 격자 → 시작 시 오프스크린 캔버스로 굽고 캐시
//  공통 문자: k=외곽선, a/b/c=기본색/어두운색/밝은색(색 바꿔 재사용), .=투명
// ════════════════════════════════════════════
const OUTLINE = '#14101c';
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(hex, k) {
  const f = (v) => clamp(Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)), 0, 255);
  const [r, g, b] = hexRgb(hex); return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function bakeSprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const make = (flip, white) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      const col = white ? '#ffffff' : pal[ch];
      if (!col) continue;
      g.fillStyle = col; g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
    return c;
  };
  return { w, h, n: make(false, false), f: make(true, false), wn: make(false, true), wf: make(true, true) };
}
// x,y = 발밑 중앙
function drawSprite(ctx, spr, x, y, o = {}) {
  const sc = o.scale || 1, sq = o.squash || 0;
  const img = o.white ? (o.flip ? spr.wf : spr.wn) : (o.flip ? spr.f : spr.n);
  const w = spr.w * sc + sq * 2, h = spr.h * sc - sq;
  ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h), w, h);
}

// ── 캐릭터: 직업별 전신 템플릿 (몸통 rows + 걷기 2프레임 legs)
//  공통 문자: a/b/c 몸 주색/어두운/밝은, h/g 모자 주색/어두운, s 피부, m 금속, y 금색, r 빨강, n 가죽, d 부츠, l 다리, e 렌즈, w 흰색
const HERO_SPRITES = {
  // 검사: 깃털 투구, 어깨 갑옷, 십자 문양 서코트, 철 장화
  knight: { pal: { s: '#c9d6e0', l: '#8a9aa8' }, rows: [
    '......kkkk......',
    '.....krrrrk.....',
    '....kkmmmmkk....',
    '...kmmmmmmmmk...',
    '...kmwmmmmmmk...',
    '...kmkkkkkkmk...',
    '...kmmmmmmmmk...',
    '..kkkmmmmmmkkk..',
    '.kmmkaaaaaakmmk.',
    '.kmkaaayyaaakmk.',
    '.kbkayyyyyyakbk.',
    '.kskaaayyaaaksk.',
    '..kbbbbyybbbbk..'],
    legs: [
      ['....kllkkllk....', '....kllkkllk....', '...kkkk..kkkk...'],
      ['....kllk.kllk...', '...kllk...kllk..', '..kkkk....kkkk..']] },
  // 사수: 카우보이 모자, 붉은 두건, 롱코트, 대각선 탄띠, 부츠
  gunslinger: { pal: { r: '#d04040', n: '#6a4628', y: '#f0d070', d: '#3a2a1a' }, rows: [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '....khggggghk...',
    '.kkkhhhhhhhhkkk.',
    '.kggggggggggggk.',
    '...kskssssksk...',
    '...krrrrrrrrk...',
    '..kaarrrrrraak..',
    '..kaanaaaaaaak..',
    '.kaaaynaaaaaaak.',
    '.kskaaaynaaaksk.',
    '.kbbbbbbbynbbbk.'],
    legs: [
      ['..kbkddkkddkbk..', '...kkddkkddkk...', '...kkkk..kkkk...'],
      ['..kbkddk.kddkbk.', '...kddk...kddk..', '..kkkk....kkkk..']] },
  // 마도사: 끝이 휜 고깔모자(별·금띠), 바닥까지 끌리는 로브, 별 문양 (다리 대신 로브 자락이 흔들림)
  wizard: { pal: { y: '#f0d060' }, rows: [
    '.........kk.....',
    '........khhk....',
    '.......khhk.....',
    '......khhhk.....',
    '.....khhhhhk....',
    '.....khyhhhk....',
    '....khhhhhhhk...',
    '....kyyyyyyyk...',
    '.kkhhhhhhhhhhhk.',
    '...kskssssksk...',
    '...kssssssssk...',
    '..kaaakkkkaaak..',
    '.kaaaaayaaaaaak.',
    '.ksaaaayaaaaask.',
    '.kbaaayyyaaaabk.',
    '.kbaaaayaaaaabk.'],
    legs: [
      ['.kbbbbbybbbbbbk.', '..kkkkkkkkkkkk..'],
      ['..kbbbbybbbbbk..', '...kkkkkkkkkkk..']] },
  // 기술자: 노란 안전모, 고글, 하늘색 셔츠 + 주황 멜빵 작업복, 렌치 꽂은 공구 벨트
  engineer: { pal: { c: '#6a9ad0', n: '#8a5a20', d: '#4a3020', m: '#b8c0c8', w: '#fff8d0' }, rows: [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhwhhhhk...',
    '..kgggggggggggk.',
    '...kmekkkkemk...',
    '...kskssssksk...',
    '....kssssssk....',
    '...kcnccccnck...',
    '..kcanaaaanack..',
    '..kskaaaaaaksk..',
    '..kddmmdddddk...',
    '...kbbbbbbbbk...'],
    legs: [
      ['....kllkkllk....', '....kddkkddk....', '...kkkk..kkkk...'],
      ['....kllk.kllk...', '...kddk...kddk..', '..kkkk....kkkk..']] }
};

const PIX = {
  slime: { tint: '#6fd35f', pal: { w: '#ffffff' }, rows: [
    '................', '................', '................', '................',
    '......kkkk......',
    '....kkccaakk....',
    '...kccwaaaaak...',
    '..kcwaaaaaaaak..',
    '..kcaaaaaaaaak..',
    '.kaaaakaaakaaak.',
    '.kaaaakaaakaaak.',
    '.kaaaaaaaaaaaak.',
    '.kbaaaaaaaaaabk.',
    '..kbbbbbbbbbbk..',
    '...kkkkkkkkkk...'] },
  goblin: { tint: '#9cc050', pal: { e: '#e02020', h: '#6a4a2a', g: '#4a3220', o: '#a07040', w: '#e8e0d0' }, rows: [
    '................', '................',
    '.....kkkkk......',
    '....khhhhhk.....',
    '..kkhaaaaahk....',
    '.kcaaaeaaeak....',
    '..kaaaaaaak.o...',
    '...kaaaaak..ow..',
    '...kggggggk.ow..',
    '..kaghhhhgak.ow.',
    '..kkghhhhgk.ow..',
    '...kghhhhgk.o...',
    '...kgggggggk....',
    '....kgk.kgk.....',
    '....kkk.kkk.....'] },
  boar: { tint: '#8a4a3a', pal: { t: '#f0e8d0', e: '#ffd84a' }, rows: [
    '................', '................', '................',
    '...kkkkkkk......',
    '..kbbbbbbbkk....',
    '.kbaaaaaaabbkk..',
    '.kaaaaaaaaaaaek.',
    'kaaaaaaaaaaaaaak',
    'kcaaaaaaaaaaaatk',
    'kcaaaaaaaaaaakt.',
    '.kbbbbbbbbbbbk..',
    '.kbk..kbk.kbk...',
    '.kkk..kkk.kkk...'] },
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
  mage: { tint: '#4a2a6a', pal: { e: '#d070ff', y: '#e0c060' }, rows: [
    '................', '................',
    '......kkk.......',
    '.....kaaak......',
    '....kaaaaak.....',
    '...kaaaaaaak....',
    '...kakkkkkak....',
    '...kakekekak....',
    '...kakkkkkak....',
    '..kaaaaaaaaak...',
    '..kbaaayaaabk...',
    '.kbaaaayaaaabk..',
    '.kbaaaayaaaabk..',
    '.kbbbbbbbbbbbk..',
    '..kkkkkkkkkkk...'] },
  shroom: { tint: '#d04a4a', pal: { w: '#ffffff', s: '#e8d8b0' }, rows: [
    '................', '................',
    '.....kkkkkk.....',
    '...kkaaaaaakk...',
    '..kaawwaaaaaak..',
    '.kaaawwaaaawwak.',
    '.kaaaaaaaaawwak.',
    '.kbaaaaaaaaaabk.',
    '..kbbbbbbbbbbk..',
    '....kssssssk....',
    '....kskssksk....',
    '....kssssssk....',
    '....kssssssk....',
    '...kssssssssk...',
    '....kkkkkkkk....'] },
  imp: { tint: '#e04a2a', pal: { g: '#3a1a1a', e: '#ffd84a', h: '#2a0a0a' }, rows: [
    '................', '................',
    '.....kh..hk.....',
    '.....khkkhk.....',
    'gg..kaaaaaak..gg',
    'ggg.kaeaaeak.ggg',
    'gggkaaaaaaaakggg',
    '.ggkbaakkaabkgg.',
    '...kbaaaaaabk...',
    '....kbaaaabk....',
    '.....kbaabk.....',
    '......kbbk......',
    '.......kk.......'] },
  bomber: { tint: '#3a3a44', pal: { e: '#ffd84a', f: '#8a6a4a', s: '#ffe36b' }, rows: [
    '................',
    '.........s......',
    '........sfs.....',
    '.........f......',
    '........kfk.....',
    '.....kkkkkkk....',
    '....kaaaaaaak...',
    '...kacaaaaaaak..',
    '...kcaaaeaeaak..',
    '...kaaaaaaaaak..',
    '...kaaakkkaaak..',
    '...kaaaaaaaaak..',
    '....kaaaaaaak...',
    '.....kkkkkkk....'] },
  golem: { tint: '#7a4a2a', pal: { l: '#ff7a2a', e: '#ffd84a' }, rows: [
    '................',
    '....kkkkkkkk....',
    '...kccaaaaaak...',
    '...kcaeaaeaak...',
    '...kaaaalaaabk..',
    '.kkkbaaaaaabkkk.',
    'kcaakbbbbbbkaack',
    'kaaakaalaaakaaak',
    'kaalkaaaalakalak',
    'kbbbkaaaaaakbbbk',
    '.kkkkaalaaakkkk.',
    '....kaaaaaak....',
    '....kbbkkbbk....',
    '...kbbbkkbbbk...',
    '...kkkkkkkkkk...'] },
  dummy: { pal: { y: '#d0b070', r: '#c04040', p: '#f0e0b0', w: '#7a5530' }, rows: [
    '................',
    '.....kkkkkk.....',
    '....kyyyyyyk....',
    '....kyrrrryk....',
    '....kyrpprak....'.replace('a', 'y'),
    '....kyrrrryk....',
    '....kyyyyyyk....',
    '.kkkkkwwwwkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkwwkkkkkk.',
    '......kwwk......',
    '......kwwk......',
    '......kwwk......',
    '.....kwwwwk.....',
    '....kkkkkkkk....'] },
  merchant: { pal: { a: '#3a6a4a', b: '#2a4a34', s: '#f0c8a0', y: '#c89a40' }, rows: [
    '................',
    '......kkkk......',
    '.....kaaaak.....',
    '....kaaaaaak....',
    '...kaakkkkaak...',
    '...kaksskskak...',
    '...kakssssak....',
    '..kaaakkkkaaak..',
    '..kbaaaaaaaabk..',
    '.kbaaaakyykaabk.',
    '.kbaaakyyyykabk.',
    '.kbaaakyyyykabk.',
    '.kbbbbbkkkkbbbk.',
    '..kkkkkkkkkkkk..'] },
  boss_gel: { tint: '#c060c0', pal: { y: '#ffd84a', e: '#ffffff', w: '#ffffff' }, rows: [
    '................',
    '...kyk.kyk.kyk..',
    '...kykkkykkkyk..',
    '...kyyyyyyyyyk..',
    '..kkkkkkkkkkkkk.',
    '.kccaaaaaaaaaak.',
    'kcwaaaaaaaaaaaak',
    'kcaaaaaaaaaaaaak',
    'kaaakeaaaakeaaak',
    'kaaakkaaaakkaaak',
    'kaaaaaaaaaaaaaak',
    'kaaaaakkkkaaaaak',
    'kbaaaaaaaaaaaabk',
    'kbbaaaaaaaaaabbk',
    '.kbbbbbbbbbbbbk.',
    '..kkkkkkkkkkkk..'] },
  boss_frost: { tint: '#7a9ac8', pal: { c: '#cfefff', e: '#7affff' }, rows: [
    '.......kk.......',
    '......kcck......',
    '.kk..kaaaak..kk.',
    'kcck.kaeeak.kcck',
    'kcck.kaaaak.kcck',
    'kaaakkkkkkkkaaak',
    'kaaacaaaaaacaaak',
    'kbaacaaaaaacaabk',
    'kbaakaaccaakaabk',
    '.kbkkaaccaakkbk.',
    '.kak.kaaaak.kak.',
    '.kkk.kbbbbk.kkk.',
    '.....kbkkbk.....',
    '....kbbkkbbk....',
    '....kkkk.kkkk...'] },
  boss_flame: { tint: '#3a1a1a', pal: { f: '#ffb040', o: '#ff6a2a', h: '#e0d0b0', e: '#ffd84a', r: '#a02020' }, rows: [
    '....f.f..f.f....',
    '...fofo..ofof...',
    '.hh.koooooook.hh',
    '.khkaaaaaaaakhk.',
    '..kkaeeaaeeakk..',
    '...kaaaaaaaak...',
    '..rkaakkkkaakr..',
    '.rrkkaaaaaakkrr.',
    'rrrkaaoaaoaakrrr',
    'rrrkaaaooaaakrrr',
    'rrkaaaaaaaaaakrr',
    '.rkaaaaaaaaaakr.',
    '.rrkaaaaaaaakrr.',
    '..rrkaaaaaakrr..',
    '...rrkkkkkkrr...',
    '....rr....rr....'] },
  wraith: { tint: '#8a6ad0', pal: { e: '#ffe0ff' }, rows: [
    '................',
    '.....kkkkk......',
    '....kaaaaak.....',
    '...kaaaaaaak....',
    '...kakkkkkak....',
    '...kakekekak....',
    '...kakkkkkak....',
    '..kaaaaaaaaak...',
    '..kbaaaaaaabk...',
    '..kbaaaaaaabk...',
    '...kbaaaaabk....',
    '...kbabkbabk....',
    '....kbk.kbk.....',
    '....kk...kk.....'] },
  hound: { tint: '#3a3050', pal: { e: '#ff3a5a', t: '#e0e0e0' }, rows: [
    '................', '................', '................',
    '..........kk....',
    '.........kaak...',
    '..kkkkkkkaaeak..',
    '.kbaaaaaaaaaatk.',
    'kbaaaaaaaaaakkk.',
    'kaaaaaaaaaaak...',
    '.kaakkkkkaak....',
    '.kak....kak.....',
    '.kak....kak.....',
    '.kk.....kk......'] },
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
  boss_void: { tint: '#4a2a7a', pal: { w: '#f0e8ff', e: '#ff3a6a' }, rows: [
    '.....kkkkkk.....',
    '...kkaaaaaakk...',
    '..kaaaaaaaaaak..',
    '.kaacwwwwwwcaak.',
    '.kacwwwwwwwwcak.',
    'kaawwwkkkkwwwaak',
    'kaawwkeeeekwwaak',
    'kaawwkeeeekwwaak',
    'kaawwwkkkkwwwaak',
    '.kacwwwwwwwwcak.',
    '.kaacwwwwwwcaak.',
    '..kaaaaaaaaaak..',
    '.k.kkaaaaaakk.k.',
    'kak.kakkkkak.kak',
    '.kak.ka..ak.kak.',
    '..k...k..k...k..'] },
  chest: { pal: { w: '#9a5a28', b: '#6a3a18', y: '#e0b040' }, rows: [
    '..kkkkkkkkkkkk..',
    '.kwwwwwwwwwwwwk.',
    'kwwwwwwwwwwwwwwk',
    'kyyyyyykkyyyyyyk',
    'kbbbbbkyykbbbbbk',
    'kwwwwwkyykwwwwwk',
    'kwwwwwwkkwwwwwwk',
    'kwwwwwwwwwwwwwwk',
    'kyyyyyyyyyyyyyyk',
    'kbbbbbbbbbbbbbbk',
    '.kkkkkkkkkkkkkk.'] },
  chest_open: { pal: { w: '#9a5a28', b: '#6a3a18', y: '#e0b040', d: '#1a0e06' }, rows: [
    '.kkkkkkkkkkkkkk.',
    'kwwwwwwwwwwwwwwk',
    'kyyyyyyyyyyyyyyk',
    '.kkkkkkkkkkkkkk.',
    'kddddddddddddddk',
    'kyyyyyyyyyyyyyyk',
    'kbbbbbbbbbbbbbbk',
    'kwwwwwwwwwwwwwwk',
    'kwwwwwwwwwwwwwwk',
    'kyyyyyyyyyyyyyyk',
    'kbbbbbbbbbbbbbbk',
    '.kkkkkkkkkkkkkk.'] },
  coin: { pal: { y: '#ffd84a', o: '#b08820', w: '#ffffff' }, rows: ['.kkk.', 'kywyk', 'kyyok', 'kyook', '.kkk.'] },
  energy: { pal: { a: '#8ab8ff', c: '#dff0ff', b: '#4a7adf' }, rows: ['..k..', '.kck.', 'kcaak', 'kaabk', 'kabbk', '.kbk.', '..k..'] },
  potion: { tint: '#e04848', pal: { g: '#dfe8f0', p: '#a07040' }, rows: [
    '..kkk..', '..kpk..', '.kkgkk.', 'kgcaagk', 'kaaaaak', 'kaaaaak', 'kbaaabk', '.kkkkk.'] }
};

// ── 무기 (오른쪽을 향하게 그림, pivot = 손잡이 위치)
const WPIX = {
  pistol: { p: [2, 2], rows: ['.kkkkkkkk', 'kcaaaaaak', 'kaabbbbbk', 'kbbk.....', 'kbbk.....', '.kk......'] },
  smg: { p: [2, 2], rows: ['.kkkkkkkkkkk', 'kcaaaaaaaaak', 'kaabbbbbbbbk', 'kbbkkbbk....', 'kbbk.kk.....', '.kk.........'] },
  burst: { p: [3, 2], rows: ['..kkkkkkkkkkkk', 'kkcaaaaaaaaaak', 'kbaabbbbbbbbkk', 'kbbkkbbk......', '.kk..kk.......'] },
  shotgun: { p: [2, 2], rows: ['.kkkkkkkkkkkk', 'kccaaaaaaaaak', 'kbbkkkkkkkkkk', 'kbbk.kbbk....', '.kk...kk.....'] },
  sniper: { p: [3, 3], rows: ['....kkk.........', '..kkkkkkkkkkkkkk', 'kkcaaaaaaaaaaaak', 'kbbabbbbkkkkkkk.', 'kbbk............', '.kk.............'] },
  bounce: { p: [2, 2], rows: ['.kkkkkkkkk..', 'kcaaaaaaakok', 'kaabbbbbbkok', 'kbbk.kk..kk.', 'kbbk........', '.kk.........'] },
  crossbow: { p: [3, 3], rows: ['........kk.', '........kak', '.kkkkkkkkak', 'kbbbbbbbbak', '.kkbbkkkkak', '..kbbk..kak', '...kk....kk'] },
  launcher: { p: [3, 3], rows: ['.kkkkkkkkkk.', 'kcccccccccak', 'kaaaaaaaaaok', 'kbbbbbbbbbak', '.kkbbkkkkkk.', '..kbbk......', '...kk.......'] },
  wand: { p: [3, 2], rows: ['........kk.', 'kkkkkkkkkok', 'kddddddddkook', 'kkkkkkkkkok', '........kk.'] },
  staff: { p: [3, 2], rows: ['.........kkk.', 'kkkkkkkkkkook', 'kaaaaaaaakwok', 'kkkkkkkkkkook', '.........kkk.'] },
  sword: { p: [4, 3], rows: [
    '...kk..............',
    '...kyk.kkkkkkkkkk..',
    'kkkkykkcccccccccckk.',
    'kdddyyaaaaaaaaaaaaak',
    'kkkkykkaaaaaaaaaakk.',
    '...kyk.kkkkkkkkkk..',
    '...kk..............'] },
  spear: { p: [6, 2], rows: [
    '..................kk..',
    'kkkkkkkkkkkkkkkkkkcak.',
    'kddddddddddddddddkcaak',
    'kkkkkkkkkkkkkkkkkkcak.',
    '..................kk..'] },
  hammer: { p: [3, 4], rows: [
    '...........kkkkk', '...........kcaak', '...........kaaak', 'kkkkkkkkkkkkaaak', 'kddddddddddkaaak',
    'kkkkkkkkkkkkaaak', '...........kaaak', '...........kbbak', '...........kkkkk'] },
  bow: { p: [2, 6], rows: [
    '.kk.....', '.skk....', '.s.kak..', '.s..kak.', '.s...kak', '.s...kak', '.s...kak',
    '.s...kak', '.s...kak', '.s..kak.', '.s.kak..', '.skk....', '.kk.....'] },
  dagger: { p: [2, 2], rows: ['.kk.......', 'kkykkkkkk.', 'kdyyaaaaack', 'kkykkkkkk.', '.kk.......'] },
  scythe: { p: [3, 5], rows: [
    '..............kkk...',
    '.............kcaak..',
    '..............kcaak.',
    '...............kcak.',
    'kkkkkkkkkkkkkkkkcak.',
    'kdddddddddddddddkak.',
    'kkkkkkkkkkkkkkkkkk..'] },
  boomerang: { p: [4, 4], rows: ['kkk......', 'kaak.....', '.kaak....', '..kaakkk.', '...kcaaak', '..kaakkk.', '.kaak....', 'kaak.....', 'kkk......'] },
  minigun: { p: [3, 3], rows: ['..kkkkkkkkkkkkk', '.kaaaaaaaaaaaak', 'kcbkbkbkbkbkbkk', 'kaaaaaaaaaaaak.', 'kbbkkbbk.......', '.kk..kk........'] },
  sling: { p: [2, 3], rows: ['......kk', '.....kdk', 'kkkkkdk.', 'kddddk..', 'kkkkkdk.', '.....kdk', '......kk'] },
  club: { p: [2, 2], rows: ['.........kkkk.', 'kkkkkkkkkaaaak', 'kddddddddaacak', 'kkkkkkkkkaaaak', '.........kkkk.'] },
  axe: { p: [2, 3], rows: ['........kkk.', '.......kcaak', 'kkkkkkkkaaak', 'kddddddkaaak', 'kkkkkkkkaaak', '.......kbbak', '........kkk.'] },
  greatsword: { p: [4, 4], rows: [
    '...kk...................',
    '...kyk.kkkkkkkkkkkkkkk..',
    'kkkkykkcccccccccccccccck',
    'kdddyyaaaaaaaaaaaaaaaaak',
    'kdddyyaaaaaaaaaaaaaaaaak',
    'kkkkykkbbbbbbbbbbbbbbbbk',
    '...kyk.kkkkkkkkkkkkkkk..',
    '...kk...................'] },
  shovel: { p: [2, 2], rows: ['..........kkkk.', 'kkkkkkkkkkaaaak', 'kdddddddddacaak', 'kkkkkkkkkkaaaak', '..........kkkk.'] },
  whip: { p: [2, 2], rows: ['.....kkkk...', 'kkkkkaaakk..', 'kddddk..kak.', 'kkkkkk...kak', '..........kk'] },
  shuriken: { p: [3, 3], rows: ['...k...', '..kak..', '.kkakk.', 'kaacaak', '.kkakk.', '..kak..', '...k...'] },
  saw: { p: [4, 4], rows: ['.k.kkk.k.', 'kakaaakak', '.kaaaaak.', 'kaaabaaak', 'kaabkbaak', 'kaaabaaak', '.kaaaaak.', 'kakaaakak', '.k.kkk.k.'] },
  laser: { p: [2, 2], rows: ['.kkkkkkkkkkk.', 'kcccccccccwok', 'kaaaaaaaaakok', 'kbbkkbbkkkkk.', 'kbbk.........', '.kk..........'] }
};
const WEAPON_SPRITE = {
  weapon_pistol_001: 'pistol', weapon_smg_001: 'smg', weapon_rivet_001: 'smg', weapon_watergun_001: 'smg', weapon_flintlock_001: 'pistol',
  weapon_blunderbuss_001: 'shotgun', weapon_shuriken_001: 'shuriken', weapon_mine_001: 'launcher', weapon_cluster_001: 'launcher',
  weapon_sawblade_001: 'saw', weapon_plasma_001: 'laser', weapon_windstaff_001: 'staff', weapon_shovel_001: 'shovel',
  weapon_whip_001: 'whip', weapon_halberd_001: 'spear', weapon_shortbow_001: 'bow', weapon_thunderbow_001: 'crossbow', weapon_sling_001: 'sling', weapon_knives_001: 'dagger',
  weapon_revolver_001: 'pistol', weapon_axe_001: 'axe', weapon_acid_001: 'launcher', weapon_rocket_001: 'launcher',
  weapon_doublebarrel_001: 'shotgun', weapon_firestaff_001: 'staff', weapon_tesla_001: 'laser', weapon_club_001: 'club',
  weapon_rapier_001: 'sword', weapon_greatsword_001: 'greatsword', weapon_frostbow_001: 'bow', weapon_dual_001: 'pistol', weapon_minigun_001: 'minigun',
  weapon_boomerang_001: 'boomerang', weapon_scatter_001: 'shotgun', weapon_void_001: 'staff', weapon_dagger_001: 'dagger',
  weapon_scythe_001: 'scythe', weapon_triplebow_001: 'bow', weapon_railgun_001: 'sniper', weapon_burst_001: 'burst', weapon_shotgun_001: 'shotgun',
  weapon_rifle_001: 'sniper', weapon_bounce_001: 'bounce', weapon_crossbow_001: 'crossbow', weapon_flame_001: 'launcher',
  weapon_launcher_001: 'launcher', weapon_homing_001: 'launcher', weapon_wand_001: 'wand', weapon_frost_001: 'staff',
  weapon_staff_001: 'staff', weapon_lightning_001: 'staff', weapon_sword_001: 'sword', weapon_spear_001: 'spear',
  weapon_hammer_001: 'hammer', weapon_longbow_001: 'bow', weapon_laser_001: 'laser'
};

const spriteCache = new Map();
function getSprite(name, color, color2) {
  const key = name + '|' + (color || '') + '|' + (color2 || '');
  let s = spriteCache.get(key);
  if (s) return s;
  const t = PIX[name];
  if (!t) throw new Error('알 수 없는 스프라이트: ' + name);
  const base = color || t.tint, pal = { k: OUTLINE };
  if (base) { pal.a = base; pal.b = shade(base, 0.68); pal.c = shade(base, 1.35); }
  Object.assign(pal, t.pal);
  if (color2) pal.e = color2;
  s = bakeSprite(t.rows, pal); spriteCache.set(key, s); return s;
}
function heroSprite(hero, frame) {
  const key = 'hero|' + hero.id + '|' + frame;
  let s = spriteCache.get(key);
  if (s) return s;
  const L = hero.look, T = HERO_SPRITES[L.sprite] || HERO_SPRITES.knight;
  const pal = Object.assign({ k: OUTLINE, s: '#f0c8a0', a: L.body, b: shade(L.body, 0.68), c: shade(L.body, 1.35), m: '#c9d6e0', w: '#ffffff',
    r: L.accent, y: '#e0c060', l: '#3a3048', h: L.accent, g: shade(L.accent, 0.68), e: '#7ad0ff', n: '#6a4628', d: '#3a2a1a' }, T.pal);
  s = bakeSprite(T.rows.concat(T.legs[frame]), pal); spriteCache.set(key, s); return s;
}
function weaponSprite(def) {
  const key = 'wpn|' + def.id;
  let s = spriteCache.get(key);
  if (s) return s;
  const t = WPIX[WEAPON_SPRITE[def.id]] || WPIX.pistol;
  const pal = { k: OUTLINE, a: def.color, b: shade(def.color, 0.65), c: shade(def.color, 1.4), o: def.bulletColor || '#ffffff',
    w: '#ffffff', d: '#7a5530', y: '#d0a040', s: '#dddddd' };
  s = bakeSprite(t.rows, pal); s.px = t.p[0]; s.py = t.p[1]; spriteCache.set(key, s); return s;
}

function drawHero(ctx, hero, x, y, face, frame, dash) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 5, y + 6, 10, 2);
  const spr = heroSprite(hero, frame);
  drawSprite(ctx, spr, x, y + 7, { flip: face < 0 });
  if (dash) { ctx.globalAlpha = 0.55; drawSprite(ctx, spr, x, y + 7, { flip: face < 0, white: true }); ctx.globalAlpha = 1; }
}

function drawWeapon(ctx, def, x, y, angle) {
  const spr = weaponSprite(def);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  if (Math.cos(angle) < 0) ctx.scale(1, -1);
  ctx.drawImage(spr.n, -spr.px, -spr.py);
  ctx.restore();
}
// 무기를 가운데 정렬로 그리기 (바닥/상점/HUD용)
function drawWeaponCentered(ctx, def, cx, cy) {
  const s = weaponSprite(def);
  drawWeapon(ctx, def, cx - s.w / 2 + s.px, cy - s.h / 2 + s.py, 0);
}

function drawEnemy(ctx, e, x, y, flash) {
  const def = e.def, phase = e.phase || 1;
  const color = def.phaseColors ? def.phaseColors[phase - 1] : def.color;
  const color2 = def.sprite === 'mage' ? def.bulletColor : (def.sprite === 'boss_frost' && phase >= 2 ? '#ff5a7a' : undefined);
  const spr = getSprite(def.sprite, color, color2), sc = def.boss ? 2 : 1;
  let sq = 0, oy = 0;
  if (e.state === 'TELEGRAPH' && ['slime', 'shroom', 'golem', 'boss_gel', 'boss_frost'].includes(def.sprite)) sq = def.boss ? 4 : 2;
  else if (def.sprite === 'slime' || def.sprite === 'boss_gel') sq = Math.round((Math.sin(e.stateTime * (def.boss ? 4 : 9)) + 1) * (def.boss ? 1 : 0.6));
  if (def.sprite === 'imp' || def.sprite === 'wraith' || def.sprite === 'boss_flame' || def.sprite === 'boss_void') oy = Math.round(Math.sin(e.stateTime * (def.boss ? 3 : 9)) * 1.5) - (def.boss ? 4 : 3);
  const lift = Math.round(e.jumpH || 0), bottom = y + def.hitboxHalf + 1;
  const sw = Math.round(spr.w * sc * 0.65 - Math.min(10, lift / 4));
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(x - sw / 2), bottom - 2, sw, def.boss ? 3 : 2);
  if (def.sprite === 'boss_flame') {
    ctx.fillStyle = `rgba(255,120,40,${0.18 + 0.1 * Math.sin(e.stateTime * 10)})`;
    ctx.beginPath(); ctx.arc(x, bottom - 16 + oy, 22, 0, TAU); ctx.fill();
  }
  const blink = def.sprite === 'bomber' && e.state === 'TELEGRAPH' && Math.floor(e.stateTime * 16) % 2 === 0;
  const by = bottom - lift + oy;
  if (e.elite) { // 정예: 금빛 오라
    ctx.fillStyle = `rgba(255,210,80,${0.22 + 0.12 * Math.sin(e.stateTime * 6)})`;
    ctx.beginPath(); ctx.ellipse(x, bottom - 3, spr.w * 0.6, 5, 0, 0, TAU); ctx.fill();
  }
  if (def.boss && phase >= 2) { // 보스 페이즈 오라
    ctx.fillStyle = phase >= 3 ? `rgba(255,60,80,${0.16 + 0.1 * Math.sin(e.stateTime * 9)})` : `rgba(255,140,200,${0.1 + 0.06 * Math.sin(e.stateTime * 6)})`;
    ctx.beginPath(); ctx.arc(x, bottom - spr.h, spr.w * 1.15, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = e.fade ?? 1;
  drawSprite(ctx, spr, x, by, { flip: e.face < 0, white: flash || blink || (e.state === 'PHASE' && Math.floor(e.stateTime * 14) % 2 === 0), scale: sc, squash: sq });
  ctx.globalAlpha = 1;
  if (e.elite) { ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 1, by - spr.h * sc - 6, 3, 3); ctx.fillRect(x - 3, by - spr.h * sc - 5, 7, 1); }
  const top = by - spr.h * sc;
  if (def.sprite === 'mage') {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.stateTime * 5);
    ctx.fillStyle = def.bulletColor || '#d070ff'; ctx.fillRect(x - 1, top - 2, 3, 3);
    ctx.globalAlpha = 1;
  }
  if (e.state === 'STUN') {
    ctx.fillStyle = '#ffe36b';
    for (let i = 0; i < 3; i++) {
      const a = e.stateTime * 6 + i * TAU / 3;
      ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(top + Math.sin(a) * 2), 2, 2);
    }
  }
}

function drawPotion(ctx, x, y, color) { drawSprite(ctx, getSprite('potion', color), x, y + 4); }

// ── 타일 텍스처
function drawFloorTile(g, x, y, base, style) {
  g.fillStyle = base; g.fillRect(x, y, TILE, TILE);
  if (style === 'wood') {
    const d = shade(base, 0.78), l = shade(base, 1.1);
    for (let i = 0; i < TILE; i += 4) { g.fillStyle = l; g.fillRect(x, y + i, TILE, 1); g.fillStyle = d; g.fillRect(x, y + i + 3, TILE, 1); }
    g.fillStyle = d;
    for (let i = 0; i < 4; i++) g.fillRect(x + ((x / TILE * 5 + y / TILE * 3 + i * 7) % TILE), y + i * 4, 1, 3);
    return;
  }
  const hi = shade(base, 1.1), lo = shade(base, 0.76), sp = shade(base, 0.88);
  g.fillStyle = hi; g.fillRect(x, y, TILE - 1, 1); g.fillRect(x, y, 1, TILE - 1);
  g.fillStyle = lo; g.fillRect(x + TILE - 1, y, 1, TILE); g.fillRect(x, y + TILE - 1, TILE, 1);
  g.fillStyle = sp;
  for (let i = 0; i < 3; i++) g.fillRect(x + randInt(2, 12), y + randInt(2, 12), randInt(1, 2), 1);
  if (Math.random() < 0.08) {
    g.fillStyle = lo; let cx = x + randInt(3, 10), cy = y + randInt(3, 9);
    for (let i = 0; i < 4; i++) { g.fillRect(cx, cy, 1, 1); cx += randInt(0, 1); cy++; }
  }
}
function drawWallTile(g, x, y, pal, face) {
  g.fillStyle = pal.wall; g.fillRect(x, y, TILE, TILE);
  g.fillStyle = shade(pal.wall, 0.8);
  for (let r = 0; r < 4; r++) {
    g.fillRect(x, y + r * 4 + 3, TILE, 1);
    const off = ((y / TILE * 4 + r) % 2) * 4;
    g.fillRect(x + off, y + r * 4, 1, 3); g.fillRect(x + off + 8, y + r * 4, 1, 3);
  }
  g.fillStyle = pal.wallTop; g.fillRect(x, y, TILE, 1);
  if (face) {
    g.fillStyle = pal.wallFace; g.fillRect(x, y + 8, TILE, 8);
    g.fillStyle = shade(pal.wallFace, 1.15); g.fillRect(x, y + 8, TILE, 1);
    g.fillStyle = pal.faceLine;
    g.fillRect(x, y + 12, TILE, 1);
    g.fillRect(x + ((x / TILE) % 2 ? 4 : 11), y + 9, 1, 3); g.fillRect(x + ((x / TILE) % 2 ? 11 : 4), y + 13, 1, 3);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + TILE - 1, TILE, 1);
  }
}
