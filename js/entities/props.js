'use strict';
// ════════════════════════════════════════════
// 픽업 / 오브젝트
// ════════════════════════════════════════════
class Pickup {
  constructor(kind, x, y, o = {}) {
    this.kind = kind; this.x = x; this.y = y; this.half = 2; this.alive = true; this.t = Math.random() * 3;
    this.group = o.group || null; // 같은 묶음 중 하나만 가져갈 수 있음 (무기 진열대)
    this.lv = o.lv || 0;          // 무기 강화 단계
    const a = Math.random() * TAU, s = o.still ? 0 : 40 + Math.random() * 60;
    this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
    this.value = o.value || 1; this.def = o.def || null; this.delay = o.still ? 0 : 0.35;
  }
  get magnetic() { return this.kind !== 'weapon'; }
  update(dt, world) {
    this.t += dt; this.delay = Math.max(0, this.delay - dt);
    const p = world.player;
    if (this.magnetic && this.delay <= 0 && p.state !== 'DEAD') {
      const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
      if (d < 9) { world.collect(this); this.alive = false; return; }
      if (d < 64) { const k = 260 * (1 - d / 80); this.vx += dx / d * k * dt * 6; this.vy += dy / d * k * dt * 6; }
    }
    this.vx *= Math.pow(0.02, dt); this.vy *= Math.pow(0.02, dt);
    moveAndCollide(this, this.vx * dt, this.vy * dt, world.map);
  }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), bob = Math.round(Math.sin(this.t * 4) * 1.5);
    switch (this.kind) {
      case 'coin': drawSprite(ctx, getSprite('coin'), x, y + 3 + bob); break;
      case 'energy':
        ctx.fillStyle = 'rgba(90,150,255,0.25)'; ctx.fillRect(x - 4, y - 4 + bob, 8, 8);
        drawSprite(ctx, getSprite('energy'), x, y + 4 + bob); break;
      case 'hp': drawPotion(ctx, x, y + bob, '#e04848'); break;
      case 'weapon':
        ctx.fillStyle = RARITY_COLOR[this.def.rarity]; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.t * 3);
        ctx.beginPath(); ctx.arc(x, y + 3, 9, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        drawWeaponCentered(ctx, this.def, x, y + bob); break;
    }
  }
}
// 상호작용 가능한 오브젝트 공통: label(game) → 문자열|null, interact(game), render(ctx, game)
class Chest {
  constructor(x, y, content) { this.x = x; this.y = y; this.content = content; this.open = false; this.radius = 20; }
  label() { return this.open ? null : '[E] 상자 열기'; }
  get labelColor() { return '#ffd84a'; }
  interact(game) { this.open = true; game.openChest(this); }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 8, y + 6, 16, 2);
    drawSprite(ctx, getSprite(this.open ? 'chest_open' : 'chest'), x, y + 7);
  }
}

