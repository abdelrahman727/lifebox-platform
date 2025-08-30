# LifeBox Naming Conventions

This document defines consistent naming conventions across the LifeBox IoT Platform codebase.

## 📁 Files and Directories

### **Directory Names**
- **kebab-case**: `user-assignments`, `device-alarms`
- **Lowercase**: `src`, `lib`, `components`
- **Descriptive**: `apps`, `libs`, `infrastructure`

✅ **Good:**
```
apps/mqtt-ingestion/
libs/shared/
scripts/backup/
tools/health-check.sh
```

❌ **Bad:**
```
Apps/MQTT_Ingestion/
libs/Shared/
Scripts/Backup/
tools/HealthCheck.sh
```

### **File Names**

#### **TypeScript/JavaScript Files**
- **kebab-case**: `user-assignment.dto.ts`
- **PascalCase for classes**: `UserAssignmentController.ts` → `user-assignment.controller.ts`
- **Suffix indicates purpose**: `.controller.ts`, `.service.ts`, `.module.ts`

#### **Configuration Files**
- **kebab-case**: `docker-compose.yml`, `nest-cli.json`
- **Dot notation**: `.eslintrc.js`, `.prettierrc`

#### **Scripts**
- **kebab-case**: `setup-dev.sh`, `backup-database.sh`
- **Action-oriented**: Start with verb (`deploy-`, `backup-`, `clean-`)
- **Environment suffix**: `docker-compose.production.yml`

## 💼 Code Naming

### **Variables and Functions**
- **camelCase**: `getUserById`, `deviceStatus`, `mqttBrokerHost`
- **Descriptive**: `isUserActive` not `active`
- **Boolean prefix**: `is`, `has`, `can`, `should`

✅ **Good:**
```typescript
const isDeviceOnline = true;
const getUserAssignments = async (userId: string) => {};
const canUserAccessDevice = (user: User, device: Device) => {};
```

❌ **Bad:**
```typescript
const online = true;
const getUA = async (uid: string) => {};
const check = (u: User, d: Device) => {};
```

### **Constants**
- **SCREAMING_SNAKE_CASE**: `MAX_RETRY_ATTEMPTS`, `DEFAULT_PORT`
- **Grouped by prefix**: `DB_HOST`, `DB_PORT`, `DB_NAME`

```typescript
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_API_PORT = 3000;
const JWT_EXPIRATION_TIME = '15m';
```

### **Classes and Interfaces**
- **PascalCase**: `UserService`, `DeviceController`, `TelemetryDto`
- **Descriptive suffixes**: `Controller`, `Service`, `Module`, `Guard`, `Dto`

✅ **Good:**
```typescript
export class UserAssignmentsController {}
export class EnhancedPermissionsGuard {}
export interface DeviceAssignmentDto {}
```

❌ **Bad:**
```typescript
export class userAssignments {}
export class permGuard {}
export interface deviceDto {}
```

### **Types and Enums**
- **PascalCase**: `AlarmStatus`, `UserRole`, `DeviceType`
- **Descriptive**: `CommandPermissionScope` not `CPS`

```typescript
enum AlarmStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  ACKNOWLEDGED = 'acknowledged'
}

type ApiResponse<T> = {
  data: T;
  status: 'success' | 'error';
  message?: string;
}
```

## 🌐 API and Database

### **REST API Endpoints**
- **kebab-case**: `/api/v1/user-assignments`
- **Plural nouns**: `/users`, `/devices`, `/alarms`
- **Hierarchical**: `/users/:id/devices`, `/devices/:id/commands`

✅ **Good:**
```
GET    /api/v1/users
POST   /api/v1/user-assignments
GET    /api/v1/devices/:id/telemetry
POST   /api/v1/devices/:id/commands
```

❌ **Bad:**
```
GET    /api/v1/user
POST   /api/v1/userAssignments
GET    /api/v1/device/:id/telem
POST   /api/v1/device/:id/cmd
```

### **Database Tables and Columns**
- **snake_case**: `user_assignments`, `device_alarms`
- **Descriptive**: `created_at`, `updated_at`
- **Consistent prefixes**: `is_active`, `has_permission`

