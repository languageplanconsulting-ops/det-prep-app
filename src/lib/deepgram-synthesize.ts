/**
 * Deepgram Aura TTS — REST `POST https://api.deepgram.com/v1/speak`
 * Auth: `Authorization: Token <api-key>` (server-only; never expose in the browser).
 * @see https://developers.deepgram.com/docs/text-to-speech
 */

export const DEEPGRAM_TTS_MAX_CHARS = 2000;

const DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak";

export function isDeepgramTtsConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY?.trim());
}

export async function synthesizeEnglishSpeechWithDeepgram(params: {
  apiKey: string;
  text: string;
  /** e.g. aura-2-thalia-en */
  model?: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const trimmed = params.text.trim();
  if (!trimmed) {
    throw new Error("text required");
  }
  if (trimmed.length > DEEPGRAM_TTS_MAX_CHARS) {
    throw Object.assign(
      new Error(`Deepgram TTS allows at most ${DEEPGRAM_TTS_MAX_CHARS} characters per request`),
      { httpStatus: 413 },
    );
  }

  const apiKey = params.apiKey.trim();
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY required for Deepgram TTS");
  }

  const model =
    params.model?.trim() ||
    process.env.DEEPGRAM_TTS_MODEL?.trim() ||
    "aura-2-thalia-en";

  const url = `${DEEPGRAM_SPEAK_URL}?model=${encodeURIComponent(model)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: trimmed }),
  });

  if (!res.ok) {
    const msg = (await res.text().catch(() => "")).trim() || `Deepgram TTS failed (${res.status})`;
    throw Object.assign(new Error(msg), { httpStatus: res.status });
  }

  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length === 0) {
    throw new Error("Deepgram TTS returned empty audio");
  }

  const mime =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mpeg";

  return {
    audioBase64: buf.toString("base64"),
    mimeType: mime,
  };
}
