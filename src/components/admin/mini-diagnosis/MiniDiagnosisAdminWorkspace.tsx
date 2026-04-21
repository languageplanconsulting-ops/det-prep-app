"use client";

import { type Dispatch, type ReactNode, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { MINI_DIAGNOSIS_STEP_COUNT } from "@/lib/mini-diagnosis/sequence";
import { buildMiniDiagnosisTaskTemplateJson } from "@/lib/mini-diagnosis/upload";
import { mt } from "@/lib/mock-test/mock-test-styles";

type SetRow = { id: string; name: string; itemCount: number };

type ChoiceQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

const DEFAULT_VOCAB_TEMPLATE = buildMiniDiagnosisTaskTemplateJson("vocabulary_reading");
const DEFAULT_FITB_TEMPLATE = buildMiniDiagnosisTaskTemplateJson("fill_in_blanks");
const DEFAULT_LISTENING_TEMPLATE = buildMiniDiagnosisTaskTemplateJson("interactive_listening");
const DEFAULT_VOCAB_CONTENT = extractTemplateContent(DEFAULT_VOCAB_TEMPLATE);
const DEFAULT_LISTENING_CONTENT = extractTemplateContent(DEFAULT_LISTENING_TEMPLATE);

function makeChoiceQuestion(): ChoiceQuestion {
  return {
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
  };
}

function ensureQuestionCount(list: ChoiceQuestion[], count: number): ChoiceQuestion[] {
  const next = [...list];
  while (next.length < count) next.push(makeChoiceQuestion());
  return next.slice(0, count);
}

function parseWordLines(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function extractTemplateContent(text: string): Record<string, unknown> {
  const parsed = safeJsonParse<Record<string, unknown>>(text, {});
  return (parsed.content ?? parsed) as Record<string, unknown>;
}

function extractTemplateCorrectAnswer(text: string): Record<string, unknown> | null {
  const parsed = safeJsonParse<Record<string, unknown>>(text, {});
  return parsed.correct_answer && typeof parsed.correct_answer === "object"
    ? (parsed.correct_answer as Record<string, unknown>)
    : null;
}

function splitTopicIntoQuestions(topicText: string): string[] {
  return topicText
    .split("?")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `${item}?`);
}

function SectionHeader({
  title,
  hint,
  onCopyTemplate,
}: {
  title: string;
  hint: string;
  onCopyTemplate?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-base font-black text-[#004AAD]">{title}</p>
        <p className="text-xs text-neutral-600">{hint}</p>
      </div>
      {onCopyTemplate ? (
        <button
          type="button"
          onClick={onCopyTemplate}
          className="rounded-[4px] border-4 border-black bg-white px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
        >
          Copy JSON template
        </button>
      ) : null}
    </div>
  );
}

function Box({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`rounded-[4px] border-4 border-black bg-white p-4 ${className}`}>{children}</div>;
}

function ChoiceQuestionEditor({
  title,
  question,
  onQuestionChange,
  onOptionChange,
  onCorrectAnswerChange,
}: {
  title: string;
  question: ChoiceQuestion;
  onQuestionChange: (value: string) => void;
  onOptionChange: (optionIndex: number, value: string) => void;
  onCorrectAnswerChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[4px] border-4 border-black bg-neutral-50 p-3">
      <p className="text-sm font-black text-[#004AAD]">{title}</p>
      <div className="mt-3 space-y-3">
        <textarea
          value={question.question}
          onChange={(e) => onQuestionChange(e.target.value)}
          rows={2}
          className="w-full rounded-[4px] border-4 border-black p-3 text-sm font-bold"
          placeholder="Question prompt"
        />
        <div className="grid gap-3 md:grid-cols-2">
          {question.options.map((option, optionIndex) => (
            <input
              key={`${title}-option-${optionIndex}`}
              value={option}
              onChange={(e) => onOptionChange(optionIndex, e.target.value)}
              className="w-full rounded-[4px] border-4 border-black px-3 py-3 text-sm font-bold"
              placeholder={`Option ${optionIndex + 1}`}
            />
          ))}
        </div>
        <input
          value={question.correctAnswer}
          onChange={(e) => onCorrectAnswerChange(e.target.value)}
          className="w-full rounded-[4px] border-4 border-black px-3 py-3 text-sm font-bold"
          placeholder="Correct answer (must exactly match one option)"
        />
      </div>
    </div>
  );
}

function normalizeChoiceQuestionArray(raw: unknown, count: number): ChoiceQuestion[] {
  const list = Array.isArray(raw) ? raw : [];
  return ensureQuestionCount(
    list
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        question: String(item.question ?? ""),
        options: ensureQuestionCount(
          [
            {
              question: "",
              options: Array.isArray(item.options)
                ? (item.options as unknown[]).map((option) => String(option ?? "")).slice(0, 4)
                : ["", "", "", ""],
              correctAnswer: String(item.correctAnswer ?? ""),
            },
          ],
          1,
        )[0].options,
        correctAnswer: String(item.correctAnswer ?? ""),
      })),
    count,
  );
}

