export type TeamId = "frontend" | "backend";

export type ReviewCountSection = TeamId | "others";

export interface TeamMember {
  login: string;
  displayName: string;
}

export interface TeamConfig {
  frontend: TeamMember[];
  backend: TeamMember[];
}

export interface ReviewCount {
  login: string;
  displayName: string;
  count: number;
}

export interface TeamReviewCounts {
  frontend: ReviewCount[];
  backend: ReviewCount[];
  others: ReviewCount[];
}
