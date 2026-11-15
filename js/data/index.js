'use strict';
// 데이터 인덱스: id → 정의
const indexById = (list) => new Map(list.map((d) => [d.id, d]));
const GAME_DATA = {
  base: DATA_PLAYER_BASE,
  heroes: indexById(DATA_HEROES),
  weapons: indexById(DATA_WEAPONS),
  enemies: indexById(DATA_ENEMIES)
};
