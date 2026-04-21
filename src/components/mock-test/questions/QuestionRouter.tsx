"use client";

import { useState, type SyntheticEvent } from "react";

import type { MockQuestionRow } from "@/lib/mock-test/types";

import { ConversationSummaryMock } from "@/components/mock-test/questions/ConversationSummaryMock";
import { ConversationSummaryFromInteractiveMock } from "@/components/mock-test/questions/ConversationSummaryFromInteractiveMock";
import { InteractiveConversationMock } from "@/components/mock-test/questions/InteractiveConversationMock";
import { InteractiveConversationMcqMock } from "@/components/mock-test/questions/InteractiveConversationMcqMock";
import { MockInteractiveSpeakingSession } from "@/components/mock-test/questions/MockInteractiveSpeakingSession";
import { MockTestDictation } from "@/components/mock-test/questions/MockTestDictation";
import { MockTestFillInBlanks } from "@/components/mock-test/questions/MockTestFillInBlanks";
import { ReadThenSpeakMock } from "@/components/mock-test/questions/MockReadThenSpeakFixed";
import { RealEnglishWordRoundsMock } from "@/components/mock-test/questions/RealEnglishWordRoundsMock";
import { SpeakAboutPhotoMock } from "@/components/mock-test/questions/MockSpeakAboutPhotoFixed";
import { VocabularyReadingMockExam } from "@/components/mock-test/questions/VocabularyReadingMockExam";
import { isInteractiveConversationSummaryContent } from "@/lib/mock-test/conversation-summary-mock";

type Props = {
  question: MockQuestionRow;
  /** Phase 4 composite: how many sub-questions already recorded (0…9). */
  phaseProgress?: number;
  submitting?: boolean;
  onDictationAudioFinished?: () => void;
  onSpeakPhotoReady?: () => void;
  onSubmit: (answer: unknown) => void;
};

