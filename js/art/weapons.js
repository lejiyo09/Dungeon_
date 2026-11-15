'use strict';
// ════════════════════════════════════════════
// 무기 스프라이트 (무기별 고유 그림)
//  auto: true 인 그림은 외곽선 없이 안쪽만 그리면 1px 외곽선이 자동으로 둘러짐
//  오른쪽을 향하게 그림, p = 손잡이(회전 중심) 위치
//  문자: a/b/c 무기색 주/어두운/밝은, o 탄환색, m 금속, n 어두운 금속, g 손잡이, d 나무, e 짙은 나무,
//        y 금색, r 빨강, s 시위, w 흰색, .=투명
// ════════════════════════════════════════════
Object.assign(WPIX, {
  // ── 권총류
  pistol2: { auto: true, p: [2, 3], rows: ['.cccccccc.', '.aaaaaaaan', '.bbnbbbbb.', '.ggn......', '.gg.......', '.gg.......'] },
  revolver: { auto: true, p: [2, 3], rows: ['...cccccccccc', '.naaaaaaaaaaa', '.nnmmmmbb....', '.dd.mmm......', '.dd..........', '..d..........'] },
  flintlock: { auto: true, p: [2, 3], rows: ['.n.............', 'nnmmmmmmmmmmmmm', '.eddddddddddd..', 'eedd...........', 'ee.............'] },
  watergun: { auto: true, p: [2, 4], rows: ['...ooo.......', '..oowoo......', '.aaaaaaaaaaa.', '.accccccccaao', '.aa..........', '.aa..........', '.ab..........'] },
  dual: { auto: true, p: [4, 5], rows: ['.cccccc....', '.aaaaaaan..', '.ggbb......', '.gg.cccccc.', '....aaaaaaan', '....ggbb...', '....gg.....'] },
  laser2: { auto: true, p: [2, 3], rows: ['.cccccccccc...', '.aaaaaaaaaanoo', '.bbbbbbbnn....', '.gg...........', '.gg...........'] },
  // ── 기관총·소총
  smg2: { auto: true, p: [2, 3], rows: ['..cccccccccc..', 'naaaaaaaaaaann', 'nbbbbbbbbbb...', '.gg...nn......', '.gg...nn......', '......nn......'] },
  rivet: { auto: true, p: [2, 3], rows: ['.aaaaaaaa....', '.accccccaannn', '.aaaaaaaa..m.', '..gg..mmm....', '..gg..mmm....', '..gg.........'] },
  rifle2: { auto: true, p: [4, 3], rows: ['....ccccccccccc.', 'bbbaaaaaaaaaaaan', 'bb.aannnbbb.....', '....gg.nn.......', '....gg.nn.......'] },
  sniper2: { auto: true, p: [5, 3], rows: ['.....nnnnn.........', '.....noon..........', 'bbbbaaaaaaaaaaaaaan', 'bb..aanbb..........', '.....gg............', '.....gg............'] },
  plasma: { auto: true, p: [4, 3], rows: ['....ccccccccccc..', 'bbbaaoaoaoaaaaaoo', 'bb..aabbbbbbb....', '....gg...........', '....gg...........'] },
  railgun: { auto: true, p: [5, 3], rows: ['.....cccccccccccccc.', 'bbbbbaaaaaaaaaaaaaao', 'bb...ooooooooooooooo', '.....nnnnnnnnnnnnnn.', '.....gg.............', '.....gg.............'] },
  orbgun: { auto: true, p: [2, 3], rows: ['...cccccc.oo.', '.aaaaaaaaowoo', '.abbbbbbaoooo', '.gg.......oo.', '.gg..........'] },
  tesla: { auto: true, p: [2, 5], rows: ['.......o...o..', '......ooo.ooo.', '..aaaaammmmmmm', '.acccccnnnnnnn', '.aaaaaa.......', '..gg..........', '..gg..........'] },
  // ── 산탄총
  shotgun2: { auto: true, p: [3, 2], rows: ['...mmmmmmmmmmmm', 'eddaaaaaaaaaaan', 'ee.dd.dddd.....', '....d..........'] },
  double: { auto: true, p: [3, 3], rows: ['...mmmmmmmmmmmm', '...nnnnnnnnnnnn', 'eddddddddd.....', 'ee.dd..........', '....d..........'] },
  blunderbuss: { auto: true, p: [3, 3], rows: ['.............yy', '..mmmmmmmmmmyyy', 'edddddddddddyyy', 'eedd.........yy', '.ed............'] },
  scatter: { auto: true, p: [3, 5], rows: ['..nnnnnnn....', '.naaaaaaannnn', '.naoaoaoannoo', '.naaaaaaannnn', '..nnnnnnn....', '...gg........', '...gg........'] },
  // ── 중화기·분사기
  orbcannon: { auto: true, p: [3, 5], rows: ['..aaaaaaaaaa..', '.acccccccccaa.', '.aaaaaaaaaaaoo', '.abbbbbbbbbaoo', '..aaaaaaaaaa..', '...gg.........', '...gg.........'] },
  missilepod: { auto: true, p: [3, 5], rows: ['.nnnnnnnnnn..', '.naaaaaaaaarr', '.nnnnnnnnnn..', '.naaaaaaaaarr', '.nnnnnnnnnn..', '...gg........', '...gg........'] },
  rocket: { auto: true, p: [5, 4], rows: ['.aaaaaaaaaaaaa..', 'aaaaaaaaaaaaaarr', 'abbbbbbbbbbbbarr', '.aaaaaaaaaaaaa..', '.....gg..gg.....', '.....gg.........'] },
  cluster: { auto: true, p: [4, 5], rows: ['.nnnnnnnnnnnn.', 'naaoaaoaaoaaan', 'nbbbbbbbbbbbbn', 'naaoaaoaaoaaan', '.nnnnnnnnnnnn.', '....gg........', '....gg........'] },
  mine: { auto: true, p: [6, 4], rows: ['.nnnn........', 'nmmmmnaaaaaaa', 'nmrrmncccccco', 'nmmmmnaaaaaaa', '.nnnn.gg.....', '......gg.....'] },
  flamer: { auto: true, p: [6, 4], rows: ['.rrr..........', 'rrwrrmmmmmmmmo', 'rrrrraaaaaaaao', 'rrrrraaaaaaa..', '.rrr..gg......', '......gg......'] },
  sprayer: { auto: true, p: [6, 4], rows: ['.ooo..........', 'oowoommmmmmmmn', 'ooooonaaaaaaan', 'ooooonaaaaa...', '.ooo..gg......', '......gg......'] },
  // ── 지팡이
  wand2: { auto: true, p: [2, 1], rows: ['........y.', 'ddddddddoy', '........y.'] },
  froststaff: { auto: true, p: [3, 2], rows: ['..........o.o.', 'ddddddddddoowo', '..........o.o.'] },
  starstaff: { auto: true, p: [3, 2], rows: ['...........o...', '..........ooo..', 'dddddddddoooooo', '..........ooo..', '.........o...o.'] },
  boltstaff: { auto: true, p: [3, 2], rows: ['...........oo.', '..........oo..', 'aaaaaaaaaoooo.', '............oo', '...........oo.'] },
  firestaff: { auto: true, p: [3, 2], rows: ['..........d.oo.', '.........d.oooo', 'dddddddddddoowo', '.........d.oooo', '..........d.oo.'] },
  windstaff: { auto: true, p: [3, 2], rows: ['..........ooo.', '.........o...o', 'aaaaaaaaao.w.o', '.........o...o', '..........ooo.'] },
  voidstaff: { auto: true, p: [3, 2], rows: ['..........nnn.', '.........noon.', 'aaaaaaaaanowon', '.........noon.', '..........nnn.'] },
  // ── 근접
  rapier: { auto: true, p: [2, 2], rows: ['..yy...............', '.y..y..............', 'gggyyccccccccccccc.', '.y..y..............', '..yy...............'] },
  halberd: { auto: true, p: [6, 2], rows: ['..................a.', '...............aaaa.', 'ddddddddddddddcaaaac', '...............aa...', '................a...'] },
  // ── 활
  longbow: { auto: true, p: [5, 6], rows: ['.a.....', '.sa....', '.s.a...', '.s..a..', '.s...a.', '.s...a.', '.s...a.', '.s...a.', '.s...a.', '.s..a..', '.s.a...', '.sa....', '.a.....'] },
  shortbow: { auto: true, p: [3, 4], rows: ['.a....', '.sa...', '.s.a..', '.s.a..', '.s.a..', '.s.a..', '.s.a..', '.sa...', '.a....'] },
  frostbow: { auto: true, p: [5, 6], rows: ['.oo....', '.sa....', '.s.a...', '.s..a..', '.s...a.', '.s...a.', '.s...oo', '.s...a.', '.s...a.', '.s..a..', '.s.a...', '.sa....', '.oo....'] },
  triplebow: { auto: true, p: [5, 6], rows: ['.a......', '.sa.a...', '.s.a.a..', '.s..a.a.', '.s...a.a', '.s...a.a', '.s...a.a', '.s...a.a', '.s...a.a', '.s..a.a.', '.s.a.a..', '.sa.a...', '.a......'] },
  thunderbow: { auto: true, p: [3, 3], rows: ['.........o.', '........ao.', '.dddddddda.', 'nnnnnnnnna.', '.dd.....ao.', '..d......o.'] },
  // ── 특수 메커닉 무기
  bubblegun: { auto: true, p: [2, 3], rows: ['...oooo...', '..owwoo...', '.aaaaaaaao', '.accccccaa', '.aa.......', '.aa.......'] },
  javelin: { auto: true, p: [6, 1], rows: ['....................m.', 'dddddddddddddddddddmmm', '....................m.'] },
  molotov: { auto: true, p: [2, 5], rows: ['....oo', '....ro', '...nn.', '..aaaa', '.aaaaa', '.acaaa', '.aaaaa', '..aaa.'] },
  grenade: { auto: true, p: [2, 3], rows: ['..nn.', '.naan', 'aaaaa', 'acaaa', 'aaaaa', '.aaa.'] },
  chakram: { auto: true, p: [4, 4], rows: ['..aaaa..', '.a....a.', 'a..cc..a', 'a.c..c.a', 'a.c..c.a', 'a..cc..a', '.a....a.', '..aaaa..'] },
  orbstaff: { auto: true, p: [3, 2], rows: ['..........o..', '.........o.o.', 'dddddddddd.wo', '.........o.o.', '..........o..'] },
  ringgun: { auto: true, p: [2, 6], rows: ['..nnnnnn...', '.naaaaaan..', 'naaoaoaaann', 'naoaaaoaamm', 'naaoaoaaann', '.naaaaaan..', '..gg.......', '..gg.......'] },
  firework: { auto: true, p: [2, 4], rows: ['......rrr...', '..aaaaaaaao.', '.aaaaaaaarrr', '.abbbbbbaa..', '..gg........', '..gg........'] },
  freezeray: { auto: true, p: [2, 3], rows: ['.ccccccc.oo.', '.aaaaaaanoww', '.bbbbbbbnoo.', '.gg.........', '.gg.........'] },
  wavesword: { auto: true, p: [1, 2], rows: ['..yy...........', '..yy.cccccccc..', 'ggyyyaaaaaaaaao', '..yy.bbbbbbbb..', '..yy...........'] },
  shield: { auto: true, p: [1, 4], rows: ['....aa.', '...acca', '...acca', '...acya', 'gggaayy', '...acya', '...acca', '...acca', '....aa.'] },
  dronectl: { auto: true, p: [2, 5], rows: ['......o.', '......n.', '.aaaaaan', '.aroaraa', '.aaaaaaa', '.gg.....', '.gg.....'] },
  chargebeam: { auto: true, p: [4, 5], rows: ['....nnnnnnnnnnn.', '..aaaaaaaaaaaaoo', '.acccoocccccaaoo', '.aaaaaaaaaaaaaoo', '..bbbbbbbbbbbb..', '....gg..........', '....gg..........'] },
  fanknives: { auto: true, p: [1, 2], rows: ['......mm', '...mmm..', 'ggmmmmmm', '...mmm..', '......mm'] },
  repeatxbow: { auto: true, p: [1, 2], rows: ['....a......', '...a.......', 'dddddmmmmmo', '...a.......', '....a......'] },
  growgun: { auto: true, p: [2, 3], rows: ['...nnn.....', '.aaaaaaaoo.', '.acccccaoow', '.aaaaaaaoo.', '.gg........', '.gg........'] },
  poisonstaff: { auto: true, p: [3, 1], rows: ['.........ooo.', 'ddddddddd.owo', '.........ooo.'] },
  rainbow: { auto: true, p: [3, 4], rows: ['.a....', '.sa.o.', '.s.ao.', '.s.a..', '.s.ao.', '.s.a..', '.s.ao.', '.sa.o.', '.a....'] },
  lavastaff: { auto: true, p: [3, 1], rows: ['.........n.oo.', 'ddddddddddnoro', '.........n.oo.'] },
  turretgun: { auto: true, p: [2, 3], rows: ['..nnnn....', '.aaaaaaa..', '.aoaaaaamm', '.aaaaaaa..', '..gg......', '..gg......'] },
  pan: { auto: true, p: [1, 2], rows: ['.......aaa..', '......abbba.', 'ddddddabbbba', '......abbba.', '.......aaa..'] },
  spinaxe: { auto: true, p: [1, 2], rows: ['.........aa.', '........acca', 'dddddddddcca', '........acca', '.........aa.'] },
  lance: { auto: true, p: [3, 1], rows: ['.............mm..', 'ddddyddddddddmmmm', '.............mm..'] },
  quakehammer: { auto: true, p: [1, 2], rows: ['........aaaa', '........acca', 'dddddddyacca', '........acca', '........aaaa'] },
  dartgun: { auto: true, p: [2, 2], rows: ['..nnn....', '.aaaaaaao', '.acccccaa', '.aa......', '.aa......'] },
  beehive: { auto: true, p: [2, 4], rows: ['..yyyy....', '.yaaaay...', '.aayaaaaoo', '.ayaaaaaoo', '.aaaaaa...', '..gg......', '..gg......'] },
  crystalstaff: { auto: true, p: [3, 2], rows: ['..........o.', '.........ooo', 'dddddddddowo', '.........ooo', '..........o.'] },
  kitchenknife: { auto: true, p: [1, 1], rows: ['...cccccc.', 'gggaaaaaaa', '...aaaaa..'] },
  pickaxe: { auto: true, p: [1, 2], rows: ['.......aa...', '.........aa.', 'ddddddddddaa', '.........aa.', '.......aa...'] },
  headshot: { auto: true, p: [5, 3], rows: ['.....nnnnnnn........', '.....nooooon........', 'bbbbaaaaaaaaaaaaaaaan', 'bb...aanbb..........', '.....gg.............', '.....gg.............'] }
});

