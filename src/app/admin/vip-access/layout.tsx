import Link from "next/link";

const links = [
  { href: "/admin/vip-access", label: "VIP access" },
  { href: "/admin", label: "Bulk upload" },
  { href: "/admin/mock-test/upload", label: "Mock test" },
] as const;

export default function AdminVIPAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside
        className="w-full shrink-0 border-b-4 border-black bg-[#004AAD] p-4 text-[#FFCC00] md:w-56 md:border-b-0 md:border-r-4"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        <p className="text-xs font-black uppercase tracking-widest">
          Admin / ผู้ดูแล
        </p>
        <nav className="mt-4 flex flex-col gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-[4px] border-2 border-black bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/practice"
          className="mt-6 block text-xs font-bold underline"
        >
          ← Practice / ฝึกซ้อม
        </Link>
      </aside>
      <div className="min-h-0 flex-1 bg-white p-6">{children}</div>
    </div>
  );
}
