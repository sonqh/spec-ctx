import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/fixtures/**", "**/node_modules/**"],
    environment: "node",
    setupFiles: ["tests/preload.ts"],
    testTimeout: 20000,
  },
});
