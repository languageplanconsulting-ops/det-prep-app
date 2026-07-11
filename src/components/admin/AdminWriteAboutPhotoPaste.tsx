"use client";

import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";

const TEMPLATE = `{
  "items": [
    {
      "id": "wph-custom-001",
      "imageUrl": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800",
      "context": "A rainy street with neon signs — students describe mood, light, and what might happen next.",
      "titleEn": "Neon street after rain",
      "titleTh": "ถนนหลังฝนตก",
      "promptEn": "Describe what you see, what might be happening, and how the place feels.",
      "promptTh": "อธิบายภาพ ความเป็นไปได้ และความรู้สึก",
      "keywords": ["rain", "city", "night", "lights", "street"]
    }
  ]
}`;

async function fetchCount(): Promise<number> {
  const res = await fetch("/api/admin/photo-speak-items", { credentials: "same-origin" });
  const data = (await res.json()) as { count?: number };
  return data.count ?? 0;
}

export function AdminWriteAboutPhotoPaste() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCount()
      .then(setCount)
      .catch(() => setCount(null));
  }, []);

  const apply = async () => {
    setMessage(null);
    setError(null);
    const raw = text.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError("Invalid JSON");
      return;
    }
    const items = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown })?.items;
    if (!Array.isArray(items) || items.length === 0) {
      setError('JSON must be { "items": [...] } or a bare array of items.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/photo-speak-items", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as { error?: string; count?: number };
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);

      const ids = items
        .map((it) => (it && typeof it === "object" ? String((it as Record<string, unknown>).id ?? "") : ""))
        .filter(Boolean);
      const logResult = appendAdminUploadLog({
        examKind: "writeAboutPhoto",
        fileName: null,
        summary: `${data.count ?? ids.length} item(s): ${ids.slice(0, 12).join(", ")}${ids.length > 12 ? "…" : ""}`,
        rawText: raw,
        revertSpec: { kind: "writeAboutPhoto", itemIds: ids },
      });

      const total = await fetchCount();
      setCount(total);
      setMessage(
        `Saved ${data.count ?? ids.length} item(s) — shared across all users and devices now. Total active: ${total}.${logResult.ok ? "" : ` (${logResult.error})`}`,
      );
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BrutalPanel title="Write & speak about photo — URL + context (JSON)">
      <p className="mb-2 text-sm text-neutral-600">
        This single upload feeds both <strong>Write about photo</strong> and <strong>Speak about photo</strong>{" "}
        (same shared bank of photos). Paste <code className="ep-stat text-xs">{"{ items: [...] }"}</code> or a bare
        array of items. Each item needs <code className="ep-stat text-xs">id</code> and{" "}
        <code className="ep-stat text-xs">imageUrl</code>. Use <code className="ep-stat text-xs">context</code> for
        the scene line (shown to students); <code className="ep-stat text-xs">promptEn</code> is the task (defaults
        from context if omitted). Saved directly to the database — visible to every user and the mobile app right
        away, not just this browser.
      </p>
      <p className="ep-stat mb-2 text-xs text-neutral-700">
        {count === null ? "Loading current count…" : `Active items in the shared bank: ${count}`}
      </p>
      <p className="ep-stat mb-2 text-[10px] font-bold uppercase text-neutral-500">Copyable template</p>
      <textarea
        readOnly
        value={TEMPLATE}
        rows={14}
        className="mb-3 w-full cursor-text border-2 border-dashed border-neutral-400 bg-neutral-100 p-3 ep-stat text-xs"
        spellCheck={false}
        onFocus={(e) => e.currentTarget.select()}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        spellCheck={false}
        placeholder="Paste your JSON here, then click Save."
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
      />
      <button
        type="button"
        onClick={apply}
        disabled={submitting}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000] disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save to shared bank"}
      </button>
      {message ? <p className="mt-2 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </BrutalPanel>
  );
}
