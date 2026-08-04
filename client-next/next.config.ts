import type { NextConfig } from "next";
import './envConfig'

const serverPort=process.env.NEXT_PUBLIC_SERVER_PORT || 5000;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "media.espncdn.com" },
    ],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `http://localhost:${serverPort}/api/:path*` },
    ];
  },
};

export default nextConfig;
