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
