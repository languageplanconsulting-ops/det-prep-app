"use client";

/**
 * DEV-ONLY preview of the redesigned mini-diagnosis step screens.
 * Renders each step component with sample content so the design can be
 * reviewed without an authed session. Not linked anywhere; safe to delete.
 */

import { useEffect, useState } from "react";

import { setSfxEnabled, sfxCorrect } from "@/lib/exam-sfx";
import { ConfettiBurst, MascotTip } from "@/components/mini-diagnosis/steps/ui";
import { MiniDictationStep } from "@/components/mini-diagnosis/steps/MiniDictationStep";
import { MiniFitbStep } from "@/components/mini-diagnosis/steps/MiniFitbStep";
import { MiniListeningStep } from "@/components/mini-diagnosis/steps/MiniListeningStep";
import { MiniReadThenSpeakStep } from "@/components/mini-diagnosis/steps/MiniReadThenSpeakStep";
import { MiniRealWordStep } from "@/components/mini-diagnosis/steps/MiniRealWordStep";
import { MiniVocabReadingStep } from "@/components/mini-diagnosis/steps/MiniVocabReadingStep";
import { MiniWritePhotoStep } from "@/components/mini-diagnosis/steps/MiniWritePhotoStep";
import { MiniStepIntro } from "@/components/mini-diagnosis/steps/MiniStepIntro";
import { AdminMiniDiagnosisResultsClient } from "@/components/mini-diagnosis/AdminMiniDiagnosisResultsClient";

const DICTATION_CONTENT = {
  reference_sentence: "Students should review their notes before the final exam.",
};

const REALWORD_CONTENT = {
  real_words: [
    "market", "travel", "language", "orange", "window", "kitchen", "planet", "silver",
  ],
  fake_words: [
    "blonter", "sproke", "drimble", "flarnish", "quenzo", "trabble", "morvane", "clippet",
    "swindle2", "vortelle", "brastic", "plimber",
  ],
  rounds: 1,
  words_per_round: 20,
  real_words_per_round: 8,
  score_per_correct: 8,
  score_penalty_per_fake_pick: 4,
  max_score: 160,
};

const VOCAB_CONTENT = {
  mock_combined_mode: true,
  titleEn: "Campus Climate Study",
  passage: {
    p1: "Students at the university joined a project about [BLANK 1] and energy use on campus. The team hoped the [BLANK 2] would inspire real change.",
    p2: "Researchers found that simple changes could lower costs and improve daily comfort.",
    p3: "The report encouraged students to take more [BLANK 3] for environmental action.",
  },
  highlightedVocab: [],
  vocabularyQuestions: [
    { question: "Which word best fits blank 1?", options: ["recycling", "recycled", "recycle", "recycles"], correctAnswer: "recycling" },
    { question: "Which word best fits blank 2?", options: ["results", "resulting", "resulted", "resultant"], correctAnswer: "results" },
    { question: "Which word best fits blank 3?", options: ["responsibility", "responsible", "respond", "response"], correctAnswer: "responsibility" },
    { question: "Which word is closest in meaning to project?", options: ["plan", "accident", "holiday", "debate"], correctAnswer: "plan" },
    { question: "Which word is closest in meaning to lower?", options: ["reduce", "hide", "divide", "collect"], correctAnswer: "reduce" },
    { question: "Which word is closest in meaning to comfort?", options: ["convenience", "argument", "danger", "anger"], correctAnswer: "convenience" },
  ],
  missingParagraph: {
    question: "Which paragraph fits the missing gap?",
    options: [
      "Researchers found that simple changes could lower costs and improve daily comfort.",
      "The football team won the championship last year.",
      "Cooking classes are held every Friday evening.",
      "The library will be closed for renovation.",
    ],
    correctAnswer: "Researchers found that simple changes could lower costs and improve daily comfort.",
  },
  informationLocation: { question: "Where should a sentence about lower bills go?", options: ["Paragraph 1", "Paragraph 2", "Paragraph 3", "Nowhere"], correctAnswer: "Paragraph 2" },
  bestTitle: { question: "What is the best title?", options: ["A University Climate Project", "How to Borrow Library Books", "Student Fashion Week", "A New Sports Club"], correctAnswer: "A University Climate Project" },
  mainIdea: { question: "What is the main idea?", options: ["Students can improve campus life with practical environmental action.", "Students dislike science research.", "The campus has too many sports clubs.", "Researchers only studied library books."], correctAnswer: "Students can improve campus life with practical environmental action." },
};

