"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAdminToast } from "@/components/admin/AdminToast";

function parseNotebookSyncPayload(payload: unknown): {
  source: string;
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  fullBodyEn: string;
  fullBodyTh: string;
  userNote: string;
} {
  if (!payload || typeof payload !== "object") {
    return {
      source: "—",
      titleEn: "",
      titleTh: "",
      bodyEn: "",
      bodyTh: "",
      fullBodyEn: "",
      fullBodyTh: "",
      userNote: "",
    };
  }
  const p = payload as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  return {
    source: str("source") || "—",
    titleEn: str("titleEn"),
    titleTh: str("titleTh"),
    bodyEn: str("bodyEn"),
    bodyTh: str("bodyTh"),
    fullBodyEn: str("fullBodyEn"),
    fullBodyTh: str("fullBodyTh"),
    userNote: str("userNote"),
  };
}

export function AdminUserNotebookFullView() {
  const params = useParams();
  const userId = params.userId as string;
  const { push } = useAdminToast();

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("fail");
      const j = (await res.json()) as Record<string, unknown>;
      setData(j);
    } catch {
      push({
        type: "error",
        titleEn: "Could not load notebook.",
        titleTh: "โหลดสมุดไม่สำเร็จ",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const profile = (data?.profile ?? {}) as Record<string, unknown>;
  const email = String(profile.email ?? "");
  const name = profile.full_name != null ? String(profile.full_name) : "";
  const notebookEntries = (data?.notebookEntries ?? []) as Record<string, unknown>[];
  const notebookSync = (data?.notebookSync ?? []) as Record<string, unknown>[];

  if (loading) {
    return (
      <div className="text-sm font-bold text-neutral-600">
        Loading notebook… / กำลังโหลด…
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-red-700">
        Could not load this user&apos;s notebook. / โหลดไม่ได้
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Admin — full notebook
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#004AAD]">Notebook (full)</h1>
          <p className="mt-2 ep-stat text-sm text-neutral-800">
            {email}
            {name ? ` · ${name}` : ""}
          </p>
          <p className="mt-1 font-mono text-[11px] text-neutral-500">{userId}</p>
        </div>
        <Link
          href={`/admin/subscriptions/${userId}`}
          className="inline-flex items-center rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-[#004AAD] shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          ← Member detail / กลับหน้าสมาชิก
        </Link>
      </header>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-lg font-black">Cloud sync cards / การ์ดซิงค์</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Full text for each saved card (no 500-character preview limit). / ข้อความเต็มทุกการ์ด
        </p>
        {notebookSync.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No synced cards. / ยังไม่มี</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {notebookSync.map((row) => {
              const p = parseNotebookSyncPayload(row.payload);
              const mainEn = p.fullBodyEn.trim() || p.bodyEn;
              const mainTh = p.fullBodyTh.trim() || p.bodyTh;
              const hasShortVsFull =
                (p.fullBodyEn && p.bodyEn && p.fullBodyEn !== p.bodyEn) ||
                (p.fullBodyTh && p.bodyTh && p.fullBodyTh !== p.bodyTh);

              return (
                <li
                  key={String(row.id)}
                  className="border-2 border-neutral-200 bg-neutral-50/80 p-4"
                >
                  <div className="flex flex-wrap gap-2 text-[10px] text-neutral-600">
                    <span className="font-mono">
                      {row.updated_at
                        ? new Date(row.updated_at as string).toLocaleString()
                        : "—"}
                    </span>
                    <span className="font-mono text-[#004AAD]">{p.source}</span>
                    <span className="font-mono text-neutral-400">
                      id {String(row.client_entry_id ?? row.id).slice(0, 8)}…
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-neutral-900">
                    {[p.titleEn, p.titleTh].filter(Boolean).join(" / ") || "—"}
                  </p>
                  {hasShortVsFull ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">
                        Preview (list) / ตัวอย่างสั้น
                      </p>
                      {p.bodyEn ? (
                        <pre className="whitespace-pre-wrap break-words text-xs text-neutral-800">
                          {p.bodyEn}
                        </pre>
                      ) : null}
                      {p.bodyTh ? (
                        <pre className="whitespace-pre-wrap break-words text-xs text-neutral-800">
                          {p.bodyTh}
                        </pre>
                      ) : null}
                      <p className="pt-2 text-[10px] font-bold uppercase text-neutral-500">
                        Full / เต็ม
                      </p>
                    </div>
                  ) : null}
                  {mainEn ? (
                    <pre className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-900">
                      {mainEn}
                    </pre>
                  ) : null}
                  {mainTh ? (
                    <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-900">
                      {mainTh}
                    </pre>
                  ) : null}
                  {!mainEn && !mainTh && !hasShortVsFull ? (
                    <p className="mt-2 text-xs text-neutral-500">(empty body)</p>
                  ) : null}
                  {p.userNote.trim() ? (
                    <div className="mt-3 border-t border-neutral-200 pt-3">
                      <p className="text-[10px] font-bold uppercase text-neutral-500">
                        Learner note / โน้ตผู้เรียน
                      </p>
                      <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-neutral-800">
                        {p.userNote}
                      </pre>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-lg font-black">Legacy notebook_entries / แบบเก่า</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Plain rows from older “Save to Notebook”. Full content, not truncated. / ข้อความเต็ม
        </p>
        {notebookEntries.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">None. / ไม่มี</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {notebookEntries.map((row) => (
              <li
                key={String(row.id)}
                className="border-2 border-neutral-200 bg-neutral-50/80 p-3"
              >
                <div className="flex flex-wrap gap-2 text-[10px] text-neutral-600">
                  <span>
                    {row.created_at
                      ? new Date(row.created_at as string).toLocaleString()
                      : "—"}
                  </span>
                  <span className="font-semibold">{String(row.type ?? "—")}</span>
                  <span className="font-mono">
                    {String(row.source_exercise_type ?? "")}{" "}
                    {row.source_skill ? `· ${String(row.source_skill)}` : ""}
                  </span>
                  {row.score_at_save != null ? (
                    <span>score {String(row.score_at_save)}</span>
                  ) : null}
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-900">
                  {String(row.content ?? "")}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
