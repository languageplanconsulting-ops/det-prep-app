"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PATTERN_ID,
  SPEAKING_PATTERNS,
  emptyPatternNotes,
  getSpeakingPattern,
  isBlank,
  type PatternId,
  type PatternPart,
  type SpeakingPattern,
} from "@/lib/speaking-pattern";

/**
 * Fast Track VIP note-taking scaffold for Read-and-then-speak.
 *
 * During prep the learner picks a pattern (เล่า/บรรยาย or แสดงความเห็น) and
 * fills it in-line. While recording, the same notes come back as a compact
 * sticky card so they can read their own plan out loud.
 *
 * Blanks are contentEditable spans, not <input>: they wrap onto new lines and
 * take as much text as the learner wants to write.
 */

const STORAGE_PREFIX = "ep-speaking-notes:";

type Stored = { patternId: PatternId; byPattern: Partial<Record<PatternId, string[][]>> };

function emptyAll(): Stored {
  return { patternId: DEFAULT_PATTERN_ID, byPattern: {} };
}

function notesFor(stored: Stored, pattern: SpeakingPattern): string[][] {
  const base = emptyPatternNotes(pattern);
  const saved = stored.byPattern[pattern.id];
  if (!Array.isArray(saved)) return base;
  return base.map((row, pi) =>
    row.map((_, bi) => (typeof saved[pi]?.[bi] === "string" ? saved[pi][bi] : "")),
  );
}

