import { LoginForm } from "@/app/(auth)/login/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  return <LoginForm redirectTo={redirectTo ?? "/practice"} />;
}
