"use client";

import { useState, type ReactNode } from "react";

/**
 * Choose-Difficulty redesigns — rebuilt on the *correct* score-band mastery model.
 *
 * DET truth:
 *   Easy   ≈ score band 85   (foundation)
 *   Medium ≈ score band 125  (mid)
 *   Hard   ≈ score band 130+ (advanced)
 *
 * Mastery flows upward, gated at ~95% per band:
 *   - Target 85   → just master Easy
 *   - Target 125  → must master Easy (95%) AND Medium (95%)
 *   - Target 130+ → must master Easy + Medium + Hard
 *
 * So "Choose difficulty" isn't really a choice — it's a question of which
 * band the learner is currently pushing toward 95% on the way to their
 * target. All 4 redesigns reflect this. Switch the simulated target in the
 * top-right dropdown to see how each layout adapts.
 */

type Tab = "A" | "B" | "C" | "D";
type Tier = "easy" | "medium" | "hard";
type Target = 85 | 100 | 125 | 130 | 140;

/** Mastery threshold per band — the user said "almost 95%". */
const MASTERY = 95;

const TIER_BAND: Record<Tier, number> = { easy: 85, medium: 125, hard: 140 };
const TIER_LABEL: Record<Tier, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const TIER_THAI: Record<Tier, string> = { easy: "ง่าย", medium: "ปานกลาง", hard: "ยาก" };
const TIER_EMOJI: Record<Tier, string> = { easy: "🟢", medium: "🟡", hard: "🔴" };

const FAKE_PROGRESS = {
  easy: { done: 4, total: 6, avg: 92, sample: "She walked to the store, didn't she?" },
  medium: { done: 2, total: 20, avg: 71, sample: "Although it was raining, the children continued to play outside." },
  hard: { done: 0, total: 5, avg: null as number | null, sample: "The report, which had been delayed for weeks, was finally submitted." },
} as const;

/**
 * Which tiers must be mastered for a given target score?
 * - 85   → Easy only
 * - 100  → Easy mastered + push Medium loosely
 * - 125  → Easy + Medium
 * - 130  → Easy + Medium + Hard
 * - 140  → all three at ≥95% AND keep at it
 */
function tiersRequiredFor(target: Target): Tier[] {
  if (target <= 85) return ["easy"];
  if (target <= 125) return ["easy", "medium"];
  return ["easy", "medium", "hard"];
}

type TierState = "mastered" | "active" | "future" | "optional";

/**
 * State of each tier given a target score and current avg %.
 *   mastered → ≥95% (gate cleared)
 *   active   → required by target, not yet at 95%
 *   future   → required by target, but a lower tier hasn't cleared yet
 *   optional → not strictly required by target (above what they need)
 */
function getTierStates(target: Target): Record<Tier, TierState> {
  const required = new Set(tiersRequiredFor(target));
  const order: Tier[] = ["easy", "medium", "hard"];
  let foundActive = false;
  const states: Record<Tier, TierState> = { easy: "optional", medium: "optional", hard: "optional" };
  for (const t of order) {
    const p = FAKE_PROGRESS[t];
    const reqByTarget = required.has(t);
    if (reqByTarget) {
      if ((p.avg ?? 0) >= MASTERY) {
        states[t] = "mastered";
      } else if (!foundActive) {
        states[t] = "active";
        foundActive = true;
      } else {
        states[t] = "future";
      }
    } else {
      states[t] = "optional";
    }
  }
  return states;
}

