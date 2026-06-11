import { AdminLoginForm } from "@/app/(auth)/login/AdminLoginForm";
import { LoginForm } from "@/app/(auth)/login/LoginForm";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  const { redirect: redirectTo, next } = await searchParams;
  const to = redirectTo ?? next ?? "/practice";
  // Admin-only preview of the new login screen. Real users keep the current one.
  const adminAccess = await getAdminAccess();
  if (adminAccess.ok) {
    return <AdminLoginForm redirectTo={to} />;
  }
  return <LoginForm redirectTo={to} />;
}
