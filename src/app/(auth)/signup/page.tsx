import { AdminSignupForm } from "@/app/(auth)/signup/AdminSignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  const { redirect: redirectTo, next } = await searchParams;
  return <AdminSignupForm redirectTo={redirectTo ?? next ?? "/practice"} />;
}
