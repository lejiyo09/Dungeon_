'use strict';
// ════════════════════════════════════════════
// 고유 스킨 전용 VFX (미기록자 · 최초의 탐험가 · 시원체)
//  · 스킨은 직업(영웅 ID) 단위 — 어떤 진화 계열이든 고유 스킨을 착용하면 모든 스킬·공통 동작에 적용
//  · 순수 시각 효과: 스킬 판정·피해·쿨타임·투사체 이동·난수(Math.random)에 손대지 않음
//    (스킬이 끝난 뒤 새로 생긴 포탑·장판·투사체를 '읽기만' 해서 위치를 얻음, 장식 난수는 uvRand)
//  · 에셋: assets/unique_vfx/ — 스킬 8프레임 64×64 1회 + *_active 6프레임 반복, 공통 6×10 (32×32, 행: 오라·대기·이동·대시·무기·획득·사용·피격·회복·사망)
//  · 층: floor(바닥: 장판·발자국·지속 고리) → 캐릭터 뒤 오라 → 캐릭터 → 캐릭터 앞 대기 반짝임 → top(시전·타격·투사체 꼬리)
// ════════════════════════════════════════════
const UVFX_BASE = 'assets/unique_vfx/';
const UVFX_THEMES = { // 테마 → 공통 시트 · 스킬 폴더 · 영웅
  unrecorded: { common: 'common/unrecorded_common_vfx.png', dir: 'engineer', hero: 'hero_engineer' },
  first_explorer: { common: 'common/first_common_vfx.png', dir: 'swordsman', hero: 'hero_swordsman' },
  primordial: { common: 'common/primordial_common_vfx.png', dir: 'druid', hero: 'hero_druid' }
};
const UVFX_ROW = { aura: 0, idle: 1, move: 2, dash: 3, weapon: 4, pickup: 5, use: 6, hit: 7, heal: 8, death: 9 };
const UVFX_SKILLS = {
  engineer: ['turret', 'turret2', 'barrage', 'drones', 'drones2', 'droneswarm', 'barrier', 'barrier2', 'fortress', 'trapfire', 'trapgrid', 'deathsentry'],
  swordsman: ['whirlwind', 'whirlwind2', 'swordrain', 'cleave', 'cleave3', 'quake', 'charge', 'triplethrust', 'skyspear', 'spellblade'],
  druid: ['wolves', 'wolves2', 'guardian', 'thornfield', 'thornburst', 'ancientroot', 'bearform', 'bearform2', 'primal']
};
const UVFX_ACTIVE = new Set(['turret', 'turret2', 'drones', 'drones2', 'droneswarm', 'barrier', 'barrier2', 'fortress', 'trapgrid', 'deathsentry', 'wolves', 'wolves2', 'guardian', 'thornfield', 'ancientroot', 'bearform', 'bearform2', 'primal']);
const UVFX_SLOW = new Set(['barrage', 'fortress', 'swordrain', 'guardian', 'primal']); // 110ms 프레임 (나머지 90ms)
// 스킬별 배치: cast = 시전 효과 위치, layer, scale, rot = 시트 속 기본 방향(라디안, 오른쪽=0), active = 지속 반복 대상, trail = 스킬 투사체 꼬리, hit = 타격 표시
//  self: 캐릭터 발밑 · aim: 조준 지점(사거리 제한) · line: 조준 방향 직선 가운데 · path: 돌진 경로 가운데 · ally: 새로 생긴 소환물마다 · zone: 새 장판 위치(반지름에 맞춘 배율) · zoneEnd: 장판이 끝날 때 그 자리 · strikeEnd: 지연 타격이 터질 때
const UVFX_SPEC = {
  turret: { cast: 'ally', layer: 'top', scale: 1, active: 'ally' },
  turret2: { cast: 'ally', layer: 'top', scale: 1, active: 'ally' },
  barrage: { cast: 'aim', range: 200, layer: 'floor', scale: 2, hit: 'strikeEnd' },
  drones: { cast: 'self', layer: 'top', scale: 1, active: 'ally' },
  drones2: { cast: 'self', layer: 'top', scale: 1, active: 'ally' },
  droneswarm: { cast: 'self', layer: 'floor', scale: 3, active: 'ally' },
  barrier: { cast: 'zone', layer: 'floor', active: 'zone' },
  barrier2: { cast: 'zone', layer: 'floor', active: 'zone' },
  fortress: { cast: 'zone', layer: 'floor', active: 'zone' },
  trapfire: { cast: 'zoneEnd', layer: 'top', scale: 2, trail: 'zone' },
  trapgrid: { cast: 'zone', layer: 'floor', active: 'zone' },
  deathsentry: { cast: 'zone', layer: 'top', scale: 1, active: 'zone' },
  whirlwind: { cast: 'self', layer: 'top', scale: 2, alpha: 0.85 },
  whirlwind2: { cast: 'self', layer: 'top', scale: 2, alpha: 0.85, trail: 'proj' },
  swordrain: { cast: 'aim', range: 170, layer: 'top', scale: 2, hit: 'strikeEnd' },
  cleave: { cast: 'line', len: 130, layer: 'floor', scale: 2, rot: -0.26, hit: 'now' },
  cleave3: { cast: 'line', len: 140, layer: 'floor', scale: 2, rot: -0.35, hit: 'now' },
  quake: { cast: 'self', layer: 'floor', scale: 4, hit: 'later' },
  charge: { cast: 'path', layer: 'top', scale: 2, rot: -0.31, hit: 'now' },
  triplethrust: { cast: 'line', len: 120, layer: 'top', scale: 2, rot: 0, hit: 'now' },
  skyspear: { cast: 'strikeEnd', layer: 'top', scale: 2, beam: true, hit: 'now' },
  spellblade: { cast: 'self', layer: 'top', scale: 2, alpha: 0.85, trail: 'proj' },
  wolves: { cast: 'self', layer: 'top', scale: 1, active: 'ally' },
  wolves2: { cast: 'self', layer: 'top', scale: 1, active: 'ally' },
  guardian: { cast: 'self', layer: 'top', scale: 2, alpha: 0.9, active: 'ally' },
  thornfield: { cast: 'zone', layer: 'floor', active: 'zone' },
  thornburst: { cast: 'self', layer: 'floor', scale: 3, trail: 'proj' },
  ancientroot: { cast: 'self', layer: 'floor', scale: 4, alpha: 0.8, active: 'time', activeTime: 3, activeScale: 2, activeAlpha: 0.6, hit: 'now' },
  bearform: { cast: 'self', layer: 'top', scale: 1, alpha: 0.85, active: 'transform' },
  bearform2: { cast: 'self', layer: 'top', scale: 1, alpha: 0.85, active: 'transform' },
  primal: { cast: 'self', layer: 'top', scale: 2, alpha: 0.85, active: 'transform' }
};
const UVFX_BY_SPRITE = {}; // 'u_unrecorded' → 'unrecorded' (heroes.js 의 SKINS.uniqueTheme)
if (typeof SKINS !== 'undefined') for (const K of SKINS) if (K.uniqueTheme) UVFX_BY_SPRITE[K.sprite] = K.uniqueTheme;
let _uvSeed = 0x2f6e2b1; function uvRand() { _uvSeed = (_uvSeed * 1664525 + 1013904223) >>> 0; return _uvSeed / 4294967296; } // 장식 전용 난수 (게임 난수 흐름과 분리)

