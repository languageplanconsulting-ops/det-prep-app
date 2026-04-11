import type { ReactNode } from "react";

interface BrutalPanelProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  /** `elevated` = landing-style card (thick border + offset shadow), for production AI reports. */
  variant?: "default" | "accent" | "elevated";
}

export function BrutalPanel({
  title,
  eyebrow,
  children,
  className = "",
  variant = "default",
}: BrutalPanelProps) {
  const elevated = variant === "elevated";
  const bg =
    variant === "accent"
      ? "bg-ep-yellow/25 border-ep-blue"
      : "bg-white border-black";

  if (elevated) {
    return (
      <section
        className={`relative overflow-hidden rounded-sm border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000] ${className}`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#004AAD_0%,#FFCC00_50%,#004AAD_100%)]"
          aria-hidden
        />
        <div className="relative pt-3">
          {eyebrow ? (
            <p className="ep-stat mb-2 text-sm font-bold uppercase tracking-widest text-ep-blue">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="mb-4 text-xl font-black tracking-tight text-neutral-900">{title}</h2>
          ) : null}
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className={`ep-brutal-sm ${bg} rounded-sm p-4 ${className}`}>
      {eyebrow ? (
        <p className="ep-stat mb-1 text-[10px] font-bold uppercase tracking-widest text-ep-blue">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className="mb-3 text-lg font-extrabold tracking-tight text-neutral-900">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
