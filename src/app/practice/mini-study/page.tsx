"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  MINI_STUDY_CATEGORY_LABEL_TH,
  MINI_STUDY_CATEGORY_ORDER,
  MINI_STUDY_SESSIONS,
  type MiniStudyCategory,
  type MiniStudySession,
} from "@/lib/mini-study/content";
import { checkMiniStudyAccess, type LockReason } from "@/lib/mini-study/upgrade-copy";

/** Small skill-color dot shown in the corner of each category badge. */
const CATEGORY_DOT: Record<MiniStudyCategory, string> = {
  dictation: "bg-[#FFCC00]",
  speaking: "bg-rose-500",
  listening: "bg-sky-500",
  writing: "bg-violet-500",
  reading: "bg-emerald-500",
};

/** Skill icon shown inside the category badge. */
const CATEGORY_ICON: Record<MiniStudyCategory, string> = {
  dictation: "📝",
  speaking: "🗣",
  listening: "🎧",
  writing: "✍️",
  reading: "📖",
};

const CATEGORY_SUBTITLE_TH: Record<MiniStudyCategory, string> = {
  dictation: "พื้นฐาน · กฎ comma + การเติม -ed / -s",
  speaking: "ฝึกจริง · พูด/เขียนเกี่ยวกับภาพ",
  listening: "ทักษะฟัง · Interactive Listening",
  writing: "งานเขียน · สรุป + Essay",
  reading: "ทักษะอ่าน · Interactive Reading",
};

const PIDOY_PHOTO = "/pidoy.png";

const COMPLETED_KEY = "mini-study-completed";

function loadCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COMPLETED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x) => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

type ModalState =
  | { kind: "closed" }
  | { kind: "open"; session: MiniStudySession; access: LockReason; warnSkip: boolean };

