/**
 * Course panel: best attempts + sub-par attempts that need redeem.
 *
 * Sub-par bars (score on /160):
 *   easy   < 75
 *   medium < 115
 *   hard   < 125
 */
import { DICTATION_MAX_SCORE } from "@/lib/dictation-constants";
import {
  hydrateDictationProgressFromServer,
  loadDictationProgressMap,
} from "@/lib/dictation-storage";
import {
  hydrateDialogueSummaryProgressFromServer,
  loadDialogueSummaryProgressMap,
} from "@/lib/dialogue-summary-storage";
import {
  getInteractiveSpeakingScenarioById,
  loadAllInteractiveSpeakingReports,
} from "@/lib/interactive-speaking-storage";
import {
  fetchPhotoSpeakItems,
  photoSpeakRoundNumber,
  type PhotoSpeakTaskType,
} from "@/lib/photo-speak-api";
import { taskLabel } from "@/lib/course-plan/categories";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import type { DictationDifficulty } from "@/types/dictation";

export type AttemptDifficulty = "easy" | "medium" | "hard";

export const SUBPAR_BAR_160: Record<AttemptDifficulty, number> = {
  easy: 75,
  medium: 115,
  hard: 125,
};

export type RedeemableTaskType =
  | "dictation"
  | "write_about_photo"
  | "speak_about_photo"
  | "interactive_speaking"
  | "dialogue_summary";

export type AttemptRow = {
  id: string;
  taskType: RedeemableTaskType;
  titleTh: string;
  titleEn: string;
  difficulty: AttemptDifficulty;
  bestScore160: number;
  bar160: number;
  isSubPar: boolean;
  redeemHref: string;
};

export type AttemptRedeemSnapshot = {
  /** Best single attempt per task type (among attempted items). */
  bestByType: AttemptRow[];
  /** Every attempted item below its difficulty bar. */
  subPar: AttemptRow[];
};

const DIFF_TH: Record<AttemptDifficulty, string> = {
  easy: "ง่าย",
  medium: "กลาง",
  hard: "ยาก",
};

export function difficultyLabelTh(d: AttemptDifficulty): string {
  return DIFF_TH[d];
}

function roundToDifficulty(round: number): AttemptDifficulty {
  if (round <= 1) return "easy";
  if (round === 2) return "medium";
  return "hard";
}

function toScore160(best: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((best / max) * 160);
}

function isSubPar(score160: number, difficulty: AttemptDifficulty): boolean {
  return score160 < SUBPAR_BAR_160[difficulty];
}

function parseProgressKey(key: string): {
  round: number;
  difficulty: AttemptDifficulty;
  setNumber: number;
} | null {
  const m = key.match(/^(\d+):(easy|medium|hard):(\d+)$/);
  if (!m) return null;
  return {
    round: Number(m[1]),
    difficulty: m[2] as AttemptDifficulty,
    setNumber: Number(m[3]),
  };
}

function collectDictation(): AttemptRow[] {
  const map = loadDictationProgressMap();
  const rows: AttemptRow[] = [];
  for (const [key, rec] of Object.entries(map)) {
    const parsed = parseProgressKey(key);
    if (!parsed || !rec) continue;
    const max = rec.maxScore || DICTATION_MAX_SCORE[parsed.difficulty as DictationDifficulty];
    const bestScore160 = toScore160(rec.bestScore, max);
    rows.push({
      id: `dictation:${key}`,
      taskType: "dictation",
      titleTh: `ตามคำบอก · รอบ ${parsed.round} · ชุด ${parsed.setNumber}`,
      titleEn: `Dictation R${parsed.round} ${parsed.difficulty} set ${parsed.setNumber}`,
      difficulty: parsed.difficulty,
      bestScore160,
      bar160: SUBPAR_BAR_160[parsed.difficulty],
      isSubPar: isSubPar(bestScore160, parsed.difficulty),
      redeemHref: `/practice/literacy/dictation/round/${parsed.round}/${parsed.difficulty}/${parsed.setNumber}`,
    });
  }
  return rows;
}

function collectDialogueSummary(): AttemptRow[] {
  const map = loadDialogueSummaryProgressMap();
  const rows: AttemptRow[] = [];
  for (const [key, rec] of Object.entries(map)) {
    const parsed = parseProgressKey(key);
    if (!parsed || !rec) continue;
    const bestScore160 = Math.round(rec.bestScore160);
    rows.push({
      id: `dialogue_summary:${key}`,
      taskType: "dialogue_summary",
      titleTh: `สรุปบทสนทนา · รอบ ${parsed.round} · ชุด ${parsed.setNumber}`,
      titleEn: `Dialogue summary R${parsed.round} ${parsed.difficulty} set ${parsed.setNumber}`,
      difficulty: parsed.difficulty,
      bestScore160,
      bar160: SUBPAR_BAR_160[parsed.difficulty],
      isSubPar: isSubPar(bestScore160, parsed.difficulty),
      redeemHref: `/practice/listening/dialogue-summary/round/${parsed.round}/${parsed.difficulty}/${parsed.setNumber}`,
    });
  }
  return rows;
}

