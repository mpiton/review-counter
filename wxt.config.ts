import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Vates Review Counter",
    description: "Compte les PR ouvertes où les membres Vates sont demandés en review.",
    version: "0.0.0",
    // Required for browser.storage.local token persistence; storage.sync is not used.
    permissions: ["storage"],
    // Background-only GraphQL calls require api.github.com; page access stays limited to Vates paths.
    host_permissions: ["https://api.github.com/*", "https://github.com/vatesfr/*"],
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
