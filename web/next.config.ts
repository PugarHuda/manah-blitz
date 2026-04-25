import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Persist Turbopack compiler artifacts on disk between dev restarts.
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    // We don't load remote images (yet). Keep this empty so we can't accidentally
    // proxy untrusted hosts.
    remotePatterns: [],
  },
};

export default nextConfig;