// ── 특수방 소품
// 회복의 샘: 한 번 마시면 체력 일부와 에너지·보호막 회복
class Fountain {
  constructor(x, y) { this.x = x; this.y = y; this.used = false; this.radius = 20; this.t = 0; }
  label() { return this.used ? null : '[E] 회복의 샘 (체력 40% · 에너지 · 보호막)'; }
  get labelColor() { return '#7ad0ff'; }
  interact(game) {
    if (this.used) return; this.used = true;
    const p = game.player, heal = Math.round(p.maxHp * BALANCE.specialRooms.fountainHeal);
    p.hp = Math.min(p.maxHp, p.hp + heal); p.energy = p.maxEnergy; p.shield = p.maxShield;
    game.effects.heal(p.x, p.y); game.effects.text(p.x, p.y - 20, '+' + heal, '#7be36b', true); game.effects.ring(this.x, this.y, 24, '#7ad0ff'); SFX.play('heal');
  }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 12, y + 6, 24, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 12, y - 2, 24, 9); ctx.fillStyle = '#8a8aa0'; ctx.fillRect(x - 11, y - 1, 22, 7); ctx.fillStyle = '#a8a8be'; ctx.fillRect(x - 11, y - 1, 22, 1);
    ctx.fillStyle = this.used ? '#3a3a4a' : '#4a9ad8'; ctx.fillRect(x - 9, y, 18, 4);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 2, y - 12, 4, 11); ctx.fillStyle = '#8a8aa0'; ctx.fillRect(x - 1, y - 11, 2, 10);
    if (!this.used) { ctx.fillStyle = '#bfefff'; for (let i = 0; i < 3; i++) { const k = ((t * 1.5 + i / 3) % 1); ctx.fillRect(Math.round(x - 1 + (i - 1) * k * 6), Math.round(y - 12 + k * k * 12), 1, 2); } ctx.fillRect(x - 5 + Math.round(Math.sin(t * 3) * 3), y + 1, 2, 1); }
  }
}
// 축복의 제단: 골드를 바쳐 정해진 축복 하나를 받음 (한 번)
class BuffAltar {
  constructor(x, y, buff, price) { this.x = x; this.y = y; this.buff = buff; this.price = price; this.used = false; this.radius = 20; }
  label() { return this.used ? null : `[E] 축복: ${this.buff.name} — ${this.buff.desc} (${this.price}골드)`; }
  get labelColor() { return '#c8a0ff'; }
  interact(game) {
    if (this.used) return;
    const p = game.player;
    if (game.gold < this.price) { game.effects.text(p.x, p.y - 18, '골드가 부족합니다', '#ff7070'); SFX.play('deny'); return; }
    game.gold -= this.price; this.used = true; this.buff.apply(p); p.buffs.push(this.buff.id);
    game.showBanner(this.buff.name, this.buff.desc, '#c8a0ff'); game.effects.ring(this.x, this.y, 26, '#c8a0ff'); game.effects.sparkle(p.x, p.y, '#c8a0ff'); SFX.play('skill');
  }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 10, y + 6, 20, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 10, y - 4, 20, 11); ctx.fillStyle = '#4a3a6a'; ctx.fillRect(x - 9, y - 3, 18, 9); ctx.fillStyle = '#6a5a8a'; ctx.fillRect(x - 9, y - 3, 18, 2);
    ctx.fillStyle = '#c8a050'; ctx.fillRect(x - 9, y + 2, 18, 1);
    if (!this.used) { ctx.fillStyle = `rgba(200,160,255,${0.5 + 0.4 * Math.sin(t * 4)})`; ctx.beginPath(); ctx.arc(x, y - 10 + Math.sin(t * 2) * 1.5, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 11, 2, 2);
      hudText(ctx, String(this.price), x, y + 9, '#ffd84a', 'center', 8); }
  }
}
// 행운의 기계: 골드를 넣고 돌리면 무작위 결과 (여러 번 가능)
class SlotMachine {
  constructor(x, y, price) { this.x = x; this.y = y; this.price = price; this.radius = 18; this.spin = 0; this.face = [0, 1, 2]; }
  label() { return `[E] 행운의 기계 돌리기 (${this.price}골드)`; }
  get labelColor() { return '#ffd84a'; }
  interact(game) {
    const p = game.player;
    if (this.spin > 0) return;
    if (game.gold < this.price) { game.effects.text(p.x, p.y - 18, '골드가 부족합니다', '#ff7070'); SFX.play('deny'); return; }
    game.gold -= this.price; this.spin = 0.6; SFX.play('coin');
    const r = Math.random(), c = { x: this.x, y: this.y + 16 };
    let msg, col;
    if (r < 0.35) { msg = '꽝!'; col = '#888'; this.face = [0, 1, 2]; }
    else if (r < 0.6) { msg = '골드 두 배!'; col = '#ffd84a'; this.face = [3, 3, 3]; for (let i = 0; i < Math.ceil(this.price * 2 / 5); i++) game.pickups.push(new Pickup('coin', c.x, c.y)); }
    else if (r < 0.78) { msg = '체력 물약'; col = '#ff7a7a'; this.face = [1, 1, 1]; game.pickups.push(new Pickup('hp', c.x, c.y, { value: 30 })); }
    else if (r < 0.92) { msg = '에너지'; col = '#7ab0ff'; this.face = [2, 2, 2]; for (let i = 0; i < 6; i++) game.pickups.push(new Pickup('energy', c.x, c.y, { value: 12 })); }
    else { msg = '대박! 무기'; col = '#c070ff'; this.face = [4, 4, 4]; game.pickups.push(new Pickup('weapon', c.x, c.y, { def: game.randomWeaponDef(), still: true })); game.effects.burst(this.x, this.y, '#ffd84a', 16); }
    this.result = { msg, col, t: 0.6 };
  }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), dt = 1 / 60;
    if (this.spin > 0) { this.spin -= dt; if (this.spin <= 0 && this.result) { game.effects.text(this.x, this.y - 22, this.result.msg, this.result.col, true); SFX.play(this.result.msg === '꽝!' ? 'deny' : 'buy'); } }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 10, y + 6, 20, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 10, y - 14, 20, 21); ctx.fillStyle = '#a03040'; ctx.fillRect(x - 9, y - 13, 18, 19); ctx.fillStyle = '#c84a5a'; ctx.fillRect(x - 9, y - 13, 18, 2);
    ctx.fillStyle = '#1a1424'; ctx.fillRect(x - 7, y - 9, 14, 6);
    const C = ['#7a7a8a', '#ff5a5a', '#5a9aff', '#ffd84a', '#c070ff'];
    for (let i = 0; i < 3; i++) { ctx.fillStyle = this.spin > 0 ? C[Math.floor(Math.random() * 5)] : C[this.face[i]]; ctx.fillRect(x - 6 + i * 5, y - 8, 3, 4); }
    ctx.fillStyle = '#c8a050'; ctx.fillRect(x + 10, y - 10, 2, 8); ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x + 9, y - 12, 4, 3); // 레버
    hudText(ctx, String(this.price), x, y + 9, '#ffd84a', 'center', 8);
  }
}
// 도전의 석판: 건드리면 문이 닫히고 정예 몬스터 웨이브 → 이기면 희귀 이상 무기 상자
class ChallengeStone {
  constructor(x, y, room) { this.x = x; this.y = y; this.room = room; this.used = false; this.radius = 20; }
  label() { return this.used ? null : '[E] 도전 시작 (정예 몬스터 웨이브 → 희귀 이상 무기)'; }
  get labelColor() { return '#ff7a7a'; }
  interact(game) { if (this.used) return; this.used = true; game.startChallenge(this.room); }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 8, y + 6, 16, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 7, y - 14, 14, 21); ctx.fillStyle = '#5a5060'; ctx.fillRect(x - 6, y - 13, 12, 19); ctx.fillStyle = '#6e6474'; ctx.fillRect(x - 6, y - 13, 12, 2);
    ctx.fillStyle = this.used ? '#3a2a2a' : `rgba(255,${80 + Math.round(40 * Math.sin(t * 5))},80,1)`; ctx.fillRect(x - 1, y - 10, 2, 8); ctx.fillRect(x - 4, y - 7, 8, 2); // 붉은 검 문양
  }
}

