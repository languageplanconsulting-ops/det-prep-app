"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { loadSpeakingBank } from "@/lib/speaking-storage";
import { fetchPhotoSpeakItems, photoSpeakRoundNumber } from "@/lib/photo-speak-api";
import { loadInteractiveSpeakingScenarios } from "@/lib/interactive-speaking-storage";
import {
  clearSampleUploadJob,
  enqueueSampleUpload,
  getUploadQueueSnapshot,
  retrySampleUploadJob,
  subscribeUploadQueue,
  type UploadJob,
} from "@/lib/speaking-sample-upload-queue";
import type {
  SampleQuestionType,
  SampleTarget,
  SampleTargetKind,
  SubtitleCue,
} from "@/lib/speaking-samples-types";
import { SampleRecorder, type RecordingResult } from "@/components/admin/speaking-samples/SampleRecorder";

type ModuleKey = SampleTargetKind & `standalone_${string}`;

interface TargetOption {
  kind: ModuleKey;
  ref: string;
  questionType: SampleQuestionType;
  label: string;
  group: string;
}

const MODULE_TABS: { key: ModuleKey; label: string }[] = [
  { key: "standalone_read_then_speak", label: "Read then speak" },
  { key: "standalone_interactive_speaking", label: "Interactive speaking" },
  { key: "standalone_speak_about_photo", label: "Speak about photo" },
];

