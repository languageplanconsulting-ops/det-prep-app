import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const userId = (body as Record<string, unknown>).userId;
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabaseAuth = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.id !== userId) {
    return NextResponse.json({ error: "Forbidden: userId does not match session" }, { status: 403 });
  }

  try {
    const admin = createServiceRoleSupabase();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const customerId = profile?.stripe_customer_id as string | null | undefined;
    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer on file. Subscribe via checkout first." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/practice`,
    });

    if (!portal.url) {
      return NextResponse.json({ error: "Portal did not return a URL" }, { status: 500 });
    }

    return NextResponse.json({ url: portal.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Portal session failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
