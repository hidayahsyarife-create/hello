/* NEON GENESIS — THE LAST SIGNAL
   main.js — bootstrap and render loop for the cinematic experience.

   Phase 4/5 scope: full 40s storyboard live on the master Timeline —
   S01 city flyover, S02 robot awakening, S03 holographic interface,
   S04 collapse storm, S05 final transmission and titles.
   GSAP choreographs the DOM overlay (src/animation.js); the 3D camera
   stays on the deterministic rig (src/camera.js). */

import * as THREE from 'three';

import { Timeline, DURATION } from './timeline.js';
import { flashEnvelope } from './lighting.js';
import { setupAnimation } from './animation.js';
import { createSignalBus } from './phaser/signalBus.js';
import { createScene, createRenderer } from './scene.js';
import { CameraRig } from './camera.js';
import { setupLighting } from './lighting.js';
import { Rain, Signal } from './particles.js';
import { buildEnvironment, buildFacility } from './three/environment.js';
import { buildSkyDome, FogController, buildLastSource } from './three/effects.js';
import { buildHologram } from './three/hologram.js';
import { buildTraffic, buildRobot, energizeRobot } from './three/models.js';

/* ---------- bootstrap ---------- */
const stage = document.getElementById('stage');
const renderer = createRenderer();
stage.appendChild(renderer.domElement);

const scene = createScene();
const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 1000);

function resizeTo169() {
  const w = window.innerWidth, h = window.innerHeight;
  const aspect = 16 / 9;
  let rw = w, rh = w / aspect;
  if (rh > h) { rh = h; rw = h * aspect; }
  renderer.setSize(rw, rh, false);
  renderer.domElement.style.width = rw + 'px';
  renderer.domElement.style.height = rh + 'px';
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resizeTo169);
resizeTo169();

/* ---------- world ---------- */
const rig = new CameraRig(camera);
const lighting = setupLighting(scene);
const env = buildEnvironment(scene);          /* S01+S04 city */
const facility = buildFacility(scene);        /* S02+S03 hall */
const holo = buildHologram(scene);            /* S03 interface */
const sky = buildSkyDome(scene);
const fogCtl = new FogController(scene);
const rain = new Rain({ count: 7000, area: 90, height: 110 });
const signal = new Signal();
const traffic = buildTraffic(scene, { count: 7 });
const robot = buildRobot(scene);              /* GLB swap via loadRobot() in Phase 2 integration */
const lastSource = buildLastSource(scene);    /* S05 */
scene.add(rain.group, signal.group);

/* ---------- Phaser interface bus (Phase 6) ----------
   One bus, one contract (src/phaser/signalBus.js). The cinema
   publishes energy readouts + panel visibility every frame; the
   decoder panel publishes user taps back. Loaded lazily. */
const bus = createSignalBus();
let lastSourceBoost = 0;   /* decoder:boost surges the SIGNAL decode readout */
bus.on('decoder:boost', () => { lastSourceBoost = timeline.time + 0.6; });

const panelSlot = document.getElementById('decoder-slot');
function decoderLevel(t) {
  if (t < 7)   return Math.min(Math.max((t - 5) / 2, 0), 1);       /* sky signal   */
  if (t < 14)  return Math.min(Math.max((t - 10) / 3, 0), 1);      /* energize     */
  if (t < 22)  return Math.min(Math.max((t - 16) / 2, 0), 1);      /* decode       */
  return Math.min(Math.max((t - 32) / 2, 0), 1);                   /* final source */
}
function publishPanelLevels(t) {
  const boost = t < lastSourceBoost ? 0.3 : 0;
  bus.emit('panel:levels', {
    signal: Math.min(1, decoderLevel(t) + boost),
    grid: t < 22 ? 1 : 1 - blackoutProgress(t),
    core: t < 32 ? 0 : Math.min(Math.max((t - 32) / 2, 0), 1)
  });
}
async function bootDecoderPanel() {
  try {
    const { attachSignalDecoder } = await import('./phaser/interactive.js');
    attachSignalDecoder(panelSlot, bus);
  } catch (e) {
    /* panel is auxiliary; the cinema runs regardless */
    panelSlot.style.display = 'none';
  }
}

/* ---------- timeline wiring ---------- */
const timeline = new Timeline();
timeline.on('cue:SIGNAL_APPEAR', () => signal.appear());
timeline.on('cue:ROBOT_ENERGIZE', () => facility.setEnergized(true));
timeline.on('cue:SILENCE', () => signal.dim());
setupAnimation(timeline, { holo, lastSource });

