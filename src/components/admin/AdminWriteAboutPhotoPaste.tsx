"use client";

import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import { parseWriteAboutPhotoAdminJson } from "@/lib/write-about-photo-admin";
import {
  getWriteAboutPhotoRoundCounts,
  mergeWriteAboutPhotoRoundItems,
} from "@/lib/write-about-photo-storage";

const TEMPLATE = `{
  "round": 1,
  "items": [
    {
      "id": "wph-r1-001",
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

export function AdminWriteAboutPhotoPaste() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState(() => getWriteAboutPhotoRoundCounts());

  useEffect(() => {
    const refresh = () => setCounts(getWriteAboutPhotoRoundCounts());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-write-about-photo-rounds", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-write-about-photo-rounds", refresh);
    };
  }, []);

  const apply = () => {
    setMessage(null);
    setError(null);
    try {
      const raw = text.trim();
      const batches = parseWriteAboutPhotoAdminJson(raw);
      const allIds: string[] = [];
      for (const b of batches) {
        mergeWriteAboutPhotoRoundItems(b.round, b.items);
        allIds.push(...b.items.map((i) => i.id));
      }
      const ids = [...new Set(allIds)];
      const logResult = appendAdminUploadLog({
        examKind: "writeAboutPhoto",
        fileName: null,
        summary: `${batches.length} batch(es) · ${ids.length} id(s): ${ids.slice(0, 12).join(", ")}${ids.length > 12 ? "…" : ""}`,
        rawText: raw,
        revertSpec: { kind: "writeAboutPhoto", itemIds: ids },
      });
      setMessage(
        `Merged into rounds. Totals — R1: ${getWriteAboutPhotoRoundCounts()[1]}, R2: ${getWriteAboutPhotoRoundCounts()[2]}, R3: ${getWriteAboutPhotoRoundCounts()[3]}, R4: ${getWriteAboutPhotoRoundCounts()[4]}, R5: ${getWriteAboutPhotoRoundCounts()[5]}.${logResult.ok ? "" : ` (${logResult.error})`}`,
      );
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  return (
    <BrutalPanel title="Write & speak about photo — URL + context (JSON)">
      <p className="mb-2 text-sm text-neutral-600">
        This single upload feeds both <strong>Write about photo</strong> and <strong>Speak about photo</strong>{" "}
        (same five rounds, same items). Paste one object <code className="ep-stat text-xs">{"{ round, items }"}</code>{" "}
        (round <strong>1–5</strong>), or an array of those batches, or an array of items where each row includes{" "}
        <code className="ep-stat text-xs">round</code>. Each item needs{" "}
        <code className="ep-stat text-xs">id</code> and <code className="ep-stat text-xs">imageUrl</code>.
        Use <code className="ep-stat text-xs">context</code> for the scene line (shown to students);{" "}
        <code className="ep-stat text-xs">promptEn</code> is the task (defaults from context if omitted).
      </p>
      <p className="ep-stat mb-2 text-xs text-neutral-700">
        Uploaded in this browser — R1: {counts[1]} · R2: {counts[2]} · R3: {counts[3]} · R4: {counts[4]} · R5:{" "}
        {counts[5]}
      </p>
      <p className="ep-stat mb-2 text-[10px] font-bold uppercase text-neutral-500">Copyable template</p>
      <textarea
        readOnly
        value={TEMPLATE}
        rows={16}
        className="mb-3 w-full cursor-text border-2 border-dashed border-neutral-400 bg-neutral-100 p-3 ep-stat text-xs"
        spellCheck={false}
        onFocus={(e) => e.currentTarget.select()}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        spellCheck={false}
        placeholder="Paste your JSON here, then click Merge into rounds."
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
      />
      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Merge into rounds
      </button>
      {message ? <p className="mt-2 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </BrutalPanel>
  );
}
