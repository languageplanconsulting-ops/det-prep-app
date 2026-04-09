"use client";

import { useEffect, useState } from "react";

import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function AdminMockTestQuestionsPage() {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      phase: number;
      question_type: string;
      skill: string;
      difficulty: string;
      is_active: boolean;
    }>
  >([]);
  const [filter, setFilter] = useState({ phase: "", type: "", skill: "" });

  useEffect(() => {
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("mock_questions")
        .select("id, phase, question_type, skill, difficulty, is_active")
        .order("phase");
      setRows((data ?? []) as typeof rows);
    })();
  }, []);

  const filtered = rows.filter(
    (r) =>
      (!filter.phase || String(r.phase) === filter.phase) &&
      (!filter.type || r.question_type.includes(filter.type)) &&
      (!filter.skill || r.skill === filter.skill),
  );

  const toggle = async (id: string, is_active: boolean) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.from("mock_questions").update({ is_active }).eq("id", id);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active } : r)),
    );
  };

  const del = async (id: string) => {
    if (!confirm("Delete question?")) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.from("mock_questions").delete().eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-[#004AAD]">Question bank</h1>
      <div className="flex flex-wrap gap-2">
        <input
          className={`${mt.border} px-2 py-1 text-sm`}
          placeholder="Phase"
          value={filter.phase}
          onChange={(e) => setFilter((f) => ({ ...f, phase: e.target.value }))}
        />
        <input
          className={`${mt.border} px-2 py-1 text-sm`}
          placeholder="Type contains"
          value={filter.type}
          onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
        />
        <input
          className={`${mt.border} px-2 py-1 text-sm`}
          placeholder="Skill"
          value={filter.skill}
          onChange={(e) => setFilter((f) => ({ ...f, skill: e.target.value }))}
        />
      </div>
      <div className="overflow-auto">
        <table className="w-full border-4 border-black text-sm">
          <thead className="bg-[#004AAD] text-[#FFCC00]">
            <tr>
              <th className="p-2 text-left">Phase</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Skill</th>
              <th className="p-2 text-left">Diff</th>
              <th className="p-2 text-left">Active</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t-2 border-black">
                <td className="p-2">{r.phase}</td>
                <td className="p-2 font-mono text-xs">{r.question_type}</td>
                <td className="p-2">{r.skill}</td>
                <td className="p-2">{r.difficulty}</td>
                <td className="p-2">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void toggle(r.id, !r.is_active)}
                  >
                    {r.is_active ? "on" : "off"}
                  </button>
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    className="font-bold text-red-700"
                    onClick={() => void del(r.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