function truncate(s: string, n = 70): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function SpeakingSampleWorkspace() {
  const [tab, setTab] = useState<ModuleKey>("standalone_read_then_speak");
  const [options, setOptions] = useState<Record<ModuleKey, TargetOption[]>>({
    standalone_read_then_speak: [],
    standalone_interactive_speaking: [],
    standalone_speak_about_photo: [],
  } as Record<ModuleKey, TargetOption[]>);
  const [selectedRef, setSelectedRef] = useState<string>("");
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // Manage the recorded-blob preview object URL (revoke to avoid leaks).
  useEffect(() => {
    if (!result) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  // Load selectable questions from the local content banks.
  useEffect(() => {
    const readThenSpeak: TargetOption[] = [];
    for (const topic of loadSpeakingBank()) {
      for (const q of topic.questions ?? []) {
        readThenSpeak.push({
          kind: "standalone_read_then_speak",
          ref: q.id,
          questionType: "read_then_speak",
          label: truncate(`${topic.titleEn} — ${q.promptEn}`),
          group: topic.titleEn,
        });
      }
    }

    const interactive: TargetOption[] = loadInteractiveSpeakingScenarios().map((s) => ({
      kind: "standalone_interactive_speaking" as const,
      ref: s.id,
      questionType: "interactive_speaking" as const,
      label: truncate(`${s.titleEn} — ${s.starterQuestionEn}`),
      group: `Round ${s.round ?? 1}`,
    }));

    setOptions(
      (prev) =>
        ({
          ...prev,
          standalone_read_then_speak: readThenSpeak,
          standalone_interactive_speaking: interactive,
        }) as Record<ModuleKey, TargetOption[]>,
    );

    let cancelled = false;
    fetchPhotoSpeakItems("speak_about_photo")
      .then((items) => {
        if (cancelled) return;
        const photo: TargetOption[] = items.map((item) => ({
          kind: "standalone_speak_about_photo",
          ref: item.id,
          questionType: "speak_about_photo",
          label: truncate(`${item.title_en || item.prompt_en}`),
          group: `Round ${photoSpeakRoundNumber(item.sort_order)}`,
        }));
        setOptions((prev) => ({ ...prev, standalone_speak_about_photo: photo }) as Record<ModuleKey, TargetOption[]>);
      })
      .catch(() => {
        /* leave standalone_speak_about_photo empty on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentOptions = options[tab] ?? [];
  const selected = useMemo(
    () => currentOptions.find((o) => o.ref === selectedRef) ?? null,
    [currentOptions, selectedRef],
  );

  const target: SampleTarget | null = selected
    ? { kind: selected.kind, ref: selected.ref, questionType: selected.questionType }
    : null;

  const onRecorded = useCallback((r: RecordingResult) => {
    setResult(r);
    setCues(r.cues);
  }, []);

  const updateCue = useCallback((idx: number, patch: Partial<SubtitleCue>) => {
    setCues((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }, []);

  const removeCue = useCallback((idx: number) => {
    setCues((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const discard = useCallback(() => {
    setResult(null);
    setCues([]);
    setTitle("");
    setNotes("");
  }, []);

  const publish = useCallback(() => {
    if (!result || !target || !selected) return;
    enqueueSampleUpload({
      label: selected.label,
      target,
      blob: result.blob,
      cues,
      durationMs: result.durationMs,
      title,
      notes,
      mime: result.mime,
    });
    // Reset immediately so the admin can record the next question while this uploads.
    discard();
  }, [result, target, selected, cues, title, notes, discard]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* Target picker */}
        <section className="rounded-[6px] border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide">1 · Pick a question</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {MODULE_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setSelectedRef("");
                }}
                className={`rounded-[4px] border-2 border-black px-3 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000] ${
                  tab === t.key ? "bg-black text-white" : "bg-white"
                }`}
              >
                {t.label} ({options[t.key]?.length ?? 0})
              </button>
            ))}
          </div>

          {currentOptions.length === 0 ? (
            <p className="text-sm text-neutral-600">
              No questions found in this browser&apos;s content bank. Upload / sync content first, then reload.
            </p>
          ) : (
            <select
              value={selectedRef}
              onChange={(e) => setSelectedRef(e.target.value)}
              className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select a question —</option>
              {currentOptions.map((o) => (
                <option key={o.ref} value={o.ref}>
                  [{o.group}] {o.label}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* Recorder + editor */}
        {target ? (
          <section className="rounded-[6px] border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">2 · Record พี่ดอย&apos;s sample</h2>
            {!result ? (
              <SampleRecorder onRecorded={onRecorded} />
            ) : (
              <div className="space-y-4">
                {previewUrl ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    className="block max-h-[40vh] w-full rounded-[4px] border-2 border-black bg-black"
                  />
                ) : null}

                <div>
                  <label className="block text-xs font-bold uppercase">Title (optional)</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Band 9 model answer"
                    className="mt-1 w-full border-2 border-black px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-bold uppercase">Subtitles (editable)</label>
                    <span className="text-xs text-neutral-500">{cues.length} lines</span>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {cues.length === 0 ? (
                      <p className="text-xs text-neutral-500">
                        No captions captured. You can publish without subtitles, or re-record in Chrome/Edge.
                      </p>
                    ) : (
                      cues.map((cue, idx) => (
                        <div key={idx} className="flex items-start gap-2 border-2 border-black p-2">
                          <div className="flex flex-col gap-1">
                            <input
                              type="number"
                              value={cue.startMs}
                              onChange={(e) => updateCue(idx, { startMs: Number(e.target.value) })}
                              className="w-20 border-2 border-black px-1 py-0.5 text-xs"
                              title="start ms"
                            />
                            <input
                              type="number"
                              value={cue.endMs}
                              onChange={(e) => updateCue(idx, { endMs: Number(e.target.value) })}
                              className="w-20 border-2 border-black px-1 py-0.5 text-xs"
                              title="end ms"
                            />
                          </div>
                          <textarea
                            value={cue.text}
                            onChange={(e) => updateCue(idx, { text: e.target.value })}
                            rows={2}
                            className="flex-1 border-2 border-black px-2 py-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeCue(idx)}
                            className="border-2 border-black bg-red-100 px-2 py-1 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase">Note to student (optional)</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full border-2 border-black px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={publish}
                    className="flex-1 rounded-[4px] border-2 border-black bg-ep-yellow px-4 py-3 text-sm font-bold shadow-[3px_3px_0_0_#000]"
                  >
                    ⬆ Publish & record next
                  </button>
                  <button
                    type="button"
                    onClick={discard}
                    className="rounded-[4px] border-2 border-black bg-white px-4 py-3 text-sm font-bold shadow-[3px_3px_0_0_#000]"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </div>

      <UploadQueuePanel />
    </div>
  );
}

function UploadQueuePanel() {
  const jobs = useSyncExternalStore(subscribeUploadQueue, getUploadQueueSnapshot, () => [] as UploadJob[]);

  return (
    <aside className="rounded-[6px] border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000] lg:sticky lg:top-32 lg:self-start">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Uploads</h2>
      {jobs.length === 0 ? (
        <p className="text-xs text-neutral-500">No uploads yet. Published samples appear here while they upload.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.localId} className="border-2 border-black p-2 text-xs">
              <p className="font-bold">{job.label}</p>
              <p className="mt-1 flex items-center justify-between">
                <span
                  className={`font-bold uppercase ${
                    job.status === "done"
                      ? "text-green-700"
                      : job.status === "error"
                        ? "text-red-700"
                        : "text-blue-700"
                  }`}
                >
                  {job.status}
                </span>
                {job.status === "done" || job.status === "error" ? (
                  <span className="flex gap-1">
                    {job.status === "error" ? (
                      <button
                        type="button"
                        onClick={() => retrySampleUploadJob(job.localId)}
                        className="border-2 border-black bg-white px-1.5 py-0.5 font-bold"
                      >
                        retry
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => clearSampleUploadJob(job.localId)}
                      className="border-2 border-black bg-white px-1.5 py-0.5 font-bold"
                    >
                      clear
                    </button>
                  </span>
                ) : (
                  <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
                )}
              </p>
              {job.error ? <p className="mt-1 text-red-600">{job.error}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
