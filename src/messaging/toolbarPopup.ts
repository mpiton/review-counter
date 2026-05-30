type PopupOpenResult = Promise<void> | void;

interface PopupOpener {
  readonly openPopup: () => PopupOpenResult;
}

/** Opens the extension toolbar popup across Chrome MV3 and Firefox MV2 builds. */
export async function openToolbarPopup(extensionBrowser: unknown): Promise<void> {
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

function getPopupOpeners(extensionBrowser: unknown): readonly PopupOpener[] {
  if (!isRecord(extensionBrowser)) {
    return [];
  }

  const candidates = [extensionBrowser.action, extensionBrowser.browserAction];
  const openers = candidates.filter(isPopupOpener);

  return Array.from(new Set(openers));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPopupOpener(value: unknown): value is PopupOpener {
  return isRecord(value) && typeof value.openPopup === "function";
}
