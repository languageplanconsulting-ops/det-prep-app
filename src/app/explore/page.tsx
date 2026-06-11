import { redirect } from "next/navigation";

import { ExploreClient } from "@/components/explore/ExploreClient";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function ExplorePage() {
  // Admin-only preview of the new "browse the catalog → register free" funnel.
  // Non-admins fall back to the current free entry until it's approved.
  const adminAccess = await getAdminAccess();
  if (!adminAccess.ok) {
    redirect("/mini-diagnosis/start");
  }
  return <ExploreClient />;
}
