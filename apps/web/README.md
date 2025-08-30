# LifeBox Web Application

**Next.js 14 Frontend for the LifeBox IoT Platform**

[![Build Status](https://img.shields.io/badge/build-ready-blue.svg)](../../.github/workflows/quality-gate.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue.svg)](https://tailwindcss.com/)

## 📋 Overview

The LifeBox Web Application is a modern React-based frontend built with Next.js 14, providing role-specific dashboards for IoT device management, real-time monitoring, and system administration.

### Current Status: **Basic Setup** ⚠️ 

**Completion**: 5% - Component library setup only  
**Missing**: Role-specific dashboards, authentication integration, real-time updates

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: React hooks + Context API (planned)
- **Real-time**: Socket.IO client integration (planned)
- **Authentication**: JWT integration (planned)

## 🚀 Quick Start

### Development Setup

```bash
# Install dependencies (from project root)
npm run install:all

# Start API service first
npm run dev:api

# Start web application
npm run dev:web

# Web app will be available at http://localhost:3001
```

### Standalone Development

```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev -- --port 3001
```

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Demo dashboard
│   │   ├── globals.css          # Global styles
│   │   └── [future routes]/     # Role-specific dashboards
│   ├── components/
│   │   └── ui/                  # Shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── [other components]
│   └── lib/
│       └── utils.ts             # Utility functions
├── public/                      # Static assets
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
├── components.json             # Shadcn/ui configuration
├── package.json
└── README.md                   # This file
```

## 🎨 Component Library

### Available Components

The project includes a comprehensive component library based on Shadcn/ui:

```typescript
// Button component with variants
<Button variant="default" size="md">
  Click me
</Button>

// Card component for content
<Card>
  <CardHeader>
    <CardTitle>Dashboard Card</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>

// Form components
<Form>
  <FormField>
    <FormLabel>Email</FormLabel>
    <FormControl>
      <Input type="email" placeholder="user@example.com" />
    </FormControl>
  </FormField>
</Form>
```

### Theming

The application uses a modern design system with:

- **Color Palette**: Carefully crafted for IoT dashboards
- **Typography**: Optimized for data-heavy interfaces  
- **Spacing**: Consistent spacing scale
- **Components**: Accessible and responsive by default

## 📱 Planned Dashboards

### Role-Specific Interfaces

| Role | Dashboard Features | Status |
|------|-------------------|--------|
| **Super User** | Platform analytics, system health, user management | 📋 Planned |
| **Admin** | Organization management, user assignments, billing | 📋 Planned |
| **Client** | Device overview, alarms, reports, settings | 📋 Planned |
| **Operator** | Device control, telemetry monitoring, diagnostics | 📋 Planned |
| **Viewer** | Read-only device status, historical data | 📋 Planned |

### Key Features (Planned)

- **🏠 Dashboard Overview**: Role-specific KPI cards and charts
- **📊 Device Management**: Device list, details, control panels
- **📈 Real-time Monitoring**: Live telemetry charts and gauges
- **🚨 Alarm Management**: Alarm list, acknowledgment, escalation
- **📱 Notifications**: In-app notifications and alerts
- **👥 User Management**: User assignments and permissions
- **💰 Billing**: Credit monitoring, payment history
- **📊 Reports**: Analytics, sustainability metrics, exports

## 🔧 Configuration

### Environment Variables

```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Application Configuration
NEXT_PUBLIC_APP_NAME=LifeBox IoT Platform
NEXT_PUBLIC_APP_VERSION=2.1.0

# Development
NODE_ENV=development
```

## 🎯 Development Roadmap

### Phase 1: Authentication & Layout ⏳
- [ ] JWT authentication integration
- [ ] Protected route system
- [ ] Role-based navigation
- [ ] Responsive layout structure

### Phase 2: Core Dashboards 📋
- [ ] Super User dashboard with platform analytics
- [ ] Admin dashboard with organization management
- [ ] Client dashboard with device overview
- [ ] Device management interfaces

### Phase 3: Real-time Features 🔄
- [ ] WebSocket integration for live updates
- [ ] Real-time telemetry charts
- [ ] Live alarm notifications
- [ ] Device status indicators

### Phase 4: Advanced Features ⚡
- [ ] Interactive device control panels
- [ ] Advanced analytics and reporting
- [ ] Mobile-responsive optimizations
- [ ] Progressive Web App features

## 📞 Backend Dependencies

### Ready API Endpoints

The LifeBox API provides **100% of required endpoints**:

- ✅ **Authentication**: Login, refresh, logout, password reset
- ✅ **User Management**: CRUD, assignments, permissions
- ✅ **Device Management**: Full lifecycle, commands, telemetry
- ✅ **Real-time Data**: WebSocket gateway ready
- ✅ **Alarm System**: Two-tier alarms with reactions
- ✅ **Notifications**: Multi-channel delivery
- ✅ **Payment**: Fawry integration complete
- ✅ **Reports**: Analytics and sustainability metrics

### API Documentation

Complete API documentation available at:
- **Swagger**: http://localhost:3000/api/docs
- **Documentation**: [API Reference](../api/README.md)

---

**Ready for implementation with complete backend API support! 🚀**
