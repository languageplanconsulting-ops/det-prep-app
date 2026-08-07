"""Author content.json: model answer, inline annotations, explanation pages,
spotlight + zoom cues.

Times in BLOCKS/PAGES/ZOOMS are ORIGINAL-timeline seconds (from the
transcript); everything is pushed through remap.json onto the cut timeline.

Annotations are located by PHRASE — the matching token run gets the underline,
highlight and the label that sits above it, in the same text box.
"""

import bisect
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from align import align_sentence, load_words  # noqa: E402

WORK = pathlib.Path("work")


def nrm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


BLOCKS = [
    {
        "id": "intro",
        "kicker": "Introduction · บทนำ",
        "fontSize": 42,
        "lineHeight": 2.35,
        "window": [15.4, 24.6],
        "sentences": [
            ("The diagram illustrates the process of the formation of "
             "rain-shadow deserts from start to finish.", [15.4, 24.6]),
        ],
        "hold_until": 50.5,
        "annotations": [
            {"id": "a1", "phrase": "rain-shadow deserts",
             "label": "คำนามขยายคำนาม → ต้องมีขีด", "at": 24.8, "align": "right"},
        ],
        "spotlights": [("title", 16.4), ("whole", 49.0)],
        "zooms": [("title", 16.6), ("whole", 49.2)],
    },
    {
        "id": "overview",
        "kicker": "Overview · ภาพรวม",
        "fontSize": 37,
        "lineHeight": 2.35,
        "window": [55.0, 71.6],
        "sentences": [
            ("Overall, the process entails seven steps in total, starting with "
             "the approach of winds from the coast and culminating in dry winds "
             "reaching inland areas, resulting in a rain-shadow desert.",
             [55.0, 71.6]),
        ],
        "hold_until": 156.0,
        "annotations": [
            {"id": "a1", "phrase": "starting with the approach",
             "label": "preposition + คำนาม", "at": 76.5},
            {"id": "a2", "phrase": "the coast",
             "label": "article: คำนามเอกพจน์นับได้", "at": 85.5},
            {"id": "a3", "phrase": "inland areas",
             "label": "นับได้ → เติม s", "at": 137.5, "align": "right"},
            {"id": "a4", "phrase": "resulting in a rain-shadow desert",
             "label": "S + V , V-ing (complex structure)", "at": 122.5},
        ],
        "spotlights": [
            ("whole", 56.0), ("stage1", 62.0), ("stage7", 65.5),
            ("desert", 68.5), ("coast", 85.0), ("whole", 148.5),
        ],
        "zooms": [
            ("whole", 56.2), ("stage1", 62.2), ("stage7", 65.7),
            ("desert", 68.7), ("coast", 85.2), ("whole", 148.7),
        ],
    },
    {
        "id": "body1",
        "kicker": "Body 1 · ขั้นตอนที่ 1–5",
        "fontSize": 34,
        "lineHeight": 2.35,
        "window": [157.4, 219.0],
        "sentences": [
            ("To begin with, winds from the sea approach the coast before being "
             "pushed upwards.", [157.4, 166.0]),
            ("Subsequently, as the air rises, it becomes moist and cool.",
             [187.0, 199.0]),
            ("In the following step, the cool moist air forms clouds, which "
             "result in rainfall.", [209.0, 219.0]),
        ],
        "hold_until": 264.0,
        "annotations": [
            {"id": "a1", "phrase": "To begin with",
             "label": "transitional word", "at": 158.4},
            {"id": "a2", "phrase": "before being pushed upwards",
             "label": "before + V-ing", "at": 166.6, "align": "right"},
            {"id": "a3", "phrase": "Subsequently",
             "label": "transitional word", "at": 188.6},
            {"id": "a4", "phrase": "as the air rises",
             "label": "as + S V , S V", "at": 203.5},
            {"id": "a5", "phrase": "In the following step",
             "label": "transitional word", "at": 210.5},
            {"id": "a6", "phrase": "the cool moist air",
             "label": "the = พูดถึงมาแล้ว (referencing)", "at": 223.5},
            {"id": "a7", "phrase": "forms clouds",
             "label": "present simple · clouds นับได้ +s", "at": 233.5},
            {"id": "a8", "phrase": "which result in rainfall",
             "label": "S + V , which", "at": 244.5, "align": "right"},
        ],
        "spotlights": [
            ("stage1", 159.5), ("stage2", 163.5), ("stage3", 190.5),
            ("stage4", 211.5), ("stage5", 216.5),
        ],
        "zooms": [
            ("stage1", 159.7), ("stage2", 163.7), ("stage3", 190.7),
            ("stage4", 211.7), ("stage5", 216.7), ("whole", 246.0),
        ],
    },
    {
        "id": "body2a",
        "kicker": "Body 2 · ขั้นตอนที่ 6",
        "fontSize": 30,
        "lineHeight": 2.35,
        "window": [267.0, 346.0],
        "sentences": [
            ("With regard to the remaining stages of the process, after the "
             "rainfall, the dry air continues to move over the mountain before "
             "going down along the leeward side and reaching the bottom of the "
             "mountain, which continues towards inland areas.", [267.0, 346.0]),
        ],
        "hold_until": 350.5,
        "annotations": [
            {"id": "a1", "phrase": "With regard to",
             "label": "preposition + คำนาม", "at": 268.6},
            {"id": "a2", "phrase": "after the rainfall",
             "label": "after + คำนาม (ไม่ใช่ประโยค)", "at": 309.0},
            {"id": "a3", "phrase": "before going down",
             "label": "before + V-ing", "at": 321.5},
            {"id": "a4", "phrase": "and reaching",
             "label": "ตามหลัง before → ต้องเป็น V-ing", "at": 330.5,
             "align": "right"},
            {"id": "a5", "phrase": "which continues towards inland areas",
             "label": "S + V , which", "at": 338.5, "align": "right"},
        ],
        "spotlights": [
            ("stage5", 269.5), ("stage6", 280.0), ("leeward", 284.0),
            ("leeward_slope", 287.5), ("stage7", 342.0),
        ],
        "zooms": [
            ("stage6", 280.2), ("leeward", 284.2), ("leeward_slope", 287.7),
            ("stage7", 342.2),
        ],
    },
    {
        "id": "body2b",
        "kicker": "Body 2 · ขั้นตอนที่ 7",
        "fontSize": 32,
        "lineHeight": 2.35,
        "window": [351.0, 370.0],
        "sentences": [
            ("In the final step, when these dry winds reach the inland area, "
             "they lead to the formation of a rain-shadow desert, marking the "
             "completion of the rain-shadow desert formation process.",
             [351.0, 370.0]),
        ],
        "hold_until": 483.2,
        "annotations": [
            {"id": "a1", "phrase": "In the final step",
             "label": "transitional word", "at": 352.4},
            # keep this to the conjunction itself — a span containing another
            # annotation's phrase would split into two runs
            {"id": "a2", "phrase": "when",
             "label": "when + S V , S V (subordinating conjunction)",
             "at": 373.0},
            {"id": "a3", "phrase": "these dry winds",
             "label": "referencing", "at": 388.5},
            {"id": "a4", "phrase": "marking the completion",
             "label": "จบไม่เป็น ให้ใช้ , marking the completion of…",
             "at": 393.5},
        ],
        "spotlights": [
            ("inland", 355.0), ("desert", 360.0), ("whole", 425.0),
        ],
        "zooms": [
            ("inland", 355.2), ("desert", 360.2), ("whole", 425.2),
        ],
    },
]

