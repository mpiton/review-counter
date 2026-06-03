/**
 * @vitest-environment happy-dom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => {
  const values = new Map<string, unknown>();
  const local = {
    get: vi.fn(async (key: string): Promise<Record<string, unknown>> => {
      return values.has(key) ? { [key]: values.get(key) } : {};
    }),
    set: vi.fn(async (items: Record<string, unknown>): Promise<void> => {
      for (const [key, value] of Object.entries(items)) {
        values.set(key, value);
      }
    }),
  };

  return { local, values };
});

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: storageMock.local,
    },
  },
}));

import { usePersistentState } from "./usePersistentState";

interface RenderedState<T> {
  readonly value: T;
  readonly isLoaded: boolean;
  readonly setValue: (next: T) => void;
}

interface RenderedHook<T> {
  readonly current: RenderedState<T>;
  readonly unmount: () => void;
}

interface PersistentStateOptions<T> {
  readonly storageKey: string;
  readonly fallback: T;
  readonly isValid: (value: unknown) => value is T;
  readonly normalize?: (value: T) => T;
}

const mountedRoots: RenderedHook<unknown>[] = [];
const WAIT_FOR_TIMEOUT_MS = 1_000;

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampToTen(value: number): number {
  return Math.min(10, Math.max(0, value));
}

describe("usePersistentState", () => {
  beforeEach(() => {
    storageMock.values.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const renderedHook of mountedRoots.splice(0)) {
      renderedHook.unmount();
    }
  });

  it("starts with the fallback before storage resolves", () => {
    const rendered = renderPersistentState({
      storageKey: "vatesReviewCounter.test",
      fallback: true,
      isValid: isBoolean,
    });

    expect(rendered.current.isLoaded).toBe(false);
    expect(rendered.current.value).toBe(true);
  });

  it("loads the persisted value from storage", async () => {
    storageMock.values.set("vatesReviewCounter.test", false);

    const rendered = renderPersistentState({
      storageKey: "vatesReviewCounter.test",
      fallback: true,
      isValid: isBoolean,
    });

    await waitFor(() => {
      expect(rendered.current.isLoaded).toBe(true);
      expect(rendered.current.value).toBe(false);
    });
  });

  it("keeps the fallback when the stored value has the wrong shape", async () => {
    storageMock.values.set("vatesReviewCounter.test", "not-a-boolean");

    const rendered = renderPersistentState({
      storageKey: "vatesReviewCounter.test",
      fallback: true,
      isValid: isBoolean,
    });

    await waitFor(() => {
      expect(rendered.current.isLoaded).toBe(true);
      expect(rendered.current.value).toBe(true);
    });
  });

  it("persists the previous value across a fresh mount (page reload)", async () => {
    const first = renderPersistentState({
      storageKey: "vatesReviewCounter.test",
      fallback: true,
      isValid: isBoolean,
    });

    await waitFor(() => {
      expect(first.current.isLoaded).toBe(true);
    });

    act(() => {
      first.current.setValue(false);
    });

    await waitFor(() => {
      expect(storageMock.values.get("vatesReviewCounter.test")).toBe(false);
    });

    first.unmount();

    const reloaded = renderPersistentState({
      storageKey: "vatesReviewCounter.test",
      fallback: true,
      isValid: isBoolean,
    });

    await waitFor(() => {
      expect(reloaded.current.isLoaded).toBe(true);
      expect(reloaded.current.value).toBe(false);
    });
  });

  it("applies normalize on load and on update", async () => {
    storageMock.values.set("vatesReviewCounter.number", 999);

    const rendered = renderPersistentState({
      storageKey: "vatesReviewCounter.number",
      fallback: 0,
      isValid: isFiniteNumber,
      normalize: clampToTen,
    });

    await waitFor(() => {
      expect(rendered.current.value).toBe(10);
    });

    act(() => {
      rendered.current.setValue(-5);
    });

    await waitFor(() => {
      expect(rendered.current.value).toBe(0);
      expect(storageMock.values.get("vatesReviewCounter.number")).toBe(0);
    });
  });

  it("never writes the fallback to storage before the stored value has loaded", async () => {
    storageMock.values.set("vatesReviewCounter.test", false);

    const rendered = renderPersistentState({
      storageKey: "vatesReviewCounter.test",
      fallback: true,
      isValid: isBoolean,
    });

    await waitFor(() => {
      expect(rendered.current.isLoaded).toBe(true);
      expect(rendered.current.value).toBe(false);
    });

    const wroteFallback = storageMock.local.set.mock.calls.some(
      ([items]) => (items as Record<string, unknown>)["vatesReviewCounter.test"] === true,
    );

    expect(wroteFallback).toBe(false);
  });

  it("falls back and finishes loading when storage rejects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    storageMock.local.get.mockRejectedValueOnce(new Error("storage unavailable"));

    try {
      const rendered = renderPersistentState({
        storageKey: "vatesReviewCounter.test",
        fallback: true,
        isValid: isBoolean,
      });

      await waitFor(() => {
        expect(rendered.current.isLoaded).toBe(true);
        expect(rendered.current.value).toBe(true);
      });

      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

function renderPersistentState<T>(options: PersistentStateOptions<T>): RenderedHook<T> {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);
  const snapshots: RenderedState<T>[] = [];

  function HookHarness() {
    const [value, setValue, isLoaded] = usePersistentState(options);
    snapshots.push({ value, setValue, isLoaded });

    return null;
  }

  act(() => {
    root.render(<HookHarness />);
  });

  const renderedHook = {
    get current() {
      const currentSnapshot = snapshots.at(-1);

      if (currentSnapshot === undefined) {
        throw new Error("usePersistentState did not render");
      }

      return currentSnapshot;
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  } satisfies RenderedHook<T>;

  mountedRoots.push(renderedHook as RenderedHook<unknown>);

  return renderedHook;
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

  throw new Error("Timed out while waiting for usePersistentState");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
