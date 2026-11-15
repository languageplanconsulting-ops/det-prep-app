#!/usr/bin/env node
/**
 * Attach the adaptive-dictation sentence bank to every fixed mock set.
 *
 * Source of truth: scripts/data/adaptive-dictation-bank.json — 9 sentences per
 * mock (Easy ×3, 110 ×2, 130 ×2, 150 ×2). That file is git-ignored on purpose:
 * it is the answer key and this repo is public. Keep it locally / in a private store. For each sentence this script:
 *   - "kept":      reuses the audio already on that mock's dictation step,
 *   - "new" / "shortened": synthesizes it with Deepgram (same model as the
 *                  admin builder's /api/speech-synthesize default),
 * uploads the MP3 to the public `mock-audio` bucket (content-addressed, so a
 * re-run never re-uploads), then writes the bank onto the set's FIRST
 * dictation item as `content.adaptive_dictation`. Nothing else in the row is
 * touched, so removing that key restores the old fixed behaviour.
 *
 * Idempotent — safe to re-run after editing sentences in the JSON.
 *
 *   node scripts/apply-adaptive-dictation-bank.mjs            # upload + write DB
 *   node scripts/apply-adaptive-dictation-bank.mjs --dry-run  # report only
 *   node scripts/apply-adaptive-dictation-bank.mjs --mock 4   # one mock only
 */
import { createHash } from "node:crypto";
import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "mock-audio";
const PREFIX = "dictation-adaptive";
const LEVELS = ["easy", "110", "130", "150"];
const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_MOCK = (() => {
  const i = process.argv.indexOf("--mock");
  return i > 0 ? Number(process.argv[i + 1]) : null;
})();

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const i = line.indexOf("=");
      if (i < 1 || line.trim().startsWith("#")) continue;
      const key = line.slice(0, i).trim();
      if (process.env[key]) continue;
      process.env[key] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim();
const ttsModel = process.env.DEEPGRAM_TTS_MODEL?.trim() || "aura-2-thalia-en";
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");

/** Network calls here are flaky on long runs ("fetch failed"): time-box and retry each one. */
async function withRetry(label, fn, attempts = 4) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const why = e?.cause?.code || e?.cause?.message || e?.message || String(e);
      console.warn(`  retry ${i}/${attempts} ${label}: ${why}`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw last;
}

const timedFetch = (input, init = {}) =>
  fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(60_000) });

const sb = createClient(url, serviceKey, {
  auth: { persistSession: false },
  global: { fetch: timedFetch },
});

/** "Mock 4" / "mock 4" → 4 */
const mockNumber = (name) => Number(String(name ?? "").replace(/\D/g, "")) || null;

function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(String(dataUrl ?? ""));
  return m ? { mime: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}

async function synthesize(text) {
  if (!deepgramKey) throw new Error("DEEPGRAM_API_KEY missing — cannot synthesize new sentences");
  const res = await timedFetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(ttsModel)}`, {
    method: "POST",
    headers: { Authorization: `Token ${deepgramKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!bytes.length) throw new Error("Deepgram returned empty audio");
  return { mime: res.headers.get("content-type")?.split(";")[0] || "audio/mpeg", bytes };
}

const existingObjects = new Set();
async function loadExistingObjects() {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(BUCKET).list(PREFIX, { limit: 1000, offset });
    if (error) throw new Error(`list ${BUCKET}/${PREFIX}: ${error.message}`);
    for (const o of data ?? []) existingObjects.add(`${PREFIX}/${o.name}`);
    if (!data || data.length < 1000) break;
  }
}

