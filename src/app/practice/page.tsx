"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DictationIntroModal } from "@/components/dictation/DictationIntroModal";
import { FillInBlankIntroModal } from "@/components/fitb/FillInBlankIntroModal";
import { InteractiveSpeakingIntroModal } from "@/components/interactive-speaking/InteractiveSpeakingIntroModal";
import { PracticePageOverview } from "@/components/practice/PracticePageOverview";
import { ReadingSkillsIntroModal } from "@/components/reading/ReadingSkillsIntroModal";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { ReadWriteIntroModal } from "@/components/writing/ReadWriteIntroModal";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import { canAccessSkill } from "@/lib/access-control";
import { mockTestHubProgressLabel } from "@/lib/mock-test/mock-test-availability";
import {
  emitVipApiCreditNotice,
  getVipWeeklyAiFeedbackRemaining,
  thInteractiveSpeakingInsufficientCredits,
  VIP_INTERACTIVE_SPEAKING_API_CALLS_PER_SESSION,
} from "@/lib/vip-ai-feedback-quota";

const hubsWithoutMock = [
  {
    title: "Production",
    subtitle: "Writing & speaking tasks",
    items: [
      {
        label: "Write about photo",
        progress: "5 rounds",
        href: "/practice/production/write-about-photo",
      },
      {
        label: "Read, then write",
        progress: "0/1",
        href: "/practice/production/read-and-write",
      },
      {
        label: "Speak about photo",
        progress: "5 rounds",
        href: "/practice/production/speak-about-photo",
      },
      {
        label: "Read, then speak",
        progress: "0/1",
        href: "/practice/production/read-and-speak",
      },
      {
        label: "Interactive speaking",
        progress: "6 turns / scenario",
        href: "/practice/production/interactive-speaking",
      },
    ],
  },
  {
    title: "Comprehension",
    subtitle: "Reading: vocab & passages",
    items: [
      {
        label: "Vocabulary",
        progress: "0/1",
        href: "/practice/comprehension/vocabulary",
      },
      {
        label: "Reading",
        progress: "0/1",
        href: "/practice/comprehension/reading",
      },
    ],
  },
  {
    title: "Conversation",
    subtitle: "Interactive listening",
    items: [
      {
        label: "Interactive conversation",
        progress: "0/1",
        href: "/practice/listening/interactive",
        skillGate: "conversation" as const,
      },
      {
        label: "Dialogue → summary (AI)",
        progress: "5 rounds",
        href: "/practice/listening/dialogue-summary",
      },
    ],
  },
  {
    title: "Literacy",
    subtitle: "Dictation, FITB, real word",
    items: [
      {
        label: "Dictation",
        progress: "0/1",
        href: "/practice/literacy/dictation",
      },
      {
        label: "Fill in the blank",
        progress: "0/1",
        href: "/practice/literacy/fill-in-blank",
      },
      {
        label: "Real word",
        progress: "0/1",
        href: "/practice/literacy/real-word",
      },
    ],
  },
] as const;

const READING_SKILLS_HREF = "/practice/comprehension/reading";
const DICTATION_HREF = "/practice/literacy/dictation";
const FITB_HREF = "/practice/literacy/fill-in-blank";
const INTERACTIVE_SPEAKING_HREF = "/practice/production/interactive-speaking";
const READ_AND_WRITE_HREF = "/practice/production/read-and-write";

