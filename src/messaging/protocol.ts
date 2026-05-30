/**
 * Defines the extension messaging contract shared by popup, content, and background contexts.
 * Requests and responses are discriminated on `kind`; callers should use `sendMessage` so each
 * request kind receives only the response shapes handled by its background route.
 */
import { browser } from "wxt/browser";
import type { TeamReviewCounts } from "../domain";

/**
 * Shared messaging failure reasons returned by the background service worker.
 *
 * - `NO_TOKEN`: no usable PAT is stored locally; callers should show the configuration prompt.
 * - `AUTH`: GitHub rejected the PAT or its scopes; callers should ask for a replacement token.
 * - `RATE_LIMIT`: GitHub rate limiting prevented the request; callers should keep existing data
 *   visible and allow a later retry.
 * - `NETWORK`: transport or unexpected payload failure; callers should show a retryable error.
 */
export type MessageErrorReason = "NO_TOKEN" | "AUTH" | "RATE_LIMIT" | "NETWORK";

type GetTokenRequest = { readonly kind: "GET_TOKEN" };
type SetTokenRequest = { readonly kind: "SET_TOKEN"; readonly token: string };
type FetchReviewCountsRequest = { readonly kind: "FETCH_REVIEW_COUNTS"; readonly force?: boolean };

export interface ReviewCountsResponseMetadata {
  readonly fetchedAt: number;
  readonly openPullRequestCount: number;
}

type TokenResponse = { readonly kind: "TOKEN"; readonly token: string | null };
type OkResponse = { readonly kind: "OK" };
type ReviewCountsResponse = {
  readonly kind: "REVIEW_COUNTS";
  readonly data: TeamReviewCounts;
  readonly meta: ReviewCountsResponseMetadata;
};
type ErrorResponse = { readonly kind: "ERROR"; readonly reason: MessageErrorReason };

/**
 * Messages sent by popup or content contexts to the background service worker.
 */
export type Request = GetTokenRequest | SetTokenRequest | FetchReviewCountsRequest;

/**
 * Messages returned by the background service worker to extension callers.
 */
export type Response = TokenResponse | OkResponse | ReviewCountsResponse | ErrorResponse;

type ResponseFor<TRequest extends Request> = TRequest extends GetTokenRequest
  ? TokenResponse | ErrorResponse
  : TRequest extends SetTokenRequest
    ? OkResponse | ErrorResponse
    : TRequest extends FetchReviewCountsRequest
      ? ReviewCountsResponse | ErrorResponse
      : Response;

/**
 * Send a typed extension request through the browser runtime messaging channel.
 *
 * The return type is derived from the request kind while still accepting the full `Request` union
 * for call sites that route messages dynamically.
 */
export function sendMessage<TRequest extends Request>(
  request: TRequest,
): Promise<ResponseFor<TRequest>> {
  const response: Promise<ResponseFor<TRequest>> = browser.runtime.sendMessage(request);

  return response;
}
