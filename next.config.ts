import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, // Silence Turbopack warning/error for custom Webpack config
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/server/**',
          '**/scripts/**',
          '**/*.log',
          '**/*.txt',
        ],
      };
    }
    return config;
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/menu-images/:path*',
        destination: `${backendUrl}/menu-images/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
