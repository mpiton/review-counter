import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Vates Review Counter",
    description: "Compte les PR ouvertes où les membres Vates sont demandés en review.",
    version: "0.0.0",
  },
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
