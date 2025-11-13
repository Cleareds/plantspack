import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude mobileapp folder from Next.js compilation
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/mobileapp/**'],
    };
    return config;
  },

  async headers() {
    return [
      {
        // Apply no-cache headers to all pages to prevent caching issues
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
