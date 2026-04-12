"use client";

import { useCallback, useEffect, useState } from "react";

type Option = { id: string; label: string };

type ApiState = {
  effectiveModel: string;
  persistedModel: string | null;
  source: "database" | "env" | "default";
  options: Option[];
  fallbackDefault: string;
};

export function AdminGeminiModelSettings() {
  const [data, setData] = useState<ApiState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/gemini-model", { credentials: "same-origin" });
      const json = (await res.json()) as ApiState & { error?: string };
      if (!res.ok) {
        setLoadError(json.error || `Could not load (${res.status})`);
        return;
      }
      setData({
        effectiveModel: json.effectiveModel,
        persistedModel: json.persistedModel,
        source: json.source,
        options: json.options,
        fallbackDefault: json.fallbackDefault,
      });
    } catch {
      setLoadError("Network error loading Gemini settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSelect = async (model: string) => {
    setSaveMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/gemini-model", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const json = (await res.json()) as ApiState & { ok?: boolean; error?: string };
      if (!res.ok) {
        setSaveMessage(json.error || `Save failed (${res.status})`);
        return;
      }
      setData({
        effectiveModel: json.effectiveModel,
        persistedModel: json.persistedModel,
        source: json.source,
        options: json.options,
        fallbackDefault: json.fallbackDefault,
      });
      setSaveMessage("Saved. New requests use this model now.");
    } catch {
      setSaveMessage("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div
        className="rounded-sm border-2 border-black bg-red-50 p-4 text-sm text-red-900"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        <p className="font-black">Grading model</p>
        <p className="mt-1">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="rounded-sm border-2 border-dashed border-black bg-neutral-50 p-4 text-sm text-neutral-600"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Loading grading model settings…
      </div>
    );
  }

  const sourceLabel =
    data.source === "database"
      ? "Saved in database (applies to all users immediately)"
      : data.source === "env"
        ? "GEMINI_MODEL in server env (save below to override with database)"
        : `Built-in default (${data.fallbackDefault})`;

  return (
    <div
      className="rounded-sm border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
    >
      <p className="text-sm font-black text-neutral-900">AI grading model (Gemini or Claude)</p>
      <p className="mt-1 text-xs text-neutral-600">
        Chooses the LLM for production reports and mock-test grading. Pick{" "}
        <span className="font-bold">Gemini 2.5 Flash</span> vs{" "}
        <span className="font-bold">Claude Haiku 4.5</span> to compare speed and style. Claude requires{" "}
        <span className="font-mono">ANTHROPIC_API_KEY</span> on the server.
        Speech transcription always uses a Gemini model (falls back if you select Claude for grading). TTS
        still uses <span className="font-bold">GEMINI_TTS_MODEL</span>.
      </p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-ep-blue">{sourceLabel}</p>
      <p className="mt-1 ep-stat text-xs text-neutral-500">
        Active model: <span className="font-bold text-neutral-800">{data.effectiveModel}</span>
      </p>

      <label className="mt-4 block text-sm font-bold">
        Model
        <select
          className="mt-1 w-full border-2 border-black bg-white px-3 py-2 ep-stat text-sm disabled:opacity-60"
          value={data.persistedModel ?? data.effectiveModel}
          disabled={saving}
          onChange={(e) => void onSelect(e.target.value)}
        >
          {data.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {saving ? (
        <p className="mt-2 text-xs font-bold text-neutral-500">Saving…</p>
      ) : saveMessage ? (
        <p className="mt-2 text-xs font-bold text-green-800">{saveMessage}</p>
      ) : null}

      <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">
        Run migration <span className="font-mono">007_admin_settings.sql</span> and ensure{" "}
        <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> is set so saves persist.
      </p>
    </div>
  );
}
