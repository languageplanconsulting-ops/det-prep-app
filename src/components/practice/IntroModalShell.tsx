"use client";

import { useEffect, useState, type ReactNode } from "react";

type IntroModalShellProps = {
  open: boolean;
  onDismiss: () => void;
  labelledBy: string;
  title: ReactNode;
  badge: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  maxWidthClassName?: string;
  backgroundColor?: string;
};

export function IntroModalShell({
  open,
  onDismiss,
  labelledBy,
  title,
  badge,
  children,
  footer,
  maxWidthClassName = "max-w-2xl",
  backgroundColor = "#f3f4f6",
}: IntroModalShellProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-y-auto overscroll-contain p-4 md:p-6 ${
        visible ? "opacity-100" : "opacity-0"
      } transition-opacity duration-200 ease-out`}
      style={{
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, 'Anuphan', sans-serif",
        backgroundImage: "radial-gradient(#111 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        backgroundColor,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onDismiss}
    >
      <div className="flex min-h-full items-center justify-center py-2 md:py-4">
        <div
          className={`flex max-h-[min(88vh,760px)] w-full ${maxWidthClassName} flex-col overflow-hidden border-4 border-[#111] bg-white shadow-[8px_8px_0_0_#111] transition duration-200 ease-out ${
            visible ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.97]"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b-4 border-black px-6 pb-4 pt-6 md:px-8 md:pt-8">
            <div>
              <h1 id={labelledBy} className="text-2xl font-black uppercase italic leading-none tracking-tighter sm:text-3xl">
                {title}
              </h1>
            </div>
            {badge}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8">
            {children}
          </div>

          <div className="border-t-4 border-black bg-white px-6 py-5 md:px-8">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
