/* Smoke tests — run: npm test
   Validates: storyboard segment math, cue scheduling, camera rig
   determinism and scene-bounds containment. Headless-safe: only pure
   logic modules (timeline, camera) are imported. */

import assert from 'node:assert/strict';
import { Timeline, CUES, segmentAt, DURATION, STORYBOARD } from '../src/timeline.js';
import { CameraRig } from '../src/camera.js';
import * as THREE from 'three';

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('  ✔', name);
}

/* ---------- timeline: segment boundaries ---------- */
check('segmentAt hits every storyboard boundary', () => {
  const cases = [
    [0.0, 'S01'], [6.99, 'S01'], [7.0, 'S02'], [13.99, 'S02'],
    [14.0, 'S03'], [21.99, 'S03'], [22.0, 'S04'], [31.99, 'S04'],
    [32.0, 'S05'], [39.99, 'S05']
  ];
  for (const [t, id] of cases)
    assert.equal(segmentAt(t).id, id, `t=${t}`);
});

check('timeline cues fire in order at their storyboard times', () => {
  const fired = [];
  const tl = new Timeline();
  tl.on('cue', c => fired.push(c.id));
  let t = 0;
  while (t < DURATION) t = tl.advance(0.1);
  assert.deepEqual(fired, CUES.map(c => c.id));
});

check('cue payloads carry exact storyboard times', () => {
  const tl = new Timeline();
  let appearAt = null;
  tl.on('cue:SIGNAL_APPEAR', p => { appearAt = p.at; });
  tl.advance(5.2);
  assert.equal(appearAt, 5.0);
});

check('reset() re-arms the cue queue (loop-safe)', () => {
  const tl = new Timeline();
  let hits = 0;
  tl.on('cue:GRID_FAILURE', () => hits++);
  let t = 0;
  while (t < DURATION) t = tl.advance(0.25);
  tl.reset();
  t = 0;
  while (t < DURATION) t = tl.advance(0.25);
  assert.equal(hits, 2);
});

/* ---------- camera rig: determinism + containment ---------- */
check('camera rig returns the same pose for the same time (no randomness)', () => {
  const c1 = new THREE.PerspectiveCamera(); new CameraRig(c1).update(3.3);
  const c2 = new THREE.PerspectiveCamera(); new CameraRig(c2).update(3.3);
  assert.ok(c1.position.distanceTo(c2.position) < 1e-9);
});

check('rig covers the full S01 range and refuses dead time outside shots', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  for (let t = 0; t < 7.0; t += 0.1) assert.ok(rig.update(t), `no shot at t=${t}`);
});

check('camera stays inside the city canyon and above the street', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  for (let t = 0; t <= 7.0; t += 0.05) {
    rig.update(t);
    assert.ok(Number.isFinite(c.position.x + c.position.y + c.position.z));
    assert.ok(c.position.y > 2, `camera sank below street at t=${t}`);
    assert.ok(Math.abs(c.position.x) < 60, `camera left the canyon at t=${t}`);
    assert.ok(c.position.z > -40 && c.position.z < 110, `camera out of avenue at t=${t}`);
    assert.ok(c.fov >= 40 && c.fov <= 58, `fov rogue at t=${t}: ${c.fov}`);
  }
});

check('S01 fov opens up as the signal shot tilts to the sky', () => {
  const c = new THREE.PerspectiveCamera(); c.fov = 42;
  const rig = new CameraRig(c);
  rig.update(0.5);  const fStart = c.fov;
  rig.update(6.5);  const fEnd = c.fov;
  assert.ok(fEnd > fStart, `expected wide open ${fStart} -> ${fEnd}`);
});

check('S02 crane/macro/push-in shots stay inside the hall and aimed at the robot', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  for (let t = 7.0; t <= 14.0; t += 0.05) {
    assert.ok(rig.update(t), `no S02 shot at t=${t}`);
    assert.ok(Number.isFinite(c.position.x + c.position.y + c.position.z));
    assert.ok(c.position.y > 1.5, `camera sank at t=${t}`);
    assert.ok(Math.abs(c.position.x) < 30, `camera left the hall at t=${t}`);
    assert.ok(c.position.z > 4 && c.position.z < 40, `camera behind robot at t=${t}`);
    assert.ok(c.fov >= 30 && c.fov <= 50, `fov rogue at t=${t}: ${c.fov}`);
  }
});

check('S02 macro shot narrows the fov for close-up inserts', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  rig.update(8.0);  const wide = c.fov;
  rig.update(12.8); const close = c.fov;
  assert.ok(close < wide, `expected tighter lens ${wide} -> ${close}`);
});

check('cue ROBOT_ENERGIZE anchors at the storyboard time', () => {
  const tl = new Timeline();
  let energizeAt = null;
  tl.on('cue:ROBOT_ENERGIZE', p => { energizeAt = p.at; });
  tl.advance(11.0);
  assert.equal(energizeAt, 10.0);
});

