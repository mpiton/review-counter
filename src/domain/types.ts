export type TeamId = "frontend" | "backend";

export type ReviewCountSection = TeamId | "others";

export interface TeamMember {
  login: string;
  displayName: string;
  /**
   * Whether this member can merge into the repository default branch.
   *
   * @remarks
   * Used only as a fallback when the live GitHub permission lookup is unavailable
   * (e.g. the configured token lacks push access). The live lookup, when it
   * succeeds, takes precedence over this flag.
   */
  canMerge?: boolean;
}

export interface TeamConfig {
  frontend: TeamMember[];
  backend: TeamMember[];
}

export interface ReviewCount {
  login: string;
  displayName: string;
  count: number;
  /** Present and `true` when the reviewer can merge into the repository default branch. */
  canMerge?: boolean;
}

export interface TeamReviewCounts {
  frontend: ReviewCount[];
  backend: ReviewCount[];
  others: ReviewCount[];
}

/**
 * Open pull request waiting for a review from the connected user.
 */
export interface MyReviewPullRequest {
  readonly number: number;
  readonly title: string;
  /** GitHub page opening the pull request diff, where the review happens. */
  readonly filesUrl: string;
  /** ISO 8601 UTC creation date, as returned by GitHub. */
  readonly createdAt: string;
  readonly isDraft: boolean;
  /** `null` when the author's GitHub account no longer exists. */
  readonly authorLogin: string | null;
}

/**
 * Reviews the connected user (the token owner) has to handle, most urgent first.
 */
export interface MyReviews {
  readonly viewerLogin: string;
  readonly pullRequests: readonly MyReviewPullRequest[];
}
