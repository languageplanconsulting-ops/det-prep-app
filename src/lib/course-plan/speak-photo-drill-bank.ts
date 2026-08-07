/**
 * Guided speak-about-photo drills — built ONLY from what the photo lectures
 * teach: the two answer patterns and the four vocabulary banks in
 * photo-pattern-bank.ts (which is the "Grammar Basics สำหรับอธิบายรูป + คน"
 * handout as data).
 *
 * Every content word in these model answers is either a pattern word
 * (depicts / judging from / surrounded by / even though) or a word printed on
 * that handout's vocabulary pages. Nothing is invented — see the assertion in
 * the test at the bottom of photo-pattern-bank consumers.
 *
 * Three to four sentences each, deliberately short: the learner rebuilds it
 * word by word, hears it, then says it back, and a 100-word script would make
 * the recording stage a memory test instead of a pronunciation one.
 */

export type SpeakPhotoDrillItem = {
  id: string;
  /**
   * The photo being described, as an id in lesson-photo-bank.
   *
   * Not optional in spirit: this is "speak about the PHOTO", and the drill used
   * to show only the script, so a learner rebuilt a description of an image
   * they had never seen. Every id here was opened and looked at — the bank's
   * `scene` labels are unreliable (one "people jogging in a park" is a bird in
   * grass), so never pair one from the label alone.
   */
  photoId: string;
  /** Which photo family this drill belongs to. */
  topic: string;
  topicTh: string;
  essay: string;
  essayTh: string;
  moves: { label: string; en: string }[];
  /** Pick-the-right-form gaps: phrase in the essay → correct form + wrong forms. */
  choices?: { phrase: string; options: string[] }[];
  /** The lecture words used here, surfaced to the learner before they start. */
  vocabUsed: { w: string; th: string }[];
};

