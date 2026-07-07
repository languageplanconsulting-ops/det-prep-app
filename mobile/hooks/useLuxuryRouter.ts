import { type Href, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";

import { sfxNavigate, sfxTap } from "../lib/exam-sfx-mobile";
import { LUXURY_NAV_DELAY_MS } from "../lib/luxury-motion";

export function useLuxuryRouter() {
  const router = useRouter();
  const busy = useRef(false);

  const push = useCallback(
    (href: Href) => {
      if (busy.current) return;
      busy.current = true;
      sfxNavigate();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => {
        router.push(href);
        setTimeout(() => {
          busy.current = false;
        }, LUXURY_NAV_DELAY_MS);
      }, LUXURY_NAV_DELAY_MS);
    },
    [router],
  );

  const back = useCallback(() => {
    sfxTap();
    void Haptics.selectionAsync();
    setTimeout(() => router.back(), 90);
  }, [router]);

  const replace = useCallback(
    (href: Href) => {
      sfxNavigate();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(() => router.replace(href), LUXURY_NAV_DELAY_MS);
    },
    [router],
  );

  return { push, back, replace, router };
}
