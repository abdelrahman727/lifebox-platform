# LifeBox Docker Configuration

This directory contains comprehensive Docker configurations for the LifeBox IoT Platform with optimized multi-stage builds, development/production separation, and proper security practices.

## 🐳 Available Configurations

### **Development Configurations**

1. **`docker-compose.yml`** - Basic infrastructure (PostgreSQL + EMQX)
2. **`docker-compose.override.yml`** - Development-specific overrides
3. **`docker-compose.dev-full.yml`** - Full-stack containerized development

### **Production Configurations**

1. **`docker-compose.production.yml`** - Complete production setup
2. **`docker-compose.secrets.yml`** - Secrets management overlay

## 🚀 Quick Start

### **Development (Infrastructure Only)**
```bash
# Start PostgreSQL + EMQX for local development
cd infrastructure/docker
docker-compose up -d

# The override file is automatically loaded
# Database: localhost:5432 (lifebox/lifebox123)
# EMQX Dashboard: http://localhost:18083 (admin/public)
```

### **Full-Stack Development (All Services Containerized)**
```bash
# All services running in containers with hot reload
cd infrastructure/docker
docker-compose -f docker-compose.dev-full.yml up

# Services:
# - API: http://localhost:3000 (with debugger on 9229)
# - Web: http://localhost:3001
# - MQTT: Connected to EMQX
# - PostgreSQL: Available on 5432
# - EMQX Dashboard: http://localhost:18083
```

### **Production Deployment**
```bash
# Production deployment with all optimizations
cd infrastructure/docker
docker-compose -f docker-compose.production.yml up -d

# With secrets (recommended):
docker-compose -f docker-compose.production.yml -f docker-compose.secrets.yml up -d
```

## 📦 Application Dockerfiles

### **Multi-Stage Build Architecture**

All applications use optimized multi-stage builds:

```
┌─────────────┬─────────────┬─────────────┐
│    BASE     │ DEVELOPMENT │ PRODUCTION  │
│             │             │             │
│ Node Alpine │ Full deps   │ Minimal     │
│ Common libs │ Hot reload  │ Optimized   │
│             │ Debug ports │ Security    │
└─────────────┴─────────────┴─────────────┘
```

### **API Service (`apps/api/Dockerfile`)**
- **Base**: Node 20 Alpine with common dependencies
- **Dev**: Full dependencies + debug ports (3000, 9229)
- **Prod**: Minimal dependencies + security hardening

### **MQTT Service (`apps/mqtt-ingestion/Dockerfile`)**
- **Base**: Node 20 Alpine optimized for MQTT processing
- **Dev**: Development logging and hot reload
- **Prod**: Production-optimized with health checks

### **Web Service (`apps/web/Dockerfile`)**
- **Base**: Next.js standalone output
- **Dev**: Hot reload development server
- **Prod**: Optimized static generation

## 🔐 Security Features

### **Container Security**
- ✅ Non-root users (nodejs/nextjs/lifebox)
- ✅ Minimal Alpine base images
- ✅ Security scanning ready
- ✅ Resource limits and constraints
- ✅ Health checks for all services

### **Secrets Management**
```bash
# Create Docker secrets
echo "secure_jwt_secret" | docker secret create lifebox_jwt_secret -
echo "secure_db_password" | docker secret create lifebox_db_password -

# Deploy with secrets
docker-compose -f docker-compose.production.yml -f docker-compose.secrets.yml up -d
```

### **Network Security**
- Isolated Docker networks
- Internal service communication
- Exposed ports only where necessary

## ⚡ Performance Optimizations

### **Build Optimization**
- **Layer Caching**: Dependencies cached separately from source code
- **Multi-stage**: Only production artifacts in final images
- **Build Context**: Optimized with comprehensive `.dockerignore`

### **Image Size Optimization**
- **Alpine Base**: ~5MB base instead of ~100MB+ full images
- **Dependency Pruning**: Production-only dependencies in final stage
- **File Selection**: Only necessary files copied to production

### **Runtime Optimization**
- **Process Management**: dumb-init for proper signal handling
- **Resource Limits**: Memory and CPU constraints
- **Health Checks**: Proper container orchestration

## 📊 Service Health Monitoring

### **Health Check Endpoints**
- **API**: `curl -f http://localhost:3000/api/v1/health`
- **Web**: `wget --spider http://localhost:3001/api/health`
- **MQTT**: Process-based health check
- **PostgreSQL**: `pg_isready` connection check
- **EMQX**: Built-in status check

### **Monitoring Integration**
```yaml
# Add to your monitoring stack
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

## 🔧 Development Workflow

### **Hot Reload Development**
```bash
# Start infrastructure
docker-compose up -d

# Develop locally with hot reload
cd ../../
npm run dev

# Or develop fully containerized
docker-compose -f docker-compose.dev-full.yml up
```

### **Building Images Locally**
```bash
# Build all images
docker-compose -f docker-compose.production.yml build

# Build specific service
docker build -t lifebox/api:latest -f apps/api/Dockerfile .

# Build development target
docker build --target development -t lifebox/api:dev -f apps/api/Dockerfile .
```

### **Debugging Containerized Services**
```bash
# Attach to running container
docker exec -it lifebox-dev-api /bin/sh

# View logs
docker-compose logs -f lifebox-api-dev

# Debug with IDE (VS Code/IntelliJ)
# Connect to localhost:9229 for Node.js debugging
```

## 🌍 Environment Variables

### **Development**
```env
NODE_ENV=development
DATABASE_URL=postgresql://lifebox:lifebox123@localhost:5432/lifebox_dev
MQTT_BROKER_HOST=localhost
JWT_SECRET=dev_jwt_secret
```

### **Production**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/lifebox_prod
MQTT_BROKER_HOST=emqx
JWT_SECRET_FILE=/run/secrets/jwt_secret
```

## 🔍 Troubleshooting

### **Common Issues**
```bash
# Port conflicts
docker-compose down && docker-compose up

# Permission issues
docker-compose exec lifebox-api chown -R lifebox:nodejs /app

# Database connection
docker-compose exec postgres psql -U lifebox -d lifebox_dev

# MQTT connection
docker-compose exec emqx /opt/emqx/bin/emqx_ctl status
```

### **Performance Issues**
```bash
# Check resource usage
docker stats

# View container logs
docker-compose logs --tail=100 -f

# Inspect health checks
docker inspect lifebox-api --format='{{.State.Health}}'
```

## 📋 Maintenance

### **Updating Images**
```bash
# Pull latest base images
docker-compose pull

# Rebuild with no cache
docker-compose build --no-cache

# Prune unused images
docker image prune -f
```

### **Data Backup**
```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U lifebox lifebox_prod > backup.sql

# Backup volumes
docker run --rm -v lifebox_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

This Docker configuration provides a **production-ready, secure, and optimized** container setup for the LifeBox IoT Platform! 🚀