/**
 * LifeBox Production Build Configuration
 */

module.exports = {
  NODE_ENV: 'production',
  optimization: {
    minify: true,
    sourceMap: false,
    inlineSourceMap: false,
    extractComments: true,
    treeshake: true,
    splitChunks: true
  },
  features: {
    hotReload: false,
    debugMode: false,
    verbose: false,
    profiling: true
  },
  database: {
    logging: false,
    debug: false,
    ssl: true,
    connectionLimit: 20
  },
  api: {
    cors: {
      origin: process.env.FRONTEND_URL || 'https://lifebox.app',
      credentials: true
    },
    swagger: {
      enabled: false,
      path: null
    },
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000 // limit each IP to 1000 requests per windowMs
    },
    compression: true,
    security: {
      helmet: true,
      contentSecurityPolicy: true
    }
  },
  frontend: {
    optimization: true,
    bundleAnalyzer: false,
    experimental: {
      swcMinify: true
    },
    compression: true,
    staticOptimization: true,
    imageOptimization: true
  },
  mqtt: {
    retryAttempts: 5,
    keepAlive: 30,
    logging: 'error',
    ssl: true,
    reconnectPeriod: 1000
  },
  monitoring: {
    healthChecks: true,
    metrics: true,
    tracing: true,
    logging: {
      level: 'info',
      format: 'json'
    }
  }
};