"""SOP §2.5 — rebuild real words from Whisper's sub-word tokens.

Whisper emits continuation sub-words without a leading space, so " inter" +
"ested" must fuse. But a *segment-initial* token also lacks a leading space —
merging across a segment boundary fuses the last word of one sentence onto the
first word of the next. So merging is strictly within a segment.
"""

import argparse
import json
import pathlib


def merge_segment_words(seg):
    """Fuse continuation sub-words inside ONE segment."""
    merged = []
    for i, w in enumerate(seg.get("words") or []):
        raw = w["text"]
        starts_new = raw.startswith((" ", " ")) or i == 0
        if merged and not starts_new:
            merged[-1]["text"] += raw
            merged[-1]["end"] = w["end"]
        else:
            merged.append({"text": raw, "start": w["start"], "end": w["end"]})
    for m in merged:
        m["text"] = m["text"].strip()
    return [m for m in merged if m["text"]]


def flatten(transcript):
    words = []
    for seg in transcript["segments"]:
        for w in merge_segment_words(seg):
            w["segment"] = seg["id"]
            words.append(w)
    return words


def remap_words(words, remap):
    """Shift word times onto the cut timeline; drop words inside removed spans."""
    import bisect

    starts, cum, keeps = remap["starts"], remap["cum"], remap["keeps"]

    def to_cut(t):
        i = bisect.bisect_right(starts, t) - 1
        if i < 0:
            return None
        s, e = keeps[i]
        if t > e:
            return None
        return round(cum[i] + (t - s), 4)

    out = []
    for w in words:
        cs, ce = to_cut(w["start"]), to_cut(w["end"])
        if cs is None:
            continue
        if ce is None:
            ce = cs + 0.08
        out.append({**w, "start": cs, "end": max(ce, cs + 0.02)})
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--remap")
    ap.add_argument("-o", "--out", required=True)
    args = ap.parse_args()

    transcript = json.loads(pathlib.Path(args.transcript).read_text(encoding="utf-8"))
    words = flatten(transcript)
    print(f"{len(words)} words from {len(transcript['segments'])} segments")

    if args.remap:
        remap = json.loads(pathlib.Path(args.remap).read_text(encoding="utf-8"))
        before = len(words)
        words = remap_words(words, remap)
        print(f"remapped -> {len(words)} words ({before - len(words)} dropped in cuts)")

    pathlib.Path(args.out).write_text(
        json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
