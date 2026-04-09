import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Promotes the fixed bootstrap admin email via Postgres RPC (works immediately
 * after signInWithPassword — no waiting for HTTP cookies).
 * Apply migration `006_claim_bootstrap_admin_rpc.sql` in Supabase.
 */
export async function claimBootstrapAdminClient(
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await supabase.rpc("claim_bootstrap_admin");
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (
      msg.includes("function") &&
      (msg.includes("does not exist") || msg.includes("schema cache"))
    ) {
      console.warn(
        "[claimBootstrapAdmin] Run migration 006_claim_bootstrap_admin_rpc.sql in Supabase SQL editor.",
      );
      return;
    }
    console.warn("[claimBootstrapAdmin]", error.message);
  }
}
