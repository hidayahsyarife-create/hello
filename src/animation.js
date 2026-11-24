/* NEON GENESIS — THE LAST SIGNAL
   animation.js — GSAP motion graphics layer (Phase 4/5).

   DOM choreography only: scene titles, HUD message, storm flash
   overlay, letterbox breathe-out on the reveal, blackout and the
   final title sequence over black. The 3D camera stays on the
   deterministic rig; GSAP never touches it. All cues come from the
   master Timeline (src/timeline.js) — one source of truth. */

import { gsap } from 'gsap';

export function setupAnimation(timeline, hooks = {}) {
  const q = sel => document.querySelector(sel);
  const title = q('#scene-title');
  const message = q('#hud-message');
  const flash = q('#glitch-flash');
  const blackout = q('#blackout');
  const letterbox = '#letterbox .bar';
  const finalTitle = q('#final-title');

  gsap.set([message, flash, blackout], { opacity: 0 });
  gsap.set(finalTitle, { autoAlpha: 0 });

  const bootHolo = hooks.holo
    ? (() => {
        const state = { p: 0 };
        return () => gsap.to(state, {
          p: 1, duration: 2.0, ease: 'power2.inOut',
          onUpdate: () => hooks.holo.boot(state.p)
        });
      })()
    : () => {};

  /* reset everything on loop back to S01 */
  function resetOverlays() {
    gsap.set([message, flash, blackout], { opacity: 0 });
    gsap.set(finalTitle, { autoAlpha: 0 });
    gsap.set(letterbox, { height: '7.5vh' });
    gsap.set(title, { opacity: 0, y: 10 });
    if (hooks.holo) hooks.holo.boot(0);
  }

  timeline.on('segment', seg => {
    if (seg.id === 'S01' && timeline.time < 1) resetOverlays();
    gsap.fromTo(title, { opacity: 0, y: 10 },
      { opacity: 0.9, y: 0, duration: 0.9, ease: 'power2.out' });
    if (seg.id === 'S05')
      gsap.to(title, { opacity: 0, y: 10, duration: 0.6, ease: 'power2.in' });
  });

  /* S01 signal beat already lives in the 3D layer */

  /* S03: holo boots, then the message locks in */
  timeline.on('cue:HOLO_INTERFACE', bootHolo);
  timeline.on('cue:MESSAGE_ESTABLISHED', () => {
    gsap.fromTo(message,
      { opacity: 0, scale: 1.18, letterSpacing: '0.95em' },
      { opacity: 1, scale: 1, letterSpacing: '0.45em',
        duration: 1.6, ease: 'power3.out' });
  });

  /* S04: grid dies, sky strobes, camera reveals scale */
  timeline.on('cue:GRID_FAILURE', () => {
    gsap.to(message, { opacity: 0, duration: 0.4 });
    gsap.fromTo(flash, { opacity: 0.7 }, { opacity: 0, duration: 0.5, ease: 'power2.out' });
  });
  timeline.on('cue:SKY_FLASH', () => {
    const tl = gsap.timeline();
    tl.fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 0.3, ease: 'power2.out' })
      .to(flash, { opacity: 0.45, duration: 0.06 }, 0.55)
      .to(flash, { opacity: 0, duration: 0.35 }, 0.61);
  });
  timeline.on('cue:PULL_BACK_REVEAL', () => {
    gsap.to(letterbox, { height: '4vh', duration: 4, ease: 'power2.inOut' });
  });

  /* S05: burn to black; titles type on over it */
  timeline.on('cue:FINAL_TITLE', () => {
    gsap.to(blackout, { opacity: 1, duration: 1.4, ease: 'power2.in' });
    const lines = finalTitle.querySelectorAll('h1, h2, .begin');
    gsap.set(finalTitle, { autoAlpha: 1 });
    gsap.fromTo(lines, { opacity: 0, y: 18 },
      { opacity: 1, y: 0, stagger: 0.85, duration: 1.1, ease: 'power2.out', delay: 0.8 });
  });
  timeline.on('cue:SILENCE', () => {
    if (hooks.lastSource) hooks.lastSource.setSwell(0);
  });

  return { resetOverlays };
}
