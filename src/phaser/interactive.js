/* NEON GENESIS — THE LAST SIGNAL
   phaser/interactive.js — SIGNAL DECODER interactive panel (Phase 6).

   Standalone Phaser module. It owns its own canvas (340x220) and
   communicates EXCLUSIVELY through the signal bus defined in
   signalBus.js:

     listens : 'panel:levels' { signal, grid, core }
               'panel:visible' { visible }
     emits   : 'decoder:boost' { sourceTime }  on pointer down

   Interactive behaviour: tapping the panel pushes a decode surge —
   waveform amplitude swells, bars flare, a "SIGNAL LOCKED" flash
   cycles — and the surge inflates the SIGNAL bar for ~0.6s. No
   direct reference to main.js: if the cinema never publishes, the
   panel still runs standalone.

   Loaded lazily (dynamic import) so the cinema is not blocked if
   Phaser fails to initialize. */

import Phaser from 'phaser';

const W = 340, H = 220;
const SURGE_WINDOW = 0.6;   /* seconds a tap keeps the surge alive */

export function attachSignalDecoder(mountEl, bus) {
  let levels = { signal: 0, grid: 1, core: 0 };
  let surgeStart = -10;
  let time = 0;

  bus.on('panel:levels', l => { levels = l; });
  bus.on('panel:visible', v => {
    if (mountEl) mountEl.style.opacity = v.visible ? '1' : '0';
  });

  function create() {
    const P = this;

    /* generated texture — the module ships zero binary assets */
    const dotCtx = P.textures.createCanvas('dot', 6, 6).getContext('2d');
    const grd = dotCtx.createRadialGradient(3, 3, 0, 3, 3, 3);
    grd.addColorStop(0, 'rgba(159,216,255,1)');
    grd.addColorStop(1, 'rgba(159,216,255,0)');
    dotCtx.fillStyle = grd;
    dotCtx.fillRect(0, 0, 6, 6);
    P.textures.get('dot').refresh();

    /* panel chrome */
    const g = P.add.graphics();
    g.fillStyle(0x04070d, 0.88).fillRoundedRect(2, 2, W - 4, H - 4, 8);
    g.lineStyle(1.5, 0x2a6fb8, 0.9).strokeRoundedRect(2, 2, W - 4, H - 4, 8);
    g.lineStyle(2, 0x9fd8ff, 1)
      .strokeLineShape(new Phaser.Geom.Line(14, 2, 96, 2))
      .strokeLineShape(new Phaser.Geom.Line(W - 96, H - 2, W - 14, H - 2));

    P.add.text(16, 10, 'SIGNAL DECODER v3.1', {
      fontFamily: 'Courier, monospace', fontSize: '11px', color: '#9fd8ff'
    });
    P.add.text(W - 16, 10, 'DZN-77', {
      fontFamily: 'Courier, monospace', fontSize: '10px', color: '#ff2d95'
    }).setOrigin(1, 0);

    /* energy bars: SIGNAL / GRID / CORE */
    P.barDefs = [
      { label: 'SIGNAL', x: 18, y: 34, color: 0x9fd8ff },
      { label: 'GRID',   x: 18, y: 62, color: 0xff2d95 },
      { label: 'CORE',   x: 18, y: 90, color: 0xffd27a }
    ];
    for (const d of P.barDefs) {
      P.add.text(d.x, d.y - 2, d.label, {
        fontFamily: 'Courier, monospace', fontSize: '9px', color: '#7f9dbf'
      });
    }
    P.barGfx = P.add.graphics();

    /* ambient drifting particles */
    P.add.particles(0, 0, 'dot', {
      x: { min: 0, max: W }, y: H + 6,
      lifespan: 5200, speedY: { min: -26, max: -10 }, speedX: { min: -4, max: 4 },
      scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.5, end: 0 },
      frequency: 140, quantity: 1
    });

    /* waveform + interaction flash */
    P.wave = P.add.graphics();
    P.flash = P.add.text(W / 2, H / 2 - 4, 'SIGNAL LOCKED', {
      fontFamily: 'Courier, monospace', fontSize: '15px', color: '#bfe4ff'
    }).setOrigin(0.5).setAlpha(0);

    /* interaction: tap = decode surge, published through the bus only */
    P.input.on('pointerdown', () => {
      surgeStart = time;
      bus.emit('decoder:boost', { sourceTime: time });
      P.tweens.add({
        targets: P.flash, alpha: 1, duration: 90, yoyo: true,
        hold: 220, ease: 'Cubic.out'
      });
    });

    P.cameras.main.setRoundPixels(true);
  }

  function update() {
    const P = this;
    const now = P.time.now / 1000;
    time = now;
    const surge = Math.max(0, 1 - (now - surgeStart) / SURGE_WINDOW);

    /* bars ease toward published levels; a surge inflates SIGNAL */
    if (P.barLevels === undefined) P.barLevels = { signal: 0, grid: 1, core: 0 };
    const lv = P.barLevels;
    const target = {
      signal: Math.min(1, levels.signal + surge * 0.35),
      grid: levels.grid,
      core: levels.core
    };
    for (const k of Object.keys(target)) {
      lv[k] += (target[k] - lv[k]) * 0.12;
    }

    P.barGfx.clear();
    for (const d of P.barDefs) {
      const v = Math.max(0, Math.min(1, lv[d.label.toLowerCase()] ?? 0));
      P.barGfx.fillStyle(0x101c2c, 1).fillRect(d.x, d.y + 9, 180, 7);
      P.barGfx.fillStyle(d.color, 0.85 + Math.sin(now * 6 + d.y) * 0.15)
        .fillRect(d.x, d.y + 9, 180 * v, 7);
      P.barGfx.lineStyle(1, 0x2a4a6f, 0.8).strokeRect(d.x, d.y + 9, 180, 7);
    }

    /* waveform: composite sine; surge doubles the amplitude */
    P.wave.clear();
    P.wave.lineStyle(2, 0x9fd8ff, 0.9);
    const baseY = 156, amp = 7 + surge * 8;
    let prev = null;
    for (let x = 16; x <= W - 16; x += 3) {
      const y = baseY + Math.sin(x * 0.055 + now * 7) * amp
              + Math.sin(x * 0.011 - now * 3) * amp * 0.4;
      if (prev) P.wave.lineBetween(prev.x, prev.y, x, y);
      prev = { x, y };
    }
    P.wave.lineStyle(1, 0x2a4a6f, 0.6).lineBetween(16, baseY, W - 16, baseY);

    P.flash.setAlpha(Math.min(P.flash.alpha, surge * 0.9));
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    width: W, height: H,
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    parent: mountEl,
    scale: { mode: Phaser.Scale.NONE },
    scene: { create, update }
  });
}
