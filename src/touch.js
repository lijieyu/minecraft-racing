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
      pointer-events:auto;width:85px;height:85px;background:rgba(0,0,0,0.4);
      border:3px solid rgba(255,255,255,0.3);border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:32px;
      color:#fff;box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;

    this.el.innerHTML = `
      <!-- Joystick Area -->
      <div id="joystick-container" style="position:absolute;bottom:40px;left:60px;width:150px;height:150px;
        background:rgba(255,255,255,0.1);border-radius:50%;pointer-events:auto;border:2px solid rgba(255,255,255,0.15)">
        <div id="joystick-stick" style="position:absolute;top:35px;left:35px;width:80px;height:80px;
          background:rgba(255,255,255,0.25);border-radius:50%;border:3px solid rgba(255,255,255,0.4);
          box-shadow: 0 0 20px rgba(0,0,0,0.4);transition: transform 0.05s linear"></div>
      </div>
      
      <!-- Action Buttons -->
      <div style="position:absolute;bottom:40px;right:60px;display:flex;flex-direction:column;gap:30px;align-items:center">
         <div id="touch-skill" style="${btnStyle}border-color:#5f5;font-size:36px">⚡</div>
         <div id="touch-item" style="${btnStyle}border-color:#ff0;font-size:36px">❓</div>
      </div>
    `;

    this.joystick = {
      container: null,
      stick: null,
      center: { x: 0, y: 0 },
      radius: 75,
      active: false,
      pointerId: null
    };

    this._setupHandlers();
    document.getElementById('ui-layer').appendChild(this.el);
  }

  _setupHandlers() {
    this.joystick.container = this.el.querySelector('#joystick-container');
    this.joystick.stick = this.el.querySelector('#joystick-stick');

    const handleJoystick = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const rect = this.joystick.container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = touch.clientX - centerX;
      let dy = touch.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = this.joystick.radius;

      if (dist > maxDist) {
        dx = dx * maxDist / dist;
        dy = dy * maxDist / dist;
      }

      this.joystick.stick.style.transform = `translate(${dx}px, ${dy}px)`;

      // Map to game keys
      this.game.keys['KeyA'] = dx < -20;
      this.game.keys['KeyD'] = dx > 20;
      this.game.keys['KeyW'] = dy < -20;
      this.game.keys['KeyS'] = dy > 20;
    };

    const resetJoystick = () => {
      this.joystick.stick.style.transform = `translate(0px, 0px)`;
      this.game.keys['KeyA'] = false;
      this.game.keys['KeyD'] = false;
      this.game.keys['KeyW'] = false;
      this.game.keys['KeyS'] = false;
    };

    this.joystick.container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleJoystick(e);
    });
    this.joystick.container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleJoystick(e);
    });
    this.joystick.container.addEventListener('touchend', (e) => {
      e.preventDefault();
      resetJoystick();
    });

    // Mouse support for testing
    let isMouseDown = false;
    this.joystick.container.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      handleJoystick(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isMouseDown) handleJoystick(e);
    });
    window.addEventListener('mouseup', () => {
      if (isMouseDown) {
        isMouseDown = false;
        resetJoystick();
      }
    });

    const btnItem = this.el.querySelector('#touch-item');
    const btnSkill = this.el.querySelector('#touch-skill');

    const handleItem = (e) => {
      e.preventDefault();
      if (this.game.player && this.game.player.currentItem) {
        this.game.weapons.use(this.game.player.currentItem, this.game.player, this.game.allVehicles);
        this.game.player.currentItem = null;
      }
    };
    const handleSkill = (e) => {
      e.preventDefault();
      this.game._useSkill();
    };

    btnItem.addEventListener('touchstart', handleItem);
    btnSkill.addEventListener('touchstart', handleSkill);
    btnItem.addEventListener('click', handleItem);
    btnSkill.addEventListener('click', handleSkill);
  }

  destroy() {
    if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
  }
}
