import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Project report PDFs (and other FormData uploads) need headroom above 3mb.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
