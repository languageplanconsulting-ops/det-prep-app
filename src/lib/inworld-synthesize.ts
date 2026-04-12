/**
 * Inworld TTS — prefers HTTP streaming (`/tts/v1/voice:stream`) for lower time-to-first-byte;
 * falls back to sync (`/tts/v1/voice`) if streaming fails or returns no audio.
 * Auth: Authorization: Basic <api-key> (INWORLD_API_KEY — never commit real keys).
 */

export const INWORLD_MAX_CHARS = 2000;

const INWORLD_SYNC_URL = "https://api.inworld.ai/tts/v1/voice";
const INWORLD_STREAM_URL = "https://api.inworld.ai/tts/v1/voice:stream";

/** Defaults match Inworld interactive guidance: Max + named voice; override via env. */
const DEFAULT_VOICE_ID = "Sarah";
const DEFAULT_MODEL_ID = "inworld-tts-1.5-max";
const DEFAULT_SPEAKING_RATE = 0.99;
const DEFAULT_TEMPERATURE = 1;

export function isInworldEnvConfigured(): boolean {
  return Boolean(process.env.INWORLD_API_KEY?.trim());
}

function authorizationHeader(apiKey: string): string {
  const t = apiKey.trim();
  if (/^basic\s+/i.test(t)) return t;
  return `Basic ${t}`;
}

function readVoiceModelRateTemp() {
  const voiceId = process.env.INWORLD_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
  const modelId = process.env.INWORLD_TTS_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const speakingRateRaw = process.env.INWORLD_SPEAKING_RATE?.trim();
  const speakingRate =
    speakingRateRaw != null && speakingRateRaw !== ""
      ? Number.parseFloat(speakingRateRaw)
      : DEFAULT_SPEAKING_RATE;
  const temperatureRaw = process.env.INWORLD_TTS_TEMPERATURE?.trim();
  const temperature =
    temperatureRaw != null && temperatureRaw !== ""
      ? Number.parseFloat(temperatureRaw)
      : DEFAULT_TEMPERATURE;
  return {
    voiceId,
    modelId,
    speakingRate: Number.isFinite(speakingRate) ? speakingRate : DEFAULT_SPEAKING_RATE,
    temperature: Number.isFinite(temperature) ? temperature : DEFAULT_TEMPERATURE,
  };
}

function buildRequestBody(text: string, voiceId: string, modelId: string, speakingRate: number, temperature: number) {
  return {
    text,
    voiceId,
    modelId,
    audioConfig: {
      audioEncoding: "MP3" as const,
      sampleRateHertz: 22050,
      speakingRate,
    },
    temperature,
    applyTextNormalization: "OFF" as const,
  };
}

type StreamLine = {
  result?: { audioContent?: string };
  error?: { message?: string; code?: number };
};

/**
 * NDJSON stream: one JSON object per line with `result.audioContent` (base64 MP3 chunks).
 */
async function synthesizeViaHttpStream(params: {
  apiKey: string;
  text: string;
  voiceId: string;
  modelId: string;
  speakingRate: number;
  temperature: number;
}): Promise<Buffer | null> {
  const { apiKey, text, voiceId, modelId, speakingRate, temperature } = params;
  const res = await fetch(INWORLD_STREAM_URL, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(apiKey),
      "Content-Type": "application/json",
      Accept: "application/json, application/x-ndjson, text/plain, */*",
    },
    body: JSON.stringify(buildRequestBody(text, voiceId, modelId, speakingRate, temperature)),
  });

  if (!res.ok) {
    return null;
  }

  const rawText = await res.text();
  const parts: Buffer[] = [];

  for (const line of rawText.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let obj: StreamLine;
    try {
      obj = JSON.parse(t) as StreamLine;
    } catch {
      continue;
    }
    if (obj.error) {
      return null;
    }
    const b64 = obj.result?.audioContent?.trim();
    if (b64) {
      parts.push(Buffer.from(b64, "base64"));
    }
  }

  if (parts.length === 0) {
    return null;
  }
  return Buffer.concat(parts);
}

type InworldSynthesizeResponse = {
  audioContent?: string;
  rpcStatus?: { message?: string; code?: number };
};

async function synthesizeViaSync(params: {
  apiKey: string;
  text: string;
  voiceId: string;
  modelId: string;
  speakingRate: number;
  temperature: number;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const { apiKey, text, voiceId, modelId, speakingRate, temperature } = params;
  const res = await fetch(INWORLD_SYNC_URL, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody(text, voiceId, modelId, speakingRate, temperature)),
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

/**
 * Set `INWORLD_USE_STREAM=false` to force sync-only (e.g. debugging).
 */
function useStreamFirst(): boolean {
  const v = process.env.INWORLD_USE_STREAM?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no") return false;
  return true;
}

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

  const { voiceId, modelId, speakingRate, temperature } = readVoiceModelRateTemp();

  if (useStreamFirst()) {
    try {
      const buf = await synthesizeViaHttpStream({
        apiKey,
        text: trimmed,
        voiceId,
        modelId,
        speakingRate,
        temperature,
      });
      if (buf && buf.length > 0) {
        return {
          audioBase64: buf.toString("base64"),
          mimeType: "audio/mpeg",
        };
      }
    } catch {
      /* fall through to sync */
    }
  }

  return synthesizeViaSync({
    apiKey,
    text: trimmed,
    voiceId,
    modelId,
    speakingRate,
    temperature,
  });
}
