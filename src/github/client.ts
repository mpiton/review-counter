import type { PullRequestReviewRequests } from "../domain/aggregate";
import type {
  GitHubRequestedReviewer,
  GitHubReviewRequestNode,
  GitHubReviewRequestsConnection,
  NormalizedOpenPullRequestsPage,
  OpenPullRequestsGraphqlResponse,
  OpenPullRequestsPageInfo,
  OpenPullRequestsQueryResponse,
  OpenPullRequestsSearchConnection,
  OpenPullRequestsSearchNode,
} from "./graphql";
import {
  OPEN_PULL_REQUESTS_QUERY,
  createOpenPullRequestsVariables,
  normalizeOpenPullRequestsResponse,
} from "./graphql";

export const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export type ErrorReason = "AUTH" | "RATE_LIMIT" | "NETWORK";

export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly reason: TError };

export type NormalizedPRs = readonly PullRequestReviewRequests[];

export type GitHubFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function fetchOpenPRs(
  token: string,
  fetchImpl: GitHubFetch = fetch,
): Promise<Result<NormalizedPRs, ErrorReason>> {
  const pullRequests: PullRequestReviewRequests[] = [];
  let cursor: string | null = null;

  while (true) {
    const pageResult = await fetchOpenPRsPage(token, cursor, fetchImpl);

    if (!pageResult.ok) {
      return pageResult;
    }

    pullRequests.push(...pageResult.value.pullRequests);

    if (!pageResult.value.pageInfo.hasNextPage) {
      return { ok: true, value: pullRequests };
    }

    if (pageResult.value.pageInfo.endCursor === null) {
      return { ok: false, reason: "NETWORK" };
    }

    cursor = pageResult.value.pageInfo.endCursor;
  }
}

async function fetchOpenPRsPage(
  token: string,
  cursor: string | null,
  fetchImpl: GitHubFetch,
): Promise<Result<NormalizedOpenPullRequestsPage, ErrorReason>> {
  try {
    const response = await fetchImpl(GITHUB_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: OPEN_PULL_REQUESTS_QUERY,
        variables: createOpenPullRequestsVariables(cursor),
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: getHttpErrorReason(response) };
    }

    const payload: unknown = await response.json();

    if (hasRateLimitGraphqlError(payload)) {
      return { ok: false, reason: "RATE_LIMIT" };
    }

    if (hasGraphqlErrors(payload) || !isOpenPullRequestsGraphqlResponse(payload)) {
      return { ok: false, reason: "NETWORK" };
    }

    return { ok: true, value: normalizeOpenPullRequestsResponse(payload.data) };
  } catch {
    return { ok: false, reason: "NETWORK" };
  }
}

function getHttpErrorReason(response: Response): ErrorReason {
  if (response.status === 401) {
    return "AUTH";
  }

  if (isRateLimitedResponse(response)) {
    return "RATE_LIMIT";
  }

  return "NETWORK";
}

function isRateLimitedResponse(response: Response): boolean {
  return response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0";
}

function hasGraphqlErrors(payload: unknown): boolean {
  return isRecord(payload) && isReadonlyUnknownArray(payload.errors) && payload.errors.length > 0;
}

function hasRateLimitGraphqlError(payload: unknown): boolean {
  if (!isRecord(payload) || !isReadonlyUnknownArray(payload.errors)) {
    return false;
  }

  return payload.errors.some(isRateLimitGraphqlError);
}

function isRateLimitGraphqlError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const type = typeof error.type === "string" ? error.type.toUpperCase() : "";
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";

  return type === "RATE_LIMITED" || message.includes("rate limit");
}

function isOpenPullRequestsGraphqlResponse(
  value: unknown,
): value is OpenPullRequestsGraphqlResponse {
  return isRecord(value) && isOpenPullRequestsQueryResponse(value.data);
}

function isOpenPullRequestsQueryResponse(value: unknown): value is OpenPullRequestsQueryResponse {
  return isRecord(value) && isSearchConnection(value.search);
}

function isSearchConnection(value: unknown): value is OpenPullRequestsSearchConnection {
  if (!isRecord(value) || !isPageInfo(value.pageInfo)) {
    return false;
  }

  return (
    value.nodes === null || (isReadonlyUnknownArray(value.nodes) && value.nodes.every(isSearchNode))
  );
}

function isPageInfo(value: unknown): value is OpenPullRequestsPageInfo {
  return (
    isRecord(value) &&
    typeof value.hasNextPage === "boolean" &&
    (typeof value.endCursor === "string" || value.endCursor === null)
  );
}

function isSearchNode(value: unknown): value is OpenPullRequestsSearchNode | null {
  if (value === null) {
    return true;
  }

  if (!isRecord(value) || typeof value.__typename !== "string") {
    return false;
  }

  if (value.__typename !== "PullRequest") {
    return true;
  }

  return typeof value.number === "number" && isReviewRequestsConnection(value.reviewRequests);
}

function isReviewRequestsConnection(value: unknown): value is GitHubReviewRequestsConnection {
  return (
    isRecord(value) &&
    (value.nodes === null ||
      (isReadonlyUnknownArray(value.nodes) && value.nodes.every(isReviewRequestNode)))
  );
}

function isReviewRequestNode(value: unknown): value is GitHubReviewRequestNode | null {
  return value === null || (isRecord(value) && isRequestedReviewer(value.requestedReviewer));
}

function isRequestedReviewer(value: unknown): value is GitHubRequestedReviewer | null {
  if (value === null) {
    return true;
  }

  if (!isRecord(value) || typeof value.__typename !== "string") {
    return false;
  }

  if (value.__typename !== "User") {
    return true;
  }

  return typeof value.login === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReadonlyUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}
