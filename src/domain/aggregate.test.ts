import { describe, expect, it } from "vitest";

import { aggregate } from "./aggregate";

describe("aggregate", () => {
  it("counts one requested reviewer across three open pull requests", () => {
    const counts = aggregate([
      { reviewRequests: [{ login: "alice" }] },
      { reviewRequests: [{ login: "alice" }] },
      { reviewRequests: [{ login: "alice" }] },
    ]);

    expect(counts).toEqual(new Map([["alice", 3]]));
  });

  it("ignores pull requests without requested reviewers", () => {
    const counts = aggregate([{ reviewRequests: [] }, { reviewRequests: [{ login: "alice" }] }]);

    expect(counts).toEqual(new Map([["alice", 1]]));
  });

  it("counts a login once per pull request", () => {
    const counts = aggregate([
      {
        reviewRequests: [{ login: "alice" }, { login: "alice" }, { login: "ALICE" }],
      },
      { reviewRequests: [{ login: "alice" }] },
    ]);

    expect(counts).toEqual(new Map([["alice", 2]]));
  });

  it("normalizes login casing before counting", () => {
    const counts = aggregate([
      { reviewRequests: [{ login: "Alice" }] },
      { reviewRequests: [{ login: "ALICE" }] },
      { reviewRequests: [{ login: " alice " }] },
    ]);

    expect(counts).toEqual(new Map([["alice", 3]]));
  });

  it("ignores blank normalized logins", () => {
    const counts = aggregate([
      { reviewRequests: [{ login: " " }, { login: "alice" }] },
      { reviewRequests: [{ login: "" }] },
    ]);

    expect(counts).toEqual(new Map([["alice", 1]]));
  });

  it("handles a large number of pull requests with per-PR deduplication", () => {
    const pullRequests = Array.from({ length: 10_000 }, (_, index) => ({
      reviewRequests: [
        { login: index % 2 === 0 ? "alice" : "bob" },
        { login: index % 2 === 0 ? "ALICE" : "BOB" },
      ],
    }));

    const counts = aggregate(pullRequests);

    expect(counts).toEqual(
      new Map([
        ["alice", 5_000],
        ["bob", 5_000],
      ]),
    );
  });
});
