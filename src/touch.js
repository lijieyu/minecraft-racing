export class TouchControls {
    constructor(game) {
        this.game = game;
        this.el = document.createElement('div');
        this.el.id = 'touch-controls';
        this.el.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      pointer-events:none;z-index:30;user-select:none;-webkit-user-select:none;
    `;

        const btnStyle = `
      pointer-events:auto;width:80px;height:80px;background:rgba(0,0,0,0.3);
      border:3px solid rgba(255,255,255,0.2);border-radius:12px;
      display:flex;align-items:center;justify-content:center;font-size:32px;
      color:#fff;active:background:rgba(80,255,80,0.4);
    `;

        this.el.innerHTML = `
      <!-- Steering -->
      <div style="position:absolute;bottom:40px;left:20px;display:flex;gap:20px">
        <div id="touch-left" style="${btnStyle}">⬅️</div>
        <div id="touch-right" style="${btnStyle}">➡️</div>
      </div>
      <!-- Pedals -->
      <div style="position:absolute;bottom:40px;right:20px;display:flex;gap:20px">
        <div id="touch-brake" style="${btnStyle}">ブレーキ</div>
        <div id="touch-accel" style="${btnStyle}">GO</div>
      </div>
      <!-- Items/Skills -->
      <div style="position:absolute;bottom:140px;right:20px;display:flex;flex-direction:column;gap:15px">
        <div id="touch-skill" style="${btnStyle}width:64px;height:64px;font-size:24px;border-color:#5f5">⚡</div>
        <div id="touch-item" style="${btnStyle}width:64px;height:64px;font-size:24px;border-color:#ff0">❓</div>
      </div>
    `;

        // Fix button labels to Chinese for consistency
        this.el.querySelector('#touch-brake').textContent = 'S';
        this.el.querySelector('#touch-accel').textContent = 'W';

        this._setupHandlers();
        document.getElementById('ui-layer').appendChild(this.el);
    }

    _setupHandlers() {
        const bindKey = (id, key) => {
            const btn = this.el.querySelector(`#${id}`);
            const start = (e) => { e.preventDefault(); this.game.keys[key] = true; btn.style.background = 'rgba(80,255,80,0.4)'; };
            const end = (e) => { e.preventDefault(); this.game.keys[key] = false; btn.style.background = 'rgba(0,0,0,0.3)'; };
            btn.addEventListener('touchstart', start);
            btn.addEventListener('touchend', end);
            btn.addEventListener('touchcancel', end);
            // Mouse support for testing
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
            btn.addEventListener('mouseleave', end);
        };

        bindKey('touch-left', 'KeyA');
        bindKey('touch-right', 'KeyD');
        bindKey('touch-accel', 'KeyW');
        bindKey('touch-brake', 'KeyS');

        const btnItem = this.el.querySelector('#touch-item');
        const btnSkill = this.el.querySelector('#touch-skill');

        btnItem.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game.player && this.game.player.currentItem) {
                this.game.weapons.use(this.game.player.currentItem, this.game.player, this.game.allVehicles);
                this.game.player.currentItem = null;
            }
        });

        btnSkill.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.game._useSkill();
        });

        // Mouse support for testing
        btnItem.addEventListener('click', () => {
            if (this.game.player && this.game.player.currentItem) {
                this.game.weapons.use(this.game.player.currentItem, this.game.player, this.game.allVehicles);
                this.game.player.currentItem = null;
            }
        });
        btnSkill.addEventListener('click', () => this.game._useSkill());
    }

    destroy() {
        if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
    }
}
