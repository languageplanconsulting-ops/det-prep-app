/** Space between ElevenLabs calls to reduce 429 / quota bursts (ms). */
export const ELEVENLABS_INTER_REQUEST_MS = 900;

/** Space between Polly calls (light throttle; AWS has TPS limits). */
export const POLLY_INTER_REQUEST_MS = 200;

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type SynthesizeJson = { audioBase64?: string; mimeType?: string; error?: string };

/**
 * Calls /api/speech-synthesize with retries on rate limits and transient errors.
 */
export async function synthesizeSpeechWithRetry(args: {
  text: string;
  provider: "polly" | "elevenlabs" | "gemini";
  headers: Record<string, string>;
}): Promise<{ audioBase64: string; mimeType?: string }> {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch("/api/speech-synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...args.headers },
      body: JSON.stringify({ text: args.text, provider: args.provider }),
    });
    let data: SynthesizeJson;
    try {
      data = (await res.json()) as SynthesizeJson;
    } catch {
      data = { error: "Invalid JSON from speech API" };
    }
    if (res.ok && data.audioBase64) {
      return { audioBase64: data.audioBase64, mimeType: data.mimeType };
    }
    const errText = data.error || `Synthesis failed (${res.status})`;
    const noRetry =
      res.status === 400 ||
      res.status === 401 ||
      res.status === 402 ||
      res.status === 403 ||
      res.status === 404 ||
      res.status === 422;
    const retryable =
      !noRetry &&
      (res.status === 429 ||
        res.status === 408 ||
        res.status === 500 ||
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504 ||
        /rate|429|too many|timeout|overloaded|temporarily|throttl|unavailable/i.test(errText));
    if (retryable && attempt < maxAttempts - 1) {
      const raRaw = res.headers.get("Retry-After");
      const raSec = raRaw ? Number.parseInt(raRaw, 10) : NaN;
      const fromHeader =
        Number.isFinite(raSec) && raSec > 0 ? Math.min(raSec * 1000, 60_000) : null;
      const backoff = fromHeader ?? Math.min(2000 * 2 ** attempt + Math.random() * 600, 25_000);
      await sleep(backoff);
      continue;
    }
    throw new Error(errText);
  }
  throw new Error("Synthesis failed after retries");
}

/** ElevenLabs: one at a time. Polly / Gemini: small parallel pool. */
export function speechSynthesisWorkerCount(
  provider: "polly" | "elevenlabs" | "gemini",
  total: number,
): number {
  if (provider === "elevenlabs") return 1;
  return Math.min(3, Math.max(1, total));
}