const FITB_CONTENT = {
  passage: "The professor asked the students to [BLANK 1] their essays before the final [BLANK 2].",
  missingWords: [
    { correctWord: "revise", clue: "To improve by checking and changing errors.", explanationThai: "แก้ไขปรับปรุง", prefix_length: 2 },
    { correctWord: "submission", clue: "The act of formally sending work to be checked.", explanationThai: "การส่งงาน", prefix_length: 3 },
  ],
};

const LISTENING_CONTENT = {
  instruction: "You can press play up to 3 times per scenario.",
  instruction_th: "กดฟังได้ไม่เกิน 3 ครั้งต่อสถานการณ์",
  pre_break_seconds: 6,
  max_plays: 3,
  tts_provider: "deepgram",
  scenarios: [
    {
      id: 1,
      kind: "mcq",
      title_th: "สถานการณ์ที่ 1",
      passage:
        "Maya went to see Professor Carter because she had not picked up the reading list for next week's class.",
      questions: [
        {
          question: "Why did Maya go to see the professor?",
          options: [
            "To explain that she was not ready",
            "To return some borrowed books",
            "To ask about the exam date",
          ],
          correctAnswer: "To explain that she was not ready",
        },
      ],
    },
    {
      id: 2,
      kind: "fitb",
      title_th: "สถานการณ์ที่ 2",
      passage: "The campus library extends its hours during exam week.",
      sentences: [
        {
          text: "The library stays open [BLANK 1] during exam week.",
          missingWords: [{ correctWord: "longer", prefix_length: 3, explanationThai: "นานขึ้น" }],
        },
      ],
    },
  ],
};

const WRITE_PHOTO_CONTENT = {
  image_url: "/mascot-doy.png",
  instruction_th: "เขียนบรรยายภาพนี้เป็นภาษาอังกฤษ",
  instruction: "Describe the image in your own words.",
};

const SPEAK_CONTENT = {
  passage: "Many students prefer studying in the library because it is quiet and has fast internet.",
  prompt_th: "อ่านข้อความ แล้วพูดสรุปพร้อมความเห็นของคุณ",
  prompt_en: "Read the passage, then speak about it with your own opinion.",
};

const TABS = [
  "Intros",
  "Dictation",
  "Real Word",
  "Vocab+Reading",
  "FITB",
  "Listening",
  "Write Photo",
  "Read+Speak",
  "Celebration",
  "Rest",
  "Report",
] as const;