/* ---------- per-segment visibility ---------- */
let panelShown = null;

function applyVisibility(t) {
  const inCity = t < 7 || (t >= 22 && t < 32);
  env.group.visible = inCity;
  facility.group.visible = t >= 7 && t < 14;
  holo.group.visible = t >= 14 && t < 22;
  robot.visible = t >= 7 && t < 14;
  lastSource.group.visible = t >= 32;
  rain.group.visible = t < 7 || (t >= 22 && t < 32);
  signal.group.visible = t < 7;
  traffic.fleet.forEach(({ craft }) => { craft.visible = inCity; });
  sky.visible = inCity;                       /* interior + void: no sky dome */
}

/* exposure grade per beat; storm lightning lifts exposure deterministically */
function applyExposure(t) {
  let e = t < 7 ? 1.0 : t < 14 ? 0.88 : t < 22 ? 1.0 : t < 32 ? 0.92 : 1.0;
  if (t >= 22 && t < 32) e += 0.55 * flashEnvelope(t);
  if (t >= 35) e -= Math.min((t - 35) / 4, 1) * 0.25;  /* final burn-down */
  renderer.toneMappingExposure = e;
}

/* city blackout cascade progress for S04 (0..1 over 8s) */
function blackoutProgress(t) {
  return Math.min(Math.max((t - 22) / 8, 0), 1);
}

/* ---------- UI gates ---------- */
const startEl = document.getElementById('start');
const clock = new THREE.Clock();
let started = false;

/* ---------- deterministic capture mode (Phase 8) ----------
   ?capture=1&fps=30 → real-time stepping with the timeline pinned to
   the wall clock at exactly 1/fps, MediaRecorder on the WebGL canvas
   (captureStream(0) + requestFrame per rendered frame). Produces a
   silent .webm that python/render_video.py grades, muxes and encodes
   to the final 1920x1080/30fps H.264 MP4. */
const params = new URLSearchParams(location.search);
const CAPTURE = params.get('capture') === '1';
const CAPTURE_FPS = Math.min(Number(params.get('fps')) || 30, 60);
const TIMESTEP = CAPTURE ? 1 / CAPTURE_FPS : null;
let recorder = null, recorderTrack = null, captureTimer = null;

function startCapture() {
  if (!CAPTURE || !renderer.domElement.captureStream) return;
  const stream = renderer.domElement.captureStream(0);
  recorderTrack = stream.getVideoTracks()[0];
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) || '';
  recorder = new MediaRecorder(stream, {
    mimeType: mime, videoBitsPerSecond: 24_000_000
  });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mime || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'neon-genesis_capture.webm'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  recorder.start();
  document.getElementById('rec').style.display = 'block';
  /* stop after 40s of wall clock + safety margin */
  captureTimer = setTimeout(() => recorder && recorder.state !== 'inactive' && recorder.stop(),
    (DURATION + 0.5) * 1000);
}

function loop() {
  requestAnimationFrame(loop);
  if (!started) return;

  const dt = TIMESTEP
    ? TIMESTEP                                  /* capture mode: pinned timestep */
    : Math.min(clock.getDelta(), 0.05);
  const t = timeline.advance(dt);

  rig.update(t);
  lighting.setMood(t);
  fogCtl.update(t);
  applyVisibility(t);
  applyExposure(t);
  env.update(t, blackoutProgress(t));
  traffic.update(t);
  if (t >= 7 && t < 14) energizeRobot(robot, t, t);
  holo.update(t);
  rain.update(dt, t, camera.position);
  signal.update(dt, t);
  facility.update(t);
  lastSource.update(t);

  /* decoder panel lives from S02 until the final burn */
  const panelVisible = t >= 7 && t < 35;
  if (panelVisible !== panelShown) {
    panelShown = panelVisible;
    bus.emit('panel:visible', { visible: panelVisible });
  }
  publishPanelLevels(t);

  renderer.render(scene, camera);

  if (CAPTURE && recorderTrack && recorder && recorder.state === 'recording')
    recorderTrack.requestFrame();

  if (timeline.time >= DURATION) {
    timeline.reset();   /* loop; GSAP resets via the segment hook */
    if (CAPTURE && captureTimer) clearTimeout(captureTimer);
  }
}
loop();

startEl.addEventListener('click', () => {
  startEl.style.display = 'none';
  document.getElementById('letterbox').classList.add('active');
  clock.getDelta();
  started = true;
  bootDecoderPanel();
  startCapture();
}, { once: true });
