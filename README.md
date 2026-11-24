# NEON GENESIS — THE LAST SIGNAL

Produksi animasi sinematik 40 detik (1920x1080, 30 fps) — cyberpunk,
dibangun modular: **Three.js** (3D engine), **Blender Python** (aset GLB),
**SVG** (HUD vektor), **GSAP** (motion graphics), **Phaser** (modul
interaktif terisolasi), **MoviePy** (post-production video).

## Menjalankan sinematik

```bash
npm install
npm run dev            # http server lokal di :8000
# buka http://localhost:8000
```

Klik **MULAI**. Urutan 40 detik berjalan otomatis:
S01 kota senyap → S02 robot terbangun → S03 hologram + koneksi →
S04 kolaps + petir → S05 transmisi terakhir + judul. Loop kembali ke awal.

**Panel SIGNAL DECODER** (kanan bawah, modul Phaser terpisah) hidup dari
S02–S04; klik panelnya untuk mengirim `decoder:boost` lewat event bus.

## Render video final (Phase 8)

1. **Aset Blender (opsional, meningkatkan kualitas):**
   ```bash
   blender -b -P blender/export_assets.py
   ```
   → `assets/models/{robot,vehicle,facility_kit}.glb`. Sisi Three.js me-
   load GLB otomatis lewat kontrak `loadModel()` (fallback prosedural
   jika file absen).

2. **Rekam kanvas di browser (deterministik):**
   ```
   http://localhost:8000/?capture=1&fps=30
   ```
   Klik MULAI — timeline dikunci ke wall clock pada timestep 1/30 s,
   frame diambil satu per satu via `requestFrame()` (MediaRecorder,
   24 Mbps). Setelah 40 detik unduh otomatis: `neon-genesis_capture.webm`.

3. **Grade + encode ke MP4 H.264:**
   ```bash
   pip install moviepy numpy   # butuh ffmpeg di sistem
   python3 python/render_video.py \
     --video neon-genesis_capture.webm \
     --audio assets/audio/score.wav \
     --out output/final_video.mp4
   ```
   → `output/final_video.mp4`, 1920x1080, 30 fps, H.264, dengan color
   grade sinematik (shadow dingin terangkat, kontras +8%, bias cyan).

## Arsitektur

```
src/
├── main.js               bootstrap, render loop, wiring cue, capture mode
├── timeline.js           Timeline 40s master — Storyboard, Cues, event bus
├── camera.js             rig keyframe deterministik (S01–S05)
├── lighting.js           lighting + grading + lightninEnvelope petir
├── scene.js              scene/renderer factory (ACES, sRGB, shadow)
├── animation.js          koreografi GSAP (DOM overlay saja)
├── particles.js          hujan 7k partikel + Signal beam
├── phaser/
│   ├── signalBus.js      kontrak antarmuka (murni, headless-testable)
│   └── interactive.js    panel DECODER Phaser (canvas terpisah)
├── three/
│   ├── environment.js    kota 120 menara + fasilitas industri + blackout
│   ├── models.js         lalu lintas udara + robot (prosedural + kontrak GLB)
│   ├── hologram.js       antarmuka holo (hud.svg sebagai tekstur)
│   └── effects.js        sky dome shader, fog, LastSource
└── graphics/hud.svg      desain HUD profesional (reticle, waveform, telemetry)
```

**Konsistensi** — kamera hanya keyframe deterministik; waktu dari satu
Timeline; grading dari satu setMood; semua generator seeded. Lihat
`docs/storyboard.md` untuk storyboard terkunci dan status fase.

## Pengujian

```bash
npm test    # 21 checks: timeline, cue, kamera, envelope petir, bus Phaser
```

Modul yang butuh DOM/WebGL (environment, holo, Phaser scene, capture)
diverifikasi sintaks + kontrak logika headless; verifikasi visual
dirancang dijalankan di browser (`npm run dev`).
