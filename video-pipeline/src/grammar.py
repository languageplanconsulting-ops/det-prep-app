"""SOP §4.1 — grammar/punctuation pass on the on-screen model answer.

The rendered essay is a model answer people screenshot, so it must be clean
even where the spoken delivery was not. Corrections that change a word I *care*
about are NOT applied silently — those are reported so they can be handled as a
voice splice (§4.2) or a gold chip (§4.3).

Gemini REST, matching the repo's own contract: v1beta generateContent with the
key in the x-goog-api-key header.
"""

import argparse
import json
import os
import pathlib
import re
import urllib.request

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-2.5-flash"

SYSTEM = """You are proofreading the on-screen English model answer for an IELTS \
Academic Writing Task 1 tutorial video.

Return STRICT JSON:
{"paragraphs":[{"index":0,"corrected":"...","changes":[{"before":"...","after":"...","kind":"grammar|punctuation|capitalisation|word-choice","note":"why"}]}]}

Rules:
- Fix grammar, punctuation, capitalisation and sentence case.
- Subject-verb agreement matters: report it as kind "grammar".
- Do NOT paraphrase, do NOT restructure, do NOT add or remove content or figures.
- Keep the author's vocabulary. Only change a word when it is actually wrong.
- Preserve the original word order wherever the grammar allows.
- If a paragraph is already correct, return it unchanged with an empty changes list.
"""


def load_env_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    # repo convention: hand-rolled dotenv, .env.local wins, existing env first
    root = pathlib.Path(__file__).resolve().parents[2]
    for name in (".env.local", ".env"):
        p = root / name
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == "GEMINI_API_KEY":
                return v.strip().strip('"').strip("'")
    raise SystemExit("GEMINI_API_KEY not found in env or .env.local")


def strip_fences(text: str) -> str:
    t = text.strip()
    m = re.match(r"^```(?:json)?\s*(.*?)\s*```$", t, re.S)
    return m.group(1) if m else t


def call_gemini(paragraphs, model: str, key: str):
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": json.dumps(
            {"paragraphs": [{"index": i, "text": p}
                            for i, p in enumerate(paragraphs)]},
            ensure_ascii=False)}]}],
        "generationConfig": {"temperature": 0.2,
                             "responseMimeType": "application/json"},
    }
    req = urllib.request.Request(
        ENDPOINT.format(model=model),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    parts = body["candidates"][0]["content"]["parts"]
    text = "".join(p.get("text", "") for p in parts)
    usage = body.get("usageMetadata", {})
    return json.loads(strip_fences(text)), usage


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--paragraphs", required=True,
                    help="JSON file: list of paragraph strings")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    args = ap.parse_args()

    paras = json.loads(pathlib.Path(args.paragraphs).read_text(encoding="utf-8"))
    result, usage = call_gemini(paras, args.model, load_env_key())

    for p in result.get("paragraphs", []):
        for c in p.get("changes", []):
            print(f"  [{c.get('kind')}] {c.get('before')!r} -> {c.get('after')!r}"
                  f"  ({c.get('note', '')})")

    pathlib.Path(args.out).write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {args.out}  "
          f"(in {usage.get('promptTokenCount')} / out {usage.get('candidatesTokenCount')} tokens)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
