import { describe, expect, it } from "vitest";
import type { PullRequestReviewRequests } from "../domain/aggregate";
import type { TeamConfig, TeamReviewCounts } from "../domain/types";
import type { ErrorReason, Result } from "../github";
import { createMessageHandler } from "./handlers";
import type { FetchOpenPullRequests, MessageHandlerOptions } from "./handlers";

const cacheTtlMs = 60_000;

const teamConfig = {
  frontend: [{ login: "Alice", displayName: "Alice Frontend" }],
  backend: [{ login: "bob", displayName: "Bob Backend" }],
} satisfies TeamConfig;

describe("background message handlers", () => {
  it("delegates GET_TOKEN and SET_TOKEN to token storage", async () => {
    const dependencies = createTestDependencies({ token: "secret-token" });
    const handleMessage = createMessageHandler(dependencies.options);

    await expect(handleMessage({ kind: "GET_TOKEN" })).resolves.toEqual({
      kind: "TOKEN",
      token: "secret-token",
    });

    await expect(
      handleMessage({ kind: "SET_TOKEN", token: "updated-secret-token" }),
    ).resolves.toEqual({ kind: "OK" });
    expect(dependencies.setTokenCalls).toEqual(["updated-secret-token"]);
  });

  it("returns NO_TOKEN and skips GitHub fetching when no token is stored", async () => {
    const dependencies = createTestDependencies({ token: null });
    const handleMessage = createMessageHandler(dependencies.options);

    await expect(handleMessage({ kind: "FETCH_REVIEW_COUNTS" })).resolves.toEqual({
      kind: "ERROR",
      reason: "NO_TOKEN",
    });
    expect(dependencies.fetchCalls).toEqual([]);
  });

  it("fetches open PRs, aggregates reviewers, and maps counts to teams", async () => {
    const dependencies = createTestDependencies({
      token: "secret-token",
      fetchResults: [
        okResult([
          { reviewRequests: [{ login: "ALICE" }, { login: "unknown-reviewer" }] },
          { reviewRequests: [{ login: "alice" }] },
        ]),
      ],
    });
    const handleMessage = createMessageHandler(dependencies.options);

    await expect(handleMessage({ kind: "FETCH_REVIEW_COUNTS" })).resolves.toEqual({
      kind: "REVIEW_COUNTS",
      data: {
        frontend: [{ login: "Alice", displayName: "Alice Frontend", count: 2 }],
        backend: [{ login: "bob", displayName: "Bob Backend", count: 0 }],
        others: [{ login: "unknown-reviewer", displayName: "unknown-reviewer", count: 1 }],
      } satisfies TeamReviewCounts,
    });
    expect(dependencies.fetchCalls).toEqual(["secret-token"]);
  });

  it("serves fresh cached review counts inside the TTL", async () => {
    const dependencies = createTestDependencies({
      token: "secret-token",
      fetchResults: [
        okResult([{ reviewRequests: [{ login: "alice" }] }]),
        okResult([{ reviewRequests: [{ login: "bob" }] }]),
      ],
    });
    const handleMessage = createMessageHandler(dependencies.options);

    const firstResponse = await handleMessage({ kind: "FETCH_REVIEW_COUNTS" });
    dependencies.setNow(cacheTtlMs - 1);
    const secondResponse = await handleMessage({ kind: "FETCH_REVIEW_COUNTS" });

    expect(secondResponse).toEqual(firstResponse);
    expect(dependencies.fetchCalls).toEqual(["secret-token"]);
  });

  it("refetches when force is true even inside the TTL", async () => {
    const dependencies = createTestDependencies({
      token: "secret-token",
      fetchResults: [
        okResult([{ reviewRequests: [{ login: "alice" }] }]),
        okResult([{ reviewRequests: [{ login: "bob" }] }]),
      ],
    });
    const handleMessage = createMessageHandler(dependencies.options);

    await expect(handleMessage({ kind: "FETCH_REVIEW_COUNTS" })).resolves.toMatchObject({
      kind: "REVIEW_COUNTS",
      data: { frontend: [{ count: 1 }], backend: [{ count: 0 }], others: [] },
    });
    await expect(
      handleMessage({ kind: "FETCH_REVIEW_COUNTS", force: true }),
    ).resolves.toMatchObject({
      kind: "REVIEW_COUNTS",
      data: { frontend: [{ count: 0 }], backend: [{ count: 1 }], others: [] },
    });
    expect(dependencies.fetchCalls).toEqual(["secret-token", "secret-token"]);
  });

  it("preserves cached review counts when a forced refetch fails", async () => {
    const dependencies = createTestDependencies({
      token: "secret-token",
      fetchResults: [okResult([{ reviewRequests: [{ login: "alice" }] }]), errorResult("NETWORK")],
    });
    const handleMessage = createMessageHandler(dependencies.options);

    await handleMessage({ kind: "FETCH_REVIEW_COUNTS" });

    await expect(handleMessage({ kind: "FETCH_REVIEW_COUNTS", force: true })).resolves.toEqual({
      kind: "ERROR",
      reason: "NETWORK",
    });

    dependencies.setNow(cacheTtlMs - 1);
    await expect(handleMessage({ kind: "FETCH_REVIEW_COUNTS" })).resolves.toMatchObject({
      kind: "REVIEW_COUNTS",
      data: { frontend: [{ count: 1 }], backend: [{ count: 0 }], others: [] },
    });
    expect(dependencies.fetchCalls).toEqual(["secret-token", "secret-token"]);
  });

  it("refetches when the cached review counts are stale", async () => {
    const dependencies = createTestDependencies({
      token: "secret-token",
      fetchResults: [
        okResult([{ reviewRequests: [{ login: "alice" }] }]),
        okResult([{ reviewRequests: [{ login: "bob" }] }]),
      ],
    });
    const handleMessage = createMessageHandler(dependencies.options);

    await handleMessage({ kind: "FETCH_REVIEW_COUNTS" });
    dependencies.setNow(cacheTtlMs);

    await expect(handleMessage({ kind: "FETCH_REVIEW_COUNTS" })).resolves.toMatchObject({
      kind: "REVIEW_COUNTS",
      data: { frontend: [{ count: 0 }], backend: [{ count: 1 }], others: [] },
    });
    expect(dependencies.fetchCalls).toEqual(["secret-token", "secret-token"]);
  });

  it.each(["AUTH", "RATE_LIMIT", "NETWORK"] satisfies readonly ErrorReason[])(
    "maps %s client errors to ERROR responses",
    async (reason) => {
      const dependencies = createTestDependencies({
        token: "secret-token",
        fetchResults: [errorResult(reason)],
      });
      const handleMessage = createMessageHandler(dependencies.options);

      await expect(handleMessage({ kind: "FETCH_REVIEW_COUNTS" })).resolves.toEqual({
        kind: "ERROR",
        reason,
      });
    },
  );
});

