# A2 → B1 Expressions, Collocations & Phrasal Verbs
### Research + master word list for a Thai-medium, American-English textbook

Compiled 2026-08-28.

## The files

| File | What's in it |
|---|---|
| [01-research-brief.md](01-research-brief.md) | **How many words do they need?** Corpus evidence, measured counts from the Oxford 3000 (American) and Cambridge B1 lists, phrasal-verb coverage data, Thai-learner error research. Full source list. |
| [02-taxonomy-and-syllabus.md](02-taxonomy-and-syllabus.md) | **The categorization logic.** The five-tag model, the 16-unit syllabus, and what a unit looks like. |
| [03-phrasal-verbs.md](03-phrasal-verbs.md) | **170 phrasal verbs**, tiered, with Thai, examples, separability rules, and the 8-particle system. |
| [04-collocations.md](04-collocations.md) | **346 collocations**, built on the 12-verb delexical spine + adj/adv patterns + the preposition danger zone. |
| [05-expressions.md](05-expressions.md) | **169 expressions** grouped by communicative function, plus 20 reduced spoken forms. |
| [06-thai-traps.md](06-thai-traps.md) | **60 Thai-interference errors** with fixes, grouped by cause. The book's differentiator. |
| [master-list.csv](master-list.csv) | All items, machine-readable, tagged — filter this to build any worksheet. |
| [English-in-Chunks.pdf](English-in-Chunks.pdf) | **The finished textbook** — 51-page A4 workbook, 54 exercises, full answer key. Built from `book/`. |

## Rebuilding the textbook

The PDF is generated, not hand-made. Edit the numbered HTML parts in `book/`, then:

```bash
cd "docs/expressions-a2-b1/book" && python3 build.py
```

`build.py` renders with headless Chrome twice: pass 1 finds which page each chapter landed on (matching headings by font size, not raw text — body prose repeats the titles), writes those numbers into the contents, then pass 2 re-renders and stamps the running foot and folios with PyMuPDF. Never hand-edit `book.html`; it is concatenated from the parts.

## The answer in one paragraph

To cover B1, a learner needs **~2,750 word families / ~2,580 headwords** (three independent methods agree: Milton & Alexiou's testing, the American Oxford 3000 counted directly, and the Cambridge B1 syllabus). The A2→B1 step alone is **809 new headwords**. But single words are not what separates A2 from B1 in production — **multi-word items** are. This collection specifies **685 of them**: 170 phrasal verbs (150 covers 75%+ of all phrasal-verb use in American English, per the COCA-based PHaVE List — so 170 comfortably over-covers B1, where Cambridge's own exam list has only 94), 346 collocations, and 169 functional expressions. At **8–12 new items per lesson**, that is a **60–70 lesson / two-semester course**.

## Scope decisions made

- **American English is the default, not a comparison.** British forms appear only as recognition items in grey sidebars. `🇺🇸` marks every item where the two varieties differ.
- **Two senses per phrasal verb, maximum.** Corpus evidence shows two senses cover 75%+ of use; a third sense costs more than it returns.
- **Tier 3 items are never tested productively.** They are glossed and met once.
- **Famous-but-rare idioms were cut** (*raining cats and dogs*, *kick the bucket*). Every idiom here is one a student can actually use.
