// 몬스터 밸런스 측정: 월드별 잡몹 종류마다 같은 종류 4마리를 한 방에 소환해 봇과 싸움
//  → 처치 시간(얼마나 단단한지)과 받은 피해(얼마나 위협적인지)를 같은 월드 안에서 비교
//  플레이어: 해당 월드 진행도에 맞는 무기·강화·버프·직업 진화 (검사·사수·마도사·기술자 순환)
// 사용: node tools/mobs.js [종류당 횟수=6]   (DEEP=2 심층 필드 수)
const { chromium } = require('playwright');
const path = require('path');
const RUNS = +(process.argv[2] || 6);
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 512, height: 288 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?guest=1');
  await pg.waitForTimeout(300);
  await pg.addScriptTag({ path: path.resolve(__dirname, 'bot.js') });
  const { res: out, NW } = await pg.evaluate(async ({ RUNS, DEEP }) => {
    const g = window.__game; g.render = () => {};
    let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const LOAD = [[['common', 'uncommon'], ['uncommon']], [['uncommon'], ['uncommon', 'rare']], [['uncommon', 'rare'], ['rare']], [['rare'], ['rare', 'epic']], [['rare', 'epic'], ['epic']], [['epic'], ['epic']]];
    const HEROES = ['hero_swordsman', 'hero_gunner', 'hero_mage', 'hero_engineer'];
    let taken = 0; const origDP = Game.prototype.damagePlayer;
    Game.prototype.damagePlayer = function () { const p = this.player, h0 = p.hp + p.shield; const r = origDP.apply(this, arguments); if (r) taken += h0 - p.hp - p.shield; return r; };
    const res = [];
    for (let w = 0; w < DATA_WORLDS.length + DEEP; w++) {
      g.save.unlocked = DATA_HEROES.map((h) => h.id); g.save.selected = HEROES[0]; g.startRun(); g.overlay = null; g.worldIdx = w; g.levelIdx = 1; g.loadStage();
      const pool = g.W.enemies.map((x) => x[0]);
      for (const id of pool) for (let run = 0; run < RUNS; run++) {
        seed = 500 + run * 31 + w * 7;
        const realRandom = Math.random; Math.random = rnd;
        g.save.selected = HEROES[run % HEROES.length]; g.save.loadout = null;
        g.startRun(); g.overlay = null; g.worldIdx = w; g.levelIdx = 1; g.loadStage(); g.banner = null;
        const p = g.player, lv = Math.min(5, Math.floor(w / 2)), rank = w >= 8 ? 2 : w >= 4 ? 1 : 0;
        const L = jobLines(p.hero.id)[0]; g.applyVariant(L); g.setJob(p, L, rank);
        for (let k = 0; k < rank; k++) { p.maxHp += EVOLUTION.hp[k]; p.maxEnergy += EVOLUTION.energy[k]; }
        const pickS = (rar) => { const a = DATA_WEAPONS.filter((d) => rar.includes(d.rarity)); return a[Math.floor(rnd() * a.length)]; };
        p.weapons = LOAD[Math.min(LOAD.length - 1, Math.floor(w / 2))].map((r) => new WeaponInstance(pickS(r), lv)); p.slot = 0;
        for (const x of DATA_BUFFS.slice().sort(() => rnd() - 0.5).slice(0, w)) x.apply(p);
        p.maxHp += 15 * w; p.hp = p.maxHp; p.energy = p.maxEnergy; p.shield = p.maxShield;
        const room = g.map.rooms.filter((r) => r.type === 'combat').sort((a, c) => c.w * c.h - a.w * a.h)[0];
        const c = g.map.tileCenter(room.cx, room.cy); p.x = c.x; p.y = c.y;
        if (overlapsSolid(p.x, p.y, 6, g.map)) { const c2 = g.map.tileCenter(room.cx, room.cy + 2); p.x = c2.x; p.y = c2.y; }
        room.state = 'active'; g.activeRoom = room; g.map.setDoors(room, true); room.wavesLeft = 0;
        let hpSum = 0;
        for (let i = 0; i < 4; i++) { const pt = g.findSpawnPoint(room, 72); const e = g.spawnEnemy(id, pt.x, pt.y, room); hpSum += e.maxHp; }
        Math.random = realRandom;
        taken = 0; const st = Bot.newState(); let t = 0;
        while (t < 60 * 90) {
          if (g.overlay) g.overlay = null;
          Bot.step(g, st); t++;
          if (p.state === 'DEAD' || !g.enemies.some((e) => e.alive && e.room === room && !e.def.dummy)) break;
          if (t % 1200 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        for (const e of g.enemies) { e.alive = false; } g.enemies = [];
        res.push({ w, id, name: g.data.enemies.get(id).name, t: t / 60, taken: taken / (p.maxHp + p.maxShield), died: p.state === 'DEAD', hp: hpSum / 4 });
      }
    }
    return { res, NW: DATA_WORLDS.length };
  }, { RUNS, DEEP: +(process.env.DEEP || 0) });
  const W = {};
  for (const r of out) { const k = r.w + '|' + r.id; (W[k] = W[k] || []).push(r); }
  const worlds = [...new Set(out.map((r) => r.w))];
  for (const w of worlds) {
    const keys = Object.keys(W).filter((k) => +k.split('|')[0] === w);
    const rows = keys.map((k) => { const a = W[k]; const av = (f) => a.reduce((s, x) => s + f(x), 0) / a.length; return { name: a[0].name, id: a[0].id, t: av((x) => x.t), taken: av((x) => x.taken), died: a.filter((x) => x.died).length / a.length, hp: av((x) => x.hp) }; });
    const mt = rows.reduce((s, r) => s + r.t, 0) / rows.length, md = rows.reduce((s, r) => s + r.taken, 0) / rows.length;
    console.log(`\n== ${w < NW ? (w + 1) + '필드' : '심층 ' + (w + 1 - NW)}  평균 처치 ${mt.toFixed(1)}초  평균 피해 ${(md * 100).toFixed(0)}%`);
    for (const r of rows) console.log(`  ${r.name.padEnd(10)} 처치 ${r.t.toFixed(1).padStart(5)}초 (${(r.t / mt * 100).toFixed(0).padStart(3)}%)  받은 피해 ${(r.taken * 100).toFixed(0).padStart(3)}% (${(r.taken / (md || 1) * 100).toFixed(0).padStart(3)}%)  사망 ${(r.died * 100).toFixed(0)}%  체력 ${r.hp.toFixed(0)}`);
  }
  if (process.env.JSON) require('fs').writeFileSync(process.env.JSON, JSON.stringify(out));
  if (errs.length) console.log('ERR', errs.slice(0, 3));
  await b.close();
})();
