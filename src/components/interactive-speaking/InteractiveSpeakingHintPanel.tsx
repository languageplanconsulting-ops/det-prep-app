"use client";

import Link from "next/link";

/**
 * InteractiveSpeakingHintPanel — course-only ("Fast Track" VIP) resource for the
 * Interactive Speaking ("Listen & Speak") exam. Unlocked for VIP (incl.
 * course-granted Fast Track VIP); everyone else sees a locked teaser.
 *
 * From P'Doy's framework: Direct → Explain → Example → Conclude, vocabulary
 * upgrades, power words, and model answers for the recurring topics.
 */

const FRAMEWORK: { en: string; th: string }[] = [
  { en: "Direct answer", th: "ตอบตรงคำถามทันที 1 ประโยค" },
  { en: "Explain", th: "ขยายความ / ให้เหตุผล" },
  { en: "Provide an example", th: "ยกตัวอย่าง (For example / For instance)" },
  { en: "Conclude", th: "สรุป (Overall / Therefore / In conclusion)" },
];

const UPGRADES: { meaning: string; words: string }[] = [
  { meaning: "สำคัญ (important)", words: "crucial · essential · vital · fundamental — “… is crucial due to / because of + noun”" },
  { meaning: "พัฒนา / เติบโต (develop)", words: "thrive · flourish" },
  { meaning: "ให้ (give)", words: "offer · provide" },
  { meaning: "ทำให้เกิด / เอื้อให้", words: "promote · foster · contribute to · lead to · encourage · allow for (ex. promote diversity · allow for more fluency)" },
  { meaning: "ดั้งเดิม ↔ ทันสมัย", words: "traditional · conventional · old-fashioned  ↔  modern · new" },
];

const POWER_WORDS = [
  "globalization", "societal norms", "gender equality", "competitive edge",
  "repeat buyers", "groundbreaking", "academic performance", "work-life balance",
  "social interactions", "public infrastructure", "carbon footprint", "sustainability",
  "cultural identity", "heritage", "world heritage", "public opinion",
  "cultural exchange", "international cuisines", "e-commerce", "personalized instruction",
];

type Model = { direct: string; explain: string; example: string; conclude: string };
type Topic = { key: string; label: string; question: string; models: Model[] };

