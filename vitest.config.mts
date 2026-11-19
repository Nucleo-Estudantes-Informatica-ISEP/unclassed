import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "k6/http": fileURLToPath(
        new URL("./tests/k6/mocks/k6.js", import.meta.url)
      ),
      "k6/metrics": fileURLToPath(
        new URL("./tests/k6/mocks/k6.js", import.meta.url)
      ),
      k6: fileURLToPath(new URL("./tests/k6/mocks/k6.js", import.meta.url)),
    },
  },
  test: {
    exclude: [
      "**/*.integration.test.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "tests/e2e/**",
    ],
  },
});
