// 페이지에 주입해서 쓰는 전투 봇 (window.Bot)
// 거리 유지, 탄/장판 회피, 대시, 스킬, 에너지에 따른 무기 선택을 흉내냄
// 사용: await page.addScriptTag({ path: 'tools/bot.js' }); 이후 page.evaluate 안에서 Bot.step(game, state)
window.Bot = {
  RANK: { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 },
  newState() { return { strafe: 1, strafeT: 0, t: 0 }; },
  chooseWeapon(p) {
    let best = 0, bs = -1;
    p.weapons.forEach((w, i) => {
      const cost = w.def.type === 'beam' ? w.def.energyPerSec : (w.def.energyCost || 0);
      const sc = (cost === 0 || p.energy > cost * 6 ? 10 : 0) + this.RANK[w.def.rarity];
      if (sc > bs) { bs = sc; best = i; }
    });
    p.slot = best;
  },
  // 한 프레임 입력을 만들고 game.update까지 호출
  step(g, st) { this.think(g, st); g.update(STEP); },
  // 입력만 만듦 (g.player·g.input 기준) — 멀티 시뮬레이션에서 여러 캐릭터를 움직일 때
  think(g, st) {
    const p = g.player, I = g.input;
    I.down.clear();
    if (st.t++ % 30 === 0) this.chooseWeapon(p);
    const en = g.enemies.filter((e) => e.targetable);
    let tgt = null, best = 1e9;
    for (const e of en) { const d = Math.hypot(e.x - p.x, e.y - p.y) - (hasLineOfSight(p, e, g.map) ? 200 : 0); if (d < best) { best = d; tgt = e; } }
    g.cam.x = 0; g.cam.y = 0;
    let mx = 0, my = 0;
    const wdef = p.weapon.def;
    if (tgt) {
      I.mouse.x = tgt.x; I.mouse.y = tgt.y;
      I.mouse.down = wdef.type === 'charge' ? !(p.weapon.charge >= wdef.chargeTime) : true;
      const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1;
      const melee = wdef.type === 'melee';
      const pref = melee ? Math.max(14, wdef.range - 8) + tgt.radius : Math.min(120, (wdef.range || 260) * 0.6);
      if (d > pref + 15) { mx = dx / d; my = dy / d; } else if (d < pref - 30) { mx = -dx / d; my = -dy / d; }
      st.strafeT -= STEP; if (st.strafeT <= 0) { st.strafe *= -1; st.strafeT = 1 + Math.random() * 1.5; }
      mx += -dy / d * st.strafe * 0.6; my += dx / d * st.strafe * 0.6;
      for (const e of en) if (e.state === 'TELEGRAPH') {
        const ex = p.x - e.x, ey = p.y - e.y, ed = Math.hypot(ex, ey) || 1;
        if (ed < (e.def.boss ? 80 : 50) && (!melee || p.weapon.cooldown > 0.1)) { mx += ex / ed * 1.8; my += ey / ed * 1.8; }
        if (e.def.boss && e.pat && e.pat.type === 'slam' && e.pd.tx !== undefined) { const sx = p.x - e.pd.tx, sy = p.y - e.pd.ty, sd = Math.hypot(sx, sy) || 1; if (sd < 60) { mx += sx / sd * 2.5; my += sy / sd * 2.5; } }
      }
    } else I.mouse.down = false;
    let danger = 0;
    for (const bl of g.enemyBullets) {
      const rx = p.x - bl.x, ry = p.y - bl.y, rd = Math.hypot(rx, ry); if (rd > 70) continue;
      const v = Math.hypot(bl.vx, bl.vy) || 1, ux = bl.vx / v, uy = bl.vy / v;
      if (rx * ux + ry * uy < 0) continue;
      const perp = rx * -uy + ry * ux;
      if (Math.abs(perp) < 12) { const s = perp >= 0 ? 1 : -1; mx += -uy * s * 2; my += ux * s * 2; if (rd < 30) danger++; }
    }
    for (const hz of g.hazards) { const hx = p.x - hz.x, hy = p.y - hz.y, hd = Math.hypot(hx, hy) || 1; if (hd < hz.r + 10) { mx += hx / hd * 2; my += hy / hd * 2; if (hz.t > hz.delay * 0.7) danger++; } }
    const ml = Math.hypot(mx, my);
    if (ml > 0.2) { mx /= ml; my /= ml; if (mx < -0.38) I.down.add('KeyA'); if (mx > 0.38) I.down.add('KeyD'); if (my < -0.38) I.down.add('KeyW'); if (my > 0.38) I.down.add('KeyS'); }
    if (danger >= 1 && p.dashCooldown <= 0) I.pressed.add('Space');
    const sk = p.skillId || p.hero.skill; // 직업 스킬: 자기 주변형은 가까이 있을 때, 나머지는 조준형
    const R = /^whirlwind|spellblade/.test(sk) ? 40 : ['frost_nova', 'flamestorm', 'thorns', 'radiance', 'quake', 'descent', 'execution', 'bloodstorm', 'voidcollapse', 'worldtree', 'plaguecloud', 'bladeorbit', 'bladestorm', 'shout', 'shout2', 'earthshatter', 'ancientroot', 'barrier', 'barrier2', 'fortress', 'bless', 'bless2', 'miracle', 'bloodpact', 'bloodpact2', 'bloodmoon', 'bearform', 'bearform2', 'primal', 'thornburst'].includes(sk) ? 95 : 160;
    const near = en.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < R).length;
    if ((p.skillId === 'deathsentry' ? (p.dsCharges == null || p.dsCharges > 0) && !(p.dsGap > 0) : p.skillCooldown <= 0) && (near >= 2 || (near >= 1 && en.some((e) => e.def.boss)) || (/^whirlwind|spellblade/.test(sk) && danger))) I.pressed.add('KeyF');
  }
};
