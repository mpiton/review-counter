import { createRoot } from "react-dom/client";
import { browser } from "wxt/browser";
import "../../src/ui/styles.css";
import {
  createFontFaceCss,
  createThemeCss,
  installRuntimeStyles,
} from "../../src/ui/runtimeStyles";
import { PopupApp } from "./PopupApp";

const root = document.getElementById("root");

installRuntimeStyles(
  document,
  "vates-review-counter-runtime-styles",
  `${createFontFaceCss(resolveExtensionAssetUrl)}
${createThemeCss(":root")}`,
);

if (root !== null) {
  createRoot(root).render(<PopupApp />);
}

function resolveExtensionAssetUrl(path: string): string {
  return new URL(path, browser.runtime.getURL("/")).toString();
}
