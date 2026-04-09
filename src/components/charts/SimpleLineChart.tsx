"use client";

interface Point {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  data: Point[];
  maxMinutes?: number;
  height?: number;
}

export function SimpleLineChart({
  data,
  maxMinutes,
  height = 120,
}: SimpleLineChartProps) {
  const max = maxMinutes ?? Math.max(1, ...data.map((d) => d.value));
  const w = 320;
  const h = height;
  const pad = 8;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;

  const pts = data.map((d, i) => {
    const x = pad + i * step;
    const y = pad + innerH - (d.value / max) * innerH;
    return { x, y, ...d };
  });

  const dPath =
    pts.length === 0
      ? ""
      : pts.reduce((acc, p, i) => {
          return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
        }, "");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full max-w-full"
      role="img"
      aria-label="Daily practice minutes"
    >
      <rect x={0} y={0} width={w} height={h} fill="transparent" />
      <path
        d={dPath}
        fill="none"
        stroke="#004aad"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#ffcc00" stroke="#0a0a0a" strokeWidth={2} />
          <text
            x={p.x}
            y={h - 2}
            textAnchor="middle"
            className="fill-black ep-stat"
            style={{ fontSize: 9 }}
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
