#!/usr/bin/env node
/**
 * Download Bunny Stream course videos (CDN + Referer), extract audio, Deepgram STT,
 * and write timestamp outlines for chapter/marker authoring.
 *
 * Usage:
 *   node scripts/transcribe-bunny-library.mjs                 # all with bunnyGuid
 *   node scripts/transcribe-bunny-library.mjs --limit 3
 *   node scripts/transcribe-bunny-library.mjs --only 60ae15ae
 *   node scripts/transcribe-bunny-library.mjs --force         # redo existing
 *
 * Env: DEEPGRAM_API_KEY in .env.local (or process env)
 * Optional: BUNNY_CDN_HOST (default vz-3c7db367-464.b-cdn.net)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAP = "/Users/ongjui/Downloads/duolingo-fast-track-migration/lesson-video-map.json";
const OUT = path.join(ROOT, "tmp/video-transcripts");
const FFMPEG = path.join(ROOT, "tmp/bin/ffmpeg");
const CDN = process.env.BUNNY_CDN_HOST || "vz-3c7db367-464.b-cdn.net";
const REFERER = "https://iframe.mediadelivery.net/";
const CONCURRENCY = Number(process.env.TRANSCRIBE_CONCURRENCY || 1);

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const RETRY_FAILED = args.includes("--retry-failed");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx >= 0 ? String(args[onlyIdx + 1]) : null;

function loadEnv() {
  const env = { ...process.env };
  for (const file of [".env.local", ".env"]) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!(k in env)) env[k] = v;
    }
  }
  return env;
}

/** Deepgram Thai often inserts spaces between syllables — collapse Thai runs. */
function cleanThai(text) {
  return String(text || "")
    .replace(/([\u0E00-\u0E7F])\s+(?=[\u0E00-\u0E7F])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function fmtTime(s) {
  const n = Math.max(0, Number(s) || 0);
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const sec = Math.floor(n % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${err.slice(-400)}`));
    });
  });
}

async function downloadMp4(guid, dest) {
  const candidates = [
    "play_720p.mp4",
    "play_480p.mp4",
    "play_360p.mp4",
    "play_240p.mp4",
    "original",
  ];
  let lastErr = null;
  for (const name of candidates) {
    const url = `https://${CDN}/${guid}/${name}`;
    try {
      await run("/usr/bin/curl", [
        "-fsSL",
        "--retry",
        "3",
        "--retry-delay",
        "2",
        "-H",
        `Referer: ${REFERER}`,
        "-o",
        dest,
        url,
      ]);
      const st = fs.statSync(dest);
      if (!st.size) throw new Error("empty file");
      return { bytes: st.size, source: name };
    } catch (e) {
      lastErr = e;
      try {
        fs.unlinkSync(dest);
      } catch {
        /* ignore */
      }
    }
  }
  throw lastErr || new Error(`download ${guid}: all candidates failed`);
}

async function extractMp3(mp4, mp3) {
  if (!fs.existsSync(FFMPEG)) throw new Error(`ffmpeg missing at ${FFMPEG}`);
  try {
    await run(FFMPEG, [
      "-y",
      "-i",
      mp4,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "5",
      mp3,
    ]);
  } catch (e) {
    // Some encodes are video-only at one resolution; try mapping any audio stream explicitly
    await run(FFMPEG, [
      "-y",
      "-i",
      mp4,
      "-map",
      "0:a:0?",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "5",
      mp3,
    ]);
  }
}

async function deepgramTranscribe(apiKey, mp3Path) {
  const audio = fs.readFileSync(mp3Path);
  const qs = new URLSearchParams({
    model: "nova-3",
    language: "th",
    punctuate: "true",
    smart_format: "true",
    utterances: "true",
    paragraphs: "true",
  });
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`https://api.deepgram.com/v1/listen?${qs}`, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/mpeg",
        },
        body: audio,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Deepgram ${res.status}: ${text.slice(0, 300)}`);
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

function buildTimestamps(utterances, windowSec = 40) {
  const chapters = [];
  let buf = null;
  for (const u of utterances) {
    const piece = cleanThai(u.transcript);
    if (!piece) continue;
    if (!buf) {
      buf = { start: u.start, end: u.end, text: piece };
    } else if (u.start - buf.start < windowSec) {
      buf.end = u.end;
      buf.text += " " + piece;
    } else {
      chapters.push(buf);
      buf = { start: u.start, end: u.end, text: piece };
    }
  }
  if (buf) chapters.push(buf);
  return chapters.map((c) => ({
    start: c.start,
    end: c.end,
    label: c.text.replace(/\s+/g, " ").trim().slice(0, 120),
  }));
}

function writeOutputs(lesson, json) {
  const guid = lesson.bunnyGuid;
  const alt = json.results?.channels?.[0]?.alternatives?.[0] ?? {};
  const utterances = json.results?.utterances ?? [];
  const stamps = buildTimestamps(utterances);
  const meta = {
    lessonId: lesson.id,
    title: lesson.title,
    chapter: lesson.ch,
    bunnyGuid: guid,
    duration: json.metadata?.duration ?? null,
    transcribedAt: new Date().toISOString(),
    model: "nova-3",
    language: "th",
  };
  fs.writeFileSync(path.join(OUT, `${guid}.raw.json`), JSON.stringify(json));
  fs.writeFileSync(
    path.join(OUT, `${guid}.meta.json`),
    JSON.stringify({ ...meta, stampCount: stamps.length, utteranceCount: utterances.length }, null, 2)
  );
  const transcript = cleanThai(alt.transcript || "");
  fs.writeFileSync(path.join(OUT, `${guid}.transcript.txt`), transcript + "\n");
  const stampTxt = stamps.map((s) => `${fmtTime(s.start)} ${s.label}`).join("\n") + "\n";
  fs.writeFileSync(path.join(OUT, `${guid}.timestamps.txt`), stampTxt);
  fs.writeFileSync(
    path.join(OUT, `${guid}.timestamps.json`),
    JSON.stringify({ ...meta, timestamps: stamps }, null, 2)
  );
  // Friendly filename by lesson index/title
  const safe = String(lesson.title || guid)
    .replace(/[\\/:*?"<>|]+/g, "")
    .slice(0, 60);
  fs.writeFileSync(
    path.join(OUT, `by-lesson/${String(lesson.i).padStart(2, "0")}-${safe}.timestamps.txt`),
    `# ${lesson.title}\n# ${lesson.ch} | ${guid}\n\n${stampTxt}`
  );
  return { stamps: stamps.length, chars: transcript.length };
}