// 무기 제련소: 골드를 내면 들고 있는 무기를 같은 등급(일정 확률로 한 등급 위)의 다른 무기로 다시 벼림 (한 번)
class Forge {
  constructor(x, y, price) { this.x = x; this.y = y; this.price = price; this.used = false; this.radius = 20; }
  label(game) { const w = game.player.weapon; return this.used || !w ? null : `[E] 제련: ${w.def.name} → 같은 등급 이상 무작위 (${this.price}골드)`; }
  get labelColor() { return '#ff9a4a'; }
  interact(game) {
    const p = game.player, w = p.weapon; if (this.used || !w) return;
    if (game.gold < this.price) { game.effects.text(p.x, p.y - 18, '골드가 부족합니다', '#ff7070'); SFX.play('deny'); return; }
    const RANK = ['common', 'uncommon', 'rare', 'epic', 'legendary'], cur = RANK.indexOf(w.def.rarity);
    const up = cur < 4 && Math.random() < BALANCE.specialRooms.forgeUpChance, want = RANK[up ? cur + 1 : cur];
    const pool = DATA_WEAPONS.filter((d) => d.rarity === want && d.id !== w.def.id && !p.weapons.some((o) => o.def.id === d.id));
    if (!pool.length) { game.effects.text(p.x, p.y - 18, '제련할 수 있는 무기가 없습니다', '#ff7070'); return; }
    game.gold -= this.price; this.used = true;
    const def = pick(pool); p.weapons[p.slot] = new WeaponInstance(def, w.lv); game.discover(def.id); // 강화 단계는 유지
    game.effects.text(p.x, p.y - 24, (up ? '등급 상승! ' : '') + def.name, RARITY_COLOR[def.rarity], true); game.effects.burst(this.x, this.y - 6, '#ff9a4a', 16); SFX.play(up ? 'clear' : 'heavy');
  }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 11, y + 6, 22, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 11, y - 6, 22, 6); ctx.fillRect(x - 5, y, 10, 7);           // 모루
    ctx.fillStyle = '#6a6e7a'; ctx.fillRect(x - 10, y - 5, 20, 4); ctx.fillRect(x - 4, y, 8, 6); ctx.fillStyle = '#8a8e9a'; ctx.fillRect(x - 10, y - 5, 20, 1);
    if (!this.used) { ctx.fillStyle = `rgba(255,${120 + Math.round(60 * Math.sin(t * 8))},40,0.9)`; ctx.fillRect(x - 3 + Math.round(Math.sin(t * 5) * 2), y - 8, 2, 2); ctx.fillRect(x + 2, y - 9 + Math.round(Math.cos(t * 6)), 1, 1);
      hudText(ctx, String(this.price), x, y + 9, '#ffd84a', 'center', 8); }
  }
}
// 피의 제단: 최대 체력 20%를 바치면 영웅 이상 무기 (한 번)
class BloodAltar {
  constructor(x, y) { this.x = x; this.y = y; this.used = false; this.radius = 20; }
  label(game) { return this.used ? null : `[E] 피의 제단: 최대 체력 -${Math.round(game.player.maxHp * BALANCE.specialRooms.bloodCost)} → 영웅 이상 무기`; }
  get labelColor() { return '#ff5a5a'; }
  interact(game) {
    const p = game.player; if (this.used) return;
    const cost = Math.round(p.maxHp * BALANCE.specialRooms.bloodCost);
    if (p.maxHp - cost < 40) { game.effects.text(p.x, p.y - 18, '체력이 너무 적습니다', '#ff7070'); SFX.play('deny'); return; }
    this.used = true; p.maxHp -= cost; p.hp = Math.min(p.hp, p.maxHp);
    game.pickups.push(new Pickup('weapon', this.x, this.y + 16, { def: game.randomWeaponDef(3), still: true }));
    game.effects.text(p.x, p.y - 20, `최대 체력 -${cost}`, '#ff5a5a', true); game.effects.burst(this.x, this.y - 8, '#ff3a3a', 18); game.addShake(0.15, 3); SFX.play('hurt');
  }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 10, y + 6, 20, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 10, y - 4, 20, 11); ctx.fillStyle = '#3a2a2a'; ctx.fillRect(x - 9, y - 3, 18, 9); ctx.fillStyle = '#5a3a3a'; ctx.fillRect(x - 9, y - 3, 18, 2);
    ctx.fillStyle = this.used ? '#4a2a2a' : '#c02020'; ctx.fillRect(x - 6, y - 2, 12, 2); // 피가 고인 홈
    if (!this.used) { ctx.fillStyle = `rgba(255,60,60,${0.5 + 0.4 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.arc(x, y - 10 + Math.sin(t * 2), 3.5, 0, TAU); ctx.fill(); }
  }
}

// 강화대: 들고 있는 무기를 골드로 강화 (여러 번 가능, 실패해도 단계 유지). 강화소는 할인·성공률 보너스
class UpgradeAnvil {
  constructor(x, y, discount = 1, bonus = 0, room = false) { this.x = x; this.y = y; this.discount = discount; this.bonus = bonus; this.room = room; this.radius = 18; }
  label(game) {
    const w = game.player.weapon; if (!w) return null;
    if (w.lv >= BALANCE.upgrade.maxLevel) return `${weaponTitle(w)} — 최대 강화`;
    return `[E] 강화: ${weaponTitle(w)} → +${w.lv + 1}  (성공 ${Math.round(game.upgradeChance(w, this.bonus) * 100)}% · ${game.upgradeCost(w, this.discount)}골드)`;
  }
  get labelColor() { return '#ffd84a'; }
  interact(game) { game.tryUpgrade(this.discount, this.bonus, this); }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game ? game.time : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 10, y + 6, 20, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 10, y - 4, 20, 5); ctx.fillRect(x - 4, y + 1, 8, 6);
    ctx.fillStyle = this.room ? '#c8a050' : '#6a6e7a'; ctx.fillRect(x - 9, y - 3, 18, 3); ctx.fillRect(x - 3, y + 1, 6, 5);
    ctx.fillStyle = this.room ? '#ffe9a0' : '#8a8e9a'; ctx.fillRect(x - 9, y - 3, 18, 1);
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x + 4, y - 12, 2, 8); ctx.fillStyle = '#a8b0bc'; ctx.fillRect(x + 1, y - 13, 8, 3); // 망치
    ctx.fillStyle = `rgba(255,216,74,${0.4 + 0.3 * Math.sin(t * 5)})`; ctx.fillRect(x - 6 + Math.round(Math.sin(t * 3) * 2), y - 6, 1, 1);
    hudText(ctx, this.room ? '강화소' : '강화', x, y + 9, '#ffd84a', 'center', 7);
  }
}

class ShopItem {
  constructor(x, y, kind, price, def) { this.x = x; this.y = y; this.kind = kind; this.price = price; this.def = def || null; this.sold = false; this.radius = 16; this.seed = Math.random() * 3; this.t = 0; }
  get name() { return this.kind === 'weapon' ? this.def.name : this.kind === 'hp' ? '체력 물약 (+40)' : '에너지 물약 (+120)'; }
  label() { return this.sold ? null : `[E] 구매: ${this.name} (${this.price}골드)`; }
  get labelColor() { return this.kind === 'weapon' ? RARITY_COLOR[this.def.rarity] : '#ffd84a'; }
  interact(game) { game.buy(this); }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y);
    this.t = game.time + this.seed;
    ctx.fillStyle = '#4a3a5a'; ctx.fillRect(x - 8, y + 2, 16, 6);
    ctx.fillStyle = '#5e4a72'; ctx.fillRect(x - 8, y + 2, 16, 2);
    if (this.sold) return;
    const bob = Math.round(Math.sin(this.t * 3));
    if (this.kind === 'weapon') drawWeaponCentered(ctx, this.def, x, y - 4 + bob);
    else drawPotion(ctx, x, y - 2 + bob, this.kind === 'hp' ? '#e04848' : '#4a8cff');
    hudText(ctx, String(this.price), x, y + 9, '#ffd84a', 'center', 8);
  }
}

class Pedestal {
  constructor(x, y, hero, row = 0) { this.x = x; this.y = y; this.hero = hero; this.row = row; this.radius = 18; this.seed = Math.random() * 3; this.t = 0; }
  label(game) {
    const s = game.save;
    if (s.selected === this.hero.id) { // 고른 직업: 결정석으로 직업 레벨업
      const cost = game.jobLevelCost(this.hero.id), lv = game.jobLevel(this.hero.id);
      return `[E] 직업 레벨 (Lv.${lv}${cost === null ? ' 최고' : ''})`;
    }
    if (s.unlocked.includes(this.hero.id)) return `[E] ${this.hero.name} 선택`;
    return `[E] 해금: ${this.hero.name} (${this.hero.price} ${CUR.name})`;
  }
  get labelColor() { return '#ffffff'; }
  interact(game) { if (game.save.selected === this.hero.id) game.overlay = { type: 'joblevel', msg: null }; else game.selectHero(this.hero); }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), s = game.save;
    const unlocked = s.unlocked.includes(this.hero.id), selected = s.selected === this.hero.id;
    this.t = game.time + this.seed;
    ctx.fillStyle = selected ? 'rgba(255,220,120,0.25)' : 'rgba(0,0,0,0)';
    ctx.beginPath(); ctx.ellipse(x, y + 6, 13, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a5070'; ctx.fillRect(x - 10, y + 2, 20, 8);
    ctx.fillStyle = '#7a6e94'; ctx.fillRect(x - 10, y + 2, 20, 2);
    if (!selected) {
      ctx.globalAlpha = unlocked ? 1 : 0.35;
      drawHero(ctx, this.hero, x, y - 3, 1, 0, false);
      ctx.globalAlpha = 1;
    }
    const up = this.row ? 10 : 0; // 이웃 단상과 글자가 겹치지 않게 한 칸씩 위아래로 엇갈림
    const jl = game.jobLevel(this.hero.id);
    hudText(ctx, this.hero.name + (jl ? ` Lv.${jl}` : ''), x, y - 28 - up, selected ? '#ffd84a' : unlocked ? '#fff' : '#888', 'center', 8);
    if (!unlocked) hudText(ctx, `${this.hero.price} ${CUR.name}`, x, y + 11 + up, CUR.color, 'center', 8);
    else if (selected) hudText(ctx, '선택됨', x, y + 11 + up, '#ffd84a', 'center', 8);
  }
}

class CodexBoard {
  constructor(x, y) { this.x = x; this.y = y; this.radius = 22; }
  label() { return '[E] 무기 도감'; }
  get labelColor() { return '#ffd84a'; }
  interact(game) { game.overlay = { type: 'codex' }; }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 12, y - 14, 24, 18);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 10, y - 12, 20, 14);
    ctx.fillStyle = '#8a7a60';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 8, y - 10 + i * 3, 10 + (i % 2) * 4, 1);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 10, y + 4, 2, 6); ctx.fillRect(x + 8, y + 4, 2, 6);
  }
}

// 보구 보관대: 보유한 보구 중 1개를 골라 런에 들고 감 (기원의 성역에 도달한 뒤 로비에 나타남)
class TreasureVault {
  constructor(x, y) { this.x = x; this.y = y; this.radius = 22; this.t = 0; }
  label() { return '[E] 보구 보관대'; }
  get labelColor() { return '#ffe9a0'; }
  interact(game) { game.overlay = { type: 'treasures' }; }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), k = 0.5 + 0.5 * Math.sin((game ? game.time : 0) * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 11, y + 6, 22, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 11, y - 8, 22, 15);
    ctx.fillStyle = '#6a6474'; ctx.fillRect(x - 10, y - 7, 20, 13); ctx.fillStyle = '#8a8496'; ctx.fillRect(x - 10, y - 7, 20, 2);
    ctx.fillStyle = '#c8a050'; ctx.fillRect(x - 10, y - 1, 20, 1);
    const eq = game && DATA_TREASURES.find((t) => t.id === game.save.treasureEquipped); // 장착한 보구를 보관대 위에 띄움
    if (eq) drawTreasureIcon(ctx, eq, x, y - 16 + Math.sin((game ? game.time : 0) * 2) * 1.5, 1);
    ctx.globalAlpha = 0.4 + 0.4 * k; ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - 2, y - 5, 4, 3); ctx.globalAlpha = 1;
  }
}

const ARMORY_PRICE = BALANCE.armoryPrice;
class Armory {
  constructor(x, y) { this.x = x; this.y = y; this.radius = 24; }
  label() { return '[E] 무기고 (시작 무기 선택)'; }
  get labelColor() { return '#ffd84a'; }
  interact(game) { game.overlay = { type: 'armory', msg: null }; }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 15, y + 7, 30, 3);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 15, y - 16, 30, 24);
    ctx.fillStyle = '#6a4424'; ctx.fillRect(x - 14, y - 15, 28, 22);
    ctx.fillStyle = '#4a2c14'; ctx.fillRect(x - 12, y - 13, 24, 18);
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x - 14, y - 15, 28, 2); ctx.fillRect(x - 14, y - 4, 28, 2);
    ['weapon_sword_001', 'weapon_rifle_001', 'weapon_staff_001'].forEach((id, i) => {
      drawWeapon(ctx, GAME_DATA.weapons.get(id), x - 8 + i * 8, y + 3, -Math.PI / 2);
    });
  }
}
// 도감/무기고 공용 격자 (탭: 총기 / 지팡이 / 근접 / 활·특수)
const WEAPON_TABS = [
  { name: '총기', test: (d) => d.type === 'gun' && d.shape !== 'staff' },
  { name: '지팡이', test: (d) => d.shape === 'staff' },
  { name: '근접', test: (d) => d.type === 'melee' },
  { name: '활·특수', test: (d) => d.type === 'charge' || d.type === 'beam' }
];
function tabRect(i) { const w = 90, gap = 6, total = w * 4 + gap * 3; return { x: (VIEW_W - total) / 2 + i * (w + gap), y: 22, w, h: 14 }; }
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const GRID_PER_PAGE = 40;
function tabWeapons(tab) { return DATA_WEAPONS.filter(WEAPON_TABS[tab].test).sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)); }
function gridPages(tab) { return Math.max(1, Math.ceil(tabWeapons(tab).length / GRID_PER_PAGE)); }
function weaponGrid(tab = 0, page = 0) { // 한 페이지 40칸 (5열 × 8줄), 등급순
  const cols = 5, cw = 100, rh = 26, ox = 3, oy = 40;
  return tabWeapons(tab).slice(page * GRID_PER_PAGE, (page + 1) * GRID_PER_PAGE)
    .map((d, i) => ({ d, x: ox + (i % cols) * (cw + 1), y: oy + Math.floor(i / cols) * rh, w: cw, h: rh - 2 }));
}
// 무기 특성: 가장 눈에 띄는 메커닉 2~3개를 짧게
function weaponTraits(d, max = 3) {
  if (d.trait) return d.trait;
  const t = [], S = { burn: '화상', freeze: '빙결', poison: '중독', shock: '전격', blind: '실명', curse: '저주' }, n = d.projectileCount || 1;
  if (d.summon) t.push('드론 소환'); if (d.deploy) t.push('포탑 설치'); if (d.orbit) t.push('회전 구슬');
  if (d.meteor) t.push(d.meteor.arrow ? '화살비' : '낙하 공격'); if (d.beamShot) t.push('일직선 관통 광선');
  if (d.mine) t.push('지뢰 설치'); if (d.boomerang) t.push('돌아오는 부메랑'); if (d.puddle) t.push('불 웅덩이');
  if (d.trail) t.push('잔류 장판'); if (d.grenade) t.push('시한 폭발'); if (d.firework) t.push('공중에서 터짐');
  if (d.split) t.push('터지면 파편'); if (d.pull) t.push('적을 흡인'); if (d.reflect) t.push('적 탄 되받아침');
  if (d.wave) t.push('검기 발사'); if (d.lunge) t.push('돌진 찌르기'); if (d.slam) t.push('충격파');
  if (d.nth) t.push(`${d.nth.every}번째마다 ${d.nth.mult}배`); if (d.close) t.push('가까울수록 강함');
  if (d.execute) t.push(`빈사 적 +${Math.round(d.execute * 100)}%`); if (d.mark) t.push(`약점 +${Math.round((d.mark.mult - 1) * 100)}%`);
  if (d.killEnergy) t.push(`처치 에너지 +${d.killEnergy}`); if (d.critBonus) t.push(`치명타 +${Math.round(d.critBonus * 100)}%`);
  if (d.lifesteal) t.push('흡혈'); if (d.chain) t.push('연쇄 번개'); if (d.ricochet) t.push('적 사이를 튕김');
  if (d.focus) t.push('계속 비추면 강해짐'); if (d.spinUp) t.push('누를수록 빨라짐'); if (d.grow) t.push('멀리 갈수록 강함');
  if (d.homing) t.push('유도'); if (d.bubble) t.push('느린 거품'); if (d.status) t.push(S[d.status.type]);
  if (d.burst) t.push(`${d.burst.count}연사`);
  if (d.parallel) t.push(`나란히 ${n}발`); else if (n >= 8 && d.fanDeg) t.push('원형 탄막'); else if (n > 1) t.push(d.fanDeg ? `부채꼴 ${n}발` : `산탄 ${n}발`);
  if (d.explodeRadius && !d.mine) t.push('폭발'); if (d.bounce) t.push('벽 반사');
  if (d.pierce >= 99 && !d.flame) t.push('전부 관통'); else if (d.pierce > 0 && d.pierce < 99) t.push(`${d.pierce}회 관통`);
  if (d.flame) t.push('화염 분사'); if (d.knockback < 0) t.push('적을 끌어당김'); else if (d.knockback >= 12) t.push('강한 넉백');
  if (d.arcDeg >= 300) t.push('360° 베기'); else if (d.arcDeg >= 180) t.push('넓은 베기'); else if (d.type === 'melee' && d.arcDeg <= 40 && !d.lunge) t.push('찌르기');
  if (d.deflect && t.length < 2) t.push('탄 막기');
  if (!t.length) t.push(d.type === 'charge' ? '모아 쏘기' : d.type === 'beam' ? '지속 광선' : '기본 사격');
  return t.slice(0, max).join(' · ');
}
function weaponShortLine(d) {
  const dmg = d.projectileCount > 1 ? `${d.damage}×${d.projectileCount}` : d.burst ? `${d.damage}×${d.burst.count}` : d.damage;
  const en = d.type === 'beam' ? `${d.energyPerSec}/초` : (d.energyCost || 0);
  return `피해 ${dmg} · 에너지 ${en}`;
}
function weaponStatLine(d) {
  const dmg = d.projectileCount > 1 ? `${d.damage}×${d.projectileCount}` : d.burst ? `${d.damage}×${d.burst.count}` : d.damage;
  const en = d.type === 'beam' ? `${d.energyPerSec}/초` : (d.energyCost || 0);
  return `${TYPE_NAME[d.type]} · 피해 ${dmg} · 에너지 ${en}`;
}

class Merchant {
  constructor(x, y) { this.x = x; this.y = y; this.t = 0; this.radius = 0; }
  label() { return null; }
  render(ctx, game) {
    this.t = game.time;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(this.x) - 6, Math.round(this.y) + 6, 12, 2);
    drawSprite(ctx, getSprite('merchant'), Math.round(this.x), Math.round(this.y) + 7);
    const p = game.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < 60) hudText(ctx, '어서 오세요!', Math.round(this.x), Math.round(this.y) - 24, '#9fe89f', 'center', 8);
  }
}

class Portal {
  constructor(x, y, onEnter, label, color = [90, 160, 255]) { this.x = x; this.y = y; this.t = 0; this.onEnter = onEnter; this.label = label; this.color = color; }
  render(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y), [r, g, b] = this.color;
    for (let i = 3; i >= 0; i--) {
      ctx.fillStyle = `rgba(${Math.min(255, r + i * 30)},${Math.min(255, g + i * 20)},${b},${0.25 + i * 0.12})`;
      const rr = 6 + i * 3 + Math.sin(this.t * 4 + i) * 1.5;
      ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 1.3, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      const a = this.t * 2 + i * TAU / 4;
      ctx.fillRect(Math.round(x + Math.cos(a) * 12), Math.round(y + Math.sin(a) * 16), 1, 1);
    }
    if (this.label) hudText(ctx, this.label, x, y - 30, '#bfe0ff', 'center', 8);
  }
}

// ── 기원의 성역 장식 (제10 필드)
// 보스방 위쪽의 거대한 문: 문지기를 쓰러뜨리면 열림 (open 0 → 1)
class SanctumGate {
  constructor(x, y) { this.x = x; this.y = y; this.open = 0; this.opening = false; }
  label() { return null; }
  render(ctx, game) {
    const t = game.time; if (this.opening) this.open = Math.min(1, this.open + 1 / 60 / 2.2);
    const x = Math.round(this.x), y = Math.round(this.y), W = 76, H = 70, k = this.open;
    ctx.fillStyle = '#2a2632'; ctx.fillRect(x - W / 2 - 8, y - H, W + 16, H + 4); // 석조 틀
    ctx.fillStyle = '#6c6878'; ctx.fillRect(x - W / 2 - 8, y - H, 8, H + 4); ctx.fillRect(x + W / 2, y - H, 8, H + 4);
    ctx.fillStyle = '#c8a050'; ctx.fillRect(x - W / 2 - 10, y - H - 6, W + 20, 6); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - W / 2 - 10, y - H - 6, W + 20, 1);
    for (let i = 0; i < 5; i++) { const a = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.globalAlpha = 0.4 + 0.5 * a; ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - 28 + i * 14, y - H - 4, 3, 2); } ctx.globalAlpha = 1; // 빛나는 문양
    if (k > 0) { // 열린 틈으로 빛
      const g = ctx.createLinearGradient(0, y - H, 0, y + 40); g.addColorStop(0, 'rgba(255,240,190,0.95)'); g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g; ctx.fillRect(x - (W / 2) * k, y - H + 2, W * k, H + 38);
    }
    const dw = (W / 2) * (1 - k * 0.92); // 양쪽 문짝이 옆으로 밀려남
    for (const sgn of [-1, 1]) {
      const dx = sgn < 0 ? x - W / 2 : x + W / 2 - dw;
      ctx.fillStyle = '#4a4652'; ctx.fillRect(dx, y - H + 2, dw, H);
      ctx.fillStyle = '#5a5666'; ctx.fillRect(dx + 2, y - H + 6, Math.max(0, dw - 4), H - 10);
      ctx.fillStyle = '#c8a050'; ctx.fillRect(sgn < 0 ? dx + dw - 2 : dx, y - H + 2, 2, H); // 금빛 테두리
      if (dw > 12) { ctx.fillStyle = '#ffe9a0'; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3 + sgn); ctx.fillRect(dx + dw / 2 - 2, y - H / 2 - 6, 4, 12); ctx.globalAlpha = 1; } // 문 가운데 빛 문양
    }
  }
}
// 금빛 불꽃이 타는 화로
class Brazier {
  constructor(x, y) { this.x = x; this.y = y; this.seed = Math.random() * 10; }
  label() { return null; }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game.time + this.seed;
    ctx.fillStyle = 'rgba(255,220,140,0.12)'; ctx.beginPath(); ctx.arc(x, y - 8, 22 + Math.sin(t * 5) * 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a3640'; ctx.fillRect(x - 2, y - 6, 4, 8); ctx.fillStyle = '#c8a050'; ctx.fillRect(x - 6, y - 9, 12, 3); ctx.fillStyle = '#8a6a30'; ctx.fillRect(x - 5, y - 6, 10, 1);
    for (let i = 0; i < 3; i++) { const h = 6 + Math.sin(t * 9 + i * 2) * 2 + i; ctx.fillStyle = i === 2 ? '#ffffff' : i ? '#ffe9a0' : '#ffb040'; ctx.fillRect(x - 3 + i, y - 9 - h, 6 - i * 2, h); }
    if (Math.random() < 0.08) game.effects.part(x + randInt(-2, 2), y - 16, randInt(-4, 4), -30, { color: '#ffe9a0', life: 0.8, size: 1.5, size2: 0, drag: 1, add: true });
  }
}
// 천장에서 내려오는 빛기둥 (장식)
class LightPillar {
  constructor(x, y) { this.x = x; this.y = y; this.seed = Math.random() * 10; }
  label() { return null; }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y), t = game.time + this.seed, a = 0.16 + 0.06 * Math.sin(t * 1.5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y - 120, 0, y + 6); g.addColorStop(0, 'rgba(255,233,160,0)'); g.addColorStop(1, `rgba(255,233,160,${a})`);
    ctx.fillStyle = g; ctx.fillRect(x - 10, y - 120, 20, 126);
    ctx.fillStyle = `rgba(255,240,200,${a * 0.8})`; ctx.beginPath(); ctx.ellipse(x, y + 4, 14, 5, 0, 0, TAU); ctx.fill();
    ctx.restore();
    if (Math.random() < 0.05) game.effects.part(x + randInt(-8, 8), y, 0, -14 - Math.random() * 10, { color: '#fff4c0', life: 1.6, size: 1.2, size2: 0, drag: 0.3, add: true });
  }
}

// ── 모험가 길드 (로비 아래쪽) ─ 제안 단계의 임시 디자인
const GUILD_NPC_LOOK = { // 길드 사람들 외형 (기존 캐릭터 그림에 다른 옷색)
  reception: { id: 'npc_reception', look: { sprite: 'priest', body: '#3a5a8a', accent: '#ffd84a' } },
  trader: { id: 'npc_trader', look: { sprite: 'engineer', body: '#7a5a3a', accent: '#c8a050' } },
  dealer: { id: 'npc_dealer', look: { sprite: 'assassin', body: '#5a2a4a', accent: '#ffd84a' } },
  a: { id: 'npc_a', look: { sprite: 'knight', body: '#4a6a4a', accent: '#a0c070' } },
  b: { id: 'npc_b', look: { sprite: 'wizard', body: '#3a7a8a', accent: '#2a4a5a' } },
  c: { id: 'npc_c', look: { sprite: 'berserker', body: '#6a4a3a', accent: '#8a2a2a' } },
  d: { id: 'npc_d', look: { sprite: 'gunslinger', body: '#5a4a6a', accent: '#8a6a3a' } }
};
const npcDraw = (ctx, key, x, y, face, game) => drawHero(ctx, GUILD_NPC_LOOK[key], x, y + Math.round(Math.sin((game ? game.time : 0) * 2 + x) * 0.6), face, 0, false);
const signText = (ctx, text, x, y, color) => { ctx.font = 'bold 8px monospace'; const w = Math.ceil(ctx.measureText(text).width) + 8; ctx.fillStyle = '#3a2614'; ctx.fillRect(x - w / 2, y - 6, w, 11); ctx.fillStyle = '#c89a40'; ctx.fillRect(x - w / 2, y - 6, w, 1); hudText(ctx, text, x, y - 5, color || '#ffe9a0', 'center', 8); };
// 접수대 + 접수원: 일일·주간 퀘스트, 칭호
class GuildDesk {
  constructor(x, y) { this.x = x; this.y = y; this.radius = 30; }
  label(game) { const G = game.guild(), ready = (G.daily || []).concat(G.weekly || []).filter((q) => q.prog >= q.n && !q.claimed).length; return `[E] 접수원 — 퀘스트 · 칭호${ready ? `  (보상 ${ready}개)` : ''}`; }
  get labelColor() { return '#ffd84a'; }
  interact(game) { game.overlay = { type: 'guild', tab: 0, msg: null }; }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y);
    npcDraw(ctx, 'reception', x, y - 12, 1, game);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 42, y - 6, 84, 16); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x - 41, y - 5, 82, 14); ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x - 41, y - 5, 82, 3); // 카운터
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 30, y - 8, 10, 4); ctx.fillRect(x + 18, y - 9, 6, 5); ctx.fillStyle = '#c89a40'; ctx.fillRect(x + 26, y - 10, 3, 6); // 서류·잉크
    const G = game.guild(), ready = (G.daily || []).concat(G.weekly || []).some((q) => q.prog >= q.n && !q.claimed);
    if (ready && Math.floor(game.time * 3) % 2 === 0) hudText(ctx, '!', x, y - 40, '#ffd84a', 'center', 12);
    signText(ctx, '접수처', x, y + 18);
  }
}
// 토벌 게시판
class HuntBoard {
  constructor(x, y) { this.x = x; this.y = y; this.radius = 26; }
  label(game) { const G = game.guild(), done = G.active.filter((h) => h.done && !h.claimed).length; return `[E] 토벌 게시판${done ? `  (완료 ${done}개)` : ''}`; }
  get labelColor() { return '#ff9a6a'; }
  interact(game) { game.overlay = { type: 'hunt', msg: null }; }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 24, y - 30, 48, 30); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - 23, y - 29, 46, 28); ctx.fillStyle = '#4a3218'; ctx.fillRect(x - 20, y, 3, 8); ctx.fillRect(x + 17, y, 3, 8);
    const G = game.guild(); (G.offers || []).forEach((o, i) => { const px = x - 19 + (i % 2) * 20, py = y - 26 + Math.floor(i / 2) * 13; const taken = G.active.some((h) => h.id === o.id && h.day === G.day);
      ctx.fillStyle = taken ? '#a89880' : '#e8dcc0'; ctx.fillRect(px, py, 16, 11); ctx.fillStyle = o.kind === 'boss' ? '#c04040' : '#4a6a3a'; ctx.fillRect(px + 2, py + 2, 12, 2); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(px + 2, py + 6, 9, 1); ctx.fillRect(px + 2, py + 8, 11, 1); });
    signText(ctx, '토벌 의뢰', x, y + 14, '#ffb08a');
  }
}
// 거래상: 다음 탐험 보급품
class GuildTrader {
  constructor(x, y) { this.x = x; this.y = y; this.radius = 26; }
  label() { return '[E] 거래상 — 탐험 보급품'; }
  get labelColor() { return '#9fe89f'; }
  interact(game) { game.overlay = { type: 'trade', msg: null }; }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = '#8a3a3a'; ctx.fillRect(x - 26, y - 34, 52, 6); for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#e8dcc0' : '#8a3a3a'; ctx.fillRect(x - 26 + i * 9, y - 28, 9, 4); } // 차양
    ctx.fillStyle = '#4a3218'; ctx.fillRect(x - 25, y - 28, 2, 26); ctx.fillRect(x + 23, y - 28, 2, 26);
    npcDraw(ctx, 'trader', x, y - 12, 1, game);
    ctx.fillStyle = OUTLINE; ctx.fillRect(x - 24, y - 4, 48, 12); ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x - 23, y - 3, 46, 10);
    ctx.fillStyle = '#c84040'; ctx.fillRect(x - 18, y - 7, 5, 4); ctx.fillStyle = '#4a8ac8'; ctx.fillRect(x - 8, y - 7, 4, 4); ctx.fillStyle = '#ffd84a'; ctx.fillRect(x + 6, y - 6, 6, 3); // 물건들
    signText(ctx, '거래상', x, y + 16, '#b0f0b0');
  }
}
// 결정석 도박 탁자
class GambleTable {
  constructor(x, y) { this.x = x; this.y = y; this.radius = 26; }
  label() { return `[E] 결정석 도박`; }
  get labelColor() { return CUR.color; }
  interact(game) { game.overlay = { type: 'gamble', msg: null, roll: 0 }; }
  render(ctx, game) {
    const x = Math.round(this.x), y = Math.round(this.y);
    npcDraw(ctx, 'dealer', x, y - 14, -1, game);
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(x, y, 26, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a6a3a'; ctx.beginPath(); ctx.ellipse(x, y, 25, 9, 0, 0, TAU); ctx.fill(); // 초록 탁자
    ctx.fillStyle = '#7ad0ff'; for (let i = 0; i < 3; i++) { const a = game.time * 1.5 + i * 2.1; ctx.fillRect(Math.round(x + Math.cos(a) * 12) - 1, Math.round(y + Math.sin(a) * 4) - 2, 3, 3); } // 도는 결정석
    signText(ctx, '결정석 도박', x, y + 16, CUR.color);
  }
}
// 길드 사람들 (꾸밈 · 말 걸기)
class GuildNpc {
  constructor(x, y, key, line, face) { this.x = x; this.y = y; this.key = key; this.line = line; this.face = face; this.radius = 16; }
  label() { return `[E] ${this.line[0]}`; }
  get labelColor() { return '#e0d0b0'; }
  interact(game) { game.showBanner(this.line[0], this.line[1], '#e0d0b0'); }
  render(ctx, game) { npcDraw(ctx, this.key, Math.round(this.x), Math.round(this.y), this.face, game); }
}
