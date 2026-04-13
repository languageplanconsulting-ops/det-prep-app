"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Provider = "deepgram" | "inworld" | "gemini" | "elevenlabs";

type ConfigResponse = {
  error?: string;
  deepgram: { keyConfigured: boolean; model: string; maxChars: number };
  inworld: { keyConfigured: boolean; voiceId: string; modelId: string; maxChars: number };
  gemini: { keyConfigured: boolean; ttsModel: string };
  elevenlabs: { keyConfigured: boolean };
  sampleDefault: string;
  maxCharsGlobal: number;
};

type TestOk = {
  ok: true;
  provider: Provider;
  durationMs: number;
  mimeType: string;
  audioBytes: number;
  audioBase64?: string;
};

type TestFail = {
  ok: false;
  provider: Provider;
  durationMs?: number;
  step: string;
  message: string;
  httpStatus?: number;
};

type TestResult = TestOk | TestFail;

const PROVIDERS: { id: Provider; label: string; envVar: string }[] = [
  { id: "deepgram", label: "Deepgram (Aura)", envVar: "DEEPGRAM_API_KEY" },
  { id: "inworld", label: "Inworld", envVar: "INWORLD_API_KEY" },
  { id: "gemini", label: "Gemini TTS", envVar: "GEMINI_API_KEY" },
  { id: "elevenlabs", label: "ElevenLabs", envVar: "ELEVENLABS_API_KEY" },
];

