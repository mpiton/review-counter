import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/domain/**/*.{test,spec}.ts", "src/github/**/*.{test,spec}.ts"],
    passWithNoTests: true,
    restoreMocks: true,
  },
});