/** Mock report payload so the results page can be previewed without a session. */
const MOCK_REPORT = {
  result: {
    actual_total: 105,
    actual_listening: 116,
    actual_speaking: 80,
    actual_reading: 120,
    actual_writing: 104,
    level_label: "Developing well / กำลังไปได้ดี",
    strengths: [
      { key: "reading", score: 120 },
      { key: "listening", score: 116 },
    ],
    weaknesses: [
      { key: "speaking", score: 80 },
      { key: "writing", score: 104 },
    ],
    report_payload: {
      responses: [
        { step_index: 1, task_type: "dictation", score: 118, answer: { answer: "Students should review their notes before the final exam" } },
        { step_index: 2, task_type: "dictation", score: 110, answer: { answer: "The library extends its hours during exam week" } },
        { step_index: 3, task_type: "real_english_word", score: 124, answer: { round_selections: [{ selected: ["market", "travel", "blonter"], realWords: ["market", "travel", "language"], fakeWords: ["blonter", "sproke", "drimble"] }] } },
        {
          step_index: 4,
          task_type: "vocabulary_reading",
          score: 120,
          answer: {
            selected_answers: ["recycling", "results", "duty", "plan"],
            correct_answers: ["recycling", "results", "responsibility", "plan"],
            question_prompts: ["Which word best fits blank 1?", "Which word best fits blank 2?", "Closest in meaning to responsibility?", "Closest in meaning to project?"],
          },
        },
        { step_index: 5, task_type: "fill_in_blanks", score: 108, answer: { answers: ["revise", "submision"] } },
        { step_index: 6, task_type: "fill_in_blanks", score: 108, answer: { answers: ["convenient", "expensive"] } },
        {
          step_index: 7,
          task_type: "interactive_listening",
          score: 114,
          answer: {
            selected_answers: ["to explain that she was not ready", "longer"],
            correct_answers: ["to explain that she was not ready", "longer"],
            question_prompts: ["Why did Maya go to see the professor?", "The library stays open ___ during exam week."],
          },
        },
        {
          step_index: 8,
          task_type: "write_about_photo",
          score: 104,
          answer: { text: "A boy is thinking about something. He wears a blue shirt and looks curious about the world around him." },
          review: {
            improvementPoints: [
              { th: "ใช้ประโยคซับซ้อนขึ้น เช่น เชื่อมด้วย because / although" },
              { th: "เพิ่มรายละเอียดของฉากหลังและอารมณ์ในภาพ" },
            ],
          },
        },
        {
          step_index: 9,
          task_type: "read_then_speak",
          score: 80,
          answer: { text: "Many student like library because quiet and internet fast. I also like study there." },
          review: {
            improvementPoints: [
              { th: "ระวังการผันกริยา เช่น students like (ไม่ใช่ student like)" },
              { th: "พูดต่อเนื่องขึ้น ลดการหยุดระหว่างประโยค" },
              { th: "เพิ่มความเห็นของตัวเองพร้อมเหตุผล" },
            ],
          },
        },
      ],
      scoreBreakdown: {
        listening: { dictation: 57, interactive_listening: 57 },
        speaking: { read_then_speak: 80 },
        reading: { fill_in_blanks: 54, vocabulary_reading: 60 },
        writing: { write_about_photo: 57, dictation: 34, fill_in_blanks: 16 },
        supporting: {
          dictation: 114,
          fill_in_blanks: 108,
          vocabulary_reading: 120,
          interactive_listening: 114,
          write_about_photo: 104,
          read_then_speak: 80,
          real_english_word: 124,
        },
      },
    },
  },
  stepItems: [
    { step_index: 1, task_type: "dictation", content: { reference_sentence: "Students should review their notes before the final exam." } },
    { step_index: 2, task_type: "dictation", content: { reference_sentence: "The library extends its hours during exam week." } },
    { step_index: 3, task_type: "real_english_word", content: {} },
    { step_index: 4, task_type: "vocabulary_reading", content: {} },
    { step_index: 5, task_type: "fill_in_blanks", content: {}, correct_answer: { answers: ["revise", "submission"] } },
    { step_index: 6, task_type: "fill_in_blanks", content: {}, correct_answer: { answers: ["convenient", "expensive"] } },
    { step_index: 7, task_type: "interactive_listening", content: {} },
    { step_index: 8, task_type: "write_about_photo", content: {} },
    { step_index: 9, task_type: "read_then_speak", content: {} },
  ],
};

/** Renders the real results client with a mocked report API response. */
function ReportPreview() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const orig = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/mini-diagnosis/results/preview-demo/report")) {
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_REPORT), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return orig(input, init);
    };
    setReady(true);
    return () => {
      window.fetch = orig;
    };
  }, []);
  if (!ready) return null;
  return (
    <div className="-mx-4 rounded-2xl border border-slate-200">
      <AdminMiniDiagnosisResultsClient sessionId="preview-demo" />
    </div>
  );
}

const INTRO_STEPS: Array<{ taskType: string; stepIndex: number; timeLimitSec: number }> = [
  { taskType: "dictation", stepIndex: 1, timeLimitSec: 120 },
  { taskType: "real_english_word", stepIndex: 3, timeLimitSec: 60 },
  { taskType: "vocabulary_reading", stepIndex: 4, timeLimitSec: 300 },
  { taskType: "fill_in_blanks", stepIndex: 5, timeLimitSec: 120 },
  { taskType: "interactive_listening", stepIndex: 7, timeLimitSec: 600 },
  { taskType: "write_about_photo", stepIndex: 8, timeLimitSec: 60 },
  { taskType: "read_then_speak", stepIndex: 9, timeLimitSec: 180 },
];

