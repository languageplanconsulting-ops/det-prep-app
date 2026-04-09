import Link from "next/link";

import { AdminToastProvider } from "@/components/admin/AdminToast";

const links = [
  { href: "/admin/subscriptions", label: "Subscriptions / สมาชิก" },
  { href: "/admin/subscriptions/bulk", label: "Bulk / จัดการกลุ่ม" },
  { href: "/admin/subscriptions/revenue", label: "Revenue / รายได้" },
] as const;

export default function AdminSubscriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminToastProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside
          className="w-full shrink-0 border-b-4 border-black bg-[#004AAD] p-4 text-white md:w-56 md:border-b-0 md:border-r-4"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          <p className="text-xs font-black uppercase tracking-widest">
            EnglishPlan Admin
          </p>
          <nav className="mt-4 flex flex-col gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-[4px] border-2 border-white/40 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/admin"
            className="mt-6 block text-xs font-bold text-white underline"
          >
            ← Admin home
          </Link>
        </aside>
        <div className="min-h-0 flex-1 bg-white p-6">{children}</div>
      </div>
    </AdminToastProvider>
  );
}
