"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  activeCueAt,
  type SampleTarget,
  type SpeakingSample,
} from "@/lib/speaking-samples-types";

/**
 * "พี่ดอย's sample" — teacher model-answer video for a speaking question.
 * VIP-gated entirely server-side: if the user isn't an active VIP (or there's no
 * sample), the API returns an empty list and this renders nothing.
 */
export function TeacherSamplePlayer({ target }: { target: SampleTarget | null }) {
  const [samples, setSamples] = useState<SpeakingSample[]>([]);
  const [locked, setLocked] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeText, setActiveText] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!target?.ref) {
      setSamples([]);
      setLocked(false);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      target_kind: target.kind,
      target_ref: target.ref,
    });
    fetch(`/api/speaking-samples?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { samples: [], locked: false }))
      .then((data: { samples?: SpeakingSample[]; locked?: boolean }) => {
        if (cancelled) return;
        setSamples(Array.isArray(data.samples) ? data.samples : []);
        setLocked(Boolean(data.locked));
        setSelectedIdx(0);
      })
      .catch(() => {
        if (!cancelled) {
          setSamples([]);
          setLocked(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [target?.kind, target?.ref]);

  const selected = samples[selectedIdx] ?? null;

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !selected) return;
    const cue = activeCueAt(selected.subtitleCues, video.currentTime * 1000);
    setActiveText(cue?.text ?? "");
  }, [selected]);

  useEffect(() => {
    setActiveText("");
  }, [selectedIdx, selected?.id]);

  // Non-VIP, but a sample exists for this question → show an upsell teaser.
  if (!selected && locked) {
    return (
      <a
        href="/pricing"
        className="my-4 flex items-center gap-3 rounded-[6px] border-2 border-dashed border-black bg-ep-yellow/20 p-3 no-underline shadow-[3px_3px_0_0_#000] transition hover:bg-ep-yellow/40"
      >
        <span className="text-2xl">🔒</span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-neutral-900">
            พี่ดอย&apos;s sample พร้อมแล้วสำหรับข้อนี้
          </span>
          <span className="block text-xs text-neutral-700">
            ดูคลิปตัวอย่างการตอบพร้อมซับไตเติล — เฉพาะ VIP &amp; VIP Fast Track · แตะเพื่ออัปเกรด
          </span>
        </span>
        <span className="rounded-[4px] border-2 border-black bg-white px-2 py-1 text-xs font-black">
          VIP
        </span>
      </a>
    );
  }

  if (!selected) return null;

  return (
    <section className="my-4 rounded-[6px] border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-[4px] border-2 border-black bg-ep-yellow px-2 py-0.5 text-xs font-bold">
          🎬 พี่ดอย&apos;s sample
        </span>
        {selected.title ? (
          <span className="text-sm font-semibold text-neutral-800">{selected.title}</span>
        ) : null}
        {samples.length > 1 ? (
          <div className="ml-auto flex flex-wrap gap-1">
            {samples.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={`rounded-[4px] border-2 border-black px-2 py-0.5 text-xs font-bold ${
                  i === selectedIdx ? "bg-black text-white" : "bg-white text-neutral-900"
                }`}
              >
                #{i + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-[4px] border-2 border-black bg-black">
        <video
          ref={videoRef}
          key={selected.id}
          src={selected.videoUrl}
          controls
          playsInline
          onTimeUpdate={onTimeUpdate}
          className="block max-h-[60vh] w-full"
        />
        {activeText ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center px-3">
            <span className="rounded bg-black/75 px-2 py-1 text-center text-sm font-semibold leading-snug text-white">
              {activeText}
            </span>
          </div>
        ) : null}
      </div>

      {selected.notes ? (
        <p className="mt-2 text-xs text-neutral-600">{selected.notes}</p>
      ) : null}
    </section>
  );
}
