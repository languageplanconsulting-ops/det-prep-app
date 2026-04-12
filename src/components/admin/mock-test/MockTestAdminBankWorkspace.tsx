"use client";

import { useCallback, useEffect, useState } from "react";

import { buildMockBankCountMatrix } from "@/lib/mock-test/admin-bank-counts";
import { buildMockUploadTemplateJson } from "@/lib/mock-test/admin-upload-templates";
import {
  MOCK_DET_TIERS,
  type MockBankTierKey,
} from "@/lib/mock-test/mock-difficulty-tiers";
import { mt } from "@/lib/mock-test/mock-test-styles";
import {
  MOCK_TEST_PHASE_COUNT,
  PHASE_QUESTION_COUNTS,
  PHASE_QUESTION_TYPE,
} from "@/lib/mock-test/constants";
import { parseUploadJson } from "@/lib/mock-test/validate-upload";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function MockTestAdminBankWorkspace() {
  const [matrix, setMatrix] = useState(() =>
    buildMockBankCountMatrix(null),
  );
  const [draftByPhase, setDraftByPhase] = useState<Record<number, string>>(
    {},
  );
  const [tierByPhase, setTierByPhase] = useState<
    Record<number, MockBankTierKey>
  >({});
  const [busyPhase, setBusyPhase] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadCounts = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("mock_questions")
      .select("phase, difficulty");
    if (error) {
      setBanner(error.message);
      return;
    }
    setMatrix(buildMockBankCountMatrix(data as { phase: number; difficulty: string }[]));
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const tierFor = (phase: number): MockBankTierKey =>
    tierByPhase[phase] ?? "medium";

  const setTier = (phase: number, tier: MockBankTierKey) => {
    setTierByPhase((prev) => ({ ...prev, [phase]: tier }));
  };

  const copyTemplate = async (phase: number) => {
    const json = buildMockUploadTemplateJson(phase, tierFor(phase));
    setDraftByPhase((prev) => ({ ...prev, [phase]: json }));
    try {
      await navigator.clipboard.writeText(json);
      setBanner(`Template for phase ${phase} copied to clipboard.`);
    } catch {
      setBanner(`Template loaded in the phase ${phase} box — copy failed (browser blocked).`);
    }
  };

  const uploadPhase = async (phase: number) => {
    setBanner(null);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setBanner(
        "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }
    const raw = draftByPhase[phase] ?? "";
    const parsed = parseUploadJson(raw);
    if (parsed.parseError) {
      setBanner(parsed.parseError);
      return;
    }
    const tier = tierFor(phase);
    const valid = parsed.questions.filter((q) => q.errors.length === 0);
    const forPhase = valid.filter((q) => q.phase === phase);
    const wrong = valid.filter((q) => q.phase !== phase);

    if (forPhase.length === 0) {
      setBanner(
        `Phase ${phase}: no valid rows with phase === ${phase}. ` +
          (wrong.length ? `(${wrong.length} row(s) skipped — wrong phase.) ` : "") +
          `Fix errors: ${parsed.questions.map((q) => q.errors.join("; ")).filter(Boolean).slice(0, 3).join(" | ") || "—"}`,
      );
      return;
    }

    setBusyPhase(phase);
    const rows = forPhase.map((q) => ({
      phase: q.phase,
      question_type: q.question_type,
      skill: q.skill,
      difficulty: tier,
      content: q.content,
      correct_answer: q.correct_answer,
      is_ai_graded: q.is_ai_graded,
      is_active: true,
    }));

    const { error } = await supabase.from("mock_questions").insert(rows);
    setBusyPhase(null);
    if (error) {
      setBanner(error.message);
      return;
    }
    setBanner(
      `Uploaded ${rows.length} row(s) for phase ${phase} at DET ${MOCK_DET_TIERS.find((t) => t.key === tier)?.detPoints ?? tier} pool.`,
    );
    await loadCounts();
  };

  return (
    <div className="space-y-8">
      <header>
        <h1
          className="text-2xl font-black text-[#004AAD]"
          style={{ fontFamily: "var(--font-inter), system-ui" }}
        >
          Mock question bank — upload by phase
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Each phase has its own JSON box. Choose a DET pool tier (85 / 125 / 150) — it maps to{" "}
          <code className="font-mono text-xs">easy</code>,{" "}
          <code className="font-mono text-xs">medium</code>,{" "}
          <code className="font-mono text-xs">hard</code> in the database. The selected tier is applied
          to every valid row on upload (even if the JSON says something else). Copied templates include
          an <code className="font-mono text-xs">_notes</code> array (ignored on upload) with FITB prefix
          mode, dictation audio / TTS, and v2 unified vocab-reading pool reminders.
        </p>
      </header>

      <section className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#004AAD]">Bank inventory</p>
            <p className="text-xs text-neutral-600">
              Row counts by phase and pool tier · Total questions:{" "}
              <span className="font-mono font-bold">{matrix.grandTotal}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadCounts()}
            className={`${mt.border} bg-neutral-100 px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
          >
            Refresh counts
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b-4 border-black bg-[#FFCC00]/40">
                <th className="p-2 text-xs font-black uppercase">Phase / type</th>
                <th className="p-2 text-center text-xs font-black">85 (easy)</th>
                <th className="p-2 text-center text-xs font-black">125 (med)</th>
                <th className="p-2 text-center text-xs font-black">150 (hard)</th>
                <th className="p-2 text-center text-xs font-black">Σ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MOCK_TEST_PHASE_COUNT }, (_, i) => i + 1).map(
                (p) => {
                  const c = matrix.byPhase[p];
                  if (!c) return null;
                  return (
                    <tr key={p} className="border-b border-neutral-200">
                      <td className="p-2 font-mono text-xs">
                        {p}. {PHASE_QUESTION_TYPE[p]?.replace(/_/g, " ")}
                      </td>
                      <td className="p-2 text-center font-mono text-sm">{c.easy}</td>
                      <td className="p-2 text-center font-mono text-sm">{c.medium}</td>
                      <td className="p-2 text-center font-mono text-sm">{c.hard}</td>
                      <td className="p-2 text-center font-mono font-bold">{c.total}</td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: MOCK_TEST_PHASE_COUNT }, (_, i) => i + 1).map(
          (phase) => {
            const qt = PHASE_QUESTION_TYPE[phase];
            const n = PHASE_QUESTION_COUNTS[phase] ?? 1;
            const tier = tierFor(phase);
            const parsed = parseUploadJson(draftByPhase[phase] ?? "");
            const valid = parsed.questions.filter((q) => q.errors.length === 0);
            const forPhase = valid.filter((q) => q.phase === phase);

            return (
              <section
                key={phase}
                className={`${mt.border} ${mt.shadow} flex flex-col bg-neutral-50 p-4`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b-2 border-neutral-200 pb-3">
                  <div>
                    <p className="text-xs font-black uppercase text-[#004AAD]">
                      Phase {phase}
                    </p>
                    <p className="font-mono text-sm font-bold text-neutral-900">
                      {qt?.replace(/_/g, " ")} · learner steps n={n}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {MOCK_DET_TIERS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTier(phase, t.key)}
                        className={`rounded-[4px] border-2 border-black px-2 py-1 text-xs font-black ${
                          tier === t.key
                            ? "bg-[#004AAD] text-[#FFCC00]"
                            : "bg-white text-neutral-800"
                        }`}
                        title={t.description}
                      >
                        {t.detPoints}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-neutral-600">
                  Pool for this upload:{" "}
                  <strong>
                    {MOCK_DET_TIERS.find((x) => x.key === tier)?.detPoints} → {tier}
                  </strong>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyTemplate(phase)}
                    className={`${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
                  >
                    Copy template JSON
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftByPhase((prev) => ({ ...prev, [phase]: "" }))
                    }
                    className="rounded-[4px] border-2 border-dashed border-neutral-400 px-3 py-2 text-xs font-bold text-neutral-600"
                  >
                    Clear box
                  </button>
                </div>

                <textarea
                  value={draftByPhase[phase] ?? ""}
                  onChange={(e) =>
                    setDraftByPhase((prev) => ({
                      ...prev,
                      [phase]: e.target.value,
                    }))
                  }
                  rows={12}
                  className={`mt-3 w-full flex-1 ${mt.border} bg-white p-3 font-mono text-[11px] leading-relaxed`}
                  placeholder={`{ "_notes": ["optional docs — ignored on upload"], "questions": [ { "phase": ${phase}, "question_type": "${qt}", ... } ] }`}
                  spellCheck={false}
                />

                <p className="mt-2 text-[11px] text-neutral-600">
                  Parsed: {parsed.questions.length} · Valid: {valid.length} · Ready for phase {phase}:{" "}
                  <span className="font-bold text-[#004AAD]">{forPhase.length}</span>
                </p>

                <button
                  type="button"
                  disabled={forPhase.length === 0 || busyPhase !== null}
                  onClick={() => void uploadPhase(phase)}
                  className={`mt-3 w-full ${mt.border} bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50`}
                >
                  {busyPhase === phase
                    ? "Uploading…"
                    : `Upload ${forPhase.length} row(s) for phase ${phase}`}
                </button>
              </section>
            );
          },
        )}
      </div>

      {banner ? (
        <p className="rounded-[4px] border-4 border-black bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          {banner}
        </p>
      ) : null}
    </div>
  );
}