const UVFX = {
  imgs: {}, list: [], st: new WeakMap(), time: 0, enabled: true,
  img(path) { // 지연 로딩 (픽셀아트: 그릴 때 smoothing 끔)
    let im = this.imgs[path];
    if (!im) { im = this.imgs[path] = new Image(); im.onerror = () => { im.failed = true; }; im.src = UVFX_BASE + path; }
    return im.complete && im.naturalWidth ? im : null;
  },
  preload(theme) { const T = UVFX_THEMES[theme]; if (!T) return; this.img(T.common); for (const id of UVFX_SKILLS[T.dir]) { this.img(`skills/${T.dir}/${id}.png`); if (UVFX_ACTIVE.has(id)) this.img(`skills/${T.dir}/${id}_active.png`); } },
  themeOfSprite(sk) { return (sk && UVFX_BY_SPRITE[sk]) || null; },
  bodyTheme(p, sk) { const th = this.themeOfSprite(sk); return th && p && p.hero && UVFX_THEMES[th].hero === p.hero.id ? th : undefined; }, // 그릴 때 쓰는 테마 (플레이어마다 따로)
  themeOf(game, p) { // 이 플레이어가 지금 입고 있는 고유 스킨의 테마 (영웅 ID가 맞을 때만, 계열은 무관)
    if (!p || !p.hero) return null;
    const sk = p.skinShown !== undefined ? p.skinShown : p.remoteSkin !== undefined ? p.remoteSkin : (game && (game.player === p || (game.coop && game.coop.me === p)) && game.skinSprite ? game.skinSprite(p.hero.id, game.playerLineId ? game.playerLineId(p) : undefined) : null);
    const th = this.themeOfSprite(sk); return th && UVFX_THEMES[th].hero === p.hero.id ? th : null;
  },
  // ── 인스턴스: { sheet, row, cell, frames, ms, loop, x, y, follow, until, layer, scale, rot, alpha, t, delay, fade, reverse }
  add(o) { if (!this.enabled) return null; const I = Object.assign({ row: 0, cell: 64, frames: 8, ms: 90, loop: false, layer: 'top', scale: 1, rot: 0, alpha: 1, t: 0, delay: 0 }, o); this.list.push(I); if (this.list.length > 260) this.list.splice(0, this.list.length - 260);
    if (!I.pending && !I.remote) this.netAdd(I); return I; },
  // ── 멀티: 방장에서 생긴 효과를 참가자에게 (스냅샷에 실어 보냄) — 소환물·장판은 nid, 플레이어는 접속 ID로 따라감
  net: { a: [], e: [], uid: 0 },
  netGame() { const g = typeof game !== 'undefined' ? game : null; return g && g.coop && g.coop.host && typeof Net !== 'undefined' && Net.inRoom ? g : null; },
  netPid(g, p) { if (!p || !g || !g.coop) return null; if (p === g.coop.me) return Net.id; for (const R of (g.remotes || new Map()).values()) if (R.p === p) return R.id; return null; },
  netAdd(I) {
    const g = this.netGame(); if (!g) return;
    I.uid = ++this.net.uid; I.synced = true;
    const r = { u: I.uid, s: I.sheet, r: I.row, c: I.cell, f: I.frames, m: I.ms, x: Math.round(I.x), y: Math.round(I.y), ly: I.layer === 'floor' ? 0 : 1 };
    if (I.loop) r.l = 1; if (I.scale !== 1) r.sc = I.scale; if (I.rot) r.ro = Math.round(I.rot * 100) / 100; if (I.alpha !== 1) r.a = Math.round(I.alpha * 100) / 100; if (I.delay) r.d = Math.round(I.delay * 100) / 100;
    if (I.life != null) r.lf = I.life; if (I.reverse) r.rv = 1; if (I.fadeOut) r.fo = 1; if (I.kind) r.k = I.kind; if (I.ox) r.ox = I.ox; if (I.oy) r.oy = I.oy;
    const F = I.follow;
    if (F) { if (typeof Player !== 'undefined' && F instanceof Player) r.fp = this.netPid(g, F);
      else if ([...g.zones, ...g.allies].includes(F)) { if (!F.nid) F.nid = ++g.coop.nid; r.fz = F.nid; }
      else if (F.dx !== undefined && F.speed) { r.vx = Math.round(F.dx * F.speed); r.vy = Math.round(F.dy * F.speed); r.lf = r.lf || 3; } }
    const owner = I.pl || (typeof Player !== 'undefined' && F instanceof Player ? F : null); const pid = this.netPid(g, owner); if (pid != null) r.o = pid; // 이 효과의 주인 (참가자 자기 공통 효과는 참가자 화면에서 직접 만듦)
    if (this.net.a.length < 80) this.net.a.push(r);
  },
  netEnd(I) { if (I.synced && this.netGame() && this.net.e.length < 120) this.net.e.push(I.uid); },
  drainNet() { if (!this.net.a.length && !this.net.e.length) return undefined; const out = { a: this.net.a.splice(0), e: this.net.e.splice(0) }; return out; },
  applyNet(g, d) { // 참가자 화면
    const OWN = /^(move|dash|weapon|hit|heal|death|pickup|use)$/; const me = typeof Net !== 'undefined' ? Net.id : null;
    for (const r of d.a || []) {
      if (r.o === me && OWN.test(r.k || '')) continue; // 내 캐릭터의 공통 효과는 내 화면이 직접 만듦 (중복 방지)
      const o = { sheet: r.s, row: r.r, cell: r.c, frames: r.f, ms: r.m, x: r.x, y: r.y, layer: r.ly ? 'top' : 'floor', loop: !!r.l, scale: r.sc || 1, rot: r.ro || 0, alpha: r.a == null ? 1 : r.a, delay: r.d || 0, reverse: !!r.rv, fadeOut: !!r.fo, kind: r.k, remote: true, uid: r.u, ox: r.ox || 0, oy: r.oy || 0 };
      if (r.lf != null) o.life = r.lf; else if (o.loop) o.life = 60; // 반복 효과는 방장의 끝 신호로 사라짐 (안전 상한 60초)
      if (r.fz != null) { const Z = g.coop && g.coop.zones; o.follow = Z ? Z.get(r.fz) : null; o.until = () => !(Z && Z.has(r.fz)); if (!o.follow) o.follow = null; }
      else if (r.fp != null) { o.follow = r.fp === me ? g.player : (g.coop && g.coop.others && g.coop.others.get(r.fp) ? g.coop.others.get(r.fp).p : null); }
      else if (r.vx != null) { o.vx = r.vx; o.vy = r.vy; }
      this.add(o);
    }
    if (d.e && d.e.length) { const E = new Set(d.e); for (const I of this.list) if (I.remote && E.has(I.uid)) I.dead = true; this.list = this.list.filter((I) => !I.dead); }
  },
  common(theme, name, x, y, o = {}) { const T = UVFX_THEMES[theme]; if (!T) return null; return this.add(Object.assign({ sheet: T.common, row: UVFX_ROW[name], cell: 32, frames: 6, ms: 100, x, y, kind: name, pl: this.curPlayer || null }, o)); },
  skill(theme, id, x, y, o = {}) { const T = UVFX_THEMES[theme]; if (!T || !UVFX_SKILLS[T.dir].includes(id)) return null; return this.add(Object.assign({ sheet: `skills/${T.dir}/${id}.png`, cell: 64, frames: 8, ms: UVFX_SLOW.has(id) ? 110 : 90, x, y, kind: 'skill:' + id }, o)); },
  active(theme, id, o) { const T = UVFX_THEMES[theme]; if (!T || !UVFX_ACTIVE.has(id)) return null; return this.add(Object.assign({ sheet: `skills/${T.dir}/${id}_active.png`, cell: 64, frames: 6, ms: 140, loop: true, layer: 'floor', kind: 'active:' + id, theme, id }, o)); },
  clear() { this.list.length = 0; },
  count(kind) { return this.list.filter((I) => !kind || (I.kind || '').indexOf(kind) === 0).length; },
  zoneScale(r) { return Math.max(1, Math.round((r * 2) / 64)); }, // 장판 반지름에 맞춘 정수 배율 (픽셀 선명도 유지)
  // ── 스킬: useSkill 직후 호출 (새로 생긴 것들만 비교)
  snap(game) { const p = game.player; return { allies: new Set(game.allies), zones: new Set(game.zones), proj: new Set(game.projectiles), hp: new Map(game.enemies.map((e) => [e, e.hp])), x: p.x, y: p.y, cd: p.skillCooldown, ds: p.dsCharges, skill: p.skillId, tf: p.transformT || 0, mw: game.mouseWorld ? game.mouseWorld() : { x: p.x, y: p.y } }; },
  afterSkill(game, S) {
    const p = game.player, theme = this.themeOf(game, p); if (!theme) return;
    const id = S.skill, spec = UVFX_SPEC[id]; if (!spec) return;
    const newAllies = game.allies.filter((a) => !S.allies.has(a)), newZones = game.zones.filter((z) => !S.zones.has(z)), newProj = game.projectiles.filter((q) => !S.proj.has(q));
    const cast = p.skillCooldown > S.cd + 0.01 || (S.ds != null && p.dsCharges < S.ds) || newAllies.length || newZones.length || newProj.length || (p.transformT || 0) > S.tf + 0.01 || p.whirl > 0;
    if (!cast) return; // 봉인·충전 부족 등으로 실제로 안 나간 경우
    this.preload(theme);
    const A = Math.atan2(p.aim.y, p.aim.x), base = { layer: spec.layer, scale: spec.scale || 1, alpha: spec.alpha || 1 };
    const aimAt = (range) => { const dx = S.mw.x - S.x, dy = S.mw.y - S.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, range / d); return { x: S.x + dx * k, y: S.y + dy * k }; };
    const zoneMain = newZones.find((z) => z.r || z.radius) || newZones[0];
    const strikes = newZones.filter((z) => typeof Strike !== 'undefined' && z instanceof Strike);
    switch (spec.cast) {
      case 'self': this.skill(theme, id, p.x, p.y, base); break;
      case 'aim': { const c = aimAt(spec.range); this.skill(theme, id, c.x, c.y, base); break; }
      case 'line': { const L = spec.len; this.skill(theme, id, S.x + Math.cos(A) * L / 2, S.y + Math.sin(A) * L / 2, Object.assign({}, base, { rot: A - spec.rot })); break; }
      case 'path': { const L = Math.hypot(p.x - S.x, p.y - S.y); this.skill(theme, id, (S.x + p.x) / 2 + Math.cos(A) * 10, (S.y + p.y) / 2 + Math.sin(A) * 10, Object.assign({}, base, { rot: A - spec.rot, scale: L > 40 ? spec.scale : 1 })); break; }
      case 'ally': for (const a of newAllies) this.skill(theme, id, a.x, a.y, base); break;
      case 'zone': if (zoneMain) this.skill(theme, id, zoneMain.x, zoneMain.y, Object.assign({}, base, { scale: spec.scale || this.zoneScale(zoneMain.r || zoneMain.radius || 32), follow: zoneMain, ox: 0, oy: 0 })); break;
      case 'zoneEnd': if (zoneMain) this.add({ pending: 'zoneEnd', watch: zoneMain, theme, id, opts: base, layer: spec.layer, kind: 'wait:' + id }); break;
      case 'strikeEnd': for (const z of strikes.slice(0, 1)) this.add({ pending: 'strikeEnd', watch: z, theme, id, opts: base, layer: spec.layer, kind: 'wait:' + id }); break;
    }
    if (spec.beam) for (let d = 16; d < 300; d += 28) this.common(theme, 'weapon', S.x + Math.cos(A) * d, S.y + Math.sin(A) * d, { rot: A, layer: 'top', delay: d / 900, alpha: 0.8 }); // 천공 투창: 창이 지나간 자리
    // 지속 반복: 소환물·장판·변신·고정 시간 — 대상이 사라지면 사라지는 효과(역재생 + 흐려짐)
    if (spec.active === 'ally') for (const a of newAllies) this.active(theme, id, { follow: a, until: () => a.alive === false || !game.allies.includes(a), oy: 2 });
    if (spec.active === 'zone' && zoneMain) this.active(theme, id, { follow: zoneMain, until: () => zoneMain.alive === false || !game.zones.includes(zoneMain), scale: this.zoneScale(zoneMain.r || zoneMain.radius || 32) });
    if (spec.active === 'transform') this.active(theme, id, { follow: p, until: () => !(p.transformT > 0) || p.state === 'DEAD', oy: 4 });
    if (spec.active === 'time') this.active(theme, id, { x: p.x, y: p.y, life: spec.activeTime, scale: spec.activeScale || 2, alpha: spec.activeAlpha || 1 });
    // 투사체 꼬리 + 맞은 자리
    if (spec.trail === 'proj') newProj.filter((q, i) => i % Math.max(1, Math.ceil(newProj.length / 8)) === 0).forEach((q) => this.common(theme, 'weapon', q.x, q.y, { follow: q, loop: true, until: () => !q.alive || !game.projectiles.includes(q), endHit: true, rot: Math.atan2(q.dy || 0, q.dx || 1), layer: 'top', alpha: 0.85 }));
    if (spec.trail === 'zone' && zoneMain) this.common(theme, 'weapon', zoneMain.x, zoneMain.y, { follow: zoneMain, loop: true, until: () => zoneMain.alive === false || !game.zones.includes(zoneMain), layer: 'top', oyFn: () => -(zoneMain.h || 0) });
    if (spec.hit === 'now') { let n = 0; for (const [e, hp0] of S.hp) if (e.hp < hp0 && n++ < 6) this.common(theme, 'hit', e.x, e.y - 4, { layer: 'top' }); }
    if (spec.hit === 'strikeEnd') for (const z of strikes.slice(0, 10)) this.add({ pending: 'hitEnd', watch: z, theme, layer: 'top', kind: 'wait:hit' });
    if (spec.hit === 'later') this.add({ pending: 'quakeHit', theme, x: p.x, y: p.y, life: 0.7, layer: 'top', kind: 'wait:hit', hp: S.hp, game });
  },
  // ── 공통: 매 프레임 플레이어 상태 변화를 보고 이펙트를 만듦 (모든 진화 계열 공통)
  track(game, dt) {
    const players = game.allPlayers ? game.allPlayers() : [game.player];
    for (const p of players) {
      if (!p) continue; this.curPlayer = p;
      const theme = this.themeOf(game, p); let s = this.st.get(p);
      if (!s) { s = { hp: p.hp, sh: p.shield || 0, state: p.state, step: 0, side: 1, dashT: 0, swing: p.swing, rec: p.recoil || 0, healT: 0, wT: 0, tf: 0 }; this.st.set(p, s); }
      if (theme) {
        this.preload(theme);
        if (p.state === 'DEAD' && s.state !== 'DEAD') this.common(theme, 'death', p.x, p.y - 2, { layer: 'top', scale: 2 });
        if (p.state !== 'DEAD') {
          if (p.hp < s.hp - 0.01 || (p.shield || 0) < s.sh - 0.01) this.common(theme, 'hit', p.x, p.y - 4, { layer: 'top' });
          s.healT -= dt; if (p.hp > s.hp + 0.01 && s.healT <= 0 && s.state === p.state) { this.common(theme, 'heal', p.x, p.y - 6, { layer: 'top', follow: p, oy: -6 }); s.healT = 0.45; }
          if (p.state === 'DASH') { if (s.state !== 'DASH') { this.common(theme, 'dash', p.x, p.y, { layer: 'top', rot: Math.atan2(p.dashDir.y, p.dashDir.x) }); s.dashT = 0; }
            s.dashT -= dt; if (s.dashT <= 0) { s.dashT = 0.05; this.common(theme, 'dash', p.x - p.dashDir.x * 6, p.y + 2, { layer: 'floor', rot: Math.atan2(p.dashDir.y, p.dashDir.x), alpha: 0.6, frames: 6 }); } }
          else if (p.moving) { s.step -= dt; if (s.step <= 0) { s.step = theme === 'first_explorer' ? 0.24 : 0.18; s.side = -s.side; const m = p.moveFaceDir ? p.moveFaceDir() : p.lastMoveDir, px = -m.y * 3 * s.side, py = m.x * 3 * s.side; this.common(theme, 'move', p.x + px, p.y + 7 + py, { layer: 'floor', alpha: 0.9 }); } } // 좌우 발 번갈아
          s.wT -= dt; const sw = p.swing !== s.swing && p.swing, rc = (p.recoil || 0) > s.rec + 0.05;
          if ((sw || rc) && s.wT <= 0) { s.wT = 0.1; const a = sw ? p.swing.ang : Math.atan2(p.aim.y, p.aim.x); this.common(theme, 'weapon', p.x + Math.cos(a) * 12, p.y - 1 + Math.sin(a) * 12, { layer: 'top', rot: a }); } // 기본 공격
        }
      }
      s.hp = p.hp; s.sh = p.shield || 0; s.state = p.state; s.swing = p.swing; s.rec = p.recoil || 0;
    }
    this.curPlayer = null;
  },
  event(game, p, name) { const theme = this.themeOf(game, p || game.player); if (theme && p) this.common(theme, name, p.x, p.y - 6, { layer: 'top', follow: p, oy: -6, pl: p }); }, // 획득·사용
  // ── 진행
  update(game, dt) {
    if (!this.enabled) return;
    this.time += dt;
    this.track(game, dt);
    const add = [];
    for (const I of this.list) {
      if (I.delay > 0) { I.delay -= dt; continue; }
      I.t += dt;
      if (I.pending) { // 끝나기를 기다렸다가 그 자리에 효과
        if (I.pending === 'quakeHit') { if (I.t >= I.life) { let n = 0; for (const [e, hp0] of I.hp) if (e.hp < hp0 && n++ < 8) add.push(['hit', I.theme, e.x, e.y - 4]); I.dead = true; } continue; }
        const z = I.watch; if (z && z.alive === false) { if (I.pending === 'hitEnd') add.push(['hit', I.theme, z.x, z.y]); else add.push(['skill', I.theme, I.id, z.x, z.y, I.opts]); I.dead = true; }
        else if (I.t > 8) I.dead = true; continue;
      }
      if (I.vx != null) { I.x += I.vx * dt; I.y += I.vy * dt; } // 참가자 화면: 탄 꼬리는 속도로 따라감
      if (I.follow) { if (I.follow.alive !== false) { I.x = I.follow.x + (I.ox || 0); I.y = I.follow.y + (I.oy || 0) + (I.oyFn ? I.oyFn() : 0); } }
      if (I.until && !I.ending && I.until()) { I.ending = true; I.t = 0; if (I.endHit) { add.push(['hit', null, I.x, I.y, I]); I.dead = true; continue; } if (I.kind && I.kind.indexOf('active:') === 0) add.push(['dissolve', I]); else { I.dead = true; continue; } }
      if (I.ending && I.kind && I.kind.indexOf('active:') === 0) { I.dead = true; continue; }
      if (I.life != null && I.t >= I.life) { if (I.kind && I.kind.indexOf('active:') === 0 && !I.ending) add.push(['dissolve', I]); I.dead = true; continue; }
      if (!I.loop && I.t >= I.frames * I.ms / 1000) I.dead = true;
    }
    for (const I of this.list) if (I.dead || I.ending) this.netEnd(I);
    this.list = this.list.filter((I) => !I.dead);
    for (const a of add) {
      if (a[0] === 'hit') { const th = a[1] || (a[4] && a[4].sheet && Object.keys(UVFX_THEMES).find((k) => UVFX_THEMES[k].common === a[4].sheet)); if (th) this.common(th, 'hit', a[2], a[3], { layer: 'top' }); }
      else if (a[0] === 'skill') this.skill(a[1], a[2], a[3], a[4], a[5]);
      else if (a[0] === 'dissolve') { const I = a[1], T = UVFX_THEMES[I.theme]; if (T) this.add({ sheet: `skills/${T.dir}/${I.id}.png`, cell: 64, frames: 4, ms: 90, x: I.x, y: I.y, layer: I.layer, scale: I.scale, reverse: true, fadeOut: true, kind: 'end:' + I.id }); } // 사라지는 효과: 시전 끝 4프레임 역재생 + 흐려짐
    }
  },
  // ── 픽셀아트 회전 (RotSprite 방식): Scale2x 세 번으로 8배 → 회전 → 가운데 표본으로 줄임 · 32방향 캐시 (대각선 계단 현상 줄임)
  rotCache: new Map(), rotOk: true,
  scale2x(src, w, h) {
    const out = new Uint32Array(w * h * 4), W2 = w * 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const P = src[y * w + x], A = y > 0 ? src[(y - 1) * w + x] : P, B = x < w - 1 ? src[y * w + x + 1] : P, C = x > 0 ? src[y * w + x - 1] : P, D = y < h - 1 ? src[(y + 1) * w + x] : P;
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A; if (A === B && A !== C && B !== D) e1 = B; if (D === C && D !== B && C !== A) e2 = C; if (B === D && B !== A && D !== C) e3 = D;
      const o = (y * 2) * W2 + x * 2; out[o] = e0; out[o + 1] = e1; out[o + W2] = e2; out[o + W2 + 1] = e3;
    }
    return out;
  },
  rotFrame(im, sx, sy, c, rot) {
    if (!this.rotOk) return null;
    const n = 32, k = ((Math.round(rot / TAU * n) % n) + n) % n; if (k === 0) return { cv: null, k };
    const key = im.src + '|' + sx + '|' + sy + '|' + k; let R = this.rotCache.get(key); if (R) return R;
    try {
      const t = document.createElement('canvas'); t.width = c; t.height = c; const g = t.getContext('2d'); g.drawImage(im, sx, sy, c, c, 0, 0, c, c);
      let px = new Uint32Array(g.getImageData(0, 0, c, c).data.buffer), w = c; for (let i = 0; i < 3; i++) { px = this.scale2x(px, w, w); w *= 2; } // 8배
      const D = Math.ceil(c * 1.4143) + 2, out = new ImageData(D, D), o32 = new Uint32Array(out.data.buffer), th = k / n * TAU, cs = Math.cos(th), sn = Math.sin(th), h = D / 2, hc = c / 2;
      for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) { // 결과 픽셀 가운데를 거꾸로 돌려 8배 그림에서 한 점만 표본 (색 섞지 않음)
        const dx = x + 0.5 - h, dy = y + 0.5 - h, u = (dx * cs + dy * sn + hc) * 8, v = (-dx * sn + dy * cs + hc) * 8, ui = Math.floor(u), vi = Math.floor(v);
        if (ui >= 0 && vi >= 0 && ui < w && vi < w) o32[y * D + x] = px[vi * w + ui]; }
      const cv = document.createElement('canvas'); cv.width = D; cv.height = D; cv.getContext('2d').putImageData(out, 0, 0);
      R = { cv, k, D }; if (this.rotCache.size > 1500) this.rotCache.clear(); this.rotCache.set(key, R); return R;
    } catch (e) { this.rotOk = false; return null; } // 그림을 읽을 수 없는 환경(file:// 등): 일반 회전으로
  },
  // ── 그리기
  draw(ctx, I) {
    if (I.delay > 0 || I.pending) return;
    const im = this.img(I.sheet); if (!im) return;
    let f = Math.floor(I.t * 1000 / I.ms); f = I.loop ? f % I.frames : Math.min(I.frames - 1, f);
    if (I.reverse) f = 7 - f; // 시전 시트의 7→4 역순
    const c = I.cell, s = I.scale, sx = f * c, sy = I.row * c, w = c * s;
    let a = I.alpha; if (I.fadeOut) a *= Math.max(0, 1 - I.t / (I.frames * I.ms / 1000));
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = a; ctx.translate(Math.round(I.x), Math.round(I.y));
    const R = I.rot ? this.rotFrame(im, sx, sy, c, I.rot) : null;
    if (R && R.cv) { const W = R.D * s; ctx.drawImage(R.cv, -Math.round(W / 2), -Math.round(W / 2), W, W); } // 미리 돌린 픽셀아트 (선명)
    else { if (I.rot && !R) ctx.rotate(I.rot); ctx.drawImage(im, sx, sy, c, c, -Math.round(w / 2), -Math.round(w / 2), w, w); }
    ctx.restore();
  },
  render(ctx, layer, game) {
    if (!this.enabled) return; for (const I of this.list) if (I.layer === layer) this.draw(ctx, I);
    if (layer === 'top' && game) for (const p of (game.allPlayers ? game.allPlayers() : [game.player])) { // 캐릭터가 시전·타격 효과에 묻히지 않게: 겹치면 캐릭터를 반투명으로 한 번 더
      if (!p || p.state === 'DEAD' || !this.themeOf(game, p)) continue;
      if (!this.list.some((I) => I.layer === 'top' && !I.pending && !(I.delay > 0) && Math.abs(I.x - p.x) < I.cell * I.scale / 2 + 6 && Math.abs(I.y - p.y) < I.cell * I.scale / 2 + 10)) continue;
      ctx.save(); ctx.globalAlpha = 0.6; this.redraw = true; try { p.renderBody(ctx); } finally { this.redraw = false; ctx.restore(); }
    }
  },
  renderBack(ctx, p, x, y, sk) { // 캐릭터 뒤: 오라 (발밑 반복)
    if (this.redraw) return; const th = this.themeOfSprite(sk); if (!th || UVFX_THEMES[th].hero !== p.hero.id || p.state === 'DEAD') return;
    this.preload(th); this.draw(ctx, { sheet: UVFX_THEMES[th].common, row: UVFX_ROW.aura, cell: 32, frames: 6, ms: 100, loop: true, t: (p.time || this.time), x, y: y + 5, scale: 1, alpha: 0.8 });
    if (!p.moving) this.draw(ctx, { sheet: UVFX_THEMES[th].common, row: UVFX_ROW.idle, cell: 32, frames: 6, ms: 100, loop: true, t: (p.time || this.time), x, y: y - 6, scale: 1, alpha: 0.85 }); // 가만히 있을 때 반짝임 — 캐릭터 뒤에 그려 얼굴·몸을 가리지 않음
  },
  renderFront() { } // 캐릭터 앞 층: 지금은 비워 둠 (대기 반짝임도 캐릭터를 가리지 않도록 뒤에서 그림)
};
function uLocalTheme() { return typeof game !== 'undefined' && game && game.player ? UVFX.themeOf(game, game.player) || undefined : undefined; } // 내 캐릭터의 고유 스킨 테마 (HUD·상점·도감의 장비 외형)
// ── 게임에 연결 (원래 함수는 그대로 실행하고, 앞뒤로 '읽기'만 함)
if (typeof Game !== 'undefined') {
  const G = Game.prototype;
  const _useSkill = G.useSkill; G.useSkill = function (...a) { const S = UVFX.themeOf(this, this.player) ? UVFX.snap(this) : null; const r = _useSkill.apply(this, a); if (S) UVFX.afterSkill(this, S); return r; };
  const _update = G.update; G.update = function (dt) { const t0 = this.time; const r = _update.call(this, dt); if (this.time > t0 && !this.overlay && !this.locked) UVFX.update(this, dt); return r; };
  const _reset = G.resetWorldLists; G.resetWorldLists = function (...a) { UVFX.clear(); return _reset.apply(this, a); };
  const _collect = G.collect; G.collect = function (pk) { const r = _collect.call(this, pk); UVFX.event(this, this.player, 'pickup'); return r; };
  const _give = G.giveWeapon; G.giveWeapon = function (...a) { const r = _give.apply(this, a); UVFX.event(this, this.player, 'pickup'); return r; };
  const _treasure = G.useTreasure; G.useTreasure = function (...a) { const p = this.player, cd = p && p.treasureCd; const r = _treasure.apply(this, a); if (p && p.treasureCd > (cd || 0)) UVFX.event(this, p, 'use'); return r; };
  const _interact = G.updateInteraction; G.updateInteraction = function (input) { const pressed = input && input.wasPressed && input.wasPressed('KeyE'); const r = _interact.call(this, input); if (pressed && this.interactTarget) UVFX.event(this, this.player, 'use'); return r; };
}
