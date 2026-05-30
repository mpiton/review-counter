/**
 * Defines the extension messaging contract shared by popup, content, and background contexts.
 * Requests and responses are discriminated on `kind`; callers should use `sendMessage` so each
 * request kind receives only the response shapes handled by its background route.
 */
import { browser } from "wxt/browser";
import type { TeamReviewCounts } from "../domain";

export type MessageErrorReason = "NO_TOKEN" | "AUTH" | "RATE_LIMIT" | "NETWORK";

type GetTokenRequest = { readonly kind: "GET_TOKEN" };
type SetTokenRequest = { readonly kind: "SET_TOKEN"; readonly token: string };
type FetchReviewCountsRequest = { readonly kind: "FETCH_REVIEW_COUNTS"; readonly force?: boolean };

type TokenResponse = { readonly kind: "TOKEN"; readonly token: string | null };
type OkResponse = { readonly kind: "OK" };
type ReviewCountsResponse = { readonly kind: "REVIEW_COUNTS"; readonly data: TeamReviewCounts };
type ErrorResponse = { readonly kind: "ERROR"; readonly reason: MessageErrorReason };

export type Request = GetTokenRequest | SetTokenRequest | FetchReviewCountsRequest;
export type Response = TokenResponse | OkResponse | ReviewCountsResponse | ErrorResponse;

export function sendMessage(request: GetTokenRequest): Promise<TokenResponse | ErrorResponse>;
export function sendMessage(request: SetTokenRequest): Promise<OkResponse | ErrorResponse>;
export function sendMessage(
  request: FetchReviewCountsRequest,
): Promise<ReviewCountsResponse | ErrorResponse>;
export function sendMessage(request: Request): Promise<Response>;
export function sendMessage(request: Request): Promise<Response> {
  const response: Promise<Response> = browser.runtime.sendMessage(request);

  return response;
}
