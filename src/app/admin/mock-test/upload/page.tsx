"use client";

import { useMemo, useState } from "react";

import { parseUploadJson } from "@/lib/mock-test/validate-upload";
import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function AdminMockTestUploadPage() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const parsed = useMemo(() => parseUploadJson(text), [text]);

  const valid = parsed.questions.filter((q) => q.errors.length === 0);
  const invalid = parsed.questions.filter((q) => q.errors.length > 0);

  const upload = async () => {
    setMsg(null);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setMsg(
        "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      );
      return;
    }
    const rows = valid.map((q) => ({
      phase: q.phase,
      question_type: q.question_type,
      skill: q.skill,
      difficulty: q.difficulty,
      content: q.content,
      correct_answer: q.correct_answer,
      is_ai_graded: q.is_ai_graded,
      is_active: true,
    }));
    const { error } = await supabase.from("mock_questions").insert(rows);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(`${rows.length} questions uploaded successfully.`);
  };

  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-black text-[#004AAD]"
        style={{ fontFamily: "var(--font-inter), system-ui" }}
      >
        Bulk upload — mock questions
      </h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="block text-sm font-bold">JSON paste</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={22}
            className={`mt-2 w-full ${mt.border} p-3 text-xs font-mono`}
            placeholder='{ "questions": [ ... ] }'
          />
        </div>
        <div className={`${mt.border} ${mt.shadow} bg-neutral-50 p-4`}>
          <p className="text-sm font-bold">{parsed.parseError ?? "Preview"}</p>
          <p className="mt-2 text-xs text-neutral-600">
            {parsed.questions.length} parsed · {valid.length} valid ·{" "}
            {invalid.length} errors
          </p>
          <div className="mt-4 max-h-96 overflow-auto text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="p-1 text-left">Ph</th>
                  <th className="p-1 text-left">Type</th>
                  <th className="p-1 text-left">OK</th>
                </tr>
              </thead>
              <tbody>
                {parsed.questions.map((q, i) => (
                  <tr
                    key={i}
                    className={
                      q.errors.length ? "bg-red-50" : "bg-white"
                    }
                  >
                    <td className="p-1">{q.phase}</td>
                    <td className="p-1">{q.question_type}</td>
                    <td className="p-1">{q.errors.length ? q.errors.join("; ") : "✓"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void upload()}
          disabled={valid.length === 0}
          className={`${mt.border} bg-[#004AAD] px-4 py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50`}
        >
          Upload valid questions
        </button>
      </div>
      {msg ? <p className="font-bold text-green-800">{msg}</p> : null}
    </div>
  );
}
