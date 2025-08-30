# LifeBox Development Tools

This directory contains development tools and utilities for the LifeBox IoT Platform.

## 🛠️ Available Tools

### **setup-dev.sh**
Complete development environment setup script that:
- ✅ Checks prerequisites (Node.js, Docker, npm)
- ✅ Installs all project dependencies
- ✅ Sets up development database with migrations and seed data
- ✅ Configures environment files
- ✅ Sets up Git hooks
- ✅ Builds all projects

**Usage:**
```bash
./tools/setup-dev.sh
```

### **clean.sh**
Project cleanup script that removes:
- 🗑️ All `node_modules` directories
- 🗑️ Build artifacts (`dist`, `build`, `.next`)
- 🗑️ TypeScript cache files
- 🗑️ Log files and coverage reports
- 🗑️ Docker build cache (optional)

**Usage:**
```bash
./tools/clean.sh
```

### **health-check.sh**
System health check script that verifies:
- 🏥 Prerequisites (Node.js, npm, Docker)
- 🏥 Infrastructure services (PostgreSQL, EMQX)
- 🏥 Application services (API, Web)
- 🏥 Database connectivity
- 🏥 File permissions and environment

**Usage:**
```bash
./tools/health-check.sh
```

## 📋 Quick Start

### **New Developer Setup**
```bash
# Clone the repository
git clone <repository-url>
cd lifebox-platform

# Run complete setup
./tools/setup-dev.sh

# Verify everything is working
./tools/health-check.sh

# Start development
npm run dev
```

### **Troubleshooting**
```bash
# Check system health
./tools/health-check.sh

# Clean and reinstall
./tools/clean.sh
npm install

# Reset development environment
./tools/clean.sh
./tools/setup-dev.sh
```

### **Daily Development**
```bash
# Check if everything is healthy
./tools/health-check.sh

# Start development servers
npm run dev

# Open important URLs:
# - API Docs: http://localhost:3000/api/docs
# - Web App: http://localhost:3001
# - Database: npm run db:studio
# - MQTT Dashboard: http://localhost:18083
```

## 🔧 Tool Requirements

- **bash** - All scripts are written in bash
- **curl** - For health checking HTTP endpoints
- **nc** (netcat) - For checking port availability
- **docker** - For infrastructure services
- **psql** (optional) - For database connectivity testing

## 📝 Adding New Tools

When adding new development tools:

1. **Create executable script**: `chmod +x tools/your-tool.sh`
2. **Follow naming convention**: Use kebab-case
3. **Add colors and formatting**: Use the color variables from existing scripts
4. **Include help text**: Add usage instructions and examples
5. **Update this README**: Document the new tool
6. **Test thoroughly**: Ensure it works in different environments

## 🎯 Best Practices

- **Error handling**: Use `set -e` to exit on errors
- **User feedback**: Provide clear status messages
- **Idempotent**: Tools should be safe to run multiple times
- **Cross-platform**: Consider compatibility with different systems
- **Documentation**: Include inline comments and help text

## 🚀 Integration with npm scripts

These tools can be integrated with npm scripts in `package.json`:

```json
{
  "scripts": {
    "setup": "./tools/setup-dev.sh",
    "clean": "./tools/clean.sh", 
    "health": "./tools/health-check.sh"
  }
}
```

This allows running tools via:
```bash
npm run setup
npm run clean
npm run health
```