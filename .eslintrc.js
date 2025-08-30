module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  extends: [
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/prisma/migrations/**',
  ],
  rules: {
    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  overrides: [
    // NestJS API specific rules
    {
      files: ['apps/api/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    // Test files
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    // Configuration and seed files
    {
      files: ['**/*.config.ts', '**/seed.ts', '**/seeds/**/*.ts'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};