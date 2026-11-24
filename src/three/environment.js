/* NEON GENESIS — THE LAST SIGNAL
   three/environment.js — procedural midnight megacity.

   Deterministic seeded generation so every render is identical:
   instanced tower blocks with procedurally lit window textures,
   wet reflective street, avenue lane kept clear for the camera,
   and flickering neon signage. No external model files needed for
   Scene 01; Blender-produced GLB assets will slot in via models.js. */

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

function windowTexture(seed) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  const rng = mulberry32(seed);
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, c.width, c.height);
  const cols = 8, rows = 24;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (rng() < 0.42) {
        const warm = rng();
        const r = Math.floor(120 + warm * 135);
        const g = Math.floor(150 + rng() * 90);
        const b = Math.floor(160 + rng() * 95);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.55 + rng() * 0.45})`;
        ctx.fillRect(x * 16 + 3, y * 10 + 2, 9, 6);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function neonSignTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = 'bold 44px "Arial Black", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = color; ctx.shadowBlur = 24;
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 50);
  ctx.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const NEON_WORDS = [
  ['SIGNAL', '#ff2d95'], ['日 NIGHT', '#00e5ff'], ['NEO-9', '#ff9d2e'],
  ['密 DATA', '#b44dff'], ['ORBIT', '#2dff7a'], ['AXIS', '#00e5ff']
];

export function buildEnvironment(scene) {
  const rng = mulberry32(40);
  const city = new THREE.Group();

  /* --- wet street --- */
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.18, metalness: 0.85 })
  );
  street.rotation.x = -Math.PI / 2;
  street.receiveShadow = true;
  city.add(street);

  /* faint lane markings running down the avenue */
  const laneMat = new THREE.MeshBasicMaterial({ color: 0x2c3a55 });
  for (let i = 0; i < 26; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 4), laneMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.02, 60 - i * 5);
    city.add(dash);
  }

  /* --- towers: instanced bodies + individual window materials --- */
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  const towerCount = 120;
  const towers = [];
  for (let i = 0; i < towerCount; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const laneX = side * (11 + rng() * 55);
    const z = 90 - rng() * 260;
    const w = 7 + rng() * 10;
    const d = 7 + rng() * 10;
    const h = 25 + Math.pow(rng(), 1.6) * 95;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x11141d,
      roughness: 0.55,
      metalness: 0.35,
      emissive: 0xffffff,
      emissiveMap: windowTexture(i * 977 + 13),
      emissiveIntensity: 0.55 + rng() * 0.25
    });
    const m = new THREE.Mesh(towerGeo, mat);
    m.position.set(laneX, h / 2, z);
    m.scale.set(w, h, d);
    m.castShadow = true; m.receiveShadow = true;
    city.add(m);
    towers.push({ mesh: m, flickerSeed: rng() * 100 });
  }

  /* far skyline silhouette (cheap depth behind the main canyon) */
  const farMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d15, roughness: 1, metalness: 0,
    emissive: 0x223047, emissiveIntensity: 0.25
  });
  const far = new THREE.InstancedMesh(towerGeo, farMat, 90);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 90; i++) {
    const x = (rng() - 0.5) * 460;
    const z = -150 - rng() * 220;
    const w = 14 + rng() * 22, h = 40 + rng() * 130;
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(w, h, w);
    dummy.updateMatrix();
    far.setMatrixAt(i, dummy.matrix);
  }
  city.add(far);

  /* --- neon signs on near-canyon faces --- */
  const signs = [];
  for (let i = 0; i < NEON_WORDS.length; i++) {
    const [word, color] = NEON_WORDS[i];
    const tex = neonSignTexture(word, color);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 3.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const side = i % 2 === 0 ? -1 : 1;
    sign.position.set(side * 10.5, 7 + rng() * 16, 34 - i * 14 - rng() * 6);
    sign.rotation.y = side * -Math.PI / 2 ;
    sign.rotation.y += (side < 0 ? 1 : -1) * 0.0;   /* face the avenue */
    city.add(sign);
    signs.push({ mesh: sign, seed: rng() * 10, broken: rng() < 0.35 });
  }

  scene.add(city);

  return {
    group: city,
    towers, signs,
    update(time, blackout = 0) {
      /* window shimmer with district blackout cascade during S04:
         districts die in a deterministic wave (stagger key by index) */
      for (let i = 0; i < towers.length; i++) {
        const t = towers[i];
        const k = ((i * 7) % 13) / 13;
        const die = blackout <= 0 ? 1
          : blackout >= k + 0.08 ? 0.05
          : Math.max(0.05, 1 - (blackout - k) / 0.08);
        t.mesh.material.emissiveIntensity =
          (0.55 + 0.08 * Math.sin(time * 0.5 + t.flickerSeed)) * die;
      }
      /* neon signage: flicker while alive, then dies with the grid */
      for (const s of signs) {
        const base = 1 - blackout;
        if (s.broken) {
          const f = Math.sin(time * 13 + s.seed) * Math.sin(time * 7.3 + s.seed * 2);
          s.mesh.material.opacity = base * (f > -0.2 ? 1 : 0.25);
        } else {
          s.mesh.material.opacity = base * (1 + Math.sin(time * 2 + s.seed) * 0.05);
        }
      }
    }
  };
}

/* ------------------------------------------------------------------
   FACILITY — abandoned industrial hall for Scene 02 (7-14s).
   Centered at origin; the dormant robot stands at (0,0,10).
   Collapsed ceiling opening above the robot admits two cold light
   shafts (additive cones) that read as volumetrics under the fog.
   ------------------------------------------------------------------ */

export function buildFacility(scene) {
  const rng = mulberry32(404);
  const hall = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6, metalness: 0.25 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  hall.add(floor);

  /* standing water puddles around the robot (high-gloss discs) */
  const puddleMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d13, roughness: 0.05, metalness: 0.9
  });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.2 + rng() * 1.8, 20), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set((rng() - 0.5) * 22, 0.015, 10 + (rng() - 0.5) * 18);
    hall.add(p);
  }

  /* pillar ring + wall slabs */
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.95 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const r = 26;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 15, 12), pillarMat);
    p.position.set(Math.cos(a) * r, 7.5, Math.sin(a) * r + 8);
    p.castShadow = true;
    hall.add(p);
  }
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x111319, roughness: 0.9, metalness: 0.2,
    emissive: 0x0d1420, emissiveIntensity: 0.4,
    emissiveMap: windowTexture(777)
  });
  wallMat.emissiveMap.wrapS = wallMat.emissiveMap.wrapT = THREE.RepeatWrapping;
  for (const [w, x, z, ry] of [
    [60, 0, -24, 0], [60, -30, 8, Math.PI / 2], [60, 30, 8, -Math.PI / 2]
  ]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, 15), wallMat);
    wall.position.set(x, 7.5, z);
    wall.rotation.y = ry;
    hall.add(wall);
  }

  /* broken catwalk ring segments overhead */
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x1c202a, roughness: 0.5, metalness: 0.7 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 1.6), deckMat);
    seg.position.set(Math.cos(a) * 16, 9, Math.sin(a) * 16 + 8);
    seg.rotation.y = -a + Math.PI / 2;
    seg.rotation.z = (rng() - 0.5) * 0.12;
    hall.add(seg);
  }

  /* hanging cables (catmull tubes) between catwalks and pillars */
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    const r1 = 12 + rng() * 10, r2 = 16 + rng() * 8;
    const y1 = 8 + rng() * 3, y2 = 7 + rng() * 3;
    const sag = 1.5 + rng() * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * r1, y1, Math.sin(a) * r1 + 8),
      new THREE.Vector3(Math.cos(a) * ((r1 + r2) / 2), Math.max(y1, y2) - sag, Math.sin(a) * ((r1 + r2) / 2) + 8),
      new THREE.Vector3(Math.cos(a + 0.4) * r2, y2, Math.sin(a + 0.4) * r2 + 8)
    ]);
    hall.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.045, 6), cableMat));
  }

  /* rubble cluster near walls */
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 1 });
  for (let i = 0; i < 22; i++) {
    const rb = new THREE.Mesh(
      new THREE.BoxGeometry(0.3 + rng() * 1.1, 0.2 + rng() * 0.5, 0.3 + rng() * 1.1), rubbleMat);
    const a = rng() * Math.PI * 2;
    const r = 8 + rng() * 15;
    rb.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r + 8);
    rb.rotation.set(rng(), rng(), rng());
    rb.castShadow = true;
    hall.add(rb);
  }

  /* volumetric light shafts from the ceiling breach above the robot */
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0x86c8ff, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const shaftA = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 4.6, 15, 20, 1, true), shaftMat.clone());
  shaftA.position.set(0, 7.5, 10);
  hall.add(shaftA);
  const shaftB = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.6, 15, 18, 1, true), shaftMat.clone());
  shaftB.position.set(2.4, 7.5, 12.2);
  hall.add(shaftB);

  /* cold top spot on the dormant machine + faint fill */
  const topSpot = new THREE.SpotLight(0x86c8ff, 260, 60, 0.34, 0.7, 1.8);
  topSpot.position.set(0, 22, 16);
  topSpot.target.position.set(0, 2.5, 10);
  topSpot.castShadow = true;
  topSpot.shadow.mapSize.set(1024, 1024);
  hall.add(topSpot, topSpot.target);
  const fill = new THREE.PointLight(0x2b3a55, 30, 50, 2);
  fill.position.set(-8, 5, 20);
  hall.add(fill);

  scene.add(hall);

  return {
    group: hall,
    shafts: [shaftA, shaftB],
    update(time) {
      /* shafts breathe faintly; getEnergized set from the Timeline cue */
      const k = this._energized ? 1 : 0.45;
      for (let i = 0; i < this.shafts.length; i++) {
        const s = this.shafts[i];
        s.material.opacity = (i === 0 ? 0.10 : 0.06) * k *
          (0.85 + Math.sin(time * 0.9 + i * 1.7) * 0.15);
      }
    },
    setEnergized(on) { this._energized = on; }
  };
}