function KeyBadge({ configured }: { configured: boolean }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        configured
          ? "border border-green-800 bg-green-100 text-green-900"
          : "border border-red-800 bg-red-100 text-red-900"
      }`}
    >
      {configured ? "Key in env" : "Missing key"}
    </span>
  );
}

export function AdminTtsProviderTest() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState("");
  const [testing, setTesting] = useState<Provider | "all" | null>(null);
  const [results, setResults] = useState<Partial<Record<Provider, TestResult>>>({});
  const [lastJson, setLastJson] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/tts-test", { credentials: "same-origin" });
      const json = (await res.json()) as ConfigResponse & { error?: string };
      if (!res.ok) {
        setLoadError(json.error || `Could not load (${res.status})`);
        return;
      }
      setConfig(json);
      setSampleText((t) => (t.trim() ? t : json.sampleDefault));
    } catch {
      setLoadError("Network error loading TTS status.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const playAudio = useCallback((r: TestOk) => {
    if (!r.audioBase64) return;
    const url = `data:${r.mimeType};base64,${r.audioBase64}`;
    const prev = audioRef.current;
    if (prev) {
      prev.pause();
      prev.src = "";
    }
    const el = new Audio(url);
    audioRef.current = el;
    void el.play().catch(() => {});
  }, []);

  const runTest = async (provider: Provider) => {
    setTesting(provider);
    setLastJson(null);
    const text = sampleText.trim() || config?.sampleDefault || "";
    try {
      const res = await fetch("/api/admin/tts-test", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, text }),
      });
      const json = (await res.json()) as TestResult & { error?: string };
      if (!res.ok) {
        const errMsg = json.error || `Request failed (${res.status})`;
        setResults((prev) => ({
          ...prev,
          [provider]: {
            ok: false,
            provider,
            step: "request",
            message: errMsg,
          },
        }));
        setLastJson(JSON.stringify({ error: errMsg, status: res.status }, null, 2));
        return;
      }
      setResults((prev) => ({ ...prev, [provider]: json }));
      setLastJson(JSON.stringify(json, null, 2));
      if (json.ok && json.audioBase64) {
        playAudio(json);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error";
      setResults((prev) => ({
        ...prev,
        [provider]: {
          ok: false,
          provider,
          step: "request",
          message,
        },
      }));
      setLastJson(JSON.stringify({ ok: false, message }, null, 2));
    } finally {
      setTesting(null);
    }
  };

  const runAll = async () => {
    setTesting("all");
    setLastJson(null);
    const next: Partial<Record<Provider, TestResult>> = {};
    const text = sampleText.trim() || config?.sampleDefault || "";
    for (const p of PROVIDERS) {
      try {
        const res = await fetch("/api/admin/tts-test", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: p.id, text, includeAudio: false }),
        });
        const json = (await res.json()) as TestResult & { error?: string };
        if (!res.ok) {
          next[p.id] = {
            ok: false,
            provider: p.id,
            step: "request",
            message: json.error || `HTTP ${res.status}`,
          };
        } else {
          next[p.id] = json;
        }
      } catch (e) {
        next[p.id] = {
          ok: false,
          provider: p.id,
          step: "request",
          message: e instanceof Error ? e.message : "Network error",
        };
      }
    }
    setResults((prev) => ({ ...prev, ...next }));
    setLastJson(JSON.stringify(next, null, 2));
    setTesting(null);
  };

  if (loadError) {
    return (
      <div
        className="rounded-sm border-2 border-black bg-red-50 p-4 text-sm text-red-900"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        <p className="font-black">TTS provider test</p>
        <p className="mt-1">{loadError}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div
        className="rounded-sm border-2 border-dashed border-black bg-neutral-50 p-4 text-sm text-neutral-600"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Loading TTS environment status…
      </div>
    );
  }

  return (
    <div
      id="admin-tts-debug"
      className="scroll-mt-24 rounded-sm border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
    >
      <p className="text-sm font-black text-neutral-900">TTS providers (debug)</p>
      <p className="mt-1 text-xs text-neutral-600">
        Calls each engine on the <span className="font-bold">server</span> with your Vercel env keys. On failure,
        the <span className="font-bold">message</span> is usually the provider&apos;s own error text (auth, quota,
        wrong voice, etc.). Redeploy after changing env vars.
      </p>

      <label className="mt-4 block text-sm font-bold">
        Sample text
        <textarea
          className="mt-1 w-full border-2 border-black bg-white px-3 py-2 ep-stat text-sm"
          rows={3}
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          maxLength={config.maxCharsGlobal}
        />
      </label>
      <p className="mt-1 text-[10px] text-neutral-500">
        Max {config.maxCharsGlobal} chars globally. Deepgram / Inworld have lower per-request limits (see table).
      </p>

      <div className="mt-4 space-y-2">
        {PROVIDERS.map((p) => {
          const cfg =
            p.id === "deepgram"
              ? config.deepgram
              : p.id === "inworld"
                ? config.inworld
                : p.id === "gemini"
                  ? config.gemini
                  : config.elevenlabs;
          const r = results[p.id];
          const busy = testing === p.id || testing === "all";

          return (
            <div
              key={p.id}
              className="flex flex-col gap-2 border-2 border-neutral-200 bg-neutral-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">{p.label}</span>
                  <KeyBadge configured={cfg.keyConfigured} />
                  <span className="text-[10px] text-neutral-500">{p.envVar}</span>
                </div>
                {p.id === "deepgram" ? (
                  <p className="mt-1 ep-stat text-[10px] text-neutral-600">
                    Model: {config.deepgram.model} · max {config.deepgram.maxChars} chars
                  </p>
                ) : null}
                {p.id === "inworld" ? (
                  <p className="mt-1 ep-stat text-[10px] text-neutral-600">
                    Voice: {config.inworld.voiceId} · model: {config.inworld.modelId} · max{" "}
                    {config.inworld.maxChars} chars
                  </p>
                ) : null}
                {p.id === "gemini" ? (
                  <p className="mt-1 ep-stat text-[10px] text-neutral-600">
                    TTS model: {config.gemini.ttsModel}
                  </p>
                ) : null}
                {r ? (
                  <p
                    className={`mt-2 ep-stat text-xs font-bold ${
                      r.ok ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {r.ok
                      ? `OK · ${r.durationMs} ms · ${r.audioBytes} bytes · ${r.mimeType}`
                      : `${r.step}${r.httpStatus != null ? ` · HTTP ${r.httpStatus}` : ""}: ${r.message}`}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runTest(p.id)}
                  className="border-2 border-black bg-ep-blue px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-[2px_2px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
                >
                  Test
                </button>
                {r?.ok && r.audioBase64 ? (
                  <button
                    type="button"
                    onClick={() => playAudio(r)}
                    className="border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-neutral-900 shadow-[2px_2px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                  >
                    Play
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={testing != null}
        onClick={() => void runAll()}
        className="mt-4 w-full border-2 border-black bg-[#FFCC00] py-2 text-xs font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-50"
      >
        {testing === "all" ? "Testing all…" : "Test all providers"}
      </button>

      {lastJson ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-bold text-neutral-700">
            Raw JSON (last response / batch)
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words border-2 border-neutral-300 bg-neutral-100 p-2 text-[10px] leading-relaxed text-neutral-800">
            {lastJson.length > 120_000
              ? `${lastJson.slice(0, 120_000)}…\n(truncated for display — use per-provider Test for full JSON with audio)`
              : lastJson}
          </pre>
        </details>
      ) : null}

      <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">
        Admin cookie or Supabase admin role required. Keys are never returned in this API — only pass/fail and
        provider error strings.
      </p>
    </div>
  );
}