Object.assign(WEAPON_SPRITE, {
  weapon_pistol_001: 'pistol2', weapon_revolver_001: 'revolver', weapon_flintlock_001: 'flintlock', weapon_watergun_001: 'watergun',
  weapon_dual_001: 'dual', weapon_laser_001: 'laser2', weapon_smg_001: 'smg2', weapon_rivet_001: 'rivet', weapon_burst_001: 'rifle2',
  weapon_rifle_001: 'sniper2', weapon_plasma_001: 'plasma', weapon_railgun_001: 'railgun', weapon_bounce_001: 'orbgun',
  weapon_tesla_001: 'tesla', weapon_shotgun_001: 'shotgun2', weapon_doublebarrel_001: 'double', weapon_blunderbuss_001: 'blunderbuss',
  weapon_scatter_001: 'scatter', weapon_launcher_001: 'orbcannon', weapon_homing_001: 'missilepod', weapon_rocket_001: 'rocket',
  weapon_cluster_001: 'cluster', weapon_mine_001: 'mine', weapon_flame_001: 'flamer', weapon_acid_001: 'sprayer',
  weapon_wand_001: 'wand2', weapon_frost_001: 'froststaff', weapon_staff_001: 'starstaff', weapon_lightning_001: 'boltstaff',
  weapon_firestaff_001: 'firestaff', weapon_windstaff_001: 'windstaff', weapon_void_001: 'voidstaff',
  weapon_rapier_001: 'rapier', weapon_halberd_001: 'halberd',
  weapon_longbow_001: 'longbow', weapon_shortbow_001: 'shortbow', weapon_frostbow_001: 'frostbow', weapon_triplebow_001: 'triplebow',
  weapon_thunderbow_001: 'thunderbow', weapon_bubble_001: 'bubblegun', weapon_javelin_001: 'javelin', weapon_molotov_001: 'molotov',
  weapon_grenade_001: 'grenade', weapon_chakram_001: 'chakram', weapon_orbstaff_001: 'orbstaff', weapon_ringgun_001: 'ringgun',
  weapon_firework_001: 'firework', weapon_freezeray_001: 'freezeray', weapon_wavesword_001: 'wavesword', weapon_shield_001: 'shield',
  weapon_drone_001: 'dronectl', weapon_chargebeam_001: 'chargebeam', weapon_headshot_001: 'headshot',
  weapon_fanknives_001: 'fanknives', weapon_repeatxbow_001: 'repeatxbow', weapon_growgun_001: 'growgun', weapon_poisonstaff_001: 'poisonstaff',
  weapon_rainbow_001: 'rainbow', weapon_lavastaff_001: 'lavastaff', weapon_turretgun_001: 'turretgun',
  weapon_pan_001: 'pan', weapon_spinaxe_001: 'spinaxe',
  weapon_lance_001: 'lance',
  weapon_dartgun_001: 'dartgun', weapon_waterballoon_001: 'sling', weapon_iceshuriken_001: 'shuriken', weapon_beehive_001: 'beehive',
  weapon_crystalstaff_001: 'crystalstaff', weapon_thunderjavelin_001: 'javelin', weapon_goldrevolver_001: 'revolver',
  weapon_kitchenknife_001: 'kitchenknife', weapon_pickaxe_001: 'pickaxe', weapon_icegreatsword_001: 'greatsword', weapon_steelxbow_001: 'repeatxbow', weapon_quakehammer_001: 'quakehammer'
});

