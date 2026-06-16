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