export default function PracticeHubPage() {
  const router = useRouter();
  const { effectiveTier } = useEffectiveTier();
  const vipAiGate = useVipAiFeedbackGate();
  const isVip = effectiveTier === "vip";
  const [readingIntroOpen, setReadingIntroOpen] = useState(false);
  const [dictationIntroOpen, setDictationIntroOpen] = useState(false);
  const [fitbIntroOpen, setFitbIntroOpen] = useState(false);
  const [interactiveSpeakingIntroOpen, setInteractiveSpeakingIntroOpen] = useState(false);
  const [readWriteIntroOpen, setReadWriteIntroOpen] = useState(false);

  const interactiveSpeakingCanStart = vipAiGate.isAdmin
    ? true
    : !vipAiGate.isVip
    ? true
    : !vipAiGate.loading &&
      (!vipAiGate.userId ||
        vipAiGate.remaining >= VIP_INTERACTIVE_SPEAKING_API_CALLS_PER_SESSION);

  const enterInteractiveSpeaking = () => {
    if (vipAiGate.isVip && !vipAiGate.isAdmin) {
      if (vipAiGate.loading) {
        window.alert("กำลังโหลดข้อมูลบัญชีอยู่ครับ โปรดรอสักครู่แล้วลองอีกครั้ง");
        return;
      }
      const uid = vipAiGate.userId;
      if (!uid) {
        window.alert("กรุณาเข้าสู่ระบบเพื่อใช้โควต้า VIP");
        return;
      }
      const rem = getVipWeeklyAiFeedbackRemaining(uid);
      emitVipApiCreditNotice(rem);
      const cost = VIP_INTERACTIVE_SPEAKING_API_CALLS_PER_SESSION;
      if (rem < cost) {
        window.alert(thInteractiveSpeakingInsufficientCredits(cost, rem));
        return;
      }
    }
    router.push(INTERACTIVE_SPEAKING_HREF);
  };

  const readWriteCanStart = vipAiGate.isAdmin
    ? true
    : !vipAiGate.isVip
    ? true
    : !vipAiGate.loading && (!vipAiGate.userId || vipAiGate.remaining >= 1);

  const enterReadAndWrite = () => {
    if (
      vipAiGate.isVip &&
      !vipAiGate.isAdmin &&
      !vipAiGate.loading &&
      vipAiGate.userId
    ) {
      const rem = getVipWeeklyAiFeedbackRemaining(vipAiGate.userId);
      emitVipApiCreditNotice(rem);
      if (rem < 1) {
        window.alert("AI FEEDBACK: You have no remaining VIP grading credit this week. It resets every Monday.");
        return;
      }
    }
    router.push(READ_AND_WRITE_HREF);
  };

  const hubs = useMemo(
    () => [
      ...hubsWithoutMock,
      {
        title: "Mock test",
        subtitle: "Full exam simulation",
        items: [
          {
            label: "Full mock test",
            progress: mockTestHubProgressLabel(),
            href: "/mock-test/start",
          },
        ],
      },
    ],
    [],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <ReadingSkillsIntroModal
        open={readingIntroOpen}
        onOpenChange={setReadingIntroOpen}
        onEnter={() => router.push(READING_SKILLS_HREF)}
      />
      <DictationIntroModal
        open={dictationIntroOpen}
        onOpenChange={setDictationIntroOpen}
        onEnter={() => router.push(DICTATION_HREF)}
      />
      <InteractiveSpeakingIntroModal
        open={interactiveSpeakingIntroOpen}
        onOpenChange={setInteractiveSpeakingIntroOpen}
        onEnter={enterInteractiveSpeaking}
        showCredits={vipAiGate.isVip && !!vipAiGate.userId}
        remaining={vipAiGate.remaining}
        limit={vipAiGate.limit}
        sessionCost={VIP_INTERACTIVE_SPEAKING_API_CALLS_PER_SESSION}
        canStart={interactiveSpeakingCanStart}
      />
      <ReadWriteIntroModal
        open={readWriteIntroOpen}
        onOpenChange={setReadWriteIntroOpen}
        onEnter={enterReadAndWrite}
        showCredits={vipAiGate.isVip && !!vipAiGate.userId}
        remaining={vipAiGate.remaining}
        limit={vipAiGate.limit}
        sessionCost={1}
        canStart={readWriteCanStart}
      />
      <FillInBlankIntroModal
        open={fitbIntroOpen}
        onOpenChange={setFitbIntroOpen}
        onEnter={() => router.push(FITB_HREF)}
      />
      <PracticePageOverview />

      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Practice hub
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Live academic portal</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Each tile mirrors your practice skill lanes. Thumbnails will show last score /
          redeem / review once attempts exist. Your plan and study stats are above.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {hubs.map((hub) => (
          <BrutalPanel
            key={hub.title}
            eyebrow={hub.subtitle}
            title={hub.title}
          >
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-neutral-600">Average score</span>
              <span className="ep-stat text-neutral-400">—</span>
            </div>
            <ul className="space-y-2">
              {hub.items.map((item) => {
                const gate =
                  "skillGate" in item && item.skillGate
                    ? canAccessSkill(effectiveTier, item.skillGate)
                    : null;
                const locked = gate && !gate.allowed;

                if (locked) {
                  return (
                    <li key={item.label}>
                      <div className="flex cursor-not-allowed items-center justify-between rounded-sm border-2 border-dashed border-neutral-400 bg-neutral-100 px-3 py-2 text-sm font-bold text-neutral-500">
                        <span>{item.label}</span>
                        <span className="ep-stat text-xs uppercase text-red-700">
                          Locked
                        </span>
                      </div>
                    </li>
                  );
                }

                if (item.href === READING_SKILLS_HREF) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => setReadingIntroOpen(true)}
                        className="flex w-full items-center justify-between rounded-sm border-2 border-black bg-neutral-50 px-3 py-2 text-left text-sm font-bold hover:bg-ep-yellow/30"
                      >
                        <span>{item.label}</span>
                        <span className="ep-stat text-xs text-neutral-500">
                          {isVip && hub.title !== "Mock test" ? "Unlimited" : item.progress}
                        </span>
                      </button>
                    </li>
                  );
                }

                if (item.href === INTERACTIVE_SPEAKING_HREF) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => setInteractiveSpeakingIntroOpen(true)}
                        className="flex w-full items-center justify-between rounded-sm border-2 border-black bg-neutral-50 px-3 py-2 text-left text-sm font-bold hover:bg-ep-yellow/30"
                      >
                        <span>{item.label}</span>
                        <span className="ep-stat text-xs text-neutral-500">
                          {isVip && hub.title !== "Mock test" ? "Unlimited" : item.progress}
                        </span>
                      </button>
                    </li>
                  );
                }

                if (item.href === READ_AND_WRITE_HREF) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => setReadWriteIntroOpen(true)}
                        className="flex w-full items-center justify-between rounded-sm border-2 border-black bg-neutral-50 px-3 py-2 text-left text-sm font-bold hover:bg-ep-yellow/30"
                      >
                        <span>{item.label}</span>
                        <span className="ep-stat text-xs text-neutral-500">
                          {isVip && hub.title !== "Mock test" ? "Unlimited" : item.progress}
                        </span>
                      </button>
                    </li>
                  );
                }

                if (item.href === DICTATION_HREF) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => setDictationIntroOpen(true)}
                        className="flex w-full items-center justify-between rounded-sm border-2 border-black bg-neutral-50 px-3 py-2 text-left text-sm font-bold hover:bg-ep-yellow/30"
                      >
                        <span>{item.label}</span>
                        <span className="ep-stat text-xs text-neutral-500">
                          {isVip && hub.title !== "Mock test" ? "Unlimited" : item.progress}
                        </span>
                      </button>
                    </li>
                  );
                }

                if (item.href === FITB_HREF) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => setFitbIntroOpen(true)}
                        className="flex w-full items-center justify-between rounded-sm border-2 border-black bg-neutral-50 px-3 py-2 text-left text-sm font-bold hover:bg-ep-yellow/30"
                      >
                        <span>{item.label}</span>
                        <span className="ep-stat text-xs text-neutral-500">
                          {isVip && hub.title !== "Mock test" ? "Unlimited" : item.progress}
                        </span>
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between rounded-sm border-2 border-black bg-neutral-50 px-3 py-2 text-sm font-bold hover:bg-ep-yellow/30"
                    >
                      <span>{item.label}</span>
                      <span className="ep-stat text-xs text-neutral-500">
                        {isVip && hub.title !== "Mock test" ? "Unlimited" : item.progress}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </BrutalPanel>
        ))}
      </div>
    </main>
  );
}
