import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/domain/**/*.{test,spec}.ts",
      "src/github/**/*.{test,spec}.ts",
      "src/messaging/**/*.{test,spec}.ts",
      "src/storage/**/*.{test,spec}.ts",
      "src/ui/**/*.{test,spec}.ts",
      "src/ui/**/*.{test,spec}.tsx",
    ],
    passWithNoTests: true,
    restoreMocks: true,
  },
});
