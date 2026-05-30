type PopupOpenResult = Promise<void> | void;

interface PopupOpener {
  readonly openPopup: () => PopupOpenResult;
}

interface ToolbarPopupBrowser {
  readonly action?: unknown;
  readonly browserAction?: unknown;
}

/** Opens the extension toolbar popup across Chrome MV3 and Firefox MV2 builds. */
export async function openToolbarPopup(extensionBrowser: ToolbarPopupBrowser): Promise<void> {
  const openers = getPopupOpeners(extensionBrowser);

  if (openers.length === 0) {
    throw new Error("No toolbar popup API is available");
  }

  const failures: unknown[] = [];

  for (const opener of openers) {
    try {
      await opener.openPopup();
      return;
    } catch (error: unknown) {
      failures.push(error);
    }
  }

  throw new AggregateError(failures, "Failed to open toolbar popup");
}

function getPopupOpeners(extensionBrowser: ToolbarPopupBrowser): readonly PopupOpener[] {
  const actionOpener = getPopupOpener(extensionBrowser.action);
  const browserActionOpener = getPopupOpener(extensionBrowser.browserAction);

  if (actionOpener === undefined) {
    return browserActionOpener === undefined ? [] : [browserActionOpener];
  }

  if (browserActionOpener === undefined || browserActionOpener === actionOpener) {
    return [actionOpener];
  }

  return [actionOpener, browserActionOpener];
}

function getPopupOpener(value: unknown): PopupOpener | undefined {
  if (!isPopupOpener(value)) {
    return undefined;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPopupOpener(value: unknown): value is PopupOpener {
  return isRecord(value) && typeof value.openPopup === "function";
}
