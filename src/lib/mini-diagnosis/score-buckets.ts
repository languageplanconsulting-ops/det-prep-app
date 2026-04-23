export type MiniDiagnosisScoredRow = {
  step_index: number;
  task_type: string;
  score: number;
  answer?: unknown;
};

export type MiniDiagnosisSkillBuckets = {
  total: number;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
  breakdown: {
    total: {
      listening: number;
      speaking: number;
      reading: number;
      writing: number;
    };
    listening: {
      dictation: number;
      interactive_listening: number;
    };
    speaking: {
      read_then_speak: number;
    };
    reading: {
      fill_in_blanks: number;
      vocabulary_reading: number;
    };
    writing: {
      write_about_photo: number;
      dictation: number;
      fill_in_blanks: number;
    };
    supporting: {
      dictation: number;
      fill_in_blanks: number;
      vocabulary_reading: number;
      interactive_listening: number;
      write_about_photo: number;
      read_then_speak: number;
      real_english_word: number;
    };
  };
};

function normalize160(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(160, Math.round(v)));
}

function avg(list: number[]): number {
  if (!list.length) return 0;
  return list.reduce((sum, item) => sum + item, 0) / list.length;
}

export function scoreMiniDiagnosisBuckets(rows: MiniDiagnosisScoredRow[]): MiniDiagnosisSkillBuckets {
  const dictation = avg(rows.filter((r) => r.task_type === "dictation").map((r) => r.score));
  const fitb = avg(rows.filter((r) => r.task_type === "fill_in_blanks").map((r) => r.score));
  const vocab = avg(rows.filter((r) => r.task_type === "vocabulary_reading").map((r) => r.score));
  const miniListening = avg(rows.filter((r) => r.task_type === "interactive_listening").map((r) => r.score));
  const writing = avg(rows.filter((r) => r.task_type === "write_about_photo").map((r) => r.score));
  const speaking = avg(rows.filter((r) => r.task_type === "read_then_speak").map((r) => r.score));
  const realEnglishWord = avg(rows.filter((r) => r.task_type === "real_english_word").map((r) => r.score));

  const reading = (vocab * 0.5) + (fitb * 0.5);
  const listening = (dictation * 0.5) + (miniListening * 0.5);
  const writingSkill = (writing * 0.55) + (dictation * 0.30) + (fitb * 0.15);
  const total = (reading + listening + writingSkill + speaking) / 4;

  const normalizedReading = normalize160(reading);
  const normalizedListening = normalize160(listening);
  const normalizedSpeaking = normalize160(speaking);
  const normalizedWriting = normalize160(writingSkill);
  const normalizedTotal = normalize160(total);

  return {
    total: normalizedTotal,
    listening: normalizedListening,
    speaking: normalizedSpeaking,
    reading: normalizedReading,
    writing: normalizedWriting,
    breakdown: {
      total: {
        listening: normalizedListening,
        speaking: normalizedSpeaking,
        reading: normalizedReading,
        writing: normalizedWriting,
      },
      listening: {
        dictation: normalize160(dictation * 0.5),
        interactive_listening: normalize160(miniListening * 0.5),
      },
      speaking: {
        read_then_speak: normalizedSpeaking,
      },
      reading: {
        fill_in_blanks: normalize160(fitb * 0.5),
        vocabulary_reading: normalize160(vocab * 0.5),
      },
      writing: {
        write_about_photo: normalize160(writing * 0.55),
        dictation: normalize160(dictation * 0.30),
        fill_in_blanks: normalize160(fitb * 0.15),
      },
      supporting: {
        dictation: normalize160(dictation),
        fill_in_blanks: normalize160(fitb),
        vocabulary_reading: normalize160(vocab),
        interactive_listening: normalize160(miniListening),
        write_about_photo: normalize160(writing),
        read_then_speak: normalize160(speaking),
        real_english_word: normalize160(realEnglishWord),
      },
    },
  };
}

export function miniDiagnosisLevelLabel(total: number): string {
  if (total >= 130) return "Strong / แข็งแรงมาก";
  if (total >= 110) return "Developing well / กำลังไปได้ดี";
  if (total >= 85) return "Emerging / เริ่มเห็นฐาน";
  if (total >= 60) return "Foundation / ต้องเสริมพื้นฐาน";
  return "Early stage / เริ่มต้นมาก";
}
