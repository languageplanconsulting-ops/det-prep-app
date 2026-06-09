"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  // If the user already typed the full word, accept it as-is.
  if (lowered === correct.toLowerCase()) return correct.toLowerCase();
  // Otherwise treat typed as the suffix after the prefix chip.
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

export function MiniInteractiveListeningStep({
  content,
  submitting,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting: boolean;
  onSubmit: (answer: unknown) => void;
}) {
  const c = content as unknown as Content;
  const scenarios = useMemo(() => (Array.isArray(c.scenarios) ? c.scenarios : []), [c.scenarios]);
  const maxPlays = Math.max(1, Number(c.max_plays ?? 3) || 3);
  const breakSec = Math.max(0, Number(c.pre_break_seconds ?? 20) || 20);
  const ttsProvider = String(c.tts_provider ?? "deepgram");

  const [phase, setPhase] = useState<"break" | "scenario" | "done">(breakSec > 0 ? "break" : "scenario");
  const [breakRemaining, setBreakRemaining] = useState(breakSec);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [playsUsed, setPlaysUsed] = useState<Record<number, number>>({});
  const [audioBySc, setAudioBySc] = useState<Record<number, string>>({});
  const [loadingTts, setLoadingTts] = useState(false);
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

  const ensureAudio = async (sc: Scenario): Promise<string | null> => {
    if (audioBySc[sc.id]) return audioBySc[sc.id];
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
        setTtsError(json.error ?? "ไม่สามารถสร้างเสียงได้ กรุณาลองอีกครั้ง");
        return null;
      }
      const mime = json.mimeType ?? "audio/mpeg";
      const url = `data:${mime};base64,${json.audioBase64}`;
      setAudioBySc((prev) => ({ ...prev, [sc.id]: url }));
      return url;
    } catch {
      setTtsError("เชื่อมต่อ TTS ไม่สำเร็จ กรุณาลองอีกครั้ง");
      return null;
    } finally {
      setLoadingTts(false);
    }
  };

  const handlePlay = async () => {
    if (!currentScenario) return;
    if (playsForCurrent >= maxPlays) return;
    const url = await ensureAudio(currentScenario);
    if (!url) return;
    setPlaysUsed((prev) => ({
      ...prev,
      [currentScenario.id]: (prev[currentScenario.id] ?? 0) + 1,
    }));
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    }
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

  const isCurrentScenarioComplete = (): boolean => {
    if (!currentScenario) return false;
    const need = scenarioItemCount(currentScenario);
    const picks = picksByScenario[currentScenario.id] ?? [];
    for (let i = 0; i < need; i += 1) {
      if (!picks[i] || !picks[i].trim()) return false;
    }
    return true;
  };

  const goNext = () => {
    if (!currentScenario) return;
    if (scenarioIdx < scenarios.length - 1) {
      setScenarioIdx((i) => i + 1);
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

  if (phase === "break") {
    return (
      <div className="space-y-5">
        <div className="rounded-[4px] border-4 border-black bg-[#FFCC00] p-5 shadow-[6px_6px_0_0_#111111]">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#004AAD]">
            พักก่อนเริ่มข้อสอบการฟัง
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[#111111]">
            {c.pre_break_message_th ??
              "พักสายตา 20 วินาทีก่อนเริ่มทำข้อสอบการฟัง เตรียมหูฟังและสมาธิให้พร้อม"}
          </h2>
          <p className="mt-3 text-sm font-bold text-neutral-700">
            {c.pre_break_message_en ??
              "Take a short rest before the listening exam begins. Get your headphones ready."}
          </p>
        </div>
        <div className="rounded-[4px] border-4 border-black bg-white p-5 text-center shadow-[6px_6px_0_0_#111111]">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">
            เริ่มในอีก / Starts in
          </p>
          <p className="mt-2 text-6xl font-black text-[#004AAD]">{breakRemaining}s</p>
          <button
            type="button"
            onClick={() => setPhase("scenario")}
            className="mt-5 rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-3 text-sm font-black uppercase text-[#FFCC00] shadow-[4px_4px_0_0_#111111]"
          >
            ข้ามและเริ่มเลย / Skip and start now
          </button>
        </div>
      </div>
    );
  }

  if (!currentScenario) {
    return (
      <div className="p-4 text-center font-black text-red-700">
        ไม่พบเนื้อหาสถานการณ์ กรุณาแจ้งทีมงาน
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[4px] border-4 border-black bg-[#fff9e6] p-4">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#004AAD]">
          {currentScenario.title_th ?? `สถานการณ์ที่ ${scenarioIdx + 1}`} /{" "}
          {currentScenario.title_en ?? `Scenario ${scenarioIdx + 1}`} ({scenarioIdx + 1}/{scenarios.length})
        </p>
        <p className="mt-2 text-sm font-bold text-neutral-800">
          {c.instruction_th ??
            "คุณสามารถกดฟังได้ไม่เกิน 3 ครั้งต่อหนึ่งสถานการณ์ จากนั้นตอบคำถามทั้งหมดก่อนไปต่อ"}
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          {c.instruction ??
            "You can press play up to 3 times for each scenario, then answer all questions before moving on."}
        </p>
      </div>

      <div className="space-y-3 rounded-[4px] border-4 border-black bg-white p-4 shadow-[6px_6px_0_0_#111111]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={loadingTts || playsForCurrent >= maxPlays || submitting}
            onClick={handlePlay}
            className="rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-3 text-sm font-black uppercase text-[#FFCC00] shadow-[4px_4px_0_0_#111111] disabled:opacity-50"
          >
            {loadingTts
              ? "Loading audio…"
              : playsForCurrent >= maxPlays
                ? "ฟังครบแล้ว / No plays left"
                : `🔊 กดเพื่อฟัง / Play (${playsForCurrent}/${maxPlays})`}
          </button>
          <div className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black uppercase">
            ฟังได้สูงสุด {maxPlays} ครั้ง / Up to {maxPlays} plays
          </div>
        </div>
        {ttsError ? <p className="text-xs font-bold text-red-700">{ttsError}</p> : null}
        <audio ref={audioRef} controls className="w-full">
          <track kind="captions" />
        </audio>
      </div>

      <ScenarioQuestions
        scenario={currentScenario}
        picks={picksByScenario[currentScenario.id] ?? []}
        onPick={setPick}
        disabled={submitting}
      />

      <button
        type="button"
        disabled={submitting || !isCurrentScenarioComplete()}
        onClick={goNext}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
      >
        {submitting
          ? "ส่งคำตอบ... / Sending"
          : scenarioIdx < scenarios.length - 1
            ? "ไปสถานการณ์ต่อไป / Next scenario"
            : "ส่งคำตอบทั้งหมด / Submit all"}
      </button>
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
      <div className="space-y-4">
        {scenario.questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="space-y-2 rounded-[4px] border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]"
          >
            <p className="font-bold">
              Q{qIdx + 1}. {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt) => {
                const active = picks[qIdx] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(qIdx, opt)}
                    className={`rounded-[4px] border-4 border-black px-3 py-2 text-left text-sm font-bold shadow-[3px_3px_0_0_#000] ${
                      active ? "bg-[#FFCC00]" : "bg-white"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (scenario.kind === "fitb") {
    return (
      <div className="space-y-4">
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      <div className="space-y-2 rounded-[4px] border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
        <p className="font-bold">
          Q{scenario.sentences.length + 1}. {scenario.summary.question}
        </p>
        <div className="grid gap-2">
          {scenario.summary.options.map((opt) => {
            const idx = scenario.sentences.length;
            const active = picks[idx] === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => onPick(idx, opt)}
                className={`rounded-[4px] border-4 border-black px-3 py-2 text-left text-sm font-bold shadow-[3px_3px_0_0_#000] ${
                  active ? "bg-[#FFCC00]" : "bg-white"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
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
  const mw = sentence.missingWords[0];
  const prefix = (mw?.correctWord ?? "").slice(0, Math.max(0, Number(mw?.prefix_length ?? 0)));
  const display = sentence.text.replace(/\[BLANK 1\]/gi, "______");
  return (
    <div className="space-y-2 rounded-[4px] border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
      <p className="font-bold">
        {index + 1}. {display}
      </p>
      {mw?.clue ? <p className="text-xs text-neutral-600">Clue: {mw.clue}</p> : null}
      {mw?.explanationThai ? (
        <p className="text-xs text-neutral-600">คำใบ้: {mw.explanationThai}</p>
      ) : null}
      <div className="flex items-center gap-2">
        {prefix ? (
          <span className="rounded-[4px] border-2 border-black bg-[#fff9e6] px-2 py-1 font-mono text-sm font-black">
            {prefix}
          </span>
        ) : null}
        <input
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={prefix ? "พิมพ์ส่วนที่เหลือ / type the rest" : "พิมพ์คำตอบ / type the answer"}
          className="w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000] focus:outline-none"
        />
      </div>
    </div>
  );
}
