import type { PullRequestReviewRequests } from "../domain/aggregate";
import type {
  GitHubRequestedReviewer,
  GitHubReviewRequestNode,
  GitHubReviewRequestsConnection,
  NormalizedCollaboratorsPage,
  NormalizedOpenPullRequestsPage,
  OpenPullRequestsGraphqlResponse,
  OpenPullRequestsPageInfo,
  OpenPullRequestsQueryResponse,
  OpenPullRequestsSearchConnection,
  OpenPullRequestsSearchNode,
  RepositoryCollaboratorEdge,
  RepositoryCollaboratorNode,
  RepositoryCollaboratorsConnection,
  RepositoryCollaboratorsGraphqlResponse,
  RepositoryCollaboratorsQueryResponse,
} from "./graphql";
import {
  OPEN_PULL_REQUESTS_QUERY,
  REPOSITORY_COLLABORATORS_QUERY,
  createOpenPullRequestsVariables,
  createRepositoryCollaboratorsVariables,
  normalizeOpenPullRequestsResponse,
  normalizeRepositoryCollaboratorsResponse,
} from "./graphql";

/**
 * GitHub GraphQL endpoint used by the background client.
 */
export const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

/**
 * Typed reasons returned when GitHub pull request fetching fails.
 */
export type ErrorReason = "AUTH" | "RATE_LIMIT" | "NETWORK";

/**
 * Discriminated result container used instead of throwing for expected failures.
 */
export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly reason: TError };

/**
 * Normalized open pull requests consumed by the aggregation layer.
 */
export type NormalizedPRs = readonly PullRequestReviewRequests[];

/**
 * Fetch-compatible implementation injected by tests.
 */
export type GitHubFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Fetch all open pull requests and requested reviewers from GitHub.
 *
 * @param token - GitHub personal access token; only sent to the GitHub API endpoint.
 * @param fetchImpl - Optional fetch implementation for tests.
 * @returns Normalized pull requests or a typed error reason.
 */
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

/**
 * Fetch one GraphQL search page and classify transport or payload failures.
 */
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

    if (hasAuthGraphqlError(payload)) {
      return { ok: false, reason: "AUTH" };
    }

    if (hasGraphqlErrors(payload) || !isOpenPullRequestsGraphqlResponse(payload)) {
      return { ok: false, reason: "NETWORK" };
    }

    return { ok: true, value: normalizeOpenPullRequestsResponse(payload.data) };
  } catch {
    return { ok: false, reason: "NETWORK" };
  }
}

/**
 * Logins that can merge into the default branch, keyed for case-insensitive matching downstream.
 */
export type MergeAccessLogins = readonly string[];

/**
 * Fetch the repository collaborators that can merge into the default branch.
 *
 * @remarks
 * Reading collaborators requires push access to the repository, so tokens without it resolve to
 * an `AUTH` failure. Callers are expected to fall back to a static configuration in that case
 * rather than treating the whole review-count fetch as failed.
 *
 * @param token - GitHub personal access token; only sent to the GitHub API endpoint.
 * @param fetchImpl - Optional fetch implementation for tests.
 * @returns Merge-capable collaborator logins or a typed error reason.
 */
export async function fetchMergeAccessLogins(
  token: string,
  fetchImpl: GitHubFetch = fetch,
): Promise<Result<MergeAccessLogins, ErrorReason>> {
  const logins: string[] = [];
  let cursor: string | null = null;

  while (true) {
    const pageResult = await fetchMergeAccessPage(token, cursor, fetchImpl);

    if (!pageResult.ok) {
      return pageResult;
    }

    logins.push(...pageResult.value.mergeAccessLogins);

    if (!pageResult.value.pageInfo.hasNextPage) {
      return { ok: true, value: logins };
    }

    if (pageResult.value.pageInfo.endCursor === null) {
      return { ok: false, reason: "NETWORK" };
    }

    cursor = pageResult.value.pageInfo.endCursor;
  }
}

/**
 * Fetch one collaborators GraphQL page and classify transport or payload failures.
 */