export function MiniDiagnosisAdminWorkspace() {
  const [sets, setSets] = useState<SetRow[]>([]);
  const [setName, setSetName] = useState("");
  const [userTitle, setUserTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const [dictationOne, setDictationOne] = useState("");
  const [dictationTwo, setDictationTwo] = useState("");
  const [realWords, setRealWords] = useState("");
  const [fakeWords, setFakeWords] = useState("");
  const [vocabJsonDraft, setVocabJsonDraft] = useState(DEFAULT_VOCAB_TEMPLATE);
  const [vocabTitle, setVocabTitle] = useState(String(DEFAULT_VOCAB_CONTENT.titleEn ?? ""));
  const [vocabPassage1, setVocabPassage1] = useState(String((DEFAULT_VOCAB_CONTENT.passage as { p1?: unknown } | undefined)?.p1 ?? ""));
  const [vocabPassage2, setVocabPassage2] = useState(String((DEFAULT_VOCAB_CONTENT.passage as { p2?: unknown } | undefined)?.p2 ?? ""));
  const [vocabPassage3, setVocabPassage3] = useState(String((DEFAULT_VOCAB_CONTENT.passage as { p3?: unknown } | undefined)?.p3 ?? ""));
  const [vocabQuestions, setVocabQuestions] = useState<ChoiceQuestion[]>(
    ensureQuestionCount(
      ((DEFAULT_VOCAB_CONTENT.vocabularyQuestions as unknown[]) ?? [])
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          question: String(item.question ?? ""),
          options: Array.isArray(item.options)
            ? (item.options as unknown[]).map((option) => String(option ?? "")).slice(0, 4)
            : ["", "", "", ""],
          correctAnswer: String(item.correctAnswer ?? ""),
        })),
      6,
    ),
  );
  const [vocabMissingParagraph, setVocabMissingParagraph] = useState<ChoiceQuestion>({
    question: String((DEFAULT_VOCAB_CONTENT.missingParagraph as { question?: unknown } | undefined)?.question ?? ""),
    options: Array.isArray((DEFAULT_VOCAB_CONTENT.missingParagraph as { options?: unknown[] } | undefined)?.options)
      ? (((DEFAULT_VOCAB_CONTENT.missingParagraph as { options?: unknown[] }).options ?? []) as unknown[])
          .map((option) => String(option ?? ""))
          .slice(0, 4)
      : ["", "", "", ""],
    correctAnswer: String((DEFAULT_VOCAB_CONTENT.missingParagraph as { correctAnswer?: unknown } | undefined)?.correctAnswer ?? ""),
  });
  const [vocabInformationLocation, setVocabInformationLocation] = useState<ChoiceQuestion>({
    question: String((DEFAULT_VOCAB_CONTENT.informationLocation as { question?: unknown } | undefined)?.question ?? ""),
    options: Array.isArray((DEFAULT_VOCAB_CONTENT.informationLocation as { options?: unknown[] } | undefined)?.options)
      ? (((DEFAULT_VOCAB_CONTENT.informationLocation as { options?: unknown[] }).options ?? []) as unknown[])
          .map((option) => String(option ?? ""))
          .slice(0, 4)
      : ["", "", "", ""],
    correctAnswer: String((DEFAULT_VOCAB_CONTENT.informationLocation as { correctAnswer?: unknown } | undefined)?.correctAnswer ?? ""),
  });
  const [vocabBestTitle, setVocabBestTitle] = useState<ChoiceQuestion>({
    question: String((DEFAULT_VOCAB_CONTENT.bestTitle as { question?: unknown } | undefined)?.question ?? ""),
    options: Array.isArray((DEFAULT_VOCAB_CONTENT.bestTitle as { options?: unknown[] } | undefined)?.options)
      ? (((DEFAULT_VOCAB_CONTENT.bestTitle as { options?: unknown[] }).options ?? []) as unknown[])
          .map((option) => String(option ?? ""))
          .slice(0, 4)
      : ["", "", "", ""],
    correctAnswer: String((DEFAULT_VOCAB_CONTENT.bestTitle as { correctAnswer?: unknown } | undefined)?.correctAnswer ?? ""),
  });
  const [vocabMainIdea, setVocabMainIdea] = useState<ChoiceQuestion>({
    question: String((DEFAULT_VOCAB_CONTENT.mainIdea as { question?: unknown } | undefined)?.question ?? ""),
    options: Array.isArray((DEFAULT_VOCAB_CONTENT.mainIdea as { options?: unknown[] } | undefined)?.options)
      ? (((DEFAULT_VOCAB_CONTENT.mainIdea as { options?: unknown[] }).options ?? []) as unknown[])
          .map((option) => String(option ?? ""))
          .slice(0, 4)
      : ["", "", "", ""],
    correctAnswer: String((DEFAULT_VOCAB_CONTENT.mainIdea as { correctAnswer?: unknown } | undefined)?.correctAnswer ?? ""),
  });
  const [fitbOneJson, setFitbOneJson] = useState(DEFAULT_FITB_TEMPLATE);
  const [fitbTwoJson, setFitbTwoJson] = useState(DEFAULT_FITB_TEMPLATE);
  const [listeningScript, setListeningScript] = useState("");
  const [listeningJsonDraft, setListeningJsonDraft] = useState(DEFAULT_LISTENING_TEMPLATE);
  const [listeningQuestions, setListeningQuestions] = useState<ChoiceQuestion[]>(
    ensureQuestionCount(
      ((DEFAULT_LISTENING_CONTENT.questions as unknown[]) ?? [])
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          question: String(item.question ?? ""),
          options: Array.isArray(item.options)
            ? (item.options as unknown[]).map((option) => String(option ?? "")).slice(0, 4)
            : ["", "", "", ""],
          correctAnswer: String(item.correctAnswer ?? ""),
        })),
      5,
    ),
  );
  const [photoUrl, setPhotoUrl] = useState("");
  const [readThenSpeakTopic, setReadThenSpeakTopic] = useState("");

  const loadSets = useCallback(async () => {
    const res = await fetch("/api/mini-diagnosis/sets", { credentials: "same-origin" });
    const json = (await res.json().catch(() => ({}))) as {
      sets?: Array<{ id: string; name: string; stepCount: number }>;
      error?: string;
    };
    if (!res.ok) {
      setBanner(json.error ?? "Could not load mini diagnosis sets.");
      return;
    }
    setSets(
      (json.sets ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        itemCount: row.stepCount ?? 0,
      })),
    );
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const updateQuestionList = useCallback(
    (
      setter: Dispatch<SetStateAction<ChoiceQuestion[]>>,
      index: number,
      field: "question" | "correctAnswer",
      value: string,
    ) => {
      setter((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const updateQuestionOption = useCallback(
    (
      setter: Dispatch<SetStateAction<ChoiceQuestion[]>>,
      index: number,
      optionIndex: number,
      value: string,
    ) => {
      setter((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                options: item.options.map((option, idx) => (idx === optionIndex ? value : option)),
              }
            : item,
        ),
      );
    },
    [],
  );

  const updateSingleQuestion = useCallback(
    (
      setter: Dispatch<SetStateAction<ChoiceQuestion>>,
      field: "question" | "correctAnswer",
      value: string,
    ) => {
      setter((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const updateSingleQuestionOption = useCallback(
    (
      setter: Dispatch<SetStateAction<ChoiceQuestion>>,
      optionIndex: number,
      value: string,
    ) => {
      setter((current) => ({
        ...current,
        options: current.options.map((option, idx) => (idx === optionIndex ? value : option)),
      }));
    },
    [],
  );

  const importVocabularyJson = useCallback(() => {
    const content = extractTemplateContent(vocabJsonDraft);
    setVocabTitle(String(content.titleEn ?? ""));
    setVocabPassage1(String((content.passage as { p1?: unknown } | undefined)?.p1 ?? ""));
    setVocabPassage2(String((content.passage as { p2?: unknown } | undefined)?.p2 ?? ""));
    setVocabPassage3(String((content.passage as { p3?: unknown } | undefined)?.p3 ?? ""));
    setVocabQuestions(normalizeChoiceQuestionArray(content.vocabularyQuestions, 6));
    setVocabMissingParagraph({
      question: String((content.missingParagraph as { question?: unknown } | undefined)?.question ?? ""),
      options: normalizeChoiceQuestionArray([content.missingParagraph], 1)[0].options,
      correctAnswer: String((content.missingParagraph as { correctAnswer?: unknown } | undefined)?.correctAnswer ?? ""),
    });
    setVocabInformationLocation({
      question: String((content.informationLocation as { question?: unknown } | undefined)?.question ?? ""),
      options: normalizeChoiceQuestionArray([content.informationLocation], 1)[0].options,
      correctAnswer: String((content.informationLocation as { correctAnswer?: unknown } | undefined)?.correctAnswer ?? ""),
    });
    setVocabBestTitle({
      question: String((content.bestTitle as { question?: unknown } | undefined)?.question ?? ""),
      options: normalizeChoiceQuestionArray([content.bestTitle], 1)[0].options,
      correctAnswer: String((content.bestTitle as { correctAnswer?: unknown } | undefined)?.correctAnswer ?? ""),
    });
    setVocabMainIdea({
      question: String((content.mainIdea as { question?: unknown } | undefined)?.question ?? ""),
      options: normalizeChoiceQuestionArray([content.mainIdea], 1)[0].options,
      correctAnswer: String((content.mainIdea as { correctAnswer?: unknown } | undefined)?.correctAnswer ?? ""),
    });
    setBanner("Vocabulary Reading JSON imported into the form.");
  }, [vocabJsonDraft]);

  const importListeningJson = useCallback(() => {
    const content = extractTemplateContent(listeningJsonDraft);
    setListeningScript(
      String(content.audio_script ?? content.script ?? content.transcript ?? content.narration ?? ""),
    );
    setListeningQuestions(normalizeChoiceQuestionArray(content.questions, 5));
    setBanner("Listening Mini Test JSON imported into the form.");
  }, [listeningJsonDraft]);

  const groupedItems = useMemo(() => {
    const realWordList = parseWordLines(realWords);
    const fakeWordList = parseWordLines(fakeWords);
    const fitbOneContent = extractTemplateContent(fitbOneJson);
    const fitbOneCorrect = extractTemplateCorrectAnswer(fitbOneJson);
    const fitbTwoContent = extractTemplateContent(fitbTwoJson);
    const fitbTwoCorrect = extractTemplateCorrectAnswer(fitbTwoJson);
    const guidingQuestions = splitTopicIntoQuestions(readThenSpeakTopic);
    const cleanedVocabQuestions = vocabQuestions.map((question) => ({
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
    }));
    const cleanedListeningQuestions = listeningQuestions.map((question) => ({
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
    }));

    return {
      dictation: [
        { content: { reference_sentence: dictationOne } },
        { content: { reference_sentence: dictationTwo } },
      ],
      real_english_word: [
        {
          content: {
            real_words: realWordList,
            fake_words: fakeWordList,
            rounds: 1,
            words_per_round: 40,
            real_words_per_round: 20,
            round_duration_sec: 60,
            score_per_correct: 8,
            score_penalty_per_fake_pick: 3,
            max_score: 160,
          },
        },
      ],
      vocabulary_reading: [
        {
          content: {
            mock_combined_mode: true,
            titleEn: vocabTitle,
            passage: {
              p1: vocabPassage1,
              p2: vocabPassage2,
              p3: vocabPassage3,
            },
            highlightedVocab: [],
            vocabularyQuestions: cleanedVocabQuestions,
            missingParagraph: vocabMissingParagraph,
            informationLocation: vocabInformationLocation,
            bestTitle: vocabBestTitle,
            mainIdea: vocabMainIdea,
          },
        },
      ],
      fill_in_blanks: [
        { content: fitbOneContent, correct_answer: fitbOneCorrect },
        { content: fitbTwoContent, correct_answer: fitbTwoCorrect },
      ],
      interactive_listening: [
        {
          content: {
            instruction: "Listen to the audio. You may play it up to 3 times, then answer the 5 questions.",
            instruction_th: "ฟังเสียงนี้ได้สูงสุด 3 ครั้ง แล้วตอบคำถาม 5 ข้อ",
            script: listeningScript,
            max_plays: 3,
            questions: cleanedListeningQuestions,
          },
        },
      ],
      write_about_photo: [
        {
          content: {
            image_url: photoUrl,
            instruction: "Write one short paragraph describing what is happening in this image.",
            instruction_th: "เขียนหนึ่งย่อหน้าสั้นๆ อธิบายสิ่งที่เกิดขึ้นในภาพนี้",
          },
        },
      ],
      read_then_speak: [
        {
          content: {
            titleEn: "Mini read then speak",
            titleTh: "มินิอ่านแล้วพูด",
            topic: readThenSpeakTopic,
            prompt_en: "Read the cue card, then respond naturally in English.",
            prompt_th: "อ่านหัวข้อแล้วพูดตอบอย่างเป็นธรรมชาติเป็นภาษาอังกฤษ",
            guiding_questions: guidingQuestions,
          },
        },
      ],
    };
  }, [
    dictationOne,
    dictationTwo,
    fakeWords,
    fitbOneJson,
    fitbTwoJson,
    listeningQuestions,
    listeningScript,
    photoUrl,
    readThenSpeakTopic,
    realWords,
    vocabBestTitle,
    vocabInformationLocation,
    vocabMainIdea,
    vocabMissingParagraph,
    vocabPassage1,
    vocabPassage2,
    vocabPassage3,
    vocabQuestions,
    vocabTitle,
  ]);

  const previewJson = useMemo(
    () => JSON.stringify({ grouped_items: groupedItems }, null, 2),
    [groupedItems],
  );

  const copyTemplate = useCallback(async (taskType: Parameters<typeof buildMiniDiagnosisTaskTemplateJson>[0]) => {
    const text = buildMiniDiagnosisTaskTemplateJson(taskType);
    try {
      await navigator.clipboard.writeText(text);
      setBanner(`${taskType} template copied.`);
    } catch {
      setBanner(`${taskType} template is ready to copy.`);
    }
  }, []);

  const uploadSet = async () => {
    setBanner(null);
    if (!setName.trim()) return setBanner("Please enter internal set name.");
    if (!userTitle.trim()) return setBanner("Please enter learner-facing title.");
    if (!dictationOne.trim() || !dictationTwo.trim()) {
      return setBanner("Please fill in both dictation sentences.");
    }
    const realWordCount = parseWordLines(realWords).length;
    const fakeWordCount = parseWordLines(fakeWords).length;
    if (realWordCount !== 20 || fakeWordCount !== 20) {
      return setBanner("Real Word needs exactly 20 real words and 20 fake words.");
    }
    if (!vocabTitle.trim() || !vocabPassage1.trim() || !vocabPassage2.trim() || !vocabPassage3.trim()) {
      return setBanner("Please complete Vocabulary Reading title and all 3 passage paragraphs.");
    }
    if (!photoUrl.trim()) return setBanner("Please paste a photo URL for Write About Photo.");
    if (!readThenSpeakTopic.trim()) return setBanner("Please paste the Read Then Speak topic.");

    if (listeningQuestions.length !== 5) {
      return setBanner("Listening mini test needs exactly 5 multiple-choice questions.");
    }

    setBusy(true);
    const res = await fetch("/api/admin/mini-diagnosis/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        internal_name: setName.trim(),
        user_title: userTitle.trim(),
        grouped_items: groupedItems,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; savedRows?: number };
    setBusy(false);
    if (!res.ok || !json.ok) return setBanner(json.error ?? "Upload failed.");
    setBanner(`Uploaded ${json.savedRows ?? MINI_DIAGNOSIS_STEP_COUNT}/${MINI_DIAGNOSIS_STEP_COUNT} steps.`);
    await loadSets();
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-black text-[#004AAD]">Mini block diagnosis builder</h1>
        <p className="mt-2 max-w-4xl text-sm text-neutral-600">
          Build the free mini diagnosis with simple boxes. Dictation and Listening audio are generated on save
          with Deepgram first, then fallback providers only if needed.
        </p>
      </header>

      <section className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#004AAD]">Available mini diagnosis sets</p>
            <p className="text-xs text-neutral-600">Learners only see active admin-uploaded sets.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSets()}
            className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#000]"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {sets.length === 0 ? (
            <div className="rounded-[4px] border-4 border-dashed border-black bg-neutral-50 px-4 py-6 text-sm font-bold text-neutral-600">
              No active mini diagnosis sets yet.
            </div>
          ) : (
            sets.map((set) => (
              <div
                key={set.id}
                className="flex items-center justify-between gap-4 rounded-[4px] border-4 border-black bg-neutral-50 px-4 py-4"
              >
                <div>
                  <p className="text-xl font-black text-[#004AAD]">{set.name}</p>
                  <p className="text-sm text-neutral-600">{set.itemCount}/{MINI_DIAGNOSIS_STEP_COUNT} steps</p>
                </div>
                <Link
                  href="/mini-diagnosis/start"
                  className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#000]"
                >
                  Test diagnosis
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-5`}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-neutral-500">
              Internal set name
            </span>
            <input
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              className="w-full rounded-[4px] border-4 border-black px-4 py-3 text-sm font-bold"
              placeholder="mini-diagnosis-april"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-neutral-500">
              Learner title
            </span>
            <input
              value={userTitle}
              onChange={(e) => setUserTitle(e.target.value)}
              className="w-full rounded-[4px] border-4 border-black px-4 py-3 text-sm font-bold"
              placeholder="April 2026 mini diagnosis"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Box>
          <SectionHeader
            title="Dictation 1 + 2"
            hint="Paste one sentence per box. Audio will be attached automatically on save."
            onCopyTemplate={() => void copyTemplate("dictation")}
          />
          <div className="mt-4 space-y-3">
            <textarea
              value={dictationOne}
              onChange={(e) => setDictationOne(e.target.value)}
              rows={3}
              className="w-full rounded-[4px] border-4 border-black p-3 text-sm font-bold"
              placeholder="Dictation sentence 1"
            />
            <textarea
              value={dictationTwo}
              onChange={(e) => setDictationTwo(e.target.value)}
              rows={3}
              className="w-full rounded-[4px] border-4 border-black p-3 text-sm font-bold"
              placeholder="Dictation sentence 2"
            />
          </div>
        </Box>

        <Box>
          <SectionHeader
            title="Real English Word"
            hint="Paste exactly 20 real words and 20 fake words. Scoring is +8 for each real word and -3 for each fake word selected."
            onCopyTemplate={() => void copyTemplate("real_english_word")}
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-neutral-500">
                Real words
              </span>
              <textarea
                value={realWords}
                onChange={(e) => setRealWords(e.target.value)}
                rows={8}
                className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
                placeholder={"market\ntravel\nlanguage"}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-neutral-500">
                Fake words
              </span>
              <textarea
                value={fakeWords}
                onChange={(e) => setFakeWords(e.target.value)}
                rows={8}
                className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
                placeholder={"blonter\nsproke\ndrimble"}
              />
            </label>
          </div>
          <p className="mt-3 text-xs font-bold text-neutral-600">
            Real words: {parseWordLines(realWords).length}/20 · Fake words: {parseWordLines(fakeWords).length}/20
          </p>
        </Box>

        <Box>
          <SectionHeader
            title="Vocabulary Reading"
            hint="Build the full reading block here without touching JSON."
          />
          <div className="mt-4 space-y-4">
            <div className="rounded-[4px] border-4 border-dashed border-black bg-neutral-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                  Optional JSON import
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyTemplate("vocabulary_reading")}
                    className="rounded-[4px] border-4 border-black bg-white px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                  >
                    Copy JSON template
                  </button>
                  <button
                    type="button"
                    onClick={importVocabularyJson}
                    className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                  >
                    Import JSON into form
                  </button>
                </div>
              </div>
              <textarea
                value={vocabJsonDraft}
                onChange={(e) => setVocabJsonDraft(e.target.value)}
                rows={12}
                className="mt-3 w-full rounded-[4px] border-4 border-black p-3 text-xs font-bold"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                placeholder="Paste vocabulary_reading JSON here if you want to import it into the form"
              />
            </div>
            <input
              value={vocabTitle}
              onChange={(e) => setVocabTitle(e.target.value)}
              className="w-full rounded-[4px] border-4 border-black px-4 py-3 text-sm font-bold"
              placeholder="Passage title"
            />
            <textarea
              value={vocabPassage1}
              onChange={(e) => setVocabPassage1(e.target.value)}
              rows={3}
              className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
              placeholder="Paragraph 1"
            />
            <textarea
              value={vocabPassage2}
              onChange={(e) => setVocabPassage2(e.target.value)}
              rows={3}
              className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
              placeholder="Paragraph 2"
            />
            <textarea
              value={vocabPassage3}
              onChange={(e) => setVocabPassage3(e.target.value)}
              rows={3}
              className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
              placeholder="Paragraph 3"
            />
            <div className="space-y-3">
              <p className="text-sm font-black text-[#004AAD]">Vocabulary questions (6)</p>
              {vocabQuestions.map((question, index) => (
                <ChoiceQuestionEditor
                  key={`vocab-question-${index}`}
                  title={`Vocabulary question ${index + 1}`}
                  question={question}
                  onQuestionChange={(value) => updateQuestionList(setVocabQuestions, index, "question", value)}
                  onOptionChange={(optionIndex, value) =>
                    updateQuestionOption(setVocabQuestions, index, optionIndex, value)
                  }
                  onCorrectAnswerChange={(value) =>
                    updateQuestionList(setVocabQuestions, index, "correctAnswer", value)
                  }
                />
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-black text-[#004AAD]">Reading follow-up questions</p>
              <ChoiceQuestionEditor
                title="Missing paragraph"
                question={vocabMissingParagraph}
                onQuestionChange={(value) => updateSingleQuestion(setVocabMissingParagraph, "question", value)}
                onOptionChange={(optionIndex, value) =>
                  updateSingleQuestionOption(setVocabMissingParagraph, optionIndex, value)
                }
                onCorrectAnswerChange={(value) =>
                  updateSingleQuestion(setVocabMissingParagraph, "correctAnswer", value)
                }
              />
              <ChoiceQuestionEditor
                title="Information location"
                question={vocabInformationLocation}
                onQuestionChange={(value) => updateSingleQuestion(setVocabInformationLocation, "question", value)}
                onOptionChange={(optionIndex, value) =>
                  updateSingleQuestionOption(setVocabInformationLocation, optionIndex, value)
                }
                onCorrectAnswerChange={(value) =>
                  updateSingleQuestion(setVocabInformationLocation, "correctAnswer", value)
                }
              />
              <ChoiceQuestionEditor
                title="Best title"
                question={vocabBestTitle}
                onQuestionChange={(value) => updateSingleQuestion(setVocabBestTitle, "question", value)}
                onOptionChange={(optionIndex, value) =>
                  updateSingleQuestionOption(setVocabBestTitle, optionIndex, value)
                }
                onCorrectAnswerChange={(value) =>
                  updateSingleQuestion(setVocabBestTitle, "correctAnswer", value)
                }
              />
              <ChoiceQuestionEditor
                title="Main idea"
                question={vocabMainIdea}
                onQuestionChange={(value) => updateSingleQuestion(setVocabMainIdea, "question", value)}
                onOptionChange={(optionIndex, value) =>
                  updateSingleQuestionOption(setVocabMainIdea, optionIndex, value)
                }
                onCorrectAnswerChange={(value) =>
                  updateSingleQuestion(setVocabMainIdea, "correctAnswer", value)
                }
              />
            </div>
          </div>
        </Box>

        <Box>
          <SectionHeader
            title="Fill in the Blank 1"
            hint="Paste one JSON object for the first FITB item."
            onCopyTemplate={() => void copyTemplate("fill_in_blanks")}
          />
          <textarea
            value={fitbOneJson}
            onChange={(e) => setFitbOneJson(e.target.value)}
            rows={14}
            className="mt-4 w-full rounded-[4px] border-4 border-black p-3 text-xs font-bold"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          />
        </Box>

        <Box>
          <SectionHeader
            title="Fill in the Blank 2"
            hint="Paste one JSON object for the second FITB item."
            onCopyTemplate={() => void copyTemplate("fill_in_blanks")}
          />
          <textarea
            value={fitbTwoJson}
            onChange={(e) => setFitbTwoJson(e.target.value)}
            rows={14}
            className="mt-4 w-full rounded-[4px] border-4 border-black p-3 text-xs font-bold"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          />
        </Box>

        <Box>
          <SectionHeader
            title="Listening Mini Test"
            hint="Paste the listening script for Deepgram TTS, then fill the 5 multiple-choice questions."
          />
          <div className="mt-4 space-y-4">
            <div className="rounded-[4px] border-4 border-dashed border-black bg-neutral-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                  Optional JSON import
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyTemplate("interactive_listening")}
                    className="rounded-[4px] border-4 border-black bg-white px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                  >
                    Copy JSON template
                  </button>
                  <button
                    type="button"
                    onClick={importListeningJson}
                    className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                  >
                    Import JSON into form
                  </button>
                </div>
              </div>
              <textarea
                value={listeningJsonDraft}
                onChange={(e) => setListeningJsonDraft(e.target.value)}
                rows={10}
                className="mt-3 w-full rounded-[4px] border-4 border-black p-3 text-xs font-bold"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                placeholder="Paste interactive_listening JSON here if you want to import it into the form"
              />
            </div>
            <textarea
              value={listeningScript}
              onChange={(e) => setListeningScript(e.target.value)}
              rows={5}
              className="w-full rounded-[4px] border-4 border-black p-3 text-sm"
              placeholder="Paste the audio script here. This will be converted to audio automatically."
            />
            <div className="space-y-3">
              {listeningQuestions.map((question, index) => (
                <ChoiceQuestionEditor
                  key={`listening-question-${index}`}
                  title={`Listening question ${index + 1}`}
                  question={question}
                  onQuestionChange={(value) => updateQuestionList(setListeningQuestions, index, "question", value)}
                  onOptionChange={(optionIndex, value) =>
                    updateQuestionOption(setListeningQuestions, index, optionIndex, value)
                  }
                  onCorrectAnswerChange={(value) =>
                    updateQuestionList(setListeningQuestions, index, "correctAnswer", value)
                  }
                />
              ))}
            </div>
          </div>
        </Box>

        <Box>
          <SectionHeader
            title="Write About Photo"
            hint="Paste the photo link only. The learner prompt will be applied automatically."
            onCopyTemplate={() => void copyTemplate("write_about_photo")}
          />
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="mt-4 w-full rounded-[4px] border-4 border-black px-4 py-3 text-sm font-bold"
            placeholder="https://..."
          />
        </Box>

        <Box>
          <SectionHeader
            title="Read Then Speak"
            hint="Paste the topic only. The learner will see it as a cue card with auto-extracted guiding questions."
            onCopyTemplate={() => void copyTemplate("read_then_speak")}
          />
          <textarea
            value={readThenSpeakTopic}
            onChange={(e) => setReadThenSpeakTopic(e.target.value)}
            rows={5}
            className="mt-4 w-full rounded-[4px] border-4 border-black p-3 text-sm font-bold"
            placeholder="Talk about your favorite book. When did you read it? Who gave it to you? Why do you like it? What is the story?"
          />
          <div className="mt-3 rounded-[4px] border-4 border-dashed border-black bg-neutral-50 p-3 text-xs font-bold text-neutral-600">
            Auto guiding questions:{" "}
            {splitTopicIntoQuestions(readThenSpeakTopic).length > 0
              ? splitTopicIntoQuestions(readThenSpeakTopic).join(" | ")
              : "none yet"}
          </div>
        </Box>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-5`}>
        <SectionHeader
          title="Generated grouped_items preview"
          hint="This is the exact JSON the builder will upload."
        />
        <textarea
          readOnly
          value={previewJson}
          rows={26}
          className="mt-4 min-h-[420px] w-full rounded-[4px] border-4 border-black bg-neutral-50 p-4 text-xs font-bold"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={uploadSet}
            disabled={busy}
            className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-5 py-3 text-sm font-black shadow-[4px_4px_0_0_#000] disabled:opacity-60"
          >
            {busy ? "Uploading..." : "Upload mini diagnosis set"}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(previewJson);
                setBanner("Generated grouped_items JSON copied.");
              } catch {
                setBanner("Could not copy, but the preview is ready below.");
              }
            }}
            className="rounded-[4px] border-4 border-black bg-white px-5 py-3 text-sm font-black shadow-[4px_4px_0_0_#000]"
          >
            Copy grouped_items JSON
          </button>
        </div>
        {banner ? <p className="mt-4 text-sm font-bold text-[#004AAD]">{banner}</p> : null}
      </section>
    </div>
  );
}
