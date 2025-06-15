/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  trailingSlash: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gate33.net' },
      { protocol: 'https', hostname: 'gate33.me' },
      { protocol: 'https', hostname: 'coin-images.coingecko.com' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'miro.medium.com' },
      { protocol: 'https', hostname: 'support.coingecko.com' },
      { protocol: 'https', hostname: 'styles.redditmedia.com' },
    ],
  },
  distDir: '.next',
  poweredByHeader: false,
  webpack: (config, { dev, isServer }) => {
    if (dev && isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    if (dev) {
      config.devtool = 'eval-source-map';
    } else {
      config.devtool = false;
    }
    
    config.infrastructureLogging = {
      level: 'error',
    };
    
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
});
