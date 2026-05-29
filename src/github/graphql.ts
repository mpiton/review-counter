import type { PullRequestReviewRequests, RequestedReviewer } from "../domain/aggregate";

export const OPEN_PULL_REQUESTS_SEARCH_QUERY = "repo:vatesfr/xen-orchestra is:pr is:open";

export const OPEN_PULL_REQUESTS_QUERY = `
query OpenPullRequests($q: String!, $cursor: String) {
  search(query: $q, type: ISSUE, first: 100, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      __typename
      ... on PullRequest {
        number
        reviewRequests(first: 20) {
          nodes {
            requestedReviewer {
              __typename
              ... on User {
                login
              }
            }
          }
        }
      }
    }
  }
}
`;

export interface OpenPullRequestsQueryVariables {
  readonly q: typeof OPEN_PULL_REQUESTS_SEARCH_QUERY;
  readonly cursor: string | null;
}

export interface OpenPullRequestsGraphqlResponse {
  readonly data: OpenPullRequestsQueryResponse;
}

export interface OpenPullRequestsQueryResponse {
  readonly search: OpenPullRequestsSearchConnection;
}

export interface OpenPullRequestsSearchConnection {
  readonly pageInfo: OpenPullRequestsPageInfo;
  readonly nodes: readonly (OpenPullRequestsSearchNode | null)[] | null;
}

export interface OpenPullRequestsPageInfo {
  readonly hasNextPage: boolean;
  readonly endCursor: string | null;
}

export type OpenPullRequestsSearchNode = GitHubPullRequestNode | GitHubOtherSearchNode;

export interface GitHubPullRequestNode {
  readonly __typename: "PullRequest";
  readonly number: number;
  readonly reviewRequests: GitHubReviewRequestsConnection;
}

export interface GitHubOtherSearchNode {
  readonly __typename: string;
  readonly number?: undefined;
  readonly reviewRequests?: undefined;
}

export interface GitHubReviewRequestsConnection {
  readonly nodes: readonly (GitHubReviewRequestNode | null)[] | null;
}

export interface GitHubReviewRequestNode {
  readonly requestedReviewer: GitHubRequestedReviewer | null;
}

export type GitHubRequestedReviewer = GitHubUserReviewer | GitHubOtherRequestedReviewer;

export interface GitHubUserReviewer {
  readonly __typename: "User";
  readonly login: string;
}

export interface GitHubOtherRequestedReviewer {
  readonly __typename: string;
  readonly login?: undefined;
}

export interface NormalizedOpenPullRequestsPage {
  readonly pageInfo: OpenPullRequestsPageInfo;
  readonly pullRequests: readonly PullRequestReviewRequests[];
}

export function createOpenPullRequestsVariables(
  cursor: string | null = null,
): OpenPullRequestsQueryVariables {
  return {
    q: OPEN_PULL_REQUESTS_SEARCH_QUERY,
    cursor,
  };
}

export function normalizeOpenPullRequestsResponse(
  response: OpenPullRequestsQueryResponse,
): NormalizedOpenPullRequestsPage {
  const pullRequests: PullRequestReviewRequests[] = [];

  for (const node of response.search.nodes ?? []) {
    if (!isPullRequestNode(node)) {
      continue;
    }

    pullRequests.push({
      reviewRequests: normalizeReviewRequests(node.reviewRequests.nodes),
    });
  }

  return {
    pageInfo: response.search.pageInfo,
    pullRequests,
  };
}

function normalizeReviewRequests(
  nodes: readonly (GitHubReviewRequestNode | null)[] | null,
): RequestedReviewer[] {
  const reviewRequests: RequestedReviewer[] = [];

  for (const node of nodes ?? []) {
    const reviewer = node?.requestedReviewer;

    if (!isUserReviewer(reviewer)) {
      continue;
    }

    reviewRequests.push({ login: reviewer.login });
  }

  return reviewRequests;
}

function isPullRequestNode(node: OpenPullRequestsSearchNode | null): node is GitHubPullRequestNode {
  return (
    node?.__typename === "PullRequest" &&
    typeof node.number === "number" &&
    node.reviewRequests !== undefined
  );
}

function isUserReviewer(
  reviewer: GitHubRequestedReviewer | null | undefined,
): reviewer is GitHubUserReviewer {
  return reviewer?.__typename === "User" && typeof reviewer.login === "string";
}
