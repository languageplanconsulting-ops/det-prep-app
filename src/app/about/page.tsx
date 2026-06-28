import type { Metadata } from "next";
import Link from "next/link";

import { absoluteUrl } from "@/lib/site-metadata";

const storySections: Array<{
  eyebrow: string;
  title: string;
  paragraphs: string[];
  accent?: "blue" | "yellow" | "rose";
}> = [
  {
    eyebrow: "จุดเริ่มต้น",
    title: "จากห้องเรียนสู่แอปฝึกสอบ Duolingo English Test ที่สร้างมาเพื่อเด็กไทย",
    accent: "blue",
    paragraphs: [
      "สวัสดีครับ ผมชื่อ พี่ดอย เป็น Academic Director ของ English Plan และเป็นคนหนึ่งที่อยู่กับการสอบ Duolingo English Test มาตั้งแต่ช่วงแรก ๆ ที่ข้อสอบนี้เริ่มเป็นที่รู้จักในปี 2020-2021 โดยเฉพาะในช่วงโควิด ซึ่งเป็นช่วงที่การสอบออนไลน์ได้รับความนิยมอย่างรวดเร็ว",
      "ในตอนนั้น Duolingo English Test ยังเป็นข้อสอบที่ใหม่มาก หลายมหาวิทยาลัยเพิ่งเริ่มรู้จัก และหลายคนก็ยังไม่แน่ใจว่าข้อสอบนี้จะถูกยอมรับจริงไหม ผมยังจำได้ดีว่า ในช่วงแรก ๆ ข้อสอบนี้ได้รับการยอมรับแค่บางมหาวิทยาลัยในไทย บางมหาวิทยาลัยในสหรัฐอเมริกา และยังไม่ได้รับการยอมรับอย่างกว้างขวางในอังกฤษเหมือนทุกวันนี้",
      "แต่เวลาผ่านไปเพียงไม่กี่ปี ทุกอย่างเปลี่ยนไปอย่างมาก",
      "จากข้อสอบออนไลน์ที่หลายคนเคยมองว่าเป็นทางเลือกสำรอง วันนี้ Duolingo English Test กลายเป็นหนึ่งในข้อสอบภาษาอังกฤษที่ได้รับการยอมรับจากมหาวิทยาลัยชั้นนำทั่วโลก รวมถึงมหาวิทยาลัยในสหราชอาณาจักร และอีกหลายประเทศที่นักเรียนไทยต้องการไปเรียนต่อ",
      "ตลอดหลายปีที่ผ่านมา ผมได้สอนนักเรียนมากกว่า 1,000 คนทั่วประเทศไทย บางคนเริ่มจากคะแนนประมาณ 85 แล้วค่อย ๆ พัฒนาขึ้นเป็น 100, 110 หรือแม้กระทั่ง 130 คะแนน สิ่งที่ผมเห็นไม่ใช่แค่ตัวเลขคะแนนที่เพิ่มขึ้น แต่คือความเข้าใจที่ลึกขึ้นว่า เด็กไทยต้องการอะไรในการเตรียมสอบ Duolingo English Test จริง ๆ",
    ],
  },
  {
    eyebrow: "วิวัฒนาการของข้อสอบ",
    title: "ผมเห็นวิวัฒนาการของข้อสอบตั้งแต่วันแรกจนถึงวันนี้",
    accent: "yellow",
    paragraphs: [
      "ในช่วงแรกของ Duolingo English Test ข้อสอบยังมีรูปแบบที่ค่อนข้างเรียบง่าย ตัวอย่างเช่น ในพาร์ต Speaking นักเรียนอาจแค่ต้องอธิบายรูปภาพสั้น ๆ แล้วจบ แต่เมื่อเวลาผ่านไป ข้อสอบค่อย ๆ พัฒนาให้ซับซ้อนขึ้น แม่นยำขึ้น และวัดทักษะภาษาอังกฤษได้ละเอียดกว่าเดิมมาก",
      "วันนี้ Duolingo English Test ไม่ใช่ข้อสอบที่อาศัยแค่การจำเทคนิคแล้วทำได้ทันทีอีกต่อไป แต่เป็นข้อสอบที่ต้องใช้ทั้งความเข้าใจภาษาอังกฤษ ความเร็วในการคิด การเลือกใช้คำศัพท์ ความมั่นใจในการพูด และความสามารถในการเขียนอย่างเป็นระบบ",
      "ในฐานะครู ผมรู้ดีว่ามีหลายอย่างที่ผมสามารถช่วยนักเรียนได้ เช่น การให้โครงสร้างการพูด เทคนิคการเขียน วิธีอ่านโจทย์ วิธีจับแพตเทิร์นของข้อสอบ หรือวิธีจัดการเวลา แต่ขณะเดียวกัน ผมก็เห็นชัดขึ้นเรื่อย ๆ ว่า มีบางทักษะที่การเรียนในห้องเรียนเพียงอย่างเดียวไม่พอ",
      "โดยเฉพาะพาร์ตที่ต้องอาศัยการฝึกซ้ำ ๆ เช่น การเติมคำศัพท์ให้ถูกต้อง การจำรูปแบบประโยค การฟังแล้วพิมพ์ หรือการเลือกใช้คำให้เหมาะกับบริบท",
      "ผมสามารถให้เทคนิคได้ แต่สุดท้ายภาษาอังกฤษมีคำศัพท์จำนวนมาก มีแพตเทิร์นมากมาย และข้อสอบสามารถหยิบคำหรือโครงสร้างภาษาแบบไหนมาใช้ก็ได้ ครูคนหนึ่งไม่สามารถสอนคำศัพท์ทุกคำหรือโจทย์ทุกแบบได้ทั้งหมดในห้องเรียน",
    ],
  },
  {
    eyebrow: "Turning Point",
    title: "นั่นคือจุดที่ผมเริ่มคิดว่า นักเรียนต้องมี “บางอย่าง” ที่มากกว่าคลาสเรียน",
    accent: "rose",
    paragraphs: [
      "จุดเริ่มต้นของแอปฝึกสอบ Duolingo English Test จาก English Plan",
      "ผมเริ่มเห็นชัดว่า นักเรียนต้องการเครื่องมือที่ช่วยให้พวกเขาฝึกเองได้หลังเลิกเรียน เครื่องมือที่ช่วยให้เห็นจุดอ่อนของตัวเอง ช่วยให้ทบทวนได้ซ้ำ ๆ และช่วยเปลี่ยนการเรียนจากการฟังครูสอนอย่างเดียว ให้กลายเป็นการฝึกที่มีเป้าหมายชัดเจน",
      "นั่นคือเหตุผลที่ แอปเวอร์ชันแรกของ English Plan ถูกพัฒนาขึ้นในปี 2022",
      "ในตอนนั้น แอปยังเป็นระบบที่ค่อนข้างเรียบง่ายและ static นักเรียนสามารถฝึกโจทย์ได้หลายรูปแบบ เช่น Multiple Choice, Fill in the Blank และ Listen and Type ซึ่งช่วยให้นักเรียนได้ฝึกทักษะพื้นฐานและคุ้นเคยกับรูปแบบข้อสอบมากขึ้น",
      "แอปเวอร์ชันแรกทำหน้าที่ของมันได้ดีในระดับหนึ่ง แต่มันยังมีข้อจำกัด โดยเฉพาะในพาร์ต Writing และ Speaking เพราะตอนนั้นระบบยังไม่สามารถให้ฟีดแบ็กเชิงลึก วิเคราะห์คำตอบ หรือประเมินคะแนนแบบเฉพาะบุคคลได้อย่างแม่นยำ",
      "และที่สำคัญ การจะสร้างระบบที่ให้ฟีดแบ็กได้จริง ไม่ใช่แค่ต้องมีเทคโนโลยี แต่ต้องมีฐานข้อมูล ต้องมีประสบการณ์ ต้องรู้ว่าเด็กไทยมักพลาดตรงไหน และต้องเข้าใจแพตเทิร์นของนักเรียนจำนวนมากพอ",
    ],
  },
  {
    eyebrow: "ข้อมูลจริง",
    title: "4 ปีของข้อมูลจริงจากนักเรียนกว่า 1,000 คน",
    accent: "blue",
    paragraphs: [
      "หลังจากสอนนักเรียนมากกว่า 1,000 คน ผมไม่ได้เก็บไว้แค่ประสบการณ์การสอน แต่ English Plan ได้เห็นข้อมูลจริงจากนักเรียนไทยจำนวนมาก เราเห็นว่าเด็กไทยมักมีจุดอ่อนตรงไหนใน Duolingo English Test",
      "ข้อมูลเหล่านี้ทำให้ผมเข้าใจว่า การฝึกสอบที่ดีไม่ใช่แค่การให้โจทย์จำนวนมาก แต่ต้องช่วยให้นักเรียนรู้ว่า “ควรฝึกอะไร” และ “ทำไมคะแนนยังไม่ขึ้น”",
      "เพราะถ้านักเรียนไม่รู้จุดอ่อนของตัวเอง เขาอาจใช้เวลาหลายสัปดาห์หรือหลายเดือนฝึกผิดทาง โดยไม่รู้เลยว่าปัญหาจริง ๆ อยู่ตรงไหน",
    ],
  },
  {
    eyebrow: "April 2026",
    title: "เมษายน 2026: แอปใหม่ของ English Plan ถูกสร้างขึ้นเพื่อเพิ่มคะแนนจริง",
    accent: "yellow",
    paragraphs: [
      "ในเดือน เมษายน 2026 ผมจึงเปิดตัวแอปเวอร์ชันใหม่ของ English Plan ซึ่งเป็นเวอร์ชันที่พัฒนาขึ้นจากประสบการณ์การสอนหลายปี และจากฐานข้อมูลของนักเรียนไทยจริง ๆ",
      "แอปนี้ไม่ได้ถูกสร้างมาเพื่อให้นักเรียนแค่ “ลองทำโจทย์” แต่ถูกสร้างมาเพื่อช่วยให้นักเรียน พัฒนาคะแนน Duolingo English Test ได้จริง",
      "สิ่งที่ผมให้ความสำคัญมากที่สุดคือระบบฟีดแบ็ก โดยเฉพาะในพาร์ต Writing และ Speaking ซึ่งเป็นพาร์ตที่นักเรียนจำนวนมากไม่รู้ว่าตัวเองผิดตรงไหน และควรแก้ยังไง",
      "ในแอปใหม่นี้ นักเรียนสามารถฝึกทำ Full Mock Test ได้เหมือนการสอบจริง เพื่อดูว่าแต่ละพาร์ตมีจุดอ่อนอะไรบ้าง ไม่ว่าจะเป็นการเขียน การพูด การอ่าน การฟัง คำศัพท์ หรือการจัดโครงสร้างคำตอบ",
      "แทนที่จะฝึกแบบเดาสุ่ม นักเรียนจะเห็นชัดขึ้นว่า ตัวเองควรใช้เวลาไปกับอะไร เพื่อประหยัดเวลาและพัฒนาได้ตรงจุดมากขึ้น",
    ],
  },
  {
    eyebrow: "Personalized",
    title: "ฟีดแบ็กแบบ Personalized สำหรับนักเรียนไทยโดยเฉพาะ",
    accent: "rose",
    paragraphs: [
      "หนึ่งในสิ่งที่ทำให้แอปนี้แตกต่างคือ ฟีดแบ็กที่นักเรียนได้รับจะเป็น ฟีดแบ็กแบบ Personalized 100% และเขียนเป็นภาษาไทย เพื่อให้นักเรียนไทยเข้าใจง่าย นำไปแก้ไขได้จริง และไม่รู้สึกว่าตัวเองกำลังอ่านคำอธิบายภาษาอังกฤษที่ซับซ้อนเกินไป",
      "ฟีดแบ็กเหล่านี้ไม่ได้อิงจากระบบทั่วไปเพียงอย่างเดียว แต่พัฒนาจากฐานข้อมูลและประสบการณ์ของ English Plan ที่ได้เห็นคำตอบของนักเรียนไทยมาหลายปี เรารู้ว่าเด็กไทยมักใช้ประโยคแบบไหนผิด ใช้คำศัพท์แบบไหนซ้ำ ตอบ Speaking แบบไหนแล้วคะแนนไม่ขึ้น หรือเขียน Writing แบบไหนแล้วดูไม่เป็นธรรมชาติ",
      "นักเรียนยังสามารถบันทึก Learning Points ของตัวเองไว้ได้ เพื่อกลับมาทบทวนภายหลัง ไม่ใช่แค่ทำข้อสอบแล้วจบ แต่สามารถกลับมาเรียนรู้จากข้อผิดพลาดของตัวเองซ้ำ ๆ จนเกิดการพัฒนาจริง",
    ],
  },
  {
    eyebrow: "Mission",
    title: "แอปนี้ไม่ได้สร้างมาเพื่อให้ฝึกเยอะขึ้น แต่สร้างมาเพื่อให้ฝึกถูกทาง",
    accent: "blue",
    paragraphs: [
      "สำหรับผม การเตรียมสอบ Duolingo English Test ไม่ใช่เรื่องของการทำโจทย์ให้เยอะที่สุด แต่คือการรู้ว่าโจทย์แต่ละข้อกำลังวัดอะไร เราผิดเพราะอะไร และต้องแก้ยังไงถึงจะทำให้คะแนนเพิ่มขึ้น",
      "นี่คือเหตุผลที่แอปของ English Plan ถูกสร้างขึ้นมา",
      "มันถูกสร้างมาเพื่อให้นักเรียนไทยสามารถฝึกสอบได้อย่างมีระบบ เห็นจุดอ่อนของตัวเอง ได้รับฟีดแบ็กที่เข้าใจง่าย และรู้ว่าควรพัฒนาอะไรต่อไป",
      "จากวันแรกที่ผมเริ่มสอน Duolingo English Test ในช่วงที่ข้อสอบยังใหม่มาก จนถึงวันนี้ที่ข้อสอบกลายเป็นหนึ่งในข้อสอบภาษาอังกฤษที่สำคัญของโลก ผมยังเชื่อเหมือนเดิมว่า นักเรียนทุกคนสามารถพัฒนาคะแนนได้ ถ้ามีวิธีฝึกที่ถูกต้อง มีระบบที่ช่วยชี้ทาง และมีฟีดแบ็กที่ตรงจุด",
      "และนี่คือเป้าหมายของแอปนี้",
      "English Plan สร้างแอปนี้ขึ้นมาเพื่อช่วยให้นักเรียนไทยฝึก Duolingo English Test ได้ดีขึ้น เข้าใจจุดอ่อนของตัวเองมากขึ้น และเพิ่มคะแนนได้จริง",
    ],
  },
];

