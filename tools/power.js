// 무기 화력 측정: 허수아비 1마리(단일) / 3마리 밀집(범위) DPS → 등급별 비교
// 사용: node tools/power.js [--json]
const { chromium } = require('playwright');
const path = require('path');
const JSON_OUT = process.argv.includes('--json');

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 512, height: 288 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?guest=1');
  await pg.waitForTimeout(300);
  const rows = await pg.evaluate(() => {
    const g = window.__game; g.render = () => {};
    const d0 = g.enemies.find((e) => e.def.dummy), dummyDef = GAME_DATA.enemies.get('dummy_001');
    const measure = (def, multi) => {
      g.enemies = [d0];
      if (multi) for (const [ox, oy] of [[0, -18], [0, 18]]) g.enemies.push(new Enemy(d0.x + ox, d0.y + oy, dummyDef, { hp: 1, dmg: 1 }, g.map.startRoom));
      const p = g.player = g.makePlayer(d0.x - (def.type === 'melee' ? 22 : def.orbit ? 26 : 60), d0.y);
      p.weapons = [new WeaponInstance(def)]; p.slot = 0; p.stats.critChance = 0;
      g.projectiles = []; g.allies = []; g.zones = []; d0.markT = 0; g.dpsLog = []; const t0 = g.time;
      for (let i = 0; i < 420; i++) {
        p.energy = 999; g.cam.x = 0; g.cam.y = 0; g.input.mouse.x = d0.x; g.input.mouse.y = d0.y;
        g.input.mouse.down = def.type === 'charge' ? !(p.weapon.charge >= def.chargeTime) : true;
        g.update(STEP);
      }
      g.input.mouse.down = false; for (let i = 0; i < 60; i++) g.update(STEP);
      return g.dpsLog.filter((x) => x.t >= t0).reduce((s, x) => s + x.a, 0) / 7;
    };
    return DATA_WEAPONS.map((d) => ({ id: d.id, name: d.name, rarity: d.rarity, type: d.type,
      energyPerSec: d.type === 'beam' ? d.energyPerSec : (d.energyCost || 0) * (d.fireRate || 1), single: measure(d, false), multi: measure(d, true) }));
  });
  // 화력 지수: 단일 대상 60% + 범위(3마리 기준 1인당 환산 아님, 총합의 0.4/1.8) 40%
  for (const r of rows) r.power = 0.6 * r.single + 0.4 * r.multi / 1.8;
  if (JSON_OUT) { console.log(JSON.stringify(rows)); await b.close(); return; }
  const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  for (const rar of order) {
    const rs = rows.filter((r) => r.rarity === rar).sort((a, b) => b.power - a.power);
    const avg = rs.reduce((s, r) => s + r.power, 0) / rs.length;
    console.log(`\n== ${rar}  평균 화력 ${avg.toFixed(0)}  (최소 ${rs[rs.length - 1].power.toFixed(0)} ~ 최대 ${rs[0].power.toFixed(0)})`);
    for (const r of rs) console.log(`  ${r.name.padEnd(9)} ${r.type.padEnd(6)} 화력 ${r.power.toFixed(0).padStart(4)}  단일 ${r.single.toFixed(0).padStart(4)}  범위 ${r.multi.toFixed(0).padStart(4)}  에너지/초 ${r.energyPerSec.toFixed(1)}`);
  }
  if (errs.length) console.log('ERR', errs.slice(0, 3));
  await b.close();
})();