export function useSpeakingPatternNotes(key: string | null) {
  const [stored, setStored] = useState<Stored>(emptyAll);
  /** Bumped whenever the blanks must be re-seeded from state (load / clear / switch). */
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const next = ((): Stored => {
      if (!key) return emptyAll();
      try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        // v1 rows were a bare string[][] for the describe pattern.
        if (Array.isArray(parsed)) {
          return { patternId: "describe", byPattern: { describe: parsed as string[][] } };
        }
        if (parsed && typeof parsed === "object") {
          const p = parsed as Stored;
          return {
            patternId: getSpeakingPattern(p.patternId).id,
            byPattern: p.byPattern && typeof p.byPattern === "object" ? p.byPattern : {},
          };
        }
      } catch {
        /* fall through to empty */
      }
      return emptyAll();
    })();
    setStored(next);
    setSeed((n) => n + 1);
  }, [key]);

  const persist = useCallback(
    (next: Stored) => {
      if (!key) return;
      try {
        window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(next));
      } catch {
        /* quota / private mode — notes still live in state */
      }
    },
    [key],
  );

  const pattern = getSpeakingPattern(stored.patternId);
  const notes = useMemo(() => notesFor(stored, pattern), [stored, pattern]);

  const setBlank = useCallback(
    (partIndex: number, blankIndex: number, value: string) => {
      setStored((prev) => {
        const pat = getSpeakingPattern(prev.patternId);
        const rows = notesFor(prev, pat).map((row) => [...row]);
        rows[partIndex][blankIndex] = value;
        const next: Stored = {
          patternId: prev.patternId,
          byPattern: { ...prev.byPattern, [pat.id]: rows },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setPatternId = useCallback(
    (patternId: PatternId) => {
      setStored((prev) => {
        if (prev.patternId === patternId) return prev;
        const next: Stored = { ...prev, patternId };
        persist(next);
        return next;
      });
      setSeed((n) => n + 1);
    },
    [persist],
  );

  const clear = useCallback(() => {
    setStored((prev) => {
      const next: Stored = {
        patternId: prev.patternId,
        byPattern: { ...prev.byPattern, [prev.patternId]: undefined },
      };
      persist(next);
      return next;
    });
    setSeed((n) => n + 1);
  }, [persist]);

  const { filled, total } = useMemo(() => {
    const flat = notes.flat();
    return { filled: flat.filter((v) => v.trim()).length, total: flat.length };
  }, [notes]);

  return {
    pattern,
    setPatternId,
    notes,
    setBlank,
    clear,
    seed,
    filled,
    total,
    hasNotes: filled > 0,
  };
}

export type SpeakingPatternNotesApi = ReturnType<typeof useSpeakingPatternNotes>;

/**
 * Uncontrolled on purpose: React never renders children into the span, so the
 * caret survives every parent re-render and the text can be any length.
 *
 * The coordinates live on the element as data-pi / data-bi so the vocab chips
 * can find the blank the learner is typing in via document.activeElement.
 */
function BlankField({
  initial,
  hint,
  partIndex,
  blankIndex,
  onChange,
}: {
  initial: string;
  hint: string;
  partIndex: number;
  blankIndex: number;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== initial) el.textContent = initial;
    // Seeded once per mount; remounts are driven by the `seed` key upstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      ref={ref}
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-hint={hint}
      data-pi={partIndex}
      data-bi={blankIndex}
      onInput={(e) => onChange(e.currentTarget.textContent ?? "")}
      onPaste={(e) => {
        // Keep pasted text plain so the blank never inherits foreign markup.
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain").replace(/\s+/g, " ");
        document.execCommand("insertText", false, text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      className="mx-[3px] inline min-w-[6ch] rounded-md border-b-2 border-dashed border-[#004AAD]/30 bg-[#004AAD]/[0.04] px-1.5 py-[3px] text-[13px] font-semibold text-[#004AAD] transition-colors empty:before:font-normal empty:before:text-slate-300 empty:before:content-[attr(data-hint)] focus:border-solid focus:border-[#004AAD] focus:bg-[#004AAD]/[0.08] focus:outline-none"
    />
  );
}

function PartRow({
  part,
  index,
  row,
  onChange,
}: {
  part: PatternPart;
  index: number;
  row: string[];
  onChange: (blankIndex: number, value: string) => void;
}) {
  let blankIndex = -1;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-[10px] font-bold text-white">
          {index + 1}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">{part.th}</span>
      </div>
      <p className="mt-2 text-[13px] leading-[2.2] text-slate-700">
        {part.tokens.map((token, i) => {
          if (!isBlank(token)) return <span key={i}>{token}</span>;
          blankIndex += 1;
          const bi = blankIndex;
          return (
            <BlankField
              key={i}
              initial={row[bi] ?? ""}
              hint={token.hint}
              partIndex={index}
              blankIndex={bi}
              onChange={(v) => onChange(bi, v)}
            />
          );
        })}
      </p>
    </div>
  );
}

/** Full editor — shown while the learner is preparing. */
export function SpeakingNotesEditor({
  api,
  onDone,
}: {
  api: SpeakingPatternNotesApi;
  onDone?: () => void;
}) {
  const { pattern, setPatternId, notes, setBlank, clear, seed, filled, total } = api;
  const partsRef = useRef<HTMLDivElement | null>(null);

  /**
   * Tap a vocab chip → drop the word into the blank you are typing in. If no
   * blank has focus, it lands in the first empty one so the tap is never a
   * no-op.
   */
  const insertWord = (word: string) => {
    const active = document.activeElement;
    const focused =
      active instanceof HTMLElement && active.dataset.pi !== undefined ? active : null;
    const el =
      focused ??
      partsRef.current?.querySelector<HTMLElement>("[data-pi]:empty") ??
      partsRef.current?.querySelector<HTMLElement>("[data-pi]");
    if (!el) return;
    const partIndex = Number(el.dataset.pi);
    const blankIndex = Number(el.dataset.bi);
    const current = el.textContent ?? "";
    const next = current.trim() ? `${current.replace(/\s+$/, "")} ${word}` : word;
    el.textContent = next;
    setBlank(partIndex, blankIndex, next);
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  return (
    <div className="rounded-2xl border border-[#004AAD]/15 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          👑 Fast Track VIP
        </span>
        <p className="text-sm font-bold text-slate-800">จดโน้ตลงแพตเทิร์น</p>
        <span className="ml-auto font-mono text-[11px] font-bold text-slate-400">
          {filled}/{total}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-6 text-slate-500">
        เลือกแพตเทิร์นให้ตรงกับโจทย์ → เติมช่องว่าง → ตอนพูดโน้ตนี้จะขึ้นให้อ่าน
      </p>

      {/* Pattern switcher */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {SPEAKING_PATTERNS.map((p) => {
          const active = p.id === pattern.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPatternId(p.id)}
              aria-pressed={active}
              className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                active
                  ? "border-[#004AAD] bg-[#004AAD]/[0.06]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`block text-[13px] font-bold ${active ? "text-[#004AAD]" : "text-slate-700"}`}
              >
                {active ? "● " : "○ "}
                {p.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{p.signal}</span>
            </button>
          );
        })}
      </div>

      <div ref={partsRef} key={`${pattern.id}-${seed}`} className="mt-3 space-y-2">
        {pattern.parts.map((part, i) => (
          <PartRow
            key={i}
            part={part}
            index={i}
            row={notes[i] ?? []}
            onChange={(bi, v) => setBlank(i, bi, v)}
          />
        ))}
      </div>

      {/* Vocab bank for this pattern */}
      <details className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
          <span>💎</span>คำที่ใช้ได้กับแพตเทิร์นนี้
          <span className="text-xs font-normal text-slate-400">{pattern.vocab.length} คำ · แตะเพื่อใส่ในช่อง</span>
        </summary>
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-3">
          {pattern.vocab.map((word) => (
            <button
              key={word.w}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertWord(word.w)}
              title={`ใส่ "${word.w}" ในช่องที่เพิ่งพิมพ์`}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs transition-colors hover:border-[#004AAD] hover:bg-[#004AAD]/[0.06]"
            >
              <span className="font-semibold text-slate-800">{word.w}</span>
              <span className="text-slate-400"> · {word.th}</span>
            </button>
          ))}
        </div>
      </details>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400">โน้ตถูกเก็บไว้ให้อัตโนมัติ</p>
        <div className="flex items-center gap-3">
          {filled > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="text-[11px] font-semibold text-slate-400 hover:text-red-500"
            >
              ล้างโน้ต
            </button>
          ) : null}
          {onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg bg-[#004AAD] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90"
            >
              เสร็จแล้ว
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Read-only sticky card — shown while recording. */
export function SpeakingNotesCard({
  api,
  onEdit,
}: {
  api: SpeakingPatternNotesApi;
  onEdit: () => void;
}) {
  const { pattern, notes, filled, total } = api;
  const [open, setOpen] = useState(true);

  return (
    <div className="sticky top-2 z-20 mt-3 overflow-hidden rounded-2xl border border-[#004AAD]/20 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5">
        <span className="text-sm">📝</span>
        <p className="text-xs font-bold text-slate-800">โน้ตของฉัน</p>
        <span className="truncate text-[10px] text-slate-400">· {pattern.label}</span>
        <span className="font-mono text-[10px] font-bold text-slate-300">
          {filled}/{total}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto shrink-0 text-[11px] font-semibold text-slate-400 hover:text-[#004AAD]"
        >
          แก้ไข
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 text-[11px] font-semibold text-[#004AAD]"
        >
          {open ? "ย่อ" : "ขยาย"}
        </button>
      </div>
      {open ? (
        <div className="max-h-[42vh] space-y-2.5 overflow-y-auto px-3.5 py-3">
          {pattern.parts.map((part, pi) => {
            let bi = -1;
            return (
              <p key={pi} className="text-[13px] leading-[1.9] text-slate-500">
                {part.tokens.map((token, i) => {
                  if (!isBlank(token)) return <span key={i}>{token}</span>;
                  bi += 1;
                  const v = (notes[pi]?.[bi] ?? "").trim();
                  return v ? (
                    <span key={i} className="font-bold text-[#004AAD]">
                      {v}
                    </span>
                  ) : (
                    <span key={i} className="text-slate-300">
                      ______
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
