/**
 * Checks hand-written Interactive Speaking scenarios and imports them into the live content bank.
 *
 *   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/build-interactive-speaking-bank.ts
 *       report only: scenarios per round (live bank + saved files) and how many each round still needs
 *   ... --list                 every title and starter already used, by round (for writing new ones)
 *   ... --add=batch.json       validate a file of new scenarios ({"scenarios":[...]} or a bare array);
 *                              the valid ones are appended to generated-interactive-speaking/round<r>.json
 *   ... --check                re-validate everything saved under generated-interactive-speaking/
 *   ... --upload-only          merge the saved files into the live bank (backup → re-read → write → read back)
 *
 * Nothing is written to the live bank unless --upload-only is passed.
 *
 * Shape and rules: docs/interactive-speaking/det-interactive-speaking-spec.md. A scenario is only an
 * opening question; the app generates the five follow-ups from the title and starter, so those two
 * fields carry the whole conversation. Learners see a scenario as soon as it is in the array (there is
 * no admin-occupancy map for this skill); the round filter is `round ?? 1`, so the 31 original
 * scenarios without a round all sit in round 1.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { InteractiveSpeakingScenario } from "../src/types/interactive-speaking";

const KEY = "ep-interactive-speaking-scenarios-v1";
const ROUNDS = [1, 2, 3, 4, 5] as const;
const TARGET_PER_ROUND = 30;
const OUT_DIR = "generated-interactive-speaking";

const LIST = process.argv.includes("--list");
const CHECK = process.argv.includes("--check");
const UPLOAD_ONLY = process.argv.includes("--upload-only");
const add = process.argv.find((a) => a.startsWith("--add="))?.slice(6);

type Round = (typeof ROUNDS)[number];
type Scenario = InteractiveSpeakingScenario & { round: Round };

// ---------- validation ----------

const THAI = /[฀-๿]/;
/** Polite particles would make the Thai read as one gender; the bank's Thai is particle-free. */
const THAI_PARTICLE = /(ครับ|ค่ะ|นะคะ)(?=\s|\?|$)/;
/** Fairness and bias filter (manual §4.2): distressing, sensitive or culture-bound content. */
const BANNED =
  /\b(kill(?:ed|ing)?|murder|guns?|weapons?|wars?|bombs?|suicide|die[ds]?|death|dead|funeral|cancer|disease|sick|illness|hospital|religions?|religious|god|pray(?:ing)?|drunk|alcohol|beer|wine|drugs?|sex|dating|boyfriend|girlfriend|divorce|debt|poverty|politicians?|elections?|president|prime minister|king|queen|monarchy)\b/i;
/** Questions must not assume the learner has these (spec rule 3). */
const ASSUMES = /\byour (job|boss|husband|wife|children|kids|son|daughter|brother|sister|car|university|salary)\b/i;
const STOP = new Set(
  "a an the and or of to in on at for with your you do does did is are was were be what how why when where which who would could should can will about it its that this there have has from as by than more most".split(" "),
);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const contentSet = (s: string) => new Set(norm(s).split(" ").filter((w) => w && !STOP.has(w)));
function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / Math.min(a.size, b.size);
}

