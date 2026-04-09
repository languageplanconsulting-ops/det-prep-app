"use client";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface SimplePieChartProps {
  slices: PieSlice[];
  size?: number;
}

/** Pie slices from center; `value` is share (e.g. minutes). */
export function SimplePieChart({ slices, size = 200 }: SimplePieChartProps) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  if (total <= 0) {
    return (
      <svg width={size} height={size} className="shrink-0 text-neutral-200" aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="#000" strokeWidth={2} />
      </svg>
    );
  }

  let angle = 0;
  const paths: { d: string; color: string; key: string }[] = [];

  for (const s of slices) {
    if (s.value <= 0) continue;
    const sweep = (s.value / total) * 360;
    if (sweep <= 0) continue;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;

    const p0 = polar(cx, cy, r, a0);
    const p1 = polar(cx, cy, r, a1);
    const largeArc = sweep > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;
    paths.push({ d, color: s.color, key: s.label });
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label="Time share by skill"
    >
      {paths.map((p) => (
        <path key={p.key} d={p.d} fill={p.color} stroke="#000" strokeWidth={2} />
      ))}
    </svg>
  );
}
