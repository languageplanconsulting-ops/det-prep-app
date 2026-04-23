"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[95] rounded-full border-4 border-black bg-[#FFCC00] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black shadow-[6px_6px_0_0_#111] transition hover:-translate-y-0.5 hover:bg-[#ffd633]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        รายงานปัญหา
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
