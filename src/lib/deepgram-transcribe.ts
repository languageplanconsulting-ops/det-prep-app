/**
 * Deepgram speech-to-text — REST `POST https://api.deepgram.com/v1/listen`.
 * Used for the SPEAKING diagnostic: we want a RAW transcript that preserves the
 * learner's actual mistakes, so `punctuate=false&smart_format=false` (no clean-up).
 * Gemini is deliberately NOT used to transcribe here — it auto-corrects grammar.
 * @see https://developers.deepgram.com/docs/pre-recorded-audio
 */
const DEEPGRAM_LISTEN_URL = "https://api.deepgram.com/v1/listen";

export async function transcribeEnglishAudioWithDeepgram(opts: {
  apiKey: string;
  audio: ArrayBuffer;
  mimeType: string;
}): Promise<{ transcript: string }> {
  const url = `${DEEPGRAM_LISTEN_URL}?model=nova-2&language=en&punctuate=false&smart_format=false`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Token ${opts.apiKey}`, "Content-Type": opts.mimeType },
    body: opts.audio,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Deepgram transcription failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  const transcript = json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return { transcript: String(transcript).trim() };
}
