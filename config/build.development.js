/**
 * LifeBox Development Build Configuration
 */

module.exports = {
  NODE_ENV: 'development',
  optimization: {
    minify: false,
    sourceMap: true,
    inlineSourceMap: true,
    extractComments: false
  },
  features: {
    hotReload: true,
    debugMode: true,
    verbose: true,
    profiling: false
  },
  database: {
    logging: true,
    debug: true
  },
  api: {
    cors: {
      origin: ['http://localhost:3001', 'http://localhost:3000'],
      credentials: true
    },
    swagger: {
      enabled: true,
      path: '/api/docs'
    },
    rateLimit: {
      enabled: false
    }
  },
  frontend: {
    optimization: false,
    bundleAnalyzer: false,
    compression: false,
    imageOptimization: false,
    experimental: {
      swcMinify: false
    }
  },
  mqtt: {
    retryAttempts: 3,
    keepAlive: 60,
    logging: 'debug'
  }
};