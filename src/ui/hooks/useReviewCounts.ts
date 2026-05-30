import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { TeamReviewCounts } from "../../domain";
import { sendMessage } from "../../messaging";
import type { MessageErrorReason, Request } from "../../messaging";
import type { ReviewCountsResponseMetadata } from "../../messaging";

/** Stable React Query cache key for review count data. */
export const REVIEW_COUNTS_QUERY_KEY: readonly ["reviewCounts"] = ["reviewCounts"];

/** UI query freshness window, aligned with the 60 second background service worker cache TTL. */
export const REVIEW_COUNTS_STALE_TIME_MS = 60_000;

/** Retry limit for retryable review count failures such as transient network errors. */
export const REVIEW_COUNTS_RETRY_LIMIT = 2;

type FetchReviewCountsRequest = Extract<Request, { readonly kind: "FETCH_REVIEW_COUNTS" }>;

/**
 * UI-facing query status. `loading` deliberately wraps TanStack Query's `pending` status so
 * overlay components can use the product language from the design spec.
 */
export type ReviewCountsStatus = "loading" | "error" | "success";

/** Review count state and commands exposed to overlay components. */
export interface UseReviewCountsResult {
  readonly data: TeamReviewCounts | undefined;
  readonly error: ReviewCountsError | null;
  readonly meta: ReviewCountsResponseMetadata | undefined;
  readonly refresh: () => Promise<void>;
  readonly status: ReviewCountsStatus;
}

interface ReviewCountsSnapshot {
  readonly data: TeamReviewCounts;
  readonly meta: ReviewCountsResponseMetadata;
}

/** Typed review count failure that preserves the background messaging error reason. */
export class ReviewCountsError extends Error {
  readonly reason: MessageErrorReason;

  constructor(reason: MessageErrorReason) {
    super(reviewCountsErrorMessages[reason]);
    this.name = "ReviewCountsError";
    this.reason = reason;
  }
}

const reviewCountsErrorMessages: Record<MessageErrorReason, string> = {
  AUTH: "GitHub authentication failed.",
  NETWORK: "Unable to reach the background data source.",
  NO_TOKEN: "No GitHub token is configured.",
  RATE_LIMIT: "GitHub rate limit reached.",
};

const reviewCountsQueryOptions = {
  queryKey: REVIEW_COUNTS_QUERY_KEY,
  retry: shouldRetryReviewCounts,
  staleTime: REVIEW_COUNTS_STALE_TIME_MS,
} as const;

/** Fetch, cache, and refresh aggregated review counts through background messaging. */
export function useReviewCounts(): UseReviewCountsResult {
  const queryClient = useQueryClient();
  const query = useQuery<ReviewCountsSnapshot, ReviewCountsError>({
    ...reviewCountsQueryOptions,
    queryFn: () => fetchReviewCounts(false),
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: REVIEW_COUNTS_QUERY_KEY,
      refetchType: "none",
    });

    try {
      await queryClient.fetchQuery<ReviewCountsSnapshot, ReviewCountsError>({
        ...reviewCountsQueryOptions,
        queryFn: () => fetchReviewCounts(true),
      });
    } catch {
      // The query cache already exposes the failure through status/error.
    }
  }, [queryClient]);

  return {
    data: query.data?.data,
    error: query.error,
    meta: query.data?.meta,
    refresh,
    status: toReviewCountsStatus(query.status),
  };
}

async function fetchReviewCounts(force: boolean): Promise<ReviewCountsSnapshot> {
  let response: Awaited<ReturnType<typeof sendMessage<FetchReviewCountsRequest>>>;

  try {
    response = await sendMessage(createFetchReviewCountsRequest(force));
  } catch {
    throw new ReviewCountsError("NETWORK");
  }

  if (response.kind === "REVIEW_COUNTS") {
    return {
      data: response.data,
      meta: response.meta,
    };
  }

  throw new ReviewCountsError(response.reason);
}

function createFetchReviewCountsRequest(force: boolean): FetchReviewCountsRequest {
  if (force) {
    return { kind: "FETCH_REVIEW_COUNTS", force: true };
  }

  return { kind: "FETCH_REVIEW_COUNTS" };
}

function shouldRetryReviewCounts(failureCount: number, error: ReviewCountsError): boolean {
  if (error.reason === "AUTH" || error.reason === "NO_TOKEN") {
    return false;
  }

  return failureCount < REVIEW_COUNTS_RETRY_LIMIT;
}

function toReviewCountsStatus(status: "pending" | "error" | "success"): ReviewCountsStatus {
  if (status === "pending") {
    return "loading";
  }

  return status;
}
