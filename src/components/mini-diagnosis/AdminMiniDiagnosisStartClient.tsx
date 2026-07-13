"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MINI_DIAGNOSIS_DURATION_LABEL } from "@/lib/mini-diagnosis/sequence";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type SetRow = {
  id: string;
  name: string;
  stepCount: number;
};

// ---------------------------------------------------------------------------
// Mock result preview shown BEFORE the sign-in wall so users see the value
// ---------------------------------------------------------------------------
function MockResultPreview() {
  const skills = [
    { label: "Literacy", score: 28, max: 40, weak: false },
    { label: "Comprehension", score: 21, max: 40, weak: true },
    { label: "Production", score: 22, max: 40, weak: true },
    { label: "Conversation", score: 34, max: 40, weak: false },
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          ตัวอย่างผลลัพธ์
        </p>
        <span className="rounded-full bg-[#004AAD]/8 px-2.5 py-0.5 text-[10px] font-bold text-[#004AAD]">
          Mock Preview
        </span>
      </div>
      {/* total score */}
      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-mono text-4xl font-black text-[#004AAD]">105</span>
        <span className="mb-1 font-mono text-base font-bold text-neutral-400">/160</span>
      </div>
      <p className="text-xs text-neutral-500">คะแนนรวม DET (ประมาณการ)</p>
      {/* skill bars */}
      <div className="mt-4 space-y-2.5">
        {skills.map((s) => (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between">
              <span
                className={`text-[11px] font-semibold ${
                  s.weak ? "text-red-500" : "text-neutral-700"
                }`}
              >
                {s.label}
                {s.weak && (
                  <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-500">
                    ต้องเน้น
                  </span>
                )}
              </span>
              <span className="font-mono text-[11px] font-bold text-neutral-500">
                {s.score}/{s.max}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full ${
                  s.weak ? "bg-red-400" : "bg-[#004AAD]"
                }`}
                style={{ width: `${Math.round((s.score / s.max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-neutral-400">
        * ตัวเลขเป็นตัวอย่างเพื่อแสดงรูปแบบผล ไม่ใช่คะแนนจริงของคุณ
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth-wall panel — shown when API returns 401; value is shown ABOVE the CTA
// ---------------------------------------------------------------------------
function AuthWallPanel({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="space-y-5">
      {/* value proposition before the wall */}
      <div className="rounded-2xl bg-[#004AAD]/5 p-5">
        <p className="text-sm font-bold text-[#004AAD]">
          ทำไมต้องเข้าสู่ระบบก่อน?
        </p>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-neutral-700">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[#004AAD]">•</span>
            <span>ระบบจะบันทึกผลและติดตามพัฒนาการของคุณได้</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[#004AAD]">•</span>
            <span>
              ฟีดแบ็กจากฐานข้อมูล 6 ปีของ English Plan จะแม่นขึ้นเมื่อรู้ว่าคุณเป็นใคร
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[#004AAD]">•</span>
            <span>ใช้ได้ฟรี — ไม่ต้องซื้อแพลน</span>
          </li>
        </ul>
      </div>

      {/* mock preview */}
      <MockResultPreview />

      {/* CTA */}
      <button
        type="button"
        onClick={onSignIn}
        className="w-full rounded-2xl bg-[#004AAD] py-4 text-sm font-bold text-white shadow-md transition hover:bg-[#003a8c] active:scale-[0.98]"
      >
        เข้าสู่ระบบเพื่อเก็บผลให้คุณ →
      </button>
      <p className="text-center text-[10px] text-neutral-400">
        Sign in to save your result / เข้าสู่ระบบ
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export — same props + contract as MiniDiagnosisStartClient
// ---------------------------------------------------------------------------
export function AdminMiniDiagnosisStartClient() {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [confirmSet, setConfirmSet] = useState<SetRow | null>(null);

  useEffect(() => {
    void (async () => {
      // Give first-timers the free result before asking for an account (UX Value Loop —
      // value has to come back on first use, not after a signup wall). A silent anonymous
      // session lets them start immediately; /mini-diagnosis/claim upgrades it to a real
      // account later, on the results page, once they've seen what they'd be saving.
      const supabase = getBrowserSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Best-effort: if anonymous sign-ins are disabled on this Supabase project, this
          // silently fails and the fetch below 401s into the existing AuthWallPanel fallback.
          await supabase.auth.signInAnonymously().catch(() => null);
        }
      }

      const res = await fetch("/api/mini-diagnosis/sets", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        sets?: SetRow[];
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          setNeedsAuth(true);
        }
        setError(json.error ?? "Could not load mini diagnosis sets.");
        setLoading(false);
        return;
      }
      setSets(json.sets ?? []);
      setLoading(false);
    })();
  }, []);

  const startSet = async (setId: string) => {
    setConfirmSet(null);
    setStartingId(setId);
    setError(null);
    const res = await fetch("/api/mini-diagnosis/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ setId }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      sessionId?: string;
      error?: string;
    };
    setStartingId(null);
    if (!res.ok || !json.sessionId) {
      setError(json.error ?? "Could not start mini diagnosis.");
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/mini-diagnosis/start")}`);
      }
      return;
    }
    router.push(`/mini-diagnosis/${json.sessionId}`);
  };

  const handleSignIn = () => {
    router.push(`/login?next=${encodeURIComponent("/mini-diagnosis/start")}`);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-[#f8f9fb] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#004AAD] hover:underline"
        >
          ← กลับหน้าแรก
        </Link>

        {/* ── HERO ── */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-100">
          <div className="flex flex-col gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-10">
            {/* left copy */}
            <div className="max-w-lg space-y-4">
              <span className="inline-block rounded-full bg-[#FFCC00]/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7a5f00]">
                Free Mini Block Diagnosis
              </span>
              <h1 className="text-3xl font-black leading-tight text-neutral-900 md:text-4xl">
                ดูระดับตอนนี้ก่อน
                <br />
                <span className="text-[#004AAD]">Mini Diagnosis</span>
              </h1>
              <p className="text-sm leading-relaxed text-neutral-600">
                วัดจุดแข็ง–จุดอ่อนแบบเร็วภายใน{" "}
                <span className="font-mono font-bold text-[#004AAD]">
                  {MINI_DIAGNOSIS_DURATION_LABEL}
                </span>{" "}
                พร้อมงานจริง 2 ชิ้นที่มีฟีดแบ็กทันที:
                เขียนจากภาพ และ read then speak
              </p>

              {/* skill tags */}
              <div className="flex flex-wrap gap-2">
                {["Literacy", "Comprehension", "Production", "Conversation"].map(
                  (skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-[#004AAD]/8 px-3 py-1 text-xs font-semibold text-[#004AAD]"
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* right — what's inside */}
            <div className="w-full shrink-0 rounded-2xl bg-[#FFCC00]/15 p-5 md:w-56">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#7a5f00]">
                ข้อสอบในชุดนี้
              </p>
              <ul className="space-y-2 text-sm font-semibold text-neutral-800">
                <li className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#004AAD]">×2</span> Dictation
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#004AAD]">×1</span> Real English Word
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#004AAD]">×1</span> Vocabulary Reading
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#004AAD]">×2</span> Fill in the Blank
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#004AAD]">×1</span> Listening Mini Test
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#004AAD]">×1</span> Write About Photo
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#004AAD]">×1</span> Read Then Speak
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── BODY GRID ── */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* ── LEFT: sets list or auth wall ── */}
          <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-neutral-100">
            <h2 className="text-lg font-bold text-neutral-900">เริ่ม Diagnosis</h2>
            <p className="mt-1 text-sm text-neutral-500">
              เลือกชุดแล้วกด Start เพื่อเริ่มทำข้อสอบ
            </p>

            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="rounded-2xl bg-neutral-50 px-5 py-8 text-sm font-semibold text-neutral-400">
                  กำลังโหลดชุดแบบทดสอบ…
                </div>
              ) : needsAuth ? (
                <AuthWallPanel onSignIn={handleSignIn} />
              ) : sets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-5 py-8 text-sm font-semibold text-neutral-400">
                  ยังไม่มีชุดแบบทดสอบที่เปิดใช้งาน / No active set yet.
                </div>
              ) : (
                sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex flex-col gap-4 rounded-2xl bg-neutral-50 p-5 ring-1 ring-neutral-100 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-base font-bold text-[#004AAD]">{set.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-neutral-400">
                        {set.stepCount} steps
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmSet(set)}
                      disabled={startingId === set.id}
                      className="shrink-0 rounded-2xl bg-[#004AAD] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#003a8c] active:scale-[0.97] disabled:opacity-50"
                    >
                      {startingId === set.id ? "กำลังเริ่ม…" : "เริ่มทำ"}
                    </button>
                  </div>
                ))
              )}
            </div>

            {error && !needsAuth ? (
              <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>
            ) : null}
          </div>

          {/* ── RIGHT: value cards ── */}
          <div className="space-y-5">
            {/* what you get */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-neutral-100">
              <p className="text-xs font-bold uppercase tracking-widest text-[#004AAD]">
                สิ่งที่คุณจะได้รับ
              </p>
              <ul className="mt-4 space-y-3 text-sm text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#004AAD]">•</span>
                  <span>
                    คะแนน Literacy / Comprehension / Production / Conversation แบบย่อ
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#004AAD]">•</span>
                  <span>จุดอ่อนหลักที่ควรแก้ก่อน</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#004AAD]">•</span>
                  <span>
                    ฟีดแบ็กจากฐานข้อมูล 6 ปีของ English Plan สำหรับงาน production 2 ชิ้น
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#004AAD]">•</span>
                  <span>ทางต่อยอดไป full mock และแผนเรียนแบบเสียเงิน</span>
                </li>
              </ul>
            </div>

            {/* free rule notice */}
            <div className="rounded-3xl bg-[#004AAD] p-6 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FFCC00]">
                กติกาฟรี
              </p>
              <p className="mt-3 text-sm leading-relaxed text-blue-100">
                ผู้ใช้ฟรีสามารถทำ diagnosis นี้ได้ครั้งเดียว เพื่อเข้าใจระดับและจุดอ่อน
                ก่อนตัดสินใจไปขั้นต่อไป
              </p>
            </div>

            {/* duration chip */}
            <div className="flex items-center gap-3 rounded-2xl bg-[#FFCC00]/15 px-5 py-4">
              <span className="font-mono text-2xl font-black text-[#7a5f00]">
                {MINI_DIAGNOSIS_DURATION_LABEL}
              </span>
              <span className="text-sm font-semibold text-neutral-600">
                ใช้เวลาประมาณเท่านี้ — ทำต่อเนื่องในครั้งเดียว
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONFIRM MODAL — identical logic, restyled ── */}
      {confirmSet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center sm:pb-0">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-neutral-100">
            {/* yellow header strip */}
            <div className="bg-[#FFCC00]/20 px-7 py-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7a5f00]">
                ก่อนเริ่ม
              </p>
              <h2 className="mt-1 text-2xl font-black text-neutral-900">
                ใช้เวลาประมาณ 15–17 นาที
              </h2>
            </div>

            <div className="px-7 py-6 space-y-4">
              <p className="text-sm leading-relaxed text-neutral-700">
                ระบบจะเริ่มจับเวลาและพาคุณทำต่อเนื่องหลายส่วน
                ถ้าพร้อมแล้วค่อยเริ่ม เพื่อให้ได้ผลประเมินที่แม่นขึ้น
              </p>

              {/* set name chip */}
              <div className="rounded-2xl bg-[#004AAD]/6 px-4 py-3">
                <p className="text-sm font-bold text-[#004AAD]">{confirmSet.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  คุณแน่ใจไหมว่าต้องการเริ่มทำแบบทดสอบนี้?
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void startSet(confirmSet.id)}
                  disabled={startingId === confirmSet.id}
                  className="flex-1 rounded-2xl bg-[#004AAD] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#003a8c] active:scale-[0.97] disabled:opacity-50"
                >
                  {startingId === confirmSet.id
                    ? "กำลังเริ่ม…"
                    : "ใช่ เริ่มเลย / Yes, start"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSet(null)}
                  className="flex-1 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold text-neutral-700 transition hover:bg-neutral-200 active:scale-[0.97]"
                >
                  ไว้ก่อน / Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
