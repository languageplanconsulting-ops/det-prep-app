import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { PrefixLetterInput } from "../../PrefixLetterInput";
import { useTimeUp } from "../../../hooks/useStepTimer";
import { fitbPrefix } from "../../../lib/campus-fitb";
import { splitFitbPassage } from "../../../lib/fitb-passage";
import { useI18n } from "../../../lib/i18n";
import { C, Note, SubmitButton, TaskInstruction, taskStyles } from "../TaskUi";
import { str, type TaskProps } from "./types";

type MissingWord = { correctWord: string; prefix_length?: number; clue?: string; explanationThai?: string };

/**
 * Passage with [BLANK n] gaps: the first letters are given, the learner types
 * the rest. Sends one remainder string per blank (the website's format).
 */
export function FitbTask({ content, submitting, timeUp, onSubmit, variant }: TaskProps) {
  const { t } = useI18n();
  const passage = str(content.passage);
  const words = useMemo(
    () =>
      (Array.isArray(content.missingWords) ? content.missingWords : []).filter(
        (m): m is MissingWord => !!m && typeof (m as MissingWord).correctWord === "string",
      ),
    [content.missingWords],
  );
  const parts = useMemo(() => splitFitbPassage(passage), [passage]);
  const [inputs, setInputs] = useState<string[]>(() => words.map(() => ""));

  const remLen = (i: number) => fitbPrefix(words[i]!.correctWord, Number(words[i]!.prefix_length ?? 1)).remainingLength;

  useTimeUp(timeUp, () => onSubmit(inputs));

  if (!passage.trim() || words.length === 0) {
    return <Note tone="error">{t("ข้อนี้ไม่มีเนื้อหาเติมคำ", "This fill-in-the-blank task has no content.")}</Note>;
  }

  const ready = inputs.every((v, i) => remLen(i) === 0 || v.trim().length > 0);

  // Short lead-in text before each blank, used as the prompt on its input row.
  const leadIn: string[] = [];
  let lastText = "";
  for (const p of parts) {
    if (p.type === "text") lastText = p.value;
    else if (p.blankIndex >= 0) {
      const tail = lastText.replace(/\s+/g, " ").trim().split(" ").slice(-5).join(" ");
      leadIn[p.blankIndex] = tail ? `…${tail} ____` : "____";
    }
  }

  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th={str(content.instruction_th) || "พิมพ์ตัวอักษรที่เหลือให้ครบคำในแต่ละช่อง"}
        en={str(content.instruction) || "Type the missing letters to complete each word."}
      />
      <View style={taskStyles.passage}>
        <Text style={taskStyles.passageText}>
          {parts.map((p, k) => {
            if (p.type === "text" || p.blankIndex < 0 || !words[p.blankIndex]) {
              return <Text key={k}>{p.type === "text" ? p.value : p.value}</Text>;
            }
            const w = words[p.blankIndex]!;
            const { prefix, remainingLength } = fitbPrefix(w.correctWord, Number(w.prefix_length ?? 1));
            const typed = (inputs[p.blankIndex] ?? "").slice(0, remainingLength);
            const rest = "_".repeat(Math.max(0, remainingLength - typed.length));
            return (
              <Text key={k} style={{ color: C.blue, fontWeight: "800" }}>
                {`[${p.blankIndex + 1}] ${prefix}${typed}${rest}`}
              </Text>
            );
          })}
        </Text>
      </View>
      {words.map((w, i) => (
        <PrefixLetterInput
          key={i}
          index={i}
          promptEn={leadIn[i] ?? ""}
          correctWord={w.correctWord}
          prefixLength={Number(w.prefix_length ?? 1)}
          value={inputs[i] ?? ""}
          disabled={submitting}
          onChange={(v) => setInputs((prev) => prev.map((x, j) => (j === i ? v : x)))}
        />
      ))}
      <SubmitButton
        busy={submitting}
        disabled={!ready}
        label={
          ready
            ? undefined
            : variant === "mini"
              ? t("เติมให้ครบทุกช่องก่อน", "Fill every blank first")
              : t("เติมอย่างน้อย 1 ตัวอักษรทุกช่อง", "Type at least one letter in every blank")
        }
        onPress={() => onSubmit(inputs)}
      />
    </View>
  );
}
