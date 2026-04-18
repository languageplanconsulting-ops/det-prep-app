"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useEffect } from "react";

import { mt } from "@/lib/mock-test/mock-test-styles";
import { buildFixedTemplateJson } from "@/lib/mock-test/fixed-upload";

const BUCKETS = [
  { task: "fill_in_blanks", required: 4 },
  { task: "write_about_photo", required: 2 },
  { task: "dictation", required: 4 },
  { task: "real_english_word", required: 1 },
  { task: "vocabulary_reading", required: 1 },
  { task: "speak_about_photo", required: 3 },
  { task: "read_and_write", required: 1 },
  { task: "read_then_speak", required: 1 },
  { task: "interactive_conversation_mcq", required: 1 },
  { task: "interactive_speaking", required: 1 },
  { task: "conversation_summary", required: 1 },
] as const;

type BucketKey = (typeof BUCKETS)[number]["task"];
type PhotoTopic = "all" | "people" | "place" | "landscape" | "animal" | "nature";
type PhotoEntry = { imageUrl: string; photoType: PhotoTopic };

function prettyTaskName(task: string): string {
  return task.replaceAll("_", " ");
}

function jsonFormat(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function MockFixedBuilderWorkspace() {
  const [internalName, setInternalName] = useState("");
  const [userTitle, setUserTitle] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dictationSource, setDictationSource] = useState("");
  const [realWordSource, setRealWordSource] = useState("");
  const [fakeWordSource, setFakeWordSource] = useState("");
  const [readWriteTopicSource, setReadWriteTopicSource] = useState("");
  const [interactiveSpeakingTopicSource, setInteractiveSpeakingTopicSource] = useState("");
  const [photoBulkSource, setPhotoBulkSource] = useState("");
  const [writePhotoEntries, setWritePhotoEntries] = useState<PhotoEntry[]>([
    { imageUrl: "", photoType: "all" },
    { imageUrl: "", photoType: "all" },
    { imageUrl: "", photoType: "all" },
  ]);
  const [speakPhotoEntries, setSpeakPhotoEntries] = useState<PhotoEntry[]>([
    { imageUrl: "", photoType: "all" },
    { imageUrl: "", photoType: "all" },
    { imageUrl: "", photoType: "all" },
  ]);
  const [bucketJson, setBucketJson] = useState<Record<BucketKey, string>>(() => {
    const init = {} as Record<BucketKey, string>;
    let groupedFromTemplate: Record<string, unknown[]> = {};
    try {
      const parsed = JSON.parse(buildFixedTemplateJson()) as {
        grouped_items?: Record<string, unknown[]>;
      };
      groupedFromTemplate = parsed.grouped_items ?? {};
    } catch {
      groupedFromTemplate = {};
    }
    for (const b of BUCKETS) {
      const templateRows = groupedFromTemplate[b.task];
      init[b.task] =
        Array.isArray(templateRows) && templateRows.length > 0
          ? jsonFormat(templateRows)
          : "[]";
    }
    return init;
  });
  const [savedSets, setSavedSets] = useState<
    Array<{
      id: string;
      internalName: string;
      userTitle: string;
      stepCount: number;
      attempts: number;
      avgTotal: number;
      bestTotal: number;
    }>
  >([]);
  const [rankedAttempts, setRankedAttempts] = useState<
    Array<{
      id: string;
      setId: string;
      username: string;
      email: string;
      dateTaken: string;
      total: number;
      listening: number;
      speaking: number;
      reading: number;
      writing: number;
      submission: Record<string, unknown> | null;
    }>
  >([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const grouped = useMemo(() => {
    const out: Record<string, unknown[]> = {};
    for (const b of BUCKETS) {
      try {
        const parsed = JSON.parse(bucketJson[b.task] || "[]");
        out[b.task] = Array.isArray(parsed) ? parsed : [];
      } catch {
        out[b.task] = [];
      }
    }
    return out;
  }, [bucketJson]);

  const setBucket = (task: BucketKey, value: string) =>
    setBucketJson((prev) => ({ ...prev, [task]: value }));

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/admin/mock-test/fixed-analytics", {
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        sets?: Array<{
          id: string;
          internalName: string;
          userTitle: string;
          stepCount: number;
          attempts: number;
          avgTotal: number;
          bestTotal: number;
        }>;
        rankedAttempts?: Array<{
          id: string;
          setId: string;
          username: string;
          email: string;
          dateTaken: string;
          total: number;
          listening: number;
          speaking: number;
          reading: number;
          writing: number;
          submission: Record<string, unknown> | null;
        }>;
      };
      if (res.ok) {
        setSavedSets(json.sets ?? []);
        setRankedAttempts(json.rankedAttempts ?? []);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const copyBucket = async (task: BucketKey) => {
    try {
      await navigator.clipboard.writeText(bucketJson[task] || "[]");
      setBanner(`Copied ${task} JSON.`);
    } catch {
      setBanner(`Could not copy ${task}.`);
    }
  };

  const validate = async () => {
    setBanner(null);
    const res = await fetch("/api/admin/mock-test/fixed-builder/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ grouped_items: grouped }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string; rowCount?: number };
    if (!res.ok || !json.ok) {
      setBanner(json.error ?? "Validation failed.");
      return;
    }
    setBanner(`Validation passed (${json.rowCount ?? 0} rows ready).`);
  };

  const save = async () => {
    setSaving(true);
    setBanner(null);
    const res = await fetch("/api/admin/mock-test/fixed-builder/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        internal_name: internalName,
        user_title: userTitle,
        grouped_items: grouped,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string; savedRows?: number };
    setSaving(false);
    if (!res.ok || !json.ok) {
      setBanner(json.error ?? "Save failed.");
      return;
    }
    setBanner(`Saved successfully (${json.savedRows ?? 0} rows).`);
    await loadAnalytics();
  };

  const applyTopicsToReadWrite = () => {
    const topics = readWriteTopicSource
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!topics.length) return;
    setBucket(
      "read_and_write",
      jsonFormat(
        topics.map((t) => ({
          content: {
            instruction: "Read then write based on the topic.",
            instruction_th: "อ่านแล้วเขียนตามหัวข้อ",
            prompt: t,
          },
          correct_answer: null,
        })),
      ),
    );
    setBanner(`Applied ${topics.length} topic(s) to read_and_write.`);
  };

  const applyTopicsToInteractiveSpeaking = () => {
    const topics = interactiveSpeakingTopicSource
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 1);
    if (!topics.length) return;
    setBucket(
      "interactive_speaking",
      jsonFormat(
        topics.slice(0, 1).map((t) => ({
          content: {
            prompt_en: `Let's discuss: ${t}.`,
            prompt_th: "มาคุยเรื่องนี้กัน",
            expected_turns: 5,
          },
          correct_answer: null,
        })),
      ),
    );
    setBanner(`Applied ${topics.length} topic(s) to interactive_speaking (step 19).`);
  };

  const generateInteractiveConversationTtsFromBucket = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bucketJson.interactive_conversation_mcq || "[]");
    } catch {
      setBanner("interactive_conversation_mcq JSON is invalid.");
      return;
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      setBanner("interactive_conversation_mcq bucket is empty.");
      return;
    }
    setSaving(true);
    const nextRows: unknown[] = [];
    for (const rawRow of parsed) {
      if (!rawRow || typeof rawRow !== "object") {
        nextRows.push(rawRow);
        continue;
      }
      const row = rawRow as Record<string, unknown>;
      const content = (row.content && typeof row.content === "object"
        ? row.content
        : row) as Record<string, unknown>;
      const turns = Array.isArray(content.turns) ? content.turns : [];
      const nextTurns: unknown[] = [];
      for (const turn of turns) {
        if (!turn || typeof turn !== "object") {
          nextTurns.push(turn);
          continue;
        }
        const t = turn as Record<string, unknown>;
        const question = String(t.question_en ?? "").trim();
        let audioUrl = String(t.question_audio_url ?? "");
        if (!audioUrl && question) {
          try {
            const res = await fetch("/api/speech-synthesize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: question }),
            });
            const j = (await res.json()) as { audioBase64?: string; mimeType?: string };
            if (j.audioBase64 && j.mimeType) {
              audioUrl = `data:${j.mimeType};base64,${j.audioBase64}`;
            }
          } catch {
            audioUrl = "";
          }
        }
        nextTurns.push({
          ...t,
          ...(audioUrl ? { question_audio_url: audioUrl } : {}),
        });
      }
      nextRows.push({
        ...row,
        content: {
          ...content,
          turns: nextTurns,
        },
      });
    }
    setSaving(false);
    setBucket("interactive_conversation_mcq", jsonFormat(nextRows));
    setBanner("Interactive conversation TTS generated for question turns.");
  };

  const generateRealWordFromSources = () => {
    const realWords = realWordSource
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const fakeWords = fakeWordSource
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (realWords.length !== 32 || fakeWords.length !== 48) {
      setBanner("Real word step needs exactly 32 real words and 48 fake words.");
      return;
    }
    setBucket(
      "real_english_word",
      jsonFormat([
        {
          content: {
            real_words: realWords,
            fake_words: fakeWords,
            rounds: 4,
            words_per_round: 20,
            round_duration_sec: 60,
            score_per_correct: 5,
          },
          correct_answer: null,
        },
      ]),
    );
    setBanner("Generated real_english_word JSON for step 20 (4 rounds, 160 max score).");
  };

  const updatePhotoEntry = (
    task: "write_about_photo" | "speak_about_photo",
    idx: number,
    patch: Partial<PhotoEntry>,
  ) => {
    const setter = task === "write_about_photo" ? setWritePhotoEntries : setSpeakPhotoEntries;
    setter((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const generatePhotoBucket = (task: "write_about_photo" | "speak_about_photo") => {
    const expectedCount = task === "write_about_photo" ? 2 : 3;
    const rows = (task === "write_about_photo" ? writePhotoEntries : speakPhotoEntries).map((x) => ({
      imageUrl: x.imageUrl.trim(),
      photoType: x.photoType,
    })).slice(0, expectedCount);
    if (rows.some((x) => !x.imageUrl)) {
      setBanner(`Please fill all ${expectedCount} image links for ${task}.`);
      return;
    }
    const generated = rows.map((row) => ({
      content: {
        image_url: row.imageUrl,
        photo_type: row.photoType,
        keywords: ["people", "place", "landscape", "animal", "nature"],
        instruction:
          task === "write_about_photo"
            ? "Write a response based on the photo."
            : "Speak a response based on the photo.",
        instruction_th:
          task === "write_about_photo"
            ? "เขียนคำตอบจากภาพ"
            : "พูดคำตอบจากภาพ",
      },
      correct_answer: null,
    }));
    setBucket(task, jsonFormat(generated));
    setBanner(`Generated ${task} JSON from link + topic boxes.`);
  };

  const applyPhotoBulkSource = () => {
    const lines = photoBulkSource
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (lines.length < 5) {
      setBanner("Photo bulk paste needs 5 lines: first 2 for write, next 3 for speak.");
      return;
    }
    const parsed = lines.slice(0, 5).map((line) => {
      const [urlRaw, typeRaw] = line.split("|").map((x) => x.trim());
      const url = String(urlRaw ?? "");
      const t = String(typeRaw ?? "all").toLowerCase();
      const valid: PhotoTopic =
        t === "all" || t === "people" || t === "place" || t === "landscape" || t === "animal" || t === "nature"
          ? (t as PhotoTopic)
          : "all";
      return { imageUrl: url, photoType: valid };
    });
    if (parsed.some((x) => !x.imageUrl)) {
      setBanner("Every photo bulk line must include image URL. Format: image_url|category");
      return;
    }
    setWritePhotoEntries(parsed.slice(0, 2));
    setSpeakPhotoEntries(parsed.slice(2, 5));
    setBanner("Applied photo bulk rows to write_about_photo (2) and speak_about_photo (3).");
  };

  const generateDictationFromSource = async () => {
    const lines = dictationSource
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (!lines.length) return;
    setSaving(true);
    const rows: Array<{ content: Record<string, unknown>; correct_answer: Record<string, unknown> }> = [];
    for (const line of lines) {
      let audioUrl = "";
      try {
        const res = await fetch("/api/speech-synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: line }),
        });
        const j = (await res.json()) as { audioBase64?: string; mimeType?: string };
        if (j.audioBase64 && j.mimeType) {
          audioUrl = `data:${j.mimeType};base64,${j.audioBase64}`;
        }
      } catch {
        audioUrl = "";
      }
      rows.push({
        content: {
          instruction: "Listen and type exactly what you hear.",
          instruction_th: "ฟังและพิมพ์ให้ตรงกับที่ได้ยิน",
          reference_sentence: line,
          ...(audioUrl ? { audio_url: audioUrl } : {}),
        },
        correct_answer: { answer: line },
      });
    }
    setSaving(false);
    setBucket("dictation", jsonFormat(rows));
    setBanner("Dictation JSON generated from source (with inline TTS when available).");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[#004AAD]">Mock Builder</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Create one full mock by grouped task buckets. System auto-distributes to fixed 20-step sequence.
        </p>
      </header>

      <section className={`${mt.border} ${mt.shadow} space-y-3 bg-neutral-50 p-4`}>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={`${mt.border} bg-white px-3 py-2 text-sm`}
            placeholder="Internal name (e.g. mock_test_1)"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
          />
          <input
            className={`${mt.border} bg-white px-3 py-2 text-sm`}
            placeholder="User title (shown to learners)"
            value={userTitle}
            onChange={(e) => setUserTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-5">
          <textarea
            className={`${mt.border} bg-white p-3 text-xs`}
            rows={4}
            placeholder="Real words (32 lines)"
            value={realWordSource}
            onChange={(e) => setRealWordSource(e.target.value)}
          />
          <textarea
            className={`${mt.border} bg-white p-3 text-xs`}
            rows={4}
            placeholder="Fake words (48 lines)"
            value={fakeWordSource}
            onChange={(e) => setFakeWordSource(e.target.value)}
          />
          <textarea
            className={`${mt.border} bg-white p-3 text-xs`}
            rows={4}
            placeholder="Read-and-write topics (one line per topic)"
            value={readWriteTopicSource}
            onChange={(e) => setReadWriteTopicSource(e.target.value)}
          />
          <textarea
            className={`${mt.border} bg-white p-3 text-xs`}
            rows={4}
            placeholder="Interactive speaking starter prompt (one line)"
            value={interactiveSpeakingTopicSource}
            onChange={(e) => setInteractiveSpeakingTopicSource(e.target.value)}
          />
          <textarea
            className={`${mt.border} bg-white p-3 text-xs`}
            rows={4}
            placeholder="Dictation sentences (one line per item)"
            value={dictationSource}
            onChange={(e) => setDictationSource(e.target.value)}
          />
        </div>
        <div className={`${mt.border} bg-white p-3`}>
          <p className="text-xs font-black text-[#004AAD]">Photo bulk paste (5 items in one go)</p>
          <p className="mt-1 text-[11px] text-neutral-600">
            Paste 5 lines in order: first 2 = write_about_photo, next 3 = speak_about_photo. Format per line:
            image_url|category (category optional). If omitted, all categories are used.
          </p>
          <textarea
            className={`${mt.border} mt-2 w-full bg-neutral-50 p-2 text-xs`}
            rows={5}
            placeholder={`https://.../img1.jpg\nhttps://.../img2.jpg\nhttps://.../img3.jpg\nhttps://.../img4.jpg\nhttps://.../img5.jpg`}
            value={photoBulkSource}
            onChange={(e) => setPhotoBulkSource(e.target.value)}
          />
          <button
            type="button"
            onClick={applyPhotoBulkSource}
            className={`mt-2 ${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
          >
            Apply 5 photos to write+speak
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={`${mt.border} bg-white p-3`}>
            <p className="text-xs font-black text-[#004AAD]">Write about photo (2 items)</p>
            <p className="mt-1 text-[11px] text-neutral-600">Add one photo link + topic for each item.</p>
            <div className="mt-2 space-y-2">
              {writePhotoEntries.slice(0, 2).map((entry, i) => (
                <div key={`w-${i}`} className="grid gap-2 sm:grid-cols-[1fr_130px]">
                  <input
                    className={`${mt.border} bg-neutral-50 px-2 py-1 text-xs`}
                    placeholder={`Write photo #${i + 1} image URL`}
                    value={entry.imageUrl}
                    onChange={(e) => updatePhotoEntry("write_about_photo", i, { imageUrl: e.target.value })}
                  />
                  <select
                    className={`${mt.border} bg-neutral-50 px-2 py-1 text-xs`}
                    value={entry.photoType}
                    onChange={(e) =>
                      updatePhotoEntry("write_about_photo", i, { photoType: e.target.value as PhotoTopic })
                    }
                  >
                    <option value="all">all categories</option>
                    <option value="people">people</option>
                    <option value="place">place</option>
                    <option value="landscape">landscape</option>
                    <option value="animal">animal</option>
                    <option value="nature">nature</option>
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => generatePhotoBucket("write_about_photo")}
              className={`mt-2 ${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
            >
              Generate write_about_photo JSON
            </button>
          </section>
          <section className={`${mt.border} bg-white p-3`}>
            <p className="text-xs font-black text-[#004AAD]">Speak about photo (3 items)</p>
            <p className="mt-1 text-[11px] text-neutral-600">Add one photo link + topic for each item.</p>
            <div className="mt-2 space-y-2">
              {speakPhotoEntries.map((entry, i) => (
                <div key={`s-${i}`} className="grid gap-2 sm:grid-cols-[1fr_130px]">
                  <input
                    className={`${mt.border} bg-neutral-50 px-2 py-1 text-xs`}
                    placeholder={`Speak photo #${i + 1} image URL`}
                    value={entry.imageUrl}
                    onChange={(e) => updatePhotoEntry("speak_about_photo", i, { imageUrl: e.target.value })}
                  />
                  <select
                    className={`${mt.border} bg-neutral-50 px-2 py-1 text-xs`}
                    value={entry.photoType}
                    onChange={(e) =>
                      updatePhotoEntry("speak_about_photo", i, { photoType: e.target.value as PhotoTopic })
                    }
                  >
                    <option value="all">all categories</option>
                    <option value="people">people</option>
                    <option value="place">place</option>
                    <option value="landscape">landscape</option>
                    <option value="animal">animal</option>
                    <option value="nature">nature</option>
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => generatePhotoBucket("speak_about_photo")}
              className={`mt-2 ${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
            >
              Generate speak_about_photo JSON
            </button>
          </section>
        </div>
        <p className="text-xs text-neutral-600">
          Real-word, read-and-write, and interactive-speaking are generated separately. Conversation MCQ has its own
          bucket and TTS generator. Dictation supports sentence
          lines + instant TTS.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={generateRealWordFromSources} className={`${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}>
            Generate real word JSON (step 20)
          </button>
          <button type="button" onClick={applyTopicsToReadWrite} className={`${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}>
            Apply topics to read and write
          </button>
          <button type="button" onClick={applyTopicsToInteractiveSpeaking} className={`${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}>
            Apply starter prompt to interactive speaking
          </button>
          <button type="button" onClick={() => void generateInteractiveConversationTtsFromBucket()} className={`${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}>
            Generate interactive conversation TTS
          </button>
          <button type="button" onClick={() => void generateDictationFromSource()} className={`${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}>
            Generate dictation JSON + TTS
          </button>
          <button type="button" onClick={() => void validate()} className={`${mt.border} bg-[#004AAD] px-3 py-2 text-xs font-black text-[#FFCC00] shadow-[2px_2px_0_0_#000]`}>
            Validate
          </button>
          <button type="button" disabled={saving} onClick={() => void save()} className={`${mt.border} bg-[#FFCC00] px-3 py-2 text-xs font-black shadow-[2px_2px_0_0_#000] disabled:opacity-50`}>
            {saving ? "Saving..." : "Save mock"}
          </button>
        </div>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-[#004AAD]">Uploaded fixed mocks</p>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            className="rounded border border-black bg-white px-2 py-1 text-[11px] font-bold"
          >
            {analyticsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100">
                <th className="p-2 font-black">Set</th>
                <th className="p-2 font-black">Rows</th>
                <th className="p-2 font-black">Taken</th>
                <th className="p-2 font-black">Avg</th>
                <th className="p-2 font-black">Best</th>
                <th className="p-2 font-black">Preview</th>
              </tr>
            </thead>
            <tbody>
              {savedSets.map((s) => (
                <tr key={s.id} className="border-b border-neutral-200">
                  <td className="p-2">
                    <p className="font-bold">{s.userTitle}</p>
                    <p className="font-mono text-[10px] text-neutral-500">{s.internalName}</p>
                  </td>
                  <td className="p-2">{s.stepCount}</td>
                  <td className="p-2">{s.attempts}</td>
                  <td className="p-2">{s.avgTotal}</td>
                  <td className="p-2">{s.bestTotal}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Link
                        href={`/mock-test/start?setId=${encodeURIComponent(s.id)}&adminPreview=1`}
                        className="rounded border border-black bg-white px-2 py-1 text-[10px] font-bold"
                      >
                        Preview
                      </Link>
                      <Link
                        href={`/mock-test/start?setId=${encodeURIComponent(s.id)}&adminPreview=1&skipTimer=1`}
                        className="rounded border border-black bg-amber-100 px-2 py-1 text-[10px] font-bold"
                      >
                        Preview + skip timer
                      </Link>
                      <Link
                        href={`/mock-test/start?setId=${encodeURIComponent(s.id)}&adminPreview=1&previewSeparate=1&skipTimer=1`}
                        className="rounded border border-black bg-emerald-100 px-2 py-1 text-[10px] font-bold"
                      >
                        Preview separate
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <p className="text-sm font-black text-[#004AAD]">Mock analytics ranking (highest to lowest)</p>
        <div className="mt-3 max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
            <thead className="sticky top-0 border-b-2 border-black bg-neutral-100">
              <tr>
                <th className="p-2 font-black">Rank</th>
                <th className="p-2 font-black">Username</th>
                <th className="p-2 font-black">Email</th>
                <th className="p-2 font-black">Date taken</th>
                <th className="p-2 font-black">Total</th>
                <th className="p-2 font-black">Listening</th>
                <th className="p-2 font-black">Speaking</th>
                <th className="p-2 font-black">Reading</th>
                <th className="p-2 font-black">Writing</th>
                <th className="p-2 font-black">Submission</th>
              </tr>
            </thead>
            <tbody>
              {rankedAttempts.map((r, idx) => (
                <tr key={r.id} className="border-b border-neutral-200">
                  <td className="p-2 font-bold">{idx + 1}</td>
                  <td className="p-2">{r.username}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{new Date(r.dateTaken).toLocaleString()}</td>
                  <td className="p-2 font-bold">{r.total}</td>
                  <td className="p-2">{r.listening}</td>
                  <td className="p-2">{r.speaking}</td>
                  <td className="p-2">{r.reading}</td>
                  <td className="p-2">{r.writing}</td>
                  <td className="p-2">
                    <details>
                      <summary className="cursor-pointer text-[10px] font-bold text-[#004AAD]">View</summary>
                      <pre className="mt-1 max-w-[380px] overflow-auto rounded border border-neutral-300 bg-neutral-50 p-2 text-[10px]">
                        {JSON.stringify(r.submission ?? {}, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {BUCKETS.map((b) => (
          <section key={b.task} className={`${mt.border} ${mt.shadow} bg-white p-3`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#004AAD]">{prettyTaskName(b.task)}</p>
              <div className="flex items-center gap-2">
                <span className="rounded border border-black bg-neutral-50 px-2 py-0.5 text-[10px] font-bold">
                  required: {b.required}
                </span>
                <button
                  type="button"
                  onClick={() => void copyBucket(b.task)}
                  className="rounded border border-black bg-white px-2 py-0.5 text-[10px] font-bold"
                >
                  Copy JSON
                </button>
              </div>
            </div>
            <textarea
              value={bucketJson[b.task]}
              onChange={(e) => setBucket(b.task, e.target.value)}
              rows={10}
              className={`mt-2 w-full ${mt.border} bg-neutral-50 p-2 font-mono text-[11px]`}
              spellCheck={false}
            />
          </section>
        ))}
      </div>

      {banner ? <p className="rounded-[4px] border-4 border-black bg-amber-50 px-4 py-3 text-sm font-bold">{banner}</p> : null}
    </div>
  );
}