async function processOne(env, lesson) {
  const guid = lesson.bunnyGuid;
  const stampPath = path.join(OUT, `${guid}.timestamps.txt`);
  if (!FORCE && !RETRY_FAILED && fs.existsSync(stampPath)) {
    return { guid, skipped: true };
  }
  const mp4 = path.join(OUT, "media", `${guid}.mp4`);
  const mp3 = path.join(OUT, "media", `${guid}.mp3`);
  fs.mkdirSync(path.dirname(mp4), { recursive: true });

  const t0 = Date.now();
  process.stdout.write(`[${lesson.i}] ${lesson.title.slice(0, 40)}… download `);
  const { bytes, source } = await downloadMp4(guid, mp4);
  process.stdout.write(`${(bytes / 1e6).toFixed(1)}MB(${source}) → audio `);
  await extractMp3(mp4, mp3);
  // Drop mp4 to save disk; keep mp3 until done
  fs.unlinkSync(mp4);
  process.stdout.write("→ stt ");
  const json = await deepgramTranscribe(env.DEEPGRAM_API_KEY, mp3);
  fs.unlinkSync(mp3);
  const stats = writeOutputs(lesson, json);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`OK stamps=${stats.stamps} chars=${stats.chars} (${sec}s)`);
  return { guid, skipped: false, ...stats };
}

async function mapPool(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const env = loadEnv();
  if (!env.DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY missing");
  if (!fs.existsSync(FFMPEG)) throw new Error(`ffmpeg missing: ${FFMPEG}`);
  if (!fs.existsSync(MAP)) throw new Error(`lesson map missing: ${MAP}`);

  fs.mkdirSync(path.join(OUT, "by-lesson"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "media"), { recursive: true });

  const map = JSON.parse(fs.readFileSync(MAP, "utf8"));
  let lessons = map.lessons.filter((l) => l.bunnyGuid);
  if (RETRY_FAILED) {
    const indexPath = path.join(OUT, "index.json");
    if (!fs.existsSync(indexPath)) throw new Error("--retry-failed needs tmp/video-transcripts/index.json");
    const failedIs = new Set(
      JSON.parse(fs.readFileSync(indexPath, "utf8")).lessons.filter((l) => l.error).map((l) => l.i)
    );
    lessons = lessons.filter((l) => failedIs.has(l.i));
    // force re-attempt even if a partial timestamps file exists
  }
  if (ONLY) lessons = lessons.filter((l) => String(l.bunnyGuid).startsWith(ONLY) || String(l.id) === ONLY);
  lessons = lessons.slice(0, LIMIT);

  console.log(`Transcribing ${lessons.length} videos → ${OUT}`);
  console.log(`CDN ${CDN} | concurrency ${CONCURRENCY} | force=${FORCE}`);

  const results = await mapPool(lessons, CONCURRENCY, async (lesson) => {
    try {
      return await processOne(env, lesson);
    } catch (e) {
      console.error(`\nFAIL [${lesson.i}] ${lesson.title}: ${e.message}`);
      return { guid: lesson.bunnyGuid, error: e.message };
    }
  });

  const ok = results.filter((r) => r && !r.error && !r.skipped).length;
  const skip = results.filter((r) => r?.skipped).length;
  const fail = results.filter((r) => r?.error).length;
  const index = {
    generatedAt: new Date().toISOString(),
    ok,
    skipped: skip,
    failed: fail,
    lessons: lessons.map((l, i) => ({
      i: l.i,
      title: l.title,
      bunnyGuid: l.bunnyGuid,
      ...(results[i] || {}),
    })),
  };
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 2));
  console.log(`\nDone. ok=${ok} skipped=${skip} failed=${fail}`);
  console.log(`Timestamps: ${path.join(OUT, "by-lesson")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
