"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const baseLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/profile", label: "Profile" },
  { href: "/student-overview", label: "Student Overview" },
  { href: "/notebook", label: "Notebook" },
  { href: "/practice", label: "Practice" },
  { href: "/study-plan", label: "Calendar" },
  { href: "/mock-test/start", label: "Mock test" },
] as const;

const ITEM = {
  primary:
    "rounded-sm border-2 border-black bg-ep-yellow px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] sm:text-sm",
  plain: "rounded-sm border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-neutral-900 sm:text-sm",
  underline:
    "rounded-sm border-2 border-transparent px-3 py-1.5 text-xs font-semibold text-neutral-800 underline decoration-2 underline-offset-2 hover:border-black hover:bg-ep-yellow/40 sm:text-sm",
  dark: "rounded-sm border-2 border-black bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white sm:text-sm",
} as const;

function Hamburger({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
      aria-expanded={open}
      className="ep-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-2 border-black bg-white"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        {open ? (
          <>
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </>
        ) : (
          <>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </>
        )}
      </svg>
    </button>
  );
}

export function MainNav() {
  const pathname = usePathname();
  const { isAdmin, previewEligible, loading } = useEffectiveTier();
  const showPracticeNav = !loading;
  const navLinks = useMemo(
    () => (showPracticeNav ? baseLinks : baseLinks.filter((l) => l.href !== "/practice")),
    [showPracticeNav],
  );
  /** DB `role === admin` can lag the server session check; include `previewEligible` so real admins always see Admin. */
  const showAdminLinks = isAdmin || previewEligible === true;
  const [homeHasSession, setHomeHasSession] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  // ─── Home (landing) shortcuts ───────────────────────────────────────────────
  if (pathname === "/") {
    type HItem = { href: string; label: string; kind: keyof typeof ITEM };
    const items: HItem[] = [
      ...(showPracticeNav ? [{ href: "/practice", label: "Practice", kind: "primary" as const }] : []),
      { href: "/about", label: "About", kind: "plain" },
      { href: "/?fastTrack=1", label: "Fast Track VIP", kind: "primary" },
      ...(homeHasSession
        ? [{ href: "/profile", label: "Profile", kind: "plain" as const }]
        : [
            { href: "/login", label: "Sign in", kind: "plain" as const },
            { href: "/signup", label: "Create account", kind: "underline" as const },
          ]),
      ...(showAdminLinks ? [{ href: "/admin", label: "Admin", kind: "dark" as const }] : []),
    ];
    return (
      <nav
        className="sticky top-0 z-[1001] border-b-4 border-black bg-white shadow-[0_2px_0_0_rgba(0,0,0,0.08)]"
        aria-label="Site shortcuts"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:justify-end sm:gap-3 sm:px-6">
          {/* mobile: brand + hamburger */}
          <Link
            href="/"
            className="font-black tracking-tight text-ep-blue sm:hidden"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            EP
          </Link>
          {/* desktop: inline shortcuts */}
          <div className="hidden items-center gap-3 sm:flex">
            {items.map((it) => (
              <Link key={it.href + it.label} href={it.href} className={`ep-interactive shrink-0 ${ITEM[it.kind]}`}>
                {it.label}
              </Link>
            ))}
            {homeHasSession ? <LogoutButton /> : null}
          </div>
          <div className="sm:hidden">
            <Hamburger open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
          </div>
        </div>
        {menuOpen ? (
          <div className="flex flex-col gap-2 border-t-2 border-black px-3 py-3 sm:hidden">
            {items.map((it) => (
              <Link
                key={it.href + it.label}
                href={it.href}
                className={`ep-interactive block w-full text-center ${ITEM[it.kind]}`}
              >
                {it.label}
              </Link>
            ))}
            {homeHasSession ? <div className="pt-1">{<LogoutButton />}</div> : null}
          </div>
        ) : null}
      </nav>
    );
  }

  // ─── App nav (all other pages) ──────────────────────────────────────────────
  return (
    <nav className="sticky top-0 z-[1001] border-b-[3px] border-black bg-white" aria-label="Primary">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          className="font-bold tracking-tight text-ep-blue"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          ENGLISH PLAN
        </Link>
        {/* desktop links */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                l.href === "/practice"
                  ? "ep-interactive rounded-sm border-2 border-black bg-ep-yellow px-3 py-1.5 text-sm font-bold text-black shadow-[2px_2px_0_0_#000] hover:bg-[#ffe033]"
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
          {pathname.startsWith("/admin") ? null : <LogoutButton />}
        </div>
        {/* mobile hamburger */}
        <div className="md:hidden">
          <Hamburger open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
        </div>
      </div>
      {menuOpen ? (
        <div className="flex flex-col gap-1.5 border-t-2 border-black px-4 py-3 md:hidden">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                l.href === "/practice"
                  ? "ep-interactive block w-full rounded-sm border-2 border-black bg-ep-yellow px-3 py-2 text-center text-sm font-bold text-black shadow-[2px_2px_0_0_#000]"
                  : "ep-interactive block w-full rounded-sm border-2 border-neutral-200 px-3 py-2 text-center text-sm font-semibold text-neutral-800 hover:border-black"
              }
            >
              {l.label}
            </Link>
          ))}
          {showAdminLinks ? (
            <Link
              href="/admin"
              className="ep-interactive block w-full rounded-sm border-2 border-black bg-neutral-900 px-3 py-2 text-center text-sm font-semibold text-white"
            >
              Admin
            </Link>
          ) : null}
          {pathname.startsWith("/admin") ? null : <div className="pt-1">{<LogoutButton />}</div>}
        </div>
      ) : null}
    </nav>
  );
}
