"use client";

import { useEffect, useState } from "react";

import { MockTestSessionClient } from "@/components/mock-test/MockTestSessionClient";
import { MockTestV2SessionClient } from "@/components/mock-test/MockTestV2SessionClient";

export function MockTestSessionRouter({ sessionId }: { sessionId: string }) {
  const [engine, setEngine] = useState<1 | 2 | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/mock-test/session/${sessionId}`, {
        credentials: "same-origin",
      });
      const j = (await res.json()) as { session?: { engine_version?: number } };
      const v = j.session?.engine_version ?? 1;
      setEngine(v === 2 ? 2 : 1);
    })();
  }, [sessionId]);

  if (engine === null) {
    return <p className="p-8 text-center font-bold text-neutral-600">กำลังโหลด…</p>;
  }
  if (engine === 2) {
    return <MockTestV2SessionClient sessionId={sessionId} />;
  }
  return <MockTestSessionClient sessionId={sessionId} />;
}
