import type { PhotoSpeakItem } from "@/types/photo-speak";

export type MiniStudyItem = {
  id: string;
  sentence: string;
  explanation: string;
};

export type MiniStudyExplanationBlock = { heading: string; body: string };

export type MiniStudySessionBase = {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  durationLabel: string;
  explanation: MiniStudyExplanationBlock[];
};

export type MiniStudyDictationSession = MiniStudySessionBase & {
  kind: "dictation";
  items: MiniStudyItem[];
};

export type MiniStudyWritePhotoSession = MiniStudySessionBase & {
  kind: "write-about-photo";
  photo: PhotoSpeakItem;
};

export type MiniStudySpeakPhotoSession = MiniStudySessionBase & {
  kind: "speak-about-photo";
  photo: PhotoSpeakItem;
};

export type MiniStudyMcOption = { letter: "A" | "B" | "C" | "D"; text: string };

export type MiniStudyMcQuestion = {
  id: string;
  prompt: string;
  options: MiniStudyMcOption[];
  correctLetter: "A" | "B" | "C" | "D";
};

export type MiniStudyListeningScenario = {
  id: string;
  title: string;
  scenarioText: string;
  thaiInstruction?: string;
  questions: MiniStudyMcQuestion[];
};

export type MiniStudyListeningMcSession = MiniStudySessionBase & {
  kind: "interactive-listening-mc";
  scenarios: MiniStudyListeningScenario[];
};

export type MiniStudyListenRespondExercise = {
  id: string;
  title: string;
  scenarioRecapTh: string;
  conversationSoFar: { speaker: string; text: string }[];
  turnLabel: string;
  audioText: string;
  question: string;
  options: (MiniStudyMcOption & { explanationTh: string })[];
  correctLetter: "A" | "B" | "C" | "D";
};

export type MiniStudyListenRespondSession = MiniStudySessionBase & {
  kind: "listen-respond";
  exercises: MiniStudyListenRespondExercise[];
};

export type MiniStudyConversationSummarySession = MiniStudySessionBase & {
  kind: "conversation-summary";
  conversation: { speaker: string; text: string }[];
  instructionsTh: string;
};

export type MiniStudyEssayPickRow = { label: string; A: string; B: string; C: string };

export type MiniStudyEssayPickOption = {
  letter: "A" | "B" | "C";
  essayText: string;
};

export type MiniStudyEssayPickExercise = {
  id: string;
  topic: string;
  options: MiniStudyEssayPickOption[];
  correctLetter: "A" | "B" | "C";
  analysisRowsTh: MiniStudyEssayPickRow[];
  rationaleTh: string;
};

export type MiniStudyEssayPickSession = MiniStudySessionBase & {
  kind: "essay-pick";
  exercises: MiniStudyEssayPickExercise[];
};

export type MiniStudyClozeCategory =
  | "present-simple-singular"
  | "plural-noun"
  | "uncountable-noun"
  | "singular-after-a-an"
  | "subject-verb-agreement-plural";

export type MiniStudyClozeBlank = {
  number: number;
  cue: string;
  correct: string;
  acceptedAlts?: string[];
  category: MiniStudyClozeCategory;
  ruleNoteTh: string;
};

export type MiniStudyClozeExercise = {
  id: string;
  patternLabel: string;
  topic: string;
  noteTh?: string;
  essayTemplate: string;
  blanks: MiniStudyClozeBlank[];
};

export type MiniStudyEssayClozeSession = MiniStudySessionBase & {
  kind: "essay-cloze";
  studentInstructionsTh: string;
  exercises: MiniStudyClozeExercise[];
};

export type MiniStudySession =
  | MiniStudyDictationSession
  | MiniStudyWritePhotoSession
  | MiniStudySpeakPhotoSession
  | MiniStudyListeningMcSession
  | MiniStudyListenRespondSession
  | MiniStudyConversationSummarySession
  | MiniStudyEssayPickSession
  | MiniStudyEssayClozeSession;

