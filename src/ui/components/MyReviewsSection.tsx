import type { MyReviewPullRequest, MyReviews } from "../../domain";
import { formatPullRequestAge, formatReviewsToHandle } from "./overlayHelpers";

interface MyReviewsSectionProps {
  readonly myReviews: MyReviews;
  readonly now?: number;
}

interface MyReviewRowProps {
  readonly now: number;
  readonly pullRequest: MyReviewPullRequest;
}

export function MyReviewsSection({ myReviews, now = Date.now() }: MyReviewsSectionProps) {
  const { pullRequests, viewerLogin } = myReviews;

  return (
    <div className="px-1.5">
      <div className="flex items-center gap-2 px-3 pb-1.5 pt-3">
        <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.12em] text-[var(--fg)]">
          MES REVIEWS
        </span>
        <span className="h-px flex-1 bg-[var(--border)]" />
        {pullRequests.length > 0 ? (
          <span
            aria-label={formatReviewsToHandle(pullRequests.length)}
            className="flex h-[22px] min-w-[28px] shrink-0 items-center justify-center rounded-md border border-[var(--badge-hot)] bg-[var(--badge-hot)] px-2 font-mono text-[12px] font-semibold tabular-nums text-[var(--on-badge-hot)]"
          >
            {pullRequests.length}
          </span>
        ) : null}
      </div>
      {pullRequests.length === 0 ? (
        <p className="px-3 py-1 text-[12px] text-[var(--fg-muted)]">
          Rien à traiter pour @{viewerLogin}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="truncate px-3 font-mono text-[10px] text-[var(--fg-muted)]">
            @{viewerLogin}
          </span>
          {pullRequests.map((pullRequest) => (
            <MyReviewRow key={pullRequest.number} now={now} pullRequest={pullRequest} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyReviewRow({ now, pullRequest }: MyReviewRowProps) {
  const { authorLogin, createdAt, filesUrl, isDraft, number, title } = pullRequest;
  const details = [
    `#${number}`,
    authorLogin ?? "compte supprimé",
    formatPullRequestAge(createdAt, now),
    ...(isDraft ? ["brouillon"] : []),
  ].join(" · ");

  return (
    <a
      className="block rounded-md px-3 py-1.5 transition-colors hover:bg-[var(--surface)] focus-visible:bg-[var(--surface)]"
      href={filesUrl}
      title={title}
    >
      <span className="block truncate text-[13px] font-medium">{title}</span>
      <span className="block truncate font-mono text-[11px] text-[var(--fg-muted)]">{details}</span>
    </a>
  );
}
