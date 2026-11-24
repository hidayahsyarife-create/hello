/* NEON GENESIS — THE LAST SIGNAL
   three/hologram.js — Scene 03 holographic interface (14-22s).

   The professionally designed HUD (src/graphics/hud.svg) is mapped as
   the main holographic screen texture; additive geometry around it
   (base rings, orbiting halo, data pillars) sells the volumetric read.
   boot(p) is driven by GSAP from the HOLO_INTERFACE cue (animation.js),
   update(time) keeps it alive. All motion deterministic. */

import * as THREE from 'three';

const CYAN = 0x6fd3ff;

function glowMaterial(opacity = 0.5) {
  return new THREE.MeshBasicMaterial({
    color: CYAN, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
}

const HOLO_CENTER = new THREE.Vector3(0, 3.2, 6);

export function buildHologram(scene, textureUrl = 'src/graphics/hud.svg') {
  const g = new THREE.Group();
  g.position.copy(HOLO_CENTER);
  g.rotation.y = -0.15;
  g.visible = false;

  /* base rings on the floor of the hall */
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.035, 8, 72), glowMaterial(0.35));
  ringA.rotation.x = Math.PI / 2.06;
  ringA.position.y = -2.7;
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.025, 8, 72), glowMaterial(0.22));
  ringB.rotation.x = Math.PI / 1.9;
  ringB.position.y = -2.3;

  /* orbiting halo rings */
  const haloA = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.018, 8, 72), glowMaterial(0.3));
  haloA.rotation.x = Math.PI / 2;
  const haloB = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.014, 8, 60), glowMaterial(0.22));
  haloB.rotation.x = Math.PI / 1.8;

  /* main screen: the HUD SVG design */
  const screenMat = glowMaterial(0.0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.94), screenMat);
  screen.position.y = 0.55;
  screen.rotation.x = -0.05;
  if (textureUrl) {
    new THREE.TextureLoader().load(textureUrl, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      screenMat.map = tex;
      screenMat.needsUpdate = true;
    }, undefined, () => {/* asset absent: screen stays a clean additive panel */});
  }

  /* scanning bar sweeping the screen */
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.06), glowMaterial(0.0));
  scan.position.y = 0.55;

  /* data pillars around the base */
  const pillars = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const h = 0.5 + ((i * 37) % 10) / 10 * 1.5;
    const r = 4.2 + ((i * 13) % 7) / 7 * 0.8;
    const mat = glowMaterial(0.0);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05), mat);
    p.position.set(Math.cos(a) * r, -2.7 + h / 2, Math.sin(a) * r);
    p.userData.h = h;
    g.add(p);
    pillars.push({ mesh: p, mat, stagger: i / 12 });
  }

  g.add(ringA, ringB, haloA, haloB, screen, scan);

  const light = new THREE.PointLight(CYAN, 0, 18, 2);
  light.position.y = 0.5;
  g.add(light);

  scene.add(g);

  let bootP = 0;
  return {
    group: g,
    /* p: 0..1 — boot progress, tweened by GSAP from the HOLO_INTERFACE cue */
    boot(p) {
      bootP = Math.min(Math.max(p, 0), 1);
      const k = 0.55 + 0.45 * bootP;
      g.scale.setScalar(k);
      screenMat.opacity = 0.85 * bootP;
      ringA.material.opacity = 0.35 * bootP;
      ringB.material.opacity = 0.22 * bootP;
      light.intensity = 45 * bootP;
      for (const { mesh, mat, stagger } of pillars) {
        const local = Math.min(Math.max((bootP - stagger * 0.5) / 0.35, 0), 1);
        const rise = local * mesh.userData.h;
        mesh.scale.set(1, Math.max(local, 0.01), 1);
        mesh.position.y = -2.7 + rise / 2;
        mat.opacity = 0.5 * local;
      }
    },
    update(time) {
      haloA.rotation.z = time * 0.7;
      haloB.rotation.z = -time * 0.5;
      haloA.position.y = -0.6 + Math.sin(time * 0.9) * 0.25;
      haloB.position.y = -0.2 + Math.cos(time * 0.7) * 0.2;
      g.position.y = HOLO_CENTER.y + Math.sin(time * 0.8) * 0.07;
      /* scan sweep on the screen face */
      scan.material.opacity = 0.5 * bootP;
      const sweep = ((time * 0.35) % 1) * 3.2 - 1.6;
      scan.position.y = sweep + 0.55;
      if (screenMat.map) {
        screenMat.map.offset.y = 0.04 * Math.sin(time * 0.4);
        screenMat.map.offset.x = 0.02 * Math.sin(time * 0.23);
      }
    }
  };
}
