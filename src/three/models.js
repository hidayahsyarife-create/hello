/* NEON GENESIS — THE LAST SIGNAL
   three/models.js — flying vehicles and procedural models.

   Scene 01 uses deterministic traffic lanes of small civilian craft.
   Blender-authored GLB assets (Phase 2) are loaded through the same
   factory signature below, falling back to procedural stand-ins only
   when the asset file is genuinely absent. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0, ...opts });

const loader = new GLTFLoader();

/* Load a Blender-exported GLB if present; resolve(null) otherwise so
   callers can fall back to the procedural build. */
export function loadModel(url) {
  return new Promise(resolve => {
    loader.load(
      url,
      gltf => resolve(gltf.scene),
      undefined,
      () => resolve(null)
    );
  });
}

function makeCraft() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.5, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x151a24, roughness: 0.35, metalness: 0.8 })
  );
  hull.castShadow = true;
  /* nose taper */
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.4, 4),
    hull.material
  );
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.8;
  const engine = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x66d9ff })
  );
  engine.position.x = -1.3;
  const navL = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2d4d })
  );
  const navR = navL.clone();
  navL.position.set(0, 0.34, 0.5); navR.position.set(0, 0.34, -0.5);
  g.add(hull, nose, engine, navL, navR);
  g.userData.blink = [engine, navL, navR];
  return g;
}

export function buildTraffic(scene, { count = 7 } = {}) {
  const rngState = 99;
  let a = rngState;
  const rng = () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };

  const fleet = [];
  for (let i = 0; i < count; i++) {
    const craft = makeCraft();
    const lane = {
      x: (rng() - 0.5) * 60,
      y: 16 + rng() * 55,
      z0: -140 + rng() * 200,
      speed: 9 + rng() * 14,
      dir: rng() < 0.5 ? 1 : -1,
      bobAmp: 0.6 + rng() * 1.2,
      bobFreq: 0.5 + rng() * 0.7,
      phase: rng() * Math.PI * 2
    };
    craft.rotation.y = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(craft);
    fleet.push({ craft, lane });
  }

  return {
    fleet,
    update(time) {
      for (const { craft, lane } of fleet) {
        const z = lane.z0 + Math.sin(time * 0.05 + lane.phase) * 60
                + lane.dir * ((time * lane.speed) % 240 - 120);
        craft.position.set(
          lane.x + Math.sin(time * 0.13 + lane.phase) * 4,
          lane.y + Math.sin(time * lane.bobFreq + lane.phase) * lane.bobAmp,
          z
        );
      }
      /* nav-light blink rhythm, deterministic */
      const blink = Math.sin(time * 6) > 0.4 ? 1 : 0.15;
      for (const { craft } of fleet)
        for (const light of craft.userData.blink)
          light.material.color.setScalar(blink);
    }
  };
}

/* ------------------------------------------------------------------
   ROBOT — dormant 4.3 m mech for Scene 02 "The Awakening".

   Procedural stand-in that mirrors the dimensions of the Blender
   robot.glb (blender/generate_assets.py, root at ground between feet)
   so the GLB can replace it through loadRobot() with zero re-blocking
   of camera keyframes. energize() drives the blue power-up sequence:
   core -> spine -> arms -> legs -> visor, deterministic timings.
   ------------------------------------------------------------------ */

const ROBOT_CENTER = new THREE.Vector3(0, 0, 10);

