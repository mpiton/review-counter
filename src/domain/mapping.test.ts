import { describe, expect, it } from "vitest";

import type { TeamConfig, TeamReviewCounts } from "./types";
import { mapToTeams } from "./mapping";

const testTeamConfig: TeamConfig = {
  frontend: [
    { login: "alice", displayName: "Alice" },
    { login: "bob", displayName: "Bob" },
    { login: "chloe", displayName: "Chloe" },
  ],
  backend: [
    { login: "daniel", displayName: "Daniel" },
    { login: "emma", displayName: "Emma" },
  ],
};

describe("mapToTeams", () => {
  it("separates frontend and backend members according to team config", () => {
    const counts = new Map([
      ["alice", 2],
      ["daniel", 3],
    ]);

    const mappedCounts = mapToTeams(counts, testTeamConfig);

    expect(mappedCounts.frontend).toEqual([
      { login: "alice", displayName: "Alice", count: 2 },
      { login: "bob", displayName: "Bob", count: 0 },
      { login: "chloe", displayName: "Chloe", count: 0 },
    ]);
    expect(mappedCounts.backend).toEqual([
      { login: "daniel", displayName: "Daniel", count: 3 },
      { login: "emma", displayName: "Emma", count: 0 },
    ]);
  });

  it("keeps configured members with zero requested reviews", () => {
    const mappedCounts = mapToTeams(new Map(), testTeamConfig);

    expect(mappedCounts).toEqual<TeamReviewCounts>({
      frontend: [
        { login: "alice", displayName: "Alice", count: 0 },
        { login: "bob", displayName: "Bob", count: 0 },
        { login: "chloe", displayName: "Chloe", count: 0 },
      ],
      backend: [
        { login: "daniel", displayName: "Daniel", count: 0 },
        { login: "emma", displayName: "Emma", count: 0 },
      ],
      others: [],
    });
  });

  it("places requested reviewer logins missing from the config in others", () => {
    const counts = new Map([
      ["external-reviewer", 1],
      ["alice", 2],
    ]);

    const mappedCounts = mapToTeams(counts, testTeamConfig);

    expect(mappedCounts.others).toEqual([
      { login: "external-reviewer", displayName: "external-reviewer", count: 1 },
    ]);
  });

  it("sorts each section by descending count", () => {
    const counts = new Map([
      ["bob", 4],
      ["alice", 1],
      ["daniel", 2],
      ["emma", 5],
      ["external-a", 3],
      ["external-b", 6],
    ]);

    const mappedCounts = mapToTeams(counts, testTeamConfig);

    expect(mappedCounts.frontend.map((member) => member.login)).toEqual(["bob", "alice", "chloe"]);
    expect(mappedCounts.backend.map((member) => member.login)).toEqual(["emma", "daniel"]);
    expect(mappedCounts.others.map((member) => member.login)).toEqual(["external-b", "external-a"]);
  });

  it("matches team member logins case-insensitively", () => {
    const counts = new Map([
      ["ALICE", 2],
      [" Daniel ", 1],
    ]);

    const mappedCounts = mapToTeams(counts, testTeamConfig);

    expect(mappedCounts.frontend[0]).toEqual({ login: "alice", displayName: "Alice", count: 2 });
    expect(mappedCounts.backend[0]).toEqual({
      login: "daniel",
      displayName: "Daniel",
      count: 1,
    });
    expect(mappedCounts.others).toEqual([]);
  });

  it("flags reviewers in the merge-access set with canMerge across all sections", () => {
    const counts = new Map([
      ["alice", 2],
      ["bob", 1],
      ["external-reviewer", 3],
    ]);

    const mappedCounts = mapToTeams(
      counts,
      testTeamConfig,
      new Set(["alice", "external-reviewer"]),
    );

    expect(mappedCounts.frontend).toContainEqual({
      login: "alice",
      displayName: "Alice",
      count: 2,
      canMerge: true,
    });
    expect(mappedCounts.others).toEqual([
      { login: "external-reviewer", displayName: "external-reviewer", count: 3, canMerge: true },
    ]);
    expect(mappedCounts.frontend.find((member) => member.login === "bob")).not.toHaveProperty(
      "canMerge",
    );
    expect(mappedCounts.backend[0]).not.toHaveProperty("canMerge");
  });

  it("normalizes and merges count keys before mapping", () => {
    const counts = new Map([
      ["alice", 1],
      [" ALICE ", 2],
      [" ", 10],
      ["external-reviewer", 3],
      [" EXTERNAL-REVIEWER ", 4],
    ]);

    const mappedCounts = mapToTeams(counts, testTeamConfig);

    expect(mappedCounts.frontend[0]).toEqual({ login: "alice", displayName: "Alice", count: 3 });
    expect(mappedCounts.others).toEqual([
      { login: "external-reviewer", displayName: "external-reviewer", count: 7 },
    ]);
  });
});
