import { NextResponse, type NextRequest } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/** Redirects to a short-lived signed URL for a lesson handout.
 *  Admin-only for now, matching the course page itself. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getAdminAccess(request);
  if (!access.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceRoleSupabase();

  const { data: file, error } = await supabase
    .from("course_downloads")
    .select("storage_path, file_name")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("course-downloads")
    .createSignedUrl(file.storage_path, 300, { download: file.file_name });

  if (signErr || !signed) {
    return NextResponse.json({ error: signErr?.message ?? "sign failed" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
