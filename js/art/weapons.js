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
  infernostaff: { auto: true, p: [3, 3], rows: ['............oo..', '..........yooww.', '.........yooowwo', 'aaaaaaaaayyoowwo', '.........yooowwo', '..........yooww.', '............oo..'] },
  holystaff: { auto: true, p: [3, 3], rows: ['...........o...', '..........ooo..', 'aaaaaaaaaayowoy', '..........ooo..', '...........o...'] },
  beartrap: { auto: true, p: [2, 3], rows: ['.m.m.m.m.', 'mmmmmmmmm', 'n.y...y.n', 'mmmmmmmmm', '.m.m.m.m.'] },
  shocktrap: { auto: true, p: [2, 3], rows: ['....o.o..', '...ooooo.', '.aaaaaaa.', '.acccccan', '.aaaaaaa.'] },
  firestaff: { auto: true, p: [3, 2], rows: ['..........d.oo.', '.........d.oooo', 'dddddddddddoowo', '.........d.oooo', '..........d.oo.'] },
  windstaff: { auto: true, p: [3, 2], rows: ['..........ooo.', '.........o...o', 'aaaaaaaaao.w.o', '.........o...o', '..........ooo.'] },
  voidstaff: { auto: true, p: [3, 2], rows: ['..........nnn.', '.........noon.', 'aaaaaaaaanowon', '.........noon.', '..........nnn.'] },
  // ── 근접
  rapier: { auto: true, p: [2, 2], rows: ['..yy...............', '.y..y..............', 'gggyyccccccccccccc.', '.y..y..............', '..yy...............'] },
  friendchain: { auto: true, p: [6, 2], pal: { t: '#9ae8d8', T: '#4a8a80', w: '#e8fff8', d: '#6a4a2a' }, rows: ['................ww..', '..t.T.t.......wwttw.', 'ddddddddddddddTtttwT', '..T.t.T.......wwttw.', '................ww..'] }, // 벗의 맹약: 하늘빛 사슬이 감긴 창
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
  flail: { auto: true, p: [1, 1], rows: ['........mm..', 'dddddm.m..aa', '.......m.acca', '.........acca', '..........aa.'] },
  sunsword: { auto: true, p: [4, 2], rows: ['...yy...............', '..y..y.cccccccccccc.', 'ggyoyyyaaaaaaaaaaaaw', '..y..y.bbbbbbbbbbbb.', '...yy...............'] },
  shadowblades: { auto: true, p: [1, 2], rows: ['..n..cccccc..', 'ggnnaaaaaaaa.', '..n..bbbbbb..', '...cccccc....', 'ggnaaaaaa....'] },
  judgebow: { auto: true, p: [5, 6], rows: ['.yo....', '.sy....', '.s.y...', '.s..a..', '.s...a.', '.s...a.', '.s...yo', '.s...a.', '.s...a.', '.s..a..', '.s.y...', '.sy....', '.yo....'] },
  cometgun: { auto: true, p: [5, 3], rows: ['......nnnn......', '..aaaaaaaaammmmo', '.ayyyyaaaaammmmo', '.aaaaaaaaaammmmo', '....gg.nn.......', '....gg..........'] },
  worldtree: { auto: true, p: [3, 2], rows: ['..........oo.o', '.........ddoo.', 'ddddddddddd.oo', '.........ddoo.', '..........oo.o'] },
  frostscepter: { auto: true, p: [3, 2], rows: ['..........y.y.', '.........yoooy', 'cccccccccyowoy', '.........yoooy', '..........y.y.'] },
  judgment: { auto: true, p: [2, 3], rows: ['...yyyyyyy...', '.aaaaaaaaayoo', '.ayooooooayow', '.aaaaaaaaayoo', '.gg..........', '.gg..........'] },
  harpoon: { auto: true, p: [2, 3], rows: ['..........m.', '.aaaaaaaammm', '.accccccam.m', '.aa.........', '.aa.........'] },
  torch: { auto: true, p: [1, 1], rows: ['.......ooo', 'ddddddoowo', '.......ooo'] },
  executioner: { auto: true, p: [1, 2], rows: ['........aaa.', '.......acccc', 'dddddddacccc', '.......acccc', '........aaa.'] },
  phoenixspear: { auto: true, p: [3, 1], rows: ['.............o.o.', 'ddddyddddddddyyyw', '.............o.o.'] },
  nailgun: { auto: true, p: [2, 3], rows: ['.mmmmmmm..', '.aaaaaaanm', '.abbbbba..', '.gg.......', '.gg.......'] },
  mallet: { auto: true, p: [1, 2], rows: ['........mmm', 'dddddddnmmm', '........mmm'] },
  sparkpistol: { auto: true, p: [2, 3], rows: ['......o.o.', '.cccccccoo', '.aaaaaaano', '.bbnbbbb..', '.gg.......', '.gg.......'] },
  kusarigama: { auto: true, p: [1, 2], rows: ['...........mm', '..........m..', 'dddddm.m.mm..', '.............', '.............'] },
  blastbow: { auto: true, p: [5, 6], rows: ['.a.....', '.sa....', '.s.a...', '.s..a..', '.s...a.', '.s...a.', '.s...ro', '.s...a.', '.s...a.', '.s..a..', '.s.a...', '.sa....', '.a.....'] },
  curseorb: { auto: true, p: [3, 2], rows: ['..........ooo.', '.........oowoo', 'ddddddddd.ooo.', '.........o...o', '..............'] },
  stormglaive: { auto: true, p: [4, 2], rows: ['................cc.', '..............ccaa.', 'ddddddddddddddaaaao', '...............aa..', '................o..'] },
  starfall: { auto: true, p: [3, 3], rows: ['.........o.', '........ao.', '.aaaaaaaaa.', 'nnnnnnnnnnw', '.aa.....ao.', '..a......o.'] },
  aurora: { auto: true, p: [4, 3], rows: ['....ooccccccccc..', 'bbbaaaaaaaaaaaaoo', 'bb..aannnbbbbb.ow', '....gg.nn........', '....gg...........'] },
  dragonslayer: { auto: true, p: [3, 3], rows: ['....mm.................', '...mmmmcccccccccccccccc.', 'gggmmmmaaaaaaaaaaaaaaaaw', '...mmmmbbbbbbbbbbbbbbbb.', '....mm.................'] },
  skyrail: { auto: true, p: [5, 3], rows: ['.....nnnnnnnnnnnnnnnnn.', 'bbbbbaaaaaaaaaaaaaaaaoo', 'bb...ooooooooooooooooow', '.....nnnnnnnnnnnnnnnnn.', '.....gg................', '.....gg................'] },
  firestorm: { auto: true, p: [3, 2], rows: ['..........r.oo.', '.........roooor', 'dddddddddrooowo', '.........roooor', '..........r.oo.'] },
  chainscepter: { auto: true, p: [3, 2], rows: ['...........o.o', '..........y.o.', 'aaaaaaaaaayowo', '..........y.o.', '...........o.o'] },
  sawlauncher: { auto: true, p: [2, 4], rows: ['.......mmm..', '..aaaamcccm.', '.aaaaamcwcm.', '.abbbbmcccm.', '..gg...mmm..', '..gg........'] },
  earthbreaker: { auto: true, p: [1, 2], rows: ['........aaaaa', '........acyca', 'dddddddyacyca', '........acyca', '........aaaaa'] },
  bronzesword: { auto: true, p: [2, 2], rows: ['..yy..........', 'gggyacccccccc.', '..yyaaaaaaaaaa', '..yy..........'] },
  flametwin: { auto: true, p: [1, 2], rows: ['..n..cccco.', 'ggnnaaaaaao', '..n........', '...cccco...', 'ggnaaaaao..'] },
  abyssblade: { auto: true, p: [3, 2], rows: ['..nn..............', '.n..n.cccccccccc..', 'ggnonnaaaaaaaaaaao', '.n..n.bbbbbbbbbb..', '..nn..............'] },
  emberwand: { auto: true, p: [3, 1], rows: ['.........r.', 'ddddddddroo', '.........r.'] },
  shortspear: { auto: true, p: [3, 1], rows: ['...........mm.', 'dddddddddddmmm', '...........mm.'] },
  burstpistol: { auto: true, p: [2, 3], rows: ['.ccccccc..', '.aaaaaaanm', '.bbnbbbb..', '.gg.n.....', '.gg.......'] },
  icicle: { auto: true, p: [3, 2], rows: ['..........o..', '.........ooo.', 'aaaaaaaaaowwo', '.........ooo.', '..........o..'] },
  moonscythe: { auto: true, p: [1, 3], rows: ['.........ccc.', '...........cc', '............c', 'ddddddddddddm', '.............'] },
  stickybomb: { auto: true, p: [3, 3], rows: ['...nnnnnnn...', '.aaaaaaaaaaoo', 'aacccccccaaoo', '.aaaaaaaaaaoo', '...gg........', '...gg........'] },
  dualstring: { auto: true, p: [3, 3], rows: ['.....s.......', '..y.s.mmmmmmm', 'ddddddddddddm', '..y.s.mmmmmmm', '.....s.......', '..gg.........'] },
  shockbaton: { auto: true, p: [2, 1], rows: ['.....o..o..', 'ggnaaaaaaao', '.....o..o..'] },
  ricochetrifle: { auto: true, p: [4, 3], rows: ['....cccccccccc.', 'bbbaaaaaaaaaaan', 'bb..aannbbb.y..', '....gg.nn......', '....gg.........'] },
  splitpistol: { auto: true, p: [2, 3], rows: ['.ccccccc.o.', '.aaaaaaanoo', '.bbnbbbb.o.', '.gg.n......', '.gg........'] },
  swarm: { auto: true, p: [3, 3], rows: ['..nnnnnnnnn..', '.naoaoaoaoaon', '.naaaaaaaaaan', '.naoaoaoaoaon', '..nnnnnnnnn..', '...gg........'] },
  boltjavelin: { auto: true, p: [3, 1], rows: ['.............oo.', 'dddddddddddyoooo', '.............oo.'] },
  eclipse: { auto: true, p: [4, 4], rows: ['...ooooo...', '..oaaaaao..', '.oaaaaaaao.', '.oaacccaao.', '.oaacwcaao.', '.oaacccaao.', '.oaaaaaaao.', '..oaaaaao..', '...ooooo...'] },
  venomgatling: { auto: true, p: [4, 3], rows: ['....nnnnnnnnnnn.', 'bbbaoaoaoaoaoaoo', 'bb.annnnnnnnnnn.', '....gg.cc.......', '....gg.cc.......'] },
  markdagger: { auto: true, p: [2, 1], rows: ['...r.....', 'gganmmmmm', '...r.....'] },
  shockbow: { auto: true, p: [2, 6], rows: ['..cc.........', '...cc......s.', '....cc.....s.', '.....ddddddso', '....cc.....s.', '...cc......s.', '..cc.........'] },
  flamebouncer: { auto: true, p: [2, 3], rows: ['.ccccccc.o.', '.aaaaaaanoo', '.bbnbbbb.o.', '.gg.n......', '.gg........'] },
  frostscythe: { auto: true, p: [1, 4], rows: ['..........cccc.', '............ccc', '..............c', 'ddddddddddddddm', '..............c', '.............cc', '...............'] },
  headshot: { auto: true, p: [5, 3], rows: ['.....nnnnnnn........', '.....nooooon........', 'bbbbaaaaaaaaaaaaaaaan', 'bb...aanbb..........', '.....gg.............', '.....gg.............'] }
});

