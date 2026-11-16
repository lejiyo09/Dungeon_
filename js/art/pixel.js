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

// ── 캐릭터: 예전 16×16 문자 격자 외형 (js/art/heroes.js의 HERO_PROCS가 있으면 그쪽을 사용 — 지금은 예비용)
// ── 직업별 전신 템플릿 (몸통 rows + 걷기 2프레임 legs)
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
      ['....kllk.kllk...', '...kddk...kddk..', '..kkkk....kkkk..']] },
  // ── 추가 캐릭터: 암살자(두건·복면·붉은 목도리) / 사제(금테 흰 로브·십자) / 광전사(뿔 투구·수염·모피) / 드루이드(사슴뿔 두건·녹색 망토)
  assassin: { pal: { e: '#ff5a7a' }, rows: [
    '................',
    '.....kkkkkk.....',
    '....kaaaaaak....',
    '...kaaaaaaaak...',
    '...kakkkkkkak...',
    '...kaksesesak...',
    '...kakkkkkkak...',
    '..krrrrrrrrrrk..',
    '.kaarrrraaaaaak.',
    '.kbaaaaaaaaaabk.',
    '.kskaaaggaaaksk.',
    '..kbbbbbbbbbbk..',
    '...kbbkkkkbbk...'],
    legs: [
      ['....kllkkllk....', '....kllkkllk....', '...kkkk..kkkk...'],
      ['....kllk.kllk...', '...kllk...kllk..', '..kkkk....kkkk..']] },
  priest: { pal: { e: '#3a5aa0' }, rows: [
    '................',
    '......kkkk......',
    '.....kaaaak.....',
    '....kaaaaaak....',
    '...kaayyyyaak...',
    '...kakseseskak..',
    '...kaksssssak...',
    '..kaaaaaaaaaak..',
    '.kaaaaayyaaaaak.',
    '.kaaayyyyyyaaak.',
    '.kskaaayyaaaksk.',
    '.kaaaaayyaaaaak.',
    '.kbaaaaaaaaaabk.'],
    legs: [
      ['.kbbbbbbbbbbbbk.', '..kkkkkkkkkkkk..'],
      ['..kbbbbbbbbbbk..', '...kkkkkkkkkkk..']] },
  berserker: { pal: { w: '#f0e8d0', e: '#ffd84a' }, rows: [
    '.kwk........kwk.',
    '.kwk.kkkkkk.kwk.',
    '..kwkmmmmmmkwk..',
    '...kmmmmmmmmk...',
    '...kmkkkkkkmk...',
    '...kssesesssk...',
    '...knnsssnnnk...',
    '..knnnnnnnnnnk..',
    '.ksknnnnnnnnksk.',
    '.kskaaannaaaksk.',
    '.kskaaaaaaaaksk.',
    '.kssbrrrrrrbssk.',
    '..kbbbbbbbbbbk..'],
    legs: [
      ['....kllkkllk....', '....kllkkllk....', '...kkkk..kkkk...'],
      ['....kllk.kllk...', '...kllk...kllk..', '..kkkk....kkkk..']] },
  druid: { pal: { y: '#d0a040' }, rows: [
    '..kk........kk..',
    '..knk......knk..',
    '...knkkkkkkknk..',
    '....kaaaaaaak...',
    '...kaaaaaaaaak..',
    '...kaksesesak...',
    '...kaksssssak...',
    '..kaaaayyaaaak..',
    '.kaaaaaaaaaaaak.',
    '.kaacaaaaaacaak.',
    '.kskaaaaaaaaksk.',
    '.kbaaaaaaaaaabk.',
    '..kbbbbbbbbbbk..'],
    legs: [
      ['....kllkkllk....', '....kllkkllk....', '...kkkk..kkkk...'],
      ['....kllk.kllk...', '...kllk...kllk..', '..kkkk....kkkk..']] }
};

const PIX = {
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
  s = t.proc ? bakeProc(t.w, t.h, t.proc, pal) : bakeSprite(t.rows, pal); spriteCache.set(key, s); return s;
}
// 옷색만 바꾼 영웅 (마도사 속성별 옷 등): 나머지 정보는 원래 영웅 그대로 이어받음
function heroWithLook(hero, look) { return look ? Object.create(hero, { look: { value: Object.assign({}, hero.look, look), enumerable: true } }) : hero; }
function heroSprite(hero, frame) {
  const key = 'hero|' + hero.id + '|' + hero.look.body + '|' + hero.look.accent + '|' + frame; // 같은 직업이라도 옷색(갈래)이 다르면 따로
  let s = spriteCache.get(key);
  if (s) return s;
  const L = hero.look, T = HERO_SPRITES[L.sprite] || HERO_SPRITES.knight;
  const pal = Object.assign({ k: OUTLINE, s: '#f0c8a0', a: L.body, b: shade(L.body, 0.68), c: shade(L.body, 1.35), m: '#c9d6e0', w: '#ffffff',
    r: L.accent, y: '#e0c060', l: '#3a3048', h: L.accent, g: shade(L.accent, 0.68), e: '#7ad0ff', n: '#6a4628', d: '#3a2a1a' }, T.pal);
  const P2 = HERO_PROCS[L.sprite]; // 도형으로 그린 새 외형이 있으면 그것을 사용
  if (P2) Object.assign(pal, P2.pal);
  s = P2 ? bakeSprite(procGrid(HERO_W, HERO_H, (P) => P2.proc(P, frame)), pal) : bakeSprite(T.rows.concat(T.legs[frame]), pal);
  spriteCache.set(key, s); return s;
}
function weaponSprite(def) {
  const key = 'wpn|' + def.id;
  let s = spriteCache.get(key);
  if (s) return s;
  const t = WPIX[WEAPON_SPRITE[def.id]] || WPIX.pistol;
  const pal = { k: OUTLINE, a: def.color, b: shade(def.color, 0.65), c: shade(def.color, 1.4), o: def.bulletColor || '#ffffff',
    w: '#ffffff', d: '#7a5530', e: '#5a3a1e', y: '#d0a040', s: '#dddddd', m: '#a8b0bc', n: '#5a6070', g: '#2a2a34', r: '#d04040' };
  const rows = t.auto ? outlineRows(t.rows) : t.rows, off = t.auto ? 1 : 0; // auto: 외곽선 1px 만큼 손잡이 위치 이동
  s = bakeSprite(rows, pal); s.px = t.p[0] + off; s.py = t.p[1] + off; spriteCache.set(key, s); return s;
}

