"use client";

import Link from "next/link";

import { AdminSimpleLogout } from "@/components/admin/AdminSimpleLogout";
import { LogoutButton } from "@/components/auth/LogoutButton";

/**
 * Sticky bar on all /admin/* routes: account sign-out (Supabase) + admin code sign-out.
 */
export function AdminShellBar() {
  return (
    <div
      className="sticky top-14 z-[1000] flex flex-wrap items-center gap-x-3 gap-y-2 border-b-4 border-black bg-neutral-100 px-4 py-2.5 sm:top-[3.25rem]"
      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
    >
      <Link
        href="/admin"
        className="rounded-[4px] border-2 border-black bg-white px-3 py-1 text-xs font-bold text-neutral-900 shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/30"
      >
        Admin home
      </Link>
      <Link
        href="/admin/study-activity"
        className="rounded-[4px] border-2 border-black bg-white px-3 py-1 text-xs font-bold text-neutral-900 shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/30"
      >
        Study activity
      </Link>
      <Link
        href="/admin/executive"
        className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-3 py-1 text-xs font-bold text-neutral-900 shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/70"
      >
        Executive dashboard
      </Link>
      <Link
        href="/practice"
        className="text-xs font-semibold text-neutral-700 underline decoration-2 underline-offset-2 hover:text-neutral-900"
      >
        Back to app
      </Link>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <LogoutButton />
        <AdminSimpleLogout />
      </div>
    </div>
  );
}
