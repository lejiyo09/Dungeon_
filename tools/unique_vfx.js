// 고유 스킨 VFX 검수: 판정 불변(같은 난수로 스킨 끔/켬 비교) · 31개 스킬 재생 · 지속 반복과 종료 · 공통 효과 · 장비 외형 · 정리 · 로딩 오류
//  node tools/unique_vfx.js
const { chromium } = require('playwright'); const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html') + '?guest=1';
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); c ? pass++ : fail++; };
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1024, height: 576 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(URL); await pg.waitForTimeout(800);
  await pg.evaluate(() => { // 공용 시험 도구
    const g = window.__game; g.loop.frame = () => {};
    window.__T = {
      seed(s) { let a = s >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
      SK: { hero_engineer: 'skin_u_unrecorded', hero_swordsman: 'skin_u_first_explorer', hero_druid: 'skin_u_primordial' },
      start(hero) { this.seed(7); g.save.skins = SKINS.map((k) => k.id); g.save.selected = hero; g.save.supplyStash = {}; g.save.treasureEquipped = null; g.selectHero(DATA_HEROES.find((h) => h.id === hero)); g.startRun(); g.overlay = null; g.cutscene = null; g.banner = null; g.cinematic = null;
        const p = g.player; this.home = { x: p.x, y: p.y }; },
      skin(on, hero) { g.save.skinOn = {}; if (on) { const K = SKINS.find((k) => k.id === this.SK[hero]); g.skinOnMap()[skinKey(K)] = K.id; } },
      reset() { this.seed(4321); g.player = g.makePlayer(this.home.x, this.home.y); const p = g.player; /* 매번 새 플레이어: 이전 시험의 충전·타이머가 남지 않게 */ g.allies = []; g.zones = []; g.projectiles = []; g.enemyBullets = []; g.pickups = []; g.enemies = []; g.hazards = []; g.corpses = []; g.effects.clear(); UVFX.clear(); g.hitStopT = 0; g.slowMo = null; g.shake = 0; g.cinematic = null;
        Object.assign(p, { x: this.home.x, y: this.home.y, hp: p.maxHp, shield: p.maxShield, state: 'IDLE', skillCooldown: 0, dsCharges: 3, transformT: 0, whirl: 0, swing: null, recoil: 0, time: 0, blinkInv: 0, dashInvuln: 0, moving: false, slot: 0 });
        p.aim = { x: 0.99, y: -0.12 }; g.input.down.clear(); g.input.pressed.clear(); g.input.mouse.down = false; g.input.mouse.x = 256 + 70; g.input.mouse.y = 144 - 10; g.cam.x = p.x - 256; g.cam.y = p.y - 144; g.time = 0; },
      foes() { const p = g.player, id = (DATA_ENEMIES || []).find((d) => !d.boss && !d.dummy && !d.master) ? DATA_ENEMIES.find((d) => !d.boss && !d.dummy && !d.master).id : 'enemy_slime_001';
        for (const [dx, dy] of [[40, -6], [70, 8], [100, -14], [55, 30], [-40, 0], [0, -45]]) { const e = g.spawnEnemy(id, p.x + dx, p.y + dy, g.map.startRoom); e.maxHp = e.hp = 1e7; e.damage = 0; e.state = 'IDLE'; e.stateTime = 0; } }, // 등장 연출 없이 바로 맞을 수 있게
      snapState() { const p = g.player; return JSON.stringify({ e: g.enemies.map((e) => [Math.round(e.hp * 1000), Math.round(e.x * 100), Math.round(e.y * 100), e.chainT ? Math.round(e.chainT * 100) : 0, e.statuses ? Object.keys(e.statuses).length : 0]), p: [Math.round(p.x * 100), Math.round(p.y * 100), Math.round(p.hp * 100), Math.round(p.skillCooldown * 1000), p.dsCharges, Math.round((p.transformT || 0) * 100)], n: [g.allies.length, g.zones.length, g.projectiles.length] }); },
      step(n) { for (let i = 0; i < n; i++) g.update(1 / 60); }
    };
  });

  // ── 1) 스킨이 맞는 영웅에만 연결 · 모든 진화 계열에서 유지
  const L = await pg.evaluate(() => { const g = window.__game, T = window.__T, out = {};
    for (const hero of ['hero_engineer', 'hero_swordsman', 'hero_druid']) { T.start(hero); T.skin(true, hero); const p = g.player, lines = jobLines(hero), r = [];
      for (const line of lines) for (let k = 0; k < 3; k++) { g.setJob(p, line, k); r.push(UVFX.themeOf(g, p)); }
      out[hero] = r; }
    // 다른 직업에 장착 기록이 있어도 적용 안 됨
    T.start('hero_mage'); g.save.skinOn = { hero_engineer: 'skin_u_unrecorded' }; out.mage = UVFX.themeOf(g, g.player);
    return out; });
  ok(L.hero_engineer.every((t) => t === 'unrecorded') && L.hero_engineer.length === 12, `미기록자 → 기술자 보로: 4계열 × 3단계 모두 적용 (${L.hero_engineer.length}개)`);
  ok(L.hero_swordsman.every((t) => t === 'first_explorer') && L.hero_swordsman.length === 9, `최초의 탐험가 → 검사 레온: 3계열 × 3단계 모두 적용 (${L.hero_swordsman.length}개)`);
  ok(L.hero_druid.every((t) => t === 'primordial') && L.hero_druid.length === 9, `시원체 → 드루이드 이반: 3계열 × 3단계 모두 적용 (${L.hero_druid.length}개)`);
  ok(L.mage === null, '다른 직업(마도사)에는 적용되지 않음');

  // ── 2) 스킬 31개: 판정 불변(끔 / 켬 / 다시 끔) + VFX 재생 · 지속 · 종료
  const S = await pg.evaluate(() => { const g = window.__game, T = window.__T, out = [];
    const list = { hero_engineer: [], hero_swordsman: [], hero_druid: [] };
    for (const hero of Object.keys(list)) for (const line of jobLines(hero)) for (let k = 0; k < 3; k++) list[hero].push([line, k, line.skills[k].id]);
    list.hero_swordsman.push([jobLines('hero_swordsman')[0], 2, 'spellblade']); // 혼합 직업 마검사
    for (const [hero, items] of Object.entries(list)) { T.start(hero);
      for (const [line, k, id] of items) {
        const run = (on, frames) => { T.reset(); T.skin(on, hero); g.setJob(g.player, line, k); g.player.skillId = id; T.seed(1234); T.foes(); g.useSkill(); const kinds = UVFX.list.map((I) => I.kind); T.step(frames); return { s: T.snapState(), kinds }; };
        run(false, 240); const a = run(false, 240), bOn = run(true, 240), c = run(false, 240); // 처음 한 번은 준비 운동 (첫 실행에만 생기는 초기화 제외)
        // VFX 수명: 켬 상태로 다시 돌려 시점별 개수
        T.reset(); T.skin(true, hero); g.setJob(g.player, line, k); g.player.skillId = id; T.seed(1234); T.foes(); g.useSkill();
        const t0 = UVFX.list.map((I) => I.kind); const act = () => UVFX.list.filter((I) => /^active:/.test(I.kind)).length;
        const actStart = act(); T.step(60); const act1 = act(); let ended = 0, maxN = 0;
        for (let i = 0; i < 60 * 28; i++) { g.update(1 / 60); maxN = Math.max(maxN, UVFX.list.length); if (UVFX.list.some((I) => /^end:/.test(I.kind))) ended = 1; }
        const stale = (I) => I.pending ? I.t > 8 : I.loop ? (I.follow ? I.follow.alive === false : I.life == null && !I.until) : I.t > I.frames * I.ms / 1000 + 0.1; // 수명이 지났는데 남은 것 = 누수
        const leftK = UVFX.list.filter(stale).map((I) => I.kind), left = leftK.length;
        out.push({ hero, id, same: a.s === bOn.s, harness: a.s === c.s, cast: t0.filter((x) => /^(skill:|wait:)/.test(x)).length, actStart, act1, ended, left, leftK: leftK.join(','), maxN, kinds: t0.join(',') });
      } }
    return out; });
  for (const r of S) ok(r.same && r.harness && r.cast > 0 && r.left === 0 && (r.actStart === 0 || (r.act1 > 0 && r.ended)),
    `${r.id.padEnd(12)} 판정 ${r.same ? '동일' : '불일치'}${r.harness ? '' : '(시험 재현 실패)'} · 시전 ${r.cast} · 지속 ${r.actStart ? `${r.actStart}개 → 1초 뒤 ${r.act1}개 · 종료 효과 ${r.ended ? '있음' : '없음'}` : '없음'} · 30초 뒤 수명 지난 효과 ${r.left}${r.left ? ' (' + r.leftK + ')' : ''}`);
  ok(S.length === 31, `스킬 VFX 연결 수: ${S.length} / 31`);

  // ── 3) 무기 191종 × 각 영웅: 기본 공격 판정 불변 + 무기 외형 피벗 일치
  const W = await pg.evaluate(() => { const g = window.__game, T = window.__T, out = { bad: [], unstable: [], n: 0, pivotBad: 0, newArt: 0, refreshed: 0 };
    for (const hero of ['hero_engineer', 'hero_swordsman', 'hero_druid']) { T.start(hero); let warm = true;
      for (const d of DATA_WEAPONS) { const run = (on) => { T.reset(); T.skin(on, hero); g.player.weapons = [new WeaponInstance(d)]; g.player.slot = 0; T.seed(99); T.foes(); g.input.mouse.down = true; T.step(50); g.input.mouse.down = false; T.step(20); return T.snapState(); };
        if (warm) { run(false); warm = false; } // 직업마다 첫 무기 전에 준비 운동 한 번
        let a = run(false), b2 = run(true), a2 = run(false); out.n++;
        if (a !== a2) { // 상자를 부수는 무기 등: 맵이 바뀌어 시험이 재현되지 않으면 매번 새 맵으로 다시 비교
          const fresh = (on) => { T.start(hero); return run(on); }; a = fresh(false); b2 = fresh(true); a2 = fresh(false); out.refreshed++; T.start(hero); warm = true; }
        if (a !== a2) out.unstable.push(hero + ':' + d.id); else if (a !== b2) out.bad.push(hero + ':' + d.id);
        const th = UVFX.themeOf(g, g.player) || T.SK[hero].replace('skin_u_', ''), s0 = weaponSprite(d), s1 = weaponSprite(d, th === 'first_explorer' ? 'first_explorer' : th);
        if (!WEAPON_SPRITE[d.id]) { out.newArt++; continue; } // 원래 전용 그림이 없던 23종: 팩이 새로 그린 실루엣 (원래는 기본 권총 그림)
        if ((s1.px - s0.px) * 2 !== s1.w - s0.w || (s1.py - s0.py) * 2 !== s1.h - s0.h) out.pivotBad++; } }
    return out; });
  ok(W.bad.length === 0 && W.unstable.length === 0, `무기 ${W.n}회(191종 × 3직업) 기본 공격: 판정 불일치 ${W.bad.length}` + (W.bad.length ? ' ' + W.bad.slice(0, 5).join(', ') : '') + (W.unstable.length ? ` · 시험 재현 실패 ${W.unstable.length} ` + W.unstable.slice(0, 3).join(', ') : '') + (W.refreshed ? ` · 새 맵으로 다시 비교 ${W.refreshed}` : ''));
  ok(W.pivotBad === 0, `테마 무기 외형: 손잡이(피벗) 위치 어긋남 ${W.pivotBad} (테두리 장식 여백만 늘어남) · 새 실루엣 ${W.newArt / 3}종`);

  // ── 4) 공통 효과: 발자국(이동 중에만 · 좌우 교대) · 대시 · 무기 · 피격 · 회복 · 사망 · 획득 · 사용 · 오라/대기
  const C = await pg.evaluate(() => { const g = window.__game, T = window.__T, out = {};
    T.start('hero_druid'); T.reset(); T.skin(true, 'hero_druid'); let p = g.player;
    const cnt = (k) => UVFX.list.filter((I) => I.kind === k).length;
    T.step(60); out.stillSteps = cnt('move');
    g.input.down.add('KeyD'); const xs = []; for (let i = 0; i < 90; i++) { const before = UVFX.list.filter((I) => I.kind === 'move').length; g.update(1 / 60); const ms = UVFX.list.filter((I) => I.kind === 'move'); if (ms.length > before) xs.push(Math.round(ms[ms.length - 1].y - p.y)); }
    g.input.down.clear(); out.walkSteps = xs.length; out.alternate = xs.length > 2 && xs.every((v, i) => i === 0 || v !== xs[i - 1]);
    UVFX.clear(); T.step(30); out.afterStop = cnt('move');
    T.reset(); T.skin(true, 'hero_druid'); T.step(10); UVFX.clear(); g.input.down.add('KeyD'); g.update(1 / 60); g.input.pressed.add('Space'); g.update(1 / 60); g.input.down.clear(); out.dash = cnt('dash'); T.step(30);
    p = g.player; UVFX.clear(); T.foes(); g.input.mouse.down = true; T.step(40); g.input.mouse.down = false; out.weapon = cnt('weapon');
    UVFX.clear(); p.hp -= 5; T.step(2); out.hit = cnt('hit');
    UVFX.clear(); T.step(30); p.hp = Math.min(p.maxHp, p.hp + 3); T.step(2); out.heal = cnt('heal');
    UVFX.clear(); g.collect({ kind: 'coin', value: 1, x: p.x, y: p.y }); out.pickup = cnt('pickup');
    UVFX.clear(); g.player.treasure = DATA_TREASURES[0]; g.player.treasureCd = 0; g.mode = 'dungeon'; try { g.useTreasure(); } catch (e) { out.treErr = e.message; } out.use = cnt('use');
    UVFX.clear(); p.hp = 0; p.state = 'DEAD'; T.step(2); out.death = cnt('death');
    for (let i = 0; i < 600; i++) g.update(1 / 60); out.leftAfter10s = UVFX.list.length;
    // 렌더 함수가 오라·대기를 그리는지
    p.state = 'IDLE'; p.hp = p.maxHp; g.overlay = null; let drew = 0; const orig = UVFX.draw; UVFX.draw = function (ctx, I) { if (I.row === 0 || I.row === 1) drew++; return orig.call(this, ctx, I); }; g.render(); UVFX.draw = orig; out.auraIdleDrawn = drew;
    // 가벼운 모드에서도 오류 없음
    if (typeof PERF !== 'undefined') { const o = PERF.low; PERF.low = true; T.step(30); g.render(); PERF.low = o; }
    return out; });
  ok(C.stillSteps === 0, `가만히 있으면 발자국 없음 (${C.stillSteps})`);
  ok(C.walkSteps >= 4 && C.alternate, `걸으면 발자국 ${C.walkSteps}개 · 좌우 번갈아 ${C.alternate ? '예' : '아니오'}`);
  ok(C.afterStop === 0, '멈추면 발자국이 더 생기지 않음');
  ok(C.dash > 0, `대시 효과 ${C.dash}개`);
  ok(C.weapon > 0, `기본 공격 무기 효과 ${C.weapon}개`);
  ok(C.hit > 0 && C.heal > 0 && C.death > 0, `피격 ${C.hit} · 회복 ${C.heal} · 사망 ${C.death}`);
  ok(C.pickup > 0 && C.use > 0, `아이템 획득 ${C.pickup} · 장비(보구) 사용 ${C.use}` + (C.treErr ? ' 오류: ' + C.treErr : ''));
  ok(C.leftAfter10s === 0, `10초 뒤 남은 공통 효과 ${C.leftAfter10s}`);
  ok(C.auraIdleDrawn >= 2, `오라·대기 반짝임 그리기 ${C.auraIdleDrawn}회`);

  // ── 5) 에셋 로딩
  const I = await pg.evaluate(async () => { for (const th of Object.keys(UVFX_THEMES)) UVFX.preload(th); await new Promise((r) => setTimeout(r, 800)); const all = Object.entries(UVFX.imgs); return { n: all.length, failed: all.filter(([, im]) => im.failed || !im.naturalWidth).map(([k]) => k) }; });
  ok(I.failed.length === 0 && I.n === 52, `에셋 ${I.n}개 로딩 · 실패 ${I.failed.length}` + (I.failed.length ? ' ' + I.failed.join(', ') : ''));
  ok(errs.length === 0, '페이지 오류 없음' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`\n결과: ${pass}개 통과 · ${fail}개 실패`); if (fail) process.exitCode = 1;
  await b.close();
})();
