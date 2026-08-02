import "server-only";

import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";

/**
 * Master switch for the student-facing course route.
 *
 * While false, /course/[slug] is visible to admins ONLY, even for students who
 * would otherwise qualify. Flip to true to open it to VIP Fast Track students.
 * Kept as a constant (not an env var) so the state is obvious in code review
 * and can't drift between environments.
 */
export const STUDENT_COURSE_ENABLED = true;

export type CourseViewerProfile = {
  role?: string | null;
  tier?: unknown;
  tier_expires_at?: string | null;
  vip_granted_by_course?: boolean | null;
};

export type CourseAccess =
  | { allowed: true; reason: "admin" | "vip" }
  | { allowed: false; reason: "not_logged_in" | "not_released" | "needs_vip" };

/**
 * Who may watch the course.
 *
 * Admins always may — that's how the page is reviewed before launch.
 * Students need an effective VIP tier, which covers both course-granted VIP
 * (vip_granted_by_course, no expiry) and a still-valid purchased VIP; the
 * resolver already handles expiry, so an expired plan falls back to free.
 */
export function resolveCourseAccess(profile: CourseViewerProfile | null): CourseAccess {
  if (!profile) return { allowed: false, reason: "not_logged_in" };

  if (profile.role === "admin") return { allowed: true, reason: "admin" };

  if (!STUDENT_COURSE_ENABLED) return { allowed: false, reason: "not_released" };

  const tier = resolveEffectiveTierFromProfile({
    tier: profile.tier,
    tier_expires_at: profile.tier_expires_at,
    vip_granted_by_course: profile.vip_granted_by_course,
  });

  return tier === "vip" ? { allowed: true, reason: "vip" } : { allowed: false, reason: "needs_vip" };
}

/** Free-preview lessons stay watchable regardless of tier once the route is
 *  open; before release nothing is public. */
export function canWatchLesson(access: CourseAccess, freePreview: boolean): boolean {
  if (access.allowed) return true;
  return STUDENT_COURSE_ENABLED && freePreview;
}
