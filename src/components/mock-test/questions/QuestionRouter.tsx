"use client";

import { useState } from "react";

import type { MockQuestionRow } from "@/lib/mock-test/types";

import { ConversationSummaryMock } from "@/components/mock-test/questions/ConversationSummaryMock";
import { MockTestDictation } from "@/components/mock-test/questions/MockTestDictation";
import { MockTestFillInBlanks } from "@/components/mock-test/questions/MockTestFillInBlanks";
import { VocabularyReadingMockExam } from "@/components/mock-test/questions/VocabularyReadingMockExam";
import { isInteractiveConversationSummaryContent } from "@/lib/mock-test/conversation-summary-mock";

type Props = {
  question: MockQuestionRow;
  /** Phase 4 composite: how many sub-questions already recorded (0…9). */
  phaseProgress?: number;
  onSubmit: (answer: unknown) => void;
};

export function QuestionRouter({
  question,
  phaseProgress = 0,
  onSubmit,
}: Props) {
  const c = question.content as Record<string, unknown>;

  switch (question.question_type) {
    case "fill_in_blanks":
      return (
        <MockTestFillInBlanks
          content={c}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "dictation":
      return <MockTestDictation content={c} onSubmit={(ans) => onSubmit({ answer: ans })} />;
    case "real_english_word":
      return (
        <MockTestFillInBlanks
          content={c}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "read_and_select":
      return (
        <ReadAndSelect
          content={c}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "vocabulary_reading":
      return (
        <VocabularyReadingMockExam
          content={c}
          completedSteps={phaseProgress}
          onSubmit={onSubmit}
        />
      );
    case "interactive_listening":
      return (
        <InteractiveListening
          content={c}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "vocabulary_in_context":
      return (
        <VocabContext
          content={c}
          onSubmit={(ans) => onSubmit({ answer: ans })}
        />
      );
    case "read_then_speak":
      return (
        <OpenTextarea
          labelEn="Read the passage, then record or type your spoken response."
          labelTh="อ่านบทความ แล้วอัดเสียงหรือพิมพ์คำตอบ"
          onSubmit={(text) => onSubmit({ text })}
        />
      );
    case "write_about_photo":
      return (
        <WritePhoto content={c} onSubmit={(text) => onSubmit({ text })} />
      );
    case "speak_about_photo":
      return (
        <OpenTextarea
          labelEn="Describe the photo (record or type)."
          labelTh="อธิบายรูป (อัดเสียงหรือพิมพ์)"
          onSubmit={(text) => onSubmit({ text })}
        />
      );
    case "interactive_speaking":
      return (
        <OpenTextarea
          labelEn={String(c.prompt_en ?? c.instruction ?? "Respond to the prompt.")}
          labelTh={String(c.prompt_th ?? c.instruction_th ?? "ตอบตามโจทย์")}
          onSubmit={(text) => onSubmit({ text })}
        />
      );
    case "summarize_conversation":
    case "conversation_summary":
      if (isInteractiveConversationSummaryContent(c)) {
        return (
          <ConversationSummaryMock
            content={c}
            onSubmit={(payload) => onSubmit(payload)}
          />
        );
      }
      return (
        <SummarizeConv content={c} onSubmit={(text) => onSubmit({ text })} />
      );
    case "read_and_write":
    case "essay_writing":
      return (
        <EssayWriting content={c} onSubmit={(text) => onSubmit({ text })} />
      );
    default:
      return <p className="text-sm">Unsupported question type.</p>;
  }
}

function ReadAndSelect({
  content,
  onSubmit,
}: {
  content: Record<string, unknown>;
  onSubmit: (a: string) => void;
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
        disabled={!pick}
        onClick={() => pick && onSubmit(pick)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}

function InteractiveListening({
  content,
  onSubmit,
}: {
  content: Record<string, unknown>;
  onSubmit: (a: string) => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const opts = (content.options as string[]) ?? [];
  const url = String(content.audio_url ?? "");
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      {url ? (
        <audio controls className="w-full" src={url}>
          <track kind="captions" />
        </audio>
      ) : null}
      <p className="font-bold">{String(content.question ?? "")}</p>
      <div className="grid gap-2">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setPick(o)}
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
        disabled={!pick}
        onClick={() => pick && onSubmit(pick)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}

function VocabContext({
  content,
  onSubmit,
}: {
  content: Record<string, unknown>;
  onSubmit: (a: string) => void;
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
        disabled={!pick}
        onClick={() => pick && onSubmit(pick)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}

function OpenTextarea({
  labelEn,
  labelTh,
  onSubmit,
}: {
  labelEn: string;
  labelTh: string;
  onSubmit: (t: string) => void;
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
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}

function WritePhoto({
  content,
  onSubmit,
}: {
  content: Record<string, unknown>;
  onSubmit: (t: string) => void;
}) {
  const [text, setText] = useState("");
  const url = String(content.image_url ?? "");
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic admin URLs
        <img src={url} alt="" className="max-h-64 w-auto border-4 border-black" />
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
      />
      <button
        type="button"
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}

function SummarizeConv({
  content,
  onSubmit,
}: {
  content: Record<string, unknown>;
  onSubmit: (t: string) => void;
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
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}

function EssayWriting({
  content,
  onSubmit,
}: {
  content: Record<string, unknown>;
  onSubmit: (t: string) => void;
}) {
  const [text, setText] = useState("");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{String(content.prompt_th ?? content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.prompt ?? content.instruction ?? "")}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
      />
      <p className="text-xs font-mono text-neutral-600">Words: {words}</p>
      <button
        type="button"
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}
