import { browser } from "wxt/browser";

/**
 * Dedicated local storage key for the GitHub PAT used by this extension.
 */
export const GITHUB_TOKEN_STORAGE_KEY = "vatesReviewCounter.githubPat";

/**
 * Read the GitHub PAT from browser.storage.local.
 *
 * Stored values are accepted only when they are strings with non-whitespace content. Invalid or
 * missing values are treated as absent tokens so callers can handle the unauthenticated state.
 *
 * @returns The stored PAT, or null when no usable token is available.
 */
export async function getToken(): Promise<string | null> {
  const values: Record<string, unknown> = await browser.storage.local.get(GITHUB_TOKEN_STORAGE_KEY);
  const token = values[GITHUB_TOKEN_STORAGE_KEY];

  return isStoredToken(token) ? token : null;
}

/**
 * Store the GitHub PAT in browser.storage.local.
 *
 * The token stays in the extension's local storage area and is not synchronized across browser
 * profiles.
 *
 * @param token - GitHub PAT provided by the user through the extension popup.
 */
export async function setToken(token: string): Promise<void> {
  await browser.storage.local.set({ [GITHUB_TOKEN_STORAGE_KEY]: token });
}

/**
 * Remove the GitHub PAT from browser.storage.local.
 *
 * Call this when the user clears their configuration or needs to replace an invalid token.
 */
export async function clearToken(): Promise<void> {
  await browser.storage.local.remove(GITHUB_TOKEN_STORAGE_KEY);
}

function isStoredToken(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