export const SPEAK_PHOTO_DRILLS: SpeakPhotoDrillItem[] = [
  {
    id: "spd-people",
    photoId: "8bd7c8ae-a9d5-4c8a-9a4d-3c5cb7636205",
    choices: [
      { phrase: "depicts", options: ["depict", "depicts", "depicted"] },
      { phrase: "is jogging", options: ["is jogging", "are jogging", "jogs"] },
      { phrase: "a professional athlete", options: ["a professional athlete", "professional athletes"] },
      { phrase: "seems", options: ["seem", "seems", "seemed"] },
    ],
    topic: "Speak about this photo — a woman jogging in a park (Pattern 1: people)",
    topicTh: "พูดบรรยายภาพคน — ใช้ Pattern 1",
    essay:
      "This picture depicts a woman who is jogging in a park. Judging from what she wears, she is probably a professional athlete. She looks lively and persistent. Finally, even though the woman in pink looks tired, she seems very optimistic.",
    essayTh:
      "ภาพนี้แสดงถึงผู้หญิงคนหนึ่งที่กำลังวิ่งจ๊อกกิ้งในสวน ดูจากชุดที่เธอใส่ เธอน่าจะเป็นนักกีฬาอาชีพ เธอดูมีชีวิตชีวาและมุ่งมั่นไม่ลดละ สุดท้ายนี้ ถึงแม้ผู้หญิงชุดชมพูจะดูเหนื่อย แต่เธอก็ดูมองโลกในแง่บวกมาก",
    moves: [
      { label: "ประโยคที่ 1 — depicts + who", en: "This picture depicts a woman who is jogging in a park." },
      { label: "ประโยคที่ 2 — Judging from", en: "Judging from what she wears, she is probably a professional athlete." },
      { label: "ประโยคที่ 3 — ใส่คำศัพท์บรรยายคน", en: "She looks lively and persistent." },
      { label: "ประโยคที่ 4 — Finally, even though", en: "Finally, even though the woman in pink looks tired, she seems very optimistic." },
    ],
    vocabUsed: [
      { w: "lively", th: "มีชีวิตชีวา" },
      { w: "persistent", th: "มุ่งมั่น พยายามไม่ลดละ" },
      { w: "optimistic", th: "มองโลกในแง่บวก" },
    ],
  },
  {
    id: "spd-places",
    photoId: "75ae8075-2a07-4c38-92d7-7fa88b0fed4a",
    choices: [
      { phrase: "depicts", options: ["depict", "depicts", "depicted"] },
      { phrase: "surrounded by", options: ["surround by", "surrounded by", "surrounding by"] },
      { phrase: "may be located", options: ["may be located", "may located", "may be locate"] },
      { phrase: "looks", options: ["look", "looks", "looked"] },
    ],
    topic: "Speak about this photo — a lake and mountains (Pattern 2: nature)",
    topicTh: "พูดบรรยายภาพธรรมชาติ — ใช้ Pattern 2",
    essay:
      "This picture depicts a scenic lake surrounded by mountains. Judging from the background, this lake may be located in a country in Europe. The water looks breathtaking and the forest around it is picturesque. Finally, even though the weather looks cold, I believe it must be a popular tourist destination.",
    essayTh:
      "ภาพนี้แสดงถึงทะเลสาบที่มีวิวสวยงามซึ่งมีภูเขาล้อมรอบ ดูจากฉากหลัง ทะเลสาบนี้น่าจะตั้งอยู่ในประเทศแถบยุโรป น้ำดูสวยจนต้องกลั้นหายใจ และป่ารอบ ๆ ก็สวยเหมือนภาพวาด สุดท้ายนี้ ถึงแม้อากาศจะดูหนาว แต่ฉันเชื่อว่าที่นี่ต้องเป็นแหล่งท่องเที่ยวยอดนิยม",
    moves: [
      { label: "ประโยคที่ 1 — depicts + surrounded by", en: "This picture depicts a scenic lake surrounded by mountains." },
      { label: "ประโยคที่ 2 — Judging from + may be located in", en: "Judging from the background, this lake may be located in a country in Europe." },
      { label: "ประโยคที่ 3 — ใส่คำศัพท์ธรรมชาติ", en: "The water looks breathtaking and the forest around it is picturesque." },
      { label: "ประโยคที่ 4 — Finally, even though", en: "Finally, even though the weather looks cold, I believe it must be a popular tourist destination." },
    ],
    vocabUsed: [
      { w: "scenic", th: "วิวสวย" },
      { w: "breathtaking", th: "สวยจนต้องกลั้นหายใจ" },
      { w: "picturesque", th: "สวยเหมือนภาพวาด" },
      { w: "forest", th: "ป่า" },
    ],
  },
  {
    id: "spd-city",
    photoId: "2dd4a8bf-b3ee-4132-b778-b60222303ef8",
    choices: [
      { phrase: "depicts", options: ["depict", "depicts", "depicted"] },
      { phrase: "skyscrapers", options: ["skyscraper", "skyscrapers"] },
      { phrase: "look", options: ["look", "looks", "looked"] },
      { phrase: "must be", options: ["must be", "must is", "must been"] },
    ],
    topic: "Speak about this photo — a busy city (Pattern 2: city)",
    topicTh: "พูดบรรยายภาพเมือง — ใช้ Pattern 2",
    essay:
      "This picture depicts a dense city surrounded by skyscrapers. Judging from the people, this city may be located in a country in Asia. The streets look vibrant but extremely traffic-congested. Finally, even though the city looks crowded, I believe it must be a modern and historic place.",
    essayTh:
      "ภาพนี้แสดงถึงเมืองที่หนาแน่นซึ่งมีตึกระฟ้าล้อมรอบ ดูจากผู้คน เมืองนี้น่าจะตั้งอยู่ในประเทศแถบเอเชีย ถนนดูมีชีวิตชีวาแต่ก็รถติดอย่างมาก สุดท้ายนี้ ถึงแม้เมืองจะดูแออัด แต่ฉันเชื่อว่าที่นี่ต้องเป็นเมืองที่ทันสมัยและมีประวัติศาสตร์",
    moves: [
      { label: "ประโยคที่ 1 — depicts + surrounded by", en: "This picture depicts a dense city surrounded by skyscrapers." },
      { label: "ประโยคที่ 2 — Judging from + may be located in", en: "Judging from the people, this city may be located in a country in Asia." },
      { label: "ประโยคที่ 3 — ใส่คำศัพท์เมือง", en: "The streets look vibrant but extremely traffic-congested." },
      { label: "ประโยคที่ 4 — Finally, even though", en: "Finally, even though the city looks crowded, I believe it must be a modern and historic place." },
    ],
    vocabUsed: [
      { w: "dense", th: "หนาแน่น" },
      { w: "skyscraper", th: "ตึกระฟ้า" },
      { w: "vibrant", th: "มีชีวิตชีวา คึกคัก" },
      { w: "traffic-congested", th: "รถติด" },
      { w: "crowded", th: "แออัด คนเยอะ" },
      { w: "modern", th: "ทันสมัย" },
      { w: "historic", th: "มีประวัติศาสตร์" },
    ],
  },
];

export function speakPhotoDrillById(id: string): SpeakPhotoDrillItem | null {
  return SPEAK_PHOTO_DRILLS.find((d) => d.id === id) ?? null;
}