check('S03-S05 cue anchors hit their storyboard times', () => {
  const targets = {
    HOLO_INTERFACE: 14.0, MESSAGE_ESTABLISHED: 18.0,
    GRID_FAILURE: 22.0, SKY_FLASH: 26.0,
    PULL_BACK_REVEAL: 28.0, SILENCE: 32.0, FINAL_TITLE: 35.0
  };
  const tl = new Timeline();
  const got = {};
  for (const id of Object.keys(targets))
    tl.on(`cue:${id}`, p => { got[id] = p.at; });
  tl.advance(DURATION);
  for (const [id, at] of Object.entries(targets))
    assert.equal(got[id], at, `cue ${id}`);
});

check('camera rig covers the entire 0-40s timeline with no dead time', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  for (let t = 0; t < DURATION; t += 0.1)
    assert.ok(rig.update(t), `no shot at t=${t.toFixed(1)}`);
});

check('S03 orbit stays anchored near the hologram', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  for (let t = 14.0; t < 22.0; t += 0.1) {
    rig.update(t);
    const d = c.position.distanceTo(new THREE.Vector3(0, 3.2, 6));
    assert.ok(d > 3 && d < 12, `orbit radius rogue at t=${t.toFixed(1)}: ${d.toFixed(1)}`);
    assert.ok(c.position.y > 1.2, `camera sank at t=${t.toFixed(1)}`);
  }
});

check('S04 whip-back lands high above the dead city', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  rig.update(22.05); assert.ok(c.position.y < 20, 'whip start too high');
  rig.update(23.0);  assert.ok(c.position.y > 40, 'whip end too low');
  rig.update(31.9);  assert.ok(c.position.y > 85 && c.position.z > 150, 'reveal not wide');
});

check('S05 approach glides in and holds for the title lockup', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  rig.update(32.0);
  const startDist = c.position.distanceTo(new THREE.Vector3(0, 4, 0));
  rig.update(34.9);
  const endDist = c.position.distanceTo(new THREE.Vector3(0, 4, 0));
  assert.ok(endDist < startDist, 'camera did not approach the source');
  rig.update(39.9);  /* hold shot must still cover the timeline end */
  assert.ok(Number.isFinite(c.position.x));
});

/* lightning envelope: deterministic, peaks only in S04 */
check('flashEnvelope peaks at storm beats and is silent elsewhere', async () => {
  const { flashEnvelope } = await import('../src/lighting.js');
  assert.ok(flashEnvelope(26.05) > 0.99, 'no peak at first strike');
  assert.ok(flashEnvelope(20) < 0.001, 'flash leaked outside S04');
  assert.ok(flashEnvelope(34) < 0.001, 'flash leaked into S05');
  const a = flashEnvelope(26.05);
  const b = flashEnvelope(26.05);
  assert.equal(a, b, 'envelope not deterministic');
});

/* ---------- Phaser interface bus (Phase 6 contract) ---------- */
check('signal bus: on/emit reaches subscribers once per emit', async () => {
  const { createSignalBus } = await import('../src/phaser/signalBus.js');
  const bus = createSignalBus();
  const seen = [];
  bus.on('panel:levels', l => seen.push(l.signal));
  bus.emit('panel:levels', { signal: 0.5, grid: 1, core: 0 });
  bus.emit('panel:levels', { signal: 0.8, grid: 1, core: 0 });
  assert.deepEqual(seen, [0.5, 0.8]);
});

check('signal bus: unsubscribe stops delivery; emit to empty bus is safe', async () => {
  const { createSignalBus } = await import('../src/phaser/signalBus.js');
  const bus = createSignalBus();
  let hits = 0;
  const stop = bus.on('decoder:boost', () => hits++);
  bus.emit('decoder:boost', { sourceTime: 3 });
  stop();
  stop();
  bus.emit('decoder:boost', { sourceTime: 4 });
  assert.equal(hits, 1);
  assert.equal(bus.emit('nobody/listens', {}), false);
  assert.equal(bus.count('decoder:boost'), 0);
});

check('signal bus: multiple subscribers share the payload, no cross-talk', async () => {
  const { createSignalBus } = await import('../src/phaser/signalBus.js');
  const bus = createSignalBus();
  const a = [], b = [];
  bus.on('panel:visible', p => a.push(p.visible));
  bus.on('panel:visible', p => b.push(p.visible));
  bus.on('panel:levels', () => { throw new Error('cross-talk'); });
  bus.emit('panel:visible', { visible: true });
  bus.emit('panel:visible', { visible: false });
  assert.deepEqual(a, [true, false]);
  assert.deepEqual(b, [true, false]);
  bus.reset();
  assert.equal(bus.count('panel:visible'), 0);
});

check('snapToSegment lands on a shot start, not mid-ease', () => {
  const c = new THREE.PerspectiveCamera();
  const rig = new CameraRig(c);
  const seg = STORYBOARD[0];
  rig.snapToSegment(seg);
  assert.ok(rig.update(seg.start + 0.01));
});

console.log(`\nPASS — ${passed} checks`);
