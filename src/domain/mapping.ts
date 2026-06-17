import { normalizeLogin } from "./aggregate";
import type { ReviewCount, TeamConfig, TeamMember, TeamReviewCounts } from "./types";

/**
 * Map aggregated review request counts to configured team sections.
 *
 * @param counts - Aggregated review request counts keyed by raw or normalized GitHub login.
 * @param teamConfig - Frontend/backend members to include and match case-insensitively.
 * @param mergeAccessLogins - Normalized logins that can merge into the default branch; matched
 *   reviewers receive `canMerge: true`. Defaults to empty (no merge markers).
 * @returns Sorted team sections including zero-count configured members and unknown reviewers.
 */
export function mapToTeams(
  counts: ReadonlyMap<string, number>,
  teamConfig: TeamConfig,
  mergeAccessLogins: ReadonlySet<string> = new Set(),
): TeamReviewCounts {
  const normalizedCounts = normalizeCounts(counts);
  const configuredLogins = new Set<string>();

  const frontend = mapTeamMembers(
    teamConfig.frontend,
    normalizedCounts,
    configuredLogins,
    mergeAccessLogins,
  );
  const backend = mapTeamMembers(
    teamConfig.backend,
    normalizedCounts,
    configuredLogins,
    mergeAccessLogins,
  );
  const others = mapOtherReviewers(normalizedCounts, configuredLogins, mergeAccessLogins);

  return {
    frontend: sortByDescendingCount(frontend),
    backend: sortByDescendingCount(backend),
    others: sortByDescendingCount(others),
  };
}

function normalizeCounts(counts: ReadonlyMap<string, number>): Map<string, number> {
  const normalizedCounts = new Map<string, number>();

  for (const [rawLogin, count] of counts) {
    const login = normalizeLogin(rawLogin);

    if (login.length === 0) {
      continue;
    }

    normalizedCounts.set(login, (normalizedCounts.get(login) ?? 0) + count);
  }

  return normalizedCounts;
}

function mapTeamMembers(
  members: readonly TeamMember[],
  counts: ReadonlyMap<string, number>,
  configuredLogins: Set<string>,
  mergeAccessLogins: ReadonlySet<string>,
): ReviewCount[] {
  return members.map((member) => {
    const login = normalizeLogin(member.login);
    configuredLogins.add(login);

    return withMergeAccess(
      {
        login: member.login,
        displayName: member.displayName,
        count: counts.get(login) ?? 0,
      },
      mergeAccessLogins.has(login),
    );
  });
}

function mapOtherReviewers(
  counts: ReadonlyMap<string, number>,
  configuredLogins: ReadonlySet<string>,
  mergeAccessLogins: ReadonlySet<string>,
): ReviewCount[] {
  const reviewCounts: ReviewCount[] = [];

  for (const [login, count] of counts) {
    if (configuredLogins.has(login)) {
      continue;
    }

    reviewCounts.push(
      withMergeAccess(
        {
          login,
          displayName: login,
          count,
        },
        mergeAccessLogins.has(login),
      ),
    );
  }

  return reviewCounts;
}

/** Attach the `canMerge` flag only when the reviewer can merge, keeping unflagged rows lean. */
function withMergeAccess(reviewCount: ReviewCount, canMerge: boolean): ReviewCount {
  if (!canMerge) {
    return reviewCount;
  }

  return { ...reviewCount, canMerge: true };
}

function sortByDescendingCount(reviewCounts: readonly ReviewCount[]): ReviewCount[] {
  return [...reviewCounts].sort((first, second) => second.count - first.count);
}
