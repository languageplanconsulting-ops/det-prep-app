import Link from "next/link";

import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { ADD_ON_CATALOG } from "@/lib/paywall-upsell";
import { STRIPE_PLANS } from "@/lib/stripe";

type EnvStatus = {
  key: string;
  label: string;
  value: string | undefined;
  required: boolean;
  note?: string;
};

const PLAN_CATALOG = [
  {
    tier: "basic",
    price: "฿399",
    duration: "30 days",
    summary: "12 AI feedback credits · 2 mock tests",
  },
  {
    tier: "premium",
    price: "฿699",
    duration: "30 days",
    summary: "30 AI feedback credits · 4 mock tests",
  },
  {
    tier: "vip",
    price: "฿999",
    duration: "30 days",
    summary: "60 AI feedback credits · 6 mock tests",
  },
] as const;

function maskValue(value: string | undefined): string {
  if (!value) return "Missing";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function envStatuses(): EnvStatus[] {
  return [
    {
      key: "NEXT_PUBLIC_SITE_URL",
      label: "Public site URL",
      value: process.env.NEXT_PUBLIC_SITE_URL,
      required: true,
      note: "Used for Stripe success/cancel redirects and webhook endpoint reference.",
    },
    {
      key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      label: "Stripe publishable key",
      value: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      required: true,
      note: "Keep it in Vercel even if checkout is server-started.",
    },
    {
      key: "STRIPE_SECRET_KEY",
      label: "Stripe secret key",
      value: process.env.STRIPE_SECRET_KEY,
      required: true,
    },
    {
      key: "STRIPE_WEBHOOK_SECRET",
      label: "Stripe webhook secret",
      value: process.env.STRIPE_WEBHOOK_SECRET,
      required: true,
    },
    {
      key: "STRIPE_PRICE_BASIC",
      label: "Basic plan price ID",
      value: process.env.STRIPE_PRICE_BASIC,
      required: true,
      note: `Current code target: ${STRIPE_PLANS.basic}`,
    },
    {
      key: "STRIPE_PRICE_PREMIUM",
      label: "Premium plan price ID",
      value: process.env.STRIPE_PRICE_PREMIUM,
      required: true,
      note: `Current code target: ${STRIPE_PLANS.premium}`,
    },
    {
      key: "STRIPE_PRICE_VIP",
      label: "VIP plan price ID",
      value: process.env.STRIPE_PRICE_VIP,
      required: true,
      note: `Current code target: ${STRIPE_PLANS.vip}`,
    },
    {
      key: "STRIPE_CHECKOUT_LOGO_URL",
      label: "Optional hosted Checkout logo URL",
      value: process.env.STRIPE_CHECKOUT_LOGO_URL,
      required: false,
      note: "Optional. If set, Stripe-hosted Checkout shows this logo.",
    },
    {
      key: "STRIPE_CHECKOUT_ICON_URL",
      label: "Optional hosted Checkout icon URL",
      value: process.env.STRIPE_CHECKOUT_ICON_URL,
      required: false,
      note: "Optional. If set, Stripe-hosted Checkout shows this icon.",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      label: "Supabase service role key",
      value: process.env.SUPABASE_SERVICE_ROLE_KEY,
      required: true,
      note: "Required for webhook fulfillment and profile/payment updates.",
    },
  ];
}

export default function AdminBillingSetupPage() {
  const statuses = envStatuses();
  const requiredReady = statuses.filter((item) => item.required && item.value);
  const requiredMissing = statuses.filter((item) => item.required && !item.value);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://your-domain.example").replace(/\/$/, "");
  const webhookUrl = `${siteUrl}/api/stripe/webhook`;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Admin only
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Stripe billing setup</h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              This app already sells 30-day plan access, extra mock tests, and extra AI feedback
              credits. Use this page to verify env wiring, understand what Stripe objects you need,
              and avoid configuring it like an auto-renewing subscription system by mistake.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-white px-4 py-2 font-black uppercase tracking-wide text-[#004AAD] shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Back to admin
          </Link>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <BrutalPanel title="Env readiness" eyebrow="Vercel / server">
          <div className="flex flex-wrap gap-3">
            <div className="border-2 border-black bg-[#dcfce7] px-3 py-2 text-sm font-black text-[#166534]">
              Ready: {requiredReady.length}
            </div>
            <div className="border-2 border-black bg-[#fee2e2] px-3 py-2 text-sm font-black text-[#b91c1c]">
              Missing: {requiredMissing.length}
            </div>
          </div>

          <div className="mt-4 overflow-hidden border-2 border-black">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#ffcc00] text-neutral-900">
                <tr>
                  <th className="border-b-2 border-black px-3 py-2 font-black">Variable</th>
                  <th className="border-b-2 border-black px-3 py-2 font-black">Status</th>
                  <th className="border-b-2 border-black px-3 py-2 font-black">Value</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((item) => (
                  <tr key={item.key} className="border-b border-black/20 bg-white align-top">
                    <td className="px-3 py-3">
                      <div className="font-black">{item.label}</div>
                      <div className="ep-stat mt-1 text-[11px] text-neutral-500">{item.key}</div>
                      {item.note ? <div className="mt-1 text-xs text-neutral-500">{item.note}</div> : null}
                    </td>
                    <td className="px-3 py-3 font-black">
                      {item.value ? (
                        <span className="text-[#166534]">Configured</span>
                      ) : (
                        <span className="text-[#b91c1c]">Missing</span>
                      )}
                    </td>
                    <td className="ep-stat px-3 py-3 text-xs text-neutral-700">{maskValue(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BrutalPanel>

        <BrutalPanel title="Important product behavior" eyebrow="Do not miss this">
          <div className="space-y-4 text-sm text-neutral-700">
            <p>
              Plans are currently sold as <strong>one-time payments for 30 days of access</strong>.
              They are not auto-renewing Stripe subscriptions yet.
            </p>
            <p>
              Add-on mock tests and AI feedback credits are already implemented as one-off top-ups.
              They are fulfilled by the webhook and counted in quota summary automatically.
            </p>
            <p>
              The billing portal route exists, but it is only truly useful once you migrate plans to
              real Stripe subscriptions. Right now the important live path is Checkout + webhook.
            </p>
            <div className="border-2 border-black bg-[#fff7ed] p-3 font-semibold text-[#9a3412]">
              If you want auto-renew monthly billing later, we will need a separate code pass to move
              plan checkout from one-time <code className="ep-stat">mode: payment</code> into real
              Stripe subscription mode.
            </div>
          </div>
        </BrutalPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <BrutalPanel title="What the app already sells" eyebrow="Products">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black">30-day access plans</h2>
              <div className="mt-3 grid gap-3">
                {PLAN_CATALOG.map((plan) => (
                  <div key={plan.tier} className="border-2 border-black bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-black uppercase text-[#004AAD]">{plan.tier}</p>
                      <p className="font-black">{plan.price}</p>
                    </div>
                    <p className="mt-1 text-sm text-neutral-700">{plan.summary}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-500">{plan.duration} access per purchase</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-black">One-off add-ons</h2>
              <div className="mt-3 grid gap-3">
                {Object.entries(ADD_ON_CATALOG).map(([sku, item]) => (
                  <div key={sku} className="border-2 border-black bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{item.labelEn}</p>
                      <p className="font-black">฿{item.priceThb}</p>
                    </div>
                    <p className="mt-1 text-sm text-neutral-700">{item.shortEn}</p>
                    <p className="ep-stat mt-1 text-xs uppercase text-neutral-500">
                      {sku} · {item.kind}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </BrutalPanel>

        <BrutalPanel title="Stripe dashboard checklist" eyebrow="Create these">
          <ol className="list-decimal space-y-3 pl-5 text-sm text-neutral-700">
            <li>
              Create three Stripe Prices in THB for plan checkout:
              <div className="mt-1 font-semibold text-neutral-900">
                Basic ฿399, Premium ฿699, VIP ฿999.
              </div>
            </li>
            <li>
              Copy those Stripe Price IDs into Vercel as{" "}
              <code className="ep-stat">STRIPE_PRICE_BASIC</code>,{" "}
              <code className="ep-stat">STRIPE_PRICE_PREMIUM</code>, and{" "}
              <code className="ep-stat">STRIPE_PRICE_VIP</code>.
            </li>
            <li>
              Add a webhook endpoint in Stripe pointing to:
              <div className="mt-1 break-all font-semibold text-neutral-900">{webhookUrl}</div>
            </li>
            <li>
              Subscribe the webhook to:
              <div className="mt-1 font-semibold text-neutral-900">
              <code className="ep-stat">checkout.session.completed</code>,{" "}
              <code className="ep-stat">checkout.session.async_payment_succeeded</code>, and{" "}
              <code className="ep-stat">invoice.payment_failed</code>.
            </div>
          </li>
          <li>
            Update your Stripe Dashboard product names for saved plan Prices if you want the plan
            line items themselves to show Thai-first naming. Hosted Checkout styling from code is now
            Thai-first, but saved Price product names still come from Stripe Dashboard.
          </li>
          <li>
            Copy the webhook signing secret into Vercel as{" "}
            <code className="ep-stat">STRIPE_WEBHOOK_SECRET</code>.
          </li>
            <li>
              Add <code className="ep-stat">NEXT_PUBLIC_SITE_URL</code> using your real production
              domain so Stripe returns users to the correct site after payment.
            </li>
            <li>
              Redeploy Vercel after env changes, then test one plan payment and one add-on payment in
              Stripe test mode before turning on live mode.
            </li>
          </ol>
        </BrutalPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <BrutalPanel title="Vercel variables to add" eyebrow="Paste these">
          <pre className="overflow-x-auto border-2 border-black bg-neutral-950 p-4 text-xs text-lime-200">
{`NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_VIP=price_...
STRIPE_CHECKOUT_LOGO_URL=https://your-domain.example/stripe-logo.png
STRIPE_CHECKOUT_ICON_URL=https://your-domain.example/stripe-icon.png
SUPABASE_SERVICE_ROLE_KEY=...`}
          </pre>
        </BrutalPanel>

        <BrutalPanel title="Live QA flow" eyebrow="Run these after deploy">
          <ol className="list-decimal space-y-3 pl-5 text-sm text-neutral-700">
            <li>Buy Basic with Stripe card checkout and confirm the profile tier becomes Basic.</li>
            <li>Check that the plan expiry moves forward by 30 days and AI usage resets to zero.</li>
            <li>Buy one add-on mock pack and confirm a paid row appears in addon credit purchases.</li>
            <li>Buy one AI feedback add-on with PromptPay and confirm payment history stores <code className="ep-stat">promptpay</code>.</li>
            <li>Open the pricing page and quota summary to confirm the new credits appear without admin intervention.</li>
          </ol>
        </BrutalPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <BrutalPanel title="Recommended Thai Stripe Naming" eyebrow="Copy into Stripe">
          <div className="space-y-4 text-sm text-neutral-700">
            <div className="border-2 border-black bg-white p-3">
              <p className="font-black text-neutral-900">Business / display name</p>
              <p className="mt-1 font-semibold">English Plan DET Prep</p>
              <p className="mt-1 text-xs text-neutral-500">
                Keep this short and readable on mobile. It already matches the Checkout styling sent by code.
              </p>
            </div>

            <div className="border-2 border-black bg-white p-3">
              <p className="font-black text-neutral-900">Plan product names</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><code className="ep-stat">แพ็กเกจ Basic 30 วัน</code></li>
                <li><code className="ep-stat">แพ็กเกจ Premium 30 วัน</code></li>
                <li><code className="ep-stat">แพ็กเกจ VIP 30 วัน</code></li>
              </ul>
            </div>

            <div className="border-2 border-black bg-white p-3">
              <p className="font-black text-neutral-900">Suggested plan descriptions</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><code className="ep-stat">สิทธิ์ใช้งาน 30 วัน พร้อม AI Feedback และ Mock Test ตามแพ็กเกจ</code></li>
                <li><code className="ep-stat">ไม่มีการตัดต่ออายุอัตโนมัติ</code></li>
              </ul>
            </div>

            <div className="border-2 border-black bg-white p-3">
              <p className="font-black text-neutral-900">Optional add-on labels already sent by code</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><code className="ep-stat">Mock Test เพิ่ม 1 ครั้ง</code></li>
                <li><code className="ep-stat">Mock Test เพิ่ม 2 ครั้ง</code></li>
                <li><code className="ep-stat">เครดิต AI Feedback 1 ครั้ง</code></li>
                <li><code className="ep-stat">เครดิต AI Feedback 3 ครั้ง</code></li>
                <li><code className="ep-stat">เครดิต AI Feedback 5 ครั้ง</code></li>
              </ul>
            </div>
          </div>
        </BrutalPanel>

        <BrutalPanel title="Recommended Brand Look" eyebrow="Hosted Checkout">
          <div className="space-y-4 text-sm text-neutral-700">
            <div className="border-2 border-black bg-white p-3">
              <p className="font-black text-neutral-900">Colors already used in code</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><code className="ep-stat">Button: #004AAD</code></li>
                <li><code className="ep-stat">Background: #FFF8DC</code></li>
                <li><code className="ep-stat">Shape: rounded</code></li>
                <li><code className="ep-stat">Font: Pridi</code></li>
              </ul>
            </div>

            <div className="border-2 border-black bg-white p-3">
              <p className="font-black text-neutral-900">Logo recommendation</p>
              <p className="mt-1">
                Use a wide logo with strong contrast, ideally dark blue on transparent or light background.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Best if the text stays readable at small size and does not include too many details.
              </p>
            </div>

            <div className="border-2 border-black bg-white p-3">
              <p className="font-black text-neutral-900">Icon recommendation</p>
              <p className="mt-1">
                Use a square simplified mark, not the full wordmark. Keep it centered with generous padding.
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Good for mobile headers and faster visual recognition on Stripe pages.
              </p>
            </div>

            <div className="border-2 border-black bg-[#e0f2fe] p-3 font-semibold text-neutral-800">
              If you upload logo/icon URLs, Stripe-hosted Checkout will feel noticeably closer to the app
              even though the overall layout still follows Stripe’s hosted structure.
            </div>
          </div>
        </BrutalPanel>
      </section>
    </main>
  );
}