function shapeProblems(s: Partial<Scenario>): string[] {
  const bad: string[] = [];
  const id = String(s.id ?? "");
  const titleEn = String(s.titleEn ?? "").trim();
  const titleTh = String(s.titleTh ?? "").trim();
  const qEn = String(s.starterQuestionEn ?? "").trim();
  const qTh = String(s.starterQuestionTh ?? "").trim();

  if (!/^is-[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 48) bad.push(`id "${id}" must be is-kebab-case, ≤48 chars`);
  if (!ROUNDS.includes(s.round as Round)) bad.push(`round must be 1–5 (got ${String(s.round)})`);

  const tw = words(titleEn).length;
  if (tw < 2 || tw > 8) bad.push(`titleEn ${tw} words (2–8)`);
  if (/[.!]$/.test(titleEn)) bad.push("titleEn ends with . or !");
  if (titleEn && titleEn[0] !== titleEn[0].toUpperCase()) bad.push("titleEn must start with a capital");
  if (!THAI.test(titleTh)) bad.push("titleTh has no Thai");
  if (titleTh.length > 60) bad.push("titleTh over 60 chars");

  const qw = words(qEn).length;
  if (qw < 8 || qw > 30) bad.push(`starterQuestionEn ${qw} words (8–30: one spoken question)`);
  if (!/[?.]$/.test(qEn)) bad.push("starterQuestionEn must end with ? or .");
  if ((qEn.match(/\?/g) ?? []).length > 2) bad.push("starterQuestionEn asks more than two questions");
  if ((qEn.match(/[.?!](\s|$)/g) ?? []).length > 2) bad.push("starterQuestionEn has more than two sentences");
  if (/[\n•\-–]\s/.test(qEn) || /\n/.test(qEn)) bad.push("starterQuestionEn must be plain prose (no lists or line breaks)");
  if (/[^\x20-\x7E\u00C0-\u00FF’]/.test(qEn) || /[^\x20-\x7E\u00C0-\u00FF’]/.test(titleEn)) bad.push("English fields contain non-ASCII characters");
  if (!THAI.test(qTh)) bad.push("starterQuestionTh has no Thai");
  if (THAI_PARTICLE.test(qTh) || THAI_PARTICLE.test(titleTh)) bad.push("Thai uses ครับ/ค่ะ (keep it particle-free)");
  if (qEn.includes("?") && !qTh.includes("?")) bad.push("English asks a question but the Thai has no ?");

  const en = `${titleEn} ${qEn}`;
  const ban = en.match(BANNED);
  if (ban) bad.push(`fairness filter: "${ban[0]}"`);
  const assume = en.match(ASSUMES);
  if (assume) bad.push(`assumes the learner has "${assume[0]}"`);

  if (s.thumbnail !== undefined) {
    const t = String(s.thumbnail);
    // The web hub shows the thumbnail as an emoji only when it is ≤4 UTF-16 units.
    if (t.length > 4 || !/\p{Extended_Pictographic}/u.test(t)) bad.push(`thumbnail "${t}" must be one short emoji`);
  }
  return bad;
}

type Used = { ids: Set<string>; titles: { norm: string; set: Set<string>; label: string }[]; starters: { norm: string; set: Set<string>; label: string }[] };

function usedFrom(list: InteractiveSpeakingScenario[]): Used {
  const u: Used = { ids: new Set(), titles: [], starters: [] };
  for (const s of list) remember(u, s);
  return u;
}
function remember(u: Used, s: InteractiveSpeakingScenario) {
  u.ids.add(s.id);
  u.titles.push({ norm: norm(s.titleEn), set: contentSet(s.titleEn), label: `${s.id} "${s.titleEn}"` });
  u.starters.push({ norm: norm(s.starterQuestionEn), set: contentSet(s.starterQuestionEn), label: s.id });
}

function repeatProblems(s: InteractiveSpeakingScenario, u: Used): string[] {
  const bad: string[] = [];
  if (u.ids.has(s.id)) bad.push(`id ${s.id} already used`);
  const tn = norm(s.titleEn);
  const ts = contentSet(s.titleEn);
  for (const t of u.titles) {
    if (t.norm === tn) { bad.push(`same title as ${t.label}`); break; }
    // a title whose content words all appear in an existing title is the same topic reworded
    if (ts.size >= 2 && overlap(ts, t.set) >= 1) { bad.push(`title too close to ${t.label}`); break; }
  }
  const qn = norm(s.starterQuestionEn);
  const qs = contentSet(s.starterQuestionEn);
  for (const q of u.starters) {
    if (q.norm === qn) { bad.push(`same starter as ${q.label}`); break; }
    if (overlap(qs, q.set) >= 0.7) { bad.push(`starter too close to ${q.label}`); break; }
  }
  return bad;
}

// ---------- bank i/o ----------

function parseScenarios(raw: unknown): InteractiveSpeakingScenario[] {
  const v = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
  return Array.isArray(v) ? (v as InteractiveSpeakingScenario[]) : [];
}
const roundOf = (s: InteractiveSpeakingScenario): Round => (s.round ?? 1) as Round;

function loadSaved(): Record<Round, Scenario[]> {
  const out = {} as Record<Round, Scenario[]>;
  for (const r of ROUNDS) {
    const f = `${OUT_DIR}/round${r}.json`;
    out[r] = fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as Scenario[]) : [];
  }
  return out;
}

