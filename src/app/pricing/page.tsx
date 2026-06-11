"use client";

import { Suspense } from "react";

import { AdminPricingContent } from "@/components/pricing/AdminPricingContent";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-ep-blue" />
            กำลังโหลด…
          </div>
        </main>
      }
    >
      <AdminPricingContent />
    </Suspense>
  );
}
