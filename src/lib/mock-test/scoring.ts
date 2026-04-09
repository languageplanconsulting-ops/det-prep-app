import type {
  MockQuestionType,
  Subscores,
  ScoreBand,
} from "@/lib/mock-test/types";
import { pointsForDifficulty } from "@/lib/mock-test/adaptive-engine";
import type { Difficulty } from "@/lib/access-control";

export type ScoringSessionInput = {
  phase_responses?: Record<
    string,
    {
      items?: Array<{
        questionId: string;
        questionType?: MockQuestionType;
        difficulty: Difficulty;
        isCorrect?: boolean;
        pointsEarned?: number;
        /** 0–10 AI examiner score */
        aiScore?: number;
        answer?: unknown;
      }>;
    }
  > | null;
  ai_responses?: Record<string, unknown> | null;
};

function phaseItems(
  session: ScoringSessionInput,
  phase: number,
): Array<{
  questionId: string;
  questionType?: MockQuestionType;
  difficulty: Difficulty;
  isCorrect?: boolean;
  pointsEarned?: number;
  aiScore?: number;
}> {
  const block = session.phase_responses?.[String(phase)];
  return block?.items ?? [];
}

function sumAdaptivePoints(
  session: ScoringSessionInput,
  phases: number[],
): { earned: number; max: number } {
  let earned = 0;
  let max = 0;
  for (const p of phases) {
    for (const it of phaseItems(session, p)) {
      const d = it.difficulty;
      max += pointsForDifficulty(d);
      if (it.isCorrect) earned += pointsForDifficulty(d);
    }
  }
  return { earned, max: max || 1 };
}

function avgAiFromPhaseItems(
  session: ScoringSessionInput,
  phases: number[],
): { avg: number; count: number } {
  let sum = 0;
  let n = 0;
  for (const p of phases) {
    for (const it of phaseItems(session, p)) {
      if (typeof it.aiScore === "number" && Number.isFinite(it.aiScore)) {
        sum += Math.max(0, Math.min(10, it.aiScore));
        n += 1;
      }
    }
  }
  return { avg: n ? sum / n : 0, count: n };
}

/**
 * Map raw ratio 0–1 to DET-style 0–160 scale.
 */
export function mapToDetScale(rawScore: number, maxRaw: number): number {
  if (maxRaw <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, rawScore / maxRaw));
  return Math.round(ratio * 160);
}

export function calculateAllSubscores(session: ScoringSessionInput): Subscores {
  // Literacy: phases 1,2,4 — adaptive MCQ
  const lit = sumAdaptivePoints(session, [1, 2, 4]);
  const literacy = mapToDetScale(lit.earned, lit.max);

  // Comprehension: phase 3 (interactive listening) + phase 8 (summarize) AI
  const compAd = sumAdaptivePoints(session, [3]);
  const compAi = avgAiFromPhaseItems(session, [8]);
  const compAdaptivePart = mapToDetScale(compAd.earned, compAd.max);
  const compAiPart = compAi.count ? (compAi.avg / 10) * 160 : 0;
  const comprehension = Math.round(
    compAi.count ? compAdaptivePart * 0.5 + compAiPart * 0.5 : compAdaptivePart,
  );

  // Conversation: phase 3 + phase 7 (speak about photo) AI
  const convAi = avgAiFromPhaseItems(session, [7]);
  const convAdaptivePart = mapToDetScale(compAd.earned, compAd.max);
  const convAiPart = convAi.count ? (convAi.avg / 10) * 160 : 0;
  const conversation = Math.round(
    convAi.count ? convAdaptivePart * 0.5 + convAiPart * 0.5 : convAdaptivePart,
  );

  // Production: read_then_speak, write_about_photo, speak_about_photo, essay
  const prod = avgAiFromPhaseItems(session, [5, 6, 7, 9]);
  const production =
    prod.count > 0 ? Math.round((prod.avg / 10) * 160) : 0;

  return {
    literacy: Math.max(0, Math.min(160, literacy)),
    comprehension: Math.max(0, Math.min(160, comprehension)),
    conversation: Math.max(0, Math.min(160, conversation)),
    production: Math.max(0, Math.min(160, production)),
  };
}

export function calculateOverallScore(subscores: Subscores): number {
  const avg =
    (subscores.literacy +
      subscores.comprehension +
      subscores.conversation +
      subscores.production) /
    4;
  const rounded5 = Math.round(avg / 5) * 5;
  return Math.max(10, Math.min(160, rounded5));
}

const BANDS: ScoreBand[] = [
  {
    key: "basic",
    min: 10,
    max: 55,
    labelEn: "Basic",
    labelTh: "พื้นฐาน (A1)",
  },
  {
    key: "intermediate",
    min: 60,
    max: 85,
    labelEn: "Intermediate",
    labelTh: "ระดับกลาง (A2–B1)",
  },
  {
    key: "upper",
    min: 90,
    max: 115,
    labelEn: "Upper Intermediate",
    labelTh: "ระดับกลางค่อนข้างสูง (B1–B2)",
  },
  {
    key: "advanced_mid",
    min: 116,
    max: 144,
    labelEn: "Advanced",
    labelTh: "ระดับสูง (B2–C1)",
  },
  {
    key: "advanced_top",
    min: 145,
    max: 160,
    labelEn: "Advanced",
    labelTh: "ระดับสูงมาก (C1–C2)",
  },
];

export function getScoreBand(score: number): ScoreBand {
  const s = Math.max(10, Math.min(160, score));
  for (const b of BANDS) {
    if (s >= b.min && s <= b.max) return b;
  }
  return BANDS[BANDS.length - 1]!;
}

export function cefrFromScore(score: number): string {
  if (score < 60) return "A1";
  if (score < 90) return "A2";
  if (score < 110) return "B1";
  if (score < 130) return "B2";
  if (score < 145) return "C1";
  return "C2";
}
