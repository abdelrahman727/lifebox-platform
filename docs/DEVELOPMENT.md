# Development Workflows Guide

**Comprehensive guide for developing with the LifeBox IoT Platform**

## 📋 Table of Contents

- [Daily Development Workflow](#daily-development-workflow)
- [Feature Development Process](#feature-development-process)
- [Development Tools Usage](#development-tools-usage)
- [Testing Workflow](#testing-workflow)
- [Quality Assurance Process](#quality-assurance-process)
- [Database Development Workflow](#database-development-workflow)
- [API Development Workflow](#api-development-workflow)
- [Frontend Development Workflow](#frontend-development-workflow)
- [Deployment Workflow](#deployment-workflow)

## 🚀 Daily Development Workflow

### Morning Setup

```bash
# 1. Pull latest changes
git pull origin main

# 2. Start infrastructure services
npm run dev:services

# 3. Update dependencies if needed
npm run install:all

# 4. Run database migrations
npm run db:migrate

# 5. Verify system health
npm run health:check
```

### Development Session

```bash
# 1. Create/switch to feature branch
git checkout -b feature/device-management-improvements

# 2. Start development servers
npm run dev              # All services
# OR individually:
npm run dev:api         # NestJS API (port 3000)
npm run dev:web         # Next.js frontend (port 3001)
npm run dev:mqtt        # MQTT service

# 3. Open VS Code workspace
code lifebox-platform.code-workspace

# 4. Monitor logs in terminal
npm run logs:all        # Combined logs
```

### End of Day Cleanup

```bash
# 1. Run quality checks
./tools/quality-check.sh

# 2. Commit work in progress (if needed)
git add .
git commit -m "wip: device management improvements"

# 3. Push to backup branch
git push origin feature/device-management-improvements

# 4. Stop services
npm run stop:all
```

## 🔧 Feature Development Process

### 1. Planning Phase

```bash
# Create feature branch
git checkout main
git pull origin main
git checkout -b feature/user-role-permissions

# Plan development tasks
# - Review requirements and design
# - Break down into subtasks
# - Estimate complexity and timeline
```

### 2. Backend Development (NestJS)

```bash
# Generate module scaffolding
./tools/generate-code.sh nestjs user-permissions

# Typical development order:
# 1. Database models (Prisma schema)
# 2. DTOs and validation
# 3. Service layer with business logic
# 4. Controller with HTTP endpoints
# 5. Unit tests
# 6. Integration tests
```

**Example Workflow**:

```typescript
// 1. Update Prisma schema
// libs/database/prisma/schema.prisma
model UserPermission {
  id     String @id @default(cuid())
  userId String
  scope  String
  // ... other fields
}

// 2. Generate migration
npm run db:migrate:dev --name "add-user-permissions"

// 3. Create DTOs
// apps/api/src/modules/user-permissions/dto/create-user-permission.dto.ts
export class CreateUserPermissionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
  
  @IsEnum(PermissionScope)
  scope: PermissionScope;
}

// 4. Implement service
// apps/api/src/modules/user-permissions/user-permissions.service.ts
@Injectable()
export class UserPermissionsService {
  async create(dto: CreateUserPermissionDto): Promise<UserPermission> {
    return this.prisma.userPermission.create({ data: dto });
  }
}

// 5. Create controller
// apps/api/src/modules/user-permissions/user-permissions.controller.ts
@Controller('user-permissions')
@UseGuards(JwtAuthGuard)
export class UserPermissionsController {
  @Post()
  async create(@Body() dto: CreateUserPermissionDto) {
    return this.userPermissionsService.create(dto);
  }
}

// 6. Write tests
// apps/api/src/modules/user-permissions/user-permissions.service.spec.ts
describe('UserPermissionsService', () => {
  // Unit tests here
});
```

### 3. Frontend Development (Next.js)

```bash
# Generate React component
./tools/generate-code.sh react UserPermissionsManager

# Typical development order:
# 1. Create UI components
# 2. Implement API integration
# 3. Add form validation
# 4. Handle loading/error states
# 5. Add TypeScript interfaces
# 6. Write component tests
```

**Example Workflow**:

```tsx
// 1. Create component structure
// apps/web/src/components/UserPermissionsManager.tsx
interface UserPermissionsManagerProps {
  userId: string;
}

export function UserPermissionsManager({ userId }: UserPermissionsManagerProps) {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Implementation here
}

// 2. Add API integration
// apps/web/src/lib/api/user-permissions.ts
export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  const response = await fetch(`/api/v1/users/${userId}/permissions`);
  return response.json();
}

// 3. Integrate with component
const { data, error, mutate } = useSWR(
  `/users/${userId}/permissions`,
  () => getUserPermissions(userId)
);
```

### 4. Testing Phase

```bash
# Run comprehensive tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:cov         # Coverage report

# Test specific modules
npm run test -- user-permissions
npm run test:e2e -- --testNamePattern="user permissions"
```

### 5. Documentation Updates

```bash
# Update relevant documentation
# - README files for affected modules
# - API documentation (Swagger)
# - Component documentation
# - Architecture decisions (ADRs) if needed

# Generate updated documentation
./tools/generate-docs.sh
```

## 🛠️ Development Tools Usage

### Code Generation Tools

```bash
# NestJS module generation
./tools/generate-code.sh nestjs module-name
# Creates: controller, service, module, DTOs, tests

# React component generation  
./tools/generate-code.sh react ComponentName
# Creates: component, props interface, styles, tests

# Prisma model generation
./tools/generate-code.sh prisma ModelName
# Creates: model definition, migration, seed data

# Test generation
./tools/generate-code.sh test service-name
# Creates: unit tests, mocks, fixtures
```

### Quality Gate System

```bash
# Run comprehensive quality checks
./tools/quality-check.sh

# Individual quality checks
npm run lint              # ESLint checks
npm run format            # Prettier formatting
npm run typecheck         # TypeScript compilation
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run build             # Build verification
npm run security:audit    # Security audit
npm run db:validate       # Database validation
```

### VS Code Integration

**Debug Configurations**:
- 🚀 Debug Full Stack: Debug API + MQTT + Frontend together
- 🔌 Debug API: Debug NestJS API service
- 📡 Debug MQTT Service: Debug MQTT ingestion service
- 📱 Debug Next.js: Debug frontend application

**Useful Tasks**:
- `Ctrl+Shift+P` → "Tasks: Run Task"
  - 🚀 Start All Services
  - 🧪 Run Quality Check
  - 📊 Run Tests with Coverage
  - 🔄 Database Reset & Seed

**Recommended Workflow**:
1. Open workspace: `code lifebox-platform.code-workspace`
2. Use integrated terminal for git operations
3. Use debug panel for step-through debugging
4. Use problems panel to see all linting/type errors
5. Use test explorer for test management

## 🧪 Testing Workflow

### Test-Driven Development (TDD)

```bash
# 1. Write failing test first
# apps/api/src/modules/users/users.service.spec.ts
describe('UserService', () => {
  it('should create user with valid data', async () => {
    // Arrange
    const userData = { email: 'test@test.com', role: 'USER' };
    
    // Act & Assert
    const user = await userService.create(userData);
    expect(user.email).toBe(userData.email);
  });
});

# 2. Run test (should fail)
npm run test -- users.service

# 3. Implement minimal code to make test pass
# apps/api/src/modules/users/users.service.ts
async create(userData: CreateUserDto): Promise<User> {
  return this.prisma.user.create({ data: userData });
}

# 4. Run test again (should pass)
npm run test -- users.service

# 5. Refactor if needed
# 6. Repeat for next feature
```

### Testing Pyramid

```bash
# Unit Tests (70% of tests) - Fast, isolated
npm run test                    # All unit tests
npm run test -- module-name     # Specific module
npm run test:watch              # Watch mode for development

# Integration Tests (20% of tests) - API endpoints
npm run test:integration        # All integration tests
npm run test:integration -- auth # Specific module

# E2E Tests (10% of tests) - Full user workflows  
npm run test:e2e                # All E2E tests
npm run test:e2e -- login       # Specific workflow
```

### Test Data Management

```typescript
// Use factories for consistent test data
// test/factories/user.factory.ts
export function createUserDto(overrides?: Partial<CreateUserDto>): CreateUserDto {
  return {
    email: faker.internet.email(),
    password: 'Test123!',
    role: 'USER',
    clientId: 'test-client',
    ...overrides,
  };
}

// Use in tests
const userData = createUserDto({ role: 'ADMIN' });
const user = await userService.create(userData);
```

## ✅ Quality Assurance Process

### Pre-commit Workflow

```bash
# Automated pre-commit hooks run:
# 1. ESLint with auto-fix
# 2. Prettier formatting
# 3. TypeScript compilation check
# 4. Unit tests for changed files
# 5. Security audit

# Manual quality check
./tools/quality-check.sh

# Quality gate report shows:
# ✅ TypeScript compilation passed
# ✅ ESLint passed (0 errors, 0 warnings)  
# ✅ Prettier formatting passed
# ✅ Unit tests passed (95.2% coverage)
# ✅ E2E tests passed (19/19 tests)
# ✅ Security audit passed (0 vulnerabilities)
# ✅ Build passed
# ✅ Database validation passed
```

### Continuous Quality Monitoring

```bash
# Setup quality monitoring
npm run quality:monitor

# Regular quality reports
npm run quality:report

# Performance benchmarking
npm run perf:benchmark

# Security scanning
npm run security:scan
```

## 💾 Database Development Workflow

### Schema Development

```bash
# 1. Update Prisma schema
# libs/database/prisma/schema.prisma

model NewTable {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}

# 2. Generate migration
npm run db:migrate:dev --name "add-new-table"

# 3. Apply migration
npm run db:migrate

# 4. Generate new Prisma client
npm run db:generate

# 5. Update seed data (if needed)
# libs/database/seed.ts

# 6. Test migration
npm run db:reset
npm run db:seed
```

### Database Testing

```bash
# Test migrations in isolation
DATABASE_URL=postgresql://user:pass@localhost:5432/test_db \
  npm run db:migrate

# Validate schema consistency
npm run db:validate

# Test seed data
npm run db:seed:test

# Performance testing
npm run db:benchmark
```

### Data Migration Workflow

```bash
# For complex data migrations:
# 1. Create migration with empty up/down functions
npm run db:migrate:create --name "complex-data-migration"

# 2. Write custom migration logic
# libs/database/migrations/xxx_complex-data-migration/migration.sql

# 3. Test migration on copy of production data
npm run db:migrate:test

# 4. Create rollback plan
# Ensure down migration can safely revert changes

# 5. Apply to production with backup
npm run db:backup:production
npm run db:migrate:production
```

## 🔌 API Development Workflow

### RESTful API Development

```bash
# 1. Define resource endpoints
# GET    /api/v1/resources
# POST   /api/v1/resources
# GET    /api/v1/resources/:id
# PATCH  /api/v1/resources/:id
# DELETE /api/v1/resources/:id

# 2. Create DTOs for validation
# create-resource.dto.ts, update-resource.dto.ts

# 3. Implement service layer
# resource.service.ts with CRUD operations

# 4. Create controller with decorators
# @Controller, @Get, @Post, @UseGuards, etc.

# 5. Add Swagger documentation
# @ApiTags, @ApiOperation, @ApiResponse

# 6. Write comprehensive tests
# Unit tests for service, E2E tests for endpoints
```

### WebSocket Development

```typescript
// 1. Define gateway for real-time features
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL },
  namespace: 'devices'
})
export class DevicesGateway {
  @WebSocketServer() server: Server;
  
  @SubscribeMessage('join-device')
  handleJoinDevice(@MessageBody() deviceId: string) {
    // Implementation
  }
}

# 2. Test WebSocket connections
npm run test:websocket

# 3. Load test WebSocket performance
npm run test:websocket:load
```

### API Documentation Workflow

```bash
# Generate API documentation
./tools/generate-docs.sh api

# Update Swagger decorators
@ApiOperation({ summary: 'Create new device' })
@ApiBody({ type: CreateDeviceDto })
@ApiResponse({ status: 201, type: DeviceResponseDto })

# Validate API docs
curl http://localhost:3000/api-json | jq '.'

# Generate client SDKs (if needed)
swagger-codegen generate -i openapi.json -l typescript-fetch
```

## 📱 Frontend Development Workflow

### Component Development

```bash
# 1. Create component with proper structure
./tools/generate-code.sh react UserDashboard

# 2. Define TypeScript interfaces
interface UserDashboardProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

# 3. Implement component with hooks
const UserDashboard: React.FC<UserDashboardProps> = ({ user, onUserUpdate }) => {
  // Implementation with useState, useEffect, etc.
};

# 4. Add Storybook story (if using)
export default {
  title: 'Dashboard/UserDashboard',
  component: UserDashboard,
};

# 5. Write component tests
npm run test -- UserDashboard
```

### State Management Workflow

```typescript
// 1. Create context for complex state
const UserContext = createContext<UserContextType | undefined>(undefined);

// 2. Implement custom hooks
const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

// 3. Connect with API using SWR/React Query
const { data: user, error, mutate } = useSWR(
  `/users/${userId}`,
  fetcher,
  { refreshInterval: 30000 }
);
```

### Real-time Integration

```typescript
// 1. Setup Socket.IO client
const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
  auth: { token: authToken },
});

// 2. Subscribe to events
useEffect(() => {
  socket.on('device-update', handleDeviceUpdate);
  socket.on('alarm', handleAlarm);
  
  return () => {
    socket.off('device-update');
    socket.off('alarm');
  };
}, []);

// 3. Handle real-time updates
const handleDeviceUpdate = (device: Device) => {
  setDevices(prev => 
    prev.map(d => d.id === device.id ? device : d)
  );
};
```

## 🚀 Deployment Workflow

### Development Deployment

```bash
# 1. Build and test locally
npm run build
npm run test:prod

# 2. Deploy to development environment
npm run deploy:dev

# 3. Run smoke tests
npm run test:smoke:dev

# 4. Verify deployment
curl https://dev-api.lifebox.com/api/v1/health
```

### Production Deployment

```bash
# 1. Create release branch
git checkout -b release/v2.1.0

# 2. Update version numbers
npm version patch  # or minor/major

# 3. Run full quality gate
./tools/quality-check.sh

# 4. Build production images
npm run build:prod
docker build -t lifebox-api:v2.1.0 .

# 5. Deploy with zero-downtime
npm run deploy:prod:rolling

# 6. Run production health checks
npm run test:health:prod

# 7. Monitor deployment
npm run monitor:deployment
```

### Environment Management

```bash
# Environment-specific configurations
.env.development    # Local development
.env.staging        # Staging environment  
.env.production     # Production environment

# Deploy to specific environment
NODE_ENV=staging npm run deploy

# Environment validation
npm run validate:env:production
```

### Rollback Workflow

```bash
# If deployment issues occur:

# 1. Immediate rollback
npm run rollback:immediate

# 2. Database rollback (if needed)
npm run db:rollback:last-migration

# 3. Verify rollback
npm run test:health:prod

# 4. Post-mortem analysis
npm run analyze:deployment-failure
```

## 📊 Monitoring and Debugging Workflow

### Application Monitoring

```bash
# Real-time logs
npm run logs:api        # API service logs
npm run logs:mqtt       # MQTT service logs
npm run logs:web        # Frontend logs
npm run logs:all        # Combined logs

# Performance monitoring
npm run monitor:performance
npm run monitor:memory
npm run monitor:cpu

# Health checks
npm run health:detailed
npm run health:database
npm run health:external-services
```

### Debugging Workflow

```bash
# Debug API service
npm run debug:api       # Start API in debug mode
# Attach debugger on port 9229

# Debug specific issues
NODE_ENV=development DEBUG=* npm run dev:api

# Database query debugging
DATABASE_LOGGING=true npm run dev:api

# Frontend debugging
npm run dev:web         # Start with source maps
# Use browser dev tools for debugging
```

### Error Tracking and Analysis

```bash
# Analyze error logs
npm run analyze:errors

# Generate error reports
npm run report:errors:last24h
npm run report:performance:weekly

# Debug specific error patterns
npm run debug:error-pattern "JWT token expired"
```

---

**This comprehensive development workflow ensures consistent, high-quality development practices across the LifeBox IoT Platform! 🚀**