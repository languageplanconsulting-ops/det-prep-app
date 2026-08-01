"use client";

import { PhotoWriteLessonRunner } from "@/components/lessons/PhotoWriteLessonRunner";
import { ReadSpeakLessonRunner } from "@/components/lessons/ReadSpeakLessonRunner";
import { ReadWriteLessonRunner } from "@/components/lessons/ReadWriteLessonRunner";
import { SpeakPhotoLessonRunner } from "@/components/lessons/SpeakPhotoLessonRunner";
import { Frame } from "@/components/course/InlineExercise";
import type { LessonRunnerRef } from "@/lib/course-plan/exercise-content";

/**
 * The photo-write / speak-photo / read-write / read-speak "how to" lessons
 * already run inline elsewhere in the app (cloze template + notebook save
 * built in) — this just drops the same runner into the course session modal
 * instead of the standalone /practice/lessons pages.
 */
export function LessonRunnerInline({
  lessonRef,
  titleTh,
  onDone,
  onCancel,
}: {
  lessonRef: LessonRunnerRef;
  titleTh: string;
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
}) {
  const finish = (pct: number) => onDone(Math.round(pct / 100), 1);

  return (
    <Frame title={titleTh} onCancel={onCancel}>
      {lessonRef.kind === "photowrite" ? (
        <PhotoWriteLessonRunner tier={lessonRef.tier} unit={lessonRef.unit} onDone={finish} />
      ) : null}
      {lessonRef.kind === "speakphoto" ? (
        <SpeakPhotoLessonRunner tier={lessonRef.tier} unit={lessonRef.unit} onDone={finish} />
      ) : null}
      {lessonRef.kind === "readwrite" ? (
        <ReadWriteLessonRunner tier={lessonRef.tier} unit={lessonRef.unit} onDone={finish} />
      ) : null}
      {lessonRef.kind === "readspeak" ? (
        <ReadSpeakLessonRunner tier={lessonRef.tier} unit={lessonRef.unit} onDone={finish} />
      ) : null}
    </Frame>
  );
}
