import { browser } from "wxt/browser";
import type { TeamReviewCounts } from "../domain";

export type MessageErrorReason = "NO_TOKEN" | "AUTH" | "RATE_LIMIT" | "NETWORK";

export type Request =
  | { readonly kind: "GET_TOKEN" }
  | { readonly kind: "SET_TOKEN"; readonly token: string }
  | { readonly kind: "FETCH_REVIEW_COUNTS"; readonly force?: boolean };

export type Response =
  | { readonly kind: "TOKEN"; readonly token: string | null }
  | { readonly kind: "OK" }
  | { readonly kind: "REVIEW_COUNTS"; readonly data: TeamReviewCounts }
  | { readonly kind: "ERROR"; readonly reason: MessageErrorReason };

export function sendMessage(request: Request): Promise<Response> {
  return browser.runtime.sendMessage<Request, Response>(request);
}
