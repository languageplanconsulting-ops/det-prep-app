import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-16">
      <h1
        className="text-3xl font-black tracking-tight"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Pricing
      </h1>
      <p className="text-sm text-neutral-600">
        Public pricing landing (Free, Basic, Premium, VIP). Connect Stripe checkout links from
        here when ready.
      </p>
      <p className="text-sm">
        <Link href="/login" className="font-bold text-ep-blue underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
