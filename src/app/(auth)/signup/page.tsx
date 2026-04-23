import { SignupForm } from "@/app/(auth)/signup/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; next?: string }>;
}) {
  const { redirect: redirectTo, next } = await searchParams;
  return <SignupForm redirectTo={redirectTo ?? next ?? "/practice"} />;
}
