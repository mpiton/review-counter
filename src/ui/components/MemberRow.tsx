import type { ReviewCount } from "../../domain";
import { CountBadge } from "./CountBadge";
import type { SectionTone } from "./types";

interface MemberRowProps {
  readonly member: ReviewCount;
  readonly threshold?: number;
  readonly tone: SectionTone;
}

const tickClassNames: Record<SectionTone, string> = {
  backend: "bg-[var(--accent-be)]",
  frontend: "bg-[var(--accent-fe)]",
  muted: "bg-[var(--fg-muted)]",
};

export function MemberRow({ member, threshold = 4, tone }: MemberRowProps) {
  const isHot = member.count >= threshold;

  return (
    <div className="group flex h-[34px] cursor-default items-center gap-3 rounded-md pl-3 pr-2.5 transition-colors hover:bg-[var(--surface)]">
      <span
        className={`h-4 w-[3px] shrink-0 rounded-full ${
          isHot ? "bg-[var(--badge-hot)]" : tickClassNames[tone]
        }`}
      />
      <span className="min-w-0 truncate text-[13px] leading-none text-[var(--fg)]">
        {member.displayName}
      </span>
      <span className="ml-auto max-w-[92px] shrink-0 truncate whitespace-nowrap font-mono text-[11px] leading-none text-[var(--fg-muted)]">
        {member.login}
      </span>
      <CountBadge count={member.count} threshold={threshold} tone={tone} />
    </div>
  );
}
