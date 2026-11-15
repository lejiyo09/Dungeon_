'use strict';
const game = new Game(document.getElementById('game'), GAME_DATA);
game.start();
window.__game = game; // 디버그용
Auth.migrateLegacy();
// ?guest=1 이면 로그인 화면 없이 게스트로 시작 (테스트 도구용)
if (new URLSearchParams(location.search).has('guest')) { game.login(null); game.save.prologueSeen = true; }
else { game.locked = true; LoginUI.show(game); }
