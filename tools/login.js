// 로그인·이어하기 검증: 계정 이전 → 생성 → PIN(4자리 자동 확인) → 로그아웃 → 계정 분리 → 게스트 → 자동 로그인 → 던전 이어하기 → 삭제
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1024, height: 576 } });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) process.exitCode = 1; };
  const acct = (name) => pg.locator('.lg-prof, .lg-cont', { hasText: name }); // 맨 위 '계속하기' 또는 목록의 계정
  const logout = async () => { await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); await pg.keyboard.press('KeyL'); await pg.waitForTimeout(200); };
  // 0) 계정 이전
  await pg.goto(URL); await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('project_dungeon_save_v1', JSON.stringify({ bank: 321 })); });
  await pg.reload(); await pg.waitForTimeout(300);
  ok(await acct('플레이어').count() === 1, '기존 진행도가 "플레이어" 계정으로 이전됨 (계속하기 버튼)');
  ok((await pg.textContent('.lg-cont')).includes('321'), '계정 진행 요약 표시 (결정석 321)');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => window.__game.save.bank === 321 && !window.__game.locked), 'Enter로 마지막 계정 바로 시작, 진행도 유지');
  await logout();
  ok(await pg.locator('#login').isVisible(), '로그아웃하면 로그인 화면으로');
  // 1) 새 계정 (PIN 포함), 입력 중 게임 키 무시
  await pg.click('#lg-new'); await pg.fill('#lg-name', 'Tester E'); await pg.press('#lg-name', 'Enter');
  ok(await pg.evaluate(() => document.activeElement && document.activeElement.id === 'lg-pin'), '닉네임에서 Enter → PIN 칸으로 이동');
  await pg.fill('#lg-pin', '12a34'); ok((await pg.inputValue('#lg-pin')) === '1234', 'PIN 칸은 숫자만 입력됨');
  await pg.click('#lg-ok'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => window.__game.profile && window.__game.profile.name === 'Tester E'), '새 계정 생성 후 바로 로그인');
  await pg.evaluate(() => { const g = window.__game; g.save.bank = 777; writeSave(g.save); });
  // 2) 중복 닉네임 / 잘못된 PIN / 4자리 자동 확인
  await pg.reload(); await pg.waitForTimeout(300);
  await pg.click('#lg-new'); await pg.fill('#lg-name', 'Tester E'); await pg.click('#lg-ok'); await pg.waitForTimeout(100);
  ok((await pg.textContent('#lg-err')).includes('이미'), '중복 닉네임 거부');
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
  ok(await pg.locator('#lg-new').isVisible(), 'Esc로 목록으로 돌아감');
  await acct('Tester E').click(); await pg.fill('#lg-pin', '9999'); await pg.waitForTimeout(200);
  ok((await pg.textContent('#lg-err')).includes('맞지'), '틀린 PIN 4자리 → 자동 확인 후 거부');
  await pg.fill('#lg-pin', '1234'); await pg.waitForTimeout(250);
  ok(await pg.evaluate(() => window.__game.save.bank === 777), '맞는 PIN 4자리 → 자동 로그인, 진행도 유지');
  ok(await pg.evaluate(() => !JSON.stringify(localStorage).includes('"1234"')), 'PIN 원문은 저장되지 않음');
  // 3) 계정별 분리
  await logout(); await acct('플레이어').click(); await pg.waitForTimeout(150);
  ok(await pg.evaluate(() => window.__game.save.bank === 321), '계정별 진행도 분리');
  // 4) 게스트
  await logout(); await pg.click('#lg-guest'); await pg.waitForTimeout(150);
  const before = await pg.evaluate(() => Object.keys(localStorage).length);
  await pg.evaluate(() => { const g = window.__game; g.save.bank = 5; writeSave(g.save); });
  ok(await pg.evaluate((n) => Object.keys(localStorage).length === n && window.__game.profile === null, before), '게스트 진행도는 저장되지 않음');
  // 5) 자동 로그인
  await pg.reload(); await pg.waitForTimeout(300);
  await pg.check('#lg-auto'); await acct('플레이어').click(); await pg.waitForTimeout(150);
  await pg.reload(); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => window.__game.profile && window.__game.profile.name === '플레이어' && !window.__game.locked), "'다음부터 바로 시작' → 새로고침해도 로그인 화면 없이 시작");
  // 6) 던전 이어하기: 2-2까지 진행 후 게임을 끔(새로고침) → 다시 켜면 이어하기
  await pg.evaluate(() => { const g = window.__game; g.save.prologueSeen = true; g.startRun(); g.overlay = null;
    g.player.weapons.push(new WeaponInstance(GAME_DATA.weapons.get('weapon_rifle_001'))); g.gold = 42; g.player.hp = 50;
    for (let i = 0; i < 5; i++) g.advanceStage(); });
  await pg.reload(); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => window.__game.overlay && window.__game.overlay.type === 'resume'), '다시 켜면 "진행 중인 탐험" 이어하기 물음');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(900);
  const st = await pg.evaluate(() => { const g = window.__game; return { mode: g.mode, w: g.worldIdx, l: g.levelIdx, gold: g.gold, hp: g.player.hp, wp: g.player.weapons.map((w) => w.def.id) }; });
  ok(st.mode === 'dungeon' && st.w === 1 && st.l === 1 && st.gold === 42 && st.hp === 50 && st.wp.includes('weapon_rifle_001'), `이어하기 → 2-2, 골드·체력·무기 복원 (${JSON.stringify(st)})`);
  await pg.evaluate(() => { const g = window.__game; g.player.state = 'DEAD'; g.endRun(false); });
  ok(await pg.evaluate(() => window.__game.save.run === null), '사망하면 이어하기 기록 삭제');
  // 7) 로그아웃하면 자동 로그인 해제, 삭제
  await pg.evaluate(() => window.__game.finishResult()); await pg.waitForTimeout(1500); await logout();
  ok(await pg.locator('#login').isVisible(), '탐험 후 로비에서 로그아웃');
  await pg.reload(); await pg.waitForTimeout(300);
  ok(await pg.locator('#login').isVisible(), '로그아웃하면 자동 로그인 해제');
  await pg.locator('.lg-row', { hasText: 'Tester E' }).locator('.lg-del').click(); await pg.fill('#lg-pin', '1234'); await pg.waitForTimeout(250);
  ok(await acct('Tester E').count() === 0 && await pg.evaluate(() => !Object.keys(localStorage).some((k) => k.includes('::') && !k.includes('legacy'))), 'PIN 확인 후 계정과 진행도 삭제');
  await pg.screenshot({ path: process.argv[2] || 'login.png' });
  console.log('errors', errs); await b.close();
})();
