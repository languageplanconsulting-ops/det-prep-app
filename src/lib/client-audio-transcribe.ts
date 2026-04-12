/**
 * Sends recorded audio to `/api/speech-transcribe` (Gemini verbatim transcription).
 * Uses the server GEMINI_API_KEY; optional `x-gemini-api-key` is not sent from here.
 */
export function pickMediaRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export async function transcribeAudioBlobClient(blob: Blob): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result;
      if (typeof data !== "string") {
        reject(new Error("Could not read audio."));
        return;
      }
      const comma = data.indexOf(",");
      resolve(comma >= 0 ? data.slice(comma + 1) : data);
    };
    reader.onerror = () => reject(new Error("Could not read audio."));
    reader.readAsDataURL(blob);
  });

  const res = await fetch("/api/speech-transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: blob.type || "audio/webm",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { transcript?: string; error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Transcription failed.");
  }
  return String(data.transcript ?? "").trim();
}
