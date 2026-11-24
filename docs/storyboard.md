# NEON GENESIS — THE LAST SIGNAL
## Phase 1 — Locked Storyboard (40s @ 30fps, 1920×1080)

Every shot below is storyboard-anchored: camera keyframes, cue events and
grading changes pixel-map directly to the code constants in
`src/timeline.js` (`STORYBOARD`, `CUES`) and `src/camera.js`.

| Beat | Time | Segment | Shot / Action | Camera | Lighting & FX | Sound |
|------|------|---------|---------------|--------|---------------|-------|
| 01 | 0.0–2.5 | S01 THE SILENT CITY | Dolly forward high between towers, down the avenue | keyframes `SHOT_S01[0]` — pos (-14,58,96)→(-8,52,62), look down avenue | moon key 0x8fa3d8, neon fills (pink/cyan/amber/violet), rain 7000 pts, fog 0.0115 | deep sub drone, sparse rain layer |
| 02 | 2.5–4.5 | S01 | Descend canyon wall toward street level, headlights of traffic crossing | `SHOT_S01[1]` — touch ground level y≈14 | wet street reflections (metal street 0.85), broken neon flicker | rain + rumble intensify |
| 03 | 4.5–7.0 | S01 | Slow rise + tilt up as the SIGNAL ignites in the sky | `SHOT_S01[2]` tilt to (0,88,-120) | cue **SIGNAL_APPEAR** @5.0s — beam+halo bloom 1.5s, fog eases back | high shimmer overtone |
| 04 | 7.0–10.0 | S02 THE AWAKENING | Cut to abandoned facility; crane down over dead machine | (Phase 3/4) facility set + robot rig from GLB | cue **ENTER_FACILITY** @7.0s, dark until energize | silence + drips, low servo idle |
| 05 | 10.0–14.0 | S02 | Blue energy floods the chassis; close-up inserts | dolly-in macro passes | cue **ROBOT_ENERGIZE** @10.0s, blue rim lights ramp | rising mechanical whine |
| 06 | 14.0–18.0 | S03 THE SIGNAL | Hologram boots; camera orbits the HUD interface | orbit path ~180° | SVG HUD layer mapped to 3D anchor | data-bleep strata |
| 07 | 18.0–22.0 | S03 | Orbit completes; message locks: "CONNECTION ESTABLISHED" | push-in on text plane | cue **MESSAGE_ESTABLISHED** @18.0s, cyan key | chord bloom |
| 08 | 22.0–26.0 | S04 THE COLLAPSE | City power cascades down, window grids die district by district | whip-back + stabilize | cue **GRID_FAILURE** @22.0s, exposure drop | brownout drop-outs |
| 09 | 26.0–28.0 | S04 | Lightning arcs across the sky; vehicles scatter through storm | tracking vehicles | cue **SKY_FLASH** @26.0s, 2-frame strobes | thunder hits |
| 10 | 28.0–32.0 | S04 | Pull backward, full scale reveal of the dark city | long dolly-back to wide | cue **PULL_BACK_REVEAL** @28.0s | low roar + rain peak |
| 11 | 32.0–35.0 | S05 FINAL TRANSMISSION | Hard cut to silence; single energy source appears | slow push-in | cue **SILENCE** @32.0s, all FX stop, single practical glow | near-silence, heartbeat |
| 12 | 35.0–40.0 | S05 | Screen fades to black; titles type on | locked | cue **FINAL_TITLE** @35.0s; "NEON GENESIS / THE LAST SIGNAL / A NEW WORLD BEGINS." | final sub decay |

### Consistency contract
- Camera: only keyframed (`src/camera.js`), eased smoothstep, deterministic harmonics — never random.
- Time: single master `Timeline` (`src/timeline.js`), cue-driven; modules never poll the clock.
- Color: `lighting.setMood(t)` is the only exposure/key-grading authority.
- Assets: procedural for dev (Seed 2077/40/99); Blender GLB replaces procedural stand-ins **only** via `loadModel()` fallback contract in `src/three/models.js`.

### Phase status
- [x] Phase 1 — Storyboard (this document)
- [x] Phase 2 — Blender asset scripts (`blender/generate_assets.py`, `export_assets.py`: robot / vehicle / facility kit → GLB). Compiled and reviewed in-sandbox; must be executed on a machine with Blender: `blender -b -P blender/export_assets.py`
- [x] Phase 3 — Three.js environment — **Scene 01 live**
- [x] Phase 3b — **Scene 02 live**: facility hall + robot energize sequence (procedural rig dims to robot.glb via `loadRobot()`)
- [x] Phase 4 — GSAP timeline + Scene 04/05 camera work (`src/animation.js`; DOM-only, camera stays on the deterministic rig)
- [x] Phase 5 — SVG HUD motion graphics — **Scene 03 live**: `hud.svg` mapped as the hologram screen texture with additive rings/data pillars; `CONNECTION ESTABLISHED` locks at 18s
- [x] Scene 04 live: district blackout cascade (`env.update(t, p)`), deterministic lightning envelope + strobe key, whip-back rise/storm-track/dolly-back keys
- [x] Scene 05 live: single LastSource in the void, approach + hold, GSAP burn-to-black + final title lockup
- [x] Phase 6 — Phaser interactive module (**SIGNAL DECODER**, `src/phaser/interactive.js`): canvas terpisah 340x220, komunikasi murni via kontrak `signalBus.js`; bars energi + partikel + tap-to-surge; lazy-load agar sinematik tak terblokir
- [x] Phase 7 scaffold — `python/render_video.py` — grade + transcode (`--video` capture .webm) atau image-sequence (`--frames`), audio bed, H.264 1080p30
- [x] Phase 8 — mode capture deterministik (`?capture=1&fps=30`: timestep 1/30s terkunci wall-clock + `requestFrame()` per frame, MediaRecorder 24 Mbps → .webm) + README alur render final penuh

**Tersisa untuk mesin produksi** (di luar kemampuan sandbox): jalankan Blender untuk GLB opsional, rekam capture mode di browser, lalu jalankan render_video.py → `output/final_video.mp4`.
