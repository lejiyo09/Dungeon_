'use strict';
// ════════════════════════════════════════════
// 멀티 2단계: 함께 던전 (2~4인 협동)
//  · 방장: 게임 전체를 계산 (적·탄·피해·보상). 참가자 캐릭터도 방장 세계 안의 Player로 존재
//  · 참가자: 자기 캐릭터 이동·대시만 직접 처리(반응성) + 조준·공격·스킬·보구·상호작용 입력을 방장에게 보냄
//            방장이 보낸 화면 상태(맵·적·탄·아이템·다른 플레이어·연출)를 받아 그림
//  · 인원별 난이도: 몬스터 수·체력, 보스 체력, 정예 확률 (MULTIPLAYER.md)
// ════════════════════════════════════════════
const COOP = {
  snapHz: 15,  // 방장 → 참가자 화면 상태 (초당) — 사이는 참가자가 속도로 이어서 그림 (데이터 절약)
  inHz: 30,    // 참가자 → 방장 입력 (초당)
  scale: { mobCount: 0.5, mobHp: 0.25, bossHp: 0.7, elite: 0.03 }, // 1명 늘 때마다 (표가 없는 항목)
  // 인원별 배율 [1인, 2인, 3인, 4인] — 봇 측정(tools/coopsim.js): 3~4인은 보스 공격이 나뉘어 혼자보다 훨씬 쉬워서 보스 체력을 더 올리고, 2인은 조금 낮춤
  table: { bossHp: [1, 1.65, 2.55, 3.5] },
  reviveRatio: 0.3, // 쓰러진 사람은 다음 스테이지에서 최대 체력 30%로 부활
  reviveTime: 3, reviveRange: 24, reviveHp: 0.4, // 동료가 곁에 3초 있으면 그 자리에서 체력 40%로 일어남
  events: ['KeyF', 'Mouse2', 'KeyR', 'KeyE', 'KeyQ', 'Wheel'], // 참가자 → 방장으로 보내는 순간 입력 (대시는 참가자가 직접)
  fx: ['text', 'spark', 'ring', 'slash', 'lightning', 'burst', 'muzzle', 'impact', 'explosion', 'death', 'goldBurst', 'beamline', 'sparkle', 'heal', 'rays', 'skyBeam', 'reaction', 'excalibur', 'solomonSeal', 'part', 'dust', 'afterimage', 'status'] // 참가자 화면에도 보여 줄 연출 (part·dust·afterimage·status: 소환·스킬 이펙트의 입자·먼지·잔상)
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
  'ThornBurst', 'BleedTicker', 'GaeBolgThrow', 'HeavenChains', 'BossGate', 'KingChainCast', 'BullHornCharge', 'ExplosionSigil', 'BladeRing', 'LightSatellites', 'FireBomb', 'ShockGrid', 'TrapSentry'].forEach((n) => { try { const c = Function('return typeof ' + n + " !== 'undefined' ? " + n + ' : null')(); if (c) COOP_CLASSES[n] = c; } catch (e) { /* 없는 클래스 */ } });
const COOP_REF_RENDER = new Set(['SkillCast', 'ExcaliburRaise', 'ShadowStrike', 'Drone', 'BladeRing', 'LightSatellites']); // 그림에 주인(플레이어) 위치를 쓰는 장판·소환물
// 이름표가 '보는 사람의 무기·체력'에 따라 바뀌는 물건: 방장 쪽 이름표 대신 값만 보내고, 참가자 화면에서 자기 기준으로 만듦 (강화대에 방장 무기가 뜨던 문제)
const COOP_OWN_LABEL = { UpgradeAnvil: ['discount', 'bonus', 'room'], Forge: ['price', 'used'], BloodAltar: ['used'] };
function coopPackRef(v) { // 적·플레이어 같은 큰 객체는 위치 정도만
  if (v instanceof Player) return { $p: 1, x: r1(v.x), y: r1(v.y), aim: { x: r1(v.aim.x), y: r1(v.aim.y) }, half: v.half, radius: v.radius, state: v.state, faceVis: v.faceVis, hero: { id: v.hero.id } };
  if (v instanceof Enemy) return { $e: 1, x: r1(v.x), y: r1(v.y), alive: v.alive, chainT: r1(v.chainT || 0), radius: v.radius, half: v.half };
  return undefined;
}
// 참가자 화면에서 미리 그려도 되는 단순한 탄 (곧게 날아가는 총탄) — 방장 쪽 같은 탄은 참가자에게 보내지 않음
function coopProjLook(q) { /* 탄 모양 (참가자 화면에서 진짜 탄처럼 그리기): 거품·검기·심은 지뢰·회전 투척물·공허 구체·화염·화살 — 평범한 탄은 0 (데이터 절약) */
  const L = []; if (q.bubble) L.push('b'); if (q.wave) L.push('w'); if (q.mine && q.planted) L.push('m'); if (q.arrow) L.push('a');
  if (q.spriteDef) L.push('s:' + q.spriteDef.id); if (q.pull) L.push('p:' + Math.round(q.pull.radius || 40)); if (q.flame) L.push('f:' + r1(Math.min(1, (q.traveled || 0) / (q.range || 1))));
  return L.length ? L.join('|') : 0; }
function coopProjView(x, y, vx, vy, color, size, look, t) { /* 방장이 보낸 탄을 Projectile 그리기 그대로 쓰는 가벼운 사본 */
  const v = Math.hypot(vx, vy), o = Object.create(Projectile.prototype);
  Object.assign(o, { x, y, vx, vy, dx: v ? vx / v : 1, dy: v ? vy / v : 0, speed: v, color, size, age: t || 0, alive: true, traveled: 0, range: 1 });
  if (look) for (const k of String(look).split('|')) { const [a, b] = k.split(':');
    if (a === 'b') o.bubble = true; else if (a === 'w') o.wave = true; else if (a === 'm') { o.mine = true; o.planted = true; o.mineLeft = 9; } else if (a === 'a') o.arrow = true;
    else if (a === 's') o.spriteDef = GAME_DATA.weapons.get(b) || null; else if (a === 'p') o.pull = { radius: +b }; else if (a === 'f') { o.flame = true; o.traveled = +b; } }
  o.update = function (dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.age += dt; };
  return o; }
