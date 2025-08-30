# Contributing to LifeBox IoT Platform

Welcome to the LifeBox IoT Platform! This guide will help you understand how to contribute effectively to our enterprise-grade IoT solution.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Requirements](#documentation-requirements)
- [Security Guidelines](#security-guidelines)
- [Performance Standards](#performance-standards)
- [Submission Process](#submission-process)

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.0.0 or later
- **npm**: v10.0.0 or later  
- **PostgreSQL**: v15.0 or later with TimescaleDB extension
- **Docker**: v24.0.0 or later (for local development)
- **Git**: v2.30.0 or later

### First-time Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/lifebox-platform-complete.git lifebox-platform
cd lifebox-platform

# 2. Install dependencies
npm run install:all

# 3. Setup development environment
cp .env.example .env
npm run setup:dev

# 4. Start infrastructure services
npm run dev:services

# 5. Setup database
npm run db:migrate
npm run db:seed

# 6. Verify installation
npm run health:check
```

## 🛠️ Development Setup

### VS Code Configuration

We provide a comprehensive VS Code workspace configuration:

```bash
# Open the workspace
code lifebox-platform.code-workspace
```

**Recommended Extensions** (auto-installed with workspace):
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- TypeScript Hero (`rbbit.typescript-hero`)
- Prisma (`Prisma.prisma`)
- Docker (`ms-azuretools.vscode-docker`)

### Development Container

For consistent development environment:

```bash
# Open in DevContainer (VS Code)
# Command Palette > "Dev Containers: Reopen in Container"

# Or use Docker directly
docker-compose -f .devcontainer/docker-compose.yml up
```

## 📝 Code Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use strict typing
interface DeviceCreateDto {
  name: string;
  deviceCode: string;
  deviceType: DeviceType;
  clientId: string;
}

// ❌ Avoid: Any types
const device: any = { name: 'Test' };

// ✅ Good: Explicit return types for functions
async function createDevice(dto: DeviceCreateDto): Promise<Device> {
  return this.deviceService.create(dto);
}
```

### Code Quality Rules

- **Strict Mode**: All TypeScript files must compile in strict mode
- **No `any` types**: Use proper type definitions
- **Explicit return types**: For all public methods and functions
- **Error handling**: Comprehensive error handling with proper types
- **Code comments**: JSDoc for all public APIs

### File Naming Conventions

```
# NestJS Controllers
users.controller.ts
device-management.controller.ts

# Services and Providers
user.service.ts
device-telemetry.service.ts

# DTOs and Entities
create-user.dto.ts
user.entity.ts

# React Components
UserDashboard.tsx
DeviceControlPanel.tsx

# Utility Files
date-helpers.ts
validation-utils.ts
```

### ESLint Configuration

Our ESLint configuration enforces:

- **Import organization**: Grouped and sorted imports
- **Unused variables**: No unused imports or variables
- **Consistent spacing**: 2-space indentation, no trailing spaces
- **Security rules**: No eval(), proper error handling
- **Performance rules**: Efficient patterns and practices

## 🔄 Development Workflow

### Branch Naming

```bash
# Feature branches
git checkout -b feature/user-device-assignments
git checkout -b feature/mqtt-telemetry-optimization

# Bug fixes
git checkout -b bugfix/authentication-token-refresh
git checkout -b bugfix/telemetry-data-validation

# Documentation
git checkout -b docs/api-endpoint-documentation
git checkout -b docs/deployment-guide-update
```

### Commit Messages

Follow conventional commits format:

```bash
# Feature commits
git commit -m "feat(devices): add device assignment functionality"
git commit -m "feat(api): implement JWT refresh token rotation"

# Bug fixes  
git commit -m "fix(auth): resolve token expiration edge case"
git commit -m "fix(mqtt): handle connection timeout gracefully"

# Documentation
git commit -m "docs(api): update endpoint documentation"
git commit -m "docs(readme): add deployment instructions"

# Performance improvements
git commit -m "perf(db): optimize telemetry query performance"
git commit -m "perf(api): reduce response payload size"
```

### Development Commands

```bash
# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Run Prettier
npm run typecheck         # TypeScript compilation check

# Testing
npm run test              # Run unit tests
npm run test:e2e          # Run end-to-end tests
npm run test:cov          # Run tests with coverage

# Database Operations
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run pending migrations
npm run db:studio         # Open database GUI

# Quality Gate (runs before commits)
npm run quality:check     # Comprehensive quality check
```

### Code Generation

Use our automated code generation tools:

```bash
# Generate NestJS module
./tools/generate-code.sh nestjs users

# Generate React component  
./tools/generate-code.sh react UserDashboard

# Generate Prisma model
./tools/generate-code.sh prisma DeviceSettings

# Generate test files
./tools/generate-code.sh test user.service
```

## 🧪 Testing Guidelines

### Test Structure

```
test/
├── unit/                    # Unit tests
│   ├── services/
│   ├── controllers/
│   └── utilities/
├── integration/             # Integration tests
│   ├── api/
│   ├── database/
│   └── mqtt/
├── e2e/                     # End-to-end tests
├── fixtures/                # Test data
└── helpers/                 # Test utilities
```

### Testing Standards

**Unit Tests**:
```typescript
describe('UserService', () => {
  let service: UserService;
  let mockPrisma: MockPrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should create user with proper validation', async () => {
    const userData = { email: 'test@example.com', role: 'USER' };
    mockPrisma.user.create.mockResolvedValue({ id: '1', ...userData });

    const result = await service.createUser(userData);
    
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
  });
});
```

**E2E Tests**:
```typescript
describe('DevicesController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await setupTestApp();
    authToken = await getAuthToken(app);
  });

  it('/devices (POST) should create device', () => {
    return request(app.getHttpServer())
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Device', deviceType: 'SENSOR' })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('Test Device');
      });
  });
});
```

### Test Coverage Requirements

- **Unit Tests**: Minimum 85% coverage for business logic
- **Integration Tests**: All API endpoints must have integration tests
- **E2E Tests**: Critical user workflows must have E2E coverage
- **Performance Tests**: Load testing for high-traffic endpoints

## 📚 Documentation Requirements

### Code Documentation

**JSDoc for Public APIs**:
```typescript
/**
 * Creates a new device with the specified configuration
 * 
 * @param createDeviceDto - Device creation parameters
 * @returns Promise resolving to the created device
 * @throws {BadRequestException} When validation fails
 * @throws {ForbiddenException} When user lacks permissions
 * 
 * @example
 * ```typescript
 * const device = await deviceService.create({
 *   name: 'Solar Pump 1',
 *   deviceType: 'SOLAR_PUMP',
 *   clientId: 'client-123'
 * });
 * ```
 */
async createDevice(createDeviceDto: CreateDeviceDto): Promise<Device> {
  // Implementation
}
```

**README Updates**:
- Update relevant README.md files when adding features
- Include usage examples and configuration options
- Document breaking changes clearly
- Provide migration guides for major changes

### Architecture Decision Records

For significant architectural decisions, create an ADR:

```bash
# Create new ADR
cp docs/adr/000-template.md docs/adr/015-new-caching-strategy.md

# Fill in:
# - Context and problem statement
# - Considered options
# - Decision outcome
# - Consequences and trade-offs
```

## 🔒 Security Guidelines

### Security Standards

- **Input Validation**: Validate and sanitize all user inputs
- **Authentication**: Use JWT with proper expiration and refresh logic
- **Authorization**: Implement role-based access control (RBAC)
- **Secrets Management**: Never commit secrets; use environment variables
- **SQL Injection**: Use parameterized queries (Prisma handles this)
- **XSS Protection**: Sanitize output and use Content Security Policy

### Security Checklist

Before submitting code:

- [ ] No hardcoded secrets or credentials
- [ ] Proper input validation with appropriate DTOs
- [ ] Authorization checks for protected resources
- [ ] Sensitive data properly encrypted or hashed
- [ ] Error messages don't leak sensitive information
- [ ] Rate limiting implemented for public endpoints
- [ ] HTTPS enforced in production configurations

### Example Security Implementation

```typescript
// ✅ Good: Proper input validation
@Post('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
  return this.userService.create(dto);
}

// ✅ Good: Password hashing
async hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// ❌ Avoid: Direct database queries without validation
async getUser(id: string) {
  return this.db.query(`SELECT * FROM users WHERE id = ${id}`);
}
```

## ⚡ Performance Standards

### Performance Requirements

- **API Response Time**: < 200ms for 95th percentile
- **Database Queries**: < 100ms for complex queries
- **Memory Usage**: < 512MB for API service under normal load
- **CPU Usage**: < 70% under peak load

### Performance Best Practices

```typescript
// ✅ Good: Efficient database queries
async getUserDevices(userId: string): Promise<Device[]> {
  return this.prisma.device.findMany({
    where: { 
      assignments: { some: { userId, isActive: true } }
    },
    select: { id: true, name: true, status: true }, // Only select needed fields
    take: 100, // Limit results
  });
}

// ✅ Good: Pagination for large datasets
@Get('telemetry')
async getTelemetry(
  @Query() pagination: PaginationDto
): Promise<PaginatedResponse<Telemetry>> {
  const { page = 1, limit = 50 } = pagination;
  const skip = (page - 1) * limit;
  
  return this.telemetryService.findPaginated({ skip, take: limit });
}

// ❌ Avoid: N+1 queries
// Use proper includes/joins instead of multiple queries
```

### Performance Testing

```bash
# Load testing with k6
npm run test:load

# Memory profiling
npm run profile:memory

# CPU profiling  
npm run profile:cpu

# Database query analysis
npm run db:analyze
```

## 🔄 Submission Process

### Pre-submission Checklist

Run the comprehensive quality check:

```bash
# This checks TypeScript, ESLint, tests, security, and build
./tools/quality-check.sh
```

Manual verification:

- [ ] All tests pass (`npm run test` and `npm run test:e2e`)
- [ ] Code follows style guidelines (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Documentation is updated
- [ ] Security guidelines followed
- [ ] Performance requirements met
- [ ] Breaking changes documented

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if applicable)
- [ ] Manual testing performed

## Security
- [ ] No sensitive data exposed
- [ ] Proper authentication/authorization implemented
- [ ] Input validation added
- [ ] Security best practices followed

## Performance
- [ ] Performance impact assessed
- [ ] Load testing performed (if applicable)
- [ ] Database queries optimized

## Documentation
- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)
- [ ] ADR created (if applicable)
```

### Review Process

1. **Automated Checks**: GitHub Actions runs quality gate
2. **Code Review**: At least one maintainer reviews code
3. **Security Review**: Security-sensitive changes get additional review
4. **Performance Review**: Changes affecting performance get load testing
5. **Documentation Review**: Ensure documentation is clear and complete

### Merge Requirements

- ✅ All automated checks pass
- ✅ At least one approving review from a maintainer
- ✅ All conversations resolved
- ✅ Branch is up to date with main
- ✅ No merge conflicts

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Celebrate contributions from all skill levels

### Getting Help

- **Technical Questions**: Create GitHub discussions
- **Bug Reports**: Use GitHub issues with proper templates
- **Feature Requests**: Create feature request issues
- **Security Issues**: Email security@lifebox.com privately

### Recognition

We value all contributions:
- Bug fixes and improvements
- Documentation updates
- Testing and quality improvements
- Performance optimizations
- Community support and mentoring

## 📞 Support

- **Development Setup**: [Development Guide](docs/development/SETUP.md)
- **API Documentation**: http://localhost:3000/api/docs
- **Architecture Docs**: [docs/architecture/](docs/architecture/)
- **Community**: [GitHub Discussions](https://github.com/lifebox/platform/discussions)

---

**Thank you for contributing to LifeBox IoT Platform! 🚀**

Together, we're building the future of industrial IoT solutions.