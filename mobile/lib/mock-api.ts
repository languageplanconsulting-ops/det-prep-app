/**
 * Mock test center API — the website's fixed 20-step mock and the mini
 * diagnosis, called with the app's Supabase Bearer token (same routes the
 * website uses, so sessions, credits and reports are shared).
 */
import { API_BASE_URL } from "./config";
import { getAdminToken } from "./admin-unlock";
import { getSupabase } from "./supabase";
import type {
  MiniResult,
  MiniSessionPayload,
  MiniSetsResponse,
  MockActiveRuns,
  MockFixedResult,
  MockSessionPayload,
  MockSetRow,
  MockStepItem,
} from "./mock-test";

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError("Not signed in", 401);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const adminToken = await getAdminToken();
  if (adminToken) headers["x-ep-admin-token"] = adminToken;
  return headers;
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), init.timeoutMs ?? 30000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: await authHeaders(),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: ctl.signal,
    });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(ctl.signal.aborted ? "timeout" : `Cannot reach API at ${API_BASE_URL}`, 0);
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok || (data && typeof data === "object" && "error" in data && data.error)) {
    throw new ApiError(
      String(data?.error ?? `Request failed (${res.status})`),
      res.status,
      (data ?? {}) as Record<string, unknown>,
    );
  }
  return data;
}

// ── Fixed mock ──────────────────────────────────────────────────────────────

export async function fetchMockSets(): Promise<MockSetRow[]> {
  const body = await call<{ sets?: MockSetRow[] }>("/api/mock-test/fixed/sets");
  return body.sets ?? [];
}

export async function fetchMockActiveRuns(): Promise<MockActiveRuns> {
  const body = await call<Partial<MockActiveRuns>>("/api/mock-test/fixed/session");
  return { inProgress: body.inProgress ?? [], pendingReports: body.pendingReports ?? [] };
}

export async function startMockSession(args: {
  setId: string;
  targets: { total: number; listening: number; speaking: number; reading: number; writing: number };
}): Promise<{ sessionId: string; resumed?: boolean }> {
  return call<{ sessionId: string; resumed?: boolean }>("/api/mock-test/fixed/session", {
    method: "POST",
    body: { setId: args.setId, targets: args.targets },
    timeoutMs: 20000,
  });
}

export async function fetchMockSession(sessionId: string): Promise<MockSessionPayload> {
  const body = await call<{ session: MockSessionPayload }>(
    `/api/mock-test/fixed/session/${encodeURIComponent(sessionId)}`,
    { timeoutMs: 20000 },
  );
  return body.session;
}

