"use client";

import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase-browser";

type Step = {
  n: number;
  title: string;
  tag: string;
  tagVariant: "fast" | "med" | "slow";
  body: string;
};

const STEPS: Step[] = [
  {
    n: 1,
    title: "Production (Writing & Speaking)",
    tag: "เพิ่มคะแนนเร็วสุด",
    tagVariant: "fast",
    body:
      'ทุกอย่างที่เกี่ยวกับการเขียนและการพูด — ฝึกที่บ้านได้ง่ายและ "หลีกเลี่ยง" จุดอ่อนที่รู้แล้วได้ เช่น ' +
      "ถ้ารู้ว่าเขียน complex sentence ไม่แม่น ก็ใช้ simple sentence ก่อนได้ Speaking ก็เช่นกัน " +
      "ถ้ารู้ว่าคำไหนออกเสียงไม่ถนัด ก็เลี่ยงไปใช้คำอื่นได้ ทำให้คะแนนส่วนนี้เพิ่มขึ้นได้เร็วมาก",
  },
  {
    n: 2,
    title: "Literacy — Dictation",
    tag: "เห็นผลชัด",
    tagVariant: "fast",
    body:
      "ฟังแล้วพิมพ์ตาม หลายคนพลาดคะแนนส่วนนี้ไปโดยไม่รู้ตัว เพราะไม่ใช่แค่การสะกดคำ " +
      "แต่ที่พลาดบ่อยที่สุดคือ Grammar ปลายประโยค และ comma (,) " +
      "ฝึกบ่อย ๆ คะแนนขึ้นเร็วเพราะสิ่งที่ต้องฝึกมีจำกัดและชัดเจน",
  },
  {
    n: 3,
    title: "Conversation",
    tag: "จำ scenario = ได้เปรียบ",
    tagVariant: "med",
    body:
      "ข้อสอบส่วนนี้ไม่ได้วัดว่าเราคุยเก่งแค่ไหน แต่วัดว่าเราเข้าใจ scenario หรือเปล่า " +
      "ถ้าเคยเจอ scenario นั้นมาก่อน โอกาสทำคะแนนได้ดีขึ้นเกือบ 50% ทันที " +
      "คำศัพท์ส่วนนี้เป็นคำในชีวิตประจำวันและ Campus Life ระดับไม่ยากมาก",
  },
  {
    n: 4,
    title: "Comprehension (Reading & Vocabulary)",
    tag: "ยากที่สุด",
    tagVariant: "slow",
    body:
      "ส่วนที่ยากและใช้เวลานานที่สุดในการเพิ่มคะแนน เพราะคำศัพท์มีมหาศาล ออกอะไรก็ได้ " +
      "ถ้าพื้นฐานยังไม่แข็งแรง อย่าเพิ่งโฟกัสตรงนี้ — กลับมาฝึกหลังจากที่ Production, Dictation, " +
      "Conversation ขึ้นมาในระดับนึงแล้วครับ",
  },
];

const TAG_CLASS: Record<Step["tagVariant"], string> = {
  fast: "bg-emerald-500 text-white",
  med: "bg-ep-yellow text-black",
  slow: "bg-pink-500 text-white",
};

/**
 * Shown on the Practice hub for signed-in users — explains the recommended
 * order of practice to lift scores fastest.
 */
export function DashboardHowToUseAnnouncement() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setSignedIn(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setSignedIn(!!data.user);
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!signedIn) return null;

  return (
    <section
      className="ep-brutal rounded-sm border-black bg-gradient-to-b from-ep-yellow/35 to-white p-5 shadow-[4px_4px_0_0_#000]"
      aria-labelledby="practice-howto-announcement-title"
    >
      <h2
        id="practice-howto-announcement-title"
        className="border-b-4 border-black pb-2 text-lg font-black text-ep-blue"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        วิธีใช้แอปนี้ให้ได้คะแนนเพิ่มขึ้นเร็วที่สุด
      </h2>

      <p className="mt-4 text-sm leading-relaxed text-neutral-900">
        ก่อนอื่นเลย สิ่งที่แนะนำให้ทำเป็นอันดับแรกคือการทำ <b>Mock Test</b> ก่อน
        ไม่ต้องรีบทำข้อสอบแบบสุ่มเลย ให้ใช้เวลา 1–2 ชั่วโมงทำ Mock Test ให้เสร็จก่อน
        แล้วระบบจะบอกเองว่าจุดอ่อนของเราคืออะไร — ไม่ใช่แค่บอกกว้าง ๆ ว่า &ldquo;อ่อน Reading&rdquo;
        แต่จะบอกละเอียดเลยว่าคำถามประเภทไหนที่ทำให้คะแนนรวมหล่นมากที่สุด เช่น Dictation,
        Essay Writing หรือ Speaking เพื่อให้เราวางแผนการเรียนได้ตรงจุด
      </p>

      <div
        className="mt-5 text-xs font-black uppercase tracking-wider text-black"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        ▌ ลำดับความสำคัญในการฝึก
      </div>

      <ol className="mt-3 space-y-4">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="relative rounded-sm border-[2.5px] border-black bg-white p-4 pl-12 shadow-[3px_3px_0_0_#000]"
          >
            <span
              className="absolute -left-3.5 -top-3.5 grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-black bg-ep-yellow shadow-[2px_2px_0_0_#000]"
              style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 800 }}
            >
              {s.n}
            </span>
            <h3 className="text-sm font-extrabold leading-snug">
              {s.title}{" "}
              <span
                className={`ml-1 inline-block border-2 border-black px-2 py-[1px] align-middle text-[10px] font-black uppercase tracking-wider ${TAG_CLASS[s.tagVariant]}`}
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              >
                {s.tag}
              </span>
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-800">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-sm border-[2.5px] border-black bg-black p-4 text-[13px] leading-relaxed text-white">
        <b className="text-ep-yellow">สรุปแผน:</b> ทำ Mock Test ก่อน 1 ครั้ง →
        ดูว่าส่วนไหนทำคะแนนหล่นมากที่สุด → เริ่มฝึกตาม priority ข้างต้น →{" "}
        <b>อย่าสุ่มทำข้อสอบโดยไม่มีแผน</b> เพราะจะเสียเวลาโดยไม่เห็นผลครับ
      </div>
    </section>
  );
}
