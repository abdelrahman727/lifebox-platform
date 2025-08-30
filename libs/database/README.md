# LifeBox Database Package

**Prisma-based database layer for the LifeBox IoT Platform**

[![Database](https://img.shields.io/badge/database-PostgreSQL-blue.svg)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/ORM-Prisma-2D3748.svg)](https://prisma.io/)
[![TimescaleDB](https://img.shields.io/badge/extension-TimescaleDB-orange.svg)](https://www.timescale.com/)

## 📋 Overview

The LifeBox Database package provides a comprehensive data layer built on PostgreSQL with TimescaleDB extension for optimal IoT time-series data handling. It includes 30+ models supporting multi-tenant architecture, enhanced RBAC, and high-performance telemetry storage.

### Key Features

- **🏢 Multi-tenant Architecture**: Complete client data isolation
- **👥 Enhanced RBAC**: 5-level hierarchical permissions with device assignments
- **📈 Time-series Optimization**: TimescaleDB for IoT telemetry data
- **🔒 Security**: Comprehensive audit trails and data protection
- **⚡ Performance**: Optimized queries and proper indexing
- **🔄 Real-time**: Efficient data structures for live updates

## 🚀 Quick Start

### Installation

```bash
# Install in workspace (from project root)
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### Standalone Usage

```bash
cd libs/database

# Install dependencies
npm install

# Generate Prisma client
npm run generate

# Run Prisma studio
npm run studio
```

## 📁 Package Structure

```
libs/database/
├── prisma/
│   ├── schema.prisma           # Database schema definition
│   ├── migrations/             # Database migrations
│   └── seed.sql               # Initial data setup
├── seeds/                     # Seed data files
│   ├── clients.ts             # Sample clients
│   ├── users.ts               # Sample users
│   ├── devices.ts             # Sample devices
│   └── roles.ts               # Role definitions
├── scripts/                   # Database utilities
│   ├── generate-exports.js    # Export generation
│   └── backup.sh              # Backup scripts
├── seed.ts                    # Main seed script
├── index.ts                   # Package exports
├── package.json
└── README.md                  # This file
```

## 🗄️ Database Schema

### Core Models

#### Multi-tenancy & Users
- **Client**: Organization/tenant isolation
- **User**: System users with roles and permissions
- **UserAssignment**: Device-specific user assignments
- **RefreshToken**: JWT refresh token management

#### Device Management
- **Device**: IoT devices with metadata and configuration
- **DeviceType**: Device categorization and specifications
- **DeviceAlarm**: Hardware-level alarm definitions
- **Telemetry**: Time-series IoT data (TimescaleDB optimized)

#### Permissions & Security
- **CommandPermission**: Granular command-level permissions
- **QuickViewPage**: Custom dashboard configurations
- **ActivityLog**: Comprehensive audit trail

#### Alarms & Notifications
- **Alarm**: Custom alarm rules and conditions
- **AlarmReaction**: Automated alarm responses
- **Notification**: Multi-channel notification delivery
- **NotificationTemplate**: Reusable notification templates

#### Payment & Billing
- **Payment**: Fawry payment transactions
- **CreditTransaction**: Credit management and tracking
- **PaymentMethod**: Payment method configurations

### Enhanced RBAC Schema

```sql
-- User roles with hierarchical levels
enum UserRole {
  SUPER_USER  -- Level 5: Platform administration
  ADMIN       -- Level 4: Organization management
  CLIENT      -- Level 3: Client organization access
  OPERATOR    -- Level 2: Device operations
  VIEWER      -- Level 1: Read-only access
}

-- Device-specific assignments
model UserAssignment {
  id        String   @id @default(cuid())
  userId    String
  deviceId  String
  assignedBy String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
  device    Device   @relation(fields: [deviceId], references: [id])
  assignedByUser User @relation("AssignedBy", fields: [assignedBy], references: [id])
  
  @@unique([userId, deviceId])
  @@index([userId])
  @@index([deviceId])
}

-- Command-level permissions
model CommandPermission {
  id          String   @id @default(cuid())
  userId      String
  deviceId    String?  -- Device-specific or global
  command     String   -- Command name
  scope       PermissionScope
  isActive    Boolean  @default(true)
  
  user        User     @relation(fields: [userId], references: [id])
  device      Device?  @relation(fields: [deviceId], references: [id])
  
  @@index([userId, deviceId])
  @@index([command])
}
```

### Time-series Optimization

```sql
-- Telemetry table with TimescaleDB hypertable
CREATE TABLE telemetry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- IoT measurements (37+ fields)
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  pressure DECIMAL(8,2),
  voltage DECIMAL(6,3),
  current DECIMAL(8,4),
  power DECIMAL(10,4),
  energy DECIMAL(15,6),
  -- ... additional telemetry fields
  
  -- Device status
  device_status TEXT,
  connection_quality INTEGER,
  signal_strength INTEGER,
  
  -- System metadata
  message_id UUID,
  raw_data JSONB,
  
  CONSTRAINT telemetry_timestamp_check CHECK (timestamp >= '2023-01-01'::timestamptz)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('telemetry', 'timestamp');

-- Optimized indexes for queries
CREATE INDEX idx_telemetry_device_time ON telemetry (device_id, timestamp DESC);
CREATE INDEX idx_telemetry_device_status ON telemetry (device_id, device_status, timestamp DESC);
```

## 🔌 Usage Examples

### Basic Database Operations

```typescript
import { PrismaClient } from '@lifebox/database';

const prisma = new PrismaClient();

// Create a new device
const device = await prisma.device.create({
  data: {
    name: 'Solar Pump Station 1',
    deviceCode: 'SP001',
    deviceType: 'SOLAR_PUMP',
    clientId: 'client-123',
    location: 'Farm Location A',
    isActive: true,
  },
});

// Query telemetry data with time-series optimization
const recentTelemetry = await prisma.telemetry.findMany({
  where: {
    deviceId: device.id,
    timestamp: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    },
  },
  orderBy: { timestamp: 'desc' },
  take: 100,
});

// Multi-tenant query with client isolation
const clientDevices = await prisma.device.findMany({
  where: {
    clientId: user.clientId, // Automatic client isolation
    isActive: true,
  },
  include: {
    deviceType: true,
    assignments: {
      where: { isActive: true },
      include: { user: true },
    },
  },
});
```

### Enhanced RBAC Queries

```typescript
// Check user permissions for device access
async function hasDeviceAccess(userId: string, deviceId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      assignments: {
        where: {
          deviceId,
          isActive: true,
        },
      },
    },
  });

  if (!user) return false;
  
  // Super users and admins have access to all devices
  if (['SUPER_USER', 'ADMIN'].includes(user.role)) return true;
  
  // Check device-specific assignment
  return user.assignments.length > 0;
}

