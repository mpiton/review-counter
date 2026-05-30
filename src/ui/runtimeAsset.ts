import { browser } from "wxt/browser";

export function resolveExtensionAssetUrl(path: string): string {
  try {
    return new URL(path, browser.runtime.getURL("/")).toString();
  } catch {
    return `/${path}`;
  }
}