Object.assign(WEAPON_SPRITE, {
  weapon_friendchain_001: 'friendchain',
  weapon_pistol_001: 'pistol2', weapon_revolver_001: 'revolver', weapon_flintlock_001: 'flintlock', weapon_watergun_001: 'watergun',
  weapon_dual_001: 'dual', weapon_laser_001: 'laser2', weapon_smg_001: 'smg2', weapon_rivet_001: 'rivet', weapon_burst_001: 'rifle2',
  weapon_rifle_001: 'sniper2', weapon_plasma_001: 'plasma', weapon_railgun_001: 'railgun', weapon_bounce_001: 'orbgun',
  weapon_tesla_001: 'tesla', weapon_shotgun_001: 'shotgun2', weapon_doublebarrel_001: 'double', weapon_blunderbuss_001: 'blunderbuss',
  weapon_scatter_001: 'scatter', weapon_launcher_001: 'orbcannon', weapon_homing_001: 'missilepod', weapon_rocket_001: 'rocket',
  weapon_cluster_001: 'cluster', weapon_mine_001: 'mine', weapon_flame_001: 'flamer', weapon_acid_001: 'sprayer',
  weapon_wand_001: 'wand2', weapon_frost_001: 'froststaff', weapon_staff_001: 'starstaff', weapon_lightning_001: 'boltstaff',
  weapon_firestaff_001: 'firestaff', weapon_poisonfan_001: 'fanknives', weapon_icetrap_001: 'beartrap', weapon_twinaxe_001: 'spinaxe', weapon_lightdisc_001: 'chakram', weapon_meteorstaff_001: 'starstaff', weapon_thunderhammer_001: 'quakehammer', weapon_inferno_001: 'infernostaff', weapon_holystaff_001: 'holystaff', weapon_beartrap_001: 'beartrap', weapon_shocktrap_001: 'shocktrap', weapon_windstaff_001: 'windstaff', weapon_void_001: 'voidstaff',
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
  weapon_harpoon_001: 'harpoon', weapon_cursestaff_001: 'voidstaff', weapon_magicgun_001: 'revolver', weapon_manastaff_001: 'froststaff',
  weapon_dragonmaw_001: 'blunderbuss', weapon_torch_001: 'torch', weapon_vampdagger_001: 'kitchenknife', weapon_executioner_001: 'executioner',
  weapon_phoenixspear_001: 'phoenixspear', weapon_hunterbow_001: 'shortbow',
  weapon_autopistol_001: 'pistol2', weapon_ironstaff_001: 'froststaff', weapon_scatterstaff_001: 'starstaff', weapon_fireshotgun_001: 'shotgun2',
  weapon_blizzardstaff_001: 'crystalstaff', weapon_homingdual_001: 'dual', weapon_splitplasma_001: 'plasma', weapon_woodspear_001: 'lance',
  weapon_frostdagger_001: 'kitchenknife', weapon_flail_001: 'flail', weapon_viperwhip_001: 'whip', weapon_twinxbow_001: 'repeatxbow',
  weapon_cometgun_001: 'cometgun', weapon_worldtree_001: 'worldtree', weapon_frostscepter_001: 'frostscepter', weapon_sunsword_001: 'sunsword',
  weapon_shadowblades_001: 'shadowblades', weapon_judgebow_001: 'judgebow', weapon_judgment_001: 'judgment',
  weapon_dartgun_001: 'dartgun', weapon_waterballoon_001: 'sling', weapon_iceshuriken_001: 'shuriken', weapon_beehive_001: 'beehive',
  weapon_crystalstaff_001: 'crystalstaff', weapon_thunderjavelin_001: 'javelin', weapon_goldrevolver_001: 'revolver',
  weapon_nailgun_001: 'nailgun', weapon_ironmallet_001: 'mallet', weapon_sparkpistol_001: 'sparkpistol', weapon_kusarigama_001: 'kusarigama', weapon_blastbow_001: 'blastbow',
  weapon_curseorb_001: 'curseorb', weapon_stormglaive_001: 'stormglaive', weapon_starfall_001: 'starfall', weapon_aurora_001: 'aurora',
  weapon_dragonslayer_001: 'dragonslayer', weapon_skyrail_001: 'skyrail', weapon_firestorm_001: 'firestorm', weapon_chainscepter_001: 'chainscepter', weapon_sawlauncher_001: 'sawlauncher',
  weapon_earthbreaker_001: 'earthbreaker', weapon_bronzesword_001: 'bronzesword', weapon_flametwin_001: 'flametwin', weapon_abyssblade_001: 'abyssblade',
  weapon_emberwand_001: 'emberwand', weapon_shortspear_001: 'shortspear', weapon_burstpistol_001: 'burstpistol', weapon_icicle_001: 'icicle', weapon_moonscythe_001: 'moonscythe', weapon_stickybomb_001: 'stickybomb',
  weapon_dualstring_001: 'dualstring', weapon_shockbaton_001: 'shockbaton', weapon_ricochetrifle_001: 'ricochetrifle', weapon_splitpistol_001: 'splitpistol', weapon_swarm_001: 'swarm', weapon_boltjavelin_001: 'boltjavelin', weapon_eclipse_001: 'eclipse',
  weapon_venomgatling_001: 'venomgatling', weapon_markdagger_001: 'markdagger', weapon_shockbow_001: 'shockbow', weapon_flamebouncer_001: 'flamebouncer', weapon_frostscythe_001: 'frostscythe',
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
function rotatedWeapon(def, angle, themeKey) {
  const spr = weaponSprite(def, themeKey); // 회전 캐시는 테마별 그림 객체에 따로 붙음
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
