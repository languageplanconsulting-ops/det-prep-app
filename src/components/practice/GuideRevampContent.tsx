"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { IntroModalShell } from "@/components/practice/IntroModalShell";
import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { buildPaywallSpec } from "@/lib/paywall-upsell";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * Shared "V4" guide content (outcome-first card + steps + optional credit/mechanics
 * box + mini-session revision link). Used by the admin/preview branch of every exam
 * IntroModal so all 6 guides stay consistent. `accent` is a hex string; tints are
 * derived via 8-digit hex alpha so any per-exam accent works without Tailwind config.
 */

export type GuideStep = { n: string; title: ReactNode; desc: ReactNode };

export type GuideMechanics = {
  /** Heading for the box, e.g. "ก่อนเริ่ม รู้ไว้ 2 อย่าง". */
  title: string;
  showCredits: boolean;
  remaining: number;
  limit: number;
  /** Localised reset label (Thai). */
  resetLabel: string;
  /** Honest bullet points (each may contain <strong>). */
  bullets: ReactNode[];
  /** Drives the paywall upsell card when out of credits. */
  canStart: boolean;
};

export type GuideMini = { label: string; sub: string; href: string };

export function GuideRevampBody({
  accent,
  outcomeLabel = "ทำไปเพื่ออะไร",
  outcomeTitle,
  outcomeSub,
  steps,
  mechanics,
  mini,
}: {
  accent: string;
  outcomeLabel?: string;
  outcomeTitle: ReactNode;
  outcomeSub: ReactNode;
  steps: GuideStep[];
  mechanics?: GuideMechanics;
  mini: GuideMini;
}) {
  return (
    <div className="space-y-5">
      {/* outcome-first: why bother */}
      <div className="rounded-2xl px-4 py-3.5" style={{ backgroundColor: `${accent}14` }}>
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {outcomeLabel}
        </p>
        <p className="mt-1 text-[15px] font-semibold leading-relaxed text-slate-900">{outcomeTitle}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{outcomeSub}</p>
      </div>

      {/* steps */}
      <div className="space-y-3.5">
        {steps.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <span
              className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg text-[13px] font-extrabold"
              style={{ backgroundColor: `${accent}1f`, color: accent }}
            >
              {s.n}
            </span>
            <p className="text-sm leading-relaxed">
              <strong>{s.title}</strong> — {s.desc}
            </p>
          </div>
        ))}
      </div>

      {/* honest mechanics + live credits (feedback-graded exams only) */}
      {mechanics ? (
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{mechanics.title}</p>
            <div className="text-right">
              <p className="font-mono text-base font-bold" style={{ color: accent }}>
                {mechanics.showCredits ? `${mechanics.remaining} / ${mechanics.limit}` : "PLAN-BASED"}
              </p>
              <p className="text-[10px] text-slate-400">
                {mechanics.showCredits ? `โควต้าตรวจ · รีเซ็ต ${mechanics.resetLabel}` : "ตามแพ็กเกจของคุณ"}
              </p>
            </div>
          </div>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-slate-600">
            {mechanics.bullets.map((b, i) => (
              <li key={i}>• {b}</li>
            ))}
          </ul>
          {mechanics.showCredits && !mechanics.canStart ? (
            <div className="mt-3">
              <PaywallUpsellCard spec={buildPaywallSpec("vip", "feedback_limit")} compact />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* mini-session revision link — for course students */}
      <Link
        href={mini.href}
        className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:brightness-[0.97]"
        style={{ border: `1px solid ${accent}33`, backgroundColor: `${accent}0a` }}
      >
        <span className="text-xl leading-none" aria-hidden>
          📚
        </span>
        <div className="flex-1">
          <p className="text-[13px] font-bold" style={{ color: accent }}>
            {mini.label}
          </p>
          <p className="text-[12px] text-slate-500">{mini.sub}</p>
        </div>
        <span className="font-bold" style={{ color: accent }}>
          →
        </span>
      </Link>
    </div>
  );
}

export function GuideRevampFooter({
  accent,
  primaryLabel,
  secondaryLabel = "ไว้ก่อน",
  onEnter,
  onDismiss,
  canStart = true,
}: {
  accent: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onEnter: () => void;
  onDismiss: () => void;
  canStart?: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onEnter}
        disabled={!canStart}
        className="w-full rounded-2xl py-3.5 text-base font-bold text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:brightness-100"
        style={{ backgroundColor: canStart ? accent : "#cbd5e1" }}
      >
        {primaryLabel}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 w-full py-0.5 text-center text-sm font-semibold text-slate-400 hover:text-slate-600"
      >
        {secondaryLabel}
      </button>
    </>
  );
}

