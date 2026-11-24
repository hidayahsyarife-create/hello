"""NEON GENESIS — THE LAST SIGNAL
Python MoviePy post-production pipeline (Phase 7).

Input : a frame-sequence directory produced by the Three.js renderer
        (deterministic capture mode, 1920x1080 PNG), optional audio.
Output: output/final_video.mp4 — 1920x1080, 30 fps, H.264.

Inputs (one of):
    --frames DIR   numbered PNG frame directory (0001.png, ...) from the
                   deterministic frame-dump capture
    --video FILE   screen-capture recording (.webm/.mp4) from the browser
                   capture mode (?capture=1)
Output: output/final_video.mp4 — 1920x1080, 30 fps, H.264.

Flags:
    --audio FILE   optional audio bed (wav/mp3); trimmed to video length
    --fps N        default 30 (frames mode only)
    --out FILE     default output/final_video.mp4
    --no-grade     skip the cinematic color grade

The grade matches the locked LUT direction in the storyboard: lifted
cool shadows, crushed warm blacks, +8% contrast, slight cyan-bias in
highlights — applied identically to every frame for shot-to-shot
consistency.
"""

import argparse
import os
import re
import sys

import numpy as np


def load_frames(frames_dir):
    names = sorted((
        f for f in os.listdir(frames_dir)
        if re.fullmatch(r"\d{4,}\.(png|jpg)", f)
    ), key=lambda n: int(re.match(r"\d+", n).group()))
    if not names:
        sys.exit(f"error: no numbered PNG/JPG frames found in {frames_dir}")
    return [os.path.join(frames_dir, n) for n in names]


def cinematic_grade(frame: np.ndarray) -> np.ndarray:
    """Deterministic color grade: lifted cool shadows, +8% contrast.

    frame: float32 RGB in [0,1], shape (H, W, 3)
    """
    r, g, b = frame[..., 0], frame[..., 1], frame[..., 2]
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    shadows = np.clip(1.0 - luma * 2.0, 0, 1)[..., None]

    # lift shadows toward cold blue, keep highlights untouched
    cool = np.array([0.04, 0.06, 0.11], dtype=np.float32)
    frame = frame + shadows * cool

    # +8% contrast around mid-gray
    frame = (frame - 0.5) * 1.08 + 0.5

    # subtle cyan bias in speculars, warm floor to keep blacks alive
    frame[..., 2] = frame[..., 2] * 1.02 + 0.004
    frame[..., 0] = frame[..., 0] * 0.995

    return np.clip(frame, 0.0, 1.0)


def main():
    ap = argparse.ArgumentParser(description="Assemble the final 40s cinematic.")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--frames", help="frame directory (0001.png, ...)")
    src.add_argument("--video", help="browser capture recording (.webm/.mp4)")
    ap.add_argument("--audio", default=None, help="optional audio bed")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--out", default="output/final_video.mp4")
    ap.add_argument("--no-grade", action="store_true")
    args = ap.parse_args()

    from moviepy.editor import (
        ImageSequenceClip, VideoFileClip, AudioFileClip
    )  # deferred: fast CLI errors

    if args.video:
        print(f"transcoding {args.video}")
        clip = VideoFileClip(args.video).without_audio()
        if abs(clip.w / clip.h - 16 / 9) > 0.01:
            print(f"warning: input aspect {clip.w}x{clip.h} is not 16:9")
        if (clip.w, clip.h) != (1920, 1080) and clip.w > 960:
            clip = clip.resize((1920, 1080))
    else:
        frame_files = load_frames(args.frames)
        print(f"assembling {len(frame_files)} frames at {args.fps} fps "
              f"({len(frame_files) / args.fps:.2f}s)")
        clip = ImageSequenceClip(frame_files, fps=args.fps)

    if not args.no_grade:
        clip = clip.fl_image(lambda f: (cinematic_grade(f.astype(np.float32) / 255.0) * 255)
                             .astype(np.uint8))

    if args.audio:
        audio = AudioFileClip(args.audio)
        if audio.duration > clip.duration:
            audio = audio.subclip(0, clip.duration)
        clip = clip.set_audio(audio)

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    clip.write_videofile(
        args.out,
        codec="libx264",
        audio_codec="aac",
        fps=args.fps,
        preset="slow",
        bitrate="16000k",
        ffmpeg_params=["-pix_fmt", "yuv420p", "-profile:v", "high"],
    )
    print(f"done -> {args.out} ({clip.duration:.2f}s, {args.fps} fps, 1080p H.264)")


if __name__ == "__main__":
    main()
