"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * EssayHintPanel — course-only ("Fast Track" VIP) answer-pattern scaffold for the
 * Read-and-then-write (essay) exam. Unlocked for VIP (incl. course-granted VIP);
 * everyone else sees a locked teaser (marking criteria + step-1 peek + CTA).
 *
 * Built from P'Doy's teaching framework: 3 question types, each with a sentence
 * scaffold + phrase/grammar banks, common topics, and B1/B2/C1 sample answers.
 */

type Step = { en: string; th: string };
type EssayType = {
  key: string;
  label: string;
  examples: string;
  steps: Step[];
  vocab: string[];
  grammar: string[];
};

const TYPES: EssayType[] = [
  {
    key: "why",
    label: "1 · What are…? / Why…?",
    examples: "ข้อดี–ข้อเสียของ social media · เหตุผลที่ควรปกป้องป่า · ข้อดี–ข้อเสียของ online shopping",
    steps: [
      { en: "[Topic] has become a popular alternative to [traditional ___].", th: "เกริ่นนำ" },
      { en: "The benefits of ___ include ___, ___, and ___.", th: "ข้อดี" },
      { en: "Additionally, ___ also enables [people] to develop ___ skills.", th: "เสริมข้อดี" },
      { en: "However, ___ also has some drawbacks. Firstly, ___, which can lead to feelings of isolation or detachment. Secondly, ___.", th: "ข้อเสีย" },
      { en: "Despite these drawbacks, ___ has become an increasingly viable option for ___.", th: "สรุป" },
    ],
    vocab: [
      "a popular alternative to", "drawbacks / disadvantages", "viable option",
      "technical issues", "challenge", "well-suited to", "self-directed",
      "prevalence", "cost-effective", "gain insight into", "utilize",
      "access information", "has the potential to", "enable (sb) to", "resulting in",
    ],
    grammar: [
      "…, especially …", "With …, they can …", "…, such as …",
      "…, which can lead to …", "enable something to + V.inf",
      "…, resulting in …", "by + V-ing", "contribute to … + V-ing",
    ],
  },
  {
    key: "opinion",
    label: "2 · Opinion",
    examples: "อยู่เมือง vs ชนบท · social media ทำให้สื่อสารง่ายหรือยากขึ้น · รัฐควรให้เรียนฟรีไหม",
    steps: [
      { en: "In my opinion, ___. / I strongly believe that ___.", th: "บอกจุดยืน" },
      { en: "Firstly, ___. For example, ___.", th: "เหตุผล 1 + ตัวอย่าง" },
      { en: "Secondly, ___.", th: "เหตุผล 2" },
      { en: "On the other hand, some people argue that ___. However, ___.", th: "ยอมรับอีกมุม" },
      { en: "In conclusion, I believe that ___ because ___.", th: "สรุปย้ำจุดยืน" },
    ],
    vocab: [
      "in my opinion", "I strongly believe", "from my perspective",
      "there is no doubt that", "it is undeniable that", "play a crucial role",
      "the advantages outweigh the disadvantages", "compelling", "beneficial",
    ],
    grammar: [
      "While some argue that …, I believe …",
      "comparatives: better than / more important than",
      "not only … but also …",
    ],
  },
  {
    key: "descriptive",
    label: "3 · Descriptive",
    examples: "สถานที่ที่มีความหมาย · คนที่ชื่นชม · ความทรงจำกับเพื่อน · บ้านเกิด · ของที่มีคุณค่าทางใจ",
    steps: [
      { en: "One [place/person/object] that holds special meaning to me is ___.", th: "เกริ่นถึงสิ่งนั้น" },
      { en: "It is ___ / He/She is ___. Whenever I ___, I ___.", th: "บรรยายรายละเอียด" },
      { en: "What makes it special is ___.", th: "ทำไมพิเศษ" },
      { en: "Being there / With them, I feel ___.", th: "ความรู้สึก" },
      { en: "Overall, ___ will always hold a special place in my heart.", th: "สรุป" },
    ],
    vocab: [
      "holds special meaning", "sentimental value", "evokes memories of",
      "a sense of (peace / belonging)", "cherish", "remarkable", "serene",
      "nostalgic", "vivid", "admire",
    ],
    grammar: [
      "Whenever I …, I …", "relative clauses: …, who/which …",
      "It is + adjective + to …",
    ],
  },
];

const COMMON_TOPICS: string[] = [
  "Technology and its impact on society",
  "The importance of education / family and friends",
  "The role of [X] in our lives",
  "Environmental issues and sustainability",
  "Advantages & disadvantages of living in a city / countryside",
  "Effects of social media on communication and relationships",
  "The importance of work–life balance",
  "The role of governments in social & economic issues",
  "Benefits and challenges of travel and cultural exchange",
  "The impact of advertising on consumer behavior",
];

