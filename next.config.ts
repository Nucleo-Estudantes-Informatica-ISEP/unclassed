import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const pageExtensions = ["tsx", "ts", "jsx", "js"];

export function getPageExtensions(phase: string) {
  return phase === PHASE_DEVELOPMENT_SERVER
    ? ["dev.ts", ...pageExtensions]
    : pageExtensions;
}

const baseConfig: NextConfig = {
  output: "standalone",
  // Prevent Webpack from bundling @prisma/client — it can't resolve the
  // Prisma 6 WASM engine (query_engine_bg.js) at bundle time. Node.js
  // resolves it natively at runtime instead.
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@swc/helpers/**/*",
      "./node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

const nextConfig = (phase: string): NextConfig => ({
  ...baseConfig,
  pageExtensions: getPageExtensions(phase),
});

export default nextConfig;
