// 직업 밸런스 측정: 직업 × 갈래 × 진화 단계마다 같은 무기·버프로 전투방(웨이브)과 보스를 봇으로 싸워 비교
//  단계별 필드: 기본 = 2필드, 1차 진화 = 5필드, 2차 진화 = 9필드 (무기 강화 포함, 보구 없음)
// 사용: node tools/jobs.js [횟수=2]   (ONLY=hero_mage 처럼 직업 하나만, RANKS=0,1,2)
const { chromium } = require('playwright');
const path = require('path');
const RUNS = +(process.argv[2] || 2);
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 512, height: 288 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?guest=1');
  await pg.waitForTimeout(300);
  await pg.addScriptTag({ path: path.resolve(__dirname, 'bot.js') });
  const out = await pg.evaluate(async ({ RUNS, ONLY, RANKS }) => {
    const g = window.__game; g.render = () => {};
    let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const LOAD = { 1: [['uncommon'], ['uncommon', 'rare']], 4: [['rare'], ['rare', 'epic']], 8: [['rare', 'epic'], ['epic']] };
    const WORLD = [1, 4, 8], res = [];
    let taken = 0; const origDP = Game.prototype.damagePlayer;
    Game.prototype.damagePlayer = function (a) { const p = this.player, h0 = p.hp + p.shield; const r = origDP.apply(this, arguments); if (r) taken += h0 - p.hp - p.shield; return r; };
    for (const hero of DATA_HEROES) {
      if (ONLY && hero.id !== ONLY) continue;
      for (const line of jobLines(hero.id)) for (const rank of RANKS) for (let run = 0; run < RUNS; run++) for (const test of ['wave', 'boss']) {
        const w = WORLD[rank];
        seed = 1000 + run * 7 + w * 131 + (test === 'boss' ? 17 : 0); // 같은 조건(무기·버프·맵)은 모든 직업이 공유
        const realRandom = Math.random; Math.random = rnd;
        g.save.unlocked = DATA_HEROES.map((h) => h.id); g.save.selected = hero.id; g.save.loadout = null;
        g.startRun(); g.overlay = null; g.worldIdx = w; g.levelIdx = test === 'boss' ? STAGES_PER_WORLD - 1 : 1; g.loadStage(); g.banner = null;
        const p = g.player, lv = Math.min(5, Math.floor(w / 2));
        g.applyVariant(line); g.setJob(p, line, rank);
        for (let k = 0; k < rank; k++) { p.maxHp += EVOLUTION.hp[k]; p.maxEnergy += EVOLUTION.energy[k]; }
        const pickS = (rar) => { const a = DATA_WEAPONS.filter((d) => rar.includes(d.rarity)); return a[Math.floor(rnd() * a.length)]; };
        p.weapons = LOAD[w].map((r) => new WeaponInstance(pickS(r), lv)); p.slot = 0;
        const bf = DATA_BUFFS.slice().sort(() => rnd() - 0.5).slice(0, w); for (const x of bf) x.apply(p);
        p.maxHp += 15 * w; p.hp = p.maxHp; p.energy = p.maxEnergy; p.shield = p.maxShield;
        let room;
        if (test === 'boss') room = g.map.roomOf('boss');
        else { room = g.map.rooms.filter((r) => r.type === 'combat').sort((a, c) => c.w * c.h - a.w * a.h)[0]; room.challenge = true; room.wavesLeft = BALANCE.specialRooms.challenge.waves; } // 도전방 조건(웨이브 3, 전원 정예)
        const c = g.map.tileCenter(room.cx, room.cy + (test === 'boss' ? 5 : 0)); p.x = c.x; p.y = c.y;
        if (overlapsSolid(p.x, p.y, 6, g.map)) { const c2 = g.map.tileCenter(room.cx, room.cy + 2); p.x = c2.x; p.y = c2.y; }
        Math.random = realRandom;
        taken = 0; const st = Bot.newState(); let t = 0, boss = null;
        while (t < 60 * 150) {
          if (g.overlay) { if (g.overlay.type === 'buff') g.overlay = null; else break; }
          Bot.step(g, st); t++;
          boss = boss || g.enemies.find((e) => e.def.boss);
          if (p.state === 'DEAD') break;
          if (test === 'boss' ? boss && !boss.alive : room.state === 'cleared') break;
          if (t % 1200 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        const won = test === 'boss' ? !!(boss && !boss.alive) : room.state === 'cleared';
        res.push({ hero: hero.id, line: line.id, name: line.ranks[rank], rank, test, won, died: p.state === 'DEAD', time: t / 60, taken: Math.round(taken), ehp: Math.round(p.maxHp + p.maxShield), bossLeft: boss ? Math.max(0, boss.hp / boss.maxHp) : 0 });
      }
    }
    return res;
  }, { RUNS, ONLY: process.env.ONLY || null, RANKS: (process.env.RANKS || '0,1,2').split(',').map(Number) });
  console.log(JSON.stringify(out));
  if (errs.length) console.error('ERR', errs.slice(0, 3));
  await b.close();
})();
