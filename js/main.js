'use strict';
const game = new Game(document.getElementById('game'), GAME_DATA);
game.start();
window.__game = game; // 디버그용
Auth.migrateLegacy();
// ?guest=1 이면 로그인 화면 없이 게스트로 시작 (테스트 도구용)
if (new URLSearchParams(location.search).has('guest')) { game.login(null); game.save.prologueSeen = true; }
else {
  const auto = Auth.getAuto(); // '다음부터 바로 시작'을 켠 계정
  if (auto) { game.login(auto); game.showBanner(`자동 로그인 — ${auto.name}`, '로비에서 Esc → L로 로그아웃하면 자동 로그인이 꺼집니다', '#ffd84a'); }
  else { game.locked = true; LoginUI.show(game); }
}
