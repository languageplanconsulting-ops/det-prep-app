#!/usr/bin/env python3
"""Two-pass PDF build: render -> locate chapters -> inject TOC page numbers -> re-render -> stamp folios."""
import re, subprocess, sys, html, pathlib, fitz

HERE = pathlib.Path(__file__).parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC, OUT = HERE/"book.html", HERE/"English-in-Chunks.pdf"

def render(src, dst):
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                    "--no-pdf-header-footer", f"--print-to-pdf={dst}", str(src)],
                   check=True, capture_output=True)

def norm(t):
    return " ".join(t.split()).replace("\u2019", "'").lower()

def locate(doc, needle):
    """Find the page whose HEADING is `needle`.

    Matching on raw text is wrong: 'Answer Key' also appears on the cover and
    'Adjective + Preposition' appears in Ch.11 body prose. Chapter titles are set
    at >=14pt, so require a large-type line.
    """
    target = norm(needle)
    for i, page in enumerate(doc):
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                if max(sp["size"] for sp in spans) < 14:
                    continue
                if norm("".join(sp["text"] for sp in spans)) == target:
                    return i + 1
    return None

# ---------- pass 1 ----------
print("pass 1: rendering…")
p1 = HERE/"_pass1.pdf"
render(SRC, p1)
doc = fitz.open(p1)
print(f"  {len(doc)} pages")

source = SRC.read_text(encoding="utf-8")
anchors = re.findall(r'data-anchor="([^"]+)"', source)
found, missing = {}, []
for a in anchors:
    needle = html.unescape(a)
    pg = locate(doc, needle)
    if pg:
        found[a] = pg
    else:
        missing.append(needle)
doc.close()

print(f"  located {len(found)}/{len(anchors)} chapters")
if missing:
    print("  NOT FOUND:", missing)

# ---------- inject page numbers ----------
def fill(m):
    a = m.group(1)
    return f'<span class="pg" data-anchor="{a}">{found.get(a, "—")}</span>'

source = re.sub(r'<span class="pg" data-anchor="([^"]+)">[^<]*</span>', fill, source)
SRC.write_text(source, encoding="utf-8")

# ---------- pass 2 ----------
print("pass 2: re-rendering with real page numbers…")
p2 = HERE/"_pass2.pdf"
render(SRC, p2)

# ---------- stamp folios ----------
doc = fitz.open(p2)
if len(doc) != len(fitz.open(p1)):
    print("  ! pagination shifted between passes — TOC numbers may be off by a page")
GREY = (0.576, 0.627, 0.651)
RULE = (0.839, 0.859, 0.843)
for i, page in enumerate(doc):
    if i == 0:                     # no folio on the cover
        continue
    w, h = page.rect.width, page.rect.height
    y = h - 44
    page.draw_line(fitz.Point(48, y - 9), fitz.Point(w - 48, y - 9), color=RULE, width=0.4)
    page.insert_text((48, y), "ENGLISH IN CHUNKS", fontname="helv", fontsize=7.4,
                     color=GREY, render_mode=0)
    num = str(i + 1)
    page.insert_text((w - 48 - fitz.get_text_length(num, "helv", 8.5), y),
                     num, fontname="helv", fontsize=8.5, color=GREY)
doc.save(OUT, deflate=True, garbage=4)
n = len(doc); doc.close()
for f in (p1, p2): f.unlink(missing_ok=True)
print(f"done → {OUT.name} · {n} pages · {OUT.stat().st_size/1_048_576:.1f} MB")
