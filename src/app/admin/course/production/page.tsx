import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminCourseProductionRedirect() {
  redirect("/admin/course?tab=production");
}