/** Per-exam accent hex, keyed for reuse. */
export const GUIDE_ACCENT = {
  vocab: "#0055FF",
  reading: "#FF5C00",
  fitb: "#7C3AED",
  dictation: "#06B6D4",
  speaking: "#F43F5E",
  readWrite: "#10B981",
  // Hub-based exams (no legacy guide) — admin-only via AdminExamGuide.
  writePhoto: "#9333EA",
  speakPhoto: "#DB2777",
  readSpeak: "#0D9488",
  realWord: "#D97706",
  conversation: "#0284C7",
  dialogueSummary: "#4F46E5",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// AdminExamGuide — self-contained, admin/preview-only guide for the 6 exams that
// are entered by navigation (no onClick intro) and had no guide before. Real
// users see nothing (unchanged). All config lives here so no JSX crosses the
// server→client boundary; pages just render <AdminExamGuide exam="..." />.
// ────────────────────────────────────────────────────────────────────────────

export type ExamGuideKey =
  | "write-about-photo"
  | "speak-about-photo"
  | "read-and-speak"
  | "real-word"
  | "interactive-conversation"
  | "dialogue-summary";

type ExamGuideConfig = {
  labelledBy: string;
  titleTh: string;
  titleEn: string;
  badge: string;
  accent: string;
  primaryLabel: string;
  outcomeTitle: ReactNode;
  outcomeSub: ReactNode;
  steps: GuideStep[];
  /** Feedback-graded exams: honest plan-based mechanics box (no live count at hub). */
  mechanicsBullets?: ReactNode[];
  mini: GuideMini;
};

const EXAM_GUIDES: Record<ExamGuideKey, ExamGuideConfig> = {
  "write-about-photo": {
    labelledBy: "write-photo-intro-title",
    titleTh: "เขียนบรรยายภาพ",
    titleEn: "Write about a Photo",
    badge: "GUIDE 05",
    accent: GUIDE_ACCENT.writePhoto,
    primaryLabel: "เริ่มเขียน →",
    outcomeTitle: "ฝึกบรรยายภาพเป็นภาษาอังกฤษ ดันคะแนนกลุ่ม Production",
    outcomeSub: "พิมพ์ ~50 คำต่อ 1 ภาพ แล้วรับฟีดแบ็กทันที — ทักษะที่อัปคะแนนได้ไวที่สุด",
    steps: [
      { n: "1", title: "ดูภาพแล้วเขียนบรรยาย", desc: "เขียนให้ได้ ~50 คำ ภายในเวลาที่กำหนด" },
      { n: "2", title: "กดส่ง รับรายงานทันที", desc: "จุดที่ไวยากรณ์พลาด คำที่ควรใช้ และคะแนนโดยประมาณ" },
      { n: "3", title: "เก็บคำลง Notebook", desc: "นำไปใช้กับภาพถัดไป คะแนนจะขยับ" },
    ],
    mechanicsBullets: [
      <>
        ระบบหักโควตา <strong>เฉพาะตอนกด “ส่งตรวจ”</strong> — เปิดดูเฉย ๆ ไม่เสีย
      </>,
      <>
        <strong>ปิดก่อนส่ง งานที่เขียนจะหาย</strong> (โควตาไม่หาย) เขียนให้จบก่อนค่อยส่ง
      </>,
    ],
    mini: {
      label: "เป็นนักเรียนคอร์ส? ทบทวนการเขียนบรรยายภาพก่อนเริ่ม",
      sub: "มินิเซสชันสอนทีละจุด ~15 นาที · ไว้ทบทวนก่อนลงมือ",
      href: "/practice/mini-study#writing",
    },
  },
  "speak-about-photo": {
    labelledBy: "speak-photo-intro-title",
    titleTh: "พูดบรรยายภาพ",
    titleEn: "Speak about a Photo",
    badge: "GUIDE 08",
    accent: GUIDE_ACCENT.speakPhoto,
    primaryLabel: "เริ่มพูด →",
    outcomeTitle: "ฝึกพูดบรรยายภาพ 30 วินาที ดันคะแนนกลุ่ม Production (Speaking)",
    outcomeSub: "พูดสั้น ๆ ต่อ 1 ภาพ แล้วรับฟีดแบ็กการเลือกใช้คำและความลื่นไหลทันที",
    steps: [
      { n: "1", title: "ดูภาพแล้วพูดบรรยาย", desc: "พูด ~30 วินาที เหมือนสนามจริง" },
      { n: "2", title: "รับฟีดแบ็กรายบุคคล", desc: "คะแนนประเมิน คำที่ควรใช้ และจุดที่ควรปรับ" },
      { n: "3", title: "เก็บคำลง Notebook ไปใช้รอบหน้า", desc: "นำศัพท์ที่แนะนำไปฝึกต่อ" },
    ],
    mechanicsBullets: [
      <>
        ใช้โควตา <strong>ตอนกดส่งให้ตรวจ</strong> เท่านั้น
      </>,
      <>อัดเสียงในที่เงียบ พูดให้ชัด ระบบจะประเมินแม่นขึ้น</>,
    ],
    mini: {
      label: "เป็นนักเรียนคอร์ส? ทบทวนเทคนิคการพูดบรรยายภาพก่อนเริ่ม",
      sub: "มินิเซสชันสอนทีละจุด ~15 นาที · ไว้ทบทวนก่อนลงมือ",
      href: "/practice/mini-study#speaking",
    },
  },
  "read-and-speak": {
    labelledBy: "read-speak-intro-title",
    titleTh: "อ่านแล้วพูด",
    titleEn: "Read, then Speak",
    badge: "GUIDE 09",
    accent: GUIDE_ACCENT.readSpeak,
    primaryLabel: "เริ่มเลย →",
    outcomeTitle: "อ่านบทความสั้น ๆ แล้วพูดสรุปด้วยคำของคุณ ดันคะแนนกลุ่ม Production",
    outcomeSub: "วัดทั้งความเข้าใจการอ่านและการพูด — ฝึกเรียบเรียงความคิดเป็นภาษาอังกฤษ",
    steps: [
      { n: "1", title: "อ่านบทความที่กำหนด", desc: "จับใจความสำคัญให้ได้ก่อน" },
      { n: "2", title: "พูดสรุปด้วยคำของคุณเอง", desc: "ไม่ใช่อ่านตาม แต่เล่าใหม่ด้วยภาษาตัวเอง" },
      { n: "3", title: "รับฟีดแบ็ก + เก็บคำลง Notebook", desc: "นำคำที่แนะนำไปใช้รอบหน้า" },
    ],
    mechanicsBullets: [
      <>
        ใช้โควตา <strong>ตอนกดส่งให้ตรวจ</strong> เท่านั้น
      </>,
      <>อัดเสียงในที่เงียบ พูดให้ชัด ระบบจะประเมินแม่นขึ้น</>,
    ],
    mini: {
      label: "เป็นนักเรียนคอร์ส? ทบทวนเทคนิคการพูดก่อนเริ่ม",
      sub: "มินิเซสชันสอนทีละจุด ~15 นาที · ไว้ทบทวนก่อนลงมือ",
      href: "/practice/mini-study#speaking",
    },
  },
  "real-word": {
    labelledBy: "real-word-intro-title",
    titleTh: "แยกคำจริง/คำปลอม",
    titleEn: "Real Word",
    badge: "GUIDE 10",
    accent: GUIDE_ACCENT.realWord,
    primaryLabel: "เริ่มเลย →",
    outcomeTitle: "ฝึกแยกคำจริงจากคำปลอม ดันคะแนน Literacy & Comprehension",
    outcomeSub: "ยิ่งคลังศัพท์แน่น ยิ่งแยกได้ไว — พาร์ตที่เก็บคะแนนง่ายถ้าแม่นศัพท์",
    steps: [
      { n: "1", title: "เลือกระดับความยาก", desc: "เริ่มจากที่ถนัดก่อนได้" },
      { n: "2", title: "กดเลือกเฉพาะคำที่เป็นคำจริง", desc: "ภายในเวลาที่กำหนด" },
      { n: "3", title: "เจอคำไม่ชัวร์? เก็บลง Notebook", desc: "ไว้ทบทวนภายหลัง" },
    ],
    mini: {
      label: "เป็นนักเรียนคอร์ส? ทบทวนเทคนิคคำศัพท์ก่อนเริ่ม",
      sub: "มินิเซสชันสอนทีละจุด ~15 นาที · ไว้ทบทวนก่อนลงมือ",
      href: "/practice/mini-study#reading",
    },
  },
  "interactive-conversation": {
    labelledBy: "conversation-intro-title",
    titleTh: "ฟังบทสนทนาโต้ตอบ",
    titleEn: "Interactive Conversation",
    badge: "GUIDE 11",
    accent: GUIDE_ACCENT.conversation,
    primaryLabel: "เริ่มฟัง →",
    outcomeTitle: "ฝึกฟังบทสนทนาในมหาวิทยาลัย ดันคะแนนกลุ่ม Conversation",
    outcomeSub: "ฟัง 5 ฉากแล้วตอบคำถาม — เน้นจับ ใคร · ทำไม · เรื่องอะไร",
    steps: [
      { n: "1", title: "ฟังบทสนทนาแต่ละฉาก", desc: "ตั้งใจฟังบริบทของสถานการณ์" },
      { n: "2", title: "ตอบคำถามจับใจความ", desc: "ใคร / ทำไม / เรื่องอะไร" },
      { n: "3", title: "จำคำศัพท์ชีวิตในมหาวิทยาลัย", desc: "เจอบ่อยในข้อสอบจริง" },
    ],
    mini: {
      label: "เป็นนักเรียนคอร์ส? ทบทวนเทคนิคการฟังก่อนเริ่ม",
      sub: "มินิเซสชันสอนทีละจุด ~15 นาที · ไว้ทบทวนก่อนลงมือ",
      href: "/practice/mini-study#listening",
    },
  },
  "dialogue-summary": {
    labelledBy: "dialogue-summary-intro-title",
    titleTh: "ฟังแล้วสรุป",
    titleEn: "Dialogue → Summary",
    badge: "GUIDE 12",
    accent: GUIDE_ACCENT.dialogueSummary,
    primaryLabel: "เริ่มเลย →",
    outcomeTitle: "ฟังบทสนทนาแล้วเขียนสรุป ดันคะแนน Conversation & Production",
    outcomeSub: "ฝึกจับใจความแล้วเรียบเรียงเป็นภาษาอังกฤษ — ได้ทั้งฟังและเขียน",
    steps: [
      { n: "1", title: "ฟังบทสนทนา", desc: "จับว่าใครคุยกันเรื่องอะไร" },
      { n: "2", title: "เขียนสรุปใจความสำคัญ", desc: "เรียบเรียงด้วยคำของคุณเอง" },
      { n: "3", title: "กดส่ง รับฟีดแบ็กทันที", desc: "แล้วเก็บคำที่แนะนำลง Notebook" },
    ],
    mechanicsBullets: [
      <>
        ระบบหักโควตา <strong>เฉพาะตอนกด “ส่งตรวจ”</strong> — เปิดดูเฉย ๆ ไม่เสีย
      </>,
      <>
        <strong>ปิดก่อนส่ง งานที่เขียนจะหาย</strong> (โควตาไม่หาย) เขียนให้จบก่อนค่อยส่ง
      </>,
    ],
    mini: {
      label: "เป็นนักเรียนคอร์ส? ทบทวนเทคนิคการสรุปก่อนเริ่ม",
      sub: "มินิเซสชันสอนทีละจุด ~15 นาที · ไว้ทบทวนก่อนลงมือ",
      href: "/practice/mini-study#writing",
    },
  },
};

export function AdminExamGuide({ exam }: { exam: ExamGuideKey }) {
  const { isAdmin, previewEligible } = useEffectiveTier();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Admin / preview only — real users see no guide here (current behavior).
  if (!(isAdmin || previewEligible)) return null;
  if (!open) return null;

  const cfg = EXAM_GUIDES[exam];
  const dismiss = () => setOpen(false);

  return (
    <IntroModalShell
      open={open}
      onDismiss={dismiss}
      labelledBy={cfg.labelledBy}
      backgroundColor="#e5e7eb"
      title={
        <>
          {cfg.titleTh} <br />
          <span
            className="font-mono text-xl font-bold not-italic normal-case"
            style={{ color: cfg.accent }}
          >
            {cfg.titleEn}
          </span>
        </>
      }
      badge={
        <span
          className="rounded-full px-3 py-1 font-mono text-[11px] font-bold"
          style={{ backgroundColor: `${cfg.accent}14`, color: cfg.accent }}
        >
          {cfg.badge}
        </span>
      }
      footer={
        <GuideRevampFooter
          accent={cfg.accent}
          primaryLabel={cfg.primaryLabel}
          onEnter={dismiss}
          onDismiss={dismiss}
        />
      }
    >
      <GuideRevampBody
        accent={cfg.accent}
        outcomeTitle={cfg.outcomeTitle}
        outcomeSub={cfg.outcomeSub}
        steps={cfg.steps}
        mechanics={
          cfg.mechanicsBullets
            ? {
                title: "ก่อนเริ่ม รู้ไว้",
                showCredits: false,
                remaining: 0,
                limit: 0,
                resetLabel: "",
                canStart: true,
                bullets: cfg.mechanicsBullets,
              }
            : undefined
        }
        mini={cfg.mini}
      />
    </IntroModalShell>
  );
}
