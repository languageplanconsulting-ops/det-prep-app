"""Build the hyperframes composition from content.json.

Encodes the SOP's layout (§6) and hard-won rules (§3):
  - transforms/opacity only; the spotlight is tl.set() instantly + a scale pulse
  - inline words never scale (they would not reflow and would overlap), so a
    "zoom into a word" is a dedicated page, not an inline transform
  - underline / highlight bars are absolutely-positioned SIZED children scaled
    from 0 — never width:0 + scaleX, which renders nothing
  - explicit z-index, because data-track-index does not control stacking
  - every clip's end is capped at the next clip's start
  - no tl.call(): callbacks never fire under frame-seek
"""

import argparse
import html
import json
import pathlib

from regions import scale_regions

COMP_ID = "ielts-tutorial"
W, H = 720, 1280
BLUE = "#004aad"
GOLD = "#ffcc00"
KICKER = "#8fb8ff"

DIAGRAM_W = 620
DIAGRAM_X = (W - DIAGRAM_W) // 2
SOURCE_RATIO = 470 / 807
DIAGRAM_H = round(DIAGRAM_W * SOURCE_RATIO)


def q(t: float, fps: int) -> float:
    return round(round(float(t) * fps) / fps, 4)


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def build_style(diagram_y: int, overlay_only: bool = False) -> str:
    BODY_BG = "transparent" if overlay_only else "#000"
    return f"""
@font-face {{ font-family:'Baloo 2'; src:url('fonts/baloo-2-latin-400-normal.woff2') format('woff2'); font-weight:400; font-display:block; }}
@font-face {{ font-family:'Baloo 2'; src:url('fonts/baloo-2-latin-700-normal.woff2') format('woff2'); font-weight:700; font-display:block; }}
@font-face {{ font-family:'Kanit'; src:url('fonts/kanit-thai-400-normal.woff2') format('woff2'); font-weight:400; font-display:block; unicode-range:U+0E01-0E5B,U+200C-200D,U+25CC; }}
@font-face {{ font-family:'Kanit'; src:url('fonts/kanit-latin-400-normal.woff2') format('woff2'); font-weight:400; font-display:block; }}
@font-face {{ font-family:'Kanit'; src:url('fonts/kanit-thai-500-normal.woff2') format('woff2'); font-weight:500; font-display:block; unicode-range:U+0E01-0E5B,U+200C-200D,U+25CC; }}
@font-face {{ font-family:'Kanit'; src:url('fonts/kanit-latin-500-normal.woff2') format('woff2'); font-weight:500; font-display:block; }}
@font-face {{ font-family:'Kanit'; src:url('fonts/kanit-thai-700-normal.woff2') format('woff2'); font-weight:700; font-display:block; unicode-range:U+0E01-0E5B,U+200C-200D,U+25CC; }}
@font-face {{ font-family:'Kanit'; src:url('fonts/kanit-latin-700-normal.woff2') format('woff2'); font-weight:700; font-display:block; }}

* {{ box-sizing: border-box; }}
html, body {{ margin:0; padding:0; width:100%; height:100%; overflow:hidden;
  background:{BODY_BG}; font-family:'Baloo 2','Kanit',ui-sans-serif,system-ui,sans-serif; }}

#stage {{ position:relative; width:{W}px; height:{H}px; overflow:hidden;
  background:{BODY_BG}; }}
#backdrop {{ position:absolute; inset:0; background:{BODY_BG}; z-index:0; }}

#video-wrap {{ position:absolute; left:0; top:0; width:{W}px; height:{H}px;
  overflow:hidden; z-index:1; }}
#video-wrap video {{ width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }}

#scrim {{ position:absolute; left:14px; top:150px; width:692px; height:{H - 150 - 14}px;
  background:rgba(2,10,28,0.72); border-radius:18px; z-index:2; }}

.kicker {{ position:absolute; left:38px; top:166px; width:640px;
  font-family:'Kanit',sans-serif; font-weight:700; font-size:19px; letter-spacing:.14em;
  text-transform:uppercase; color:{KICKER}; z-index:6; }}

/* top leaves room for a label above the FIRST line too */
.essay {{ position:absolute; left:42px; top:238px; width:636px;
  font-family:'Baloo 2',sans-serif; font-weight:400; color:#fff;
  text-shadow:0 2px 10px rgba(0,0,0,.55); z-index:6; }}
.essay .w {{ opacity:0; }}

/* ── inline annotation: underline + highlight, label ABOVE, same box ────── */
/* line-height:1.15 keeps the inline-block's box tight to the glyphs — if it
   inherits the paragraph's big line-height, bottom:100% on the label
   overshoots into the line above. */
.ann {{ position:relative; display:inline-block; white-space:nowrap;
  line-height:1.15; vertical-align:baseline; margin:0 4px; }}
/* a real highlighter: solid gold ink, text flips to dark as the wipe lands
   (translucent gold over navy just goes muddy olive) */
.ann .hl {{ position:absolute; left:-6px; right:-6px; top:-4px; bottom:-2px;
  background:{GOLD}; border-radius:5px; z-index:-1;
  transform:scaleX(0); transform-origin:0 50%; }}
.ann .w {{ text-shadow:none; }}
.ann .ul {{ position:absolute; left:-2px; right:-2px; bottom:-6px; height:4px;
  background:{GOLD}; border-radius:2px;
  transform:scaleX(0); transform-origin:0 50%; }}
/* compact: it has to fit in the gap the line-height opens up */
.ann .lb {{ position:absolute; bottom:100%; left:0; margin-bottom:7px;
  white-space:nowrap; opacity:0;
  font-family:'Kanit',sans-serif; font-weight:500; font-size:18px;
  line-height:1.1; color:#231a00; background:{GOLD};
  border-radius:7px; padding:3px 9px; text-shadow:none; }}
.ann .lb.right {{ left:auto; right:0; }}
.ann .lb.center {{ left:50%; transform:translateX(-50%); }}

/* ── full explanation page: brand blue + gold only, all Thai in Kanit ───── */
.page {{ position:absolute; left:26px; top:162px; width:668px;
  background:{BLUE}; border:4px solid {GOLD}; border-radius:16px;
  padding:22px 26px 26px; z-index:10; }}
.page .pk {{ font-family:'Kanit',sans-serif; font-weight:700; font-size:18px;
  letter-spacing:.13em; text-transform:uppercase; color:{GOLD}; opacity:0; }}
.page .pt {{ font-family:'Kanit',sans-serif; font-weight:700; font-size:38px;
  color:#fff; line-height:1.32; margin-top:8px; opacity:0; }}
.page .pl {{ font-family:'Kanit',sans-serif; font-weight:400; font-size:26px;
  color:#fff; line-height:1.55; margin-top:14px; padding-left:26px;
  position:relative; opacity:0; }}
.page .pl::before {{ content:''; position:absolute; left:0; top:15px;
  width:12px; height:12px; background:{GOLD}; border-radius:3px; }}
.page .pl b {{ color:{GOLD}; font-weight:700; }}

/* word-focus page: coast -> the coast */
.page .wf {{ display:flex; align-items:center; justify-content:center;
  gap:18px; margin:22px 0 6px; flex-wrap:wrap; }}
.page .wf .before {{ font-family:'Kanit',sans-serif; font-weight:400;
  font-size:48px; color:#9fc0ee; opacity:0; }}
.page .wf .arrow {{ font-family:'Kanit',sans-serif; font-weight:700;
  font-size:38px; color:{GOLD}; opacity:0; }}
.page .wf .after {{ font-family:'Kanit',sans-serif; font-weight:700;
  font-size:52px; color:#fff; opacity:0; }}
.page .wf .after em {{ font-style:normal; color:{GOLD}; }}

/* ── final essay card: four labelled paragraphs, sized to stop ABOVE the
      diagram so it never covers it ─────────────────────────────────────── */
#final-card {{ position:absolute; left:22px; top:150px; width:676px;
  height:{diagram_y - 162}px;
  background:{BLUE}; border:4px solid {GOLD}; border-radius:16px;
  padding:16px 22px 14px; z-index:11;
  display:flex; flex-direction:column; }}
#final-card .fk-row {{ display:flex; align-items:baseline;
  justify-content:space-between; margin-bottom:8px; }}
#final-card .fk {{ font-family:'Kanit',sans-serif; font-weight:700;
  font-size:17px; letter-spacing:.14em; text-transform:uppercase;
  color:{GOLD}; }}
#final-card .fp {{ margin-bottom:9px; }}
#final-card .fpl {{ font-family:'Kanit',sans-serif; font-weight:700;
  font-size:15px; letter-spacing:.1em; text-transform:uppercase;
  color:#9fc0ee; margin-bottom:1px; }}
#final-card .ft {{ font-family:'Baloo 2',sans-serif; font-weight:400;
  font-size:19px; color:#fff; line-height:1.35; }}
#final-card .ft b {{ color:{GOLD}; font-weight:700; }}
#final-card .fw {{ font-family:'Kanit',sans-serif; font-weight:700;
  font-size:18px; color:#fff; white-space:nowrap; }}

#diagram-wrap {{ position:absolute; left:{DIAGRAM_X}px; top:{diagram_y}px;
  width:{DIAGRAM_W}px; height:{DIAGRAM_H}px; overflow:hidden;
  border-radius:12px; background:#fff; z-index:5; }}
#diagram-inner {{ position:absolute; left:0; top:0;
  width:{DIAGRAM_W}px; height:{DIAGRAM_H}px; transform-origin:0 0; }}
#diagram-inner img {{ width:{DIAGRAM_W}px; height:{DIAGRAM_H}px; display:block; }}
/* spread only needs to reach the container edge in LOCAL coords (<=620px);
   the zoom multiplies it, so 9999px becomes a ~30000px shadow that Chrome
   stalls rasterising frame after frame. 800px covers it at every zoom level. */
#spot {{ position:absolute; left:0; top:0; width:10px; height:10px;
  border:3px solid {GOLD}; border-radius:7px;
  box-shadow:0 0 0 800px rgba(0,0,0,0.62); opacity:0; }}

#counter {{ position:absolute; left:22px; top:34px;
  font-family:'Kanit',sans-serif; font-weight:700; font-size:26px; color:#fff;
  background:{BLUE}; border-radius:10px; padding:7px 15px; z-index:9; }}
#counter .goal {{ color:{GOLD}; }}

#endcard {{ position:absolute; inset:0; background:{BLUE}; z-index:12;
  display:flex; flex-direction:column; align-items:center; justify-content:center; }}
#endcard .mins {{ font-family:'Kanit',sans-serif; font-weight:700; font-size:64px;
  color:#fff; opacity:0; }}
/* real width + scaleX: scaling a 0px-wide element renders nothing */
#endcard .rule {{ width:240px; height:9px; background:{GOLD}; border-radius:5px;
  margin:34px 0; transform-origin:50% 50%; }}
#endcard .band {{ font-family:'Baloo 2',sans-serif; font-weight:700; font-size:96px;
  color:{GOLD}; letter-spacing:.03em; opacity:0; }}
#endcard .wc {{ font-family:'Kanit',sans-serif; font-weight:500; font-size:38px;
  color:#fff; margin-top:26px; opacity:0; }}
"""


