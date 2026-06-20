"use client";

// Background, non-blocking upload queue for teacher speaking samples.
// enqueue() returns immediately so the admin can record the next question while the
// previous video uploads to Supabase Storage in the background. Module-level singleton
// so the queue survives component re-mounts within the admin tab.

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { recorderMimeToExt } from "@/lib/media-recording-helpers";
import {
  SPEAKING_SAMPLES_BUCKET,
  type SampleTarget,
  type SubtitleCue,
} from "@/lib/speaking-samples-types";

export type UploadJobStatus =
  | "queued"
  | "creating"
  | "uploading"
  | "finalizing"
  | "done"
  | "error";

export interface UploadJob {
  localId: string;
  label: string;
  target: SampleTarget;
  cues: SubtitleCue[];
  durationMs: number;
  title: string;
  notes: string;
  mime: string;
  status: UploadJobStatus;
  error?: string;
  createdAt: number;
}

type Listener = () => void;

let counter = 0;
const jobs: UploadJob[] = [];
// Blobs are kept out of the public snapshot (not serialisable / large).
const blobs = new Map<string, Blob>();
const listeners = new Set<Listener>();
let processing = false;
let beforeUnloadBound = false;

function nextId(): string {
  counter += 1;
  return `usj_${counter}_${Math.round(typeof performance !== "undefined" ? performance.now() : 0)}`;
}

function snapshot(): UploadJob[] {
  return jobs.map((j) => ({ ...j }));
}

let cachedSnapshot: UploadJob[] = [];

function emit(): void {
  cachedSnapshot = snapshot();
  listeners.forEach((l) => l());
  updateBeforeUnload();
}

function hasPending(): boolean {
  return jobs.some(
    (j) => j.status !== "done" && j.status !== "error",
  );
}

function beforeUnloadHandler(e: BeforeUnloadEvent): void {
  if (hasPending()) {
    e.preventDefault();
    e.returnValue = "";
  }
}

function updateBeforeUnload(): void {
  if (typeof window === "undefined") return;
  const shouldBind = hasPending();
  if (shouldBind && !beforeUnloadBound) {
    window.addEventListener("beforeunload", beforeUnloadHandler);
    beforeUnloadBound = true;
  } else if (!shouldBind && beforeUnloadBound) {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    beforeUnloadBound = false;
  }
}

function setStatus(localId: string, status: UploadJobStatus, error?: string): void {
  const job = jobs.find((j) => j.localId === localId);
  if (!job) return;
  job.status = status;
  if (error !== undefined) job.error = error;
  emit();
}

async function processJob(job: UploadJob): Promise<void> {
  const blob = blobs.get(job.localId);
  if (!blob) {
    setStatus(job.localId, "error", "Recording was lost (no video data).");
    return;
  }

  // 1) Create the metadata row + a signed upload URL.
  setStatus(job.localId, "creating");
  const ext = recorderMimeToExt(job.mime);
  const createRes = await fetch("/api/admin/speaking-samples", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_kind: job.target.kind,
      target_ref: job.target.ref,
      question_type: job.target.questionType,
      mime: job.mime,
      ext,
    }),
  });
  if (!createRes.ok) {
    const msg = await safeError(createRes);
    setStatus(job.localId, "error", `Create failed: ${msg}`);
    return;
  }
  const { sampleId, token, storagePath } = (await createRes.json()) as {
    sampleId: string;
    token: string;
    storagePath: string;
  };

  // 2) Upload the video straight to Storage with the signed token.
  setStatus(job.localId, "uploading");
  const supabase = getBrowserSupabase();
  const { error: uploadError } = await supabase.storage
    .from(SPEAKING_SAMPLES_BUCKET)
    .uploadToSignedUrl(storagePath, token, blob, { contentType: job.mime });
  if (uploadError) {
    setStatus(job.localId, "error", `Upload failed: ${uploadError.message}`);
    return;
  }

  // 3) Finalize: flip to ready + persist subtitles / duration / title.
  setStatus(job.localId, "finalizing");
  const patchRes = await fetch(`/api/admin/speaking-samples/${sampleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "ready",
      subtitle_cues: job.cues,
      duration_ms: job.durationMs,
      title: job.title || null,
      notes: job.notes || null,
    }),
  });
  if (!patchRes.ok) {
    const msg = await safeError(patchRes);
    setStatus(job.localId, "error", `Finalize failed: ${msg}`);
    return;
  }

  blobs.delete(job.localId);
  setStatus(job.localId, "done");
}

async function safeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function processLoop(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const next = jobs.find((j) => j.status === "queued");
      if (!next) break;
      await processJob(next);
    }
  } finally {
    processing = false;
  }
}

export interface EnqueueInput {
  label: string;
  target: SampleTarget;
  blob: Blob;
  cues: SubtitleCue[];
  durationMs: number;
  title: string;
  notes: string;
  mime: string;
}

/** Add a job and kick off background processing. Returns instantly. */
export function enqueueSampleUpload(input: EnqueueInput): string {
  const localId = nextId();
  const job: UploadJob = {
    localId,
    label: input.label,
    target: input.target,
    cues: input.cues,
    durationMs: input.durationMs,
    title: input.title,
    notes: input.notes,
    mime: input.mime,
    status: "queued",
    createdAt: counter, // monotonic order key (jobs also kept in insertion order)
  };
  jobs.push(job);
  blobs.set(localId, input.blob);
  emit();
  void processLoop();
  return localId;
}

/** Remove a finished/errored job from the visible list. */
export function clearSampleUploadJob(localId: string): void {
  const idx = jobs.findIndex((j) => j.localId === localId);
  if (idx === -1) return;
  if (jobs[idx].status !== "done" && jobs[idx].status !== "error") return;
  jobs.splice(idx, 1);
  blobs.delete(localId);
  emit();
}

/** Retry an errored job. */
export function retrySampleUploadJob(localId: string): void {
  const job = jobs.find((j) => j.localId === localId);
  if (!job || job.status !== "error") return;
  if (!blobs.has(localId)) return;
  job.status = "queued";
  job.error = undefined;
  emit();
  void processLoop();
}

export function subscribeUploadQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUploadQueueSnapshot(): UploadJob[] {
  return cachedSnapshot;
}
