"use client";

/**
 * Shared Bunny Stream embed — same URL + chrome as /admin/course
 * (CourseAdminClient) and the student course player.
 *
 * Resume seek runs once when the video mounts. Progress saves must never
 * remount the iframe (that kicks the user out of fullscreen while scrubbing).
 */
import { useEffect, useId, useRef, useState } from "react";

import {
  formatWatchClock,
  getLocalWatchedSeconds,
  saveLessonWatchProgress,
} from "@/lib/course-video-progress";

const BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID ?? "715227";
const PLAYERJS_SRC = "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";

type PlayerJsPlayer = {
  on: (event: string, cb: (data?: { seconds?: number; duration?: number }) => void) => void;
  setCurrentTime: (seconds: number) => void;
  getCurrentTime?: (cb: (seconds: number) => void) => void;
};

declare global {
  interface Window {
    playerjs?: { Player: new (el: HTMLIFrameElement | string) => PlayerJsPlayer };
  }
}

let playerJsLoader: Promise<void> | null = null;

function loadPlayerJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.playerjs?.Player) return Promise.resolve();
  if (playerJsLoader) return playerJsLoader;
  playerJsLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PLAYERJS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("playerjs load failed")));
      if (window.playerjs?.Player) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = PLAYERJS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("playerjs load failed"));
    document.head.appendChild(script);
  });
  return playerJsLoader;
}

export function bunnyEmbedUrl(
  guid: string,
  opts: { autoplay?: boolean; preload?: boolean } = {},
): string {
  const autoplay = opts.autoplay ? "true" : "false";
  const preload = opts.preload ? "true" : "false";
  // playerjs=true enables the Playback Control API bridge.
  return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${guid}?autoplay=${autoplay}&preload=${preload}&playerjs=true`;
}

function initialResumeSeconds(lessonId: string | undefined, startSeconds: number): number {
  return Math.max(
    0,
    Math.floor(startSeconds),
    lessonId ? getLocalWatchedSeconds(lessonId) : 0,
  );
}

export function BunnyVideoEmbed({
  guid,
  title,
  autoplay = false,
  brutal = false,
  lessonId,
  startSeconds = 0,
  onProgress,
  onEnded,
}: {
  guid: string;
  title: string;
  autoplay?: boolean;
  /** Admin / player chrome: thick black border. Soft rounded for session modal. */
  brutal?: boolean;
  /** When set, progress is tracked and persisted for this lesson. */
  lessonId?: string;
  /** Server-known resume point; local max is also considered (once, on mount). */
  startSeconds?: number;
  onProgress?: (seconds: number, duration: number) => void;
  /** Fired once when the video reaches the end (auto-complete hook). */
  onEnded?: () => void;
}) {
  const reactId = useId().replace(/:/g, "");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSavedRef = useRef(0);
  const maxSeenRef = useRef(0);
  const endedFiredRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const lessonIdRef = useRef(lessonId);
  // Freeze seek target for this mount — never recompute from live localStorage
  // while the video is playing (that remounted the iframe and killed fullscreen).
  const seekOnceRef = useRef(initialResumeSeconds(lessonId, startSeconds));
  const [resumeHint] = useState(() => {
    const at = initialResumeSeconds(lessonId, startSeconds);
    return at >= 5 ? at : null;
  });

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    lessonIdRef.current = lessonId;
  }, [lessonId]);

  // Only when the video identity changes: reset seek target + tracking refs.
  useEffect(() => {
    const at = initialResumeSeconds(lessonId, startSeconds);
    seekOnceRef.current = at;
    maxSeenRef.current = at;
    lastSavedRef.current = 0;
    endedFiredRef.current = false;
  }, [guid, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps -- startSeconds only for open

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let cancelled = false;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const seekTo = seekOnceRef.current;

    function fireEnded(durationHint: number) {
      if (endedFiredRef.current) return;
      endedFiredRef.current = true;
      const id = lessonIdRef.current;
      const toSave = Math.max(
        Math.floor(maxSeenRef.current),
        Math.floor(durationHint),
      );
      if (id) {
        void saveLessonWatchProgress({
          lessonId: id,
          watchedSeconds: toSave,
          completed: true,
        });
      }
      onEndedRef.current?.();
    }

    void (async () => {
      try {
        await loadPlayerJs();
      } catch {
        return;
      }
      if (cancelled || !iframeRef.current || !window.playerjs?.Player) return;

      const player = new window.playerjs.Player(iframeRef.current);

      player.on("ready", () => {
        if (cancelled) return;
        if (seekTo >= 3) {
          player.setCurrentTime(seekTo);
        }
      });

      player.on("timeupdate", (data) => {
        if (!data || typeof data.seconds !== "number") return;
        const seconds = data.seconds;
        const duration = typeof data.duration === "number" ? data.duration : 0;
        if (seconds > maxSeenRef.current) maxSeenRef.current = seconds;
        onProgressRef.current?.(seconds, duration);

        // Some embeds skip the `ended` event — treat near-end as complete.
        if (duration > 0 && seconds >= duration - 1.25) {
          fireEnded(duration);
          return;
        }

        const id = lessonIdRef.current;
        if (!id) return;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          const toSave = Math.floor(maxSeenRef.current);
          if (toSave - lastSavedRef.current < 4 && toSave > 0) return;
          lastSavedRef.current = toSave;
          void saveLessonWatchProgress({ lessonId: id, watchedSeconds: toSave });
        }, 2500);
      });

      player.on("pause", () => {
        const id = lessonIdRef.current;
        if (!id || endedFiredRef.current) return;
        const toSave = Math.floor(maxSeenRef.current);
        lastSavedRef.current = toSave;
        void saveLessonWatchProgress({ lessonId: id, watchedSeconds: toSave });
      });

      player.on("ended", () => {
        fireEnded(maxSeenRef.current);
      });
    })();

    return () => {
      cancelled = true;
      if (saveTimer) clearTimeout(saveTimer);
      const id = lessonIdRef.current;
      if (id && maxSeenRef.current > 0 && !endedFiredRef.current) {
        void saveLessonWatchProgress({
          lessonId: id,
          watchedSeconds: Math.floor(maxSeenRef.current),
        });
      }
    };
  }, [guid, lessonId]);

  const frame = brutal
    ? "relative w-full overflow-hidden border-4 border-black bg-black pt-[56.25%]"
    : "relative w-full overflow-hidden rounded-2xl bg-black pt-[56.25%] ring-1 ring-slate-200";

  // Stable src for this guid — do not bake resume time into the URL/key or
  // React will remount the iframe mid-fullscreen when progress saves.
  const src = bunnyEmbedUrl(guid, { autoplay, preload: autoplay });

  return (
    <div className="space-y-2">
      {resumeHint != null && (
        <p
          className={`text-[13px] font-bold ${brutal ? "text-neutral-600" : "text-slate-500"}`}
        >
          ต่อจากนาทีที่ {formatWatchClock(resumeHint)} — ระบบจำตำแหน่งไว้ให้แล้ว
        </p>
      )}
      <div className={frame}>
        <iframe
          ref={iframeRef}
          id={`bunny-${reactId}`}
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
