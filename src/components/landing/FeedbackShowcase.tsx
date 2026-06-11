"use client";

import { useState, type ReactNode } from "react";

function cx(...p: (string | false | undefined)[]) {
  return p.filter(Boolean).join(" ");
}

/* ---- small shared pieces ---------------------------------------------- */

function Bar({ label, score, width, warn }: { label: string; score: string; width: string; warn?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-600">{label}</span>
        <span className={cx("font-mono text-sm font-semibold", warn ? "text-amber-600" : "text-gray-800")}>
          {score}
          <span className="font-normal text-gray-400">/100</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={cx("h-full rounded-full", warn ? "bg-amber-500" : "bg-ep-blue")} style={{ width }} />
      </div>
    </div>
  );
}

function EpNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ep-blue">
          <span className="font-mono text-[10px] font-bold text-white">EP</span>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
            โน้ตจาก English Plan (ภาษาไทย)
          </p>
          <div className="text-sm leading-relaxed text-gray-800">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---- slides ----------------------------------------------------------- */

type Slide = { key: string; tab: string; icon: string; label: string; value: string; body: ReactNode };

const SLIDES: Slide[] = [
  {
    key: "production",
    tab: "เขียน/พูด",
    icon: "✍️",
    label: "production · speaking-response",
    value: "ฝึกเรียบเรียงความคิดเป็นภาษาอังกฤษ — ส่วนที่ดันคะแนนรวมได้เยอะที่สุด",
    body: (
      <>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">คำถาม</p>
        <p className="mb-4 text-sm italic leading-relaxed text-gray-600">
          &quot;Describe a habit that helps you stay productive. Give details.&quot;
        </p>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">คำตอบของนักเรียน</p>
        <p className="mb-4 text-sm leading-relaxed text-gray-700">
          I always wake up early. I make a list of things to do. This habit{" "}
          <span className="cursor-default border-b border-yellow-400 bg-yellow-100" title="tense ควรเป็น helps">helped</span>{" "}
          me finish my work on time. Also, I drink coffee{" "}
          <span className="cursor-default border-b border-blue-300 bg-blue-50" title="ลองใช้ which boosts my focus">because it is good for concentrate.</span>
        </p>
        <div className="mb-4 flex items-center justify-end gap-2">
          <span className="text-[10px] text-gray-400">Band โดยประมาณ</span>
          <span className="font-mono text-lg font-bold text-ep-blue">120–130</span>
        </div>
        <div className="mb-5 space-y-3">
          <Bar label="Grammar" score="92" width="92%" />
          <Bar label="Vocabulary" score="88" width="88%" />
          <Bar label="Flow & Coherence" score="79" width="79%" warn />
          <Bar label="Task Response" score="90" width="90%" />
        </div>
        <EpNote>
          ประโยคที่ 3 ใช้ <span className="font-mono font-medium text-ep-blue">helped</span> tense ไม่ถูก — ควรเป็น{" "}
          <span className="font-mono font-medium text-green-700">helps</span> เพราะเป็นนิสัยที่ทำอยู่ตลอด แก้แล้วคะแนน Flow ขึ้นทันที
          ลองต่อประโยคด้วย <span className="font-mono font-medium text-ep-blue">which helps me</span> ให้ลื่นขึ้น
        </EpNote>
      </>
    ),
  },
  {
    key: "reading",
    tab: "การอ่าน",
    icon: "📖",
    label: "comprehension · reading",
    value: "อ่านให้ทันเวลา + จับใจความให้แม่น — ทักษะที่ติดตัวไปใช้ได้จริง ไม่ใช่แค่ในห้องสอบ",
    body: (
      <>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">บทความ</p>
        <p className="mb-4 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
          More city workers now{" "}
          <span className="cursor-default rounded bg-yellow-100 px-0.5" title="commute = การเดินทางไป-กลับที่ทำงาน">commute</span>{" "}
          by bicycle. It is cheaper than driving, faster in heavy traffic, and better for the environment.
        </p>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">ใจความหลักของย่อหน้านี้คือ?</p>
        <div className="mb-4 space-y-2">
          {[
            ["Bicycles are expensive to maintain.", false],
            ["Cycling to work has several advantages.", true],
            ["Traffic in cities is getting worse.", false],
          ].map(([opt, correct]) => (
            <div
              key={opt as string}
              className={cx(
                "flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm",
                correct ? "border-green-300 bg-green-50 font-semibold text-green-800" : "border-gray-200 text-gray-600",
              )}
            >
              <span>{opt as string}</span>
              {correct ? <span className="font-bold text-green-600">✓</span> : null}
            </div>
          ))}
        </div>
        <EpNote>
          <ul className="space-y-1.5">
            <li>• <b>เดาคำจากบริบท:</b> ไม่รู้คำว่า <span className="font-mono text-ep-blue">commute</span>? ดูคำรอบ ๆ — &quot;by bicycle… to work&quot; ช่วยให้เดาได้ว่าคือ &quot;การเดินทางไปทำงาน&quot;</li>
            <li>• <b>จับ main idea:</b> ประโยคแรกมักบอกหัวข้อ ส่วนที่เหลือคือเหตุผล — รวมแล้วคือ &quot;ข้อดีของการปั่นจักรยานไปทำงาน&quot;</li>
          </ul>
        </EpNote>
      </>
    ),
  },
  {
    key: "dictation",
    tab: "ฟังพิมพ์",
    icon: "⌨️",
    label: "literacy · dictation",
    value: "ฝึกหูจับเสียง + สะกดให้เป๊ะ — คะแนนพื้นฐานที่หลายคนเสียไปฟรี ๆ",
    body: (
      <>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">🔊 เสียงที่ได้ยิน</p>
        <p className="mb-4 rounded-xl bg-gray-50 p-4 text-sm font-medium text-gray-800">
          She has already finished her assignment.
        </p>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">ที่คุณพิมพ์</p>
        <p className="mb-4 rounded-xl border border-gray-200 p-4 text-sm leading-relaxed text-gray-700">
          She has <span className="cursor-default bg-red-100 px-0.5 line-through decoration-red-400" title="คำเสียงเหมือน: all ready → already">all ready</span>{" "}
          <span className="cursor-default bg-amber-100 px-0.5" title="ลืมเติม -ed: finish → finished">finish</span> her assignment.
        </p>
        <EpNote>
          <p className="mb-2 font-semibold text-gray-900">ข้อผิดที่เจอบ่อยใน Dictation:</p>
          <ul className="space-y-1.5">
            <li>• <b>คำเสียงเหมือนกัน:</b> all ready ↔ <span className="font-mono text-green-700">already</span>, their ↔ there, its ↔ it&apos;s</li>
            <li>• <b>ลืม -ed / -s ท้ายคำ:</b> finish → <span className="font-mono text-green-700">finished</span></li>
            <li>• <b>ตกคำเล็ก ๆ:</b> a, the, has — ฟังเร็วแล้วหลุดง่าย</li>
          </ul>
        </EpNote>
      </>
    ),
  },
  {
    key: "fitb",
    tab: "เติมคำ",
    icon: "✏️",
    label: "literacy · fill-in-blank",
    value: "ฝึกแกรมมาร์ + คำที่ไปด้วยกัน (collocation) ในประโยคจริง",
    body: (
      <>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">เติมคำให้ถูก</p>
        <p className="mb-4 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">
          Researchers have found strong evidence that regular exercise{" "}
          <span className="rounded bg-blue-100 px-2 font-mono font-semibold text-ep-blue">improves</span> memory.
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 line-through">improve</span>
          <span className="text-gray-400">→</span>
          <span className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 font-semibold text-green-700">improves ✓</span>
        </div>
        <EpNote>
          <ul className="space-y-1.5">
            <li>• <b>ประธานเอกพจน์:</b> &quot;exercise&quot; เป็นเอกพจน์ → กริยาเติม <span className="font-mono text-green-700">-s</span> (improves)</li>
            <li>• <b>Collocation:</b> <span className="font-mono text-ep-blue">improve + memory</span> เป็นคู่คำที่เจอบ่อยในข้อสอบ — จำเป็นชุดจะเดาช่องว่างได้เร็วขึ้น</li>
          </ul>
        </EpNote>
      </>
    ),
  },
  {
    key: "interactive",
    tab: "พูดโต้ตอบ",
    icon: "💬",
    label: "production · interactive-speaking",
    value: "ฝึกตอบโต้แบบสด — รับมือคำถามต่อเนื่องเหมือนข้อสอบจริง",
    body: (
      <>
        <div className="space-y-2.5">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 text-sm text-gray-800">
              Tell me about a place you would like to visit.
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-ep-blue px-4 py-2.5 text-sm text-white">
              I&apos;d love to visit Japan <b>because</b> I&apos;m really into its food culture. <b>For example</b>, I want to try authentic ramen in Tokyo.
            </div>
          </div>
        </div>
        <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider text-gray-400">
          คำถามต่อเนื่องที่มักโผล่จริงในข้อสอบ
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {["Why do you want to go there?", "Who would you go with?", "How would you prepare for the trip?"].map((q) => (
            <span key={q} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600">
              {q}
            </span>
          ))}
        </div>
        <EpNote>
          <p className="mb-2 font-semibold text-gray-900">วิธีตอบให้ลื่น (ไม่ห้วน):</p>
          <ul className="space-y-1.5">
            <li>• ใช้โครงสร้าง <b>ตอบ → เหตุผล → ตัวอย่าง</b></li>
            <li>• ต่อประโยคด้วยตัวเชื่อม: <span className="font-mono text-ep-blue">because</span>, <span className="font-mono text-ep-blue">for example</span>, <span className="font-mono text-ep-blue">that&apos;s why</span></li>
            <li>• ฝึกบ่อย ๆ จนตอบคำถามต่อเนื่องได้โดยไม่ตื่นเต้น</li>
          </ul>
        </EpNote>
      </>
    ),
  },
  {
    key: "mock",
    tab: "Mock test",
    icon: "📝",
    label: "mock test · full report",
    value: "เห็นภาพรวมเหมือนสอบจริง + รู้ว่าต้องเก็บ 2 ทักษะไหนก่อนให้ถึงเป้าเร็วสุด",
    body: (
      <>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">ผลสอบเต็มรูปแบบ</span>
          <span className="font-mono text-lg font-bold text-ep-blue">รวม 108/160</span>
        </div>
        <div className="mb-4 space-y-3">
          {([
            ["✍️ Writing", "85", "53%", true],
            ["🗣️ Speaking", "95", "59%", true],
            ["📖 Reading", "120", "75%", false],
            ["🎧 Listening", "130", "81%", false],
          ] as const).map(([label, score, width, weak]) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between">
                <span className={cx("text-xs", weak ? "font-medium text-gray-700" : "text-gray-600")}>
                  {label}
                  {weak ? <span className="ml-1 text-[10px] font-bold text-red-600">จุดอ่อน</span> : null}
                </span>
                <span className={cx("font-mono text-xs font-semibold", weak ? "text-red-600" : "text-gray-700")}>{score}/160</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className={cx("h-full rounded-full", weak ? "bg-red-400" : "bg-ep-blue")} style={{ width }} />
              </div>
            </div>
          ))}
        </div>
        <EpNote>
          <b>เก็บ Writing + Speaking ก่อน</b> 2 ทักษะนี้ฉุดคะแนนรวมอยู่ — โฟกัสตรงนี้จะขึ้นถึงเป้าได้เร็วกว่าฝึกกระจายทุกอย่าง
        </EpNote>
      </>
    ),
  },
];

