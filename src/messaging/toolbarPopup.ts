type PopupOpenResult = Promise<void> | void;
type ToolbarPopupApiName = "action" | "browserAction";

interface BrowserPopupOpener {
  readonly openPopup: () => PopupOpenResult;
}

interface PopupOpener extends BrowserPopupOpener {
  readonly apiName: ToolbarPopupApiName;
}

interface PopupOpenFailure {
  readonly apiName: ToolbarPopupApiName;
  readonly error: unknown;
}

interface CrossBrowserExtensionApi {
  readonly action?: unknown;
  readonly browserAction?: unknown;
}

/** Opens the extension toolbar popup across Chrome MV3 and Firefox MV2 builds. */
export async function openToolbarPopup(extensionBrowser: CrossBrowserExtensionApi): Promise<void> {
  const openers = getPopupOpeners(extensionBrowser);

  if (openers.length === 0) {
    throw new Error("No toolbar popup API is available");
  }

  const failures: PopupOpenFailure[] = [];

  for (const opener of openers) {
    try {
      await opener.openPopup();
      return;
    } catch (error: unknown) {
      failures.push({ apiName: opener.apiName, error });
    }
  }

  throw new AggregateError(
    failures.map(createPopupOpenError),
    `Failed to open toolbar popup via ${formatApiNames(failures.map(({ apiName }) => apiName))}`,
  );
}

function getPopupOpeners(extensionBrowser: CrossBrowserExtensionApi): readonly PopupOpener[] {
  const actionOpener = getPopupOpener("action", extensionBrowser.action);
  const browserActionOpener = getPopupOpener("browserAction", extensionBrowser.browserAction);

  if (actionOpener === undefined) {
    return browserActionOpener === undefined ? [] : [browserActionOpener];
  }

  if (
    browserActionOpener === undefined ||
    extensionBrowser.action === extensionBrowser.browserAction
  ) {
    return [actionOpener];
  }

  return [actionOpener, browserActionOpener];
}

function getPopupOpener(apiName: ToolbarPopupApiName, value: unknown): PopupOpener | undefined {
  if (!isBrowserPopupOpener(value)) {
    return undefined;
  }

  return {
    apiName,
    openPopup: () => value.openPopup(),
  };
}

function createPopupOpenError(failure: PopupOpenFailure): Error {
  if (failure.error instanceof Error) {
    return new Error(`${failure.apiName}.openPopup failed: ${failure.error.message}`);
  }

  return new Error(`${failure.apiName}.openPopup failed: ${String(failure.error)}`);
}

function formatApiNames(apiNames: readonly ToolbarPopupApiName[]): string {
  return apiNames.join(" and ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBrowserPopupOpener(value: unknown): value is BrowserPopupOpener {
  return isRecord(value) && typeof value.openPopup === "function";
}
