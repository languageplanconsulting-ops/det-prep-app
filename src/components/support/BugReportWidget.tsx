"use client";

import { usePathname } from "next/navigation";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IntroModalShell } from "@/components/practice/IntroModalShell";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type SubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; reportId: string };

export function BugReportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const hidden = pathname.startsWith("/admin");

  // Draggable FAB position (persisted). null = default bottom-right anchor.
  const FAB_STORAGE_KEY = "ep-bug-fab-pos";
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // Restore saved position on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FAB_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { x: number; y: number };
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        setFabPos(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Keep the button on-screen if the viewport resizes.
  useEffect(() => {
    if (!fabPos) return;
    const clamp = () => {
      const el = fabRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      setFabPos((prev) =>
        prev
          ? {
              x: Math.min(Math.max(prev.x, 8), Math.max(8, maxX)),
              y: Math.min(Math.max(prev.y, 8), Math.max(8, maxY)),
            }
          : prev,
      );
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [fabPos]);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const el = fabRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    const el = fabRef.current;
    const width = el?.offsetWidth ?? 48;
    const height = el?.offsetHeight ?? 48;
    const nextX = Math.min(Math.max(drag.originX + dx, 8), window.innerWidth - width - 8);
    const nextY = Math.min(Math.max(drag.originY + dy, 8), window.innerHeight - height - 8);
    setFabPos({ x: nextX, y: nextY });
  }, []);

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const wasDrag = drag.moved;
    dragState.current = null;
    try {
      fabRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (wasDrag) {
      // Persist the new resting position and swallow the click that follows.
      setFabPos((prev) => {
        if (prev) {
          try {
            window.localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(prev));
          } catch {
            /* ignore */
          }
        }
        return prev;
      });
    } else {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (user.email) setEmail(user.email);
      const fullName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : "";
      if (fullName) setName(fullName);
    };

    void loadProfile();
  }, [hidden]);

  useEffect(() => {
    if (!open) return;
    setSubmitState({ kind: "idle" });
  }, [open]);

  const canSubmit = useMemo(
    () =>
      email.trim().includes("@") &&
      line.trim().length > 0 &&
      subject.trim().length > 0 &&
      details.trim().length > 0 &&
      submitState.kind !== "loading",
    [details, email, line, subject, submitState.kind],
  );

  if (hidden) return null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitState({ kind: "loading" });

    const response = await fetch("/api/bug-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email,
        name,
        line,
        pageUrl: typeof window !== "undefined" ? window.location.href : pathname,
        subject,
        details,
      }),
    });

    const json = (await response.json().catch(() => null)) as
      | { error?: string; reportId?: string }
      | null;

    if (!response.ok || !json?.reportId) {
      setSubmitState({
        kind: "error",
        message: json?.error ?? "Could not send your report. Please try again.",
      });
      return;
    }

    setSubmitState({ kind: "success", reportId: json.reportId });
  }

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label="รายงานปัญหา (ลากเพื่อย้ายได้)"
        className={`ep-bug-fab fixed z-[95] flex h-9 w-9 touch-none select-none items-center justify-center gap-1.5 rounded-full border-2 border-black bg-[#FFCC00] p-0 font-sans text-[13px] font-bold text-black shadow-[3px_3px_0_0_#111] transition hover:-translate-y-0.5 hover:bg-[#ffd633] active:cursor-grabbing sm:h-auto sm:w-auto sm:px-3.5 sm:py-2 ${
          fabPos ? "cursor-grab" : "bottom-5 right-5 cursor-grab"
        }`}
        style={fabPos ? { left: fabPos.x, top: fabPos.y } : undefined}
      >
        <span aria-hidden="true" className="text-sm leading-none">
          💬
        </span>
        <span className="hidden sm:inline">รายงานปัญหา</span>
      </button>

      <IntroModalShell
        open={open}
        onDismiss={() => setOpen(false)}
        labelledBy="bug-report-support"
        title={
          <>
            Report a bug
            <br />
            <span className="not-italic text-[#004aad]">แจ้งปัญหากับทีมงาน</span>
          </>
        }
        badge={
          <span className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Support chat
          </span>
        }
        maxWidthClassName="max-w-3xl"
        backgroundColor="#f8fafc"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-neutral-500">
              We’ll email you back after review or when it is fixed.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[4px] border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit || submitState.kind === "success"}
                className="rounded-[4px] border-4 border-black bg-[#004aad] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[4px_4px_0_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitState.kind === "loading"
                  ? "Sending..."
                  : submitState.kind === "success"
                    ? "Sent"
                    : "Send report"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="max-w-[88%] rounded-[22px] border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#111]">
              <p className="text-sm font-semibold leading-6 text-neutral-800">
                Tell us what went wrong. Please leave your <strong>email</strong> and <strong>LINE</strong> so the
                admin team can follow up properly.
              </p>
            </div>
            <div className="ml-auto max-w-[80%] rounded-[22px] border-2 border-black bg-[#e8f3ff] px-4 py-3">
              <p className="text-sm font-semibold leading-6 text-neutral-700">
                We’ll save your report, email the admin team, and email you again whenever there is a reply or fix update.
              </p>
            </div>
          </div>

          {submitState.kind === "success" ? (
            <div className="rounded-[24px] border-2 border-black bg-[#ecfdf3] p-5 shadow-[4px_4px_0_0_#111]">
              <p className="text-lg font-black text-neutral-900">Report sent successfully</p>
              <p className="mt-2 text-sm font-semibold text-neutral-700">
                Your report ID is <strong>{submitState.reportId}</strong>. We also sent a confirmation email to you.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-black text-neutral-900">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-[16px] border-2 border-black bg-white px-4 py-3 font-semibold outline-none"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block text-sm font-black text-neutral-900">
                LINE contact
                <input
                  type="text"
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  className="mt-2 w-full rounded-[16px] border-2 border-black bg-white px-4 py-3 font-semibold outline-none"
                  placeholder="LINE ID or contact name"
                />
              </label>

              <label className="block text-sm font-black text-neutral-900 md:col-span-2">
                Your name (optional)
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-[16px] border-2 border-black bg-white px-4 py-3 font-semibold outline-none"
                  placeholder="Your name"
                />
              </label>

              <label className="block text-sm font-black text-neutral-900 md:col-span-2">
                Short subject
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-2 w-full rounded-[16px] border-2 border-black bg-white px-4 py-3 font-semibold outline-none"
                  placeholder="Example: Interactive speaking froze on submit"
                />
              </label>

              <label className="block text-sm font-black text-neutral-900 md:col-span-2">
                What happened?
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={7}
                  className="mt-2 w-full rounded-[18px] border-2 border-black bg-white px-4 py-3 font-semibold outline-none"
                  placeholder="Describe the issue, what page you were on, and what you expected to happen."
                />
              </label>

              {submitState.kind === "error" ? (
                <div className="rounded-[18px] border-2 border-[#8a1c1c] bg-[#fff1f1] px-4 py-3 text-sm font-bold text-[#8a1c1c] md:col-span-2">
                  {submitState.message}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </IntroModalShell>
    </>
  );
}
