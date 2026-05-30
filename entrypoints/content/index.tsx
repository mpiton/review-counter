import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import styles from "../../src/ui/styles.css?inline";
import { OverlayApp } from "./App";

const targetRepository = {
  host: "github.com",
  owner: "vatesfr",
  repo: "xen-orchestra",
} as const;
const overlayHostId = "vates-review-counter-root";
const overlayHostZIndex = "2147483647";
const shadowHostStyles = ":host{all:initial;color-scheme:normal;font-size:16px;}";

let reactRoot: Root | null = null;
let hostElement: HTMLDivElement | null = null;

interface RepositoryLocation {
  readonly hostname: string;
  readonly pathname: string;
}

export default defineContentScript({
  matches: ["https://github.com/vatesfr/*"],
  main(ctx: ContentScriptContext) {
    syncOverlayMount();

    ctx.addEventListener(window, "wxt:locationchange", syncOverlayMount);
    ctx.addEventListener(window, "hashchange", syncOverlayMount);
    ctx.addEventListener(document, "turbo:load", syncOverlayMount);
    ctx.addEventListener(document, "turbo:render", syncOverlayMount);
    ctx.onInvalidated(unmountOverlay);
  },
});

export function isTargetRepositoryUrl(url: RepositoryLocation): boolean {
  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length < 2) {
    return false;
  }

  const owner = segments[0];
  const repo = segments[1];

  if (owner === undefined || repo === undefined) {
    return false;
  }

  return (
    url.hostname.toLowerCase() === targetRepository.host &&
    owner.toLowerCase() === targetRepository.owner &&
    repo.toLowerCase() === targetRepository.repo
  );
}

function syncOverlayMount(): void {
  try {
    if (isTargetRepositoryUrl(window.location)) {
      mountOverlay();
      return;
    }

    unmountOverlay();
  } catch (error) {
    unmountOverlay();
    console.error("[Vates Review Counter] Failed to sync overlay mount", error);
  }
}

function mountOverlay(): void {
  const existingHost = document.getElementById(overlayHostId);

  if (reactRoot !== null && existingHost === hostElement) {
    return;
  }

  unmountOverlay();
  existingHost?.remove();

  const host = document.createElement("div");
  host.id = overlayHostId;
  host.style.display = "block";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = overlayHostZIndex;
  document.documentElement.append(host);

  // The project task requires an open shadow root for overlay inspection and future UI tests.
  const shadowRoot = host.attachShadow({ mode: "open" });
  const styleElement = document.createElement("style");
  styleElement.append(document.createTextNode(shadowHostStyles));
  styleElement.append(document.createTextNode(styles));
  shadowRoot.append(styleElement);

  const appRoot = document.createElement("div");
  shadowRoot.append(appRoot);

  hostElement = host;
  reactRoot = createRoot(appRoot);
  reactRoot.render(<OverlayApp />);
}

function unmountOverlay(): void {
  reactRoot?.unmount();
  hostElement?.remove();
  reactRoot = null;
  hostElement = null;
}
