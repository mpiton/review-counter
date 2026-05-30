import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Vates Review Counter",
    description: "Compte les PR ouvertes où les membres Vates sont demandés en review.",
    version: "0.0.0",
    // Required for browser.storage.local token persistence.
    permissions: ["storage"],
    // GitHub GraphQL calls use api.github.com; the overlay only runs on Vates GitHub pages.
    host_permissions: ["https://api.github.com/*", "https://github.com/vatesfr/*"],
    // WXT rewrites this entrypoint to the generated popup HTML for each target browser.
    action: {
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
