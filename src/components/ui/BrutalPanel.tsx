import type { ReactNode } from "react";

interface BrutalPanelProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "accent";
}

export function BrutalPanel({
  title,
  eyebrow,
  children,
  className = "",
  variant = "default",
}: BrutalPanelProps) {
  const bg =
    variant === "accent"
      ? "bg-ep-yellow/25 border-ep-blue"
      : "bg-white border-black";
  return (
    <section
      className={`ep-brutal-sm ${bg} rounded-sm p-4 ${className}`}
    >
      {eyebrow ? (
        <p className="ep-stat mb-1 text-[10px] font-bold uppercase tracking-widest text-ep-blue">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className="mb-3 text-lg font-extrabold tracking-tight text-neutral-900">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
