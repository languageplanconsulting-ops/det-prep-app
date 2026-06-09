export type MiniStudyItem = {
  id: string;
  sentence: string;
  explanation: string;
};

export type MiniStudySession = {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  durationLabel: string;
  explanation: { heading: string; body: string }[];
  items: MiniStudyItem[];
};

export const MINI_STUDY_SESSIONS: MiniStudySession[] = [
  {
    id: "session-1",
    index: 1,
    title: "Commas: FANBOYS & Subordinating Conjunctions",
    subtitle: "15 minutes · Dictation foundation",
    durationLabel: "≈ 15 min",
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
];

export function getMiniStudySession(id: string): MiniStudySession | null {
  return MINI_STUDY_SESSIONS.find((s) => s.id === id) ?? null;
}
