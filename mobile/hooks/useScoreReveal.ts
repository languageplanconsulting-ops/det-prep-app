import { useEffect } from "react";

import { sfxReveal } from "../lib/exam-sfx-mobile";

/** Play a lush score-reveal sting when entering a report screen. */
export function useScoreReveal(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => sfxReveal(), 280);
    return () => clearTimeout(t);
  }, [active]);
}