function drawHero(ctx, hero, x, y, face, frame, dash) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 5, y + 6, 10, 2);
  const spr = heroSprite(hero, frame);
  drawSprite(ctx, spr, x, y + 7, { flip: face < 0 });
  if (dash) { ctx.globalAlpha = 0.55; drawSprite(ctx, spr, x, y + 7, { flip: face < 0, white: true }); ctx.globalAlpha = 1; }
}

// 무기 그리기: (x,y)=손 위치. 64방향으로 미리 구운 도트 회전 이미지를 사용
function drawWeapon(ctx, def, x, y, angle) {
  const r = rotatedWeapon(def, angle);
  ctx.drawImage(r.c, Math.round(x - r.half), Math.round(y - r.half));
}
// 무기를 가운데 정렬로 그리기 (바닥/상점/HUD용)
function drawWeaponCentered(ctx, def, cx, cy) {
  const s = weaponSprite(def);
  drawWeapon(ctx, def, cx - s.w / 2 + s.px, cy - s.h / 2 + s.py, 0);
}

function drawEnemy(ctx, e, x, y, flash) {
  const def = e.def, phase = e.phase || 1;
  const color = def.phaseColors ? def.phaseColors[phase - 1] : def.color;
  const color2 = def.aiType === 'caster' ? def.bulletColor : (def.sprite === 'boss_frost' && phase >= 2 ? '#ff5a7a' : undefined);
  const spr = getSprite(def.sprite, color, color2), sc = def.boss && spr.w < 32 ? 2 : 1;
  let sq = 0, oy = 0;
  if (e.state === 'TELEGRAPH' && ['slime', 'iceslime', 'shroom', 'golem', 'boss_gel', 'boss_frost'].includes(def.sprite)) sq = def.boss ? 4 : 2;
  else if (def.sprite === 'slime' || def.sprite === 'iceslime' || def.sprite === 'boss_gel') sq = Math.round((Math.sin(e.stateTime * (def.boss ? 4 : 9)) + 1) * (def.boss ? 1 : 0.6));
  if (def.sprite === 'imp' || def.sprite === 'wraith' || def.sprite === 'boss_flame' || def.sprite === 'boss_void' || def.sprite === 'boss_sand' || def.sprite === 'boss_lich' || def.sprite === 'ghost' || def.sprite === 'bat' || def.sprite === 'boss_star' || def.sprite === 'starwisp' || def.sprite === 'eyebat' || def.sprite === 'abyssjelly') oy = Math.round(Math.sin(e.stateTime * (def.boss ? 3 : 9)) * 1.5) - (def.boss ? 4 : 3);
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
    ctx.beginPath(); ctx.arc(x, bottom - spr.h * sc / 2, spr.w * sc * 0.62, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = e.fade ?? 1;
  if (!def.boss && !def.dummy && e.state !== 'SPAWN') { // 잡몹 가시성: 발밑 붉은 표식 + 밝은 테두리
    const rx = Math.max(6, spr.w * 0.5);
    ctx.fillStyle = 'rgba(255,60,60,0.16)'; ctx.beginPath(); ctx.ellipse(x, bottom - 2, rx, 3.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = e.elite ? 'rgba(255,216,74,0.8)' : 'rgba(255,100,100,0.65)'; ctx.beginPath(); ctx.ellipse(x, bottom - 2, rx, 3.5, 0, 0, TAU); ctx.stroke();
    const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.4;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawSprite(ctx, spr, x + ox, by + oy, { flip: e.face < 0, white: true, scale: sc, squash: sq });
    ctx.globalAlpha = a0;
  }
  drawSprite(ctx, spr, x, by, { flip: e.face < 0, white: flash || blink || (e.state === 'PHASE' && Math.floor(e.stateTime * 14) % 2 === 0), scale: sc, squash: sq });
  ctx.globalAlpha = 1;
  if (e.elite) { ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 1, by - spr.h * sc - 6, 3, 3); ctx.fillRect(x - 3, by - spr.h * sc - 5, 7, 1); }
  const top = by - spr.h * sc;
  if (e.state === 'STUN') {
    ctx.fillStyle = '#ffe36b';
    for (let i = 0; i < 3; i++) {
      const a = e.stateTime * 6 + i * TAU / 3;
      ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(top + Math.sin(a) * 2), 2, 2);
    }
  }
}

function drawPotion(ctx, x, y, color) { drawSprite(ctx, getSprite('potion', color), x, y + 4); }

