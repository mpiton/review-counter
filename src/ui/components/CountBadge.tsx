import type { SectionTone } from "./types";

interface CountBadgeProps {
  readonly count: number;
  readonly threshold?: number;
  readonly tone: SectionTone;
}

const accentBadgeClassNames: Record<SectionTone, string> = {
  backend: "border-[var(--accent-be)] bg-[var(--accent-be)] text-[var(--on-accent)]",
  frontend: "border-[var(--accent-fe)] bg-[var(--accent-fe)] text-[var(--on-accent)]",
  muted: "border-[var(--fg-muted)] bg-[var(--surface)] text-[var(--fg)]",
};

const hotBadgeClassName =
  "border-[var(--badge-hot)] bg-[var(--badge-hot)] text-[var(--on-badge-hot)]";

export function CountBadge({ count, threshold = 4, tone }: CountBadgeProps) {
  const isHot = count >= threshold;
  const className =
    count === 0
      ? "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
      : isHot
        ? hotBadgeClassName
        : accentBadgeClassNames[tone];

  return (
    <span
      aria-label={getBadgeLabel(count, isHot)}
      className={`flex h-[22px] min-w-[28px] shrink-0 items-center justify-center rounded-md border px-2 font-mono text-[12px] font-semibold tabular-nums ${className}`}
      title={getBadgeTitle(count, isHot)}
    >
      {count}
    </span>
  );
}

function getBadgeTitle(count: number, isHot: boolean): string {
  if (isHot) {
    return "Charge élevée";
  }

  return count === 0 ? "Aucune review en attente" : `${count} en attente`;
}

export function getBadgeLabel(count: number, isHot: boolean): string {
  if (count === 0) {
    return "Aucune review en attente";
  }

  return isHot ? `${count} reviews en attente, charge élevée` : `${count} reviews en attente`;
}
