import { LoginForm } from "@/app/(auth)/login/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  const { redirect: redirectTo, next } = await searchParams;
  return <LoginForm redirectTo={redirectTo ?? next ?? "/practice"} />;
}
