"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  EqualizerBars,
  MascotTip,
  OptionPill,
  PrimaryButton,
  SoftCard,
} from "@/components/mini-diagnosis/steps/ui";
import { sfxCorrect } from "@/lib/exam-sfx";

type MissingWord = {
  correctWord: string;
  prefix_length?: number;
  clue?: string;
  explanationThai?: string;
};

type FitbSentence = { text: string; missingWords: MissingWord[] };

type McqQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

type Scenario =
  | {
      id: number;
      kind: "mcq";
      title_en?: string;
      title_th?: string;
      passage: string;
      audio_url?: string;
      questions: McqQuestion[];
    }
  | {
      id: number;
      kind: "fitb";
      title_en?: string;
      title_th?: string;
      passage: string;
      audio_url?: string;
      sentences: FitbSentence[];
    }
  | {
      id: number;
      kind: "fitb_with_summary";
      title_en?: string;
      title_th?: string;
      passage: string;
      audio_url?: string;
      sentences: FitbSentence[];
      summary: McqQuestion;
    };

type Content = {
  instruction?: string;
  instruction_th?: string;
  pre_break_seconds?: number;
  pre_break_message_th?: string;
  pre_break_message_en?: string;
  max_plays?: number;
  tts_provider?: string;
  scenarios: Scenario[];
};

const norm = (v: string) => v.trim().toLowerCase();

function combineFitb(typed: string, mw: MissingWord | undefined): string {
  const cleaned = (typed ?? "").trim();
  if (!mw) return cleaned;
  const correct = (mw.correctWord ?? "").trim();
  if (!cleaned) return "";
  const lowered = cleaned.toLowerCase();
  if (lowered === correct.toLowerCase()) return correct.toLowerCase();
  const prefixLen = Math.max(0, Number(mw.prefix_length ?? 0));
  const prefix = correct.slice(0, prefixLen);
  return `${prefix}${cleaned}`.toLowerCase();
}

function flattenAnswers(
  scenarios: Scenario[],
  selectedByScenario: Record<number, string[]>,
): { selected: string[]; correct: string[]; total: number } {
  const selected: string[] = [];
  const correct: string[] = [];
  scenarios.forEach((sc) => {
    const picks = selectedByScenario[sc.id] ?? [];
    if (sc.kind === "mcq") {
      sc.questions.forEach((q, i) => {
        selected.push(norm(picks[i] ?? ""));
        correct.push(norm(q.correctAnswer));
      });
    } else if (sc.kind === "fitb") {
      sc.sentences.forEach((s, i) => {
        selected.push(combineFitb(picks[i] ?? "", s.missingWords[0]));
        correct.push(norm(s.missingWords[0]?.correctWord ?? ""));
      });
    } else {
      sc.sentences.forEach((s, i) => {
        selected.push(combineFitb(picks[i] ?? "", s.missingWords[0]));
        correct.push(norm(s.missingWords[0]?.correctWord ?? ""));
      });
      const summaryIdx = sc.sentences.length;
      selected.push(norm(picks[summaryIdx] ?? ""));
      correct.push(norm(sc.summary.correctAnswer));
    }
  });
  return { selected, correct, total: selected.length };
}

/**
 * Mini-diagnosis interactive listening, rebuilt:
 * - hidden <audio> with a custom play button (native controls could replay
 *   without counting — the old play-limit bypass bug),
 * - equalizer animation while playing, plays-left dots,
 * - mascot-guided pre-listening break with countdown ring,
 * - soft mobile-first scenario cards.
 * Submit payload identical to the previous component.
 */
