// 무기 × 버프/스킬 시너지 검증
// 각 무기를 허수아비 3마리에 대고 기본 / 공격력+20% / 공속+20% / 과부하 조건으로 DPS 측정
// 사용: node tools/synergy.js
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 512, height: 288 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?guest=1');
  await pg.waitForTimeout(300);
  const rows = await pg.evaluate(() => {
    const g = window.__game; g.render = () => {};
    const d0 = g.enemies[0], dummyDef = GAME_DATA.enemies.get('dummy_001');
    const measure = (def, setup) => {
      g.enemies = [d0];
      for (const [ox, oy] of [[0, -18], [0, 18]]) g.enemies.push(new Enemy(d0.x + ox, d0.y + oy, dummyDef, { hp: 1, dmg: 1 }, g.map.startRoom));
      const p = g.player = g.makePlayer(d0.x - (def.type === 'melee' ? 22 : 60), d0.y);
      p.weapons = [new WeaponInstance(def)]; p.slot = 0; p.stats.critChance = 0; // 치명타 변동 제거
      setup(p);
      g.projectiles = []; g.dpsLog = []; const t0 = g.time;
      for (let i = 0; i < 360; i++) {
        if (p.overdriveTest) p.overdrive = 1; else p.energy = 999;
        g.cam.x = 0; g.cam.y = 0; g.input.mouse.x = d0.x; g.input.mouse.y = d0.y;
        g.input.mouse.down = def.type === 'charge' ? !(p.weapon.charge >= def.chargeTime) : true;
        g.update(STEP);
      }
      g.input.mouse.down = false; for (let i = 0; i < 60; i++) g.update(STEP);
      const energyUsed = p.overdriveTest ? 999 - p.energy : 0;
      return { dps: g.dpsLog.filter((x) => x.t >= t0).reduce((s, x) => s + x.a, 0) / 6, energyUsed };
    };
    return DATA_WEAPONS.map((def) => {
      const base = measure(def, () => {});
      const atk = measure(def, (p) => { p.stats.attackBonus = 0.2; });
      const rate = measure(def, (p) => { p.stats.fireRateBonus = 0.2; });
      const od = measure(def, (p) => { p.overdriveTest = true; p.energy = 999; });
      return { name: def.name, type: def.type, base: base.dps, atk: atk.dps / base.dps, rate: rate.dps / base.dps, od: od.dps / base.dps, odEnergy: od.energyUsed };
    });
  });
  const flag = (v, lo, hi) => (v < lo || v > hi ? ' ◀' : '');
  console.log('무기'.padEnd(10), '종류'.padEnd(6), '기본DPS', '공격력+20%', '공속+20%', '과부하');
  for (const r of rows) {
    console.log(r.name.padEnd(10), r.type.padEnd(6), r.base.toFixed(0).padStart(6),
      ('x' + r.atk.toFixed(2) + flag(r.atk, 1.12, 1.3)).padStart(10), ('x' + r.rate.toFixed(2) + flag(r.rate, 1.1, 1.35)).padStart(10),
      ('x' + r.od.toFixed(2) + flag(r.od, 1.6, 2.3)).padStart(9), r.odEnergy > 0.01 ? ' 과부하 중 에너지 소모 ' + r.odEnergy.toFixed(1) : '');
  }
  console.log('errors', errs);
  await b.close();
})();
