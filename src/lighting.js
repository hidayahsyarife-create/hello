/* NEON GENESIS — THE LAST SIGNAL
   lighting.js — lighting rig + cinematic color grading driver.

   One coherent nocturnal key (moon), cool ambient separation, and neon
   accent fills along the avenue. setMood(t) grades exposure/tone per
   storyboard beat so lighting stays consistent across scenes. */

import * as THREE from 'three';

/* Deterministic lightning envelope for Scene 04 — sum of gaussian
   pulses (never random), consumed by mood grading and exposure. */
const FLASH_CENTERS = [26.05, 26.42, 27.5, 29.3];
export function flashEnvelope(t) {
  let e = 0;
  for (const c of FLASH_CENTERS) {
    const d = (t - c) / 0.09;
    e += Math.exp(-d * d);
  }
  return Math.min(e, 1);
}

export function setupLighting(scene) {
  const key = new THREE.DirectionalLight(0x8fa3d8, 1.15);   /* midnight moon */
  key.position.set(-60, 120, -40);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, far: 400 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0004;

  const ambient = new THREE.HemisphereLight(0x2b3555, 0x0a0d16, 0.85);
  ambient.position.set(0, 60, 0);

  /* neon accent fills lining the camera lane (magenta / cyan / amber) */
  const neon = [];
  const neonSpecs = [
    { color: 0xff2d95, pos: [-18, 10, 40],  dist: 55 },
    { color: 0x00e5ff, pos: [16, 14, 18],   dist: 55 },
    { color: 0xff9d2e, pos: [-10, 8, -14],  dist: 45 },
    { color: 0xb44dff, pos: [22, 20, -40],  dist: 60 }
  ];
  for (const spec of neonSpecs) {
    const l = new THREE.PointLight(spec.color, 60, spec.dist, 2);
    l.position.set(...spec.pos);
    scene.add(l);
    neon.push(l);
  }

  scene.add(key, ambient);

  return {
    key, ambient, neon,
    /* grading: driven by the Timeline each frame.
       S01 midnight → S02 dark hall → S03 cyan holo → S04 storm
       → S05 near-void. One authority, consistent across scenes. */
    setMood(t) {
      if (t < 7) {
        /* S01: deep blue night, slight lift when the signal appears */
        const signalRise = Math.min(Math.max((t - 5) / 2, 0), 1);
        key.intensity = 1.15 + signalRise * 0.25;
        key.color.setHex(0x8fa3d8).lerp(new THREE.Color(0xa9b8ff), signalRise * 0.5);
        ambient.intensity = 0.85 - signalRise * 0.15;
        for (const l of neon) l.visible = true;
      } else if (t < 14) {
        /* S02: abandoned hall — kill the city neon, keep one moon slit.
           ROBOT_ENERGIZE @10.0 lifts ambience; the robot's own core
           light (scene/three side) carries the blue flood. */
        const energized = Math.min(Math.max((t - 10) / 1.2, 0), 1);
        for (const l of neon) l.visible = false;
        key.intensity = 0.14 + energized * 0.25;
        key.color.setHex(0x3d4a6b);
        ambient.intensity = 0.30 + energized * 0.30;
        ambient.color.setHex(0x1c2740);   // cool hall bounce
      } else if (t < 22) {
        /* S03: hologram dominates — cold cyan hall, gray key deep-mute */
        const boot = Math.min(Math.max((t - 14) / 2, 0), 1);
        for (const l of neon) l.visible = false;
        key.intensity = 0.10;
        key.color.setHex(0x33415e);
        ambient.intensity = 0.26 + boot * 0.18;
        ambient.color.setHex(0x14243a);
      } else if (t < 32) {
        /* S04: storm void — strobe key from the deterministic envelope */
        const flash = flashEnvelope(t);
        for (const l of neon) l.visible = false;
        key.intensity = 0.5 + flash * 2.6;
        key.color.setHex(0x5a6b8a).lerp(new THREE.Color(0xdce9ff), flash);
        ambient.intensity = 0.30;
        ambient.color.setHex(0x0d1220);
      } else {
        /* S05: near-void; the LastSource halo is the only practical */
        for (const l of neon) l.visible = false;
        key.intensity = 0.06;
        key.color.setHex(0x2a3550);
        ambient.intensity = 0.10;
        ambient.color.setHex(0x06080f);
      }
    }
  };
}
