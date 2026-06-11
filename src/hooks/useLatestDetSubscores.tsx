"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export type DetSubscores = {
  literacy: number;
  comprehension: number;
  conversation: number;
  production: number;
};

type State = {
  loading: boolean;
  /** Most recent sub-scores, or null if no mock taken yet. */
  scores: DetSubscores | null;
  /** Where the score came from — useful for QA and the badge tooltip. */
  source: "v2" | "fixed-derived" | null;
};

/**
 * DET's published definition of the 4 sub-scores (see /det-guide content + DET docs):
 *   Literacy      = (Reading + Writing) / 2
 *   Comprehension = (Reading + Listening) / 2
 *   Conversation  = (Listening + Speaking) / 2
 *   Production    = (Writing + Speaking) / 2
 *
 * The Fixed mock only stores the four macro skills (actual_listening etc.),
 * so we derive the four DET sub-scores here when that's all we have.
 */
function deriveDetSubscoresFromMacro(macros: {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}): DetSubscores {
  const clamp = (n: number) => Math.max(0, Math.min(160, Math.round(n)));
  return {
    literacy: clamp((macros.reading + macros.writing) / 2),
    comprehension: clamp((macros.reading + macros.listening) / 2),
    conversation: clamp((macros.listening + macros.speaking) / 2),
    production: clamp((macros.writing + macros.speaking) / 2),
  };
}

/**
 * Read the learner's latest DET sub-scores (0–160 each).
 *
 * Two mock-test backends exist:
 *   - mock_test_results  (v2 placement + legacy process route) — has
 *     literacy_score etc. directly. Use as-is when present.
 *   - mock_fixed_results (the live "Fixed" mock everyone takes today) —
 *     only stores macro skills. Derive sub-scores via DET's pairwise
 *     average formula.
 *
 * We query both, pick the row with the most recent `created_at`, and
 * either read the columns directly or derive them. Null only when the
 * user has no mock attempts on either table.
 */
export function useLatestDetSubscores(): State {
  const [state, setState] = useState<State>({
    loading: true,
    scores: null,
    source: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getBrowserSupabase();
        if (!supabase) {
          if (!cancelled) setState({ loading: false, scores: null, source: null });
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setState({ loading: false, scores: null, source: null });
          return;
        }

        // Query BOTH tables in parallel; whichever has the most recent
        // created_at wins. mock_test_results contains direct sub-scores;
        // mock_fixed_results requires DET-formula derivation from macro skills.
        const [v2Res, fixedRes] = await Promise.all([
          supabase
            .from("mock_test_results")
            .select(
              "literacy_score, comprehension_score, conversation_score, production_score, created_at",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase
            .from("mock_fixed_results")
            .select(
              "actual_listening, actual_reading, actual_writing, actual_speaking, created_at",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        const v2Row = (v2Res.data ?? [])[0] as
          | {
              literacy_score: number | null;
              comprehension_score: number | null;
              conversation_score: number | null;
              production_score: number | null;
              created_at: string;
            }
          | undefined;
        const fixedRow = (fixedRes.data ?? [])[0] as
          | {
              actual_listening: number | null;
              actual_reading: number | null;
              actual_writing: number | null;
              actual_speaking: number | null;
              created_at: string;
            }
          | undefined;

        if (!v2Row && !fixedRow) {
          if (!cancelled) setState({ loading: false, scores: null, source: null });
          return;
        }

        const v2At = v2Row ? Date.parse(v2Row.created_at) : 0;
        const fixedAt = fixedRow ? Date.parse(fixedRow.created_at) : 0;
        const useV2 = !!v2Row && v2At >= fixedAt;

        if (useV2 && v2Row) {
          const clamp = (n: number | null) => Math.max(0, Math.min(160, Math.round(Number(n ?? 0))));
          const scores: DetSubscores = {
            literacy: clamp(v2Row.literacy_score),
            comprehension: clamp(v2Row.comprehension_score),
            conversation: clamp(v2Row.conversation_score),
            production: clamp(v2Row.production_score),
          };
          if (!cancelled) setState({ loading: false, scores, source: "v2" });
          return;
        }

        if (fixedRow) {
          const scores = deriveDetSubscoresFromMacro({
            listening: Number(fixedRow.actual_listening ?? 0),
            reading: Number(fixedRow.actual_reading ?? 0),
            writing: Number(fixedRow.actual_writing ?? 0),
            speaking: Number(fixedRow.actual_speaking ?? 0),
          });
          if (!cancelled)
            setState({ loading: false, scores, source: "fixed-derived" });
          return;
        }

        if (!cancelled) setState({ loading: false, scores: null, source: null });
      } catch {
        if (!cancelled) setState({ loading: false, scores: null, source: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
