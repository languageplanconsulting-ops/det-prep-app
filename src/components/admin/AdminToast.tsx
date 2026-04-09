"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type AdminToastType = "success" | "error" | "warning" | "info";

export type AdminToastItem = {
  id: string;
  type: AdminToastType;
  titleEn: string;
  titleTh?: string;
};

type Ctx = {
  push: (t: Omit<AdminToastItem, "id">) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useAdminToast must be used within AdminToastProvider");
  }
  return ctx;
}

function borderFor(t: AdminToastType) {
  switch (t) {
    case "success":
      return "border-[#004AAD] border-l-[6px] border-l-green-600";
    case "error":
      return "border-red-600 border-l-[6px] border-l-red-600";
    case "warning":
      return "border-[#FFCC00] border-l-[6px] border-l-[#FFCC00]";
    default:
      return "border-black border-l-[6px] border-l-neutral-500";
  }
}

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AdminToastItem[]>([]);

  const push = useCallback((t: Omit<AdminToastItem, "id">) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[200] flex max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-[4px] border-4 bg-white p-3 shadow-[4px_4px_0_0_#000] ${borderFor(t.type)}`}
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            <p className="text-sm font-bold text-neutral-900">{t.titleEn}</p>
            {t.titleTh ? (
              <p className="mt-1 text-xs text-neutral-600">{t.titleTh}</p>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
