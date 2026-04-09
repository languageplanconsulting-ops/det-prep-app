"use client";

type Props = {
  isPlaying: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** e.g. "Click to listen to the scenario" */
  label: string;
  subLabel?: string;
  size?: "lg" | "md";
};

/**
 * Person silhouette + optional sound rings; animates while audio plays.
 */
export function ConversationSpeakerButton({
  isPlaying,
  disabled,
  onClick,
  label,
  subLabel,
  size = "lg",
}: Props) {
  const dim = size === "lg" ? "h-28 w-28 sm:h-36 sm:w-36" : "h-20 w-20 sm:h-24 sm:w-24";
  const headR = size === "lg" ? 22 : 16;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group ep-conv-speak-btn relative flex w-full max-w-md flex-col items-center gap-3 rounded-sm border-4 border-black bg-gradient-to-b from-ep-yellow/40 to-white p-4 text-center shadow-[6px_6px_0_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-50 ${
        isPlaying ? "ep-conv-speak-btn--playing" : ""
      }`}
    >
      <span className="relative flex items-center justify-center">
        {isPlaying ? (
          <>
            <span className="ep-conv-soundwave ep-conv-soundwave--1 absolute inline-flex rounded-full border-4 border-ep-blue/50" />
            <span className="ep-conv-soundwave ep-conv-soundwave--2 absolute inline-flex rounded-full border-4 border-ep-blue/35" />
            <span className="ep-conv-soundwave ep-conv-soundwave--3 absolute inline-flex rounded-full border-4 border-ep-blue/20" />
          </>
        ) : null}
        <span
          className={`relative z-[1] flex ${dim} items-center justify-center rounded-full border-4 border-black bg-ep-blue text-white shadow-[4px_4px_0_0_#000] ${
            isPlaying ? "ep-conv-speak-bob" : "group-hover:scale-[1.02]"
          }`}
        >
          <svg
            viewBox="0 0 64 80"
            className="h-[70%] w-[70%]"
            fill="currentColor"
            aria-hidden
          >
            <circle cx="32" cy="22" r={headR} />
            <path d="M12 72 Q32 48 52 72 L52 80 L12 80 Z" />
            {isPlaying ? <ellipse cx="32" cy="54" rx="9" ry="5" fill="white" opacity={0.95} /> : null}
          </svg>
        </span>
      </span>
      <span className="px-2">
        <span className="block text-sm font-black uppercase tracking-wide text-neutral-900">{label}</span>
        {subLabel ? (
          <span className="mt-1 block text-xs font-semibold text-neutral-600">{subLabel}</span>
        ) : null}
      </span>
    </button>
  );
}
