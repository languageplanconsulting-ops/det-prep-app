"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NOTEBOOK_BUILTIN, addNotebookEntry } from "@/lib/notebook-storage";
import { playNotebookSavedSound } from "@/lib/notebook-save-feedback";
import type { MiniStudyExplanationBlock } from "@/lib/mini-study/content";

const COACH_IMG =
  "https://i.postimg.cc/Pxyw0bwR/Untitled-September-20-2025-at-16-21-25.png";

type Props = {
  sessionIndex: number;
  durationLabel: string;
  title: string;
  subtitle: string;
  blocks: MiniStudyExplanationBlock[];
  startLabel: string;
  onStart: () => void;
};

type View = "cards" | "lecture";

export function MiniStudyExplanation(props: Props) {
  // Sessions 1-3 default to card stack (focused dictation content).
  // Sessions 4+ default to lecture (longer reference material).
  const defaultView: View = props.sessionIndex >= 4 ? "lecture" : "cards";
  const [view, setView] = useState<View>(defaultView);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/practice/mini-study"
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
        >
          ← Sessions
        </Link>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
          <ViewTab v="cards" cur={view} set={setView}>
            🎴 บทเรียน
          </ViewTab>
          <ViewTab v="lecture" cur={view} set={setView}>
            📖 สรุป
          </ViewTab>
        </div>
      </div>

      {view === "cards" ? (
        <CardStack {...props} onOpenLecture={() => setView("lecture")} />
      ) : (
        <LectureSummary {...props} />
      )}
    </main>
  );
}

/**
 * Turn a heading like "ส่วนที่ 1 — Title the Passage ใน DET คืออะไร?"
 * into a tight TOC label like "Title the Passage ใน DET คืออะไร?"
 */
function tidyHeadingForToc(heading: string): string {
  return heading
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(
      /^(ส่วนที่|กฎข้อ|ข้อที่|Pattern|โครงสร้างที่|Section|Rule|Step|ขั้นที่)\s*\d+\s*[—\-:.)]*\s*/i,
      "",
    )
    .trim();
}

/* ============================================================
   Card Stack view (default for sessions 1-3)
   ============================================================ */

