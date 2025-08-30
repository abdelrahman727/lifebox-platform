/** @type {import('next').NextConfig} */
const path = require('path');
const { getNextConfig } = require('../../config/build-config');

// Load environment-specific configuration
const envConfig = getNextConfig(process.env.NODE_ENV);

const nextConfig = {
  // Environment-specific output
  output: envConfig.output || 'standalone',
  
  experimental: {
    // Required for standalone output in Docker
    outputFileTracingRoot: path.join(__dirname, '../../'),
    // Environment-specific experimental features
    ...envConfig.experimental
  },
  
  // Environment-specific optimization
  swcMinify: envConfig.swcMinify,
  optimizeFonts: envConfig.optimizeFonts,
  compress: envConfig.compression,
  
  // Remove console.logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    styledComponents: process.env.NODE_ENV === 'development'
  },
  
  // Image optimization
  images: {
    ...envConfig.images,
    domains: ['localhost'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  
  // Environment variables that should be available on the client
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001'
  },
  
  // Webpack configuration for environment-specific builds
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    
    // Development configurations
    if (dev) {
      config.devtool = 'cheap-module-source-map';
    }
    
    return config;
  },
  
  // Headers for security and performance
  async headers() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'DENY'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin'
            }
          ]
        }
      ];
    }
    return [];
  }
}

module.exports = nextConfig
