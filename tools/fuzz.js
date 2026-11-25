// 무작위 입력 퍼징 + 매 프레임 불변식 검사
// 사용: node tools/fuzz.js [분(게임 시간), 기본 20] [시드 없음: 매번 다름]
// 결과: 불변식 위반/에러 종류별 횟수와 첫 발생 상황
const { chromium } = require('playwright');
const path = require('path');
const MINUTES = +(process.argv[2] || 20);

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 512, height: 288 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?guest=1');
  await pg.waitForTimeout(300);
  const out = await pg.evaluate(async (MINUTES) => {
    const g = window.__game; g.render = () => {};
    const issues = {};
    const report = (key, info) => { if (!issues[key]) issues[key] = { count: 0, first: info }; issues[key].count++; };
    const I = g.input, KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    let keyT = 0, roomT = 0, runs = 0, deaths = 0, clears = 0, frames = 0, stuckT = 0;
    const where = () => `${g.mode} ${g.worldIdx + 1}-${g.levelIdx + 1} room=${g.activeRoom ? g.activeRoom.type : '-'}`;
    g.save.unlocked = DATA_HEROES.map((h) => h.id);
    const newRun = () => {
      g.save.selected = pick(DATA_HEROES).id; g.overlay = null; g.transition = null;
      g.startRun(); runs++; giveRandom();
    };
    const giveRandom = () => {
      const p = g.player;
      p.weapons = [new WeaponInstance(pick(DATA_WEAPONS)), new WeaponInstance(pick(DATA_WEAPONS))]; p.slot = 0;
    };
    newRun();
    const total = MINUTES * 60 * 60;
    for (frames = 0; frames < total; frames++) {
      const p = g.player;
      // ── 오버레이 처리
      if (g.overlay) {
        if (g.overlay.type === 'buff') I.pressed.add('Digit' + randInt(1, 3));
        else if (g.overlay.type === 'result') { if (g.overlay.victory) clears++; I.pressed.add('Enter'); }
        else if (g.overlay.type === 'pause') I.pressed.add('Escape');
        else I.pressed.add('Escape');
      }
      if (g.mode === 'lobby' && !g.transition && !g.overlay) {
        // 로비에서도 잠깐 놀다가 출발
        if (Math.random() < 0.002) { g.overlay = { type: pick(['codex', 'armory']), msg: null }; }
        if (frames % 600 === 300) newRun();
      }
      // ── 무작위 입력
      keyT -= 1;
      if (keyT <= 0) {
        I.down.clear(); for (const k of KEYS) if (Math.random() < 0.35) I.down.add(k);
        keyT = randInt(10, 50);
      }
      const tg = g.enemies.filter((e) => e.targetable);
      const t = tg.length && Math.random() < 0.85 ? pick(tg) : null;
      if (frames % 6 === 0) {
        const tx = t ? t.x : p.x + randInt(-200, 200), ty = t ? t.y : p.y + randInt(-120, 120);
        I.mouse.x = tx - Math.round(g.cam.x); I.mouse.y = ty - Math.round(g.cam.y);
      }
      I.mouse.down = Math.random() < 0.8 ? (I.mouse.down || Math.random() < 0.3) : false;
      if (Math.random() < 0.01) I.pressed.add('Space');
      if (Math.random() < 0.004) I.pressed.add('KeyF');
      if (Math.random() < 0.004) I.pressed.add('KeyQ');
      if (Math.random() < 0.01) I.pressed.add('KeyE');
      if (Math.random() < 0.0003) I.pressed.add('Escape');
      // ── 방 이동 (무작위로 다음 방으로 순간이동)
      roomT--;
      if (g.mode === 'dungeon' && !g.activeRoom && !g.overlay && !g.transition && roomT <= 0) {
        roomT = randInt(120, 600);
        const idle = g.map.rooms.filter((r) => r.state === 'idle');
        if (idle.length) {
          const r = pick(idle), c = g.map.tileCenter(r.cx, r.cy);
          const sp = g.findSpawnPoint(r, 0, c.x, c.y, p.half);
          p.x = sp.x; p.y = sp.y;
        } else if (g.portals.length) {
          const po = g.portals[g.portals.length - 1]; p.x = po.x; p.y = po.y; giveRandom();
        }
      }
      const wasDead = p.state === 'DEAD';
      try { g.update(STEP); } catch (e) { report('EXCEPTION ' + e.message, where() + ' ' + (e.stack || '').split('\n')[1]); g.overlay = null; newRun(); continue; }
      const P = g.player;
      if (!wasDead && P.state === 'DEAD') deaths++;
      // ── 불변식
      if (!Number.isFinite(P.x) || !Number.isFinite(P.y)) report('player NaN position', where());
      if (P.state !== 'DEAD' && overlapsSolid(P.x, P.y, P.half, g.map)) report('player inside wall', where() + ` (${P.x.toFixed(1)},${P.y.toFixed(1)})`);
      if (!(P.hp >= 0 && P.hp <= P.maxHp + 1e-6)) report('hp out of range', where() + ' hp=' + P.hp + '/' + P.maxHp);
      if (!(P.energy >= -1e-6 && P.energy <= P.maxEnergy + 1e-6)) report('energy out of range', where() + ' e=' + P.energy);
      if (!(P.shield >= -1e-6 && P.shield <= P.maxShield + 1e-6)) report('shield out of range', where() + ' s=' + P.shield);
      for (const e of g.enemies) {
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.hp)) report('enemy NaN', where() + ' ' + e.def.id);
        if (e.alive && e.state !== 'SPAWN' && !(e.def.boss && e.jumpH > 0) && overlapsSolid(e.x, e.y, e.half - 0.5, g.map))
          report('enemy inside wall: ' + e.def.id + ' state=' + e.state, where());
      }
      for (const pk of g.pickups) {
        if (!Number.isFinite(pk.x) || !Number.isFinite(pk.y)) report('pickup NaN', where() + ' ' + pk.kind);
        else if (overlapsSolid(pk.x, pk.y, 1, g.map)) report('pickup inside wall: ' + pk.kind, where());
      }
      for (const pr of g.props) if (pr.radius && !(pr instanceof GuildTable || pr instanceof MerlinTable) && g.map.isSolidAt(pr.x, pr.y)) /* 길드 탁자는 일부러 막힌 칸(T_COVER) 위에 놓음 */ report('prop inside wall: ' + pr.constructor.name, where());
      if (g.projectiles.length > 1500) report('projectile leak', where() + ' n=' + g.projectiles.length);
      if (g.enemyBullets.length > 1500) report('enemy bullet leak', where() + ' n=' + g.enemyBullets.length);
      if (g.effects.list.length > 4000) report('effect leak', where() + ' n=' + g.effects.list.length);
      // 방이 활성인데 살아있는 적이 없고 진행도 없음 → 잠김
      if (g.activeRoom && !g.enemies.some((e) => e.alive) && !g.overlay && !g.transition && !g.slowMo && !g.cinematic && g.hitStopT <= 0) { stuckT++; if (stuckT > 120) report('room locked with no enemies', where()); }
      else stuckT = 0;
      if (g.activeRoom && P.state !== 'DEAD' && g.map.roomAtPoint(P.x, P.y) !== g.activeRoom) report('player outside active room', where());
      if (g.activeRoom && g.enemies.some((e) => e.alive)) {
        const r = g.activeRoom;
        for (const e of g.enemies) if (e.alive && !e.def.dummy && g.map.roomAtPoint(e.x, e.y) !== r && !(e.def.boss && e.jumpH > 0)) report('enemy outside active room: ' + e.def.id, where());
      }
      if (frames % 3000 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    return { issues, runs, deaths, clears, minutes: MINUTES };
  }, MINUTES);
  console.log(JSON.stringify(out, null, 1));
  console.log('pageerrors', errs.slice(0, 10));
  await b.close();
})();
