# LifeBox IoT Platform - Claude Documentation

This directory contains comprehensive technical documentation for the LifeBox IoT Platform, organized for Claude Code development assistance.

## 📁 Documentation Structure

```
.claude/
├── README.md                    # This file - navigation guide
├── settings.local.json         # Claude Code settings
└── doc/                        # Technical documentation by domain
    ├── architecture/           # System architecture and design
    │   └── SYSTEM_OVERVIEW.md  # High-level system design
    ├── api/                    # API documentation
    │   └── API_MODULES_REFERENCE.md  # Complete API reference
    ├── database/               # Database architecture
    │   └── DATABASE_ARCHITECTURE.md  # Schema and optimization
    ├── frontend/               # Frontend development guides
    │   └── frontend-roadmap.md # Implementation roadmap
    └── deployment/             # Deployment and infrastructure
        ├── DEVELOPMENT_SETUP.md      # Development environment
        └── NESTJS_MONOREPO_ISSUES.md # Monorepo troubleshooting
```

## 🎯 Quick References

### **For Development Setup**
- **Main Guide**: [Quick Start in CLAUDE.md](../CLAUDE.md#-quick-start)
- **Detailed Setup**: [doc/deployment/DEVELOPMENT_SETUP.md](doc/deployment/DEVELOPMENT_SETUP.md)
- **Troubleshooting**: [doc/deployment/NESTJS_MONOREPO_ISSUES.md](doc/deployment/NESTJS_MONOREPO_ISSUES.md)

### **For Frontend Development**
- **Implementation Guide**: [doc/frontend/frontend-roadmap.md](doc/frontend/frontend-roadmap.md)
- **API Reference**: [doc/api/API_MODULES_REFERENCE.md](doc/api/API_MODULES_REFERENCE.md)
- **Backend Status**: All APIs ready for integration

### **For Architecture Understanding**
- **System Overview**: [doc/architecture/SYSTEM_OVERVIEW.md](doc/architecture/SYSTEM_OVERVIEW.md)
- **Database Design**: [doc/database/DATABASE_ARCHITECTURE.md](doc/database/DATABASE_ARCHITECTURE.md)

## 🚀 Current Development Status

**Platform Completion**: ✅ **99% ENTERPRISE-READY**

| Component | Status | Description |
|-----------|---------|-------------|
| **Backend APIs** | ✅ 100% Complete | 250+ endpoints, production-ready |
| **Database** | ✅ 100% Complete | 30+ models, TimescaleDB optimized |
| **MQTT Service** | ✅ 100% Complete | Real-time telemetry processing |
| **WebSocket Gateway** | ✅ 100% Complete | Live updates ready |
| **CI/CD Pipeline** | ✅ 100% Complete | Comprehensive automation |
| **DevOps Infrastructure** | ✅ 100% Complete | Production deployment ready |
| **Security & RBAC** | ✅ 100% Complete | Enterprise-grade security |
| **Payment System** | ✅ 100% Complete | Fawry gateway integration |
| **Documentation** | ✅ 100% Complete | Comprehensive guides and ADRs |
| **Frontend Foundation** | ⚠️ Foundation Ready | Next.js 14 + component library |
| **Frontend Dashboards** | ❌ **PENDING** | **Final milestone for 100% completion** |

## 🎯 Next Priority: Frontend Implementation

**Estimated Timeline**: 2-3 weeks  
**Implementation Guide**: [doc/frontend/frontend-roadmap.md](doc/frontend/frontend-roadmap.md)

### **Ready for Development**
- ✅ All backend APIs documented and tested
- ✅ WebSocket gateway configured for real-time updates  
- ✅ Authentication system ready for JWT integration
- ✅ Component library (Shadcn/ui) configured
- ✅ Development environment with hot reload and debugging

### **Required Implementation**
1. **Authentication Integration** - JWT token management and route protection
2. **Role-specific Dashboards** - 5 user types (Super User, Admin, Client, Operator, Viewer)
3. **Real-time Features** - WebSocket integration for live telemetry and alarms
4. **Device Management** - Control panels and monitoring interfaces
5. **Alarm Management** - Real-time notifications and acknowledgment system

## 📞 Development Support

### **Essential Commands**
```bash
# Start development environment
npm run dev                    # All services
npm run dev:api               # Backend API only
npm run dev:web               # Frontend only

# Health checks
curl http://localhost:3000/api/v1/health
npm run db:studio            # Database GUI

# Quality assurance
./tools/quality-check.sh     # Comprehensive quality check
./tools/generate-code.sh     # Code generation utilities
```

### **API Resources**
- **Interactive Documentation**: http://localhost:3000/api/docs
- **Complete API Reference**: [doc/api/API_MODULES_REFERENCE.md](doc/api/API_MODULES_REFERENCE.md)
- **WebSocket Events**: Documented in backend service

### **Development Environment**
- **VS Code Workspace**: `code lifebox-platform.code-workspace`
- **DevContainers**: Full containerized development environment
- **Code Generation**: Automated scaffolding for components and modules

---

**The LifeBox IoT Platform is enterprise-ready and awaiting final frontend implementation! 🚀**