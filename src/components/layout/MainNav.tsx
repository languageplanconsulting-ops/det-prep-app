"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const baseLinks = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/student-overview", label: "Student Overview" },
  { href: "/notebook", label: "Notebook" },
  { href: "/practice", label: "Practice" },
  { href: "/mock-test/start", label: "Mock test" },
] as const;

export function MainNav() {
  const pathname = usePathname();
  const {
    isAdmin,
    previewEligible,
    realTier,
    vipGrantedByCourse,
    hasStripeSubscription,
    loading,
  } = useEffectiveTier();
  const showPracticeNav =
    !loading &&
    (isAdmin ||
      previewEligible === true ||
      realTier !== "free" ||
      vipGrantedByCourse ||
      hasStripeSubscription);

  const navLinks = useMemo(
    () =>
      showPracticeNav
        ? baseLinks
        : baseLinks.filter((l) => l.href !== "/practice"),
    [showPracticeNav],
  );
  /** DB `role === admin'` can lag behind the server session check; include `previewEligible` so real admins (and code-login admins) always see Admin. VIP-only users should never get `previewEligible` from `/api/admin/session`. */
  const showAdminLinks = isAdmin || previewEligible === true;
  const [homeHasSession, setHomeHasSession] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setHomeHasSession(false);
      return;
    }
    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      setHomeHasSession(!!data.session);
    };
    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  if (pathname === "/") {
    return (
      <nav
        className="sticky top-0 z-[1001] flex flex-wrap items-center justify-center gap-2 border-b-4 border-black bg-white px-3 py-2.5 shadow-[0_2px_0_0_rgba(0,0,0,0.08)] sm:justify-end sm:gap-3 sm:px-6"
        aria-label="Site shortcuts"
      >
        {showPracticeNav ? (
          <Link
            href="/practice"
            className="ep-interactive shrink-0 rounded-sm border-2 border-black bg-ep-yellow px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] sm:text-sm"
          >
            Practice
          </Link>
        ) : null}
        <Link
          href="/?fastTrack=1"
          className="ep-interactive shrink-0 rounded-sm border-2 border-black bg-ep-yellow/90 px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] sm:text-sm"
        >
          Fast Track VIP
        </Link>
        {homeHasSession ? (
          <>
            <Link
              href="/profile"
              className="ep-interactive shrink-0 rounded-sm border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-neutral-900 sm:text-sm"
            >
              Profile
            </Link>
            <div className="shrink-0">
              <LogoutButton />
            </div>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="ep-interactive shrink-0 rounded-sm border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-neutral-900 sm:text-sm"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="ep-interactive shrink-0 rounded-sm border-2 border-transparent px-3 py-1.5 text-xs font-semibold text-neutral-800 underline decoration-2 underline-offset-2 hover:border-black hover:bg-ep-yellow/40 sm:text-sm"
            >
              Create account
            </Link>
          </>
        )}
        {showAdminLinks ? (
          <Link
            href="/admin"
            className="ep-interactive shrink-0 rounded-sm border-2 border-black bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white sm:text-sm"
          >
            Admin
          </Link>
        ) : null}
      </nav>
    );
  }

  return (
    <nav
      className="flex flex-wrap items-center gap-2 border-b-[3px] border-black bg-white px-4 py-3"
      aria-label="Primary"
    >
      <Link
        href="/"
        className="mr-2 font-bold tracking-tight text-ep-blue"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        ENGLISH PLAN
      </Link>
      {navLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={
            l.href === "/practice"
              ? "ep-interactive relative z-[1] rounded-sm border-2 border-black bg-ep-yellow px-3 py-1.5 text-sm font-bold text-black shadow-[2px_2px_0_0_#000] hover:bg-[#ffe033] hover:shadow-[3px_3px_0_0_#000]"
              : "ep-interactive rounded-sm border-2 border-transparent px-2 py-1 text-sm font-semibold text-neutral-800 hover:border-black hover:bg-ep-yellow/40"
          }
        >
          {l.label}
        </Link>
      ))}
      {showAdminLinks ? (
        <Link
          href="/admin"
          className="ep-interactive rounded-sm border-2 border-black bg-neutral-900 px-2 py-1 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Admin
        </Link>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center">
        {pathname.startsWith("/admin") ? null : <LogoutButton />}
      </div>
    </nav>
  );
}
