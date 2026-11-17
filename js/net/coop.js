'use strict';
// ════════════════════════════════════════════
// 멀티 2단계: 함께 던전 (2~4인 협동)
//  · 방장: 게임 전체를 계산 (적·탄·피해·보상). 참가자 캐릭터도 방장 세계 안의 Player로 존재
//  · 참가자: 자기 캐릭터 이동·대시만 직접 처리(반응성) + 조준·공격·스킬·보구·상호작용 입력을 방장에게 보냄
//            방장이 보낸 화면 상태(맵·적·탄·아이템·다른 플레이어·연출)를 받아 그림
//  · 인원별 난이도: 몬스터 수·체력, 보스 체력, 정예 확률 (MULTIPLAYER.md)
// ════════════════════════════════════════════
const COOP = {
  snapHz: 12,  // 방장 → 참가자 화면 상태 (초당) — 사이는 참가자가 속도로 이어서 그림 (데이터 절약)
  inHz: 20,    // 참가자 → 방장 입력 (초당)
  scale: { mobCount: 0.5, mobHp: 0.25, bossHp: 0.7, elite: 0.03 }, // 1명 늘 때마다
  reviveRatio: 0.3, // 쓰러진 사람은 다음 스테이지에서 최대 체력 30%로 부활
  reviveTime: 3, reviveRange: 24, reviveHp: 0.4, // 동료가 곁에 3초 있으면 그 자리에서 체력 40%로 일어남
  events: ['KeyF', 'Mouse2', 'KeyR', 'KeyE', 'KeyQ', 'Wheel'], // 참가자 → 방장으로 보내는 순간 입력 (대시는 참가자가 직접)
  fx: ['text', 'spark', 'ring', 'slash', 'lightning', 'burst', 'muzzle', 'impact', 'explosion', 'death', 'goldBurst', 'beamline', 'sparkle', 'heal', 'rays', 'skyBeam', 'reaction', 'excalibur', 'solomonSeal'] // 참가자 화면에도 보여 줄 연출
};
class VirtualInput { // 방장 쪽에서 참가자의 입력을 흉내 냄
  constructor() { this.down = new Set(); this.pressed = new Set(); this.typed = []; this.mouse = { x: 0, y: 0, down: false, rdown: false }; }
  isDown(c) { return this.down.has(c); }
  wasPressed(c) { return this.pressed.has(c); }
  endStep() { this.pressed.clear(); }
}
const NULL_INPUT = new VirtualInput(); // 창을 연 방장의 캐릭터는 가만히
const b64 = { enc: (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); },
  dec: (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; } };
const r1 = (v) => Math.round(v * 10) / 10;
// 장판·소환물 공유: 클래스 이름으로 다시 만들어 그림만 그림 (처음엔 전부, 그다음엔 움직이는 값만)
const COOP_CLASSES = {};
['RhongoTower', 'BossRhongoTower', 'ChainCircle', 'AvalonGarden', 'SkillAura', 'SkillCast', 'ExcaliburRaise', 'FxEmitter', 'DarkHole', 'ShadowStrike', 'Trap', 'Strike', 'Sanctuary', 'SpiritWolf', 'Turret', 'Drone', 'Puddle',
  'ThornBurst', 'BleedTicker', 'GaeBolgThrow'].forEach((n) => { try { const c = Function('return typeof ' + n + " !== 'undefined' ? " + n + ' : null')(); if (c) COOP_CLASSES[n] = c; } catch (e) { /* 없는 클래스 */ } });
function coopPackRef(v) { // 적·플레이어 같은 큰 객체는 위치 정도만
  if (v instanceof Player) return { $p: 1, x: r1(v.x), y: r1(v.y), aim: { x: r1(v.aim.x), y: r1(v.aim.y) }, half: v.half, radius: v.radius, state: v.state, faceVis: v.faceVis, hero: { id: v.hero.id } };
  if (v instanceof Enemy) return { $e: 1, x: r1(v.x), y: r1(v.y), alive: v.alive, chainT: r1(v.chainT || 0), radius: v.radius, half: v.half };
  return undefined;
}
function coopPack(o, full) {
  const out = { c: o.constructor.name, n: o.nid };
  for (const k of Object.keys(o)) {
    const v = o[k]; if (typeof v === 'function' || k === 'nid') continue;
    if (typeof v === 'number') out[k] = r1(v);
    else if (typeof v === 'string' || typeof v === 'boolean' || v === null) out[k] = v;
    else if (typeof v === 'object') {
      const ref = coopPackRef(v); if (ref) { out[k] = ref; continue; }
      if (DATA_TREASURES.includes(v)) { out[k] = { $t: v.id }; continue; }
      if (v.id && typeof v.id === 'string' && v.rarity) { out[k] = { $w: v.id }; continue; }
      if (Array.isArray(v) && v.length && (v[0] instanceof Enemy || v[0] instanceof Player)) { out[k] = v.map(coopPackRef); continue; }
      if (!full) continue;
      try { const j = JSON.stringify(v); if (j.length < 20000) out[k] = JSON.parse(j); } catch (e) { /* 순환 참조 등은 건너뜀 */ }
    }
  }
  return out;
}
function coopUnpack(d) {
  for (const k of Object.keys(d)) { const v = d[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) { if (v.$t) d[k] = DATA_TREASURES.find((t) => t.id === v.$t) || null; else if (v.$w) d[k] = GAME_DATA.weapons.get(v.$w) || null; else if (v.$p && v.hero) v.hero = GAME_DATA.heroes.get(v.hero.id) || DATA_HEROES[0]; } }
  return d;
}

