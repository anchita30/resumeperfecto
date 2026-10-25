"use client";

type Mood = "idle" | "thinking" | "great" | "good" | "meh" | "sad";

interface MascotProps {
  mood: Mood;
  message?: string;
  size?: number;
}

const bodyColor = "#F6C9CE";
const bodyShadow = "#E8A5AD";
const cheekColor = "#F3A8B0";
const hatColor = "#B7D3E8";
const hatShadow = "#8FB8D8";

function Face({ mood }: { mood: Mood }) {
  switch (mood) {
    case "great":
      return (
        <g>
          {/* sparkly happy eyes */}
          <path d="M62 78 Q68 68 74 78" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M96 78 Q102 68 108 78" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M72 96 Q85 108 98 96" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case "good":
      return (
        <g>
          <circle cx="68" cy="76" r="4.5" fill="#5B4E44" />
          <circle cx="102" cy="76" r="4.5" fill="#5B4E44" />
          <path d="M72 96 Q85 104 98 96" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case "meh":
      return (
        <g>
          <circle cx="68" cy="76" r="4.5" fill="#5B4E44" />
          <circle cx="102" cy="76" r="4.5" fill="#5B4E44" />
          <line x1="74" y1="98" x2="96" y2="98" stroke="#5B4E44" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case "sad":
      return (
        <g>
          <path d="M63 80 Q68 74 73 80" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M97 80 Q102 74 107 80" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M73 102 Q85 92 97 102" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case "thinking":
      return (
        <g>
          <circle cx="68" cy="76" r="4.5" fill="#5B4E44" />
          <path d="M96 74 Q102 70 108 74" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="99" r="6" fill="none" stroke="#5B4E44" strokeWidth="4" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="68" cy="76" r="4.5" fill="#5B4E44" />
          <circle cx="102" cy="76" r="4.5" fill="#5B4E44" />
          <path d="M74 96 Q85 102 96 96" stroke="#5B4E44" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}

export default function Mascot({ mood, message, size = 120 }: MascotProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative flex-shrink-0 animate-[float_3.5s_ease-in-out_infinite]"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 170 190" width={size} height={size}>
          {/* knit hat */}
          <path
            d="M45 55 Q85 15 125 55 L125 68 Q85 50 45 68 Z"
            fill={hatColor}
            stroke={hatShadow}
            strokeWidth="2"
          />
          <circle cx="85" cy="20" r="9" fill={hatColor} stroke={hatShadow} strokeWidth="2" />

          {/* head */}
          <ellipse cx="85" cy="95" rx="55" ry="50" fill={bodyColor} stroke={bodyShadow} strokeWidth="2" />

          {/* cheeks */}
          <ellipse cx="55" cy="98" rx="9" ry="6" fill={cheekColor} opacity="0.7" />
          <ellipse cx="115" cy="98" rx="9" ry="6" fill={cheekColor} opacity="0.7" />

          <Face mood={mood} />

          {/* body/scarf hint */}
          <path
            d="M45 140 Q85 165 125 140 L125 175 Q85 190 45 175 Z"
            fill="#EAB88C"
            stroke="#DDA274"
            strokeWidth="2"
          />
        </svg>
      </div>
      {message && (
        <div className="clay-card-flat px-4 py-3 max-w-[220px] text-sm font-medium text-clay-text">
          {message}
        </div>
      )}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

export function moodFromScore(score: number): Mood {
  if (score >= 80) return "great";
  if (score >= 60) return "good";
  if (score >= 40) return "meh";
  return "sad";
}

export function messageFromScore(score: number): string {
  if (score >= 80) return "Amazing fit! This resume lines up really well with the role.";
  if (score >= 60) return "Good match — a few gaps to close, but a solid fit overall.";
  if (score >= 40) return "There's a moderate gap here. Check the missing skills below.";
  return "This one needs work — quite a few key skills seem to be missing.";
}
