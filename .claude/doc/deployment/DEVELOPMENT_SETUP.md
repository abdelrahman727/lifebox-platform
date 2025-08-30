# Development Setup Guide - LifeBox IoT Platform

## Prerequisites

### System Requirements
- **Node.js**: 18+ LTS version
- **NPM**: 9+ (comes with Node.js)
- **Docker**: Latest stable version
- **Docker Compose**: V2 recommended
- **Git**: Latest version

### Optional (for local development without Docker)
- **PostgreSQL**: 15+ with TimescaleDB extension
- **EMQX**: 5.x MQTT broker

## Quick Start

### 1. Repository Setup
```bash
# Clone the repository
git clone <repository-url> lifebox-platform
cd lifebox-platform

# Install all dependencies
npm run install:all
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
vim .env  # or your preferred editor
```

### 3. Infrastructure Services
```bash
# Start PostgreSQL + EMQX with Docker
cd infrastructure/docker
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 4. Database Setup
```bash
# Generate Prisma client
cd libs/database
npm run generate

# Run database migrations
cd ../../
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Start Development Servers
```bash
# Start all services (API + MQTT + Web)
npm run dev

# Or start services individually
npm run dev:api      # NestJS API (port 3000)
npm run dev:mqtt     # MQTT ingestion service
npm run dev:web      # Next.js frontend (port 3001)
```

## Detailed Setup

### Environment Variables
Create `.env` file with these essential variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://lifebox:lifebox123@localhost:5432/lifebox_db"

# JWT Configuration  
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret-here"
JWT_REFRESH_EXPIRES_IN="7d"

# MQTT Configuration
MQTT_BROKER_HOST="localhost"
MQTT_BROKER_PORT="1883"  
MQTT_USERNAME="lifebox_user"
MQTT_PASSWORD="lifebox_pass"

# API Configuration
API_BASE_URL="http://localhost:3000/api/v1"
API_ADMIN_TOKEN="generated-admin-token"

# SMS Configuration (Development)
SMS_DEPLOYMENT_REGION="egypt"
SMS_FALLBACK_ENABLED="true"

# Vodafone SMS (Egypt)
VODAFONE_SMS_USERNAME="your_username"
VODAFONE_SMS_PASSWORD="your_password"
VODAFONE_SMS_SENDER="LifeBox"

# Twilio SMS (International)
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="LifeBox Platform <noreply@lifebox.com>"

# Fawry Payment Gateway (Development)
FAWRY_MERCHANT_CODE="test_merchant"
FAWRY_SECURITY_KEY="test_security_key"
FAWRY_BASE_URL="https://atfawry.fawrystaging.com"
```

### Database Configuration

#### Using Docker (Recommended)
The provided Docker Compose configuration includes:
- **PostgreSQL 15** with TimescaleDB extension
- **EMQX 5.x** MQTT broker
- **Automatic initialization** with proper extensions

```yaml
# infrastructure/docker/docker-compose.yml
version: '3.8'
services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: lifebox_db
      POSTGRES_USER: lifebox
      POSTGRES_PASSWORD: lifebox123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  emqx:
    image: emqx/emqx:5.3.2
    ports:
      - "1883:1883"      # MQTT
      - "8083:8083"      # WebSocket  
      - "18083:18083"    # Dashboard
    environment:
      EMQX_DASHBOARD__DEFAULT_USERNAME: admin
      EMQX_DASHBOARD__DEFAULT_PASSWORD: public
```

#### Manual Installation (Alternative)
If you prefer local installation:

```bash
# Install PostgreSQL with TimescaleDB
# Ubuntu/Debian:
sudo apt-get install postgresql-15 timescaledb-2-postgresql-15

# macOS with Homebrew:
brew install postgresql@15 timescaledb

# Create database
sudo -u postgres createdb lifebox_db

# Enable TimescaleDB extension
sudo -u postgres psql lifebox_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### MQTT Broker Configuration

#### EMQX Dashboard Access
- **URL**: http://localhost:18083
- **Username**: admin
- **Password**: public

#### MQTT Connection Testing
```bash
# Test MQTT connection
mosquitto_pub -h localhost -p 1883 -t test/topic -m "Hello MQTT"
mosquitto_sub -h localhost -p 1883 -t test/topic
```

## Development Workflow

### Daily Development Routine

#### 1. Start Development Environment
```bash
# Terminal 1: Infrastructure services
cd infrastructure/docker
docker-compose up -d

# Terminal 2: API development
npm run dev:api

# Terminal 3: MQTT service  
npm run dev:mqtt

# Terminal 4: Frontend development
npm run dev:web
```

