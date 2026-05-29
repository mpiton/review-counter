import { normalizeLogin } from "./aggregate";
import type { ReviewCount, TeamConfig, TeamMember, TeamReviewCounts } from "./types";

/**
 * Map aggregated review request counts to configured team sections.
 *
 * @param counts - Review request counts keyed by GitHub login.
 * @param teamConfig - Hardcoded team configuration used for section mapping.
 * @returns Team sections including zero-count configured members and unknown reviewers.
 */
export function mapToTeams(
  counts: ReadonlyMap<string, number>,
  teamConfig: TeamConfig,
): TeamReviewCounts {
  const normalizedCounts = normalizeCounts(counts);
  const configuredLogins = new Set<string>();

  const frontend = mapTeamMembers(teamConfig.frontend, normalizedCounts, configuredLogins);
  const backend = mapTeamMembers(teamConfig.backend, normalizedCounts, configuredLogins);
  const others = mapOtherReviewers(normalizedCounts, configuredLogins);

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
): ReviewCount[] {
  return members.map((member) => {
    const login = normalizeLogin(member.login);
    configuredLogins.add(login);

    return {
      login: member.login,
      displayName: member.displayName,
      count: counts.get(login) ?? 0,
    };
  });
}

function mapOtherReviewers(
  counts: ReadonlyMap<string, number>,
  configuredLogins: ReadonlySet<string>,
): ReviewCount[] {
  const reviewCounts: ReviewCount[] = [];

  for (const [login, count] of counts) {
    if (configuredLogins.has(login)) {
      continue;
    }

    reviewCounts.push({
      login,
      displayName: login,
      count,
    });
  }

  return reviewCounts;
}

function sortByDescendingCount(reviewCounts: readonly ReviewCount[]): ReviewCount[] {
  return [...reviewCounts].sort((first, second) => second.count - first.count);
}
