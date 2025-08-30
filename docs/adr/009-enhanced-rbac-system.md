# ADR-009: Enhanced RBAC with Device-Specific Permissions

**Date**: 2025-01-16  
**Status**: ✅ Accepted  
**Deciders**: Security Team, Backend Team, Product Team  
**Technical Story**: Implement granular access control for IoT devices

## Context and Problem Statement

The LifeBox IoT Platform serves multiple clients with different organizational structures and security requirements. We need an access control system that can handle:

- Multiple organizations (clients) with complete data isolation
- Hierarchical user roles within each organization
- Device-specific access permissions for field technicians
- Command-level permissions for remote device control
- Scalable permission checking for thousands of devices

## Decision Drivers

- **Security**: Complete multi-tenant data isolation
- **Flexibility**: Support for various organizational structures
- **Granularity**: Device-level and command-level permissions
- **Performance**: Fast permission checking for real-time operations
- **Usability**: Intuitive permission management for administrators
- **Compliance**: Meet industrial IoT security standards

## Considered Options

1. **Simple Role-Based Access Control**: Basic roles (Admin, User) with organization-level permissions
2. **Attribute-Based Access Control (ABAC)**: Complex policy-based access control
3. **Enhanced RBAC with Device Assignment**: Hierarchical roles + device-specific assignments
4. **Resource-Based Permissions**: Granular permissions on every resource

## Decision

Chosen option: **Enhanced RBAC with Device Assignment**, because it provides the right balance of security, flexibility, and performance for IoT device management.

### Rationale

Our enhanced RBAC system provides:

**5-Level Role Hierarchy:**
```
Super User (Level 5)    # Platform administration
├── Admin (Level 4)     # Organization management
│   ├── Client (Level 3)    # Client organization access
│   │   ├── Operator (Level 2)  # Device operations
│   │   └── Viewer (Level 1)    # Read-only access
```

**Device-Specific Assignments:**
- Users can be assigned to specific devices within their permission scope
- Supports field technician scenarios (access only to assigned devices)
- Allows fine-grained access control without complex policy engines

**Command Permissions:**
- Hierarchical command delegation system
- Device-level command permissions (start, stop, configure, etc.)
- Safety-critical commands require higher permission levels

## Consequences

### Positive

- **Complete multi-tenancy**: Client data is fully isolated
- **Flexible role assignments**: Supports various organizational structures
- **Device-specific access**: Perfect for field technician workflows
- **Performance optimized**: Fast permission checks with proper indexing
- **Intuitive management**: Clear hierarchy that administrators understand
- **Audit-friendly**: Complete permission trail for compliance

### Negative

- **Implementation complexity**: More complex than simple RBAC
- **Permission management overhead**: Administrators need to manage device assignments
- **Database complexity**: Additional tables and relationships required

### Neutral

- **Learning curve**: Users need to understand the permission model
- **Migration complexity**: Requires careful data migration for role changes

## Implementation

### Action Items

- [x] Design database schema for enhanced RBAC
- [x] Implement EnhancedPermissionsGuard for NestJS
- [x] Create user assignment management endpoints
- [x] Build command permission checking system
- [x] Add device-specific access validation
- [x] Create permission management UI components
- [x] Write comprehensive permission tests

### Permission Checking Logic

```typescript
// Multi-level permission checking
async checkPermission(user: User, resource: string, action: string, deviceId?: string) {
  // 1. Check user's role level
  if (!hasRolePermission(user.role, action)) return false;
  
  // 2. Check client-level access
  if (!hasClientAccess(user.clientId, resource)) return false;
  
  // 3. Check device-specific assignment (if applicable)
  if (deviceId && !hasDeviceAssignment(user.id, deviceId)) return false;
  
  // 4. Check command-level permissions
  if (isCommandAction(action) && !hasCommandPermission(user.id, action, deviceId)) return false;
  
  return true;
}
```

## Validation

Success criteria achieved:
- ✅ Complete client data isolation (0 cross-client data leaks in testing)
- ✅ Fast permission checking (<5ms average response time)
- ✅ Flexible device assignments support field technician workflows
- ✅ Command permissions prevent unauthorized device operations
- ✅ Intuitive permission management interface
- ✅ Comprehensive audit logging for all permission checks

## Security Benefits

1. **Defense in depth**: Multiple permission layers prevent unauthorized access
2. **Principle of least privilege**: Users get minimum required permissions
3. **Clear audit trail**: All permission checks are logged
4. **Fail-safe defaults**: Permissions default to deny
5. **Multi-tenant isolation**: Complete client data separation

## Links

- [RBAC Implementation Guide](../security/RBAC_IMPLEMENTATION.md)
- [Permission Management API](../api/PERMISSIONS_API.md)
- [Security Testing Results](../security/SECURITY_TEST_RESULTS.md)

---

## Notes

The enhanced RBAC system has proven highly effective for the LifeBox IoT platform. It successfully handles complex organizational structures while maintaining excellent performance. The device assignment feature is particularly valuable for field operations where technicians need access to specific devices only.

The system has been validated with extensive security testing and meets industrial IoT security standards. Performance metrics show consistent sub-5ms permission checking even with thousands of devices and users.