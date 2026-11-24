/* NEON GENESIS — THE LAST SIGNAL
   particles.js — rain simulation (GPU points, camera-following volume)
   and the sky signal pulse. Deterministic particle seeding. */

import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeDropTexture() {
  /* vertical streak sprite drawn procedurally (no external assets) */
  const c = document.createElement('canvas');
  c.width = 16; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0.0, 'rgba(180,200,255,0)');
  grad.addColorStop(0.4, 'rgba(190,210,255,0.55)');
  grad.addColorStop(1.0, 'rgba(210,225,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(6, 0, 4, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Rain {
  constructor({ count = 7000, area = 90, height = 60 } = {}) {
    this.area = area; this.height = height;
    this.group = new THREE.Group();
    const rng = mulberry32(2077);

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (rng() - 0.5) * area;
      pos[i * 3 + 1] = rng() * height;
      pos[i * 3 + 2] = (rng() - 0.5) * area;
      spd[i] = 26 + rng() * 16;                    /* heavy rain fall speed */
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.speeds = spd;

    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      map: makeDropTexture(),
      size: 1.1,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }));
    this.points.frustumCulled = false;
    this.group.add(this.points);

    /* thin ground haze catching the rain light */
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(area * 2.4, area * 2.4),
      new THREE.MeshBasicMaterial({ color: 0x101828, transparent: true, opacity: 0.0 })
    );
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = 0.4;
    this.group.add(haze);
  }

  /* follows the camera so the volume is always around the shot */
  update(dt, time, cameraPos) {
    const p = this.points.geometry.attributes.position.array;
    const n = this.speeds.length;
    for (let i = 0; i < n; i++) {
      p[i * 3 + 1] -= this.speeds[i] * dt;
      p[i * 3]     += Math.sin(time * 0.6 + i * 0.37) * 2.2 * dt;   /* wind gust */
      if (p[i * 3 + 1] < -1) {
        p[i * 3 + 1] = this.height;
        p[i * 3]     = cameraPos.x + (Math.random() - 0.5) * this.area;
        p[i * 3 + 2] = cameraPos.z + (Math.random() - 0.5) * this.area;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.group.position.set(0, 0, 0);
  }
}

/* The Signal — vertical volumetric column + pulsing core in the sky.
   Inactive until the SIGNAL_APPEAR cue, then blooms over 1.5s. */
export class Signal {
  constructor(position = new THREE.Vector3(0, 120, -160)) {
    this.group = new THREE.Group();
    this.group.position.copy(position);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x9fd8ff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 7, 220, 24, 1, true), beamMat);
    this.beam.position.y = -110;
    this.group.add(this.beam);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xd8ecff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.core = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 18), coreMat);
    this.group.add(this.core);

    this.halo = new THREE.PointLight(0x9fd8ff, 0, 260, 2);
    this.group.add(this.halo);

    this.growth = 0;   /* 0..1 bloom factor */
  }

  appear() { this.targetBloom = 1; }
  dim()    { this.targetBloom = 0.35; }

  update(dt, time) {
    this.growth += ((this.targetBloom ?? 0) - this.growth) * Math.min(dt * 1.6, 1);
    const pulse = 0.85 + Math.sin(time * 2.4) * 0.15;
    this.beam.material.opacity = 0.5 * this.growth * pulse;
    this.beam.scale.set(1 + Math.sin(time * 1.7) * 0.06, 1, 1 + Math.sin(time * 1.7) * 0.06);
    this.core.material.opacity = 0.9 * this.growth * pulse;
    this.core.scale.setScalar(1 + Math.sin(time * 2.4) * 0.12);
    this.halo.intensity = 900 * this.growth * pulse;
  }
}
