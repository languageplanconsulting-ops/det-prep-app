"use client";

import { useState } from "react";

import { getPhoto, photoCredit } from "@/lib/lesson-photo-bank";

/**
 * The photo a drill is about.
 *
 * Every write/speak-about-photo exercise in the course used to show only the
 * script — "ในภาพมีผู้หญิง 2 คน กำลังออกกำลังกาย" with no picture — so the
 * learner was rebuilding a description of an image they had never seen. That is
 * not a photo task; it is dictation with extra steps.
 *
 * Renders nothing when the id is missing or unknown rather than showing a
 * broken frame, so a drill with no photo simply looks like it never had one.
 */
export function DrillPhoto({
  photoId,
  captionTh,
}: {
  photoId?: string | null;
  /** Optional line under the image, e.g. "ดูภาพนี้แล้วตอบ". */
  captionTh?: string;
}) {
  const [failed, setFailed] = useState(false);
  const photo = photoId ? getPhoto(photoId) : undefined;
  if (!photo || failed) return null;

  return (
    <figure className="mb-3 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
      {/*
        A bounded-height image rather than an absolutely-positioned ratio box.
        A ratio box needs `aspect-ratio` (or a padding hack) to hold itself
        open; if that ever fails to apply, the box collapses to zero and the
        absolutely-positioned image escapes to the nearest positioned ancestor
        at full natural size — a 1280px photo across the whole screen. This
        cannot fail that way: max-height bounds it, object-cover keeps the
        framing, and w-full keeps it inside the card in every browser.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element -- Openverse thumbnails
          are remote and unsized; next/image would need every provider host
          allow-listed for no benefit at this size. */}
      <img
        src={photo.display}
        alt={photo.scene}
        loading="lazy"
        onError={() => setFailed(true)}
        className="block h-auto max-h-[260px] w-full object-cover sm:max-h-[340px]"
      />
      <figcaption className="flex flex-wrap items-center justify-between gap-1 px-3 py-2">
        <span className="text-[13px] font-semibold text-slate-700">
          {captionTh ?? "ดูภาพนี้แล้วตอบ"}
        </span>
        {/* CC attribution is a licence condition, not decoration. */}
        <span className="text-[13px] text-slate-400">{photoCredit(photo)}</span>
      </figcaption>
    </figure>
  );
}
