"use client";

import { useState } from "react";
import { isSpeakingThumbnailMediaUrl } from "@/lib/speaking-thumbnail";

export function QuestionThumbnailDisplay({ thumbnail }: { thumbnail: string }) {
  const [broken, setBroken] = useState(false);
  const t = thumbnail.trim();

  if (!broken && isSpeakingThumbnailMediaUrl(t)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URLs; avoid next/image domain config
      <img
        src={t}
        alt=""
        className="h-20 w-full max-h-24 rounded-sm border-2 border-black/20 object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }

  if (broken && isSpeakingThumbnailMediaUrl(t)) {
    return (
      <span className="ep-stat text-xs font-bold text-neutral-500" title="Image failed to load">
        Image
      </span>
    );
  }

  return (
    <span className="text-4xl leading-none" aria-hidden>
      {thumbnail}
    </span>
  );
}
