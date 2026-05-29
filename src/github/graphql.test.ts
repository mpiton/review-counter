import { describe, expect, it } from "vitest";

import type { OpenPullRequestsQueryResponse } from "./graphql";
import {
  OPEN_PULL_REQUESTS_QUERY,
  OPEN_PULL_REQUESTS_SEARCH_QUERY,
  createOpenPullRequestsVariables,
  normalizeOpenPullRequestsResponse,
} from "./graphql";

describe("GitHub GraphQL open pull requests query", () => {
  it("defines the search query for open pull requests in the target repository", () => {
    expect(OPEN_PULL_REQUESTS_SEARCH_QUERY).toBe("repo:vatesfr/xen-orchestra is:pr is:open");
    expect(createOpenPullRequestsVariables()).toEqual({
      q: OPEN_PULL_REQUESTS_SEARCH_QUERY,
      cursor: null,
    });
    expect(createOpenPullRequestsVariables("cursor-1")).toEqual({
      q: OPEN_PULL_REQUESTS_SEARCH_QUERY,
      cursor: "cursor-1",
    });
  });

  it("requests page information and pull request review requests", () => {
    expect(OPEN_PULL_REQUESTS_QUERY).toContain(
      "search(query: $q, type: ISSUE, first: 100, after: $cursor)",
    );
    expect(OPEN_PULL_REQUESTS_QUERY).toContain("pageInfo");
    expect(OPEN_PULL_REQUESTS_QUERY).toContain("hasNextPage");
    expect(OPEN_PULL_REQUESTS_QUERY).toContain("endCursor");
    expect(OPEN_PULL_REQUESTS_QUERY).toContain("... on PullRequest");
    expect(OPEN_PULL_REQUESTS_QUERY).toContain("number");
    expect(OPEN_PULL_REQUESTS_QUERY).toContain("reviewRequests(first: 20)");
    expect(OPEN_PULL_REQUESTS_QUERY).toContain("... on User");
    expect(OPEN_PULL_REQUESTS_QUERY).toContain("login");
  });

  it("normalizes a typed response into aggregate input and exposes pagination", () => {
    const response: OpenPullRequestsQueryResponse = {
      search: {
        pageInfo: {
          hasNextPage: true,
          endCursor: "cursor-2",
        },
        nodes: [
          {
            __typename: "PullRequest",
            number: 42,
            reviewRequests: {
              nodes: [
                { requestedReviewer: { __typename: "User", login: "Alice" } },
                { requestedReviewer: { __typename: "Team" } },
                { requestedReviewer: null },
                null,
              ],
            },
          },
          {
            __typename: "PullRequest",
            number: 43,
            reviewRequests: {
              nodes: null,
            },
          },
          { __typename: "Issue" },
          null,
        ],
      },
    };

    expect(normalizeOpenPullRequestsResponse(response)).toEqual({
      pageInfo: {
        hasNextPage: true,
        endCursor: "cursor-2",
      },
      pullRequests: [{ reviewRequests: [{ login: "Alice" }] }, { reviewRequests: [] }],
    });
  });

  it("normalizes an empty search result without dropping pagination", () => {
    const response: OpenPullRequestsQueryResponse = {
      search: {
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
        nodes: [],
      },
    };

    expect(normalizeOpenPullRequestsResponse(response)).toEqual({
      pageInfo: {
        hasNextPage: false,
        endCursor: null,
      },
      pullRequests: [],
    });
  });

  it("ignores pages without pull request nodes", () => {
    const response: OpenPullRequestsQueryResponse = {
      search: {
        pageInfo: {
          hasNextPage: true,
          endCursor: "cursor-without-prs",
        },
        nodes: [{ __typename: "Issue" }, { __typename: "Discussion" }, null],
      },
    };

    expect(normalizeOpenPullRequestsResponse(response)).toEqual({
      pageInfo: {
        hasNextPage: true,
        endCursor: "cursor-without-prs",
      },
      pullRequests: [],
    });
  });
});
