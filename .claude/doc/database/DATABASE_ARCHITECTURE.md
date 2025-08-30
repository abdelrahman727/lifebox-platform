# Database Architecture - LifeBox IoT Platform

## Overview
The LifeBox platform uses **PostgreSQL 15** with **TimescaleDB extension** for optimized time-series data handling. The database is managed through **Prisma ORM** providing type-safe database access and automatic migrations.

## Database Configuration

### Technology Stack
- **Database**: PostgreSQL 15+
- **Extension**: TimescaleDB (for telemetry data optimization)  
- **ORM**: Prisma 5.x with TypeScript
- **Connection**: Prisma Client with connection pooling

### Database URL Structure
```
DATABASE_URL="postgresql://username:password@localhost:5432/lifebox_db"
```

## Schema Organization

The database schema contains **30+ models** organized into logical categories:

### 1. Authentication & Authorization (5 models)
- **`Role`**: System roles (super_user, admin, client, operator, viewer)
- **`User`**: System users with role-based access
- **`RolePermission`**: Role-based permissions system
- **`PasswordResetToken`**: Secure password reset functionality
- **`RefreshToken`**: JWT refresh token management

### 2. Device Management (6 models)
- **`Device`**: IoT device registration and configuration
- **`DeviceLocation`**: Geographic location tracking
- **`DeviceMetadataHistory`**: Configuration change tracking
- **`DeviceMetadataSnapshot`**: Point-in-time configuration snapshots
- **`UserDeviceAssignment`**: Device-specific user access control
- **`DeviceAlarm`**: Hardware-level device alarms from MQTT

### 3. Telemetry & IoT Data (3 models)
- **`TelemetryEvent`**: Time-series telemetry data (37+ fields)
- **`UnknownFieldCatalog`**: Dynamic field discovery system
- **`DeviceDataPoint`**: Processed device metrics

### 4. Command & Control (6 models)
- **`ControlCommand`**: Device command execution
- **`CommandAcknowledgment`**: Command status tracking
- **`CommandTemplate`**: Predefined command templates (28+)
- **`CommandPermission`**: Available command types
- **`UserCommandPermission`**: Hierarchical command delegation
- **`CommandExecution`**: Command execution audit trail

### 5. Alarm & Monitoring (4 models)
- **`AlarmRule`**: Custom alarm rule definitions
- **`AlarmEvent`**: Triggered alarm instances  
- **`AlarmReaction`**: Alarm response configuration
- **`AlarmAcknowledgment`**: Alarm resolution tracking

### 6. Client & Business Logic (8 models)
- **`Client`**: Customer organizations
- **`Subscription`**: Client subscription management
- **`CustomerPricing`**: Custom pricing configurations
- **`PostpaidPeriod`**: Billing period management
- **`CreditTransaction`**: Payment and credit tracking
- **`FawryPaymentNotification`**: Payment gateway integration
- **`FawryCustomerData`**: Customer payment information
- **`ExchangeRate`**: Multi-currency support

### 7. Advanced Features (6+ models)
- **`QuickViewPage`**: Custom dashboard pages
- **`QuickViewPageShare`**: Dashboard sharing system
- **`File`**: Document management with access control
- **`Widget`**: Dashboard widget definitions
- **`DashboardLayout`**: User dashboard configurations
- **`CalculationFormula`**: Custom metric calculations

## Key Database Features

### 1. Time-Series Optimization
```sql
-- TimescaleDB hypertable for telemetry data
SELECT create_hypertable('telemetry_events', 'time');
```

### 2. Enhanced Indexing Strategy
- **Time-based indexes**: Optimized for telemetry queries
- **Device-specific indexes**: Fast device data retrieval
- **Client isolation indexes**: Multi-tenant data access
- **Command tracking indexes**: Performance command history

### 3. Foreign Key Relationships
- **Referential integrity**: All relationships properly constrained
- **Cascade deletes**: Proper cleanup when entities are removed
- **Client data isolation**: Automatic scoping by client

### 4. Multi-tenant Architecture
- **Client-scoped data**: All entities properly isolated by client
- **Role-based access**: Hierarchical permission system
- **Device assignments**: Users can access specific devices only

## Database Operations

