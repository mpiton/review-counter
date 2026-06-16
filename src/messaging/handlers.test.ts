import { describe, expect, it, vi } from "vitest";
import type { PullRequestReviewRequests } from "../domain/aggregate";
import type { TeamConfig, TeamReviewCounts } from "../domain/types";
import type { ErrorReason, Result } from "../github";
import { createMessageHandler } from "./handlers";
import type {
  FetchMergeAccessLogins,
  FetchOpenPullRequests,
  MessageHandlerOptions,
} from "./handlers";
import type { ReviewCountsResponseMetadata } from "./protocol";

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

  it("opens the configuration popup from the background context", async () => {
    const dependencies = createTestDependencies({ token: null });
    const handleMessage = createMessageHandler(dependencies.options);

    await expect(handleMessage({ kind: "OPEN_CONFIGURATION" })).resolves.toEqual({ kind: "OK" });
    expect(dependencies.openConfigurationCalls).toBe(1);
  });

  it("maps configuration popup open failures to UNKNOWN errors", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const openConfigurationError = new Error("blocked");
    const dependencies = createTestDependencies({
      openConfigurationError,
      token: null,
    });
    const handleMessage = createMessageHandler(dependencies.options);

    await expect(handleMessage({ kind: "OPEN_CONFIGURATION" })).resolves.toEqual({
      kind: "ERROR",
      reason: "UNKNOWN",
    });
    expect(dependencies.openConfigurationCalls).toBe(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      "[Vates Review Counter] Failed to open configuration popup",
      openConfigurationError,
    );
    consoleWarn.mockRestore();
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
      meta: {
        fetchedAt: 0,
        openPullRequestCount: 2,
      } satisfies ReviewCountsResponseMetadata,
    });
    expect(dependencies.fetchCalls).toEqual(["secret-token"]);
  });

  it("marks reviewers with live merge access and leaves the rest unflagged", async () => {
    const dependencies = createTestDependencies({
      token: "secret-token",
      fetchResults: [
        okResult([{ reviewRequests: [{ login: "alice" }, { login: "unknown-reviewer" }] }]),
      ],
      mergeAccessResult: { ok: true, value: ["ALICE", "unknown-reviewer"] },
    });
    const handleMessage = createMessageHandler(dependencies.options);

    const response = await handleMessage({ kind: "FETCH_REVIEW_COUNTS" });

    expect(response).toMatchObject({
      kind: "REVIEW_COUNTS",
      data: {
        frontend: [{ login: "Alice", canMerge: true }],
        others: [{ login: "unknown-reviewer", canMerge: true }],
      },
    });
    if (response.kind !== "REVIEW_COUNTS") {
      throw new Error("expected review counts");
    }
    expect(response.data.backend[0]).not.toHaveProperty("canMerge");
    expect(dependencies.mergeAccessCalls).toEqual(["secret-token"]);
  });

  it("falls back to configured canMerge flags when the live merge lookup fails", async () => {
    const dependencies = createTestDependencies({
      token: "secret-token",
      fetchResults: [okResult([{ reviewRequests: [{ login: "alice" }] }])],
      mergeAccessResult: { ok: false, reason: "AUTH" },
      teamConfig: {
        frontend: [{ login: "Alice", displayName: "Alice Frontend", canMerge: true }],
        backend: [{ login: "bob", displayName: "Bob Backend" }],
      },
    });
    const handleMessage = createMessageHandler(dependencies.options);

    const response = await handleMessage({ kind: "FETCH_REVIEW_COUNTS" });

    expect(response).toMatchObject({
      kind: "REVIEW_COUNTS",
      data: { frontend: [{ login: "Alice", canMerge: true }] },
    });
    if (response.kind !== "REVIEW_COUNTS") {
      throw new Error("expected review counts");
    }
    expect(response.data.backend[0]).not.toHaveProperty("canMerge");
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
  readonly mergeAccessResult?: Result<readonly string[], ErrorReason>;
  readonly teamConfig?: TeamConfig;
  readonly openConfigurationError?: Error;
}): {
  readonly fetchCalls: readonly string[];
  readonly mergeAccessCalls: readonly string[];
  readonly openConfigurationCalls: number;
  readonly options: MessageHandlerOptions;
  readonly setNow: (nextNow: number) => void;
  readonly setTokenCalls: readonly string[];
} {
  const fetchResults = [...(options.fetchResults ?? [])];
  const fetchCalls: string[] = [];
  const mergeAccessCalls: string[] = [];
  const setTokenCalls: string[] = [];
  let openConfigurationCalls = 0;
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

  const fetchMergeAccessLogins: FetchMergeAccessLogins = async (token) => {
    mergeAccessCalls.push(token);

    return options.mergeAccessResult ?? { ok: false, reason: "AUTH" };
  };

  return {
    fetchCalls,
    mergeAccessCalls,
    get openConfigurationCalls() {
      return openConfigurationCalls;
    },
    options: {
      fetchOpenPRs,
      fetchMergeAccessLogins,
      getToken: async () => currentToken,
      now: () => currentNow,
      openConfigurationPopup: async () => {
        openConfigurationCalls += 1;

        if (options.openConfigurationError !== undefined) {
          throw options.openConfigurationError;
        }
      },
      setToken: async (token) => {
        currentToken = token;
        setTokenCalls.push(token);
      },
      teamConfig: options.teamConfig ?? teamConfig,
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
