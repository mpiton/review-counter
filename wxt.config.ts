import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Vates Review Counter",
    description: "Compte les PR ouvertes où les membres Vates sont demandés en review.",
    version: "0.0.0",
    // Required for local PAT storage; storage.sync is not used.
    permissions: ["storage"],
    host_permissions: [
      // Required for GitHub GraphQL; host access is only used by the background service worker.
      "https://api.github.com/*",
      // Required for the repo overlay and fonts; limited to Vates paths instead of all github.com.
      "https://github.com/vatesfr/*",
    ],
    action: {
      // Required popup entrypoint; it does not grant page or API access.
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
