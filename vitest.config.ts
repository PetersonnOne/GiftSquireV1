import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    testTimeout: 20000,
    environment: "edge-runtime",
    include: ["tests/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
