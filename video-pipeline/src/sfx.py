"""Mix UI sound effects into the finished video.

Gains are relative to each source file's own peak, not to the voice: click.wav
peaks at -13.7 dBFS, so -21 dB of gain lands it 24 dB under the narration and
it is simply inaudible. Verify by rendering the SFX bus against silence and
checking the peak at a cue time — a mix that is merely too quiet looks
identical to one that failed.

SFX are placed with ffmpeg rather than as page <audio> elements: the
composition is rendered graphics-only (no audio track at all), so the mix has
to happen at composite time anyway. Cue times come straight from content.json,
so the clicks and whooshes land exactly on the annotation and page beats.
"""

import argparse
import json
import pathlib
import subprocess

FFMPEG = "ffmpeg"

# short, dry, and well under the voice — this is punctuation, not music
CLICK = ("anoisesrc=d=0.05:c=pink:a=0.9,"
         "highpass=f=1500,lowpass=f=7000,"
         "afade=t=out:st=0.004:d=0.046")
WHOOSH = ("anoisesrc=d=0.34:c=white:a=0.55,"
          "bandpass=f=1100:width_type=o:w=2.2,"
          "afade=t=in:st=0:d=0.10,afade=t=out:st=0.12:d=0.22")
POP = ("sine=f=660:d=0.13,"
       "afade=t=in:st=0:d=0.01,afade=t=out:st=0.03:d=0.10")


def synth(expr: str, out: pathlib.Path) -> None:
    subprocess.run(
        [FFMPEG, "-y", "-v", "error", "-f", "lavfi", "-i", expr,
         "-ac", "1", "-ar", "48000", str(out)],
        check=True,
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--content", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--sfx-dir", default="work/sfx")
    ap.add_argument("--click-db", type=float, default=-8.0)
    ap.add_argument("--whoosh-db", type=float, default=-11.0)
    args = ap.parse_args()

    d = pathlib.Path(args.sfx_dir)
    d.mkdir(parents=True, exist_ok=True)
    synth(CLICK, d / "click.wav")
    synth(WHOOSH, d / "whoosh.wav")
    synth(POP, d / "pop.wav")

    c = json.loads(pathlib.Path(args.content).read_text(encoding="utf-8"))

    clicks, whooshes, pops = [], [], []
    for p in c["paragraphs"]:
        for a in p.get("annotations", []):
            clicks.append(a["at"])           # highlighter lands
    for pg in c.get("pages", []):
        whooshes.append(pg["at"])            # page in
        whooshes.append(max(pg["until"] - 0.18, pg["at"] + 0.3))  # page out
    if c.get("finalCard"):
        whooshes.append(c["finalCard"]["at"])
    pops.append(c["endCard"]["at"] + 1.35)   # BAND 7 stamp

    clicks = sorted(set(round(t, 3) for t in clicks))
    whooshes = sorted(set(round(t, 3) for t in whooshes))
    pops = sorted(set(round(t, 3) for t in pops))

    inputs = [FFMPEG, "-y", "-hide_banner", "-i", args.video]
    for name in ("click.wav", "whoosh.wav", "pop.wav"):
        inputs += ["-i", str(d / name)]

    parts, labels = [], ["[0:a]"]
    n = 1
    for idx, (times, src, gain) in enumerate((
        (clicks, 1, args.click_db),
        (whooshes, 2, args.whoosh_db),
        (pops, 3, args.whoosh_db),
    )):
        for t in times:
            lab = f"s{n}"
            parts.append(
                f"[{src}:a]adelay={int(t * 1000)}|{int(t * 1000)},"
                f"volume={gain}dB[{lab}]"
            )
            labels.append(f"[{lab}]")
            n += 1

    graph = ";".join(parts)
    if parts:
        graph += ";"
    graph += (f"{''.join(labels)}amix=inputs={len(labels)}:"
              f"normalize=0:dropout_transition=0[a]")

    cmd = inputs + [
        "-filter_complex", graph,
        "-map", "0:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart", args.out,
    ]
    print(f"clicks {len(clicks)} · whooshes {len(whooshes)} · pops {len(pops)}")
    subprocess.run(cmd, check=True)
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
