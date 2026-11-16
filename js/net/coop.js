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
    return list.map(([p, name]) => ({ y: p.y, render: (ctx) => { p.render(ctx); hudText(ctx, name + (p.state === 'DEAD' ? ' (쓰러짐)' : ''), Math.round(p.x), Math.round(p.y) - 22, p.state === 'DEAD' ? '#ff8a8a' : '#7affc0', 'center', 7); } }));
  },
  coopOnNet(m) {
    if (!this.coop) { if (m.t === 'relay' && m.data && m.data.k === 'start' && this.mode === 'lobby' && !this.transition) this.coopGuestStart(m.from); return; }
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
      else if (d.k === 'variant') { const R = this.remotes.get(m.from); const L = R && jobLines(R.p.hero.id).find((l) => l.id === d.id); if (L && R.p.rank === 0) this.withPlayer(R.p, () => this.applyVariant(L)); }
    } else if (m.from === this.coop.hostId) {
      if (d.k === 'map') this.coopGuestMap(d);
      else if (d.k === 'snap') this.coopGuestSnap(d);
      else if (d.k === 'end') this.coopGuestEnd(d);
      else if (d.k === 'msg') this.showBanner(d.text, null, '#7ad0ff');
    }
  },

  // ── 방장
  coopHostStart() {
    this.coop = { host: true, me: this.player, aim: null, snapT: 0, nid: 0, fx: [], lastTiles: null };
    this.remotes = new Map();
    Net.raw({ t: 'start', on: true }); Net.relay({ k: 'start' });
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
      if (R.rx !== undefined && !overlapsSolid(R.rx, R.ry, p.half - 1, this.map)) { p.x = R.rx; p.y = R.ry; }
      if (R.dash) p.dashInvuln = Math.max(p.dashInvuln, 0.06);
      this.withPlayer(p, () => {
        const oi = this.input; this.input = R.vin; this.coop.aim = R.aim; const bx = p.x, by = p.y;
        p.update(dt, R.vin, this.map, R.aim);
        this.weaponSystem.update(p, dt, R.vin);
        if (R.vin.wasPressed('KeyF') || R.vin.wasPressed('Mouse2')) this.useSkill();
        if (R.vin.wasPressed('KeyR')) this.useTreasure();
        if (R.vin.wasPressed('KeyE')) { const ov = this.overlay; this.updateInteraction(R.vin); if (this.overlay !== ov) { this.overlay = ov; Net.relay({ k: 'msg', text: '이건 아직 방장만 할 수 있어요' }, R.id); } }
        if (Math.hypot(p.x - bx, p.y - by) > 12) { R.warp++; R.rx = undefined; } // 스킬로 순간이동·돌진 → 참가자 화면도 옮김
        this.coop.aim = null; this.input = oi;
      });
      R.vin.endStep();
    }
  },
  coopHostSend(dt) {
    const C = this.coop; C.snapT -= dt; if (C.snapT > 0) return; C.snapT = 1 / COOP.snapHz;
    const pl = (p, id, warp) => ({ id, x: Math.round(p.x), y: Math.round(p.y), h: p.hero.id, lk: p.line && p.line.look ? p.line.look : null, a: r1(p.aimVis), f: p.faceVis, st: p.state === 'DEAD' ? 'X' : p.state === 'DASH' ? 'D' : 'N', mv: p.moving ? 1 : 0,
      hp: Math.ceil(p.hp), mhp: p.maxHp, sh: Math.ceil(p.shield), msh: p.maxShield, en: Math.floor(p.energy), men: p.maxEnergy, w: p.weapons.map((x) => x.def.id), wl: p.weapons.map((x) => x.lv || 0), sl: p.slot,
      sk: r1(p.skillCooldown), skm: r1(p.skillCdMax), sn: p.skillName, tr: p.treasure ? p.treasure.id : null, tc: r1(p.treasureCd), rk: p.rank, ln: p.line ? p.line.id : null, wp: warp, inv: p.hurtInvuln > 0 ? 1 : 0 });
    const players = [pl(C.me, Net.id, 0), ...[...this.remotes.values()].map((R) => pl(R.p, R.id, R.warp))];
    const en = this.enemies.map((e) => { if (!e.nid) e.nid = ++C.nid; return [e.nid, e.def.id, Math.round(e.x), Math.round(e.y), Math.ceil(e.hp), e.maxHp, e.state, e.face, e.phase || 1, e.elite ? 1 : 0, e.hurtFlash > 0 ? 1 : 0, Math.round(e.jumpH || 0), r1(e.fade ?? 1), r1(e.aimAng || 0), r1(e.stateTime), e.laser ? [e.laser.angs.map(r1), e.laser.width, e.laser.color, e.laser.live ? 1 : 0] : 0]; });
    const pr = this.projectiles.filter((q) => !q.orbit).slice(0, 160).map((q) => [Math.round(q.x), Math.round(q.y), Math.round((q.dx || 0) * (q.speed || 0)), Math.round((q.dy || 0) * (q.speed || 0)), q.color, q.size || 1]);
    const eb = this.enemyBullets.slice(0, 240).map((b) => [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.r, b.color]);
    const td = []; const T = this.map.tiles, L = C.lastTiles; if (L && L.length === T.length) for (let i = 0; i < T.length; i++) if (T[i] !== L[i]) { td.push([i, T[i]]); L[i] = T[i]; }
    Net.relay({ k: 'snap', g: this.gold, kills: this.kills, wi: this.worldIdx, li: this.levelIdx, pl: players, en, pr, eb,
      pk: this.pickups.map((k) => [k.kind, Math.round(k.x), Math.round(k.y), k.def ? k.def.id : 0]),
      hz: this.hazards.map((h) => [Math.round(h.x), Math.round(h.y), h.r, r1(h.t), h.delay, h.color]),
      po: this.portals.map((p) => [Math.round(p.x), Math.round(p.y), p.label || '', p.color || null]),
      rv: this.map.rooms.map((r) => (r.visited ? 1 : 0)).join(''), td, fx: C.fx.splice(0),
      pp: this.props.map((o) => { let lb = ''; try { lb = o.label ? o.label(this) || '' : ''; } catch (e) { lb = ''; } return [o.constructor.name, Math.round(o.x), Math.round(o.y), lb, o.open ? 1 : 0, o.content || 0]; }) });
  },
  coopHostEnd(victory) {
    const C = this.coop; if (!C) return;
    const stages = this.stageIndex + (victory ? 1 : 0), bosses = this.worldIdx + (victory ? 1 : 0);
    Net.relay({ k: 'end', victory, stages, bosses }); Net.raw({ t: 'start', on: false });
    for (const [name, orig] of Object.entries(C.fxOrig || {})) this.effects[name] = orig; // 연출 기록 해제
    this.player = C.me; this.coop = null; this.remotes = new Map();
  },

  // ── 참가자
  coopGuestStart(hostId) {
    SFX.stopMusic(); this.overlay = null; this.cutscene = null; this.cinematic = null; this.slowMo = null; this.trialW = null;
    this.coop = { guest: true, hostId, loading: true, others: new Map(), enemies: new Map(), inT: 0, ev: [], warp: -1 };
    this.mode = 'dungeon'; this.gold = 0; this.kills = 0;
    this.player = this.makePlayer(0, 0);
    const tr = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped); if (tr) this.player.treasure = tr;
    Net.relay({ k: 'setup', hero: this.save.selected, treasure: this.save.treasureEquipped, loadout: this.save.loadout, jobLv: this.jobLevel(this.save.selected) }, hostId);
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
      if (mine && s.hp + s.sh < p.hp + p.shield - 0.5) { this.addShake(0.15, 3); if (s.hp < p.hp) { this.hurtFlash = 0.35; SFX.play('hurt'); } else SFX.play('shield'); this.effects.text(p.x, p.y - 16, '-' + Math.round(p.hp + p.shield - s.hp - s.sh), '#ff6b6b', true); } // 내가 맞음
      if (mine && s.st === 'X' && p.state !== 'DEAD') this.showBanner('쓰러졌습니다', '동료가 살아 있으면 다음 스테이지에서 부활합니다', '#ff8a8a');
      p.hp = s.hp; p.maxHp = s.mhp; p.shield = s.sh; p.maxShield = s.msh; p.energy = s.en; p.maxEnergy = s.men;
      if (s.st === 'X' && p.state !== 'DEAD') { p.state = 'DEAD'; p.deathTimer = 0; } else if (s.st !== 'X' && p.state === 'DEAD') p.state = 'NORMAL';
      if (p.weapons.map((w) => w.def.id + (w.lv || 0)).join() !== s.w.map((id, i) => id + s.wl[i]).join()) p.weapons = s.w.filter((id) => this.data.weapons.get(id)).map((id, i) => new WeaponInstance(this.data.weapons.get(id), s.wl[i] || 0));
      p.slot = Math.min(s.sl, Math.max(0, p.weapons.length - 1)); p.skillCooldown = s.sk; p.skillCdMax = s.skm; p.skillName = s.sn; p.treasureCd = s.tc; p.treasure = DATA_TREASURES.find((t) => t.id === s.tr) || null; p.rank = s.rk;
      if (mine && s.ln && (!p.line || p.line.id !== s.ln)) { const L = jobLines(p.hero.id).find((l) => l.id === s.ln); if (L) this.setJob(p, L, s.rk); }
    }
    for (const id of [...C.others.keys()]) if (!seen.has(id)) C.others.delete(id);
    const live = new Set();
    this.enemies = d.en.map(([nid, defId, x, y, hp, mhp, st, face, ph, el, fl, jh, fade, aim, stt, laser]) => {
      live.add(nid); let e = C.enemies.get(nid); const def = this.data.enemies.get(defId); if (!def) return null;
      if (!e) { e = new Enemy(x, y, def, { hp: 1, dmg: 1 }, null); e.pd = {}; C.enemies.set(nid, e); }
      e.tx = x; e.ty = y; if (Math.hypot(e.x - x, e.y - y) > 60) { e.x = x; e.y = y; }
      e.hp = hp; e.maxHp = mhp; if (e.state !== st) e.stateTime = stt; e.state = st; e.face = face; e.phase = ph; e.elite = !!el; if (fl) e.hurtFlash = 0.08; e.jumpH = jh; e.fade = fade; e.aimAng = aim; e.pat = null;
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
  },
  coopGuestUpdate(dt, input) {
    const C = this.coop;
    if (this.banner) this.banner.t += dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.transition) { this.transition.t += dt; if (!this.transition.swapped && this.transition.t >= 0.45) { this.transition.swapped = true; this.transition.action(); } if (this.transition.t >= 0.9) this.transition = null; input.endStep(); return; }
    if (this.overlay) { this.updateOverlay(input); input.endStep(); if (!this.coop || this.overlay) return; }
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
    this.updateCamera(dt);
    input.endStep();
  },
  coopGuestEnd(d) {
    if (!this.coop || !this.coop.guest) return;
    this.coop = null; SFX.stopMusic(); SFX.play(d.victory ? 'victory' : 'hurt');
    if (d.quit) Net.leave(); // 참가자가 스스로 나감
    const stages = d.stages || 0, bosses = d.bosses || 0, reward = stages * CUR.perStage + bosses * CUR.perBoss + (d.victory ? CUR.victory : 0);
    this.overlay = { type: 'result', victory: !!d.victory, stages, bosses, reward, coop: true, after: d.hostLeft ? '방장이 나가서 탐험이 끝났습니다' : d.quit ? '탐험에서 나왔습니다' : '함께한 탐험이 끝났습니다' };
    if (d.victory) { this.save.clears++; writeSave(this.save); }
  }
});
Net.on((m) => { if (window.__game) window.__game.coopOnNet(m); });
