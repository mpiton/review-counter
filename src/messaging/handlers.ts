import { teamConfig as defaultTeamConfig } from "../config/team.config";
import { aggregate } from "../domain/aggregate";
import { mapToTeams } from "../domain/mapping";
import type { TeamConfig, TeamReviewCounts } from "../domain/types";
import { fetchOpenPRs as defaultFetchOpenPRs } from "../github";
import type { ErrorReason, NormalizedPRs, Result } from "../github";
import { getToken as defaultGetToken, setToken as defaultSetToken } from "../storage";
import type { Request, Response } from "./protocol";

/** Time window where background review counts can be served without refetching GitHub. */
export const REVIEW_COUNTS_CACHE_TTL_MS = 60_000;

/** Reads the locally stored GitHub token from the background context. */
export type GetStoredToken = () => Promise<string | null>;

/** Persists a GitHub token from the popup through background-owned storage. */
export type SetStoredToken = (token: string) => Promise<void>;

/** Fetches normalized open pull requests with their requested reviewers from GitHub. */
export type FetchOpenPullRequests = (token: string) => Promise<Result<NormalizedPRs, ErrorReason>>;

/** Handles one typed extension request and returns its typed response. */
export type MessageHandler = (request: Request) => Promise<Response>;

/** Dependencies injected by tests; production uses the background-safe defaults. */
export interface MessageHandlerOptions {
  readonly fetchOpenPRs?: FetchOpenPullRequests;
  readonly getToken?: GetStoredToken;
  readonly now?: () => number;
  readonly setToken?: SetStoredToken;
  readonly teamConfig?: TeamConfig;
  readonly ttlMs?: number;
}

interface MessageHandlerDependencies {
  readonly fetchOpenPRs: FetchOpenPullRequests;
  readonly getToken: GetStoredToken;
  readonly now: () => number;
  readonly setToken: SetStoredToken;
  readonly teamConfig: TeamConfig;
  readonly ttlMs: number;
}

interface ReviewCountsCacheEntry {
  readonly data: TeamReviewCounts;
  readonly fetchedAt: number;
}

type FetchReviewCountsRequest = Extract<Request, { readonly kind: "FETCH_REVIEW_COUNTS" }>;

/** Create the background message router with an in-memory review counts cache. */
export function createMessageHandler(options: MessageHandlerOptions = {}): MessageHandler {
  const dependencies = createDependencies(options);
  let cache: ReviewCountsCacheEntry | null = null;

  function invalidateCache(): void {
    cache = null;
  }

  return async (request) => {
    switch (request.kind) {
      case "GET_TOKEN":
        return { kind: "TOKEN", token: await dependencies.getToken() };

      case "SET_TOKEN":
        await dependencies.setToken(request.token);
        invalidateCache();

        return { kind: "OK" };

      case "FETCH_REVIEW_COUNTS":
        if (shouldServeCachedReviewCounts(request, cache, dependencies)) {
          return { kind: "REVIEW_COUNTS", data: cache.data };
        }

        return fetchReviewCounts(dependencies, (entry) => {
          cache = entry;
        });
    }
  };
}

function shouldServeCachedReviewCounts(
  request: FetchReviewCountsRequest,
  cache: ReviewCountsCacheEntry | null,
  dependencies: MessageHandlerDependencies,
): cache is ReviewCountsCacheEntry {
  if (request.force === true) {
    return false;
  }

  if (cache === null) {
    return false;
  }

  return isCacheFresh(cache, dependencies.now(), dependencies.ttlMs);
}

function createDependencies(options: MessageHandlerOptions): MessageHandlerDependencies {
  return {
    fetchOpenPRs: options.fetchOpenPRs ?? defaultFetchOpenPRs,
    getToken: options.getToken ?? defaultGetToken,
    now: options.now ?? Date.now,
    setToken: options.setToken ?? defaultSetToken,
    teamConfig: options.teamConfig ?? defaultTeamConfig,
    ttlMs: options.ttlMs ?? REVIEW_COUNTS_CACHE_TTL_MS,
  };
}

async function fetchReviewCounts(
  dependencies: MessageHandlerDependencies,
  writeCache: (entry: ReviewCountsCacheEntry) => void,
): Promise<Response> {
  const token = await dependencies.getToken();

  if (token === null) {
    return { kind: "ERROR", reason: "NO_TOKEN" };
  }

  const result = await dependencies.fetchOpenPRs(token);

  if (!result.ok) {
    return { kind: "ERROR", reason: result.reason };
  }

  const data = mapToTeams(aggregate(result.value), dependencies.teamConfig);
  writeCache({ data, fetchedAt: dependencies.now() });

  return { kind: "REVIEW_COUNTS", data };
}

function isCacheFresh(cache: ReviewCountsCacheEntry, currentTime: number, ttlMs: number): boolean {
  return currentTime - cache.fetchedAt < ttlMs;
}
