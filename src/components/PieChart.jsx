import React from "react";

// Simple SVG Pie Chart component
// props: data: Array<{ label: string, value: number, color?: string }>, size: number
export default function PieChart({ data, size = 160, strokeWidth = 24 }) {
  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  const segments = data.map((d, idx) => {
    const value = Number(d.value) || 0;
    const portion = total > 0 ? value / total : 0;
    const dash = portion * circumference;
    const gap = circumference - dash;
    const offset = -cumulative * circumference;
    cumulative += portion;

    const color = d.color || defaultColors[idx % defaultColors.length];

    return (
      <circle
        key={idx}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease" }}
      />
    );
  });

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="#fff"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {segments}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                background: d.color || defaultColors[i % defaultColors.length],
                display: "inline-block",
                borderRadius: 2,
              }}
            />
            <span style={{ fontSize: 14, color: "#374151" }}>
              {d.label}: {Number(d.value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const defaultColors = [
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#f472b6", // pink-400
];
