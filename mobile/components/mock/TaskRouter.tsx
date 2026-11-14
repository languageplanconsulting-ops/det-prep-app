import { useI18n } from "../../lib/i18n";
import { Note } from "./TaskUi";
import { ConversationMcqTask, ConversationSummaryTask } from "./tasks/ConversationTasks";
import { DictationTask } from "./tasks/DictationTask";
import { FitbTask } from "./tasks/FitbTask";
import { InteractiveSpeakingTask } from "./tasks/InteractiveSpeakingTask";
import { ListeningTask } from "./tasks/ListeningTask";
import { ReadThenSpeakTask, ReadWriteTask, SpeakPhotoTask, WritePhotoTask } from "./tasks/ProductionTasks";
import { RealWordTask } from "./tasks/RealWordTask";
import { VocabReadingTask } from "./tasks/VocabReadingTask";
import type { TaskProps } from "./tasks/types";

/** Task types whose step clock waits for the task (audio listened / photo shown). */
export const GATED_TASKS = new Set(["dictation", "speak_about_photo"]);

/**
 * Renders one exam step and wraps its answer exactly like the website's
 * QuestionRouter, so submit-step grades it the same way.
 */
export function TaskRouter({ taskType, ...props }: TaskProps & { taskType: string }) {
  const { t } = useI18n();
  const { variant, onSubmit } = props;
  switch (taskType) {
    case "fill_in_blanks":
      return (
        <FitbTask
          {...props}
          onSubmit={(answers) => onSubmit(variant === "mock" ? { answer: { answers } } : { answers })}
        />
      );
    case "dictation":
      return <DictationTask {...props} onSubmit={(text) => onSubmit({ answer: text })} />;
    case "real_english_word":
      return <RealWordTask {...props} />;
    case "vocabulary_reading":
      return <VocabReadingTask {...props} />;
    case "interactive_listening":
      return <ListeningTask {...props} />;
    case "write_about_photo":
      return <WritePhotoTask {...props} />;
    case "speak_about_photo":
      return <SpeakPhotoTask {...props} />;
    case "read_then_speak":
      return <ReadThenSpeakTask {...props} />;
    case "read_and_write":
    case "essay_writing":
      return <ReadWriteTask {...props} />;
    case "interactive_speaking":
      return <InteractiveSpeakingTask {...props} />;
    case "interactive_conversation_mcq":
      return <ConversationMcqTask {...props} />;
    case "conversation_summary":
    case "summarize_conversation":
      return <ConversationSummaryTask {...props} />;
    default:
      return (
        <Note tone="error">
          {t(
            `ข้อนี้ยังเปิดในแอปไม่ได้ (${taskType}) — คำตอบก่อนหน้าบันทึกไว้แล้ว ทำข้อนี้ต่อบนเว็บไซต์ได้`,
            `This task type (${taskType}) can't open in the app yet — your earlier answers are saved; continue on the website.`,
          )}
        </Note>
      );
  }
}
