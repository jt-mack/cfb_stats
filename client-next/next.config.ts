import type { NextConfig } from "next";
import './envConfig'

const serverPort=process.env.NEXT_PUBLIC_SERVER_PORT || 5000;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `http://localhost:${serverPort}/api/:path*` },
    ];
  },
};

export default nextConfig;
