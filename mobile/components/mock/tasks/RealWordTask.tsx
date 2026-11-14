import { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../LuxuryPressable";
import { useTimeUp } from "../../../hooks/useStepTimer";
import { useI18n } from "../../../lib/i18n";
import { C, Note, PrimaryButton, SubmitButton, TaskInstruction, taskStyles } from "../TaskUi";
import { num, shuffle, str, type TaskProps } from "./types";

type TfWord = { word: string; isReal: boolean; level?: string | null; correctSpelling?: string | null };

/** Real English word — true/false cards or the multi-select rounds format, scored like the website. */
export function RealWordTask(props: TaskProps) {
  const c = props.content;
  const tfWords = Array.isArray(c.words) ? c.words : [];
  if (c.format === "true_false" || tfWords.length > 0) {
    const words = tfWords
      .map((w) => {
        const o = (w ?? {}) as Record<string, unknown>;
        return {
          word: str(o.word).trim(),
          isReal: Boolean(o.isReal),
          level: o.level == null ? null : str(o.level),
          correctSpelling: o.correctSpelling == null ? null : str(o.correctSpelling),
        };
      })
      .filter((w) => w.word);
    if (words.length > 0) return <TrueFalseWords {...props} words={words} />;
  }
  return <RoundsWords {...props} />;
}

function TrueFalseWords({ content, submitting, timeUp, onSubmit, words }: TaskProps & { words: TfWord[] }) {
  const { t } = useI18n();
  const ordered = useMemo(() => shuffle(words), [words]);
  const perCorrect = Math.max(1, num(content.score_per_correct, 16));
  const maxScore = Math.max(20, num(content.max_score, 160));
  const [idx, setIdx] = useState(0);
  const picks = useRef<(boolean | undefined)[]>([]);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    let correct = 0;
    const review = ordered.map((w, i) => {
      const userSaysReal = picks.current[i];
      const isCorrect = userSaysReal === w.isReal;
      if (isCorrect) correct += 1;
      return {
        word: w.word,
        level: w.level ?? null,
        isReal: w.isReal,
        userSaysReal: userSaysReal ?? null,
        isCorrect,
        correctSpelling: w.correctSpelling ?? null,
      };
    });
    const score160 = Math.max(0, Math.min(maxScore, correct * perCorrect));
    onSubmit({ score160, detail: { format: "true_false", per_correct: perCorrect, total: ordered.length, correct, review } });
  };

  useTimeUp(timeUp, finish);

  const pick = (real: boolean) => {
    picks.current[idx] = real;
    if (idx >= ordered.length - 1) finish();
    else setIdx(idx + 1);
  };

  const w = ordered[idx]!;
  return (
    <View style={taskStyles.gap}>
      <TaskInstruction th="คำนี้เป็นคำภาษาอังกฤษจริงไหม?" en="Is this a real English word?" />
      <View style={st.progressTrack}>
        <View style={[st.progressFill, { width: `${Math.round((idx / ordered.length) * 100)}%` }]} />
      </View>
      <Text style={taskStyles.muted}>
        {idx + 1}/{ordered.length}
      </Text>
      <View style={st.bigCard}>
        <Text style={st.bigWord}>{w.word}</Text>
      </View>
      <View style={st.tfRow}>
        <LuxuryPressable style={[st.tfBtn, st.tfYes]} sound="tap" disabled={submitting} onPress={() => pick(true)}>
          <Text style={st.tfText}>{t("✓ คำจริง", "✓ Real")}</Text>
        </LuxuryPressable>
        <LuxuryPressable style={[st.tfBtn, st.tfNo]} sound="tap" disabled={submitting} onPress={() => pick(false)}>
          <Text style={st.tfText}>{t("✗ คำลวง", "✗ Not real")}</Text>
        </LuxuryPressable>
      </View>
    </View>
  );
}

type Round = { words: string[]; realSet: Set<string> };

