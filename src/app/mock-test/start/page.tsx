import { Suspense } from "react";

import { MockTestStartClient } from "@/components/mock-test/MockTestStartClient";

export default function MockTestStartPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-neutral-600">Loading...</div>}>
      <MockTestStartClient />
    </Suspense>
  );
}
