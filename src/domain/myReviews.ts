import type { PullRequestReviewRequests } from "./aggregate";
import { normalizeLogin } from "./aggregate";
import type { MyReviewPullRequest, MyReviews } from "./types";

/**
 * Normalized open pull request carrying both review requests and display fields.
 */
export interface OpenPullRequest extends PullRequestReviewRequests, MyReviewPullRequest {}

/**
 * Select the pull requests waiting for a review from the connected user.
 *
 * @param pullRequests - Open pull requests with normalized review request data.
 * @param viewerLogin - GitHub login of the connected user.
 * @returns The viewer's reviews: ready pull requests first, then drafts, oldest first in each group.
 */
export function selectMyReviews(
  pullRequests: readonly OpenPullRequest[],
  viewerLogin: string,
): MyReviews {
  const normalizedViewerLogin = normalizeLogin(viewerLogin);

  return {
    viewerLogin,
    pullRequests: pullRequests
      .filter((pullRequest) =>
        pullRequest.reviewRequests.some(
          (reviewRequest) => normalizeLogin(reviewRequest.login) === normalizedViewerLogin,
        ),
      )
      .sort(compareByUrgency)
      .map(toMyReviewPullRequest),
  };
}

function compareByUrgency(left: OpenPullRequest, right: OpenPullRequest): number {
  if (left.isDraft !== right.isDraft) {
    return left.isDraft ? 1 : -1;
  }

  return left.createdAt.localeCompare(right.createdAt);
}

function toMyReviewPullRequest(pullRequest: OpenPullRequest): MyReviewPullRequest {
  return {
    number: pullRequest.number,
    title: pullRequest.title,
    filesUrl: pullRequest.filesUrl,
    createdAt: pullRequest.createdAt,
    isDraft: pullRequest.isDraft,
    authorLogin: pullRequest.authorLogin,
  };
}