function collectInteractiveSpeaking(): AttemptRow[] {
  const reports = loadAllInteractiveSpeakingReports();
  const bestByScenario = new Map<
    string,
    { score160: number; titleEn: string; titleTh: string; round: number }
  >();
  for (const r of reports) {
    if (typeof r.score160 !== "number" || !r.scenarioId) continue;
    const scenario = getInteractiveSpeakingScenarioById(r.scenarioId);
    const round = scenario?.round ?? 1;
    const prev = bestByScenario.get(r.scenarioId);
    if (!prev || r.score160 > prev.score160) {
      bestByScenario.set(r.scenarioId, {
        score160: r.score160,
        titleEn: r.scenarioTitleEn || scenario?.titleEn || r.scenarioId,
        titleTh: r.scenarioTitleTh || scenario?.titleTh || r.scenarioId,
        round,
      });
    }
  }
  const rows: AttemptRow[] = [];
  for (const [scenarioId, v] of bestByScenario) {
    const difficulty = roundToDifficulty(v.round);
    rows.push({
      id: `interactive_speaking:${scenarioId}`,
      taskType: "interactive_speaking",
      titleTh: v.titleTh,
      titleEn: v.titleEn,
      difficulty,
      bestScore160: Math.round(v.score160),
      bar160: SUBPAR_BAR_160[difficulty],
      isSubPar: isSubPar(v.score160, difficulty),
      redeemHref: `/practice/production/interactive-speaking/${scenarioId}?redeem=1`,
    });
  }
  return rows;
}

async function collectPhotoSpeak(taskType: PhotoSpeakTaskType): Promise<AttemptRow[]> {
  try {
    const items = await fetchPhotoSpeakItems(taskType);
    const rows: AttemptRow[] = [];
    for (const item of items) {
      if (!item.progress || item.progress.attempt_count <= 0) continue;
      const bestScore160 = Math.round(item.progress.best_score160);
      const difficulty = roundToDifficulty(photoSpeakRoundNumber(item.sort_order));
      const path =
        taskType === "write_about_photo"
          ? `/practice/production/write-about-photo/${item.id}?redeem=1`
          : `/practice/production/speak-about-photo/${item.id}?redeem=1`;
      rows.push({
        id: `${taskType}:${item.id}`,
        taskType,
        titleTh: item.title_th || item.title_en,
        titleEn: item.title_en,
        difficulty,
        bestScore160,
        bar160: SUBPAR_BAR_160[difficulty],
        isSubPar: isSubPar(bestScore160, difficulty),
        redeemHref: path,
      });
    }
    return rows;
  } catch {
    return [];
  }
}

function pickBestByType(rows: AttemptRow[]): AttemptRow[] {
  const best = new Map<RedeemableTaskType, AttemptRow>();
  for (const row of rows) {
    const prev = best.get(row.taskType);
    if (!prev || row.bestScore160 > prev.bestScore160) best.set(row.taskType, row);
  }
  const order: RedeemableTaskType[] = [
    "dictation",
    "write_about_photo",
    "speak_about_photo",
    "interactive_speaking",
    "dialogue_summary",
  ];
  return order.map((t) => best.get(t)).filter((r): r is AttemptRow => Boolean(r));
}

/** Load all tracked attempts for the redeem panel (client-only). */
export async function loadAttemptRedeemSnapshot(): Promise<AttemptRedeemSnapshot> {
  if (typeof window === "undefined") {
    return { bestByType: [], subPar: [] };
  }
  await ensureCanonicalPracticeContent();
  await Promise.allSettled([
    hydrateDictationProgressFromServer(),
    hydrateDialogueSummaryProgressFromServer(),
  ]);

  const all = [
    ...collectDictation(),
    ...collectDialogueSummary(),
    ...collectInteractiveSpeaking(),
    ...(await collectPhotoSpeak("write_about_photo")),
    ...(await collectPhotoSpeak("speak_about_photo")),
  ];

  const subPar = all
    .filter((r) => r.isSubPar)
    .sort((a, b) => a.bestScore160 - b.bestScore160 || a.taskType.localeCompare(b.taskType));

  return {
    bestByType: pickBestByType(all),
    subPar,
  };
}

export function redeemableTaskLabel(taskType: RedeemableTaskType): string {
  return taskLabel(taskType);
}
