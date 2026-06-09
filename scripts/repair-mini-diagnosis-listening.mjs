#!/usr/bin/env node
/**
 * One-off repair: replace every mini_diagnosis_set_items.interactive_listening row
 * with the new 3-scenario content shape, AND pre-bake Deepgram TTS audio for
 * each scenario passage. Stores the result in content.scenarios[i].audio_url as
 * a data URL so every user plays the same cached audio.
 *
 * Usage:
 *   node scripts/repair-mini-diagnosis-listening.mjs
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEEPGRAM_API_KEY
 *
 * Re-running is safe: it always overwrites the row content with the canonical
 * shape and re-synthesizes audio.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY?.trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!DEEPGRAM_KEY) {
  console.error("Missing DEEPGRAM_API_KEY — add it to .env.local before running.");
  process.exit(1);
}

const NEW_CONTENT = {
  instruction:
    "You are about to take a short listening test. You will hear three short scenarios. You can press play up to 3 times per scenario, then answer the questions before moving on.",
  instruction_th:
    "คุณกำลังจะทำข้อสอบการฟังสั้นๆ จะมีทั้งหมด 3 สถานการณ์ คุณสามารถกดฟังได้ไม่เกิน 3 ครั้งต่อหนึ่งสถานการณ์ จากนั้นตอบคำถามทั้งหมดก่อนไปต่อ",
  pre_break_seconds: 20,
  pre_break_message_th:
    "พักสายตา 20 วินาทีก่อนเริ่มทำข้อสอบการฟัง เตรียมหูฟังและสมาธิให้พร้อม เพราะหลังจากนี้คุณจะได้ฟังบทสนทนาและตอบคำถาม",
  pre_break_message_en:
    "Take a 20 second rest before the listening exam begins. Put on your headphones and get ready, because right after this you will listen to short scenarios and answer questions.",
  max_plays: 3,
  tts_provider: "deepgram",
  scenarios: [
    {
      id: 1,
      kind: "mcq",
      title_en: "Scenario 1",
      title_th: "สถานการณ์ที่ 1",
      passage:
        "Maya went to see Professor Carter because she had not picked up the reading list for next week's class. Her financial aid was late, so she could not buy the books yet. Carter told her she could find the books at the school library and read the first chapter on the class website.",
      questions: [
        {
          question: "Why did Maya go to see the professor?",
          options: [
            "To explain that she was not ready",
            "To return some borrowed books",
            "To ask for money back from the shop",
            "To change to a new class",
          ],
          correctAnswer: "To explain that she was not ready",
        },
        {
          question: "Why couldn't Maya buy the books?",
          options: [
            "The shop had no copies",
            "Her money came late",
            "Her family had a problem",
            "Her job took too much time",
          ],
          correctAnswer: "Her money came late",
        },
        {
          question: "What did the professor suggest?",
          options: [
            "Lending his own books to her",
            "Moving the class to a later date",
            "Borrowing books from the campus shelves and reading the start of the book online",
            "Asking the shop to let her pay later",
          ],
          correctAnswer:
            "Borrowing books from the campus shelves and reading the start of the book online",
        },
      ],
    },
    {
      id: 2,
      kind: "fitb",
      title_en: "Scenario 2",
      title_th: "สถานการณ์ที่ 2",
      passage:
        "Daniel wants to apply for the Asia Pacific exchange programme, and the deadline is in ten days. He has finished the forms, but he still has to write a personal statement that sounds compelling enough to win a place. Professor Hahn has agreed to send a letter of support before the closing date.",
      sentences: [
        {
          text: "Daniel is writing a [BLANK 1] letter to explain why he should be chosen for the exchange.",
          missingWords: [
            {
              correctWord: "motivation",
              prefix_length: 3,
              clue: "Personal statement explaining why you want the opportunity.",
              explanationThai: "จดหมายแสดงเหตุผลที่อยากเข้าร่วม",
            },
          ],
        },
        {
          text: "He has to send everything before the [BLANK 1] in ten days.",
          missingWords: [
            {
              correctWord: "deadline",
              prefix_length: 3,
              clue: "The final date by which something must be done.",
              explanationThai: "วันสุดท้ายที่ต้องส่ง",
            },
          ],
        },
        {
          text: "Without Hahn's support, his application may not seem [BLANK 1] enough to beat hundreds of other students.",
          missingWords: [
            {
              correctWord: "compelling",
              prefix_length: 3,
              clue: "Strong and convincing enough to grab attention (C1).",
              explanationThai: "น่าเชื่อถือและโน้มน้าวใจ",
            },
          ],
        },
      ],
    },
    {
      id: 3,
      kind: "fitb_with_summary",
      title_en: "Scenario 3",
      title_th: "สถานการณ์ที่ 3",
      passage:
        "Priya went to see Professor Idris to ask him to excuse her from two missed lab classes. She had a job interview on one day and a clinic visit on the other, and the teaching assistant never replied to her emails. Idris said he would accept the absences once she sent him the emails, so she only had to do one extra report.",
      sentences: [
        {
          text: "Priya is asking the professor to [BLANK 1] her absences so they do not hurt her grade.",
          missingWords: [
            {
              correctWord: "excuse",
              prefix_length: 3,
              clue: "To officially forgive an absence.",
              explanationThai: "ยกเว้นการขาดเรียนอย่างเป็นทางการ",
            },
          ],
        },
        {
          text: "Once Idris reads the forwarded emails, both absences will be officially [BLANK 1].",
          missingWords: [
            {
              correctWord: "authorised",
              prefix_length: 3,
              clue: "Given official permission or approval.",
              explanationThai: "ได้รับอนุญาตอย่างเป็นทางการ",
            },
          ],
        },
      ],
      summary: {
        question: "Which sentence best summarises the conversation?",
        options: [
          "Priya gave good reasons for missing class, and the professor agreed she only needs to do one extra report.",
          "Priya is being punished for missing two lab classes even though she had already written to the teaching assistant about her job interview and her clinic visit beforehand.",
          "Priya is leaving the course because the professor did not accept her reasons.",
          "Idris told Priya that no other absences would be allowed for any reason in the future.",
        ],
        correctAnswer:
          "Priya gave good reasons for missing class, and the professor agreed she only needs to do one extra report.",
      },
    },
  ],
};

const DEEPGRAM_URL = "https://api.deepgram.com/v1/speak";
const DEEPGRAM_MODEL =
  process.env.DEEPGRAM_TTS_MODEL?.trim() || "aura-2-thalia-en";

async function synthesizeDeepgram(text) {
  const res = await fetch(
    `${DEEPGRAM_URL}?model=${encodeURIComponent(DEEPGRAM_MODEL)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    },
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Deepgram ${res.status}: ${msg.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  const mime =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mpeg";
  return `data:${mime};base64,${Buffer.from(ab).toString("base64")}`;
}

async function buildContent() {
  const content = JSON.parse(JSON.stringify(NEW_CONTENT));
  for (const sc of content.scenarios) {
    process.stdout.write(`  • synthesizing scenario ${sc.id}… `);
    const url = await synthesizeDeepgram(sc.passage);
    sc.audio_url = url;
    console.log(`ok (${Math.round(url.length / 1024)} KB)`);
  }
  return content;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  console.log("Fetching mini_diagnosis_set_items with task_type = interactive_listening …");
  const { data: rows, error } = await supabase
    .from("mini_diagnosis_set_items")
    .select("id, set_id, step_index, task_type")
    .eq("task_type", "interactive_listening");
  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }
  console.log(`Found ${rows?.length ?? 0} rows.`);
  if (!rows || rows.length === 0) {
    console.log("Nothing to repair.");
    return;
  }

  console.log("Synthesizing audio (one Deepgram call per scenario, cached and reused for every row)…");
  const content = await buildContent();
  const correctAnswer = null;

  for (const row of rows) {
    process.stdout.write(`Updating row ${row.id} (set ${row.set_id}, step ${row.step_index})… `);
    const { error: updErr } = await supabase
      .from("mini_diagnosis_set_items")
      .update({ content, correct_answer: correctAnswer })
      .eq("id", row.id);
    if (updErr) {
      console.log(`FAILED: ${updErr.message}`);
    } else {
      console.log("ok");
    }
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
