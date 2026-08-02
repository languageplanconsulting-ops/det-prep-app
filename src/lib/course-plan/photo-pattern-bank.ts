/**
 * Answer-pattern + vocabulary content for write/speak-about-photo, sourced
 * directly from the course's "ปูพื้นฐานแกรมม่าร์" (Grammar Basics) PDF handout
 * (chapter "Writing about a photo").
 *
 * Single source of truth for both the on-screen hint panel
 * (WritePhotoHintPanel) and the AI grading prompt (gemini-photo-speak) — the
 * grader is told the exact same words the learner was shown, so it can tell
 * "used our word" apart from "needs to reach for a better word".
 */

export type PhotoTopic = "people" | "places" | "objects";

export type PatternStep = { en: string; th: string };
export type PatternTemplate = { titleTh: string; steps: PatternStep[] };

export const PATTERN_PEOPLE: PatternTemplate = {
  titleTh: "Pattern 1 — บรรยาย “คน” ในภาพ",
  steps: [
    { en: "This picture depicts ______ who ______.", th: "บอกว่าในภาพมีใคร กำลังทำอะไร (ใช้ who + กริยา)" },
    { en: "Judging from ______, they are probably ______.", th: "เดาอาชีพ/สถานะจากเสื้อผ้า ท่าทาง หรือฉากหลัง" },
    { en: "Finally, even though ______, ______.", th: "ใส่มุมที่ขัดแย้งเล็กน้อย แล้วสรุปปิดท้าย" },
  ],
};

export const PATTERN_PLACES: PatternTemplate = {
  titleTh: "Pattern 2 — บรรยาย “สถานที่” ในภาพ",
  steps: [
    { en: "This picture depicts ______ surrounded by ______.", th: "บอกสถานที่หลัก + สิ่งที่ล้อมรอบ" },
    { en: "Judging from ______, this place may be located in ______.", th: "เดาว่าอยู่ประเทศ/ภูมิภาคไหนจากลักษณะภาพ" },
    { en: "Finally, even though ______, ______.", th: "ใส่มุมที่ขัดแย้งเล็กน้อย แล้วสรุปปิดท้าย" },
  ],
};

export type Word = { w: string; th: string };
export type VocabBank = { key: string; icon: string; label: string; sub: string; words: Word[] };

/** Exact wording from the PDF's "Vocabulary to describe people (for 120 and above)". */
const PEOPLE_BANK: VocabBank = {
  key: "people",
  icon: "👤",
  label: "บรรยายคน",
  sub: "People",
  words: [
    { w: "approachable", th: "เข้าถึงง่าย เป็นมิตร" },
    { w: "benevolent", th: "ใจดี ใจกว้าง" },
    { w: "elegant", th: "สง่างาม" },
    { w: "gracious", th: "งดงามอย่างมีน้ำใจ" },
    { w: "ingenious", th: "ฉลาด หัวไว" },
    { w: "light-hearted", th: "ร่าเริง เบาสบายใจ" },
    { w: "kind-hearted", th: "ใจดี ใจกว้าง" },
    { w: "lively", th: "มีชีวิตชีวา" },
    { w: "nurturing", th: "เอาใจใส่ ดูแลผู้อื่น" },
    { w: "optimistic", th: "มองโลกในแง่บวก" },
    { w: "persistent", th: "มุ่งมั่น พยายามไม่ลดละ" },
    { w: "sensitive", th: "ใส่ใจความรู้สึกผู้อื่น" },
  ],
};

/** PDF's "Adjectives for nature" + "Noun for natural attractions". */
const NATURE_BANK: VocabBank = {
  key: "nature",
  icon: "🏞️",
  label: "บรรยายธรรมชาติ",
  sub: "Nature",
  words: [
    { w: "scenic", th: "วิวสวย" },
    { w: "breathtaking", th: "สวยจนต้องกลั้นหายใจ" },
    { w: "wild", th: "เป็นธรรมชาติดิบ ไร้การปรุงแต่ง" },
    { w: "stunning", th: "สวยตะลึง" },
    { w: "picturesque", th: "สวยเหมือนภาพวาด" },
    { w: "exotic", th: "แปลกตาแบบต่างถิ่น" },
    { w: "unique", th: "มีเอกลักษณ์ ไม่เหมือนใคร" },
    { w: "national park", th: "อุทยานแห่งชาติ (เช่น Yosemite)" },
    { w: "waterfall", th: "น้ำตก (เช่น Niagara Falls)" },
    { w: "mountain range", th: "เทือกเขา (เช่น Rocky Mountains)" },
    { w: "beach", th: "ชายหาด (เช่น Bondi Beach)" },
    { w: "forest", th: "ป่า (เช่น Amazon Rainforest)" },
    { w: "volcano", th: "ภูเขาไฟ (เช่น Mount Fuji)" },
    { w: "hot spring", th: "บ่อน้ำพุร้อน (เช่น Blue Lagoon)" },
  ],
};

