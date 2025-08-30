# LifeBox Scripts Directory

This directory contains production and operational scripts for the LifeBox IoT Platform.

## 📁 Directory Structure

```
scripts/
├── README.md                 # This file
├── deploy-production.sh      # Production deployment script
├── backup/                   # Database backup scripts
├── monitoring/               # Monitoring and alerting scripts
└── maintenance/              # Maintenance and cleanup scripts
```

## 🚀 Available Scripts

### **deploy-production.sh**
Production deployment script for VPS deployment.

**Usage:**
```bash
./scripts/deploy-production.sh
```

## 📋 Script Organization Guidelines

### **Development Scripts** → `tools/`
- Development environment setup
- Local development utilities
- Code generation and scaffolding
- Testing and validation tools

### **Production Scripts** → `scripts/`
- Deployment scripts
- Database operations (backup, restore, migrations)
- Monitoring and health checks
- Maintenance and cleanup operations

### **Package-specific Scripts** → `apps/*/scripts/` or `libs/*/scripts/`
- Package-specific build steps
- Package-specific configuration
- Package-specific utilities

## 🎯 Naming Conventions

- **Kebab-case**: Use `my-script.sh` format
- **Descriptive names**: `backup-database.sh` not `backup.sh`
- **Action-oriented**: Start with verb (`deploy-`, `backup-`, `monitor-`)
- **Environment suffix**: `deploy-production.sh`, `setup-dev.sh`

## 🔧 Script Standards

All scripts should:
- ✅ Be executable (`chmod +x`)
- ✅ Include proper shebang (`#!/bin/bash`)
- ✅ Use `set -e` for error handling
- ✅ Include usage documentation
- ✅ Provide colored output for better UX
- ✅ Be idempotent (safe to run multiple times)

## 📖 Usage Examples

```bash
# Production deployment
./scripts/deploy-production.sh

# Development setup
./tools/setup-dev.sh

# System health check
./tools/health-check.sh

# Cleanup project
./tools/clean.sh
```