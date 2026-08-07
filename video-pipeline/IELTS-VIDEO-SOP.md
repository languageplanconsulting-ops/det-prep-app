# IELTS Tutorial Video — SOP

Produces a 720×1280 vertical video from one recording of me explaining an IELTS Writing answer in
Thai, with the English model answer writing itself on screen.

## 0. What the finished video looks like

- Footage full-frame and mirrored, never cropped. No skin smoothing — tried, looks unnatural, rejected.
- English model answer writes itself word-by-word over my face in Baloo 2, synced to my speech.
- Thai tip cards in Kanit as bullet lists, each bullet timed to when I make that point.
- The exam question (graph/map) permanently visible below the text, with a gold highlight on exactly
  what I'm describing.
- Brand blue `#004aad`, gold `#ffcc00`, flat blocks — no gradients.
- Word counter top-left to 150. End card: "4 นาที" → gold rule → BAND 7 → word total counting up.
- Synthesised music bed ~14 dB under my voice. No pencil SFX — rejected.

## 1. Environment

macOS, Node 22+, FFmpeg, Python 3.11.

```
npx skills add heygen-com/hyperframes --full-depth
```

`python3 -m venv .venv && ./.venv/bin/pip install faster-whisper pillow`

Check `df -h ~` before every render. Renders need ~1 GB scratch; on a full disk ffmpeg fails with a
misleading `FFmpeg cannot start` error that looks like a broken install.

## 2. Pipeline

1. Copy footage, extract audio: `ffmpeg -i footage.MP4 -vn -ac 1 -ar 16000 -c:a pcm_s16le audio.wav`
2. Transcribe with faster-whisper `medium` (`large-v3` thrashes an 8 GB Mac — 48 s of audio took
   15 min). Set `vad_filter=False` — with VAD on it silently dropped an entire English sentence.
   Use `word_timestamps=True`.
3. Silence-detect: `-30dB:d=0.4` normal, `-28dB:d=0.25` when I say "cut the pauses hard".
4. Cut list: every gap floored to 0.10–0.12 s, plus false starts. One filtergraph pass so A/V stay
   in sync. Write `remap.json` (original → cut timestamps) — every overlay cue depends on it.
   Typical: 5:00 → 3:07.
   **Past ~100 segments a single `select`/`aselect` expression blows up** — ffmpeg fails to parse
   the chained `between()` terms and reports a misleading `Cannot allocate memory`. Use
   `trim`/`atrim` per keep + one `concat=n=N:v=1:a=1` instead: still one filtergraph, one pass, and
   A/V are concatenated together so they cannot drift.
5. Word timings per paragraph. Merge Whisper's sub-word fragments only within one segment —
   segment-initial tokens also lack a leading space, so merging across segments fuses sentences
   together.
6. `hyperframes check` — always. It has caught real bugs every time.
7. Snapshot key beats (`--at <sec>`, one at a time) and actually look at them.
8. Render the GRAPHICS ONLY as a transparent overlay, then composite the footage under it
   with ffmpeg:
   `npx hyperframes render public -o overlay.mov --format mov --fps 24`
   then `python src/composite.py --video public/input-video.mp4 --overlay overlay.mov --out out.mp4`
   **Do not put the `<video>` in the composition for a long piece.** Per-frame video
   decode+seek is the heaviest thing Chrome does, and the cost accumulates until capture
   stalls part-way through with `capture stalled: no frame progress for 60000ms`. A 6-minute
   piece died at 76 % that way with 1.6 GB of RAM still free — it is not a memory problem
   and `--low-memory-mode` / `-w 1` do not fix it. Mirroring (`hflip`) and the scale to the
   canvas move into ffmpeg and look identical.
9. Verify the file exists with the right duration — a failed render can still exit 0. Also
   check the audio is not silent (`ffmpeg -i out.mp4 -af volumedetect -f null -`).

## 3. Hard-won rules

- Animate transforms only (`x`, `y`, `scale`, `opacity`). Never tween `left/top/width/height` — they
  snap to integer pixels and stutter under frame-seek capture. To move a highlight, `tl.set()` it
  instantly plus a transform pulse; punchier anyway.
- Never scale inline words — scaled text doesn't reflow and overlaps neighbours.
- SFX must be declared `<audio>` timeline elements. Runtime `.play()` renders completely silent.
- `data-track-index` doesn't control stacking — add explicit `z-index` or a later scrim paints over
  the HUD.
