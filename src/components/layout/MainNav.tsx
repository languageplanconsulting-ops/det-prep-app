"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";

const links = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/student-overview", label: "Student Overview" },
  { href: "/notebook", label: "Notebook" },
  { href: "/practice", label: "Practice" },
  { href: "/mock-test/start", label: "Mock test" },
  { href: "/admin", label: "Admin" },
] as const;

export function MainNav() {
  const pathname = usePathname();
  if (pathname === "/") {
    return (
      <nav
        className="sticky top-0 z-[1001] flex flex-wrap items-center justify-center gap-2 border-b-4 border-black bg-white px-3 py-2.5 shadow-[0_2px_0_0_rgba(0,0,0,0.08)] sm:justify-end sm:gap-3 sm:px-6"
        aria-label="Site shortcuts"
      >
        <Link
          href="/practice"
          className="ep-interactive shrink-0 rounded-sm border-2 border-black bg-ep-yellow px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] sm:text-sm"
        >
          Practice
        </Link>
        <Link
          href="/?fastTrack=1"
          className="ep-interactive shrink-0 rounded-sm border-2 border-black bg-ep-yellow/90 px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0_0_#000] sm:text-sm"
        >
          Fast Track VIP
        </Link>
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
        <Link
          href="/login#admin-login"
          className="ep-interactive shrink-0 rounded-sm border-2 border-black bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white sm:text-sm"
        >
          Admin code login
        </Link>
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
      {links.map((l) => (
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
      <div className="ml-auto flex shrink-0 items-center">
        <LogoutButton />
      </div>
    </nav>
  );
}