/** PDF's "Adjectives for city" + "Places in a city". */
const CITY_BANK: VocabBank = {
  key: "city",
  icon: "🏙️",
  label: "บรรยายเมือง",
  sub: "City",
  words: [
    { w: "vibrant", th: "มีชีวิตชีวา คึกคัก" },
    { w: "cultural", th: "เชิงวัฒนธรรม" },
    { w: "historic", th: "มีประวัติศาสตร์" },
    { w: "modern", th: "ทันสมัย" },
    { w: "progressive", th: "ก้าวหน้า" },
    { w: "fast-paced", th: "จังหวะชีวิตเร็ว" },
    { w: "crowded", th: "แออัด คนเยอะ" },
    { w: "industrial", th: "แบบอุตสาหกรรม" },
    { w: "dense", th: "หนาแน่น" },
    { w: "traffic-congested", th: "รถติด" },
    { w: "skyscraper", th: "ตึกระฟ้า" },
    { w: "monument", th: "อนุสาวรีย์" },
    { w: "plaza", th: "ลานเมือง" },
    { w: "bridge", th: "สะพาน" },
    { w: "cathedral", th: "อาสนวิหาร" },
    { w: "temple", th: "วัด" },
  ],
};

/** Generic banks kept from the original panel — not PDF content, still useful for the "objects" topic. */
const THINGS_BANK: VocabBank = {
  key: "things",
  icon: "📦",
  label: "บรรยายสิ่งของ",
  sub: "Things",
  words: [
    { w: "sturdy", th: "แข็งแรงทนทาน" }, { w: "delicate", th: "บอบบาง" },
    { w: "antique", th: "เก่าแก่ โบราณ" }, { w: "colourful", th: "มีสีสัน" },
    { w: "worn-out", th: "เก่าทรุดโทรม" }, { w: "polished", th: "ขัดเงา" },
    { w: "handmade", th: "ทำด้วยมือ" }, { w: "shiny", th: "เป็นเงาวับ" },
    { w: "fragile", th: "แตกหักง่าย" }, { w: "bulky", th: "เทอะทะ ใหญ่" },
    { w: "compact", th: "กะทัดรัด" }, { w: "ornate", th: "ประดับประดา" },
    { w: "rustic", th: "ดิบ แบบบ้านนา" }, { w: "transparent", th: "โปร่งใส" },
    { w: "sleek", th: "เพรียวเรียบหรู" }, { w: "vintage", th: "ย้อนยุค" },
    { w: "faded", th: "สีซีด" }, { w: "lightweight", th: "น้ำหนักเบา" },
    { w: "intricate", th: "รายละเอียดซับซ้อน" }, { w: "weathered", th: "ผุกร่อนตามกาล" },
  ],
};

const FEELINGS_BANK: VocabBank = {
  key: "feelings",
  icon: "😊",
  label: "ความรู้สึก",
  sub: "Feelings",
  words: [
    { w: "peaceful", th: "สงบใจ" }, { w: "nostalgic", th: "คิดถึงอดีต" },
    { w: "energized", th: "เต็มไปด้วยพลัง" }, { w: "relaxed", th: "ผ่อนคลาย" },
    { w: "overwhelmed", th: "ท่วมท้น รับมือไม่ไหว" }, { w: "content", th: "พอใจ" },
    { w: "inspired", th: "มีแรงบันดาลใจ" }, { w: "curious", th: "อยากรู้" },
    { w: "amazed", th: "ทึ่ง" }, { w: "at ease", th: "สบายใจ" },
    { w: "refreshed", th: "สดชื่น" }, { w: "anxious", th: "กังวล" },
    { w: "joyful", th: "เปี่ยมสุข" }, { w: "homesick", th: "คิดถึงบ้าน" },
    { w: "motivated", th: "มีแรงจูงใจ" }, { w: "grateful", th: "รู้สึกขอบคุณ" },
    { w: "excited", th: "ตื่นเต้น" }, { w: "calm", th: "สงบ" },
    { w: "melancholic", th: "เศร้าสร้อย" }, { w: "hopeful", th: "มีความหวัง" },
  ],
};

/** Every bank, always shown — the topic prop only controls which ones default open. */
export const VOCAB_BANKS: VocabBank[] = [PEOPLE_BANK, NATURE_BANK, CITY_BANK, THINGS_BANK, FEELINGS_BANK];

export const PATTERNS_FOR_TOPIC: Record<PhotoTopic, PatternTemplate[]> = {
  people: [PATTERN_PEOPLE],
  places: [PATTERN_PLACES],
  objects: [PATTERN_PEOPLE, PATTERN_PLACES],
};

export const DEFAULT_OPEN_BANK_FOR_TOPIC: Record<PhotoTopic, string | null> = {
  people: "people",
  places: "nature",
  objects: "things",
};

/**
 * Flat word list for a topic, handed to the AI grader as "words the learner
 * was already shown" — see gemini-photo-speak.ts's targetVocabulary rule.
 * Words-only (no Thai gloss): the grader just needs to recognise them in the
 * learner's transcript.
 */
export function targetVocabularyForTopic(topic: PhotoTopic): string[] {
  const banks: VocabBank[] =
    topic === "people" ? [PEOPLE_BANK] : topic === "places" ? [NATURE_BANK, CITY_BANK] : [THINGS_BANK];
  return banks.flatMap((b) => b.words.map((w) => w.w));
}

/**
 * Every word across every bank — used outside the course (standalone
 * write/speak-about-photo practice), where the photo has no known
 * people/objects/places topic but the hint panel still shows the learner the
 * full set of banks when unlocked.
 */
export function targetVocabularyAll(): string[] {
  return VOCAB_BANKS.flatMap((b) => b.words.map((w) => w.w));
}

/** Derives the curriculum's people/objects/places topic from an exercise key like "mwp-people" / "hsp-places". */
export function photoTopicFromExerciseKey(exerciseKey: string): PhotoTopic | null {
  if (/-people$/.test(exerciseKey)) return "people";
  if (/-places$/.test(exerciseKey)) return "places";
  if (/-objects$/.test(exerciseKey)) return "objects";
  return null;
}
