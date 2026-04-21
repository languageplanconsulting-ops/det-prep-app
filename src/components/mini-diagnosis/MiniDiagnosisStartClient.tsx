"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MINI_DIAGNOSIS_DURATION_LABEL } from "@/lib/mini-diagnosis/sequence";

type SetRow = {
  id: string;
  name: string;
  stepCount: number;
};

export function MiniDiagnosisStartClient() {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/mini-diagnosis/sets", { credentials: "same-origin", cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { sets?: SetRow[]; error?: string };
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
    setStartingId(setId);
    setError(null);
    const res = await fetch("/api/mini-diagnosis/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ setId }),
    });
    const json = (await res.json().catch(() => ({}))) as { sessionId?: string; error?: string };
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

  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link href="/" className="font-mono text-xs font-black uppercase text-[#004AAD] underline">
          ← Back to landing / กลับหน้าแรก
        </Link>
        <section className="border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_#111111] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#004AAD]">
                Free mini block diagnosis
              </p>
              <h1 className="text-4xl font-black italic uppercase leading-none text-[#111111] md:text-5xl">
                ดูระดับตอนนี้ก่อน
                <br />
                <span className="not-italic text-[#004AAD]">Mini Diagnosis</span>
              </h1>
              <p className="max-w-3xl text-sm font-bold leading-relaxed text-neutral-700">
                วัดจุดแข็งและจุดอ่อนของคุณแบบเร็วภายในประมาณ {MINI_DIAGNOSIS_DURATION_LABEL}
                พร้อม 2 งานที่มี AI feedback จริง: เขียนจากภาพ และ read then speak
              </p>
            </div>
            <div className="grid min-w-[220px] gap-3 border-4 border-black bg-[#ffcc00] p-4 text-sm font-black shadow-[6px_6px_0_0_#111111]">
              <div>2 Dictation</div>
              <div>1 Real English Word</div>
              <div>1 Vocabulary Reading</div>
              <div>2 Fill in the Blank</div>
              <div>1 Listening Mini Test</div>
              <div>1 Write About Photo</div>
              <div>1 Read Then Speak</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#111111]">
            <h2 className="text-2xl font-black uppercase text-[#004AAD]">Available sets</h2>
            <p className="mt-2 text-sm text-neutral-600">Choose one diagnosis set to begin.</p>
            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="rounded-[4px] border-4 border-black bg-neutral-50 px-4 py-6 text-sm font-bold">
                  Loading sets...
                </div>
              ) : needsAuth ? (
                <div className="rounded-[4px] border-4 border-black bg-neutral-50 px-4 py-6">
                  <p className="text-sm font-bold text-neutral-700">
                    Please sign in first to unlock your mini diagnosis.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/login?next=${encodeURIComponent("/mini-diagnosis/start")}`)}
                    className="mt-4 rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-3 text-sm font-black uppercase text-[#FFCC00] shadow-[4px_4px_0_0_#111111]"
                  >
                    Sign in / เข้าสู่ระบบ
                  </button>
                </div>
              ) : sets.length === 0 ? (
                <div className="rounded-[4px] border-4 border-dashed border-black bg-neutral-50 px-4 py-6 text-sm font-bold text-neutral-600">
                  No active mini diagnosis set yet. / ยังไม่มีชุดแบบทดสอบ
                </div>
              ) : (
                sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex flex-col gap-4 rounded-[4px] border-4 border-black bg-neutral-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-2xl font-black text-[#004AAD]">{set.name}</p>
                      <p className="text-sm font-bold text-neutral-600">{set.stepCount}/9 steps</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void startSet(set.id)}
                      disabled={startingId === set.id}
                      className="rounded-[4px] border-4 border-black bg-[#004AAD] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#111111] disabled:opacity-60"
                    >
                      {startingId === set.id ? "Starting..." : "Start diagnosis"}
                    </button>
                  </div>
                ))
              )}
            </div>
            {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}
          </div>

          <div className="space-y-6">
            <div className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111111]">
              <p className="font-black uppercase text-[#004AAD]">You will get / สิ่งที่จะได้</p>
              <ul className="mt-4 space-y-3 text-sm font-bold text-neutral-700">
                <li>• คะแนน Reading / Listening / Speaking / Writing แบบย่อ</li>
                <li>• จุดอ่อนหลักที่ควรแก้ก่อน</li>
                <li>• คำแนะนำจาก AI สำหรับงาน production 2 ชิ้น</li>
                <li>• ทางต่อยอดไป full mock และแพลนแบบเสียเงิน</li>
              </ul>
            </div>
            <div className="border-4 border-black bg-black p-5 text-white shadow-[8px_8px_0_0_#111111]">
              <p className="font-black uppercase text-[#FFCC00]">Free rule / กติกาฟรี</p>
              <p className="mt-3 text-sm font-bold leading-relaxed">
                Free users can use this diagnosis once to understand their current level and weakness profile.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
