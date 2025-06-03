/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // Configuração para gerenciamento de rotas
  trailingSlash: false,
    // Configurações para imagens
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gate33.net',
      },
      {
        protocol: 'https',
        hostname: 'gate33.me',
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: 'miro.medium.com',
      },
    ],
  },
  
  distDir: '.next',
  poweredByHeader: false,
  
  // Configurações do webpack para desenvolvimento local
  webpack: (config, { dev, isServer }) => {
    if (dev && isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Fix source map issues by setting source maps properly in dev mode
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
  
  // Mantendo headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;