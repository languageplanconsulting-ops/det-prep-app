import {
  type Engine,
  PollyClient,
  type SynthesizeSpeechCommandInput,
  SynthesizeSpeechCommand,
} from "@aws-sdk/client-polly";

/** AWS Polly hard limit per `SynthesizeSpeech` request. */
export const POLLY_MAX_CHARS = 3000;

/**
 * True when explicit AWS keys are set (typical for Vercel / Node).
 * IAM roles on AWS (ECS/Lambda) still work at runtime without these env vars.
 */
export function isPollyEnvConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  );
}

export async function synthesizeEnglishSpeechWithPolly(params: {
  text: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const trimmed = params.text.trim();
  if (!trimmed) {
    throw new Error("text required");
  }
  if (trimmed.length > POLLY_MAX_CHARS) {
    throw new Error(`Polly allows at most ${POLLY_MAX_CHARS} characters per request`);
  }

  const region =
    process.env.AWS_REGION?.trim() ||
    process.env.AMAZON_POLLY_REGION?.trim() ||
    "ap-southeast-1";
  const voiceId = process.env.POLLY_VOICE_ID?.trim() || "Joanna";
  const engineRaw = process.env.POLLY_ENGINE?.trim()?.toLowerCase();
  const engine = (engineRaw === "standard" ? "standard" : "neural") as Engine;

  const input: SynthesizeSpeechCommandInput = {
    Engine: engine,
    OutputFormat: "mp3",
    VoiceId: voiceId as SynthesizeSpeechCommandInput["VoiceId"],
    Text: trimmed,
    TextType: "text",
  };

  const client = new PollyClient({ region });
  const out = await client.send(new SynthesizeSpeechCommand(input));

  const stream = out.AudioStream;
  if (!stream) {
    throw new Error("Polly returned no audio stream");
  }
  const bytes = await stream.transformToByteArray();
  if (!bytes?.length) {
    throw new Error("Polly returned empty audio");
  }
  return {
    audioBase64: Buffer.from(bytes).toString("base64"),
    mimeType: "audio/mpeg",
  };
}
