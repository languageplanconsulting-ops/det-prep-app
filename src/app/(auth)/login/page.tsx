import { AdminLoginForm } from "@/app/(auth)/login/AdminLoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  const { redirect: redirectTo, next } = await searchParams;
  return <AdminLoginForm redirectTo={redirectTo ?? next ?? "/practice"} />;
}
