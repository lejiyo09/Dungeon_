// 로그인 흐름 검증: 계정 생성 → 새로고침 후 유지 → PIN 검사 → 로그아웃 → 삭제 → 기존 진행도 이전
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1024, height: 576 } });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) process.exitCode = 1; };
  // 0) 계정 이전: 예전 단일 저장이 있으면 '플레이어' 계정으로
  await pg.goto(URL); await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('project_dungeon_save_v1', JSON.stringify({ bank: 321 })); });
  await pg.reload(); await pg.waitForTimeout(300);
  ok(await pg.locator('.lg-prof', { hasText: '플레이어' }).count() === 1, '기존 진행도가 "플레이어" 계정으로 이전됨');
  await pg.locator('.lg-prof', { hasText: '플레이어' }).click(); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => window.__game.save.bank === 321 && !window.__game.locked), '이전된 계정으로 로그인하면 골드 321 유지');
  // 1) 로그아웃 (로비 일시정지 → L)
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); await pg.keyboard.press('KeyL'); await pg.waitForTimeout(200);
  ok(await pg.locator('#login').isVisible(), '로그아웃하면 로그인 화면으로');
  // 2) 새 계정 (PIN 포함), 입력 중 E/Space가 게임 키로 먹히지 않는지
  await pg.click('#lg-new'); await pg.fill('#lg-name', 'Tester E'); await pg.fill('#lg-pin', '1234'); await pg.click('#lg-ok'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => window.__game.profile && window.__game.profile.name === 'Tester E'), '새 계정 생성 후 바로 로그인 (닉네임에 E와 공백 입력 가능)');
  await pg.evaluate(() => { const g = window.__game; g.save.bank = 777; writeSave(g.save); });
  // 3) 중복 닉네임 / 잘못된 PIN
  await pg.reload(); await pg.waitForTimeout(300);
  await pg.click('#lg-new'); await pg.fill('#lg-name', 'Tester E'); await pg.click('#lg-ok'); await pg.waitForTimeout(100);
  ok((await pg.textContent('#lg-err')).includes('이미'), '중복 닉네임 거부');
  await pg.click('#lg-back');
  await pg.locator('.lg-prof', { hasText: 'Tester E' }).click(); await pg.fill('#lg-pin', '9999'); await pg.click('#lg-ok'); await pg.waitForTimeout(150);
  ok((await pg.textContent('#lg-err')).includes('맞지'), '틀린 PIN 거부');
  await pg.fill('#lg-pin', '1234'); await pg.press('#lg-pin', 'Enter'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => window.__game.save.bank === 777), '맞는 PIN → 새로고침 후에도 계정 진행도(골드 777) 유지');
  ok(await pg.evaluate(() => !JSON.stringify(localStorage).includes('"1234"')), 'PIN 원문은 저장되지 않음');
  // 4) 계정별 분리: 다른 계정의 골드가 섞이지 않음
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); await pg.keyboard.press('KeyL'); await pg.waitForTimeout(150);
  await pg.locator('.lg-prof', { hasText: '플레이어' }).click(); await pg.waitForTimeout(150);
  ok(await pg.evaluate(() => window.__game.save.bank === 321), '계정별 진행도 분리');
  // 5) 게스트는 저장 안 됨
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); await pg.keyboard.press('KeyL'); await pg.waitForTimeout(150);
  await pg.click('#lg-guest'); await pg.waitForTimeout(150);
  const before = await pg.evaluate(() => Object.keys(localStorage).length);
  await pg.evaluate(() => { const g = window.__game; g.save.bank = 5; writeSave(g.save); });
  ok(await pg.evaluate((n) => Object.keys(localStorage).length === n && window.__game.profile === null, before), '게스트 진행도는 저장되지 않음');
  // 6) 삭제 (PIN 필요)
  await pg.reload(); await pg.waitForTimeout(300);
  await pg.locator('.lg-row', { hasText: 'Tester E' }).locator('.lg-del').click(); await pg.fill('#lg-pin', '1234'); await pg.click('#lg-ok'); await pg.waitForTimeout(150);
  ok(await pg.locator('.lg-prof', { hasText: 'Tester E' }).count() === 0 && await pg.evaluate(() => !Object.keys(localStorage).some((k) => k.includes('::') && !k.includes('legacy'))), 'PIN 확인 후 계정과 진행도 삭제');
  await pg.screenshot({ path: process.argv[2] || 'login.png' });
  console.log('errors', errs); await b.close();
})();
