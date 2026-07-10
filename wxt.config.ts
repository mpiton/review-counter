import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: ({ browser }) => ({
    name: "Vates Review Counter",
    description: "Compte les PR ouvertes où les membres Vates sont demandés en review.",
    version: "0.3.2",
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
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
      default_icon: {
        16: "icons/icon-16.png",
        32: "icons/icon-32.png",
        48: "icons/icon-48.png",
        128: "icons/icon-128.png",
      },
    },
    web_accessible_resources: [
      {
        // MV3 web-accessible resource matches are origin-scoped by Chrome.
        matches: ["https://github.com/*"],
        resources: ["fonts/*.woff2", "icons/vates-planet.png"],
      },
    ],
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              // Required by Firefox signing and AMO's built-in data disclosure flow.
              id: "vates-review-counter@vates.tech",
              strict_min_version: "140.0",
              data_collection_permissions: {
                required: ["authenticationInfo", "websiteContent"],
              },
            },
          },
        }
      : {}),
  }),
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
