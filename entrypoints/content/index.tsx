import { createRoot } from "react-dom/client";
import styles from "../../src/ui/styles.css?inline";
import { OverlayApp } from "./App";

const rootId = "vates-review-counter-root";

export default defineContentScript({
  matches: ["https://github.com/vatesfr/*"],
  main() {
    document.getElementById(rootId)?.remove();

    const host = document.createElement("div");
    host.id = rootId;
    document.documentElement.append(host);

    const shadowRoot = host.attachShadow({ mode: "open" });
    const styleElement = document.createElement("style");
    styleElement.textContent = styles;
    shadowRoot.append(styleElement);

    const appRoot = document.createElement("div");
    shadowRoot.append(appRoot);

    createRoot(appRoot).render(<OverlayApp />);
  },
});
