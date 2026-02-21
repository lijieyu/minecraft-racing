import { CHARACTERS } from './characters.js';
import { TRACKS } from './track.js';

const PIXEL_FONT = `'Courier New', monospace`;
const MC_GREEN = '#4a4';
const MC_DARK = '#1a1a1a';

const btnBase = `
  font-family:${PIXEL_FONT}; font-size:22px; padding:14px 44px;
  color:#fff; border:4px solid #2a2; cursor:pointer;
  background: linear-gradient(180deg, #5cb85c 0%, #3a8a3a 100%);
  text-shadow:2px 2px 0 #222; letter-spacing:2px;
  image-rendering:pixelated; transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: 0 4px 0 #2a6a2a, 0 6px 12px rgba(0,0,0,0.4);
`;
const btnHover = `transform:translateY(-2px);box-shadow:0 6px 0 #2a6a2a,0 8px 16px rgba(0,0,0,0.5);`;
const btnActive = `transform:translateY(2px);box-shadow:0 2px 0 #2a6a2a,0 3px 6px rgba(0,0,0,0.3);`;

function addBtnFx(btn) {
  btn.onmouseenter = () => btn.style.cssText += btnHover;
  btn.onmouseleave = () => btn.style.cssText = btn.style.cssText.replace(btnHover, '').replace(btnActive, '');
  btn.onmousedown = () => btn.style.cssText += btnActive;
  btn.onmouseup = () => { btn.style.cssText = btn.style.cssText.replace(btnActive, ''); btn.style.cssText += btnHover; };
}

function charPreview(c) {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  // Body
  px(20, 28, 24, 20, '#' + c.shirt.toString(16).padStart(6, '0'));
  // Head
  px(22, 8, 20, 20, '#' + c.skin.toString(16).padStart(6, '0'));
  // Eyes
  px(26, 14, 4, 4, '#' + c.eyes.toString(16).padStart(6, '0'));
  px(34, 14, 4, 4, '#' + c.eyes.toString(16).padStart(6, '0'));
  // Legs
  px(22, 48, 10, 12, '#' + c.pants.toString(16).padStart(6, '0'));
  px(34, 48, 10, 12, '#' + c.pants.toString(16).padStart(6, '0'));
  return cv.toDataURL();
}

export const SPEED_LEVELS = [
  { name: '🐢 低速', maxSpeed: 25, acceleration: 18, turnSpeed: 1.6 },
  { name: '🚗 中速', maxSpeed: 35, acceleration: 24, turnSpeed: 1.9 },
  { name: '🏎️ 高速', maxSpeed: 45, acceleration: 30, turnSpeed: 2.2 },
];

