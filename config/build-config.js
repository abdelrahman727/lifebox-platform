/**
 * LifeBox Build Configuration Loader
 * Loads environment-specific build configurations
 */

const path = require('path');

/**
 * Load build configuration for the specified environment
 * @param {string} environment - The environment (development, production, test)
 * @returns {object} Build configuration object
 */
function loadBuildConfig(environment = process.env.NODE_ENV || 'development') {
  const configFile = path.join(__dirname, `build.${environment}.js`);
  
  try {
    const config = require(configFile);
    console.log(`✅ Loaded build configuration for: ${environment}`);
    return config;
  } catch (error) {
    console.warn(`⚠️  Could not load config for ${environment}, falling back to development`);
    return require('./build.development.js');
  }
}

/**
 * Get turbo-specific configuration for the environment
 * @param {string} environment 
 * @returns {object} Turbo configuration
 */
function getTurboConfig(environment = process.env.NODE_ENV || 'development') {
  const config = loadBuildConfig(environment);
  
  return {
    cache: environment !== 'development',
    parallel: environment === 'production' ? 4 : 2,
    profile: config.features.profiling,
    verbose: config.features.verbose,
    outputMode: environment === 'production' ? 'hash' : 'stream'
  };
}

/**
 * Get webpack-specific configuration
 * @param {string} environment 
 * @returns {object} Webpack configuration
 */
function getWebpackConfig(environment = process.env.NODE_ENV || 'development') {
  const config = loadBuildConfig(environment);
  
  return {
    mode: environment === 'production' ? 'production' : 'development',
    optimization: config.optimization,
    devtool: config.optimization.sourceMap ? 'source-map' : false,
    plugins: []
  };
}

/**
 * Get Next.js specific configuration
 * @param {string} environment 
 * @returns {object} Next.js configuration
 */
function getNextConfig(environment = process.env.NODE_ENV || 'development') {
  const config = loadBuildConfig(environment);
  
  return {
    output: environment === 'production' ? 'standalone' : undefined,
    optimizeFonts: config.frontend.optimization,
    compress: config.frontend.compression,
    experimental: config.frontend.experimental,
    swcMinify: config.frontend.experimental.swcMinify,
    images: {
      unoptimized: !config.frontend.imageOptimization
    }
  };
}

module.exports = {
  loadBuildConfig,
  getTurboConfig,
  getWebpackConfig,
  getNextConfig
};