/** Content-addressed upload; returns the public URL. */
async function uploadAudio(key, audio) {
  const ext = audio.mime.includes("wav") ? "wav" : "mp3";
  const path = `${PREFIX}/${key}.${ext}`;
  if (!existingObjects.has(path) && !DRY_RUN) {
    await withRetry(`upload ${path}`, async () => {
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(path, audio.bytes, { contentType: audio.mime, upsert: true, cacheControl: "31536000" });
      if (error) throw new Error(error.message);
    });
    existingObjects.add(path);
  }
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function main() {
  const bank = JSON.parse(fs.readFileSync("scripts/data/adaptive-dictation-bank.json", "utf8"));

  const { data: sets, error: setsErr } = await sb.from("mock_fixed_sets").select("id,name");
  if (setsErr) throw setsErr;
  const setByMock = new Map(sets.map((s) => [mockNumber(s.name), s]));

  const { data: items, error: itemsErr } = await sb
    .from("mock_fixed_set_items")
    .select("id,set_id,step_index,content")
    .eq("task_type", "dictation")
    .order("step_index");
  if (itemsErr) throw itemsErr;

  await loadExistingObjects();

  const mocks = [...new Set(bank.map((b) => b.mock))].filter((m) => ONLY_MOCK == null || m === ONLY_MOCK);
  let synthesized = 0;
  let reused = 0;
  let written = 0;

  for (const mock of mocks) {
    const set = setByMock.get(mock);
    if (!set) {
      console.warn(`Mock ${mock}: no set found — skipped`);
      continue;
    }
    const setItems = items.filter((i) => i.set_id === set.id);
    const first = setItems[0];
    if (!first) {
      console.warn(`Mock ${mock}: no dictation items — skipped`);
      continue;
    }

    const levels = Object.fromEntries(LEVELS.map((l) => [l, []]));
    for (const row of bank.filter((b) => b.mock === mock)) {
      const key = createHash("sha1").update(`${ttsModel}\n${row.sentence}`).digest("hex").slice(0, 20);
      // A hand-checked take (e.g. a re-recording after a bad TTS take) wins.
      if (row.audioUrl) {
        levels[row.level].push({ sentence: row.sentence, audio_url: row.audioUrl });
        continue;
      }
      let audio = null;
      if (row.source === "kept") {
        const src = setItems.find((i) => i.step_index === row.fromStep);
        if (src?.content?.reference_sentence?.trim() !== row.sentence.trim()) {
          throw new Error(`Mock ${mock} step ${row.fromStep}: sentence in DB no longer matches the bank — re-check the JSON`);
        }
        audio = decodeDataUrl(src.content.audio_url);
        if (audio) reused += 1;
      }
      if (!audio) {
        const ext = "mp3";
        if (!existingObjects.has(`${PREFIX}/${key}.${ext}`)) {
          audio = DRY_RUN
            ? { mime: "audio/mpeg", bytes: Buffer.alloc(0) }
            : await withRetry(`tts "${row.sentence.slice(0, 30)}…"`, () => synthesize(row.sentence));
          synthesized += 1;
        } else {
          audio = { mime: "audio/mpeg", bytes: Buffer.alloc(0) }; // already uploaded
        }
      }
      const audioUrl = await uploadAudio(key, audio);
      levels[row.level].push({ sentence: row.sentence, audio_url: audioUrl });
    }

    const missing = LEVELS.filter((l) => levels[l].length === 0);
    if (missing.length) throw new Error(`Mock ${mock}: empty level(s) ${missing.join(", ")}`);

    const content = { ...(first.content ?? {}), adaptive_dictation: { version: 1, levels } };
    if (!DRY_RUN) {
      await withRetry(`write mock ${mock}`, async () => {
        const { error } = await sb.from("mock_fixed_set_items").update({ content }).eq("id", first.id);
        if (error) throw new Error(error.message);
      });
      written += 1;
    }
    console.log(
      `Mock ${mock}: ${LEVELS.map((l) => `${l}×${levels[l].length}`).join(" ")} → step ${first.step_index}${DRY_RUN ? " (dry run)" : ""}`,
    );
  }

  console.log(
    `\nDone. synthesized ${synthesized}, reused existing audio ${reused}, sets written ${written}${DRY_RUN ? " (dry run — nothing uploaded or written)" : ""}.`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? `${e.message}${e.cause ? ` (cause: ${e.cause.code ?? e.cause.message ?? e.cause})` : ""}` : e);
  process.exit(1);
});
