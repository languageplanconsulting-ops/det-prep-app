import { type ReactNode, useEffect } from "react";

import { preloadMobileSfx } from "../lib/exam-sfx-mobile";

export function UiFeedbackProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void preloadMobileSfx();
  }, []);

  return children;
}