function coopPredictable(d) { return !!d && (d.type === 'gun' || (d.type === 'charge' && !d.beamShot)) && !(d.boomerang || d.homing || d.orbit || d.grenade || d.mine || d.firework || d.trail || d.flame || d.ricochet || d.deploy || d.summon || d.trap || d.sentry || d.meteor || d.bubble); } // 연사·평행·튕김·분열·충전·회전 총도 포함
function coopVel(o, x, y, now) { // 받은 위치 두 개로 속도를 구해 둠 → 사이 시간은 앞으로 예측해서 그림 (뒤따라오는 느낌 줄임)
  if (o.snapT && o.tx !== undefined) { const dt = (now - o.snapT) / 1000; if (dt > 0.02 && dt < 0.5) { const vx = (x - o.tx) / dt, vy = (y - o.ty) / dt, sp = Math.hypot(vx, vy); const k = sp > 320 ? 320 / sp : 1; o.vx = vx * k; o.vy = vy * k; } }
  o.tx = x; o.ty = y; o.snapT = now;
}
function coopLat() { return Math.min(0.15, Math.max(0, (Net.ping || 0) / 2000)); } // 방장 → 나 한쪽 지연 (핑의 절반, 최대 0.15초)
function coopSmooth(o, dt, now) { if (o.tx === undefined) return; const age = Math.min(0.27, (now - (o.snapT || now)) / 1000 + coopLat()), gx = o.tx + (o.vx || 0) * age, gy = o.ty + (o.vy || 0) * age, k = Math.min(1, dt * 15); o.x += (gx - o.x) * k; o.y += (gy - o.y) * k; }
function coopSafeDraw(ctx, fn) { // 그리다 오류가 나도 캔버스 상태(이동·혼합 방식 등)를 그리기 전으로 되돌림
  trackCtxDepth(ctx);
  const d0 = ctx.__d; ctx.save(); try { fn(); } catch (e) { /* 이것만 생략 */ } finally { while (ctx.__d > d0) ctx.restore(); }
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
  eachTarget(fn) { // 적의 범위 공격(근접·돌진·내려찍기·광선·끌어당김 등): 멀티면 범위 안의 모든 플레이어에게 (각자 기준으로 피해)
    if (!(this.coop && this.coop.host)) { if (this.player.state !== 'DEAD') fn(this.player); return; }
    for (const p of this.allPlayers()) if (p.state !== 'DEAD') this.withPlayer(p, () => fn(p));
  },
  hitOnce(e, key, q, fn) { const S = e[key] || (e[key] = new Set()); if (!S.has(q) && fn()) S.add(q); }, // 한 번의 돌진에 같은 사람은 한 번만
  partyCount() { return this.coop && this.coop.host ? 1 + this.remotes.size : 1; },
  partyScale(kind) { const n = this.partyCount(), T = COOP.table[kind]; return T ? T[Math.min(T.length, n) - 1] : 1 + COOP.scale[kind] * (n - 1); },
  coopActors() { // 내 화면에 그릴 다른 플레이어들 (이름표 포함)
    if (!this.coop) return [];
    const list = this.coop.host ? [...this.remotes.values()].map((r) => [r.p, Net.nameOf(r.id)]) : [...(this.coop.others || new Map()).values()].map((o) => [o.p, Net.nameOf(o.id)]);
    const ring = (ctx, p) => { if (p.state !== 'DEAD') return; const k = Math.min(1, (p.reviveT || 0) / COOP.reviveTime); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(Math.round(p.x), Math.round(p.y), 12, 0, TAU); ctx.stroke(); if (k > 0) { ctx.strokeStyle = '#7affc0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.round(p.x), Math.round(p.y), 12, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); ctx.lineWidth = 1; } };
    const out = list.map(([p, name]) => ({ y: p.y, render: (ctx) => { p.render(ctx); ring(ctx, p); hudText(ctx, name + (p.state === 'DEAD' ? ' (쓰러짐 · 곁에 서서 일으키기)' : ''), Math.round(p.x), Math.round(p.y) - 22, p.state === 'DEAD' ? '#ff8a8a' : '#7affc0', 'center', 7); } }));
    const me = this.player; if (me && me.state === 'DEAD') out.push({ y: me.y + 0.01, render: (ctx) => ring(ctx, me) }); // 내가 쓰러졌을 때 일어나는 진행
    return out;
  },
  coopOnNet(m) {
    if (!this.coop) {
      if (m.t === 'relay' && m.data && m.data.k === 'gather' && !Net.isHost) { const d = m.data; this.gather = { label: d.label, n: d.n, total: d.total, t: d.t }; if (d.t) SFX.play('ui', 0.2); return; } // 단체 입장 상태 (방장이 보냄)
      if (m.t === 'relay' && m.data && m.data.k === 'start' && this.mode === 'lobby' && !this.transition && !(this.overlay && this.overlay.type === 'result')) { this.gather = {}; this.coopGuestStart(m.from, !!m.data.deep); if (m.data.late) this.showBanner('진행 중인 탐험에 합류했습니다', null, '#7affc0'); } // 늦게 와도 로비에 오면 합류
      return; }
    if (m.t === 'dropped' || m.t === 'rejoined' || m.t === 'lost') { this.coopNetEvent(m.t); return; } // 내 연결이 끊김 / 다시 연결됨 / 포기
    if (m.t === 'players') {
      if (this.coop.host) { for (const id of [...this.remotes.keys()]) if (!Net.players.some((p) => p.id === id)) this.coopRemoteGone(id); }
      else if (!Net.players.some((p) => p.id === this.coop.hostId) && !this.coop.hostLostAt && !Net.rejoin) { this.coop.hostLostAt = performance.now(); } // 방장이 끊김 → 25초 기다림 (다시 연결되면 이어서)
      return;
    }
    if (m.t === 'left') { if (this.coop.host) this.coopRemoteGone(m.id); return; }
    if (m.t === 'relay' && m.data && m.data.k === 'host' && this.coop.guest) { this.coop.hostId = m.from; this.coop.hostLostAt = 0; this.coop.lastSnap = performance.now(); this.showBanner('방장이 다시 연결되었습니다', null, '#7affc0'); return; }
    if (m.t !== 'relay' || !m.data) return;
    const d = m.data;
    if (this.coop.host) {
      if (d.k === 'setup') { if (!this.coopRestoreRemote(m.from, d)) this.coopAddRemote(m.from, d); }
      else if (d.k === 'rf') { this.coop.snapN = 0; } // 참가자가 전부 다시 요청 (불러오는 중·순서 어긋남) → 다음 화면 공유는 전부
      else if (d.k === 'in') { const R = this.remotes.get(m.from); if (!R) return; if (d.wp === R.warp) { R.rx = d.x; R.ry = d.y; } /* 방장이 옮긴 뒤 참가자가 확인하기 전의 옛 위치는 무시 */ R.aim = { x: d.ax, y: d.ay }; R.vin.mouse.down = !!d.md; R.dash = !!d.d; for (const e of d.ev || []) if (COOP.events.includes(e)) R.vin.pressed.add(e); }
      else if (d.k === 'ov') { const R = this.remotes.get(m.from); if (R) this.coopRemoteOverlay(R, d); }
      else if (d.k === 'trpick') { const R = this.remotes.get(m.from), T = DATA_TREASURES.find((t) => t.id === d.id); if (R && T && !R.p.treasure) { R.p.treasure = T; R.p.treasureCd = 0; } } // 성역에서 고른 보구를 이번 탐험부터
      else if (d.k === 'variant') { const R = this.remotes.get(m.from); const L = R && jobLines(R.p.hero.id).find((l) => l.id === d.id); if (L && (R.p.rank === 0 || this.runDeep) && !R.variantSet) { R.variantSet = true; const keep = R.p.weapons.slice(), rk = R.p.rank; /* 복사해 둠 (갈래 시작 무기가 같은 목록을 바꾸므로) */ this.withPlayer(R.p, () => { this.applyVariant(L); if (this.runDeep) { R.p.weapons = keep; this.setJob(R.p, L, rk); } }); } }
    } else if (m.from === this.coop.hostId) {
      if (d.k === 'map') this.coopGuestMap(d);
      else if (d.k === 'snap') this.coopGuestSnap(d);
      else if (d.k === 'end') this.coopGuestEnd(d);
      else if (d.k === 'msg') this.showBanner(d.text, null, '#7ad0ff');
      else if (d.k === 'cut') { this.cutscene = { lines: d.lines, i: 0, t: 0, lt: 0, focus: d.focus, id: null, done: null }; this.input.mouse.down = false; }
      else if (d.k === 'ov') this.coopGuestOverlay(d.o);
      else if (d.k === 'babylon') { const B = this.save.babylon = this.save.babylon || {}; B.visited = true; writeSave(this.save); } // 동료도 바빌로니아 '가 봄'
      else if (d.k === 'gev') { for (const [st, a, t] of d.e || []) { this.guildEvent(st, a, t); if (st === 'bosses') this.coopGuestMerlinBoss(t); } } // 함께 한 일 → 내 퀘스트·기록
      else if (d.k === 'sanctum') this.coopGuestSanctum(d);
      else if (d.k === 'herodrop' && Math.random() < (d.p || 0)) { const left = DATA_TREASURES.filter((t) => t.heroDrop && !this.save.treasures.includes(t.id)); if (left.length) { const T = pick(left); this.save.treasures.push(T.id); writeSave(this.save); this.treasureToast = { T, start: performance.now() }; } }
    }
  },

  // ── 방장
  coopHostStart() {
    this.coop = { host: true, me: this.player, aim: null, snapT: 0, nid: 0, fx: [], lastTiles: null };
    this.remotes = new Map();
    Net.raw({ t: 'start', on: true }); Net.relay({ k: 'start', deep: !!this.runDeep });
    const E = this.effects, fx = this.coop.fx; this.coop.fxOrig = {}; // 연출을 기록해 참가자에게도 보냄
    const cnt = this.coop.fxCount = {}, CAP = { part: 16, status: 8, dust: 6, afterimage: 6 }; let depth = 0; // 자잘한 입자는 화면 공유 한 번에 몇 개까지만 (데이터 절약)
    for (const name of COOP.fx) { const orig = E[name]; this.coop.fxOrig[name] = orig; E[name] = function (...a) {
      if (depth === 0 && fx.length < 120 && (!CAP[name] || (cnt[name] = (cnt[name] || 0) + 1) <= CAP[name])) fx.push([name, ...a.map((v) => (typeof v === 'number' ? r1(v) : v))]); // 연출 안에서 부르는 입자(총구 섬광의 입자 등)는 그 연출을 보내면 참가자 쪽에서 다시 생기므로 따로 보내지 않음
      depth++; try { return orig.apply(this, a); } finally { depth--; } }; }
    this.coopSendMap();
    if (this.cutscene) { const c = this.cutscene; Net.relay({ k: 'cut', lines: c.lines, focus: c.focus ? { x: Math.round(c.focus.x), y: Math.round(c.focus.y) } : null }); } // 출발과 동시에 시작된 컷신(심층 첫 입장 등)도 동료에게
    this.showBanner('함께 출발!', `${Net.players.length}명 협동 · 몬스터가 인원만큼 많고 단단해집니다`, '#7affc0');
  },
  coopAddRemote(id, d) {
    if (this.remotes.has(id)) return;
    const hero = this.data.heroes.get(d.hero) || DATA_HEROES[0], me = this.coop.me, c = { x: me.x, y: me.y }; // 방장 곁에서 시작 (늦게 합류해도)
    let px = c.x + (this.remotes.size + 1) * 14, py = c.y + 10; if (overlapsSolid(px, py, 5, this.map)) { px = c.x; py = c.y; }
    const p = new Player(px, py, hero, this.data.base), J = BALANCE.jobLevel, lv = Math.min(J.max, d.jobLv | 0); p.jobMaster = lv >= J.max; this.applyJobMaster(p, hero.id); p.remoteSkin = skinSpriteOk(d.skin); /* 동료 스킨 */ p.lineChoice = jobLines(hero.id).some((l) => l.id === d.line) ? d.line : null; /* 동료가 로비에서 고른 진화 루트 */
    if (lv) { p.maxHp += J.hp * lv; p.hp = p.maxHp; p.maxEnergy += J.energy * lv; p.energy = p.maxEnergy; p.stats.attackBonus += J.atk * lv; }
    p.weapons.push(new WeaponInstance(this.weaponDef(hero.startWeapon)));
    if (d.loadout && d.loadout !== hero.startWeapon && this.data.weapons.get(d.loadout)) p.weapons.push(new WeaponInstance(this.weaponDef(d.loadout)));
    const tr = DATA_TREASURES.find((t) => t.id === d.treasure); if (tr) { p.treasure = tr; if (tr.apply) tr.apply(p); } // 보구는 각자 하나씩
    const L0 = jobLines(hero.id)[0]; if (L0) this.withPlayer(p, () => this.setJob(p, L0, 0));
    if (this.runDeep && d.cp && typeof d.cp === 'object') { this.playerFromSnapshot(hero, d.cp, p); this.useCheckpoint(p, d.cp, tr); } // 심층: 동료가 10-4를 깬 그대로
    else if (this.runDeep) this.withPlayer(p, () => this.applyDeepKit(p)); // 기록이 없으면 기본 심층 장비
    this.remotes.set(id, { id, p, vin: new VirtualInput(), aim: { x: p.x + 20, y: p.y }, warp: 0, name: Net.nameOf(id) });
    this.coopSendMap(id);
  },
  coopRemoteGone(id) { // 참가자 연결이 끊김: 캐릭터를 2분 동안 보관 → 같은 이름으로 다시 들어오면 그대로 이어서
    const R = this.remotes.get(id); if (!R) return; this.remotes.delete(id);
    const C = this.coop; C.ghosts = C.ghosts || new Map(); C.ghosts.set(R.name, { p: R.p, at: performance.now() });
    this.showBanner(`${R.name} 연결 끊김`, '다시 연결되면 그대로 이어서 합니다', '#ffb070');
  },
  coopRestoreRemote(id, d) {
    const C = this.coop, name = Net.nameOf(id), g = C.ghosts && C.ghosts.get(name); if (!d.rejoin || !g || performance.now() - g.at > 120000 || this.remotes.has(id)) return false;
    C.ghosts.delete(name); const p = g.p, me = C.me; p.x = me.x + 14; p.y = me.y + 10; p.hurtInvuln = 2;
    this.remotes.set(id, { id, p, vin: new VirtualInput(), aim: { x: p.x + 20, y: p.y }, warp: 1, name });
    this.coop.snapN = 0; this.coopSendMap(id); this.showBanner(`${name} 다시 연결됨`, null, '#7affc0'); return true;
  },
  coopNetEvent(t) { // 내 연결 상태 변화
    const C = this.coop; if (!C) return;
    if (t === 'dropped') { C.netLostAt = performance.now(); return; }
    if (t === 'rejoined') { C.netLostAt = 0;
      if (C.host) { Net.relay({ k: 'host' }); C.snapN = 0; this.coopSendMap(); this.showBanner('다시 연결되었습니다', null, '#7affc0'); } // 동료들에게 방장이 돌아왔다고 알리고 맵부터 다시
      else { C.loading = true; C.lastSnap = performance.now(); Net.relay({ k: 'setup', rejoin: true, hero: this.save.selected, skin: this.skinSprite(this.save.selected), line: this.chosenLine(this.save.selected).id, treasure: this.save.treasureEquipped, loadout: this.save.loadout, jobLv: this.jobLevel(this.save.selected) }, C.hostId); this.showBanner('다시 연결되었습니다', null, '#7affc0'); }
      return; }
    if (t === 'lost') {
      if (C.guest) this.coopGuestEnd({ victory: false, disconnected: true });
      else { for (const [name, orig] of Object.entries(C.fxOrig || {})) this.effects[name] = orig; this.player = C.me; this.coop = null; this.remotes = new Map(); this.showBanner('서버와 연결이 끊겨 혼자 계속합니다', null, '#ffb070'); } // 방장: 탐험은 계속
    }
  },
  coopStatusDraw(ctx) { // 연결 상태 안내 (화면 가운데 위)
    const C = this.coop; if (!C) return; const now = performance.now(); let msg = null;
    if (Net.ping) { const P = Net.ping; hudText(ctx, `핑 ${P}ms`, VIEW_W - 6, VIEW_H - 74, P < 90 ? '#7affc0' : P < 180 ? '#ffd27a' : '#ff8a8a', 'right', 7); } // 서버까지 왕복 시간
    if (C.netLostAt || Net.rejoin) msg = `서버 연결이 끊겼습니다 — 다시 연결하는 중… (${Math.max(0, Math.ceil((Net.REJOIN_MS - (now - (Net.rejoin ? Net.rejoin.since : now))) / 1000))}초)`;
    else if (C.guest && C.hostLostAt) msg = `방장 연결이 끊겼습니다 — 기다리는 중… (${Math.max(0, Math.ceil((25000 - (now - C.hostLostAt)) / 1000))}초)`;
    else if (C.guest && !C.loading && C.lastSnap && now - C.lastSnap > 2500) msg = '방장 화면 응답을 기다리는 중…';
    if (!msg) return; ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(VIEW_W / 2 - 150, 40, 300, 18); hudText(ctx, msg, VIEW_W / 2, 44, '#ffd27a', 'center', 8);
  },
  coopGather(r, leader) { // 전투가 시작된 방 밖의 플레이어를 앞장선 사람 곁(방 안)으로 옮김
    const map = this.map, c = map.tileCenter(r.cx, r.cy), base = leader && map.isFullyInside(leader, r) ? leader : c; let i = 0;
    for (const p of this.allPlayers()) {
      if (p === leader || map.isFullyInside(p, r)) continue;
      let x = c.x, y = c.y; i++;
      for (let k = 0; k < 16; k++) { const a = (i * 2.3 + k * 0.9), d = 16 + k * 4, tx = base.x + Math.cos(a) * d, ty = base.y + Math.sin(a) * d;
        if (!overlapsSolid(tx, ty, p.half, map) && map.isFullyInside({ x: tx, y: ty, half: p.half }, r)) { x = tx; y = ty; break; } }
      p.x = x; p.y = y; this.effects.ring(x, y, 14, '#7affc0');
      const R = [...this.remotes.values()].find((q) => q.p === p); if (R) { R.warp++; R.rx = undefined; } // 참가자 화면도 옮김
    }
  },
  coopOnStage() { // 새 스테이지: 모두 시작 방으로, 쓰러진 사람 부활, 맵 보내기
    const s = this.map.startRoom, c = this.map.tileCenter(s.cx, s.cy); let i = 1;
    for (const p of this.allPlayers()) { if (p.state === 'DEAD') { p.state = 'NORMAL'; p.deathTimer = 0; p.hp = Math.max(1, Math.round(p.maxHp * COOP.reviveRatio)); p.hurtInvuln = 2; } }
    for (const R of this.remotes.values()) { R.p.x = c.x + (i % 2 ? 14 : -14) * Math.ceil(i / 2); R.p.y = c.y + 10; R.p.shield = R.p.maxShield; R.warp++; R.rx = undefined; i++; }
    this.coopSendMap();
  },
  coopSendMap(to) {
    const m = this.map, idx = new Map(m.rooms.map((r, i) => [r, i]));
    this.coop.lastTiles = m.tiles.slice(); this.coop.eknown = null; this.coop.slast = null; this.coop.snapN = 0; // 새 맵: 다음 화면 공유는 전부
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
    const C = this.coop; this.coopInviteMissing(dt); C.snapT -= dt; if (C.snapT > 0) return; C.snapT = 1 / COOP.snapHz; this.coopHostSendGev();
    C.snapN = (C.snapN || 0) + 1; const full = C.snapN % 18 === 1; // 1.5초마다 전부 (중간에 놓친 값 보정), 그 사이엔 바뀐 것만
    const pl = (p, id, warp) => ({ id, x: Math.round(p.x), y: Math.round(p.y), h: p.hero.id, lk: p.line && p.line.look ? p.line.look : null, a: r1(p.aimVis), f: p.faceVis, st: p.state === 'DEAD' ? 'X' : p.state === 'DASH' ? 'D' : 'N', mv: p.moving ? 1 : 0,
      hp: Math.ceil(p.hp), mhp: p.maxHp, sh: Math.ceil(p.shield), msh: p.maxShield, en: Math.floor(p.energy), men: p.maxEnergy, w: p.weapons.map((x) => x.def.id), wl: p.weapons.map((x) => x.lv || 0), sl: p.slot,
      sk: r1(p.skillCooldown), skm: r1(p.skillCdMax), dc: p.dsCharges, sn: p.skillName, tr: p.treasure ? p.treasure.id : null, tc: r1(p.treasureCd), rk: p.rank, ln: p.line ? p.line.id : null, wp: warp, inv: p.hurtInvuln > 0 ? 1 : 0, ag: p.aegisT > 0 ? 1 : 0, sb: p.scabbardT > 0 ? 1 : 0, rv: r1((p.reviveT || 0) / COOP.reviveTime), sk: p === C.me ? this.skinSprite(p.hero.id, this.playerLineId(p)) : (p.remoteSkin && skinAllowed(p.remoteSkin, p.hero.id, p.line && p.line.id) ? p.remoteSkin : null), hy: p.hybrid ? p.hybrid.title : null, fr: p.weapon ? Math.round(this.weaponSystem.getFireRate(p, p.weapon) / (p.weapon.def.fireRate || 1) * 100) / 100 : 1 }); // fr: 공속 배율 (참가자 화면의 탄을 실제 연사 속도로)
    const players = [pl(C.me, Net.id, 0), ...[...this.remotes.values()].map((R) => { const e = pl(R.p, R.id, R.warp); if (R.px || R.py) { e.px = r1(R.px); e.py = r1(R.py); R.px = 0; R.py = 0; } return e; })];
    C.plast = C.plast || {}; const STATIC = ['h', 'lk', 'sk', 'mhp', 'msh', 'men', 'w', 'wl', 'sn', 'tr', 'ln', 'hy', 'skm', 'rk']; // 잘 안 바뀌는 값은 바뀔 때만
    for (const e of players) { const L = C.plast[e.id] || (C.plast[e.id] = {}); for (const k of STATIC) { const v = JSON.stringify(e[k] ?? null); if (!full && L[k] === v) delete e[k]; else L[k] = v; } }
    C.sent = C.sent || new Set(); const zs = [], seenZ = new Set();
    C.zlast = C.zlast || new Map(); let nFull = 0; // 장판·소환물: 처음엔 전부, 그다음엔 바뀐 값만 (데이터 절약)
    for (const z of [...this.zones, ...this.allies]) { if (!COOP_CLASSES[z.constructor.name]) continue; if (!z.nid) z.nid = ++C.nid; seenZ.add(z.nid);
      const isNew = !C.sent.has(z.nid); if (isNew && nFull >= 12) continue; // 한 번에 전부 보내는 건 12개까지 (메시지가 너무 커지지 않게, 나머지는 다음 번에)
      const zfull = (full && nFull < 12) || isNew; if (zfull) nFull++; const pk = coopPack(z, zfull), last = zfull ? {} : C.zlast.get(z.nid) || {}, out = { c: pk.c, n: pk.n }; if (zfull) out.f = 1; // 처음·1.5초마다 전부 (f: 전부 보낸 것)
      const needRef = COOP_REF_RENDER.has(pk.c); // 그릴 때 주인·대상 위치가 필요한 것만 계속 보냄
      for (const k of Object.keys(pk)) { if (k === 'c' || k === 'n') continue; if (!zfull && (k === 'cd' || k === 'next' || k === 'timer' || k === 't')) continue; /* 그림에 안 쓰는 내부 시간 (t는 참가자 쪽에서 흘러감) */ if (!zfull && !needRef && pk[k] && typeof pk[k] === 'object' && (pk[k].$p || pk[k].$e || (Array.isArray(pk[k]) && pk[k][0] && (pk[k][0].$p || pk[k][0].$e)))) continue; const v = JSON.stringify(pk[k]); if (zfull || last[k] !== v) { out[k] = pk[k]; last[k] = v; } }
      C.zlast.set(z.nid, last); zs.push(out); C.sent.add(z.nid); }
    for (const id of [...C.sent]) if (!seenZ.has(id) && ![...this.zones, ...this.allies].some((z) => z.nid === id)) { C.sent.delete(id); C.zlast.delete(id); }
    C.eknown = C.eknown || new Set(); const enew = (e) => { const n = full || !C.eknown.has(e.nid); C.eknown.add(e.nid); return n; }; // 적 종류·최대 체력은 처음(과 1.5초마다)만
    const en = this.enemies.map((e) => { if (!e.nid) e.nid = ++C.nid; const nw = enew(e); return [e.nid, nw ? e.def.id : '', Math.round(e.x), Math.round(e.y), Math.ceil(e.hp), nw ? e.maxHp : 0, e.state, e.face, e.phase || 1, e.elite ? 1 : 0, e.hurtFlash > 0 ? 1 : 0, Math.round(e.jumpH || 0), r1(e.fade ?? 1), r1(e.aimAng || 0), r1(e.stateTime), e.laser ? [e.laser.angs.map(r1), e.laser.width, e.laser.color, e.laser.live ? 1 : 0] : 0, e.chainT > 0 ? [r1(e.chainT), r1(e.chainMax || e.chainT)] : 0, e.def.boss && e.pat && (e.state === 'TELEGRAPH' || e.state === 'ATTACK') ? [e.pat.type, e.pat.color || '', e.pat.radius || 0, Math.round((e.pd && e.pd.tx) || e.x), Math.round((e.pd && e.pd.ty) || e.y)] : 0, e.def.boss ? [e.shieldAng != null ? r1(e.shieldAng) : null, e.negateT > 0 ? 1 : 0, r1(e.wallCone || 0), e.riposteT > 0 ? 1 : 0, e.armOn ? 1 : 0, e.slashWarn ? [r1(e.slashWarn.ang), r1(e.slashWarn.arc), Math.round(e.slashWarn.r), r1(e.slashWarn.k)] : 0, e.dashWarn ? [r1(e.dashWarn.ang), Math.round(e.dashWarn.len), e.dashWarn.w, r1(e.dashWarn.k)] : 0, e.fortress ? [Math.round(e.fortress.r), r1(e.fortress.k)] : 0] : 0]; }); // 보스 예고 표시용 패턴 · 마지막: 갤러해드 방패 방향 · 가레스 부정
    const oi = new Map([[C.me, 0], ...[...this.remotes.values()].map((R, i) => [R.p, i + 1])]); // 탄 주인 (플레이어 목록 순서)
    const pr = this.projectiles.filter((q) => !q.orbit).slice(0, 160).map((q) => [Math.round(q.x), Math.round(q.y), Math.round((q.dx || 0) * (q.speed || 0)), Math.round((q.dy || 0) * (q.speed || 0)), q.color, q.size || 1, oi.has(q.owner) ? oi.get(q.owner) : -1, coopPredictable(q.wdef) ? 1 : 0, coopProjLook(q)]);
    const eb = this.enemyBullets.slice(0, 240).map((b) => [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.r, b.color]);
    const td = []; const T = this.map.tiles, L = C.lastTiles; if (L && L.length === T.length) for (let i = 0; i < T.length; i++) if (T[i] !== L[i]) { td.push([i, T[i]]); L[i] = T[i]; }
    C.seq = (C.seq || 0) + 1;
    const msg = { k: 'snap', q: C.seq, g: this.gold, kills: this.kills, wi: this.worldIdx, li: this.levelIdx, pl: players, en, pr, eb,
      pk: this.pickups.map((k) => [k.kind, Math.round(k.x), Math.round(k.y), k.def ? k.def.id : 0]),
      hz: this.hazards.map((h) => [Math.round(h.x), Math.round(h.y), h.r, r1(h.t), h.delay, h.color, h.kind || 0]),
      po: this.portals.map((p) => [Math.round(p.x), Math.round(p.y), p.label || '', p.color || null]),
      rv: this.map.rooms.map((r) => (r.visited ? 1 : 0)).join(''), td, fx: (C.fxCount && Object.keys(C.fxCount).forEach((k) => { C.fxCount[k] = 0; }), C.fx.splice(0)), zs,
      pp: this.props.map((o) => { let lb = ''; try { lb = o.label ? o.label(this) || '' : ''; } catch (e) { lb = ''; } const own = COOP_OWN_LABEL[o.constructor.name]; return [o.constructor.name, Math.round(o.x), Math.round(o.y), own ? '' : lb, o.open ? 1 : 0, o.content || 0, own ? own.map((k) => o[k]) : 0]; }) };
    C.slast = C.slast || {}; for (const k of ['pk', 'po', 'rv', 'pp']) { const v = JSON.stringify(msg[k]); if (!full && C.slast[k] === v) delete msg[k]; else C.slast[k] = v; } // 그대로면 생략
    if (!td.length) delete msg.td; if (!msg.fx.length) delete msg.fx; if (!msg.hz.length && C.lastHz === 0) delete msg.hz; C.lastHz = this.hazards.length;
    Net.relay(msg);
  },
  coopInviteMissing(dt) { // 방에는 있는데 탐험에 안 들어온 사람(결과 화면·화면 전환 중이던 사람, 나중에 들어온 사람)을 3초마다 다시 부름
    const C = this.coop; C.inviteT = (C.inviteT || 0) - dt; if (C.inviteT > 0) return; C.inviteT = 3;
    for (const P of Net.players) if (P.id !== Net.id && !this.remotes.has(P.id)) Net.relay({ k: 'start', deep: !!this.runDeep, late: true }, P.id);
  },
  coopHostSendGev() { for (const R of this.remotes.values()) if (R.gev && R.gev.length) { Net.relay({ k: 'gev', e: R.gev.splice(0, 200) }, R.id); } },
  coopHostEnd(victory) {
    const C = this.coop; if (!C) return;
    const { stages, bosses } = this.runReward(victory); // 참가자도 같은 기준 (실제로 깬 것만)
    this.coopHostSendGev(); Net.relay({ k: 'end', victory, stages, bosses, deep: this.W && this.W.deep ? this.W.depth : 0, row: this.runScoreRow(victory) }); Net.raw({ t: 'start', on: false });
    for (const [name, orig] of Object.entries(C.fxOrig || {})) this.effects[name] = orig; // 연출 기록 해제
    this.player = C.me; this.coop = null; this.remotes = new Map();
  },

  // ── 참가자
  coopGuestStart(hostId, deep = false) {
    SFX.stopMusic(); this.overlay = null; this.cutscene = null; this.cinematic = null; this.slowMo = null; this.trialW = null;
    this.coop = { guest: true, hostId, loading: true, others: new Map(), enemies: new Map(), inT: 0, ev: [], warp: -1 };
    this.mode = 'dungeon'; this.gold = 0; this.kills = 0;
    const switched = deep ? this.deepEntryHero() : null; if (switched) { Net.profile(this.netName(), switched); this.showBanner(`심층 입장 — ${this.heroDef(switched).name}(으)로 바꿈`, '이 직업·진화 루트로 10-4를 깬 기록이 없어 가장 최근에 10-4를 깬 캐릭터로', '#9ad8ff'); } // 참가자도 같은 규칙
    this.player = this.makePlayer(0, 0);
    const tr = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped); if (tr) this.player.treasure = tr;
    const cp = deep && this.deepCheckpoint(this.save.selected); // 심층: 내 직업으로 10-4를 깬 캐릭터가 있으면 그대로
    if (cp) { this.player = this.playerFromSnapshot(this.player.hero, cp); this.useCheckpoint(this.player, cp, tr); }
    Net.relay({ k: 'setup', hero: this.save.selected, skin: this.skinSprite(this.save.selected), line: this.chosenLine(this.save.selected).id, treasure: this.save.treasureEquipped, loadout: this.save.loadout, jobLv: this.jobLevel(this.save.selected), cp: cp || null }, hostId);
    if (cp) return;
    const lines = jobLines(this.player.hero.id); // 갈래 고르기 (방장에게 알림)
    if (lines.length > 1 && !branchesAtEvolve(this.player.hero.id)) { const L = this.chosenLine(this.player.hero.id); Net.relay({ k: 'variant', id: L.id }, hostId); this.setJob(this.player, L, 0); } /* [사용자 결정] 로비에서 고른 진화 루트로 바로 */
    else if (lines[0]) this.setJob(this.player, lines[0], 0);
  },
  coopGuestMap(d) {
    const m = new DungeonMap(d.w, d.h, d.palette); m.tiles = b64.dec(d.tiles);
    m.rooms = d.rooms.map((r) => Object.assign({ visited: false, state: 'idle' }, r)); m.edges = d.edges.map(([a, b]) => [m.rooms[a], m.rooms[b]]); m.startRoom = m.rooms[d.start];
    this.worldIdx = d.wi; this.levelIdx = d.li;
    this.resetWorldLists(m); this.coop.enemies.clear(); this.coop.loading = false; this.coop.lastSnap = performance.now(); this.coop.zones && this.coop.zones.clear(); this.coop.seq = 0; Net.relay({ k: 'rf' }, this.coop.hostId); // 맵을 받았으면 화면 공유도 전부 다시
    const sp = d.spawn && d.spawn[Net.id], c = sp || this.map.tileCenter(m.startRoom.cx, m.startRoom.cy);
    this.player.x = c.x; this.player.y = c.y; this.player.state = 'NORMAL';
    this.snapCamera(); this.showBanner(`${stageLabel(this.worldIdx, this.levelIdx)}  ${this.W.name}`, '방장과 함께하는 탐험', '#7affc0');
  },
  coopGuestSnap(d) {
    const C = this.coop, nowS = performance.now(); C.lastSnap = nowS; if (C.loading || !this.map) return;
    if (C.seq && d.q !== C.seq + 1 && nowS - (C.rfAt || 0) > 1000) { C.rfAt = nowS; Net.relay({ k: 'rf' }, C.hostId); } C.seq = d.q; // 화면 공유가 빠졌으면 전부 다시 요청
    this.gold = d.g; this.kills = d.kills; this.worldIdx = d.wi; this.levelIdx = d.li;
    const seen = new Set();
    C.pls = C.pls || {};
    for (const s0 of d.pl) {
      const s = Object.assign(C.pls[s0.id] || (C.pls[s0.id] = {}), s0); if (!s0.px && !s0.py) { delete s.px; delete s.py; } // 생략된 값은 지난번 값으로
      const mine = s.id === Net.id;
      let o = mine ? null : C.others.get(s.id);
      if (!mine && !o) { const hero = this.data.heroes.get(s.h) || DATA_HEROES[0]; o = { id: s.id, p: new Player(s.x, s.y, hero, this.data.base) }; C.others.set(s.id, o); }
      const p = mine ? this.player : o.p; if (!mine) seen.add(s.id);
      if (!mine) { coopVel(p, s.x, s.y, nowS); if (Math.hypot(p.x - s.x, p.y - s.y) > 80) { p.x = s.x; p.y = s.y; p.vx = p.vy = 0; } p.aimVis = s.a; p.faceVis = s.f; p.moving = !!s.mv; p.hurtInvuln = s.inv ? 0.1 : 0; const base = this.data.heroes.get(s.h); if (base) p.hero = s.lk ? heroWithLook(base, s.lk) : base; if ('sk' in s) p.skinShown = skinSpriteOk(s.sk); }
      else if (s.wp !== C.warp) { p.x = s.x; p.y = s.y; C.warp = s.wp; } // 방장이 옮겼을 때만 내 위치를 맞춤
      else if (s.px || s.py) moveAndCollide(p, s.px || 0, s.py || 0, this.map); // 끌려감·밀림
      p.reviveT = s.rv * COOP.reviveTime; p.hybridTitle = s.hy; p.aegisT = s.ag ? Math.max(p.aegisT || 0, 0.3) : 0; p.scabbardT = s.sb ? Math.max(p.scabbardT || 0, 1.2) : 0; /* 방패·칼집 그림 */ if (mine) C.fr = s.fr || 1;
      if (mine && s.hp + s.sh < p.hp + p.shield - 0.5) { this.addShake(0.15, 3); if (s.hp < p.hp) { this.hurtFlash = 0.35; SFX.play('hurt'); } else SFX.play('shield'); this.effects.text(p.x, p.y - 16, '-' + Math.round(p.hp + p.shield - s.hp - s.sh), '#ff6b6b', true); } // 내가 맞음
      if (mine && s.st === 'X' && p.state !== 'DEAD') this.showBanner('쓰러졌습니다', '동료가 곁에 3초 서 있으면 일어나고, 아니면 다음 스테이지에서 부활합니다', '#ff8a8a');
      p.hp = s.hp; p.maxHp = s.mhp; p.shield = s.sh; p.maxShield = s.msh; p.energy = s.en; p.maxEnergy = s.men;
      if (s.st === 'X' && p.state !== 'DEAD') { p.state = 'DEAD'; p.deathTimer = 0; } else if (s.st !== 'X' && p.state === 'DEAD') p.state = 'NORMAL';
      if (p.weapons.map((w) => w.def.id + (w.lv || 0)).join() !== s.w.map((id, i) => id + s.wl[i]).join()) p.weapons = s.w.filter((id) => this.data.weapons.get(id)).map((id, i) => new WeaponInstance(this.data.weapons.get(id), s.wl[i] || 0));
      p.slot = Math.min(s.sl, Math.max(0, p.weapons.length - 1)); p.skillCooldown = s.sk; p.skillCdMax = s.skm; if (s.dc != null) p.dsCharges = s.dc; p.skillName = s.sn; p.treasureCd = s.tc; p.treasure = DATA_TREASURES.find((t) => t.id === s.tr) || null; p.rank = s.rk;
      if (mine && s.ln && (!p.line || p.line.id !== s.ln)) { const L = jobLines(p.hero.id).find((l) => l.id === s.ln); if (L) this.setJob(p, L, s.rk); }
    }
    for (const id of [...C.others.keys()]) if (!seen.has(id)) C.others.delete(id);
    const live = new Set();
    this.enemies = d.en.map(([nid, defId, x, y, hp, mhp, st, face, ph, el, fl, jh, fade, aim, stt, laser, chain, bp, gx]) => {
      live.add(nid); let e = C.enemies.get(nid); const def = defId ? this.data.enemies.get(defId) : e && e.def; if (!def) return null; // 종류는 처음에만 옴
      if (!e) { e = new Enemy(x, y, def, { hp: 1, dmg: 1 }, null); e.pd = {}; C.enemies.set(nid, e); }
      coopVel(e, x, y, nowS); if (Math.hypot(e.x - x, e.y - y) > 60) { e.x = x; e.y = y; e.vx = e.vy = 0; }
      e.hp = hp; if (mhp) e.maxHp = mhp; if (e.state !== st) e.stateTime = stt; e.state = st; e.face = face; e.phase = ph; e.elite = !!el; if (fl) e.hurtFlash = 0.08; e.jumpH = jh; e.fade = fade; e.aimAng = aim; e.pat = bp ? { type: bp[0], color: bp[1], radius: bp[2] } : null; if (bp) e.pd = Object.assign(e.pd || {}, { tx: bp[3], ty: bp[4] }); // 보스 예고 (내려찍기 자리 등)
      e.chainT = chain ? chain[0] : 0; e.chainMax = chain ? chain[1] : 0; // 황금 사슬 (묶인 모습)
      if (gx) { e.shieldAng = gx[0]; e.negateT = gx[1] ? 0.2 : 0; e.wallCone = gx[2]; e.riposteT = gx[3] ? 0.2 : 0; e.armOn = !!gx[4]; e.slashWarn = gx[5] ? { ang: gx[5][0], arc: gx[5][1], r: gx[5][2], k: gx[5][3] } : null; e.dashWarn = gx[6] ? { ang: gx[6][0], len: gx[6][1], w: gx[6][2], k: gx[6][3] } : null; e.fortress = gx[7] ? { r: gx[7][0], k: gx[7][1] } : null; } /* 철벽 방패·부정의 빛 그림 */
      e.alive = st !== 'DEAD'; e.laser = laser ? { angs: laser[0], width: laser[1], color: laser[2], live: !!laser[3] } : null;
      return e;
    }).filter(Boolean);
    for (const id of [...C.enemies.keys()]) if (!live.has(id)) C.enemies.delete(id);
    const mover = (o) => { o.update = function (dt) { this.x += this.vx * dt; this.y += this.vy * dt; }; return o; };
    const myIdx = d.pl.findIndex((q) => q.id === Net.id); C.local = (C.local || []).filter((q) => q.alive);
    this.projectiles = d.pr.filter((q) => !(q[6] === myIdx && q[7])).map(([x, y, vx, vy, c, s, , , look]) => coopProjView(x, y, vx, vy, c, s, look, this.time)).concat(C.local); /* 진짜 탄 모양으로 (궤적·빛·모양) */ // 내 단순한 탄은 내 화면에서 미리 그린 것으로
    const lat = coopLat(); // 방장 쪽 '지금' 위치로 앞당겨 그림 (피하는 감각을 방장 판정과 맞춤)
    this.enemyBullets = d.eb.map(([x, y, vx, vy, r, c]) => mover(Object.assign(Object.create(EnemyBullet.prototype), { x: x + vx * lat, y: y + vy * lat, vx, vy, r, color: c, alive: true })));
    if (d.pk) this.pickups = d.pk.map(([kind, x, y, id]) => new Pickup(kind, x, y, { still: true, def: id ? this.data.weapons.get(id) : null }));
    if (d.hz) this.hazards = d.hz.map(([x, y, r, t, delay, color, kind]) => Object.assign(Object.create((kind === 'deny' ? DenyZone : kind === 'eye' ? WatchEye : Hazard).prototype), { x, y, r, t, delay, color, kind, alive: true })); /* deny: 가레스의 부정 장판 */
    if (d.po) this.portals = d.po.map(([x, y, label, col]) => new Portal(x, y, () => {}, label, col || undefined));
    if (d.pp) this.props = d.pp.map(([cls, x, y, label, open, content, own]) => { // 상자는 진짜 그림, 나머지는 표시 + 이름 (가까이 가면)
      const K = COOP_OWN_LABEL[cls] && own && typeof window[cls] !== 'undefined' ? window[cls] : (COOP_OWN_LABEL[cls] && own ? Function('return typeof ' + cls + " !== 'undefined' ? " + cls + ' : null')() : null);
      if (K) { const o = Object.create(K.prototype); o.x = x; o.y = y; o.radius = 20; COOP_OWN_LABEL[cls].forEach((k, i) => { o[k] = own[i]; }); o.interact = () => {}; return o; } // 진짜 물건 그림 + 내 무기 기준 이름표
      if (cls === 'Chest') { const c = new Chest(x, y, content); c.open = !!open; c.label = () => label || null; c.interact = () => {}; return c; }
      return { x, y, radius: 20, label: () => label || null, labelColor: '#c8b890', interact() {}, render(ctx) { const X = Math.round(this.x), Y = Math.round(this.y); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(X - 7, Y + 4, 14, 3); ctx.fillStyle = OUTLINE; ctx.fillRect(X - 6, Y - 9, 12, 13); ctx.fillStyle = '#8a7a5a'; ctx.fillRect(X - 5, Y - 8, 10, 11); ctx.fillStyle = '#ffd84a'; ctx.fillRect(X - 1, Y - 5, 2, 5); } };
    });
    if (d.rv) d.rv.split('').forEach((v, i) => { if (this.map.rooms[i]) this.map.rooms[i].visited = v === '1'; });
    for (const [i, v] of d.td || []) { this.map.tiles[i] = v; if (this.map.cache) this.map.redrawTile(i % this.map.width, Math.floor(i / this.map.width)); }
    for (const [name, ...a] of d.fx || []) if (typeof this.effects[name] === 'function') try { this.effects[name](...a); } catch (e) { /* 연출 하나가 실패해도 계속 */ }
    C.zones = C.zones || new Map(); const zl = [], al = [], seenZ = new Set(); // 장판·소환물
    for (const z of d.zs || []) { const K = COOP_CLASSES[z.c]; if (!K) continue; let o = C.zones.get(z.n);
      if (!o && !z.f) continue; // 전부 받은 적이 없으면(불러오는 중에 놓침) 다음 전부가 올 때까지 그리지 않음
      seenZ.add(z.n);
      if (!o) { o = Object.create(K.prototype); o.alive = true; C.zones.set(z.n, o); // 그림이 실패해도 게임은 계속 (그리기 상태는 따로 저장·복원 → 화면이 망가지지 않음)
        o.render = function (ctx) { coopSafeDraw(ctx, () => K.prototype.render.call(this, ctx, window.__game)); };
        if (K.prototype.renderTop) o.renderTop = function (ctx) { coopSafeDraw(ctx, () => K.prototype.renderTop.call(this, ctx, window.__game)); }; }
      for (const [k, v] of Object.entries(coopUnpack(z))) { if (k === 'f') continue; try { o[k] = v; } catch (e) { /* 읽기 전용 값은 건너뜀 */ } } (['Turret', 'Drone', 'SpiritWolf'].includes(z.c) ? al : zl).push(o); }
    for (const id of [...C.zones.keys()]) if (!seenZ.has(id)) C.zones.delete(id);
    this.zones = zl; this.allies = al;
  },
  coopGuestSanctum(d) { // 방장과 함께 10-4를 깸: 성역 도달·이 캐릭터 저장(심층 입장용)·보구 선택 (내 화면에서)
    const sv = this.save; sv.sanctumReached = true; if (d.cp) { const c = this.deepCps(); c[this.deepKey(sv.selected, d.cp.line || null)] = d.cp; } writeSave(sv); /* 직업·계열마다 따로 */
    this.overlay = { type: 'story', sanctum: true, lines: SANCTUM_LINES, i: 0, t: 0, done: () => { this.overlay = { type: 'treasure_pick', msg: null }; } }; this.input.mouse.down = false;
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
    let input = input0; const C = this.coop, now = performance.now();
    if (C.hostLostAt && now - C.hostLostAt > 25000) { this.coopGuestEnd({ victory: false, hostLeft: true }); input0.endStep(); return; } // 방장이 돌아오지 않음
    if (!C.loading && C.lastSnap && now - C.lastSnap > 2500 && now - (C.rfAt || 0) > 3000) { C.rfAt = now; Net.relay({ k: 'rf' }, C.hostId); } // 오래 안 오면 전부 다시 요청
    if (!C.loading && C.lastSnap && now - C.lastSnap > 30000 && Net.status === 'online' && !document.hidden) { this.coopGuestEnd({ victory: false, disconnected: true }); input0.endStep(); return; } // 연결은 됐지만 30초 동안 화면이 안 옴
    if (this.banner) this.banner.t += dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.transition) { this.transition.t += dt; if (!this.transition.swapped && this.transition.t >= 0.45) { this.transition.swapped = true; this.transition.action(); } if (this.transition.t >= 0.9) this.transition = null; input.endStep(); return; }
    if (this.cutscene) { this.updateCutscene(dt, input); this.effects.update(dt); this.updateCamera(dt); input.endStep(); return; } // 방장과 같은 컷신 (내 쪽에서 넘김)
    if (this.overlay && this.overlay.remote) { this.coopGuestOverlayInput(input); input = NULL_INPUT; } // 창을 띄운 채로도 세계는 계속 (캐릭터는 멈춤)
    else if (this.overlay) { this.updateOverlay(input); input.endStep(); if (!this.coop || this.overlay) { if (this.coop && !C.loading) { C.inT -= dt; if (C.inT <= 0) { C.inT = 1 / COOP.inHz; Net.relay({ k: 'in', wp: C.warp, x: Math.round(this.player.x), y: Math.round(this.player.y), d: 0, md: 0, ax: 0, ay: 0, ev: [] }, C.hostId); } } return; } } // 창을 연 동안은 공격을 멈춤
    if (C.loading || !this.map) { input.endStep(); return; }
    if (input.wasPressed('Escape')) { this.overlay = { type: 'pause' }; input.endStep(); return; }
    const p = this.player, mw = this.mouseWorld();
    if (p.state !== 'DEAD') { // 내 캐릭터 이동·대시는 바로 (반응성)
      p.update(dt, input, this.map, mw);
      for (const k of COOP.events) if (input.wasPressed(k)) C.ev.push(k);
      if (input.wasPressed('Mouse0') && this.minimapClick(input.mouse)) input.mouse.down = false;
    }
    const md = input.mouse.down && p.state !== 'DEAD' ? 1 : 0; if (C.ev.length || md !== C.lastMd) C.inT = 0; C.lastMd = md; // 누르기·떼기·스킬은 바로 보냄 (공격이 늦게 나가는 느낌 줄임)
    this.coopLocalFire(p, md, mw, dt); // 내 공격은 내 화면에 바로 (소리·탄·휘두르기 — 실제 판정은 방장)
    if (C.local && C.local.length) { for (let i = this.projectiles.length - 1; i >= 0; i--) if (this.projectiles[i].local && !this.projectiles[i].alive) this.projectiles.splice(i, 1); }
    C.inT -= dt;
    if (C.inT <= 0) { C.inT = 1 / COOP.inHz; Net.relay({ k: 'in', wp: C.warp, x: Math.round(p.x), y: Math.round(p.y), d: p.state === 'DASH' ? 1 : 0, md: input.mouse.down ? 1 : 0, ax: Math.round(mw.x), ay: Math.round(mw.y), ev: C.ev.splice(0) }, C.hostId); }
    const k = Math.min(1, dt * 12);
    for (const o of C.others.values()) { coopSmooth(o.p, dt, now); o.p.time += dt; }
    for (const e of this.enemies) { coopSmooth(e, dt, now); e.stateTime += dt; e.hurtFlash = Math.max(0, e.hurtFlash - dt); }
    for (const q of this.projectiles) q.update(dt);
    for (const b of this.enemyBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    for (const h of this.hazards) { h.t += dt; if (h.kind === 'deny' && h.t < h.delay && Math.hypot(this.player.x - h.x, this.player.y - h.y) < h.r) this.player.denyT = 0.15; } /* 부정 장판 안에선 내 화면에서도 공격 안 나감 */
    for (const pk of this.pickups) pk.t += dt;
    for (const po of this.portals) po.t += dt;
    this.interactTarget = p.state !== 'DEAD' ? this.findInteractTarget() : null; // 가까운 상자·상점 이름 표시 (E는 방장에게 전달)
    this.effects.update(dt);
    this.shake = Math.max(0, (this.shake || 0) - dt); if (this.shake === 0) this.shakeMag = 0;
    this.screenFlash = Math.max(0, (this.screenFlash || 0) - dt);
    for (const z of this.zones) if (typeof z.t === 'number') z.t += dt; // 장판 애니메이션
    for (const z of this.allies) if (typeof z.t === 'number') z.t += dt; // 소환물 애니메이션 (방장은 1.5초마다만 보냄)
    this.updateCamera(dt);
    input0.endStep();
  },
  coopLocalFire(p, md, mw, dt) {
    const C = this.coop, w = p.weapons[p.slot]; if (!w || p.denyT > 0) return; const def = w.def, fr = C.fr || 1;
    if (C.lastW !== def.id) { C.lastW = def.id; C.fireCd = 0.1; C.spin = 0; C.chargeT = 0; C.burst = null; } // 무기를 바꾸면 처음부터
    C.fireCd = (C.fireCd || 0) - dt;
    if (C.burst) { C.burst.t -= dt; if (C.burst.t <= 0 && C.burst.left > 0) { C.burst.left--; C.burst.t = def.burst.interval; this.coopPredictShot(p, def, mw); } if (C.burst.left <= 0) C.burst = null; } // 연사 총: 남은 발
    if (def.type === 'charge') { // 충전 무기: 누르는 동안 모으고, 떼면 쏨
      if (md) C.chargeT = (C.chargeT || 0) + dt * fr;
      else if (C.chargeT > 0.05 && C.fireCd <= 0 && p.energy >= (def.energyCost || 0)) { const k = 0.3 + 0.7 * Math.min(1, C.chargeT / (def.chargeTime || 0.5)); this.coopPredictShot(p, def, mw, { speed: (def.projectileSpeed || 400) * (0.6 + 0.4 * k), pierce: k >= 1 ? def.pierce || 0 : 0 }); SFX.play(weaponSound(def), 0.03); C.fireCd = 1 / Math.max(0.3, def.fireRate * fr); C.chargeT = 0; }
      else if (!md) C.chargeT = 0;
      return;
    }
    if (def.spinUp) C.spin = md ? Math.min(def.spinUp, (C.spin || 0) + dt) : 0; // 회전 기관총: 누를수록 빨라짐
    if (!md || C.fireCd > 0 || C.burst || (def.type !== 'gun' && def.type !== 'melee') || p.energy < (def.energyCost || 0)) return;
    const rate = (def.fireRate || 2) * fr * (def.spinUp ? 0.25 + 0.75 * Math.min(1, C.spin / def.spinUp) : 1);
    C.fireCd = 1 / Math.max(0.3, rate);
    SFX.play(def.type === 'melee' ? 'melee' : weaponSound(def), def.fireRate > 8 ? 0.06 : 0.03);
    this.coopPredictShot(p, def, mw);
    if (def.burst && coopPredictable(def)) C.burst = { left: def.burst.count - 1, t: def.burst.interval };
  },
  coopPredictShot(p, def, mw, ov = {}) { // 내 공격을 내 화면에 바로 그림 (실제 판정은 방장) → 반응이 늦은 느낌 줄임
    const a = Math.atan2(mw.y - p.y, mw.x - p.x);
    if (def.type === 'melee') { p.swing = { t: 0, dur: 0.14, ang: a, arc: (def.arcDeg || 90) * Math.PI / 180, thrust: (def.arcDeg || 90) <= 40 }; return; }
    if (!coopPredictable(def)) return;
    const C = this.coop, n = def.projectileCount || 1, sp = (def.spreadDeg || 0) * Math.PI / 180, map = this.map, game = this;
    for (let i = 0; i < n; i++) {
      const ang = def.fanDeg && n > 1 && !def.parallel ? a + (i / (n - 1) - 0.5) * def.fanDeg * Math.PI / 180 : a + (Math.random() * 2 - 1) * sp, v = ov.speed || def.projectileSpeed || 400, off = def.parallel ? (i - (n - 1) / 2) * def.parallel : 0;
      const q = { local: true, alive: true, x: p.x - Math.sin(a) * off, y: p.y - 1 + Math.cos(a) * off, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, left: def.range || 300, pierce: ov.pierce ?? def.pierce ?? 0, bounces: def.bounce || 0, c: def.bulletColor || '#fff', s: def.bulletSize || 1,
        update(dt) { if (!this.alive) return; const sx = this.vx * dt, sy = this.vy * dt; this.x += sx; this.y += sy; this.left -= Math.hypot(sx, sy);
          if (this.left > 0 && map.isSolidAt(this.x, this.y) && this.bounces > 0) { this.bounces--; const hx = map.isSolidAt(this.x, this.y - sy), hy = map.isSolidAt(this.x - sx, this.y); this.x -= sx; this.y -= sy; if (hx || !hy) this.vx = -this.vx; if (hy || !hx) this.vy = -this.vy; return; } // 벽에 튕김
          if (this.left <= 0 || map.isSolidAt(this.x, this.y)) { this.alive = false; return; }
          if (this.pierce < 99) for (const e of game.enemies) if (e.alive && Math.hypot(e.x - this.x, e.y - this.y) < (e.radius || 6) + 2) { if (this.pierce-- <= 0) { this.alive = false; game.effects.spark(this.x, this.y, this.c); } break; } },
        view: null, render(ctx) { if (!this.alive) return; const V = this.view || (this.view = coopProjView(0, 0, 0, 0, this.c, this.s, (def.arrow ? 'a' : '') + (def.spinSprite ? (def.arrow ? '|' : '') + 's:' + def.id : ''), game.time)); /* 진짜 탄 모양 */
          const v = Math.hypot(this.vx, this.vy) || 1; V.x = this.x; V.y = this.y; V.dx = this.vx / v; V.dy = this.vy / v; V.speed = v; V.age = game.time; V.render(ctx); } };
      C.local = C.local || []; C.local.push(q); this.projectiles.push(q);
    }
  },
  coopGuestEnd(d) {
    if (!this.coop || !this.coop.guest) return;
    this.coop = null; SFX.stopMusic(); SFX.play(d.victory ? 'victory' : 'hurt');
    if (d.quit) Net.leave(); // 참가자가 스스로 나감
    const stages = d.stages || 0, bosses = d.bosses || 0, reward = stages * CUR.perStage + bosses * CUR.perBoss + (d.victory ? CUR.victory : 0);
    this.overlay = { type: 'result', victory: !!d.victory, stages, bosses, reward, coop: true, after: d.disconnected ? '연결이 끊겨 탐험이 끝났습니다' : d.hostLeft ? '방장이 나가서 탐험이 끝났습니다' : d.quit ? '탐험에서 나왔습니다' : '함께한 탐험이 끝났습니다' };
    const sv = this.save; sv.bestStage = Math.max(sv.bestStage || 0, stages + (d.victory ? 0 : 1)); if (d.deep) sv.bestDeep = Math.max(sv.bestDeep || 0, d.deep); if (d.row) sv.bestKills = Math.max(sv.bestKills || 0, d.row.kills || 0); // 함께한 탐험도 내 최고 기록에
    if (!d.hostLeft && !d.quit) this.guildEvent('runs');
    if (d.victory) sv.clears++; writeSave(sv);
    if (d.row && this.profile && !this.admin) Net.submitScore(Object.assign({}, d.row, { name: this.profile.name, hero: this.save.selected })); // 함께한 탐험도 내 이름으로 랭킹에
  }
});
Net.on((m) => { if (window.__game) window.__game.coopOnNet(m); });
Net.wantRejoin = () => !!(window.__game && window.__game.coop); // 탐험 중에 끊기면 자동으로 다시 연결
document.addEventListener('visibilitychange', () => { // 참가자가 창을 내리면 공격·입력을 멈춤 (방장 쪽 내 캐릭터가 계속 쏘지 않게)
  const g = window.__game; if (!document.hidden || !g || !g.coop || !g.coop.guest) return;
  const p = g.player; Net.relay({ k: 'in', wp: g.coop.warp, x: Math.round(p.x), y: Math.round(p.y), d: 0, md: 0, ax: 0, ay: 0, ev: [] }, g.coop.hostId);
});
