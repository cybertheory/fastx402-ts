import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  // Ignore PostCSS config issues
  css: false,
});

