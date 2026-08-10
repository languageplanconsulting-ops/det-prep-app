import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPricingContent } from "@/components/pricing/AdminPricingContent";
import { isReturningCustomer } from "@/lib/returning-customer";
import { absoluteUrl } from "@/lib/site-metadata";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

// Packages are no longer sold to the public — access comes with the course. This page
// survives only as the renew / extend / buy-add-ons desk for people who already bought
// a package; everyone else is sent to the course. Kept noindex for that reason.
const TITLE = "แพ็กเกจของคุณ | English Plan";
const DESCRIPTION = "ต่ออายุแพ็กเกจและซื้อเครดิตเพิ่ม สำหรับผู้ที่ซื้อแพ็กเกจไว้แล้ว";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  alternates: {
    canonical: absoluteUrl("/pricing"),
  },
};

export default async function PricingPage() {
  // Resolved before the redirect: redirect() signals by throwing, so it must never
  // run inside the try block.
  let allowed = false;
  let signedIn = false;
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
    // The cookie session is the same one /api/me treats as authoritative for tier,
    // so trusting it here keeps the paywall and this gate in agreement.
    allowed = !!user && (await isReturningCustomer(user.id));
  } catch (error) {
    console.error("[pricing] customer gate failed", error);
    allowed = false;
  }

  // Anonymous visitors and users who never bought never see a price again.
  // /course is login-gated by middleware, so signed-out visitors go to the public
  // course pitch on the landing page instead of bouncing through /login.
  if (!allowed) {
    redirect(signedIn ? "/course" : "/#course");
  }

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
