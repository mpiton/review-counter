/**
 * @vitest-environment happy-dom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamReviewCounts } from "../../domain";
import type { MessageErrorReason, Request, Response } from "../../messaging";
import type { ReviewCountsResponseMetadata } from "../../messaging";

const messagingMock = vi.hoisted(() => ({
  sendMessage: vi.fn<(request: Request) => Promise<Response>>(),
}));

vi.mock("../../messaging", () => ({
  sendMessage: messagingMock.sendMessage,
}));

import { useReviewCounts } from "./useReviewCounts";
import type { UseReviewCountsResult } from "./useReviewCounts";

interface RenderedHook {
  readonly current: UseReviewCountsResult;
  readonly unmount: () => void;
}

const renderedHooks: RenderedHook[] = [];
const WAIT_FOR_TIMEOUT_MS = 1_000;

const initialCounts = {
  frontend: [{ login: "alice", displayName: "Alice", count: 2 }],
  backend: [{ login: "bob", displayName: "Bob", count: 0 }],
  others: [],
} satisfies TeamReviewCounts;

const refreshedCounts = {
  frontend: [{ login: "alice", displayName: "Alice", count: 1 }],
  backend: [{ login: "bob", displayName: "Bob", count: 3 }],
  others: [{ login: "carol", displayName: "carol", count: 1 }],
} satisfies TeamReviewCounts;

const initialMeta = {
  fetchedAt: 1_700_000_000_000,
  openPullRequestCount: 4,
} satisfies ReviewCountsResponseMetadata;

const refreshedMeta = {
  fetchedAt: 1_700_000_030_000,
  openPullRequestCount: 6,
} satisfies ReviewCountsResponseMetadata;

describe("useReviewCounts", () => {
  beforeEach(() => {
    messagingMock.sendMessage.mockReset();
  });

  afterEach(() => {
    for (const renderedHook of renderedHooks.splice(0)) {
      renderedHook.unmount();
    }
  });

  it("exposes data when REVIEW_COUNTS is received", async () => {
    messagingMock.sendMessage.mockResolvedValueOnce({
      kind: "REVIEW_COUNTS",
      data: initialCounts,
      meta: initialMeta,
    });

    const rendered = renderUseReviewCounts();

    await waitFor(() => {
      expect(rendered.current.status).toBe("success");
      expect(rendered.current.data).toEqual(initialCounts);
      expect(rendered.current.meta).toEqual(initialMeta);
      expect(rendered.current.error).toBeNull();
    });
    expect(messagingMock.sendMessage).toHaveBeenCalledTimes(1);
    expect(messagingMock.sendMessage).toHaveBeenCalledWith({ kind: "FETCH_REVIEW_COUNTS" });
  });

  it("refreshes with force true and exposes the refreshed data", async () => {
    messagingMock.sendMessage
      .mockResolvedValueOnce({ kind: "REVIEW_COUNTS", data: initialCounts, meta: initialMeta })
      .mockResolvedValueOnce({ kind: "REVIEW_COUNTS", data: refreshedCounts, meta: refreshedMeta });

    const rendered = renderUseReviewCounts();

    await waitFor(() => {
      expect(rendered.current.status).toBe("success");
      expect(rendered.current.data).toEqual(initialCounts);
    });

    await act(async () => {
      await rendered.current.refresh();
    });

    await waitFor(() => {
      expect(rendered.current.status).toBe("success");
      expect(rendered.current.data).toEqual(refreshedCounts);
      expect(rendered.current.meta).toEqual(refreshedMeta);
    });
    expect(messagingMock.sendMessage).toHaveBeenCalledTimes(2);
    expect(messagingMock.sendMessage).toHaveBeenNthCalledWith(2, {
      kind: "FETCH_REVIEW_COUNTS",
      force: true,
    });
  });

  it("does not reject refresh when the forced refetch fails", async () => {
    messagingMock.sendMessage
      .mockResolvedValueOnce({ kind: "REVIEW_COUNTS", data: initialCounts, meta: initialMeta })
      .mockResolvedValueOnce({ kind: "ERROR", reason: "AUTH" });

    const rendered = renderUseReviewCounts();

    await waitFor(() => {
      expect(rendered.current.status).toBe("success");
      expect(rendered.current.data).toEqual(initialCounts);
    });

    await expect(
      act(async () => {
        await rendered.current.refresh();
      }),
    ).resolves.toBeUndefined();
    expect(messagingMock.sendMessage).toHaveBeenNthCalledWith(2, {
      kind: "FETCH_REVIEW_COUNTS",
      force: true,
    });
  });

  it.each(["AUTH", "NO_TOKEN"] satisfies readonly MessageErrorReason[])(
    "does not retry when the background returns %s",
    async (reason) => {
      messagingMock.sendMessage.mockResolvedValue({
        kind: "ERROR",
        reason,
      });

      const rendered = renderUseReviewCounts();

      await waitFor(() => {
        expect(rendered.current.status).toBe("error");
        expect(rendered.current.error?.reason).toBe(reason);
      });
      expect(messagingMock.sendMessage).toHaveBeenCalledTimes(1);
    },
  );
});

function renderUseReviewCounts(queryClient = createTestQueryClient()): RenderedHook {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);
  const snapshots: UseReviewCountsResult[] = [];

  function HookHarness() {
    snapshots.push(useReviewCounts());

    return null;
  }

  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>,
    );
  });

  const renderedHook = {
    get current() {
      const currentSnapshot = snapshots.at(-1);

      if (currentSnapshot === undefined) {
        throw new Error("useReviewCounts did not render");
      }

      return currentSnapshot;
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
      queryClient.clear();
    },
  } satisfies RenderedHook;

  renderedHooks.push(renderedHook);

  return renderedHook;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient();
}

async function waitFor(assertion: () => void): Promise<void> {
  const timeoutAt = Date.now() + WAIT_FOR_TIMEOUT_MS;
  let lastError: unknown;

  while (Date.now() < timeoutAt) {
    try {
      assertion();

      return;
    } catch (error) {
      lastError = error;
      await act(async () => {
        await delay(0);
      });
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Timed out while waiting for useReviewCounts");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
