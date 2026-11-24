/* NEON GENESIS — THE LAST SIGNAL
   camera.js — keyframed cinematic camera rig.

   Shots are declared as storyboard-anchored keyframes with smoothstep
   easing. All motion is deterministic — no random camera movement.
   A subtle handheld breathing (fixed sine harmonics) can be blended in
   per shot for realism without breaking reproducibility. */

import * as THREE from 'three';
import { ease, segmentAt } from './timeline.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---- SCENE 01 keyframes: "The Silent City" ------------------
   0.0-2.5s : dolly forward high between towers, looking down the avenue
   2.5-4.5s : descend alongside a canyon wall toward street level
   4.5-7.0s : slow rise + tilt up as the signal ignites in the sky
---------------------------------------------------------------- */
const SHOT_S01 = [
  {
    start: 0.0, end: 2.5,
    pos0: v(-14, 58, 96),  pos1: v(-8, 52, 62),
    look0: v(2, 34, 0),    look1: v(0, 30, 10),
    fov0: 42, fov1: 46, sway: 0.20
  },
  {
    start: 2.5, end: 4.5,
    pos0: v(-8, 52, 62),   pos1: v(-6, 14, 30),
    look0: v(0, 30, 10),   look1: v(2, 12, -6),
    fov0: 46, fov1: 50, sway: 0.12
  },
  {
    start: 4.5, end: 7.0,
    pos0: v(-6, 14, 30),   pos1: v(-2, 22, 16),
    look0: v(2, 12, -6),   look1: v(0, 88, -120),
    fov0: 50, fov1: 55, sway: 0.08
  }
];

/* ---- SCENE 02 keyframes: "The Awakening" ------------------
   7.0-9.5s  : crane down from high corner over the dormant machine
   9.5-12.2s : macro dolly across the chest energy channels
   12.2-14.0s: slow push-in to the head as the visor ignites
   The robot root sits at (0,0,10); chest y2.5, head y3.55.
---------------------------------------------------------------- */
const SHOT_S02 = [
  {
    start: 7.0, end: 9.5,
    pos0: v(-2, 26, 36),    pos1: v(6.5, 6.5, 21),
    look0: v(0, 3, 10),     look1: v(0, 3.5, 10),
    fov0: 44, fov1: 48, sway: 0.10
  },
  {
    start: 9.5, end: 12.2,
    pos0: v(5.5, 3.2, 17.0),  pos1: v(-4.5, 3.0, 16.0),
    look0: v(0, 2.6, 10),     look1: v(0, 2.9, 10),
    fov0: 40, fov1: 38, sway: 0.07
  },
  {
    start: 12.2, end: 14.0,
    pos0: v(-0.8, 4.3, 14.8), pos1: v(0, 4.0, 12.4),
    look0: v(0, 3.9, 10.2),   look1: v(0, 3.9, 10.2),
    fov0: 36, fov1: 34, sway: 0.05
  }
];

/* ---- SCENE 03 keyframes: "The Signal" -------------------------
   The hologram stands at (0, 3.2, 6) in the facility hall.
   14.0-17.0s : boot arc, camera creeps in from the left flank
   17.0-20.0s : orbit across the face of the interface (~80°)
   20.0-22.0s : push-in on the reticle as the message locks
---------------------------------------------------------------- */
const SHOT_S03 = [
  {
    start: 14.0, end: 17.0,
    pos0: v(-7.5, 2.2, 12.5), pos1: v(-3.6, 3.0, 10.8),
    look0: v(0, 3.2, 6), look1: v(0, 3.2, 6),
    fov0: 44, fov1: 46, sway: 0.10
  },
  {
    start: 17.0, end: 20.0,
    pos0: v(-3.6, 3.0, 10.8), pos1: v(4.2, 3.6, 11.2),
    look0: v(0, 3.2, 6), look1: v(0, 3.2, 6),
    fov0: 46, fov1: 44, sway: 0.08
  },
  {
    start: 20.0, end: 22.0,
    pos0: v(4.2, 3.6, 11.2), pos1: v(0.9, 3.4, 9.4),
    look0: v(0, 3.2, 6), look1: v(0, 3.3, 6),
    fov0: 42, fov1: 38, sway: 0.05
  }
];

