"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CAMPUS_VOCAB_SCENARIOS, CAMPUS_VOCAB_TOPICS, type CampusVocabTopicId } from "@/lib/campus-vocab";
import { fetchSeenKeys, itemKey } from "@/lib/lesson-seen";
import { useLessonUserId } from "@/lib/lesson-user";
import { getLessonProgress, loadLessonProgress, unitKey, type UnitScores } from "@/lib/lessons-progress";

const TOPIC = "campus-vocab";
const TIER = "all";

export function CampusVocabHub() {
  const uid = useLessonUserId();
  const [scores, setScores] = useState<UnitScores>(getLessonProgress());
  const [seenKeys, setSeenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    loadLessonProgress(uid).then((s) => alive && setScores({ ...s }));
    fetchSeenKeys(uid).then((k) => alive && setSeenKeys(k));
    return () => {
      alive = false;
    };
  }, [uid]);

  const total = CAMPUS_VOCAB_SCENARIOS.length;
  const done = CAMPUS_VOCAB_SCENARIOS.reduce((n, _s, i) => n + (unitKey(TOPIC, TIER, i) in scores ? 1 : 0), 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  const byTopic = CAMPUS_VOCAB_TOPICS.map((meta) => ({
    meta,
    items: CAMPUS_VOCAB_SCENARIOS.map((s, i) => ({ s, i })).filter(({ s }) => s.topic === meta.id),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
      <div className="flex items-center gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#FFCC00]">บทเรียน · คำศัพท์ในมหาวิทยาลัย</p>
          <p className="mt-2 text-xl font-black leading-tight">เดินทางผ่านโลกของมหาวิทยาลัย</p>
          <p className="mt-2 text-xs text-slate-300">
            {CAMPUS_VOCAB_TOPICS.length} หมวดใหญ่ · {total} สถานการณ์ · แต่ละเรื่องมี 3 คำศัพท์เฉพาะให้เติม
          </p>
        </div>
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-[#FFCC00] bg-white/5 text-center">
          <span className="text-lg font-black">{pct}%</span>
          <span className="text-[9px] font-bold text-slate-300">{done}/{total}</span>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-indigo-50 p-3.5 text-xs font-semibold leading-relaxed text-indigo-900">
        รู้ไหม? ใน Duolingo English Test การจำ &ldquo;สถานการณ์&rdquo; และคำศัพท์เฉพาะทางมหาวิทยาลัยได้ คือ 50% ของทางไปสู่คะแนนที่ดีแล้ว —
        เพราะโจทย์ส่วนใหญ่วนเวียนอยู่กับชีวิตในรั้วมหาวิทยาลัยนี่แหละ ฝึกจำไปทีละหมวดกันเลย
      </p>

      {byTopic.map(({ meta, items }) => {
        if (!items.length) return null;
        const topicDone = items.filter(({ i }) => unitKey(TOPIC, TIER, i) in scores).length;
        return (
          <div key={meta.id} className="mt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#FFCC00] bg-white text-xl shadow-sm">
                {meta.icon}
              </div>
              <div className="flex-1">
                <p className="text-base font-black text-slate-900">{meta.th}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{meta.en}</p>
              </div>
              <span className="text-xs font-black text-[#004AAD]">{topicDone}/{items.length}</span>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              {items.map(({ s, i }, idx) => {
                const isDone = unitKey(TOPIC, TIER, i) in scores;
                const isSeen = seenKeys.has(itemKey("campusvocab", s.id));
                const card = (
                  <div className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm ${isSeen ? "opacity-55" : ""}`}>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${
                        isDone || isSeen ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {isDone || isSeen ? "✓" : idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-2 text-[12.5px] font-bold leading-snug text-slate-800">{s.scenarioEn}</p>
                      <p className="mt-1 text-[11px] font-black capitalize text-[#004AAD]">{s.blanks.map((b) => b.answer).join(" · ")}</p>
                      {isSeen ? (
                        <span className="mt-1.5 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">ฝึกแล้ว</span>
                      ) : null}
                    </div>
                    {isSeen ? null : <span className="text-xl font-bold text-slate-300">›</span>}
                  </div>
                );
                return isSeen ? (
                  <div key={s.id} className="cursor-not-allowed">{card}</div>
                ) : (
                  <Link key={s.id} href={`/practice/lessons/campus-vocab/${s.id}`}>{card}</Link>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="mt-8 text-center text-xs text-slate-400">แต่ละเรื่องมี 3 คำศัพท์ · เติมถูกครบเพื่อผ่านเรื่องนั้น</p>
    </div>
  );
}