# Full-card explanations. Every line carries its OWN time so it appears when
# he actually makes that point — a fixed stagger dumps the whole Thai
# explanation on screen seconds before he says it.
PAGES = [
    {
        "id": "pg-dash", "at": 26.6, "until": 48.6,
        "kicker": "Grammar", "title": "คำนามขยายคำนาม → ต้องมีขีด",
        "lines": [
            ("เอาคำนาม 2 คำมาต่อกัน แล้วตัวหน้าขยายตัวหลัง → ใส่ <b>hyphen</b>", 28.2),
            ("<b>rain-shadow</b> deserts ✓ &nbsp;·&nbsp; a <b>well-known</b> person ✓", 36.4),
            ("แต่ถ้าวางไว้หลัง verb to be → <b>ไม่มีขีด</b>: the people are well known", 45.8),
        ],
    },
    {
        "id": "pg-article", "at": 86.6, "until": 103.2,
        "kicker": "Article", "title": "คำนามเอกพจน์นับได้ ต้องมี a / the",
        "word": {"before": "coast", "after": "the coast", "add": "the"},
        "lines": [
            ("โจทย์ให้คำว่า <b>coast</b> มาเฉยๆ — เราต้องใส่ article ให้เขาเอง", 87.4),
            ("เอกพจน์นับได้ → <b>a coast</b> หรือ <b>the coast</b>", 92.4),
            ("ถ้าไม่ใส่ article ก็ต้องเป็นพหูพจน์ → <b>coasts</b>", 98.6),
        ],
    },
    {
        "id": "pg-passive", "at": 178.9, "until": 186.6,
        "kicker": "Complex structure", "title": "before + being + V3",
        "lines": [
            ("<b>before</b> ตามด้วย V-ing เสมอ", 179.3),
            ("<b>being pushed</b> = passive voice (ถูกกระทำ)", 182.2),
        ],
    },
    {
        "id": "pg-transitional", "at": 253.0, "until": 262.5,
        "kicker": "Transitional words", "title": "ขึ้นประโยคใหม่ ต้องมีคำเชื่อมทุกครั้ง",
        "lines": [
            ("<b>To begin with</b> — เริ่มขั้นตอนแรก", 257.2),
            ("<b>Subsequently</b> · <b>In the following step</b> — ขั้นต่อมา", 258.8),
            ("<b>In the final step</b> — ขั้นสุดท้าย", 260.4),
        ],
    },
    {
        "id": "pg-reminder", "at": 403.4, "until": 421.2,
        "kicker": "Reminder", "title": "3 อย่างที่ต้องทำทุกครั้ง",
        "lines": [
            ("1. ทุกประโยคเป็น <b>present simple</b>", 404.9),
            ("2. ขึ้นประโยคใหม่ ต้องมี <b>transitional word</b>", 410.6),
            ("3. ต้องมี <b>complex structure</b>", 418.8),
        ],
    },
    {
        "id": "pg-complex", "at": 421.9, "until": 446.5,
        "kicker": "Complex structures", "title": "ทั้งหมดที่ใช้ในคำตอบนี้",
        "lines": [
            ("<b>as</b> + S V , S V &nbsp;·&nbsp; <b>when</b> + S V , S V", 423.2),
            ("S + V , <b>V-ing</b> &nbsp;·&nbsp; S + V , <b>which</b> + V", 431.3),
            ("<b>before</b> + V-ing", 441.8),
        ],
    },
    {
        "id": "pg-article2", "at": 452.2, "until": 480.5,
        "kicker": "Reminder", "title": "อย่าลืมใส่ article",
        "lines": [
            ("โจทย์ไม่ได้ให้ article มา — เราต้องเติมเอง", 455.6),
            ("<b>coast</b> → the coast &nbsp;·&nbsp; <b>inland area</b> → inland areas", 458.2),
            ("เอกพจน์นับได้ต้องมี <b>a</b> หรือ <b>the</b>; พหูพจน์ไม่ต้องก็ได้", 465.0),
        ],
    },
]