export default function DifficultyRedesignPreview() {
  const [tab, setTab] = useState<Tab>("A");
  const [target, setTarget] = useState<Target>(125);
  const states = getTierStates(target);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700">
                Redesign Preview — score-band mastery model
              </p>
              <h1 className="text-sm font-bold">Round 2 · Dictation</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                <span className="text-slate-500">Target:</span>
                <select
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value) as Target)}
                  className="rounded bg-white px-2 py-0.5 font-bold ring-1 ring-slate-200"
                >
                  <option value={85}>85 (basic)</option>
                  <option value={100}>100</option>
                  <option value={125}>125 (mid)</option>
                  <option value={130}>130</option>
                  <option value={140}>140+</option>
                </select>
              </label>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                <TabBtn cur={tab} v="A" set={setTab}>A · Checklist</TabBtn>
                <TabBtn cur={tab} v="B" set={setTab}>B · Push level</TabBtn>
                <TabBtn cur={tab} v="C" set={setTab}>C · Score ladder</TabBtn>
                <TabBtn cur={tab} v="D" set={setTab}>D · Dashboard</TabBtn>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <Rationale tab={tab} />
        {tab === "A" && <OptionA target={target} states={states} />}
        {tab === "B" && <OptionB target={target} states={states} />}
        {tab === "C" && <OptionC target={target} states={states} />}
        {tab === "D" && <OptionD target={target} states={states} />}
      </div>
    </main>
  );
}

