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

  it("requests the token owner and the pull request fields shown to the viewer", () => {
    expect(OPEN_PULL_REQUESTS_QUERY).toMatch(/viewer\s*\{\s*login\s*\}/);

    for (const field of ["title", "url", "createdAt", "isDraft", "author {"]) {
      expect(OPEN_PULL_REQUESTS_QUERY).toContain(field);
    }
  });

  it("normalizes a typed response into domain input and exposes pagination", () => {
    const response: OpenPullRequestsQueryResponse = {
      viewer: { login: "Me" },
      search: {
        pageInfo: {
          hasNextPage: true,
          endCursor: "cursor-2",
        },
        nodes: [
          {
            __typename: "PullRequest",
            number: 42,
            title: "feat: first",
            url: "https://github.com/vatesfr/xen-orchestra/pull/42",
            createdAt: "2026-10-01T10:00:00Z",
            isDraft: false,
            author: { login: "bob" },
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
            title: "fix: second",
            url: "https://github.com/vatesfr/xen-orchestra/pull/43",
            createdAt: "2026-10-02T10:00:00Z",
            isDraft: true,
            author: null,
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
      viewerLogin: "Me",
      pullRequests: [
        {
          number: 42,
          title: "feat: first",
          filesUrl: "https://github.com/vatesfr/xen-orchestra/pull/42/files",
          createdAt: "2026-10-01T10:00:00Z",
          isDraft: false,
          authorLogin: "bob",
          reviewRequests: [{ login: "Alice" }],
        },
        {
          number: 43,
          title: "fix: second",
          filesUrl: "https://github.com/vatesfr/xen-orchestra/pull/43/files",
          createdAt: "2026-10-02T10:00:00Z",
          isDraft: true,
          authorLogin: null,
          reviewRequests: [],
        },
      ],
    });
  });

  it("normalizes an empty search result without dropping pagination", () => {
    const response: OpenPullRequestsQueryResponse = {
      viewer: { login: "me" },
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
      viewerLogin: "me",
      pullRequests: [],
    });
  });

  it("ignores pages without pull request nodes", () => {
    const response: OpenPullRequestsQueryResponse = {
      viewer: { login: "me" },
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
      viewerLogin: "me",
      pullRequests: [],
    });
  });
});