const TOPICS: Topic[] = [
  {
    key: "family", label: "👨‍👩‍👧 Family", question: "How have family roles changed in your country?",
    models: [{
      direct: "Family roles have changed significantly in recent years.",
      explain: "This change is due to evolving societal norms and increased gender equality, leading to more shared responsibilities between men and women.",
      example: "For instance, it's now common for both parents to work full-time and share household chores, which wasn't the case a few decades ago.",
      conclude: "Overall, these changes reflect a move towards more balanced and equitable family relationships.",
    }],
  },
  {
    key: "business", label: "💼 Business", question: "What factors contribute to the success of a business?",
    models: [
      { direct: "Innovation is a crucial factor for business success.", explain: "Businesses that innovate tend to stay competitive and meet customer needs.", example: "For example, companies like Tesla constantly introduce groundbreaking technologies.", conclude: "Therefore, innovation is key to maintaining a competitive edge." },
      { direct: "Customer satisfaction is essential for business success.", explain: "Satisfied customers are likely to become repeat buyers and recommend the business to others.", example: "For instance, Amazon's focus on customer service helped it become a global leader.", conclude: "In conclusion, keeping customers happy is fundamental for long-term success." },
    ],
  },
  {
    key: "education", label: "🎓 Education", question: "How can the education system be improved?",
    models: [
      { direct: "The education system can be improved by using more technology.", explain: "Using technology in classrooms can enhance learning experiences and modernize access to information.", example: "For example, online learning platforms have changed how students access educational content.", conclude: "Therefore, the use of technology is vital for education." },
      { direct: "Education can also be improved by increasing the number of teachers.", explain: "Smaller class sizes allow more personalized instruction and better student engagement.", example: "For instance, countries with more teachers often see higher academic performance.", conclude: "Hence, reducing class sizes is crucial for improving educational outcomes." },
    ],
  },
  {
    key: "work", label: "🏠 Work", question: "What are the benefits and drawbacks of working from home?",
    models: [
      { direct: "Working from home offers flexibility but can lead to isolation.", explain: "While remote work allows a better work-life balance, it can also reduce social interactions.", example: "During the pandemic, many people experienced both the benefits and drawbacks of working from home.", conclude: "Thus, remote work requires a balance to be effective." },
      { direct: "Working from home can increase productivity but may cause distractions.", explain: "Employees often focus better without office interruptions but may struggle with household distractions.", example: "For example, parents working from home might have to manage their children's needs during work hours.", conclude: "Overall, managing distractions is key to successful remote work." },
    ],
  },
  {
    key: "hobbies", label: "🎨 Hobbies", question: "Why do people need hobbies?",
    models: [
      { direct: "Hobbies are important for stress relief.", explain: "Engaging in enjoyable activities helps reduce stress and improve mental health.", example: "For instance, people who regularly practise yoga often report lower stress levels.", conclude: "Therefore, hobbies are essential for maintaining mental well-being." },
      { direct: "Hobbies also promote personal growth and learning.", explain: "They allow individuals to develop new skills and pursue interests outside of work.", example: "For example, learning a musical instrument can enhance creativity and cognitive abilities.", conclude: "In conclusion, hobbies contribute to overall personal development." },
    ],
  },
  {
    key: "travel", label: "✈️ Travel", question: "How has air travel changed the way people travel?",
    models: [
      { direct: "Air travel has promoted global travel.", explain: "It makes travel times shorter and distant destinations reachable.", example: "For example, people can now fly from New York to London in just a few hours.", conclude: "Thus, air travel has changed the way we explore the world." },
      { direct: "Air travel has also impacted cultural exchange.", explain: "It facilitates the exchange of ideas and cultures by allowing people to visit and learn from different parts of the world.", example: "For instance, international conferences and events bring together diverse groups of people.", conclude: "Therefore, air travel plays a crucial role in promoting global understanding." },
    ],
  },
  {
    key: "health", label: "🩺 Health", question: "What can governments do to promote healthier lifestyles?",
    models: [
      { direct: "Governments can promote healthier lifestyles through campaigns.", explain: "Campaigns can raise awareness about healthy habits and ways to prevent diseases.", example: "For example, anti-smoking campaigns have significantly reduced smoking rates in many countries.", conclude: "Hence, public health campaigns are effective in encouraging healthy behaviors." },
      { direct: "Governments can also support healthy lifestyles by investing in public infrastructure.", explain: "Building parks, bike lanes, and sports facilities encourages physical activity.", example: "For instance, cities with many bike lanes usually have lower obesity levels.", conclude: "Therefore, investing in infrastructure is essential for promoting public health." },
    ],
  },
  {
    key: "environment", label: "🌱 Environment", question: "How can individuals contribute to environmental protection?",
    models: [
      { direct: "Individuals can contribute to environmental protection by recycling.", explain: "Recycling reduces waste and conserves natural resources.", example: "For example, many communities have recycling programs that help reduce waste.", conclude: "Therefore, recycling is a simple yet effective way to protect the environment." },
      { direct: "Individuals can also help by reducing consumption.", explain: "Using energy-saving appliances and reducing electricity use can lower carbon footprints.", example: "For instance, using LED lights instead of old-fashioned ones can significantly cut energy usage.", conclude: "Thus, energy conservation is vital for sustainability." },
    ],
  },
  {
    key: "globalization", label: "🌍 Globalization", question: "How has globalization affected the food people eat?",
    models: [
      { direct: "Globalization has significantly influenced the types of food people eat.", explain: "It has introduced a wide variety of international cuisines, making diverse food options more readily available.", example: "For example, sushi, a traditional Japanese dish, is now popular in many countries.", conclude: "In conclusion, globalization has broadened our culinary experiences." },
      { direct: "Globalization has also influenced eating habits and food culture.", explain: "People are more open to trying new foods from different cultures.", example: "For instance, the popularity of McDonald's has spread globally.", conclude: "Therefore, globalization has changed food culture and eating habits." },
    ],
  },
  {
    key: "culture", label: "🏛️ Culture", question: "How important is it to preserve traditional cultures?",
    models: [
      { direct: "Preserving traditional cultures is important for cultural identity.", explain: "It helps communities maintain unique characteristics and heritage.", example: "For example, cultural festivals celebrate traditional music, dance, and customs.", conclude: "Thus, preserving traditional cultures is essential for cultural identity." },
      { direct: "Preserving traditional cultures also promotes diversity.", explain: "It ensures that different cultural expressions and practices are kept alive for future generations.", example: "For instance, UNESCO works to protect world heritage sites and cultural practices.", conclude: "In conclusion, cultural preservation fosters diversity and enriches human heritage." },
    ],
  },
  {
    key: "media", label: "📱 Media", question: "What is the impact of social media on society?",
    models: [
      { direct: "Social media has increased the speed of information.", explain: "News and updates can be shared rapidly, reaching a wide audience quickly.", example: "For example, breaking news is often first reported on Twitter before traditional media.", conclude: "Therefore, social media has changed how we receive and share information." },
      { direct: "Social media has also influenced public opinion and behavior.", explain: "Platforms can shape perceptions and drive social movements through their widespread reach.", example: "For instance, social media played a crucial role in movements like Black Lives Matter.", conclude: "In conclusion, social media has a powerful impact on society and public opinion." },
    ],
  },
  {
    key: "ecommerce", label: "🛒 E-commerce", question: "How is online shopping affecting physical stores?",
    models: [
      { direct: "Online shopping provides more convenience.", explain: "It allows people to shop from the comfort of their homes and offers a wide range of products.", example: "For example, platforms like Amazon offer everything from electronics to groceries, delivered to your doorstep.", conclude: "Thus, online shopping has changed the retail experience." },
      { direct: "Online shopping also impacts physical stores negatively.", explain: "With more people shopping online, traditional retail stores face reduced consumers and sales.", example: "For instance, many department stores in Bangkok have closed due to the rise of e-commerce.", conclude: "In conclusion, while convenient, online shopping can be challenging for physical retailers." },
    ],
  },
];

