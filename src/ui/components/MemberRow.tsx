import type { ReviewCount } from "../../domain";
import { CountBadge, getBadgeLabel } from "./CountBadge";
import type { SectionTone } from "./types";
import { DEFAULT_COPY_FEEDBACK_DELAY_MS, useCopyLogin } from "./useCopyLogin";

interface MemberRowProps {
  readonly copyFeedbackDelayMs?: number;
  readonly member: ReviewCount;
  readonly threshold?: number;
  readonly tone: SectionTone;
}

const tickClassNames: Record<SectionTone, string> = {
  backend: "bg-[var(--accent-be)]",
  frontend: "bg-[var(--accent-fe)]",
  muted: "bg-[var(--fg-muted)]",
};

export function MemberRow({
  copyFeedbackDelayMs = DEFAULT_COPY_FEEDBACK_DELAY_MS,
  member,
  threshold = 4,
  tone,
}: MemberRowProps) {
  const isHot = member.count >= threshold;
  const [isCopied, copyLogin] = useCopyLogin(member.login, copyFeedbackDelayMs);

  return (
    <>
      <button
        aria-label={getRowLabel(member, isHot)}
        className="group flex h-[34px] w-full cursor-pointer items-center gap-3 rounded-md pl-3 pr-2.5 text-left transition-colors hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)]"
        onClick={copyLogin}
        title="Copier le login"
        type="button"
      >
        <span
          className={`h-4 w-[3px] shrink-0 rounded-full ${
            isHot ? "bg-[var(--badge-hot)]" : tickClassNames[tone]
          }`}
        />
        <span className="min-w-0 truncate text-[13px] leading-none text-[var(--fg)]">
          {member.displayName}
        </span>
        {member.canMerge ? (
          <span
            aria-label="Can merge into the default branch"
            title="Can merge into the default branch"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--merge-marker)]"
          />
        ) : null}
        <span
          className="ml-auto max-w-[92px] shrink-0 truncate whitespace-nowrap font-mono text-[11px] leading-none text-[var(--fg)]"
          title={member.login}
        >
          {isCopied ? "Copié !" : member.login}
        </span>
        <CountBadge count={member.count} threshold={threshold} tone={tone} />
      </button>
      {/* Out of flow (sr-only is absolutely positioned), so it adds no gap inside the section. */}
      <span className="sr-only" role="status">
        {isCopied ? `Login ${member.login} copié` : ""}
      </span>
    </>
  );
}

function getRowLabel(member: ReviewCount, isHot: boolean): string {
  const mergeSuffix = member.canMerge ? ", peut merger" : "";

  return `${member.displayName}, ${member.login}, ${getBadgeLabel(member.count, isHot)}${mergeSuffix}. Copier le login.`;
}
