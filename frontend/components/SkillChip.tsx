interface SkillChipProps {
  label: string;
  variant: "matched" | "missing" | "partial" | "extra";
}

const variantStyles: Record<SkillChipProps["variant"], string> = {
  matched: "bg-clay-green text-clay-text",
  missing: "bg-clay-pink text-clay-text",
  partial: "bg-clay-yellow text-clay-text",
  extra: "bg-clay-blue text-clay-text",
};

export default function SkillChip({ label, variant }: SkillChipProps) {
  return <span className={`clay-chip ${variantStyles[variant]}`}>{label}</span>;
}
