# Stripe Billing Setup

This app already supports:

- 30-day one-time plan access purchases for `basic`, `premium`, and `vip`
- one-off add-ons for extra mock tests
- one-off add-ons for extra AI feedback credits

Important:

- Plans are **not** true auto-renewing Stripe subscriptions yet.
- Current plan checkout uses Stripe Checkout in `mode: payment`.
- Add-ons use dynamic `price_data` and do **not** need saved Stripe Price IDs.

## Vercel env vars

Add these environment variables in Vercel:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_VIP=price_...
STRIPE_CHECKOUT_LOGO_URL=https://your-domain.example/stripe-logo.png
STRIPE_CHECKOUT_ICON_URL=https://your-domain.example/stripe-icon.png
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional branding env vars:

- `STRIPE_CHECKOUT_LOGO_URL`
- `STRIPE_CHECKOUT_ICON_URL`

If provided, Stripe-hosted Checkout uses them for branded visuals.

## Stripe dashboard setup

Create three THB Prices for one-time plan purchases:

- Basic: `฿399`
- Premium: `฿699`
- VIP: `฿999`

If you want Thai-first plan names on the Stripe-hosted page itself, update the Stripe Dashboard
product names attached to those saved Prices in Thai as well. Add-on names already come from code.

Copy those Price IDs into:

- `STRIPE_PRICE_BASIC`
- `STRIPE_PRICE_PREMIUM`
- `STRIPE_PRICE_VIP`

Add a webhook endpoint:

```text
https://your-domain.example/api/stripe/webhook
```

Subscribe the endpoint to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `invoice.payment_failed`

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## What the webhook does

- plan purchase:
  - upgrades the profile tier
  - extends access by 30 days
  - resets AI usage counters
  - inserts a `payment_history` row
- add-on purchase:
  - marks `addon_credit_purchases` as paid
  - stores the Stripe payment intent ID
  - inserts a `payment_history` row

## Hosted Checkout branding now set in code

The app now sends these hosted Checkout preferences on each session:

- locale: `th`
- display name: `English Plan DET Prep`
- background color: `#FFF8DC`
- button color: `#004AAD`
- border style: `rounded`
- font family: `pridi`
- Thai custom submit and confirmation helper text

## Recommended Thai dashboard copy

Use these names in Stripe Dashboard for saved plan Prices:

- `แพ็กเกจ Basic 30 วัน`
- `แพ็กเกจ Premium 30 วัน`
- `แพ็กเกจ VIP 30 วัน`

Suggested short product description:

- `สิทธิ์ใช้งาน 30 วัน พร้อม AI Feedback และ Mock Test ตามแพ็กเกจ`
- `ไม่มีการตัดต่ออายุอัตโนมัติ`

Suggested business/display name:

- `English Plan DET Prep`

## Recommended logo and icon

- logo: wide horizontal wordmark, dark blue preferred, transparent or very light background
- icon: square simplified mark, centered, minimal detail
- keep both visually consistent with app colors:
  - blue: `#004AAD`
  - soft cream background: `#FFF8DC`

## QA checklist

1. Buy Basic with Stripe card checkout.
2. Confirm the learner profile switches to `basic`.
3. Confirm `tier_expires_at` moves forward by 30 days.
4. Buy one mock add-on and confirm a paid row appears in `addon_credit_purchases`.
5. Buy one AI feedback add-on with PromptPay and confirm the payment history row shows `promptpay`.

## Current routes

- plan card checkout: `src/app/api/stripe/create-checkout/route.ts`
- plan PromptPay checkout: `src/app/api/stripe/create-plan-invoice/route.ts`
- add-on checkout: `src/app/api/stripe/create-addon-checkout/route.ts`
- webhook: `src/app/api/stripe/webhook/route.ts`
- pricing page: `src/app/pricing/page.tsx`
- admin setup page: `src/app/admin/billing/page.tsx`
