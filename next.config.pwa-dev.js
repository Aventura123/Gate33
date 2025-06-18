/** @type {import('next').NextConfig} */
// Development-friendly PWA configuration
// Use this config when you need to test PWA features in development
// Rename this to next.config.js or set NODE_ENV=development-pwa

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // PWA enabled for development testing
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: {
    document: '/offline.html',
  },
  // Optimized for development to reduce GenerateSW warnings
  cacheOnFrontEndNav: false,
  reloadOnOnline: false,
  scope: '/',
  sw: 'sw.js',
  // Reduce file watching issues
  maximumFileSizeToCacheInBytes: 5000000, // 5MB
  runtimeCaching: [
    // Minimal runtime caching for development
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 // 24 hours
        }
      }
    }
  ]
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
    
    // Optimized devtools for development PWA testing
    if (dev) {
      config.devtool = 'cheap-module-source-map';
    } else {
      config.devtool = 'source-map';
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
