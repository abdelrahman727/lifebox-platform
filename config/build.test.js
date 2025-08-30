/**
 * LifeBox Test Build Configuration
 */

module.exports = {
  NODE_ENV: 'test',
  optimization: {
    minify: false,
    sourceMap: true,
    inlineSourceMap: true,
    extractComments: false
  },
  features: {
    hotReload: false,
    debugMode: true,
    verbose: false,
    profiling: false,
    coverage: true
  },
  database: {
    logging: false,
    debug: false,
    memory: true, // Use in-memory database for tests
    resetBetweenTests: true
  },
  api: {
    cors: {
      origin: '*',
      credentials: false
    },
    swagger: {
      enabled: false
    },
    rateLimit: {
      enabled: false
    },
    timeout: 30000 // 30 seconds for tests
  },
  frontend: {
    optimization: false,
    bundleAnalyzer: false,
    experimental: {
      turbopack: false,
      swcMinify: false
    },
    ssr: false // Disable SSR for faster test builds
  },
  mqtt: {
    retryAttempts: 1,
    keepAlive: 10,
    logging: 'silent',
    mock: true // Use mock MQTT broker for tests
  },
  testing: {
    timeout: 30000,
    coverage: {
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/test/**',
        '**/coverage/**',
        '**/node_modules/**'
      ]
    },
    reporters: ['default', 'jest-junit'],
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.spec.ts',
      '!src/**/*.test.ts',
      '!src/main.ts'
    ]
  }
};