export default function MiniStudyHubPage() {
  const { effectiveTier, isAdmin, previewEligible, loading } = useEffectiveTier();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>({ kind: "closed" });

  useEffect(() => {
    setCompleted(loadCompleted());
  }, []);

  /** Sessions grouped + ordered by category, then by index. */
  const grouped = useMemo(() => {
    const map = new Map<MiniStudyCategory, MiniStudySession[]>();
    for (const s of MINI_STUDY_SESSIONS) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.index - b.index);
    return map;
  }, []);

  /** First non-completed, non-VIP-locked session = "current" / tip-of-the-day. */
  const currentSession = useMemo(() => {
    if (loading) return null;
    for (const cat of MINI_STUDY_CATEGORY_ORDER) {
      const arr = grouped.get(cat) ?? [];
      for (const s of arr) {
        if (completed.has(s.id)) continue;
        const acc = checkMiniStudyAccess(effectiveTier, s.tierRequired, {
          isAdmin,
          previewEligible,
        });
        if (acc.allowed) return s;
      }
    }
    return null;
  }, [grouped, completed, effectiveTier, isAdmin, previewEligible, loading]);

  const doneCount = useMemo(
    () => MINI_STUDY_SESSIONS.filter((s) => completed.has(s.id)).length,
    [completed],
  );
  const totalCount = MINI_STUDY_SESSIONS.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const openSession = useCallback(
    (session: MiniStudySession, opts?: { warnSkip?: boolean }) => {
      const access = checkMiniStudyAccess(effectiveTier, session.tierRequired, {
        isAdmin,
        previewEligible,
      });
      setModal({
        kind: "open",
        session,
        access,
        warnSkip: opts?.warnSkip ?? false,
      });
    },
    [effectiveTier, isAdmin, previewEligible],
  );

  const closeModal = useCallback(() => setModal({ kind: "closed" }), []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-slate-500">
        กำลังโหลด…
      </main>
    );
  }

  return (
    <>
      {/* Sticky progress strip */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">
            เรียนเสร็จแล้ว {doneCount} จาก {totalCount}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#004AAD] transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#004AAD]">{progressPct}%</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-32">
        {/* Admin preview banner */}
        {isAdmin || previewEligible ? (
          <div className="rounded-xl border border-red-200 bg-white p-3 text-xs text-red-700">
            <strong>Admin preview:</strong> ฟีเจอร์นี้ยังเป็น preview · ผู้ใช้ทั่วไปยังไม่เห็นทางเข้านี้
          </div>
        ) : null}

        {/* HERO — พี่ดอย introduces himself */}
        <section className="rounded-2xl bg-[#004AAD] p-5 text-white">
          <div className="flex items-start gap-4">
            <Image
              src={PIDOY_PHOTO}
              alt="พี่ดอย"
              width={64}
              height={64}
              className="h-16 w-16 flex-shrink-0 rounded-full border-[3px] border-[#FFCC00] object-cover"
            />
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFCC00]">
                เทคนิคจากพี่ดอย
              </p>
              <h1 className="mt-0.5 text-xl font-bold">สวัสดีครับ พี่ดอยเอง</h1>
              <p className="mt-2 text-sm leading-6 text-white/90">
                รวม{" "}
                <strong className="text-[#FFCC00]">
                  {totalCount} เทคนิคทำคะแนน DET ให้สูงขึ้น
                </strong>{" "}
                จากที่พี่ดอยสอนนักเรียนมาเป็นร้อยคน · แต่ละเทคนิคใช้เวลา{" "}
                <strong>15 นาที</strong>
              </p>
              <p className="mt-2 inline-block rounded-md bg-white/10 px-2.5 py-1 text-xs">
                💡 เลือกเทคนิคไหนก่อนก็ได้ · ไม่บังคับลำดับ
              </p>
            </div>
          </div>
        </section>

        {/* Plan gate banner — small */}
        <div className="rounded-xl border-l-4 border-[#FFCC00] border border-slate-200 bg-white p-3 text-xs leading-6 text-slate-700">
          <strong>เปิดให้สมาชิก Premium และ VIP เท่านั้น</strong>
          <span className="ml-1 text-slate-600">
            · Premium ทำได้ทุกเทคนิคยกเว้นกลุ่ม Writing Essay · VIP ทำได้ครบ
          </span>
        </div>

        {/* TIP OF THE DAY — only when there's a non-locked, non-completed session */}
        {currentSession ? (
          <button
            type="button"
            onClick={() => openSession(currentSession, { warnSkip: false })}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 border-l-4 border-l-[#FFCC00] bg-white p-3 text-left transition-all duration-150 ease-out hover:border-[#004AAD] hover:shadow-md active:scale-[0.99]"
          >
            <Image
              src={PIDOY_PHOTO}
              alt="พี่ดอย"
              width={36}
              height={36}
              className="h-9 w-9 flex-shrink-0 rounded-full border-[3px] border-[#FFCC00] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFCC00]">
                เทคนิควันนี้
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                ลองเรียน{" "}
                <span className="text-[#004AAD]">
                  เทคนิคที่ {currentSession.index} · {currentSession.title}
                </span>
              </p>
            </div>
            <span className="flex-shrink-0 rounded-lg bg-[#004AAD] px-3 py-1.5 text-xs font-bold text-[#FFCC00]">
              เรียนเลย →
            </span>
          </button>
        ) : null}

        {/* Category beds */}
        {MINI_STUDY_CATEGORY_ORDER.map((cat, catIdx) => {
          const sessions = grouped.get(cat) ?? [];
          if (sessions.length === 0) return null;
          const dotColor = CATEGORY_DOT[cat];
          const doneInCat = sessions.filter((s) => completed.has(s.id)).length;
          return (
            <section
              key={cat}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <header className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#004AAD] text-xl text-white">
                  {CATEGORY_ICON[cat]}
                  <span
                    className={`absolute right-[-2px] top-[-2px] h-3 w-3 rounded-full border-2 border-white ${dotColor}`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#004AAD]">
                    หมวด {catIdx + 1}
                  </p>
                  <h2 className="text-base font-bold text-slate-900">
                    {MINI_STUDY_CATEGORY_LABEL_TH[cat]} — {CATEGORY_SUBTITLE_TH[cat]}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {sessions.length} เทคนิค · เรียนแล้ว {doneInCat}
                  </p>
                </div>
              </header>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                {sessions.map((s) => {
                  const isDone = completed.has(s.id);
                  const isCurrent = currentSession?.id === s.id;
                  const access = checkMiniStudyAccess(
                    effectiveTier,
                    s.tierRequired,
                    { isAdmin, previewEligible },
                  );
                  const isVipLocked = !access.allowed;
                  const isUpcoming = !isDone && !isCurrent && !isVipLocked;
                  // "Skip ahead" warning fires when card is later than currentSession (but not locked/done/current).
                  const isAhead =
                    !!currentSession && !isCurrent && !isDone && !isVipLocked &&
                    s.index > currentSession.index;
                  return (
                    <TipCard
                      key={s.id}
                      session={s}
                      state={
                        isDone
                          ? "done"
                          : isCurrent
                            ? "current"
                            : isVipLocked
                              ? "vip"
                              : "upcoming"
                      }
                      onClick={() => openSession(s, { warnSkip: isAhead })}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="text-center text-[11px] text-slate-400">
          {doneCount}/{totalCount} เทคนิค · ทุก card คลิกเรียนได้ ไม่บังคับลำดับ
        </p>
      </main>

      {/* Floating coach chip — pointer-events:none on wrapper so it never
          blocks card clicks, but the chip itself stays clickable. */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-30">
        <div className="pointer-events-auto flex max-w-[260px] items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg">
          <Image
            src={PIDOY_PHOTO}
            alt="พี่ดอย"
            width={32}
            height={32}
            className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-[#004AAD] object-cover"
          />
          <div className="text-[11px] leading-5 text-slate-700">
            <span className="text-[10px] font-bold text-[#004AAD]">พี่ดอย</span>
            <br />
            {currentSession
              ? `เทคนิคที่ ${currentSession.index} — เริ่มได้เลย ✨`
              : `เก่งมาก! เรียนครบ ${totalCount} เทคนิคแล้ว 🎉`}
          </div>
        </div>
      </div>

      {/* Lesson modal — rendered via portal to body so it's always centred
          in the viewport (independent of scroll/transform/parent overflow). */}
      <LessonModalPortal modal={modal} onClose={closeModal} />
    </>
  );
}

function TipCard({
  session,
  state,
  onClick,
}: {
  session: MiniStudySession;
  state: "done" | "current" | "upcoming" | "vip";
  onClick: () => void;
}) {
  const emoji = SESSION_EMOJI[session.id] ?? "📚";
  const base =
    "relative flex flex-col items-center rounded-xl border bg-white p-3 text-center transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]";
  const stateClass =
    state === "done"
      ? "border-slate-200 bg-slate-50"
      : state === "current"
        ? "border-[2px] border-[#FFCC00] shadow-[0_0_0_3px_rgba(255,204,0,0.2)]"
        : state === "vip"
          ? "border-[#FFCC00]"
          : "border-slate-200 opacity-70 hover:opacity-100";

  return (
    <button type="button" onClick={onClick} className={`${base} ${stateClass}`}>
      <span className="absolute left-2 top-2 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[#eef4ff] px-1.5 text-[9px] font-bold text-[#004AAD]">
        {session.index}
      </span>

      {/* State badge in the top-right */}
      {state === "done" ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[11px] font-bold text-white">
          ✓
        </span>
      ) : state === "current" ? (
        <span className="absolute -right-1 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#FFCC00] text-sm">
          ⚡
        </span>
      ) : state === "vip" ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#FFCC00] text-[10px]">
          🔒
        </span>
      ) : null}

      <span className="mb-1.5 text-2xl leading-none">{emoji}</span>
      <span className="text-[12px] font-bold leading-tight text-slate-800">
        {session.title}
      </span>
      <span
        className={`mt-1 text-[10px] ${
          state === "current"
            ? "font-bold text-[#004AAD]"
            : state === "vip"
              ? "font-semibold text-amber-700"
              : "text-slate-500"
        }`}
      >
        {state === "current"
          ? `ตอนนี้ · ${session.durationLabel}`
          : state === "vip"
            ? "VIP เท่านั้น"
            : session.durationLabel}
      </span>
    </button>
  );
}

/**
 * Portal-rendered modal. Doing this through createPortal(document.body) is
 * what guarantees the modal sits in the viewport-centred coordinate space —
 * any parent's transform/overflow/sticky container would otherwise hijack
 * `position: fixed` and pin the modal to the bottom of the visible area
 * (which is what was happening before).
 *
 * The component is always mounted so the close transition can play out — it
 * just renders nothing when `modal.kind === "closed"`. We split into two
 * components (`LessonModalPortal` wraps mount/unmount; `LessonModal` is the
 * actual content) because we need a render-then-mount tick so the CSS
 * transition has frames to animate over.
 */
function LessonModalPortal({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(<LessonModal modal={modal} onClose={onClose} />, document.body);
}

function LessonModal({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  // Keep the last-opened session around for one extra frame so the close
  // transition can paint with the same content (no flicker to blank).
  const [snapshot, setSnapshot] = useState<Extract<ModalState, { kind: "open" }> | null>(
    null,
  );
  const isOpen = modal.kind === "open";

  useEffect(() => {
    if (modal.kind === "open") setSnapshot(modal);
  }, [modal]);

  // Lock keyboard escape + body scroll while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!snapshot) return null;
  const { session, access, warnSkip } = snapshot;
  const emoji = SESSION_EMOJI[session.id] ?? "📚";
  const isVipLocked = !access.allowed;

  // Transition classes — backdrop fades in, modal scales + fades + slides in.
  const backdropClass = isOpen ? "opacity-100" : "opacity-0 pointer-events-none";
  const modalClass = isOpen
    ? "translate-y-0 opacity-100 scale-100"
    : "translate-y-2 opacity-0 scale-95";

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4 transition-opacity duration-200 ${backdropClass}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden={!isOpen}
    >
      <div
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-all duration-200 ease-out ${modalClass}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#004AAD] text-2xl text-white">
            {emoji}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              ⏱ {session.durationLabel} · {MINI_STUDY_CATEGORY_LABEL_TH[session.category]}
            </p>
            <h2 className="mt-0.5 text-lg font-bold leading-tight">
              เทคนิคที่ {session.index} · {session.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-base hover:bg-slate-200"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        {/* พี่ดอย tip card */}
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 border-l-4 border-l-[#004AAD] bg-slate-50 p-3">
          <Image
            src={PIDOY_PHOTO}
            alt="พี่ดอย"
            width={36}
            height={36}
            className="h-9 w-9 flex-shrink-0 rounded-full border-[3px] border-[#004AAD] object-cover"
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#004AAD]">
              💡 เทคนิคของพี่ดอย
            </p>
            <p className="mt-0.5 text-sm leading-6 text-slate-800">
              {session.shortHookTh}
            </p>
          </div>
        </div>

        {/* Skip-ahead warning */}
        {warnSkip && !isVipLocked ? (
          <div className="mt-3 rounded-lg border-l-4 border-[#004AAD] bg-slate-50 p-3 text-xs leading-6 text-slate-700">
            <strong className="text-[#004AAD]">จะลองเทคนิคนี้ก่อนเลยไหม?</strong> เทคนิคนี้อยู่ในหมวดถัดไป
            — ถ้าเริ่มใหม่ ทำหมวดก่อนหน้าให้ครบจะมั่นใจขึ้น แต่ถ้ามีพื้นฐานแล้ว เริ่มได้เลย
          </div>
        ) : null}

        {/* VIP lock panel */}
        {isVipLocked ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-1 text-xs font-bold text-amber-900">
              🔒 {access.headlineTh}
            </p>
            <p className="mb-3 text-xs leading-6 text-slate-700">
              สมัครสมาชิกเพื่อปลดล็อก Writing Essay + ฟีเจอร์ประเมินละเอียดเป็นภาษาไทย
            </p>
            <Link
              href={access.href}
              className="block w-full rounded-lg bg-slate-900 px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-slate-800"
              onClick={onClose}
            >
              ENGLISH PLAN TEAM · {access.ctaTh}
            </Link>
          </div>
        ) : null}

        {/* CTA */}
        {!isVipLocked ? (
          <Link
            href={`/practice/mini-study/${session.id}`}
            className="mt-4 block w-full rounded-lg bg-[#004AAD] px-6 py-3.5 text-center text-base font-bold text-[#FFCC00] hover:opacity-90"
            onClick={onClose}
          >
            ▶ เริ่มเทคนิคนี้
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Per-session emoji used on the technique tile + modal header. */
const SESSION_EMOJI: Record<string, string> = {
  "session-1": "📝",
  "session-2": "✏️",
  "session-3": "✒️",
  "session-4": "✍️",
  "session-5": "🎤",
  "session-7": "🎧",
  "session-8": "💬",
  "session-9": "🎯",
  "session-10": "📝",
  "session-11": "📜",
  "session-12": "🔍",
  "session-13": "📖",
  "session-14": "💡",
  "session-15": "🧩",
};