```sql
CREATE TABLE user_assignments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  device_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎨 Frontend (Next.js/React)

### **Components**
- **PascalCase**: `UserDashboard`, `DeviceCard`, `AlarmNotification`
- **Descriptive**: `UserAssignmentForm` not `Form`

```typescript
// File: components/user-assignment-form.tsx
export const UserAssignmentForm: React.FC<Props> = () => {};

// File: components/ui/device-status-badge.tsx
export const DeviceStatusBadge: React.FC<Props> = () => {};
```

### **Pages and Routes**
- **kebab-case files**: `user-assignments.tsx`, `device-management.tsx`
- **Hierarchical structure**: `devices/[id]/commands.tsx`

```
pages/
├── devices/
│   ├── index.tsx           # /devices
│   ├── [id].tsx           # /devices/:id
│   └── [id]/
│       └── commands.tsx   # /devices/:id/commands
└── user-assignments.tsx  # /user-assignments
```

## 🔧 Configuration and Environment

### **Environment Variables**
- **SCREAMING_SNAKE_CASE**: `DATABASE_URL`, `JWT_SECRET`
- **Grouped by prefix**: `DB_*`, `MQTT_*`, `SMTP_*`

```bash
# Database
DATABASE_URL=postgresql://...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lifebox

# MQTT
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_USERNAME=lifebox
MQTT_PASSWORD=secret

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### **Docker Services and Containers**
- **kebab-case**: `lifebox-api`, `lifebox-mqtt`, `lifebox-web`
- **Descriptive**: Include project name as prefix

```yaml
services:
  lifebox-api:
    container_name: lifebox-api
    build: ./apps/api
  
  lifebox-mqtt:
    container_name: lifebox-mqtt-ingestion
    build: ./apps/mqtt-ingestion
```

## 📦 Package and Module Names

### **npm Packages**
- **Scoped**: `@lifebox/api`, `@lifebox/database`, `@lifebox/shared`
- **kebab-case**: `@lifebox/mqtt-ingestion`

```json
{
  "name": "@lifebox/mqtt-ingestion",
  "version": "1.0.0"
}
```

### **TypeScript Modules**
- **PascalCase**: `UsersModule`, `DevicesModule`
- **Descriptive**: `UserAssignmentsModule` not `AssignmentsModule`

## 🏷️ Git and Version Control

### **Branch Names**
- **kebab-case**: `feature/user-assignments`, `fix/database-connection`
- **Prefixed**: `feature/`, `fix/`, `hotfix/`, `release/`

✅ **Good:**
```
feature/enhanced-permissions
fix/mqtt-connection-timeout
hotfix/critical-security-patch
```

❌ **Bad:**
```
userAssignments
fix_database
HOTFIX-Security
```

### **Commit Messages**
- **Conventional format**: `type(scope): description`
- **Lowercase**: Start with lowercase letter
- **Imperative mood**: "add", "fix", "update"

✅ **Good:**
```
feat(auth): add JWT refresh token functionality
fix(mqtt): resolve connection timeout issues
docs(api): update endpoint documentation
```

❌ **Bad:**
```
Added JWT tokens
Fixed bugs
Updated stuff
```

## 🎯 Validation Checklist

Use this checklist when adding new code:

### **Files and Directories**
- [ ] Directory names use kebab-case
- [ ] File names follow convention (kebab-case + appropriate suffix)
- [ ] Script files are executable and properly named

### **Code**
- [ ] Variables and functions use camelCase
- [ ] Classes and interfaces use PascalCase
- [ ] Constants use SCREAMING_SNAKE_CASE
- [ ] Names are descriptive and not abbreviated

### **API and Database**
- [ ] Endpoints use kebab-case and plural nouns
- [ ] Database tables/columns use snake_case
- [ ] Consistent naming patterns across related entities

### **Configuration**
- [ ] Environment variables use SCREAMING_SNAKE_CASE
- [ ] Docker services use kebab-case with project prefix
- [ ] Configuration files follow established patterns

---

**Remember**: Consistency is more important than perfection. When in doubt, follow the existing patterns in the codebase.