export class Menu {
  constructor(onStart) {
    this.onStart = onStart;
    this.selectedChar = 0;
    this.selectedSpeed = 1;
    this.selectedMap = 0;
    this.el = document.createElement('div');
    this.el.id = 'menu';
    this.el.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:linear-gradient(180deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:100;
      font-family:${PIXEL_FONT};color:#fff;image-rendering:pixelated;
    `;
    this._renderMain();
    document.getElementById('ui-layer').appendChild(this.el);
  }

  _renderMain() {
    this.el.innerHTML = `
      <div style="text-align:center">
        <div style="font-size:64px;margin-bottom:8px;text-shadow:4px 4px 0 #000,0 0 20px rgba(80,255,80,0.3)">⛏️</div>
        <h1 style="font-size:42px;color:#5f5;text-shadow:3px 3px 0 #000,0 0 30px rgba(80,255,80,0.2);
          letter-spacing:4px;margin-bottom:4px">MINECRAFT</h1>
        <h1 style="font-size:52px;color:#ff0;text-shadow:3px 3px 0 #000,0 0 30px rgba(255,255,0,0.2);
          letter-spacing:6px;margin-bottom:8px">RACING</h1>
        <p style="color:#8af;font-size:14px;letter-spacing:3px;margin-bottom:40px">⚡ 方块赛车大冒险 ⚡</p>
        <button id="btn-start" style="${btnBase}">🏁 开始游戏</button>
        <div style="margin-top:30px;color:#667;font-size:13px;letter-spacing:1px">
          <span style="color:#adf">WASD</span> / <span style="color:#adf">方向键</span> 驾驶
          · <span style="color:#fda">空格键</span> 使用道具
        </div>
        <div style="margin-top:24px;text-align:left;display:inline-block;font-size:13px;line-height:1.8;color:#889">
          <div><span style="color:#f44">💣 TNT</span> — 向前投掷，爆炸范围伤害，击飞附近对手</div>
          <div><span style="color:#a67">🏹 弓箭</span> — 自动追踪前方最近对手，命中后减速</div>
          <div><span style="color:#b59">🧪 药水</span> — 抛物线投掷，范围减速效果持续3秒</div>
        </div>
      </div>
    `;
    const btn = this.el.querySelector('#btn-start');
    addBtnFx(btn);
    btn.onclick = () => this._renderMapSelect();
  }

  _renderMapSelect() {
    this.el.innerHTML = `
      <h2 style="font-size:32px;letter-spacing:3px;text-shadow:2px 2px 0 #000;margin-bottom:30px;color:#ff0">
        🗺️ 选择赛道 🗺️</h2>
      <div id="map-grid" style="display:flex;gap:16px;margin-bottom:30px;justify-content:center"></div>
      <button id="btn-next" style="${btnBase}">下一步 ➡️</button>
    `;
    const grid = this.el.querySelector('#map-grid');
    TRACKS.forEach((t, i) => {
      const sel = i === this.selectedMap;
      const card = document.createElement('div');
      card.style.cssText = `
        min-width:150px;padding:24px 16px;text-align:center;cursor:pointer;
        border:3px solid ${sel ? '#5f5' : '#444'};border-radius:4px;
        background:${sel ? 'rgba(80,255,80,0.15)' : 'rgba(255,255,255,0.05)'};
        transition:transform 0.15s;
        ${sel ? 'transform:scale(1.08);box-shadow:0 0 20px rgba(80,255,80,0.3);' : ''}
      `;
      card.innerHTML = `<div style="font-size:22px;color:${sel ? '#5f5' : '#ccc'};white-space:nowrap">${t.name}</div>`;
      card.onclick = () => { this.selectedMap = i; this._renderMapSelect(); };
      grid.appendChild(card);
    });
    const btn = this.el.querySelector('#btn-next');
    addBtnFx(btn);
    btn.onclick = () => this._renderCharSelect();
  }

  _renderSpeedSelect() {
    this.el.innerHTML = `
      <h2 style="font-size:32px;letter-spacing:3px;text-shadow:2px 2px 0 #000;margin-bottom:30px;color:#ff0">
        ⚡ 选择速度等级 ⚡</h2>
      <div id="speed-grid" style="display:flex;gap:16px;margin-bottom:30px;justify-content:center"></div>
      <button id="btn-next" style="${btnBase}">下一步 ➡️</button>
    `;
    const grid = this.el.querySelector('#speed-grid');
    SPEED_LEVELS.forEach((s, i) => {
      const sel = i === this.selectedSpeed;
      const card = document.createElement('div');
      card.style.cssText = `
        width:140px;padding:20px 16px;text-align:center;cursor:pointer;
        border:3px solid ${sel ? '#5f5' : '#444'};border-radius:4px;
        background:${sel ? 'rgba(80,255,80,0.15)' : 'rgba(255,255,255,0.05)'};
        transition:transform 0.15s;
        ${sel ? 'transform:scale(1.08);box-shadow:0 0 20px rgba(80,255,80,0.3);' : ''}
      `;
      card.innerHTML = `<div style="font-size:20px;color:${sel ? '#5f5' : '#ccc'}">${s.name}</div>`;
      card.onclick = () => { this.selectedSpeed = i; this._renderSpeedSelect(); };
      grid.appendChild(card);
    });
    const btn = this.el.querySelector('#btn-next');
    addBtnFx(btn);
    btn.onclick = () => this._renderMapSelect();
  }

  _renderCharSelect() {
    this.el.innerHTML = `
      <h2 style="font-size:32px;letter-spacing:3px;text-shadow:2px 2px 0 #000;margin-bottom:30px;color:#ff0">
        ⚔️ 选择你的赛车手 ⚔️</h2>
      <div id="char-grid" style="display:flex;gap:16px;margin-bottom:30px;flex-wrap:wrap;justify-content:center"></div>
      <button id="btn-go" style="${btnBase}">🏁 开始比赛！</button>
    `;
    const grid = this.el.querySelector('#char-grid');
    CHARACTERS.forEach((c, i) => {
      const sel = i === this.selectedChar;
      const card = document.createElement('div');
      card.style.cssText = `
        width:130px;padding:16px 12px;text-align:center;cursor:pointer;
        border:3px solid ${sel ? '#5f5' : '#444'};border-radius:4px;
        background:${sel ? 'rgba(80,255,80,0.15)' : 'rgba(255,255,255,0.05)'};
        transition:transform 0.15s,border-color 0.15s,background 0.15s;
        ${sel ? 'transform:scale(1.08);box-shadow:0 0 20px rgba(80,255,80,0.3);' : ''}
      `;
      card.innerHTML = `
        <img src="${charPreview(c)}" style="width:64px;height:64px;image-rendering:pixelated;margin-bottom:8px">
        <div style="font-size:15px;letter-spacing:1px;color:${sel ? '#5f5' : '#ccc'}">${c.name}</div>
      `;
      card.onmouseenter = () => { if (i !== this.selectedChar) card.style.transform = 'scale(1.05)'; };
      card.onmouseleave = () => { if (i !== this.selectedChar) card.style.transform = ''; };
      card.onclick = () => { this.selectedChar = i; this._renderCharSelect(); };
      grid.appendChild(card);
    });
    const btn = this.el.querySelector('#btn-go');
    addBtnFx(btn);
    btn.onclick = () => { this.hide(); this.onStart(this.selectedChar, SPEED_LEVELS[this.selectedSpeed], this.selectedMap); };
  }

  hide() { this.el.style.display = 'none'; }

  showResults(rank, onRestart) {
    this.el.style.display = 'flex';
    const sfx = ['st','nd','rd','th'];
    const colors = ['#ffd700','#c0c0c0','#cd7f32','#aaa'];
    const trophies = ['🏆','🥈','🥉','🏅'];
    this.el.innerHTML = `
      <div style="text-align:center">
        <div style="font-size:72px;margin-bottom:10px">${trophies[Math.min(rank-1,3)]}</div>
        <h1 style="font-size:44px;text-shadow:3px 3px 0 #000;margin-bottom:10px">🏁 比赛结束！</h1>
        <h2 style="font-size:48px;color:${colors[Math.min(rank-1,3)]};text-shadow:3px 3px 0 #000;margin-bottom:40px">
          第 ${rank} 名！
        </h2>
        <div style="display:flex;gap:20px;justify-content:center">
          <button id="btn-restart" style="${btnBase}">🔄 再来一局</button>
          <button id="btn-home" style="${btnBase}">🏠 返回主菜单</button>
        </div>
      </div>
    `;
    const btnRestart = this.el.querySelector('#btn-restart');
    addBtnFx(btnRestart);
    btnRestart.onclick = () => { this.hide(); onRestart(); };

    const btnHome = this.el.querySelector('#btn-home');
    addBtnFx(btnHome);
    btnHome.onclick = () => { this._renderMain(); };
  }
}
