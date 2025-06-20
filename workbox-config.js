// workbox-config.js - PWA Configuration for Production Mode
module.exports = {
  globDirectory: '.next/',
  globPatterns: [
    'static/**/*.{js,css,png,jpg,jpeg,gif,svg,woff,woff2}',
    'server/app/**/*.{js,html}',
    '!**/*-manifest.json' // Exclude manifest files that might not exist
  ],
  swDest: 'public/sw.js',
  skipWaiting: true,
  clientsClaim: true,
  maximumFileSizeToCacheInBytes: 5000000, // 5MB
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
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
      urlPattern: /^https:\/\/api\.gate33\.me\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        },
        networkTimeoutSeconds: 3
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    }
  ]
};
