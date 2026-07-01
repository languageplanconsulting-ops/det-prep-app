"use client";

import { useState } from "react";
import Link from "next/link";

import type { Plan, PlanItem } from "@/lib/study-plan/plan";
import type { SkillKey } from "@/lib/study-plan/diagnostic";

const TH: Record<SkillKey, string> = { reading: "อ่าน", listening: "ฟัง", speaking: "พูด", writing: "เขียน" };
const NAVY = "#004AAD";

// Per-skill destinations + the "learn the technique first" mini-lesson.
// Routes verified against src/app/practice/*. Lesson ids exist in src/lib/mini-study/content.ts.
type SkillCta = {
  practiceHref: string;
  practiceLabel: string;
  lessonHref: string;
  lessonLabel: string;
  introTh: string;
  recommend: "lesson" | "practice";
};

const SKILL_CTA: Record<SkillKey, SkillCta> = {
  reading: {
    practiceHref: "/practice/comprehension/reading",
    practiceLabel: "ฝึกอ่านจับใจความ",
    lessonHref: "/practice/mini-study/session-14",
    lessonLabel: "เทคนิคจับ Main idea",
    introTh: "อ่านจับใจความ ไม่ใช่ท่องศัพท์ — ฝึกจากบทความจริงแล้วตอบคำถาม ถ้าอยากได้เทคนิคเร็ว ๆ มีบทเรียนสั้นให้ด้วย",
    recommend: "practice",
  },
  listening: {
    practiceHref: "/practice/literacy/dictation",
    practiceLabel: "ไปฝึก Dictation",
    lessonHref: "/practice/mini-study/session-2",
    lessonLabel: "เทคนิคฟังจับไวยากรณ์ (เร็ว)",
    introTh: "คนที่อ่อนการฟัง ให้ฝึก Dictation — ฝึกฟังแล้วจับไวยากรณ์ (-ed / -s / passive) ไม่ใช่แค่ฟังศัพท์ มีบทเรียนสั้นสอนเทคนิคเร็ว ๆ ก่อนลงมือ",
    recommend: "lesson",
  },
  speaking: {
    practiceHref: "/practice/production/read-and-speak",
    practiceLabel: "ไปฝึก Read & Speak",
    lessonHref: "/practice/mini-study/session-5",
    lessonLabel: "เรียนแพตเทิร์นการพูดก่อน",
    introTh: "ก่อนลองพูด เรียนเทคนิค + แพตเทิร์นการพูดที่ใช้ได้จริงก่อน แล้วค่อยไปฝึก Read & Speak จะพูดได้ลื่นและตรงโจทย์กว่า",
    recommend: "lesson",
  },
  writing: {
    practiceHref: "/practice/production/read-and-write",
    practiceLabel: "ไปฝึก Read & Write",
    lessonHref: "/practice/mini-study/session-16",
    lessonLabel: "เรียนแพตเทิร์นการเขียนก่อน",
    introTh: "ก่อนลองเขียน มีบทเรียนสั้นสอนแพตเทิร์น + จุดที่มักผิดบ่อย แล้วค่อยไปฝึก Read & Write จะเขียนได้ตรงเกณฑ์กว่า",
    recommend: "lesson",
  },
};

function ModalButton({
  href,
  children,
  primary,
  locked,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        textDecoration: "none",
        borderRadius: 11,
        padding: "12px 14px",
        fontSize: 14,
        fontWeight: 500,
        border: primary ? "none" : `1.5px solid ${locked ? "#e3c98a" : "#cdd6e6"}`,
        background: primary ? NAVY : locked ? "#fff7df" : "#fff",
        color: primary ? "#fff" : locked ? "#7a5e00" : NAVY,
      }}
    >
      {children}
    </Link>
  );
}

