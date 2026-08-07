"""SOP §2.2 — faster-whisper medium, no VAD, word timestamps.

VAD is off deliberately: with vad_filter=True the model silently drops whole
sentences from the tail of a take.
"""

import argparse
import json
import pathlib
import sys

from faster_whisper import WhisperModel


def transcribe(
    audio: str,
    model_size: str = "medium",
    language: str | None = None,
    condition_on_previous_text: bool = True,
):
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio,
        language=language,
        vad_filter=False,
        word_timestamps=True,
        condition_on_previous_text=condition_on_previous_text,
        beam_size=5,
    )

    out_segments = []
    for seg in segments:
        words = [
            {"text": w.word, "start": round(w.start, 3), "end": round(w.end, 3)}
            for w in (seg.words or [])
        ]
        out_segments.append(
            {
                "id": seg.id,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text,
                "words": words,
            }
        )
        print(f"[{seg.start:7.2f} → {seg.end:7.2f}] {seg.text}", flush=True)

    return {
        "language": info.language,
        "language_probability": round(info.language_probability, 4),
        "duration": round(info.duration, 3),
        "model": model_size,
        "segments": out_segments,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--model", default="medium")
    ap.add_argument("--language", default=None)
    ap.add_argument("--no-condition", action="store_true")
    args = ap.parse_args()

    result = transcribe(
        args.audio,
        model_size=args.model,
        language=args.language,
        condition_on_previous_text=not args.no_condition,
    )
    pathlib.Path(args.out).write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nWrote {args.out} — {len(result['segments'])} segments", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
