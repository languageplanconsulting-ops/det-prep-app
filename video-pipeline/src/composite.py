"""Composite the alpha overlay over the footage with ffmpeg.

Chrome renders only the graphics (transparent background); the footage never
enters the browser. Per-frame video decode+seek is what makes long captures
stall, so keeping it in ffmpeg is both faster and far more reliable.

The mirroring and the scale to the composition canvas happen here instead of
in CSS, so the result is identical to the in-page `transform: scaleX(-1)` +
`object-fit: cover`.
"""

import argparse
import pathlib
import subprocess

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"


def probe(path: str, entries: str) -> str:
    return subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", entries,
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True, help="cut footage (has the audio)")
    ap.add_argument("--overlay", required=True, help="alpha MOV from hyperframes")
    ap.add_argument("--out", required=True)
    ap.add_argument("--width", type=int, default=720)
    ap.add_argument("--height", type=int, default=1280)
    ap.add_argument("--fps", type=int, default=24)
    args = ap.parse_args()

    vid_dur = float(probe(args.video, "format=duration"))
    ovl_dur = float(probe(args.overlay, "format=duration"))
    tail = max(0.0, round(ovl_dur - vid_dur, 3))

    # extend the footage (and audio) under the end card, which runs past it
    pad_v = f",tpad=stop_mode=clone:stop_duration={tail}" if tail > 0.04 else ""
    pad_a = f"[0:a]apad=pad_dur={tail}[a]" if tail > 0.04 else "[0:a]anull[a]"

    graph = (
        f"[0:v]hflip,scale={args.width}:{args.height}:flags=lanczos,"
        f"setsar=1,fps={args.fps}{pad_v}[bg];"
        f"[1:v]scale={args.width}:{args.height},setsar=1,fps={args.fps}[ov];"
        f"[bg][ov]overlay=0:0:format=auto:eof_action=pass[v];"
        f"{pad_a}"
    )

    cmd = [
        FFMPEG, "-y", "-hide_banner",
        "-i", args.video,
        "-i", args.overlay,
        "-filter_complex", graph,
        "-map", "[v]", "-map", "[a]",
        "-t", f"{ovl_dur:.3f}",
        # medium-high is plenty for a tutorial upload and encodes far faster
        # than crf 18 / preset medium
        "-c:v", "libx264", "-crf", "22", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-r", str(args.fps), "-c:a", "aac", "-b:a", "160k",
        args.out,
    ]
    print(f"footage {vid_dur:.2f}s · overlay {ovl_dur:.2f}s · tail pad {tail:.2f}s")
    subprocess.run(cmd, check=True)

    out_dur = float(probe(args.out, "format=duration"))
    size_mb = pathlib.Path(args.out).stat().st_size / 1e6
    print(f"wrote {args.out} — {out_dur:.2f}s, {size_mb:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
