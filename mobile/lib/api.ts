import { API_BASE_URL } from "./config";
import { getAdminToken, setAdminToken, clearAdminToken } from "./admin-unlock";
import { getSupabase } from "./supabase";
import type {
  DictationDifficulty,
  DictationItem,
  DialogueSummaryAttemptReport,
  InteractiveSpeakingAttemptReport,
  InteractiveSpeakingScenario,
  InteractiveSpeakingTurnRecord,
  PracticeSkillId,
  QuotaSummary,
} from "./types";

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(
      `Cannot reach API at ${API_BASE_URL}. ` +
        "If you are previewing in the browser, run the website locally (npm run dev) " +
        "and set EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 in mobile/.env — " +
        "or deploy the latest website to production.",
    );
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const adminToken = await getAdminToken();
  if (adminToken) {
    headers["x-ep-admin-token"] = adminToken;
  }
  return headers;
}

/** Unlock VIP-equivalent API access (unlimited AI grading, etc.). */
export async function unlockWithAdminCode(code: string): Promise<string | null> {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/simple-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; token?: string };
  if (!res.ok) {
    return data.error ?? "Invalid admin code";
  }
  if (data.token) {
    await setAdminToken(data.token);
  }
  return null;
}

export async function clearAdminUnlock(): Promise<void> {
  await clearAdminToken();
}

export async function fetchQuotaSummary(): Promise<QuotaSummary> {
  const res = await apiFetch(`${API_BASE_URL}/api/account/quota-summary`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Quota failed (${res.status})`);
  return res.json() as Promise<QuotaSummary>;
}

export async function fetchPracticeSet<T>(params: {
  skill: PracticeSkillId;
  round: number;
  difficulty?: string;
  set: number;
  exam?: number;
  passage?: number;
}): Promise<T> {
  const q = new URLSearchParams({
    skill: params.skill,
    round: String(params.round),
    set: String(params.set),
  });
  if (params.difficulty) q.set("difficulty", params.difficulty);
  if (params.exam) q.set("exam", String(params.exam));
  if (params.passage) q.set("passage", String(params.passage));

  const res = await apiFetch(`${API_BASE_URL}/api/practice/content/set?${q}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Set not found (${res.status})`);
  }
  const body = (await res.json()) as { data: T };
  return body.data;
}

export async function fetchPracticeSetList(params: {
  skill: PracticeSkillId;
  round: number;
  difficulty?: string;
}): Promise<number[]> {
  const q = new URLSearchParams({
    skill: params.skill,
    round: String(params.round),
    list: "1",
  });
  if (params.difficulty) q.set("difficulty", params.difficulty);

  const res = await apiFetch(`${API_BASE_URL}/api/practice/content/set?${q}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Practice API not found on server (404). Deploy the latest website, or use a local API (npm run dev + EXPO_PUBLIC_API_BASE_URL=http://localhost:3000)."
        : `List failed (${res.status})`,
    );
  }
  const body = (await res.json()) as { setNumbers: number[] };
  return body.setNumbers ?? [];
}

export async function fetchPracticeSetMeta<T>(params: {
  skill: PracticeSkillId;
  round: number;
  difficulty?: string;
  set: number;
}): Promise<T> {
  const q = new URLSearchParams({
    skill: params.skill,
    round: String(params.round),
    set: String(params.set),
    meta: "1",
  });
  if (params.difficulty) q.set("difficulty", params.difficulty);

  const res = await apiFetch(`${API_BASE_URL}/api/practice/content/set?${q}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Meta failed (${res.status})`);
  }
  const body = (await res.json()) as { data: T };
  return body.data;
}

export async function fetchDictationItem(
  round: number,
  difficulty: DictationDifficulty,
  set: number,
): Promise<DictationItem> {
  return fetchPracticeSet<DictationItem>({
    skill: "dictation",
    round,
    difficulty,
    set,
  });
}