export function FeedbackShowcase() {
  const [active, setActive] = useState(0);
  const n = SLIDES.length;
  const slide = SLIDES[active];

  return (
    <div>
      <style>{`@keyframes epFbIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.ep-fb-in{animation:epFbIn .35s ease both}@media (prefers-reduced-motion: reduce){.ep-fb-in{animation:none}}`}</style>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setActive(i)}
            className={cx(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
              i === active ? "bg-ep-blue text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            <span>{s.icon}</span>
            {s.tab}
          </button>
        ))}
      </div>

      {/* Card */}
      <div key={active} className="ep-fb-in overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-2 font-mono text-xs text-gray-400">{slide.label}</span>
        </div>
        <div className="border-b border-blue-100/70 bg-blue-50/40 px-5 py-3">
          <p className="flex items-start gap-2 text-xs font-medium leading-relaxed text-ep-blue">
            <span>💡</span>
            <span><span className="font-bold">ทำไมต้องฝึก:</span> {slide.value}</span>
          </p>
        </div>
        <div className="p-5">{slide.body}</div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActive((a) => (a - 1 + n) % n)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:text-ep-blue"
          aria-label="ก่อนหน้า"
        >
          ‹
        </button>
        <div className="flex gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`สไลด์ ${i + 1}`}
              className={cx("h-2 rounded-full transition-all", i === active ? "w-6 bg-ep-blue" : "w-2 bg-gray-300 hover:bg-gray-400")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setActive((a) => (a + 1) % n)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:text-ep-blue"
          aria-label="ถัดไป"
        >
          ›
        </button>
      </div>
    </div>
  );
}
