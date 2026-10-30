import { describe, expect, it } from "vitest";

import type { OpenPullRequest } from "./myReviews";
import { selectMyReviews } from "./myReviews";

function createPullRequest(overrides: Partial<OpenPullRequest> = {}): OpenPullRequest {
  return {
    number: 1,
    title: "feat: add something",
    filesUrl: "https://github.com/vatesfr/xen-orchestra/pull/1/files",
    createdAt: "2026-10-01T10:00:00Z",
    isDraft: false,
    authorLogin: "author",
    reviewRequests: [{ login: "me" }],
    ...overrides,
  };
}

describe("selectMyReviews", () => {
  it("keeps only the pull requests where the viewer is requested", () => {
    const myReviews = selectMyReviews(
      [
        createPullRequest({ number: 1, reviewRequests: [{ login: "someone" }, { login: "me" }] }),
        createPullRequest({ number: 2, reviewRequests: [{ login: "someone" }] }),
        createPullRequest({ number: 3, reviewRequests: [] }),
      ],
      "me",
    );

    expect(myReviews.viewerLogin).toBe("me");
    expect(myReviews.pullRequests.map((pullRequest) => pullRequest.number)).toEqual([1]);
  });

  it("matches the viewer login case-insensitively", () => {
    const myReviews = selectMyReviews(
      [createPullRequest({ reviewRequests: [{ login: "ME" }] })],
      " me ",
    );

    expect(myReviews.pullRequests).toHaveLength(1);
  });

  it("exposes the fields the UI needs without the review requests", () => {
    const myReviews = selectMyReviews([createPullRequest()], "me");

    expect(myReviews.pullRequests).toEqual([
      {
        number: 1,
        title: "feat: add something",
        filesUrl: "https://github.com/vatesfr/xen-orchestra/pull/1/files",
        createdAt: "2026-10-01T10:00:00Z",
        isDraft: false,
        authorLogin: "author",
      },
    ]);
  });

  it("puts the oldest ready pull requests first and drafts last", () => {
    const myReviews = selectMyReviews(
      [
        createPullRequest({ number: 1, createdAt: "2026-10-20T10:00:00Z" }),
        createPullRequest({ number: 2, createdAt: "2026-09-01T10:00:00Z", isDraft: true }),
        createPullRequest({ number: 3, createdAt: "2026-10-05T10:00:00Z" }),
        createPullRequest({ number: 4, createdAt: "2026-09-15T10:00:00Z", isDraft: true }),
      ],
      "me",
    );

    expect(myReviews.pullRequests.map((pullRequest) => pullRequest.number)).toEqual([3, 1, 2, 4]);
  });

  it("returns an empty list when nothing is requested from the viewer", () => {
    expect(selectMyReviews([], "me")).toEqual({ viewerLogin: "me", pullRequests: [] });
  });
});