export const MINI_STUDY_SESSIONS: MiniStudySession[] = [
  {
    id: "session-1",
    index: 1,
    title: "Commas: FANBOYS & Subordinating Conjunctions",
    subtitle: "15 minutes · Dictation foundation",
    durationLabel: "≈ 15 min",
    kind: "dictation",
    explanation: [
      {
        heading: "Rule 1 — FANBOYS (coordinating conjunctions)",
        body: [
          "FANBOYS = **For, And, Nor, But, Or, Yet, So**.",
          "When a FANBOYS word joins two complete clauses (S+V on both sides), put a **comma BEFORE the FANBOYS**.",
          "Pattern:  *Clause 1, **and/but/so/...** Clause 2.*",
          "Examples:",
          "• I wanted to study**, but** I was too tired.",
          "• She finished early**, so** she left.",
          "• It started raining**, and** the picnic ended.",
          "⚠ No comma if there's no second subject: *I was tired and went home.* (no second S → no comma)",
        ].join("\n"),
      },
      {
        heading: "Rule 2 — Subordinating conjunctions (although, because, when, if, since, while, after, before, unless, though…)",
        body: [
          "When the subordinate clause comes **FIRST**, put a comma after it:",
          "• **Although** it was raining, we went outside.",
          "• **Because** he was late, the meeting started without him.",
          "When it comes in the **MIDDLE / SECOND**, normally **no comma** (except for *although / though / even though* which often take one):",
          "• We went outside although it was raining.",
          "• The meeting started without him because he was late.",
          "🧠 Memory hook: **subordinator at the front → comma after the dependent clause**.",
        ].join("\n"),
      },
      {
        heading: "What you'll dictate",
        body: "10 sentences. Type EXACTLY what you hear, including punctuation. Hit Check — if you're not 100% right, you can press **Show solution** to see the correct sentence and why.",
      },
    ],
    items: [
      // 5 FANBOYS
      {
        id: "s1-1",
        sentence: "I wanted to call her, but I forgot my phone at home.",
        explanation: "FANBOYS 'but' joins two full clauses (I wanted… / I forgot…) → comma before 'but'.",
      },
      {
        id: "s1-2",
        sentence: "He studied all night, yet he failed the exam.",
        explanation: "Two independent clauses joined by 'yet' → comma before 'yet'.",
      },
      {
        id: "s1-3",
        sentence: "She loves coffee, and her brother prefers tea.",
        explanation: "Two clauses with different subjects (She / her brother) → comma before 'and'.",
      },
      {
        id: "s1-4",
        sentence: "We can take the bus, or we can walk to the station.",
        explanation: "Two complete clauses joined by 'or' → comma before 'or'.",
      },
      {
        id: "s1-5",
        sentence: "The rain stopped, so the children went outside to play.",
        explanation: "Two clauses joined by 'so' (result) → comma before 'so'.",
      },
      // 5 SUBORDINATING — front position
      {
        id: "s1-6",
        sentence: "Although it was cold, we decided to go for a walk.",
        explanation: "Subordinating 'although' at the FRONT → comma after the dependent clause.",
      },
      {
        id: "s1-7",
        sentence: "Because he missed the bus, he arrived late to school.",
        explanation: "'Because' clause at the front → comma after it.",
      },
      {
        id: "s1-8",
        sentence: "When the alarm rang, everyone left the building quickly.",
        explanation: "'When' clause at the front → comma after it.",
      },
      // Subordinating — middle position
      {
        id: "s1-9",
        sentence: "I will call you when I arrive at the airport.",
        explanation: "'When' clause at the END → NO comma. (Subordinator in middle/end → usually no comma.)",
      },
      {
        id: "s1-10",
        sentence: "She stayed home because she was feeling sick.",
        explanation: "'Because' clause at the END → NO comma.",
      },
    ],
  },
  {
    id: "session-2",
    index: 2,
    title: "Adding -ed, -s/-es: past tense, present simple, passive voice",
    subtitle: "15 minutes · Endings you must add yourself",
    durationLabel: "≈ 15 min",
    kind: "dictation",
    explanation: [
      {
        heading: "Why this matters",
        body: "In DET dictation, the audio often blurs final -ed and -s. You must add them yourself based on grammar logic, not sound.",
      },
      {
        heading: "Rule 1 — Past tense agreement (-ed)",
        body: [
          "If the sentence starts in past tense, **everything must stay in past tense**.",
          "• Yesterday I **walked** to school and **talked** to my friend.",
          "• Last night she **cooked** dinner and **watched** a movie.",
          "🧠 Hear a past-time marker (yesterday, last week, ago, in 2010…) → add -ed to regular verbs.",
        ].join("\n"),
      },
      {
        heading: "Rule 2 — Passive voice (be + verb-ed)",
        body: [
          "If there is a **'be' verb (is / am / are / was / were / been / being)** in front of a verb, the verb almost always takes **-ed**.",
          "• The letter **was written** by my mother.",
          "• The book **is read** by thousands of students.",
          "• The cake **has been eaten** already.",
        ].join("\n"),
      },
      {
        heading: "Rule 3 — Present simple, 3rd-person singular -s / -es",
        body: [
          "If the subject is singular (he, she, it, the boy, my mom…) and the tense is present simple → add **-s** or **-es** to the verb.",
          "• He **walks** to school every day.",
          "• She **watches** TV after dinner.",
          "• My brother **goes** to the gym on Mondays.",
          "🧠 Hear 'every day / always / usually / often' + singular subject → -s/-es.",
        ].join("\n"),
      },
      {
        heading: "What you'll dictate",
        body: "10 mixed sentences covering all three rules above plus commas from Session 1. Type EXACTLY what you hear.",
      },
    ],
    items: [
      {
        id: "s2-1",
        sentence: "Yesterday she walked to the library and borrowed three books.",
        explanation: "'Yesterday' signals past → walked, borrowed (both -ed).",
      },
      {
        id: "s2-2",
        sentence: "The window was broken by the strong wind last night.",
        explanation: "Passive: 'was broken' (be + V-ed). 'Last night' confirms past.",
      },
      {
        id: "s2-3",
        sentence: "He watches movies every weekend with his family.",
        explanation: "Present simple + singular 'he' → watches (-es because of 'ch').",
      },
      {
        id: "s2-4",
        sentence: "Although it rained heavily, the match was not cancelled.",
        explanation: "Subordinator at front → comma after dependent clause. 'rained' (-ed), 'was cancelled' (passive -ed).",
      },
      {
        id: "s2-5",
        sentence: "My sister always finishes her homework before dinner.",
        explanation: "Present simple + singular 'My sister' → finishes (-es).",
      },
      {
        id: "s2-6",
        sentence: "The package was delivered yesterday, but no one was home.",
        explanation: "Passive 'was delivered' (-ed) + FANBOYS 'but' joining two clauses → comma before 'but'.",
      },
      {
        id: "s2-7",
        sentence: "When the teacher entered the room, all the students stood up.",
        explanation: "'When' clause at front → comma after. Past 'entered', 'stood' (irregular).",
      },
      {
        id: "s2-8",
        sentence: "The new policy is supported by most of the employees.",
        explanation: "Passive present: 'is supported' (be + V-ed).",
      },
      {
        id: "s2-9",
        sentence: "He studies hard every night, so he usually passes his tests.",
        explanation: "Present singular → studies, passes. FANBOYS 'so' joins two clauses → comma before 'so'.",
      },
      {
        id: "s2-10",
        sentence: "The cake was eaten before the guests arrived at the party.",
        explanation: "Passive past 'was eaten' + past 'arrived' (-ed).",
      },
    ],
  },
  {
    id: "session-3",
    index: 3,
    title: "Four comma structures for Write/Speak about Photo",
    subtitle: "15 minutes · Comma placement in descriptions",
    durationLabel: "≈ 15 min",
    kind: "dictation",
    explanation: [
      {
        heading: "Structure 1 —  S + V, which is …",
        body: [
          "Use when you want to **add information** about the previous noun (color, location, meaning).",
          "Always put a **comma BEFORE 'which'**.",
          "• A man is standing near the door**, which** is painted red.",
          "• She is wearing a coat**, which** looks very warm.",
          "✗ Common mistake: forgetting the comma — *'She is wearing a coat which looks warm.'* changes the meaning (restricts which coat).",
        ].join("\n"),
      },
      {
        heading: "Structure 2 — S + V, V-ing …",
        body: [
          "Use when the subject does **two things at once**.",
          "Always put a **comma BEFORE the -ing verb**.",
          "• A woman is sitting on a bench**, reading** a book.",
          "• Two children are playing outside**, laughing** loudly.",
          "✗ *'A woman is sitting on a bench reading a book.'* forgets the comma.",
        ].join("\n"),
      },
      {
        heading: "Structure 3 — Preposition phrase + , S + V.",
        body: [
          "When a phrase starting with **in / on / at / under …** is at the **FRONT**, put a **comma AFTER the phrase**.",
          "• **In the background,** there are several tall buildings.",
          "• **In the foreground,** a man is riding a bicycle.",
          "✗ *'In the background there are tall buildings.'* forgets the comma after 'background'.",
        ].join("\n"),
      },
      {
        heading: "Structure 4 — S + V + in/on/at …",
        body: [
          "When the preposition phrase is at the **END**, **NO comma**.",
          "• A man is riding a bicycle in the foreground.",
          "• Two people are talking in the center of the photo.",
          "Reason: the phrase follows the verb directly with no pause.",
        ].join("\n"),
      },
      {
        heading: "Memory trick",
        body: [
          "• Phrase at the **front** → comma AFTER it (Structure 3)",
          "• Extra info AFTER S+V → comma BEFORE it (Structures 1 & 2)",
          "• Phrase at the **end** → NO comma (Structure 4)",
        ].join("\n"),
      },
    ],
    items: [
      {
        id: "s3-1",
        sentence: "A woman is sitting on a bench, which is located near a fountain.",
        explanation: "Structure 1: adding info about the bench → comma before 'which'.",
      },
      {
        id: "s3-2",
        sentence: "The man is wearing a red jacket, which makes him stand out in the crowd.",
        explanation: "Structure 1: adding info about the jacket → comma before 'which'.",
      },
      {
        id: "s3-3",
        sentence: "The street is very busy, which suggests it is rush hour.",
        explanation: "Structure 1: adding info/interpretation → comma before 'which'.",
      },
      {
        id: "s3-4",
        sentence: "A man is standing at the counter, ordering a cup of coffee.",
        explanation: "Structure 2: two actions at once (standing + ordering) → comma before V-ing.",
      },
      {
        id: "s3-5",
        sentence: "Two children are running in the park, laughing and chasing each other.",
        explanation: "Structure 2: two actions at once → comma before V-ing.",
      },
      {
        id: "s3-6",
        sentence: "She is sitting alone at a table, looking at her phone.",
        explanation: "Structure 2: comma before V-ing 'looking'.",
      },
      {
        id: "s3-7",
        sentence: "In the background, there are tall trees and a clear blue sky.",
        explanation: "Structure 3: fronted preposition phrase → comma after 'background'.",
      },
      {
        id: "s3-8",
        sentence: "In the foreground, a young woman is holding a large umbrella.",
        explanation: "Structure 3: fronted phrase → comma after 'foreground'.",
      },
      {
        id: "s3-9",
        sentence: "A group of people are having a picnic in the park.",
        explanation: "Structure 4: phrase 'in the park' at the END → NO comma.",
      },
      {
        id: "s3-10",
        sentence: "An elderly man is reading a newspaper in the corner of the cafe.",
        explanation: "Structure 4: phrase 'in the corner…' at the END → NO comma.",
      },
    ],
  },
  {
    id: "session-4",
    index: 4,
    title: "Write about a photo",
    subtitle: "15 minutes · 3 description patterns + AI feedback",
    durationLabel: "≈ 15 min",
    kind: "write-about-photo",
    explanation: [
      {
        heading: "How this session works",
        body: "Read the three patterns and the vocabulary, then write about the photo below using one of them. Submit to get AI feedback you can save to your notebook.",
      },
      {
        heading: "⚠ Mistakes to avoid",
        body: [
          "• **Do NOT use past tense.** Photos describe a frozen moment → use **present continuous** (is/are + V-ing) or **present simple**.",
          "• **Do not confuse the comma and the full stop.** A comma joins; a full stop ends.",
          "• **Singular subject → add -s / -es** (He walk**s**, She watch**es**).",
        ].join("\n"),
      },
      {
        heading: "Pattern 1 — Overview → Detail → Feeling",
        body: [
          "**S1 (set the scene):** *The photo shows a bustling street market at sunset.*",
          "**S2 (zoom into a detail):** *In the foreground, a well-dressed vendor is arranging colorful fruit on a worn wooden cart.*",
          "**S3 (give the mood):** *Overall, the vibrant scene evokes a warm and lively atmosphere.*",
        ].join("\n"),
      },
      {
        heading: "Pattern 2 — Subject → Action → Context",
        body: [
          "**S1 (introduce the person):** *The main subject is a young and focused woman sitting alone on a bench.*",
          "**S2 (describe what they do):** *She appears to be reading a book, focusing on the content of the book.*",
          "**S3 (explain the setting):** *The surrounding paths suggest it is a peaceful early morning setting.*",
        ].join("\n"),
      },
      {
        heading: "Pattern 3 — Location → Action → Impression",
        body: [
          "**S1 (describe the place):** *The setting appears to be a modern and spacious café with large windows and minimalist décor.*",
          "**S2 (what's happening):** *In addition, several well-dressed people are seated, working on laptops or chatting in relaxed groups.*",
          "**S3 (overall impression):** *Overall, the image conveys a lively yet comfortable urban lifestyle.*",
        ].join("\n"),
      },
      {
        heading: "Transitional words (use 2–3 per response)",
        body:
          "In the foreground, · In the background, · In addition, · Furthermore, · She/He appears to be · The surrounding · Overall, · notably, · what stands out is · on the other hand,",
      },
      {
        heading: "Adjectives — for people",
        body: "young · elderly · well-dressed · casually dressed · focused · relaxed · cheerful · tired · confident · busy",
      },
      {
        heading: "Adjectives — for items / objects",
        body: "large · tiny · colorful · worn · modern · traditional · minimalist · crowded · decorative · rustic",
      },
      {
        heading: "Adjectives — for places",
        body: "vibrant · peaceful · spacious · narrow · open · tree-lined · lively · quiet · warm · dimly lit",
      },
      {
        heading: "Now write",
        body: "Aim for **3–5 sentences** using one of the three patterns above. Include at least one transition word and one adjective from each category if you can. When ready, hit Submit to get AI feedback.",
      },
    ],
    photo: {
      id: "mini-study-write-photo",
      titleEn: "Describe this scene",
      titleTh: "บรรยายภาพนี้",
      imageUrl: "https://picsum.photos/seed/mini-study-write-cafe/960/640",
      promptEn:
        "Write about what you see in the photo using one of the three description patterns. Use present tense only, include transitional words, and use adjectives for people, objects, and places where appropriate.",
      promptTh:
        "บรรยายภาพโดยใช้หนึ่งในสามแพตเทิร์น ใช้ tense ปัจจุบันเท่านั้น ใส่ transitional words และคำคุณศัพท์สำหรับคน สิ่งของ และสถานที่",
      keywords: ["photo description", "present tense", "transitions", "adjectives", "scene", "people"],
    },
  },
  {
    id: "session-5",
    index: 5,
    title: "Speak about a photo",
    subtitle: "15 minutes · Simple grammar, no -ed",
    durationLabel: "≈ 15 min",
    kind: "speak-about-photo",
    explanation: [
      {
        heading: "Remember (จำไว้)",
        body: [
          "• Use **is / are + V-ing** as the main structure.",
          "• **Avoid -ed forms.** crowded → **busy** · tired → **sleepy** · excited → **happy**.",
          "• Aim for **exactly 6 sentences**.",
          "• Singular subject → V + s/es.",
        ].join("\n"),
      },
      {
        heading: "Pattern 1 — Overview → foreground → background → person → object → mood",
        body: [
          "**S1:** The photo shows [place/scene].",
          "**S2:** In the foreground, [S] is/are V-ing.",
          "**S3:** In the background, there is/are [detail].",
          "**S4:** [S] is/are V-ing, which [adds detail].",
          "**S5:** [S] is/are V-ing, V-ing [second action].",
          "**S6:** Overall, the scene looks [adjective].",
          "",
          "**Example:**",
          "1. The photo shows a busy outdoor market.",
          "2. In the foreground, a woman is selling vegetables.",
          "3. In the background, there are many colorful stalls.",
          "4. She is wearing a hat, which looks very practical.",
          "5. Some people are walking around, looking at the products.",
          "6. Overall, the scene looks lively and warm.",
          "",
          "Use for: wide scenes, markets, streets, public places.",
        ].join("\n"),
      },
      {
        heading: "Pattern 2 — Main person → activity → details → others → setting → feeling",
        body: [
          "**S1:** The main subject is a [adjective] [person].",
          "**S2:** [S] is/are V-ing, V-ing [second action].",
          "**S3:** [S] is/are wearing [clothing], which looks [adjective].",
          "**S4:** In the background, there are [other people/things].",
          "**S5:** The setting appears to be [place].",
          "**S6:** The photo gives a [adjective] feeling.",
          "",
          "**Example:**",
          "1. The main subject is a young woman.",
          "2. She is sitting at a table, reading a book.",
          "3. She is wearing a white shirt, which looks clean and simple.",
          "4. In the background, there are shelves full of books.",
          "5. The setting appears to be a quiet library.",
          "6. The photo gives a calm and peaceful feeling.",
          "",
          "Use for: close-ups of one person where you can see them and the setting clearly.",
        ].join("\n"),
      },
      {
        heading: "Pattern 3 — Place → people → action 1 → action 2 → detail → summary",
        body: [
          "**S1:** In the photo, there is/are [subject] in [place].",
          "**S2:** [S] is/are V-ing, which [adds detail].",
          "**S3:** In the foreground, [S] is/are V-ing.",
          "**S4:** [S] is/are also V-ing, V-ing [detail].",
          "**S5:** The [place/object] looks [adjective].",
          "**S6:** Overall, the photo looks [adjective].",
          "",
          "**Example:**",
          "1. In the photo, there are two people in a park.",
          "2. They are sitting on the grass, which looks very green.",
          "3. In the foreground, a man is holding a drink.",
          "4. A woman is also sitting nearby, smiling at him.",
          "5. The park looks open and full of natural light.",
          "6. Overall, the photo looks happy and relaxing.",
          "",
          "Use for: outdoor scenes, nature, or photos with 2+ people.",
        ].join("\n"),
      },
      {
        heading: "Vocabulary — describe people (appearance)",
        body: [
          "**slim** /slɪm/ ผอมเพรียว — *a slim woman*",
          "**elderly** /ˈeldərli/ สูงอายุ — *an elderly man*",
          "**well-dressed** /wel drest/ แต่งตัวดี — *a well-dressed lady*",
          "**casual** /ˈkæʒuəl/ สบายๆ — *casual clothes*",
          "**cheerful** /ˈtʃɪrfəl/ ร่าเริง — *a cheerful girl*",
          "**focused** /ˈfoʊkəst/ มีสมาธิ — *looks focused*",
        ].join("\n"),
      },
      {
        heading: "Vocabulary — describe people (mood / posture)",
        body: [
          "**relaxed** /rɪˈlækst/ ผ่อนคลาย — *looks relaxed*",
          "**serious** /ˈsɪriəs/ จริงจัง — *looks serious*",
          "**confident** /ˈkɒnfɪdənt/ มั่นใจ — *looks confident*",
          "**busy** /ˈbɪzi/ ยุ่ง — *looks busy*",
          "**active** /ˈæktɪv/ กระฉับกระเฉง — *an active person*",
          "**friendly** /ˈfrendli/ เป็นมิตร — *looks friendly*",
        ].join("\n"),
      },
      {
        heading: "Vocabulary — describe objects",
        body: [
          "**large** ใหญ่ · **tiny** เล็กมาก · **colorful** มีสีสัน · **modern** ทันสมัย · **simple** เรียบง่าย · **heavy** หนัก",
        ].join("\n"),
      },
      {
        heading: "Vocabulary — describe places",
        body: [
          "**spacious** กว้างขวาง · **narrow** แคบ · **quiet** เงียบสงบ · **lively** คึกคัก · **open** โล่ง · **crowded** แออัด",
        ].join("\n"),
      },
      {
        heading: "Vocabulary — atmosphere / light",
        body: [
          "**bright** สว่าง · **natural** ธรรมชาติ · **peaceful** สงบ · **warm** อบอุ่น · **fresh** สดชื่น",
        ].join("\n"),
      },
      {
        heading: "Now speak (or type)",
        body: "Press the microphone and speak 6 sentences using one pattern. If your device can't use the microphone, you can type your answer in the textarea instead. Submit to get AI feedback — saveable to your notebook from the report page.",
      },
    ],
    photo: {
      id: "mini-study-speak-photo",
      titleEn: "Speak about this scene",
      titleTh: "พูดบรรยายภาพนี้",
      imageUrl: "https://picsum.photos/seed/mini-study-speak-park/960/640",
      promptEn:
        "Speak about the photo for about 30–60 seconds using one of the three patterns. Use is/are + V-ing as your main structure and avoid -ed forms. Aim for exactly 6 sentences.",
      promptTh:
        "พูดบรรยายภาพประมาณ 30–60 วินาที โดยใช้หนึ่งในสามแพตเทิร์น ใช้ is/are + V-ing เป็นหลัก เลี่ยงรูป -ed ให้ได้ครบ 6 ประโยค",
      keywords: ["photo description", "present continuous", "6 sentences", "no past tense", "scene", "people"],
    },
  },
  ...buildSessions7Through10(),
];