/* ---- SCENE 04 keyframes: "The Collapse" ----------------------
   Back outside, city goes dark in a cascading wave.
   22.0-23.0s : hard cut + whip-back above the street (stabilizes)
   23.0-26.0s : slow rise through the towers as districts die
   26.0-28.0s : lateral track during the lightning storm
   28.0-32.0s : long dolly-back — full scale reveal of the dead city
---------------------------------------------------------------- */
const SHOT_S04 = [
  {
    start: 22.0, end: 23.0,
    pos0: v(-3.5, 6, 26),  pos1: v(-10, 48, 70),
    look0: v(0, 2, -10),   look1: v(0, 40, -60),
    fov0: 50, fov1: 58, sway: 0.30
  },
  {
    start: 23.0, end: 26.0,
    pos0: v(-10, 48, 70),  pos1: v(-8, 66, 96),
    look0: v(0, 40, -60),  look1: v(0, 46, -80),
    fov0: 58, fov1: 55, sway: 0.16
  },
  {
    start: 26.0, end: 28.0,
    pos0: v(-4, 70, 110),  pos1: v(6, 62, 118),
    look0: v(-20, 50, -60), look1: v(10, 45, -70),
    fov0: 54, fov1: 55, sway: 0.22
  },
  {
    start: 28.0, end: 32.0,
    pos0: v(6, 62, 118),   pos1: v(14, 95, 170),
    look0: v(10, 45, -70), look1: v(0, 60, -120),
    fov0: 55, fov1: 60, sway: 0.08
  }
];

/* ---- SCENE 05 keyframes: "Final Transmission" ----------------
   32.0-35.0s : slow approach to the lone energy source at (0,4,0)
   35.0-40.0s : locked hold while titles type on over black
---------------------------------------------------------------- */
const SHOT_S05 = [
  {
    start: 32.0, end: 35.0,
    pos0: v(0.6, 3.6, 15),  pos1: v(0, 3.9, 9.5),
    look0: v(0, 4, 0),      look1: v(0, 4, 0),
    fov0: 40, fov1: 46, sway: 0.03
  },
  {
    start: 35.0, end: 40.0,
    pos0: v(0, 3.9, 9.5),   pos1: v(0, 3.9, 9.4),
    look0: v(0, 4, 0),      look1: v(0, 4, 0),
    fov0: 46, fov1: 46, sway: 0.015
  }
];

export const SHOTS_ALL = [...SHOT_S01, ...SHOT_S02, ...SHOT_S03, ...SHOT_S04, ...SHOT_S05];

export class CameraRig {
  constructor(camera, shots = SHOTS_ALL) {
    this.camera = camera;
    this.shots = [...shots].sort((a, b) => a.start - b.start);
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }

  /* returns true if a shot covered time t */
  update(t) {
    const shot = this.shots.find(s => t >= s.start && t < s.end)
      || (t >= this.shots[this.shots.length - 1].end ? this.shots[this.shots.length - 1] : null);
    if (!shot) return false;

    const raw = (t - shot.start) / (shot.end - shot.start);
    const k = ease(raw);

    this._pos.lerpVectors(shot.pos0, shot.pos1, k);
    this._look.lerpVectors(shot.look0, shot.look1, k);

    /* deterministic handheld breathing: two incommensurate sine harmonics */
    const s = shot.sway || 0;
    this._pos.x += Math.sin(t * 0.9) * 0.12 * s + Math.sin(t * 2.3) * 0.05 * s;
    this._pos.y += Math.sin(t * 0.7) * 0.10 * s;

    this.camera.position.copy(this._pos);
    this.camera.up.copy(this._up);
    this.camera.lookAt(this._look);

    const fov = shot.fov0 + (shot.fov1 - shot.fov0) * k;
    if (Math.abs(this.camera.fov - fov) > 1e-4) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    return true;
  }

  /* cut hard to the first shot that starts within a storyboard segment.
     Used on scene changes so cuts land on exact keyframes, never mid-ease. */
  snapToSegment(seg) {
    const shot = this.shots.find(s => s.start >= seg.start - 1e-6) || this.shots[0];
    this.update(shot.start + 0.01);
  }
}
