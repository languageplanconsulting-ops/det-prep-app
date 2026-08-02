"use client";

import { useState } from "react";

import { CourseAdminClient } from "@/components/admin/CourseAdminClient";
import { CourseProductionClient } from "@/components/admin/CourseProductionClient";
import type { CourseSnapshot } from "@/lib/admin-course-data";
import type { ProductionSnapshot } from "@/lib/admin-course-production-data";

type Tab = "course" | "production";

export function CourseAdminPanel({
  courseContent,
  productionSnapshot,
  initialTab = "course",
}: {
  /** Pre-resolved course-tab body (player+chapters, or a "not deployed" notice). */
  courseContent: React.ReactNode;
  productionSnapshot: ProductionSnapshot;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <TabButton active={tab === "course"} onClick={() => setTab("course")}>
          📚 คอร์ส
        </TabButton>
        <TabButton active={tab === "production"} onClick={() => setTab("production")}>
          🎬 แผนถ่ายวิดีโอ
        </TabButton>
      </div>

      <div hidden={tab !== "course"}>{courseContent}</div>
      <div hidden={tab !== "production"}>
        <CourseProductionClient snapshot={productionSnapshot} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-[4px] border-4 border-black px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none ${
        active ? "bg-amber-300 text-neutral-900" : "bg-white text-neutral-800"
      }`}
      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
    >
      {children}
    </button>
  );
}
