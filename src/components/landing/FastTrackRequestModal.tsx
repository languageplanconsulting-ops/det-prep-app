"use client";

/**
 * Fast Track VIP-request modal, shared by the home landing pages.
 * Students of the Duolingo Fast Track course submit the email they will sign in
 * with; the team verifies enrollment and emails VIP access + a password.
 */

import Link from "next/link";
import { useCallback, useState } from "react";

export function FastTrackRequestModal({ onClose }: { onClose: () => void }) {
  const [ftEmail, setFtEmail] = useState("");
  const [ftName, setFtName] = useState("");
  const [ftLoading, setFtLoading] = useState(false);
  const [ftErr, setFtErr] = useState<string | null>(null);
  const [ftMsg, setFtMsg] = useState<string | null>(null);
  const [ftLinkedEmail, setFtLinkedEmail] = useState<string | null>(null);

  const submitFastTrack = useCallback(async () => {
    setFtLoading(true);
    setFtErr(null);
    setFtMsg(null);
    setFtLinkedEmail(null);
    try {
      const res = await fetch("/api/enrollment/fast-track-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ftEmail.trim(), fullName: ftName.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setFtErr(data.error ?? "Something went wrong.");
        return;
      }
      if (ftEmail.trim().includes("@")) setFtLinkedEmail(ftEmail.trim().toLowerCase());
      setFtMsg(
        data.message ??
          "Request received. After we verify your course enrollment, you will get an email from English Plan with VIP access and your password.",
      );
    } catch {
      setFtErr("Network error. Try again.");
    } finally {
      setFtLoading(false);
    }
  }, [ftEmail, ftName]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="fast-track-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="fast-track-title" className="text-xl font-bold text-gray-900">
            Duolingo Fast Track course / นักเรียนคอร์ส Fast Track
          </h2>
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          If you are a student from the <strong>Duolingo Fast Track</strong> course, type the email you
          will use to sign in. We will email our team to verify your enrollment. After approval, you will
          receive an email from <strong>English Plan</strong> with <strong>VIP access for 6 months</strong>{" "}
          (counted from the date you submit this form) and your <strong>personal password</strong>.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          หากคุณเป็นนักเรียนจากคอร์ส <strong>Duolingo Fast Track</strong> ให้ใส่อีเมลที่จะใช้ล็อกอิน
          เราจะส่งเรื่องให้ทีมตรวจสอบ หลังอนุมัติ คุณจะได้รับอีเมลจาก <strong>English Plan</strong> พร้อมสิทธิ์{" "}
          <strong>VIP 6 เดือน</strong> (นับจากวันที่ส่งคำขอ) และ<strong>รหัสผ่านส่วนตัว</strong>
        </p>
        <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-gray-700">
          Email
          <input
            type="email"
            autoComplete="email"
            value={ftEmail}
            onChange={(e) => setFtEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-gray-700">
          Full name / ชื่อ-นามสกุล
          <input
            type="text"
            autoComplete="name"
            value={ftName}
            onChange={(e) => setFtName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        {ftErr ? <p className="mt-4 text-sm font-bold text-red-700">{ftErr}</p> : null}
        {ftMsg ? (
          <div className="mt-4 rounded-lg border-2 border-green-800/30 bg-green-50 p-3">
            <p className="text-sm font-bold text-green-900">{ftMsg}</p>
            {ftLinkedEmail ? (
              <p className="mt-2 text-sm text-green-900">
                <span className="font-bold uppercase tracking-wide text-green-800">
                  Linked email / อีเมลที่ผูกไว้
                </span>
                <br />
                <span className="break-all font-mono text-base font-black text-gray-900">{ftLinkedEmail}</span>
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          disabled={ftLoading || !ftEmail.trim().includes("@")}
          onClick={() => void submitFastTrack()}
          className="mt-6 w-full rounded-xl bg-[#004AAD] py-4 text-sm font-bold uppercase text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {ftLoading ? "…" : "Send request / ส่งคำขอ"}
        </button>
        {!ftMsg ? (
          <p className="mt-4 text-center text-xs text-gray-500">
            After you receive our approval email, use{" "}
            <Link href="/login" className="font-bold text-[#004AAD] underline">
              Sign in
            </Link>{" "}
            with Google or email + password. / หลังได้รับอีเมลอนุมัติแล้วค่อยเข้า Sign in
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-gray-500">
            Watch your inbox for an email from English Plan. / รออีเมลจาก English Plan
          </p>
        )}
      </div>
    </div>
  );
}
