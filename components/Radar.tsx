"use client";
import { SLICES, type Scores } from "@/lib/framework";

// The Human 3.0 radar, drawn in the style of the article's graphics:
// red (1.0), blue (2.0) and green (3.0) bands, each split into three phase
// rings, 12 slices, black axes, and a translucent white shape for your scores.

const BANDS = [
  { inner: "#f8c9c9", outer: "#e64848" }, // red
  { inner: "#c4dafc", outer: "#3f86ef" }, // blue
  { inner: "#d4fbc4", outer: "#5ee33a" }, // green
];

export default function Radar({
  scores,
  previous,
  size = 520,
  labels = true,
}: {
  scores: Scores;
  previous?: Scores | null;
  size?: number;
  labels?: boolean;
}) {
  const pad = labels ? 70 : 24;
  const R = size / 2 - pad;
  const c = size / 2;
  const hub = R * 0.09;
  const rAt = (v: number) => hub + (v / 9) * (R - hub);
  const angle = (i: number) => ((i + 0.5) * 30 - 90) * (Math.PI / 180); // slice centers, clockwise from top
  const pt = (i: number, r: number) => [c + r * Math.cos(angle(i)), c + r * Math.sin(angle(i))];
  const shape = (s: Scores) =>
    SLICES.map((sl, i) => pt(i, rAt(s[sl.id] ?? 1)).map((n) => n.toFixed(1)).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: "block" }} role="img" aria-label="Human 3.0 radar chart">
      <defs>
        {BANDS.map((b, i) => {
          const r0 = rAt(i * 3);
          const r1 = rAt(i * 3 + 3);
          return (
            <radialGradient key={i} id={`band${i}`} cx={c} cy={c} r={r1} gradientUnits="userSpaceOnUse">
              <stop offset={r0 / r1} stopColor={b.inner} />
              <stop offset={1} stopColor={b.outer} />
            </radialGradient>
          );
        })}
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#111" />
        </marker>
      </defs>

      {/* bands, outermost first */}
      {[2, 1, 0].map((i) => (
        <circle key={i} cx={c} cy={c} r={rAt(i * 3 + 3)} fill={`url(#band${i})`} />
      ))}
      {/* phase rings */}
      {Array.from({ length: 8 }, (_, k) => k + 1).map((v) => (
        <circle key={v} cx={c} cy={c} r={rAt(v)} fill="none" stroke="#fff" strokeOpacity={v % 3 === 0 ? 0.9 : 0.45} strokeWidth={v % 3 === 0 ? 1.6 : 1} strokeDasharray={v % 3 === 0 ? undefined : "2 4"} />
      ))}
      {/* 12 spokes */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        return <line key={i} x1={c + hub * Math.cos(a)} y1={c + hub * Math.sin(a)} x2={c + R * Math.cos(a)} y2={c + R * Math.sin(a)} stroke="#fff" strokeOpacity={0.85} strokeWidth={1.4} />;
      })}

      {/* previous week, dashed */}
      {previous && <polygon points={shape(previous)} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="5 5" strokeOpacity={0.95} />}
      {/* current shape */}
      <polygon points={shape(scores)} fill="#ffffff" fillOpacity={0.62} stroke="#ffffff" strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={shape(scores)} fill="none" stroke="#1d2b4f" strokeOpacity={0.25} strokeWidth={1} strokeLinejoin="round" />

      {/* axes */}
      <line x1={c} y1={c + R + pad * 0.55} x2={c} y2={c - R - pad * 0.55} stroke="#111" strokeWidth={labels ? 2 : 1} markerEnd={labels ? "url(#arrow)" : undefined} markerStart={labels ? "url(#arrow)" : undefined} />
      <line x1={c - R - pad * 0.55} y1={c} x2={c + R + pad * 0.55} y2={c} stroke="#111" strokeWidth={labels ? 2 : 1} markerEnd={labels ? "url(#arrow)" : undefined} markerStart={labels ? "url(#arrow)" : undefined} />
      <circle cx={c} cy={c} r={hub} fill="#fff" stroke="#111" strokeWidth={2} />

      {labels &&
        SLICES.map((s, i) => {
          const [x, y] = pt(i, R + 26);
          const w = s.name.length * 7.4 + 18;
          return (
            <g key={s.id}>
              <rect x={x - w / 2} y={y - 12} width={w} height={24} rx={7} fill="#fff" stroke="#e6e6e6" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.12))" }} />
              <text x={x} y={y + 4.5} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#111">
                {s.name}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
