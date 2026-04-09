/**
 * Soft, slow loading surface — avoids abrupt “Loading…” flashes.
 */
export function LuxuryLoader({
  label = "Preparing your view…",
}: {
  label?: string;
}) {
  return (
    <div
      className="ep-luxury-loader ep-brutal-reading rounded-sm bg-white p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
        {label}
      </p>
      <div className="mt-6 space-y-4">
        <div className="ep-luxury-loader__bar h-3 rounded-sm bg-neutral-200/80" />
        <div className="ep-luxury-loader__bar ep-luxury-loader__bar--delay h-3 w-4/5 rounded-sm bg-neutral-200/80" />
        <div className="ep-luxury-loader__bar ep-luxury-loader__bar--delay2 h-3 w-3/5 rounded-sm bg-neutral-200/80" />
      </div>
    </div>
  );
}
