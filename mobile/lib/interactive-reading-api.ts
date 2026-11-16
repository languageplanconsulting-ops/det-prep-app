import { apiFetch, authHeaders } from "./api";
import { API_BASE_URL } from "./config";
import type { IrSet } from "./interactive-reading";

/**
 * The Interactive Reading passage a reading-exam slot opens. The site picks it with the same
 * function its own exam page uses, so web and app run the same text for the same slot.
 */
export async function fetchInteractiveReadingSet(params: {
  round: number;
  difficulty: string;
  set: number;
  exam: number;
}): Promise<{ set: IrSet; gloss: Record<string, string> }> {
  const q = new URLSearchParams({
    round: String(params.round),
    difficulty: params.difficulty,
    set: String(params.set),
    exam: String(params.exam),
  });
  const res = await apiFetch(`${API_BASE_URL}/api/practice/content/interactive-reading?${q}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      err.error ??
        (res.status === 404
          ? "Interactive Reading API not found on server (404). Deploy the latest website, or use a local API."
          : `Passage not found (${res.status})`),
    );
  }
  const body = (await res.json()) as { data: IrSet; gloss?: Record<string, string> };
  return { set: body.data, gloss: body.gloss ?? {} };
}