def essay_html(pid: str, tokens, annotations) -> str:
    """Emit word spans, wrapping annotated runs so the label can sit above."""
    ann_by_id = {a["id"]: a for a in annotations}
    out = []
    cur = None
    for j, tk in enumerate(tokens):
        a = tk.get("ann")
        if a != cur:
            if cur is not None:
                out.append("</span>")
            # the separator must sit OUTSIDE the wrapper: trailing whitespace
            # inside an inline-block is trimmed, fusing "with,winds"
            if j > 0:
                out.append(" ")
            if a is not None:
                spec = ann_by_id[a]
                style = spec.get("style", "both")
                align = spec.get("align", "left")
                out.append(f'<span class="ann" id="{pid}-{a}">')
                if style in ("highlight", "both"):
                    out.append(f'<span class="hl" id="{pid}-{a}-hl"></span>')
                if style in ("underline", "both"):
                    out.append(f'<span class="ul" id="{pid}-{a}-ul"></span>')
                if spec.get("label"):
                    cls = "lb" + (f" {align}" if align != "left" else "")
                    out.append(
                        f'<span class="{cls}" id="{pid}-{a}-lb">'
                        f'{esc(spec["label"])}</span>'
                    )
            cur = a
        elif j > 0:
            out.append(" ")
        out.append(f'<span class="w" id="{pid}-w{j}">{esc(tk["w"])}</span>')
    if cur is not None:
        out.append("</span>")
    return "".join(out)


