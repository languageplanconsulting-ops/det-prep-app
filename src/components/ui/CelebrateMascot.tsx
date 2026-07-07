/**
 * Finish-screen celebration block — mascot in its thumbs-up pose + a
 * title/subtitle. Web port of det-mobile's CelebrateMascot (src/components/coach.tsx).
 */
export function CelebrateMascot({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mascot-great.png" alt="" width={110} height={110} style={{ width: 110, height: 110, objectFit: "contain" }} />
      <p className="mt-2 text-2xl font-bold text-slate-900">{title}</p>
      {subtitle ? <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
