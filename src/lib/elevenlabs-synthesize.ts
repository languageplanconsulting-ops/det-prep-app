type ElevenLabsSynthesizeParams = {
  apiKey: string;
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
};

export async function synthesizeEnglishSpeechWithElevenLabs(
  params: ElevenLabsSynthesizeParams,
): Promise<{ audioBase64: string; mimeType: string }> {
  const voiceId = params.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const modelId = params.modelId ?? process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
  // Lower bitrate output to reduce localStorage footprint for bulk backfills.
  const outputFormat = params.outputFormat ?? process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_22050_32";
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": params.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: params.text,
      model_id: modelId,
      output_format: outputFormat,
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    const err = new Error(
      msg.trim() || `ElevenLabs failed (${res.status})`,
    ) as Error & { httpStatus: number };
    err.httpStatus = res.status;
    throw err;
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  if (!audioBuffer.length) {
    throw new Error("ElevenLabs returned empty audio.");
  }

  return {
    audioBase64: audioBuffer.toString("base64"),
    mimeType: "audio/mpeg",
  };
}

