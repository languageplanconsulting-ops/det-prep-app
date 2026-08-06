"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * BrowserRecommendationBanner — nudges DESKTOP Safari/Firefox learners toward Chrome.
 *
 * Those two browsers are where our bugs actually land: they cap localStorage at 5MB (the
 * content bank needs 5.14MB) and their speech-to-text is missing or quits early. Both are
 * handled in code now, so this is a "you'll have a better time" nudge, never a blocker.
 *
 * Deliberately NOT shown on iPhone/iPad: every iOS browser is WebKit underneath, so
 * "install Chrome" would change nothing there and would just be bad advice.
 */
const DISMISS_KEY = "browser-recommendation-dismissed-v1";

/** Don't interrupt the public landing / auth screens. */
const HIDDEN_PATHS = new Set(["/", "/login", "/signup", "/reset-password", "/forgot-password"]);

const EP_BLUE = "#004AAD";

type Browser = "safari" | "firefox" | null;

/** Desktop Safari or Firefox only — iOS is WebKit for every browser, so it's excluded. */
function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return null;
  if (/FxiOS|CriOS|EdgiOS/i.test(ua)) return null;
  if (/Firefox\//i.test(ua)) return "firefox";
  if (/Safari\//i.test(ua) && !/Chrome|Chromium|Edg\/|OPR\//i.test(ua)) return "safari";
  return null;
}

export function BrowserRecommendationBanner() {
  const pathname = usePathname();
  const [browser, setBrowser] = useState<Browser>(null);

  useEffect(() => {
    if (HIDDEN_PATHS.has(pathname)) return;
    const found = detectBrowser();
    if (!found) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* storage blocked — showing it once per page is fine */
    }
    setBrowser(found);
  }, [pathname]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setBrowser(null);
  };

  if (!browser) return null;

  const name = browser === "firefox" ? "Firefox" : "Safari";

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <span className="hidden text-lg sm:inline" aria-hidden>
          💡
        </span>
        <p className="flex-1 text-[12.5px] leading-5 text-amber-900">
          คุณกำลังใช้ <strong>{name}</strong> อยู่นะคะ — เว็บของเราใช้งานได้ปกติค่ะ แต่เพื่อ
          ประสบการณ์ที่ลื่นไหลที่สุด โดยเฉพาะ <strong>พาร์ทพูดและการอัดเสียง</strong>{" "}
          แนะนำให้เปิดด้วย{" "}
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline underline-offset-2"
            style={{ color: EP_BLUE }}
          >
            Google Chrome
          </a>{" "}
          ค่ะ
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิดคำแนะนำ"
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