#### 2. Database Operations
```bash
# View database in GUI
npm run db:studio

# Apply schema changes
npm run db:push           # Development only
npm run db:migrate        # Create migration

# Reset database (caution!)
npm run db:reset          # Development only
```

#### 3. Code Quality Checks
```bash
# Format code
npm run format

# Lint API code
cd apps/api && npm run lint

# Run tests
cd apps/api && npm run test
```

### Common Development Tasks

#### Adding New Database Model
```bash
# 1. Edit schema
vim libs/database/prisma/schema.prisma

# 2. Generate migration
npx prisma migrate dev --name add_new_model

# 3. Regenerate client
cd libs/database && npm run generate

# 4. Update seed data if needed
vim libs/database/seed.ts
```

#### Creating New API Module
```bash
# 1. Generate module
cd apps/api
npx nest generate module modules/new-feature
npx nest generate controller modules/new-feature
npx nest generate service modules/new-feature

# 2. Add to app.module.ts imports
# 3. Implement business logic
# 4. Add to Swagger documentation
```

#### Testing MQTT Integration
```bash
# Send test telemetry
mosquitto_pub -h localhost -p 1883 \
  -t "devices/TEST_DEVICE/telemetry" \
  -m '{"frequency_value": 50.2, "pump_voltage_value": 220.5}'

# Send test command
mosquitto_pub -h localhost -p 1883 \
  -t "platform/commands/queue" \
  -m '{"deviceId":"TEST_DEVICE","commandId":"123","type":"pump_on"}'
```

## Development Tools

### Database Management
```bash
# Prisma Studio (GUI)
npm run db:studio
# → Opens http://localhost:5555

# Direct PostgreSQL access
psql postgresql://lifebox:lifebox123@localhost:5432/lifebox_db

# Backup development database
pg_dump lifebox_db > dev_backup_$(date +%Y%m%d).sql
```

### API Development
```bash
# API Documentation
# → http://localhost:3000/api/docs

# Health check
curl http://localhost:3000/api/v1/health

# Generate admin token for testing
npm run generate:admin-token
```

### Frontend Development
```bash
# Next.js development server
npm run dev:web
# → http://localhost:3001

# Build production version
cd apps/web && npm run build

# Component development with Storybook (if added)
npm run storybook
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill process if needed
kill -9 PID

# Alternative: use different port
PORT=3001 npm run dev:api
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
psql postgresql://lifebox:lifebox123@localhost:5432/lifebox_db -c "SELECT 1;"

# Restart database
docker-compose restart postgres
```

#### MQTT Connection Issues
```bash
# Check EMQX is running
docker-compose ps emqx

# Check EMQX logs
docker-compose logs emqx

# Test MQTT connection
mosquitto_sub -h localhost -p 1883 -t '$SYS/brokers/+/version'
```

#### Build Errors
```bash
# Clean all node_modules
npm run clean

# Reinstall dependencies
npm run install:all

# Regenerate Prisma client
cd libs/database && npm run generate

# Clear TypeScript cache
rm -rf apps/*/dist
npx tsc --build --clean
```

### Performance Issues
```bash
# Check memory usage
docker stats

# Database performance
# → Check slow query log in PostgreSQL
# → Monitor with Prisma debug logs

# Node.js performance
# → Use clinic.js for profiling
# → Monitor heap usage
```

### Debugging Tools

#### API Debugging
```bash
# Enable debug logs
DEBUG=* npm run dev:api

# Prisma query logging
DATABASE_URL="${DATABASE_URL}?logging=true"
```

#### MQTT Debugging
```bash
# Enable verbose MQTT logging
LOG_LEVEL=debug npm run dev:mqtt

# Monitor MQTT traffic
mosquitto_sub -h localhost -p 1883 -t '#' -v
```

## Best Practices

### Code Organization
- **Consistent naming**: Use kebab-case for files, PascalCase for classes
- **Module separation**: Keep business logic in services, validation in DTOs
- **Type safety**: Use TypeScript strictly, avoid `any` types
- **Error handling**: Use proper HTTP status codes and error messages

### Database Best Practices
- **Migrations**: Always use migrations for schema changes
- **Indexing**: Add indexes for frequently queried fields
- **Foreign keys**: Maintain referential integrity
- **Backup**: Regular backups before major changes

### Git Workflow
```bash
# Feature branch workflow
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature description"
git push origin feature/new-feature

# Merge to main
git checkout main
git merge feature/new-feature
git push origin main
```

### Security Considerations
- **Environment variables**: Never commit secrets to Git
- **Input validation**: Validate all user inputs
- **Authentication**: Always check JWT tokens
- **Database queries**: Use Prisma ORM to prevent SQL injection

This development setup provides a robust foundation for building and extending the LifeBox IoT platform with proper tooling, debugging capabilities, and best practices.