// Get user's accessible devices
async function getUserDevices(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      assignments: {
        where: { isActive: true },
        include: { device: true },
      },
    },
  });

  if (!user) return [];
  
  // Super users see all devices
  if (user.role === 'SUPER_USER') {
    return prisma.device.findMany({ where: { isActive: true } });
  }
  
  // Admins see all client devices
  if (user.role === 'ADMIN') {
    return prisma.device.findMany({
      where: { clientId: user.clientId, isActive: true },
    });
  }
  
  // Other users see only assigned devices
  return user.assignments.map(assignment => assignment.device);
}
```

### Time-series Queries

```typescript
// Efficient telemetry aggregation with TimescaleDB
async function getDeviceMetrics(deviceId: string, hours: number = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  // Use raw SQL for optimal TimescaleDB performance
  const metrics = await prisma.$queryRaw`
    SELECT 
      time_bucket('1 hour', timestamp) AS hour,
      AVG(temperature) as avg_temp,
      AVG(humidity) as avg_humidity,
      AVG(power) as avg_power,
      SUM(energy) as total_energy,
      COUNT(*) as data_points
    FROM telemetry 
    WHERE device_id = ${deviceId}::uuid 
      AND timestamp >= ${startTime}
    GROUP BY hour 
    ORDER BY hour DESC
  `;
  
  return metrics;
}