const SAMPLES: { level: string; band: string; text: string }[] = [
  {
    level: "B1",
    band: "พื้นฐาน",
    text: "Social media has both benefits and drawbacks. On the one hand, it helps people connect with friends and family around the world and share news quickly. On the other hand, it can waste a lot of time and reduce face-to-face contact. In my opinion, social media is useful, but we should use it carefully and not too much.",
  },
  {
    level: "B2",
    band: "90–115",
    text: "Social media has become a part of daily life, offering clear benefits and drawbacks. On the positive side, it lets individuals and businesses reach a global audience, share information, and stay connected. However, it also affects mental health: constant notifications can cause anxiety, and fake news spreads easily. Overall, while social media creates many opportunities, users should be aware of its risks and use it in a balanced, responsible way.",
  },
  {
    level: "C1",
    band: "120–140",
    text: "Social media has become a ubiquitous aspect of modern society, offering both advantages and disadvantages. On the one hand, it is a powerful tool for communication and information sharing, enabling people to build communities and businesses to reach new customers. On the other hand, its prevalence raises serious concerns: constant exposure can contribute to anxiety and addiction, while misinformation undermines public trust. In conclusion, although social media offers considerable benefits, it must be used in a measured, critical manner to minimise its drawbacks.",
  },
];

function Criteria() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {["Vocab", "Grammar", "Relevance", "Length"].map((c) => (
        <span key={c} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {c}
        </span>
      ))}
      <span className="rounded-full bg-[#FFCC00]/30 px-2.5 py-1 text-[11px] font-bold text-[#7a5b1a]">
        เขียนอย่างน้อย 50 คำ
      </span>
    </div>
  );
}

export function EssayHintPanel({ unlocked }: { unlocked: boolean }) {
  const [active, setActive] = useState(0);

  if (!unlocked) {
    return (
      <div className="rounded-2xl border border-[#FFCC00]/60 bg-[#fffaf0] p-5 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2">
          <span className="text-base">🔒</span>
          <p className="text-sm font-bold text-slate-800">
            แพตเทิร์นเรียงความ + คลังคำ/ไวยากรณ์ — เฉพาะนักเรียนคอร์ส Fast Track (VIP)
          </p>
        </div>
        <div className="mt-3"><Criteria /></div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-mono text-sm text-slate-800">
            1. This topic has become a popular alternative to ______.
          </p>
          <div className="mt-2 select-none space-y-1.5 blur-[5px]" aria-hidden>
            <p className="font-mono text-sm text-slate-700">2. The benefits of ___ include ___, ___, and ___.</p>
            <p className="font-mono text-sm text-slate-700">3. However, ___ also has some drawbacks. Firstly, …</p>
            <p className="text-xs text-slate-500">+ แพตเทิร์น 3 ประเภทโจทย์ · คลังคำ/ไวยากรณ์ · หัวข้อที่ออกบ่อย · ตัวอย่าง B1/B2/C1</p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#004AAD] px-4 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90"
        >
          ปลดล็อกด้วย VIP / Fast Track →
        </Link>
      </div>
    );
  }

  const t = TYPES[active];

  return (
    <div className="rounded-2xl border border-[#004AAD]/15 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          👑 Fast Track VIP
        </span>
        <p className="text-sm font-bold text-slate-800">แพตเทิร์นเรียงความจากพี่ดอย</p>
      </div>

      {/* marking criteria */}
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">เกณฑ์ให้คะแนน</p>
        <Criteria />
      </div>

      {/* type tabs */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {TYPES.map((ty, i) => (
          <button
            key={ty.key}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              active === i
                ? "bg-[#004AAD] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {ty.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs leading-6 text-slate-500">
        <span className="font-semibold text-slate-600">ตัวอย่างโจทย์:</span> {t.examples}
      </p>

      {/* scaffold */}
      <div className="mt-3 space-y-2">
        {t.steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold leading-6 text-slate-900 break-words">{s.en}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.th}</p>
            </div>
          </div>
        ))}
      </div>

      {/* vocab + grammar (collapsible) */}
      <details className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
          📚 คำ &amp; วลีที่ใช้บ่อย <span className="text-xs font-normal text-slate-400">({t.vocab.length})</span>
        </summary>
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-3">
          {t.vocab.map((w) => (
            <span key={w} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-800">{w}</span>
          ))}
        </div>
      </details>
      <details className="mt-2 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
          ✏️ จุดไวยากรณ์
        </summary>
        <ul className="space-y-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-700">
          {t.grammar.map((g) => (
            <li key={g} className="font-mono">• {g}</li>
          ))}
        </ul>
      </details>

      {/* common topics */}
      <details className="mt-2 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
          🔥 หัวข้อที่ออกบ่อย
        </summary>
        <ol className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-700">
          {COMMON_TOPICS.map((topic, i) => (
            <li key={topic}>{i + 1}. {topic}</li>
          ))}
        </ol>
      </details>

      {/* sample answers */}
      <details className="mt-2 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
          📄 ตัวอย่างคำตอบ <span className="text-xs font-normal text-slate-400">(หัวข้อ social media · B1/B2/C1)</span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {SAMPLES.map((s) => (
            <div key={s.level} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#004AAD]">
                {s.level} <span className="font-normal text-slate-400">· {s.band}</span>
              </p>
              <p className="text-[13px] leading-6 text-slate-700">{s.text}</p>
            </div>
          ))}
        </div>
      </details>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        💡 พี่ดอย: เลือกประเภทโจทย์ → เขียนตามโครง 5 ขั้น → หยิบคำ/วลีมาเสริม ให้ครบ Vocab · Grammar · Relevance · Length
      </p>
    </div>
  );
}
