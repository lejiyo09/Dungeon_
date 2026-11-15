'use strict';
// ════════════════════════════════════════════
// 게임
// ════════════════════════════════════════════
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
    this.props = []; this.portals = []; this.hazards = []; this.allies = [];
    this.activeRoom = null; this.effects.clear(); this.interactTarget = null;
    this.flow = new Int16Array(map.width * map.height).fill(-1); this.flowTile = -1;
  }

  // ── 로비
  enterLobby() {
    this.mode = 'lobby'; this.overlay = null;
    this.worldIdx = 0; this.levelIdx = 0;
    this.resetWorldLists(buildLobby());
    const sp = this.map.tileCenter(17, 14);
    this.player = this.makePlayer(sp.x, sp.y);
    DATA_HEROES.forEach((h, i) => { const c = this.map.tileCenter(11 + i * 4, 8); this.props.push(new Pedestal(c.x, c.y, h)); });
    const cb = this.map.tileCenter(5, 12); this.props.push(new CodexBoard(cb.x, cb.y));
    const ar = this.map.tileCenter(9, 16); this.props.push(new Armory(ar.x, ar.y));
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
      if (s.bank < hero.price) { this.effects.text(this.player.x, this.player.y - 18, '골드가 부족합니다', '#ff7070'); return; }
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
    this.loadStage();
  }
  get stageIndex() { return this.worldIdx * STAGES_PER_WORLD + this.levelIdx; }
  get isBossStage() { return this.levelIdx === STAGES_PER_WORLD - 1; }
  get scale() { const i = this.mode === 'lobby' ? 0 : this.stageIndex; return { hp: 1 + BALANCE.stageScale.hp * i, dmg: 1 + BALANCE.stageScale.dmg * i }; }
  loadStage() {
    const W = DATA_WORLDS[this.worldIdx];
    const map = this.isBossStage
      ? generateDungeon({ roomCount: 4, specials: ['boss'], waves: W.waves, palette: W.palette })
      : generateDungeon({ roomCount: 8 + this.worldIdx, specials: ['exit', 'treasure', 'shop'], waves: W.waves, palette: W.palette });
    this.resetWorldLists(map);
    const s = map.startRoom, sp = map.tileCenter(s.cx, s.cy), p = this.player;
    p.x = sp.x; p.y = sp.y; p.state = 'NORMAL'; p.shield = p.maxShield;
    const tr = map.roomOf('treasure');
    if (tr) { const c = map.tileCenter(tr.cx, tr.cy); this.props.push(new Chest(c.x, c.y, 'weapon')); }
    const shop = map.roomOf('shop');
    if (shop) this.stockShop(shop);
    const ex = map.roomOf('exit');
    if (ex) { const c = map.tileCenter(ex.cx, ex.cy); this.portals.push(new Portal(c.x, c.y, () => this.advanceStage(), '다음 스테이지')); }
    this.save.bestStage = Math.max(this.save.bestStage, this.stageIndex + 1); writeSave(this.save);
    this.snapCamera();
    this.showBanner(`${this.worldIdx + 1}-${this.levelIdx + 1}  ${W.name}`, this.isBossStage ? '보스가 기다리고 있습니다' : '출구 포탈을 찾으세요');
  }
  advanceStage() {
    this.levelIdx++;
    if (this.levelIdx >= STAGES_PER_WORLD) { this.levelIdx = 0; this.worldIdx++; }
    this.loadStage();
  }
  stockShop(room) {
    const m = this.map, inflate = 1 + BALANCE.shopInflate * this.stageIndex;
    const mc = m.tileCenter(room.cx, room.y0 + 1); this.props.push(new Merchant(mc.x, mc.y));
    const owned = new Set(this.player.weapons.map((w) => w.def.id));
    const pool = shuffled(DATA_WEAPONS.filter((d) => d.rarity !== 'common' && !owned.has(d.id)));
    const items = [['weapon', pool[0]], ['weapon', pool[1]], ['hp'], ['energy']].filter(([k, d]) => k !== 'weapon' || d);
    items.forEach(([kind, def], i) => {
      const c = m.tileCenter(room.cx - 4 + i * 3 - (i >= 2 ? 0 : 0), room.cy + 1);
      const price = Math.round(BALANCE.shopPrice[kind === 'weapon' ? def.rarity : kind] * inflate);
      this.props.push(new ShopItem(c.x + (i >= 2 ? 8 : 0), c.y, kind, price, def));
    });
  }
  endRun(victory) {
    SFX.play(victory ? 'victory' : 'hurt');
    this.overlay = { type: 'result', victory, gold: this.gold + (victory ? BALANCE.victoryBonusGold : 0) };
    if (victory) { this.save.clears++; writeSave(this.save); }
  }
  finishResult() {
    this.save.bank += this.overlay.gold; writeSave(this.save);
    this.overlay = null;
    this.transition = { t: 0, swapped: false, action: () => this.enterLobby() };
  }

  // 타격감: 아주 짧게 시뮬레이션을 멈춤 (입력은 다음 프레임으로 이월)
  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }
  toggleMute() { this.save.muted = !this.save.muted; SFX.setMuted(this.save.muted); writeSave(this.save); this.showBanner(this.save.muted ? '소리 끔' : '소리 켬', 'M: 전환'); }
  showBanner(title, sub, color) { this.banner = { title, sub, color, t: 0, life: 2.4 }; }
  addShake(t, mag) { this.shake = Math.max(this.shake, t); this.shakeMag = Math.max(this.shakeMag, mag); }

  // ── 카메라
  mouseWorld() { return { x: this.input.mouse.x + Math.round(this.cam.x), y: this.input.mouse.y + Math.round(this.cam.y) }; }
  cameraTarget() {
    const p = this.player, mx = this.input.mouse.x - VIEW_W / 2, my = this.input.mouse.y - VIEW_H / 2;
    return {
      x: clamp(p.x + mx * 0.2 - VIEW_W / 2, 0, this.map.width * TILE - VIEW_W),
      y: clamp(p.y + my * 0.2 - VIEW_H / 2, 0, this.map.height * TILE - VIEW_H)
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

    const p = this.player;
    const wasDash = p.state === 'DASH';
    p.update(dt, input, this.map, this.mouseWorld());
    if (!wasDash && p.state === 'DASH') SFX.play('dash');
    if (p.state !== 'DEAD' && p.hp < p.maxHp * 0.3) { this.heartT -= dt; if (this.heartT <= 0) { SFX.play('heart'); this.heartT = 0.9; } }
    this.weaponSystem.update(p, dt, input);
    if (p.state !== 'DEAD' && (input.wasPressed('KeyF') || input.wasPressed('Mouse2'))) this.useSkill();
    this.updateSkillEffects(dt);
    this.updateFlow(dt);
    for (const e of this.enemies) updateEnemy(e, dt, this);
    separateEnemies(this.enemies, this.map);
    for (const pr of this.projectiles) pr.update(dt, this);
    for (const b of this.enemyBullets) b.update(dt, this);
    for (const pk of this.pickups) pk.update(dt, this);
    for (const h of this.hazards) h.update(dt, this);
    for (const a of this.allies) a.update(dt, this);
    for (const po of this.portals) po.t += dt;
    this.projectiles = this.projectiles.filter((x) => x.alive);
    this.enemyBullets = this.enemyBullets.filter((x) => x.alive);
    this.pickups = this.pickups.filter((x) => x.alive);
    this.hazards = this.hazards.filter((x) => x.alive);
    this.allies = this.allies.filter((x) => x.alive);
    this.enemies = this.enemies.filter((e) => !e.removed);
    this.effects.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    if (this.shake === 0) this.shakeMag = 0;

    if (p.state !== 'DEAD') {
      if (this.mode === 'dungeon') this.updateRooms();
      this.updateInteraction(input);
      for (const po of this.portals)
        if (Math.hypot(p.x - po.x, p.y - po.y) < 12) { this.transition = { t: 0, swapped: false, action: po.onEnter }; break; }
    } else if (p.deathTimer > 1 && !this.overlay) {
      this.endRun(false);
    }
    this.updateCamera(dt);
    input.endStep();
  }
  updateOverlay(input) {
    const o = this.overlay;
    if (o.type === 'pause') {
      if (input.wasPressed('Escape')) this.overlay = null;
      else if (this.mode === 'dungeon' && input.wasPressed('KeyL')) { this.player.state = 'DEAD'; this.endRun(false); }
    } else if (o.type === 'codex' || o.type === 'armory') {
      ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((k, i) => { if (input.wasPressed(k)) o.tab = i; });
      if (input.wasPressed('Mouse0')) WEAPON_TABS.forEach((_, i) => { const r = tabRect(i), m = input.mouse; if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) o.tab = i; });
    }
    if (o.type === 'codex') {
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) this.overlay = null;
    } else if (o.type === 'armory') {
      if (o.msg) o.msg.t -= STEP;
      if (input.wasPressed('Escape') || input.wasPressed('KeyE')) { this.overlay = null; return; }
      if (!input.wasPressed('Mouse0')) return;
      const m = input.mouse, c = weaponGrid(o.tab || 0).find((c) => m.x >= c.x && m.x < c.x + c.w && m.y >= c.y && m.y < c.y + c.h);
      if (!c) return;
      const sv = this.save, d = c.d, say = (text, color) => { o.msg = { text, color, t: 2 }; };
      if (!sv.discovered.includes(d.id)) say('아직 발견하지 못한 무기입니다. 던전에서 먼저 찾아보세요.', '#ff9a9a');
      else if (!sv.armory.includes(d.id)) {
        const price = ARMORY_PRICE[d.rarity];
        if (sv.bank < price) say(`골드가 부족합니다 (${price}골드 필요)`, '#ff9a9a');
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
    }
  }

  // ── 스킬
  useSkill() {
    const p = this.player;
    if (p.skillCooldown > 0) return;
    p.skillCooldown = p.skillCdMax;
    SFX.play('skill');
    switch (p.hero.skill) {
      case 'whirlwind': p.whirl = 0.5; p.whirlTick = 0; break;
      case 'overdrive': p.overdrive = 4; this.effects.text(p.x, p.y - 18, '과부하!', '#ffd84a'); break;
      case 'frost_nova': {
        const R = 100;
        for (const e of this.enemies) {
          if (!e.targetable || Math.hypot(e.x - p.x, e.y - p.y) > R + e.radius) continue;
          this.damageEnemy(e, { damage: 25, mods: p.mods, knockback: 6 }, (e.x - p.x) / 50, (e.y - p.y) / 50);
          e.applyStatus({ type: 'freeze', chance: 1, duration: 2.5, slow: 0.15 });
        }
        for (const b of this.enemyBullets) if (Math.hypot(b.x - p.x, b.y - p.y) < R) b.alive = false;
        this.effects.ring(p.x, p.y, R, '#9ad8ff'); this.effects.ring(p.x, p.y, R * 0.6, '#ffffff');
        this.effects.burst(p.x, p.y, '#cfefff', 16);
        break;
      }
      case 'turret': this.allies.push(new Turret(p.x, p.y, p)); break;
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
          if (d - e.radius <= 36) this.damageEnemy(e, { damage: 15, mods: p.mods, knockback: 4 }, dx / (d || 1), dy / (d || 1));
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
    if (r && !this.enemies.some((e) => e.alive)) {
      if (r.wavesLeft > 0) this.spawnWave(r);
      else this.clearRoom(r);
    }
  }
  activateRoom(r) {
    r.state = 'active'; this.activeRoom = r;
    this.map.setDoors(r, true);
    this.enemyBullets.length = 0;
    if (r.type === 'boss') {
      const id = DATA_WORLDS[this.worldIdx].boss, c = this.map.tileCenter(r.cx, r.cy - 3);
      this.spawnEnemy(id, c.x, c.y, r);
      this.showBanner(this.data.enemies.get(id).name, '보스 등장!', '#ff9ae0');
      SFX.play('boss');
    } else this.spawnWave(r);
  }
  spawnWave(r) {
    r.wavesLeft--;
    const pool = DATA_WORLDS[this.worldIdx].enemies;
    const W = BALANCE.waveSize, count = Math.min(W.max, W.base + this.worldIdx + this.levelIdx + randInt(0, W.rand));
    for (let i = 0; i < count; i++) {
      const [id] = weightedPick(pool, (x) => x[1]);
      const pt = this.findSpawnPoint(r, 72);
      this.spawnEnemy(id, pt.x, pt.y, r);
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
    this.map.setDoors(r, false);
    const c0 = this.map.tileCenter(r.cx, r.cy), c = this.freeSpot(r, c0.x, c0.y, 8);
    if (r.type === 'boss') {
      for (let i = 0; i < 12; i++) this.pickups.push(new Pickup('coin', c.x, c.y));
      for (let i = 0; i < 8; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 10 }));
      this.pickups.push(new Pickup('hp', c.x, c.y, { value: 30 }));
      const last = this.worldIdx === DATA_WORLDS.length - 1;
      const after = () => {
        if (last) this.portals.push(new Portal(c.x, c.y + 24, () => this.endRun(true), '귀환', [255, 210, 90]));
        else {
          this.props.push(new Chest(c.x, c.y - 24, 'weapon'));
          this.portals.push(new Portal(c.x, c.y + 24, () => this.advanceStage(), `${this.worldIdx + 2}-1 ${DATA_WORLDS[this.worldIdx + 1].name}`));
        }
      };
      const owned = new Set(this.player.buffs);
      const options = shuffled(DATA_BUFFS.filter((b) => !owned.has(b.id) || b.id === 'buff_atk' || b.id === 'buff_hp')).slice(0, 3);
      this.overlay = { type: 'buff', options, after };
    } else {
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
  randomWeaponDef() {
    const owned = new Set(this.player.weapons.map((w) => w.def.id));
    const pool = DATA_WEAPONS.filter((d) => d.rarity !== 'common' && !owned.has(d.id));
    return weightedPick(pool.length ? pool : DATA_WEAPONS, (d) => RARITY_WEIGHT[d.rarity] + (d.rarity === 'epic' ? this.worldIdx * BALANCE.epicPerWorld : 0));
  }
  openChest(c) {
    this.effects.burst(c.x, c.y - 6, '#ffd84a', 10);
    if (c.content === 'weapon') this.pickups.push(new Pickup('weapon', c.x, c.y + 14, { def: this.randomWeaponDef(), still: true }));
    else {
      for (let i = 0; i < randInt(4, 8); i++) this.pickups.push(new Pickup('coin', c.x, c.y));
      for (let i = 0; i < 4; i++) this.pickups.push(new Pickup('energy', c.x, c.y, { value: 8 }));
      if (Math.random() < 0.4) this.pickups.push(new Pickup('hp', c.x, c.y, { value: 20 }));
    }
  }
  giveWeapon(def) {
    const p = this.player, inst = new WeaponInstance(def);
    if (p.weapons.length < this.data.base.weaponSlots) { p.weapons.push(inst); p.slot = p.weapons.length - 1; }
    else {
      this.pickups.push(new Pickup('weapon', p.x, p.y + 4, { def: p.weapon.def, still: true }));
      p.weapons[p.slot] = inst;
    }
    this.discover(def.id);
    this.effects.text(p.x, p.y - 18, def.name, RARITY_COLOR[def.rarity]);
  }
  pickWeapon(pk) { pk.alive = false; this.giveWeapon(pk.def); }
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
    if (pk.kind === 'coin') { this.gold += pk.value; SFX.play('coin', 0.05); }
    else if (pk.kind === 'energy') { p.energy = Math.min(p.maxEnergy, p.energy + pk.value); SFX.play('energy', 0.05); }
    else if (pk.kind === 'hp') { p.hp = Math.min(p.maxHp, p.hp + pk.value); this.effects.text(p.x, p.y - 16, '+' + pk.value, '#7be36b'); SFX.play('heal'); }
  }

  // ── 전투 처리
  enemyShoot(x, y, ang, speed, damage, color, r) {
    this.enemyBullets.push(new EnemyBullet(x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, damage, color, r));
  }
  damageEnemy(enemy, src, kx, ky, opts = {}) {
    const { amount, crit } = rollDamage(src.damage, src.mods);
    if (!enemy.takeHit(amount)) return;
    const kb = (src.knockback || 0) * (1 - (enemy.def.knockbackResist || 0));
    if (enemy.alive && kb > 0 && !(enemy.state === 'ATTACK' && (enemy.def.aiType === 'charger' || enemy.def.boss)))
      moveAndCollide(enemy, kx * kb, ky * kb, this.map);
    if (src.status) { const react = enemy.applyStatus(src.status, src.mods); if (react) this.triggerReaction(enemy, react, src.mods); }
    if (!opts.quiet || crit || Math.random() < 0.3) this.effects.text(enemy.x, enemy.y - 12, crit ? amount + '!' : String(amount), crit ? '#ffd84a' : '#ffffff', crit);
    if (!enemy.def.dummy || Math.random() < 0.5) SFX.play(crit ? 'crit' : 'hit', crit ? 0.05 : 0.045);
    if (enemy.def.dummy) this.dpsLog.push({ t: this.time, a: amount });
    if (src.chain && !opts.noChain) this.chainLightning(enemy, src);
    if (!enemy.alive) this.onEnemyKilled(enemy);
  }
  // 보스 격노 전환 연출: 탄 정리 + 충격파 + 잠깐의 숨 돌릴 틈
  onBossEnrage(e) {
    this.enemyBullets.length = 0;
    e.roarT = 1.4;
    this.addShake(0.5, 5); this.hitStop(0.12); SFX.play('boss');
    this.effects.ring(e.x, e.y, 30, '#ffffff'); this.effects.ring(e.x, e.y, 60, '#ff6a6a'); this.effects.burst(e.x, e.y, '#ff6a6a', 20);
    this.showBanner(e.def.name + ' 격노!', '패턴이 빨라지고 새로운 공격이 추가됩니다', '#ff6a6a');
    const p = this.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < 70) moveAndCollide(p, dx / d * (70 - d), dy / d * (70 - d), this.map); // 근접해 있던 플레이어를 밀어냄
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
    this.effects.burst(enemy.x, enemy.y, enemy.def.color || '#c0c0c0', enemy.def.boss ? 24 : 8);
    SFX.play(enemy.def.boss ? 'explode' : 'kill', 0.04);
    if (enemy.def.boss) this.hitStop(0.3); else if (Math.random() < 0.35) this.hitStop(0.025);
    if (enemy.def.aiType === 'exploder') this.enemyExplode(enemy);
    if (enemy.def.boss) {
      this.addShake(0.4, 6); this.enemyBullets.length = 0; this.hazards.length = 0;
      for (const e of this.enemies) if (e.alive && e !== enemy) { e.alive = false; e.rewardGiven = true; e.setState('DEAD'); }
      return;
    }
    const B = BALANCE, coins = Math.max(1, Math.round(enemy.def.rewardGold * B.killGoldMult + (Math.random() < 0.5 ? 0.4 : -0.4)));
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
    for (const po of this.portals) po.render(ctx);
    for (const h of this.hazards) h.render(ctx);
    for (const o of this.props) o.render(ctx, this);
    for (const pk of this.pickups) pk.render(ctx);
    for (const e of this.enemies) e.renderTelegraph(ctx);
    const actors = [...this.enemies, ...this.allies, this.player].sort((a, b) => a.y - b.y);
    for (const a of actors) a.render(ctx);
    for (const pr of this.projectiles) pr.render(ctx);
    const w = this.player.weapon;
    if (w && w.beamActive && w.beamEnd) {
      const b = w.beamEnd;
      ctx.strokeStyle = w.def.bulletColor; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(this.time * 40); ctx.lineWidth = 5;
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
      const label = t instanceof Pickup ? `[E] ${t.def.name} (${RARITY_NAME[t.def.rarity]})` : t.label(this);
      const color = t instanceof Pickup ? RARITY_COLOR[t.def.rarity] : t.labelColor;
      if (label) {
        ctx.font = "bold 9px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
        const tw = Math.ceil(ctx.measureText(label).width), lx = Math.round(t.x), ly = Math.round(t.y) - 38;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(lx - tw / 2 - 4, ly - 2, tw + 8, 14);
        ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.strokeRect(lx - tw / 2 - 3.5, ly - 1.5, tw + 7, 13); ctx.globalAlpha = 1;
        hudText(ctx, label, lx, ly, color, 'center', 9);
      }
    }

    ctx.setTransform(R, 0, 0, R, 0, 0);
    this.renderScreenFx(ctx, cx, cy);
    this.hud.render(ctx, this);

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
