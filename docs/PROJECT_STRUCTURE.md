# LifeBox Project Structure

This document provides a comprehensive overview of the LifeBox IoT Platform project organization.

## 📁 Root Directory Structure

```
lifebox-platform-v2/
├── 📁 apps/                          # Applications
│   ├── 📁 api/                       # NestJS REST API (Production Ready)
│   ├── 📁 mqtt-ingestion/            # MQTT telemetry processor (Production Ready)
│   └── 📁 web/                       # Next.js frontend (Basic Setup)
│
├── 📁 libs/                          # Shared Libraries  
│   ├── 📁 database/                  # Prisma schema & client
│   └── 📁 shared/                    # TypeScript types & utilities
│
├── 📁 infrastructure/                # Infrastructure as Code
│   ├── 📁 docker/                    # Docker configurations
│   └── 📁 scripts/                   # Infrastructure scripts
│
├── 📁 tools/                         # Development Tools
│   ├── setup-dev.sh                 # Complete dev environment setup
│   ├── clean.sh                     # Project cleanup utility
│   ├── health-check.sh              # System health verification
│   └── README.md                    # Tools documentation
│
├── 📁 scripts/                       # Production & Operations Scripts
│   ├── deploy-production.sh         # Production deployment
│   ├── 📁 backup/                   # Database backup scripts
│   ├── 📁 monitoring/               # Monitoring scripts  
│   ├── 📁 maintenance/              # Maintenance scripts
│   └── README.md                    # Scripts documentation
│
├── 📁 config/                        # Configuration Templates
│   └── (future configuration files)
│
├── 📁 docs/                          # Documentation
│   ├── PROJECT_STRUCTURE.md         # This file
│   └── NAMING_CONVENTIONS.md        # Coding standards
│
├── 📁 .claude/                       # Claude-specific documentation
│   └── 📁 doc/                      # Organized technical docs
│
├── 📄 .env.example                   # Environment template
├── 📄 .gitignore                     # Git ignore patterns
├── 📄 .eslintrc.js                   # ESLint configuration
├── 📄 .prettierrc                    # Prettier configuration
├── 📄 .editorconfig                  # Editor configuration
├── 📄 tsconfig.json                  # Root TypeScript config
├── 📄 turbo.json                     # Turbo build configuration
├── 📄 package.json                   # Root package configuration
└── 📄 CLAUDE.md                      # Main project documentation
```

## 🏗️ Applications Structure

### **API Application (`apps/api/`)**
```
apps/api/
├── 📁 src/
│   ├── main.ts                       # Application entry point
│   ├── app.module.ts                # Root module
│   ├── 📁 common/                   # Shared utilities
│   │   ├── 📁 decorators/           # Custom decorators
│   │   ├── 📁 dto/                  # Data transfer objects
│   │   ├── 📁 guards/               # Authentication guards
│   │   └── 📁 services/             # Shared services
│   └── 📁 modules/                  # Feature modules
│       ├── 📁 auth/                 # Authentication
│       ├── 📁 users/                # User management
│       ├── 📁 devices/              # Device management
│       ├── 📁 telemetry/            # IoT data processing
│       ├── 📁 alarms/               # Alarm system
│       ├── 📁 payment/              # Payment processing
│       └── ... (25+ modules)
├── 📁 test/                         # E2E tests
├── 📄 Dockerfile                    # Multi-stage Docker build
├── 📄 nest-cli.json                # NestJS configuration
└── 📄 package.json                 # Package configuration
```

### **MQTT Ingestion (`apps/mqtt-ingestion/`)**
```
apps/mqtt-ingestion/
├── 📁 src/
│   ├── index.ts                     # Service entry point
│   ├── command-publisher.ts         # MQTT command publisher
│   ├── command-queue.ts             # Command queue management
│   └── command-service.ts           # Command processing
├── 📄 Dockerfile                    # Multi-stage Docker build
└── 📄 package.json                 # Package configuration
```