def build(content: dict, out_dir: pathlib.Path) -> None:
    fps = content.get("fps", 24)
    duration = q(content["duration"], fps)
    media_dur = q(content.get("mediaDuration", duration), fps)
    diagram_y = content.get("diagramY", 726)
    regions = scale_regions(DIAGRAM_W)

    paras = content["paragraphs"]
    for i, p in enumerate(paras):
        nxt = paras[i + 1]["start"] if i + 1 < len(paras) else content["endCard"]["at"]
        p["_end"] = q(min(p.get("end", nxt), nxt), fps)
        p["_start"] = q(p["start"], fps)

    body, script = [], []

    # Overlay-only: no <video>/<audio> in the page at all. Per-frame video
    # decode+seek is the heaviest thing Chrome does here and it accumulates
    # until capture stalls; the footage is composited underneath by ffmpeg
    # afterwards instead.
    overlay_only = bool(content.get("overlayOnly"))
    body.append('<div id="backdrop"></div>')
    if not overlay_only:
        body.append(
            f'<div id="video-wrap"><video id="bg-video" src="{content["video"]}" '
            f'muted playsinline data-start="0" data-duration="{media_dur}" '
            f'data-track-index="1"></video></div>'
        )
        body.append(
            f'<audio id="voice" src="{content["video"]}" data-start="0" '
            f'data-duration="{media_dur}" data-track-index="2" '
            f'data-volume="1"></audio>'
        )
    body.append('<div id="scrim"></div>')
    body.append(
        '<div id="diagram-wrap"><div id="diagram-inner">'
        '<img src="diagram.jpg" alt=""><div id="spot"></div>'
        "</div></div>"
    )
    body.append(
        '<div id="counter"><span id="wcount">0</span>'
        '<span class="goal"> / 150</span></div>'
    )

    total_words = 0

    for p in paras:
        pid = p["id"]
        s, e = p["_start"], p["_end"]
        dur = round(e - s, 4)
        anns = p.get("annotations", [])

        body.append(
            f'<div class="clip" id="k-{pid}" data-start="{s}" data-duration="{dur}" '
            f'data-track-index="4"><div class="kicker" id="kick-{pid}">'
            f'{esc(p["kicker"])}</div></div>'
        )

        lh = p.get("lineHeight", 1.34)
        body.append(
            f'<div class="clip" id="p-{pid}" data-start="{s}" data-duration="{dur}" '
            f'data-track-index="5">'
            f'<div class="essay" id="essay-{pid}" style="font-size:{p["fontSize"]}px;'
            f'line-height:{lh}">'
            + essay_html(pid, p["words"], anns)
            + "</div></div>"
        )

        for j, wd in enumerate(p["words"]):
            total_words += 1
            script.append(
                f'tl.to("#{pid}-w{j}",{{opacity:1,duration:0.14,'
                f'ease:"none"}},{q(wd["t"], fps)});'
            )

        # annotation reveal: highlight wipes, underline draws, label drops in
        for a in anns:
            at = q(a["at"], fps)
            style = a.get("style", "both")
            if style in ("highlight", "both"):
                script.append(
                    f'tl.to("#{pid}-{a["id"]}-hl",{{scaleX:1,duration:0.32,'
                    f'ease:"power2.out"}},{at});'
                )
                # ink lands -> text flips dark, in step with the wipe
                script.append(
                    f'tl.to("#{pid}-{a["id"]} .w",{{color:"#12213d",'
                    f'duration:0.18,ease:"none"}},{q(at + 0.20, fps)});'
                )
            if style in ("underline", "both"):
                script.append(
                    f'tl.to("#{pid}-{a["id"]}-ul",{{scaleX:1,duration:0.30,'
                    f'ease:"power2.out"}},{q(at + 0.10, fps)});'
                )
            if a.get("label"):
                script.append(
                    f'tl.fromTo("#{pid}-{a["id"]}-lb",{{opacity:0,y:8}},'
                    f'{{opacity:1,y:0,duration:0.30,ease:"power2.out"}},'
                    f'{q(at + 0.22, fps)});'
                )
                # labels fade out after their hold; the underline/highlight
                # stay. Otherwise every label in the paragraph piles up.
                out = q(min(a.get("until", at + 7.0), e - 0.1), fps)
                if out > at + 1.0:
                    script.append(
                        f'tl.to("#{pid}-{a["id"]}-lb",{{opacity:0,'
                        f'duration:0.35,ease:"power2.in"}},{out});'
                    )

    # ── explanation pages ──────────────────────────────────────────────────
    for pg in content.get("pages", []):
        gid = pg["id"]
        at, until = q(pg["at"], fps), q(pg["until"], fps)
        inner = [f'<div class="pk" id="{gid}-pk">{esc(pg.get("kicker", ""))}</div>']
        inner.append(f'<div class="pt" id="{gid}-pt">{esc(pg["title"])}</div>')

        if pg.get("word"):
            wf = pg["word"]
            after = esc(wf["after"]).replace(
                esc(wf["add"]), f'<em>{esc(wf["add"])}</em>', 1)
            inner.append(
                f'<div class="wf">'
                f'<span class="before" id="{gid}-wb">{esc(wf["before"])}</span>'
                f'<span class="arrow" id="{gid}-wa">→</span>'
                f'<span class="after" id="{gid}-wc">{after}</span></div>'
            )
        for k, line in enumerate(pg.get("lines", [])):
            inner.append(f'<div class="pl" id="{gid}-l{k}">{line["text"]}</div>')

        body.append(
            f'<div class="clip" id="page-{gid}" data-start="{at}" '
            f'data-duration="{round(until - at, 4)}" data-track-index="7">'
            f'<div class="page">' + "".join(inner) + "</div></div>"
        )
        # It is a *new page*: hide the essay underneath rather than stacking on
        # it. Target the inner divs — never tween a .clip, the framework owns
        # its visibility.
        for p in paras:
            if p["_start"] < until and p["_end"] > at:
                # gone BEFORE the page lands, back AFTER it leaves — a
                # simultaneous crossfade leaves both readable for a few frames
                fade_at = q(max(at - 0.30, 0), fps)
                for sel in (f"#essay-{p['id']}", f"#kick-{p['id']}"):
                    script.append(
                        f'tl.to("{sel}",{{opacity:0,duration:0.26,'
                        f'ease:"power2.in"}},{fade_at});'
                    )
                    # hard kill: a seek landing past the fade must not inherit
                    # stale visibility state
                    script.append(
                        f'tl.set("{sel}",{{opacity:0}},{q(fade_at + 0.26, fps)});'
                    )
                    script.append(
                        f'tl.to("{sel}",{{opacity:1,duration:0.30,'
                        f'ease:"power2.out"}},{q(until + 0.02, fps)});'
                    )
        script.append(
            f'tl.fromTo("#{gid}-pk",{{opacity:0,y:-6}},{{opacity:1,y:0,'
            f'duration:0.26,ease:"power2.out"}},{q(at + 0.10, fps)});'
        )
        script.append(
            f'tl.fromTo("#{gid}-pt",{{opacity:0,y:10}},{{opacity:1,y:0,'
            f'duration:0.34,ease:"power2.out"}},{q(at + 0.24, fps)});'
        )
        if pg.get("word"):
            script.append(
                f'tl.fromTo("#{gid}-wb",{{opacity:0}},{{opacity:1,duration:0.26,'
                f'ease:"power2.out"}},{q(at + 0.5, fps)});'
            )
            script.append(
                f'tl.fromTo("#{gid}-wa",{{opacity:0,x:-10}},{{opacity:1,x:0,'
                f'duration:0.26,ease:"power2.out"}},{q(at + 0.78, fps)});'
            )
            script.append(
                f'tl.fromTo("#{gid}-wc",{{opacity:0,scale:0.86}},{{opacity:1,'
                f'scale:1,duration:0.38,ease:"back.out(1.6)"}},{q(at + 1.0, fps)});'
            )
        # Each line lands when he actually says that point — a fixed stagger
        # dumps the whole Thai explanation on screen before he gets to it.
        for k, line in enumerate(pg.get("lines", [])):
            lat = q(max(line["at"], at + 0.2), fps)
            script.append(
                f'tl.fromTo("#{gid}-l{k}",{{opacity:0,x:-14}},{{opacity:1,x:0,'
                f'duration:0.30,ease:"power2.out"}},{lat});'
            )

    # ── spotlight: tl.set() instantly, then a transform pulse (SOP §3) ──────
    for cue in content["spotlights"]:
        at = q(cue["at"], fps)
        r = regions[cue["region"]]
        script.append(
            f'tl.set("#spot",{{left:{r["x"]},top:{r["y"]},'
            f'width:{r["w"]},height:{r["h"]},opacity:1,scale:1}},{at});'
        )
        script.append(
            f'tl.fromTo("#spot",{{scale:1.14}},{{scale:1,duration:0.26,'
            f'ease:"power2.out"}},{at});'
        )

    # ── diagram zoom: transform the inner wrapper (spotlight rides along) ───
    for z in content.get("zooms", []):
        at = q(z["at"], fps)
        if z["region"] == "whole":
            script.append(
                f'tl.to("#diagram-inner",{{x:0,y:0,scale:1,duration:0.55,'
                f'ease:"power2.inOut"}},{at});'
            )
            continue
        r = regions[z["region"]]
        pad = z.get("pad", 26)
        k = min(DIAGRAM_W / (r["w"] + pad * 2), DIAGRAM_H / (r["h"] + pad * 2))
        k = round(min(k, z.get("maxScale", 3.0)), 4)
        tx = round(DIAGRAM_W / 2 - k * (r["x"] + r["w"] / 2), 2)
        ty = round(DIAGRAM_H / 2 - k * (r["y"] + r["h"] / 2), 2)
        script.append(
            f'tl.to("#diagram-inner",{{x:{tx},y:{ty},scale:{k},duration:0.6,'
            f'ease:"power2.inOut"}},{at});'
        )

    # ── word counter (seek-safe: tl.call never fires under frame-seek) ──────
    cues = [(q(wd["t"], fps), i + 1)
            for i, wd in enumerate(w for p in paras for w in p["words"])]
    if cues:
        first_t, last_t = cues[0][0], cues[-1][0]
        times_js = "[" + ",".join(str(t) for t, _ in cues) + "]"
        script.append(
            f'(function(){{var CUES={times_js},o={{v:0}};'
            f'tl.to(o,{{v:1,duration:{round(last_t - first_t, 4)},ease:"none",'
            f'onUpdate:function(){{var now=tl.time(),lo=0,hi=CUES.length;'
            f'while(lo<hi){{var mid=(lo+hi)>>1;'
            f'if(CUES[mid]<=now){{lo=mid+1;}}else{{hi=mid;}}}}'
            f'setCount(lo);}}}},{first_t});}})();'
        )

    # ── final essay card: whole model answer, held so it can be screenshot ──
    fc = content.get("finalCard")
    if fc:
        f_at, f_until = q(fc["at"], fps), q(fc["until"], fps)
        paras_html = "".join(
            f'<div class="fp"><div class="fpl">{esc(fp["label"])}</div>'
            f'<div class="ft">{fp["html"]}</div></div>'
            for fp in fc["paragraphs"]
        )
        body.append(
            f'<div class="clip" id="final-clip" data-start="{f_at}" '
            f'data-duration="{round(f_until - f_at, 4)}" data-track-index="9">'
            f'<div id="final-card">'
            f'<div class="fk-row">'
            f'<div class="fk">{esc(fc["kicker"])}</div>'
            f'<div class="fw">{esc(fc["wordsLabel"])}</div></div>'
            f"{paras_html}"
            f"</div></div>"
        )
        script.append(
            f'tl.fromTo("#final-card",{{opacity:0,y:16}},{{opacity:1,y:0,'
            f'duration:0.4,ease:"power2.out"}},{f_at});'
        )

    # ── end card ───────────────────────────────────────────────────────────
    ec = content["endCard"]
    ec_at = q(ec["at"], fps)
    ec_dur = round(duration - ec_at, 4)
    body.append(
        f'<div class="clip" id="endcard-clip" data-start="{ec_at}" '
        f'data-duration="{ec_dur}" data-track-index="8">'
        f'<div id="endcard">'
        f'<div class="mins" id="ec-mins">{esc(ec["minutes"])}</div>'
        f'<div class="rule" id="ec-rule"></div>'
        f'<div class="band" id="ec-band">{esc(ec["band"])}</div>'
        f'<div class="wc" id="ec-wc">0 คำ</div>'
        f"</div></div>"
    )
    script.append(
        f'tl.fromTo("#ec-mins",{{opacity:0,y:22}},{{opacity:1,y:0,'
        f'duration:0.45,ease:"power2.out"}},{q(ec_at + 0.25, fps)});'
    )
    script.append(
        f'tl.fromTo("#ec-rule",{{scaleX:0}},{{scaleX:1,duration:0.5,'
        f'ease:"power2.inOut"}},{q(ec_at + 0.8, fps)});'
    )
    script.append(
        f'tl.fromTo("#ec-band",{{opacity:0,scale:0.82}},{{opacity:1,scale:1,'
        f'duration:0.55,ease:"back.out(1.6)"}},{q(ec_at + 1.35, fps)});'
    )
    script.append(
        f'tl.fromTo("#ec-wc",{{opacity:0}},{{opacity:1,duration:0.35,'
        f'ease:"power2.out"}},{q(ec_at + 2.0, fps)});'
    )
    script.append(
        f'(function(){{var o={{v:0}};tl.to(o,{{v:{ec["words"]},duration:1.5,'
        f'ease:"power2.out",onUpdate:function(){{var el='
        f'document.getElementById("ec-wc");'
        f'if(el)el.textContent=Math.round(o.v)+" คำ";}}}},'
        f'{q(ec_at + 2.1, fps)});}})();'
    )

    doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>{build_style(diagram_y, overlay_only)}</style>
