import { AdminSignupForm } from "@/app/(auth)/signup/AdminSignupForm";
import { SignupForm } from "@/app/(auth)/signup/SignupForm";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  const { redirect: redirectTo, next } = await searchParams;
  const to = redirectTo ?? next ?? "/practice";
  // Admin-only preview of the new signup screen. Real users keep the current one.
  const adminAccess = await getAdminAccess();
  if (adminAccess.ok) {
    return <AdminSignupForm redirectTo={to} />;
  }
  return <SignupForm redirectTo={to} />;
}