export function QuestionRouter({
  question,
  phaseProgress = 0,
  submitting = false,
  onDictationAudioFinished,
  onSpeakPhotoReady,
  onSubmit,
}: Props) {
  const c = question.content as Record<string, unknown>;

  switch (question.question_type) {
    case "fill_in_blanks":
      return (
        <MockTestFillInBlanks
          content={c}
          submitting={submitting}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "dictation":
      return (
        <MockTestDictation
          content={c}
          submitting={submitting}
          onAudioPlaybackFinished={onDictationAudioFinished}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "real_english_word":
      return (
        <RealEnglishWordRoundsMock
          content={c}
          submitting={submitting}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    case "read_and_select":
      return (
        <ReadAndSelect
          content={c}
          onSubmit={(ans) => onSubmit({ answer: ans })}
          submitting={submitting}
        />
      );
    case "vocabulary_reading":
      return (
        <VocabularyReadingMockExam
          content={c}
          completedSteps={phaseProgress}
          aggregateMode={c.mock_combined_mode === true}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      );
    case "interactive_listening":
      return (
        <InteractiveListening
          content={c}
          submitting={submitting}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "vocabulary_in_context":
      return (
        <VocabContext
          content={c}
          submitting={submitting}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "read_then_speak":
      return (
        <ReadThenSpeakMock content={c} submitting={submitting} onSubmit={(payload) => onSubmit(payload)} />
      );
    case "write_about_photo":
      return (
        <WritePhoto content={c} submitting={submitting} onSubmit={(text) => onSubmit({ text })} />
      );
    case "speak_about_photo":
      return (
        <SpeakAboutPhotoMock
          content={c}
          submitting={submitting}
          onImageReady={onSpeakPhotoReady}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    case "interactive_speaking":
      return (
        <MockInteractiveSpeakingSession
          content={c}
          submitting={submitting}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    case "interactive_conversation_mcq":
      if (Array.isArray(c.turns)) {
        return (
          <InteractiveConversationMcqMock
            content={c}
            submitting={submitting}
            onSubmit={(payload) => onSubmit(payload)}
          />
        );
      }
      return (
        <InteractiveConversationMock
          content={c}
          submitting={submitting}
          onSubmit={(payload) => onSubmit(payload)}
        />
      );
    case "summarize_conversation":
    case "conversation_summary":
      if (Array.isArray(c.turns) && c.mock_linked_from_interactive === true) {
        return (
          <ConversationSummaryFromInteractiveMock
            content={c}
            submitting={submitting}
            onSubmit={(payload) => onSubmit(payload)}
          />
        );
      }
      if (isInteractiveConversationSummaryContent(c)) {
        return (
          <ConversationSummaryMock
            content={c}
            submitting={submitting}
            onSubmit={(payload) => onSubmit(payload)}
          />
        );
      }
      return (
        <SummarizeConv
          content={c}
          submitting={submitting}
          onSubmit={(text) => onSubmit({ text })}
        />
      );
    case "read_and_write":
    case "essay_writing":
      return (
        <EssayWriting content={c} submitting={submitting} onSubmit={(text) => onSubmit({ text })} />
      );
    default:
      return <p className="text-sm">Unsupported question type.</p>;
  }
}

function ReadAndSelect({
  content,
  onSubmit,
  submitting,
}: {
  content: Record<string, unknown>;
  onSubmit: (a: string) => void;
  submitting: boolean;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const opts = (content.options as string[]) ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
      <p className="rounded-[4px] border-4 border-black bg-neutral-50 p-4 text-sm leading-relaxed">
        {String(content.passage ?? "")}
      </p>
      <p className="font-bold">{String(content.question ?? "")}</p>
      <div className="grid gap-2">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setPick(o)}
            disabled={submitting}
            className={`rounded-[4px] border-4 border-black px-3 py-2 text-left text-sm font-bold shadow-[4px_4px_0_0_#000] ${
              pick === o ? "bg-[#FFCC00]" : "bg-white"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={submitting || !pick}
        onClick={() => pick && onSubmit(pick)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

function InteractiveListening({
  content,
  onSubmit,
  submitting,
}: {
  content: Record<string, unknown>;
  onSubmit: (a: unknown) => void;
  submitting: boolean;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [multiAnswers, setMultiAnswers] = useState<string[]>([]);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [playsUsed, setPlaysUsed] = useState(0);
  const url = String(content.audio_url ?? "");
  const multiQuestions = Array.isArray(content.questions)
    ? (content.questions as Array<Record<string, unknown>>)
    : [];
  const maxPlays = Math.max(1, Number(content.max_plays ?? 3) || 3);
  const currentMulti = multiQuestions[activeQuestion];
  const opts =
    multiQuestions.length > 0
      ? ((currentMulti?.options as string[]) ?? [])
      : ((content.options as string[]) ?? []);

  const handleAudioPlay = (e: SyntheticEvent<HTMLAudioElement>) => {
    const el = e.currentTarget;
    if (playsUsed >= maxPlays) {
      el.pause();
      el.currentTime = 0;
      return;
    }
    setPlaysUsed((prev) => prev + 1);
  };

  const submitMulti = () => {
    const nextAnswers = [...multiAnswers];
    if (pick) nextAnswers[activeQuestion] = pick;
    if (activeQuestion < multiQuestions.length - 1) {
      setMultiAnswers(nextAnswers);
      setActiveQuestion((prev) => prev + 1);
      setPick(nextAnswers[activeQuestion + 1] ?? null);
      return;
    }
    let correct = 0;
    multiQuestions.forEach((question, idx) => {
      if (String(question.correctAnswer ?? "") === String(nextAnswers[idx] ?? "")) correct += 1;
    });
    onSubmit({
      averageScore0To100: multiQuestions.length > 0 ? (correct / multiQuestions.length) * 100 : 0,
      detail: {
        total: multiQuestions.length,
        correct,
        maxPlays,
      },
      selected_answers: nextAnswers,
      correct_answers: multiQuestions.map((question) => String(question.correctAnswer ?? "")),
      question_prompts: multiQuestions.map((question) => String(question.question ?? "")),
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
      {url ? (
        <audio controls className="w-full" src={url} onPlay={handleAudioPlay}>
          <track kind="captions" />
        </audio>
      ) : null}
      <div className="rounded-[4px] border-4 border-black bg-[#fff9e6] px-3 py-2 text-xs font-black uppercase tracking-wide text-neutral-700">
        Plays used: {playsUsed}/{maxPlays} / จำนวนครั้งที่ฟัง: {playsUsed}/{maxPlays}
      </div>
      <p className="font-bold">
        {multiQuestions.length > 0
          ? `Q${activeQuestion + 1}. ${String(currentMulti?.question ?? "")}`
          : String(content.question ?? "")}
      </p>
      <div className="grid gap-2">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setPick(o)}
            disabled={submitting}
            className={`rounded-[4px] border-4 border-black px-3 py-2 text-left text-sm font-bold shadow-[4px_4px_0_0_#000] ${
              pick === o ? "bg-[#FFCC00]" : "bg-white"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={submitting || !pick}
        onClick={() => {
          if (!pick) return;
          if (multiQuestions.length > 0) {
            submitMulti();
            return;
          }
          onSubmit(pick);
        }}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        {submitting
          ? "ส่งคำตอบ... / Sending"
          : multiQuestions.length > 0 && activeQuestion < multiQuestions.length - 1
            ? "Next question / ข้อต่อไป"
            : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

function VocabContext({
  content,
  onSubmit,
  submitting,
}: {
  content: Record<string, unknown>;
  onSubmit: (a: string) => void;
  submitting: boolean;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const opts = (content.options as string[]) ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="rounded-[4px] border-4 border-black bg-white p-4 text-sm">
        {String(content.sentence ?? "")}
      </p>
      <p className="text-xs text-neutral-600">
        Target: <strong>{String(content.target_word ?? "")}</strong>
      </p>
      <p className="font-bold">{String(content.question ?? "")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setPick(o)}
            disabled={submitting}
            className={`rounded-[4px] border-4 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000] ${
              pick === o ? "bg-[#FFCC00]" : "bg-white"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={submitting || !pick}
        onClick={() => pick && onSubmit(pick)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

function OpenTextarea({
  labelEn,
  labelTh,
  onSubmit,
  submitting,
}: {
  labelEn: string;
  labelTh: string;
  onSubmit: (t: string) => void;
  submitting: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{labelTh}</p>
      <p className="text-xs text-neutral-600">{labelEn}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      />
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

function WritePhoto({
  content,
  onSubmit,
  submitting,
}: {
  content: Record<string, unknown>;
  onSubmit: (t: string) => void;
  submitting: boolean;
}) {
  const [text, setText] = useState("");
  const url = String(
    content.image_url ?? content.imageUrl ?? content.photo_url ?? content.photoUrl ?? "",
  );
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic admin URLs
        <img src={url} alt="" className="max-h-72 w-full rounded-[4px] border-4 border-black object-cover" />
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
      />
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

function SummarizeConv({
  content,
  onSubmit,
  submitting,
}: {
  content: Record<string, unknown>;
  onSubmit: (t: string) => void;
  submitting: boolean;
}) {
  const [text, setText] = useState("");
  const url = String(content.audio_url ?? "");
  const lines = Array.isArray(content.dialogue_lines) ? (content.dialogue_lines as string[]) : [];
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
      {lines.length > 0 ? (
        <ul className="list-inside list-disc space-y-1 rounded-[4px] border-4 border-black bg-neutral-50 p-3 text-sm">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
      {url ? <audio controls className="w-full" src={url} /> : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
      />
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

function EssayWriting({
  content,
  onSubmit,
  submitting,
}: {
  content: Record<string, unknown>;
  onSubmit: (t: string) => void;
  submitting: boolean;
}) {
  const [text, setText] = useState("");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-y-3">
      <p className="text-base font-black text-neutral-900">{String(content.prompt_th ?? content.instruction_th ?? "")}</p>
      <p className="text-sm text-neutral-600">{String(content.prompt ?? content.instruction ?? "")}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
      />
      <p className="text-xs font-mono text-neutral-600">Words: {words}</p>
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}