export async function startStudySession(args: {
  exerciseType: string;
  skill: string;
  difficulty?: string;
  setId?: string;
}): Promise<string> {
  const res = await apiFetch(`${API_BASE_URL}/api/study/session`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Could not start session (${res.status})`);
  const body = (await res.json()) as { sessionId: string };
  return body.sessionId;
}

export async function finishStudySession(args: {
  sessionId?: string;
  exerciseType: string;
  setId?: string;
  score: number;
  completed: boolean;
  duration_seconds?: number;
  submission_payload?: unknown;
  report_payload?: unknown;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/study/session`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Could not save session (${res.status})`);
}

export async function submitDialogueSummaryReport(args: {
  attemptId: string;
  summary: string;
  exam: unknown;
  submittedAt?: string;
}): Promise<DialogueSummaryAttemptReport> {
  const res = await apiFetch(`${API_BASE_URL}/api/dialogue-summary-report`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      attemptId: args.attemptId,
      summary: args.summary,
      exam: args.exam,
      submittedAt: args.submittedAt ?? new Date().toISOString(),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as DialogueSummaryAttemptReport | {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? data.error
        : `Grading failed (${res.status})`,
    );
  }
  return data as DialogueSummaryAttemptReport;
}

export async function fetchInteractiveSpeakingScenarios(
  round?: number,
): Promise<InteractiveSpeakingScenario[]> {
  const q = round ? `?round=${round}` : "";
  const res = await apiFetch(`${API_BASE_URL}/api/practice/content/interactive-speaking${q}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Scenarios failed (${res.status})`);
  const body = (await res.json()) as { scenarios: InteractiveSpeakingScenario[] };
  return body.scenarios ?? [];
}

export async function fetchInteractiveSpeakingScenario(
  id: string,
): Promise<InteractiveSpeakingScenario> {
  const res = await apiFetch(
    `${API_BASE_URL}/api/practice/content/interactive-speaking?id=${encodeURIComponent(id)}`,
    { headers: await authHeaders() },
  );
  if (!res.ok) throw new Error(`Scenario not found (${res.status})`);
  const body = (await res.json()) as { scenario: InteractiveSpeakingScenario };
  return body.scenario;
}

export async function interactiveSpeakingStart(args: {
  attemptId: string;
  scenarioId: string;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/api/interactive-speaking/start`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Could not start (${res.status})`);
  }
}

export async function interactiveSpeakingNext(args: {
  scenarioTitleEn: string;
  scenarioTitleTh: string;
  starterQuestionEn: string;
  starterQuestionTh: string;
  nextTurnNumber: number;
  history: { questionEn: string; answerTranscript: string }[];
}): Promise<{ questionEn: string; questionTh: string }> {
  const res = await apiFetch(`${API_BASE_URL}/api/interactive-speaking-next`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => ({}))) as {
    questionEn?: string;
    questionTh?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? `Next question failed (${res.status})`);
  return { questionEn: data.questionEn ?? "", questionTh: data.questionTh ?? "" };
}

export async function transcribeAudio(args: {
  audioBase64: string;
  mimeType: string;
}): Promise<string> {
  const res = await apiFetch(`${API_BASE_URL}/api/speech-transcribe`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => ({}))) as { transcript?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Transcribe failed (${res.status})`);
  return data.transcript ?? "";
}

export async function submitInteractiveSpeakingReport(args: {
  attemptId: string;
  scenarioId: string;
  scenarioTitleEn: string;
  scenarioTitleTh: string;
  turns: InteractiveSpeakingTurnRecord[];
}): Promise<InteractiveSpeakingAttemptReport> {
  const res = await apiFetch(`${API_BASE_URL}/api/interactive-speaking-report`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      ...args,
      prepMinutes: 0,
      redeemed: false,
      previousScore160: null,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as InteractiveSpeakingAttemptReport | {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? data.error
        : `Grading failed (${res.status})`,
    );
  }
  return data as InteractiveSpeakingAttemptReport;
}

/** TTS for campus listening lessons — returns a data URI or remote URL. */
export async function synthesizeSpeech(text: string): Promise<string> {
  const res = await apiFetch(`${API_BASE_URL}/api/speech-synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, provider: "deepgram" }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    audioBase64?: string;
    mimeType?: string;
    audioUrl?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Speech failed (${res.status})`);
  }
  if (data.audioUrl) return data.audioUrl;
  if (data.audioBase64) {
    const mime = data.mimeType ?? "audio/mpeg";
    return `data:${mime};base64,${data.audioBase64}`;
  }
  throw new Error("No audio returned");
}
