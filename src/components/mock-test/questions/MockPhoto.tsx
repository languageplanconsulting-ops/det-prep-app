"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The photo for a mock step, with the failure path actually handled.
 *
 * Mock photos are mirrored onto our own CDN (see lib/mock-test/mirror-image),
 * but a learner's own connection can still drop a single request. Before, that
 * left a permanent "Loading photo..." spinner with no way out — and because
 * `speak_about_photo` keeps the step timer paused until the image reports
 * ready, a stuck image also meant a stuck test. So: auto-retry a few times,
 * then show a real error with a retry button, and always release the timer.
 */
const MAX_AUTO_RETRIES = 3;

export function MockPhoto({
  url,
  onReady,
  className = "max-h-64 w-full rounded-[4px] border-4 border-black object-cover",
}: {
  url: string;
  /** Fired once the photo is on screen — or once we've given up, so the step never hangs. */
  onReady?: () => void;
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const readyFired = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Callers pass an inline arrow (`onImageReady={() => …}`), so its identity
  // changes every render. Hold it in a ref — a dependency on it would restart
  // the load on every parent render and never settle.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const fireReady = useCallback(() => {
    if (readyFired.current) return;
    readyFired.current = true;
    onReadyRef.current?.();
  }, []);

  // Reset during render, not in an effect: ref callbacks run before effects, so
  // an effect-based reset would overwrite a "loaded" that the freshly mounted
  // <img> had already reported and leave the spinner up over a good photo.
  const lastUrl = useRef<string | null>(null);
  if (lastUrl.current !== url) {
    lastUrl.current = url;
    readyFired.current = false;
    setAttempt(0);
    setStatus("loading");
  }

  useEffect(() => {
    if (!url) fireReady();
  }, [url, fireReady]);

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  const markLoaded = useCallback(() => {
    setStatus("loaded");
    fireReady();
  }, [fireReady]);

  // A failed <img> never retries on its own — a changed src is what forces a
  // fresh request, so each attempt appends a cache-busting param.
  const handleError = useCallback(() => {
    if (attempt < MAX_AUTO_RETRIES) {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => setAttempt((a) => a + 1), 800 * (attempt + 1));
      return;
    }
    setStatus("failed");
    // Give the learner their timer back rather than trapping them on a paused step.
    fireReady();
  }, [attempt, fireReady]);

  /**
   * A cached or already-decoded image finishes before React attaches onLoad,
   * and that event never comes back — which is how a perfectly good photo sat
   * behind "Loading photo..." no matter how often the learner refreshed. So
   * inspect the element itself the moment it mounts instead of only listening.
   */
  const attachImg = useCallback(
    (node: HTMLImageElement | null) => {
      if (!node || !node.complete) return;
      if (node.naturalWidth > 0) markLoaded();
      else handleError();
    },
    [markLoaded, handleError],
  );

  if (!url) {
    return (
      <div className="rounded-[4px] border-4 border-dashed border-black bg-neutral-50 p-6 text-center text-sm font-bold text-neutral-600">
        Photo not provided / ไม่มีรูป
      </div>
    );
  }

  const src = attempt === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}retry=${attempt}`;

  if (status === "failed") {
    return (
      <div className="space-y-3 rounded-[4px] border-4 border-black bg-amber-50 p-5 text-center">
        <p className="text-sm font-black text-neutral-900">โหลดรูปไม่สำเร็จ</p>
        <p className="text-xs font-bold text-neutral-600">
          เน็ตอาจสะดุดชั่วคราว กดปุ่มด้านล่างเพื่อโหลดรูปอีกครั้ง
          <br />
          The photo could not load. Tap below to try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("loading");
            setAttempt((a) => a + 1);
          }}
          className="border-2 border-black bg-ep-blue px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#000]"
        >
          โหลดรูปใหม่ / Reload photo
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {status === "loading" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[4px] border-4 border-black bg-white/90">
          <div className="flex items-center gap-2 text-sm font-black text-[#004AAD]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#004AAD] border-t-transparent" />
            Loading photo...
          </div>
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic admin/storage URLs */}
      <img
        key={src}
        ref={attachImg}
        src={src}
        alt=""
        onLoad={markLoaded}
        onError={handleError}
        className={className}
      />
    </div>
  );
}
