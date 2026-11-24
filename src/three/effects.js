/* NEON GENESIS — THE LAST SIGNAL
   three/effects.js — atmosphere: gradient night sky dome + fog controller.
*/

import * as THREE from 'three';

/* Night-sky dome with a vertical gradient, drawn by a minimal shader so
   no texture asset is required. */
export function buildSkyDome(scene) {
  const geo = new THREE.SphereGeometry(500, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x030509) },
      horizon: { value: new THREE.Color(0x16233d) }
    },
    vertexShader: /* glsl */`
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 top;
      uniform vec3 horizon;
      varying vec3 vPos;
      void main() {
        float h = clamp(normalize(vPos).y, 0.0, 1.0);
        gl_FragColor = vec4(mix(horizon, top, pow(h, 0.6)), 1.0);
      }`
  });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);
  return dome;
}

/* Volumetric fog driver: density keyed to storyboard beats so Scene 01
   reads as deep ravine haze and later scenes re-grade consistently. */
export class FogController {
  constructor(scene) {
    this.fog = scene.fog;
    this.base = new THREE.Color(0x070a12);
  }

  update(time) {
    if (time < 7) {
      const signalRise = Math.min(Math.max((time - 5) / 2, 0), 1);
      this.fog.density = 0.0115 - signalRise * 0.002;   /* signal pushes haze back */
      this.fog.color.copy(this.base).lerp(new THREE.Color(0x0c1626), signalRise);
    } else if (time < 14) {
      /* S02: enclosed hall — thicker, darker, slightly colder */
      this.fog.density = 0.028;
      this.fog.color.setHex(0x04060b);
    } else if (time < 22) {
      /* S03: holo haze — medium, slightly cyan-lifted */
      this.fog.density = 0.020;
      this.fog.color.setHex(0x050810);
    } else if (time < 32) {
      /* S04: storm air — thin but grim */
      this.fog.density = 0.014;
      this.fog.color.setHex(0x0a0d16);
    } else {
      /* S05: void — dense dark swallow */
      this.fog.density = 0.05;
      this.fog.color.setHex(0x010204);
    }
  }
}

/* ------------------------------------------------------------------
   LAST SOURCE — Scene 05 "Final Transmission" (32-40s).
   After the collapse everything dies; a single compact energy
   signature remains. Camera approaches in SHOT_S05; swell(v) is
   tweened by GSAP near FINAL_TITLE so the screen can burn to black.
   ------------------------------------------------------------------ */

export function buildLastSource(scene) {
  const g = new THREE.Group();
  g.position.set(0, 4, 0);
  g.visible = false;

  const mkShell = (r, oc, op) => new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 18),
    new THREE.MeshBasicMaterial({
      color: oc, transparent: true, opacity: op,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  const core = mkShell(0.55, 0xe8f4ff, 0.95);
  const shellA = mkShell(0.85, 0x9fd8ff, 0.30);
  const shellB = mkShell(1.25, 0x4da6ff, 0.14);
  const halo = new THREE.PointLight(0x9fd8ff, 320, 70, 2);

  const sparkRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.012, 8, 60),
    new THREE.MeshBasicMaterial({
      color: 0xbfe4ff, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  sparkRing.rotation.x = Math.PI / 2.3;

  g.add(core, shellA, shellB, sparkRing, halo);
  scene.add(g);

  let swell = 0;   /* 0 idle -> 1 burn-out */
  return {
    group: g,
    setSwell(v) { swell = v; },
    update(time) {
      const idle = 1 + Math.sin(time * 1.1) * 0.07;
      const k = idle * (1 + swell * 2.6);
      core.scale.setScalar(k);
      shellA.scale.setScalar(k * (1 + Math.sin(time * 0.7) * 0.05));
      shellB.scale.setScalar(k * (1 + Math.sin(time * 0.5 + 1) * 0.07));
      halo.intensity = (320 + Math.sin(time * 1.3) * 60) * (1 + swell * 2.0);
      sparkRing.rotation.z = time * 0.6 + Math.sin(time * 0.8) * 0.25;
      sparkRing.scale.setScalar(k * (0.9 + Math.sin(time * 1.9) * 0.25));
      const burn = 0.4 * swell;
      core.material.color.setRGB(0.91 + burn, 0.96, 1.0);
    }
  };
}
