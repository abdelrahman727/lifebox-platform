# ADR-001: Monorepo Architecture with NPM Workspaces

**Date**: 2025-01-15  
**Status**: ✅ Accepted  
**Deciders**: Development Team, Architecture Team  
**Technical Story**: Platform architecture design

## Context and Problem Statement

The LifeBox IoT Platform consists of multiple applications (API, Web Frontend, MQTT Ingestion) and shared libraries (Database, Shared utilities). We need to decide on the repository structure and dependency management strategy that will support efficient development, testing, and deployment.

## Decision Drivers

- **Code sharing**: Multiple applications need to share database models, types, and utilities
- **Development velocity**: Developers should be able to work across all applications efficiently
- **Build optimization**: Builds should be fast and only rebuild what's necessary
- **Deployment flexibility**: Different components may need to be deployed independently
- **Developer experience**: Easy setup, consistent tooling, and clear project structure
- **CI/CD efficiency**: Fast and reliable automated builds and tests

## Considered Options

1. **Multi-repository (polyrepo)**: Separate repositories for API, Web, MQTT, and shared libraries
2. **Monorepo with Lerna**: Single repository with Lerna for package management
3. **Monorepo with NPM Workspaces**: Single repository with native NPM workspace support
4. **Monorepo with Yarn Workspaces**: Single repository with Yarn workspace support

## Decision

Chosen option: **Monorepo with NPM Workspaces**, because it provides the best balance of simplicity, native tooling support, and developer experience without additional complexity.

### Rationale

NPM Workspaces offers:
- **Native support**: No additional tools required, works with standard npm
- **Dependency hoisting**: Shared dependencies are automatically deduplicated
- **Simple configuration**: Minimal setup in root package.json
- **Great ecosystem support**: Works well with Turbo, ESLint, TypeScript
- **Mature tooling**: Stable and well-documented

Lerna was considered but adds complexity without significant benefits over native workspaces. Yarn Workspaces were rejected due to team preference for NPM and existing NPM-based toolchain.

## Consequences

### Positive

- **Simplified dependency management**: Single node_modules with automatic deduplication
- **Atomic commits**: Changes across multiple packages can be committed together
- **Easier refactoring**: Code changes can span multiple packages in a single PR
- **Consistent tooling**: Same Node.js version, ESLint config, etc. across all packages
- **Fast CI/CD**: Single repository checkout and shared dependency cache
- **Simplified development setup**: One command installs all dependencies

### Negative

- **Large repository**: Single repository contains all application code
- **Deployment coupling**: Changes to shared code affect all applications
- **Build coordination**: Need careful build orchestration to handle dependencies
- **Potential merge conflicts**: More developers working in the same repository

### Neutral

- **Learning curve**: Developers need to understand workspace concepts
- **Tooling dependencies**: Some tools may need specific workspace configuration

## Implementation

### Action Items

- [x] Configure root package.json with workspace definitions
- [x] Structure applications under `apps/` directory
- [x] Structure shared libraries under `libs/` directory
- [x] Set up Turbo for build orchestration
- [x] Configure TypeScript path mapping for workspace packages
- [x] Update CI/CD pipeline for monorepo builds

### Timeline

Implementation completed in initial project setup phase.

## Validation

Success criteria achieved:
- ✅ Single `npm install` sets up entire development environment
- ✅ Shared code changes propagate automatically to consuming applications
- ✅ Build times are optimized with Turbo caching
- ✅ Developer onboarding time reduced from hours to minutes
- ✅ No duplicate dependencies across workspace packages

## Links

- [NPM Workspaces Documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Turbo Documentation](https://turbo.build/repo/docs)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

## Notes

The monorepo structure has proven highly effective for the LifeBox platform, enabling rapid development and consistent code quality across all applications. The combination with Turbo for build orchestration provides excellent developer experience.