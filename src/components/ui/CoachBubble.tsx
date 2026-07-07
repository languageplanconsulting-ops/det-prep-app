/**
 * Mascot speech-bubble tip — web port of det-mobile's CoachBubble
 * (src/components/coach.tsx). Matches the "Tips from P'Doy" bubble already
 * used inline in the FITB/real-word exam screens, now shared so lesson
 * runners get the same mascot-backed tip instead of a plain colored box.
 */
export function CoachBubble({ children, label = "Tips from P'Doy" }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot-suggest.png"
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-full ring-[2.5px] ring-[#FFCC00]"
        style={{ objectFit: "cover" }}
      />
      <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
        <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          <span className="text-[11px] leading-none">✨</span>
          {label}
        </span>
        <p className="text-[13px] leading-6 text-slate-800">{children}</p>
      </div>
    </div>
  );
}
