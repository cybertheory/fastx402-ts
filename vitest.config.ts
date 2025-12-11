import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  // Ignore PostCSS config issues
  css: {
    postcss: false,
  },
  // Don't search for config files in parent directories
  root: process.cwd(),
});