</head>
<body>
<div id="stage" data-composition-id="{COMP_ID}" data-start="0"
     data-duration="{duration}" data-fps="{fps}"
     data-width="{W}" data-height="{H}">
{chr(10).join(body)}
<script src="vendor/gsap.min.js"></script>
<script>
(function(){{
  var tl = window.gsap.timeline({{ paused: true }});
  function setCount(n){{
    var el = document.getElementById("wcount");
    if (el) el.textContent = String(n);
  }}
{chr(10).join("  " + s for s in script)}
  window.__timelines = window.__timelines || {{}};
  window.__timelines["{COMP_ID}"] = tl;
}})();
</script>
</div>
</body>
</html>
"""
    (out_dir / "index.html").write_text(doc, encoding="utf-8")
    n_ann = sum(len(p.get("annotations", [])) for p in paras)
    print(f"wrote {out_dir / 'index.html'}")
    print(f"  duration    {duration}s @ {fps}fps")
    print(f"  paragraphs  {len(paras)}   words {total_words}")
    print(f"  annotations {n_ann}")
    print(f"  pages       {len(content.get('pages', []))}")
    print(f"  spotlights  {len(content['spotlights'])}  "
          f"zooms {len(content.get('zooms', []))}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--content", required=True)
    ap.add_argument("--out-dir", default="public")
    args = ap.parse_args()
    content = json.loads(pathlib.Path(args.content).read_text(encoding="utf-8"))
    build(content, pathlib.Path(args.out_dir))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