### **Web Application (`apps/web/`)**
```
apps/web/
├── 📁 src/
│   ├── 📁 app/                      # Next.js App Router
│   ├── 📁 components/               # React components
│   │   └── 📁 ui/                   # Shadcn/ui components
│   └── 📁 lib/                      # Utility functions
├── 📄 Dockerfile                    # Multi-stage Docker build
├── 📄 next.config.js               # Next.js configuration
└── 📄 package.json                 # Package configuration
```

## 📚 Libraries Structure

### **Database (`libs/database/`)**
```
libs/database/
├── 📁 prisma/
│   ├── schema.prisma               # Database schema
│   └── 📁 migrations/              # Database migrations
├── 📁 seeds/                       # Database seed data
├── seed.ts                         # Seed script
├── index.ts                        # Export definitions
└── package.json                   # Package configuration
```

### **Shared (`libs/shared/`)**
```
libs/shared/
├── 📁 src/
│   └── index.ts                    # Shared types and utilities
└── package.json                   # Package configuration
```

## 🐳 Infrastructure Structure

### **Docker Configuration (`infrastructure/docker/`)**
```
infrastructure/docker/
├── docker-compose.yml              # Basic infrastructure
├── docker-compose.override.yml     # Development overrides
├── docker-compose.production.yml   # Production configuration
├── docker-compose.dev-full.yml     # Full-stack development
├── docker-compose.secrets.yml      # Secrets management
└── README.md                       # Docker documentation
```

## 🛠️ Development Workflow

### **Daily Development**
```bash
# Health check
./tools/health-check.sh

# Start development
npm run dev

# Access points:
# - API: http://localhost:3000/api/docs
# - Web: http://localhost:3001  
# - DB GUI: npm run db:studio
# - MQTT: http://localhost:18083
```

### **Project Maintenance**
```bash
# Clean project
./tools/clean.sh

# Setup fresh environment  
./tools/setup-dev.sh

# Database operations
npm run db:migrate
npm run db:seed
npm run db:studio
```

### **Production Operations**
```bash
# Deploy to production
./scripts/deploy-production.sh

# Backup database
./scripts/backup/backup-database.sh

# Health monitoring
./tools/health-check.sh
```

## 📋 Configuration Management

### **Environment Variables**
- `.env.example` - Template with all variables documented
- `.env` - Local development configuration (gitignored)
- Environment-specific variables in Docker compose files

### **TypeScript Configuration**
- Root `tsconfig.json` - Workspace-wide settings
- App-specific configs extend the root configuration
- Project references for optimal builds

### **Code Quality**
- `.eslintrc.js` - Unified linting rules
- `.prettierrc` - Code formatting standards  
- `.editorconfig` - Editor consistency
- Husky + lint-staged - Pre-commit hooks

## 🎯 Package Management

### **NPM Workspaces**
```json
{
  "workspaces": ["apps/*", "libs/*"],
  "scripts": {
    "dev": "concurrently npm:dev:*",
    "build": "turbo build",
    "test": "turbo test"
  }
}
```

### **Turbo Build System**
- Optimized build pipeline with smart caching
- Parallel execution of tasks across packages
- Database-first dependency chain

## 🔐 Security Considerations

### **Secrets Management**
- Environment variables never committed
- Docker secrets for production
- SSL certificates in dedicated directories (gitignored)

### **File Permissions**
- Scripts are executable
- Proper ownership in Docker containers
- Secure file handling for uploads

## 📊 Monitoring & Observability

### **Health Checks**
- Application-level health endpoints
- Docker health checks for all services
- System health verification tools

### **Logging**
- Structured logging in all services
- Docker log management
- Centralized log collection ready

## 🔄 CI/CD Ready

### **Build Process**
- Multi-stage Docker builds optimized for caching
- Turbo for efficient monorepo builds  
- Comprehensive testing pipeline ready

### **Deployment**
- Production deployment scripts
- Environment-specific configurations
- Infrastructure as Code with Docker

---

This structure provides a **scalable, maintainable, and production-ready** foundation for the LifeBox IoT Platform! 🚀