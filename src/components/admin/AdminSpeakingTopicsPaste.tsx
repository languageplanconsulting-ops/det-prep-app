"use client";

import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import { parseSpeakingTopicsJson } from "@/lib/speaking-admin";
import { SPEAKING_ADMIN_UPLOAD_ROUND } from "@/lib/speaking-constants";
import { loadSpeakingTopics, mergeSpeakingTopicsFromAdmin } from "@/lib/speaking-storage";

const SPEAKING_BULK_TEMPLATE = `[
  {
    "id": "rs-topic-1",
    "titleEn": "Daily routines",
    "titleTh": "กิจวัตรประจำวัน",
    "promptEn": "Read the scenario below, then respond to each prompt by speaking for about 1–2 minutes.",
    "promptTh": "อ่านสถานการณ์ด้านล่าง แล้วตอบแต่ละข้อด้วยการพูดประมาณ 1–2 นาที",
    "questions": [
      {
        "id": "rs-topic-1-q1",
        "thumbnail": "☕",
        "promptEn": "Describe your typical morning. Mention one habit and explain why it matters to you.",
        "promptTh": "อธิบายตอนเช้าของคุณ พูดถึงนิสัยหนึ่งข้อและว่าทำไมถึงสำคัญ"
      },
      {
        "id": "rs-topic-1-q2",
        "thumbnail": "🚌",
        "promptEn": "If you could change one thing about how you travel to work or school, what would it be and why?",
        "promptTh": "ถ้าคุณเปลี่ยนอย่างหนึ่งเกี่ยวกับการเดินทางไปทำงานหรือโรงเรียนได้ คุณจะเปลี่ยนอะไรและเพราะอะไร"
      }
    ]
  },
  {
    "id": "rs-topic-2",
    "titleEn": "Technology & learning",
    "titleTh": "เทคโนโลยีกับการเรียนรู้",
    "promptEn": "You will see two prompts. Answer each in your own words.",
    "promptTh": "คุณจะเห็นคำถามสองข้อ ตอบแต่ละข้อด้วยคำพูดของคุณเอง",
    "questions": [
      {
        "id": "rs-topic-2-q1",
        "thumbnail": "💻",
        "promptEn": "What is one app or website that helps you learn English? How do you use it?",
        "promptTh": "มีแอปหรือเว็บไซต์ใดที่ช่วยคุณเรียนภาษาอังกฤษบ้าง คุณใช้อย่างไร"
      }
    ]
  }
]`;

export function AdminSpeakingTopicsPaste() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topicCount, setTopicCount] = useState(0);
  const [templateCopied, setTemplateCopied] = useState(false);

  useEffect(() => {
    setTopicCount(loadSpeakingTopics().length);
  }, [message]);

  const insertTemplate = () => {
    setMessage(null);
    setError(null);
    setText(SPEAKING_BULK_TEMPLATE);
    setMessage("Template inserted into the box below — edit ids and text, then merge.");
  };

  const copyBulkTemplate = async () => {
    setError(null);
    setMessage(null);
    setTemplateCopied(false);
    try {
      await navigator.clipboard.writeText(SPEAKING_BULK_TEMPLATE);
      setMessage("Bulk template copied to clipboard — paste into the box below or a .json file.");
      setTemplateCopied(true);
      window.setTimeout(() => setTemplateCopied(false), 2500);
    } catch {
      setMessage(null);
      setError(
        "Clipboard blocked — focus the template box, select all (⌘A / Ctrl+A), then copy (⌘C / Ctrl+C).",
      );
    }
  };

  const apply = () => {
    setMessage(null);
    setError(null);
    try {
      const raw = text.trim();
      const topics = parseSpeakingTopicsJson(raw);
      const merged = mergeSpeakingTopicsFromAdmin(topics);
      const ids = [...new Set(topics.map((t) => t.id))];
      const logResult = appendAdminUploadLog({
        examKind: "speaking",
        fileName: null,
        summary: `${topics.length} topic(s) · ids: ${ids.join(", ")}`,
        rawText: raw,
        revertSpec: { kind: "speaking", topicIds: ids },
      });
      setMessage(
        `Imported ${topics.length} topic(s) into Round ${SPEAKING_ADMIN_UPLOAD_ROUND}. Total stored: ${merged.length}.${
          logResult.ok ? "" : ` (${logResult.error})`
        }`,
      );
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  return (
    <BrutalPanel title="Read, then speak — JSON (copy & paste)">
      <p className="mb-2 text-sm font-bold text-ep-blue">
        Merged topics are placed in <strong>Round {SPEAKING_ADMIN_UPLOAD_ROUND}</strong> for learners (other rounds
        show &quot;Coming soon&quot; until you upload there in a future update).
      </p>
      <p className="mb-2 text-sm text-neutral-600">
        Paste an array of topics. Each needs <code className="ep-stat text-xs">id</code>,{" "}
        <code className="ep-stat text-xs">titleEn</code>,{" "}
        <code className="ep-stat text-xs">promptEn</code>, and a{" "}
        <code className="ep-stat text-xs">questions</code> array. Every question needs{" "}
        <code className="ep-stat text-xs">id</code>,{" "}
        <code className="ep-stat text-xs">thumbnail</code> — emoji, or image URL (
        <code className="ep-stat text-xs">https://…</code>, <code className="ep-stat text-xs">/path</code>
        , or <code className="ep-stat text-xs">data:image/…</code>),{" "}
        <code className="ep-stat text-xs">promptEn</code>.
      </p>
      <p className="ep-stat mb-3 text-xs text-neutral-500">Topics in browser: {topicCount}</p>

      <div className="mb-4 rounded-[4px] border-2 border-dashed border-ep-blue/60 bg-ep-yellow/10 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-ep-blue">Copyable bulk template</p>
        <p className="mt-1 text-xs text-neutral-700">
          JSON <strong>array</strong> of topics. Each topic needs <code className="ep-stat">id</code>,{" "}
          <code className="ep-stat">titleEn</code>, <code className="ep-stat">promptEn</code>, and a non-empty{" "}
          <code className="ep-stat">questions</code> array. Optional: <code className="ep-stat">titleTh</code>,{" "}
          <code className="ep-stat">promptTh</code>, and per-question <code className="ep-stat">promptTh</code>.{" "}
          <code className="ep-stat">thumbnail</code> can be an emoji, <code className="ep-stat">https://…</code>, a
          path, or <code className="ep-stat">data:image/…</code>.
        </p>
        <textarea
          readOnly
          value={SPEAKING_BULK_TEMPLATE}
          rows={18}
          className="mt-2 w-full cursor-text border-2 border-black bg-white p-3 ep-stat text-xs"
          spellCheck={false}
          aria-label="Read then speak bulk JSON template"
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyBulkTemplate()}
            className="border-2 border-black bg-ep-yellow px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/90"
          >
            {templateCopied ? "Copied!" : "Copy template to clipboard"}
          </button>
          <button
            type="button"
            onClick={insertTemplate}
            className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] hover:bg-neutral-50"
          >
            Insert template into editor
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder='[ { "id": "rs-1", "titleEn": "...", "promptEn": "...", "questions": [ { "id": "q1", "thumbnail": "🎤", "promptEn": "..." } ] } ]'
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Merge into browser topics
      </button>
      {message ? <p className="mt-2 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </BrutalPanel>
  );
}