function CardStack({
  sessionIndex,
  durationLabel,
  title,
  subtitle,
  blocks,
  startLabel,
  onStart,
  onOpenLecture,
}: Props & { onOpenLecture: () => void }) {
  const total = blocks.length + 2; // intro + blocks + done
  const [i, setI] = useState(0);
  const pct = Math.round(((i + 1) / total) * 100);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>
            การ์ดที่ {i + 1} / {total}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-[#004AAD] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition ${
                idx <= i ? "bg-[#004AAD]" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="min-h-[420px] rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-7">
        {i === 0 && (
          <IntroCard
            sessionIndex={sessionIndex}
            durationLabel={durationLabel}
            title={title}
            subtitle={subtitle}
            blocks={blocks}
          />
        )}
        {i > 0 && i <= blocks.length && (
          <BlockCard
            block={blocks[i - 1]}
            index={i - 1}
            total={blocks.length}
          />
        )}
        {i === total - 1 && (
          <DoneCard
            startLabel={startLabel}
            onStart={onStart}
            onOpenLecture={onOpenLecture}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setI(Math.max(0, i - 1))}
          disabled={i === 0}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 disabled:opacity-40"
        >
          ← ย้อน
        </button>
        {i < total - 1 ? (
          <button
            onClick={() => setI(i + 1)}
            className="rounded-lg bg-[#004AAD] px-6 py-2 text-sm font-bold text-[#FFCC00] shadow-sm hover:shadow-md transition"
          >
            ต่อไป →
          </button>
        ) : (
          <button
            onClick={onStart}
            className="rounded-lg bg-[#004AAD] px-6 py-2 text-sm font-bold text-[#FFCC00] shadow-sm hover:shadow-md transition"
          >
            {startLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function IntroCard({
  sessionIndex,
  durationLabel,
  title,
  subtitle,
  blocks,
}: {
  sessionIndex: number;
  durationLabel: string;
  title: string;
  subtitle: string;
  blocks: MiniStudyExplanationBlock[];
}) {
  // Cap the visible TOC at 6 items so the intro doesn't become a wall.
  // If there are more, we show "และอีก N หัวข้อ" to set expectations
  // without listing everything.
  const tocItems = blocks.slice(0, 6).map((b) => tidyHeadingForToc(b.heading));
  const hiddenCount = Math.max(0, blocks.length - tocItems.length);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <CoachAvatar size="md" />
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">
            Session {sessionIndex} · ⏱ {durationLabel}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 text-base text-slate-600">{subtitle}</p>
        </div>
      </div>

      {/* "What's in this lesson" — a clear Thai table of contents so students
          know exactly what they're about to learn. Wired into blocks[] so the
          list always matches the actual content the lesson teaches. */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#004AAD]">
          📘 บทเรียนนี้สอนอะไรบ้าง
        </p>
        <ol className="mt-3 space-y-2.5 text-[15px] leading-7 text-slate-800">
          {tocItems.map((label, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-[11px] font-black text-white">
                {idx + 1}
              </span>
              <span className="flex-1">{label}</span>
            </li>
          ))}
          {hiddenCount > 0 ? (
            <li className="pl-9 text-sm text-slate-500">
              …และอีก {hiddenCount} หัวข้อ
            </li>
          ) : null}
        </ol>
      </div>

      <Coach>
        สวัสดีครับ! บทเรียนนี้พี่จะพานักเรียนไปทีละการ์ด ไม่ต้องรีบ — แตะ{" "}
        <strong>"ต่อไป"</strong> เมื่อพร้อม · หรือถ้าอยากอ่านยาวๆ
        ทั้งบทรวด สลับไปแถบ <strong>"📖 สรุป"</strong> ด้านบนได้เลยครับ
      </Coach>
    </div>
  );
}

function BlockCard({
  block,
  index,
  total,
}: {
  block: MiniStudyExplanationBlock;
  index: number;
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-900">
          📘 {index + 1} / {total}
        </span>
      </div>
      <h2 className="text-2xl font-black tracking-tight">{block.heading}</h2>
      <div className="space-y-2 text-base leading-8 text-slate-800 whitespace-pre-wrap">
        {renderMarkdownLines(block.body)}
      </div>
      {block.coachTip && (
        <Coach tone="pink">{renderMarkdownInline(block.coachTip)}</Coach>
      )}
    </div>
  );
}

function DoneCard({
  startLabel,
  onStart,
  onOpenLecture,
}: {
  startLabel: string;
  onStart: () => void;
  onOpenLecture: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 py-6 text-center">
      <CoachAvatar size="lg" />
      <h2 className="text-3xl font-black tracking-tight">พร้อมแล้ว! 🎉</h2>
      <p className="max-w-md text-[15px] text-slate-700">
        นักเรียนเรียนเนื้อหาครบแล้ว ลองลงมือทำแบบฝึกหัดจริงดู ถ้าลืม กลับมาเปิด <strong>"📖 สรุป"</strong> ได้ตลอดครับ
      </p>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          onClick={onOpenLecture}
          className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-800 ring-1 ring-slate-300 shadow-sm hover:shadow-md transition"
        >
          📖 ดูสรุปเต็ม
        </button>
        <button
          onClick={onStart}
          className="rounded-xl bg-[#004AAD] px-7 py-3 text-sm font-bold text-[#FFCC00] shadow-md hover:shadow-lg transition"
        >
          {startLabel}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Lecture Summary (default for sessions 4+, enhanced layout)
   ============================================================ */

function LectureSummary({
  sessionIndex,
  durationLabel,
  title,
  subtitle,
  blocks,
  startLabel,
  onStart,
}: Props) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // IntersectionObserver to highlight active section in sticky nav
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [blocks.length]);

  const bodyForSave = useMemo(
    () =>
      blocks
        .map(
          (b) =>
            `## ${b.heading}\n\n${b.body}${b.coachTip ? `\n\n💬 พี่ดอย: ${b.coachTip}` : ""}`,
        )
        .join("\n\n"),
    [blocks],
  );

  async function handleSave() {
    if (saveState === "saving" || saveState === "saved") return;
    setSaveState("saving");
    try {
      await addNotebookEntry({
        source: "mini-study-lesson",
        categoryIds: [NOTEBOOK_BUILTIN.grammar],
        titleEn: title,
        titleTh: `Mini Study Session ${sessionIndex} · ${durationLabel}`,
        bodyEn: bodyForSave,
        bodyTh: bodyForSave,
        userNote: "",
      });
      playNotebookSavedSound();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function jumpTo(idx: number) {
    const el = sectionRefs.current[idx];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  return (
    <article className="space-y-5">
      {/* Hero header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#004AAD] via-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-7">
        <div className="flex items-start gap-4">
          <CoachAvatar size="md" ring="yellow" />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-200">
              📖 สรุปบทเรียน · Session {sessionIndex}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-blue-100">{subtitle} · สอนโดยพี่ดอย</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState === "saving" || saveState === "saved"}
          className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md transition ${
            saveState === "saved"
              ? "bg-green-400 text-slate-900"
              : saveState === "error"
                ? "bg-red-300 text-red-900"
                : "bg-yellow-400 text-slate-900 hover:bg-yellow-300 hover:shadow-lg"
          }`}
        >
          {saveState === "saved"
            ? "✓ บันทึกไว้ใน Notebook แล้ว"
            : saveState === "saving"
              ? "กำลังบันทึก…"
              : saveState === "error"
                ? "❌ บันทึกไม่สำเร็จ — ลองใหม่"
                : "🔖 บันทึกลง Notebook"}
        </button>
      </div>

      {/* Sticky section nav */}
      <nav className="sticky top-2 z-10 -mx-2 overflow-hidden rounded-2xl bg-white/90 px-2 py-2 shadow-md ring-1 ring-slate-200 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {blocks.map((b, idx) => {
            const isActive = activeIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => jumpTo(idx)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                  isActive
                    ? "bg-[#004AAD] text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {idx + 1}. {shortenHeading(b.heading)}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sections */}
      {blocks.map((block, idx) => {
        const variant = sectionVariant(block.heading);
        return (
          <section
            key={idx}
            ref={(el) => {
              sectionRefs.current[idx] = el;
            }}
            data-idx={idx}
            className={`rounded-3xl p-6 ring-1 transition ${variant.bg}`}
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black shadow-sm ${variant.badge}`}
              >
                {idx + 1}
              </span>
              <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                <span className="mr-2">{variant.icon}</span>
                {block.heading}
              </h2>
            </div>

            <div className={`h-1 w-12 rounded-full mb-4 ${variant.bar}`} />

            <div className="space-y-2 text-base leading-8 text-slate-800 whitespace-pre-wrap">
              {renderMarkdownLines(block.body)}
            </div>

            {block.coachTip && (
              <div className="mt-5">
                <Coach tone="pink">
                  {renderMarkdownInline(block.coachTip)}
                </Coach>
              </div>
            )}
          </section>
        );
      })}

      {/* Footer CTA card */}
      <div className="rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start gap-3">
          <CoachAvatar size="sm" ring="yellow" />
          <p className="text-sm leading-6 text-slate-200">
            <strong className="text-yellow-300">พี่ดอย:</strong> "บทเรียนนี้บันทึกไว้ใน Notebook ของนักเรียนได้นะครับ เปิดมาทบทวนก่อนสอบจริงได้ตลอด — พร้อมแล้วลุยเลย!"
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handleSave}
            disabled={saveState === "saving" || saveState === "saved"}
            className={`flex-1 rounded-xl px-5 py-3 text-sm font-bold shadow-sm transition ${
              saveState === "saved"
                ? "bg-green-400 text-slate-900"
                : "bg-white text-slate-900 hover:bg-slate-100 hover:shadow-md"
            }`}
          >
            {saveState === "saved" ? "✓ บันทึกแล้ว" : "🔖 บันทึกลง Notebook"}
          </button>
          <button
            onClick={onStart}
            className="flex-1 rounded-xl bg-[#FFCC00] px-5 py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-yellow-300 hover:shadow-md transition"
          >
            {startLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   Section variant — picks colors/icon based on heading content
   ============================================================ */

type Variant = {
  icon: string;
  bg: string;
  badge: string;
  bar: string;
};

function sectionVariant(heading: string): Variant {
  const h = heading.toLowerCase();
  if (h.includes("⚠") || h.includes("ข้อผิดพลาด") || h.includes("ผิดพลาด") || h.includes("ระวัง") || h.includes("หลีกเลี่ยง"))
    return {
      icon: "⚠️",
      bg: "bg-gradient-to-br from-amber-50 to-orange-50 ring-amber-200",
      badge: "bg-amber-500 text-white",
      bar: "bg-amber-400",
    };
  if (h.includes("🧠") || h.includes("จำง่าย") || h.includes("เคล็ดลับ") || h.includes("วิธีจำ"))
    return {
      icon: "🧠",
      bg: "bg-gradient-to-br from-pink-50 to-rose-50 ring-pink-200",
      badge: "bg-pink-500 text-white",
      bar: "bg-pink-400",
    };
  if (h.includes("ตัวอย่าง") || h.includes("example"))
    return {
      icon: "✨",
      bg: "bg-gradient-to-br from-green-50 to-emerald-50 ring-green-200",
      badge: "bg-green-600 text-white",
      bar: "bg-green-400",
    };
  if (h.includes("วิธีทำ") || h.includes("วิธีเรียน") || h.includes("เริ่ม") || h.includes("checklist"))
    return {
      icon: "🎯",
      bg: "bg-gradient-to-br from-purple-50 to-fuchsia-50 ring-purple-200",
      badge: "bg-purple-600 text-white",
      bar: "bg-purple-400",
    };
  if (h.includes("คำศัพท์") || h.includes("vocab") || h.includes("transitional"))
    return {
      icon: "📚",
      bg: "bg-gradient-to-br from-cyan-50 to-sky-50 ring-cyan-200",
      badge: "bg-cyan-600 text-white",
      bar: "bg-cyan-400",
    };
  if (h.includes("pattern") || h.includes("โครงสร้าง") || h.includes("structure"))
    return {
      icon: "🧩",
      bg: "bg-gradient-to-br from-indigo-50 to-blue-50 ring-indigo-200",
      badge: "bg-indigo-600 text-white",
      bar: "bg-indigo-400",
    };
  if (h.includes("ทำไม") || h.includes("why"))
    return {
      icon: "💡",
      bg: "bg-gradient-to-br from-yellow-50 to-amber-50 ring-yellow-200",
      badge: "bg-yellow-500 text-white",
      bar: "bg-yellow-400",
    };
  // default — clean white rule card
  return {
    icon: "📘",
    bg: "bg-white ring-slate-200",
    badge: "bg-[#004AAD] text-white",
    bar: "bg-[#004AAD]",
  };
}

function shortenHeading(heading: string): string {
  // Drop leading emoji + "ส่วนที่ N —" / "กฎข้อ N —" prefix for nav chips
  const stripped = heading
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/^(ส่วนที่|กฎข้อ|Pattern|โครงสร้างที่)\s*\d+\s*[—\-:]\s*/i, "")
    .trim();
  return stripped.length > 22 ? stripped.slice(0, 20) + "…" : stripped;
}

/* ============================================================
   Coach + markdown helpers
   ============================================================ */

function CoachAvatar({
  size = "md",
  ring = "amber",
}: {
  size?: "sm" | "md" | "lg";
  ring?: "amber" | "yellow";
}) {
  const sizeClass = size === "lg" ? "h-20 w-20" : size === "md" ? "h-14 w-14" : "h-12 w-12";
  const ringClass = ring === "yellow" ? "ring-yellow-300" : "ring-amber-300";
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={COACH_IMG}
      alt="พี่ดอย"
      className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ${ringClass} shadow-sm`}
    />
  );
}

function Coach({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: "amber" | "blue" | "pink";
}) {
  const toneMap = {
    amber: "from-yellow-50 to-amber-50 ring-amber-200",
    blue: "from-blue-50 to-sky-50 ring-blue-200",
    pink: "from-pink-50 to-rose-50 ring-pink-200",
  };
  return (
    <div className="flex items-start gap-3">
      <CoachAvatar size="sm" />
      <div
        className={`relative flex-1 rounded-2xl bg-gradient-to-br px-4 py-3 ring-1 shadow-sm ${toneMap[tone]}`}
      >
        <div
          className={`absolute -left-1.5 top-4 h-3 w-3 rotate-45 bg-gradient-to-br ring-1 ${toneMap[tone]}`}
        />
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
          💬 พี่ดอย
        </p>
        <div className="mt-1 text-sm leading-6 text-slate-800">{children}</div>
      </div>
    </div>
  );
}

function renderMarkdownLines(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <span key={i} className="block">
      {line.length === 0 ? " " : renderMarkdownInline(line)}
    </span>
  ));
}

function renderMarkdownInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1])
      parts.push(
        <strong key={key++} className="font-bold text-slate-900">
          {m[1]}
        </strong>,
      );
    else if (m[2]) parts.push(<em key={key++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function ViewTab({
  v,
  cur,
  set,
  children,
}: {
  v: View;
  cur: View;
  set: (v: View) => void;
  children: ReactNode;
}) {
  const active = cur === v;
  return (
    <button
      onClick={() => set(v)}
      className={`rounded-md px-3 py-1.5 font-semibold transition ${
        active
          ? "bg-[#004AAD] text-white shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