function TabBtn({
  cur,
  v,
  set,
  children,
}: {
  cur: Tab;
  v: Tab;
  set: (v: Tab) => void;
  children: ReactNode;
}) {
  const active = cur === v;
  return (
    <button
      onClick={() => set(v)}
      className={`rounded-md px-3 py-1.5 font-semibold transition ${
        active ? "bg-[#004AAD] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function Rationale({ tab }: { tab: Tab }) {
  const map: Record<Tab, { title: string; body: string }> = {
    A: {
      title: "A. Mastery checklist (Krug — Don't Make Me Think)",
      body:
        "The Choose-Difficulty page is dropped. After Round 2 you land here: target score at the top, then 3 mastery rows showing exactly what's required and your current %. Tiers above your target are tagged 'optional'. One screen, one decision: which row to click. Krug's first rule met.",
    },
    B: {
      title: "B. Push the right level (Brown — Change By Design)",
      body:
        "Empathy: the learner doesn't know what to choose, but the system does. If your target is 125 and Easy is already 92%, you need 3 more points to clear Easy's 95% gate, then the long climb on Medium. One big primary action on the level you should push. Other levels are secondary.",
    },
    C: {
      title: "C. Score milestone ladder (Tidwell — Designing Interfaces)",
      body:
        "Vertical ladder of score bands (85 → 100 → 125 → 130+). Your target is flagged with a star. Each rung gates the next at 95%. You see exactly how many bands stand between you and your target — and which band you're climbing today.",
    },
    D: {
      title: "D. Target-mastery dashboard (Tidwell + Nodder — Evil by Design)",
      body:
        "Keep three cards but reframe each as a score-band investment: 'Easy = score 85 floor', 'Medium = unlocks 125', 'Hard = unlocks 130+'. The card the learner needs to push is sized 50% bigger with a strong CTA. Mastered cards collapse into a green checkmark. Optional cards greyed out.",
    },
  };
  const x = map[tab];
  return (
    <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">{x.title}</p>
      <p className="mt-1 text-[13px] leading-6 text-amber-900">{x.body}</p>
    </div>
  );
}

function Crumb() {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-semibold text-[#004AAD]">← All rounds</span>
      <span className="text-slate-300">·</span>
      <span className="text-slate-500">Round 2</span>
    </div>
  );
}

function TargetHeader({ target }: { target: Target }) {
  const requiredTiers = tiersRequiredFor(target);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#004AAD] to-blue-700 p-5 text-white shadow-md">
      <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-200">เป้าหมายของคุณ</p>
      <div className="mt-1 flex items-end gap-3">
        <span className="text-5xl font-black tracking-tight">{target}</span>
        <span className="pb-1.5 text-sm font-semibold text-blue-100">/ 160</span>
        <button className="ml-auto self-start rounded-md bg-white/15 px-2 py-1 text-[10px] font-bold uppercase backdrop-blur hover:bg-white/25">
          แก้ไข
        </button>
      </div>
      <p className="mt-3 text-xs text-blue-100">
        {target <= 85
          ? "พื้นฐาน — เน้น Easy ให้แม่น ≥95% พอ"
          : target <= 125
            ? "ระดับกลาง — ต้อง Easy & Medium ≥95% ทั้งคู่"
            : "ระดับสูง — ต้อง Easy + Medium + Hard ≥95%"}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["easy", "medium", "hard"] as const).map((t) => {
          const need = requiredTiers.includes(t);
          return (
            <span
              key={t}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                need ? "bg-yellow-300 text-slate-900" : "bg-white/15 text-blue-100"
              }`}
            >
              {TIER_EMOJI[t]} {TIER_LABEL[t]} {need ? "ต้องผ่าน 95%" : "ไม่จำเป็น"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   OPTION A — Mastery checklist (Krug)
   ============================================================ */

function OptionA({ target, states }: { target: Target; states: Record<Tier, TierState> }) {
  const order: Tier[] = ["easy", "medium", "hard"];
  return (
    <div className="space-y-4">
      <Crumb />
      <TargetHeader target={target} />
      <div className="space-y-3">
        {order.map((t) => {
          const p = FAKE_PROGRESS[t];
          const s = states[t];
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          const gapToMastery = p.avg != null ? Math.max(0, MASTERY - p.avg) : MASTERY;
          return (
            <button
              key={t}
              className={`flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left transition hover:shadow-md ${
                s === "active" ? "border-[#FFCC00] ring-2 ring-[#FFCC00]/40" : "border-slate-200"
              } ${s === "optional" ? "opacity-60" : ""}`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
                  s === "mastered"
                    ? "bg-emerald-500 text-white"
                    : s === "active"
                      ? "bg-[#FFCC00] text-slate-900"
                      : s === "future"
                        ? "bg-slate-200 text-slate-500"
                        : "bg-slate-100 text-slate-400"
                }`}
              >
                {s === "mastered" ? "✓" : TIER_EMOJI[t]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {TIER_LABEL[t]} ({TIER_THAI[t]})
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      s === "mastered"
                        ? "bg-emerald-100 text-emerald-800"
                        : s === "active"
                          ? "bg-yellow-100 text-yellow-900"
                          : s === "future"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {s === "mastered"
                      ? "เชี่ยวชาญแล้ว ≥95%"
                      : s === "active"
                        ? "✦ ทำต่อนะครับ"
                        : s === "future"
                          ? "รอคิว"
                          : "ไม่จำเป็นต่อเป้า"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  ใช้สำหรับเป้าคะแนน {TIER_BAND[t]} · เสร็จ {p.done}/{p.total} ชุด ({pct}%)
                </p>
                {s === "active" ? (
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    ปัจจุบัน {p.avg}% — ขาดอีก {gapToMastery}% เพื่อผ่าน 95%
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-[#004AAD]">{p.avg != null ? `${p.avg}%` : "—"}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400">{p.done}/{p.total}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   OPTION B — Push the right level (Brown)
   ============================================================ */

function OptionB({ target, states }: { target: Target; states: Record<Tier, TierState> }) {
  const activeTier = (Object.entries(states).find(([, s]) => s === "active")?.[0] ?? "easy") as Tier;
  const ap = FAKE_PROGRESS[activeTier];
  const gap = ap.avg != null ? Math.max(0, MASTERY - ap.avg) : MASTERY;
  const order: Tier[] = ["easy", "medium", "hard"];

  return (
    <div className="space-y-4">
      <Crumb />
      <TargetHeader target={target} />

      <div className="rounded-3xl bg-gradient-to-br from-[#FFCC00] to-amber-300 p-6 shadow-lg">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-extrabold uppercase text-yellow-300">
          🎯 ระดับที่ต้องดันตอนนี้
        </span>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
          {TIER_EMOJI[activeTier]} {TIER_LABEL[activeTier]}
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          คุณอยู่ที่ {ap.avg}% — ต้องดันให้ถึง 95% (ขาดอีก {gap}%) เพื่อเข้าใกล้เป้าคะแนน {target}
        </p>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-bold text-slate-800">
            <span>ปัจจุบัน {ap.avg}%</span>
            <span>เป้า 95%</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/50">
            <div
              className="h-full bg-slate-900"
              style={{ width: `${Math.min(100, (ap.avg ?? 0))}%` }}
            />
          </div>
        </div>
        <button className="mt-5 w-full rounded-xl bg-slate-900 px-6 py-4 text-base font-extrabold text-yellow-300 shadow-md hover:bg-slate-800 sm:w-auto">
          ▶ ทำต่อ {TIER_LABEL[activeTier]} — ชุดที่ {ap.done + 1}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">ระดับอื่น</p>
        <div className="space-y-2">
          {order
            .filter((t) => t !== activeTier)
            .map((t) => {
              const p = FAKE_PROGRESS[t];
              const s = states[t];
              return (
                <button
                  key={t}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-[#004AAD]"
                >
                  <span className="text-xl">{TIER_EMOJI[t]}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {TIER_LABEL[t]} ({TIER_THAI[t]}) ·{" "}
                      <span className="text-xs font-semibold text-slate-500">เป้าคะแนน {TIER_BAND[t]}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {s === "mastered"
                        ? `✓ ผ่าน 95% แล้ว (${p.avg}%) — ทบทวนได้เมื่อต้องการ`
                        : s === "optional"
                          ? `เป้าคุณคือ ${target} — ระดับนี้ไม่จำเป็น แต่ลองทำได้`
                          : `${p.done}/${p.total} · ${p.avg ?? "—"}%`}
                    </p>
                  </div>
                  <span className="text-slate-400">→</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   OPTION C — Score milestone ladder (Tidwell)
   ============================================================ */

function OptionC({ target, states }: { target: Target; states: Record<Tier, TierState> }) {
  const order: Tier[] = ["easy", "medium", "hard"];
  return (
    <div className="space-y-4">
      <Crumb />
      <TargetHeader target={target} />

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#004AAD]">เส้นทางสู่เป้า</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">บันไดคะแนน DET</h2>

        <div className="relative mt-6">
          <div className="absolute left-[22px] top-2 bottom-2 w-1 bg-slate-200" />
          <div className="space-y-4">
            {order.map((t, idx) => {
              const p = FAKE_PROGRESS[t];
              const s = states[t];
              const isTarget = TIER_BAND[t] >= target && (idx === 0 || TIER_BAND[order[idx - 1]] < target);
              return (
                <div key={t} className="relative pl-14">
                  <div
                    className={`absolute left-0 top-2 flex h-12 w-12 items-center justify-center rounded-full text-xl font-black shadow ${
                      s === "mastered"
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-200"
                        : s === "active"
                          ? "bg-[#FFCC00] text-slate-900 ring-4 ring-yellow-200"
                          : s === "future"
                            ? "bg-slate-200 text-slate-500 ring-4 ring-slate-100"
                            : "bg-slate-100 text-slate-400 ring-4 ring-slate-50"
                    }`}
                  >
                    {s === "mastered" ? "✓" : s === "active" ? "★" : TIER_BAND[t]}
                  </div>
                  <div
                    className={`rounded-2xl border p-4 ${
                      s === "active"
                        ? "border-[#FFCC00] bg-amber-50 shadow-md"
                        : s === "mastered"
                          ? "border-emerald-200 bg-white"
                          : "border-slate-200 bg-slate-50"
                    } ${s === "optional" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          เป้าคะแนน {TIER_BAND[t]}
                        </p>
                        <h3 className="mt-0.5 text-xl font-black text-slate-900">
                          {TIER_EMOJI[t]} {TIER_LABEL[t]} ({TIER_THAI[t]})
                        </h3>
                      </div>
                      {isTarget ? (
                        <span className="rounded-full bg-yellow-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-900">
                          ⭐ เป้าคุณอยู่ระดับนี้
                        </span>
                      ) : null}
                    </div>

                    {p.avg != null ? (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] font-bold text-slate-600">
                          <span>ปัจจุบัน {p.avg}%</span>
                          <span className={p.avg >= MASTERY ? "text-emerald-700" : "text-slate-500"}>
                            ผ่าน 95%
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                          <div
                            className={`h-full ${p.avg >= MASTERY ? "bg-emerald-500" : "bg-[#004AAD]"}`}
                            style={{ width: `${Math.min(100, p.avg)}%` }}
                          />
                          <div
                            className="-mt-2 h-2 border-r-2 border-dashed border-slate-400"
                            style={{ width: `${MASTERY}%` }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {s === "active" ? (
                      <button className="mt-4 w-full rounded-xl bg-[#004AAD] px-4 py-2.5 text-sm font-extrabold text-[#FFCC00] shadow-sm hover:shadow-md">
                        ▶ ทำต่อ — ชุดที่ {p.done + 1}
                      </button>
                    ) : s === "mastered" ? (
                      <p className="mt-3 text-xs font-bold text-emerald-700">
                        ✓ คะแนน {TIER_BAND[t]} ปลดล็อกแล้ว — ทบทวนได้ถ้าต้องการ
                      </p>
                    ) : s === "future" ? (
                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        🔒 ปลดล็อกเมื่อระดับก่อนหน้าผ่าน 95%
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">
                        เกินเป้าหมาย {target} — ลองได้แต่ไม่บังคับ
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   OPTION D — Target-mastery dashboard (Tidwell + Nodder)
   ============================================================ */

// Tier palette borrowed from the Practice Hub section cards — pastel tinted
// surfaces with matching ring + accent text. Colorful but tasteful.
const TIER_THEME: Record<
  Tier,
  { bg: string; ring: string; dot: string; bar: string; title: string; sub: string; review: string }
> = {
  easy: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-600",
    title: "text-emerald-900",
    sub: "text-emerald-700",
    review: "text-emerald-700",
  },
  medium: {
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-600",
    title: "text-amber-900",
    sub: "text-amber-700",
    review: "text-amber-700",
  },
  hard: {
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    dot: "bg-rose-500",
    bar: "bg-rose-600",
    title: "text-rose-900",
    sub: "text-rose-700",
    review: "text-rose-700",
  },
};

function OptionDTargetHeader({ target }: { target: Target }) {
  const required = tiersRequiredFor(target);
  const names = required.map((t) => TIER_LABEL[t]).join(" และ ");
  return (
    <div className="rounded-2xl bg-[#004AAD] p-5 text-white sm:p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
          เป้าหมายของคุณ
        </p>
        <button className="rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur transition hover:bg-white/25">
          แก้ไข
        </button>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-5xl font-black tracking-tight">{target}</span>
        <span className="pb-1 text-sm text-blue-100">/ 160</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-blue-50">
        ถ้าอยากได้ราว ๆ <span className="font-bold text-white">{target}</span> คะแนน
        แนะนำให้ทำ <span className="font-bold text-[#FFCC00]">{names}</span> ให้ได้{" "}
        <span className="font-bold text-white">95% ขึ้นไป</span> ก่อนค่อยขยับระดับถัดไป
        <span className="mt-1 block text-xs text-blue-200">
          ทุกระดับเปิดให้ทำได้เสมอ — นี่เป็นแค่คำแนะนำตามเป้าหมายของคุณ
        </span>
      </p>
    </div>
  );
}

function OptionD({ target, states }: { target: Target; states: Record<Tier, TierState> }) {
  const order: Tier[] = ["easy", "medium", "hard"];
  const bandText: Record<Tier, string> = {
    easy: "ช่วงคะแนน ~85",
    medium: "ช่วงคะแนน ~125",
    hard: "ช่วงคะแนน 130+",
  };

  return (
    <div className="space-y-4">
      <Crumb />
      <OptionDTargetHeader target={target} />

      <div className="grid gap-3 lg:grid-cols-3">
        {order.map((t) => {
          const p = FAKE_PROGRESS[t];
          const s = states[t];
          const theme = TIER_THEME[t];
          const recommended = s === "active";
          const mastered = s === "mastered";
          const optional = s === "optional";
          const gapToMastery = p.avg != null ? Math.max(0, MASTERY - p.avg) : MASTERY;

          const statusLabel = mastered
            ? "ทำได้ตามเป้าแล้ว"
            : recommended
              ? "แนะนำให้เน้นตอนนี้"
              : optional
                ? "เกินเป้า — ทำเสริมได้"
                : "ทำต่อได้เลย";

          return (
            // Whole card is a clickable link — nothing is locked.
            <button
              key={t}
              className={`group flex flex-col rounded-2xl ${theme.bg} p-5 text-left ring-1 ${theme.ring} transition hover:shadow-md ${
                recommended ? "ring-2 ring-[#004AAD]" : ""
              } ${optional ? "opacity-80" : ""}`}
            >
              {/* Status + recommended badge */}
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${theme.sub}`}>
                  {statusLabel}
                </p>
                {recommended ? (
                  <span className="rounded-full bg-[#004AAD] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#FFCC00]">
                    แนะนำ
                  </span>
                ) : mastered ? (
                  <span className={`text-sm font-bold ${theme.review}`}>✓</span>
                ) : null}
              </div>

              {/* Title — dot + name + thai */}
              <div className="mt-2 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.dot}`} />
                <h2 className={`text-xl font-extrabold ${theme.title}`}>{TIER_LABEL[t]}</h2>
                <span className={`text-sm ${theme.sub}`}>{TIER_THAI[t]}</span>
              </div>
              <p className={`mt-0.5 pl-[18px] text-xs ${theme.sub}`}>{bandText[t]}</p>

              {/* Sample sentence — italic on a soft white panel */}
              <p className="mt-4 rounded-lg bg-white/60 px-3 py-2.5 text-sm italic leading-6 text-slate-700">
                &ldquo;{p.sample}&rdquo;
              </p>

              {/* Progress */}
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-xs">
                  <span className={`font-bold ${theme.title}`}>
                    {p.avg != null ? `${p.avg}%` : "ยังไม่เริ่ม"}
                  </span>
                  <span className={theme.sub}>เป้า 95%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/70">
                  <div
                    className={`h-full rounded-full ${theme.bar}`}
                    style={{ width: `${Math.min(100, p.avg ?? 0)}%` }}
                  />
                </div>
                {recommended && p.avg != null && p.avg < MASTERY ? (
                  <p className={`mt-2 text-xs leading-5 ${theme.sub}`}>
                    อีก {gapToMastery}% จะมั่นใจได้ในช่วงคะแนน {TIER_BAND[t]}
                  </p>
                ) : null}
              </div>

              {/* Sets meta */}
              <p className={`mt-4 text-xs ${theme.sub} opacity-80`}>
                เสร็จ {p.done} / {p.total} ชุด
              </p>

              {/* CTA — filled for recommended, text affordance otherwise */}
              <div className="mt-5">
                {recommended ? (
                  <span className="block w-full rounded-lg bg-[#004AAD] px-4 py-2.5 text-center text-sm font-bold text-[#FFCC00] transition group-hover:bg-[#003c8f]">
                    ทำต่อ — ชุดที่ {p.done + 1}
                  </span>
                ) : (
                  <span className={`text-sm font-bold ${theme.title}`}>
                    {mastered
                      ? "ทบทวนอีกครั้ง →"
                      : p.done === 0
                        ? "เริ่มทำ →"
                        : `ทำต่อ — ชุดที่ ${p.done + 1} →`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
