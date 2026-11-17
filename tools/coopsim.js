// 협동 밸런스 측정: 한 페이지 안에서 방장 + 봇 동료(최대 3명)를 흉내 내어 1·2·3·4인으로 같은 필드의 전투방과 보스를 싸움
//  → 인원별 전투방 클리어 시간, 보스 처치 시간·승률, 1인당 받은 피해·쓰러짐 비교 (서버 없이, 실제 멀티 코드 경로 사용)
// 사용: node tools/coopsim.js [판 수=2]   (WORLDS=2,6,10 측정할 필드 번호, 10 이상은 심층)
const { chromium } = require('playwright');
const path = require('path');
const RUNS = +(process.argv[2] || 2), WORLDS = (process.env.WORLDS || '2,6,10').split(',').map(Number);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 512, height: 288 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?guest=1'); await pg.waitForTimeout(300);
  await pg.addScriptTag({ path: path.resolve(__dirname, 'bot.js') });
  const out = await pg.evaluate(async ({ RUNS, WORLDS }) => {
    const g = window.__game; g.render = () => {}; g.save.unlocked = DATA_HEROES.map((h) => h.id); g.save.prologueSeen = true;
    const HEROES = ['hero_swordsman', 'hero_gunner', 'hero_mage', 'hero_engineer'];
    const LOAD = [[['uncommon'], ['uncommon', 'rare']], [['rare'], ['rare', 'epic']], [['rare', 'epic'], ['epic']], [['epic'], ['epic']]];
    const pickW = (rar) => pick(DATA_WEAPONS.filter((d) => rar.includes(d.rarity) && !d.questOnly));
    const kit = (p, w) => { p.weapons = LOAD[Math.min(w, 3)].map((r) => new WeaponInstance(pickW(r), Math.min(5, Math.floor(w / 2)))); p.slot = 0;
      const L = jobLines(p.hero.id)[0]; if (L) g.withPlayer(p, () => g.setJob(p, L, w >= 9 ? 2 : w >= 4 ? 1 : 0)); for (const bf of shuffled(DATA_BUFFS).slice(0, Math.min(w, 8))) g.withPlayer(p, () => bf.apply(p));
      p.maxHp += 15 * w; p.hp = p.maxHp; p.energy = p.maxEnergy; };
    let taken = 0, downs = 0; const origDP = Game.prototype.damagePlayer;
    Game.prototype.damagePlayer = function (a) { const p = this.player, h0 = p.hp + p.shield, wasAlive = p.state !== 'DEAD'; const r = origDP.call(this, a); if (r) { taken += h0 - p.hp - p.shield; if (wasAlive && p.state === 'DEAD') downs++; } return r; };
    const setupParty = (n, w, run) => {
      g.mode = 'lobby'; g.overlay = null; g.coop = null; g.remotes = new Map(); g.save.selected = HEROES[run % 4];
      g.startRun(); if (g.overlay && g.overlay.onPick) g.overlay.onPick(g.overlay.lines[0]); g.overlay = null; g.cutscene = null; g.banner = null;
      if (n > 1) { g.coop = { host: true, me: g.player, aim: null, snapT: 1e9, nid: 0, fx: [], lastTiles: null }; g.remotes = new Map(); // 서버 없는 가짜 방 (보내기는 방에 없어 생략됨)
        for (let i = 1; i < n; i++) { g.coopAddRemote('bot' + i, { hero: HEROES[(run + i) % 4], jobLv: 0 }); } }
      for (const p of g.allPlayers()) { kit(p, w); p.st = Bot.newState(); }
    };
    const tick = () => { // 동료 봇: 그 사람 기준으로 입력을 만들어 방장 쪽 가상 입력에 넣음 (위치는 방장 계산)
      for (const R of (g.remotes || new Map()).values()) { if (R.p.state === 'DEAD') continue; const oi = g.input; g.withPlayer(R.p, () => { g.input = R.vin; Bot.think(g, R.p.st); }); g.input = oi; R.aim = { x: R.vin.mouse.x, y: R.vin.mouse.y }; R.rx = undefined; }
      Bot.step(g, g.player.st || (g.player.st = Bot.newState()));
    };
    const place = (room, dy = 0) => { const c = g.map.tileCenter(room.cx, room.cy); let i = 0; for (const p of g.allPlayers()) { p.x = c.x + (i % 2 ? 12 : -12) * Math.ceil(i / 2); p.y = c.y + dy; i++; } };
    const fight = async (room, limit) => { let t = 0; taken = 0; downs = 0; while (t < 60 * limit) { tick(); t++; if (g.overlay && g.overlay.type === 'buff') { g.input.pressed.add('Digit1'); } else if (g.overlay) break;
      if (room.state === 'cleared') break; if (g.allPlayers().every((p) => p.state === 'DEAD')) break; if (t % 1500 === 0) await new Promise((r) => setTimeout(r, 0)); } return { t: t / 60, cleared: room.state === 'cleared', taken, downs }; };
    const res = [];
    for (const w of WORLDS) for (const n of [1, 2, 3, 4]) for (let run = 0; run < RUNS; run++) {
      setupParty(n, w, run);
      g.worldIdx = w; g.levelIdx = 1; g.loadStage(); g.cutscene = null; g.banner = null; for (const p of g.allPlayers()) { p.hp = p.maxHp; p.state = 'NORMAL'; }
      const rooms = g.map.rooms.filter((r) => r.type === 'combat').slice(0, 2); const mob = [];
      for (const room of rooms) { if (g.allPlayers().every((p) => p.state === 'DEAD')) break; place(room); mob.push(await fight(room, 120)); g.overlay = null; }
      for (const p of g.allPlayers()) { p.state = 'NORMAL'; p.hp = p.maxHp; }
      g.worldIdx = w; g.levelIdx = STAGES_PER_WORLD - 1; g.loadStage(); g.cutscene = null; g.banner = null; g.overlay = null;
      const broom = g.map.roomOf('boss'); place(broom, 80); for (let i = 0; i < 600 && !g.enemies.some((e) => e.def.boss && e.targetable); i++) tick(); // 보스 등장 연출
      const bs = await fight(broom, 180), boss = g.enemies.find((e) => e.def.boss) || null;
      res.push({ w, n, mobT: mob.reduce((s, x) => s + x.t, 0) / Math.max(1, mob.length), mobTaken: mob.reduce((s, x) => s + x.taken, 0) / n, mobDowns: mob.reduce((s, x) => s + x.downs, 0) / n,
        bossT: bs.t, won: bs.cleared || !!(boss && !boss.alive) || !g.enemies.some((e) => e.def.boss && e.alive), bossTaken: bs.taken / n, bossDowns: bs.downs / n, bossHpLeft: boss && boss.alive ? boss.hp / boss.maxHp : 0, boss: boss ? boss.def.name : '' });
      g.overlay = null; g.coop = null; g.remotes = new Map();
    }
    return res;
  }, { RUNS, WORLDS });
  for (const w of WORLDS) {
    console.log(`\n== 필드 ${w + 1}${w >= 10 ? ' (심층 ' + (w - 9) + ')' : ''}  ${out.find((r) => r.w === w).boss}`);
    for (const n of [1, 2, 3, 4]) { const r = out.filter((x) => x.w === w && x.n === n), avg = (k) => r.reduce((s, x) => s + x[k], 0) / r.length;
      console.log(`  ${n}인  전투방 ${avg('mobT').toFixed(1)}초 · 1인당 피해 ${avg('mobTaken').toFixed(0)} · 쓰러짐 ${avg('mobDowns').toFixed(2)}   |  보스 승 ${r.filter((x) => x.won).length}/${r.length} · ${avg('bossT').toFixed(1)}초 · 1인당 피해 ${avg('bossTaken').toFixed(0)} · 쓰러짐 ${avg('bossDowns').toFixed(2)} · 남은 체력 ${(avg('bossHpLeft') * 100).toFixed(0)}%`); }
  }
  if (errs.length) console.log('ERR', [...new Set(errs)].slice(0, 3));
  await b.close();
})();