Object.assign(Game.prototype, {
  // ── 공통
  allPlayers() { return this.coop && this.coop.host ? [this.coop.me, ...[...this.remotes.values()].map((r) => r.p)] : [this.player]; },
  withPlayer(P, fn) { const o = this.player; this.player = P; try { return fn(); } finally { this.player = o; } },
  nearestPlayer(x, y) {
    if (!(this.coop && this.coop.host)) return this.player;
    let best = null, bd = 1e9; for (const p of this.allPlayers()) { if (p.state === 'DEAD') continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    return best || this.coop.me;
  },
  partyCount() { return this.coop && this.coop.host ? 1 + this.remotes.size : 1; },
  partyScale(kind) { return 1 + COOP.scale[kind] * (this.partyCount() - 1); },
  coopActors() { // 내 화면에 그릴 다른 플레이어들 (이름표 포함)
    if (!this.coop) return [];
    const list = this.coop.host ? [...this.remotes.values()].map((r) => [r.p, Net.nameOf(r.id)]) : [...(this.coop.others || new Map()).values()].map((o) => [o.p, Net.nameOf(o.id)]);
    const ring = (ctx, p) => { if (p.state !== 'DEAD') return; const k = Math.min(1, (p.reviveT || 0) / COOP.reviveTime); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(Math.round(p.x), Math.round(p.y), 12, 0, TAU); ctx.stroke(); if (k > 0) { ctx.strokeStyle = '#7affc0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.round(p.x), Math.round(p.y), 12, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); ctx.lineWidth = 1; } };
    const out = list.map(([p, name]) => ({ y: p.y, render: (ctx) => { p.render(ctx); ring(ctx, p); hudText(ctx, name + (p.state === 'DEAD' ? ' (쓰러짐 · 곁에 서서 일으키기)' : ''), Math.round(p.x), Math.round(p.y) - 22, p.state === 'DEAD' ? '#ff8a8a' : '#7affc0', 'center', 7); } }));
    const me = this.player; if (me && me.state === 'DEAD') out.push({ y: me.y + 0.01, render: (ctx) => ring(ctx, me) }); // 내가 쓰러졌을 때 일어나는 진행
    return out;
  },
  coopOnNet(m) {
    if (!this.coop) { if (m.t === 'relay' && m.data && m.data.k === 'start' && this.mode === 'lobby' && !this.transition) this.coopGuestStart(m.from, !!m.data.deep); return; }
    if (m.t === 'players') {
      if (this.coop.host) { for (const id of [...this.remotes.keys()]) if (!Net.players.some((p) => p.id === id)) this.remotes.delete(id); }
      else if (!Net.players.some((p) => p.id === this.coop.hostId)) this.coopGuestEnd({ victory: false, hostLeft: true });
      return;
    }
    if (m.t === 'left') { if (this.coop.host) this.remotes.delete(m.id); return; }
    if (m.t !== 'relay' || !m.data) return;
    const d = m.data;
    if (this.coop.host) {
      if (d.k === 'setup') this.coopAddRemote(m.from, d);
      else if (d.k === 'in') { const R = this.remotes.get(m.from); if (!R) return; if (d.wp === R.warp) { R.rx = d.x; R.ry = d.y; } /* 방장이 옮긴 뒤 참가자가 확인하기 전의 옛 위치는 무시 */ R.aim = { x: d.ax, y: d.ay }; R.vin.mouse.down = !!d.md; R.dash = !!d.d; for (const e of d.ev || []) if (COOP.events.includes(e)) R.vin.pressed.add(e); }
      else if (d.k === 'ov') { const R = this.remotes.get(m.from); if (R) this.coopRemoteOverlay(R, d); }
      else if (d.k === 'variant') { const R = this.remotes.get(m.from); const L = R && jobLines(R.p.hero.id).find((l) => l.id === d.id); if (L && (R.p.rank === 0 || this.runDeep) && !R.variantSet) { R.variantSet = true; const keep = R.p.weapons, rk = R.p.rank; this.withPlayer(R.p, () => { this.applyVariant(L); if (this.runDeep) { R.p.weapons = keep; this.setJob(R.p, L, rk); } }); } }
    } else if (m.from === this.coop.hostId) {
      if (d.k === 'map') this.coopGuestMap(d);
      else if (d.k === 'snap') this.coopGuestSnap(d);
      else if (d.k === 'end') this.coopGuestEnd(d);
      else if (d.k === 'msg') this.showBanner(d.text, null, '#7ad0ff');
      else if (d.k === 'cut') { this.cutscene = { lines: d.lines, i: 0, t: 0, lt: 0, focus: d.focus, id: null, done: null }; this.input.mouse.down = false; }
      else if (d.k === 'ov') this.coopGuestOverlay(d.o);
    }
  },

  // ── 방장
  coopHostStart() {
    this.coop = { host: true, me: this.player, aim: null, snapT: 0, nid: 0, fx: [], lastTiles: null };
    this.remotes = new Map();
    Net.raw({ t: 'start', on: true }); Net.relay({ k: 'start', deep: !!this.runDeep });
    const E = this.effects, fx = this.coop.fx; this.coop.fxOrig = {}; // 연출을 기록해 참가자에게도 보냄
    for (const name of COOP.fx) { const orig = E[name]; this.coop.fxOrig[name] = orig; E[name] = function (...a) { if (fx.length < 90) fx.push([name, ...a.map((v) => (typeof v === 'number' ? r1(v) : v))]); return orig.apply(this, a); }; }
    this.coopSendMap();
    this.showBanner('함께 출발!', `${Net.players.length}명 협동 · 몬스터가 인원만큼 많고 단단해집니다`, '#7affc0');
  },
  coopAddRemote(id, d) {
    if (this.remotes.has(id)) return;
    const hero = this.data.heroes.get(d.hero) || DATA_HEROES[0], s = this.map.startRoom, c = this.map.tileCenter(s.cx, s.cy);
    const p = new Player(c.x + (this.remotes.size + 1) * 14, c.y + 10, hero, this.data.base), J = BALANCE.jobLevel, lv = Math.min(J.max, d.jobLv | 0);
    if (lv) { p.maxHp += J.hp * lv; p.hp = p.maxHp; p.maxEnergy += J.energy * lv; p.energy = p.maxEnergy; p.stats.attackBonus += J.atk * lv; }
    p.weapons.push(new WeaponInstance(this.weaponDef(hero.startWeapon)));
    if (d.loadout && d.loadout !== hero.startWeapon && this.data.weapons.get(d.loadout)) p.weapons.push(new WeaponInstance(this.weaponDef(d.loadout)));
    const tr = DATA_TREASURES.find((t) => t.id === d.treasure); if (tr) { p.treasure = tr; if (tr.apply) tr.apply(p); } // 보구는 각자 하나씩
    const L0 = jobLines(hero.id)[0]; if (L0) this.withPlayer(p, () => this.setJob(p, L0, 0));
    if (this.runDeep && d.cp && typeof d.cp === 'object') { this.playerFromSnapshot(hero, d.cp, p); this.useCheckpoint(p, d.cp, tr); } // 심층: 동료가 10-4를 깬 그대로
    else if (this.runDeep) this.withPlayer(p, () => this.applyDeepKit(p)); // 기록이 없으면 기본 심층 장비
    this.remotes.set(id, { id, p, vin: new VirtualInput(), aim: { x: p.x + 20, y: p.y }, warp: 0 });
    this.coopSendMap(id);
  },
  coopOnStage() { // 새 스테이지: 모두 시작 방으로, 쓰러진 사람 부활, 맵 보내기
    const s = this.map.startRoom, c = this.map.tileCenter(s.cx, s.cy); let i = 1;
    for (const p of this.allPlayers()) { if (p.state === 'DEAD') { p.state = 'NORMAL'; p.deathTimer = 0; p.hp = Math.max(1, Math.round(p.maxHp * COOP.reviveRatio)); p.hurtInvuln = 2; } }
    for (const R of this.remotes.values()) { R.p.x = c.x + (i % 2 ? 14 : -14) * Math.ceil(i / 2); R.p.y = c.y + 10; R.p.shield = R.p.maxShield; R.warp++; R.rx = undefined; i++; }
    this.coopSendMap();
  },
  coopSendMap(to) {
    const m = this.map, idx = new Map(m.rooms.map((r, i) => [r, i]));
    this.coop.lastTiles = m.tiles.slice();
    const spawn = {}; for (const R of this.remotes.values()) spawn[R.id] = { x: Math.round(R.p.x), y: Math.round(R.p.y) };
    Net.relay({ k: 'map', w: m.width, h: m.height, palette: m.palette, tiles: b64.enc(m.tiles), wi: this.worldIdx, li: this.levelIdx,
      rooms: m.rooms.map((r) => ({ x0: r.x0, y0: r.y0, w: r.w, h: r.h, cx: r.cx, cy: r.cy, gx: r.gx, gy: r.gy, type: r.type, doors: r.doors })),
      start: idx.get(m.startRoom), edges: m.edges.map(([a, b]) => [idx.get(a), idx.get(b)]), spawn }, to);
  },
  coopHostTickRemotes(dt) { // 참가자 캐릭터: 위치는 참가자가 보낸 대로, 공격·스킬·보구·상호작용은 방장이 계산
    for (const R of this.remotes.values()) {
      const p = R.p;
      if (p.state === 'DEAD') { p.deathTimer += dt; R.vin.endStep(); continue; }
      if (R.setX !== undefined) { const dx = p.x - R.setX, dy = p.y - R.setY, d = Math.hypot(dx, dy); if (d > 0.01 && d <= 12) { R.px = (R.px || 0) + dx; R.py = (R.py || 0) + dy; } } // 방장 쪽에서 끌려가거나 밀린 만큼 → 참가자에게 전달
      if (R.rx !== undefined && !overlapsSolid(R.rx, R.ry, p.half - 1, this.map)) { p.x = R.rx + (R.px || 0); p.y = R.ry + (R.py || 0); if (overlapsSolid(p.x, p.y, p.half - 1, this.map)) { p.x = R.rx; p.y = R.ry; } }
      if (R.dash) p.dashInvuln = Math.max(p.dashInvuln, 0.06);
      this.withPlayer(p, () => {
        const oi = this.input; this.input = R.vin; this.coop.aim = R.aim; const bx = p.x, by = p.y;
        p.update(dt, R.vin, this.map, R.aim);
        this.weaponSystem.update(p, dt, R.vin);
        if (R.vin.wasPressed('KeyF') || R.vin.wasPressed('Mouse2')) this.useSkill();
        if (R.vin.wasPressed('KeyR')) this.useTreasure();
        if (R.vin.wasPressed('KeyE') && !R.overlay) { const ov = this.overlay; this.updateInteraction(R.vin); if (this.overlay !== ov) { R.overlay = this.overlay; this.overlay = ov; this.coopSendOverlay(R); } } // 창이 뜨는 상호작용은 그 사람 화면에 띄움
        if (Math.hypot(p.x - bx, p.y - by) > 12) { R.warp++; R.rx = undefined; } // 스킬로 순간이동·돌진 → 참가자 화면도 옮김
        this.coop.aim = null; this.input = oi;
      });
      R.setX = p.x; R.setY = p.y;
      R.vin.endStep();
    }
    this.coopRevive(dt);
  },
  coopRevive(dt) { // 쓰러진 동료 곁에 살아 있는 사람이 3초 있으면 그 자리에서 일어남
    const all = this.allPlayers();
    for (const D of all) {
      if (D.state !== 'DEAD') { D.reviveT = 0; continue; }
      const helper = all.some((A) => A !== D && A.state !== 'DEAD' && Math.hypot(A.x - D.x, A.y - D.y) < COOP.reviveRange);
      D.reviveT = helper ? (D.reviveT || 0) + dt : Math.max(0, (D.reviveT || 0) - dt * 2);
      if (D.reviveT >= COOP.reviveTime) {
        D.state = 'NORMAL'; D.deathTimer = 0; D.reviveT = 0; D.hp = Math.max(1, Math.round(D.maxHp * COOP.reviveHp)); D.hurtInvuln = 2;
        this.effects.ring(D.x, D.y, 30, '#7affc0'); this.effects.burst(D.x, D.y, '#ffffff', 16); this.effects.heal(D.x, D.y); SFX.play('heal');
        if (D === this.coop.me) this.showBanner('동료가 일으켜 세워 주었습니다!', null, '#7affc0');
      }
    }
  },
  coopSendOverlay(R) { // 참가자 화면에 띄울 창 (방장 쪽 상태를 그림에 필요한 만큼만)
    const o = R.overlay; let d = null;
    if (o && o.type === 'buff') d = { type: 'buff', options: o.options.map((b) => b.id) };
    else if (o && o.type === 'evolve') { const hy = o.npc.hybrid; d = { type: 'evolve', branch: o.npc.branch ? o.npc.branch.id : null, msg: o.msg || null, hybrid: hy ? { h: Object.keys(HYBRID_JOBS).find((k) => HYBRID_JOBS[k] === hy.H), el: hy.el.id } : null }; }
    else if (o && o.type === 'variant') d = { type: 'variant', branch: !!o.branch };
    else if (o) { R.overlay = null; d = null; Net.relay({ k: 'msg', text: '이 창은 아직 방장만 쓸 수 있어요' }, R.id); }
    Net.relay({ k: 'ov', o: d }, R.id);
  },
  coopRemoteOverlay(R, d) { // 참가자가 창에서 고른 것을 방장 쪽에서 그 사람 대신 처리
    if (!R.overlay) { Net.relay({ k: 'ov', o: null }, R.id); return; }
    const vin = new VirtualInput(); if (d.key) vin.pressed.add(d.key);
    this.withPlayer(R.p, () => {
      const ov = this.overlay, oi = this.input; this.overlay = R.overlay; this.input = vin; this.coop.aim = R.aim;
      try {
        if (d.pick && R.overlay.onPick) { const L = jobLines(R.p.hero.id).find((l) => l.id === d.pick); if (L) { this.overlay = null; R.overlay.onPick(L); } }
        else this.updateOverlay(vin);
      } finally { R.overlay = this.overlay; this.overlay = ov; this.input = oi; this.coop.aim = null; }
    });
    this.coopSendOverlay(R);
  },
  coopNotifyEvolve(p) { if (!(this.coop && this.coop.host)) return; for (const R of this.remotes.values()) if (R.p === p) Net.relay({ k: 'msg', text: `${p.line.ranks[p.rank]}(으)로 진화! 새 스킬: ${p.skillName}` }, R.id); },
  coopHostSend(dt) {
    const C = this.coop; C.snapT -= dt; if (C.snapT > 0) return; C.snapT = 1 / COOP.snapHz;
    const pl = (p, id, warp) => ({ id, x: Math.round(p.x), y: Math.round(p.y), h: p.hero.id, lk: p.line && p.line.look ? p.line.look : null, a: r1(p.aimVis), f: p.faceVis, st: p.state === 'DEAD' ? 'X' : p.state === 'DASH' ? 'D' : 'N', mv: p.moving ? 1 : 0,
      hp: Math.ceil(p.hp), mhp: p.maxHp, sh: Math.ceil(p.shield), msh: p.maxShield, en: Math.floor(p.energy), men: p.maxEnergy, w: p.weapons.map((x) => x.def.id), wl: p.weapons.map((x) => x.lv || 0), sl: p.slot,
      sk: r1(p.skillCooldown), skm: r1(p.skillCdMax), sn: p.skillName, tr: p.treasure ? p.treasure.id : null, tc: r1(p.treasureCd), rk: p.rank, ln: p.line ? p.line.id : null, wp: warp, inv: p.hurtInvuln > 0 ? 1 : 0, rv: r1((p.reviveT || 0) / COOP.reviveTime), hy: p.hybrid ? p.hybrid.title : null });
    const players = [pl(C.me, Net.id, 0), ...[...this.remotes.values()].map((R) => { const e = pl(R.p, R.id, R.warp); if (R.px || R.py) { e.px = r1(R.px); e.py = r1(R.py); R.px = 0; R.py = 0; } return e; })];
    C.sent = C.sent || new Set(); const zs = [], seenZ = new Set();
    for (const z of [...this.zones, ...this.allies]) { if (!COOP_CLASSES[z.constructor.name]) continue; if (!z.nid) z.nid = ++C.nid; seenZ.add(z.nid); zs.push(coopPack(z, !C.sent.has(z.nid))); C.sent.add(z.nid); }
    for (const id of [...C.sent]) if (!seenZ.has(id)) C.sent.delete(id);
    const en = this.enemies.map((e) => { if (!e.nid) e.nid = ++C.nid; return [e.nid, e.def.id, Math.round(e.x), Math.round(e.y), Math.ceil(e.hp), e.maxHp, e.state, e.face, e.phase || 1, e.elite ? 1 : 0, e.hurtFlash > 0 ? 1 : 0, Math.round(e.jumpH || 0), r1(e.fade ?? 1), r1(e.aimAng || 0), r1(e.stateTime), e.laser ? [e.laser.angs.map(r1), e.laser.width, e.laser.color, e.laser.live ? 1 : 0] : 0, e.chainT > 0 ? [r1(e.chainT), r1(e.chainMax || e.chainT)] : 0]; });
    const pr = this.projectiles.filter((q) => !q.orbit).slice(0, 160).map((q) => [Math.round(q.x), Math.round(q.y), Math.round((q.dx || 0) * (q.speed || 0)), Math.round((q.dy || 0) * (q.speed || 0)), q.color, q.size || 1]);
    const eb = this.enemyBullets.slice(0, 240).map((b) => [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.r, b.color]);
    const td = []; const T = this.map.tiles, L = C.lastTiles; if (L && L.length === T.length) for (let i = 0; i < T.length; i++) if (T[i] !== L[i]) { td.push([i, T[i]]); L[i] = T[i]; }
    Net.relay({ k: 'snap', g: this.gold, kills: this.kills, wi: this.worldIdx, li: this.levelIdx, pl: players, en, pr, eb,
      pk: this.pickups.map((k) => [k.kind, Math.round(k.x), Math.round(k.y), k.def ? k.def.id : 0]),
      hz: this.hazards.map((h) => [Math.round(h.x), Math.round(h.y), h.r, r1(h.t), h.delay, h.color]),
      po: this.portals.map((p) => [Math.round(p.x), Math.round(p.y), p.label || '', p.color || null]),
      rv: this.map.rooms.map((r) => (r.visited ? 1 : 0)).join(''), td, fx: C.fx.splice(0), zs,
      pp: this.props.map((o) => { let lb = ''; try { lb = o.label ? o.label(this) || '' : ''; } catch (e) { lb = ''; } return [o.constructor.name, Math.round(o.x), Math.round(o.y), lb, o.open ? 1 : 0, o.content || 0]; }) });
  },
  coopHostEnd(victory) {
    const C = this.coop; if (!C) return;
    const stages = this.stageIndex + (victory ? 1 : 0), bosses = this.worldIdx + (victory ? 1 : 0);
    Net.relay({ k: 'end', victory, stages, bosses, row: this.runScoreRow(victory) }); Net.raw({ t: 'start', on: false });
    for (const [name, orig] of Object.entries(C.fxOrig || {})) this.effects[name] = orig; // 연출 기록 해제
    this.player = C.me; this.coop = null; this.remotes = new Map();
  },

  // ── 참가자
  coopGuestStart(hostId, deep = false) {
    SFX.stopMusic(); this.overlay = null; this.cutscene = null; this.cinematic = null; this.slowMo = null; this.trialW = null;
    this.coop = { guest: true, hostId, loading: true, others: new Map(), enemies: new Map(), inT: 0, ev: [], warp: -1 };
    this.mode = 'dungeon'; this.gold = 0; this.kills = 0;
    this.player = this.makePlayer(0, 0);
    const tr = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped); if (tr) this.player.treasure = tr;
    const cp = deep && this.deepCheckpoint(this.save.selected); // 심층: 내 직업으로 10-4를 깬 캐릭터가 있으면 그대로
    if (cp) { this.player = this.playerFromSnapshot(this.player.hero, cp); this.useCheckpoint(this.player, cp, tr); }
    Net.relay({ k: 'setup', hero: this.save.selected, treasure: this.save.treasureEquipped, loadout: this.save.loadout, jobLv: this.jobLevel(this.save.selected), cp: cp || null }, hostId);
    if (cp) return;
    const lines = jobLines(this.player.hero.id); // 갈래 고르기 (방장에게 알림)
    if (lines.length > 1 && !branchesAtEvolve(this.player.hero.id)) this.overlay = { type: 'variant', lines, title: JOB_LINES[this.player.hero.id].title, onPick: (L) => { Net.relay({ k: 'variant', id: L.id }, hostId); this.setJob(this.player, L, 0); } };
    else if (lines[0]) this.setJob(this.player, lines[0], 0);
  },
  coopGuestMap(d) {
    const m = new DungeonMap(d.w, d.h, d.palette); m.tiles = b64.dec(d.tiles);
    m.rooms = d.rooms.map((r) => Object.assign({ visited: false, state: 'idle' }, r)); m.edges = d.edges.map(([a, b]) => [m.rooms[a], m.rooms[b]]); m.startRoom = m.rooms[d.start];
    this.worldIdx = d.wi; this.levelIdx = d.li;
    this.resetWorldLists(m); this.coop.enemies.clear(); this.coop.loading = false;
    const sp = d.spawn && d.spawn[Net.id], c = sp || this.map.tileCenter(m.startRoom.cx, m.startRoom.cy);
    this.player.x = c.x; this.player.y = c.y; this.player.state = 'NORMAL';
    this.snapCamera(); this.showBanner(`${stageLabel(this.worldIdx, this.levelIdx)}  ${this.W.name}`, '방장과 함께하는 탐험', '#7affc0');
  },
  coopGuestSnap(d) {
    const C = this.coop; if (C.loading || !this.map) return;
    this.gold = d.g; this.kills = d.kills; this.worldIdx = d.wi; this.levelIdx = d.li;
    const seen = new Set();
    for (const s of d.pl) {
      const mine = s.id === Net.id;
      let o = mine ? null : C.others.get(s.id);
      if (!mine && !o) { const hero = this.data.heroes.get(s.h) || DATA_HEROES[0]; o = { id: s.id, p: new Player(s.x, s.y, hero, this.data.base) }; C.others.set(s.id, o); }
      const p = mine ? this.player : o.p; if (!mine) seen.add(s.id);
      if (!mine) { p.tx = s.x; p.ty = s.y; if (Math.hypot(p.x - s.x, p.y - s.y) > 80) { p.x = s.x; p.y = s.y; } p.aimVis = s.a; p.faceVis = s.f; p.moving = !!s.mv; p.hurtInvuln = s.inv ? 0.1 : 0; const base = this.data.heroes.get(s.h); if (base) p.hero = s.lk ? heroWithLook(base, s.lk) : base; }
      else if (s.wp !== C.warp) { p.x = s.x; p.y = s.y; C.warp = s.wp; } // 방장이 옮겼을 때만 내 위치를 맞춤
      else if (s.px || s.py) moveAndCollide(p, s.px || 0, s.py || 0, this.map); // 끌려감·밀림
      p.reviveT = s.rv * COOP.reviveTime; p.hybridTitle = s.hy;
      if (mine && s.hp + s.sh < p.hp + p.shield - 0.5) { this.addShake(0.15, 3); if (s.hp < p.hp) { this.hurtFlash = 0.35; SFX.play('hurt'); } else SFX.play('shield'); this.effects.text(p.x, p.y - 16, '-' + Math.round(p.hp + p.shield - s.hp - s.sh), '#ff6b6b', true); } // 내가 맞음
      if (mine && s.st === 'X' && p.state !== 'DEAD') this.showBanner('쓰러졌습니다', '동료가 곁에 3초 서 있으면 일어나고, 아니면 다음 스테이지에서 부활합니다', '#ff8a8a');
      p.hp = s.hp; p.maxHp = s.mhp; p.shield = s.sh; p.maxShield = s.msh; p.energy = s.en; p.maxEnergy = s.men;
      if (s.st === 'X' && p.state !== 'DEAD') { p.state = 'DEAD'; p.deathTimer = 0; } else if (s.st !== 'X' && p.state === 'DEAD') p.state = 'NORMAL';
      if (p.weapons.map((w) => w.def.id + (w.lv || 0)).join() !== s.w.map((id, i) => id + s.wl[i]).join()) p.weapons = s.w.filter((id) => this.data.weapons.get(id)).map((id, i) => new WeaponInstance(this.data.weapons.get(id), s.wl[i] || 0));
      p.slot = Math.min(s.sl, Math.max(0, p.weapons.length - 1)); p.skillCooldown = s.sk; p.skillCdMax = s.skm; p.skillName = s.sn; p.treasureCd = s.tc; p.treasure = DATA_TREASURES.find((t) => t.id === s.tr) || null; p.rank = s.rk;
      if (mine && s.ln && (!p.line || p.line.id !== s.ln)) { const L = jobLines(p.hero.id).find((l) => l.id === s.ln); if (L) this.setJob(p, L, s.rk); }
    }
    for (const id of [...C.others.keys()]) if (!seen.has(id)) C.others.delete(id);
    const live = new Set();
    this.enemies = d.en.map(([nid, defId, x, y, hp, mhp, st, face, ph, el, fl, jh, fade, aim, stt, laser, chain]) => {
      live.add(nid); let e = C.enemies.get(nid); const def = this.data.enemies.get(defId); if (!def) return null;
      if (!e) { e = new Enemy(x, y, def, { hp: 1, dmg: 1 }, null); e.pd = {}; C.enemies.set(nid, e); }
      e.tx = x; e.ty = y; if (Math.hypot(e.x - x, e.y - y) > 60) { e.x = x; e.y = y; }
      e.hp = hp; e.maxHp = mhp; if (e.state !== st) e.stateTime = stt; e.state = st; e.face = face; e.phase = ph; e.elite = !!el; if (fl) e.hurtFlash = 0.08; e.jumpH = jh; e.fade = fade; e.aimAng = aim; e.pat = null;
      e.chainT = chain ? chain[0] : 0; e.chainMax = chain ? chain[1] : 0; // 황금 사슬 (묶인 모습)
      e.alive = st !== 'DEAD'; e.laser = laser ? { angs: laser[0], width: laser[1], color: laser[2], live: !!laser[3] } : null;
      return e;
    }).filter(Boolean);
    for (const id of [...C.enemies.keys()]) if (!live.has(id)) C.enemies.delete(id);
    const mover = (o) => { o.update = function (dt) { this.x += this.vx * dt; this.y += this.vy * dt; }; return o; };
    this.projectiles = d.pr.map(([x, y, vx, vy, c, s]) => mover({ x, y, vx, vy, render(ctx) { ctx.fillStyle = c; const z = Math.max(1, s); ctx.fillRect(Math.round(this.x) - z, Math.round(this.y) - z, z * 2, z * 2); } }));
    this.enemyBullets = d.eb.map(([x, y, vx, vy, r, c]) => mover(Object.assign(Object.create(EnemyBullet.prototype), { x, y, vx, vy, r, color: c, alive: true })));
    this.pickups = d.pk.map(([kind, x, y, id]) => new Pickup(kind, x, y, { still: true, def: id ? this.data.weapons.get(id) : null }));
    this.hazards = d.hz.map(([x, y, r, t, delay, color]) => Object.assign(Object.create(Hazard.prototype), { x, y, r, t, delay, color, alive: true }));
    this.portals = d.po.map(([x, y, label, col]) => new Portal(x, y, () => {}, label, col || undefined));
    this.props = (d.pp || []).map(([cls, x, y, label, open, content]) => { // 상자는 진짜 그림, 나머지는 표시 + 이름 (가까이 가면)
      if (cls === 'Chest') { const c = new Chest(x, y, content); c.open = !!open; c.label = () => label || null; c.interact = () => {}; return c; }
      return { x, y, radius: 20, label: () => label || null, labelColor: '#c8b890', interact() {}, render(ctx) { const X = Math.round(this.x), Y = Math.round(this.y); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(X - 7, Y + 4, 14, 3); ctx.fillStyle = OUTLINE; ctx.fillRect(X - 6, Y - 9, 12, 13); ctx.fillStyle = '#8a7a5a'; ctx.fillRect(X - 5, Y - 8, 10, 11); ctx.fillStyle = '#ffd84a'; ctx.fillRect(X - 1, Y - 5, 2, 5); } };
    });
    d.rv.split('').forEach((v, i) => { if (this.map.rooms[i]) this.map.rooms[i].visited = v === '1'; });
    for (const [i, v] of d.td) { this.map.tiles[i] = v; if (this.map.cache) this.map.redrawTile(i % this.map.width, Math.floor(i / this.map.width)); }
    for (const [name, ...a] of d.fx) if (typeof this.effects[name] === 'function') try { this.effects[name](...a); } catch (e) { /* 연출 하나가 실패해도 계속 */ }
    C.zones = C.zones || new Map(); const zl = [], al = [], seenZ = new Set(); // 장판·소환물
    for (const z of d.zs || []) { const K = COOP_CLASSES[z.c]; if (!K) continue; seenZ.add(z.n); let o = C.zones.get(z.n);
      if (!o) { o = Object.create(K.prototype); o.alive = true; C.zones.set(z.n, o); // 그림이 실패해도 게임은 계속
        o.render = function (ctx) { try { K.prototype.render.call(this, ctx, window.__game); } catch (e) { ctx.restore && ctx.globalAlpha !== 1 && (ctx.globalAlpha = 1); } };
        if (K.prototype.renderTop) o.renderTop = function (ctx) { try { K.prototype.renderTop.call(this, ctx, window.__game); } catch (e) { ctx.globalAlpha = 1; } }; }
      Object.assign(o, coopUnpack(z)); (['Turret', 'Drone', 'SpiritWolf'].includes(z.c) ? al : zl).push(o); }
    for (const id of [...C.zones.keys()]) if (!seenZ.has(id)) C.zones.delete(id);
    this.zones = zl; this.allies = al;
  },
  coopGuestOverlay(o) { // 방장이 보내 준 내 창 (축복·전직·갈래)
    const p = this.player;
    if (!o) { if (this.overlay && this.overlay.remote) this.overlay = null; return; }
    if (o.type === 'buff') this.overlay = { type: 'buff', remote: true, options: o.options.map((id) => DATA_BUFFS.find((b) => b.id === id)).filter(Boolean) };
    else if (o.type === 'evolve') { const L = o.branch ? jobLines(p.hero.id).find((l) => l.id === o.branch) : null; let hy = null;
      if (o.hybrid) { const H = HYBRID_JOBS[o.hybrid.h], el = H && jobLines(H.master).find((l) => l.id === o.hybrid.el); if (H && el) hy = { H, el, masterHero: heroWithLook(this.data.heroes.get(H.master), el.look) }; }
      this.overlay = { type: 'evolve', remote: true, npc: { branch: L, hybrid: hy }, msg: o.msg }; }
    else if (o.type === 'variant') this.overlay = { type: 'variant', remote: true, branch: o.branch, lines: jobLines(p.hero.id), title: JOB_LINES[p.hero.id].title };
    this.input.mouse.down = false;
  },
  coopGuestOverlayInput(input) { // 내 창의 선택을 방장에게 보냄
    const o = this.overlay, send = (x) => Net.relay(Object.assign({ k: 'ov' }, x), this.coop.hostId), m = input.mouse, inR = (r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
    if (o.type === 'buff') { let c = -1; [1, 2, 3].forEach((n, i) => { if (input.wasPressed('Digit' + n) || (input.wasPressed('Mouse0') && inR(HUD.buffRect(i)))) c = i; }); if (c >= 0) { send({ key: 'Digit' + (c + 1) }); this.overlay = null; } }
    else if (o.type === 'evolve') { for (const k of ['Digit1', 'Digit2', 'Escape', 'KeyE']) if (input.wasPressed(k)) { send({ key: k }); if (k !== 'Digit2') this.overlay = null; } }
    else if (o.type === 'variant') { let c = -1; o.lines.forEach((_, i) => { if (input.wasPressed('Digit' + (i + 1)) || (input.wasPressed('Mouse0') && inR(HUD.variantRect(i, o.lines.length)))) c = i; }); if (c >= 0) { send({ pick: o.lines[c].id }); this.overlay = null; } else if (o.branch && (input.wasPressed('Escape') || input.wasPressed('KeyE'))) { send({ key: 'Escape' }); this.overlay = null; } }
    this.input.mouse.down = false;
  },
  coopGuestUpdate(dt, input0) {
    let input = input0; const C = this.coop;
    if (this.banner) this.banner.t += dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.transition) { this.transition.t += dt; if (!this.transition.swapped && this.transition.t >= 0.45) { this.transition.swapped = true; this.transition.action(); } if (this.transition.t >= 0.9) this.transition = null; input.endStep(); return; }
    if (this.cutscene) { this.updateCutscene(dt, input); this.effects.update(dt); this.updateCamera(dt); input.endStep(); return; } // 방장과 같은 컷신 (내 쪽에서 넘김)
    if (this.overlay && this.overlay.remote) { this.coopGuestOverlayInput(input); input = NULL_INPUT; } // 창을 띄운 채로도 세계는 계속 (캐릭터는 멈춤)
    else if (this.overlay) { this.updateOverlay(input); input.endStep(); if (!this.coop || this.overlay) return; }
    if (C.loading || !this.map) { input.endStep(); return; }
    if (input.wasPressed('Escape')) { this.overlay = { type: 'pause' }; input.endStep(); return; }
    const p = this.player, mw = this.mouseWorld();
    if (p.state !== 'DEAD') { // 내 캐릭터 이동·대시는 바로 (반응성)
      p.update(dt, input, this.map, mw);
      for (const k of COOP.events) if (input.wasPressed(k)) C.ev.push(k);
      if (input.wasPressed('Mouse0') && this.minimapClick(input.mouse)) input.mouse.down = false;
    }
    C.inT -= dt;
    if (C.inT <= 0) { C.inT = 1 / COOP.inHz; Net.relay({ k: 'in', wp: C.warp, x: Math.round(p.x), y: Math.round(p.y), d: p.state === 'DASH' ? 1 : 0, md: input.mouse.down ? 1 : 0, ax: Math.round(mw.x), ay: Math.round(mw.y), ev: C.ev.splice(0) }, C.hostId); }
    const k = Math.min(1, dt * 12);
    for (const o of C.others.values()) { if (o.p.tx !== undefined) { o.p.x += (o.p.tx - o.p.x) * k; o.p.y += (o.p.ty - o.p.y) * k; } o.p.time += dt; }
    for (const e of this.enemies) { if (e.tx !== undefined) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; } e.stateTime += dt; e.hurtFlash = Math.max(0, e.hurtFlash - dt); }
    for (const q of this.projectiles) q.update(dt);
    for (const b of this.enemyBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    for (const h of this.hazards) h.t += dt;
    for (const pk of this.pickups) pk.t += dt;
    for (const po of this.portals) po.t += dt;
    this.interactTarget = p.state !== 'DEAD' ? this.findInteractTarget() : null; // 가까운 상자·상점 이름 표시 (E는 방장에게 전달)
    this.effects.update(dt);
    this.shake = Math.max(0, (this.shake || 0) - dt); if (this.shake === 0) this.shakeMag = 0;
    this.screenFlash = Math.max(0, (this.screenFlash || 0) - dt);
    for (const z of this.zones) if (typeof z.t === 'number') z.t += dt; // 장판 애니메이션
    this.updateCamera(dt);
    input0.endStep();
  },
  coopGuestEnd(d) {
    if (!this.coop || !this.coop.guest) return;
    this.coop = null; SFX.stopMusic(); SFX.play(d.victory ? 'victory' : 'hurt');
    if (d.quit) Net.leave(); // 참가자가 스스로 나감
    const stages = d.stages || 0, bosses = d.bosses || 0, reward = stages * CUR.perStage + bosses * CUR.perBoss + (d.victory ? CUR.victory : 0);
    this.overlay = { type: 'result', victory: !!d.victory, stages, bosses, reward, coop: true, after: d.hostLeft ? '방장이 나가서 탐험이 끝났습니다' : d.quit ? '탐험에서 나왔습니다' : '함께한 탐험이 끝났습니다' };
    if (d.victory) { this.save.clears++; writeSave(this.save); }
    if (d.row && this.profile && !this.admin) Net.submitScore(Object.assign({}, d.row, { name: this.profile.name, hero: this.save.selected })); // 함께한 탐험도 내 이름으로 랭킹에
  }
});
Net.on((m) => { if (window.__game) window.__game.coopOnNet(m); });
