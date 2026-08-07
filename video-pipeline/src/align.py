"""Align the authored model answer to the spoken word timings.

The on-screen essay is not verbatim — §4.1 fixes grammar silently and §4.3
replaces a factually wrong phrase. So target words won't match spoken words
one-to-one. Anchor on the words that DO match and interpolate the rest, so a
corrected phrase still lands while he is saying that part of the sentence.
"""

import difflib
import json
import pathlib
import re


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def spoken_in_window(words, start: float, end: float):
    out = []
    for w in words:
        if w["start"] < start or w["start"] > end:
            continue
        if not re.search(r"[A-Za-z]", w["text"]):
            continue  # skip Thai commentary
        out.append(w)
    return out


def align_sentence(target_words, words, start: float, end: float):
    """-> list of {"w": token, "t": time} on the SAME timeline as `words`."""
    spoken = spoken_in_window(words, start, end)
    tnorm = [norm(t) for t in target_words]
    snorm = [norm(s["text"]) for s in spoken]

    times = [None] * len(target_words)
    if spoken:
        sm = difflib.SequenceMatcher(a=tnorm, b=snorm, autojunk=False)
        for i, j, n in sm.get_matching_blocks():
            for k in range(n):
                times[i + k] = spoken[j + k]["start"]

    # fill leading/trailing/interior gaps by linear interpolation
    known = [(i, t) for i, t in enumerate(times) if t is not None]
    if not known:
        span = max(end - start, 0.4)
        return [
            {"w": w, "t": round(start + span * i / max(len(target_words), 1), 3)}
            for i, w in enumerate(target_words)
        ]

    first_i, first_t = known[0]
    last_i, last_t = known[-1]
    lead = max(start, first_t - 0.28 * first_i) if first_i else first_t
    for i in range(first_i):
        times[i] = lead + (first_t - lead) * (i / first_i)
    tail_step = 0.30
    for i in range(last_i + 1, len(times)):
        times[i] = last_t + tail_step * (i - last_i)

    for idx in range(len(known) - 1):
        a_i, a_t = known[idx]
        b_i, b_t = known[idx + 1]
        gap = b_i - a_i
        if gap > 1:
            for k in range(1, gap):
                times[a_i + k] = a_t + (b_t - a_t) * (k / gap)

    # strictly increasing
    out = []
    prev = -1.0
    for w, t in zip(target_words, times):
        t = max(float(t), prev + 0.02)
        prev = t
        out.append({"w": w, "t": round(t, 3)})
    return out


def load_words(path: str):
    return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
