import { createRequestSupabase } from "@/lib/supabase-request-client";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

/** Signed-in learner id (cookie session on web, Bearer JWT on mobile); otherwise null. */
export async function getOptionalAuthUserId(request?: Request): Promise<string | null> {
  const supabase = request
    ? await createRequestSupabase(request)
    : await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
