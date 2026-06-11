"use client";

import { type ReactNode } from "react";

import { AdminFreeQuotaLockedLink } from "@/components/practice/AdminFreeQuotaLockedLink";
import { type NonApiReminderExam } from "@/lib/non-api-practice-usage";

/**
 * Free-quota lock — now the "Show the value" version for all users.
 * (The original modal remains in git history for quick rollback.)
 */
export function FreeQuotaLockedLink({
  href,
  exam,
  className,
  children,
}: {
  href: string;
  exam: NonApiReminderExam;
  className?: string;
  children: ReactNode;
}) {
  return (
    <AdminFreeQuotaLockedLink href={href} exam={exam} className={className}>
      {children}
    </AdminFreeQuotaLockedLink>
  );
}