### Development Commands
```bash
# Schema management
npm run db:migrate                    # Apply pending migrations
npm run db:studio                     # Open Prisma Studio GUI
npm run db:seed                       # Seed initial data
cd libs/database && npm run generate  # Regenerate Prisma client

# Development utilities
npm run db:reset                      # Reset database (dev only)
npm run db:push                       # Push schema changes (dev only)
```

### Production Commands
```bash
# Production deployment
npm run db:migrate:prod               # Apply migrations in production
npm run db:seed:prod                  # Seed production data
```

## Database Export & Usage

### Prisma Client Generation
The database schema is exported to applications through the Prisma client:

```bash
# Generate Prisma client
cd libs/database
npm run generate

# Client is generated to:
libs/database/node_modules/@prisma/client/
```

### Application Integration
Applications import the database client from the shared library:

```typescript
// In apps/api/src/modules/database/prisma.service.ts
import { PrismaClient } from '@lifebox/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Shared Database Package
The database is packaged as a shared library:

```json
// libs/database/package.json
{
  "name": "@lifebox/database",
  "exports": {
    ".": "./index.ts",
    "./client": "./node_modules/@prisma/client"
  }
}
```

### Cross-Application Usage
Applications reference the database through workspace dependencies:

```json
// apps/api/package.json
{
  "dependencies": {
    "@lifebox/database": "file:../modules/database"
  }
}
```

## Data Relationships

### Core Entity Relationships
```
User ──┐
       ├─→ Client ──→ Device ──→ TelemetryEvent
       ├─→ Role ──→ RolePermission
       └─→ UserDeviceAssignment ──→ Device

Device ──┐
         ├─→ ControlCommand
         ├─→ DeviceAlarm  
         ├─→ AlarmRule ──→ AlarmEvent
         └─→ DeviceMetadataSnapshot

Client ──┐
         ├─→ CreditTransaction
         ├─→ FawryPaymentNotification
         └─→ Subscription
```

### Advanced Relationships
```
QuickViewPage ──┐
                ├─→ Device (many-to-many)
                ├─→ CommandTemplate (many-to-many)
                └─→ QuickViewPageShare ──→ User

CommandPermission ──→ UserCommandPermission ──→ User
                                              └─→ Device (scoped)
```

## Performance Considerations

### Query Optimization
- **Prepared statements**: All Prisma queries use prepared statements
- **Connection pooling**: Managed by Prisma Client
- **Index usage**: Strategic indexing for common query patterns

### Time-Series Performance
- **TimescaleDB chunks**: Automatic data partitioning by time
- **Data retention**: Configurable retention policies
- **Compression**: Automatic compression for older data

### Multi-tenant Performance
- **Client isolation**: Row-level security with client filtering
- **Scoped queries**: All queries automatically scoped by client
- **Index optimization**: Client-specific indexes for performance

## Backup & Recovery

### Backup Strategy
```bash
# Full database backup
pg_dump lifebox_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema-only backup
pg_dump --schema-only lifebox_db > schema_backup.sql

# Data-only backup
pg_dump --data-only lifebox_db > data_backup.sql
```

### Recovery Process
```bash
# Restore full database
psql lifebox_db < backup_file.sql

# Restore schema only
psql lifebox_db < schema_backup.sql

# Restore data only  
psql lifebox_db < data_backup.sql
```

## Migration Management

### Migration Files Location
```
libs/database/prisma/migrations/
└── migration_lock.toml              # Migration provider lock
```

### Migration Best Practices
1. **Always backup before migrations**: Especially in production
2. **Test migrations**: Run on staging environment first
3. **Rollback strategy**: Prepare rollback scripts for complex changes
4. **Data migration**: Use Prisma migrate for schema, custom scripts for data

### Migration Commands
```bash
# Create new migration
npx prisma migrate dev --name description

# Apply pending migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## Monitoring & Maintenance

### Database Health Checks
```sql
-- Check connection
SELECT 1;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;
```

### Performance Monitoring
- **Query performance**: Monitor slow queries with pg_stat_statements
- **Connection usage**: Track connection pool utilization
- **Index usage**: Monitor index effectiveness
- **TimescaleDB metrics**: Monitor chunk and compression statistics

This database architecture provides a robust, scalable foundation for the LifeBox IoT platform with proper multi-tenancy, time-series optimization, and comprehensive business logic support.