export default function MiniDiagPreviewPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Intros");
  const [introIdx, setIntroIdx] = useState(0);
  const [lastSubmit, setLastSubmit] = useState<string>("");

  useEffect(() => {
    setSfxEnabled(true);
  }, []);

  const onSubmit = (answer: unknown) => {
    sfxCorrect();
    setLastSubmit(JSON.stringify(answer, null, 2));
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-16">
      <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#f5f7fb]/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setLastSubmit("");
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                tab === t ? "bg-ep-blue text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <MascotTip text="นี่คือหน้าตัวอย่างสำหรับรีวิวดีไซน์ — ข้อมูลเป็นตัวอย่างทั้งหมด" />
        {tab === "Intros" ? (
          <>
            <p className="text-center text-xs font-semibold text-slate-500">
              แตะ "เข้าใจแล้ว เริ่มเลย" เพื่อดู intro ของข้อถัดไป ({introIdx + 1}/{INTRO_STEPS.length}:{" "}
              {INTRO_STEPS[introIdx]!.taskType})
            </p>
            <MiniStepIntro
              key={introIdx}
              taskType={INTRO_STEPS[introIdx]!.taskType}
              stepIndex={INTRO_STEPS[introIdx]!.stepIndex}
              stepCount={9}
              timeLimitSec={INTRO_STEPS[introIdx]!.timeLimitSec}
              onStart={() => {
                if (introIdx >= INTRO_STEPS.length - 1) {
                  setIntroIdx(0);
                  setTab("Dictation"); // escape the overlay after the last intro
                  return;
                }
                setIntroIdx((i) => i + 1);
              }}
            />
          </>
        ) : null}
        {tab === "Dictation" ? (
          <MiniDictationStep content={DICTATION_CONTENT} onSubmit={onSubmit} />
        ) : null}
        {tab === "Real Word" ? <MiniRealWordStep content={REALWORD_CONTENT} onSubmit={onSubmit} /> : null}
        {tab === "Vocab+Reading" ? (
          <MiniVocabReadingStep content={VOCAB_CONTENT} onSubmit={onSubmit} />
        ) : null}
        {tab === "FITB" ? <MiniFitbStep content={FITB_CONTENT} onSubmit={onSubmit} /> : null}
        {tab === "Listening" ? <MiniListeningStep content={LISTENING_CONTENT} onSubmit={onSubmit} /> : null}
        {tab === "Write Photo" ? (
          <MiniWritePhotoStep content={WRITE_PHOTO_CONTENT} onSubmit={onSubmit} />
        ) : null}
        {tab === "Read+Speak" ? (
          <MiniReadThenSpeakStep content={SPEAK_CONTENT} onSubmit={onSubmit} />
        ) : null}
        {tab === "Rest" ? (
          <div className="space-y-4">
            <MascotTip size="lg" text="เก่งมาก! ผ่านมาแล้ว 4/9 ข้อ 🎉" sub="พักหายใจแป๊บนึง เดี๋ยวไปข้อต่อไปกัน" />
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">พักสั้นๆ</p>
              <p className="mt-2 font-mono text-5xl font-bold text-ep-blue">27</p>
              <p className="mt-1 text-xs text-slate-400">วินาที</p>
              <button type="button" className="mt-4 rounded-xl border-2 border-ep-blue px-4 py-2 text-sm font-bold text-ep-blue">
                พร้อมแล้ว ไปต่อเลย →
              </button>
            </div>
          </div>
        ) : null}
        {tab === "Report" ? <ReportPreview /> : null}
        {tab === "Celebration" ? (
          <div className="relative overflow-hidden rounded-3xl bg-white p-6 text-center shadow-xl">
            <ConfettiBurst />
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
            <img src="/mascot-doy.png" alt="" className="mx-auto h-20 w-20 object-contain" />
            <p className="mt-2 text-xl font-bold text-slate-900">เยี่ยมมาก! 🎉</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">ข้อ 3 เสร็จแล้ว · เหลืออีก 6 ข้อ</p>
            <div className="mt-3 flex justify-center gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className={`h-1.5 w-4 rounded-full ${i < 3 ? "bg-emerald-400" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>
        ) : null}

        {lastSubmit ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-700">Submitted payload (dev check)</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-slate-600">{lastSubmit}</pre>
          </div>
        ) : null}
      </div>
    </main>
  );
}