export async function cancelMockSession(sessionId: string): Promise<void> {
  await call(`/api/mock-test/fixed/session/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    body: { status: "cancelled", cancelled_at: new Date().toISOString() },
  });
}

export type SubmitStepResponse = {
  ok?: boolean;
  complete?: boolean;
  stepScore?: number | null;
  pendingScore?: boolean;
  stepIndex?: number;
  taskType?: string;
};

export async function submitMockStep(
  sessionId: string,
  stepIndex: number,
  answer: unknown,
  timeoutMs: number,
): Promise<SubmitStepResponse> {
  return call<SubmitStepResponse>(
    `/api/mock-test/fixed/session/${encodeURIComponent(sessionId)}/submit-step`,
    { method: "POST", body: { stepIndex, answer }, timeoutMs },
  );
}

export async function fetchMockResultStatus(
  sessionId: string,
): Promise<{ ready: boolean; sessionStatus?: string }> {
  return call<{ ready: boolean; sessionStatus?: string }>(
    `/api/mock-test/fixed/results/${encodeURIComponent(sessionId)}/status`,
    { timeoutMs: 60000 },
  );
}

export async function fetchMockReport(
  sessionId: string,
): Promise<{ result: MockFixedResult; stepItems: MockStepItem[] }> {
  return call<{ result: MockFixedResult; stepItems: MockStepItem[] }>(
    `/api/mock-test/fixed/results/${encodeURIComponent(sessionId)}/report`,
  );
}

/** Past fixed-mock reports for the signed-in learner (same RLS read the website does). */
export async function fetchMockHistory(): Promise<MockFixedResult[]> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("mock_fixed_results")
    .select(
      "session_id, set_id, created_at, actual_total, actual_listening, actual_speaking, actual_reading, actual_writing, target_total",
    )
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as MockFixedResult[] | null) ?? [];
}

// ── Mini diagnosis ─────────────────────────────────────────────────────────

export async function fetchMiniSets(): Promise<MiniSetsResponse> {
  const body = await call<Partial<MiniSetsResponse>>("/api/mini-diagnosis/sets");
  return {
    sets: body.sets ?? [],
    latestResult: body.latestResult ?? null,
    freeLimitReached: body.freeLimitReached === true,
  };
}

/** Throws ApiError with body.code === "free_limit_reached" when a free account already used its one run. */
export async function startMiniSession(setId: string): Promise<{ sessionId: string }> {
  return call<{ sessionId: string }>("/api/mini-diagnosis/session", {
    method: "POST",
    body: { setId },
    timeoutMs: 20000,
  });
}

export async function fetchMiniSession(sessionId: string): Promise<MiniSessionPayload> {
  const body = await call<{ session: MiniSessionPayload }>(
    `/api/mini-diagnosis/session/${encodeURIComponent(sessionId)}`,
    { timeoutMs: 20000 },
  );
  return body.session;
}

export async function submitMiniStep(
  sessionId: string,
  stepIndex: number,
  answer: unknown,
  timeoutMs: number,
): Promise<SubmitStepResponse> {
  return call<SubmitStepResponse>(
    `/api/mini-diagnosis/session/${encodeURIComponent(sessionId)}/submit-step`,
    { method: "POST", body: { stepIndex, answer }, timeoutMs },
  );
}

export async function fetchMiniReport(
  sessionId: string,
): Promise<{ result: MiniResult; stepItems: MockStepItem[] }> {
  return call<{ result: MiniResult; stepItems: MockStepItem[] }>(
    `/api/mini-diagnosis/results/${encodeURIComponent(sessionId)}/report`,
  );
}

/** Past mini-diagnosis results for the signed-in learner (own rows via RLS). */
export async function fetchMiniHistory(): Promise<MiniResult[]> {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("mini_diagnosis_results")
    .select("session_id, set_id, created_at, actual_total, actual_listening, actual_speaking, actual_reading, actual_writing, level_label")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data as MiniResult[] | null) ?? [];
}

// ── Shared helpers used inside tasks ───────────────────────────────────────

export async function transcribeRecording(audioBase64: string, mimeType: string): Promise<string> {
  const body = await call<{ transcript?: string }>("/api/speech-transcribe", {
    method: "POST",
    body: { audioBase64, mimeType },
    timeoutMs: 60000,
  });
  return body.transcript ?? "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Exam audio from text (dictation, conversation questions) — the website's
 * /api/speech-synthesize, retried on rate limits / server hiccups. Returns a
 * data URI (or hosted URL) the app's player can open.
 */
export async function synthesizeExamSpeech(text: string, provider?: string): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const body = await call<{ audioBase64?: string; mimeType?: string; audioUrl?: string }>(
        "/api/speech-synthesize",
        { method: "POST", body: provider ? { text, provider } : { text }, timeoutMs: 45000 },
      );
      if (body.audioUrl) return body.audioUrl;
      if (body.audioBase64) return `data:${body.mimeType ?? "audio/mpeg"};base64,${body.audioBase64}`;
      throw new ApiError("No audio returned", 500);
    } catch (e) {
      lastErr = e;
      const status = e instanceof ApiError ? e.status : 0;
      const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
      if (!retryable) break;
      await sleep(Math.min(1500 * 2 ** attempt + Math.random() * 500, 12000));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Speech failed");
}

/** Try providers in order (interactive speaking reads its questions this way on the web). */
export async function synthesizeWithProviders(text: string, providers: string[]): Promise<string | null> {
  for (const p of providers) {
    try {
      const body = await call<{ audioBase64?: string; mimeType?: string; audioUrl?: string }>(
        "/api/speech-synthesize",
        { method: "POST", body: { text, provider: p }, timeoutMs: 30000 },
      );
      if (body.audioUrl) return body.audioUrl;
      if (body.audioBase64) return `data:${body.mimeType ?? "audio/mpeg"};base64,${body.audioBase64}`;
    } catch {
      /* next provider */
    }
  }
  return null;
}

export async function fetchNextInteractiveQuestion(args: {
  scenarioTitleEn: string;
  scenarioTitleTh: string;
  starterQuestionEn: string;
  starterQuestionTh: string;
  nextTurnNumber: number;
  history: { questionEn: string; answerTranscript: string }[];
}): Promise<{ questionEn: string; questionTh: string }> {
  const body = await call<{ questionEn?: string; questionTh?: string }>("/api/interactive-speaking-next", {
    method: "POST",
    body: args,
    timeoutMs: 45000,
  });
  return { questionEn: body.questionEn ?? "", questionTh: body.questionTh ?? "" };
}
