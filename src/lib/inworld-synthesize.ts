/**
 * Inworld TTS (sync): https://api.inworld.ai/tts/v1/voice
 * Requires text, voiceId, and modelId per API schema.
 */

export const INWORLD_MAX_CHARS = 2000;

const INWORLD_TTS_URL = "https://api.inworld.ai/tts/v1/voice";

export function isInworldEnvConfigured(): boolean {
  return Boolean(process.env.INWORLD_API_KEY?.trim());
}

function authorizationHeader(apiKey: string): string {
  const t = apiKey.trim();
  if (/^basic\s+/i.test(t)) return t;
  return `Basic ${t}`;
}

type InworldSynthesizeResponse = {
  audioContent?: string;
  rpcStatus?: { message?: string; code?: number };
};

export async function synthesizeEnglishSpeechWithInworld(params: {
  text: string;
  /** Defaults to INWORLD_API_KEY */
  apiKey?: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const trimmed = params.text.trim();
  if (!trimmed) {
    throw new Error("text required");
  }
  if (trimmed.length > INWORLD_MAX_CHARS) {
    throw new Error(`Inworld TTS allows at most ${INWORLD_MAX_CHARS} characters per request`);
  }

  const apiKey = params.apiKey?.trim() || process.env.INWORLD_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("INWORLD_API_KEY required for Inworld TTS");
  }

  const voiceId = process.env.INWORLD_VOICE_ID?.trim() || "Ashley";
  const modelId = process.env.INWORLD_TTS_MODEL_ID?.trim() || "inworld-tts-1.5-mini";

  const res = await fetch(INWORLD_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: trimmed,
      voiceId,
      modelId,
      audioConfig: {
        audioEncoding: "MP3",
        sampleRateHertz: 22050,
      },
      applyTextNormalization: "OFF",
    }),
  });

  const raw = (await res.json().catch(() => ({}))) as InworldSynthesizeResponse & {
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    const msg =
      raw.rpcStatus?.message ||
      (typeof raw.message === "string" ? raw.message : null) ||
      (typeof raw.error === "string" ? raw.error : null) ||
      `Inworld TTS failed (${res.status})`;
    throw Object.assign(new Error(msg), { httpStatus: res.status });
  }

  const b64 = raw.audioContent?.trim();
  if (!b64) {
    throw new Error("Inworld TTS returned no audio");
  }

  return {
    audioBase64: b64,
    mimeType: "audio/mpeg",
  };
}
