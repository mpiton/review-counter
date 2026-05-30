import { describe, expect, it, vi } from "vitest";
import { openToolbarPopup } from "./toolbarPopup";

describe("toolbar popup opener", () => {
  it("opens the Chrome MV3 action popup", async () => {
    const openPopup = vi.fn(async () => undefined);

    await expect(openToolbarPopup({ action: { openPopup } })).resolves.toBeUndefined();
    expect(openPopup).toHaveBeenCalledOnce();
  });

  it("opens the Firefox MV2 browser action popup", async () => {
    const openPopup = vi.fn(async () => undefined);

    await expect(openToolbarPopup({ browserAction: { openPopup } })).resolves.toBeUndefined();
    expect(openPopup).toHaveBeenCalledOnce();
  });

  it("falls back to browserAction when action fails", async () => {
    const actionOpenPopup = vi.fn(async () => {
      throw new Error("unsupported action namespace");
    });
    const browserActionOpenPopup = vi.fn(async () => undefined);

    await expect(
      openToolbarPopup({
        action: { openPopup: actionOpenPopup },
        browserAction: { openPopup: browserActionOpenPopup },
      }),
    ).resolves.toBeUndefined();
    expect(actionOpenPopup).toHaveBeenCalledOnce();
    expect(browserActionOpenPopup).toHaveBeenCalledOnce();
  });

  it("rejects when no toolbar popup API is available", async () => {
    await expect(openToolbarPopup({ action: {} })).rejects.toThrow(
      "No toolbar popup API is available",
    );
  });

  it("rejects when every toolbar popup API fails", async () => {
    const actionOpenPopup = vi.fn(async () => {
      throw new Error("action failed");
    });
    const browserActionOpenPopup = vi.fn(async () => {
      throw new Error("browser action failed");
    });

    await expect(
      openToolbarPopup({
        action: { openPopup: actionOpenPopup },
        browserAction: { openPopup: browserActionOpenPopup },
      }),
    ).rejects.toThrow("Failed to open toolbar popup");
  });
});
