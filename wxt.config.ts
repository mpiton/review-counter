import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Vates Review Counter",
    description: "Compte les PR ouvertes où les membres Vates sont demandés en review.",
    version: "0.0.0",
    // Required for browser.storage.local token persistence; storage.sync is not used.
    permissions: ["storage"],
    host_permissions: [
      // GitHub GraphQL endpoint used only by the background service worker.
      "https://api.github.com/*",
      // GitHub repo pages where the content script and web-accessible fonts run.
      "https://github.com/vatesfr/*",
    ],
    action: {
      // Popup shown from the extension icon so users can configure their PAT.
      default_popup: "popup/index.html",
    },
    web_accessible_resources: [
      {
        matches: ["https://github.com/vatesfr/*"],
        resources: ["fonts/*.woff2"],
      },
    ],
  },
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