const learnerPainPoints = [
  "บางคนมีไอเดียดี แต่เขียนไม่เป็นระบบ",
  "บางคนพูดได้ แต่ตอบไม่ตรงโจทย์",
  "บางคนใช้คำศัพท์ซ้ำ ๆ จนคะแนนไม่ขึ้น",
  "บางคนเข้าใจภาษาอังกฤษ แต่ทำข้อสอบไม่ทัน",
  "บางคนฝึกเยอะมาก แต่ฝึกไม่ตรงจุด",
];

const timeline = [
  {
    year: "2020-2021",
    title: "เริ่มสอน DET ตั้งแต่ข้อสอบยังใหม่มาก",
    body: "ช่วงโควิดคือจุดที่ผมได้เห็น Duolingo English Test เติบโตจากข้อสอบออนไลน์ที่คนยังไม่แน่ใจ สู่ข้อสอบที่เริ่มถูกพูดถึงจริงจังในหมู่นักเรียนไทย",
    color: "bg-[#dcecff]",
  },
  {
    year: "2022",
    title: "English Plan เปิดตัวแอปเวอร์ชันแรก",
    body: "เวอร์ชันแรกช่วยให้นักเรียนฝึกโจทย์พื้นฐานได้เองหลังคลาส และเป็นรากฐานสำคัญของระบบฝึกสอบที่เราพัฒนาต่อมา",
    color: "bg-[#fff2b3]",
  },
  {
    year: "2026",
    title: "เปิดตัวแอปเวอร์ชันใหม่เพื่อเพิ่มคะแนนจริง",
    body: "เวอร์ชันใหม่นำประสบการณ์หลายปีและฐานข้อมูลนักเรียนไทยมารวมกับระบบฟีดแบ็กที่ละเอียดขึ้น โดยเฉพาะใน Writing และ Speaking",
    color: "bg-[#ffe1d6]",
  },
];

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data) };
}

