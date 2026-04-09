"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSimpleLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/simple-logout", {
        method: "POST",
        credentials: "same-origin",
      });
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void logout()}
      className="rounded-[4px] border-2 border-black bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
    >
      {busy ? "…" : "Sign out admin code"}
    </button>
  );
}