def remap_fn(remap):
    starts, cum, keeps = remap["starts"], remap["cum"], remap["keeps"]

    def to_cut(t):
        i = bisect.bisect_right(starts, t) - 1
        if i < 0:
            return 0.0
        s, e = keeps[i]
        if t > e:
            return round(cum[i] + (e - s), 4)
        return round(cum[i] + (t - s), 4)

    return to_cut


def locate(tokens, phrase):
    """Return (start, end) token indices matching `phrase`, or None."""
    want = [nrm(w) for w in phrase.split() if nrm(w)]
    got = [nrm(t["w"]) for t in tokens]
    for i in range(len(got) - len(want) + 1):
        if got[i:i + len(want)] == want:
            return i, i + len(want)
    return None


def main() -> int:
    remap = json.loads((WORK / "remap.json").read_text(encoding="utf-8"))
    words = load_words(str(WORK / "words.json"))
    to_cut = remap_fn(remap)
    cut_dur = remap["cut_duration"]

    paragraphs, spotlights, zooms = [], [], []
    total, missing = 0, []

    for b in BLOCKS:
        toks = []
        for text, (ws, we) in b["sentences"]:
            for a in align_sentence(text.split(), words, ws, we):
                toks.append({"w": a["w"], "t": to_cut(a["t"]), "ann": None})
        total += len(toks)

        anns = []
        for spec in b.get("annotations", []):
            span = locate(toks, spec["phrase"])
            if span is None:
                missing.append((b["id"], spec["phrase"]))
                continue
            # An overlapping range splits the earlier annotation into two runs
            # -> duplicate element id and the label rendered twice.
            clash = {toks[i]["ann"] for i in range(*span) if toks[i]["ann"]}
            if clash:
                missing.append(
                    (b["id"], f'{spec["phrase"]!r} overlaps {sorted(clash)}'))
                continue
            for i in range(*span):
                toks[i]["ann"] = spec["id"]
            anns.append({
                "id": spec["id"], "label": spec["label"],
                "at": to_cut(spec["at"]),
                "style": spec.get("style", "both"),
                "align": spec.get("align", "left"),
                "until": to_cut(spec.get("until", spec["at"] + 7.5)),
            })

        paragraphs.append({
            "id": b["id"], "kicker": b["kicker"],
            "fontSize": b["fontSize"], "lineHeight": b.get("lineHeight", 1.34),
            "start": round(max(to_cut(b["window"][0]) - 0.35, 0.0), 3),
            "end": to_cut(b["hold_until"]),
            "words": toks, "annotations": anns,
        })
        for region, at in b.get("spotlights", []):
            spotlights.append({"region": region, "at": to_cut(at)})
        for region, at in b.get("zooms", []):
            zooms.append({"region": region, "at": to_cut(at)})

    spotlights.sort(key=lambda s: s["at"])
    zooms.sort(key=lambda z: z["at"])

    pages = [{
        "id": p["id"], "at": to_cut(p["at"]), "until": to_cut(p["until"]),
        "kicker": p.get("kicker", ""), "title": p["title"],
        "lines": [{"text": t, "at": to_cut(a)} for t, a in p.get("lines", [])],
        "word": p.get("word"),
    } for p in PAGES]
    pages.sort(key=lambda p: p["at"])
    for i in range(len(pages) - 1):  # never overlap
        pages[i]["until"] = min(pages[i]["until"], pages[i + 1]["at"] - 0.05)

    media_dur = float(sys.argv[1]) if len(sys.argv) > 1 else cut_dur
    FINAL_HOLD, END_HOLD = 5.0, 6.0
    final_at = round(media_dur - 0.05, 3)
    end_at = round(final_at + FINAL_HOLD, 3)

    # The full model answer as FOUR labelled paragraphs — an essay is marked
    # paragraph by paragraph, so it has to read that way here too.
    # body2a + body2b are one paragraph; they were only split on screen so the
    # text would clear the diagram.
    FINAL_GROUPS = [
        ("Introduction", ["intro"]),
        ("Overview", ["overview"]),
        ("Body 1", ["body1"]),
        ("Body 2", ["body2a", "body2b"]),
    ]
    by_id = {p["id"]: p for p in paragraphs}
    phrases = [spec["phrase"]
               for b in BLOCKS for spec in b.get("annotations", [])]

    final_paras = []
    for label, ids in FINAL_GROUPS:
        text = " ".join(
            " ".join(t["w"] for t in by_id[i]["words"]) for i in ids if i in by_id)
        for ph in phrases:
            if ph in text and f"<b>{ph}</b>" not in text:
                text = text.replace(ph, f"<b>{ph}</b>", 1)
        final_paras.append({"label": label, "html": text})

    content = {
        "video": "input-video.mp4",
        "mediaDuration": media_dur,
        "duration": round(end_at + END_HOLD, 3),
        "fps": 24,
        "diagramY": 726,
        "paragraphs": paragraphs,
        "pages": pages,
        "spotlights": spotlights,
        "zooms": zooms,
        "finalCard": {
            "at": final_at, "until": end_at,
            "kicker": "Model answer · คำตอบเต็ม",
            "paragraphs": final_paras, "wordsLabel": f"{total} คำ",
        },
        "endCard": {"at": end_at, "minutes": "6 นาที",
                    "band": "BAND 7", "words": total},
    }
    pathlib.Path("work/content.json").write_text(
        json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"model answer words: {total}  (IELTS minimum 150)")
    for p in paragraphs:
        print(f"  {p['id']:8s} {len(p['words']):3d}w  {len(p['annotations'])} ann  "
              f"{p['start']:7.2f} → {p['end']:7.2f}  {p['fontSize']}px")
    print(f"pages {len(pages)} · spotlights {len(spotlights)} · zooms {len(zooms)}")
    if missing:
        print("\n!! PHRASE NOT FOUND (annotation dropped):")
        for pid, ph in missing:
            print(f"   {pid}: {ph!r}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