// Real-time latest telemetry
async function getLatestTelemetry(deviceId: string) {
  return prisma.telemetry.findFirst({
    where: { deviceId },
    orderBy: { timestamp: 'desc' },
  });
}
```

## 🔧 Configuration

### Database Connection

```typescript
// Environment variables
DATABASE_URL=postgresql://username:password@localhost:5432/lifebox_dev
DATABASE_URL_TEST=postgresql://username:password@localhost:5432/lifebox_test
SHADOW_DATABASE_URL=postgresql://username:password@localhost:5432/lifebox_shadow
```

### Prisma Configuration

```typescript
// libs/database/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "./node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### TimescaleDB Setup

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create hypertable for telemetry (after running Prisma migrations)
SELECT create_hypertable('telemetry', 'timestamp');

-- Set up retention policy (optional)
SELECT add_retention_policy('telemetry', INTERVAL '1 year');

-- Create continuous aggregates for performance
CREATE MATERIALIZED VIEW telemetry_hourly
WITH (timescaledb.continuous) AS
  SELECT device_id,
         time_bucket('1 hour', timestamp) AS hour,
         AVG(temperature) as avg_temp,
         AVG(power) as avg_power,
         COUNT(*) as data_points
  FROM telemetry
  GROUP BY device_id, hour;
```

## 🧪 Testing

### Running Tests

```bash
# Run database tests
npm run test:db

# Test migrations
npm run db:migrate:test

# Validate schema
npm run db:validate
```

### Seed Data

```bash
# Reset and seed development database
npm run db:reset

# Seed specific data
npm run seed:clients
npm run seed:users
npm run seed:devices
```

## 📈 Performance Optimization

### Indexing Strategy

```sql
-- Multi-tenant indexes
CREATE INDEX idx_devices_client_active ON devices(client_id, is_active);
CREATE INDEX idx_users_client_role ON users(client_id, role);

-- Permission checking indexes
CREATE INDEX idx_assignments_user_device_active ON user_assignments(user_id, device_id, is_active);
CREATE INDEX idx_command_permissions_user_device ON command_permissions(user_id, device_id);

-- Telemetry performance indexes
CREATE INDEX idx_telemetry_device_time ON telemetry(device_id, timestamp DESC);
CREATE INDEX idx_telemetry_status_time ON telemetry(device_status, timestamp DESC) WHERE device_status IS NOT NULL;
```

### Query Optimization

- **Connection pooling**: Configured for optimal concurrent connections
- **Prepared statements**: Automatic with Prisma Client
- **Batch operations**: Efficient bulk inserts for telemetry data
- **Aggregation queries**: Optimized with TimescaleDB continuous aggregates

## 🔒 Security Features

### Data Protection

- **Client isolation**: Row-level security with client_id filtering
- **Audit trails**: Comprehensive logging of all data changes
- **Encryption**: Support for encrypted columns for sensitive data
- **Access control**: Database-level user permissions

### Migration Safety

- **Shadow database**: Safe migration testing
- **Backup procedures**: Automated backup before migrations
- **Rollback capability**: All migrations are reversible
- **Data validation**: Schema validation after migrations

## 🚀 Production Deployment

### Migration Workflow

```bash
# Production migration process
npm run db:backup              # Backup current database
npm run db:migrate:deploy      # Apply migrations
npm run db:validate           # Validate schema
npm run db:seed:production    # Seed production data if needed
```

### Monitoring

- **Connection monitoring**: Track active connections and performance
- **Query performance**: Monitor slow queries and optimization opportunities
- **Data growth**: Track table sizes and implement archiving strategies
- **Health checks**: Regular database connectivity and performance checks

## 🤝 Contributing

### Schema Changes

1. **Update schema**: Modify `prisma/schema.prisma`
2. **Generate migration**: `npm run db:migrate:dev --name "description"`
3. **Test migration**: Run on test database
4. **Update exports**: Run `npm run generate:exports`
5. **Update documentation**: Document schema changes

### Best Practices

- **Use transactions**: For complex operations
- **Index properly**: Add indexes for query performance
- **Maintain relationships**: Use proper foreign keys and constraints
- **Document changes**: Update README for schema modifications

## 📄 License

Copyright © 2024 LifeBox IoT Platform. All rights reserved.

---

**Production-ready database layer optimized for IoT workloads! 🚀**