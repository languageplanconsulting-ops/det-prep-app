/**
 * Content bank for the เติมคำในช่องว่าง · ไวยากรณ์ lesson (see grammar-fitb.ts).
 *
 * AUTHORING RULES (checked by the scratchpad validator):
 *  - Every passage must contain exactly the markers [BLANK 1] … [BLANK 5], in order.
 *  - blanks[i].correctWord is the word that goes in [BLANK i+1].
 *  - prefixLength must be >= 1 and strictly less than correctWord.length.
 *  - Each chapter's exercises are ordered easy → medium → hard.
 */
import type { GrammarChapter } from "./grammar-fitb";

export const GRAMMAR_CHAPTERS: GrammarChapter[] = [
  // ============================================================= 1. PRESENT TENSE
  {
    id: "present-tense",
    th: "ปัจจุบัน (เติม s/es)",
    en: "Present simple",
    icon: "🔵",
    tagline: "โจทย์เป็นปัจจุบัน → ประธานเอกพจน์ กริยาต้องเติม -s / -es / -ies",
    ruleTitleTh: "กริยาปัจจุบันกับประธานเอกพจน์",
    coachLines: [
      "ถ้าทั้งย่อหน้าเป็น “ปัจจุบัน” (พูดถึงสิ่งที่ทำเป็นประจำหรือเป็นความจริง) และประธานเป็น เอกพจน์บุรุษที่ 3 (he, she, it, ชื่อคนคนเดียว) กริยาต้อง เติม -s เสมอ",
      "ลงท้ายด้วย -s, -ss, -sh, -ch, -x, -o → เติม -es (goes, watches, brushes) · ลงท้ายด้วย พยัญชนะ + y → เปลี่ยน y เป็น -ies (study → studies)",
      "รูปพิเศษที่ต้องจำ: have → has, do → does, be → is · และถ้าประธานเป็น พหูพจน์ (they, students) กริยา ไม่เติม -s (คงรูปเดิม)",
    ],
    examples: [
      { en: "She goes to school every day.", th: "She เอกพจน์ + go ลงท้าย o → goes" },
      { en: "He studies English.", th: "study → studies (พยัญชนะ + y)" },
      { en: "My friends play football.", th: "friends พหูพจน์ → play (ไม่เติม s)" },
    ],
    exercises: [
      {
        id: "pt-e1",
        difficulty: "easy",
        passageTh: "กิจวัตรของคุณพ่อ",
        passage:
          "My father [BLANK 1] in an office. He [BLANK 2] a car to work. After work, he [BLANK 3] the news and [BLANK 4] dinner with us. He [BLANK 5] football on weekends.",
        blanks: [
          { correctWord: "works", clueTh: "จากคำว่า work · He เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "work + s = works" },
          { correctWord: "drives", clueTh: "จากคำว่า drive · เอกพจน์ → เติม -s", prefixLength: 5, explanationThai: "drive + s = drives" },
          { correctWord: "reads", clueTh: "จากคำว่า read · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "read + s = reads" },
          { correctWord: "cooks", clueTh: "จากคำว่า cook · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "cook + s = cooks" },
          { correctWord: "plays", clueTh: "จากคำว่า play · สระ + y → เติม -s", prefixLength: 4, explanationThai: "play ลงท้ายสระ + y → เติม -s = plays" },
        ],
      },
      {
        id: "pt-e2",
        difficulty: "easy",
        passageTh: "แอนนาตั้งใจเรียน",
        passage:
          "Anna [BLANK 1] English every day. She [BLANK 2] to music and [BLANK 3] new words. She [BLANK 4] her homework at night. She [BLANK 5] to be a teacher.",
        blanks: [
          { correctWord: "learns", clueTh: "จากคำว่า learn · She เอกพจน์ → เติม -s", prefixLength: 5, explanationThai: "learn + s = learns" },
          { correctWord: "listens", clueTh: "จากคำว่า listen · เอกพจน์ → เติม -s", prefixLength: 6, explanationThai: "listen + s = listens" },
          { correctWord: "reads", clueTh: "จากคำว่า read · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "read + s = reads" },
          { correctWord: "starts", clueTh: "จากคำว่า start · เอกพจน์ → เติม -s", prefixLength: 5, explanationThai: "start + s = starts" },
          { correctWord: "wants", clueTh: "จากคำว่า want · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "want + s = wants" },
        ],
      },
      {
        id: "pt-e3",
        difficulty: "easy",
        passageTh: "ความจริงรอบตัว",
        passage:
          "The sun [BLANK 1] in the east. A dog [BLANK 2] fast. My mother [BLANK 3] tea in the morning. My brother [BLANK 4] to school by bike. He [BLANK 5] home at four.",
        blanks: [
          { correctWord: "rises", clueTh: "จากคำว่า rise · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "rise + s = rises" },
          { correctWord: "runs", clueTh: "จากคำว่า run · A dog เอกพจน์ → เติม -s", prefixLength: 3, explanationThai: "run + s = runs" },
          { correctWord: "drinks", clueTh: "จากคำว่า drink · เอกพจน์ → เติม -s", prefixLength: 5, explanationThai: "drink + s = drinks" },
          { correctWord: "rides", clueTh: "จากคำว่า ride · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "ride + s = rides" },
          { correctWord: "comes", clueTh: "จากคำว่า come · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "come + s = comes" },
        ],
      },
      {
        id: "pt-m1",
        difficulty: "medium",
        passageTh: "กิจวัตรตอนเช้าของน้องสาว",
        passage:
          "Every morning, my sister [BLANK 1] up at six. She [BLANK 2] her teeth and [BLANK 3] a healthy breakfast. Then she [BLANK 4] to university by bus. Her classes usually [BLANK 5] at nine.",
        blanks: [
          { correctWord: "wakes", clueTh: "จากคำว่า wake · She เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "She เป็นประธานเอกพจน์ + ปัจจุบัน → กริยา wake เติม -s = wakes" },
          { correctWord: "brushes", clueTh: "จากคำว่า brush · ลงท้าย -sh → เติม -es", prefixLength: 5, explanationThai: "กริยาที่ลงท้ายด้วย -sh เติม -es → brush + es = brushes" },
          { correctWord: "eats", clueTh: "จากคำว่า eat · เอกพจน์ → เติม -s", prefixLength: 3, explanationThai: "eat + s = eats (She เอกพจน์)" },
          { correctWord: "goes", clueTh: "จากคำว่า go · ลงท้าย -o → เติม -es", prefixLength: 2, explanationThai: "กริยาที่ลงท้ายด้วย -o เติม -es → go + es = goes" },
          { correctWord: "start", clueTh: "จากคำว่า start · ประธาน classes เป็นพหูพจน์ → ไม่เติม -s", prefixLength: 4, explanationThai: "Her classes เป็นพหูพจน์ → กริยาคงรูปเดิม = start (อย่าเผลอเติม -s)" },
        ],
      },
      {
        id: "pt-m2",
        difficulty: "medium",
        passageTh: "แดเนียลกับการเรียนมหาวิทยาลัย",
        passage:
          "Daniel [BLANK 1] engineering at a large university. He [BLANK 2] very hard because he [BLANK 3] to get a scholarship. His professor [BLANK 4] him every week, and his friends often [BLANK 5] him with difficult problems.",
        blanks: [
          { correctWord: "studies", clueTh: "จากคำว่า study · พยัญชนะ + y → เปลี่ยนเป็น -ies", prefixLength: 4, explanationThai: "study ลงท้ายด้วยพยัญชนะ + y → เปลี่ยน y เป็น -ies = studies" },
          { correctWord: "works", clueTh: "จากคำว่า work · He เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "work + s = works" },
          { correctWord: "wants", clueTh: "จากคำว่า want · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "want + s = wants" },
          { correctWord: "teaches", clueTh: "จากคำว่า teach · ลงท้าย -ch → เติม -es", prefixLength: 5, explanationThai: "กริยาที่ลงท้ายด้วย -ch เติม -es → teach + es = teaches" },
          { correctWord: "help", clueTh: "จากคำว่า help · ประธาน friends พหูพจน์ → ไม่เติม -s", prefixLength: 3, explanationThai: "his friends เป็นพหูพจน์ → กริยาคงรูปเดิม = help" },
        ],
      },
      {
        id: "pt-m3",
        difficulty: "medium",
        passageTh: "เล่าเรื่องเมืองกรุงเทพฯ",
        passage:
          "Bangkok [BLANK 1] a very busy city. It [BLANK 2] millions of people, and the traffic [BLANK 3] terrible in the morning. My friend [BLANK 4] not like driving there, so she [BLANK 5] the train instead.",
        blanks: [
          { correctWord: "is", clueTh: "verb to be · Bangkok/It เอกพจน์ → is", prefixLength: 1, explanationThai: "verb to be กับประธานเอกพจน์ปัจจุบัน = is" },
          { correctWord: "has", clueTh: "จากคำว่า have · เอกพจน์ → รูปพิเศษ has", prefixLength: 2, explanationThai: "have กับประธานเอกพจน์เปลี่ยนเป็นรูปพิเศษ = has" },
          { correctWord: "is", clueTh: "the traffic เอกพจน์ → is", prefixLength: 1, explanationThai: "the traffic เป็นเอกพจน์ + to be = is" },
          { correctWord: "does", clueTh: "ประโยคปฏิเสธเอกพจน์ · do + not → does", prefixLength: 2, explanationThai: "ปฏิเสธในปัจจุบันของประธานเอกพจน์ใช้ does not → does (do เติม -es)" },
          { correctWord: "takes", clueTh: "จากคำว่า take · she เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "take + s = takes (take the train = นั่งรถไฟ)" },
        ],
      },
      {
        id: "pt-m4",
        difficulty: "medium",
        passageTh: "กิจวัตรของคุณครูในห้องเรียน",
        passage:
          "Our teacher [BLANK 1] class at eight o'clock. She always [BLANK 2] the door and [BLANK 3] good morning to everyone. Some students [BLANK 4] late, but she never [BLANK 5] angry.",
        blanks: [
          { correctWord: "begins", clueTh: "จากคำว่า begin · เอกพจน์ → เติม -s", prefixLength: 5, explanationThai: "begin + s = begins" },
          { correctWord: "opens", clueTh: "จากคำว่า open · เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "open + s = opens" },
          { correctWord: "says", clueTh: "จากคำว่า say · สระ + y → เติม -s เฉยๆ", prefixLength: 3, explanationThai: "say ลงท้ายด้วยสระ + y → เติม -s ธรรมดา = says (ไม่เปลี่ยนเป็น -ies)" },
          { correctWord: "arrive", clueTh: "จากคำว่า arrive · Some students พหูพจน์ → ไม่เติม -s", prefixLength: 5, explanationThai: "Some students เป็นพหูพจน์ → กริยาคงรูปเดิม = arrive" },
          { correctWord: "gets", clueTh: "จากคำว่า get · she เอกพจน์ → เติม -s", prefixLength: 3, explanationThai: "get + s = gets (get angry = โกรธ)" },
        ],
      },
      {
        id: "pt-h1",
        difficulty: "hard",
        passageTh: "ประธานที่ต้องคิดให้ดี",
        passage:
          "Everyone in my class [BLANK 1] hard for the exam. My best friend [BLANK 2] not like tests, but she never [BLANK 3] up. The teacher, along with the students, [BLANK 4] the results carefully. Good preparation always [BLANK 5] to success.",
        blanks: [
          { correctWord: "works", clueTh: "Everyone ถือเป็นเอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "Everyone/Everybody ถือเป็นเอกพจน์ → กริยาเติม -s = works" },
          { correctWord: "does", clueTh: "ปฏิเสธเอกพจน์ · do + not → does", prefixLength: 2, explanationThai: "she ปฏิเสธ → does not like (do เติม -es)" },
          { correctWord: "gives", clueTh: "จากคำว่า give · she เอกพจน์ → เติม -s (give up = ยอมแพ้)", prefixLength: 4, explanationThai: "give + s = gives (give up = ยอมแพ้)" },
          { correctWord: "checks", clueTh: "ประธานคือ The teacher (เอกพจน์) · วลี along with… ไม่นับ", prefixLength: 5, explanationThai: "ประธานแท้คือ The teacher (เอกพจน์) วลี along with the students เป็นส่วนแทรก → เติม -s = checks" },
          { correctWord: "leads", clueTh: "preparation เอกพจน์นับไม่ได้ → เติม -s", prefixLength: 4, explanationThai: "preparation เป็นนามนับไม่ได้ (เอกพจน์) → lead + s = leads" },
        ],
      },
      {
        id: "pt-h2",
        difficulty: "hard",
        passageTh: "ร้านอาหารของครอบครัว",
        passage:
          "My family [BLANK 1] a small restaurant in town. It [BLANK 2] open six days a week. The waiters [BLANK 3] very friendly, and the food [BLANK 4] delicious. Many people [BLANK 5] there for lunch.",
        blanks: [
          { correctWord: "owns", clueTh: "family (มองเป็นหน่วยเดียว) → เอกพจน์ เติม -s", prefixLength: 3, explanationThai: "family เมื่อมองเป็นหน่วยเดียว → เอกพจน์ → own + s = owns" },
          { correctWord: "is", clueTh: "It เอกพจน์ → is", prefixLength: 1, explanationThai: "It + to be = is" },
          { correctWord: "are", clueTh: "The waiters พหูพจน์ → are", prefixLength: 2, explanationThai: "waiters เป็นพหูพจน์ → are" },
          { correctWord: "is", clueTh: "food นับไม่ได้ เอกพจน์ → is", prefixLength: 1, explanationThai: "food เป็นนามนับไม่ได้ (เอกพจน์) → is" },
          { correctWord: "come", clueTh: "people เป็นพหูพจน์ → ไม่เติม -s", prefixLength: 3, explanationThai: "people เป็นพหูพจน์เสมอ → กริยาไม่เติม -s = come" },
        ],
      },
      {
        id: "pt-h3",
        difficulty: "hard",
        passageTh: "ประธานพิเศษที่ต้องระวัง",
        passage:
          "Water [BLANK 1] at 100 degrees. Neither of my parents [BLANK 2] coffee. Each student [BLANK 3] a laptop in class. Ten kilometers [BLANK 4] a long way to walk. My glasses [BLANK 5] on the table.",
        blanks: [
          { correctWord: "boils", clueTh: "Water นับไม่ได้ เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "Water เป็นนามนับไม่ได้ (เอกพจน์) → boil + s = boils" },
          { correctWord: "drinks", clueTh: "Neither ถือเป็นเอกพจน์ → เติม -s", prefixLength: 5, explanationThai: "Neither of… ถือเป็นเอกพจน์ → drink + s = drinks" },
          { correctWord: "needs", clueTh: "Each + นาม เอกพจน์ → เติม -s", prefixLength: 4, explanationThai: "Each + นามเอกพจน์ → need + s = needs" },
          { correctWord: "is", clueTh: "ระยะทาง/จำนวน มองเป็นก้อนเดียว → is", prefixLength: 1, explanationThai: "ระยะทางหรือจำนวนเงินมองเป็นหน่วยเดียว → เอกพจน์ → is" },
          { correctWord: "are", clueTh: "glasses (แว่นตา) เป็นพหูพจน์ → are", prefixLength: 2, explanationThai: "glasses (แว่นตา) เป็นพหูพจน์เสมอ → are" },
        ],
      },
    ],
  },

  // ================================================================ 2. PAST TENSE
  {
    id: "past-tense",
    th: "อดีต (กริยาช่อง 2)",
    en: "Past simple",
    icon: "🟣",
    tagline: "โจทย์เป็นอดีต → เปลี่ยนกริยาเป็นช่อง 2 (regular +ed / irregular)",
    ruleTitleTh: "โจทย์อดีตต้องใช้กริยาช่อง 2",
    coachLines: [
      "สังเกตคำบอกเวลา เช่น yesterday, last week, in 1990, when I was young → ทั้งย่อหน้าเป็น อดีต ต้องเปลี่ยนกริยาเป็น ช่อง 2 (past)",
      "กริยาปกติ (regular) เติม -ed · ลงท้าย e อยู่แล้วเติมแค่ -d (live → lived) · พยัญชนะ + y → -ied (study → studied) · สระเดี่ยว + พยัญชนะเดี่ยว มักซ้ำพยัญชนะ (grab → grabbed)",
      "กริยาไม่ปกติ (irregular) ต้องจำเป็นคำๆ: go → went, eat → ate, take → took, have → had, write → wrote, do → did · และ be → was/were",
    ],
    examples: [
      { en: "We went to Chiang Mai last week.", th: "go → went (irregular)" },
      { en: "She lived in a village.", th: "live → lived (ลงท้าย e เติมแค่ -d)" },
      { en: "It rained all day.", th: "rain → rained (regular +ed)" },
    ],
    exercises: [
      {
        id: "pa-e1",
        difficulty: "easy",
        passageTh: "เมื่อวานอ่านหนังสือ",
        passage:
          "Yesterday, I [BLANK 1] a new book. I [BLANK 2] it in the park. Then I [BLANK 3] my friend on the phone. We [BLANK 4] about the story. It [BLANK 5] a great day.",
        blanks: [
          { correctWord: "opened", clueTh: "จากคำว่า open · regular → เติม -ed", prefixLength: 4, explanationThai: "open + ed = opened" },
          { correctWord: "enjoyed", clueTh: "จากคำว่า enjoy · regular → เติม -ed", prefixLength: 5, explanationThai: "enjoy + ed = enjoyed" },
          { correctWord: "called", clueTh: "จากคำว่า call · regular → เติม -ed", prefixLength: 4, explanationThai: "call + ed = called" },
          { correctWord: "talked", clueTh: "จากคำว่า talk · regular → เติม -ed", prefixLength: 4, explanationThai: "talk + ed = talked" },
          { correctWord: "was", clueTh: "verb to be อดีต · It เอกพจน์ → was", prefixLength: 2, explanationThai: "It + อดีต → was" },
        ],
      },
      {
        id: "pa-e2",
        difficulty: "easy",
        passageTh: "ดูหนังที่บ้าน",
        passage:
          "Last night, we [BLANK 1] a movie at home. My sister [BLANK 2] popcorn for us. The film [BLANK 3] two hours. We all [BLANK 4] it very much. After that, we [BLANK 5] off the lights.",
        blanks: [
          { correctWord: "watched", clueTh: "จากคำว่า watch · regular → เติม -ed", prefixLength: 5, explanationThai: "watch + ed = watched" },
          { correctWord: "cooked", clueTh: "จากคำว่า cook · regular → เติม -ed", prefixLength: 4, explanationThai: "cook + ed = cooked" },
          { correctWord: "lasted", clueTh: "จากคำว่า last · regular → เติม -ed", prefixLength: 4, explanationThai: "last + ed = lasted" },
          { correctWord: "loved", clueTh: "จากคำว่า love · ลงท้าย e → เติมแค่ -d", prefixLength: 4, explanationThai: "love ลงท้าย e → เติม -d = loved" },
          { correctWord: "turned", clueTh: "จากคำว่า turn · regular → เติม -ed", prefixLength: 4, explanationThai: "turn + ed = turned (turn off = ปิด)" },
        ],
      },
      {
        id: "pa-e3",
        difficulty: "easy",
        passageTh: "การแข่งขันวันอาทิตย์",
        passage:
          "The team [BLANK 1] a big match on Sunday. Thousands of fans [BLANK 2] to the stadium. The players [BLANK 3] very hard. In the end, they [BLANK 4] very tired. The fans [BLANK 5] for a long time.",
        blanks: [
          { correctWord: "played", clueTh: "จากคำว่า play · regular → เติม -ed", prefixLength: 4, explanationThai: "play + ed = played" },
          { correctWord: "walked", clueTh: "จากคำว่า walk · regular → เติม -ed", prefixLength: 4, explanationThai: "walk + ed = walked" },
          { correctWord: "worked", clueTh: "จากคำว่า work · regular → เติม -ed", prefixLength: 4, explanationThai: "work + ed = worked" },
          { correctWord: "looked", clueTh: "จากคำว่า look · regular → เติม -ed (look tired = ดูเหนื่อย)", prefixLength: 4, explanationThai: "look + ed = looked" },
          { correctWord: "cheered", clueTh: "จากคำว่า cheer · regular → เติม -ed", prefixLength: 5, explanationThai: "cheer + ed = cheered" },
        ],
      },
      {
        id: "pa-m1",
        difficulty: "medium",
        passageTh: "ทริปไปเชียงใหม่สุดสัปดาห์ที่แล้ว",
        passage:
          "Last weekend, we [BLANK 1] to Chiang Mai by train. The journey [BLANK 2] eight hours. We [BLANK 3] at a small hotel and [BLANK 4] some delicious local food. On Sunday, it [BLANK 5] all day, so we stayed inside.",
        blanks: [
          { correctWord: "went", clueTh: "จากคำว่า go · อดีต (irregular)", prefixLength: 2, explanationThai: "go เป็นกริยาไม่ปกติ → ช่อง 2 = went" },
          { correctWord: "took", clueTh: "จากคำว่า take · อดีต (irregular)", prefixLength: 2, explanationThai: "take → took (take + เวลา = ใช้เวลา)" },
          { correctWord: "stayed", clueTh: "จากคำว่า stay · regular → เติม -ed", prefixLength: 4, explanationThai: "stay ลงท้ายสระ + y → เติม -ed = stayed" },
          { correctWord: "ate", clueTh: "จากคำว่า eat · อดีต (irregular)", prefixLength: 2, explanationThai: "eat → ate" },
          { correctWord: "rained", clueTh: "จากคำว่า rain · regular → เติม -ed", prefixLength: 4, explanationThai: "rain + ed = rained" },
        ],
      },
      {
        id: "pa-m2",
        difficulty: "medium",
        passageTh: "เล่าความหลังตอนเด็ก",
        passage:
          "When I was young, I [BLANK 1] in a small village. My father [BLANK 2] a teacher, and my mother [BLANK 3] a little shop. Every evening, we [BLANK 4] dinner together and [BLANK 5] about our day.",
        blanks: [
          { correctWord: "lived", clueTh: "จากคำว่า live · ลงท้าย e → เติมแค่ -d", prefixLength: 4, explanationThai: "live ลงท้ายด้วย e → เติม -d = lived" },
          { correctWord: "was", clueTh: "verb to be อดีต · My father เอกพจน์ → was", prefixLength: 2, explanationThai: "ประธานเอกพจน์ในอดีตใช้ was" },
          { correctWord: "ran", clueTh: "จากคำว่า run · อดีต (irregular)", prefixLength: 2, explanationThai: "run → ran (run a shop = เปิดร้าน/ดูแลร้าน)" },
          { correctWord: "had", clueTh: "จากคำว่า have · อดีต (irregular)", prefixLength: 2, explanationThai: "have → had (have dinner = กินข้าวเย็น)" },
          { correctWord: "talked", clueTh: "จากคำว่า talk · regular → เติม -ed", prefixLength: 4, explanationThai: "talk + ed = talked" },
        ],
      },
      {
        id: "pa-m3",
        difficulty: "medium",
        passageTh: "วันสอบเมื่อวานนี้",
        passage:
          "Yesterday, our class [BLANK 1] a difficult exam. The teacher [BLANK 2] the questions on the board. I [BLANK 3] my best, but I [BLANK 4] two answers. After the test, we all [BLANK 5] very tired.",
        blanks: [
          { correctWord: "had", clueTh: "จากคำว่า have · อดีต (irregular)", prefixLength: 2, explanationThai: "have → had (have an exam = มีการสอบ)" },
          { correctWord: "wrote", clueTh: "จากคำว่า write · อดีต (irregular)", prefixLength: 2, explanationThai: "write → wrote" },
          { correctWord: "did", clueTh: "จากคำว่า do · อดีต (irregular)", prefixLength: 2, explanationThai: "do → did (do one's best = ทำเต็มที่)" },
          { correctWord: "forgot", clueTh: "จากคำว่า forget · อดีต (irregular)", prefixLength: 4, explanationThai: "forget → forgot" },
          { correctWord: "felt", clueTh: "จากคำว่า feel · อดีต (irregular)", prefixLength: 3, explanationThai: "feel → felt" },
        ],
      },
      {
        id: "pa-m4",
        difficulty: "medium",
        passageTh: "ชีวประวัตินักเขียนชื่อดัง",
        passage:
          "The famous author [BLANK 1] more than twenty books. She [BLANK 2] her first story at the age of ten. Readers around the world [BLANK 3] her novels. In 1990, she [BLANK 4] a big prize and [BLANK 5] famous overnight.",
        blanks: [
          { correctWord: "wrote", clueTh: "จากคำว่า write · อดีต (irregular)", prefixLength: 2, explanationThai: "write → wrote" },
          { correctWord: "started", clueTh: "จากคำว่า start · regular → เติม -ed", prefixLength: 5, explanationThai: "start + ed = started" },
          { correctWord: "loved", clueTh: "จากคำว่า love · ลงท้าย e → เติมแค่ -d", prefixLength: 4, explanationThai: "love ลงท้าย e → เติม -d = loved" },
          { correctWord: "won", clueTh: "จากคำว่า win · อดีต (irregular)", prefixLength: 2, explanationThai: "win → won (win a prize = ได้รางวัล)" },
          { correctWord: "became", clueTh: "จากคำว่า become · อดีต (irregular)", prefixLength: 4, explanationThai: "become → became" },
        ],
      },
      {
        id: "pa-h1",
        difficulty: "hard",
        passageTh: "เช้าที่เร่งรีบ",
        passage:
          "When the alarm [BLANK 1] this morning, I [BLANK 2] out of bed quickly. I [BLANK 3] my breakfast and [BLANK 4] my bag. Then I [BLANK 5] to the bus stop, but the bus had already left.",
        blanks: [
          { correctWord: "rang", clueTh: "จากคำว่า ring · อดีต (irregular)", prefixLength: 2, explanationThai: "ring → rang" },
          { correctWord: "jumped", clueTh: "จากคำว่า jump · regular → เติม -ed", prefixLength: 4, explanationThai: "jump + ed = jumped" },
          { correctWord: "made", clueTh: "จากคำว่า make · อดีต (irregular)", prefixLength: 2, explanationThai: "make → made" },
          { correctWord: "grabbed", clueTh: "จากคำว่า grab · สระเดี่ยว + พยัญชนะเดี่ยว → ซ้ำ b + ed", prefixLength: 4, explanationThai: "grab ลงท้ายสระเดี่ยว + พยัญชนะเดี่ยว → ซ้ำพยัญชนะ + ed = grabbed" },
          { correctWord: "ran", clueTh: "จากคำว่า run · อดีต (irregular)", prefixLength: 2, explanationThai: "run → ran" },
        ],
      },
      {
        id: "pa-h2",
        difficulty: "hard",
        passageTh: "พี่ชายไปทำงานที่ญี่ปุ่น",
        passage:
          "Last year, my brother [BLANK 1] a job in Japan. He [BLANK 2] the language for months before he left. At first, he [BLANK 3] very lonely, but soon he [BLANK 4] many friends. He [BLANK 5] us photos every week.",
        blanks: [
          { correctWord: "got", clueTh: "จากคำว่า get · อดีต (irregular)", prefixLength: 2, explanationThai: "get → got (get a job = ได้งาน)" },
          { correctWord: "studied", clueTh: "จากคำว่า study · พยัญชนะ + y → -ied", prefixLength: 4, explanationThai: "study → studied (พยัญชนะ + y → -ied)" },
          { correctWord: "felt", clueTh: "จากคำว่า feel · อดีต (irregular)", prefixLength: 3, explanationThai: "feel → felt" },
          { correctWord: "made", clueTh: "จากคำว่า make · อดีต (irregular)", prefixLength: 2, explanationThai: "make → made (make friends = มีเพื่อน)" },
          { correctWord: "sent", clueTh: "จากคำว่า send · อดีต (irregular)", prefixLength: 2, explanationThai: "send → sent" },
        ],
      },
      {
        id: "pa-h3",
        difficulty: "hard",
        passageTh: "งานของนักวิทยาศาสตร์",
        passage:
          "The scientist [BLANK 1] a new idea last spring. She [BLANK 2] many experiments and [BLANK 3] careful notes. At first, no one [BLANK 4] her results. However, her work later [BLANK 5] the world of medicine.",
        blanks: [
          { correctWord: "had", clueTh: "จากคำว่า have · อดีต (irregular)", prefixLength: 2, explanationThai: "have → had (have an idea = มีความคิด)" },
          { correctWord: "did", clueTh: "จากคำว่า do · อดีต (irregular)", prefixLength: 2, explanationThai: "do → did (do experiments = ทำการทดลอง)" },
          { correctWord: "took", clueTh: "จากคำว่า take · อดีต (irregular)", prefixLength: 2, explanationThai: "take → took (take notes = จดบันทึก)" },
          { correctWord: "believed", clueTh: "จากคำว่า believe · ลงท้าย e → เติมแค่ -d", prefixLength: 7, explanationThai: "believe ลงท้าย e → เติม -d = believed" },
          { correctWord: "changed", clueTh: "จากคำว่า change · ลงท้าย e → เติมแค่ -d", prefixLength: 6, explanationThai: "change ลงท้าย e → เติม -d = changed" },
        ],
      },
    ],
  },

  // ============================================================= 3. PASSIVE VOICE
  {
    id: "passive-voice",
    th: "ประโยค Passive",
    en: "Passive voice",
    icon: "🟢",
    tagline: "ประธานเป็นผู้ถูกกระทำ → ใช้โครงสร้าง be + กริยาช่อง 3",
    ruleTitleTh: "โครงสร้าง Passive: be + กริยาช่อง 3",
    coachLines: [
      "Passive ใช้เมื่อ ประธานเป็นผู้ถูกกระทำ (ไม่ได้เป็นคนทำเอง) เช่น “สะพานถูกสร้าง” โครงสร้างคือ verb to be + กริยาช่อง 3 (past participle)",
      "เลือก be ให้ตรงกับประธานและกาล: ปัจจุบัน is/are · อดีต was/were · ประธานพหูพจน์ใช้ are/were",
      "กริยาช่อง 3 ปกติเติม -ed (open → opened) · แต่ irregular ต้องจำ: build → built, make → made, take → taken, write → written, give → given, sell → sold, steal → stolen, find → found",
    ],
    examples: [
      { en: "The bridge was built in 1932.", th: "was + built (อดีต, เอกพจน์)" },
      { en: "Millions of photos are taken there.", th: "photos พหูพจน์ → are + taken" },
      { en: "English is taught by native speakers.", th: "is + taught (ปัจจุบัน, เอกพจน์)" },
    ],
    exercises: [
      {
        id: "ps-e1",
        difficulty: "easy",
        passageTh: "การดูแลบ้าน",
        passage:
          "This house [BLANK 1] cleaned every week. The windows [BLANK 2] washed on Sundays. The garden [BLANK 3] watered every morning. Last year, the roof [BLANK 4] fixed. Now the whole house [BLANK 5] painted white.",
        blanks: [
          { correctWord: "is", clueTh: "verb to be · house เอกพจน์ ปัจจุบัน → is", prefixLength: 1, explanationThai: "house เอกพจน์ปัจจุบัน → is + cleaned" },
          { correctWord: "are", clueTh: "verb to be · windows พหูพจน์ → are", prefixLength: 2, explanationThai: "windows พหูพจน์ → are + washed" },
          { correctWord: "is", clueTh: "verb to be · garden เอกพจน์ → is", prefixLength: 1, explanationThai: "garden เอกพจน์ → is + watered" },
          { correctWord: "was", clueTh: "verb to be · last year (อดีต) เอกพจน์ → was", prefixLength: 2, explanationThai: "Last year = อดีต, roof เอกพจน์ → was + fixed" },
          { correctWord: "is", clueTh: "verb to be · house เอกพจน์ ปัจจุบัน → is", prefixLength: 1, explanationThai: "house เอกพจน์ปัจจุบัน → is + painted" },
        ],
      },
      {
        id: "ps-e2",
        difficulty: "easy",
        passageTh: "ภาษาอังกฤษทั่วโลก",
        passage:
          "English [BLANK 1] used all over the world. Millions of emails [BLANK 2] sent every day. The rules [BLANK 3] explained in the book. Yesterday, a new word [BLANK 4] added to the dictionary. It [BLANK 5] shared online very quickly.",
        blanks: [
          { correctWord: "is", clueTh: "verb to be · English เอกพจน์ → is", prefixLength: 1, explanationThai: "English เอกพจน์ปัจจุบัน → is + used" },
          { correctWord: "are", clueTh: "verb to be · emails พหูพจน์ → are", prefixLength: 2, explanationThai: "emails พหูพจน์ → are + sent" },
          { correctWord: "are", clueTh: "verb to be · rules พหูพจน์ → are", prefixLength: 2, explanationThai: "rules พหูพจน์ → are + explained" },
          { correctWord: "was", clueTh: "verb to be · yesterday (อดีต) เอกพจน์ → was", prefixLength: 2, explanationThai: "Yesterday = อดีต, a new word เอกพจน์ → was + added" },
          { correctWord: "was", clueTh: "verb to be · It (อดีต) เอกพจน์ → was", prefixLength: 2, explanationThai: "อดีต เอกพจน์ → was + shared" },
        ],
      },
      {
        id: "ps-e3",
        difficulty: "easy",
        passageTh: "ในร้านอาหาร",
        passage:
          "At the restaurant, food [BLANK 1] cooked fresh every day. The tables [BLANK 2] cleaned after each meal. Orders [BLANK 3] taken by friendly waiters. Last week, the kitchen [BLANK 4] painted. Now it [BLANK 5] loved by everyone.",
        blanks: [
          { correctWord: "is", clueTh: "verb to be · food นับไม่ได้ เอกพจน์ → is", prefixLength: 1, explanationThai: "food เอกพจน์ → is + cooked" },
          { correctWord: "are", clueTh: "verb to be · tables พหูพจน์ → are", prefixLength: 2, explanationThai: "tables พหูพจน์ → are + cleaned" },
          { correctWord: "are", clueTh: "verb to be · Orders พหูพจน์ → are", prefixLength: 2, explanationThai: "Orders พหูพจน์ → are + taken" },
          { correctWord: "was", clueTh: "verb to be · last week (อดีต) เอกพจน์ → was", prefixLength: 2, explanationThai: "Last week = อดีต, kitchen เอกพจน์ → was + painted" },
          { correctWord: "is", clueTh: "verb to be · it เอกพจน์ ปัจจุบัน → is", prefixLength: 1, explanationThai: "ปัจจุบัน เอกพจน์ → is + loved" },
        ],
      },
      {
        id: "ps-m1",
        difficulty: "medium",
        passageTh: "หอไอเฟล",
        passage:
          "The Eiffel Tower was [BLANK 1] in 1889. Today, millions of photos [BLANK 2] taken there every year. At night, the tower is [BLANK 3] with thousands of lamps. Long ago, it was almost [BLANK 4] down, but it [BLANK 5] saved by the people of Paris.",
        blanks: [
          { correctWord: "built", clueTh: "กริยาช่อง 3 ของ build · was + ___", prefixLength: 3, explanationThai: "passive อดีต: was + ช่อง 3; build → built" },
          { correctWord: "are", clueTh: "verb to be · photos พหูพจน์ ปัจจุบัน → ___ taken", prefixLength: 2, explanationThai: "millions of photos เป็นพหูพจน์ปัจจุบัน → are + taken" },
          { correctWord: "lit", clueTh: "กริยาช่อง 3 ของ light · is + ___", prefixLength: 1, explanationThai: "passive ปัจจุบัน: is + ช่อง 3; light → lit" },
          { correctWord: "pulled", clueTh: "กริยาช่อง 3 ของ pull · was almost ___ down", prefixLength: 4, explanationThai: "pull เป็น regular → ช่อง 3 = pulled (pull down = รื้อ)" },
          { correctWord: "was", clueTh: "verb to be · it เอกพจน์ อดีต → ___ saved", prefixLength: 2, explanationThai: "passive อดีต เอกพจน์: was + saved" },
        ],
      },
      {
        id: "ps-m2",
        difficulty: "medium",
        passageTh: "โรงเรียนของเรา",
        passage:
          "At our school, English [BLANK 1] taught by native speakers. The exams [BLANK 2] written in English only. Last term, a new library [BLANK 3] opened for students. All the books [BLANK 4] arranged by subject, and free laptops are [BLANK 5] to every student.",
        blanks: [
          { correctWord: "is", clueTh: "verb to be · English เอกพจน์ ปัจจุบัน → ___ taught", prefixLength: 1, explanationThai: "English เอกพจน์ปัจจุบัน → is + taught" },
          { correctWord: "are", clueTh: "verb to be · exams พหูพจน์ → ___ written", prefixLength: 2, explanationThai: "the exams พหูพจน์ปัจจุบัน → are + written" },
          { correctWord: "was", clueTh: "verb to be · a library เอกพจน์ อดีต → ___ opened", prefixLength: 2, explanationThai: "Last term = อดีต, library เอกพจน์ → was + opened" },
          { correctWord: "are", clueTh: "verb to be · books พหูพจน์ → ___ arranged", prefixLength: 2, explanationThai: "All the books พหูพจน์ปัจจุบัน → are + arranged" },
          { correctWord: "given", clueTh: "กริยาช่อง 3 ของ give · are ___ to every student", prefixLength: 2, explanationThai: "passive: are + ช่อง 3; give → given" },
        ],
      },
      {
        id: "ps-m3",
        difficulty: "medium",
        passageTh: "ช็อกโกแลตทำมาจากอะไร",
        passage:
          "Chocolate [BLANK 1] made from cacao beans. First, the beans [BLANK 2] dried in the sun. Then they are [BLANK 3] and ground into powder. Sugar and milk [BLANK 4] added to make it sweet. Finally, the chocolate is [BLANK 5] in shops around the world.",
        blanks: [
          { correctWord: "is", clueTh: "verb to be · Chocolate เอกพจน์ ปัจจุบัน → ___ made", prefixLength: 1, explanationThai: "Chocolate เอกพจน์ปัจจุบัน → is + made" },
          { correctWord: "are", clueTh: "verb to be · the beans พหูพจน์ → ___ dried", prefixLength: 2, explanationThai: "the beans พหูพจน์ → are + dried" },
          { correctWord: "roasted", clueTh: "กริยาช่อง 3 ของ roast · are ___ and ground", prefixLength: 5, explanationThai: "roast เป็น regular → ช่อง 3 = roasted" },
          { correctWord: "are", clueTh: "verb to be · Sugar and milk → ___ added", prefixLength: 2, explanationThai: "Sugar and milk เป็นพหูพจน์ → are + added" },
          { correctWord: "sold", clueTh: "กริยาช่อง 3 ของ sell · is ___ in shops", prefixLength: 2, explanationThai: "passive: is + ช่อง 3; sell → sold" },
        ],
      },
      {
        id: "ps-m4",
        difficulty: "medium",
        passageTh: "สนามกีฬาแห่งใหม่",
        passage:
          "The new stadium [BLANK 1] designed by a famous architect. It [BLANK 2] finished last year. Big concerts are [BLANK 3] there every month. The seats [BLANK 4] cleaned after each event, and the tickets are [BLANK 5] online.",
        blanks: [
          { correctWord: "was", clueTh: "verb to be · stadium เอกพจน์ อดีต → ___ designed", prefixLength: 2, explanationThai: "passive อดีต เอกพจน์: was + designed" },
          { correctWord: "was", clueTh: "verb to be · It เอกพจน์ · last year → ___ finished", prefixLength: 2, explanationThai: "last year = อดีต, It เอกพจน์ → was + finished" },
          { correctWord: "held", clueTh: "กริยาช่อง 3 ของ hold · are ___ there", prefixLength: 2, explanationThai: "passive: are + ช่อง 3; hold → held" },
          { correctWord: "are", clueTh: "verb to be · The seats พหูพจน์ → ___ cleaned", prefixLength: 2, explanationThai: "The seats พหูพจน์ปัจจุบัน → are + cleaned" },
          { correctWord: "sold", clueTh: "กริยาช่อง 3 ของ sell · are ___ online", prefixLength: 2, explanationThai: "passive: are + ช่อง 3; sell → sold" },
        ],
      },
      {
        id: "ps-h1",
        difficulty: "hard",
        passageTh: "วัดเก่าแก่",
        passage:
          "The old temple [BLANK 1] visited by many tourists today. It [BLANK 2] built more than 500 years ago. Its walls [BLANK 3] made of stone. Recently, some statues [BLANK 4] stolen, but they [BLANK 5] found by the police last month.",
        blanks: [
          { correctWord: "is", clueTh: "verb to be · temple เอกพจน์ ปัจจุบัน (today) → is", prefixLength: 1, explanationThai: "ปัจจุบัน เอกพจน์ → is + visited" },
          { correctWord: "was", clueTh: "verb to be · It เอกพจน์ อดีต (500 years ago) → was", prefixLength: 2, explanationThai: "อดีต เอกพจน์ → was + built" },
          { correctWord: "are", clueTh: "verb to be · walls พหูพจน์ → are", prefixLength: 2, explanationThai: "walls พหูพจน์ → are + made" },
          { correctWord: "were", clueTh: "verb to be · statues พหูพจน์ อดีต → were (steal → stolen)", prefixLength: 2, explanationThai: "statues พหูพจน์ อดีต → were + stolen (steal → stolen)" },
          { correctWord: "were", clueTh: "verb to be · they พหูพจน์ อดีต → were (find → found)", prefixLength: 2, explanationThai: "they อดีต → were + found (find → found)" },
        ],
      },
      {
        id: "ps-h2",
        difficulty: "hard",
        passageTh: "เทศกาลประจำปี",
        passage:
          "Every year, a big festival [BLANK 1] held in our city. Thousands of lights [BLANK 2] hung in the streets. Last year, a famous singer [BLANK 3] invited. Her songs [BLANK 4] sung by everyone. The event [BLANK 5] shown on national TV.",
        blanks: [
          { correctWord: "is", clueTh: "verb to be · festival เอกพจน์ ปัจจุบัน → is (hold → held)", prefixLength: 1, explanationThai: "ปัจจุบัน เอกพจน์ → is + held (hold → held)" },
          { correctWord: "are", clueTh: "verb to be · lights พหูพจน์ → are (hang → hung)", prefixLength: 2, explanationThai: "lights พหูพจน์ → are + hung (hang → hung)" },
          { correctWord: "was", clueTh: "verb to be · a singer เอกพจน์ อดีต → was", prefixLength: 2, explanationThai: "Last year = อดีต, singer เอกพจน์ → was + invited" },
          { correctWord: "were", clueTh: "verb to be · songs พหูพจน์ อดีต → were (sing → sung)", prefixLength: 2, explanationThai: "songs พหูพจน์ อดีต → were + sung (sing → sung)" },
          { correctWord: "was", clueTh: "verb to be · event เอกพจน์ อดีต → was (show → shown)", prefixLength: 2, explanationThai: "อดีต เอกพจน์ → was + shown (show → shown)" },
        ],
      },
      {
        id: "ps-h3",
        difficulty: "hard",
        passageTh: "ในโรงงาน",
        passage:
          "In factories, cars [BLANK 1] made by robots and people together. Each car [BLANK 2] checked before it leaves. In the past, everything [BLANK 3] done by hand. Many workers [BLANK 4] needed then. Today, the work [BLANK 5] finished much faster.",
        blanks: [
          { correctWord: "are", clueTh: "verb to be · cars พหูพจน์ → are", prefixLength: 2, explanationThai: "cars พหูพจน์ → are + made" },
          { correctWord: "is", clueTh: "verb to be · Each car เอกพจน์ → is", prefixLength: 1, explanationThai: "Each car เอกพจน์ → is + checked" },
          { correctWord: "was", clueTh: "verb to be · everything เอกพจน์ อดีต → was", prefixLength: 2, explanationThai: "everything เอกพจน์ อดีต → was + done (do → done)" },
          { correctWord: "were", clueTh: "verb to be · workers พหูพจน์ อดีต → were", prefixLength: 2, explanationThai: "workers พหูพจน์ อดีต → were + needed" },
          { correctWord: "is", clueTh: "verb to be · work นับไม่ได้ เอกพจน์ ปัจจุบัน → is", prefixLength: 1, explanationThai: "work นับไม่ได้ เอกพจน์ ปัจจุบัน → is + finished" },
        ],
      },
    ],
  },

  // ==================================================================== 4. ADVERBS
  {
    id: "adverbs",
    th: "คำวิเศษณ์ (Adverb)",
    en: "Adverbs",
    icon: "🟠",
    tagline: "สร้าง adverb ด้วย -ly และวางให้ถูก (หน้า/หลังกริยา หรือท้ายประโยค)",
    ruleTitleTh: "การสร้างและวางตำแหน่ง Adverb",
    coachLines: [
      "Adverb ขยายกริยา (บอกว่าทำ “อย่างไร”) ส่วนใหญ่สร้างจาก adjective + -ly เช่น careful → carefully · พยัญชนะ + y → -ily (happy → happily) · ลงท้าย -le → -ly (simple → simply) · ลงท้าย -ic → -ically (basic → basically)",
      "รูปพิเศษต้องจำ: good → well · และบางคำเป็น adverb รูปเดิม ไม่เติม -ly เช่น hard, fast (ระวัง hardly แปลว่า “แทบไม่”)",
      "ตำแหน่ง: adverb บอกลักษณะ (manner) มักวาง หลังกริยา/กรรม หรือท้ายประโยค · แต่ adverb บอกความถี่ (always, often, never) วาง หน้ากริยาแท้ และ หลัง verb to be (is/are)",
    ],
    examples: [
      { en: "She drives carefully.", th: "careful → carefully วางหลังกริยา drives" },
      { en: "He always eats breakfast.", th: "always วางหน้ากริยาแท้ eats" },
      { en: "He speaks English well.", th: "good → well (รูปพิเศษ)" },
    ],
    exercises: [
      {
        id: "ad-e1",
        difficulty: "easy",
        passageTh: "นีน่านักเรียนดี",
        passage:
          "Nina is a good student. She writes [BLANK 1] and reads [BLANK 2]. In class, she speaks [BLANK 3] and answers [BLANK 4]. Her teacher smiles [BLANK 5] at her.",
        blanks: [
          { correctWord: "neatly", clueTh: "จาก adj neat → adverb เติม -ly", prefixLength: 4, explanationThai: "neat + ly = neatly" },
          { correctWord: "slowly", clueTh: "จาก adj slow → adverb เติม -ly", prefixLength: 4, explanationThai: "slow + ly = slowly" },
          { correctWord: "clearly", clueTh: "จาก adj clear → adverb เติม -ly", prefixLength: 5, explanationThai: "clear + ly = clearly" },
          { correctWord: "correctly", clueTh: "จาก adj correct → adverb เติม -ly", prefixLength: 7, explanationThai: "correct + ly = correctly" },
          { correctWord: "kindly", clueTh: "จาก adj kind → adverb เติม -ly", prefixLength: 4, explanationThai: "kind + ly = kindly" },
        ],
      },
      {
        id: "ad-e2",
        difficulty: "easy",
        passageTh: "การขับรถ",
        passage:
          "The car moved [BLANK 1]. The driver looked [BLANK 2] at the road. He turned the wheel [BLANK 3]. He stopped [BLANK 4] at the red light. Then he drove away [BLANK 5].",
        blanks: [
          { correctWord: "slowly", clueTh: "จาก adj slow → adverb เติม -ly", prefixLength: 4, explanationThai: "slow + ly = slowly" },
          { correctWord: "carefully", clueTh: "จาก adj careful → adverb เติม -ly", prefixLength: 7, explanationThai: "careful + ly = carefully" },
          { correctWord: "quickly", clueTh: "จาก adj quick → adverb เติม -ly", prefixLength: 5, explanationThai: "quick + ly = quickly" },
          { correctWord: "suddenly", clueTh: "จาก adj sudden → adverb เติม -ly", prefixLength: 6, explanationThai: "sudden + ly = suddenly" },
          { correctWord: "safely", clueTh: "จาก adj safe → adverb เติม -ly", prefixLength: 4, explanationThai: "safe + ly = safely" },
        ],
      },
      {
        id: "ad-e3",
        difficulty: "easy",
        passageTh: "วันแข่งขัน",
        passage:
          "The team played [BLANK 1] and won the game. The fans cheered [BLANK 2]. The players ran [BLANK 3] across the field. They shook hands [BLANK 4]. Everyone celebrated [BLANK 5].",
        blanks: [
          { correctWord: "perfectly", clueTh: "จาก adj perfect → adverb เติม -ly", prefixLength: 7, explanationThai: "perfect + ly = perfectly" },
          { correctWord: "loudly", clueTh: "จาก adj loud → adverb เติม -ly", prefixLength: 4, explanationThai: "loud + ly = loudly" },
          { correctWord: "quickly", clueTh: "จาก adj quick → adverb เติม -ly", prefixLength: 5, explanationThai: "quick + ly = quickly" },
          { correctWord: "politely", clueTh: "จาก adj polite → adverb เติม -ly", prefixLength: 6, explanationThai: "polite + ly = politely" },
          { correctWord: "warmly", clueTh: "จาก adj warm → adverb เติม -ly", prefixLength: 4, explanationThai: "warm + ly = warmly" },
        ],
      },
      {
        id: "ad-m1",
        difficulty: "medium",
        passageTh: "พลอยตั้งใจเรียนภาษาอังกฤษ",
        passage:
          "Ploy is a careful person. She always drives very [BLANK 1]. She speaks English [BLANK 2] because she practices every day. When the teacher explains, she listens [BLANK 3]. In exams, she reads each question [BLANK 4] and answers [BLANK 5].",
        blanks: [
          { correctWord: "carefully", clueTh: "จาก adj careful → adverb เติม -ly", prefixLength: 7, explanationThai: "careful + ly = carefully (วางหลังกริยา drives)" },
          { correctWord: "well", clueTh: "adverb ของ good (รูปพิเศษ)", prefixLength: 2, explanationThai: "good มี adverb รูปพิเศษ = well (speak well = พูดได้ดี)" },
          { correctWord: "quietly", clueTh: "จาก adj quiet → adverb เติม -ly", prefixLength: 5, explanationThai: "quiet + ly = quietly" },
          { correctWord: "slowly", clueTh: "จาก adj slow → adverb เติม -ly", prefixLength: 4, explanationThai: "slow + ly = slowly (วางหลังกรรม question)" },
          { correctWord: "correctly", clueTh: "จาก adj correct → adverb เติม -ly", prefixLength: 7, explanationThai: "correct + ly = correctly (วางท้ายประโยค)" },
        ],
      },
      {
        id: "ad-m2",
        difficulty: "medium",
        passageTh: "พี่ชายที่รักสุขภาพ (adverb บอกความถี่)",
        passage:
          "My brother is very healthy. He [BLANK 1] exercises in the morning and never misses a day. He is [BLANK 2] tired because he sleeps well. He [BLANK 3] eats vegetables and rarely eats junk food. On weekends, he [BLANK 4] goes running, and he [BLANK 5] feels great afterwards.",
        blanks: [
          { correctWord: "always", clueTh: "adverb ความถี่ “เสมอ” · วางหน้ากริยาแท้ exercises", prefixLength: 5, explanationThai: "always วางหน้ากริยาแท้ → always exercises" },
          { correctWord: "rarely", clueTh: "adverb ความถี่ “นานๆ ครั้ง” · วางหลัง is", prefixLength: 4, explanationThai: "adverb ความถี่วางหลัง verb to be → is rarely tired" },
          { correctWord: "often", clueTh: "adverb ความถี่ “บ่อยๆ” · วางหน้ากริยาแท้ eats", prefixLength: 3, explanationThai: "often วางหน้ากริยาแท้ → often eats" },
          { correctWord: "usually", clueTh: "adverb ความถี่ “ปกติแล้ว” · วางหน้ากริยา goes", prefixLength: 5, explanationThai: "usually วางหน้ากริยาแท้ → usually goes" },
          { correctWord: "sometimes", clueTh: "adverb ความถี่ “บางครั้ง” · วางหน้ากริยา feels", prefixLength: 8, explanationThai: "sometimes วางหน้ากริยาแท้ → sometimes feels" },
        ],
      },
      {
        id: "ad-m3",
        difficulty: "medium",
        passageTh: "เด็กๆ เล่นในสวน",
        passage:
          "The children played [BLANK 1] in the garden. They laughed [BLANK 2] and ran [BLANK 3] around the trees. Their mother watched them [BLANK 4]. When it got dark, they walked home [BLANK 5].",
        blanks: [
          { correctWord: "happily", clueTh: "จาก adj happy · พยัญชนะ + y → -ily", prefixLength: 4, explanationThai: "happy ลงท้ายพยัญชนะ + y → เปลี่ยนเป็น -ily = happily" },
          { correctWord: "loudly", clueTh: "จาก adj loud → adverb เติม -ly", prefixLength: 4, explanationThai: "loud + ly = loudly" },
          { correctWord: "quickly", clueTh: "จาก adj quick → adverb เติม -ly", prefixLength: 5, explanationThai: "quick + ly = quickly" },
          { correctWord: "proudly", clueTh: "จาก adj proud → adverb เติม -ly", prefixLength: 5, explanationThai: "proud + ly = proudly (วางหลังกรรม them)" },
          { correctWord: "quietly", clueTh: "จาก adj quiet → adverb เติม -ly", prefixLength: 5, explanationThai: "quiet + ly = quietly (วางท้ายประโยค)" },
        ],
      },
      {
        id: "ad-m4",
        difficulty: "medium",
        passageTh: "พลอยวาดรูปเก่ง",
        passage:
          "Ploy draws [BLANK 1] and paints [BLANK 2]. She [BLANK 3] finishes early. She works [BLANK 4] on every project. Her teacher [BLANK 5] praises her.",
        blanks: [
          { correctWord: "beautifully", clueTh: "จาก adj beautiful → adverb เติม -ly", prefixLength: 9, explanationThai: "beautiful + ly = beautifully" },
          { correctWord: "happily", clueTh: "จาก adj happy · พยัญชนะ + y → -ily", prefixLength: 4, explanationThai: "happy → happily (y → ily)" },
          { correctWord: "usually", clueTh: "adverb ความถี่ · วางหน้ากริยา finishes", prefixLength: 5, explanationThai: "usually วางหน้ากริยาแท้ → usually finishes" },
          { correctWord: "busily", clueTh: "จาก adj busy · พยัญชนะ + y → -ily", prefixLength: 3, explanationThai: "busy → busily (y → ily)" },
          { correctWord: "often", clueTh: "adverb ความถี่ · วางหน้ากริยา praises", prefixLength: 3, explanationThai: "often วางหน้ากริยาแท้ → often praises" },
        ],
      },
      {
        id: "ad-h1",
        difficulty: "hard",
        passageTh: "สมชายขยันเรียน (adverb รูปพิเศษ)",
        passage:
          "Somchai studies really [BLANK 1] for his tests. He did [BLANK 2] on the last exam. He speaks English [BLANK 3] now. He also types very [BLANK 4] and finishes his work [BLANK 5].",
        blanks: [
          { correctWord: "hard", clueTh: "adverb รูปเดียวกับ adjective (อย่าใช้ hardly)", prefixLength: 3, explanationThai: "hard เป็น adverb รูปเดิม = hard (study hard = เรียนหนัก); hardly แปลว่า “แทบไม่”" },
          { correctWord: "well", clueTh: "adverb ของ good (รูปพิเศษ)", prefixLength: 2, explanationThai: "good → well (do well = ทำได้ดี)" },
          { correctWord: "fluently", clueTh: "จาก adj fluent → adverb เติม -ly", prefixLength: 6, explanationThai: "fluent + ly = fluently" },
          { correctWord: "fast", clueTh: "adverb รูปเดียวกับ adjective (ไม่มี fastly)", prefixLength: 3, explanationThai: "fast เป็น adverb รูปเดิม = fast (ไม่มีคำว่า fastly)" },
          { correctWord: "quickly", clueTh: "จาก adj quick → adverb เติม -ly", prefixLength: 5, explanationThai: "quick + ly = quickly" },
        ],
      },
      {
        id: "ad-h2",
        difficulty: "hard",
        passageTh: "อาจารย์สอนเก่ง (การสะกด adverb แบบพิเศษ)",
        passage:
          "The professor explains hard ideas [BLANK 1]. His students follow him [BLANK 2]. They solve problems [BLANK 3]. In exams, they answer [BLANK 4] without thinking too long. They all do [BLANK 5].",
        blanks: [
          { correctWord: "simply", clueTh: "จาก adj simple · ลงท้าย -le → -ly", prefixLength: 4, explanationThai: "simple → simply (ตัด e แล้ว le → ly)" },
          { correctWord: "easily", clueTh: "จาก adj easy · พยัญชนะ + y → -ily", prefixLength: 3, explanationThai: "easy → easily (y → ily)" },
          { correctWord: "logically", clueTh: "จาก adj logical → adverb เติม -ly", prefixLength: 7, explanationThai: "logical + ly = logically" },
          { correctWord: "automatically", clueTh: "จาก adj automatic · ลงท้าย -ic → -ically", prefixLength: 11, explanationThai: "automatic → automatically (ic → ically)" },
          { correctWord: "well", clueTh: "adverb ของ good (รูปพิเศษ)", prefixLength: 2, explanationThai: "good → well (do well = ทำได้ดี)" },
        ],
      },
      {
        id: "ad-h3",
        difficulty: "hard",
        passageTh: "ตำแหน่งของ adverb",
        passage:
          "She is [BLANK 1] happy with her results. She [BLANK 2] complains about her work. He works [BLANK 3], so he finishes early. Please speak [BLANK 4]; the baby is asleep. They [BLANK 5] arrive on time.",
        blanks: [
          { correctWord: "always", clueTh: "adverb ความถี่ · วางหลัง verb to be (is)", prefixLength: 5, explanationThai: "adverb ความถี่วางหลัง verb to be → is always happy" },
          { correctWord: "never", clueTh: "adverb ความถี่ · วางหน้ากริยาแท้ complains", prefixLength: 3, explanationThai: "never วางหน้ากริยาแท้ → never complains" },
          { correctWord: "fast", clueTh: "adverb รูปเดียวกับ adjective (ไม่มี fastly)", prefixLength: 3, explanationThai: "fast เป็น adverb รูปเดิม = fast" },
          { correctWord: "quietly", clueTh: "จาก adj quiet → adverb เติม -ly (บอกลักษณะ วางหลังกริยา)", prefixLength: 5, explanationThai: "quiet + ly = quietly (speak quietly = พูดเบาๆ)" },
          { correctWord: "usually", clueTh: "adverb ความถี่ · วางหน้ากริยาแท้ arrive", prefixLength: 5, explanationThai: "usually วางหน้ากริยาแท้ → usually arrive" },
        ],
      },
    ],
  },

  // =============================================================== 5. TRANSITIONS
  {
    id: "transitions",
    th: "คำเชื่อม (Transitions)",
    en: "Transitional words",
    icon: "🔗",
    tagline: "คำเชื่อมต้นประโยค เช่น However, S+V · เลือกให้ตรงความหมาย",
    ruleTitleTh: "คำเชื่อมประโยค (Transition Words)",
    coachLines: [
      "คำเชื่อมช่วยร้อยความคิดสองประโยคเข้าด้วยกัน เมื่อวางต้นประโยคมักตามด้วย จุลภาค (comma) แล้วขึ้นประโยคใหม่: However, S + V",
      "จำตามหน้าที่: ขัดแย้ง → However / Nevertheless / Nonetheless (แต่/ถึงอย่างนั้น) · ผลลัพธ์ → Therefore / Consequently (ดังนั้น) · เพิ่มข้อมูล → Moreover / Furthermore / Besides (ยิ่งไปกว่านั้น)",
      "ลำดับ → Firstly, Secondly, Finally · ยกตัวอย่าง → For example / For instance · เงื่อนไข/ผลตรงข้าม → Otherwise (มิฉะนั้น) · เปรียบเทียบ → Similarly / Likewise · สรุป → Overall (โดยรวมแล้ว)",
    ],
    examples: [
      { en: "It was raining. However, we went out.", th: "However = แต่ (ขัดแย้ง) + comma" },
      { en: "He studied hard. Therefore, he passed.", th: "Therefore = ดังนั้น (ผลลัพธ์)" },
      { en: "The food is cheap. Moreover, it is tasty.", th: "Moreover = ยิ่งไปกว่านั้น (เพิ่มข้อมูล)" },
    ],
    exercises: [
      {
        id: "tr-e1",
        difficulty: "easy",
        passageTh: "วันที่เหนื่อยหลังเลิกงาน",
        passage:
          "I was tired after work. [BLANK 1], I still cooked dinner. I finished it. [BLANK 2], I washed the dishes. I was hungry. [BLANK 3], I ate quickly. The food was simple. [BLANK 4], it was tasty. [BLANK 5], I went to bed early.",
        blanks: [
          { correctWord: "However", clueTh: "ขัดแย้งกับประโยคก่อน (แต่)", prefixLength: 3, explanationThai: "เหนื่อยแต่ยังทำ = ขัดแย้ง → However," },
          { correctWord: "Then", clueTh: "ลำดับถัดมา (จากนั้น)", prefixLength: 3, explanationThai: "บอกลำดับเหตุการณ์ต่อมา → Then," },
          { correctWord: "Therefore", clueTh: "ผลลัพธ์ (ดังนั้น)", prefixLength: 5, explanationThai: "หิว → ผลคือกินเร็ว → Therefore," },
          { correctWord: "Still", clueTh: "ถึงอย่างนั้น (แต่ก็ยัง)", prefixLength: 3, explanationThai: "อาหารง่ายๆ แต่ก็อร่อย = ขัดแย้งเบาๆ → Still," },
          { correctWord: "Finally", clueTh: "สุดท้าย (ในที่สุด)", prefixLength: 5, explanationThai: "ปิดท้ายเรื่อง → Finally," },
        ],
      },
      {
        id: "tr-e2",
        difficulty: "easy",
        passageTh: "ตั้งใจเรียนภาษาอังกฤษ",
        passage:
          "I want to learn English. [BLANK 1], I study every day. Reading helps a lot. [BLANK 2], watching movies helps too. Some days are hard. [BLANK 3], I never give up. My goal is clear. [BLANK 4], I keep going. [BLANK 5], I will succeed.",
        blanks: [
          { correctWord: "Therefore", clueTh: "ผลลัพธ์ (ดังนั้น)", prefixLength: 5, explanationThai: "อยากเรียน → ผลคือเรียนทุกวัน → Therefore," },
          { correctWord: "Also", clueTh: "เพิ่มเติม (นอกจากนี้/ด้วย)", prefixLength: 3, explanationThai: "เพิ่มวิธีอีกอย่าง → Also," },
          { correctWord: "However", clueTh: "ขัดแย้ง (แต่)", prefixLength: 3, explanationThai: "ยากแต่ไม่ยอมแพ้ = ขัดแย้ง → However," },
          { correctWord: "Then", clueTh: "ลำดับถัดมา (จากนั้น)", prefixLength: 3, explanationThai: "บอกลำดับต่อมา → Then," },
          { correctWord: "Finally", clueTh: "สุดท้าย (ในที่สุด)", prefixLength: 5, explanationThai: "สรุปผลสุดท้าย → Finally," },
        ],
      },
      {
        id: "tr-e3",
        difficulty: "easy",
        passageTh: "สวนของโรงเรียน",
        passage:
          "Our school has a garden. For [BLANK 1], students grow vegetables there. It teaches them a lot. [BLANK 2], it is good exercise. Some students were shy at first. [BLANK 3], now they love it. The project is popular. [BLANK 4], the whole town knows about it. [BLANK 5], everyone is proud.",
        blanks: [
          { correctWord: "example", clueTh: "For ___ = ยกตัวอย่าง", prefixLength: 4, explanationThai: "For example = ตัวอย่างเช่น" },
          { correctWord: "Also", clueTh: "เพิ่มเติม (นอกจากนี้)", prefixLength: 3, explanationThai: "เพิ่มข้อดีอีกอย่าง → Also," },
          { correctWord: "However", clueTh: "ขัดแย้ง (แต่)", prefixLength: 3, explanationThai: "เคยเขินแต่ตอนนี้ชอบ = ขัดแย้ง → However," },
          { correctWord: "Therefore", clueTh: "ผลลัพธ์ (ดังนั้น)", prefixLength: 5, explanationThai: "โปรเจกต์ดัง → ผลคือคนทั้งเมืองรู้ → Therefore," },
          { correctWord: "Finally", clueTh: "สุดท้าย (ในที่สุด)", prefixLength: 5, explanationThai: "ปิดท้าย → Finally," },
        ],
      },
      {
        id: "tr-m1",
        difficulty: "medium",
        passageTh: "สะท้อนผลการสอบและวางแผนใหม่",
        passage:
          "I studied very hard for the test. [BLANK 1], I still made a few mistakes. The questions were long. [BLANK 2], I ran out of time. I need a better plan. [BLANK 3], I will start studying earlier next time. [BLANK 4], I will practice every single day. [BLANK 5], my score should improve a lot.",
        blanks: [
          { correctWord: "However", clueTh: "ขัดแย้งกับประโยคก่อน (แต่/อย่างไรก็ตาม)", prefixLength: 3, explanationThai: "ตั้งใจอ่านแต่ยังผิด = ขัดแย้ง → However, (ตามด้วย comma)" },
          { correctWord: "Moreover", clueTh: "เพิ่มปัญหาอีกข้อ (ยิ่งไปกว่านั้น)", prefixLength: 4, explanationThai: "เพิ่มข้อมูล/ปัญหาอีกอย่าง → Moreover," },
          { correctWord: "Therefore", clueTh: "บอกผลลัพธ์/สิ่งที่จะทำ (ดังนั้น)", prefixLength: 5, explanationThai: "ต้องมีแผน → ผลคือจะเริ่มเร็วขึ้น → Therefore," },
          { correctWord: "Furthermore", clueTh: "เพิ่มเติมอีกข้อ (นอกจากนี้)", prefixLength: 7, explanationThai: "เพิ่มสิ่งที่จะทำอีกอย่าง → Furthermore," },
          { correctWord: "Finally", clueTh: "สรุป/สิ่งสุดท้าย (ในที่สุด)", prefixLength: 5, explanationThai: "ปิดท้ายผลลัพธ์ → Finally," },
        ],
      },
      {
        id: "tr-m2",
        difficulty: "medium",
        passageTh: "ข้อดีและข้อเสียของการเรียนออนไลน์",
        passage:
          "Online learning has many benefits. [BLANK 1], students can study from home. [BLANK 2], they can watch the lessons again. [BLANK 3], online classes also have problems. For [BLANK 4], the internet is sometimes slow. [BLANK 5], learning online can still save a lot of time and money.",
        blanks: [
          { correctWord: "Firstly", clueTh: "ลำดับข้อแรก (ประการแรก)", prefixLength: 5, explanationThai: "เริ่มไล่ข้อดีข้อแรก → Firstly," },
          { correctWord: "Secondly", clueTh: "ลำดับข้อสอง (ประการที่สอง)", prefixLength: 6, explanationThai: "ข้อดีข้อถัดมา → Secondly," },
          { correctWord: "However", clueTh: "เปลี่ยนเป็นข้อเสีย (แต่/อย่างไรก็ตาม)", prefixLength: 3, explanationThai: "หันมาพูดถึงปัญหา = ขัดแย้ง → However," },
          { correctWord: "example", clueTh: "For ___ = ยกตัวอย่าง", prefixLength: 4, explanationThai: "For example = ตัวอย่างเช่น (ตามด้วยตัวอย่าง)" },
          { correctWord: "Overall", clueTh: "สรุปโดยรวม (โดยรวมแล้ว)", prefixLength: 4, explanationThai: "สรุปทั้งหมด → Overall," },
        ],
      },
      {
        id: "tr-m3",
        difficulty: "medium",
        passageTh: "การออกกำลังกายดีต่อสุขภาพ",
        passage:
          "Exercise is very good for your health. [BLANK 1], it makes your heart stronger. [BLANK 2], it helps you sleep better at night. Some people say they have no time. [BLANK 3], even ten minutes a day can help. [BLANK 4], you do not need a gym to stay fit. [BLANK 5], the best time to start is today.",
        blanks: [
          { correctWord: "Firstly", clueTh: "ลำดับข้อแรก (ประการแรก)", prefixLength: 5, explanationThai: "เริ่มไล่เหตุผลข้อแรก → Firstly," },
          { correctWord: "Moreover", clueTh: "เพิ่มข้อดีอีกข้อ (ยิ่งไปกว่านั้น)", prefixLength: 4, explanationThai: "เพิ่มประโยชน์อีกอย่าง → Moreover," },
          { correctWord: "However", clueTh: "ขัดแย้งกับข้ออ้าง (แต่/อย่างไรก็ตาม)", prefixLength: 3, explanationThai: "แย้งเรื่อง “ไม่มีเวลา” → However," },
          { correctWord: "Besides", clueTh: "เพิ่มเติมอีกข้อ (นอกจากนี้)", prefixLength: 3, explanationThai: "เพิ่มเหตุผลอีกอย่าง → Besides," },
          { correctWord: "Therefore", clueTh: "สรุปผลลัพธ์ (ดังนั้น)", prefixLength: 5, explanationThai: "สรุปว่าควรเริ่มวันนี้ → Therefore," },
        ],
      },
      {
        id: "tr-m4",
        difficulty: "medium",
        passageTh: "ปัญหารถติดในเมือง",
        passage:
          "Our city has a big traffic problem. [BLANK 1], the air is very polluted. The government wants to help. [BLANK 2], it built a new train line. [BLANK 3], it added more buses. [BLANK 4], many people still drive their own cars. [BLANK 5], we must all work together to solve this.",
        blanks: [
          { correctWord: "Moreover", clueTh: "เพิ่มปัญหาอีกข้อ (ยิ่งไปกว่านั้น)", prefixLength: 4, explanationThai: "เพิ่มปัญหาเรื่องอากาศ → Moreover," },
          { correctWord: "Firstly", clueTh: "ลำดับสิ่งที่ทำข้อแรก (ประการแรก)", prefixLength: 5, explanationThai: "ไล่มาตรการข้อแรก → Firstly," },
          { correctWord: "Secondly", clueTh: "ลำดับข้อสอง (ประการที่สอง)", prefixLength: 6, explanationThai: "มาตรการข้อถัดมา → Secondly," },
          { correctWord: "However", clueTh: "ขัดแย้ง (แต่/อย่างไรก็ตาม)", prefixLength: 3, explanationThai: "แม้จะแก้แล้วแต่คนยังขับรถ = ขัดแย้ง → However," },
          { correctWord: "Therefore", clueTh: "สรุปผลลัพธ์ (ดังนั้น)", prefixLength: 5, explanationThai: "สรุปว่าต้องร่วมมือกัน → Therefore," },
        ],
      },
      {
        id: "tr-h1",
        difficulty: "hard",
        passageTh: "ทีมที่ไม่ยอมแพ้",
        passage:
          "The weather was terrible. [BLANK 1], the team kept playing. They trained very hard. [BLANK 2], they won the championship. A win was never certain. [BLANK 3], they believed in themselves. Some players were injured. [BLANK 4], they refused to give up. [BLANK 5], their coach felt very proud.",
        blanks: [
          { correctWord: "Nevertheless", clueTh: "ขัดแย้งแบบหนัก (ถึงอย่างนั้นก็ตาม)", prefixLength: 5, explanationThai: "อากาศแย่แต่ก็ยังเล่น = ขัดแย้งเน้นๆ → Nevertheless," },
          { correctWord: "Consequently", clueTh: "ผลที่ตามมา (เป็นผลให้/ดังนั้น)", prefixLength: 3, explanationThai: "ซ้อมหนัก → ผลคือชนะ → Consequently," },
          { correctWord: "However", clueTh: "ขัดแย้ง (แต่)", prefixLength: 3, explanationThai: "ไม่แน่ว่าจะชนะ แต่ยังเชื่อมั่น = ขัดแย้ง → However," },
          { correctWord: "Nonetheless", clueTh: "ถึงกระนั้นก็ตาม (ขัดแย้ง)", prefixLength: 3, explanationThai: "บาดเจ็บแต่ไม่ยอมแพ้ = ขัดแย้ง → Nonetheless," },
          { correctWord: "Overall", clueTh: "สรุปโดยรวม (โดยรวมแล้ว)", prefixLength: 4, explanationThai: "สรุปทั้งเรื่อง → Overall," },
        ],
      },
      {
        id: "tr-h2",
        difficulty: "hard",
        passageTh: "คำแนะนำการเรียน",
        passage:
          "You should study every day. [BLANK 1], you may forget what you learn. Reading builds vocabulary. [BLANK 2], listening builds your ear. Grammar can be boring. [BLANK 3], it is very important. Practice takes time. [BLANK 4], the results are worth it. [BLANK 5], never stop trying.",
        blanks: [
          { correctWord: "Otherwise", clueTh: "มิฉะนั้น (บอกผลถ้าไม่ทำ)", prefixLength: 5, explanationThai: "ถ้าไม่เรียนทุกวัน มิฉะนั้นจะลืม → Otherwise," },
          { correctWord: "Similarly", clueTh: "ในทำนองเดียวกัน (เปรียบเทียบว่าเหมือนกัน)", prefixLength: 7, explanationThai: "การอ่านช่วย และการฟังก็ช่วยเหมือนกัน → Similarly," },
          { correctWord: "However", clueTh: "ขัดแย้ง (แต่)", prefixLength: 3, explanationThai: "น่าเบื่อแต่สำคัญ = ขัดแย้ง → However," },
          { correctWord: "Nevertheless", clueTh: "ถึงอย่างนั้น (ขัดแย้ง)", prefixLength: 5, explanationThai: "ใช้เวลาแต่ก็คุ้ม = ขัดแย้ง → Nevertheless," },
          { correctWord: "Therefore", clueTh: "สรุปผลลัพธ์ (ดังนั้น)", prefixLength: 5, explanationThai: "สรุปว่าอย่าหยุดพยายาม → Therefore," },
        ],
      },
      {
        id: "tr-h3",
        difficulty: "hard",
        passageTh: "พี่ชายกับฉันต่างกัน",
        passage:
          "My brother loves the city. [BLANK 1], I prefer the countryside. He enjoys crowds and noise. [BLANK 2], I like peace and quiet. We are very different. [BLANK 3], we get along well. He visits me every summer. [BLANK 4], I visit him in winter. [BLANK 5], we always have fun together.",
        blanks: [
          { correctWord: "However", clueTh: "ขัดแย้ง (แต่)", prefixLength: 3, explanationThai: "พี่ชอบเมือง แต่ฉันชอบชนบท = ขัดแย้ง → However," },
          { correctWord: "Meanwhile", clueTh: "ในทางกลับกัน/ขณะเดียวกัน", prefixLength: 4, explanationThai: "เทียบสองฝั่งที่ต่างกัน → Meanwhile," },
          { correctWord: "Nevertheless", clueTh: "ถึงอย่างนั้นก็ตาม (ขัดแย้ง)", prefixLength: 5, explanationThai: "ต่างกันมากแต่ก็เข้ากันได้ = ขัดแย้ง → Nevertheless," },
          { correctWord: "Likewise", clueTh: "เช่นเดียวกัน (เปรียบเทียบว่าทำเหมือนกัน)", prefixLength: 4, explanationThai: "เขามาหาฉัน และฉันก็ไปหาเขาเช่นกัน → Likewise," },
          { correctWord: "Overall", clueTh: "สรุปโดยรวม (โดยรวมแล้ว)", prefixLength: 4, explanationThai: "สรุปทั้งเรื่อง → Overall," },
        ],
      },
    ],
  },
];
