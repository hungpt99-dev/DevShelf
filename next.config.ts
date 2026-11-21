import type { NextConfig } from "next";

// GitHub Pages project sites are served from /<repo>/; local/root hosting leaves it empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  reactStrictMode: true,
  images: { unoptimized: true },
  typedRoutes: false,
};

export default nextConfig;
