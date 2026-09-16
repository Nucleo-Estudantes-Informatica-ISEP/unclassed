import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    exclude: [
      "**/*.integration.test.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
    ],
  },
});