export const metadata: Metadata = {
  title: "About English Plan | จากห้องเรียนสู่แอปฝึกสอบ DET สำหรับเด็กไทย",
  description:
    "เรื่องราวของพี่ดอยและ English Plan จากการสอน Duolingo English Test สู่การสร้างแอปฝึกสอบที่ออกแบบจากข้อมูลจริงของนักเรียนไทย",
  alternates: {
    canonical: absoluteUrl("/about"),
  },
  openGraph: {
    title: "About English Plan | จากห้องเรียนสู่แอปฝึกสอบ DET สำหรับเด็กไทย",
    description:
      "เรื่องราวของพี่ดอยและ English Plan จากการสอน Duolingo English Test สู่การสร้างแอปฝึกสอบที่ออกแบบจากข้อมูลจริงของนักเรียนไทย",
    url: absoluteUrl("/about"),
    type: "article",
  },
};

export default function AboutPage() {
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About English Plan",
    url: absoluteUrl("/about"),
    description:
      "The story behind English Plan, Academic Director P'Doy, and the Duolingo English Test prep app built for Thai learners.",
    mainEntity: {
      "@type": "Person",
      name: "พี่ดอย",
      jobTitle: "Academic Director",
      worksFor: {
        "@type": "Organization",
        name: "English Plan",
      },
    },
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(#d1d5db_1px,transparent_1px)] bg-[size:24px_24px] bg-[#f3f4f6] px-4 py-12 text-neutral-900 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(aboutLd)} />

      <div className="mx-auto max-w-7xl">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-10">
            <span className="inline-block rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
              About English Plan
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              จากห้องเรียนสู่แอปฝึกสอบ
              <span className="block text-[#004aad]">Duolingo English Test ที่สร้างมาเพื่อเด็กไทย</span>
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-600 sm:text-lg">
              เรื่องราวนี้คือที่มาของ English Plan, พี่ดอย, และแอปฝึกสอบที่ไม่ได้สร้างมาเพื่อให้ฝึกเยอะขึ้นอย่างเดียว
              แต่สร้างมาเพื่อให้เด็กไทยรู้ว่าควรฝึกอะไร ทำไมคะแนนยังไม่ขึ้น และจะพัฒนาได้จริงอย่างไร
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/practice"
                className="rounded-xl bg-[#004aad] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#003d91]"
              >
                เปิด Practice hub
              </Link>
              <Link
                href="/duolingo-english-test"
                className="rounded-xl bg-[#ffcc00] px-6 py-3 text-sm font-bold text-neutral-900 shadow-md transition hover:bg-[#ffd633]"
              >
                คู่มือ DET
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:border-[#004aad]"
              >
                ดูแพ็กเกจ
              </Link>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <span className="inline-block rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Academic Director
              </span>
              <h3 className="mt-3 text-xl font-black text-[#004aad]">{"พี่ดอย / P'Doy"}</h3>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                อยู่กับ Duolingo English Test ตั้งแต่ช่วงแรกที่ข้อสอบเริ่มเป็นที่รู้จักในไทย และสอนนักเรียนมากกว่า 1,000 คนทั่วประเทศ
              </p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#eef4ff] p-4 text-center">
                  <div className="text-2xl font-black text-[#004aad]">1,000+</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">Students taught</div>
                </div>
                <div className="rounded-xl bg-[#fff6cc] p-4 text-center">
                  <div className="text-2xl font-black text-neutral-900">2020</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">DET journey began</div>
                </div>
                <div className="rounded-xl bg-[#ffe3db] p-4 text-center">
                  <div className="text-2xl font-black text-neutral-900">2026</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">New app launched</div>
                </div>
              </div>
            </div>

            <section className="rounded-2xl bg-[#004aad] p-6 text-white shadow-lg">
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ffcc00]">
                Core belief
              </span>
              <blockquote className="mt-4 text-xl font-black leading-snug sm:text-2xl">
                “นักเรียนทุกคนสามารถพัฒนาคะแนนได้ ถ้ามีวิธีฝึกที่ถูกต้อง มีระบบที่ช่วยชี้ทาง และมีฟีดแบ็กที่ตรงจุด”
              </blockquote>
            </section>
          </div>
        </section>

        <section className="mt-10">
          <div className="grid gap-5 lg:grid-cols-3">
            {timeline.map((item) => (
              <section
                key={item.year}
                className={`rounded-2xl border border-gray-200 p-6 shadow-sm ${item.color}`}
              >
                <span className="inline-block rounded-full border border-gray-200 bg-white/70 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  {item.year}
                </span>
                <h2 className="mt-3 text-xl font-black tracking-tight">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-gray-700">{item.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <span className="inline-block rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
              What we learned
            </span>
            <h2 className="mt-3 text-xl font-black text-[#004aad]">สิ่งที่เราเห็นจากนักเรียนจริง</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              หลังจากสอนนักเรียนมากกว่า 1,000 คน English Plan ไม่ได้เก็บไว้แค่ประสบการณ์ แต่ได้เห็นข้อมูลจริงว่าเด็กไทยมักพลาดตรงไหนในการเตรียมสอบ DET
            </p>
            <ul className="mt-5 space-y-2.5 text-sm font-medium leading-7 text-gray-700">
              {learnerPainPoints.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="shrink-0 text-[#004aad]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <section className="space-y-6">
            {storySections.map((section) => {
              const accentBg =
                section.accent === "yellow"
                  ? "bg-[#fffbe9]"
                  : section.accent === "rose"
                    ? "bg-[#fff3ee]"
                    : "bg-white";
              return (
                <section
                  key={section.title}
                  className={`rounded-2xl border border-gray-200 p-6 shadow-sm sm:p-7 ${accentBg}`}
                >
                  <span className="inline-block rounded-full border border-gray-200 bg-white/70 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {section.eyebrow}
                  </span>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-[#1a1a2e]">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-base leading-8 text-gray-700">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              );
            })}
          </section>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <span className="inline-block rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Why this matters
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight">
              แอปนี้ไม่ได้สร้างมาเพื่อให้ฝึกเยอะขึ้น แต่สร้างมาเพื่อให้ฝึกถูกทาง
            </h2>
            <p className="mt-4 text-base leading-8 text-gray-600">
              สำหรับ English Plan การเตรียมสอบที่ดีไม่ใช่แค่การทำโจทย์ให้มากที่สุด แต่คือการช่วยให้นักเรียนรู้ว่าควรฝึกอะไร ผิดเพราะอะไร และอะไรคือคอขวดที่กำลังกดคะแนนอยู่
            </p>
          </section>

          <section className="rounded-2xl bg-[#004aad] p-6 text-white shadow-lg sm:p-8">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ffcc00]">
              Next step
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight">
              พร้อมเริ่มฝึกแบบมีระบบแล้วหรือยัง
            </h2>
            <p className="mt-4 text-base leading-8 text-white/90">
              ถ้าคุณอยากเห็นจุดอ่อนของตัวเองชัดขึ้น ลองเริ่มจาก mini diagnosis, mock test หรือฝึก task เฉพาะอย่าง
              Write About Photo และ Speak About Photo ก่อน แล้วค่อยขยับไปสู่แผนฝึกเต็มรูปแบบ
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/mini-diagnosis/start"
                className="rounded-xl bg-[#ffcc00] px-5 py-3 text-sm font-bold text-neutral-900 shadow-md transition hover:bg-[#ffd633]"
              >
                Mini diagnosis
              </Link>
              <Link
                href="/mock-test/start"
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#004aad] shadow-md transition hover:bg-gray-50"
              >
                Mock test
              </Link>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
