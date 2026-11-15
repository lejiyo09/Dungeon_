const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1024, height: 576 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message + '\n' + e.stack)); pg.on('console', m => m.type()==='error' && errs.push(m.text()));
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html') + '?guest=1'); await pg.waitForTimeout(400);
  // weapons on dummy
  const wres = await pg.evaluate(() => {
    const g = window.__game, p = g.player, d = g.enemies[0];
    const out = {};
    for (const def of DATA_WEAPONS) {
      p.weapons = [new WeaponInstance(def)]; p.slot = 0; p.energy = 9999; p.x = d.x - 24; p.y = d.y;
      g.dpsLog = []; const t0 = g.time;
      for (let i = 0; i < 180; i++) { g.cam.x = 0; g.cam.y = 0; g.input.mouse.x = d.x; g.input.mouse.y = d.y; g.input.mouse.down = (def.type === 'charge') ? (i % 60 < 50) : true; g.update(STEP); }
      g.input.mouse.down = false; for (let i = 0; i < 30; i++) g.update(STEP);
      out[def.id] = Math.round(g.dpsLog.filter(x => x.t >= t0).reduce((s, x) => s + x.a, 0) / 3.5);
    }
    // skills
    for (const h of DATA_HEROES) { g.save.unlocked.push(h.id); g.selectHero(h); g.player.skillCooldown = 0; g.input.pressed.add('KeyF'); g.update(STEP); for (let i=0;i<60;i++) g.update(STEP); }
    return { out, allies: g.allies.length };
  });
  console.log(JSON.stringify(wres));
  // full run
  const run = await pg.evaluate(async () => {
    const g = window.__game;
    g.selectHero(DATA_HEROES[1]);
    g.startRun();
    const log = [];
    for (let stage = 0; stage < DATA_WORLDS.length * STAGES_PER_WORLD; stage++) {
      const p = g.player; p.takeDamage = () => false; p.energy = 9999;
      p.weapons = [new WeaponInstance(GAME_DATA.weapons.get('weapon_rifle_001'))]; p.slot = 0; p.stats.attackBonus = 2;
      const label = `${g.worldIdx+1}-${g.levelIdx+1}`;
      const rooms = g.map.rooms.filter(r => r.state === 'idle');
      for (const room of rooms) {
        const c = g.map.tileCenter(room.cx, room.cy);
        p.x = c.x; p.y = room.type === 'boss' ? c.y + 80 : c.y;
        if (g.map.isSolidAt(p.x, p.y)) p.y = (room.y0 + 1) * 16 + 8;
        let t = 0;
        while (room.state !== 'cleared' && t < 60 * 120) {
          if (g.overlay && g.overlay.type === 'buff') { g.input.pressed.add('Digit1'); g.update(STEP); }
          if (g.cinematic || g.slowMo) { g.update(STEP); continue; }
          const vis = g.enemies.filter(e => e.targetable && hasLineOfSight(p, e, g.map)); const tgt = vis.find(e => !e.def.boss) || vis[0] || g.enemies.find(e => e.targetable);
          g.cam.x = 0; g.cam.y = 0;
          if (tgt) { g.input.mouse.x = tgt.x; g.input.mouse.y = tgt.y; g.input.mouse.down = true; }
          p.energy = 200; g.update(STEP); t++; if (t % 600 === 0 && tgt && room.state==='active') { const sp = g.findSpawnPoint(room, 0, tgt.x, tgt.y, 5); p.x = sp.x; p.y = sp.y; }
          if (t % 900 === 0) await new Promise(r => setTimeout(r, 0));
        }
        g.input.mouse.down = false;
        if (room.state !== 'cleared') log.push(label + ' STUCK ' + room.type + ' active=' + (g.activeRoom===room) + ' ov=' + (g.overlay&&g.overlay.type) + ' ' + room.type + ' ' + JSON.stringify(g.enemies.map(e=>[e.def.id,e.state])));
      }
      if (g.overlay && g.overlay.type === 'buff') { g.input.pressed.add('Digit1'); g.update(STEP); }
      log.push(label + ' ok rooms=' + rooms.length + ' kills=' + g.kills + ' gold=' + g.gold + ' buffs=' + g.player.buffs.join(','));
      const portal = g.portals[g.portals.length - 1];
      if (!portal) { log.push('no portal'); break; }
      p.x = portal.x; p.y = portal.y;
      // 포탈 진입: 화면 전환이 시작됐다가 끝날 때까지 (보스 처치 히트스톱 동안은 포탈 판정이 멈춤)
      let seen = false;
      for (let i = 0; i < 600; i++) { g.update(STEP); if (g.transition) seen = true; if ((seen && !g.transition) || (g.overlay && g.overlay.type === 'result' && !g.transition)) break;
        if (g.overlay && (g.overlay.type === 'story' || g.overlay.type === 'treasure_pick')) { // 기원의 성역 장면 → 보구 선택
          if (!log.includes('SANCTUM')) log.push('SANCTUM');
          for (let k = 0; k < 400 && g.overlay && g.overlay.type !== 'result'; k++) { if (g.overlay.type === 'treasure_pick' && DATA_TREASURES.length && !g.save.treasures.length) { g.pickTreasure(DATA_TREASURES[1]); log.push('PICK ' + g.save.treasures.join(',')); break; } if (k % 30 === 0) g.input.pressed.add('Enter'); g.update(STEP); }
          break; } }
      if (g.overlay && g.overlay.type === 'result') { log.push('RESULT victory=' + g.overlay.victory + ' reward=' + g.overlay.reward + ' stages=' + g.overlay.stages + ' bosses=' + g.overlay.bosses); break; }
    }
    for (let i = 0; i < 300 && !(g.overlay && g.overlay.type === 'result' && !g.transition); i++) g.update(STEP);
    g.input.pressed.add('Enter'); g.update(STEP); for (let i = 0; i < 300 && (g.transition || g.mode !== 'lobby'); i++) g.update(STEP);
    log.push('mode=' + g.mode + ' bank=' + g.save.bank + ' clears=' + g.save.clears);
    return log;
  });
  console.log(run.join('\n'));
  console.log('errors:', errs.slice(0,5));
  await b.close();
})();
