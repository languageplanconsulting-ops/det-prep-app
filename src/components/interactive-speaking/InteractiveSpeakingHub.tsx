"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SoftHubHeader } from "@/components/practice/SoftHubHeader";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";
import {
  loadAllInteractiveSpeakingReports,
  loadInteractiveSpeakingScenarios,
} from "@/lib/interactive-speaking-storage";
import type {
  InteractiveSpeakingAttemptReport,
  InteractiveSpeakingScenario,
} from "@/types/interactive-speaking";

function formatAttemptDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function ScenarioThumb({ scenario }: { scenario: InteractiveSpeakingScenario }) {
  const raw = scenario.thumbnail?.trim();
  const boxClass =
    "flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden border-4 border-black bg-[linear-gradient(145deg,#e8f0ff_0%,#fff8e6_100%)] shadow-[4px_4px_0_0_#000]";
  if (raw && (raw.startsWith("http") || raw.startsWith("/") || raw.startsWith("data:"))) {
    return (
      <div className={boxClass}>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-provided or data URLs */}
        <img src={raw} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  const label = raw && raw.length <= 4 ? raw : "🎤";
  return (
    <div className={boxClass} aria-hidden>
      <span className="text-4xl leading-none">{label}</span>
    </div>
  );
}

function buildLatestByScenario(): Map<string, InteractiveSpeakingAttemptReport> {
  const map = new Map<string, InteractiveSpeakingAttemptReport>();
  for (const r of loadAllInteractiveSpeakingReports()) {
    const cur = map.get(r.scenarioId);
    const ta = Date.parse(r.submittedAt);
    const tb = cur ? Date.parse(cur.submittedAt) : -Infinity;
    if (!cur || (Number.isFinite(ta) && Number.isFinite(tb) && ta >= tb)) {
      map.set(r.scenarioId, r);
    }
  }
  return map;
}

export function InteractiveSpeakingHub() {
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;
  const [scenarios, setScenarios] = useState<InteractiveSpeakingScenario[]>([]);
  const [reportTick, setReportTick] = useState(0);

  useEffect(() => {
    const load = () => setScenarios(loadInteractiveSpeakingScenarios());
    load();
    window.addEventListener("storage", load);
    window.addEventListener("ep-interactive-speaking-storage", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("ep-interactive-speaking-storage", load);
    };
  }, []);

  useEffect(() => {
    const bump = () => setReportTick((n) => n + 1);
    window.addEventListener("ep-interactive-speaking-report-saved", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("ep-interactive-speaking-report-saved", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const latestByScenario = useMemo(() => buildLatestByScenario(), [reportTick, scenarios]);

  if (soft) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
          <Link href="/practice" className="text-sm font-semibold text-[#004AAD] hover:underline">
            ← กลับหน้าฝึก
          </Link>
          <SoftHubHeader
            color="violet"
            icon="🗨️"
            eyebrow="Production · Interactive speaking"
            title="การสนทนาแบบโต้ตอบ"
            subtitle="Interactive speaking"
            tip={
              <>
                เห็นแค่คำถามแรก ที่เหลือระบบถามตามที่คุณพูด ·{" "}
                <strong>ฟัง 1 ครั้ง → เตรียม 10 วิ → พูด ~35 วิ</strong> · ตอบตรงคำถามแล้วต่อยอด 1 ประโยคครับ
              </>
            }
          />
          <div className="space-y-3">
            {scenarios.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                ยังไม่มี scenario
              </p>
            ) : (
              scenarios.map((s) => {
                const latest = latestByScenario.get(s.id);
                const needsRedeem = latest != null && latest.score160 < 160;
                const practiceHref = `/practice/production/interactive-speaking/${s.id}`;
                const redeemHref = `${practiceHref}?redeem=1`;
                const reportHref = latest
                  ? `/practice/production/interactive-speaking/report/${latest.attemptId}`
                  : null;
                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#004AAD] hover:shadow-[0_8px_22px_rgba(0,74,173,0.08)] sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
                      <ScenarioThumb scenario={s} />
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-slate-900">{s.titleEn}</h2>
                        <p className="mt-0.5 text-sm text-slate-500">{s.titleTh}</p>
                        {latest ? (
                          <p className="mt-2 text-xs">
                            <span className="font-bold text-emerald-600">
                              คะแนนล่าสุด {latest.score160}/160
                            </span>{" "}
                            · <span className="text-slate-500">{formatAttemptDate(latest.submittedAt)}</span>
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">ยังไม่เคยทำ</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={practiceHref}
                            className="rounded-xl bg-[#004AAD] px-4 py-2 text-sm font-bold text-[#FFCC00] hover:opacity-90"
                          >
                            ฝึก
                          </Link>
                          {reportHref ? (
                            <Link
                              href={reportHref}
                              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                            >
                              ดูผล
                            </Link>
                          ) : null}
                          {needsRedeem ? (
                            <Link
                              href={redeemHref}
                              className="rounded-xl bg-[#FFCC00] px-4 py-2 text-sm font-bold text-[#004AAD] hover:opacity-90"
                            >
                              ทำใหม่
                            </Link>
                          ) : latest ? (
                            <Link
                              href={redeemHref}
                              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
                            >
                              ทำอีกครั้ง
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${LANDING_PAGE_GRID_BG}`}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <Link
          href="/practice"
          className="mb-6 inline-flex text-sm font-bold text-ep-blue underline-offset-4 hover:underline"
        >
          ← Practice hub
        </Link>

        <header className="border-4 border-black bg-white p-6 shadow-[12px_12px_0_0_#000] sm:p-8">
          <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
            Production
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
            Interactive speaking
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral-600">
            Six short turns per scenario. You only see the first question from your teacher — the app
            asks follow-ups based on what you say. Listen once, prepare 10 seconds, then speak (max
            ~35 seconds per turn).
          </p>
        </header>

        <div className="mt-10 space-y-4">
          {scenarios.length === 0 ? (
            <p className="text-sm font-bold text-neutral-600">
              No scenarios yet. Ask your admin to upload JSON from the admin panel.
            </p>
          ) : (
            scenarios.map((s) => {
              const latest = latestByScenario.get(s.id);
              const needsRedeem = latest != null && latest.score160 < 160;
              const practiceHref = `/practice/production/interactive-speaking/${s.id}`;
              const redeemHref = `${practiceHref}?redeem=1`;
              const reportHref = latest
                ? `/practice/production/interactive-speaking/report/${latest.attemptId}`
                : null;

              return (
                <div
                  key={s.id}
                  className="border-4 border-black bg-white shadow-[8px_8px_0_0_#000] transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
                    <ScenarioThumb scenario={s} />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-black text-neutral-900 sm:text-xl">{s.titleEn}</h2>
                      <p className="mt-1 text-sm text-neutral-600">{s.titleTh}</p>
                      {latest ? (
                        <div className="mt-3 rounded-sm border-2 border-neutral-200 bg-neutral-50 px-3 py-2 ep-stat text-xs text-neutral-700">
                          <span className="font-bold text-ep-blue">Last score:</span>{" "}
                          <span className="tabular-nums font-black text-neutral-900">
                            {latest.score160}
                          </span>
                          /160 ·{" "}
                          <span className="text-neutral-600">{formatAttemptDate(latest.submittedAt)}</span>
                        </div>
                      ) : (
                        <p className="mt-3 ep-stat text-xs text-neutral-500">No attempts yet.</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={practiceHref}
                          className="inline-flex border-2 border-black bg-ep-blue px-3 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_#000]"
                        >
                          Practice
                        </Link>
                        {reportHref ? (
                          <Link
                            href={reportHref}
                            className="inline-flex border-2 border-black bg-white px-3 py-2 text-sm font-bold text-neutral-900 shadow-[3px_3px_0_0_#000]"
                          >
                            View report
                          </Link>
                        ) : null}
                        {needsRedeem ? (
                          <Link
                            href={redeemHref}
                            className="ep-redeem-pulse inline-flex border-2 border-black bg-ep-yellow px-3 py-2 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[3px_3px_0_0_#000]"
                          >
                            Redeem
                          </Link>
                        ) : latest ? (
                          <Link
                            href={redeemHref}
                            className="inline-flex border-2 border-dashed border-neutral-400 bg-white px-3 py-2 text-sm font-bold text-neutral-700"
                          >
                            Practice again
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
