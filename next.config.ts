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
  typescript: {},
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
