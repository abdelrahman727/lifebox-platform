# NestJS Monorepo Development Issues and Solutions

## Issue: npm run dev fails with "Cannot find module dist/main"

### Problem Description
When running `npm run dev`, the NestJS API service fails with the error:
```
Error: Cannot find module '/path/to/apps/api/dist/main'
```

### Root Cause Analysis

#### 1. Monorepo Structure Conflict
- The project uses npm workspaces with TypeScript path mappings
- NestJS CLI is building with monorepo-style directory structure: `dist/apps/api/src/main.js`
- But `nest start --watch` expects the file at: `dist/main.js`

#### 2. TypeScript Path Mapping Issue
The current `tsconfig.json` includes:
```json
{
  "baseUrl": "./",
  "paths": {
    "@lifebox/database": ["../../libs/database"],
    "@lifebox/database/*": ["../../libs/database/*"]
  }
}
```

This causes NestJS to treat the build as a monorepo structure, creating nested dist folders.

### Confirmed Solutions (Based on Research)

#### Solution 1: Configure entryFile in nest-cli.json (RECOMMENDED)
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "entryFile": "apps/api/src/main",
  "compilerOptions": {
    "deleteOutDir": true,
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

#### Solution 2: Separate TypeScript Configs
- Keep `tsconfig.json` with path mappings for development/IDE
- Create `tsconfig.build.json` without path mappings for build process
- Configure nest-cli.json to use build-specific config

#### Solution 3: Root-relative Paths
Instead of complex path mappings, use file references in package.json:
```json
{
  "dependencies": {
    "@lifebox/database": "file:../../libs/database"
  }
}
```

### Implementation Plan

#### Phase 1: Quick Fix (entryFile configuration)
1. Update `nest-cli.json` with proper `entryFile` path
2. Test `nest start --watch` command
3. Verify development workflow

#### Phase 2: Clean Architecture (if needed)
1. Separate build and development TypeScript configurations
2. Update path resolution strategy
3. Test full development workflow

### Expected Outcome
- `npm run dev` works correctly
- API starts on port 3000 without path resolution errors
- Development hot-reload functions properly
- Production build process remains intact

### References
- NestJS CLI Monorepo Documentation
- Stack Overflow: "Nestjs incorrect dist folder structure with monorepo mode"
- NestJS TypeScript Path Mapping Best Practices

---
**Status**: Analysis Complete - Ready for Implementation  
**Priority**: Critical - Blocks development workflow  
**Impact**: Development Environment