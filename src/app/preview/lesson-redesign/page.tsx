"use client";

import { useState, type ReactNode } from "react";

type Variant = "cards" | "detective" | "visual" | "lecture";

const COACH_IMG = "https://i.postimg.cc/Pxyw0bwR/Untitled-September-20-2025-at-16-21-25.png";

export default function LessonRedesignPreview() {
  const [variant, setVariant] = useState<Variant>("cards");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700">
              UX Redesign Preview
            </p>
            <h1 className="text-sm font-bold">Mini Study · FANBOYS lesson</h1>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            <Tab v="cards" cur={variant} set={setVariant}>1 · Cards</Tab>
            <Tab v="detective" cur={variant} set={setVariant}>2 · Detective</Tab>
            <Tab v="visual" cur={variant} set={setVariant}>3 · Visual</Tab>
            <Tab v="lecture" cur={variant} set={setVariant}>📖 สรุป</Tab>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {variant === "cards" && <CardStackVariant />}
        {variant === "detective" && <DetectiveVariant />}
        {variant === "visual" && <VisualVariant />}
        {variant === "lecture" && <LectureSummary />}
      </div>
    </main>
  );
}

function Tab({ v, cur, set, children }: { v: Variant; cur: Variant; set: (v: Variant) => void; children: ReactNode }) {
  const active = cur === v;
  return (
    <button
      onClick={() => set(v)}
      className={`rounded-md px-3 py-1.5 font-semibold transition ${
        active ? "bg-[#004AAD] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
   Inline bold/italic markdown renderer
   ============================================================ */
function md(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={key++} className="font-bold text-slate-900">{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={key++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Para({ children }: { children: string }) {
  return <p className="text-[15px] leading-7 text-slate-700">{md(children)}</p>;
}

/* ============================================================
   VARIANT 1 — Card stack (FULL content, broken into cards)
   ============================================================ */

type Card =
  | { kind: "hook" }
  | { kind: "rule1-intro" }
  | { kind: "rule1-examples" }
  | { kind: "rule1-warning" }
  | { kind: "rule1-quiz" }
  | { kind: "rule2-intro" }
  | { kind: "rule2-front" }
  | { kind: "rule2-back" }
  | { kind: "rule2-quiz" }
  | { kind: "how-to" }
  | { kind: "done" };

const CARDS: Card[] = [
  { kind: "hook" },
  { kind: "rule1-intro" },
  { kind: "rule1-examples" },
  { kind: "rule1-warning" },
  { kind: "rule1-quiz" },
  { kind: "rule2-intro" },
  { kind: "rule2-front" },
  { kind: "rule2-back" },
  { kind: "rule2-quiz" },
  { kind: "how-to" },
  { kind: "done" },
];

function CardStackVariant() {
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const pct = Math.round(((i + 1) / CARDS.length) * 100);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>การ์ดที่ {i + 1} / {CARDS.length}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-[#004AAD] transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-1">
          {CARDS.map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded-full transition ${idx <= i ? "bg-[#004AAD]" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      <div className="min-h-[440px] rounded-3xl bg-white p-7 shadow-md ring-1 ring-slate-200">
        {card.kind === "hook" && <HookCard />}
        {card.kind === "rule1-intro" && <Rule1Intro />}
        {card.kind === "rule1-examples" && <Rule1Examples />}
        {card.kind === "rule1-warning" && <Rule1Warning />}
        {card.kind === "rule1-quiz" && <QuizCard sentence="She loves coffee but he prefers tea." answer={17} hint="มองหา FANBOYS (but) — มีประธาน 'he' ตามหลัง ใส่ comma ก่อน 'but'" />}
        {card.kind === "rule2-intro" && <Rule2Intro />}
        {card.kind === "rule2-front" && <Rule2Front />}
        {card.kind === "rule2-back" && <Rule2Back />}
        {card.kind === "rule2-quiz" && <QuizCard sentence="Although it was raining we went out." answer={20} hint="'Although' = subordinator อยู่หน้า → ใส่ comma หลังประโยครอง (หลัง raining)" />}
        {card.kind === "how-to" && <HowToCard />}
        {card.kind === "done" && <DoneCard />}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 disabled:opacity-40">← ย้อน</button>
        <button onClick={() => setI(Math.min(CARDS.length - 1, i + 1))} disabled={i === CARDS.length - 1} className="rounded-lg bg-[#004AAD] px-6 py-2 text-sm font-bold text-[#FFCC00] shadow-sm disabled:opacity-40">ต่อไป →</button>
      </div>
    </div>
  );
}

function Coach({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "blue" | "pink" }) {
  const toneMap = {
    amber: "from-yellow-50 to-amber-50 ring-amber-200 text-amber-800",
    blue: "from-blue-50 to-sky-50 ring-blue-200 text-blue-800",
    pink: "from-pink-50 to-rose-50 ring-pink-200 text-pink-800",
  };
  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={COACH_IMG}
        alt="พี่ดอย"
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-amber-300 shadow-sm"
      />
      <div className={`relative flex-1 rounded-2xl bg-gradient-to-br px-4 py-3 ring-1 shadow-sm ${toneMap[tone]}`}>
        <div className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 bg-gradient-to-br from-yellow-50 to-amber-50 ring-1 ring-amber-200" />
        <p className="text-[10px] font-black uppercase tracking-wider opacity-80">💬 พี่ดอย</p>
        <div className="mt-1 text-sm leading-6 text-slate-800">{children}</div>
      </div>
    </div>
  );
}

function Pill({ tone, children }: { tone: "amber" | "blue" | "green" | "purple" | "red"; children: ReactNode }) {
  const map = {
    amber: "bg-amber-100 text-amber-900",
    blue: "bg-blue-100 text-blue-900",
    green: "bg-green-100 text-green-900",
    purple: "bg-purple-100 text-purple-900",
    red: "bg-red-100 text-red-900",
  };
  return <div className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${map[tone]}`}>{children}</div>;
}

function HookCard() {
  return (
    <div className="space-y-4">
      <Pill tone="amber">💡 ทำไมต้องเรียน comma?</Pill>
      <h2 className="text-2xl font-black tracking-tight">เสีย point เพราะลืม comma</h2>
      <Para>ในข้อสอบ **Dictation** ของ DET คุณจะได้ฟังประโยคแล้วต้องพิมพ์ตามให้ตรงทุกตัวอักษร **รวม comma ด้วย**</Para>
      <Para>นักเรียนไทยส่วนใหญ่พิมพ์คำได้ครบ แต่เสีย point เพราะ **ลืม comma** เพราะภาษาไทยไม่มี comma แบบอังกฤษ</Para>
      <Coach>
        บทเรียนนี้สอน <strong>2 กฎ</strong> ที่ออกบ่อยที่สุด — รู้แค่นี้ช่วยให้น้องเขียน comma ถูกเกือบ <strong>100%</strong> นะ ตามพี่มาเลย 💪
      </Coach>
    </div>
  );
}

function Rule1Intro() {
  const letters = [
    { l: "F", w: "or" },
    { l: "A", w: "nd" },
    { l: "N", w: "or" },
    { l: "B", w: "ut" },
    { l: "O", w: "r" },
    { l: "Y", w: "et" },
    { l: "S", w: "o" },
  ];
  return (
    <div className="space-y-4">
      <Pill tone="blue">📘 กฎข้อ 1 / 2</Pill>
      <h2 className="text-2xl font-black tracking-tight">FANBOYS</h2>
      <Para>**FANBOYS** คือคำเชื่อม 7 คำที่ใช้บ่อยในภาษาอังกฤษ ได้แก่:</Para>
      <div className="flex flex-wrap gap-2">
        {letters.map((x) => (
          <span key={x.l} className="rounded-full bg-yellow-200 px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm">
            <span className="text-amber-700">{x.l}</span><span className="text-slate-700">{x.w}</span>
          </span>
        ))}
      </div>
      <div className="rounded-xl border-l-4 border-[#004AAD] bg-blue-50 p-4 text-sm leading-7 text-slate-800">
        <strong>กฎ:</strong> เมื่อ FANBOYS เชื่อมประโยคสมบูรณ์ <strong>2 ประโยค</strong> (มี ประธาน+กริยา ทั้ง 2 ฝั่ง) → ใส่ <strong>comma ก่อน</strong> คำเชื่อมเสมอ
      </div>
      <div className="rounded-xl bg-slate-50 p-4 text-center text-sm">
        <span className="text-slate-600">โครงสร้าง:</span>{" "}
        <span className="italic"><span className={c("blue")}>Clause 1</span><span className={c("red")}>,</span> <span className={c("yellow")}>and/but/so/…</span> <span className={c("green")}>Clause 2</span>.</span>
      </div>
    </div>
  );
}

function Rule1Examples() {
  const exs = [
    [
      { t: "I wanted to study", c: "blue" },
      { t: ",", c: "red" },
      { t: " but", c: "yellow" },
      { t: " I was too tired.", c: "green" },
    ],
    [
      { t: "She finished early", c: "blue" },
      { t: ",", c: "red" },
      { t: " so", c: "yellow" },
      { t: " she left.", c: "green" },
    ],
    [
      { t: "It started raining", c: "blue" },
      { t: ",", c: "red" },
      { t: " and", c: "yellow" },
      { t: " the picnic ended.", c: "green" },
    ],
  ];
  return (
    <div className="space-y-4">
      <Pill tone="green">✨ ตัวอย่าง FANBOYS</Pill>
      <h2 className="text-2xl font-black tracking-tight">เห็นกฎทำงานยังไง</h2>
      <Para>แต่ละประโยคมี 2 clause สมบูรณ์ — มี comma ก่อนคำเชื่อมเสมอ</Para>
      <div className="space-y-3">
        {exs.map((parts, idx) => (
          <div key={idx} className="rounded-xl bg-slate-50 p-4 text-[15px] leading-loose">
            {parts.map((p, j) => <span key={j} className={c(p.c)}>{p.t}</span>)}
          </div>
        ))}
      </div>
      <Legend />
    </div>
  );
}

function Rule1Warning() {
  return (
    <div className="space-y-4">
      <Pill tone="red">⚠ ระวัง! ข้อยกเว้น</Pill>
      <h2 className="text-2xl font-black tracking-tight">ถ้าไม่มีประธานข้างหลัง → ไม่ต้องใส่ comma</h2>
      <Para>FANBOYS ใส่ comma ได้เฉพาะ "เชื่อม 2 ประโยคสมบูรณ์" เท่านั้น ถ้าข้างหลังไม่มีประธานใหม่ ก็ไม่ต้องใส่</Para>
      <div className="space-y-3">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase text-red-700">❌ ผิด</p>
          <p className="text-[15px]">I was tired<span className="rounded bg-red-300 px-1 font-bold text-red-800">,</span> and went home.</p>
        </div>
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase text-green-700">✅ ถูก</p>
          <p className="text-[15px]">I was tired and went home.</p>
          <p className="mt-2 text-xs text-green-800">(ประโยคที่ 2 ไม่มี "I" — ใช้กริยา <strong>went</strong> ต่อกันได้เลย)</p>
        </div>
      </div>
      <Coach tone="pink">
        <strong>เคล็ดลับพี่ดอย:</strong> ก่อนใส่ comma ให้ถามตัวเองว่า "ข้างหลัง but/and/so มีประธานใหม่มั้ย?" ถ้าไม่มี → <strong>ตัด comma ทิ้ง</strong>
      </Coach>
    </div>
  );
}

function Rule2Intro() {
  const words = ["although", "because", "when", "if", "since", "while", "after", "before", "unless", "though"];
  const meanings: Record<string, string> = {
    although: "ถึงแม้ว่า",
    because: "เพราะว่า",
    when: "เมื่อ",
    if: "ถ้า",
    since: "ตั้งแต่/เพราะ",
    while: "ในขณะที่",
    after: "หลังจาก",
    before: "ก่อน",
    unless: "ถ้าไม่",
    though: "ถึงแม้",
  };
  return (
    <div className="space-y-4">
      <Pill tone="blue">📘 กฎข้อ 2 / 2</Pill>
      <h2 className="text-2xl font-black tracking-tight">Subordinating conjunctions</h2>
      <Para>Subordinating conjunctions = คำเชื่อมที่ทำให้ประโยคเป็น **"ประโยครอง"** (อยู่เดี่ยวๆ ไม่ได้ ต้องมีประโยคหลักเสมอ)</Para>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">คำที่ใช้บ่อย</p>
      <div className="flex flex-wrap gap-2">
        {words.map((w) => (
          <span key={w} className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-900">
            <strong>{w}</strong> <span className="text-indigo-700">— {meanings[w]}</span>
          </span>
        ))}
      </div>
      <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 p-4 text-sm text-slate-800">
        <strong>เคล็ดลับ:</strong> กฎ comma ขึ้นกับว่า "ประโยครอง" อยู่ <strong>หน้า</strong> หรือ <strong>หลัง</strong> ประโยคหลัก — ดูสองสไลด์ถัดไป
      </div>
    </div>
  );
}

function Rule2Front() {
  return (
    <div className="space-y-4">
      <Pill tone="purple">📍 กฎย่อย 1 — ประโยครองอยู่หน้า</Pill>
      <h2 className="text-2xl font-black tracking-tight">ใส่ comma หลังประโยครอง</h2>
      <div className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-4 text-[15px] leading-loose">
          <span className={c("purple")}>Although it was raining</span>
          <span className={c("red")}>,</span>
          <span className={c("green")}> we went outside.</span>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 text-[15px] leading-loose">
          <span className={c("purple")}>Because he was late</span>
          <span className={c("red")}>,</span>
          <span className={c("green")}> the meeting started without him.</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-400" /> ประโยครอง</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /> comma</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-400" /> ประโยคหลัก</span>
      </div>
    </div>
  );
}

function Rule2Back() {
  return (
    <div className="space-y-4">
      <Pill tone="purple">📍 กฎย่อย 2 — ประโยครองอยู่หลัง</Pill>
      <h2 className="text-2xl font-black tracking-tight">ไม่ต้องใส่ comma</h2>
      <div className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-4 text-[15px] leading-loose">
          <span className={c("green")}>We went outside</span>
          <span className={c("purple")}> although it was raining.</span>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 text-[15px] leading-loose">
          <span className={c("green")}>The meeting started without him</span>
          <span className={c("purple")}> because he was late.</span>
        </div>
      </div>
      <div className="rounded-xl border-l-4 border-pink-500 bg-pink-50 p-4 text-sm font-semibold text-pink-900">
        🧠 <strong>วิธีจำง่ายๆ:</strong> Subordinator อยู่ <strong>หน้า</strong> → ใส่ comma หลังประโยครอง · อยู่ <strong>หลัง</strong> → ไม่ต้องใส่
      </div>
      <Coach tone="blue">
        ลองท่องในใจว่า <em>"หน้า-ใส่, หลัง-ไม่ใส่"</em> — กฎสั้นๆ แค่นี้พอแล้ว ไม่ต้องจำกฎยาว ✌️
      </Coach>
    </div>
  );
}

function HowToCard() {
  return (
    <div className="space-y-4">
      <Pill tone="blue">🎧 วิธีทำแบบฝึกหัด</Pill>
      <h2 className="text-2xl font-black tracking-tight">เมื่อกดเริ่ม คุณจะเจอ…</h2>
      <ol className="space-y-3 text-[15px] leading-7 text-slate-700">
        <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">1</span><span>ฟังประโยค <strong>10 ประโยค</strong> (กดเล่นซ้ำได้)</span></li>
        <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">2</span><span>พิมพ์ตามให้ตรงทุกตัวอักษร <strong>รวม comma</strong></span></li>
        <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">3</span><span>กดปุ่ม <strong>ตรวจคำตอบ</strong></span></li>
        <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">4</span><span>ถ้าไม่ได้ 100% สามารถกด <strong>ดูเฉลย</strong> เพื่อดูประโยคที่ถูกพร้อมเหตุผลเป็นภาษาไทย</span></li>
      </ol>
    </div>
  );
}

function DoneCard() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 py-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={COACH_IMG} alt="พี่ดอย" className="h-20 w-20 rounded-full object-cover ring-4 ring-yellow-300 shadow-md" />
      <h2 className="text-3xl font-black tracking-tight">พร้อมแล้ว! 🎉</h2>
      <p className="max-w-md text-[15px] text-slate-700">น้องได้เรียน 2 กฎ comma ที่ออกบ่อยที่สุดใน DET แล้ว — FANBOYS และ Subordinating conjunctions</p>
      <div className="rounded-2xl bg-yellow-50 px-5 py-3 ring-1 ring-amber-200 text-sm text-amber-900 max-w-md">
        💬 <strong>พี่ดอย:</strong> "ไปลุย Dictation จริงได้เลย ถ้าลืม กลับมาเปิดสรุปได้ตลอดนะ"
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-800 ring-1 ring-slate-300 shadow-sm hover:shadow-md transition">
          📖 ดูสรุปเต็ม
        </button>
        <button className="rounded-xl bg-[#004AAD] px-7 py-3 text-sm font-bold text-[#FFCC00] shadow-md hover:shadow-lg transition">
          เริ่ม Dictation จริง →
        </button>
      </div>
    </div>
  );
}

