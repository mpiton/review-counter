import type { ReviewCount } from "../../domain";
import { MemberRow } from "./MemberRow";
import type { SectionTone } from "./types";

interface SectionLabelProps {
  readonly label: string;
  readonly tone: SectionTone;
}

interface SectionProps extends SectionLabelProps {
  readonly members: readonly ReviewCount[];
  readonly threshold?: number;
}

const dotClassNames: Record<SectionTone, string> = {
  backend: "bg-[var(--accent-be)]",
  frontend: "bg-[var(--accent-fe)]",
  muted: "bg-[var(--fg-muted)]",
};

export function SectionLabel({ label, tone }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 px-3 pb-1.5 pt-3">
      <span className="font-mono text-[10px] font-semibold tracking-[0.12em] text-[var(--fg-muted)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassNames[tone]}`} />
    </div>
  );
}

export function Section({ label, members, threshold = 4, tone }: SectionProps) {
  if (members.length === 0) {
    return null;
  }

  const sortedMembers = [...members].sort((first, second) => second.count - first.count);

  return (
    <div className="px-1.5">
      <SectionLabel label={label} tone={tone} />
      <div className="flex flex-col gap-0.5">
        {sortedMembers.map((member) => (
          <MemberRow key={member.login} member={member} threshold={threshold} tone={tone} />
        ))}
      </div>
    </div>
  );
}