export function getMiniStudySession(id: string): MiniStudySession | null {
  return MINI_STUDY_SESSIONS.find((s) => s.id === id) ?? null;
}

// ============================================================================
// Sessions 7-10: shared scenario texts + session builders
// ============================================================================

const SCENARIO_TEXTS = {
  officeHours:
    "You are a psychology student in your second year of university. Last week, your professor gave a lecture on research methods, and one concept — confounding variables — was particularly confusing to you. You weren't sure how it affects the results of an experiment, and you're worried because your exam is coming up in a few days. You decided to visit your professor during office hours to ask for an explanation. When you arrive, you knock on the office door and your professor invites you in. You sit down and get ready to ask your question.",
  groupProject:
    "You are a graduate student in an English literature course. Your professor has assigned a group research paper on post-colonial fiction, and your group needs to submit a completed draft by the end of the month. There are three people in your group, but so far no one has agreed on who should do what. You are meeting your classmate, Jordan, at the university library today to figure out how to divide the work fairly. You arrive first and find a quiet table. Jordan arrives a few minutes later and sits across from you.",
  advisor:
    "You are a first-year international student studying at a university in the United States. Next semester's course registration opens in two weeks, and you need to choose two elective courses. However, you are not sure which courses are allowed under your degree requirements, and you are also worried about whether your course load will be too heavy. You have made an appointment with your academic advisor, Ms. Chen, to get some guidance. You walk into her office, and she greets you warmly and asks how she can help you today.",
  labPartner:
    "You are a second-year chemistry student. Next week, your class will conduct a titration experiment in the laboratory, and you are expected to come fully prepared with the right materials and a clear understanding of the procedure. Unfortunately, you were sick on the day of the pre-lab briefing and missed all the instructions. You decide to call your lab partner, Marcus, to find out what you need to bring and what the experiment involves. You pick up your phone and dial his number.",
  studyGroup:
    "You are a student in an introductory economics course. Your midterm exam is in three days and will cover several topics you have been struggling with, including supply and demand, elasticity, and market equilibrium. You feel that studying alone is not enough, so you organized a study group with two of your classmates, Priya and Daniel. You are all meeting this afternoon at a café near campus to go through the most difficult concepts together. You arrive at the café, order a coffee, and your classmates walk in shortly after.",
} as const;

const TH_LISTEN_INSTRUCTION =
  "ฟัง Scenario ด้านบนให้จบก่อน แล้วตอบคำถามต่อไปนี้โดยไม่ต้องฟังซ้ำ พยายามจำเนื้อหาที่ได้ยินให้ได้มากที่สุด คำตอบไม่จำเป็นต้องยาว ใช้คำสั้นๆ หรือวลีก็พอ";