function QuizCard({ sentence, answer, hint }: { sentence: string; answer: number; hint: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked !== null && Math.abs(picked - answer) <= 1;
  return (
    <div className="space-y-4">
      <Pill tone="purple">🎯 ลองทำดู (active recall)</Pill>
      <h2 className="text-2xl font-black tracking-tight">comma ควรอยู่ตรงไหน?</h2>
      <p className="text-sm text-slate-600">แตะตำแหน่งที่ควรใส่ comma</p>
      <div className="rounded-2xl bg-slate-50 p-6 text-center text-xl leading-loose">
        {sentence.split("").map((ch, idx) => (
          <span
            key={idx}
            onClick={() => setPicked(idx)}
            className={`cursor-pointer transition ${
              picked === idx
                ? correct
                  ? "rounded bg-green-300 px-0.5"
                  : "rounded bg-red-300 px-0.5"
                : "hover:bg-yellow-100"
            }`}
          >
            {ch}
          </span>
        ))}
      </div>
      {picked !== null && (
        <div className={`rounded-xl p-4 text-sm font-semibold ${correct ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
          {correct ? `✅ ถูกต้อง! ${hint}` : `❌ ลองอีกครั้ง — ${hint}`}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VARIANT 2 — Detective (problem-first, FULL content unfold)
   ============================================================ */

function DetectiveVariant() {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [guess, setGuess] = useState<string | null>(null);

  const options = [
    { id: "a", text: "ไม่มี comma ก่อน 'but'", correct: true },
    { id: "b", text: "ใช้ 'but' ผิดความหมาย", correct: false },
    { id: "c", text: "ใช้ past tense ผิด", correct: false },
    { id: "d", text: "สะกดคำผิด", correct: false },
  ];

  return (
    <div className="space-y-6">
      {/* Why this matters — kept as opener context */}
      <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">💡 ก่อนเริ่ม</p>
        <p className="mt-2 text-sm leading-7 text-amber-900">
          ในข้อสอบ <strong>Dictation</strong> ของ DET ต้องพิมพ์ตามให้ตรง <strong>รวม comma</strong> — นักเรียนไทยเสีย point บ่อยเพราะภาษาไทยไม่มี comma แบบนี้
        </p>
      </div>

      {/* Case 1 */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 p-7 text-white shadow-xl">
        <div className="mb-2 inline-block rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-slate-900">🔍 เคสที่ 1 — FANBOYS</div>
        <h2 className="text-2xl font-black tracking-tight">นักสืบ comma</h2>
        <p className="mt-2 text-sm text-slate-300">มีประโยคผิดอยู่ข้างล่าง คุณหาจุดบกพร่องเจอไหม?</p>
        <div className="mt-6 rounded-2xl bg-white/10 p-6 text-center font-mono text-xl">&quot;I wanted to study but I was too tired&quot;</div>
      </div>

      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <p className="mb-4 text-sm font-semibold text-slate-700">คุณคิดว่าประโยคนี้เสีย point ตรงไหน?</p>
        <div className="space-y-2">
          {options.map((o) => {
            const picked = guess === o.id;
            return (
              <button
                key={o.id}
                onClick={() => {
                  setGuess(o.id);
                  if (o.correct) setTimeout(() => setStage(1), 500);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
                  picked ? (o.correct ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50") : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${picked ? (o.correct ? "bg-green-500 text-white" : "bg-red-500 text-white") : "bg-slate-200 text-slate-700"}`}>{o.id.toUpperCase()}</span>
                <span className="font-medium">{o.text}</span>
                {picked && o.correct && <span className="ml-auto text-green-600">✓</span>}
                {picked && !o.correct && <span className="ml-auto text-red-500">✗</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reveal rule 1 — FULL content */}
      {stage >= 1 && (
        <div className="space-y-3 rounded-3xl border-2 border-green-300 bg-green-50 p-6">
          <div className="text-sm font-bold text-green-900">🎉 ค้นพบกฎ FANBOYS แล้ว!</div>
          <div className="space-y-4 rounded-2xl bg-white p-5">
            <Para>**FANBOYS** = 7 คำเชื่อม: **F**or · **A**nd · **N**or · **B**ut · **O**r · **Y**et · **S**o</Para>
            <Para>**กฎ:** เมื่อ FANBOYS เชื่อมประโยคสมบูรณ์ 2 ประโยค (มี ประธาน+กริยา ทั้ง 2 ฝั่ง) → ใส่ **comma ก่อน** คำเชื่อมเสมอ</Para>
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="mb-2 font-semibold text-slate-700">ตัวอย่างเพิ่ม:</p>
              <ul className="space-y-1 text-slate-800">
                <li>• I wanted to study<strong className="text-red-600">,</strong> <strong className="text-amber-700">but</strong> I was too tired.</li>
                <li>• She finished early<strong className="text-red-600">,</strong> <strong className="text-amber-700">so</strong> she left.</li>
                <li>• It started raining<strong className="text-red-600">,</strong> <strong className="text-amber-700">and</strong> the picnic ended.</li>
              </ul>
            </div>
            <div className="rounded-xl border-l-4 border-red-400 bg-red-50 p-3 text-sm text-red-900">
              ⚠ <strong>ระวัง!</strong> ถ้าไม่มีประธานข้างหลัง → ไม่ต้องใส่ comma<br />
              <em>I was tired and went home.</em> (ไม่มี "I" อันที่ 2)
            </div>
          </div>
          {stage === 1 && (
            <button onClick={() => setStage(2)} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition">เคสที่ 2 →</button>
          )}
        </div>
      )}

      {/* Case 2 — subordinating */}
      {stage >= 2 && (
        <>
          <div className="rounded-3xl bg-gradient-to-br from-indigo-900 to-purple-800 p-7 text-white shadow-xl">
            <div className="mb-2 inline-block rounded-full bg-pink-400 px-3 py-1 text-xs font-black text-slate-900">🔍 เคสที่ 2 — Subordinating</div>
            <h2 className="text-2xl font-black tracking-tight">2 ประโยคนี้ใส่ comma เหมือนกันมั้ย?</h2>
            <div className="mt-5 space-y-2">
              <div className="rounded-xl bg-white/10 p-4 font-mono text-base">A · &quot;Although it was raining we went outside&quot;</div>
              <div className="rounded-xl bg-white/10 p-4 font-mono text-base">B · &quot;We went outside although it was raining&quot;</div>
            </div>
            <button onClick={() => setStage(3)} className="mt-4 rounded-xl bg-yellow-400 px-5 py-2 text-sm font-bold text-slate-900 hover:bg-yellow-300 transition">เฉลย →</button>
          </div>

          {stage === 3 && (
            <div className="space-y-4 rounded-3xl border-2 border-indigo-300 bg-indigo-50 p-6">
              <div className="text-sm font-bold text-indigo-900">📘 กฎข้อ 2 — Subordinating conjunctions</div>
              <div className="rounded-2xl bg-white p-5 space-y-3">
                <Para>Subordinating conjunctions = คำเชื่อมที่ทำให้ประโยคเป็น "ประโยครอง" (อยู่เดี่ยวๆ ไม่ได้)</Para>
                <Para>คำที่ใช้บ่อย: **although** (ถึงแม้ว่า), **because** (เพราะว่า), **when** (เมื่อ), **if** (ถ้า), **since** (ตั้งแต่/เพราะ), **while** (ในขณะที่), **after** (หลังจาก), **before** (ก่อน), **unless** (ถ้าไม่), **though** (ถึงแม้)</Para>
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3 text-sm">
                  <p className="font-bold text-green-900">✅ A — ประโยครองอยู่หน้า → ใส่ comma</p>
                  <p className="mt-1 text-slate-800"><span className={c("purple")}>Although it was raining</span><span className={c("red")}>,</span> we went outside.</p>
                </div>
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3 text-sm">
                  <p className="font-bold text-green-900">✅ B — ประโยครองอยู่หลัง → ไม่ต้องใส่ comma</p>
                  <p className="mt-1 text-slate-800">We went outside <span className={c("purple")}>although it was raining</span>.</p>
                </div>
                <div className="rounded-xl border-l-4 border-pink-500 bg-pink-50 p-3 text-sm font-semibold text-pink-900">
                  🧠 <strong>วิธีจำง่ายๆ:</strong> Subordinator อยู่ <strong>หน้า</strong> → ใส่ comma หลังประโยครอง
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5">
                <p className="text-xs font-bold uppercase text-slate-500">🎧 วิธีทำแบบฝึกหัด</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  ฟังประโยค <strong>10 ประโยค</strong> พิมพ์ตามให้ตรงทุกตัวอักษร <strong>รวม comma</strong> กดปุ่ม <strong>ตรวจคำตอบ</strong> — ถ้าไม่ได้ 100% สามารถกด <strong>ดูเฉลย</strong> เพื่อดูประโยคที่ถูกพร้อมเหตุผลเป็นภาษาไทย
                </p>
              </div>

              <button className="w-full rounded-xl bg-[#004AAD] px-4 py-3 text-sm font-bold text-[#FFCC00] hover:shadow-lg transition">เริ่ม Dictation จริง →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   VARIANT 3 — Visual / color-coded (FULL content, scrollable)
   ============================================================ */

function VisualVariant() {
  const [hover, setHover] = useState<string | null>(null);
  const dim = (col: string) => (hover && hover !== col ? "opacity-30" : "");

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <Pill tone="amber">💡 ทำไมต้องเรียน comma?</Pill>
        <h2 className="mt-3 text-2xl font-black tracking-tight">เสีย point เพราะลืม comma</h2>
        <div className="mt-3 space-y-2">
          <Para>ในข้อสอบ **Dictation** ของ DET ต้องพิมพ์ตามให้ตรงทุกตัวอักษร **รวม comma ด้วย**</Para>
          <Para>นักเรียนไทยเสีย point บ่อยเพราะ **ลืม comma** — บทเรียนนี้สอน 2 กฎที่ออกบ่อยที่สุด</Para>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <Pill tone="blue">📘 กฎข้อ 1 — FANBOYS</Pill>
        <h2 className="mt-3 text-2xl font-black tracking-tight">เชื่อม 2 ประโยค → ใส่ comma</h2>
        <Para>**FANBOYS** = **F**or · **A**nd · **N**or · **B**ut · **O**r · **Y**et · **S**o</Para>
        <p className="mt-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">แตะหรือ hover ที่แต่ละสีเพื่อโฟกัส</p>
        <div className="space-y-3">
          {[
            [{ t: "I wanted to study", c: "blue" }, { t: ",", c: "red" }, { t: " but", c: "yellow" }, { t: " I was too tired.", c: "green" }],
            [{ t: "She finished early", c: "blue" }, { t: ",", c: "red" }, { t: " so", c: "yellow" }, { t: " she left.", c: "green" }],
            [{ t: "It started raining", c: "blue" }, { t: ",", c: "red" }, { t: " and", c: "yellow" }, { t: " the picnic ended.", c: "green" }],
          ].map((parts, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 p-4 text-base leading-loose">
              {parts.map((p, j) => (
                <span key={j} onMouseEnter={() => setHover(p.c)} onMouseLeave={() => setHover(null)} className={`${c(p.c)} cursor-pointer transition ${dim(p.c)}`}>{p.t}</span>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border-l-4 border-red-400 bg-red-50 p-3 text-sm text-red-900">
          ⚠ <strong>ระวัง!</strong> ถ้าไม่มีประธานข้างหลัง → ไม่ใส่ comma · <em>I was tired and went home.</em> (ไม่มี "I" อันที่ 2)
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <Pill tone="purple">📘 กฎข้อ 2 — Subordinating</Pill>
        <h2 className="mt-3 text-2xl font-black tracking-tight">ขึ้นกับว่าอยู่ "หน้า" หรือ "หลัง"</h2>
        <Para>คำที่ใช้บ่อย: **although, because, when, if, since, while, after, before, unless, though**</Para>

        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">กฎย่อย 1 — อยู่หน้า → ใส่ comma</p>
        <div className="mt-2 space-y-2">
          {[
            [{ t: "Although it was raining", c: "purple" }, { t: ",", c: "red" }, { t: " we went outside.", c: "green" }],
            [{ t: "Because he was late", c: "purple" }, { t: ",", c: "red" }, { t: " the meeting started without him.", c: "green" }],
          ].map((parts, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 p-4 text-base leading-loose">
              {parts.map((p, j) => (
                <span key={j} onMouseEnter={() => setHover(p.c)} onMouseLeave={() => setHover(null)} className={`${c(p.c)} cursor-pointer transition ${dim(p.c)}`}>{p.t}</span>
              ))}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">กฎย่อย 2 — อยู่หลัง → ไม่ใส่ comma</p>
        <div className="mt-2 space-y-2">
          {[
            [{ t: "We went outside", c: "green" }, { t: " although it was raining.", c: "purple" }],
            [{ t: "The meeting started without him", c: "green" }, { t: " because he was late.", c: "purple" }],
          ].map((parts, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 p-4 text-base leading-loose">
              {parts.map((p, j) => (
                <span key={j} onMouseEnter={() => setHover(p.c)} onMouseLeave={() => setHover(null)} className={`${c(p.c)} cursor-pointer transition ${dim(p.c)}`}>{p.t}</span>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border-l-4 border-pink-500 bg-pink-50 p-3 text-sm font-semibold text-pink-900">
          🧠 <strong>วิธีจำง่ายๆ:</strong> Subordinator อยู่ <strong>หน้า</strong> → ใส่ comma หลังประโยครอง
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <Pill tone="blue">🎧 วิธีทำแบบฝึกหัด</Pill>
        <Para>ฟังประโยค **10 ประโยค** พิมพ์ตามให้ตรงทุกตัวอักษร **รวม comma** กดปุ่ม **ตรวจคำตอบ** — ถ้าไม่ได้ 100% สามารถกด **ดูเฉลย** เพื่อดูประโยคที่ถูกพร้อมเหตุผลเป็นภาษาไทย</Para>
      </div>

      <div className="sticky bottom-4 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-lg">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">📌 กฎที่ติดอยู่เสมอ</p>
        <Legend />
        <div className="mt-3 rounded-xl bg-blue-50 p-3 text-center text-sm font-bold text-[#004AAD]">
          ประโยค + <span className="text-red-600">,</span> + <span className="text-amber-600">FANBOYS</span> + ประโยค
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LECTURE SUMMARY — readable full lesson + Save to Notebook
   ============================================================ */

function LectureSummary() {
  const [saved, setSaved] = useState(false);

  return (
    <article className="space-y-6">
      {/* Header card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#004AAD] to-blue-700 p-7 text-white shadow-lg">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COACH_IMG} alt="พี่ดอย" className="h-16 w-16 shrink-0 rounded-full object-cover ring-3 ring-yellow-300 shadow-md" />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-200">📖 สรุปบทเรียน · Session 1</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Commas: FANBOYS & Subordinating Conjunctions</h1>
            <p className="mt-1 text-sm text-blue-100">≈ 15 นาที · พื้นฐาน Dictation · สอนโดยพี่ดอย</p>
          </div>
        </div>
        <button
          onClick={() => setSaved(!saved)}
          className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition ${
            saved ? "bg-green-400 text-slate-900" : "bg-yellow-400 text-slate-900 hover:bg-yellow-300"
          }`}
        >
          {saved ? "✓ บันทึกไว้ใน Notebook แล้ว" : "🔖 บันทึกลง Notebook"}
        </button>
      </div>

      {/* Section 1 */}
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-800">1</span>
          ทำไมต้องเรียน comma?
        </div>
        <div className="space-y-3 text-[15px] leading-7 text-slate-700">
          <p>ในข้อสอบ <strong>Dictation</strong> ของ DET คุณจะได้ฟังประโยคแล้วต้องพิมพ์ตามให้ตรงทุกตัวอักษร <strong>รวม comma ด้วย</strong></p>
          <p>นักเรียนไทยส่วนใหญ่พิมพ์คำได้ครบ แต่เสีย point เพราะ <strong>ลืม comma</strong> เพราะภาษาไทยไม่มี comma แบบอังกฤษ</p>
          <p>บทเรียนนี้สอน 2 กฎที่ออกบ่อยที่สุด — รู้แค่นี้ช่วยให้คุณเขียน comma ถูกเกือบ <strong>100%</strong></p>
        </div>
      </section>

      {/* Section 2 — Rule 1 */}
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800">2</span>
          กฎข้อ 1 — FANBOYS
        </div>
        <p className="text-[15px] leading-7 text-slate-700">
          <strong>FANBOYS</strong> คือคำเชื่อม 7 คำที่ใช้บ่อยในภาษาอังกฤษ ได้แก่ <strong>For · And · Nor · But · Or · Yet · So</strong>
        </p>
        <div className="mt-4 rounded-xl border-l-4 border-[#004AAD] bg-blue-50 p-4 text-sm leading-7 text-slate-800">
          <strong>กฎ:</strong> เมื่อ FANBOYS เชื่อมประโยคสมบูรณ์ 2 ประโยค (มี ประธาน+กริยา ทั้ง 2 ฝั่ง) → ใส่ <strong>comma ก่อน</strong> คำเชื่อมเสมอ
        </div>
        <p className="mt-3 text-sm italic text-slate-600">โครงสร้าง: <em>Clause 1, and/but/so/... Clause 2.</em></p>
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">ตัวอย่าง</p>
          <ul className="space-y-1.5 text-[15px] text-slate-800">
            <li>• I wanted to study<strong className="text-red-600">,</strong> <strong className="text-amber-700">but</strong> I was too tired.</li>
            <li>• She finished early<strong className="text-red-600">,</strong> <strong className="text-amber-700">so</strong> she left.</li>
            <li>• It started raining<strong className="text-red-600">,</strong> <strong className="text-amber-700">and</strong> the picnic ended.</li>
          </ul>
        </div>
        <div className="mt-4 rounded-xl border-l-4 border-red-400 bg-red-50 p-4 text-sm leading-7 text-red-900">
          ⚠ <strong>ระวัง!</strong> ถ้าไม่มีประธานข้างหลัง → ไม่ต้องใส่ comma<br />
          <em>I was tired and went home.</em> (ไม่มี "I" อันที่ 2 → ไม่ใส่ comma)
        </div>
        <div className="mt-4">
          <Coach tone="pink">
            <strong>เคล็ดลับพี่ดอย:</strong> ก่อนใส่ comma ให้ถามตัวเองว่า "ข้างหลัง but/and/so มีประธานใหม่มั้ย?" ถ้าไม่มี → ตัด comma ทิ้ง
          </Coach>
        </div>
      </section>

      {/* Section 3 — Rule 2 */}
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-800">3</span>
          กฎข้อ 2 — Subordinating conjunctions
        </div>
        <p className="text-[15px] leading-7 text-slate-700">
          Subordinating conjunctions = คำเชื่อมที่ทำให้ประโยคเป็น "ประโยครอง" (อยู่เดี่ยวๆ ไม่ได้)
        </p>
        <p className="mt-2 text-[15px] leading-7 text-slate-700">
          คำที่ใช้บ่อย: <strong>although</strong> (ถึงแม้ว่า), <strong>because</strong> (เพราะว่า), <strong>when</strong> (เมื่อ), <strong>if</strong> (ถ้า), <strong>since</strong> (ตั้งแต่/เพราะ), <strong>while</strong> (ในขณะที่), <strong>after</strong> (หลังจาก), <strong>before</strong> (ก่อน), <strong>unless</strong> (ถ้าไม่), <strong>though</strong> (ถึงแม้)
        </p>

        <div className="mt-4 rounded-xl border-l-4 border-purple-400 bg-purple-50 p-4">
          <p className="text-sm font-bold text-purple-900">กฎย่อย 1 — ประโยครองอยู่หน้า → ใส่ comma หลังประโยครอง</p>
          <ul className="mt-2 space-y-1 text-[15px] text-slate-800">
            <li>• <strong>Although</strong> it was raining<strong className="text-red-600">,</strong> we went outside.</li>
            <li>• <strong>Because</strong> he was late<strong className="text-red-600">,</strong> the meeting started without him.</li>
          </ul>
        </div>

        <div className="mt-3 rounded-xl border-l-4 border-purple-400 bg-purple-50 p-4">
          <p className="text-sm font-bold text-purple-900">กฎย่อย 2 — ประโยครองอยู่หลัง → ไม่ใส่ comma</p>
          <ul className="mt-2 space-y-1 text-[15px] text-slate-800">
            <li>• We went outside although it was raining.</li>
            <li>• The meeting started without him because he was late.</li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border-l-4 border-pink-500 bg-pink-50 p-4 text-sm font-semibold text-pink-900">
          🧠 <strong>วิธีจำง่ายๆ:</strong> Subordinator อยู่ <strong>หน้า</strong> → ใส่ comma หลังประโยครอง
        </div>
        <div className="mt-4">
          <Coach tone="blue">
            ลองท่องในใจ <em>"หน้า-ใส่, หลัง-ไม่ใส่"</em> — กฎสั้นๆ แค่นี้พอแล้ว ไม่ต้องจำกฎยาว ✌️
          </Coach>
        </div>
      </section>

      {/* Section 4 — How to */}
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-800">4</span>
          วิธีทำแบบฝึกหัด
        </div>
        <p className="text-[15px] leading-7 text-slate-700">
          ฟังประโยค <strong>10 ประโยค</strong> พิมพ์ตามให้ตรงทุกตัวอักษร <strong>รวม comma</strong> กดปุ่ม <strong>ตรวจคำตอบ</strong> — ถ้าไม่ได้ 100% สามารถกด <strong>ดูเฉลย</strong> เพื่อดูประโยคที่ถูกพร้อมเหตุผลเป็นภาษาไทย
        </p>
      </section>

      {/* Footer actions */}
      <div className="rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COACH_IMG} alt="พี่ดอย" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-yellow-300" />
          <p className="text-sm leading-6 text-slate-200">
            <strong className="text-yellow-300">พี่ดอย:</strong> "บทเรียนนี้จดไว้ใน Notebook ของน้องได้นะ เปิดมาทบทวนก่อนสอบจริงได้ตลอด ส่วนใครพร้อมแล้ว — เริ่ม Dictation จริงได้เลย!"
          </p>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setSaved(!saved)}
            className={`flex-1 rounded-xl px-5 py-3 text-sm font-bold shadow-sm hover:shadow-md transition ${
              saved ? "bg-green-400 text-slate-900" : "bg-white text-slate-900 hover:bg-slate-100"
            }`}
          >
            {saved ? "✓ บันทึกแล้ว" : "🔖 บันทึกลง Notebook"}
          </button>
          <button className="flex-1 rounded-xl bg-[#FFCC00] px-5 py-3 text-sm font-bold text-slate-900 shadow-sm hover:shadow-md transition">
            เริ่ม Dictation จริง →
          </button>
        </div>
      </div>
    </article>
  );
}

/* ============================================================ */

function Legend() {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      <LegendItem color="blue" label="Clause หลัก" />
      <LegendItem color="red" label="Comma" />
      <LegendItem color="yellow" label="FANBOYS" />
      <LegendItem color="green" label="Clause ที่ 2" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${dotClass(color)}`} />
      <span className="font-semibold text-slate-700">{label}</span>
    </div>
  );
}

function c(col: string) {
  switch (col) {
    case "blue":
      return "rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-900";
    case "red":
      return "mx-0.5 inline-block rounded bg-red-200 px-1 font-black text-red-700";
    case "yellow":
      return "rounded bg-yellow-200 px-1.5 py-0.5 font-bold text-amber-900";
    case "green":
      return "rounded bg-green-100 px-1.5 py-0.5 font-semibold text-green-900";
    case "purple":
      return "rounded bg-purple-100 px-1.5 py-0.5 font-semibold text-purple-900";
    default:
      return "";
  }
}

function dotClass(col: string) {
  switch (col) {
    case "blue": return "bg-blue-400";
    case "red": return "bg-red-400";
    case "yellow": return "bg-yellow-400";
    case "green": return "bg-green-400";
    case "purple": return "bg-purple-400";
    default: return "bg-slate-300";
  }
}
