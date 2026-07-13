"use client";

import { useState } from "react";

export function ResultFrictionPrompt() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/feedback-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        promptKey: "mini_diagnosis_results_friction",
        response: text,
        pagePath: window.location.pathname,
      }),
    }).catch(() => null);
    setBusy(false);
    setDone(true);
  };

  if (done) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">ขอบคุณสำหรับความเห็น 🙏</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-800">อะไรเกือบทำให้คุณไม่กดเริ่มทำวันนี้?</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        ไม่บังคับตอบ — ช่วยให้เราแก้จุดที่ทำให้คนลังเลได้
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-3.5 space-y-2.5">
        <textarea
          rows={3}
          placeholder="เช่น ไม่แน่ใจว่าต้องสมัครสมาชิกไหม, กลัวใช้เวลานาน, ฯลฯ"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-ep-blue"
        />
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => setDone(true)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            ข้าม
          </button>
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="rounded-xl bg-ep-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "กำลังส่ง…" : "ส่ง"}
          </button>
        </div>
      </form>
    </section>
  );
}
