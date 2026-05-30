import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { TeamReviewCounts } from "../domain";

const runtimeMock = vi.hoisted(() => ({
  sendMessage: vi.fn(async (request: unknown): Promise<unknown> => request),
}));

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: runtimeMock,
  },
}));

import { sendMessage } from "./protocol";
import type { Request, Response } from "./protocol";
import type { ReviewCountsMetadata } from "./protocol";

type SetTokenRequest = Extract<Request, { readonly kind: "SET_TOKEN" }>;
type FetchReviewCountsRequest = Extract<Request, { readonly kind: "FETCH_REVIEW_COUNTS" }>;
type ErrorResponse = Extract<Response, { readonly kind: "ERROR" }>;
type TokenResponse = Extract<Response, { readonly kind: "TOKEN" }>;
type OkResponse = Extract<Response, { readonly kind: "OK" }>;
type ReviewCountsResponse = Extract<Response, { readonly kind: "REVIEW_COUNTS" }>;

describe("messaging protocol", () => {
  beforeEach(() => {
    runtimeMock.sendMessage.mockReset();
    runtimeMock.sendMessage.mockImplementation(
      async (request: unknown): Promise<unknown> => request,
    );
  });

  it("sends GET_TOKEN requests and returns token responses", async () => {
    const response = { kind: "TOKEN", token: "secret-token" } satisfies TokenResponse;
    runtimeMock.sendMessage.mockResolvedValueOnce(response);

    await expect(sendMessage({ kind: "GET_TOKEN" })).resolves.toEqual(response);
    expect(runtimeMock.sendMessage).toHaveBeenCalledWith({ kind: "GET_TOKEN" });
    expectTypeOf(sendMessage({ kind: "GET_TOKEN" })).toEqualTypeOf<
      Promise<TokenResponse | ErrorResponse>
    >();
  });

  it("sends SET_TOKEN requests and returns ok responses", async () => {
    const request = { kind: "SET_TOKEN", token: "secret-token" } satisfies SetTokenRequest;
    const response = { kind: "OK" } satisfies OkResponse;
    runtimeMock.sendMessage.mockResolvedValueOnce(response);

    await expect(sendMessage(request)).resolves.toEqual(response);
    expect(runtimeMock.sendMessage).toHaveBeenCalledWith(request);
    expectTypeOf(sendMessage(request)).toEqualTypeOf<Promise<OkResponse | ErrorResponse>>();
  });

  it("sends FETCH_REVIEW_COUNTS requests and returns review count responses", async () => {
    const data = {
      frontend: [],
      backend: [],
      others: [],
    } satisfies TeamReviewCounts;
    const meta = {
      fetchedAt: 1_700_000_000_000,
      openPullRequestCount: 12,
    } satisfies ReviewCountsMetadata;
    const request = { kind: "FETCH_REVIEW_COUNTS", force: true } satisfies FetchReviewCountsRequest;
    const response = { kind: "REVIEW_COUNTS", data, meta } satisfies ReviewCountsResponse;
    runtimeMock.sendMessage.mockResolvedValueOnce(response);

    await expect(sendMessage(request)).resolves.toEqual(response);
    expect(runtimeMock.sendMessage).toHaveBeenCalledWith(request);
    expectTypeOf(sendMessage(request)).toEqualTypeOf<
      Promise<ReviewCountsResponse | ErrorResponse>
    >();
  });

  it("allows typed error responses for every request kind", async () => {
    const response = { kind: "ERROR", reason: "NETWORK" } satisfies ErrorResponse;
    runtimeMock.sendMessage.mockResolvedValueOnce(response);

    await expect(sendMessage({ kind: "GET_TOKEN" })).resolves.toEqual(response);
  });
});
