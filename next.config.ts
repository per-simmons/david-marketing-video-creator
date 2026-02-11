import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/pablo/marketing-video-creator",
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/compositor-darwin-arm64",
  ],
  turbopack: {},
};

export default nextConfig;
