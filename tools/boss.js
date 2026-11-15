// 보스전 측정: 보스별 처치 시간, 사망률, 패턴별 받은 피해
// 해당 월드 진행도에 맞는 무기 2개와 버프를 들고 보스방에서 시작
// 사용: node tools/boss.js [보스당 횟수=8]
const { chromium } = require('playwright');
const path = require('path');
const RUNS = +(process.argv[2] || 8);

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 512, height: 288 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + (process.env.FILE || path.resolve(__dirname, '../index.html')));
  await pg.waitForTimeout(300);
  await pg.addScriptTag({ path: path.resolve(__dirname, 'bot.js') });
  const out = await pg.evaluate(async (RUNS) => {
    const g = window.__game; g.render = () => {};
    // 피해 출처 추적
    let cur = null, src = null;
    const origUpdateEnemy = window.updateEnemy;
    window.updateEnemy = (e, dt, w) => { cur = e.def.boss ? (e.pat ? e.pat.type : 'contact') + (e.enraged ? '*' : '') : '졸개'; origUpdateEnemy(e, dt, w); cur = null; };
    const origShoot = Game.prototype.enemyShoot;
    Game.prototype.enemyShoot = function (...a) { origShoot.apply(this, a); this.enemyBullets[this.enemyBullets.length - 1].tag = cur; };
    const origBullet = EnemyBullet.prototype.update;
    EnemyBullet.prototype.update = function (dt, w) { src = this.tag || '탄'; origBullet.call(this, dt, w); src = null; };
    const origHz = Hazard.prototype.update;
    Hazard.prototype.update = function (dt, w) { src = 'zones'; origHz.call(this, dt, w); src = null; };
    let ledger = null;
    const origDP = Game.prototype.damagePlayer;
    Game.prototype.damagePlayer = function (a) { const p = this.player, h0 = p.hp + p.shield; const r = origDP.call(this, a); if (r && ledger) { const k = src || cur || '기타'; ledger[k] = (ledger[k] || 0) + (h0 - p.hp - p.shield); } return r; };

    const pickW = (rar) => pick(DATA_WEAPONS.filter((d) => rar.includes(d.rarity)));
    const LOAD = [[['uncommon'], ['uncommon', 'rare']], [['rare'], ['rare', 'epic']], [['rare', 'epic'], ['epic']]];
    const res = [];
    for (let w = 0; w < 3; w++) for (let run = 0; run < RUNS; run++) {
      g.save.unlocked = DATA_HEROES.map((h) => h.id); g.save.selected = DATA_HEROES[run % 4].id; g.save.loadout = null;
      g.startRun(); g.worldIdx = w; g.levelIdx = 2; g.loadStage(); g.banner = null;
      const p = g.player;
      p.weapons = LOAD[w].map((r) => new WeaponInstance(pickW(r))); p.slot = 0;
      for (const bf of shuffled(DATA_BUFFS).slice(0, w)) bf.apply(p);
      const room = g.map.roomOf('boss'), c = g.map.tileCenter(room.cx, room.cy + 5);
      p.x = c.x; p.y = c.y;
      ledger = {};
      const st = Bot.newState(); let t = 0, boss = null, enrageAt = null;
      while (t < 60 * 180) {
        if (g.overlay) break;
        Bot.step(g, st); t++;
        boss = boss || g.enemies.find((e) => e.def.boss);
        if (boss && boss.enraged && enrageAt === null) enrageAt = t / 60;
        if (p.state === 'DEAD' || (boss && !boss.alive)) break;
        if (t % 1200 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      res.push({ boss: boss ? boss.def.name : '?', world: w, hero: p.hero.name, won: !!(boss && !boss.alive), died: p.state === 'DEAD',
        time: t / 60, enrageAt, bossHpLeft: boss ? Math.max(0, boss.hp / boss.maxHp) : 1, ledger, weapons: p.weapons.map((x) => x.def.name).join('+') });
      g.overlay = null;
    }
    return res;
  }, RUNS);
  for (let w = 0; w < 3; w++) {
    const r = out.filter((x) => x.world === w); if (!r.length) continue;
    const won = r.filter((x) => x.won), died = r.filter((x) => x.died);
    const led = {}; let tot = 0;
    for (const x of r) for (const [k, v] of Object.entries(x.ledger)) { led[k] = (led[k] || 0) + v; tot += v; }
    const avg = (a, f) => (a.length ? (a.reduce((s, x) => s + f(x), 0) / a.length).toFixed(1) : '-');
    console.log(`\n[${r[0].boss}] 승리 ${won.length}/${r.length}  사망 ${died.length}  처치시간(승리) ${avg(won, (x) => x.time)}초  격노진입 ${avg(r.filter((x) => x.enrageAt), (x) => x.enrageAt)}초  패배 시 남은 보스체력 ${avg(died, (x) => x.bossHpLeft * 100)}%`);
    console.log('  받은 피해 비중: ' + Object.entries(led).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / tot * 100).toFixed(0)}%`).join(' · ') + `  (판당 ${(tot / r.length).toFixed(0)})`);
  }
  if (errs.length) console.log('ERR', errs.slice(0, 3));
  await b.close();
})();
