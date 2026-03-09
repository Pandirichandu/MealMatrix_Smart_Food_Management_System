import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5003/api/:path*',
      },
      {
        source: '/menu-images/:path*',
        destination: 'http://localhost:5003/menu-images/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5003/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
