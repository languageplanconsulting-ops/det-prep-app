import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/site-metadata";

const TITLE = "นโยบายความเป็นส่วนตัว | English Plan";
const DESCRIPTION =
  "นโยบายความเป็นส่วนตัวของ English Plan (เว็บและแอป EnglishPlan) — ข้อมูลที่เราเก็บ วิธีใช้ และสิทธิ์ของคุณ";
const CONTACT_EMAIL = "englishplaninfo@gmail.com";
const LAST_UPDATED = "10 กรกฎาคม 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/privacy"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/privacy"),
  },
};

type Section = {
  heading: string;
  body: React.ReactNode;
};

const sections: Section[] = [
  {
    heading: "ข้อมูลที่เราเก็บ",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>ข้อมูลบัญชี:</strong> อีเมลและรหัสผ่าน (ผ่านระบบยืนยันตัวตนของ Supabase),
          ชื่อที่แสดง, ระดับสิทธิ์การใช้งาน (free/basic/premium/vip)
        </li>
        <li>
          <strong>คำตอบและไฟล์เสียงที่คุณส่งฝึก:</strong> ข้อความที่พิมพ์ (Writing), การบันทึกเสียง
          (Speaking) จากไมโครโฟนของอุปกรณ์คุณ — ใช้เพื่อให้คะแนนและฟีดแบ็กเท่านั้น
        </li>
        <li>
          <strong>ข้อมูลการชำระเงิน:</strong> ประมวลผลผ่าน Stripe โดยตรง — เราไม่เก็บเลขบัตรเครดิต
          ของคุณไว้ในระบบของเรา
        </li>
        <li>
          <strong>ข้อมูลความคืบหน้าในการฝึก:</strong> คะแนน สถิติ XP สตรีค และรายการคำศัพท์ที่บันทึกไว้ในสมุดโน้ตของคุณ
        </li>
        <li>
          <strong>ข้อมูลการใช้งานทั่วไป:</strong> หน้าที่เข้าชมและปุ่มที่กด เพื่อทำความเข้าใจ
          และปรับปรุงประสบการณ์การใช้งาน
        </li>
        <li>
          <strong>Push notification token:</strong> (เฉพาะแอปมือถือ) ใช้ส่งการแจ้งเตือนเตือนฝึกฝนและ
          แผนการอ่าน — เฉพาะกรณีที่คุณอนุญาตการแจ้งเตือน
        </li>
      </ul>
    ),
  },
  {
    heading: "เราใช้ข้อมูลของคุณอย่างไร",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>ให้คะแนนและฟีดแบ็กงานเขียน/พูดของคุณแบบเฉพาะบุคคล</li>
        <li>บันทึกความคืบหน้าและซิงค์ระหว่างเว็บกับแอปมือถือด้วยบัญชีเดียวกัน</li>
        <li>ยืนยันสิทธิ์การใช้งานตามแพ็กเกจที่คุณสมัคร</li>
        <li>ส่งการแจ้งเตือนเพื่อช่วยให้คุณฝึกต่อเนื่อง (ปิดได้ทุกเมื่อในตั้งค่าอุปกรณ์)</li>
        <li>วิเคราะห์การใช้งานในภาพรวมเพื่อปรับปรุงเนื้อหาและฟีเจอร์</li>
      </ul>
    ),
  },
  {
    heading: "เราแชร์ข้อมูลกับใครบ้าง",
    body: (
      <>
        <p className="mb-3">
          เราไม่ขายข้อมูลส่วนตัวของคุณ ข้อมูลจะถูกส่งให้ผู้ให้บริการภายนอกเท่าที่จำเป็นต่อการทำงานของระบบเท่านั้น:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase</strong> — ฐานข้อมูลและระบบยืนยันตัวตน
          </li>
          <li>
            <strong>Stripe</strong> — ประมวลผลการชำระเงิน
          </li>
          <li>
            <strong>Google Gemini</strong> — วิเคราะห์และให้คะแนนงานเขียน/รูปภาพที่คุณส่งฝึก
          </li>
          <li>
            <strong>Deepgram</strong> — แปลงเสียงพูดเป็นข้อความและสังเคราะห์เสียงอ่าน
          </li>
          <li>
            <strong>Vercel</strong> — โฮสต์เว็บแอปและแอปมือถือ
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "การเก็บรักษาและความปลอดภัยของข้อมูล",
    body: (
      <p>
        ข้อมูลถูกเก็บไว้บนเซิร์ฟเวอร์ของ Supabase ที่มีการเข้ารหัสระหว่างส่งข้อมูล (HTTPS/TLS) เราเก็บข้อมูล
        ของคุณไว้ตราบเท่าที่บัญชีของคุณยังใช้งานอยู่ หรือจนกว่าคุณจะขอให้ลบ
      </p>
    ),
  },
  {
    heading: "สิทธิ์ของคุณ",
    body: (
      <p>
        คุณสามารถขอดู แก้ไข หรือลบข้อมูลส่วนตัวของคุณได้ทุกเมื่อ โดยติดต่อเราที่{" "}
        <a className="text-blue-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>{" "}
        เมื่อลบบัญชี ข้อมูลคำตอบ คะแนน และไฟล์เสียงที่เกี่ยวข้องจะถูกลบออกจากระบบของเรา
      </p>
    ),
  },
  {
    heading: "ผู้ใช้งานอายุต่ำกว่า 13 ปี",
    body: (
      <p>
        บริการนี้ออกแบบมาสำหรับนักเรียนมัธยม/มหาวิทยาลัยที่เตรียมสอบ Duolingo English Test เราไม่ได้ตั้งใจ
        เก็บข้อมูลจากเด็กอายุต่ำกว่า 13 ปีโดยไม่ได้รับความยินยอมจากผู้ปกครอง หากทราบว่ามีการเก็บข้อมูลดังกล่าว
        โดยไม่ได้ตั้งใจ กรุณาติดต่อเราเพื่อให้ลบข้อมูลออกทันที
      </p>
    ),
  },
  {
    heading: "การเปลี่ยนแปลงนโยบายนี้",
    body: (
      <p>
        เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว การเปลี่ยนแปลงที่สำคัญจะแจ้งให้ทราบผ่านแอปหรือเว็บไซต์
        วันที่ปรับปรุงล่าสุดแสดงอยู่ด้านบนของหน้านี้
      </p>
    ),
  },
  {
    heading: "ติดต่อเรา",
    body: (
      <p>
        มีคำถามเกี่ยวกับความเป็นส่วนตัว ติดต่อได้ที่{" "}
        <a className="text-blue-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-900">
      <h1 className="text-3xl font-bold">นโยบายความเป็นส่วนตัว</h1>
      <p className="mt-2 text-sm text-neutral-500">อัปเดตล่าสุด: {LAST_UPDATED}</p>
      <p className="mt-6 text-neutral-700">
        นโยบายนี้ครอบคลุมทั้งเว็บแอป English Plan และแอปมือถือ EnglishPlan (iOS/Android) ซึ่งใช้บัญชีและฐานข้อมูล
        เดียวกัน การใช้งานบริการของเราถือว่าคุณยอมรับนโยบายนี้
      </p>

      <div className="mt-10 space-y-10">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold">{s.heading}</h2>
            <div className="mt-3 leading-relaxed text-neutral-700">{s.body}</div>
          </section>
        ))}
      </div>
    </main>
  );
}
