import { Game } from './game.js';
import { Menu, SPEED_LEVELS } from './menu.js';

let game = null;

function startGame(charIdx, speedCfg, mapIdx = 0) {
  if (game) game.destroy();
  game = new Game();
  window.__game = game;
  game.init(charIdx, speedCfg, mapIdx);
  game.onFinish = (rank) => {
    menu.showResults(rank, () => startGame(menu.selectedChar, SPEED_LEVELS[menu.selectedSpeed], menu.selectedMap));
  };
}

const menu = new Menu(startGame);
