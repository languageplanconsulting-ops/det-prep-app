"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ClozeStage } from "@/components/course/ClozeStage";
import { useAdminGateOverride } from "@/hooks/useAdminGateOverride";
import { Frame } from "@/components/course/InlineExercise";
import { speakLesson } from "@/lib/lesson-audio";
import {
  endingIssueHintTh,
  pronunciationPassed,
  pronunciationScore,
  PRONUNCIATION_PASS,
} from "@/lib/pronunciation-match";
import {
  getSpeechRecognitionCtor,
  handleSpeechRecognitionError,
} from "@/lib/speech-recognition-helpers";

/**
 * The shape any guided speaking drill supplies. Both banks feed this: the
 * listen-and-speak lecture (4-move essay) and the photo lectures (3-4 sentence
 * pattern answer), so one runner serves both.
 */
export type SpeakDrillItem = {
  id: string;
  topic: string;
  topicTh: string;
  essay: string;
  essayTh: string;
  moves: { label: string; en: string }[];
  /** Pick-the-right-form gaps (depict/depicts/depicted, …). */
  choices?: { phrase: string; options: string[] }[];
  /** Lecture words this script uses, shown before the rebuild starts. */
  vocabUsed?: { w: string; th: string }[];
};

type Stage = "build" | "thai" | "listen" | "record";

/**
 * The guided "listen and speak" drill, straight off the lecture of the same name.
 *
 * Four stages, in the order the lecture teaches them:
 *   1. build  — rebuild the model answer, every third word missing
 *   2. thai   — 100% reached: the point is that you could say this in Thai first,
 *               so the Thai translation appears and they read the script aloud
 *   3. listen — hear the model read back (Deepgram TTS)
 *   4. record — say it themselves; passes on word match AND intact -s/-es/-ed
 *
 * The gate is deliberately the app's existing pronunciation gate rather than a
 * softer one: swallowing the ending is the exact habit this drill exists to break.
 */
