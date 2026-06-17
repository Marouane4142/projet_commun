type Props = {
  value: number | null;
  label: string;
  caption?: string;
  size?: number;
};

function colorFor(value: number): string {
  if (value >= 75) return "#34d399";
  if (value >= 50) return "#facc15";
  if (value >= 30) return "#fb923c";
  return "#f87171";
}

/** Jauge circulaire 0-100 en SVG pur. */
export function GaugeRing({ value, label, caption, size = 96 }: Props) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = value ?? 0;
  const dash = (safe / 100) * circumference;
  const color = value == null ? "#475569" : colorFor(safe);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-xl font-black" style={{ color }}>
            {value == null ? "--" : Math.round(safe)}
          </span>
        </div>
      </div>
      <div>
        <div className="text-sm font-bold text-slate-200">{label}</div>
        {caption && <div className="text-[11px] text-slate-500">{caption}</div>}
      </div>
    </div>
  );
}
