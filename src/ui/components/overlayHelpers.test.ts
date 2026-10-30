import { describe, expect, it } from "vitest";
import { formatPullRequestAge, formatReviewsToHandle } from "./overlayHelpers";

const now = Date.parse("2026-10-30T12:00:00Z");

describe("formatPullRequestAge", () => {
  it.each([
    ["2026-10-30T11:30:00Z", "< 1 h"],
    ["2026-10-30T11:00:00Z", "1 h"],
    ["2026-10-29T12:30:00Z", "23 h"],
    ["2026-10-29T12:00:00Z", "1 j"],
    ["2026-10-20T12:00:00Z", "10 j"],
  ])("formats %s as %s", (createdAt, expected) => {
    expect(formatPullRequestAge(createdAt, now)).toBe(expected);
  });

  it("treats a creation date ahead of the local clock as recent", () => {
    expect(formatPullRequestAge("2026-10-30T13:00:00Z", now)).toBe("< 1 h");
  });
});

describe("formatReviewsToHandle", () => {
  it.each([
    [1, "1 review à traiter"],
    [2, "2 reviews à traiter"],
  ])("formats %i as %s", (count, expected) => {
    expect(formatReviewsToHandle(count)).toBe(expected);
  });
});
