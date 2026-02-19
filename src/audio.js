let ctx = null;

function ensure() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// --- Background Music ---
let bgGain = null, bgInterval = null;

const MELODY = [
  261.6, 329.6, 392, 523.3, 392, 329.6,
  349.2, 440, 523.3, 440, 349.2, 293.7,
  329.6, 392, 523.3, 659.3, 523.3, 392,
  440, 523.3, 659.3, 523.3, 440, 392,
];

export function startMusic() {
  const ac = ensure();
  bgGain = ac.createGain();
  bgGain.gain.value = 0.08;
  bgGain.connect(ac.destination);

  let i = 0;
  const playNote = () => {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = MELODY[i % MELODY.length];
    env.gain.setValueAtTime(0.3, ac.currentTime);
    env.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.18);
    osc.connect(env);
    env.connect(bgGain);
    osc.start();
    osc.stop(ac.currentTime + 0.2);

    // Bass on every other beat
    if (i % 2 === 0) {
      const bass = ac.createOscillator();
      const bEnv = ac.createGain();
      bass.type = 'triangle';
      bass.frequency.value = MELODY[i % MELODY.length] / 2;
      bEnv.gain.setValueAtTime(0.4, ac.currentTime);
      bEnv.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.18);
      bass.connect(bEnv);
      bEnv.connect(bgGain);
      bass.start();
      bass.stop(ac.currentTime + 0.2);
    }
    i++;
  };
  bgInterval = setInterval(playNote, 200);
  playNote();
}

export function stopMusic() {
  if (bgInterval) { clearInterval(bgInterval); bgInterval = null; }
}

// --- Sound Effects ---
export function playHitSound(type) {
  const ac = ensure();
  const g = ac.createGain();
  g.gain.value = 0.15;
  g.connect(ac.destination);

  if (type === 'tnt') {
    // Explosion: noise burst
    const buf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(g);
    src.start();
  } else if (type === 'arrow') {
    // Thwack: short high tone
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.1);
    g.gain.setValueAtTime(0.2, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
    osc.connect(g);
    osc.start();
    osc.stop(ac.currentTime + 0.15);
  } else {
    // Potion: bubbly
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.25);
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3);
    osc.connect(g);
    osc.start();
    osc.stop(ac.currentTime + 0.3);
  }
}
