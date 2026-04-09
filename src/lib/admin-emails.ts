/** Must match migration / admin setup — fixed bootstrap admin account. */
export const BOOTSTRAP_ADMIN_EMAIL = "languageplanconsulting@gmail.com";

export function isBootstrapAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
}
