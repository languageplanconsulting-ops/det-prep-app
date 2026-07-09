/**
 * Per-row fade+rise delay for report lists (vocabulary to remember,
 * right/wrong question rows, explanations) — mirrors the mobile app's
 * StaggerIn (src/components/StaggerIn.tsx). Spread the result into a
 * `className`/`style` pair on the row itself (li, div, ...) so a list
 * reveals as a soft cascade instead of every row appearing at once:
 *
 *   <li key={i} className={`... ${staggerIn(i).className}`} style={staggerIn(i).style}>
 */
export function staggerIn(index: number, step = 30, maxDelay = 400) {
  return {
    className: "ep-stagger-in",
    style: { animationDelay: `${Math.min(index * step, maxDelay)}ms` },
  };
}