function RoundsWords({ content, submitting, timeUp, onSubmit }: TaskProps) {
  const { t } = useI18n();
  const cfg = useMemo(() => {
    const rounds = Math.max(1, num(content.rounds, 4));
    const wordsPerRound = Math.max(8, num(content.words_per_round, 20));
    const realDefault = Math.round(wordsPerRound * 0.4);
    const realPerRound = Math.max(1, num(content.real_words_per_round ?? content.real_word_count, realDefault));
    const fakePerRound = Math.max(4, wordsPerRound - realPerRound);
    return {
      rounds,
      realPerRound,
      fakePerRound,
      scorePerCorrect: Math.max(1, num(content.score_per_correct, 5)),
      fakePenalty: Math.max(0, num(content.score_penalty_per_fake_pick, 2)),
      maxScore: Math.max(20, num(content.max_score, 160)),
      perRoundSec: num(content.round_duration_sec, 60),
    };
  }, [content]);

  const plan = useMemo<Round[] | null>(() => {
    const real = shuffle((Array.isArray(content.real_words) ? content.real_words : []).map((w) => str(w).trim()).filter(Boolean));
    const fake = shuffle((Array.isArray(content.fake_words) ? content.fake_words : []).map((w) => str(w).trim()).filter(Boolean));
    if (real.length < cfg.rounds * cfg.realPerRound || fake.length < cfg.rounds * cfg.fakePerRound) return null;
    return Array.from({ length: cfg.rounds }, (_, r) => {
      const rw = real.slice(r * cfg.realPerRound, (r + 1) * cfg.realPerRound);
      const fw = fake.slice(r * cfg.fakePerRound, (r + 1) * cfg.fakePerRound);
      return { words: shuffle([...rw, ...fw]), realSet: new Set(rw) };
    });
  }, [content, cfg]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const score = useRef(0);
  const history = useRef<{ selected: string[]; realWords: string[]; fakeWords: string[] }[]>([]);
  const done = useRef(false);

  const scoreRound = (round: Round, sel: Set<string>) => {
    let plus = 0;
    let minus = 0;
    for (const w of sel) {
      if (round.realSet.has(w)) plus += cfg.scorePerCorrect;
      else minus += cfg.fakePenalty;
    }
    score.current = Math.max(0, Math.min(cfg.maxScore, score.current + plus - minus));
    history.current = [
      ...history.current,
      { selected: [...sel], realWords: [...round.realSet], fakeWords: round.words.filter((w) => !round.realSet.has(w)) },
    ];
  };

  const detail = (extra?: Record<string, unknown>) => ({
    rounds: cfg.rounds,
    per_round_sec: cfg.perRoundSec,
    score_per_correct: cfg.scorePerCorrect,
    score_penalty_per_fake_pick: -cfg.fakePenalty,
    max_score: cfg.maxScore,
    ...extra,
  });

  useTimeUp(timeUp, () => {
    if (!plan || done.current) return;
    done.current = true;
    scoreRound(plan[roundIdx]!, selected);
    onSubmit({ score160: score.current, detail: detail({ timed_out_at_round: roundIdx + 1 }), round_selections: history.current });
  });

  if (!plan) {
    return <Note tone="error">{t("ชุดคำศัพท์ไม่ครบ", "This word set is incomplete.")}</Note>;
  }

  const round = plan[roundIdx]!;
  const last = roundIdx >= plan.length - 1;

  const next = () => {
    if (done.current) return;
    scoreRound(round, selected);
    if (last) {
      done.current = true;
      onSubmit({ score160: score.current, detail: detail(), round_selections: history.current });
      return;
    }
    setSelected(new Set());
    setRoundIdx(roundIdx + 1);
  };

  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th="แตะเลือกเฉพาะคำที่เป็นคำภาษาอังกฤษจริง (เลือกคำลวงจะถูกหักคะแนน)"
        en="Select only the real English words (picking a fake word costs points)."
      />
      <View style={taskStyles.pill}>
        <Text style={taskStyles.pillText}>
          {t(`รอบ ${roundIdx + 1}/${plan.length}`, `Round ${roundIdx + 1}/${plan.length}`)} ·{" "}
          {t(`เลือกแล้ว ${selected.size}`, `${selected.size} selected`)}
        </Text>
      </View>
      <View style={st.grid}>
        {round.words.map((w) => {
          const on = selected.has(w);
          return (
            <LuxuryPressable
              key={w}
              style={[st.tile, on ? st.tileOn : null]}
              sound="tap"
              scaleTo={0.95}
              disabled={submitting}
              onPress={() =>
                setSelected((prev) => {
                  const n = new Set(prev);
                  if (n.has(w)) n.delete(w);
                  else n.add(w);
                  return n;
                })
              }
            >
              <Text style={[st.tileText, on ? st.tileTextOn : null]}>{w}</Text>
            </LuxuryPressable>
          );
        })}
      </View>
      {last ? (
        <SubmitButton busy={submitting} onPress={next} />
      ) : (
        <PrimaryButton label={t("รอบถัดไป →", "Next round →")} onPress={next} disabled={submitting} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  progressTrack: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.blue },
  bigCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: C.line,
    paddingVertical: 36,
    alignItems: "center",
  },
  bigWord: { fontSize: 32, fontWeight: "900", color: C.ink, letterSpacing: 0.5 },
  tfRow: { flexDirection: "row", gap: 10 },
  tfBtn: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  tfYes: { backgroundColor: C.green },
  tfNo: { backgroundColor: C.red },
  tfText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: "#fff",
  },
  tileOn: { borderColor: C.blue, backgroundColor: C.blue },
  tileText: { fontSize: 15, fontWeight: "700", color: C.ink },
  tileTextOn: { color: C.yellow },
});