function StartModal({
  skill,
  freeUser,
  onClose,
}: {
  skill: SkillKey;
  freeUser: boolean;
  onClose: () => void;
}) {
  const cta = SKILL_CTA[skill];
  const lessonFirst = cta.recommend === "lesson";

  const lessonBtn = freeUser ? (
    <ModalButton href="/pricing" locked>
      🔒 {cta.lessonLabel} · สำหรับสมาชิก
    </ModalButton>
  ) : (
    <ModalButton href={cta.lessonHref} primary={lessonFirst}>
      📘 เรียนเทคนิคก่อน — {cta.lessonLabel}
    </ModalButton>
  );

  const practiceBtn = (
    <ModalButton href={cta.practiceHref} primary={!lessonFirst}>
      ▶ {cta.practiceLabel}
    </ModalButton>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(20,28,46,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          fontFamily: "'IBM Plex Sans Thai', sans-serif",
          boxShadow: "0 24px 60px -20px rgba(16,24,40,0.5)",
        }}
      >
        <div style={{ background: NAVY, color: "#fff", padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>เริ่มฝึก{TH[skill]}</span>
          <button onClick={onClose} aria-label="ปิด" style={{ background: "transparent", border: "none", color: "#cfe0f7", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#3a4254", margin: 0 }}>{cta.introTh}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
            {lessonFirst ? (
              <>
                {lessonBtn}
                {practiceBtn}
              </>
            ) : (
              <>
                {practiceBtn}
                {lessonBtn}
              </>
            )}
          </div>
          {freeUser ? (
            <p style={{ fontSize: 11, color: "#9aa1ad", textAlign: "center", marginTop: 11, marginBottom: 0 }}>
              บทเรียนสั้นสอนเทคนิคเป็นสิทธิ์สมาชิก — ปลดล็อกเพื่อเรียนแพตเทิร์นก่อนฝึก
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Item({ item, index, freeUser, onStart }: { item: PlanItem; index: number; freeUser: boolean; onStart: (skill: SkillKey) => void }) {
  const active = !item.locked;
  return (
    <div style={{ display: "flex", gap: 10, padding: 12, borderRadius: 12, background: active ? "#f4f8ff" : "#fff", border: active ? `2px solid ${NAVY}` : "1px solid #e3e8f0", opacity: active ? 1 : 0.72 }}>
      <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: active ? NAVY : "#d3d7df", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500 }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a2e" }}>
          {TH[item.skill]} <span style={{ color: active ? "#993c1d" : "#5b6472", fontWeight: 400 }}>(จาก {item.fromScore})</span>
        </div>
        <div style={{ fontSize: 12, color: active ? "#993c1d" : "#5b6472", marginTop: 2 }}>{item.whyTh}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8, alignItems: "center" }}>
          {item.modules.map((m) => (
            <span key={m.id} style={{ fontSize: 11, background: active ? "#e7eefb" : "#eef0f3", color: active ? NAVY : "#5b6472", borderRadius: 6, padding: "3px 8px" }}>
              {m.titleTh}
            </span>
          ))}
          <span style={{ fontSize: 11, color: "#888", padding: "3px 4px" }}>~{item.estMinutes} นาที</span>
        </div>
        {active ? (
          <button
            onClick={() => onStart(item.skill)}
            style={{ marginTop: 10, background: NAVY, color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            เริ่มเลย →
          </button>
        ) : (
          <Link
            href="/pricing"
            style={{ display: "inline-block", marginTop: 10, background: "#fff7df", color: "#7a5e00", textDecoration: "none", border: "1px solid #e3c98a", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 500 }}
          >
            🔒 ปลดล็อกเพื่อฝึก{TH[item.skill]}
          </Link>
        )}
      </div>
      <div style={{ flexShrink: 0, color: active ? NAVY : "#9aa1ad", fontSize: 16 }}>{active ? "▶" : "🔒"}</div>
    </div>
  );
}

export default function StudyPlanView({ plan, freeUser = false }: { plan: Plan; freeUser?: boolean }) {
  const [modalSkill, setModalSkill] = useState<SkillKey | null>(null);

  return (
    <div id="study-plan-section" style={{ maxWidth: 360, margin: "0 auto", background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e3e8f0", fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
      <div style={{ background: NAVY, color: "#fff", padding: "14px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>แผนเรียนเฉพาะคุณ</div>
        <div style={{ fontSize: 12, color: "#cfe0f7", marginTop: 2 }}>จาก {plan.predicted} → เป้าหมาย {plan.target} · เรียงจากจุดอ่อนที่สุดก่อน</div>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {plan.items.map((it, i) => (
          <Item key={it.skill} item={it} index={i} freeUser={freeUser} onStart={setModalSkill} />
        ))}
        <Link
          href="/pricing"
          style={{ display: "flex", gap: 10, padding: 12, border: "1px solid #ead9a6", borderRadius: 12, background: "#fcf6e6", textDecoration: "none", opacity: 0.95 }}
        >
          <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "#FFCC00", color: "#5a4600", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚑</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a2e" }}>เส้นชัย: {plan.finishLine.titleTh}</div>
          </div>
          <div style={{ flexShrink: 0, color: "#9aa1ad", fontSize: 16 }}>🔒</div>
        </Link>
      </div>
      <div style={{ margin: "0 14px 16px", background: "#fff7df", border: "1px solid #ffe18a", borderRadius: 12, padding: 13, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#5a4600" }}>ปลดล็อกทั้งแผน — เริ่มจากจุดอ่อนที่สุดของคุณ</div>
        <Link
          href="/pricing"
          style={{ display: "block", marginTop: 9, width: "100%", boxSizing: "border-box", background: NAVY, color: "#fff", textDecoration: "none", border: "none", borderRadius: 10, padding: 11, fontSize: 14, fontWeight: 500 }}
        >
          ดูแพ็กเกจ →
        </Link>
      </div>

      {modalSkill ? <StartModal skill={modalSkill} freeUser={freeUser} onClose={() => setModalSkill(null)} /> : null}
    </div>
  );
}
