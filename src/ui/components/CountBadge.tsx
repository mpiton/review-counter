import type { SectionTone } from "./types";

interface CountBadgeProps {
  readonly count: number;
  readonly threshold?: number;
  readonly tone: SectionTone;
}

const accentBadgeClassNames: Record<SectionTone, string> = {
  backend:
    "border-[color-mix(in_srgb,var(--accent-be)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent-be)_16%,transparent)] text-[var(--accent-be)]",
  frontend:
    "border-[color-mix(in_srgb,var(--accent-fe)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent-fe)_16%,transparent)] text-[var(--accent-fe)]",
  muted:
    "border-[color-mix(in_srgb,var(--fg-muted)_40%,transparent)] bg-[color-mix(in_srgb,var(--fg-muted)_16%,transparent)] text-[var(--fg-muted)]",
};

const hotBadgeClassName =
  "border-[color-mix(in_srgb,var(--badge-hot)_40%,transparent)] bg-[color-mix(in_srgb,var(--badge-hot)_16%,transparent)] text-[var(--badge-hot)]";

export function CountBadge({ count, threshold = 4, tone }: CountBadgeProps) {
  const isHot = count >= threshold;
  const className =
    count === 0
      ? "border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)]"
      : isHot
        ? hotBadgeClassName
        : accentBadgeClassNames[tone];

  return (
    <span
      className={`flex h-[22px] min-w-[28px] shrink-0 items-center justify-center rounded-md border px-2 font-mono text-[12px] font-semibold tabular-nums ${className}`}
      title={
        isHot ? "Charge élevée" : count === 0 ? "Aucune review en attente" : `${count} en attente`
      }
    >
      {count}
    </span>
  );
}
