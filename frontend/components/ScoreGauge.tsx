"use client";

interface ScoreGaugeProps {
  score: number; // 0-100
  size?: number;
}

function colorForScore(score: number) {
  if (score >= 80) return { track: "#C6DABF", fill: "#A3C596" };
  if (score >= 60) return { track: "#B7D3E8", fill: "#8FB8D8" };
  if (score >= 40) return { track: "#F5E3A8", fill: "#EAD27A" };
  return { track: "#F6C9CE", fill: "#E8A5AD" };
}

export default function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const { track, fill } = colorForScore(clamped);

  return (
    <div className="relative flex items-center justify-center clay-card p-4" style={{ width: size + 32, height: size + 32 }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fill}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-heading font-bold text-4xl text-clay-text">{clamped.toFixed(0)}</span>
        <span className="text-xs text-clay-textSoft font-medium">/ 100</span>
      </div>
    </div>
  );
}