async function fetchMergeAccessPage(
  token: string,
  cursor: string | null,
  fetchImpl: GitHubFetch,
): Promise<Result<NormalizedCollaboratorsPage, ErrorReason>> {
  try {
    const response = await fetchImpl(GITHUB_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: REPOSITORY_COLLABORATORS_QUERY,
        variables: createRepositoryCollaboratorsVariables(cursor),
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: getHttpErrorReason(response) };
    }

    const payload: unknown = await response.json();

    if (hasRateLimitGraphqlError(payload)) {
      return { ok: false, reason: "RATE_LIMIT" };
    }

    if (hasAuthGraphqlError(payload)) {
      return { ok: false, reason: "AUTH" };
    }

    if (hasGraphqlErrors(payload) || !isRepositoryCollaboratorsGraphqlResponse(payload)) {
      return { ok: false, reason: "NETWORK" };
    }

    return { ok: true, value: normalizeRepositoryCollaboratorsResponse(payload.data) };
  } catch {
    return { ok: false, reason: "NETWORK" };
  }
}

/**
 * Map GitHub transport failures to the public error contract.
 */
function getHttpErrorReason(response: Response): ErrorReason {
  if (isRateLimitedResponse(response)) {
    return "RATE_LIMIT";
  }

  if (response.status === 401 || response.status === 403) {
    return "AUTH";
  }

  return "NETWORK";
}

function isRateLimitedResponse(response: Response): boolean {
  return response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0";
}

function hasGraphqlErrors(payload: unknown): boolean {
  return getGraphqlErrors(payload).length > 0;
}

function hasRateLimitGraphqlError(payload: unknown): boolean {
  return getGraphqlErrors(payload).some(isRateLimitGraphqlError);
}

function hasAuthGraphqlError(payload: unknown): boolean {
  return getGraphqlErrors(payload).some(isAuthGraphqlError);
}

function isRateLimitGraphqlError(error: unknown): boolean {
  const code = getGraphqlErrorCode(error);
  const type = getGraphqlErrorType(error);
  const message = getGraphqlErrorMessage(error);

  return code === "RATE_LIMITED" || type === "RATE_LIMITED" || message.includes("rate limit");
}

function isAuthGraphqlError(error: unknown): boolean {
  const code = getGraphqlErrorCode(error);
  const type = getGraphqlErrorType(error);
  const message = getGraphqlErrorMessage(error);

  return (
    code === "INSUFFICIENT_SCOPES" ||
    code === "FORBIDDEN" ||
    code === "UNAUTHORIZED" ||
    type === "INSUFFICIENT_SCOPES" ||
    type === "FORBIDDEN" ||
    type === "UNAUTHORIZED" ||
    message.includes("bad credentials") ||
    message.includes("forbidden") ||
    message.includes("insufficient scopes") ||
    message.includes("missing scope") ||
    message.includes("not been granted") ||
    message.includes("permission") ||
    message.includes("requires one of the following scopes") ||
    message.includes("resource not accessible by")
  );
}

/**
 * Extract GraphQL errors from an unknown payload before shape validation.
 */
function getGraphqlErrors(payload: unknown): readonly unknown[] {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("errors" in payload) ||
    !isReadonlyUnknownArray(payload.errors)
  ) {
    return [];
  }

  return payload.errors;
}

function getGraphqlErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("extensions" in error)) {
    return "";
  }

  const extensions = error.extensions;

  if (
    typeof extensions !== "object" ||
    extensions === null ||
    !("code" in extensions) ||
    typeof extensions.code !== "string"
  ) {
    return "";
  }

  return extensions.code.toUpperCase();
}

function getGraphqlErrorType(error: unknown): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !("type" in error) ||
    typeof error.type !== "string"
  ) {
    return "";
  }

  return error.type.toUpperCase();
}

function getGraphqlErrorMessage(error: unknown): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !("message" in error) ||
    typeof error.message !== "string"
  ) {
    return "";
  }

  return error.message.toLowerCase();
}

/**
 * Validate the GraphQL response shape before normalization.
 */
function isOpenPullRequestsGraphqlResponse(
  value: unknown,
): value is OpenPullRequestsGraphqlResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    isOpenPullRequestsQueryResponse(value.data)
  );
}