function countByRound(list: InteractiveSpeakingScenario[]): Record<Round, number> {
  const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<Round, number>;
  for (const s of list) c[roundOf(s)] = (c[roundOf(s)] ?? 0) + 1;
  return c;
}

/** Field order matches what the admin paste stores, plus round and thumbnail. */
function clean(s: Scenario): Scenario {
  return {
    id: s.id.trim(),
    titleEn: s.titleEn.trim(),
    titleTh: s.titleTh.trim(),
    starterQuestionEn: s.starterQuestionEn.trim(),
    starterQuestionTh: s.starterQuestionTh.trim(),
    round: s.round,
    ...(s.thumbnail ? { thumbnail: s.thumbnail } : {}),
  };
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await sb.from("content_bank_snapshots").select("payload,updated_at").eq("id", "global").maybeSingle();
  if (error || !data) throw new Error(`snapshot read failed: ${error?.message}`);
  const payload = (typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload) as Record<string, unknown>;
  const live = parseScenarios(payload[KEY]);
  const liveIds = new Set(live.map((s) => s.id));
  const saved = loadSaved();
  const pending = ROUNDS.flatMap((r) => saved[r]).filter((s) => !liveIds.has(s.id));
  const liveCount = countByRound(live);
  const pendingCount = countByRound(pending);

  if (LIST) {
    for (const r of ROUNDS) {
      console.log(`\nround ${r}`);
      for (const s of [...live.filter((x) => roundOf(x) === r), ...saved[r].filter((x) => !liveIds.has(x.id))]) {
        console.log(`  ${s.id.padEnd(34)} ${s.titleEn} — ${s.starterQuestionEn}`);
      }
    }
    return;
  }

  if (add || CHECK) {
    // Everything already in the bank, plus everything saved, counts as used, so nothing repeats.
    const used = usedFrom(live);
    const incoming: Scenario[] = [];
    if (add) {
      const raw = JSON.parse(fs.readFileSync(add, "utf8")) as { scenarios?: Scenario[] } | Scenario[];
      for (const r of ROUNDS) for (const s of saved[r]) if (!liveIds.has(s.id)) remember(used, s);
      incoming.push(...(Array.isArray(raw) ? raw : raw.scenarios ?? []));
    } else {
      for (const r of ROUNDS) incoming.push(...saved[r].filter((s) => !liveIds.has(s.id)));
    }
    const have = { ...liveCount };
    if (add) for (const r of ROUNDS) have[r] += pendingCount[r];
    const accepted: Record<Round, Scenario[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    let rejected = 0;
    for (const s of incoming) {
      const bad = shapeProblems(s);
      if (!bad.length) bad.push(...repeatProblems(s, used));
      if (!bad.length && add && have[s.round] >= TARGET_PER_ROUND) bad.push(`round ${s.round} already has ${TARGET_PER_ROUND}`);
      if (bad.length) {
        rejected++;
        console.log(`✕ ${s.id ?? "(no id)"} — ${bad.join("; ")}`);
        continue;
      }
      remember(used, s);
      have[s.round]++;
      accepted[s.round].push(clean(s));
      if (add) console.log(`✓ r${s.round} ${s.id}`);
    }
    if (CHECK) {
      console.log(`checked ${incoming.length} saved scenarios: ${incoming.length - rejected} valid, ${rejected} with problems`);
      if (rejected) process.exitCode = 1;
      return;
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const r of ROUNDS) {
      if (!accepted[r].length) continue;
      const f = `${OUT_DIR}/round${r}.json`;
      fs.writeFileSync(f, `${JSON.stringify([...saved[r], ...accepted[r]], null, 1)}\n`);
      console.log(`round ${r}: +${accepted[r].length} → ${saved[r].length + accepted[r].length} saved in ${f} (bank ${liveCount[r]} + saved = ${have[r]}/${TARGET_PER_ROUND})`);
    }
    console.log(`${incoming.length - rejected}/${incoming.length} accepted`);
    if (rejected) process.exitCode = 1;
    return;
  }

  if (!UPLOAD_ONLY) {
    console.log(`live bank: ${live.length} scenarios (snapshot updated ${data.updated_at})`);
    for (const r of ROUNDS) {
      const total = liveCount[r] + pendingCount[r];
      console.log(
        `  round ${r}: ${String(liveCount[r]).padStart(2)} live + ${String(pendingCount[r]).padStart(2)} saved, not uploaded = ${String(total).padStart(2)}/${TARGET_PER_ROUND}` +
          (total < TARGET_PER_ROUND ? `  (needs ${TARGET_PER_ROUND - total})` : ""),
      );
    }
    console.log(pending.length ? `run with --upload-only to add the ${pending.length} saved scenarios` : "nothing waiting to upload");
    return;
  }

  // ---------- upload ----------
  if (!pending.length) {
    console.log("nothing to upload: every saved scenario is already in the bank");
    return;
  }
  // Re-validate before shipping: a hand-edited file must not skip the checks.
  const used = usedFrom(live);
  for (const s of pending) {
    const bad = [...shapeProblems(s), ...repeatProblems(s, used)];
    if (bad.length) throw new Error(`refusing to upload — ${s.id}: ${bad.join("; ")} (run --check)`);
    remember(used, s);
  }

  const backup = `content-bank-backup-${new Date(data.updated_at as string).toISOString().replace(/[:.]/g, "-")}.json`;
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(payload));
  console.log("backup →", backup);

  // A browser publishing from the admin pushes its whole local bank to this row, so re-read right
  // before writing and merge into whatever is there now.
  const { data: fresh } = await sb.from("content_bank_snapshots").select("payload,updated_at").eq("id", "global").maybeSingle();
  if (!fresh) throw new Error("snapshot vanished");
  if (fresh.updated_at !== data.updated_at) console.warn(`! snapshot changed since the first read (${data.updated_at} → ${fresh.updated_at}); merging into the newer one`);
  const freshPayload = (typeof fresh.payload === "string" ? JSON.parse(fresh.payload) : fresh.payload) as Record<string, unknown>;
  const freshRaw = freshPayload[KEY];
  const freshList = parseScenarios(freshRaw);
  const freshIds = new Set(freshList.map((s) => s.id));
  // same flag the admin paste sets on uploaded scenarios
  const toAdd = pending.filter((s) => !freshIds.has(s.id)).map((s) => ({ ...clean(s), uploadedByAdmin: true }));
  const merged = [...freshList, ...toAdd];
  // the bank stores this key as a JSON string; keep whatever type is there
  freshPayload[KEY] = typeof freshRaw === "string" || freshRaw === undefined ? JSON.stringify(merged) : merged;

  const { error: writeErr } = await sb
    .from("content_bank_snapshots")
    .update({ payload: freshPayload, updated_at: new Date().toISOString() })
    .eq("id", "global");
  if (writeErr) throw new Error(`WRITE FAILED: ${writeErr.message}`);

  const { data: check } = await sb.from("content_bank_snapshots").select("payload").eq("id", "global").maybeSingle();
  const checkList = parseScenarios(
    ((typeof check!.payload === "string" ? JSON.parse(check!.payload) : check!.payload) as Record<string, unknown>)[KEY],
  );
  const checkIds = new Set(checkList.map((s) => s.id));
  const missing = toAdd.filter((s) => !checkIds.has(s.id));
  const after = countByRound(checkList);
  console.log(`wrote ${toAdd.length} scenarios · bank now holds ${checkList.length} (read back from the server)`);
  for (const r of ROUNDS) console.log(`  round ${r}: ${after[r]}`);
  if (missing.length) {
    console.error(`!! ${missing.length} scenarios did not land: ${missing.map((s) => s.id).join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
