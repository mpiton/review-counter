import type { PullRequestReviewRequests, RequestedReviewer } from "../domain/aggregate";

const graphql = String.raw;

/**
 * GitHub search query for the product's fixed target repository.
 */
export const OPEN_PULL_REQUESTS_SEARCH_QUERY = "repo:vatesfr/xen-orchestra is:pr is:open";

/**
 * GraphQL query that fetches open pull requests and their requested user reviewers.
 */
export const OPEN_PULL_REQUESTS_QUERY = graphql`
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

/**
 * Variables for the open pull requests GraphQL query.
 */
export interface OpenPullRequestsQueryVariables {
  readonly q: typeof OPEN_PULL_REQUESTS_SEARCH_QUERY;
  readonly cursor: string | null;
}

/**
 * Top-level GitHub GraphQL response payload for the open pull requests query.
 */
export interface OpenPullRequestsGraphqlResponse {
  readonly data: OpenPullRequestsQueryResponse;
}

/**
 * Typed data shape returned by the open pull requests query.
 */
export interface OpenPullRequestsQueryResponse {
  readonly search: OpenPullRequestsSearchConnection;
}

/**
 * GitHub search result connection for pull request search nodes.
 */
export interface OpenPullRequestsSearchConnection {
  readonly pageInfo: OpenPullRequestsPageInfo;
  readonly nodes: readonly (OpenPullRequestsSearchNode | null)[] | null;
}

/**
 * Pagination state exposed by GitHub search results.
 */
export interface OpenPullRequestsPageInfo {
  readonly hasNextPage: boolean;
  readonly endCursor: string | null;
}

/**
 * Search node returned by the open pull requests search query.
 */
export type OpenPullRequestsSearchNode = GitHubPullRequestNode | GitHubOtherSearchNode;

/**
 * Pull request search node with requested reviewer data.
 */
export interface GitHubPullRequestNode {
  readonly __typename: "PullRequest";
  readonly number: number;
  readonly reviewRequests: GitHubReviewRequestsConnection;
}

/**
 * Non-pull-request search node ignored by normalization.
 */
export interface GitHubOtherSearchNode {
  readonly __typename: string;
  readonly number?: undefined;
  readonly reviewRequests?: undefined;
}

/**
 * Requested reviewers connection attached to a pull request.
 */
export interface GitHubReviewRequestsConnection {
  readonly nodes: readonly (GitHubReviewRequestNode | null)[] | null;
}

/**
 * Review request node returned by GitHub.
 */
export interface GitHubReviewRequestNode {
  readonly requestedReviewer: GitHubRequestedReviewer | null;
}

/**
 * Reviewer actor returned by a pull request review request.
 */
export type GitHubRequestedReviewer = GitHubUserReviewer | GitHubOtherRequestedReviewer;

/**
 * GitHub user reviewer that can be counted by login.
 */
export interface GitHubUserReviewer {
  readonly __typename: "User";
  readonly login: string;
}

/**
 * Non-user reviewer actor ignored by normalization.
 */
export interface GitHubOtherRequestedReviewer {
  readonly __typename: string;
  readonly login?: undefined;
}

/**
 * Normalized page consumed by the domain aggregation layer.
 */
export interface NormalizedOpenPullRequestsPage {
  readonly pageInfo: OpenPullRequestsPageInfo;
  readonly pullRequests: readonly PullRequestReviewRequests[];
}

/**
 * Create variables for the open pull requests GraphQL query.
 *
 * @param cursor - Optional search pagination cursor.
 * @returns Query variables with the fixed repository search query.
 */
export function createOpenPullRequestsVariables(
  cursor: string | null = null,
): OpenPullRequestsQueryVariables {
  return {
    q: OPEN_PULL_REQUESTS_SEARCH_QUERY,
    cursor,
  };
}

/**
 * Normalize the typed GitHub response into aggregate input while preserving pagination.
 *
 * @param response - Typed GraphQL response data.
 * @returns Pull requests with only countable user review requests.
 */
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
