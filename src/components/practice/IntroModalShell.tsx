"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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

  if (!mounted || !portalReady) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] overflow-hidden bg-black/35 p-4 backdrop-blur-[1.5px] md:p-6 ${
        visible ? "opacity-100" : "opacity-0"
      } transition-opacity duration-200 ease-out`}
      style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, 'Anuphan', sans-serif" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onDismiss}
    >
      <div className="grid h-full place-items-center">
        <div
          className={`flex h-[min(86vh,720px)] w-full ${maxWidthClassName} flex-col overflow-hidden border-4 border-[#111] bg-white shadow-[8px_8px_0_0_#111] transition duration-200 ease-out ${
            visible ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.97]"
          }`}
          style={{
            backgroundImage: "radial-gradient(#111 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundColor,
          }}
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
    </div>,
    document.body,
  );
}
