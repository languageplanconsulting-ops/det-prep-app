"use client";

/**
 * Renders a two-paragraph passage as individually clickable words. Word
 * indices are per-paragraph (0-based, non-whitespace tokens only) so they
 * line up with `phraseWordRange` from lib/passage-text. Simplified web port
 * of det-mobile's PassageWords — feedback is shown inline below the passage
 * instead of a floating measured-anchor callout (DOM flow handles this for
 * free, no measurement hack needed).
 */

export type PassageHighlight = {
  paragraph: 1 | 2;
  start: number;
  end: number;
  color: "yellow" | "green" | "red" | "blue";
};

const HI_CLASS: Record<PassageHighlight["color"], string> = {
  yellow: "bg-amber-100 border-b-2 border-amber-400",
  green: "bg-emerald-100 border-b-2 border-emerald-500",
  red: "bg-rose-100 border-b-2 border-rose-500",
  blue: "bg-blue-100 border-b-2 border-[#004AAD]",
};

export function PassageWords({
  paragraph1,
  paragraph2,
  highlights = [],
  onWordPress,
}: {
  paragraph1: string;
  paragraph2: string;
  highlights?: PassageHighlight[];
  onWordPress?: (paragraph: 1 | 2, wordIndex: number) => void;
}) {
  function renderParagraph(text: string, pnum: 1 | 2) {
    if (!text) return null;
    const chunks = text.split(/(\s+)/);
    let wordIdx = -1;
    return chunks.map((chunk, ci) => {
      if (!/\S/.test(chunk)) return <span key={ci}>{chunk}</span>;
      wordIdx += 1;
      const idx = wordIdx;
      const hi = highlights.find((h) => h.paragraph === pnum && idx >= h.start && idx <= h.end);
      return (
        <span
          key={ci}
          onClick={onWordPress ? () => onWordPress(pnum, idx) : undefined}
          className={`${onWordPress ? "cursor-pointer" : ""} ${hi ? HI_CLASS[hi.color] : ""} rounded-sm`}
        >
          {chunk}
        </span>
      );
    });
  }

  return (
    <p className="text-sm leading-7 text-slate-800">
      {renderParagraph(paragraph1, 1)}
      {paragraph1 && paragraph2 ? " " : null}
      {renderParagraph(paragraph2, 2)}
    </p>
  );
}