// auto 외곽선: 사방 1px 여백을 두고, 그림에 맞닿은 빈칸을 외곽선으로
function outlineRows(rows) {
  const w = Math.max(...rows.map((r) => r.length)) + 2, h = rows.length + 2;
  const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill('.'));
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) g[y + 1][x + 1] = r[x]; });
  const out = g.map((r) => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.')) out[y][x] = 'k';
  }
  return out.map((r) => r.join(''));
}

// ── 도트 회전 캐시: 회전한 무기를 64방향으로 미리 도트 단위로 구움 (화면 픽셀 격자와 일치)
const ROT_STEPS = 64;
function rotatedWeapon(def, angle) {
  const spr = weaponSprite(def);
  let a = angle % TAU; if (a < 0) a += TAU;
  const idx = Math.round(a / TAU * ROT_STEPS) % ROT_STEPS;
  const flip = Math.cos(angle) < 0; // 왼쪽을 향하면 위아래 반전 후 회전
  spr.rot = spr.rot || {};
  const key = idx * 2 + (flip ? 1 : 0);
  if (spr.rot[key]) return spr.rot[key];
  if (!spr.data) spr.data = spr.n.getContext('2d').getImageData(0, 0, spr.w, spr.h).data;
  const th = idx / ROT_STEPS * TAU, cs = Math.cos(th), sn = Math.sin(th);
  const pcx = spr.px + 0.5, pcy = spr.py + 0.5;
  const maxR = Math.ceil(Math.max(Math.hypot(pcx, pcy), Math.hypot(spr.w - pcx, pcy), Math.hypot(pcx, spr.h - pcy), Math.hypot(spr.w - pcx, spr.h - pcy)));
  const D = maxR * 2 + 2, c = document.createElement('canvas'); c.width = D; c.height = D;
  const g = c.getContext('2d'), img = g.createImageData(D, D), src = spr.data;
  for (let oy = 0; oy < D; oy++) for (let ox = 0; ox < D; ox++) {
    const vx = ox + 0.5 - D / 2, vy = oy + 0.5 - D / 2;
    const sx = Math.floor(pcx + vx * cs + vy * sn);
    let syf = pcy - vx * sn + vy * cs; if (flip) syf = 2 * pcy - syf;
    const sy = Math.floor(syf);
    if (sx < 0 || sy < 0 || sx >= spr.w || sy >= spr.h) continue;
    const si = (sy * spr.w + sx) * 4; if (src[si + 3] === 0) continue;
    const di = (oy * D + ox) * 4;
    img.data[di] = src[si]; img.data[di + 1] = src[si + 1]; img.data[di + 2] = src[si + 2]; img.data[di + 3] = src[si + 3];
  }
  g.putImageData(img, 0, 0);
  return (spr.rot[key] = { c, half: D / 2 });
}
// 총구까지 거리 (손잡이 기준)
function weaponLength(def) { const s = weaponSprite(def); return s.w - s.px; }
