import { AdminShellBar } from "@/components/admin/AdminShellBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminShellBar />
      {children}
    </>
  );
}