export function MiniListeningStep({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (answer: unknown) => void;
}) {
  const c = content as unknown as Content;
  const scenarios = useMemo(() => (Array.isArray(c.scenarios) ? c.scenarios : []), [c.scenarios]);
  const maxPlays = Math.max(1, Number(c.max_plays ?? 3) || 3);
  const breakSec = Math.max(0, Number(c.pre_break_seconds ?? 20) || 20);
  const ttsProvider = String(c.tts_provider ?? "deepgram");

  const [phase, setPhase] = useState<"break" | "scenario">(breakSec > 0 ? "break" : "scenario");
  const [breakRemaining, setBreakRemaining] = useState(breakSec);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [playsUsed, setPlaysUsed] = useState<Record<number, number>>({});
  const [audioBySc, setAudioBySc] = useState<Record<number, string>>({});
  const [loadingTts, setLoadingTts] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [picksByScenario, setPicksByScenario] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (phase !== "break") return;
    if (breakRemaining <= 0) {
      setPhase("scenario");
      return;
    }
    const t = setTimeout(() => setBreakRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, breakRemaining]);

  const currentScenario = scenarios[scenarioIdx];
  const playsForCurrent = currentScenario ? (playsUsed[currentScenario.id] ?? 0) : 0;
  const playsLeft = maxPlays - playsForCurrent;

  const ensureAudio = async (sc: Scenario): Promise<string | null> => {
    if (audioBySc[sc.id]) return audioBySc[sc.id] ?? null;
    if (sc.audio_url) {
      setAudioBySc((prev) => ({ ...prev, [sc.id]: sc.audio_url ?? "" }));
      return sc.audio_url;
    }
    setLoadingTts(true);
    setTtsError(null);
    try {
      const res = await fetch("/api/speech-synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sc.passage, provider: ttsProvider }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        audioBase64?: string;
        mimeType?: string;
        error?: string;
      };
      if (!res.ok || !json.audioBase64) {
        setTtsError("เสียงยังไม่พร้อม กดฟังอีกครั้งได้เลย");
        return null;
      }
      const mime = json.mimeType ?? "audio/mpeg";
      const url = `data:${mime};base64,${json.audioBase64}`;
      setAudioBySc((prev) => ({ ...prev, [sc.id]: url }));
      return url;
    } catch {
      setTtsError("เชื่อมต่อเสียงไม่สำเร็จ กดฟังอีกครั้งได้เลย");
      return null;
    } finally {
      setLoadingTts(false);
    }
  };

  const handlePlay = async () => {
    if (!currentScenario || playing || loadingTts) return;
    if (playsForCurrent >= maxPlays) return;
    const url = await ensureAudio(currentScenario);
    if (!url || !audioRef.current) return;
    setPlaysUsed((prev) => ({
      ...prev,
      [currentScenario.id]: (prev[currentScenario.id] ?? 0) + 1,
    }));
    const el = audioRef.current;
    el.src = url;
    el.currentTime = 0;
    setPlaying(true);
    void el.play().catch(() => setPlaying(false));
  };

  const setPick = (qIdx: number, value: string) => {
    if (!currentScenario) return;
    setPicksByScenario((prev) => {
      const list = [...(prev[currentScenario.id] ?? [])];
      list[qIdx] = value;
      return { ...prev, [currentScenario.id]: list };
    });
  };

  const scenarioItemCount = (sc: Scenario): number => {
    if (sc.kind === "mcq") return sc.questions.length;
    if (sc.kind === "fitb") return sc.sentences.length;
    return sc.sentences.length + 1;
  };

  const answeredForCurrent = (): number => {
    if (!currentScenario) return 0;
    const picks = picksByScenario[currentScenario.id] ?? [];
    let n = 0;
    for (let i = 0; i < scenarioItemCount(currentScenario); i += 1) {
      if (picks[i] && picks[i]!.trim()) n += 1;
    }
    return n;
  };

  const isCurrentScenarioComplete = (): boolean => {
    if (currentScenario == null) return false;
    // Safety net: a scenario with no answerable items must never hard-block.
    if (scenarioItemCount(currentScenario) === 0) return true;
    return answeredForCurrent() >= scenarioItemCount(currentScenario);
  };

  const goNext = () => {
    if (!currentScenario) return;
    if (scenarioIdx < scenarios.length - 1) {
      sfxCorrect();
      setScenarioIdx((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const flat = flattenAnswers(scenarios, picksByScenario);
    const correctCount = flat.selected.reduce(
      (acc, val, i) => acc + (val === flat.correct[i] ? 1 : 0),
      0,
    );
    onSubmit({
      selected_answers: flat.selected,
      correct_answers: flat.correct,
      averageScore0To100: flat.total > 0 ? (correctCount / flat.total) * 100 : 0,
      detail: {
        total: flat.total,
        correct: correctCount,
        scenarios: scenarios.map((sc) => ({
          id: sc.id,
          kind: sc.kind,
          plays_used: playsUsed[sc.id] ?? 0,
        })),
        maxPlays,
      },
    });
  };

  /* ---------- pre-listening break ---------- */
  if (phase === "break") {
    const pct = breakSec > 0 ? (breakSec - breakRemaining) / breakSec : 1;
    const R = 44;
    const CIRC = 2 * Math.PI * R;
    return (
      <div className="space-y-4">
        <MascotTip
          size="lg"
          text={c.pre_break_message_th ?? "พักสายตาแป๊บนึง เตรียมหูฟังให้พร้อม เดี๋ยวจะได้ฟังบทสนทนา 3 สถานการณ์ 🎧"}
          sub={c.pre_break_message_en ?? "Get your headphones ready — 3 short campus scenarios are coming."}
        />
        <SoftCard className="text-center">
          <div className="relative mx-auto h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="#e7e9f0" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke="#004AAD"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - pct)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-3xl font-bold text-ep-blue">{breakRemaining}</span>
            </div>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600">เริ่มข้อสอบการฟังใน…</p>
          <button
            type="button"
            onClick={() => setPhase("scenario")}
            className="mt-4 rounded-xl border-2 border-ep-blue px-4 py-2 text-sm font-bold text-ep-blue transition hover:bg-blue-50 active:scale-[0.98]"
          >
            พร้อมแล้ว เริ่มเลย →
          </button>
        </SoftCard>
      </div>
    );
  }

  if (!currentScenario) {
    return (
      <SoftCard className="text-center">
        <p className="text-sm font-bold text-rose-600">ไม่พบเนื้อหาสถานการณ์ กรุณาแจ้งทีมงาน</p>
      </SoftCard>
    );
  }

  /* ---------- scenario ---------- */
  const answered = answeredForCurrent();
  const totalItems = scenarioItemCount(currentScenario);
  const isFitbScenario = currentScenario.kind === "fitb" || currentScenario.kind === "fitb_with_summary";

  return (
    <div className="space-y-4">
      {/* scenario stepper */}
      <div className="flex items-center gap-2">
        {scenarios.map((sc, i) => (
          <span
            key={sc.id}
            className={`flex h-8 flex-1 items-center justify-center rounded-full text-xs font-bold ${
              i < scenarioIdx
                ? "bg-emerald-100 text-emerald-700"
                : i === scenarioIdx
                  ? "bg-ep-blue text-white"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {i < scenarioIdx ? "✓" : `สถานการณ์ ${i + 1}`}
          </span>
        ))}
      </div>

      {/* player */}
      <SoftCard className="text-center">
        <audio
          ref={audioRef}
          className="hidden"
          onEnded={() => setPlaying(false)}
          onError={() => setPlaying(false)}
        >
          <track kind="captions" />
        </audio>
        <p className="text-sm font-bold text-slate-800">
          {currentScenario.title_th ?? `สถานการณ์ที่ ${scenarioIdx + 1}`}
        </p>
        <button
          type="button"
          disabled={loadingTts || playing || playsLeft <= 0 || submitting}
          onClick={handlePlay}
          aria-label="เล่นเสียง"
          className={`relative mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-40 ${
            playing ? "bg-emerald-500" : "bg-ep-blue"
          }`}
        >
          {loadingTts ? (
            <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
          ) : playing ? (
            <span className="text-2xl">
              <EqualizerBars playing />
            </span>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-8 w-8">
              <path d="M8 5.14v13.72c0 .9.98 1.45 1.75.98l10.3-6.86a1.15 1.15 0 0 0 0-1.96L9.75 4.16A1.15 1.15 0 0 0 8 5.14Z" />
            </svg>
          )}
          {!playing && !loadingTts && playsForCurrent === 0 ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-ep-blue/25" />
          ) : null}
        </button>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: maxPlays }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i < playsLeft ? "bg-ep-blue" : "bg-slate-200"}`}
            />
          ))}
          <span className="ml-1.5 text-xs text-slate-400">
            {playsLeft > 0 ? `ฟังได้อีก ${playsLeft} ครั้ง` : "ฟังครบแล้ว ตอบคำถามได้เลย"}
          </span>
        </div>
        {ttsError ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">{ttsError}</p>
        ) : null}
      </SoftCard>

      {/* questions */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">ตอบคำถาม</p>
        <span className="rounded-full bg-ep-blue/10 px-3 py-1 font-mono text-xs font-bold text-ep-blue">
          {answered}/{totalItems}
        </span>
      </div>

      {/* fill-in-the-blank scenarios have no options — cue the user to TYPE */}
      {isFitbScenario ? (
        <p className="rounded-xl bg-ep-yellow/20 px-3.5 py-2.5 text-xs font-semibold text-slate-700">
          ✍️ สถานการณ์นี้ให้ “พิมพ์” คำที่หายไปในประโยค (ไม่มีตัวเลือกให้กด)
        </p>
      ) : null}

      <ScenarioQuestions
        scenario={currentScenario}
        picks={picksByScenario[currentScenario.id] ?? []}
        onPick={setPick}
        disabled={submitting}
      />

      <PrimaryButton disabled={submitting || !isCurrentScenarioComplete()} onClick={goNext}>
        {submitting
          ? "กำลังส่ง…"
          : scenarioIdx < scenarios.length - 1
            ? "ไปสถานการณ์ต่อไป →"
            : "ส่งคำตอบทั้งหมด"}
      </PrimaryButton>
    </div>
  );
}

function ScenarioQuestions({
  scenario,
  picks,
  onPick,
  disabled,
}: {
  scenario: Scenario;
  picks: string[];
  onPick: (idx: number, value: string) => void;
  disabled: boolean;
}) {
  if (scenario.kind === "mcq") {
    return (
      <div className="space-y-3">
        {scenario.questions.map((q, qIdx) => (
          <SoftCard key={qIdx}>
            <p className="text-sm font-bold text-slate-800">
              {qIdx + 1}. {q.question}
            </p>
            <div className="mt-2.5 space-y-2">
              {q.options.map((opt) => (
                <OptionPill
                  key={opt}
                  label={opt}
                  active={picks[qIdx] === opt}
                  disabled={disabled}
                  onClick={() => onPick(qIdx, opt)}
                />
              ))}
            </div>
          </SoftCard>
        ))}
      </div>
    );
  }

  const summary = scenario.kind === "fitb_with_summary" ? scenario.summary : null;
  return (
    <div className="space-y-3">
      {scenario.sentences.map((s, sIdx) => (
        <FitbRow
          key={sIdx}
          index={sIdx}
          sentence={s}
          value={picks[sIdx] ?? ""}
          onChange={(val) => onPick(sIdx, val)}
          disabled={disabled}
        />
      ))}
      {summary ? (
        <SoftCard>
          <p className="text-sm font-bold text-slate-800">
            {scenario.sentences.length + 1}. {summary.question}
          </p>
          <div className="mt-2.5 space-y-2">
            {summary.options.map((opt) => {
              const idx = scenario.sentences.length;
              return (
                <OptionPill
                  key={opt}
                  label={opt}
                  active={picks[idx] === opt}
                  disabled={disabled}
                  onClick={() => onPick(idx, opt)}
                />
              );
            })}
          </div>
        </SoftCard>
      ) : null}
    </div>
  );
}

function FitbRow({
  index,
  sentence,
  value,
  onChange,
  disabled,
}: {
  index: number;
  sentence: FitbSentence;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const mw = sentence.missingWords[0];
  const word = (mw?.correctWord ?? "").trim();
  const prefixLen = Math.min(Math.max(1, Math.floor(Number(mw?.prefix_length ?? 1) || 1)), 5, word.length);
  const prefix = word.slice(0, prefixLen);
  const remLen = Math.max(0, word.length - prefixLen);
  const display = sentence.text.replace(/\[BLANK 1\]/gi, "______");
  const typed = value.slice(0, remLen);
  return (
    <SoftCard>
      <p className="text-sm font-semibold leading-relaxed text-slate-800">
        {index + 1}. {display}
      </p>
      {mw?.explanationThai ? (
        <p className="mt-1 text-xs text-slate-400">คำใบ้: {mw.explanationThai}</p>
      ) : null}
      {/* letter-box blank: given prefix tiles + one slot per missing letter */}
      <div className="mt-3 flex flex-wrap items-center gap-1">
        {prefix.split("").map((ch, k) => (
          <span
            key={`p${k}`}
            className="inline-flex h-9 min-w-[1.85rem] items-center justify-center rounded-md bg-slate-100 px-1 font-mono text-base font-bold text-slate-500"
          >
            {ch}
          </span>
        ))}
        <span className={`relative inline-flex items-center gap-1 rounded-lg p-0.5 transition ${focused ? "ring-2 ring-ep-blue/60" : ""}`}>
          <input
            type="text"
            disabled={disabled}
            value={typed}
            maxLength={remLen}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => onChange(e.target.value.slice(0, remLen))}
            aria-label={`ช่องว่างที่ ${index + 1}`}
            className="absolute left-0 top-0 z-10 h-full w-full cursor-text opacity-0"
          />
          {Array.from({ length: remLen }, (_, k) => {
            const ch = typed[k];
            const isCursor = focused && k === Math.min(typed.length, remLen - 1) && !ch;
            return (
              <span
                key={`s${k}`}
                className={`inline-flex h-9 min-w-[1.85rem] items-center justify-center rounded-md px-1 font-mono text-base font-bold ${
                  ch
                    ? "border-2 border-ep-blue bg-white text-slate-900"
                    : isCursor
                      ? "animate-pulse border-2 border-ep-blue bg-blue-50 text-ep-blue"
                      : "border-2 border-dashed border-slate-300 bg-slate-50 text-slate-300"
                }`}
                aria-hidden
              >
                {ch ?? "_"}
              </span>
            );
          })}
        </span>
      </div>
    </SoftCard>
  );
}
