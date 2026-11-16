// 원소 반응 측정: 필드 깊이별로 적 5마리 무리의 가운데 적에게 상태이상 두 개를 걸어 반응을 일으키고
//  반응이 준 총 피해(주변 포함)를 가운데 적 최대 체력 대비 %로 비교. 역병·마비처럼 피해 말고 효과가 있는 반응은 효과도 표시
// 사용: node tools/reactions.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?guest=1'); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const g = window.__game; g.render = () => {};
    const PAIRS = { thermal: ['burn', 'freeze'], toxic: ['burn', 'poison'], electro: ['freeze', 'shock'], overload: ['burn', 'shock'], paralyze: ['poison', 'shock'], eclipse: ['blind', 'curse'], plague: ['curse', 'poison'], hellfire: ['burn', 'curse'], judgment: ['blind', 'shock'] };
    const res = {};
    for (const w of [1, 4, 8, 11]) {
      g.startRun(); g.overlay = null; g.worldIdx = w; g.levelIdx = 1; g.loadStage(); g.banner = null;
      const p = g.player; p.takeDamage = () => false;
      const room = g.map.rooms.filter((r) => r.type === 'combat').sort((a, c) => c.w * c.h - a.w * a.h)[0], c = g.map.tileCenter(room.cx, room.cy);
      const id = g.W.enemies[0][0];
      for (const [name, [a, bb]] of Object.entries(PAIRS)) {
        g.enemies = []; g.zones = []; g.projectiles = [];
        p.x = c.x - 120; p.y = c.y;
        const pack = [[0, 0], [24, 0], [-24, 0], [0, 22], [0, -22]].map(([ox, oy]) => { const e = g.spawnEnemy(id, c.x + ox, c.y + oy, room); e.state = 'CHASE'; e.maxHp = e.hp = 1e6; return e; });
        const mid = pack[0], realHp = Math.round(g.data.enemies.get(id).health * g.scale.hp);
        const st = (t) => ({ type: t, chance: 1, duration: 4, dps: 0, slow: 0.5 });
        mid.applyStatus(st(a), p.mods); // 첫 상태 (피해 없이)
        const hp0 = pack.reduce((s, e) => s + e.hp, 0); let fired = null;
        const orig = g.triggerReaction.bind(g); g.triggerReaction = (e, t, m) => { fired = t; orig(e, t, m); };
        const r = mid.applyStatus(st(bb), p.mods); if (r) g.triggerReaction(mid, r, p.mods);
        g.triggerReaction = orig;
        for (let i = 0; i < 60; i++) { for (const e of pack) { e.x = c.x + (e === mid ? 0 : e.x - c.x); } g.update(STEP); }
        const dealt = hp0 - pack.reduce((s, e) => s + e.hp, 0);
        const extra = name === 'plague' ? pack.slice(1).filter((e) => e.poison > 0).length + '명 전염' : name === 'paralyze' ? `정지 ${mid.slow.toFixed(1)}초 남음` : name === 'judgment' || name === 'eclipse' ? '' : '';
        (res[name] = res[name] || []).push({ w, fired, pct: dealt / realHp * 100, dealt: Math.round(dealt), realHp, extra });
      }
    }
    return res;
  });
  for (const [k, rows] of Object.entries(out)) console.log(k.padEnd(9), rows.map((r) => `${r.w + 1}필드 ${r.fired === k ? '' : '(안 터짐!) '}피해 ${r.dealt} = 적 체력의 ${r.pct.toFixed(0)}% ${r.extra}`).join('  |  '));
  if (errs.length) console.log('ERR', errs.slice(0, 3));
  await b.close();
})();
