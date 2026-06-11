"use client";

import { AdminLoginWelcomeModal } from "@/components/auth/AdminLoginWelcomeModal";

/**
 * Post-login welcome modal — now the "Show the value" version for all users.
 * (The original LoginWelcomeModal remains in the repo for quick rollback.)
 */
export function LoginWelcomeModalGate() {
  return <AdminLoginWelcomeModal />;
}
