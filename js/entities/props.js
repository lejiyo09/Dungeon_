'use strict';
// ════════════════════════════════════════════
// 픽업 / 오브젝트
// ════════════════════════════════════════════
class Pickup {
  constructor(kind, x, y, o = {}) {
    this.kind = kind; this.x = x; this.y = y; this.half = 2; this.alive = true; this.t = Math.random() * 3;
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
  constructor(x, y, hero) { this.x = x; this.y = y; this.hero = hero; this.radius = 20; this.seed = Math.random() * 3; this.t = 0; }
  label(game) {
    const s = game.save;
    if (s.selected === this.hero.id) return null;
    if (s.unlocked.includes(this.hero.id)) return `[E] ${this.hero.name} 선택`;
    return `[E] 해금: ${this.hero.name} (${this.hero.price}골드)`;
  }
  get labelColor() { return '#ffffff'; }
  interact(game) { game.selectHero(this.hero); }
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
    hudText(ctx, this.hero.name, x, y - 28, selected ? '#ffd84a' : unlocked ? '#fff' : '#888', 'center', 8);
    if (!unlocked) hudText(ctx, `잠김 · ${this.hero.price}골드`, x, y + 11, '#ffd84a', 'center', 8);
    else if (selected) hudText(ctx, '선택됨', x, y + 11, '#ffd84a', 'center', 8);
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
