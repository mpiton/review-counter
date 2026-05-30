import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Vates Review Counter",
    description: "Compte les PR ouvertes où les membres Vates sont demandés en review.",
    version: "0.0.0",
    permissions: ["storage"],
    host_permissions: ["https://api.github.com/*", "https://github.com/vatesfr/*"],
    action: { default_popup: "popup/index.html" },
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