- Cap each card's end at the next card's start or you get overlapping-clip errors.
- **`tl.call()` never fires under frame-seek.** The renderer jumps to each time instead of playing
  through, so callback-driven state (a word counter, a step number) stays frozen at its initial
  value. Drive it from a tween's `onUpdate` reading `tl.time()` and looking the value up — that is
  seek-safe and exact. `lint` does not catch this; only a snapshot does.
- **Scaling a zero-width element renders nothing.** A rule/bar built as `width:0` + `scaleX` 0→1 is
  invisible in every frame. Give it a real width and scale from 0. Same trap as the transformed-
  element rule, and equally silent.
- Media slots must equal the real media length. Setting `data-duration` on `<video>`/`<audio>`
  longer than the file makes the renderer silently shorten the slot (`clip_media_fit`). Keep the
  root `data-duration` longer for an end card, but pass the media length to the media elements.
- **Show one tip at a time**, each its own clip, rather than accumulating bullets in one card — a
  long paragraph's bullets run off the bottom of the frame.
- **Watch per-frame rasterisation cost — `check`, `lint` and `snapshot` all miss it.** The
  spotlight's `box-shadow: 0 0 0 9999px` is cheap on its own, but once the diagram is *zoomed*
  the spread scales with it (9999 × 3 ≈ 30 000 px) and the render stalls at a fixed frame.
  Keep the spread just big enough to reach the container edge (800px here). A stall at the
  *same frame every run* is a composition cost problem; a stall at a *different* frame is
  memory.
- **Annotation phrases must not nest.** If one annotated phrase contains another, the outer
  one splits into two runs — duplicate element id, and the label renders twice. `make_content`
  now fails loudly on overlap instead.
- **Put the separator space OUTSIDE an inline-block wrapper.** Trailing whitespace inside one
  is trimmed, so `with,` and `winds` fuse into `with,winds`.
- **Anchor a label above text with a tight line-box.** An inline-block inherits the paragraph's
  line-height, so `bottom:100%` measures from a box ~2.35em tall and the label lands on the
  line above. Set `line-height:1.15` on the wrapper.
- Translucent gold over a navy scrim reads as muddy olive. A real highlighter — solid gold with
  the text flipped dark as the wipe lands — is far more legible.

## 4. Correcting what I said

1. Grammar/punctuation → fix on-screen text silently. It's a model answer people screenshot.
2. Wrong word I care about → splice my own voice from elsewhere in the recording (my false starts
   are a great source), fitted with `atempo`. Keep the ratio ~0.8×–1.3×. Re-transcribe the spliced
   region to verify.
3. No clean splice → strike the words and show a gold chip `พูดผิด — ต้องเป็น <correct>`, as a
   standalone chip in free space, not inline (it collides with the line above or below).
4. Approximate figures are fine, no marker needed.

Singular/plural slips are invisible in the transcript — Whisper auto-corrects "job"→"jobs",
"area"→"areas". Cut each occurrence into its own clip and transcribe alone with
`condition_on_previous_text=False`.

Check every factual claim against the graph/map. Real errors caught: "80-year period" (it's 60),
"manufacturing and healthcare declined" (healthcare rises), "barbecue on the eastern section"
(it's west), "declined slightly" for a figure that halved.

## 5. Question types

- Graph/chart — measure the image (axis position, gridline spacing, tick x-positions), don't
  eyeball. Highlight the actual plotted point. Legend labels only in the introduction.
- Map — use a spotlight: whole map dims, described region stays lit
  (`box-shadow: 0 0 0 9999px rgba(0,0,0,0.62)` on a gold box). Define each labelled room as a
  rectangle in source-image pixels. Top = north, right = east.
- Process diagram — treat as a map: each numbered stage is a rectangle in source-image pixels,
  spotlit as I describe it.

## 6. Layout (720×1280)

Scrim `left 14, top 150, width 692` · kicker `top ~170`, 19 px, `#8fb8ff` · essay
`top ~215, width 636` · image below text, 560–660 px wide · tip bullets 25 px Kanit.

Font size per paragraph so text never hits the image: short 40–44 px, long 31–34 px.

## 7. Order of operations

1. Confirm the question image matches the recording — I've sent the wrong screenshot before
2. Copy footage → extract audio
3. Transcribe (medium, no VAD, word timestamps)
4. Read transcript; find false starts, stumbles, factual errors
5. Silence-detect → cut list → cut → `remap.json`
6. Audio splices on the cut file, verify each by re-transcribing
7. Word timings → paragraph overrides (grammar pass)
8. Build → check → snapshot → render
9. Report word count vs 150 and every content error found
