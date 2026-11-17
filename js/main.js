'use strict';
const game = new Game(document.getElementById('game'), GAME_DATA);
game.start();
window.__game = game; // 디버그용
// PWA: http(s)로 열렸을 때만 서비스 워커 등록 (파일로 직접 열면 건너뜀)
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol))
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* 등록 실패해도 게임은 그대로 실행 */ }));
Auth.migrateLegacy();
// ?guest=1 이면 로그인 화면 없이 게스트로 시작 (테스트 도구용)
if (new URLSearchParams(location.search).has('guest')) { game.login(null); game.save.prologueSeen = true; window.__toolMode = true; }
else {
  Auth.fixAdmin(); const auto = Auth.getAuto(); // '다음부터 바로 시작'을 켠 계정 (관리자 제외)
  if (auto) { game.login(auto); game.showBanner(`자동 로그인 — ${auto.name}`, '로비에서 Esc → L로 로그아웃하면 자동 로그인이 꺼집니다', '#ffd84a'); }
  else { game.locked = true; LoginUI.show(game); }
}
Net.wake(); // 멀티·랭킹 서버를 미리 깨움
document.addEventListener('visibilitychange', () => { if (!document.hidden && game.mode === 'lobby') Net.wake(); }); // 오래 자리를 비웠다 돌아왔을 때
