"use client";

import { AdminLoginWelcomeModal } from "@/components/auth/AdminLoginWelcomeModal";
import { LoginWelcomeModal } from "@/components/auth/LoginWelcomeModal";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * Admin-only preview gate for the post-login welcome modal.
 * Renders NOTHING until the tier is resolved, so exactly one variant mounts and
 * the sessionStorage "show once" flag is read by only that variant (no race).
 * Non-admins always get the original LoginWelcomeModal.
 */
export function LoginWelcomeModalGate() {
  const { isAdmin, previewEligible, loading } = useEffectiveTier();
  if (loading) return null;
  if (isAdmin || previewEligible) {
    return <AdminLoginWelcomeModal />;
  }
  return <LoginWelcomeModal />;
}
