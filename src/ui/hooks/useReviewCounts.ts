import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { TeamReviewCounts } from "../../domain";
import { sendMessage } from "../../messaging";
import type { MessageErrorReason, Request } from "../../messaging";

export const REVIEW_COUNTS_QUERY_KEY: readonly ["reviewCounts"] = ["reviewCounts"];
export const REVIEW_COUNTS_STALE_TIME_MS = 60_000;

const REVIEW_COUNTS_RETRY_LIMIT = 2;

type FetchReviewCountsRequest = Extract<Request, { readonly kind: "FETCH_REVIEW_COUNTS" }>;

export type ReviewCountsStatus = "loading" | "error" | "success";

export interface UseReviewCountsResult {
  readonly data: TeamReviewCounts | undefined;
  readonly error: ReviewCountsError | null;
  readonly refresh: () => Promise<void>;
  readonly status: ReviewCountsStatus;
}

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

export function useReviewCounts(): UseReviewCountsResult {
  const queryClient = useQueryClient();
  const query = useQuery<TeamReviewCounts, ReviewCountsError>({
    queryKey: REVIEW_COUNTS_QUERY_KEY,
    queryFn: () => fetchReviewCounts(false),
    retry: shouldRetryReviewCounts,
    staleTime: REVIEW_COUNTS_STALE_TIME_MS,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: REVIEW_COUNTS_QUERY_KEY,
      refetchType: "none",
    });
    await queryClient.fetchQuery<TeamReviewCounts, ReviewCountsError>({
      queryKey: REVIEW_COUNTS_QUERY_KEY,
      queryFn: () => fetchReviewCounts(true),
      retry: shouldRetryReviewCounts,
      staleTime: REVIEW_COUNTS_STALE_TIME_MS,
    });
  }, [queryClient]);

  return {
    data: query.data,
    error: query.error,
    refresh,
    status: toReviewCountsStatus(query.status),
  };
}

async function fetchReviewCounts(force: boolean): Promise<TeamReviewCounts> {
  let response: Awaited<ReturnType<typeof sendMessage<FetchReviewCountsRequest>>>;

  try {
    response = await sendMessage(createFetchReviewCountsRequest(force));
  } catch {
    throw new ReviewCountsError("NETWORK");
  }

  if (response.kind === "REVIEW_COUNTS") {
    return response.data;
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
