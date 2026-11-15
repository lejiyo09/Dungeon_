'use strict';
const game = new Game(document.getElementById('game'), GAME_DATA);
game.start();
window.__game = game; // 디버그용
