/**
 * Requested GitHub user attached to a pull request review request.
 */
export interface RequestedReviewer {
  readonly login: string;
}

/**
 * Normalized pull request shape consumed by the domain aggregation layer.
 */
export interface PullRequestReviewRequests {
  reviewRequests: readonly RequestedReviewer[];
}

/**
 * Review request counts indexed by normalized GitHub login.
 */
export type ReviewCountsByLogin = Map<string, number>;

/**
 * Normalize GitHub logins for case-insensitive matching across domain modules.
 *
 * @param login - Raw GitHub login from a review request.
 * @returns The trimmed, lowercase login used as the aggregation key.
 */
export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

/**
 * Count the number of pull requests where each login is requested for review.
 *
 * @param pullRequests - Open pull requests with normalized review request data.
 * @returns Review request counts keyed by normalized GitHub login.
 */
export function aggregate(pullRequests: readonly PullRequestReviewRequests[]): ReviewCountsByLogin {
  const counts = new Map<string, number>();
  /** Tracks normalized logins already counted for the current pull request. */
  const countedLogins = new Set<string>();

  for (const pullRequest of pullRequests) {
    countedLogins.clear();

    for (const reviewRequest of pullRequest.reviewRequests) {
      const login = normalizeLogin(reviewRequest.login);

      if (login.length === 0 || countedLogins.has(login)) {
        continue;
      }

      countedLogins.add(login);
      counts.set(login, (counts.get(login) ?? 0) + 1);
    }
  }

  return counts;
}
