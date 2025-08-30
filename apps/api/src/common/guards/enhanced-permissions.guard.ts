import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../modules/database/prisma.service';
import { ROLE_HIERARCHY } from './hierarchical-roles.guard';

// Enhanced permission interface
export interface EnhancedPermission {
  resource: string;
  action: string;
  scope?: 'global' | 'client' | 'device';
  requireDeviceAccess?: boolean;
  requireCommandPermission?: string;
}

@Injectable()
export class EnhancedPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get enhanced permissions from decorator
    const enhancedPermissions = this.reflector.get<EnhancedPermission[]>(
      'enhancedPermissions',
      context.getHandler()
    );

    // Get regular roles from decorator
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    // If no enhanced permissions and no roles, allow access
    if (!enhancedPermissions && !requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      return false;
    }

    const userRole = user.role.name;
    const userRoleConfig = ROLE_HIERARCHY[userRole];

    if (!userRoleConfig) {
      throw new ForbiddenException(`Invalid role: ${userRole}`);
    }

    // Check regular role-based access first
    if (requiredRoles) {
      const hasValidRole = requiredRoles.some(requiredRole => {
        const requiredRoleConfig = ROLE_HIERARCHY[requiredRole];
        if (!requiredRoleConfig) return false;
        
        // User must have equal or higher level than required
        return userRoleConfig.level >= requiredRoleConfig.level;
      });

      if (!hasValidRole) {
        throw new ForbiddenException(
          `Insufficient role level. Required: ${requiredRoles.join(' or ')}, Current: ${userRole}`
        );
      }
    }

    // If no enhanced permissions, we're done with basic role check
    if (!enhancedPermissions) {
      return true;
    }

    // Check enhanced permissions
    for (const permission of enhancedPermissions) {
      const hasPermission = await this.checkEnhancedPermission(user, permission, request);
      
      if (!hasPermission) {
        throw new ForbiddenException(
          `Missing enhanced permission: ${permission.action} on ${permission.resource}`
        );
      }
    }

    return true;
  }

  private async checkEnhancedPermission(
    user: any,
    permission: EnhancedPermission,
    request: any
  ): Promise<boolean> {
    const { resource, action, scope, requireDeviceAccess, requireCommandPermission } = permission;

    // Extract relevant IDs from request
    const deviceId = request.params?.deviceId || request.body?.deviceId || request.query?.deviceId;
    const clientId = request.params?.clientId || request.body?.clientId || request.query?.clientId;

    // Super users have access to everything
    if (user.role.name === 'super_user') {
      return true;
    }

    // Check device-specific access if required
    if (requireDeviceAccess && deviceId) {
      const hasDeviceAccess = await this.checkDeviceAccess(user.id, deviceId);
      if (!hasDeviceAccess) {
        return false;
      }
    }

    // Check command permission if required
    if (requireCommandPermission) {
      const commandScope = this.determineCommandScope(scope, deviceId, clientId);
      const hasCommandPermission = await this.checkCommandPermission(
        user.id,
        requireCommandPermission,
        commandScope.scope,
        commandScope.scopeId
      );
      if (!hasCommandPermission) {
        return false;
      }
    }

    // Check regular permission based on scope
    return this.checkScopedPermission(user, resource, action, scope, clientId, deviceId);
  }

  private async checkDeviceAccess(userId: string, deviceId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) return false;

    // Super users and admins have access to all devices
    if (['super_user', 'admin'].includes(user.role.name)) {
      return true;
    }

    // Check if user has direct device assignment
    const deviceAssignment = await this.prisma.userDeviceAssignment.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });

    if (deviceAssignment && deviceAssignment.isActive) {
      return true;
    }

    // Check if user has access through client relationship
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) return false;

    // Users can access devices in their client
    if (user.clientId === device.clientId) {
      return true;
    }

    return false;
  }

  private async checkCommandPermission(
    userId: string,
    commandType: string,
    scope: string = 'global',
    scopeId?: string
  ): Promise<boolean> {
    const permission = await this.prisma.userCommandPermission.findFirst({
      where: {
        userId,
        isActive: true,
        commandPermission: {
          commandType,
          isActive: true,
        },
        scope,
        scopeId: scopeId || null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return !!permission;
  }

  private determineCommandScope(
    scope?: string,
    deviceId?: string,
    clientId?: string
  ): { scope: string; scopeId?: string } {
    if (scope === 'device' && deviceId) {
      return { scope: 'device', scopeId: deviceId };
    }
    
    if (scope === 'client' && clientId) {
      return { scope: 'client', scopeId: clientId };
    }
    
    return { scope: 'global' };
  }

  private async checkScopedPermission(
    user: any,
    resource: string,
    action: string,
    scope?: string,
    clientId?: string,
    deviceId?: string
  ): Promise<boolean> {
    // Get user's role permissions
    const userPermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: user.roleId },
      select: { resource: true, action: true }
    });

    // Check if user has the basic permission
    const hasBasicPermission = userPermissions.some(
      p => p.resource === resource && p.action === action
    );

    if (!hasBasicPermission) {
      return false;
    }

    // Apply scope-based restrictions
    if (scope === 'client' && clientId) {
      return this.canAccessClient(user, clientId);
    }

    if (scope === 'device' && deviceId) {
      return this.checkDeviceAccess(user.id, deviceId);
    }

    return true;
  }

  private async canAccessClient(user: any, clientId: string): Promise<boolean> {
    const userRole = user.role.name;
    const roleConfig = ROLE_HIERARCHY[userRole];

    switch (roleConfig.canAccessClients) {
      case 'all':
        return true; // Super users can access all clients
        
      case 'assigned':
        // Admins can access assigned clients (implement assignment logic as needed)
        // For now, allow all for admins - customize based on your assignment model
        return true;
        
      case 'own':
        // Users can only access their own client's data
        return user.clientId === clientId;
        
      case 'none':
        return false;
        
      default:
        return false;
    }
  }
}

// Decorator for enhanced permissions
export const EnhancedPermissions = Reflector.createDecorator<EnhancedPermission[]>();

// Convenience decorators
export const RequireDeviceAccess = () => 
  EnhancedPermissions([{ 
    resource: 'device', 
    action: 'read', 
    requireDeviceAccess: true 
  }]);

export const RequireCommandPermission = (commandType: string, scope?: 'global' | 'client' | 'device') =>
  EnhancedPermissions([{
    resource: 'command',
    action: 'execute',
    scope,
    requireCommandPermission: commandType
  }]);

export const RequireDeviceCommand = (commandType: string) =>
  EnhancedPermissions([{
    resource: 'device',
    action: 'command',
    scope: 'device',
    requireDeviceAccess: true,
    requireCommandPermission: commandType
  }]);