function createTestDependencies(options: {
  readonly token: string | null;
  readonly fetchResults?: readonly Result<readonly PullRequestReviewRequests[], ErrorReason>[];
}): {
  readonly fetchCalls: readonly string[];
  readonly options: MessageHandlerOptions;
  readonly setNow: (nextNow: number) => void;
  readonly setTokenCalls: readonly string[];
} {
  const fetchResults = [...(options.fetchResults ?? [])];
  const fetchCalls: string[] = [];
  const setTokenCalls: string[] = [];
  let currentToken = options.token;
  let currentNow = 0;

  const fetchOpenPRs: FetchOpenPullRequests = async (token) => {
    fetchCalls.push(token);

    const result = fetchResults.shift();

    if (result === undefined) {
      throw new Error("Unexpected fetchOpenPRs call");
    }

    return result;
  };

  return {
    fetchCalls,
    options: {
      fetchOpenPRs,
      getToken: async () => currentToken,
      now: () => currentNow,
      setToken: async (token) => {
        currentToken = token;
        setTokenCalls.push(token);
      },
      teamConfig,
      ttlMs: cacheTtlMs,
    },
    setNow: (nextNow) => {
      currentNow = nextNow;
    },
    setTokenCalls,
  };
}

function okResult(
  value: readonly PullRequestReviewRequests[],
): Result<readonly PullRequestReviewRequests[], ErrorReason> {
  return { ok: true, value };
}

function errorResult(
  reason: ErrorReason,
): Result<readonly PullRequestReviewRequests[], ErrorReason> {
  return { ok: false, reason };
}
