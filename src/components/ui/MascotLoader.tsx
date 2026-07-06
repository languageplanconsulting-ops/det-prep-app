/**
 * Loading state with the mascot running in a looping, transparent animation —
 * replaces bare spinners / "..." text for "checking / processing / loading"
 * moments across the app. `<img>` (not next/image) so the animated PNG plays
 * frame-by-frame instead of being flattened by the image optimizer.
 */
export function MascotLoader({
  label = "กำลังโหลด…",
  size = 120,
}: {
  label?: string;
  size?: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-sm bg-white p-8 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot-running-loop.png"
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      <p className="text-sm font-bold text-neutral-500">{label}</p>
    </div>
  );
}

/**
 * Same mascot loader, but floats OVER existing content (dimmed backdrop)
 * instead of replacing the section — for "submitting / grading" moments where
 * the screen behind it should stay visible.
 */
export function MascotLoaderOverlay({
  label = "กำลังตรวจ…",
  visible = true,
}: {
  label?: string;
  visible?: boolean;
}) {
  if (!visible) return null;
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#f7f8fb]/90"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <MascotLoader label={label} size={100} />
    </div>
  );
}
