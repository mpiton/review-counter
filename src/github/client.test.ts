import { describe, expect, it, vi } from "vitest";

import type {
  OpenPullRequestsGraphqlResponse,
  RepositoryCollaboratorsGraphqlResponse,
} from "./graphql";
import {
  OPEN_PULL_REQUESTS_QUERY,
  REPOSITORY_COLLABORATORS_QUERY,
  createOpenPullRequestsVariables,
  createRepositoryCollaboratorsVariables,
} from "./graphql";
import type { GitHubFetch } from "./client";
import { GITHUB_GRAPHQL_ENDPOINT, fetchMergeAccessLogins, fetchOpenPRs } from "./client";

interface FetchCall {
  readonly input: RequestInfo | URL;
  readonly init: RequestInit | undefined;
}

function createFetchMock(responses: readonly Response[]): {
  readonly calls: readonly FetchCall[];
  readonly fetchImpl: GitHubFetch;
} {
  const calls: FetchCall[] = [];
  let index = 0;

  const fetchImpl: GitHubFetch = async (input, init) => {
    calls.push({ input, init });

    const response = responses[index];
    index += 1;

    if (response === undefined) {
      throw new Error("Unexpected GitHub fetch call");
    }

    return response;
  };

  return { calls, fetchImpl };
}

function createGraphqlResponse(
  response: OpenPullRequestsGraphqlResponse,
  init: ResponseInit = {},
): Response {
  return createJsonResponse(response, init);
}

function createJsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    ...init,
    headers: createJsonHeaders(init.headers),
  });
}

function createJsonHeaders(initHeaders: HeadersInit | undefined): Headers {
  const headers = new Headers(initHeaders);
  headers.set("content-type", "application/json");

  return headers;
}

function createGraphqlErrorResponse(error: unknown): Response {
  return createJsonResponse({
    errors: [error],
  });
}

function createOpenPullRequestsPage(
  hasNextPage: boolean,
  endCursor: string | null,
  reviewerLogin: string,
): OpenPullRequestsGraphqlResponse {
  return {
    data: {
      search: {
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        nodes: [
          {
            __typename: "PullRequest",
            number: 42,
            reviewRequests: {
              nodes: [{ requestedReviewer: { __typename: "User", login: reviewerLogin } }],
            },
          },
        ],
      },
    },
  } satisfies OpenPullRequestsGraphqlResponse;
}

describe("fetchOpenPRs", () => {
  it("posts the open pull requests query to GitHub with the bearer token", async () => {
    const { calls, fetchImpl } = createFetchMock([
      createGraphqlResponse(createOpenPullRequestsPage(false, null, "alice")),
    ]);

    const result = await fetchOpenPRs("secret-token", fetchImpl);

    expect(result).toEqual({
      ok: true,
      value: [{ reviewRequests: [{ login: "alice" }] }],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe(GITHUB_GRAPHQL_ENDPOINT);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers).toEqual({
      accept: "application/vnd.github+json",
      authorization: "bearer secret-token",
      "content-type": "application/json",
    });
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        query: OPEN_PULL_REQUESTS_QUERY,
        variables: createOpenPullRequestsVariables(),
      }),
    );
  });

  it("returns AUTH for a mocked 401 response without throwing", async () => {
    const { fetchImpl } = createFetchMock([new Response(null, { status: 401 })]);

    await expect(fetchOpenPRs("secret-token", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "AUTH",
    });
  });

  it("returns AUTH for a mocked forbidden permission response", async () => {
    const { fetchImpl } = createFetchMock([new Response(null, { status: 403 })]);

    await expect(fetchOpenPRs("secret-token", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "AUTH",
    });
  });

  it("returns RATE_LIMIT when GitHub reports an exhausted rate limit", async () => {
    const { fetchImpl } = createFetchMock([
      new Response(null, {
        status: 403,
        headers: { "x-ratelimit-remaining": "0" },
      }),
    ]);

    await expect(fetchOpenPRs("secret-token", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "RATE_LIMIT",
    });
  });

  it("returns RATE_LIMIT when GitHub reports a GraphQL rate limit error", async () => {
    const { fetchImpl } = createFetchMock([
      createGraphqlErrorResponse({
        extensions: { code: "RATE_LIMITED" },
        message: "You have exceeded a secondary rate limit.",
      }),
    ]);

    await expect(fetchOpenPRs("secret-token", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "RATE_LIMIT",
    });
  });

  it("returns AUTH when GitHub reports a GraphQL auth scope error", async () => {
    const { fetchImpl } = createFetchMock([
      createGraphqlErrorResponse({
        message: "Your token has not been granted the required scopes to execute this query.",
        type: "INSUFFICIENT_SCOPES",
      }),
    ]);

    await expect(fetchOpenPRs("secret-token", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "AUTH",
    });
  });

  it("returns NETWORK when fetch rejects", async () => {
    const fetchImpl: GitHubFetch = async () => {
      throw new TypeError("Failed to fetch");
    };

    await expect(fetchOpenPRs("secret-token", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "NETWORK",
    });
  });

  it("concatenates paginated responses until the final cursor page", async () => {
    const { calls, fetchImpl } = createFetchMock([
      createGraphqlResponse(createOpenPullRequestsPage(true, "cursor-2", "alice")),
      createGraphqlResponse(createOpenPullRequestsPage(false, null, "bob")),
    ]);

    const result = await fetchOpenPRs("secret-token", fetchImpl);

    expect(result).toEqual({
      ok: true,
      value: [{ reviewRequests: [{ login: "alice" }] }, { reviewRequests: [{ login: "bob" }] }],
    });
    expect(calls).toHaveLength(2);
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({
        query: OPEN_PULL_REQUESTS_QUERY,
        variables: createOpenPullRequestsVariables("cursor-2"),
      }),
    );
  });

  it("does not log the token while fetching pull requests", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { fetchImpl } = createFetchMock([
      createGraphqlResponse(createOpenPullRequestsPage(false, null, "alice")),
    ]);

    try {
      await fetchOpenPRs("secret-token", fetchImpl);

      expect(consoleLog).not.toHaveBeenCalled();
    } finally {
      consoleLog.mockRestore();
    }
  });
});

