import { NextResponse, type NextRequest } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { resolveCourseAccess } from "@/lib/course-access";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRequestSupabase } from "@/lib/supabase-request-client";

/**
 * Redirects to a short-lived signed URL for a lesson handout.
 *
 * Authorised for admins (who preview the course pre-launch) and for students
 * who pass the same gate as the course page itself — otherwise the handout
 * buttons on the student page would 401 the moment the route is opened up.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let authorised = (await getAdminAccess(request)).ok;

  if (!authorised) {
    const userClient = await createRequestSupabase(request);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user) {
      const { data: profile } = await userClient
        .from("profiles")
        .select("role, tier, tier_expires_at, vip_granted_by_course")
        .eq("id", user.id)
        .maybeSingle();
      authorised = resolveCourseAccess(profile ?? null).allowed;
    }
  }

  if (!authorised) {
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
