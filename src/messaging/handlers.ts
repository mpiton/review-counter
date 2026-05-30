import { teamConfig as defaultTeamConfig } from "../config/team.config";
import { aggregate } from "../domain/aggregate";
import { mapToTeams } from "../domain/mapping";
import type { TeamConfig, TeamReviewCounts } from "../domain/types";
import { fetchOpenPRs as defaultFetchOpenPRs } from "../github";
import type { ErrorReason, NormalizedPRs, Result } from "../github";
import { getToken as defaultGetToken, setToken as defaultSetToken } from "../storage";
import type { Request, Response } from "./protocol";

export const REVIEW_COUNTS_CACHE_TTL_MS = 60_000;

export type GetStoredToken = () => Promise<string | null>;
export type SetStoredToken = (token: string) => Promise<void>;
export type FetchOpenPullRequests = (token: string) => Promise<Result<NormalizedPRs, ErrorReason>>;
export type MessageHandler = (request: Request) => Promise<Response>;

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

export function createMessageHandler(options: MessageHandlerOptions = {}): MessageHandler {
  const dependencies = createDependencies(options);
  let cache: ReviewCountsCacheEntry | null = null;

  return async (request) => {
    switch (request.kind) {
      case "GET_TOKEN":
        return { kind: "TOKEN", token: await dependencies.getToken() };

      case "SET_TOKEN":
        await dependencies.setToken(request.token);
        cache = null;

        return { kind: "OK" };

      case "FETCH_REVIEW_COUNTS":
        if (
          request.force !== true &&
          cache !== null &&
          isCacheFresh(cache, dependencies.now(), dependencies.ttlMs)
        ) {
          return { kind: "REVIEW_COUNTS", data: cache.data };
        }

        if (request.force === true) {
          cache = null;
        }

        return fetchReviewCounts(dependencies, (entry) => {
          cache = entry;
        });
    }
  };
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
