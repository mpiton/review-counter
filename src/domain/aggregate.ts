export interface RequestedReviewer {
  login: string;
}

export interface PullRequestReviewRequests {
  reviewRequests: readonly RequestedReviewer[];
}

export type ReviewCountsByLogin = Map<string, number>;

export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function aggregate(pullRequests: readonly PullRequestReviewRequests[]): ReviewCountsByLogin {
  const counts = new Map<string, number>();

  for (const pullRequest of pullRequests) {
    const countedLogins = new Set<string>();

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
