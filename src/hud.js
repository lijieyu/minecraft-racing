export class HUD {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'hud';
    this.el.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      font-family:'Courier New',monospace;color:#fff;
      pointer-events:none;z-index:20;
    `;
    this.el.innerHTML = `
      <div id="hud-top" style="display:flex;justify-content:space-between;padding:12px 20px;align-items:flex-start">
        <div id="hud-left" style="background:rgba(0,0,0,0.55);border:2px solid rgba(255,255,255,0.15);
          border-radius:8px;padding:10px 16px;min-width:160px">
          <div style="font-size:11px;color:#8cf;letter-spacing:2px;margin-bottom:4px">速度</div>
          <div id="hud-speed" style="font-size:28px;font-weight:bold;text-shadow:0 0 8px rgba(100,200,255,0.5)">0</div>
          <div id="hud-speed-bar" style="width:100%;height:6px;background:#333;border-radius:3px;margin-top:6px;overflow:hidden">
            <div id="hud-speed-fill" style="width:0%;height:100%;background:linear-gradient(90deg,#4af,#4f4);border-radius:3px;transition:width 0.1s"></div>
          </div>
        </div>
        <div id="hud-center" style="text-align:center">
          <div id="hud-countdown" style="font-size:72px;color:#ff0;text-shadow:0 0 30px rgba(255,255,0,0.6),3px 3px 0 #000;font-weight:bold"></div>
          <div id="hud-rank" style="font-size:32px;text-shadow:2px 2px 0 #000;margin-top:4px"></div>
        </div>
        <div id="hud-right" style="background:rgba(0,0,0,0.55);border:2px solid rgba(255,255,255,0.15);
          border-radius:8px;padding:10px 16px;text-align:right;min-width:120px">
          <div style="font-size:11px;color:#fa8;letter-spacing:2px;margin-bottom:4px">圈数</div>
          <div id="hud-lap" style="font-size:28px;font-weight:bold;text-shadow:0 0 8px rgba(255,170,80,0.5)">1/3</div>
        </div>
      </div>
      <div id="hud-bottom" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.6);border:2px solid rgba(255,255,255,0.15);border-radius:10px;
        padding:10px 20px;display:flex;align-items:center;gap:12px">
        <div id="hud-item-box" style="width:52px;height:52px;border:2px solid #555;border-radius:6px;
          background:rgba(60,60,60,0.8);display:flex;align-items:center;justify-content:center;font-size:28px">
          <span id="hud-item-icon">❓</span>
        </div>
        <div id="hud-item-name" style="font-size:14px;color:#aaa;min-width:60px">No Item</div>
        <div style="width:1px;background:#444;height:40px;margin:0 4px"></div>
        <div id="hud-skill-box" style="width:52px;height:52px;border:2px solid #555;border-radius:6px;
          background:rgba(60,60,60,0.8);display:flex;align-items:center;justify-content:center;font-size:28px">
          <span id="hud-skill-icon">⚡</span>
        </div>
        <div>
          <div id="hud-skill-name" style="font-size:13px;color:#aaa">技能</div>
          <div id="hud-skill-cd" style="font-size:12px;color:#5f5;font-weight:bold">就绪</div>
          <div style="font-size:10px;color:#666">双击空格</div>
        </div>
    `;
    document.getElementById('ui-layer').appendChild(this.el);
  }

  update(speed, lap, totalLaps, rank, item, countdown, skill) {
    document.getElementById('hud-speed').textContent = Math.round(speed);
    document.getElementById('hud-speed-fill').style.width = Math.min(100, (speed / 45) * 100) + '%';
    const pct = speed / 45;
    document.getElementById('hud-speed-fill').style.background =
      pct > 0.8 ? 'linear-gradient(90deg,#f44,#fa0)' :
      pct > 0.5 ? 'linear-gradient(90deg,#fa0,#ff0)' :
      'linear-gradient(90deg,#4af,#4f4)';

    document.getElementById('hud-lap').textContent = `${Math.min(lap + 1, totalLaps)}/${totalLaps}`;

    const sfx = ['st','nd','rd','th'];
    const rankColors = ['#ffd700','#c0c0c0','#cd7f32','#aaa'];
    const r = document.getElementById('hud-rank');
    r.textContent = countdown ? '' : `第${rank}名`;
    r.style.color = rankColors[Math.min(rank-1,3)];

    const icons = { tnt: '🧨', arrow: '🏹', potion: '🧪' };
    const names = { tnt: '炸弹', arrow: '弓箭', potion: '药水' };
    document.getElementById('hud-item-icon').textContent = item ? icons[item] : '❓';
    document.getElementById('hud-item-name').textContent = item ? names[item] : '无道具';
    document.getElementById('hud-item-box').style.borderColor = item ? '#5f5' : '#555';

    document.getElementById('hud-countdown').textContent = countdown || '';

    if (skill) {
      document.getElementById('hud-skill-icon').textContent = skill.icon;
      document.getElementById('hud-skill-name').textContent = skill.name;
      const cd = document.getElementById('hud-skill-cd');
      const ready = skill.cooldown <= 0;
      cd.textContent = ready ? '就绪' : Math.ceil(skill.cooldown) + 's';
      cd.style.color = ready ? '#5f5' : '#fa8';
      document.getElementById('hud-skill-box').style.borderColor = ready ? '#5f5' : '#555';
    }
  }

  hide() { this.el.style.display = 'none'; }
  show() { this.el.style.display = 'block'; }
}
