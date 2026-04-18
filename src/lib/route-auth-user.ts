import { createRouteHandlerSupabase } from "@/lib/supabase-route";

/** Signed-in learner id when session cookies are present; otherwise null. */
export async function getOptionalAuthUserId(): Promise<string | null> {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