export function ListenSpeakBuilder({
  item,
  titleTh,
  onDone,
  onCancel,
  hasNext = true,
}: {
  item: SpeakDrillItem;
  titleTh: string;
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
  hasNext?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("build");
  const [progress, setProgress] = useState<string | undefined>(undefined);

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={stage === "build" ? progress : undefined}>
      <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <p className="text-[12px] font-black text-slate-700">{item.topic}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{item.topicTh}</p>
        {item.vocabUsed && item.vocabUsed.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.vocabUsed.map((v) => (
              <span key={v.w} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] ring-1 ring-slate-200">
                <span className="font-bold text-slate-800">{v.w}</span>
                <span className="text-slate-400"> · {v.th}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {stage === "build" && (
        <ClozeStage
          essay={item.essay}
          seed={item.id}
          choices={item.choices}
          onProgress={(f, t) => setProgress(`${f}/${t}`)}
          onComplete={() => setStage("thai")}
        />
      )}

      {stage === "thai" && (
        <ThaiStage item={item} onContinue={() => setStage("listen")} />
      )}

      {stage === "listen" && (
        <ListenStage item={item} onContinue={() => setStage("record")} />
      )}

      {stage === "record" && (
        <RecordStage
          item={item}
          hasNext={hasNext}
          onPassed={() => onDone(1, 1)}
        />
      )}
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Thai first, then read it aloud                                          */
/* -------------------------------------------------------------------------- */

function ThaiStage({ item, onContinue }: { item: SpeakDrillItem; onContinue: () => void }) {
  const [readAloud, setReadAloud] = useState(false);
  const override = useAdminGateOverride();

  return (
    <div>
      <div className="mt-3 rounded-2xl bg-[#FFF9E6] p-3.5 ring-1 ring-[#FFCC00]">
        <p className="text-[13px] font-black text-[#8A6A00]">🔑 กุญแจสำคัญของคำตอบที่ดี</p>
        <p className="mt-1 text-[12px] leading-6 text-slate-700">
          ถ้าคุณ<strong>ตอบคำถามนี้เป็นภาษาไทยไม่ได้</strong> ก็จะตอบเป็นภาษาอังกฤษไม่ได้เหมือนกัน —
          ไอเดียต้องมาก่อนภาษาเสมอ ลองอ่านคำแปลไทยด้านล่างให้เข้าใจก่อน แล้วค่อยพูดตามสคริปต์
        </p>
      </div>

      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">สคริปต์เต็ม</p>
      <p className="mt-1 rounded-xl bg-white p-3.5 text-[14px] leading-7 text-slate-800 ring-1 ring-slate-300">
        {item.essay}
      </p>

      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">คำแปลไทย</p>
      <p className="mt-1 rounded-xl bg-slate-50 p-3.5 text-[13px] leading-7 text-slate-700 ring-1 ring-slate-200">
        {item.essayTh}
      </p>

      {/* Which move each sentence is — the lecture's skeleton, made visible. */}
      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
        แต่ละประโยคทำหน้าที่อะไร
      </p>
      <div className="mt-1 space-y-1.5">
        {item.moves.map((mv, i) => (
          <div key={i} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#004AAD]">
              {mv.label}
            </p>
            <p className="mt-0.5 text-[12px] leading-6 text-slate-700">{mv.en}</p>
          </div>
        ))}
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <input
          type="checkbox"
          checked={readAloud}
          onChange={(e) => setReadAloud(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#004AAD]"
        />
        <span className="text-[12px] font-bold text-slate-700">
          อ่านออกเสียงตามสคริปต์นี้จบแล้ว 1 รอบ
          <span className="block text-[11px] font-normal text-slate-500">
            อ่านออกเสียงจริง ๆ ก่อน อย่าเพิ่งฟังเฉลย — ปากต้องชินก่อนหู
          </span>
        </span>
      </label>

      <button
        type="button"
        disabled={!readAloud && !override.enabled}
        onClick={onContinue}
        className="mt-3 w-full rounded-full bg-[#004AAD] py-3 text-sm font-black text-white disabled:opacity-30"
      >
        อ่านแล้ว → ไปฟังเสียงต้นแบบ 🔊
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Hear the model                                                          */
/* -------------------------------------------------------------------------- */

function ListenStage({ item, onContinue }: { item: SpeakDrillItem; onContinue: () => void }) {
  const [plays, setPlays] = useState(0);
  const override = useAdminGateOverride();
  const playerRef = useRef<ReturnType<typeof speakLesson> | null>(null);

  useEffect(() => {
    const player = speakLesson(item.essay);
    playerRef.current = player;
    return () => player.remove();
  }, [item.essay]);

  return (
    <div>
      <p className="mt-3 rounded-xl bg-violet-50 p-3 text-[12px] text-violet-900 ring-1 ring-violet-200">
        ฟังเสียงต้นแบบอย่างน้อย 1 ครั้ง — ฟังให้ทันเสียงท้ายคำ <strong>-s / -es / -ed</strong> ด้วย
      </p>

      <p className="mt-3 rounded-xl bg-white p-3.5 text-[14px] leading-7 text-slate-800 ring-1 ring-slate-300">
        {item.essay}
      </p>

      <button
        type="button"
        onClick={() => {
          playerRef.current?.play();
          setPlays((p) => p + 1);
        }}
        className="mt-3 w-full rounded-full bg-violet-600 py-3 text-sm font-black text-white"
      >
        🔊 {plays === 0 ? "ฟังเสียงต้นแบบ" : `ฟังอีกครั้ง (ฟังไปแล้ว ${plays} ครั้ง)`}
      </button>

      <button
        type="button"
        disabled={plays === 0 && !override.enabled}
        onClick={onContinue}
        className="mt-2 w-full rounded-full bg-[#004AAD] py-3 text-sm font-black text-white disabled:opacity-30"
      >
        ฟังแล้ว → ไปอัดเสียงของเรา 🎤
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Say it back                                                             */
/* -------------------------------------------------------------------------- */

function RecordStage({
  item,
  hasNext,
  onPassed,
}: {
  item: SpeakDrillItem;
  hasNext: boolean;
  onPassed: () => void;
}) {
  const override = useAdminGateOverride();
  const [spoken, setSpoken] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalRef = useRef("");
  const retriesRef = useRef(0);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const stop = useCallback(() => {
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "เบราว์เซอร์นี้อาจไม่รองรับการถอดเสียงสด (โดยเฉพาะ iPad Safari) — พิมพ์สิ่งที่พูดลงช่องด้านล่างแทนได้",
      );
      return;
    }
    setSpeechError(null);
    setChecked(false);
    finalRef.current = "";
    setSpoken("");
    retriesRef.current = 0;

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      retriesRef.current = 0;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const piece = r[0]?.transcript ?? "";
        if (r.isFinal) finalRef.current = `${finalRef.current} ${piece}`.trim();
        else interim += piece;
      }
      const fin = finalRef.current;
      setSpoken(`${fin}${interim ? (fin ? " " : "") + interim : ""}`.trim());
    };

    rec.onerror = (ev: SpeechRecognitionErrorEventLike) => {
      handleSpeechRecognitionError(ev, {
        listeningRef,
        networkRetriesRef: retriesRef,
        setSpeechError,
        setListening,
      });
    };

    rec.onend = () => {
      if (!listeningRef.current || recRef.current !== rec) return;
      window.setTimeout(() => {
        if (!listeningRef.current || recRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      }, 200);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeechError("เปิดไมโครโฟนไม่ได้ — พิมพ์สิ่งที่พูดลงช่องด้านล่างแทนได้");
      setListening(false);
    }
  }, []);

  const result = spoken.trim() ? pronunciationScore(item.essay, spoken) : null;
  const passed = result ? pronunciationPassed(result) : false;

  return (
    <div>
      <p className="mt-3 rounded-xl bg-rose-50 p-3 text-[12px] text-rose-900 ring-1 ring-rose-200">
        🎤 พูดสคริปต์นี้ให้ครบ — ต้องตรงกัน {PRONUNCIATION_PASS}% ขึ้นไป
        <strong> และห้ามตกเสียงท้ายคำ -s / -es / -ed</strong>
      </p>

      <p className="mt-3 rounded-xl bg-white p-3.5 text-[14px] leading-7 text-slate-800 ring-1 ring-slate-300">
        {item.essay}
      </p>

      <div className="mt-3 flex gap-2">
        {!listening ? (
          <button
            type="button"
            onClick={start}
            className="flex-1 rounded-full bg-rose-600 py-3 text-sm font-black text-white"
          >
            🎤 เริ่มอัดเสียง
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="flex-1 rounded-full bg-slate-900 py-3 text-sm font-black text-white"
          >
            ⏹ หยุดอัด
          </button>
        )}
      </div>
      {speechError && <p className="mt-2 text-[11px] font-bold text-rose-600">{speechError}</p>}

      <textarea
        value={spoken}
        onChange={(e) => {
          setSpoken(e.target.value);
          setChecked(false);
        }}
        rows={3}
        placeholder="ผลถอดเสียงจะขึ้นตรงนี้…"
        className="mt-2 w-full rounded-xl bg-slate-50 p-3 text-[13px] text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-slate-400"
      />

      {!checked ? (
        <>
        <button
          type="button"
          disabled={!spoken.trim()}
          onClick={() => {
            stop();
            setChecked(true);
          }}
          className="mt-3 w-full rounded-full bg-[#004AAD] py-3 text-sm font-black text-white disabled:opacity-30"
        >
          ตรวจการออกเสียง
        </button>
        {override.enabled && (
          <button
            type="button"
            onClick={onPassed}
            className="mt-2 w-full rounded-full bg-amber-500 py-2.5 text-[12px] font-black text-white"
          >
            ⚡ ข้ามการอัดเสียง (admin)
          </button>
        )}
        </>
      ) : (
        <div className="mt-3">
          <div
            className={`rounded-2xl p-3.5 ring-1 ${
              passed
                ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                : "bg-rose-50 text-rose-900 ring-rose-200"
            }`}
          >
            <p className="text-sm font-black">
              {passed ? "ผ่านแล้ว! 🎉" : "ยังไม่ผ่าน — ลองใหม่อีกครั้ง"}
            </p>
            <p className="mt-1 text-[12px]">
              ตรงกัน {result?.pct ?? 0}% (ต้องได้ {PRONUNCIATION_PASS}% ขึ้นไป)
            </p>
            {result && result.endingIssues.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {result.endingIssues.map((iss, i) => (
                  <li key={i} className="text-[11px] font-bold">
                    · {endingIssueHintTh(iss)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {passed || override.enabled ? (
            <button
              type="button"
              onClick={onPassed}
              className={`mt-3 w-full rounded-full py-3 text-sm font-black text-white ${
                hasNext ? "bg-[#004AAD]" : "bg-emerald-600"
              }`}
            >
              {hasNext ? "แบบฝึกถัดไป →" : "จบของวันนี้ 🎉"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setChecked(false);
                setSpoken("");
                finalRef.current = "";
              }}
              className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-black text-white"
            >
              อัดใหม่อีกครั้ง
            </button>
          )}
        </div>
      )}
    </div>
  );
}