function buildSessions7Through10(): MiniStudySession[] {
  const session7: MiniStudyListeningMcSession = {
    id: "session-7",
    index: 7,
    title: "Interactive listening — find the essentials in the scenario",
    subtitle: "15 minutes · Who · Why · Topic",
    durationLabel: "≈ 15 min",
    kind: "interactive-listening-mc",
    explanation: [
      {
        heading: "Why this matters",
        body: "In DET interactive listening, **understanding the scenario gets you halfway there**. The questions are all based on the scenario, so if you remember who you are, who you're talking to, and why — you can already answer most of them.",
      },
      {
        heading: "What to listen for in every scenario",
        body: [
          "• **Who am I?** (your role: student, year, subject)",
          "• **Who am I talking to?** (professor, classmate, advisor, lab partner)",
          "• **Why am I here?** (the goal of the conversation)",
          "• **What's the topic?** (the subject or concept being discussed)",
          "• **What's my main concern?** (any worry mentioned)",
        ].join("\n"),
      },
      {
        heading: "How this session works",
        body: "Press ▶ to hear the scenario. Then answer 3 questions from memory. The audio will not auto-replay — try to listen carefully the first time, just like the real test.",
      },
    ],
    scenarios: [
      {
        id: "s7-1",
        title: "Scenario 1 — Office hours: Research methods",
        scenarioText: SCENARIO_TEXTS.officeHours,
        questions: [
          {
            id: "s7-1-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "A classmate" },
              { letter: "B", text: "Your professor" },
              { letter: "C", text: "An academic advisor" },
              { letter: "D", text: "A lab partner" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-1-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To submit a late assignment" },
              { letter: "B", text: "To clarify a concept before an exam" },
              { letter: "C", text: "To complain about a grade" },
              { letter: "D", text: "To ask for an extension" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-1-q3",
            prompt: "What subject is the discussion about?",
            options: [
              { letter: "A", text: "Chemistry" },
              { letter: "B", text: "English literature" },
              { letter: "C", text: "Psychology / research methods" },
              { letter: "D", text: "Economics" },
            ],
            correctLetter: "C",
          },
        ],
      },
      {
        id: "s7-2",
        title: "Scenario 2 — Group project: Literature review",
        scenarioText: SCENARIO_TEXTS.groupProject,
        questions: [
          {
            id: "s7-2-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "A classmate named Jordan" },
              { letter: "C", text: "A librarian" },
              { letter: "D", text: "Your roommate" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-2-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To borrow notes from a missed class" },
              { letter: "B", text: "To discuss which books to read" },
              { letter: "C", text: "To divide tasks for a group paper" },
              { letter: "D", text: "To find a new group member" },
            ],
            correctLetter: "C",
          },
          {
            id: "s7-2-q3",
            prompt: "What subject is the discussion about?",
            options: [
              { letter: "A", text: "Psychology" },
              { letter: "B", text: "English literature (post-colonial fiction)" },
              { letter: "C", text: "Chemistry" },
              { letter: "D", text: "Economics" },
            ],
            correctLetter: "B",
          },
        ],
      },
      {
        id: "s7-3",
        title: "Scenario 3 — Academic advisor: Course selection",
        scenarioText: SCENARIO_TEXTS.advisor,
        questions: [
          {
            id: "s7-3-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "A classmate" },
              { letter: "B", text: "Your professor" },
              { letter: "C", text: "Your academic advisor, Ms. Chen" },
              { letter: "D", text: "The dean of the university" },
            ],
            correctLetter: "C",
          },
          {
            id: "s7-3-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To change your major" },
              { letter: "B", text: "To appeal a failed course" },
              { letter: "C", text: "To get help choosing elective courses" },
              { letter: "D", text: "To apply for a scholarship" },
            ],
            correctLetter: "C",
          },
          {
            id: "s7-3-q3",
            prompt: "What is your main concern going into this conversation?",
            options: [
              { letter: "A", text: "Whether the courses count toward your degree (and your workload)" },
              { letter: "B", text: "Whether you can graduate early" },
              { letter: "C", text: "Whether your tuition will increase" },
              { letter: "D", text: "Whether you can switch universities" },
            ],
            correctLetter: "A",
          },
        ],
      },
      {
        id: "s7-4",
        title: "Scenario 4 — Lab partner: Experiment preparation",
        scenarioText: SCENARIO_TEXTS.labPartner,
        questions: [
          {
            id: "s7-4-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "Your lab partner, Marcus" },
              { letter: "C", text: "The lab technician" },
              { letter: "D", text: "A study group classmate" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-4-q2",
            prompt: "Why are you contacting this person?",
            options: [
              { letter: "A", text: "To cancel the lab session" },
              { letter: "B", text: "To get information you missed due to illness" },
              { letter: "C", text: "To ask them to do your part of the experiment" },
              { letter: "D", text: "To confirm the lab room location" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-4-q3",
            prompt: "What two things do you need to find out?",
            options: [
              { letter: "A", text: "The grade weighting and the room number" },
              { letter: "B", text: "What materials to bring and the steps of the experiment" },
              { letter: "C", text: "Who else is in the group and when the deadline is" },
              { letter: "D", text: "The teacher's office hours and exam dates" },
            ],
            correctLetter: "B",
          },
        ],
      },
      {
        id: "s7-5",
        title: "Scenario 5 — Study group: Exam preparation",
        scenarioText: SCENARIO_TEXTS.studyGroup,
        questions: [
          {
            id: "s7-5-q1",
            prompt: "Who are you meeting with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "Two classmates (Priya and Daniel)" },
              { letter: "C", text: "An academic advisor" },
              { letter: "D", text: "Your tutor" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-5-q2",
            prompt: "Why are you meeting with them?",
            options: [
              { letter: "A", text: "To work on a take-home assignment together" },
              { letter: "B", text: "To teach them concepts they don't understand" },
              { letter: "C", text: "To prepare for an upcoming midterm exam" },
              { letter: "D", text: "To complain about the course difficulty" },
            ],
            correctLetter: "C",
          },
          {
            id: "s7-5-q3",
            prompt: "What subject is the discussion about?",
            options: [
              { letter: "A", text: "Psychology" },
              { letter: "B", text: "English literature" },
              { letter: "C", text: "Chemistry" },
              { letter: "D", text: "Economics" },
            ],
            correctLetter: "D",
          },
        ],
      },
    ],
  };

  // Session 8 — same scenarios, but the 3rd question is the conversation OPENER (MC).
  const session8: MiniStudyListeningMcSession = {
    id: "session-8",
    index: 8,
    title: "Interactive listening — first 2 turns of the conversation",
    subtitle: "15 minutes · Choose your opener that matches the scenario",
    durationLabel: "≈ 15 min",
    kind: "interactive-listening-mc",
    explanation: [
      {
        heading: "บทเรียน (Thai)",
        body: [
          "ในเซสชันนี้เราจะฝึก **ตอบ 2 คำถามแรกของ interactive conversation**",
          "สิ่งสำคัญที่สุด: ข้อสอบ **ไม่ได้แค่วัดว่าเข้าใจคำถาม** — มันวัดว่า **เข้าใจ scenario** ด้วย",
          "ต้องเริ่มบทสนทนาให้ถูกต้องตาม **บริบทของ scenario** ไม่ใช่ตามว่าฟังดู \"พอใช้ได้\" ในชีวิตประจำวัน",
          "วิธีคิด: ก่อนเลือกคำตอบทุกครั้ง ถามตัวเองว่า — ฉันเป็นใคร · ฉันคุยกับใคร · ฉันมาที่นี่เพื่ออะไร",
        ].join("\n"),
      },
      {
        heading: "How this session works",
        body: "Listen to each scenario, then answer who/why/opener. The opener is the FIRST sentence you would say to start the conversation. Don't just pick what 'sounds natural' — pick what matches the scenario.",
      },
    ],
    scenarios: [
      {
        id: "s8-1",
        title: "Scenario 1 — Office hours: Research methods",
        scenarioText: SCENARIO_TEXTS.officeHours,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-1-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "A classmate" },
              { letter: "B", text: "Your professor" },
              { letter: "C", text: "Your academic advisor" },
              { letter: "D", text: "A lab partner" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-1-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To submit a late assignment" },
              { letter: "B", text: "To clarify a concept before an exam" },
              { letter: "C", text: "To complain about a grade" },
              { letter: "D", text: "To ask for an extension" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-1-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"I wanted to ask about the homework you gave us.\"" },
              { letter: "B", text: "\"Hi, I was hoping you could help me understand confounding variables.\"" },
              { letter: "C", text: "\"I think there might be a mistake in my grade.\"" },
              { letter: "D", text: "\"Can I get more time to finish my assignment?\"" },
            ],
            correctLetter: "B",
          },
        ],
      },
      {
        id: "s8-2",
        title: "Scenario 2 — Group project: Literature review",
        scenarioText: SCENARIO_TEXTS.groupProject,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-2-q1",
            prompt: "Who are you meeting with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "A classmate named Jordan" },
              { letter: "C", text: "A librarian" },
              { letter: "D", text: "Your tutor" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-2-q2",
            prompt: "Why are you meeting with this person?",
            options: [
              { letter: "A", text: "To borrow notes from a missed class" },
              { letter: "B", text: "To discuss which books to read for the course" },
              { letter: "C", text: "To divide the tasks for a group paper" },
              { letter: "D", text: "To find a replacement group member" },
            ],
            correctLetter: "C",
          },
          {
            id: "s8-2-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"Hey Jordan, should we just split the paper into three equal parts?\"" },
              { letter: "B", text: "\"Hi, did you finish reading all the books already?\"" },
              { letter: "C", text: "\"Jordan, I think we need a new group member.\"" },
              { letter: "D", text: "\"Can you share your notes from last week's class?\"" },
            ],
            correctLetter: "A",
          },
        ],
      },
      {
        id: "s8-3",
        title: "Scenario 3 — Academic advisor: Course selection",
        scenarioText: SCENARIO_TEXTS.advisor,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-3-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "A classmate" },
              { letter: "B", text: "Your professor" },
              { letter: "C", text: "Your academic advisor, Ms. Chen" },
              { letter: "D", text: "The dean of the university" },
            ],
            correctLetter: "C",
          },
          {
            id: "s8-3-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To appeal a failed course from last semester" },
              { letter: "B", text: "To get advice on choosing elective courses" },
              { letter: "C", text: "To apply for a scholarship for next year" },
              { letter: "D", text: "To request a change of major" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-3-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"I'd like to appeal my grade from last semester.\"" },
              { letter: "B", text: "\"I'm thinking of changing my major, can you help?\"" },
              { letter: "C", text: "\"Hi Ms. Chen, I need some help figuring out which electives to take next semester.\"" },
              { letter: "D", text: "\"I wanted to ask about scholarship opportunities.\"" },
            ],
            correctLetter: "C",
          },
        ],
      },
      {
        id: "s8-4",
        title: "Scenario 4 — Lab partner: Experiment preparation",
        scenarioText: SCENARIO_TEXTS.labPartner,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-4-q1",
            prompt: "Who are you calling?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "Your lab partner, Marcus" },
              { letter: "C", text: "The lab technician" },
              { letter: "D", text: "Your roommate" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-4-q2",
            prompt: "Why are you calling this person?",
            options: [
              { letter: "A", text: "To cancel your part of the lab experiment" },
              { letter: "B", text: "To get the lab instructions you missed while sick" },
              { letter: "C", text: "To confirm the time and location of the lab" },
              { letter: "D", text: "To ask him to bring extra materials for you" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-4-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"Hey Marcus, are you going to the lab next week?\"" },
              { letter: "B", text: "\"Hi Marcus, I was sick during the briefing — can you fill me in on what we need to do?\"" },
              { letter: "C", text: "\"Marcus, I don't think I can make it to the lab next week.\"" },
              { letter: "D", text: "\"Hey, can you bring my materials to the lab for me?\"" },
            ],
            correctLetter: "B",
          },
        ],
      },
      {
        id: "s8-5",
        title: "Scenario 5 — Study group: Exam preparation",
        scenarioText: SCENARIO_TEXTS.studyGroup,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-5-q1",
            prompt: "Who are you meeting with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "Two classmates, Priya and Daniel" },
              { letter: "C", text: "Your tutor" },
              { letter: "D", text: "Your academic advisor" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-5-q2",
            prompt: "Why are you meeting with them?",
            options: [
              { letter: "A", text: "To work on a group assignment due this week" },
              { letter: "B", text: "To study together for an upcoming midterm exam" },
              { letter: "C", text: "To teach them the concepts they are struggling with" },
              { letter: "D", text: "To discuss which topics will appear on the exam" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-5-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"Hey guys, did either of you finish the assignment?\"" },
              { letter: "B", text: "\"I think we should start with market equilibrium since that's the hardest part.\"" },
              { letter: "C", text: "\"Do you guys know what topics are going to be on the exam?\"" },
              { letter: "D", text: "\"Should we ask the professor for more time to study?\"" },
            ],
            correctLetter: "B",
          },
        ],
      },
    ],
  };

  const session9: MiniStudyListenRespondSession = {
    id: "session-9",
    index: 9,
    title: "Listen & Respond — choose the best reply",
    subtitle: "15 minutes · Strategies + 5 turn-based exercises",
    durationLabel: "≈ 15 min",
    kind: "listen-respond",
    explanation: [
      {
        heading: "ส่วนที่ 1 — DET วัดอะไรจริงๆ",
        body: [
          "ข้อสอบ **Listen & Respond** ไม่ได้วัดว่าคุณรู้ภาษาอังกฤษเยอะแค่ไหน",
          "แต่วัดว่าคุณ **ฟังแล้วเข้าใจสถานการณ์** และ **เลือกสิ่งที่พูดได้เหมาะสมที่สุด**",
          "",
          "คำตอบที่ถูกต้องต้องผ่าน 3 ข้อพร้อมกัน:",
          "✅ **ตรงกับสิ่งที่อีกฝ่ายพึ่งพูด**",
          "✅ **สอดคล้องกับ scenario** (บริบทตั้งต้น)",
          "✅ **เหมาะกับความสัมพันธ์** (อาจารย์ vs. เพื่อน)",
          "",
          "ถ้าผ่านแค่ 1 หรือ 2 ข้อ — ยังผิดอยู่",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — ตัวเลือกที่ผิดมักผิดใน 3 แบบเสมอ",
        body: [
          "**❌ ผิดหัวข้อ (Wrong Topic)** — ฟังดูสมเหตุสมผล แต่พูดเรื่องอื่น",
          "  *เช่น อาจารย์อธิบาย confounding variables แต่คุณตอบว่า \"So when will the exam results be posted?\"*",
          "  วิธีจับ: \"คำตอบนี้ตอบสนองต่อประโยคล่าสุดของอีกฝ่ายไหม?\"",
          "",
          "**❌ ผิดทิศทาง (Wrong Direction)** — หัวข้อเดียวกัน แต่ขัดกับ scenario",
          "  *เช่น scenario บอกว่าคุณกังวลภาระงาน แต่คุณตอบว่า \"I want to take both courses to finish faster\"*",
          "  วิธีจับ: \"คำตอบนี้ขัดกับสิ่งที่ scenario บอกเกี่ยวกับตัวเราไหม?\"",
          "",
          "**❌ ผิด register (Wrong Register)** — ถูกเรื่อง แต่ tone ไม่เหมาะ",
          "  *เช่น พูดกับอาจารย์แบบสบายๆ เกินไป*",
          "  วิธีจับ: \"ถ้าเกิดเรื่องนี้จริงในชีวิต เราจะพูดแบบนี้ได้ไหม?\"",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 3 — กลยุทธ์หลัก: อ่านจากปลายก่อน",
        body: [
          "**🎯 Opener Elimination** — อ่านแค่ประโยคแรกของแต่ละตัวเลือก ถ้าเริ่มต้นไม่สมเหตุสมผล ตัดทิ้งได้เลย",
          "**🎯 อ่านทุกตัวเลือกให้จบ** — ห้ามเลือกตัวเลือกแรกที่ \"ฟังดูโอเค\" คำตอบที่ถูกคือ \"ดีที่สุด\" ไม่ใช่ \"พอใช้ได้\"",
          "**🎯 จำ scenario ไว้ตลอด** — ก่อนเลือกทุกครั้ง ถามตัวเอง: \"ฉันเป็นใคร? · ฉันมาทำไม? · ฉันคุยกับใคร?\"",
          "ถ้าคำตอบขัดกับข้อใดข้อหนึ่ง — ผิดแน่นอน",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 4 — กลยุทธ์สำหรับคำถามท้ายบทสนทนา",
        body: [
          "• **เลื่อนขึ้นไปอ่าน scenario ซ้ำ** ก่อนตอบทุกครั้ง — DET จริงเลื่อนขึ้นได้เสมอ",
          "• **ติดตาม flow** — ถ้ากำลังจะสรุป คำตอบที่ดีต้องช่วย **ปิด** บทสนทนา ไม่ใช่เปิดหัวข้อใหม่",
          "• **ระวังตัวเลือกที่วกกลับ** — ถ้าผ่านหัวข้อหนึ่งไปแล้ว ตัวเลือกที่ดึงกลับมักจะผิด",
          "• **ถ้าเลือกผิด อย่าตกใจ** — อ่านคำอธิบายให้เข้าใจก่อนไปข้อต่อไป",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 5 — Checklist ก่อนกดเลือก (ทุกครั้ง)",
        body: [
          "☐ คำตอบนี้ตอบสนองต่อสิ่งที่อีกฝ่ายพึ่งพูดไหม?",
          "☐ คำตอบนี้สอดคล้องกับ scenario ไหม?",
          "☐ tone เหมาะกับความสัมพันธ์ไหม? (อาจารย์ / เพื่อน / ที่ปรึกษา)",
          "☐ คำตอบนี้ช่วยให้บทสนทนาเดินหน้าไปในทิศทางที่ถูกไหม?",
          "",
          "ผ่าน 4 ข้อ → เลือกได้เลย",
        ].join("\n"),
      },
    ],
    exercises: [
      {
        id: "s9-1",
        title: "Exercise 1 — Office hours (Turn 5 of 6)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาปี 2 วิชาจิตวิทยา กำลังพบอาจารย์ในเวลา office hours เพื่อถามเรื่อง confounding variables ก่อนสอบ",
        conversationSoFar: [
          { speaker: "You", text: "Hi, I was hoping you could help me understand confounding variables." },
          { speaker: "Professor", text: "Of course! A confounding variable is a third variable that affects both the independent and dependent variable, which can distort your results." },
          { speaker: "You", text: "So it's like something that influences both variables without you realizing it?" },
          { speaker: "Professor", text: "Exactly. For example, if you're studying whether coffee improves focus, stress could be a confounding variable because stressed people drink more coffee and also focus less." },
        ],
        turnLabel: "Turn 5 — Professor speaks",
        audioText:
          "Does that example help clarify things? I want to make sure you're feeling confident before your exam.",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"Yes, that's really helpful. So should I just avoid coffee before the exam?\"",
            explanationTh: "เข้าใจผิดเรื่อง confounding variables และพูดเรื่องกาแฟก่อนสอบซึ่งไม่เกี่ยวกับ scenario",
          },
          {
            letter: "B",
            text: "\"Thank you, that makes much more sense. Could you give me one more example so I can practice identifying them myself?\"",
            explanationTh: "ตอบรับคำอธิบายอย่างสุภาพและขอต่อยอดความเข้าใจ ตรงกับวัตถุประสงค์ของการมาพบอาจารย์ (เตรียมสอบ)",
          },
          {
            letter: "C",
            text: "\"I think I understand. By the way, do you know when the exam results will be posted?\"",
            explanationTh: "เปลี่ยนหัวข้อไปถามเรื่องผลสอบ ไม่สอดคล้องกับบทสนทนาที่กำลังดำเนินอยู่",
          },
          {
            letter: "D",
            text: "\"Yes! So does that mean confounding variables always involve food or drinks?\"",
            explanationTh: "ตีความตัวอย่างผิดและแสดงว่าไม่เข้าใจคำอธิบาย",
          },
        ],
        correctLetter: "B",
      },
      {
        id: "s9-2",
        title: "Exercise 2 — Group project (Turn 4 of 6)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาปริญญาโทวิชา English Literature กำลังประชุมกับเพื่อนชื่อ Jordan ที่ห้องสมุด เพื่อแบ่งงาน group paper เรื่อง post-colonial fiction",
        conversationSoFar: [
          { speaker: "You", text: "Hey Jordan, should we just split the paper into three equal parts?" },
          { speaker: "Jordan", text: "I was thinking the same. Maybe one person does the introduction and literature review, one does the analysis, and one does the conclusion?" },
          { speaker: "You", text: "That sounds fair. I'm pretty good at analysis so I'd be happy to take that section." },
        ],
        turnLabel: "Turn 4 — Jordan speaks",
        audioText:
          "Great, that works for me. I'll take the introduction and literature review then. But we still need to decide on a deadline for each section so we can review each other's work before submitting.",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"Good idea. How about we each finish our sections by next Friday and then meet again to review?\"",
            explanationTh: "เสนอวันส่งงานที่ชัดเจน สอดคล้องกับที่ Jordan พึ่งพูดเรื่องนัด review",
          },
          {
            letter: "B",
            text: "\"Sure, but I think we should just submit whatever we have by the end of the month.\"",
            explanationTh: "ไม่ตอบรับเรื่อง internal deadline และแสดงทัศนคติที่ไม่ใส่ใจคุณภาพงาน",
          },
          {
            letter: "C",
            text: "\"Actually, can we change the topic? I don't think post-colonial fiction is interesting enough.\"",
            explanationTh: "เปลี่ยนหัวข้อโดยสิ้นเชิง ขัดแย้งกับ scenario ที่กำหนดหัวข้องานไว้แล้ว",
          },
          {
            letter: "D",
            text: "\"I agree. Should we ask the professor to extend the deadline for us?\"",
            explanationTh: "เบี่ยงประเด็นออกจากการจัดการภายในกลุ่ม ไม่ตอบสนองต่อสิ่งที่ Jordan พูด",
          },
        ],
        correctLetter: "A",
      },
      {
        id: "s9-3",
        title: "Exercise 3 — Academic advisor (Turn 5 of 6)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาปี 1 ต่างชาติ กำลังพบ Ms. Chen ที่ปรึกษา เพื่อขอคำแนะนำเรื่อง elective courses ภาคหน้า และกังวลว่าภาระงานจะหนักเกินไป",
        conversationSoFar: [
          { speaker: "You", text: "Hi Ms. Chen, I need some help figuring out which electives to take next semester." },
          { speaker: "Ms. Chen", text: "Of course! Can you tell me which electives you're considering?" },
          { speaker: "You", text: "I was thinking about Introduction to Sociology and Creative Writing. But I'm not sure if both of them count toward my degree." },
          { speaker: "Ms. Chen", text: "Both of those count as general education credits, so they'll definitely apply to your degree requirements. They're also fairly manageable courses." },
        ],
        turnLabel: "Turn 5 — Ms. Chen speaks",
        audioText:
          "Given that you mentioned being worried about your workload, I'd suggest taking just one of them next semester and saving the other for later. What do you think?",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"That makes sense. I'll probably go with Introduction to Sociology since I've always been interested in that subject.\"",
            explanationTh: "ตอบรับคำแนะนำของ Ms. Chen และให้เหตุผลที่สมเหตุสมผล สอดคล้องกับ scenario",
          },
          {
            letter: "B",
            text: "\"Actually, I want to take both because I need to finish my degree faster.\"",
            explanationTh: "ขัดแย้งกับ scenario ที่ระบุชัดว่าคุณกังวลเรื่องภาระงาน",
          },
          {
            letter: "C",
            text: "\"Okay. Can you also tell me how to apply for a scholarship?\"",
            explanationTh: "เปลี่ยนหัวข้อไปถามเรื่องทุน ไม่เกี่ยวกับการสนทนาที่กำลังดำเนินอยู่",
          },
          {
            letter: "D",
            text: "\"I think I'll just take whichever one my friends are taking.\"",
            explanationTh: "ตอบโดยไม่ใช้ดุลยพินิจ ไม่เหมาะกับบริบทการพบที่ปรึกษาอย่างเป็นทางการ",
          },
        ],
        correctLetter: "A",
      },
      {
        id: "s9-4",
        title: "Exercise 4 — Lab partner (Turn 4 of 5)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาเคมีปี 2 โทรหา Marcus เพราะคุณป่วยและพลาด pre-lab briefing ต้องการรู้ว่าต้องเตรียมอะไรและทำอะไรบ้าง",
        conversationSoFar: [
          { speaker: "You", text: "Hi Marcus, I was sick during the briefing — can you fill me in on what we need to do?" },
          { speaker: "Marcus", text: "Sure! So it's a titration experiment. You'll need to bring your lab coat, safety goggles, and a calculator." },
          { speaker: "You", text: "Got it. And what about the actual procedure — what are the main steps?" },
        ],
        turnLabel: "Turn 4 — Marcus speaks",
        audioText:
          "Basically, you'll be adding a sodium hydroxide solution drop by drop into an acid until you hit the equivalence point. The indicator will change color when you get there. It sounds harder than it is, honestly.",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"That actually sounds manageable. Should I review the titration formula before we start, just to be safe?\"",
            explanationTh: "แสดงว่าเข้าใจขั้นตอนและคิดเชิงรุกในการเตรียมตัว ตรงกับเหตุผลที่โทรหา Marcus",
          },
          {
            letter: "B",
            text: "\"Wait, so we're doing this experiment alone or in pairs?\"",
            explanationTh: "ถามเรื่องที่ไม่เกี่ยวกับขั้นตอนที่ Marcus พึ่งอธิบาย",
          },
          {
            letter: "C",
            text: "\"Okay, but I don't think I can come to the lab next week after all.\"",
            explanationTh: "ขัดแย้งกับ scenario ที่ระบุว่าคุณกำลังเตรียมตัวไปทำ lab",
          },
          {
            letter: "D",
            text: "\"I'm not sure I understand. What is sodium hydroxide?\"",
            explanationTh: "แสดงระดับความรู้ที่ต่ำเกินไปสำหรับนักศึกษาเคมีปี 2",
          },
        ],
        correctLetter: "A",
      },
      {
        id: "s9-5",
        title: "Exercise 5 — Study group (Turn 6 of 6)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาวิชา Economics กำลังนั่ง study กับ Priya และ Daniel ที่ร้านกาแฟ เพื่อเตรียมสอบ midterm ใน 3 วัน",
        conversationSoFar: [
          { speaker: "You", text: "I think we should start with market equilibrium since that's the hardest part." },
          { speaker: "Priya", text: "Agreed. Daniel, do you want to explain it first since you said you understood it well?" },
          { speaker: "Daniel", text: "Sure. So market equilibrium is the point where the quantity supplied equals the quantity demanded, and the price stabilizes." },
          { speaker: "You", text: "Right, and when something shifts — like a new tax — the equilibrium point moves, which changes both the price and the quantity." },
          { speaker: "Priya", text: "Exactly. Okay, I think I've got equilibrium now. Should we move on to elasticity?" },
        ],
        turnLabel: "Turn 6 — Daniel speaks",
        audioText:
          "Yeah let's do elasticity. Actually, before we do — does anyone have good notes on it? Mine are kind of messy from the lecture.",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"I have pretty clear notes on elasticity. It's basically about how sensitive demand or supply is to a price change — I can walk us through it.\"",
            explanationTh: "ตอบรับ Daniel โดยตรง มีส่วนร่วมในกลุ่มอย่างเป็นประโยชน์ ต่อเนื่องจาก flow",
          },
          {
            letter: "B",
            text: "\"I don't have my notes either, so maybe we should just skip elasticity.\"",
            explanationTh: "ละทิ้งหัวข้อใน scenario ขัดกับเป้าหมายของ study group",
          },
          {
            letter: "C",
            text: "\"Sure, but can we also review supply and demand again? I'm still confused about that.\"",
            explanationTh: "เบี่ยงออกจากสิ่งที่ Daniel พึ่งถาม",
          },
          {
            letter: "D",
            text: "\"I don't think elasticity will be on the exam, so let's not worry about it.\"",
            explanationTh: "ตัดสินใจแทนกลุ่มและขัดกับ scenario ที่ระบุว่า elasticity เป็นหัวข้อสอบ",
          },
        ],
        correctLetter: "A",
      },
    ],
  };

  const session10: MiniStudyConversationSummarySession = {
    id: "session-10",
    index: 10,
    title: "Summarize the Conversation — 75 seconds",
    subtitle: "Pattern + Gemini-graded practice + save to notebook",
    durationLabel: "≈ 15 min",
    kind: "conversation-summary",
    explanation: [
      {
        heading: "ส่วนที่ 1 — ทำไมต้องมี pattern?",
        body: [
          "• เวลาแค่ **75 วินาที** ไม่มีเวลาคิดว่าจะเริ่มเขียนยังไง",
          "• นักศึกษาส่วนใหญ่เสียเวลาไปกับการนึกประโยคแรก เหลือเวลาน้อยสำหรับประโยคที่เหลือ",
          "• ถ้ามี pattern จำขึ้นใจ สมองไม่ต้องคิดโครงสร้าง คิดแค่ว่าจะใส่ข้อมูลอะไรลงไป",
          "• Pattern ที่ดี **ไม่ใช่ท่องประโยคสำเร็จรูป** แต่รู้ว่า ประโยคที่ 1/2/3 พูดเรื่องอะไร",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — ข้อผิดพลาดที่นักศึกษาไทยทำบ่อยที่สุด",
        body: [
          "**❌ ใช้ past tense** — ใช้ **present simple** เสมอ (เหมือนสรุปหนังหรือหนังสือ)",
          "  ผิด: *The student talked to her professor about her assignment.*",
          "  ถูก: *The student talks to her professor about her assignment.*",
          "",
          "**❌ เขียนเป็น bullet points** — ต้องเป็น **ประโยคสมบูรณ์** เสมอ",
          "",
          "**❌ ใช้คำศัพท์ยากเกินจำเป็น** — ใช้คำง่ายๆ ที่มั่นใจ ดีกว่าคำยากที่ไม่แน่ใจ",
          "  คำปลอดภัย: *discuss, explain, ask, suggest, decide, agree, want, need, help, understand, plan, finish, review, choose, meet, talk, tell, think, share, find out*",
          "",
          "**❌ ลืมบอก outcome** — summary ที่ดีต้องบอกว่าบทสนทนา **จบยังไง / ตัดสินใจอะไร**",
          "",
          "**❌ เขียนยาวเกินไป** — 3 ประโยคครบถ้วน > 6 ประโยคไวยากรณ์ผิด",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 3 — Transitional words ที่ควรใช้",
        body: [
          "**เริ่มต้น:** In this conversation, … / In the conversation, …",
          "**เพิ่มข้อมูล:** Also, … / In addition, … / Additionally, …",
          "**สรุป/ผลลัพธ์:** In the end, … / Finally, … / As a result, … / They decide to … / They agree to …",
          "**ลำดับ:** After that, … / Then, … / Next, …",
          "**เหตุผล:** because … / so … / since …",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 4 — Pattern ที่ต้องจำ",
        body: [
          "**ประโยคที่ 1 — WHO + WHY**",
          "**ประโยคที่ 2 — WHAT is discussed**",
          "**ประโยคที่ 3 — OUTCOME / decision / next step**",
          "",
          "**Template:**",
          "*In this conversation, [คุณเป็นใคร] [กำลังคุยกับใคร] [เพื่ออะไร]. [Transitional word], [หัวข้อหลักที่คุยกัน]. [Transitional word], [ผลลัพธ์หรือสิ่งที่ตัดสินใจ].*",
          "",
          "**ตัวอย่าง:**",
          "*In this conversation, a student talks to her professor during office hours because she does not understand something from the lecture. The professor explains the concept clearly and gives two simple examples to help her understand. In the end, the student feels much more confident and thanks the professor before leaving.*",
          "",
          "สังเกต: ใช้ present simple ตลอด · ใช้ transitional words · ใช้คำง่ายๆ · 3 ประโยคครบ who/why + what + outcome",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 5 — บริหารเวลา 75 วินาที",
        body: [
          "• **0–10s** — อ่าน scenario/บทสนทนาเร็วๆ จับ 3 สิ่ง: ใคร · เรื่องอะไร · จบยังไง",
          "• **10–60s** — เขียน 3 ประโยคตาม pattern",
          "• **60–75s** — อ่านทวนและแก้ tense ที่ผิด",
        ].join("\n"),
      },
    ],
    conversation: [
      { speaker: "You", text: "I think we should start with market equilibrium since that feels like the hardest topic." },
      { speaker: "Priya", text: "Agreed. Daniel, do you want to explain it first since you said you understood it well?" },
      { speaker: "Daniel", text: "Sure! So basically, it is the point where the amount people want to buy matches the amount available to buy. The price stops moving at that point." },
      { speaker: "You", text: "Right, and if something changes — like a price increase — then the balance shifts and everything adjusts." },
      { speaker: "Priya", text: "Okay, I think I get it now. Should we move on to the next topic?" },
      { speaker: "Daniel", text: "Yeah. Actually, does anyone have good notes on the next part? Mine are a bit messy." },
      { speaker: "You", text: "I have pretty clear notes. I can walk us through it." },
      { speaker: "Priya", text: "Perfect. Let's keep going — we still have one more topic after this before the exam." },
    ],
    instructionsTh:
      "อ่านบทสนทนาด้านบนให้จบ แล้วเขียน summary ภาษาอังกฤษ **3 ประโยค** โดยใช้ pattern ที่เรียนมา ใช้เวลาไม่เกิน 75 วินาที **ห้ามดู template ระหว่างเขียน**",
  };

  const session11: MiniStudyEssayPickSession = buildSession11();
  const session12: MiniStudyEssayClozeSession = buildSession12();
  return [session7, session8, session9, session10, session11, session12];
}

function buildSession11(): MiniStudyEssayPickSession {
  return {
    id: "session-11",
    index: 11,
    title: "Writing essay — pick the best 70–90 word essay",
    subtitle: "Lesson on essay patterns + 5 multi-choice exercises",
    durationLabel: "≈ 15 min",
    kind: "essay-pick",
    explanation: [
      {
        heading: "ส่วนที่ 1 — 50-word essay ในข้อสอบ DET คืออะไร?",
        body: [
          "• DET มีข้อสอบให้ **เขียน essay สั้นๆ** จากหัวข้อ + เวลาจำกัด",
          "• หัวข้อมักถาม **ความคิดเห็น** เช่น",
          "  *\"Do you prefer studying alone or with others?\"*",
          "  *\"Is it better to live in a city or in the countryside?\"*",
          "• เป้าหมาย: **สื่อสารชัด + ไวยากรณ์ถูก**",
          "• เขียน **70–90 คำ** — ไม่ต้องนับทุกคำ แค่รู้สึกว่าเต็มและครบโครงสร้าง",
          "• **ห้ามอิมโพรไวส์** — ต้องใช้ pattern ที่ฝึกมาเสมอ",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — DET ประเมินอะไร",
        body: [
          "✅ **ความชัดเจน** — อ่านแล้วเข้าใจทันทีว่าคุณคิดอะไร",
          "✅ **ไวยากรณ์ถูก** — ประโยคสมบูรณ์ tense ถูก",
          "✅ **มี stance ชัดเจน** — เลือกข้าง ห้ามกลาง",
          "✅ **โครงสร้างครบ** — มีเปิด เนื้อหา และปิด",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 3 — ข้อผิดพลาดที่ต้องหลีกเลี่ยง",
        body: [
          "**❌ ไม่มี stance** — เขียนกลางๆ",
          "  ผิด: *Both options have advantages and disadvantages.*",
          "  ถูก: *I think living in a city is better because there are more opportunities.*",
          "",
          "**❌ สลับลำดับ Explain ↔ Example** (ร้ายแรงที่สุด)",
          "  ลำดับที่ถูก: **Explain ก่อนเสมอ** แล้วค่อย Example",
          "  ผิด: *For example, I study better at home. I prefer studying alone because I can focus.*",
          "  ถูก: *I prefer studying alone because I can focus better. For example, when I study at home I finish my work much faster.*",
          "",
          "**❌ ใช้คำซับซ้อนโดยไม่จำเป็น** — ไวยากรณ์ถูกสำคัญกว่าคำหรู",
          "**❌ ลืม conclusion** — แค่ 1 ประโยคก็พอ แต่ต้องมี",
          "**❌ copy ประโยคแรกมาเป็น conclusion** — ต้องย้ำ stance ด้วยคำที่ต่างไป",
        ].join("\n"),
      },
      {
        heading: "Pattern 1 — Opinion Essay (5 ส่วน)",
        body: [
          "**1. Introduction** — บอก stance ทันที (**ไม่ต้องใช้** transitional word)",
          "   *I think … because …* / *I prefer … because …* / *In my opinion, … because …*",
          "",
          "**2. Explain** — ขยายเหตุผล (**ต้องเริ่มด้วย** transitional word)",
          "   *This is because …* / *The reason is that …* / *Specifically, …*",
          "",
          "**3. Example** — ยกตัวอย่าง (**มาหลัง Explain เสมอ**)",
          "   *For example, …* / *For instance, …* / *To illustrate, …*",
          "",
          "**4. Mini-conclusion** — ย้ำว่าเหตุผลนี้สำคัญ",
          "   *This shows that …* / *Because of this, …* / *As a result, …*",
          "",
          "**5. Conclusion** — ปิด essay",
          "   *Overall, I think …* / *Therefore, I believe …* / *In conclusion, …*",
        ].join("\n"),
      },
      {
        heading: "Pattern 2 — Listing Essay (4 ส่วน)",
        body: [
          "**1. Introduction** — บอก stance + จำนวนเหตุผล",
          "   *There are two main reasons why …* / *I think there are two main benefits of …*",
          "",
          "**2. First reason** — *First, …* / *Firstly, …* / *To begin with, …*",
          "",
          "**3. Second reason** — *Second, …* / *In addition, …* / *Furthermore, …*",
          "",
          "**4. Conclusion** — *Overall, I think …* / *For these reasons, …* / *In conclusion, …*",
        ].join("\n"),
      },
      {
        heading: "ตัวอย่าง — Pattern 1 (Opinion)",
        body:
          "**หัวข้อ:** *Do you prefer studying alone or with others?*\n\n*I prefer studying alone because I can focus much better without distractions. **This is because** when other people are around, it is easy to lose concentration and start talking about unrelated things. **For example**, a one-hour study session with friends sometimes becomes only thirty minutes of actual studying. **This shows that** studying alone helps me use my time more effectively. **Overall, I believe** that studying alone is the better choice for me.*",
      },
      {
        heading: "ตัวอย่าง — Pattern 2 (Listing)",
        body:
          "**หัวข้อ:** *What are the benefits of learning a second language?*\n\n*I think there are two main benefits of learning a second language. **First**, it helps people communicate with more people around the world, which opens up better opportunities in work and travel. **In addition**, learning a new language trains the brain to think in different ways, which can improve memory and problem-solving skills. **For these reasons**, I believe that learning a second language is very valuable for everyone.*",
      },
      {
        heading: "Checklist ก่อนเลือกตัวเลือกในแบบฝึกหัด",
        body: [
          "☐ มี **stance** ชัดเจนตั้งแต่ต้น (ไม่กลาง)",
          "☐ **Explain มาก่อน Example** เสมอ",
          "☐ ทุกส่วนมี **transitional word**",
          "☐ มี **conclusion** ที่ปิด essay (ไม่มีข้อมูลใหม่หลัง Overall/In conclusion)",
        ].join("\n"),
      },
    ],
    exercises: [
      {
        id: "s11-1",
        topic: "Do you prefer living in a city or in the countryside?",
        correctLetter: "B",
        options: [
          {
            letter: "A",
            essayText:
              "Living in a city and living in the countryside both have good points. Cities have more jobs but the countryside is more peaceful. For example, the countryside has fresh air and nature. But cities have better hospitals. I think both are good depending on the person.",
          },
          {
            letter: "B",
            essayText:
              "I prefer living in a city because there are more opportunities for work and education. This is because cities have more companies and public services than rural areas. For example, in a big city there are thousands of job options compared to a small town. This shows that living in a city gives people more choices in life. Overall, I believe that living in a city is the better option.",
          },
          {
            letter: "C",
            essayText:
              "I prefer living in a city. For example, big cities have many job opportunities and universities. This is because cities are more developed. Overall I think cities are better because there are more things to do.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "❌ กลางๆ", B: "✅", C: "✅" },
          { label: "Explain ก่อน Example", A: "—", B: "✅", C: "❌ Example ก่อน Explain" },
          { label: "Transitional words ครบ", A: "❌ ขาดหลายส่วน", B: "✅", C: "❌ ขาด mini-conclusion" },
          { label: "มี conclusion", A: "❌", B: "✅", C: "✅" },
        ],
        rationaleTh:
          "A ผิดเพราะไม่มี stance ชัดเจน เขียนกลางๆ ตลอด · C ผิดเพราะสลับลำดับ — ยก Example ก่อน Explain",
      },
      {
        id: "s11-2",
        topic: "What are the benefits of doing exercise regularly?",
        correctLetter: "A",
        options: [
          {
            letter: "A",
            essayText:
              "I think there are two main benefits of exercising regularly. First, it improves physical health by making the heart and muscles stronger. In addition, it also reduces stress and helps people feel happier every day. For these reasons, I believe that exercising regularly is one of the best habits a person can have.",
          },
          {
            letter: "B",
            essayText:
              "Exercising is very good for you. For example, running every day makes you feel better. This is because exercise helps your body stay strong. Also walking is a good exercise too. I think everyone should exercise because it is healthy.",
          },
          {
            letter: "C",
            essayText:
              "I believe exercising regularly has many benefits for both the body and the mind. This is because it strengthens muscles and improves heart health over time. For example, people who walk every day tend to feel more energetic and get sick less often. This shows that even simple exercise can make a big difference. For these reasons, I think everyone should try to exercise regularly, even for just thirty minutes a day.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "✅", B: "❌ ไม่บอก pattern", C: "✅" },
          { label: "โครงสร้างถูก", A: "✅", B: "❌ Example ก่อน Explain", C: "✅" },
          { label: "Transitional words ครบ", A: "✅", B: "❌ ขาดหลายส่วน", C: "✅" },
          { label: "มี conclusion ที่ดี", A: "✅", B: "❌", C: "❌ ใส่ข้อมูลใหม่หลัง conclusion" },
        ],
        rationaleTh:
          "B ผิดเพราะ Example มาก่อน Explain และไม่มี conclusion จริงๆ · C ผิดเพราะยาวเกินไป + ใส่ข้อมูลใหม่ใน conclusion — conclusion ที่ดีต้องย้ำ stance เท่านั้น",
      },
      {
        id: "s11-3",
        topic: "Do you think it is better to study online or in a classroom?",
        correctLetter: "A",
        options: [
          {
            letter: "A",
            essayText:
              "I think studying in a classroom is better because students can interact with their teacher directly. This is because face-to-face communication helps students understand lessons more quickly. For example, if a student does not understand something, they can raise their hand and get help right away. This shows that direct interaction makes learning more effective. Overall, I believe classroom studying leads to better results.",
          },
          {
            letter: "B",
            essayText:
              "I think studying online is more convenient because you can study anywhere at any time. For example, many students in Thailand study from home using their phones. This is because online platforms are easy to access. Overall, I think online studying is the future of education and everyone should try it.",
          },
          {
            letter: "C",
            essayText:
              "Studying online has many benefits and so does studying in a classroom. For example, online studying is flexible. But classroom studying is more social. This is because you can meet friends. I think both are good in different situations and it depends on the student.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "✅", B: "✅", C: "❌ กลางๆ" },
          { label: "Explain ก่อน Example", A: "✅", B: "❌ Example ก่อน Explain", C: "❌ Example ก่อน Explain" },
          { label: "Transitional words ครบ", A: "✅", B: "❌ ขาด mini-conclusion", C: "❌ ขาดหลายส่วน" },
          { label: "มี conclusion", A: "✅", B: "✅", C: "❌" },
        ],
        rationaleTh:
          "B ผิดเพราะสลับลำดับ — Example มาก่อน Explain · C ผิดเพราะไม่มี stance และโครงสร้างสับสน",
      },
      {
        id: "s11-4",
        topic: "Should university students be required to do an internship before graduating?",
        correctLetter: "A",
        options: [
          {
            letter: "A",
            essayText:
              "I think there are two reasons why university students should do an internship. First, it gives them real work experience that they cannot get in a classroom. In addition, it also helps them build a professional network which is useful when looking for a job after graduation. For these reasons, I believe internships should be required for all university students.",
          },
          {
            letter: "B",
            essayText:
              "University students should do an internship before graduating because it is very helpful. For example, many students who did internships found jobs faster after graduation. This is because they already had experience. Also internships teach you things school cannot. Overall, doing an internship is a great idea for every student.",
          },
          {
            letter: "C",
            essayText:
              "I think internships are very important for students. This is because working in a real company teaches you many things. For example, you learn how to communicate professionally and manage your time. This shows that internships are useful. Overall, I believe all students should do an internship. Also it is good experience and helps with finding a job later.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "✅", B: "✅", C: "✅" },
          { label: "โครงสร้างถูก", A: "✅", B: "❌ Example ก่อน Explain", C: "✅" },
          { label: "Transitional words ครบ", A: "✅", B: "❌ ขาด mini-conclusion", C: "✅" },
          { label: "มี conclusion (ไม่ใส่ข้อมูลใหม่)", A: "✅", B: "✅", C: "❌ มีข้อมูลใหม่หลัง conclusion" },
        ],
        rationaleTh:
          "B ผิดเพราะ Example มาก่อน Explain ในเหตุผลแรก · C ผิดเพราะเขียน Overall แล้วยังเพิ่มข้อมูลอีก — เมื่อปิดต้องจบเลย",
      },
      {
        id: "s11-5",
        topic: "Do you prefer reading books or watching videos to learn new things?",
        correctLetter: "B",
        options: [
          {
            letter: "A",
            essayText:
              "I prefer watching videos to learn new things because it is easier to understand visual information. For example, science channels on YouTube explain difficult topics using animation and graphics. This is because videos can show things that words alone cannot describe easily. This shows that visual learning is more effective for complex topics. Overall, I think watching videos is a better way to learn for most people.",
          },
          {
            letter: "B",
            essayText:
              "I prefer reading books because I can learn at my own pace. This is because books allow me to stop, re-read, and think carefully about the information. For example, when I read about history I can go back and recheck important dates and facts as many times as I need. This shows that reading gives more control over the learning process. Overall, I believe reading is a more effective way to learn.",
          },
          {
            letter: "C",
            essayText:
              "Reading books and watching videos are both good ways to learn. This is because some people learn better by reading and some by watching. For example, students who prefer videos can find many good channels online. Also, books are good because they have more detailed information. I think the best way depends on the person and the subject.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "✅", B: "✅", C: "❌ กลางๆ" },
          { label: "Explain ก่อน Example", A: "❌ Example ก่อน Explain", B: "✅", C: "✅" },
          { label: "Transitional words ครบ", A: "❌ Explain มาหลัง Example", B: "✅", C: "❌ ขาด conclusion" },
          { label: "มี conclusion", A: "✅", B: "✅", C: "❌" },
        ],
        rationaleTh:
          "A ผิดเพราะสลับลำดับ — Example มาก่อน Explain · C ผิดเพราะไม่มี stance และไม่มี conclusion จริงๆ",
      },
    ],
  };
}

function buildSession12(): MiniStudyEssayClozeSession {
  return {
    id: "session-12",
    index: 12,
    title: "Writing essay — find your grammar mistakes",
    subtitle: "3 cloze essays · auto-graded weakness report (Thai)",
    durationLabel: "≈ 15 min",
    kind: "essay-cloze",
    explanation: [
      {
        heading: "ทำไมต้องฝึกเรื่องนี้ (Thai)",
        body: [
          "DET essay **ใช้ไวยากรณ์เป็นเกณฑ์หลักในการให้คะแนน**",
          "ถ้าอยากได้คะแนนสูง คุณต้อง **เติม -s/-es** ในคำกริยา present simple ให้ถูก และ **ใช้คำนามเอกพจน์/พหูพจน์/นับไม่ได้** ให้ถูก",
          "แบบฝึกหัดนี้จะทดสอบ 5 จุดอ่อนยอดฮิตของนักเรียนไทย:",
          "",
          "1. **Present Simple** — ประธานเอกพจน์ ต้องเติม -s/-es",
          "2. **คำนามพหูพจน์** — แนวคิดทั่วไปต้องเป็นพหูพจน์",
          "3. **คำนามนับไม่ได้** — ห้ามเติม -s (loneliness, information, advice…)",
          "4. **คำนามเอกพจน์หลัง a/an** — ห้ามเติม -s",
          "5. **Subject-verb agreement** — ประธานพหูพจน์ + กริยาไม่เติม -s",
        ].join("\n"),
      },
      {
        heading: "วิธีทำ",
        body: [
          "• แต่ละช่องจะมี **cue ในวงเล็บ** เช่น [VERB: help] หรือ [NOUN: friend]",
          "• เติม **รูปที่ถูกต้องตามไวยากรณ์** — ไม่ใช่คำในวงเล็บตรงๆ",
          "• ใช้ **คำเดียว** (ห้ามเขียนคำสั้น)",
          "• กด **Check answers** แล้วระบบจะตรวจทุกข้อทันทีและแสดงรายงานจุดอ่อนเป็นภาษาไทย",
          "• กด **Save to notebook** เพื่อเก็บรายงานไว้ทบทวน",
        ].join("\n"),
      },
      {
        heading: "ระดับความยาก",
        body: [
          "• **ข้อ 1** — present simple + พหูพจน์พื้นฐาน",
          "• **ข้อ 2** — เพิ่มพหูพจน์ผิดปกติ + subject-verb agreement ซับซ้อนขึ้น",
          "• **ข้อ 3** — เพิ่ม **คำนามนับไม่ได้** + กับดักเรื่อง **which** ที่เป็นประธานเอกพจน์",
        ].join("\n"),
      },
    ],
    studentInstructionsTh:
      "อ่าน essay ให้จบก่อน แล้วเติมคำในรูปที่ถูกต้องตามไวยากรณ์ ห้ามเปลี่ยนคำอื่นในประโยค",
    exercises: [
      {
        id: "s12-1",
        patternLabel: "Pattern 1 — Opinion Essay",
        topic: "Do you prefer studying alone or with others?",
        essayTemplate:
          "I prefer studying alone because it ___ me focus much better. This is because ___ from other people ___ it harder to concentrate on my work. For example, a study session with ___ often ___ into a social event instead of actual studying. This shows that ___ who study alone ___ to use their time more effectively. Overall, I believe that studying alone ___ the better choice for most ___.",
        blanks: [
          { number: 1, cue: "VERB: help", correct: "helps", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (it) ต้องเติม -s" },
          { number: 2, cue: "NOUN: distraction", correct: "distractions", acceptedAlts: ["Distractions"], category: "plural-noun", ruleNoteTh: "คำนามแนวคิดทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 3, cue: "VERB: make", correct: "make", category: "subject-verb-agreement-plural", ruleNoteTh: "ประธานพหูพจน์ (distractions) — กริยาไม่เติม -s" },
          { number: 4, cue: "NOUN: friend", correct: "friends", category: "plural-noun", ruleNoteTh: "คำนามทั่วไปในรูปพหูพจน์" },
          { number: 5, cue: "VERB: turn", correct: "turns", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (a study session) ต้องเติม -s" },
          { number: 6, cue: "NOUN: student", correct: "students", acceptedAlts: ["Students"], category: "plural-noun", ruleNoteTh: "กลุ่มทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 7, cue: "VERB: tend", correct: "tend", category: "subject-verb-agreement-plural", ruleNoteTh: "ประธานพหูพจน์ (students) — กริยาไม่เติม -s" },
          { number: 8, cue: "VERB: be", correct: "is", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (studying alone) ใช้ 'is'" },
          { number: 9, cue: "NOUN: person", correct: "people", category: "plural-noun", ruleNoteTh: "คำนามพหูพจน์ผิดปกติ: person → people" },
        ],
      },
      {
        id: "s12-2",
        patternLabel: "Pattern 2 — Listing Essay",
        topic: "What are the benefits of learning a second language?",
        noteTh:
          "ระวัง: คำที่อยู่หลัง 'two main ___' ต้องเป็นพหูพจน์เสมอ · ประธานพหูพจน์ → กริยาไม่เติม -s",
        essayTemplate:
          "I think there are two main ___ of learning a second language. First, it ___ people to communicate with a much wider range of ___ around the world. This is because many international ___ in work and travel ___ more than one language. In addition, learning a new language also ___ the brain to think in different ___, which ___ both memory and problem-solving ___. For these reasons, I believe that learning a second language ___ people a significant advantage in life.",
        blanks: [
          { number: 1, cue: "NOUN: benefit", correct: "benefits", category: "plural-noun", ruleNoteTh: "หลัง 'two main' ต้องเป็นพหูพจน์" },
          { number: 2, cue: "VERB: allow", correct: "allows", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (it)" },
          { number: 3, cue: "NOUN: person", correct: "people", category: "plural-noun", ruleNoteTh: "พหูพจน์ผิดปกติ: person → people" },
          { number: 4, cue: "NOUN: opportunity", correct: "opportunities", category: "plural-noun", ruleNoteTh: "พหูพจน์ที่ y → ies" },
          { number: 5, cue: "VERB: require", correct: "require", category: "subject-verb-agreement-plural", ruleNoteTh: "ประธานพหูพจน์ (opportunities) — กริยาไม่เติม -s" },
          { number: 6, cue: "VERB: train", correct: "trains", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (learning…)" },
          { number: 7, cue: "NOUN: way", correct: "ways", category: "plural-noun", ruleNoteTh: "หลัง 'different' โดยทั่วไปเป็นพหูพจน์" },
          { number: 8, cue: "VERB: improve", correct: "improves", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (which → the act of training)" },
          { number: 9, cue: "NOUN: skill", correct: "skills", category: "plural-noun", ruleNoteTh: "แนวคิดทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 10, cue: "VERB: give", correct: "gives", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (learning a second language)" },
        ],
      },
      {
        id: "s12-3",
        patternLabel: "Pattern 1 — Opinion Essay (advanced)",
        topic: "Do you think it is better to live with family or alone?",
        noteTh:
          "ระวัง: คำนามนับไม่ได้ (loneliness) ห้ามเติม -s · คำหลัง 'a young' ต้องเป็นเอกพจน์ · which เป็นประธานเอกพจน์",
        essayTemplate:
          "I believe that living with family ___ better because it ___ both emotional and financial support. This is because ___ ___ each other during difficult ___, which ___ stress and ___. For example, when a young ___ ___ a problem at work, having family at home ___ them a sense of comfort and security. This shows that family ___ a support system that ___ alone cannot always replace. Overall, I think living with family ___ the better choice for most ___.",
        blanks: [
          { number: 1, cue: "VERB: be", correct: "is", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (living with family)" },
          { number: 2, cue: "VERB: provide", correct: "provides", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (it)" },
          { number: 3, cue: "NOUN: family member", correct: "family members", category: "plural-noun", ruleNoteTh: "กลุ่มทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 4, cue: "VERB: help", correct: "help", category: "subject-verb-agreement-plural", ruleNoteTh: "ประธานพหูพจน์ (family members) — กริยาไม่เติม -s" },
          { number: 5, cue: "NOUN: time", correct: "times", category: "plural-noun", ruleNoteTh: "หลัง 'difficult' โดยทั่วไปเป็นพหูพจน์" },
          { number: 6, cue: "VERB: reduce", correct: "reduces", category: "present-simple-singular", ruleNoteTh: "Present simple — which เป็นประธานเอกพจน์ (อ้างถึงประโยคก่อน)" },
          { number: 7, cue: "NOUN: loneliness", correct: "loneliness", category: "uncountable-noun", ruleNoteTh: "คำนามนับไม่ได้ — ห้ามเติม -s" },
          { number: 8, cue: "NOUN: adult", correct: "adult", category: "singular-after-a-an", ruleNoteTh: "หลัง 'a young' — ต้องเป็นเอกพจน์" },
          { number: 9, cue: "VERB: face", correct: "faces", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (a young adult)" },
          { number: 10, cue: "VERB: give", correct: "gives", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (having family at home)" },
          { number: 11, cue: "VERB: provide", correct: "provides", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (family)" },
          { number: 12, cue: "NOUN: friend", correct: "friends", category: "plural-noun", ruleNoteTh: "กลุ่มทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 13, cue: "VERB: be", correct: "is", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (living with family)" },
          { number: 14, cue: "NOUN: person", correct: "people", category: "plural-noun", ruleNoteTh: "พหูพจน์ผิดปกติ: person → people" },
        ],
      },
    ],
  };
}
