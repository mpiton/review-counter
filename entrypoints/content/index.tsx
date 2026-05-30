import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import styles from "../../src/ui/styles.css?inline";
import { OverlayApp } from "./App";

const rootId = "vates-review-counter-root";
const targetHost = "github.com";
const targetOwner = "vatesfr";
const targetRepo = "xen-orchestra";

let reactRoot: Root | null = null;
let hostElement: HTMLDivElement | null = null;

interface RepositoryLocation {
  readonly hostname: string;
  readonly pathname: string;
}

export default defineContentScript({
  matches: ["https://github.com/vatesfr/*"],
  main() {
    syncOverlayMount();

    window.addEventListener("popstate", syncOverlayMount);
    window.addEventListener("hashchange", syncOverlayMount);
    document.addEventListener("turbo:load", syncOverlayMount);
    document.addEventListener("turbo:render", syncOverlayMount);
    window.setInterval(syncOverlayMount, 1_000);
  },
});

export function isTargetRepositoryUrl(url: RepositoryLocation): boolean {
  const [owner, repo] = url.pathname.split("/").filter(Boolean);

  return (
    url.hostname === targetHost &&
    owner?.toLowerCase() === targetOwner &&
    repo?.toLowerCase() === targetRepo
  );
}

function syncOverlayMount(): void {
  if (isTargetRepositoryUrl(window.location)) {
    mountOverlay();
    return;
  }

  unmountOverlay();
}

function mountOverlay(): void {
  if (reactRoot !== null) {
    return;
  }

  document.getElementById(rootId)?.remove();

  const host = document.createElement("div");
  host.id = rootId;
  host.style.display = "block";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483647";
  document.documentElement.append(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const styleElement = document.createElement("style");
  styleElement.textContent = `:host{all:initial;color-scheme:normal;}${styles}`;
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