export function InteractiveSpeakingHintPanel({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) {
    return (
      <div className="rounded-2xl border border-[#FFCC00]/60 bg-[#fffaf0] p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">🔒</span>
          <p className="text-sm font-bold text-slate-800">
            สูตรตอบ + คลังคำ + ตัวอย่างคำตอบทุกหัวข้อ — เฉพาะนักเรียนคอร์ส Fast Track (VIP)
          </p>
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-mono text-sm text-slate-800">Direct answer → Explain → Example → Conclude</p>
          <div className="mt-2 select-none space-y-1.5 blur-[5px]" aria-hidden>
            <p className="font-mono text-sm text-slate-700">คำอัปเกรด: crucial · essential · thrive · foster · allow for …</p>
            <p className="text-xs text-slate-500">+ ตัวอย่างคำตอบ 12 หัวข้อ (family · business · education · work · health · environment …)</p>
          </div>
        </div>
        <Link href="/pricing" className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#004AAD] px-4 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90">
          ปลดล็อกด้วย VIP / Fast Track →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#004AAD]/15 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          👑 Fast Track VIP
        </span>
        <p className="text-sm font-bold text-slate-800">สูตรตอบ Listen &amp; Speak จากพี่ดอย</p>
      </div>
      <p className="mt-1.5 text-xs leading-6 text-slate-500">ทุกคำถามตอบด้วยโครงเดียว → ตรง · มีเหตุผล · มีตัวอย่าง · สรุป</p>

      {/* framework scaffold */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {FRAMEWORK.map((f, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{f.en}</p>
              <p className="mt-0.5 text-xs text-slate-500">{f.th}</p>
            </div>
          </div>
        ))}
      </div>

      {/* vocab upgrades */}
      <details className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">⬆️ คำอัปเกรด (synonyms ที่ทำให้ดูเก่งขึ้น)</summary>
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {UPGRADES.map((u) => (
            <div key={u.meaning} className="text-xs">
              <span className="font-bold text-slate-700">{u.meaning}:</span>{" "}
              <span className="font-mono text-slate-600">{u.words}</span>
            </div>
          ))}
        </div>
      </details>

      {/* power words */}
      <details className="mt-2 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">✨ คำที่ใช้บ่อย (power words)</summary>
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-3">
          {POWER_WORDS.map((w) => (
            <span key={w} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-800">{w}</span>
          ))}
        </div>
      </details>

      {/* topics with model answers */}
      <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">ตัวอย่างคำตอบรายหัวข้อ · แตะเพื่อดู</p>
      <div className="space-y-2">
        {TOPICS.map((t) => (
          <details key={t.key} className="overflow-hidden rounded-xl border border-slate-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
              <span>{t.label}</span>
              <span className="text-[11px] font-normal text-slate-400">{t.models.length} ตัวอย่าง</span>
            </summary>
            <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="text-xs italic text-slate-500">“{t.question}”</p>
              {t.models.map((m, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-6">
                  <p><span className="font-bold text-[#004AAD]">Direct:</span> {m.direct}</p>
                  <p className="mt-1"><span className="font-bold text-slate-500">Explain:</span> {m.explain}</p>
                  <p className="mt-1"><span className="font-bold text-slate-500">Example:</span> {m.example}</p>
                  <p className="mt-1"><span className="font-bold text-emerald-600">Conclude:</span> {m.conclude}</p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        💡 พี่ดอย: ฟังคำถาม → ตอบตรง 1 ประโยค → ขยายความ → ยกตัวอย่าง → สรุป · ใส่คำอัปเกรดให้ดูโปร
      </p>
    </div>
  );
}