function isOpenPullRequestsQueryResponse(value: unknown): value is OpenPullRequestsQueryResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "search" in value &&
    isSearchConnection(value.search)
  );
}

/**
 * Validate the collaborators GraphQL response shape before normalization.
 */
function isRepositoryCollaboratorsGraphqlResponse(
  value: unknown,
): value is RepositoryCollaboratorsGraphqlResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    isRepositoryCollaboratorsQueryResponse(value.data)
  );
}

function isRepositoryCollaboratorsQueryResponse(
  value: unknown,
): value is RepositoryCollaboratorsQueryResponse {
  if (typeof value !== "object" || value === null || !("repository" in value)) {
    return false;
  }

  return value.repository === null || isCollaboratorsRepository(value.repository);
}

function isCollaboratorsRepository(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "collaborators" in value &&
    isCollaboratorsConnection(value.collaborators)
  );
}

function isCollaboratorsConnection(value: unknown): value is RepositoryCollaboratorsConnection {
  if (
    typeof value !== "object" ||
    value === null ||
    !("pageInfo" in value) ||
    !("edges" in value) ||
    !isPageInfo(value.pageInfo)
  ) {
    return false;
  }

  return (
    value.edges === null ||
    (isReadonlyUnknownArray(value.edges) && value.edges.every(isCollaboratorEdge))
  );
}

function isCollaboratorEdge(value: unknown): value is RepositoryCollaboratorEdge | null {
  if (value === null) {
    return true;
  }

  if (
    typeof value !== "object" ||
    !("permission" in value) ||
    !("node" in value) ||
    typeof value.permission !== "string"
  ) {
    return false;
  }

  return value.node === null || isCollaboratorNode(value.node);
}

function isCollaboratorNode(value: unknown): value is RepositoryCollaboratorNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "login" in value &&
    typeof value.login === "string"
  );
}

function isSearchConnection(value: unknown): value is OpenPullRequestsSearchConnection {
  if (
    typeof value !== "object" ||
    value === null ||
    !("pageInfo" in value) ||
    !("nodes" in value) ||
    !isPageInfo(value.pageInfo)
  ) {
    return false;
  }

  return (
    value.nodes === null || (isReadonlyUnknownArray(value.nodes) && value.nodes.every(isSearchNode))
  );
}

function isPageInfo(value: unknown): value is OpenPullRequestsPageInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "hasNextPage" in value &&
    "endCursor" in value &&
    typeof value.hasNextPage === "boolean" &&
    (typeof value.endCursor === "string" || value.endCursor === null)
  );
}

function isSearchNode(value: unknown): value is OpenPullRequestsSearchNode | null {
  if (value === null) {
    return true;
  }

  if (
    typeof value !== "object" ||
    !("__typename" in value) ||
    typeof value.__typename !== "string"
  ) {
    return false;
  }

  if (value.__typename !== "PullRequest") {
    return true;
  }

  return (
    "number" in value &&
    "reviewRequests" in value &&
    typeof value.number === "number" &&
    isReviewRequestsConnection(value.reviewRequests)
  );
}

function isReviewRequestsConnection(value: unknown): value is GitHubReviewRequestsConnection {
  return (
    typeof value === "object" &&
    value !== null &&
    "nodes" in value &&
    (value.nodes === null ||
      (isReadonlyUnknownArray(value.nodes) && value.nodes.every(isReviewRequestNode)))
  );
}

function isReviewRequestNode(value: unknown): value is GitHubReviewRequestNode | null {
  return (
    value === null ||
    (typeof value === "object" &&
      value !== null &&
      "requestedReviewer" in value &&
      isRequestedReviewer(value.requestedReviewer))
  );
}

function isRequestedReviewer(value: unknown): value is GitHubRequestedReviewer | null {
  if (value === null) {
    return true;
  }

  if (
    typeof value !== "object" ||
    !("__typename" in value) ||
    typeof value.__typename !== "string"
  ) {
    return false;
  }

  if (value.__typename !== "User") {
    return true;
  }

  return "login" in value && typeof value.login === "string";
}

function isReadonlyUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}
