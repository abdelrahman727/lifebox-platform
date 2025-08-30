# LifeBox IoT Platform

A comprehensive, **production-ready** IoT platform for remote monitoring and control of solar-powered water pumping systems, optimized for the Egyptian market with international scalability.

## 🎯 **Current Status: 90% Production Ready**

- ✅ **Backend API**: Complete with 230+ endpoints across 22 modules
- ✅ **MQTT Service**: 100% functional telemetry processing  
- ✅ **Real-time**: WebSocket gateway operational
- ✅ **Payment**: Full Fawry integration (Egyptian market)
- ✅ **SMS**: Hybrid routing (Vodafone Egypt + Twilio International)
- ✅ **Security**: Enhanced 5-level RBAC with device-specific access
- ⚠️ **Frontend**: Requires dashboard implementation (5% complete)

## 📖 **Documentation**

For comprehensive project documentation, see **[`docs/`](docs/)** directory:
- **[`CLAUDE.md`](CLAUDE.md)** - Complete developer guide and project overview
- **[`docs/guides/`](docs/guides/)** - Deployment and setup guides  
- **[`docs/technical/`](docs/technical/)** - Technical specifications
- **[`docs/api/`](docs/api/)** - API documentation and implementation
- **[`docs/scripts/`](docs/scripts/)** - Testing and development scripts

## 🚀 **Production Deployment**

### Quick Production Setup

```bash
# 1. Clone repository on your VPS (NO sensitive data in git!)
git clone <your-repo-url> lifebox-platform
cd lifebox-platform

# 2. Create secure production environment
./create-production-env.sh
# Interactive script creates .env with auto-generated secrets

# 3. Deploy with Docker
./infrastructure/scripts/deploy-production.sh
# Validates configuration and deploys all services

# 4. Initialize database
npm run install:all && npm run db:migrate && npm run db:seed
```

📋 **See [PRODUCTION-SETUP.md](PRODUCTION-SETUP.md) for detailed deployment guide**

---

## 🛠️ **Development Setup**

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL 15+ with TimescaleDB extension

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lifebox-platform
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment:
```bash
# Copy template and configure for development
cp .env.example .env
# Edit .env with development database and service URLs
nano .env
```

4. Start infrastructure services:
```bash
cd infrastructure/docker
docker-compose up -d
```

5. Run database migrations:
```bash
cd libs/database
npm run migrate:dev
```

6. Start development servers:
```bash
npm run dev
```

## Project Structure

```
lifebox-platform/
├── apps/
│   ├── api/                    # NestJS REST API
│   ├── mqtt-ingestion/         # MQTT telemetry ingestion
│   ├── alarm-processor/        # Alarm processing service
│   ├── web/                    # Next.js frontend
│   └── scheduler/              # Scheduled tasks
├── libs/
│   ├── shared/                 # Shared types & utilities
│   ├── database/              # Prisma database schema
│   └── messaging/             # Message queue utilities
├── infrastructure/
│   ├── docker/                # Docker configurations
│   ├── kubernetes/            # K8s manifests
│   └── terraform/             # Infrastructure as Code
└── docs/                      # Documentation
```

## Technology Stack

- **Backend**: Node.js, TypeScript, NestJS
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: PostgreSQL with TimescaleDB
- **In-Memory Processing**: Simplified architecture without external cache dependencies
- **MQTT Broker**: EMQX
- **ORM**: Prisma
- **Real-time**: Socket.io

## Available Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all services
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## Services

### API Service (Port 3000)
REST API with Swagger documentation at `/api/docs`

### MQTT Ingestion Service
Processes telemetry data from IoT devices

### Web Application (Port 3001)
User interface for monitoring and control

### Infrastructure Services
- PostgreSQL (Port 5432)
- EMQX (Port 1883 for MQTT, 18083 for dashboard)

## License

Copyright © 2025 Noor Nation IOT System Platform
