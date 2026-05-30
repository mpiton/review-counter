import { browser } from "wxt/browser";

export const GITHUB_TOKEN_STORAGE_KEY = "githubPat";

export async function getToken(): Promise<string | null> {
  const values: Record<string, unknown> = await browser.storage.local.get(GITHUB_TOKEN_STORAGE_KEY);
  const token = values[GITHUB_TOKEN_STORAGE_KEY];

  return typeof token === "string" ? token : null;
}

export async function setToken(token: string): Promise<void> {
  await browser.storage.local.set({ [GITHUB_TOKEN_STORAGE_KEY]: token });
}

export async function clearToken(): Promise<void> {
  await browser.storage.local.remove(GITHUB_TOKEN_STORAGE_KEY);
}