function createCollaboratorsResponse(
  response: RepositoryCollaboratorsGraphqlResponse,
  init: ResponseInit = {},
): Response {
  return createJsonResponse(response, init);
}

function createCollaboratorsPage(
  hasNextPage: boolean,
  endCursor: string | null,
  edges: readonly { readonly permission: string; readonly login: string }[],
): RepositoryCollaboratorsGraphqlResponse {
  return {
    data: {
      repository: {
        collaborators: {
          pageInfo: { hasNextPage, endCursor },
          edges: edges.map((edge) => ({
            permission: edge.permission,
            node: { login: edge.login },
          })),
        },
      },
    },
  } satisfies RepositoryCollaboratorsGraphqlResponse;
}

describe("fetchMergeAccessLogins", () => {
  it("posts the collaborators query and keeps only merge-capable permissions", async () => {
    const { calls, fetchImpl } = createFetchMock([
      createCollaboratorsResponse(
        createCollaboratorsPage(false, null, [
          { permission: "ADMIN", login: "admin-user" },
          { permission: "MAINTAIN", login: "maintainer" },
          { permission: "WRITE", login: "writer" },
          { permission: "TRIAGE", login: "triager" },
          { permission: "READ", login: "reader" },
        ]),
      ),
    ]);

    const result = await fetchMergeAccessLogins("secret-token", fetchImpl);

    expect(result).toEqual({
      ok: true,
      value: ["admin-user", "maintainer", "writer"],
    });
    expect(calls[0]?.input).toBe(GITHUB_GRAPHQL_ENDPOINT);
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        query: REPOSITORY_COLLABORATORS_QUERY,
        variables: createRepositoryCollaboratorsVariables(),
      }),
    );
  });

  it("paginates collaborators until the final cursor page", async () => {
    const { calls, fetchImpl } = createFetchMock([
      createCollaboratorsResponse(
        createCollaboratorsPage(true, "cursor-2", [{ permission: "WRITE", login: "writer" }]),
      ),
      createCollaboratorsResponse(
        createCollaboratorsPage(false, null, [{ permission: "ADMIN", login: "admin-user" }]),
      ),
    ]);

    const result = await fetchMergeAccessLogins("secret-token", fetchImpl);

    expect(result).toEqual({ ok: true, value: ["writer", "admin-user"] });
    expect(calls).toHaveLength(2);
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({
        query: REPOSITORY_COLLABORATORS_QUERY,
        variables: createRepositoryCollaboratorsVariables("cursor-2"),
      }),
    );
  });

  it("returns AUTH for a token lacking push access so callers can fall back to config", async () => {
    const { fetchImpl } = createFetchMock([new Response(null, { status: 403 })]);

    await expect(fetchMergeAccessLogins("secret-token", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "AUTH",
    });
  });

  it("returns an empty list when the repository is unreadable", async () => {
    const { fetchImpl } = createFetchMock([createJsonResponse({ data: { repository: null } })]);

    await expect(fetchMergeAccessLogins("secret-token", fetchImpl)).resolves.toEqual({
      ok: true,
      value: [],
    });
  });

  it("returns NETWORK when fetch rejects", async () => {
    const fetchImpl: GitHubFetch = async () => {
      throw new TypeError("Failed to fetch");
    };

    await expect(fetchMergeAccessLogins("secret-token", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "NETWORK",
    });
  });
});
