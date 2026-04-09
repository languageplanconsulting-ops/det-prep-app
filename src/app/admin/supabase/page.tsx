"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  clearRuntimeSupabaseConfig,
  getRuntimeSupabaseAnonKey,
  getRuntimeSupabaseUrl,
  hasRuntimeSupabaseConfig,
  setRuntimeSupabaseConfig,
} from "@/lib/supabase-runtime-config";
import { resetBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function AdminSupabaseConfigPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setUrl(getRuntimeSupabaseUrl());
    setAnonKey(getRuntimeSupabaseAnonKey());
  }, []);

  const save = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/setup/supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, anon: anonKey }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Could not save.");
        setBusy(false);
        return;
      }
      setRuntimeSupabaseConfig(url, anonKey);
      resetBrowserSupabaseClient();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    const res = await fetch("/api/setup/supabase", { method: "DELETE" });
    if (!res.ok) {
      setErr("Could not clear cookies.");
      return;
    }
    clearRuntimeSupabaseConfig();
    resetBrowserSupabaseClient();
    setUrl("");
    setAnonKey("");
    setSaved(false);
    setErr("");
    router.refresh();
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link
        href="/admin"
        className="text-sm font-bold text-ep-blue hover:underline"
      >
        ← Admin home
      </Link>

      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Admin only
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          Supabase URL &amp; anon key (browser)
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Saves Supabase URL + anon in cookies (and local storage) so the app and middleware can use
          your project without changing <code className="ep-stat text-xs">NEXT_PUBLIC_*</code> in the
          deployment.
        </p>
        <p className="mt-3 text-xs text-neutral-600">
          Get them from Supabase → <strong>Project Settings → API</strong>: Project URL and
          the <code className="ep-stat">anon</code> <code className="ep-stat">public</code>{" "}
          key.
        </p>
      </header>

      <BrutalPanel title="Override (this device)">
        <label className="block text-sm font-bold">
          Project URL
          <input
            type="url"
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co"
            className="mt-2 w-full border-2 border-black bg-white px-3 py-3 ep-stat text-sm"
          />
        </label>
        <label className="mt-4 block text-sm font-bold">
          Anon (public) key
          <input
            type="password"
            autoComplete="off"
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
            className="mt-2 w-full border-2 border-black bg-white px-3 py-3 ep-stat text-sm"
          />
        </label>
        {err ? (
          <p className="mt-3 text-sm font-bold text-red-800">{err}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="border-2 border-black bg-ep-blue px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save in this browser"}
          </button>
          <button
            type="button"
            onClick={() => void clear()}
            className="border-2 border-black bg-white px-4 py-3 text-sm font-bold"
          >
            Remove override
          </button>
        </div>
        {saved ? (
          <p className="mt-3 text-sm font-bold text-green-800">
            Saved. Reload other tabs if they were already open.
          </p>
        ) : null}
        {hasRuntimeSupabaseConfig() && !saved ? (
          <p className="mt-3 text-xs text-neutral-600">
            A browser override is active. Build-time env is ignored for the client when both
            fields are set here.
          </p>
        ) : null}
      </BrutalPanel>

      <BrutalPanel title="Limits" eyebrow="Read this">
        <ul className="list-disc space-y-2 pl-5 text-xs text-neutral-700">
          <li>
            Saving here updates <strong>cookies</strong> so middleware and route handlers
            can use the same project. Add <code className="ep-stat">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            to <code className="ep-stat">.env.local</code> on the server for webhooks and
            profile upserts.
          </li>
          <li>
            Do not share your anon key in chat or screenshots if you treat the project as
            sensitive; rotate it in Supabase if it leaks.
          </li>
        </ul>
      </BrutalPanel>
    </main>
  );
}
