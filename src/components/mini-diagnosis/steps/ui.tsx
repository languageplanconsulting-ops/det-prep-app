"use client";

import { useEffect, type ReactNode } from "react";

import { sfxTap } from "@/lib/exam-sfx";

/**
 * Shared soft, mobile-first UI kit for the mini-diagnosis test steps.
 * Design language: white cards on #f5f7fb, ep-blue/ep-yellow accents,
 * rounded-2xl, no hard brutalist shadows. Thai-first copy.
 */

export function SoftCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-2xl bg-ep-blue px-4 py-3.5 text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Selectable option row — soft card that fills blue when picked. */
export function OptionPill({
  label,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        sfxTap();
        onClick();
      }}
      className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.99] ${
        active
          ? "border-ep-blue bg-ep-blue text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-800 hover:border-ep-blue/40 hover:bg-blue-50/50"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {active ? <span aria-hidden>✓</span> : null}
      </span>
    </button>
  );
}

/** Mascot speech bubble — พี่ดอย guides each step. */
export function MascotTip({
  text,
  sub,
  size = "md",
}: {
  text: string;
  sub?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className="flex items-end gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
      <img
        src="/mascot-doy.png"
        alt=""
        className={`${size === "lg" ? "h-16 w-16" : "h-12 w-12"} shrink-0 object-contain`}
      />
      <div className="relative flex-1 rounded-2xl rounded-bl-md border border-blue-100 bg-blue-50 px-3.5 py-2.5">
        <p className="text-sm font-semibold leading-snug text-slate-800">{text}</p>
        {sub ? <p className="mt-0.5 text-xs leading-snug text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}

/** Bottom sheet for mobile-first option picking (tap-a-blank → options). */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="ปิด"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/45"
      />
      <div className="relative z-10 max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-xl sm:max-w-md sm:rounded-3xl sm:pb-5 animate-[minidiag-sheet-up_0.22s_ease-out]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        {title ? <p className="mb-3 text-base font-bold text-slate-900">{title}</p> : null}
        {children}
      </div>
      <style>{`@keyframes minidiag-sheet-up { from { transform: translateY(28px); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

/** CSS-only confetti burst for step celebrations. */
export function ConfettiBurst() {
  const pieces = Array.from({ length: 14 });
  const colors = ["#004AAD", "#FFCC00", "#10B981", "#F43F5E", "#8B5CF6"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((_, i) => {
        const left = 8 + ((i * 37) % 84);
        const delay = (i % 7) * 0.06;
        const color = colors[i % colors.length];
        const rot = (i * 47) % 360;
        return (
          <span
            key={i}
            className="absolute top-1/3 block h-2.5 w-1.5 rounded-[2px]"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              transform: `rotate(${rot}deg)`,
              animation: `minidiag-confetti 0.9s ease-out ${delay}s forwards`,
              opacity: 0,
            }}
          />
        );
      })}
      <style>{`@keyframes minidiag-confetti {
        0% { opacity: 1; transform: translateY(0) rotate(0deg); }
        100% { opacity: 0; transform: translateY(110px) rotate(320deg); }
      }`}</style>
    </div>
  );
}

/** Animated 4-bar equalizer shown while audio is playing. */
export function EqualizerBars({ playing }: { playing: boolean }) {
  return (
    <span className="inline-flex h-5 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[4px] rounded-full bg-current"
          style={
            playing
              ? { animation: `minidiag-eq 0.8s ease-in-out ${i * 0.15}s infinite alternate`, height: "30%" }
              : { height: "30%" }
          }
        />
      ))}
      <style>{`@keyframes minidiag-eq { from { height: 25%; } to { height: 100%; } }`}</style>
    </span>
  );
}

/** Tappable blank chip inside a passage. */
export function BlankChip({
  value,
  number,
  state,
  onClick,
}: {
  value: string;
  number: number;
  /** empty = not answered · filled = user pick · locked = showing final word */
  state: "empty" | "filled" | "locked";
  onClick?: () => void;
}) {
  const base =
    "mx-0.5 inline-flex min-w-[3.5rem] items-center justify-center gap-1 rounded-lg border-2 px-2 py-0.5 align-baseline text-sm font-bold transition";
  if (state === "locked") {
    return (
      <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}>{value}</span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        state === "filled"
          ? `${base} border-ep-blue bg-blue-50 text-ep-blue active:scale-95`
          : `${base} animate-pulse border-dashed border-ep-blue/60 bg-ep-yellow/20 text-ep-blue active:scale-95`
      }
    >
      {state === "filled" ? (
        <>
          {value}
          <span className="text-[10px]" aria-hidden>
            ✎
          </span>
        </>
      ) : (
        <>
          <span className="text-slate-400">___</span>
          <span className="rounded bg-ep-blue px-1 text-[10px] font-black text-white">{number}</span>
        </>
      )}
    </button>
  );
}
