/** @type {import('next').NextConfig} */
// Production-only PWA configuration
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // Always enable PWA - we only work in production
  // Prevent multiple GenerateSW calls
  mode: 'production',
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  buildExcludes: [
    /middleware-manifest\.json$/,
    /app-build-manifest\.json$/,
    /server\/.*\.js$/,
    /\.map$/
  ],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
  fallbacks: {
    document: '/offline.html',
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 365 days
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    }
  ]
});

module.exports = withPWA({
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  trailingSlash: false,
  // Production-only optimizations
  compress: true,
  generateEtags: true,
  httpAgentOptions: {
    keepAlive: true,
  },  // Next.js 15 optimizations
  experimental: {
    optimizePackageImports: ['@headlessui/react', '@heroicons/react'],
  },
  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },compiler: {
    removeConsole: true, // Always remove console logs - production only
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gate33.net' },
      { protocol: 'https', hostname: 'gate33.me' },
      { protocol: 'https', hostname: 'coin-images.coingecko.com' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'miro.medium.com' },
      { protocol: 'https', hostname: 'support.coingecko.com' },
      { protocol: 'https', hostname: 'styles.redditmedia.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' }, // Adicionado Firebase Storage
    ],
  },
  distDir: '.next',
  poweredByHeader: false,  webpack: (config, { isServer, dev }) => {
    // Production-only webpack optimizations
    config.devtool = false;
    config.infrastructureLogging = {
      level: 'error',
    };
    
    // Prevent multiple service worker compilations and GenerateSW warnings
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
      
      // Ensure PWA plugin runs only once
      const hasWorkboxPlugin = config.plugins.some(plugin => 
        plugin.constructor.name === 'GenerateSW' || 
        plugin.constructor.name === 'InjectManifest'
      );
      
      if (hasWorkboxPlugin) {
        config.plugins = config.plugins.filter((plugin, index, arr) => {
          const isWorkboxPlugin = plugin.constructor.name === 'GenerateSW' || 
                                 plugin.constructor.name === 'InjectManifest';
          if (isWorkboxPlugin) {
            // Keep only the first occurrence
            return arr.findIndex(p => p.constructor.name === plugin.constructor.name) === index;
          }
          return true;
        });
      }
    }
    
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
