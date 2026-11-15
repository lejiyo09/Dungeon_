// node sim2.js real <heroId> <runs>        실전형(파밍) 런
// node sim2.js weapon <weaponId> <runs>    무기 하나만 들고 1-1~2-3
const { chromium } = require('playwright');
const [,, mode, arg, runsArg] = process.argv;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 512, height: 288 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + (process.env.FILE || require('path').resolve(__dirname, '../index.html'))); await pg.waitForTimeout(300);
  const out = await pg.evaluate(async ({ mode, arg, runs }) => {
    const g = window.__game; g.render = () => {};
    const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3 };
    const res = [];
    for (let run = 0; run < runs; run++) {
      g.save.unlocked = DATA_HEROES.map(h => h.id); g.save.selected = mode === 'real' ? arg : 'hero_gunner'; g.save.loadout = null;
      g.startRun();
      let dmgTaken = 0, time = 0, rooms = 0, dead = false, death = null, strafe = 1, strafeT = 0, bought = [], weaponsSeen = [];
      const maxStage = mode === 'weapon' ? 2 * STAGES_PER_WORLD : DATA_WORLDS.length * STAGES_PER_WORLD;
      const origTake = Player.prototype.takeDamage;
      const setupPlayer = () => {
        const p = g.player;
        p.takeDamage = function (a) { const h0 = this.hp + this.shield; const r = origTake.call(this, a); if (r) dmgTaken += h0 - (this.hp + this.shield); return r; };
        if (mode === 'weapon') { p.weapons = [new WeaponInstance(GAME_DATA.weapons.get(arg))]; p.slot = 0; }
      };
      const weakestSlot = (p) => { let wi = 0; p.weapons.forEach((w, i) => { if (RANK[w.def.rarity] < RANK[p.weapons[wi].def.rarity]) wi = i; }); return wi; };
      const wantWeapon = (p, def) => p.weapons.length < 2 || RANK[def.rarity] > RANK[p.weapons[weakestSlot(p)].def.rarity];
      const loot = () => {
        if (mode !== 'real') return;
        const p = g.player;
        for (const c of g.props) if (c instanceof Chest && !c.open) c.interact(g);
        for (const pk of g.pickups) if (pk.alive && pk.kind === 'weapon' && wantWeapon(p, pk.def)) {
          if (p.weapons.length >= 2) p.slot = weakestSlot(p);
          g.pickWeapon(pk); weaponsSeen.push(pk.def.id);
        }
        for (const pk of g.pickups) if (pk.alive && pk.kind !== 'weapon') { g.collect(pk); pk.alive = false; }
        for (const it of g.props) if (it instanceof ShopItem && !it.sold && g.gold >= it.price) {
          if (it.kind === 'weapon' && wantWeapon(p, it.def)) { if (p.weapons.length >= 2) p.slot = weakestSlot(p); g.buy(it); bought.push(it.def.name); }
          else if (it.kind === 'hp' && p.hp < p.maxHp * 0.75) { g.buy(it); bought.push('hp'); }
          else if (it.kind === 'energy' && p.energy < p.maxEnergy * 0.4) { g.buy(it); bought.push('en'); }
        }
      };
      const chooseWeapon = (p) => { // 에너지 고려해 무기 선택
        let best = 0, bs = -1;
        p.weapons.forEach((w, i) => { const cost = w.def.type === 'beam' ? w.def.energyPerSec : (w.def.energyCost || 0);
          const ok = cost === 0 || p.energy > cost * 6; const sc = (ok ? 10 : 0) + RANK[w.def.rarity]; if (sc > bs) { bs = sc; best = i; } });
        p.slot = best;
      };
      for (let stage = 0; stage < maxStage && !dead; stage++) {
        setupPlayer(); loot();
        const p = g.player;
        const rs = g.map.rooms.filter(r => r.state === 'idle');
        for (const room of rs) {
          if (dead) break;
          const c = g.map.tileCenter(room.cx, room.cy);
          p.x = c.x; p.y = room.type === 'boss' ? c.y + 80 : c.y;
          if (g.map.isSolidAt(p.x, p.y)) p.y = (room.y0 + 1) * 16 + 8;
          let t = 0;
          while (room.state !== 'cleared' && t < 60 * 120) {
            if (g.cinematic) { g.update(STEP); t++; continue; }
            if (g.overlay) { if (g.overlay.type === 'buff') g.input.pressed.add('Digit' + (1 + Math.floor(Math.random() * 3))); else break; }
            const I = g.input; I.down.clear();
            if (mode === 'real' && t % 30 === 0) chooseWeapon(p);
            const en = g.enemies.filter(e => e.targetable);
            let tgt = null, best = 1e9;
            for (const e of en) { const d = Math.hypot(e.x - p.x, e.y - p.y) - (hasLineOfSight(p, e, g.map) ? 200 : 0); if (d < best) { best = d; tgt = e; } }
            g.cam.x = 0; g.cam.y = 0;
            let mx = 0, my = 0;
            const wdef = p.weapon.def;
            if (tgt) {
              I.mouse.x = tgt.x; I.mouse.y = tgt.y;
              I.mouse.down = wdef.type === 'charge' ? !(p.weapon.charge >= wdef.chargeTime) : true;
              const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1;
              const melee = wdef.type === 'melee', pref = melee ? Math.max(14, wdef.range - 8) + tgt.radius : Math.min(120, (wdef.range || 260) * 0.6);
              if (d > pref + 15) { mx = dx / d; my = dy / d; } else if (d < pref - 30) { mx = -dx / d; my = -dy / d; }
              strafeT -= STEP; if (strafeT <= 0) { strafe *= -1; strafeT = 1 + Math.random() * 1.5; }
              mx += -dy / d * strafe * 0.6; my += dx / d * strafe * 0.6;
              for (const e of en) if (e.state === 'TELEGRAPH') { const ex = p.x - e.x, ey = p.y - e.y, ed = Math.hypot(ex, ey) || 1; if (ed < 50 && (!melee || p.weapon.cooldown > 0.1)) { mx += ex / ed * 1.8; my += ey / ed * 1.8; } }
            } else I.mouse.down = false;
            let danger = 0;
            for (const bl of g.enemyBullets) {
              const rx = p.x - bl.x, ry = p.y - bl.y, rd = Math.hypot(rx, ry); if (rd > 70) continue;
              const v = Math.hypot(bl.vx, bl.vy) || 1, ux = bl.vx / v, uy = bl.vy / v, along = rx * ux + ry * uy; if (along < 0) continue;
              const perp = rx * -uy + ry * ux;
              if (Math.abs(perp) < 12) { const s = perp >= 0 ? 1 : -1; mx += -uy * s * 2; my += ux * s * 2; if (rd < 30) danger++; }
            }
            for (const hz of g.hazards) { const hx = p.x - hz.x, hy = p.y - hz.y, hd = Math.hypot(hx, hy) || 1; if (hd < hz.r + 10) { mx += hx / hd * 2; my += hy / hd * 2; } }
            const ml = Math.hypot(mx, my);
            if (ml > 0.2) { mx /= ml; my /= ml; if (mx < -0.38) I.down.add('KeyA'); if (mx > 0.38) I.down.add('KeyD'); if (my < -0.38) I.down.add('KeyW'); if (my > 0.38) I.down.add('KeyS'); }
            if (danger >= 1 && p.dashCooldown <= 0) I.pressed.add('Space');
            const near = en.filter(e => Math.hypot(e.x - p.x, e.y - p.y) < (p.hero.skill === 'whirlwind' ? 40 : p.hero.skill === 'frost_nova' ? 95 : 160)).length;
            if (p.skillCooldown <= 0 && (near >= 2 || (near >= 1 && en.some(e => e.def.boss)) || (p.hero.skill === 'whirlwind' && danger))) I.pressed.add('KeyF');
            g.update(STEP); t++; time += STEP;
            if (p.state === 'DEAD') { dead = true; death = { stage: g.stageIndex + 1, room: room.type, enemies: en.map(e => e.def.id.replace(/^(enemy|boss)_/, '').replace(/_00\d$/, '')) }; break; }
            if (t % 1200 === 0) await new Promise(r => setTimeout(r, 0));
          }
          g.input.mouse.down = false; g.input.down.clear();
          if (!dead && room.state === 'cleared') { rooms++; loot(); }
          if (!dead && room.state !== 'cleared') {
            for (const e of g.enemies) { e.alive = false; e.removed = true; } g.enemies = []; room.wavesLeft = 0; g.update(STEP);
          }
          if (g.overlay && g.overlay.type === 'buff') { g.input.pressed.add('Digit' + (1 + Math.floor(Math.random() * 3))); g.update(STEP); }
        }
        if (dead) break;
        loot();
        if (stage < maxStage - 1) { const po = g.portals[g.portals.length - 1]; if (!po) break; g.overlay = null; g.transition = null; po.onEnter(); }
      }
      res.push({ reached: dead ? g.stageIndex + 1 : maxStage + (mode === 'weapon' ? 0 : 1), dead, rooms, dmg: Math.round(dmgTaken), time: Math.round(time), gold: g.gold, death, bought, final: g.player.weapons.map(w => w.def.name) });
      g.overlay = null;
    }
    return res;
  }, { mode, arg, runs: +runsArg });
  console.log(JSON.stringify({ mode, arg, res: out }));
  if (errs.length) console.log('ERR', errs.slice(0, 3));
  await b.close();
})();
