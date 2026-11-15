'use strict';
// ════════════════════════════════════════════
// 게임
// ════════════════════════════════════════════
// 현재 맵 (렌더링 보조용)
function GAME_MAP() { return window.__game ? window.__game.map : null; }

class Game {
  constructor(canvas, data) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.data = data;
    this.input = new InputManager(canvas);
    this.effects = new Effects(); this.hud = new HUD();
    this.weaponSystem = new WeaponSystem(this);
    this.shake = 0; this.shakeMag = 0; this.time = 0;
    this.cam = { x: 0, y: 0 }; this.transition = null; this.banner = null; this.overlay = null;
    this.flow = null; this.flowTile = -1; this.flowTimer = 0;
    this.save = loadSave();
    this.hitStopT = 0; this.hurtFlash = 0; this.heartT = 0; this.noEnergyFlash = 0;
    this.cinematic = null; this.slowMo = null; this.screenFlash = 0;
    SFX.setMuted(!!this.save.muted);
    this.dpsLog = [];
  }
  start() {
    this.fitToScreen();
    this.enterLobby();
    window.addEventListener('resize', () => this.fitToScreen());
    new GameLoop((dt) => this.update(dt), () => this.render()).start();
  }
  // 캔버스 해상도를 실제 표시 픽셀(devicePixelRatio 포함)에 맞춤 → 글자/선은 선명, 도트는 nearest 확대
  fitToScreen() {
    const css = Math.max(0.5, Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H));
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(VIEW_W * css), ch = Math.round(VIEW_H * css);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.R = this.canvas.width / VIEW_W;
  }
  heroDef(id) { return this.data.heroes.get(id) || DATA_HEROES[0]; }
  weaponDef(id) {
    const d = this.data.weapons.get(id);
    if (!d) throw new Error('알 수 없는 무기 ID: ' + id);
    return d;
  }
  makePlayer(x, y) {
    const hero = this.heroDef(this.save.selected);
    const p = new Player(x, y, hero, this.data.base);
    p.weapons.push(new WeaponInstance(this.weaponDef(hero.startWeapon)));
    const lo = this.save.loadout; // 무기고에서 장착한 시작 보조 무기
    if (lo && lo !== hero.startWeapon && this.data.weapons.get(lo) && this.save.armory.includes(lo)) p.weapons.push(new WeaponInstance(this.weaponDef(lo)));
    return p;
  }
  discover(id) { if (!this.save.discovered.includes(id)) { this.save.discovered.push(id); writeSave(this.save); } }
  resetWorldLists(map) {
    this.map = map;
    this.enemies = []; this.projectiles = []; this.enemyBullets = []; this.pickups = [];
    this.props = []; this.portals = []; this.hazards = []; this.allies = []; this.zones = [];
    this.activeRoom = null; this.effects.clear(); this.interactTarget = null;
    this.flow = new Int16Array(map.width * map.height).fill(-1); this.flowTile = -1;
  }

  // ── 로비
  enterLobby() {
    SFX.stopMusic(); this.cinematic = null; this.slowMo = null;
    this.mode = 'lobby'; this.overlay = null;
    this.worldIdx = 0; this.levelIdx = 0;
    this.resetWorldLists(buildLobby());
    const sp = this.map.tileCenter(17, 14);
    this.player = this.makePlayer(sp.x, sp.y);
    DATA_HEROES.forEach((h, i) => { const c = this.map.tileCenter(6 + i * 3, 8); this.props.push(new Pedestal(c.x, c.y, h, i % 2)); });
    const cb = this.map.tileCenter(5, 12); this.props.push(new CodexBoard(cb.x, cb.y));
    const ar = this.map.tileCenter(9, 16); this.props.push(new Armory(ar.x, ar.y));
    if (this.save.sanctumReached) { const tv = this.map.tileCenter(25, 16); this.props.push(new TreasureVault(tv.x, tv.y)); }
    const dm = this.map.tileCenter(28, 12);
    this.enemies.push(new Enemy(dm.x, dm.y, this.data.enemies.get('dummy_001'), { hp: 1, dmg: 1 }, this.map.startRoom));
    const pc = this.map.tileCenter(17, 18);
    this.portals.push(new Portal(pc.x, pc.y, () => this.startRun(), '던전 입장'));
    this.snapCamera();
    this.showBanner('로비', '캐릭터를 고르고 포탈로 들어가세요');
  }
  selectHero(hero) {
    const s = this.save;
    if (!s.unlocked.includes(hero.id)) {
      if (s.bank < hero.price) { this.effects.text(this.player.x, this.player.y - 18, `${CUR.name}이 부족합니다`, '#ff7070'); return; }
      s.bank -= hero.price; s.unlocked.push(hero.id);
      this.effects.burst(this.player.x, this.player.y, '#ffd84a', 14);
    }
    s.selected = hero.id; writeSave(s);
    const { x, y } = this.player;
    this.player = this.makePlayer(x, y);
    this.discover(hero.startWeapon);
    this.showBanner(hero.name, `${hero.title} · 스킬: ${hero.skillName} — ${hero.skillDesc}` + (hero.passiveName ? ` · 패시브: ${hero.passiveName} (${hero.passiveDesc})` : ''));
  }

  // ── 런 진행
  startRun() {
    this.mode = 'dungeon';
    this.worldIdx = 0; this.levelIdx = 0; this.gold = 0; this.kills = 0;
    this.player = this.makePlayer(0, 0);
    const tr = DATA_TREASURES.find((t) => t.id === this.save.treasureEquipped); // 로비에서 고른 보구 (사망해도 영구 보유)
    if (tr) { this.player.treasure = tr; if (tr.apply) tr.apply(this.player); }
    this.loadStage();
    if (!this.save.prologueSeen) this.showPrologue(() => this.askVariant()); else this.askVariant();
  }
  // ── 이어하기: 스테이지 시작 시점의 런 상태 (맵은 그 스테이지를 새로 생성)
  snapshotRun() {
    const p = this.player;
    return { v: 1, t: Date.now(), hero: p.hero.id, worldIdx: this.worldIdx, levelIdx: this.levelIdx, gold: this.gold, kills: this.kills,
      p: { maxHp: p.maxHp, hp: p.hp, maxShield: p.maxShield, maxEnergy: p.maxEnergy, energy: p.energy, moveSpeed: p.moveSpeed,
        dashCdMax: p.dashCdMax, skillCdMax: p.skillCdMax, vampire: p.vampire, damageReduction: p.damageReduction,
        stats: Object.assign({}, p.stats), buffs: p.buffs.slice(), weapons: p.weapons.map((w) => w.def.id), weaponLv: p.weapons.map((w) => w.lv || 0), slot: p.slot,
        treasure: p.treasure ? p.treasure.id : null, line: p.line ? p.line.id : null, rank: p.rank || 0 } };
  }
  resumeRun() {
    const r = this.save.run, hero = r && this.data.heroes.get(r.hero);
    if (!r || !hero) { this.save.run = null; writeSave(this.save); this.startRun(); return; }
    this.mode = 'dungeon'; this.worldIdx = r.worldIdx; this.levelIdx = r.levelIdx; this.gold = r.gold; this.kills = r.kills;
    const p = this.player = new Player(0, 0, hero, this.data.base), s = r.p;
    for (const k of ['maxHp', 'hp', 'maxShield', 'maxEnergy', 'energy', 'moveSpeed', 'dashCdMax', 'skillCdMax', 'vampire', 'damageReduction']) if (typeof s[k] === 'number') p[k] = s[k];
    Object.assign(p.stats, s.stats); p.buffs = s.buffs || [];
    p.weapons = (s.weapons || []).map((id, i) => [id, (s.weaponLv || [])[i] || 0]).filter(([id]) => this.data.weapons.get(id)).map(([id, lv]) => new WeaponInstance(this.data.weapons.get(id), lv));
    if (!p.weapons.length) p.weapons.push(new WeaponInstance(this.weaponDef(hero.startWeapon)));
    p.slot = Math.min(s.slot || 0, p.weapons.length - 1);
    p.treasure = DATA_TREASURES.find((t) => t.id === s.treasure) || null; // 보구 효과는 위 능력치에 이미 반영돼 있음
    const ln = jobLines(hero.id).find((l) => l.id === s.line) || jobLines(hero.id)[0]; if (ln) { this.setJob(p, ln, Math.min(2, s.rank || 0)); p.skillCdMax = p.skillBaseCd * ((s.skillCdMax || p.skillBaseCd) / p.skillBaseCd); } // 계열·진화 단계
    this.loadStage();
    this.showBanner(`이어하기 · ${stageLabel(this.worldIdx, this.levelIdx)} ${this.W.name}`, '스테이지 시작 지점부터 다시 시작합니다', '#7ad0ff');
  }
  // 프롤로그 (첫 던전 입장 시 1회, 로비 일시정지 메뉴에서 다시 보기)
  showPrologue(then) { this.overlay = { type: 'story', lines: PROLOGUE_LINES, i: 0, t: 0, done: () => { this.save.prologueSeen = true; writeSave(this.save); if (then) then(); } }; }
  // 기원의 성역 깊은 곳: 전설의 존재와 마주함 → 소원이 드러남 → 보구 선택
  enterSanctum() {
    this.save.sanctumReached = true; writeSave(this.save);
    SFX.stopMusic();
    this.overlay = { type: 'story', sanctum: true, lines: SANCTUM_LINES, i: 0, t: 0, done: () => { this.overlay = { type: 'treasure_pick', msg: null }; } };
  }
  pickTreasure(tr) {
    const s = this.save;
    if (tr && !s.treasures.includes(tr.id)) { s.treasures.push(tr.id); if (!s.treasureEquipped) s.treasureEquipped = tr.id; this.treasureToast = { T: tr, start: performance.now() }; }
    writeSave(s);
    const p = this.player;
    if (tr && !p.treasure) { p.treasure = tr; p.treasureCd = 0; } // 이번 탐험부터 바로 R로 사용
    this.overlay = null; this.input.mouse.down = false;
    const c = this.portalSpot || { x: p.x, y: p.y - 30 }, next = worldDef(this.worldIdx + 1);
    this.portals = [];
    this.portals.push(new Portal(c.x + 26, c.y + 24, () => this.advanceStage(), `${stageLabel(this.worldIdx + 1, 0)} ${next.name}`, [120, 200, 255]));
    this.portals.push(new Portal(c.x - 26, c.y + 24, () => this.endRun(true), '귀환 (탐험 종료)', [255, 210, 90]));
    this.showBanner(SANCTUM_AFTER, '심층으로 내려가거나, 여기서 돌아갈 수 있습니다', '#9ad8ff');
  }
  get W() { return worldDef(this.worldIdx); }
  get stageIndex() { return this.worldIdx * STAGES_PER_WORLD + this.levelIdx; }
  get isBossStage() { return this.levelIdx === STAGES_PER_WORLD - 1; }
  get scale() { const S = BALANCE.stageScale, k = this.mode === 'lobby' ? 0 : this.stageIndex, i = k > S.taperFrom ? S.taperFrom + (k - S.taperFrom) * S.taper : k; return { hp: 1 + BALANCE.stageScale.hp * i, dmg: 1 + BALANCE.stageScale.dmg * i }; }
  loadStage() {
    const W = this.W;
    if (W.deep) this.save.bestDeep = Math.max(this.save.bestDeep || 0, W.depth); // 가장 깊이 내려간 심층
    const map = this.isBossStage
      ? generateDungeon({ roomCount: 4, specials: ['boss'], waves: W.waves, palette: W.palette })
      : generateDungeon({ roomCount: Math.min(15, 9 + this.worldIdx), specials: ['exit', 'treasure', 'shop'].concat(this.rollSpecialRoom()), waves: W.waves, palette: W.palette }); // 특수방 하나
    this.resetWorldLists(map);
    const s = map.startRoom, sp = map.tileCenter(s.cx, s.cy), p = this.player;
    p.x = sp.x; p.y = sp.y; p.state = 'NORMAL'; p.shield = p.maxShield;
    const tr = map.roomOf('treasure');
    if (tr) { const c = map.tileCenter(tr.cx, tr.cy); this.props.push(new Chest(c.x, c.y, 'weapon')); }
    const shop = map.roomOf('shop');
    if (shop) this.stockShop(shop);
    this.stockSpecialRooms(map);
    const ex = map.roomOf('exit');
    if (ex) { const c = map.tileCenter(ex.cx, ex.cy); this.portals.push(new Portal(c.x, c.y, () => this.advanceStage(), '다음 스테이지')); }
    this.save.bestStage = Math.max(this.save.bestStage, this.stageIndex + 1);
    this.save.run = this.snapshotRun(); writeSave(this.save); // 이어하기용: 이 스테이지 시작 지점을 저장
    this.snapCamera();
    this.showBanner(`${stageLabel(this.worldIdx, this.levelIdx)}  ${W.name}`, this.isBossStage ? '보스가 기다리고 있습니다' : W.deep && this.levelIdx === 0 ? `심층 ${W.depth}번째 필드 — 던전은 더 깊은 곳으로 이어진다` : '출구 포탈을 찾으세요', W.deep ? '#9ad8ff' : undefined);
  }
  advanceStage() {
    this.levelIdx++;
    if (this.levelIdx >= STAGES_PER_WORLD) { this.levelIdx = 0; this.worldIdx++; }
    this.loadStage();
  }
  rollSpecialRoom() { // 일반 스테이지마다 chance 확률로 특수방 하나 (전직의 방은 진화할 단계가 남았을 때 더 자주)
    const SR = BALANCE.specialRooms; if (Math.random() >= SR.chance) return [];
    const p = this.player, canEvolve = p && p.line && p.rank < 2;
    const pool = SR.pool.filter((t) => t !== 'evolve' || canEvolve);
    return [weightedPick(pool, (t) => (SR.weight && SR.weight[t]) || 1)];
  }
  // 특수방 소품 배치
  stockSpecialRooms(map) {
    const inflate = 1 + BALANCE.shopInflate * this.stageIndex, SR = BALANCE.specialRooms;
    for (const r of map.rooms) {
      const c = map.tileCenter(r.cx, r.cy);
      if (r.type === 'fountain') this.props.push(new Fountain(c.x, c.y));
      else if (r.type === 'altar') this.props.push(new BuffAltar(c.x, c.y, pick(DATA_BUFFS), Math.round(SR.altarPrice * inflate)));
      else if (r.type === 'gamble') this.props.push(new SlotMachine(c.x, c.y, Math.round(SR.gamblePrice * inflate)));
      else if (r.type === 'challenge') this.props.push(new ChallengeStone(c.x, c.y, r));
      else if (r.type === 'forge') this.props.push(new Forge(c.x, c.y, Math.round(SR.forgePrice * inflate)));
      else if (r.type === 'blood') this.props.push(new BloodAltar(c.x, c.y));
      else if (r.type === 'evolve') this.props.push(new MasterNPC(c.x, c.y, r));
      else if (r.type === 'smithy') this.props.push(new UpgradeAnvil(c.x, c.y, BALANCE.upgrade.forgeRoomDiscount, BALANCE.upgrade.forgeRoomBonus, true)); // 강화소: 싸고 성공률 높음
      else if (r.type === 'rack') { // 무기 진열대: 셋 중 하나만 가져갈 수 있음
        const a = this.randomWeaponDef(), b = this.randomWeaponDef(0, [a.id]), d = this.randomWeaponDef(0, [a.id, b.id]), grp = {};
        [a, b, d].forEach((def, i) => this.pickups.push(new Pickup('weapon', c.x + (i - 1) * 32, c.y + 4, { def, still: true, group: grp })));
      }
    }
  }
  startChallenge(r) { // 도전방: 강화된 정예 웨이브
    r.challenge = true; r.wavesLeft = BALANCE.specialRooms.challenge.waves; r.state = 'idle';
    this.showBanner('도전!', `강화된 정예 몬스터 ${BALANCE.specialRooms.challenge.waves}번의 습격을 버티세요`, '#ff7a7a'); SFX.play('boss'); this.addShake(0.2, 3);
    this.activateRoom(r);
  }
  stockShop(room) {
    const m = this.map, inflate = 1 + BALANCE.shopInflate * this.stageIndex;
    const mc = m.tileCenter(room.cx, room.y0 + 1); this.props.push(new Merchant(mc.x, mc.y));
    this.props.push(new UpgradeAnvil(mc.x + 40, mc.y + 4, 1, 0)); // 상점 강화대
    const owned = new Set(this.player.weapons.map((w) => w.def.id));
    const w1 = this.randomWeaponDef(), w2 = this.randomWeaponDef(0, [w1.id]); // 상점도 상자와 같은 등급 확률
    const items = [['weapon', w1], ['weapon', w2 !== w1 ? w2 : null], ['hp'], ['energy']].filter(([k, d]) => k !== 'weapon' || d);
    items.forEach(([kind, def], i) => {
      const c = m.tileCenter(room.cx - 4 + i * 3 - (i >= 2 ? 0 : 0), room.cy + 1);
      const price = Math.round(BALANCE.shopPrice[kind === 'weapon' ? def.rarity : kind] * inflate);
      this.props.push(new ShopItem(c.x + (i >= 2 ? 8 : 0), c.y, kind, price, def));
    });
  }
  endRun(victory) {
    SFX.stopMusic(); this.save.run = null; writeSave(this.save);
    SFX.play(victory ? 'victory' : 'hurt');
    // 로비 재화: 클리어한 스테이지 수 · 쓰러뜨린 필드 보스 수 · 승리 보너스 (던전 골드는 런과 함께 사라짐)
    const stages = this.stageIndex + (victory ? 1 : 0), bosses = this.worldIdx + (victory ? 1 : 0);
    const reward = stages * CUR.perStage + bosses * CUR.perBoss + (victory ? CUR.victory : 0);
    this.overlay = { type: 'result', victory, stages, bosses, reward };
    if (victory) { this.save.clears++; writeSave(this.save); }
  }
  finishResult() {
    this.save.bank += this.overlay.reward; writeSave(this.save);
    this.overlay = null;
    this.transition = { t: 0, swapped: false, action: () => this.enterLobby() };
  }

  // 타격감: 아주 짧게 시뮬레이션을 멈춤 (입력은 다음 프레임으로 이월)
  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }
  toggleMute() { this.save.muted = !this.save.muted; SFX.setMuted(this.save.muted); writeSave(this.save); this.showBanner(this.save.muted ? '소리 끔' : '소리 켬', 'M: 전환'); }
  // ── 계정
  login(profile) {
    Auth.current = profile; this.profile = profile;
    this.save = loadSave(); SFX.setMuted(!!this.save.muted);
    this.locked = false; this.enterLobby();
    if (this.save.run) this.overlay = { type: 'resume' };
    this.showBanner(profile ? `환영합니다, ${profile.name}!` : '게스트로 시작', profile ? '진행도가 이 계정에 저장됩니다' : '게스트 진행도는 저장되지 않습니다', '#ffd84a');
  }
  logout() {
    writeSave(this.save); Auth.current = null; this.profile = null; Auth.setAuto(null);
    this.overlay = null; this.locked = true; this.enterLobby();
    if (typeof LoginUI !== 'undefined') LoginUI.show(this); // const 전역은 window 속성이 아니므로 typeof로 확인
  }
  showBanner(title, sub, color) { this.banner = { title, sub, color, t: 0, life: 2.4 }; }
  addShake(t, mag) { this.shake = Math.max(this.shake, t); this.shakeMag = Math.max(this.shakeMag, mag); }

  // ── 카메라
  mouseWorld() { return { x: this.input.mouse.x + Math.round(this.cam.x), y: this.input.mouse.y + Math.round(this.cam.y) }; }
  cameraTarget() {
    const p = this.player, mx = this.input.mouse.x - VIEW_W / 2, my = this.input.mouse.y - VIEW_H / 2;
    let fx = p.x + mx * 0.2, fy = p.y + my * 0.2;
    const focus = this.cinematic ? this.cinematic.boss : this.slowMo ? this.slowMo : null; // 보스 등장·처치 연출 중에는 보스를 비춤
    if (focus) { fx = focus.x; fy = focus.y; }
    return {
      x: clamp(fx - VIEW_W / 2, 0, this.map.width * TILE - VIEW_W),
      y: clamp(fy - VIEW_H / 2, 0, this.map.height * TILE - VIEW_H)
    };
  }
  snapCamera() { const t = this.cameraTarget(); this.cam.x = t.x; this.cam.y = t.y; }
  updateCamera(dt) {
    const t = this.cameraTarget(), k = 1 - Math.exp(-10 * dt);
    this.cam.x += (t.x - this.cam.x) * k; this.cam.y += (t.y - this.cam.y) * k;
  }

  // ── 메인 업데이트
  update(dt) {
    const input = this.input;
    this.time += dt;
    if (this.locked) { input.endStep(); return; } // 로그인 화면
    if (this.banner) this.banner.t += dt;
    if (input.wasPressed('KeyM')) this.toggleMute();
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.noEnergyFlash = Math.max(0, this.noEnergyFlash - dt);

    if (this.transition) {
      this.transition.t += dt;
      if (!this.transition.swapped && this.transition.t >= 0.45) { this.transition.swapped = true; this.transition.action(); }
      if (this.transition.t >= 0.9) this.transition = null;
      input.endStep(); return;
    }
    if (this.overlay) { this.updateOverlay(input); input.endStep(); return; }
    if (input.wasPressed('Escape')) { this.overlay = { type: 'pause' }; input.endStep(); return; }
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; }
    this.screenFlash = Math.max(0, this.screenFlash - dt);
    if (this.cinematic) { this.updateCinematic(dt); this.effects.update(dt); this.updateCamera(dt); input.endStep(); return; }
    if (this.slowMo) dt = this.updateSlowMo(dt); // 보스 처치 슬로우모션: 시뮬레이션 시간이 느려짐

    const p = this.player;
    const wasDash = p.state === 'DASH';
    p.update(dt, input, this.map, this.mouseWorld());
    if (!wasDash && p.state === 'DASH') SFX.play('dash');
    this.fxT = (this.fxT || 0) - dt;
    if (this.fxT <= 0 && p.state !== 'DEAD') {
      if (p.state === 'DASH') { // 잔상
        const spr = heroSprite(p.hero, 0), img = p.faceVis < 0 ? spr.f : spr.n;
        this.effects.afterimage(img, p.x - spr.w / 2, p.y + 7 - spr.h, spr.w, spr.h); this.fxT = 0.025;
      } else if (p.moving) { this.effects.dust(p.x, p.y + 6); this.fxT = 0.22; }
    }
    if (p.state !== 'DEAD' && p.hp < p.maxHp * 0.3) { this.heartT -= dt; if (this.heartT <= 0) { SFX.play('heart'); this.heartT = 0.9; } }
    this.weaponSystem.update(p, dt, input);
    if (p.state !== 'DEAD' && (input.wasPressed('KeyF') || input.wasPressed('Mouse2'))) this.useSkill();
    if (p.state !== 'DEAD' && input.wasPressed('KeyR')) this.useTreasure();
    this.updateSkillEffects(dt);
    this.updateFlow(dt);
    for (const e of this.enemies) updateEnemy(e, dt, this);
    separateEnemies(this.enemies, this.map);
    for (const pr of this.projectiles) pr.update(dt, this);
    for (const b of this.enemyBullets) b.update(dt, this);
    for (const pk of this.pickups) pk.update(dt, this);
    for (const h of this.hazards) h.update(dt, this);
    for (const a of this.allies) a.update(dt, this);
    for (const z of this.zones) z.update(dt, this);
    for (const po of this.portals) po.t += dt;
    this.projectiles = this.projectiles.filter((x) => x.alive);
    this.enemyBullets = this.enemyBullets.filter((x) => x.alive);
    this.pickups = this.pickups.filter((x) => x.alive);
    this.hazards = this.hazards.filter((x) => x.alive);
    this.allies = this.allies.filter((x) => x.alive);
    this.zones = this.zones.filter((x) => x.alive);
    this.enemies = this.enemies.filter((e) => !e.removed);
    this.effects.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    if (this.shake === 0) this.shakeMag = 0;

    if (p.state !== 'DEAD') {
      if (this.mode === 'dungeon') this.updateRooms();
      this.updateInteraction(input);
      for (const po of this.portals)
        if (Math.hypot(p.x - po.x, p.y - po.y) < 12) {
          if (this.mode === 'lobby' && this.save.run) { this.overlay = { type: 'resume' }; p.y += 22; break; } // 진행 중인 탐험이 있으면 이어하기 물음
          this.transition = { t: 0, swapped: false, action: po.onEnter }; break;
        }
    } else if (p.deathTimer > 1 && !this.overlay) {
      SFX.stopMusic();
      this.endRun(false);
    }
    this.updateCamera(dt);
    input.endStep();
  }
  updateOverlay(input) {
    const o = this.overlay;
    if (o.type === 'pause') {
      if (input.wasPressed('Escape')) this.overlay = null;
      else if (this.mode === 'lobby' && input.wasPressed('KeyL')) { this.logout(); return; }
      else if (this.mode === 'lobby' && input.wasPressed('KeyP')) { this.overlay = { type: 'story', lines: PROLOGUE_LINES, i: 0, t: 0, done: () => {} }; return; }
      else if (this.mode === 'dungeon' && input.wasPressed('KeyL')) { this.player.state = 'DEAD'; this.endRun(false); }
    } else if (o.type === 'codex' || o.type === 'armory') {
      const t0 = o.tab;
      ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((k, i) => { if (input.wasPressed(k)) o.tab = i; });
      if (input.wasPressed('Mouse0')) WEAPON_TABS.forEach((_, i) => { const r = tabRect(i), m = input.mouse; if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) o.tab = i; });
      if (o.tab !== t0) o.page = 0;
      const pages = gridPages(o.tab || 0); // 페이지 넘기기
      if (input.wasPressed('KeyD') || input.wasPressed('ArrowRight') || input.wasPressed('WheelDown')) o.page = ((o.page || 0) + 1) % pages;
      if (input.wasPressed('KeyA') || input.wasPressed('ArrowLeft') || input.wasPressed('WheelUp')) o.page = ((o.page || 0) - 1 + pages) % pages;
    }
    if (o.type === 'codex') {
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) this.overlay = null;
    } else if (o.type === 'armory') {
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      if (!input.wasPressed('Mouse0')) return;
      const m = input.mouse, c = weaponGrid(o.tab || 0, o.page || 0).find((c) => m.x >= c.x && m.x < c.x + c.w && m.y >= c.y && m.y < c.y + c.h);
      if (!c) return;
      const sv = this.save, d = c.d, say = (text, color) => { o.msg = { text, color, t: 2 }; };
      if (!sv.discovered.includes(d.id)) say('아직 발견하지 못한 무기입니다. 던전에서 먼저 찾아보세요.', '#ff9a9a');
      else if (!sv.armory.includes(d.id)) {
        const price = ARMORY_PRICE[d.rarity];
        if (sv.bank < price) say(`${CUR.name}이 부족합니다 (${price} 필요)`, '#ff9a9a');
        else { sv.bank -= price; sv.armory.push(d.id); sv.loadout = d.id; say(`${d.name} 해금 및 장착!`, '#ffd84a'); }
      } else if (sv.loadout === d.id) { sv.loadout = null; say('시작 보조 무기 장착 해제', '#ccc'); }
      else { sv.loadout = d.id; say(`${d.name} 장착`, '#9fe89f'); }
      writeSave(sv);
      const { x, y } = this.player; this.player = this.makePlayer(x, y);
      this.input.mouse.down = false;
    } else if (o.type === 'buff') {
      let choice = -1;
      ['Digit1', 'Digit2', 'Digit3'].forEach((k, i) => { if (input.wasPressed(k)) choice = i; });
      if (input.wasPressed('Mouse0')) {
        o.options.forEach((_, i) => {
          const r = HUD.buffRect(i), m = input.mouse;
          if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) choice = i;
        });
      }
      if (choice >= 0) {
        const b = o.options[choice];
        b.apply(this.player); this.player.buffs.push(b.id);
        this.overlay = null;
        this.input.mouse.down = false;
        this.showBanner(b.name, b.desc, '#ffd84a');
        o.after();
      }
    } else if (o.type === 'result') {
      if (input.wasPressed('Enter')) this.finishResult();
    } else if (o.type === 'variant') {
      let ch = -1; o.lines.forEach((_, i) => { if (input.wasPressed('Digit' + (i + 1))) ch = i; });
      if (input.wasPressed('Mouse0')) o.lines.forEach((_, i) => { const r = HUD.variantRect(i, o.lines.length), m = input.mouse; if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) ch = i; });
      if (ch >= 0) { this.overlay = null; this.input.mouse.down = false; this.applyVariant(o.lines[ch]); const L = o.lines[ch]; this.showBanner(`${L.ranks[0]}`, `스킬: ${L.skills[0].name} — ${L.skills[0].desc}`, L.color); if (o.after) o.after(); }
    } else if (o.type === 'evolve') {
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      if (input.wasPressed('Digit1')) { this.overlay = null; this.input.mouse.down = false; this.startTrial(o.npc); }
      else if (input.wasPressed('Digit2')) {
        const price = this.evolvePrice();
        if (this.gold < price) { o.msg = `골드가 부족합니다 (${price}골드 필요)`; SFX.play('deny'); }
        else { this.gold -= price; o.npc.gone = true; this.overlay = null; this.evolve(); }
      }
    } else if (o.type === 'resume') {
      if (input.wasPressed('Enter')) { this.overlay = null; this.transition = { t: 0, swapped: false, action: () => this.resumeRun() }; }
      else if (input.wasPressed('KeyN')) { this.overlay = null; this.save.run = null; writeSave(this.save); this.transition = { t: 0, swapped: false, action: () => this.startRun() }; }
      else if (input.wasPressed('Escape')) this.overlay = null;
    } else if (o.type === 'story') { // 한 줄씩: 클릭/Enter/Space 다음, Esc 건너뛰기
      o.t += STEP;
      const next = input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('Mouse0');
      if (input.wasPressed('Escape')) o.i = o.lines.length;
      else if (next && o.t > 0.35) { o.i++; o.t = 0; }
      if (o.i >= o.lines.length) { this.overlay = null; this.input.mouse.down = false; o.done(); }
    } else if (o.type === 'treasure_pick') {
      const list = DATA_TREASURES;
      if (!list.length || this.save.treasures.length) { if (input.wasPressed('Enter') || input.wasPressed('Mouse0')) this.pickTreasure(null); return; } // 첫 보구는 한 번만 (추가 획득 방법은 미정)
      if (input.wasPressed('Mouse0')) { const m = input.mouse, i = list.findIndex((_, i) => { const r = HUD.treasureRect(i, list.length); return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; }); if (i >= 0) this.pickTreasure(list[i]); }
    } else if (o.type === 'treasures') { // 로비 보구 보관대: 1개 장착
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      const own = DATA_TREASURES.filter((t) => this.save.treasures.includes(t.id));
      if (input.wasPressed('Mouse0')) { const m = input.mouse, i = own.findIndex((_, i) => { const r = HUD.treasureRect(i, own.length); return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h; });
        if (i >= 0) { const id = own[i].id; this.save.treasureEquipped = this.save.treasureEquipped === id ? null : id; writeSave(this.save); } }
    }
  }

  // ── 보구 (R): 무기·스킬과 별개인 제3의 도구
  useTreasure() {
    const p = this.player, T = p.treasure;
    if (!T || this.mode !== 'dungeon') return;
    if (p.treasureCd > 0) { this.effects.text(p.x, p.y - 18, `${T.name} ${Math.ceil(p.treasureCd)}초`, '#999'); return; }
    p.treasureCd = T.cooldown;
    this.effects.text(p.x, p.y - 24, T.name + '!', T.color, true); SFX.play(T.sfx || 'react', 0.3);
    if (T.use === 'chains') { // 게이트 오브 바빌론: 조준 지점(최대 사거리)에 원형 범위 → 황금 사슬로 묶음
      const mw = this.mouseWorld(), dx = mw.x - p.x, dy = mw.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, T.range / d);
      const cx = p.x + dx * k, cy = p.y + dy * k;
      const caught = [];
      for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - cx, e.y - cy) < T.radius + e.radius) {
        e.chainT = T.duration; e.chainMax = T.duration; caught.push(e);
        this.damageEnemy(e, { damage: T.damage * this.scale.hp, mods: p.mods, knockback: 0, mark: { mult: T.weak, dur: T.duration } }, 0, 0); } // 묶으며 큰 피해 + 받는 피해 증가
      this.zones.push(new ChainCircle(cx, cy, T, caught));
      for (const e of caught) this.effects.goldBurst(e.x, e.y, 10);
      this.effects.ring(cx, cy, T.radius, '#ffd84a'); this.effects.ring(cx, cy, T.radius * 0.6, '#fff4c0');
      this.addShake(0.25, 4); this.screenFlash = 0.08; this.flashColor = '255,216,74'; this.hitStop(0.05);
    } else if (T.use === 'beam') { // 엑스칼리버: 벽까지 일직선, 스테이지가 깊을수록 피해도 커짐
      const sx = p.x + p.aim.x * 8, sy = p.y + p.aim.y * 8, L = T.range;
      const wt = sweepWall(sx, sy, sx + p.aim.x * L, sy + p.aim.y * L, this.map, 3), len = wt < 0 ? L : wt * L;
      const ex = sx + p.aim.x * len, ey = sy + p.aim.y * len, dmg = T.damage * this.scale.hp;
      for (const e of this.enemies) if (e.targetable && segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + T.width) >= 0)
        this.damageEnemy(e, { damage: dmg, mods: p.mods, knockback: 10 }, p.aim.x, p.aim.y);
      for (const b of this.enemyBullets) if (segmentCircleHit(sx, sy, ex, ey, b.x, b.y, T.width + 2) >= 0) b.alive = false; // 검기에 닿은 적 탄 소멸
      this.hitTile(ex + p.aim.x * 3, ey + p.aim.y * 3);
      this.effects.excalibur(sx, sy, ex, ey, T.width, p.x, p.y); this.effects.goldBurst(ex, ey, 24); this.effects.ring(ex, ey, 30, '#ffe9a0');
      this.effects.impact(ex, ey, T.color, Math.atan2(p.aim.y, p.aim.x)); this.effects.goldBurst(sx, sy, 12);
      this.addShake(0.4, 7); this.screenFlash = 0.3; this.flashColor = '255,236,170'; this.hitStop(0.08);
    } else if (T.use === 'blessing') { // 솔로몬의 반지: 각종 버프
      p.solomon = T.duration; p.shield = p.maxShield; p.energy = p.maxEnergy; p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * T.heal)); p.skillCooldown = 0; this.effects.heal(p.x, p.y);
      this.effects.solomonSeal(p.x, p.y); this.effects.ring(p.x, p.y, 40, '#ffd84a'); this.effects.ring(p.x, p.y, 70, '#c8a0ff'); this.effects.solomonSeal(p.x, p.y, 1.8); this.addShake(0.2, 3);
      this.screenFlash = 0.12; this.flashColor = '210,180,255';
    }
  }
  // ── 직업 계열·진화
  skillDmg(base) { return base * (1 + (this.scale.hp - 1) * 0.5); } // 스킬 피해: 깊이 내려갈수록 조금씩 커짐
  setJob(p, line, rank) {
    const sk = line.skills[rank], ratio = p.skillCdMax / (p.skillBaseCd || p.skillCdMax); // '집중' 같은 쿨타임 감소 유지
    p.line = line; p.rank = rank; p.skillId = sk.id; p.skillName = sk.name; p.skillDesc = sk.desc;
    p.skillBaseCd = sk.cd; p.skillCdMax = sk.cd * ratio; p.skillCooldown = Math.min(p.skillCooldown, p.skillCdMax);
  }
  askVariant(after) { // 갈래가 여럿인 직업은 판을 시작할 때 고름
    const lines = jobLines(this.player.hero.id);
    if (lines.length === 1) { this.setJob(this.player, lines[0], 0); if (after) after(); return; }
    if (window.__toolMode) { this.applyVariant(lines[0]); if (after) after(); return; } // 테스트 도구: 첫 갈래
    this.overlay = { type: 'variant', lines, title: JOB_LINES[this.player.hero.id].title, after };
  }
  applyVariant(line) {
    const p = this.player;
    this.setJob(p, line, 0);
    if (line.startWeapon && this.data.weapons.get(line.startWeapon)) { p.weapons[0] = new WeaponInstance(this.data.weapons.get(line.startWeapon)); this.discover(line.startWeapon); }
    if (line.moveSpeed) p.moveSpeed += line.moveSpeed;
  }
  evolve() {
    const p = this.player, next = p.rank + 1, line = p.line;
    if (!line || next > 2) return;
    p.maxHp += EVOLUTION.hp[next - 1]; p.hp = Math.min(p.maxHp, p.hp + EVOLUTION.hp[next - 1] + 20);
    p.maxEnergy += EVOLUTION.energy[next - 1]; p.energy = p.maxEnergy;
    this.setJob(p, line, next); p.skillCooldown = 0;
    this.showBanner(`${line.ranks[next]} (으)로 진화!`, `새 스킬: ${p.skillName} — ${p.skillDesc}`, '#ffd84a');
    this.effects.ring(p.x, p.y, 30, '#ffd84a'); this.effects.ring(p.x, p.y, 50, line.color || '#ffd84a'); this.effects.burst(p.x, p.y, '#ffd84a', 30);
    this.screenFlash = 0.3; this.flashColor = '255,216,74'; this.addShake(0.2, 3); SFX.play('clear'); SFX.play('solomon', 0.5);
  }
  evolvePrice() { return Math.round(EVOLUTION.price[this.player.rank] * (1 + BALANCE.shopInflate * this.stageIndex)); }
  startTrial(npc) { // 상위자와 1:1 대결 (미니 보스)
    const p = this.player, r = npc.room, next = p.rank + 1, key = `master_${p.hero.id}_${p.line.id}_${next}`;
    if (!this.data.enemies.get(key)) {
      const look = p.hero.look.sprite, D = HERO_PROCS[look];
      if (!PIX['master_' + look]) PIX['master_' + look] = { tint: '#c8a050', w: HERO_W, h: HERO_H, proc: (P) => D.proc(P, 0),
        pal: Object.assign({ s: '#f0c8a0', m: '#fff0b0', w: '#ffffff', r: p.hero.look.accent, y: '#ffd84a', l: '#8a6a30', h: p.hero.look.accent, g: shade(p.hero.look.accent, 0.68), e: '#ffffff', n: '#6a4628', d: '#3a2a1a' }, D.pal, { m: '#fff0b0' }) };
      const col = p.line.color || '#ffd84a';
      this.data.enemies.set(key, { id: key, name: `${p.line.ranks[next]}의 시련`, title: '상위자', sprite: 'master_' + look, color: '#c8a050', phaseColors: ['#c8a050', '#d8b060', '#ffd84a'],
        boss: true, master: true, aiType: 'boss', health: EVOLUTION.masterHp[next - 1], damage: 15 + next * 2, moveSpeed: 55, hitboxHalf: 9, knockbackResist: 0.9, attackCooldown: next === 1 ? 1.25 : 1.05, bulletSpeed: 135, rewardGold: 30,
        patterns: [{ type: 'aimed', volleys: 3, count: 5, spread: 0.15, color: col }, { type: 'radial', rings: 2, count: 18, color: col }, { type: 'charge', dashes: 2, speed: 340, color: '#ffffff' }],
        phase2Patterns: [{ type: 'spiral', duration: 2.2, arms: 3 + next, interval: 0.09, spin: 1.8, color: col }, { type: 'slam', radius: 46, chain: next, color: col }] });
    }
    npc.gone = true; r.trial = next; r.state = 'active'; this.activeRoom = r; r.wavesLeft = 0;
    this.map.setDoors(r, true); this.enemyBullets.length = 0;
    const c = this.map.tileCenter(r.cx, r.cy - 1), m = this.spawnEnemy(key, c.x, c.y, r); m.phase = 1;
    this.showBanner(`${p.line.ranks[next]}의 시련`, '상위자를 쓰러뜨리면 진화합니다', '#ffd84a'); SFX.play('boss');
  }
  // ── 스킬
  useSkill() {
    const p = this.player;
    if (p.castLock > 0) return;
    if (p.skillCooldown > 0) return;
    p.skillCooldown = p.skillCdMax;
    SFX.play('skill');
    const D = (b) => this.skillDmg(b), mw = this.mouseWorld(), A = Math.atan2(p.aim.y, p.aim.x);
    const at = (range) => { const dx = mw.x - p.x, dy = mw.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, range / d); return { x: p.x + dx * k, y: p.y + dy * k }; }; // 조준 지점 (사거리 제한)
    const nova = (r, dmg, o = {}) => { // 자기 주변 범위 피해
      for (const e of this.enemies) { if (!e.targetable || Math.hypot(e.x - p.x, e.y - p.y) > r + e.radius) continue;
        this.damageEnemy(e, { damage: D(dmg), mods: p.mods, knockback: o.kb ?? 6, status: o.status || null }, (e.x - p.x) / 50, (e.y - p.y) / 50);
        if (o.root) e.chainT = Math.max(e.chainT || 0, o.root); }
      if (o.clear) for (const b of this.enemyBullets) if (Math.hypot(b.x - p.x, b.y - p.y) < r) b.alive = false;
      this.effects.ring(p.x, p.y, r, o.color || '#fff'); this.effects.ring(p.x, p.y, r * 0.6, '#ffffff'); this.effects.burst(p.x, p.y, o.color || '#fff', 16);
    };
    const shoot = (o) => { // 스킬 투사체
      const n = o.n || 1;
      for (let i = 0; i < n; i++) { const a = A + (n > 1 ? (i / (n - 1) - 0.5) * (o.fan || 0.3) : 0);
        this.projectiles.push(new Projectile(Object.assign({ x: p.x + Math.cos(a) * 8, y: p.y + Math.sin(a) * 8, dx: Math.cos(a), dy: Math.sin(a), speed: 320, range: 360, pierce: 0, knockback: 4, mods: p.mods, size: 3 }, o.p, { damage: D(o.p.damage) }))); }
      this.effects.muzzle(p.x + p.aim.x * 10, p.y + p.aim.y * 10, A, o.p.color);
    };
    const line = (ang, len, w, dmg) => { // 일직선 충격파
      const ex = p.x + Math.cos(ang) * len, ey = p.y + Math.sin(ang) * len, wt = sweepWall(p.x, p.y, ex, ey, this.map, 3), L = wt < 0 ? len : wt * len;
      const x1 = p.x + Math.cos(ang) * L, y1 = p.y + Math.sin(ang) * L;
      for (const e of this.enemies) if (e.targetable && segmentCircleHit(p.x, p.y, x1, y1, e.x, e.y, e.radius + w) >= 0) this.damageEnemy(e, { damage: D(dmg), mods: p.mods, knockback: 10 }, Math.cos(ang), Math.sin(ang));
      for (let d = 12; d < L; d += 14) this.effects.explosion(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, 8 + d / 20, '#c8a070');
      this.effects.beamline(p.x, p.y, x1, y1, w * 0.6, '#e0b070');
    };
    const strikeSky = (e, dmg) => { this.damageEnemy(e, { damage: D(dmg), mods: p.mods, knockback: 3 }, 0, 1); this.effects.lightning(e.x + randInt(-8, 8), e.y - 100, e.x, e.y); };
    switch (p.skillId) {
      // 검사
      case 'whirlwind': p.whirl = 0.5; p.whirlTick = 0; break;
      case 'whirlwind2': p.whirl = 0.5; p.whirlTick = 0;
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.projectiles.push(new Projectile({ x: p.x, y: p.y, dx: Math.cos(a), dy: Math.sin(a), speed: 260, range: 160, damage: D(25), pierce: 99, knockback: 4, mods: p.mods, color: '#d8e0e8', size: 3, wave: true })); }
        break;
      case 'swordrain': { const c = at(170); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 52;
        this.zones.push(new Strike(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7, 0.35 + i * 0.05, 20, { damage: D(30), mods: p.mods, knockback: 3 }, '#fff4c0', true)); } break; }
      case 'cleave': line(A, 130, 12, 45); this.addShake(0.2, 4); SFX.play('heavy'); break;
      case 'cleave3': for (const da of [-0.38, 0, 0.38]) line(A + da, 140, 12, 50); this.addShake(0.25, 5); SFX.play('heavy'); break;
      case 'quake': this.zones.push(new SkillCast(p, p.x, p.y, { r: 140, time: 1, color: '#e0b070' }, () => {
        this.explodeAt(p.x, p.y, 140, { color: '#e0b070', hurtEnemies: true, src: { damage: D(150), mods: p.mods, knockback: 16 } });
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.effects.explosion(p.x + Math.cos(a) * 80, p.y + Math.sin(a) * 50, 16, '#c8a070'); }
        this.addShake(0.5, 9); this.hitStop(0.08); SFX.play('heavy'); })); break;
      // 불
      case 'fireball': shoot({ p: { damage: 40, explodeRadius: 30, color: '#ff8a3a', size: 5, speed: 280, status: { type: 'burn', chance: 1, duration: 3, dps: 10 } } }); SFX.play('fire_x' in SOUNDS ? 'fire_x' : 'flame'); break;
      case 'flamestorm': this.zones.push(new SkillAura(p, { r: 54, life: 5, tick: 0.25, dmg: 12, color: '#ff7a3a', kind: 'flame', status: { type: 'burn', chance: 0.5, duration: 2, dps: 8 } })); this.effects.ring(p.x, p.y, 54, '#ff7a3a'); break;
      case 'explosion': { const c = at(200); this.zones.push(new SkillCast(p, c.x, c.y, { r: 70, time: 2, color: '#ff7a3a' }, () => {
        this.explodeAt(c.x, c.y, 70, { color: '#ff7a3a', hurtEnemies: true, src: { damage: D(280), mods: p.mods, knockback: 14, status: { type: 'burn', chance: 1, duration: 4, dps: 14 } } });
        for (let i = 0; i < 10; i++) this.effects.explosion(c.x + randInt(-45, 45), c.y + randInt(-30, 30), randInt(14, 26), pick(['#ffffff', '#ffd84a', '#ff7a3a']));
        this.screenFlash = 0.4; this.flashColor = '255,170,90'; this.addShake(0.6, 10); this.hitStop(0.1); SFX.play('excal'); })); break; }
      // 얼음
      case 'icelance': shoot({ n: 3, fan: 0.25, p: { damage: 28, pierce: 99, color: '#bfefff', size: 2, speed: 380, arrow: true, status: { type: 'freeze', chance: 0.7, duration: 1.6, slow: 0.4 } } }); break;
      case 'frost_nova': nova(100, 25, { color: '#9ad8ff', clear: true, status: { type: 'freeze', chance: 1, duration: 2.5, slow: 0.15 } }); break;
      case 'blizzard': { const c = at(180); this.zones.push(new Puddle(c.x, c.y, { r: 64, life: 5, tick: 0.3, dmg: D(10), status: { type: 'freeze', chance: 0.6, duration: 1.2, slow: 0.35 }, color: '#bfefff' }, p.mods)); this.effects.ring(c.x, c.y, 64, '#ffffff'); break; }
      // 자연
      case 'thorns': nova(95, 20, { color: '#7adf4a', root: 1.8, kb: 0, status: { type: 'poison', chance: 1, duration: 4, dps: 10 } }); break;
      case 'bog': { const c = at(170); this.zones.push(new Puddle(c.x, c.y, { r: 56, life: 6, tick: 0.4, dmg: D(8), status: { type: 'poison', chance: 1, duration: 3, dps: 10 }, color: '#5aa03a' }, p.mods)); break; }
      case 'worldtree': this.zones.push(new SkillCast(p, p.x, p.y, { r: 150, time: 1.5, color: '#7adf4a' }, () => {
        nova(150, 60, { color: '#7adf4a', root: 4, kb: 0, status: { type: 'poison', chance: 1, duration: 6, dps: 20 } }); p.hp = Math.min(p.maxHp, p.hp + 30); this.effects.heal(p.x, p.y); this.addShake(0.3, 4); })); break;
      // 번개
      case 'shockorb': shoot({ p: { damage: 26, bounce: 3, color: '#bfe8ff', size: 4, speed: 260, range: 420, chain: { count: 3, range: 85, falloff: 0.8 } } }); break;
      case 'thunder': { const list = this.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 180).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 6);
        for (const e of list) strikeSky(e, 40); SFX.play('react'); break; }
      case 'thundergod': this.zones.push(new SkillAura(p, { r: 170, life: 6, tick: 0.35, dmg: 34, color: '#bfe8ff', kind: 'thunder' })); this.screenFlash = 0.1; this.flashColor = '200,230,255'; break;
      // 빛
      case 'lightarrow': shoot({ n: 5, fan: 0.6, p: { damage: 18, pierce: 2, homing: 4, color: '#fff4c0', size: 2, speed: 300 } }); break;
      case 'radiance': p.hp = Math.min(p.maxHp, p.hp + 15); this.effects.heal(p.x, p.y); nova(90, 25, { color: '#fff4c0', clear: true }); break;
      case 'judgment': { const c = at(190); this.zones.push(new SkillCast(p, c.x, c.y, { r: 60, time: 1.5, color: '#fff4c0' }, () => {
        this.explodeAt(c.x, c.y, 60, { color: '#fff4c0', hurtEnemies: true, src: { damage: D(240), mods: p.mods, knockback: 8 } });
        this.effects.beamline(c.x, c.y - 140, c.x, c.y, 16, '#fff4c0'); this.effects.beamline(c.x, c.y - 140, c.x, c.y, 6, '#ffffff');
        p.hp = Math.min(p.maxHp, p.hp + 20); this.effects.heal(p.x, p.y); this.screenFlash = 0.3; this.flashColor = '255,244,192'; this.addShake(0.4, 6); SFX.play('excal'); })); break; }
      // 어둠
      case 'curseshot': shoot({ p: { damage: 30, explodeRadius: 26, color: '#a070e0', size: 4, speed: 260, mark: { mult: 1.4, dur: 6 } } }); break;
      case 'abyss': { const c = at(170); this.zones.push(new DarkHole(c.x, c.y, p, { r: 62, life: 2.5, pull: 75, dmg: 8 })); break; }
      case 'voidcollapse': { const c = at(180); this.zones.push(new DarkHole(c.x, c.y, p, { r: 90, life: 2, pull: 110, dmg: 6 }));
        this.zones.push(new SkillCast(p, c.x, c.y, { r: 90, time: 2, color: '#a070e0' }, () => {
          this.explodeAt(c.x, c.y, 80, { color: '#a070e0', hurtEnemies: true, src: { damage: D(260), mods: p.mods, knockback: 10 } });
          this.effects.ring(c.x, c.y, 90, '#ffffff'); this.screenFlash = 0.3; this.flashColor = '160,110,230'; this.addShake(0.5, 8); this.hitStop(0.08); SFX.play('excal'); })); break; }
      // 사수
      case 'overdrive': p.overdrive = 4; p.odDmg = 0; this.effects.text(p.x, p.y - 18, '과부하!', '#ffd84a'); break;
      case 'overdrive2': p.overdrive = 6; p.odDmg = 0.3; this.effects.text(p.x, p.y - 18, '탄막 폭주!', '#ffd84a'); this.effects.ring(p.x, p.y, 26, '#ffd84a'); break;
      case 'deadeye': this.zones.push(new SkillCast(p, p.x, p.y, { r: 22, time: 1, color: '#ffd84a' }, () => {
        for (const e of this.enemies) if (e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 320 && hasLineOfSight(p, e, this.map)) {
          this.damageEnemy(e, { damage: D(110), mods: Object.assign({}, p.mods, { critChance: 1 }), knockback: 8 }, (e.x - p.x) / 100, (e.y - p.y) / 100); this.effects.beamline(p.x, p.y, e.x, e.y, 2, '#ffd84a'); }
        this.addShake(0.3, 5); SFX.play('heavy'); })); break;
      // 기술자
      case 'turret': this.allies.push(new Turret(p.x, p.y, p, { damage: D(8) })); break;
      case 'turret2': for (const dx of [-14, 14]) this.allies.push(new Turret(p.x + dx, p.y, p, { damage: D(16), life: 15, rate: 0.18 })); break;
      case 'barrage': { const c = at(200); this.zones.push(new SkillCast(p, p.x, p.y, { r: 20, time: 1, color: '#f0c030' }, () => {
        for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 60;
          this.zones.push(new Strike(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.7, 0.3 + i * 0.1, 30, { damage: D(70), mods: p.mods, knockback: 8 }, '#ffb04a', false)); } })); break; }
      // 암살자
      case 'blink': case 'blink2': {
        const sx = p.x, sy = p.y, D2 = 90, ev = p.skillId === 'blink2';
        moveAndCollide(p, p.aim.x * D2, p.aim.y * D2, this.map);
        for (const e of this.enemies) if (e.targetable && segmentCircleHit(sx, sy, p.x, p.y, e.x, e.y, e.radius + 8) >= 0) this.damageEnemy(e, { damage: D(ev ? 65 : 45), mods: p.mods, knockback: 4 }, p.aim.x, p.aim.y);
        p.blinkInv = 0.4;
        this.effects.beamline(sx, sy, p.x, p.y, 3, '#b080ff'); this.effects.burst(sx, sy, '#3a3048', 10); this.effects.burst(p.x, p.y, '#b080ff', 10);
        if (ev) { p.blinkChain = p.blinkWindowT > 0 ? p.blinkChain + 1 : 1; p.blinkWindowT = 2.5; if (p.blinkChain < 3) p.skillCooldown = 0.3; else p.blinkChain = 0; } // 연달아 3번
        break; }
      case 'execution': { // 그림자 분신 둘과 셋이서 연달아 습격 + 처형
        const list = this.enemies.filter((e) => e.targetable && Math.hypot(e.x - p.x, e.y - p.y) < 240).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 9);
        this.zones.push(new ShadowStrike(p, list, D(90))); p.blinkInv = 1.2; this.effects.burst(p.x, p.y, '#3a3048', 14); SFX.play('react'); break; }
      // 사제
      case 'sanctuary': this.zones.push(new Sanctuary(p.x, p.y, p)); this.effects.ring(p.x, p.y, 54, '#ffe9a0'); break;
      case 'sanctuary2': this.zones.push(new Sanctuary(p.x, p.y, p, { r: 80, life: 8, heal: 8, boost: true })); this.effects.ring(p.x, p.y, 80, '#ffe9a0'); break;
      case 'descent': this.zones.push(new SkillCast(p, p.x, p.y, { r: 110, time: 1, color: '#ffe9a0' }, () => {
        p.blinkInv = 2; p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4)); this.effects.heal(p.x, p.y); nova(110, 120, { color: '#ffe9a0', clear: true });
        this.effects.solomonSeal(p.x, p.y); this.screenFlash = 0.3; this.flashColor = '255,233,160'; SFX.play('solomon'); })); break;
      // 광전사
      case 'rage': p.rage = 5; p.rageAtk = 0.6; p.rageVamp = 0; this.effects.text(p.x, p.y - 18, '분노!', '#ff5a3a'); this.effects.ring(p.x, p.y, 30, '#ff5a3a'); this.addShake(0.15, 3); break;
      case 'rage2': p.rage = 7; p.rageAtk = 0.8; p.rageVamp = 4; this.effects.text(p.x, p.y - 18, '광란!', '#ff5a3a'); this.effects.ring(p.x, p.y, 36, '#ff5a3a'); this.addShake(0.2, 4); break;
      case 'bloodstorm': p.rage = 6; p.rageAtk = 0.8; p.rageVamp = 4;
        this.zones.push(new SkillAura(p, { r: 50, life: 6, tick: 0.25, dmg: 14, color: '#ff3a3a', kind: 'blood', lifesteal: 0.5 })); this.effects.text(p.x, p.y - 18, '피의 폭풍!', '#ff3a3a'); this.addShake(0.25, 5); break;
      // 드루이드
      case 'wolves': for (let i = 0; i < 3; i++) this.allies.push(new SpiritWolf(p.x + (i - 1) * 12, p.y, p, { dmg: 22, life: 12 })); this.effects.sparkle(p.x, p.y, '#9ad8ff'); break;
      case 'wolves2': for (let i = 0; i < 4; i++) this.allies.push(new SpiritWolf(p.x + (i - 1.5) * 12, p.y, p, { dmg: 32, life: 16, slow: true })); this.effects.sparkle(p.x, p.y, '#9ad8ff'); this.effects.ring(p.x, p.y, 30, '#9ad8ff'); break;
      case 'guardian': this.allies.push(new SpiritWolf(p.x, p.y - 10, p, { big: true, dmg: 80, life: 18 }));
        for (let i = 0; i < 3; i++) this.allies.push(new SpiritWolf(p.x + (i - 1) * 14, p.y, p, { dmg: 32, life: 18, slow: true })); this.effects.ring(p.x, p.y, 40, '#9ad8ff'); this.addShake(0.2, 3); break;
    }
  }
  updateSkillEffects(dt) {
    const p = this.player;
    if (p.whirl > 0) {
      p.whirl -= dt; p.whirlTick -= dt;
      if (p.whirlTick <= 0) {
        p.whirlTick = 0.1;
        for (const e of this.enemies) {
          if (!e.targetable) continue;
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
          if (d - e.radius <= 36) this.damageEnemy(e, { damage: this.skillDmg(15), mods: p.mods, knockback: 4 }, dx / (d || 1), dy / (d || 1));
        }
        for (const b of this.enemyBullets) if (Math.hypot(b.x - p.x, b.y - p.y) < 40) { b.alive = false; this.effects.spark(b.x, b.y, '#fff'); }
      }
    }
  }

  // ── 플로우 필드 (플레이어 기준 BFS, 40타일까지)
  updateFlow(dt) {
    const map = this.map, W = map.width, p = this.player;
    const pt = Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE);
    this.flowTimer -= dt;
    if (pt === this.flowTile && this.flowTimer > 0) return;
    this.flowTile = pt; this.flowTimer = 0.25;
    const flow = this.flow; flow.fill(-1);
    const q = new Int32Array(W * map.height); let h = 0, t = 0;
    flow[pt] = 0; q[t++] = pt;
    while (h < t) {
      const i = q[h++], d = flow[i];
      if (d >= 40) continue;
      const x = i % W, y = (i / W) | 0;
      if (x + 1 < W && flow[i + 1] < 0 && !map.isSolidTile(x + 1, y)) { flow[i + 1] = d + 1; q[t++] = i + 1; }
      if (x > 0 && flow[i - 1] < 0 && !map.isSolidTile(x - 1, y)) { flow[i - 1] = d + 1; q[t++] = i - 1; }
      if (flow[i + W] < 0 && !map.isSolidTile(x, y + 1)) { flow[i + W] = d + 1; q[t++] = i + W; }
      if (i - W >= 0 && flow[i - W] < 0 && !map.isSolidTile(x, y - 1)) { flow[i - W] = d + 1; q[t++] = i - W; }
    }
  }

  // ── 방 진행: 입장 → 문 잠금 → 웨이브 → 클리어
  updateRooms() {
    const p = this.player, map = this.map;
    const here = map.roomAtPoint(p.x, p.y);
    if (here && !here.visited) here.visited = true;
    if (!this.activeRoom && here && here.state === 'idle' && map.isFullyInside(p, here)) this.activateRoom(here);
    const r = this.activeRoom;
    if (r && !this.slowMo && !this.enemies.some((e) => e.alive)) {
      if (r.wavesLeft > 0) this.spawnWave(r);
      else this.clearRoom(r);
    }
  }
  activateRoom(r) {
    r.state = 'active'; this.activeRoom = r;
    this.map.setDoors(r, true);
    this.enemyBullets.length = 0;
    if (r.type === 'boss') {
      const id = this.W.boss, c = this.map.tileCenter(r.cx, r.cy - 3);
      const boss = this.spawnEnemy(id, c.x, c.y, r);
      boss.setState('INTRO'); boss.jumpH = 160; boss.phase = 1;
      this.cinematic = { t: 0, boss, landed: false, roared: false };
      this.banner = null; this.input.mouse.down = false;
      SFX.play('door');
    } else this.spawnWave(r);
  }
  spawnWave(r) {
    r.wavesLeft--;
    const pool = this.W.enemies;
    const W = BALANCE.waveSize, count = Math.min(W.max, W.base + this.worldIdx + Math.floor(this.levelIdx * W.perLevel) + randInt(0, W.rand)) + (r.challenge ? BALANCE.specialRooms.challenge.extra : 0);
    for (let i = 0; i < count; i++) {
      const [id] = weightedPick(pool, (x) => x[1]);
      const pt = this.findSpawnPoint(r, 72);
      const e = this.spawnEnemy(id, pt.x, pt.y, r), E = BALANCE.elite;
      if (r.challenge || (this.worldIdx >= E.fromWorld && Math.random() < Math.min(0.45, E.base + E.perWorld * (this.worldIdx - E.fromWorld)))) e.makeElite(E);
      if (r.challenge) { const C = BALANCE.specialRooms.challenge; e.maxHp = Math.round(e.maxHp * C.hp); e.hp = e.maxHp; e.damage = Math.round(e.damage * C.dmg); }
    }
  }
  spawnEnemy(id, x, y, room) {
    const def = this.data.enemies.get(id);
    if (!def) throw new Error('알 수 없는 적 ID: ' + id);
    const e = new Enemy(x, y, def, this.scale, room);
    this.enemies.push(e);
    return e;
  }
  findSpawnPoint(r, minDist, nearX, nearY, half = 9) {
    const p = this.player, map = this.map;
    for (let i = 0; i < 60; i++) {
      const tx = randInt(r.x0 + 1, r.x0 + r.w - 2), ty = randInt(r.y0 + 1, r.y0 + r.h - 2);
      const c = map.tileCenter(tx, ty);
      if (overlapsSolid(c.x, c.y, half + 1, map)) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < minDist) continue;
      if (nearX !== undefined && Math.hypot(c.x - nearX, c.y - nearY) > 48 && i < 40) continue;
      return c;
    }
    return this.freeSpot(r, nearX ?? map.tileCenter(r.cx, r.cy).x, nearY ?? map.tileCenter(r.cx, r.cy).y, half);
  }
  // (x,y)에서 가장 가까운, 방 안의 비어 있는 타일 중심 (엄폐물 위에 물건이 생기지 않도록)
  freeSpot(r, x, y, half = 6) {
    const map = this.map, tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
    for (let rad = 0; rad < Math.max(r.w, r.h); rad++)
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        const tx = tx0 + dx, ty = ty0 + dy;
        if (tx < r.x0 || ty < r.y0 || tx >= r.x0 + r.w || ty >= r.y0 + r.h) continue;
        const c = map.tileCenter(tx, ty);
        if (!overlapsSolid(c.x, c.y, half + 1, map)) return c;
      }
    return map.tileCenter(r.cx, r.cy);
  }
  clearRoom(r) {
    r.state = 'cleared'; this.activeRoom = null;
    const P = this.player;
    if (P.hero.roomHeal && P.state !== 'DEAD' && r.type === 'combat') { P.hp = Math.min(P.maxHp, P.hp + P.hero.roomHeal); this.effects.heal(P.x, P.y); this.effects.text(P.x, P.y - 20, '+' + P.hero.roomHeal, '#7aff7a'); }
    this.map.setDoors(r, false);
    const c0 = this.map.tileCenter(r.cx, r.cy), c = this.freeSpot(r, c0.x, c0.y, 8);
    if (r.type === 'boss') {
      for (let i = 0; i < 12; i++) this.pickups.push(new Pickup('coin', c.x, c.y));
      for (let i = 0; i < 8; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 10 }));
      this.pickups.push(new Pickup('hp', c.x, c.y, { value: 30 }));
      const p = this.player; // 월드 보스 처치: 체력 회복
      if (p.state !== 'DEAD') { const heal = Math.round(p.maxHp * BALANCE.bossHealRatio); p.hp = Math.min(p.maxHp, p.hp + heal); this.effects.text(p.x, p.y - 20, '+' + heal, '#7be36b', true); }
      const W = this.W, next = worldDef(this.worldIdx + 1);
      this.portalSpot = c;
      const after = () => {
        if (W.sanctum) this.portals.push(new Portal(c.x, c.y + 24, () => this.enterSanctum(), '성역 깊은 곳으로', [255, 233, 160]));
        else {
          this.props.push(new Chest(c.x, c.y - 24, 'weapon'));
          this.portals.push(new Portal(c.x + (W.deep ? 26 : 0), c.y + 24, () => this.advanceStage(), `${stageLabel(this.worldIdx + 1, 0)} ${next.name}`, next.deep ? [120, 200, 255] : undefined));
          if (W.deep) this.portals.push(new Portal(c.x - 26, c.y + 24, () => this.endRun(true), '귀환 (탐험 종료)', [255, 210, 90])); // 심층: 여기서 돌아가거나 더 내려감
        }
      };
      const owned = new Set(this.player.buffs);
      const options = shuffled(DATA_BUFFS.filter((b) => !owned.has(b.id) || b.id === 'buff_atk' || b.id === 'buff_hp')).slice(0, 3);
      this.overlay = { type: 'buff', options, after };
    } else {
      if (r.trial) { r.trial = 0; this.evolve(); return; } // 상위자를 쓰러뜨림 → 진화
      if (r.challenge) { // 도전 성공: 희귀 이상 무기 + 골드
        r.challenge = false; this.props.push(new Chest(c.x, c.y - 10, 'challenge'));
        for (let i = 0; i < 8; i++) this.pickups.push(new Pickup('coin', c.x, c.y));
        this.showBanner('도전 성공!', '희귀 이상의 무기가 담긴 상자', '#ffd84a'); SFX.play('clear'); this.effects.ring(c.x, c.y, 40, '#ffd84a'); return;
      }
      const B = BALANCE, orbs = randInt(B.roomEnergyOrbs[0], B.roomEnergyOrbs[1]);
      for (let i = 0; i < orbs; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: B.roomEnergyValue }));
      if (Math.random() < B.roomChestChance) this.props.push(new Chest(c.x, c.y, 'loot'));
      if (Math.random() < B.roomHpChance) this.pickups.push(new Pickup('hp', c.x, c.y, { value: B.roomHpValue }));
      this.showBanner('방 클리어!', null, '#9fe89f');
      SFX.play('clear');
    }
  }

  // ── 상호작용
  updateInteraction(input) {
    this.interactTarget = this.findInteractTarget();
    if (!this.interactTarget || !input.wasPressed('KeyE')) return;
    const t = this.interactTarget;
    if (t instanceof Pickup) this.pickWeapon(t);
    else t.interact(this);
  }
  findInteractTarget() {
    const p = this.player;
    let best = null, bestD = Infinity;
    for (const o of this.props) {
      if (!o.radius || !o.label(this)) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < o.radius && d < bestD) { best = o; bestD = d; }
    }
    for (const pk of this.pickups) {
      if (pk.kind !== 'weapon') continue;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < 20 && d < bestD) { best = pk; bestD = d; }
    }
    return best;
  }
  randomWeaponDef(minRank = 0, exclude = []) { // minRank: 0 고급 이상(기본) / 2 희귀 이상 / 3 영웅 이상
    const owned = new Set(this.player.weapons.map((w) => w.def.id).concat(exclude)), RANK = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const pool = DATA_WEAPONS.filter((d) => d.rarity !== 'common' && RANK.indexOf(d.rarity) >= minRank && !owned.has(d.id));
    return weightedPick(pool.length ? pool : DATA_WEAPONS, (d) => { const w = Math.min(this.worldIdx, 12); return RARITY_WEIGHT[d.rarity] + (d.rarity === 'epic' ? w * BALANCE.epicPerWorld : d.rarity === 'legendary' ? w * BALANCE.legendaryPerWorld : 0); });
  }
  openChest(c) {
    this.effects.burst(c.x, c.y - 6, '#ffd84a', 10);
    if (c.content === 'weapon' || c.content === 'challenge') this.pickups.push(new Pickup('weapon', c.x, c.y + 14, { def: this.randomWeaponDef(c.content === 'challenge' ? 2 : 0), still: true }));
    else {
      for (let i = 0; i < randInt(4, 8); i++) this.pickups.push(new Pickup('coin', c.x, c.y));
      for (let i = 0; i < 4; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 8 }));
      if (Math.random() < 0.4) this.pickups.push(new Pickup('hp', c.x, c.y, { value: 20 }));
    }
  }
  // 무기 강화: 성공하면 +1 (실패해도 단계 유지, 비용만 듦)
  upgradeCost(w, discount = 1) { const U = BALANCE.upgrade; return Math.round(U.base * (w.lv + 1) * U.rarityMult[w.def.rarity] * (1 + BALANCE.shopInflate * this.stageIndex) * discount * (1 - (this.player.hero.upgradeDiscount || 0))); }
  upgradeChance(w, bonus = 0) { return Math.min(1, BALANCE.upgrade.chance[w.lv] + bonus); }
  tryUpgrade(discount = 1, bonus = 0, at) {
    const p = this.player, w = p.weapon, U = BALANCE.upgrade;
    if (!w) return;
    if (w.lv >= U.maxLevel) { this.effects.text(p.x, p.y - 18, '최대 강화입니다', '#aaa'); SFX.play('deny'); return; }
    const cost = this.upgradeCost(w, discount);
    if (this.gold < cost) { this.effects.text(p.x, p.y - 18, '골드가 부족합니다', '#ff7070'); SFX.play('deny'); return; }
    this.gold -= cost;
    const fx = at || p;
    if (Math.random() < this.upgradeChance(w, bonus)) {
      w.lv++;
      this.effects.text(p.x, p.y - 24, `강화 성공! ${weaponTitle(w)}`, '#ffd84a', true); this.effects.burst(fx.x, fx.y - 6, '#ffd84a', 16); this.effects.ring(fx.x, fx.y, 18, '#ffd84a');
      SFX.play(w.lv >= 4 ? 'clear' : 'buy'); if (w.lv >= 4) this.addShake(0.12, 2);
    } else {
      this.effects.text(p.x, p.y - 24, '강화 실패…', '#9a9aa8', true); this.effects.burst(fx.x, fx.y - 6, '#666', 10); SFX.play('deny');
    }
  }
  giveWeapon(def, lv = 0) {
    const p = this.player, inst = new WeaponInstance(def, lv);
    if (p.weapons.length < this.data.base.weaponSlots) { p.weapons.push(inst); p.slot = p.weapons.length - 1; }
    else {
      this.pickups.push(new Pickup('weapon', p.x, p.y + 4, { def: p.weapon.def, still: true, lv: p.weapon.lv })); // 강화 단계는 바닥에 내려놔도 유지
      p.weapons[p.slot] = inst;
    }
    this.discover(def.id);
    this.effects.text(p.x, p.y - 18, def.name, RARITY_COLOR[def.rarity]); this.effects.text(p.x, p.y - 8, weaponTraits(def), '#e0d0a0');
  }
  pickWeapon(pk) {
    pk.alive = false; this.giveWeapon(pk.def, pk.lv || 0);
    if (pk.group) for (const o of this.pickups) if (o !== pk && o.group === pk.group && o.alive) { o.alive = false; this.effects.burst(o.x, o.y, '#aaa', 8); } // 진열대: 나머지는 사라짐
  }
  buy(item) {
    const p = this.player;
    if (this.gold < item.price) { this.effects.text(p.x, p.y - 18, '골드가 부족합니다', '#ff7070'); SFX.play('deny'); return; }
    this.gold -= item.price; item.sold = true; SFX.play('buy');
    if (item.kind === 'weapon') this.giveWeapon(item.def);
    else if (item.kind === 'hp') { p.hp = Math.min(p.maxHp, p.hp + 40); this.effects.text(p.x, p.y - 18, '+40', '#7be36b'); }
    else { p.energy = Math.min(p.maxEnergy, p.energy + 120); this.effects.text(p.x, p.y - 18, '+120', '#8ab8ff'); }
  }
  collect(pk) {
    const p = this.player;
    if (pk.kind === 'coin') { this.gold += pk.value; SFX.play('coin', 0.05); this.effects.sparkle(p.x, p.y - 4, '#ffd84a'); }
    else if (pk.kind === 'energy') { p.energy = Math.min(p.maxEnergy, p.energy + pk.value); SFX.play('energy', 0.05); this.effects.sparkle(p.x, p.y - 4, '#8ab8ff'); }
    else if (pk.kind === 'hp') { p.hp = Math.min(p.maxHp, p.hp + pk.value); this.effects.text(p.x, p.y - 16, '+' + pk.value, '#7be36b'); this.effects.heal(p.x, p.y); SFX.play('heal'); }
  }

  // ── 전투 처리
  enemyShoot(x, y, ang, speed, damage, color, r) {
    this.enemyBullets.push(new EnemyBullet(x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, damage, color, r));
  }
  damageEnemy(enemy, src, kx, ky, opts = {}) {
    let base = src.damage;
    if (src.execute && enemy.hp < enemy.maxHp * 0.35) base *= 1 + src.execute; // 처형: 빈사 적 추가 피해
    if (enemy.markT > 0) base *= enemy.markMult;                                 // 약점 표시된 적
    const { amount, crit } = rollDamage(base, src.mods);
    if (!enemy.takeHit(amount)) return;
    let kb = (src.knockback || 0) * (1 - (enemy.def.knockbackResist || 0));
    if (kb < 0) kb = -Math.min(-kb, Math.max(0, Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) - 14)); // 끌어당김: 플레이어 앞에서 멈춤
    if (enemy.alive && kb !== 0 && !(enemy.state === 'ATTACK' && (enemy.def.aiType === 'charger' || enemy.def.boss)))
      moveAndCollide(enemy, kx * kb, ky * kb, this.map);
    if (src.mark && enemy.alive) {
      if (!(enemy.markT > 0)) this.effects.text(enemy.x, enemy.y - 20, '약점', '#ff7a7a');
      enemy.markT = src.mark.dur; enemy.markMult = src.mark.mult;
    }
    if (src.killEnergy && !enemy.alive && !enemy.def.dummy) { const p = this.player; p.energy = Math.min(p.maxEnergy, p.energy + src.killEnergy); this.effects.text(p.x, p.y - 20, '+' + src.killEnergy, '#7fb0ff'); }
    if (src.status) { const SB = this.player.hero.statusBoost, st = SB ? Object.assign({}, src.status, { duration: src.status.duration * (1 + SB), dps: (src.status.dps || 0) * (1 + SB), chance: Math.min(1, (src.status.chance ?? 1) * (1 + SB / 2)) }) : src.status; const react = enemy.applyStatus(st, src.mods); if (react) this.triggerReaction(enemy, react, src.mods); }
    if (!opts.quiet || crit || Math.random() < 0.3) this.effects.text(enemy.x, enemy.y - 12, crit ? amount + '!' : String(amount), crit ? '#ffd84a' : '#ffffff', crit);
    if (!enemy.def.dummy || Math.random() < 0.5) SFX.play(crit ? 'crit' : 'hit', crit ? 0.05 : 0.045);
    if (enemy.def.dummy) this.dpsLog.push({ t: this.time, a: amount });
    if (src.chain && !opts.noChain) this.chainLightning(enemy, src);
    if (!enemy.alive) this.onEnemyKilled(enemy);
  }
  // 보스 격노 전환 연출: 탄 정리 + 충격파 + 잠깐의 숨 돌릴 틈
  // 보스 페이즈 전환: 탄·장판 정리, 충격파, 근접한 플레이어 밀어냄 (보스는 1.3초 무적)
  onBossPhase(e, phase) {
    this.enemyBullets.length = 0; this.hazards.length = 0;
    this.addShake(0.6, 6); this.hitStop(0.15); this.screenFlash = 0.25; SFX.play('boss');
    const col = e.def.phaseColors ? e.def.phaseColors[phase - 1] : '#ff6a6a';
    this.effects.ring(e.x, e.y, 30, '#ffffff'); this.effects.ring(e.x, e.y, 60, col); this.effects.ring(e.x, e.y, 90, col); this.effects.burst(e.x, e.y, col, 24);
    this.showBanner(`${e.def.name} — ${phase}페이즈`, phase >= 3 ? '궁극기가 해금되었습니다!' : '분노하여 패턴이 빨라지고 새로운 공격이 추가됩니다', phase >= 3 ? '#ff4a5a' : '#ff9a6a');
    const p = this.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < 80) moveAndCollide(p, dx / d * (80 - d), dy / d * (80 - d), this.map);
    // 버틴 보상: 에너지 오브와 회복 물약 (에너지 무기만 든 경우 공격 수단이 끊기지 않게)
    const c0 = this.map.tileCenter(e.room.cx, e.room.cy + 3), c = this.freeSpot(e.room, c0.x, c0.y, 4);
    for (let i = 0; i < 6; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 12 }));
    this.pickups.push(new Pickup('hp', c.x, c.y, { value: 15 }));
  }
  // 궁극기 이름 외치기
  announceBossSkill(e, name) {
    this.showBanner(name, null, '#ff4a5a'); this.banner.life = 1.4;
    this.effects.text(e.x, e.y - 34, name + '!', '#ff8a8a', true); SFX.play('react');
  }
  // 보스 등장 연출: 낙하 → 착지 충격파 → 포효 → 전투 시작
  updateCinematic(dt) {
    const c = this.cinematic, b = c.boss;
    c.t += dt;
    b.stateTime += dt;
    if (c.t < 0.8) b.jumpH = 160 * Math.pow(1 - c.t / 0.8, 2);
    else if (!c.landed) {
      c.landed = true; b.jumpH = 0;
      this.addShake(0.5, 7); SFX.play('explode'); this.screenFlash = 0.2;
      this.effects.ring(b.x, b.y, 40, '#ffffff'); this.effects.ring(b.x, b.y, 70, b.def.color); this.effects.burst(b.x, b.y, b.def.color, 26);
    }
    if (c.t >= 1.3 && !c.roared) { c.roared = true; SFX.play('boss'); this.addShake(0.6, 3); this.effects.ring(b.x, b.y, 100, '#ffffff'); }
    if (c.t >= 2.8) { b.setState('CHASE'); this.cinematic = null; SFX.startMusic(); }
  }
  // 보스 처치 슬로우모션: 연쇄 폭발 → 섬광 → 보상
  updateSlowMo(dt) {
    const s = this.slowMo;
    s.t += dt; s.next -= dt;
    if (s.next <= 0 && s.t < 1.7) {
      s.next = 0.13;
      const x = s.x + randInt(-18, 18), y = s.y + randInt(-18, 10);
      this.effects.explosion(x, y, randInt(10, 20), pick(['#ffffff', '#ffd84a', s.color]));
      SFX.play('explode', 0.08); this.addShake(0.1, 3);
    }
    if (s.t >= 1.9) {
      this.slowMo = null; this.screenFlash = 0.7; this.addShake(0.5, 8); SFX.play('victory');
      this.effects.explosion(s.x, s.y, 60, '#ffffff'); this.effects.burst(s.x, s.y, s.color, 40);
      return dt;
    }
    return dt * 0.25;
  }
  // 충전 광선포: 조준 방향 일직선(벽까지)의 모든 적에게 피해
  fireBeamShot(p, def, k) {
    const sx = p.x + p.aim.x * 10, sy = p.y + 1 + p.aim.y * 10, L = def.range;
    const wt = sweepWall(sx, sy, sx + p.aim.x * L, sy + p.aim.y * L, this.map, 3), len = wt < 0 ? L : wt * L;
    const ex = sx + p.aim.x * len, ey = sy + p.aim.y * len, w = def.beamShot.width * (0.5 + 0.5 * k);
    for (const e of this.enemies) if (e.targetable && segmentCircleHit(sx, sy, ex, ey, e.x, e.y, e.radius + w) >= 0)
      this.damageEnemy(e, { damage: def.damage * k, mods: p.mods, knockback: def.knockback }, p.aim.x, p.aim.y);
    this.hitTile(ex + p.aim.x * 3, ey + p.aim.y * 3);
    this.effects.beamline(sx, sy, ex, ey, w, def.bulletColor); this.effects.impact(ex, ey, def.bulletColor, Math.atan2(p.aim.y, p.aim.x));
    this.addShake(0.15, 3 * k); p.recoil = 1; SFX.play('heavy');
  }
  // ── 부서지는 상자
  breakCrate(tx, ty) {
    if (this.map.get(tx, ty) !== T_CRATE) return false;
    this.map.set(tx, ty, T_FLOOR); this.map.redrawTile(tx, ty); this.flowTile = -1;
    const c = this.map.tileCenter(tx, ty), st = this.map.palette.style;
    const col = st === 'ice' ? '#8a9aaa' : st === 'basalt' ? '#c87a50' : st === 'void' ? '#b080ff' : '#b88450';
    this.effects.burst(c.x, c.y, col, 10); SFX.play('crate', 0.03);
    if (this.mode === 'dungeon') {
      if (Math.random() < 0.25) this.pickups.push(new Pickup('coin', c.x, c.y));
      if (Math.random() < 0.15) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 6 }));
      if (Math.random() < 0.04) this.pickups.push(new Pickup('hp', c.x, c.y, { value: 10 }));
    }
    return true;
  }
  hitTile(x, y) { return this.breakCrate(Math.floor(x / TILE), Math.floor(y / TILE)); }
  breakCratesInRadius(x, y, r) {
    for (let ty = Math.floor((y - r) / TILE); ty <= Math.floor((y + r) / TILE); ty++)
      for (let tx = Math.floor((x - r) / TILE); tx <= Math.floor((x + r) / TILE); tx++)
        if (Math.hypot(tx * TILE + 8 - x, ty * TILE + 8 - y) <= r + 6) this.breakCrate(tx, ty);
  }
  breakCratesInArc(x, y, ang, arc, range) {
    for (let ty = Math.floor((y - range) / TILE); ty <= Math.floor((y + range) / TILE); ty++)
      for (let tx = Math.floor((x - range) / TILE); tx <= Math.floor((x + range) / TILE); tx++) {
        const cx = tx * TILE + 8, cy = ty * TILE + 8, d = Math.hypot(cx - x, cy - y);
        if (d <= range + 6 && (d < 10 || angleDiff(Math.atan2(cy - y, cx - x), ang) <= arc / 2 + 0.3)) this.breakCrate(tx, ty);
      }
  }
  // 원소 반응
  triggerReaction(e, type, mods) {
    const atk = 1 + (mods ? mods.attackBonus : 0), quiet = { damage: 0, mods: { attackBonus: 0, critChance: 0, critMultiplier: 1 }, knockback: 0 };
    if (type === 'thermal') { // 열충격: 큰 단일 피해, 빙결·화상 해제
      e.slow = 0; e.burn = 0;
      this.effects.ring(e.x, e.y, 18, '#9ad8ff'); this.effects.ring(e.x, e.y, 12, '#ff9a4a'); this.effects.burst(e.x, e.y, '#dff4ff', 10);
      this.effects.text(e.x, e.y - 22, '열충격!', '#bfe8ff', true); SFX.play('react');
      this.damageEnemy(e, Object.assign({}, quiet, { damage: 28 * atk, knockback: 4 }), 0, 0, { noChain: true });
      this.hitStop(0.05);
    } else if (type === 'toxic') { // 독 연소: 주변 폭발, 중독 소모
      e.poison = 0;
      this.effects.text(e.x, e.y - 22, '독 연소!', '#c8ff70', true); SFX.play('react');
      this.explodeAt(e.x, e.y, 36, { color: '#9aff5a', hurtEnemies: true, src: Object.assign({}, quiet, { damage: 16 * atk, knockback: 3 }) });
    }
  }
  chainLightning(first, src) {
    const C = src.chain, hit = new Set([first.id]);
    let cur = first, dmg = src.damage;
    for (let i = 0; i < C.count; i++) {
      let best = null, bestD = C.range;
      for (const e of this.enemies) {
        if (!e.targetable || hit.has(e.id)) continue;
        const d = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (d < bestD) { best = e; bestD = d; }
      }
      if (!best) break;
      dmg *= C.falloff; hit.add(best.id);
      this.effects.lightning(cur.x, cur.y, best.x, best.y);
      const shocked = best.slow > 0; // 감전: 얼어 있는 적은 연쇄 피해 1.5배
      if (shocked) this.effects.text(best.x, best.y - 22, '감전!', '#dff4ff');
      this.damageEnemy(best, { damage: dmg * (shocked ? 1.5 : 1), mods: src.mods, knockback: 0 }, 0, 0, { noChain: true });
      cur = best;
    }
  }
  dotDamage(e, amount, color) {
    if (!e.targetable) return;
    const a = Math.max(1, Math.round(amount));
    e.takeHit(a);
    this.effects.text(e.x, e.y - 12, String(a), color);
    if (e.def.dummy) this.dpsLog.push({ t: this.time, a });
    if (!e.alive) this.onEnemyKilled(e);
  }
  explodeAt(x, y, r, o) {
    this.effects.explosion(x, y, r, o.color || '#ff8a3a');
    this.addShake(0.12, 3);
    this.breakCratesInRadius(x, y, r);
    SFX.play('explode', 0.06);
    if (o.hurtEnemies) {
      for (const e of this.enemies) {
        if (!e.targetable) continue;
        const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
        if (d > r + e.radius) continue;
        this.damageEnemy(e, o.src, d > 0.01 ? dx / d : 1, d > 0.01 ? dy / d : 0);
      }
    }
    if (o.hurtPlayer) {
      const p = this.player;
      if (p.state !== 'DEAD' && Math.hypot(p.x - x, p.y - y) < r + p.half) this.damagePlayer(o.damage);
    }
  }
  enemyExplode(e) {
    if (e.exploded) return;
    e.exploded = true;
    this.explodeAt(e.x, e.y, e.def.explodeRadius, { color: '#ff6a2a', hurtPlayer: true, damage: e.damage,
      hurtEnemies: true, src: { damage: 20, mods: { attackBonus: 0, critChance: 0, critMultiplier: 1 }, knockback: 6 } });
  }
  onEnemyKilled(enemy) {
    if (enemy.rewardGiven) return;
    enemy.rewardGiven = true;
    this.kills++;
    const p = this.player;
    if (p.vampire > 0 && p.state !== 'DEAD') p.hp = Math.min(p.maxHp, p.hp + p.vampire);
    if (p.rage > 0 && p.rageVamp && p.state !== 'DEAD') p.hp = Math.min(p.maxHp, p.hp + p.rageVamp);
    this.effects.death(enemy.x, enemy.y, enemy.def.phaseColors ? enemy.def.phaseColors[(enemy.phase || 1) - 1] : (enemy.def.color || '#c0c0c0'), enemy.def.boss ? 30 : enemy.def.hitboxHalf * 2);
    SFX.play(enemy.def.boss ? 'explode' : 'kill', 0.04);
    if (enemy.def.boss) this.hitStop(0.3); else if (Math.random() < 0.35) this.hitStop(0.025);
    if (enemy.def.aiType === 'exploder') this.enemyExplode(enemy);
    if (enemy.def.boss) {
      this.addShake(0.4, 6); this.enemyBullets.length = 0; this.hazards.length = 0;
      enemy.laser = null; SFX.stopMusic();
      this.slowMo = { t: 0, next: 0, x: enemy.x, y: enemy.y, color: enemy.def.phaseColors ? enemy.def.phaseColors[2] : enemy.def.color };
      for (const e of this.enemies) if (e.alive && e !== enemy) { e.alive = false; e.rewardGiven = true; e.setState('DEAD'); }
      return;
    }
    const B = BALANCE, coins = Math.max(1, Math.round(enemy.def.rewardGold * B.killGoldMult * (enemy.elite ? B.elite.gold : 1) + (Math.random() < 0.5 ? 0.4 : -0.4)));
    for (let i = 0; i < coins; i++) this.pickups.push(new Pickup('coin', enemy.x, enemy.y));
    if (Math.random() < B.killEnergyChance) this.pickups.push(new Pickup('energy', enemy.x, enemy.y, { value: B.killEnergyValue }));
    if (Math.random() < B.killHpChance) this.pickups.push(new Pickup('hp', enemy.x, enemy.y, { value: B.killHpValue }));
  }
  damagePlayer(amount) {
    const p = this.player, hp0 = p.hp;
    if (p.takeDamage(amount)) {
      this.addShake(0.15, 3);
      this.effects.text(p.x, p.y - 16, '-' + amount, '#ff6b6b', true);
      if (p.hp < hp0) { SFX.play('hurt'); this.hurtFlash = 0.35; } else SFX.play('shield');
      this.hitStop(0.05);
      return true;
    }
    return false;
  }

  // 화면 효과: 피격/저체력 비네트, 화면 밖 적 방향 표시
  renderScreenFx(ctx, cx, cy) {
    const p = this.player;
    if (this.mode === 'dungeon' && this.activeRoom && p.state !== 'DEAD') {
      for (const e of this.enemies) {
        if (!e.targetable) continue;
        const sx = e.x - cx, sy = e.y - cy;
        if (sx >= 0 && sx <= VIEW_W && sy >= 0 && sy <= VIEW_H) continue;
        const ang = Math.atan2(sy - VIEW_H / 2, sx - VIEW_W / 2);
        const ex = clamp(sx, 10, VIEW_W - 10), ey = clamp(sy, 50, VIEW_H - 42);
        ctx.save(); ctx.translate(Math.round(ex), Math.round(ey)); ctx.rotate(ang);
        ctx.fillStyle = e.def.boss ? '#ff70d0' : 'rgba(255,90,90,0.85)';
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    const amb = (THEME[this.map.palette.style] || THEME.stone).ambient; // 월드별 조명 분위기
    if (amb) { const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.65);
      v.addColorStop(0, `rgba(${amb[0]},${amb[1]},${amb[2]},0)`); v.addColorStop(1, `rgba(${amb[0]},${amb[1]},${amb[2]},${amb[3]})`); ctx.fillStyle = v; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (this.screenFlash > 0) { ctx.fillStyle = `rgba(${this.flashColor || '255,255,255'},${Math.min(0.8, this.screenFlash * 1.2)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); } else this.flashColor = null;
    const low = p.state !== 'DEAD' && p.hp < p.maxHp * 0.3 ? 0.18 + 0.12 * Math.sin(this.time * 7) : 0;
    const a = Math.max(low, this.hurtFlash * 1.4);
    if (a > 0.01) {
      const grd = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
      grd.addColorStop(0, 'rgba(200,0,0,0)'); grd.addColorStop(1, `rgba(200,0,0,${Math.min(0.55, a)})`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  // ── 렌더
  render() {
    const ctx = this.ctx;
    const R = this.R || 1;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(R, 0, 0, R, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = Math.round((Math.random() - 0.5) * 2 * this.shakeMag); sy = Math.round((Math.random() - 0.5) * 2 * this.shakeMag); }
    ctx.translate(-cx + sx, -cy + sy);

    this.map.render(ctx, { x: cx, y: cy });
    this.map.renderDoors(ctx, this.time);
    this.map.renderAnim(ctx, this.time, { x: cx, y: cy });
    for (const po of this.portals) po.render(ctx);
    for (const h of this.hazards) h.render(ctx);
    for (const z of this.zones) z.render(ctx);
    for (const o of this.props) o.render(ctx, this);
    for (const pk of this.pickups) pk.render(ctx);
    for (const e of this.enemies) e.renderTelegraph(ctx);
    const actors = [...this.enemies, ...this.allies, this.player].sort((a, b) => a.y - b.y);
    for (const a of actors) a.render(ctx);
    for (const pr of this.projectiles) pr.render(ctx);
    for (const z of this.zones) if (z.renderTop) z.renderTop(ctx);
    const w = this.player.weapon;
    if (w && w.beamActive && w.beamEnd) {
      const b = w.beamEnd;
      ctx.strokeStyle = w.def.bulletColor; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(this.time * 40); ctx.lineWidth = 5 + (w.focusK || 0) * 4;
      ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = w.def.bulletColor; ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, 4, 4);
    }
    for (const b of this.enemyBullets) b.render(ctx);
    this.effects.render(ctx);

    if (this.mode === 'lobby') {
      const dummy = this.enemies.find((e) => e.def.dummy);
      this.dpsLog = this.dpsLog.filter((d) => this.time - d.t < 3);
      if (dummy) {
        const dps = this.dpsLog.reduce((s, d) => s + d.a, 0) / 3;
        hudText(ctx, `DPS ${dps.toFixed(0)}`, Math.round(dummy.x), Math.round(dummy.y) - 26, '#ffd84a', 'center', 8);
      }
    }

    const t = this.interactTarget;
    if (t && this.player.state !== 'DEAD' && !this.overlay) {
      const label = t instanceof Pickup ? `[E] ${t.def.name}${t.lv ? ' +' + t.lv : ''} (${RARITY_NAME[t.def.rarity]})` : t.label(this);
      const color = t instanceof Pickup ? RARITY_COLOR[t.def.rarity] : t.labelColor;
      if (label) {
        ctx.font = "bold 9px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
        const tw = Math.ceil(ctx.measureText(label).width), lx = Math.round(t.x), ly = Math.round(t.y) - 38;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(lx - tw / 2 - 4, ly - 2, tw + 8, 14);
        ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.strokeRect(lx - tw / 2 - 3.5, ly - 1.5, tw + 7, 13); ctx.globalAlpha = 1;
        hudText(ctx, label, lx, ly, color, 'center', 9);
        if (t instanceof Pickup) { const tr = weaponTraits(t.def), w2 = Math.ceil(ctx.measureText(tr).width * 0.85);
          ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(lx - w2 / 2 - 4, ly + 12, w2 + 8, 11); hudText(ctx, tr, lx, ly + 13, '#e0d0a0', 'center', 8); }
      }
    }

    ctx.setTransform(R, 0, 0, R, 0, 0);
    this.renderScreenFx(ctx, cx, cy);
    this.hud.render(ctx, this);
    if (this.treasureToast) HUD.treasureToast(ctx, this); // 보구 획득 알림 (결과 화면 위에도 보임)

    const mx = Math.round(this.input.mouse.x), my = Math.round(this.input.mouse.y);
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx - 4, my, 3, 1); ctx.fillRect(mx + 2, my, 3, 1);
    ctx.fillRect(mx, my - 4, 1, 3); ctx.fillRect(mx, my + 2, 1, 3);

    if (this.transition) {
      const k = this.transition.t < 0.45 ? this.transition.t / 0.45 : 1 - (this.transition.t - 0.45) / 0.45;
      ctx.fillStyle = `rgba(0,0,0,${clamp(k, 0, 1)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
