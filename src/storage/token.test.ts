import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => {
  const values = new Map<string, unknown>();
  const local = {
    get: vi.fn(async (key: string): Promise<Record<string, unknown>> => {
      if (!values.has(key)) {
        return {};
      }

      return { [key]: values.get(key) };
    }),
    remove: vi.fn(async (key: string): Promise<void> => {
      values.delete(key);
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

import { GITHUB_TOKEN_STORAGE_KEY, clearToken, getToken, setToken } from "./token";

describe("token storage", () => {
  beforeEach(() => {
    storageMock.values.clear();
    vi.clearAllMocks();
  });

  it("stores and reads the token from browser.storage.local", async () => {
    await setToken("secret-token");

    await expect(getToken()).resolves.toBe("secret-token");
    expect(storageMock.local.set).toHaveBeenCalledWith({
      [GITHUB_TOKEN_STORAGE_KEY]: "secret-token",
    });
    expect(storageMock.local.get).toHaveBeenCalledWith(GITHUB_TOKEN_STORAGE_KEY);
  });

  it("returns null when no token is stored", async () => {
    await expect(getToken()).resolves.toBeNull();
  });

  it("clears the stored token", async () => {
    await setToken("secret-token");
    await clearToken();

    await expect(getToken()).resolves.toBeNull();
    expect(storageMock.local.remove).toHaveBeenCalledWith(GITHUB_TOKEN_STORAGE_KEY);
  });

  it("does not log the token", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      await setToken("secret-token");
      await getToken();
      await clearToken();

      expect(consoleLog).not.toHaveBeenCalled();
    } finally {
      consoleLog.mockRestore();
    }
  });
});
