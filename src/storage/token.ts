import { browser } from "wxt/browser";

/**
 * Dedicated local storage key for the GitHub PAT used by this extension.
 */
export const GITHUB_TOKEN_STORAGE_KEY = "vatesReviewCounter.githubPat";

/**
 * Read the stored GitHub PAT from local extension storage.
 */
export async function getToken(): Promise<string | null> {
  const values: Record<string, unknown> = await browser.storage.local.get(GITHUB_TOKEN_STORAGE_KEY);
  const token = values[GITHUB_TOKEN_STORAGE_KEY];

  return isStoredToken(token) ? token : null;
}

/**
 * Store the GitHub PAT in local extension storage.
 */
export async function setToken(token: string): Promise<void> {
  await browser.storage.local.set({ [GITHUB_TOKEN_STORAGE_KEY]: token });
}

/**
 * Remove the GitHub PAT from local extension storage.
 */
export async function clearToken(): Promise<void> {
  await browser.storage.local.remove(GITHUB_TOKEN_STORAGE_KEY);
}

function isStoredToken(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
