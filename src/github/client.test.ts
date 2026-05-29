import { describe, expect, it, vi } from "vitest";

import type { OpenPullRequestsGraphqlResponse } from "./graphql";
import { OPEN_PULL_REQUESTS_QUERY, createOpenPullRequestsVariables } from "./graphql";
import type { GitHubFetch } from "./client";
import { GITHUB_GRAPHQL_ENDPOINT, fetchOpenPRs } from "./client";

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
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

  return new Response(JSON.stringify(response), {
    status: 200,
    ...init,
    headers,
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
  };
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

    await fetchOpenPRs("secret-token", fetchImpl);

    expect(consoleLog).not.toHaveBeenCalled();
  });
});
