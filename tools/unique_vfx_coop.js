// 고유 스킨 VFX 멀티 검수: 로컬 서버(server/server.js)에 방장·참가자 두 브라우저로 접속해 참가자 화면에 스킬 VFX가 오는지 확인
//  사용: (cd server && PORT=8090 node server.js) 를 띄운 뒤  node tools/unique_vfx_coop.js
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8090/index.html?guest=1';
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); c ? pass++ : fail++; };
const wait = (pg, fn, ms = 8000, arg) => pg.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (hero, sid, name) => { const ctx = await b.newContext({ viewport: { width: 1024, height: 576 } }); const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(name + ': ' + e.message));
    await pg.goto(BASE); await pg.waitForTimeout(800);
    await pg.evaluate(({ hero, sid }) => { const g = window.__game; g.save.skins = SKINS.map((k) => k.id); g.save.unlocked = DATA_HEROES.map((h) => h.id); g.save.prologueSeen = true; g.save.selected = hero; g.selectHero(DATA_HEROES.find((h) => h.id === hero));
      g.save.skinOn = {}; const K = SKINS.find((k) => k.id === sid); g.skinOnMap()[skinKey(K)] = K.id; for (const th of Object.keys(UVFX_THEMES)) UVFX.preload(th); }, { hero, sid });
    return pg; };
  const A = await mk('hero_engineer', 'skin_u_unrecorded', '방장'), B = await mk('hero_druid', 'skin_u_primordial', '참가자');
  await A.evaluate(() => Net.create('방장', 'hero_engineer')); ok(await wait(A, () => Net.inRoom && Net.code), '방장: 방 만들기');
  const code = await A.evaluate(() => Net.code);
  await B.evaluate((c) => Net.join(c, '참가자', 'hero_druid'), code); ok(await wait(B, () => Net.inRoom && Net.players.length === 2), '참가자: 방 참가');
  await wait(A, () => Net.players.length === 2);
  await A.waitForTimeout(1500); // 위치·스킨 정보가 오가도록
  await A.evaluate(() => { window.__game.coopHostStart(); });
  ok(await wait(B, () => window.__game.coop && !window.__game.coop.host && window.__game.mode === 'dungeon', 12000), '함께 출발: 참가자도 던전');
  await B.waitForTimeout(1500);
  await A.evaluate(() => { const g = window.__game; g.overlay = null; g.cutscene = null; for (const p of g.allPlayers()) { p.takeDamage = () => false; } });
  await B.evaluate(() => { const g = window.__game; g.overlay = null; g.cutscene = null; });
  const hostTheme = await A.evaluate(() => { const g = window.__game, R = [...g.remotes.values()][0]; return { me: UVFX.themeOf(g, g.player), remote: R && UVFX.themeOf(g, R.p) }; });
  ok(hostTheme.me === 'unrecorded' && hostTheme.remote === 'primordial', `방장이 아는 테마: 방장 ${hostTheme.me} · 참가자 ${hostTheme.remote}`);
  // 1) 방장이 포탑 → 참가자 화면에 시전 + 포탑을 따라가는 반복 효과
  await A.evaluate(() => { const g = window.__game, p = g.player; const L = jobLines('hero_engineer')[0]; g.setJob(p, L, 0); p.skillCooldown = 0; g.useSkill(); });
  ok(await wait(B, () => UVFX.list.some((I) => I.remote && I.kind === 'skill:turret') && UVFX.list.some((I) => I.remote && I.kind === 'active:turret' && I.follow), 4000), '방장 포탑 → 참가자 화면: 시전 + 포탑을 따라가는 지속 효과');
  // 2) 참가자가 늑대 소환(F) → 방장이 판정하고 참가자 화면에도 VFX
  await B.evaluate(() => { const g = window.__game; g.input.pressed.add('KeyF'); }); // 참가자 입력은 방장에게 전달됨
  await B.keyboard.press('KeyF');
  ok(await wait(A, () => UVFX.list.some((I) => I.kind === 'skill:wolves'), 4000), '참가자 늑대 소환 → 방장 화면에 VFX');
  ok(await wait(B, () => UVFX.list.some((I) => I.remote && I.kind === 'skill:wolves') && UVFX.list.filter((I) => I.remote && I.kind === 'active:wolves').length >= 3, 4000), '참가자 늑대 소환 → 참가자 화면에도 시전 + 늑대 3마리 지속 효과');
  // 3) 참가자 자기 발자국은 중복 없이 (참가자 화면이 직접 만든 것만)
  await B.keyboard.down('KeyD'); await B.waitForTimeout(1200); await B.keyboard.up('KeyD');
  const steps = await B.evaluate(() => ({ local: UVFX.list.filter((I) => !I.remote && I.kind === 'move').length, remote: UVFX.list.filter((I) => I.remote && I.kind === 'move' && I.follow == null).length }));
  ok(steps.local > 0, `참가자 자기 발자국 (참가자 화면에서 직접) ${steps.local}개`);
  // 4) 방장 발자국은 참가자 화면에 보임
  await A.keyboard.down('KeyA'); await A.waitForTimeout(1200); await A.keyboard.up('KeyA');
  ok(await wait(B, () => UVFX.list.some((I) => I.remote && I.kind === 'move'), 3000), '방장 발자국 → 참가자 화면');
  // 5) 끝나면 참가자 화면에서도 사라짐
  await A.evaluate(() => { const g = window.__game; for (const a of g.allies) a.life = 0.05; });
  ok(await wait(B, () => !UVFX.list.some((I) => I.remote && /^active:(turret|wolves)/.test(I.kind)), 6000), '소환물이 사라지면 참가자 화면의 지속 효과도 사라짐');
  await B.screenshot({ path: require('os').tmpdir() + '/coop_guest.png' });
  ok(errs.length === 0, '페이지 오류 없음' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`\n결과: ${pass}개 통과 · ${fail}개 실패`); if (fail) process.exitCode = 1; await b.close();
})();
