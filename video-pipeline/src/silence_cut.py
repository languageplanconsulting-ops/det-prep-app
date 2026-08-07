"""SOP §2.3–2.4 — silence detect, cut list, one select/aselect pass, remap.json.

Gaps are *floored*, not deleted: each detected silence is shortened to
--floor seconds so speech doesn't butt together unnaturally.

A/V stay in sync because video and audio are cut by the same interval list in a
single pass (select + aselect), never two separate passes.
"""

import argparse
import bisect
import json
import pathlib
import re
import subprocess

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"

SIL_START = re.compile(r"silence_start:\s*(-?[\d.]+)")
SIL_END = re.compile(r"silence_end:\s*(-?[\d.]+)")


def probe_duration(path: str) -> float:
    out = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def detect_silences(audio: str, noise_db: float, min_dur: float):
    proc = subprocess.run(
        [FFMPEG, "-hide_banner", "-nostats", "-i", audio,
         "-af", f"silencedetect=noise={noise_db}dB:d={min_dur}",
         "-f", "null", "-"],
        capture_output=True, text=True,
    )
    log = proc.stderr
    starts = [float(m) for m in SIL_START.findall(log)]
    ends = [float(m) for m in SIL_END.findall(log)]
    spans = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else None
        if e is None or e <= s:
            continue
        spans.append((s, e))
    return spans


def build_keeps(duration: float, silences, floor: float, drops):
    """Silence spans longer than `floor` get trimmed down to `floor`.

    `drops` are [start, end] windows removed entirely (false starts).
    """
    cuts = []  # regions to remove from the timeline
    for s, e in silences:
        if e - s > floor:
            # keep `floor` seconds of the pause, split evenly around the middle
            pad = floor / 2.0
            mid_s = s + pad
            mid_e = e - pad
            if mid_e > mid_s:
                cuts.append([mid_s, mid_e])
    for d in drops:
        cuts.append([float(d[0]), float(d[1])])

    cuts.sort()
    merged = []
    for c in cuts:
        if merged and c[0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], c[1])
        else:
            merged.append(list(c))

    keeps = []
    pos = 0.0
    for cs, ce in merged:
        cs = max(0.0, min(cs, duration))
        ce = max(0.0, min(ce, duration))
        if cs > pos:
            keeps.append([round(pos, 4), round(cs, 4)])
        pos = max(pos, ce)
    if pos < duration:
        keeps.append([round(pos, 4), round(duration, 4)])
    return [k for k in keeps if k[1] - k[0] > 0.001], merged


def make_remap(keeps):
    """original -> cut time. Stores cumulative offsets for fast lookup."""
    starts, cum = [], []
    total = 0.0
    for s, e in keeps:
        starts.append(s)
        cum.append(total)
        total += e - s
    return {"keeps": keeps, "starts": starts, "cum": cum,
            "cut_duration": round(total, 4)}


def remap_time(remap, t: float) -> float:
    starts, cum, keeps = remap["starts"], remap["cum"], remap["keeps"]
    i = bisect.bisect_right(starts, t) - 1
    if i < 0:
        return 0.0
    s, e = keeps[i]
    if t > e:  # inside a removed region — clamp to the seam
        return round(cum[i] + (e - s), 4)
    return round(cum[i] + (t - s), 4)


def run_cut(src: str, keeps, out_path: str, fps: int,
            width: int = 0, crf: int = 22, preset: str = "veryfast"):
    # One filtergraph, one pass: trim/atrim each keep then concat video+audio
    # together, so A/V can never drift. (A single `select` expression with this
    # many `between()` terms overflows ffmpeg's expression parser — it fails
    # with "Cannot allocate memory".)
    parts = []
    for i, (s, e) in enumerate(keeps):
        parts.append(
            f"[0:v]trim=start={s}:end={e},setpts=PTS-STARTPTS[v{i}];"
            f"[0:a]atrim=start={s}:end={e},asetpts=PTS-STARTPTS[a{i}]"
        )
    streams = "".join(f"[v{i}][a{i}]" for i in range(len(keeps)))
    graph = ";".join(parts) + f";{streams}concat=n={len(keeps)}:v=1:a=1[vc][a]"
    # scaling here rather than at composite time: the composition canvas is
    # 720x1280, so encoding the cut at 1080x1920 is wasted work in BOTH passes
    if width:
        graph += f";[vc]scale={width}:-2:flags=bicubic,setsar=1[v]"
    else:
        graph += ";[vc]null[v]"
    filter_path = pathlib.Path(out_path).with_suffix(".filter.txt")
    filter_path.write_text(graph, encoding="utf-8")
    cmd = [
        FFMPEG, "-y", "-hide_banner", "-i", src,
        "-filter_complex_script", str(filter_path),
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-crf", str(crf), "-preset", preset,
        "-g", str(fps), "-keyint_min", str(fps),
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-r", str(fps), "-c:a", "aac", "-b:a", "160k",
        out_path,
    ]
    subprocess.run(cmd, check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--remap", required=True)
    ap.add_argument("--noise-db", type=float, default=-30.0)
    ap.add_argument("--min-dur", type=float, default=0.4)
    ap.add_argument("--floor", type=float, default=0.12)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--width", type=int, default=0,
                    help="scale the cut to this width (0 = keep source)")
    ap.add_argument("--crf", type=int, default=22)
    ap.add_argument("--preset", default="veryfast")
    ap.add_argument("--drops", default="[]",
                    help="JSON list of [start,end] windows to remove entirely")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    duration = probe_duration(args.audio)
    silences = detect_silences(args.audio, args.noise_db, args.min_dur)
    drops = json.loads(args.drops)
    keeps, removed = build_keeps(duration, silences, args.floor, drops)
    remap = make_remap(keeps)
    remap["source_duration"] = round(duration, 4)
    remap["noise_db"] = args.noise_db
    remap["min_dur"] = args.min_dur
    remap["floor"] = args.floor
    remap["drops"] = drops
    remap["silence_count"] = len(silences)

    pathlib.Path(args.remap).write_text(
        json.dumps(remap, indent=2), encoding="utf-8")

    print(f"source        {duration:.2f}s")
    print(f"silences      {len(silences)} spans @ {args.noise_db}dB:d={args.min_dur}")
    print(f"removed       {len(removed)} regions "
          f"({sum(e - s for s, e in removed):.2f}s)")
    print(f"keeps         {len(keeps)} intervals")
    print(f"cut duration  {remap['cut_duration']:.2f}s "
          f"({remap['cut_duration'] / duration * 100:.1f}%)")

    if not args.dry_run:
        run_cut(args.video, keeps, args.out, args.fps,
                width=args.width, crf=args.crf, preset=args.preset)
        print(f"cut video     {args.out} "
              f"({probe_duration(args.out):.2f}s actual)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
