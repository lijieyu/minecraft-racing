import { Game } from './game.js';
import { Menu, SPEED_LEVELS } from './menu.js';

let game = null;

function startGame(charIdx, speedCfg) {
  if (game) game.destroy();
  game = new Game();
  window.__game = game;
  game.init(charIdx, speedCfg);
  game.onFinish = (rank) => {
    menu.showResults(rank, () => startGame(menu.selectedChar, SPEED_LEVELS[menu.selectedSpeed]));
  };
}

const menu = new Menu(startGame);