function makeRobot() {
  const g = new THREE.Group();
  g.position.copy(ROBOT_CENTER);

  const hull  = mat(0x0e121a, { roughness: 0.35, metalness: 0.85 });
  const panel = mat(0x28303e, { roughness: 0.55, metalness: 0.35 });
  const makeEnergy = () => new THREE.MeshStandardMaterial({
    color: 0x0a1e33, emissive: 0x4da6ff, emissiveIntensity: 0.0,
    roughness: 0.2, metalness: 0.1
  });

  const add = (geo, m, x, y, z, s = null) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    if (s) mesh.scale.set(...s);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  const addE = (geo, x, y, z, bucket = null) => {
    const mesh = add(geo, makeEnergy(), x, y, z);
    if (bucket) bucket.push(mesh);
    return mesh;
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  const legsE = [], armsE = [];

  /* dormant stance: slight slump, arms hanging */
  for (const side of [-1, 1]) {
    add(B(0.34, 0.8, 0.34), hull, side * 0.30, 1.25, 0);
    add(B(0.30, 0.8, 0.30), panel, side * 0.33, 0.5, 0.05);
    add(B(0.44, 0.2, 0.7), hull, side * 0.33, 0.1, 0.12);
    addE(B(0.08, 0.7, 0.34), side * 0.25, 0.88, 0.18, legsE);

    add(new THREE.SphereGeometry(0.26, 14, 12), hull, side * 0.95, 3.2, 0);
    add(B(0.24, 0.7, 0.24), hull, side * 1.02, 2.7, 0);
    add(new THREE.SphereGeometry(0.16, 12, 10), panel, side * 1.05, 2.35, 0);
    add(B(0.2, 0.6, 0.2), panel, side * 1.06, 2.0, 0.02);
    add(B(0.24, 0.26, 0.2), hull, side * 1.06, 1.62, 0.04);
    addE(B(0.07, 0.6, 0.2), side * 1.14, 2.35, 0.12, armsE);
  }

  add(B(0.9, 0.34, 0.5), hull, 0, 1.78, 0);
  add(B(0.7, 0.34, 0.45), hull, 0, 2.0, 0);
  add(B(1.5, 0.8, 0.7), panel, 0, 2.45, 0);
  const core = addE(new THREE.SphereGeometry(0.18, 18, 14), 0, 2.5, 0.34);
  const spine = addE(B(0.1, 0.7, 0.2), 0, 2.2, 0.36);

  add(B(0.5, 0.34, 0.34), hull, 0, 1.7, 0);
  const head = new THREE.Group();
  head.position.set(0, 3.55, 0.02);
  head.rotation.x = 0.14;                       /* dormant: chin down */
  const skull = new THREE.Mesh(B(0.56, 0.42, 0.6), hull);
  skull.castShadow = true;
  const visor = new THREE.Mesh(B(0.42, 0.1, 0.06), makeEnergy());
  visor.position.set(0, 0.05, 0.31);
  head.add(skull, visor);
  g.add(head);

  /* core light: ramps during energize, casts the blue glow on the hall */
  const coreLight = new THREE.PointLight(0x4da6ff, 0, 25, 2);
  coreLight.position.set(0, 2.5, 1.1);
  g.add(coreLight);

  const channels = {
    core: [core], spine: [spine], arms: armsE, legs: legsE,
    visor: [visor]
  };
  g.userData = { channels, coreLight, head, visor };
  return g;
}

export function buildRobot(scene) {
  const robot = makeRobot();
  scene.add(robot);
  return robot;
}

/* Try to swap in the Blender-produced robot.glb; resolve to the
   procedural rig when the asset is absent (asset-free development). */
export async function loadRobot(scene) {
  const procedural = buildRobot(scene);
  try {
    const glbScene = await loadModel('assets/models/robot.glb');
    if (glbScene) {
      glbScene.position.copy(ROBOT_CENTER);
      scene.add(glbScene);
      procedural.visible = false;
      return { rig: procedural, glb: glbScene, usingGlb: true };
    }
  } catch (e) {
    /* fall through to procedural */
  }
  return { rig: procedural, glb: null, usingGlb: false };
}

/* SEQUENCE (deterministic, matches CUES.ROBOT_ENERGIZE @ 10.0s):
   10.0-11.0 core + spine, 10.3-11.3 arms, 10.5-11.5 legs,
   13.3-13.6 visor slit ignites (head lifts 0.14 -> 0.02 rad over 12.5-13.5) */
export function energizeRobot(robot, t, time) {
  const u = Math.max(0, t - 10.0);
  const ramp = (start, dur = 1.0) =>
    Math.min(Math.max((u - start) / dur, 0), 1);
  const ch = robot.userData.channels;

  const set = (mats, k, base = 1.6) =>
    mats.forEach(m => { m.material.emissiveIntensity = k * base; });

  const pulse = 1 + Math.sin(time * 5.2) * 0.12;
  set(ch.core, ramp(0.0) * pulse);
  set(ch.spine, ramp(0.2, 0.8) * pulse);
  set(ch.arms, ramp(0.3, 1.0), 1.2);
  set(ch.legs, ramp(0.5, 1.0), 1.2);
  robot.userData.coreLight.intensity = ramp(0.0) * 90 * pulse;

  const headRise = ramp(2.5, 1.0);
  robot.userData.head.rotation.x = 0.14 - headRise * 0.12;
  const visorM = ch.visor[0].material;
  visorM.emissiveIntensity = ramp(3.0, 1.5) * 4.0;
  visorM.color.setHex(ramp(3.0) > 0.8 ? 0xbfe4ff : 0x0a1e33);
}
