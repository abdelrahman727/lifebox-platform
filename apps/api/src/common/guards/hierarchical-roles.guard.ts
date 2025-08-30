import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../modules/database/prisma.service';

interface RoleHierarchy {
  [key: string]: {
    level: number;
    canAccessClients: 'all' | 'assigned' | 'own' | 'none';
    description: string;
  };
}

const ROLE_HIERARCHY: RoleHierarchy = {
  super_user: {
    level: 5,
    canAccessClients: 'all',
    description: 'Complete system access'
  },
  admin: {
    level: 4,
    canAccessClients: 'assigned',
    description: 'Administrative access to assigned clients'
  },
  client: {
    level: 3,
    canAccessClients: 'own',
    description: 'Organization client access'
  },
  operator: {
    level: 2,
    canAccessClients: 'own',
    description: 'Device operations within client scope'
  },
  viewer: {
    level: 1,
    canAccessClients: 'own',
    description: 'Read-only access'
  }
};

@Injectable()
export class HierarchicalRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const requiredPermissions = this.reflector.get<{resource: string, action: string}[]>(
      'permissions', 
      context.getHandler()
    );
    
    // If no role or permission requirements, allow access
    if (!requiredRoles && !requiredPermissions) {
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

    // Check role-based access
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

    // Check permission-based access
    if (requiredPermissions) {
      const userPermissions = await this.getUserPermissions(user.roleId);
      
      for (const permission of requiredPermissions) {
        const hasPermission = userPermissions.some(
          p => p.resource === permission.resource && p.action === permission.action
        );
        
        if (!hasPermission) {
          throw new ForbiddenException(
            `Missing permission: ${permission.action} on ${permission.resource}`
          );
        }
      }
    }

    // Check client scope access if clientId is in request
    const clientId = request.params?.clientId || request.body?.clientId || request.query?.clientId;
    if (clientId && !await this.canAccessClient(user, clientId)) {
      throw new ForbiddenException('Access denied to this client data');
    }

    return true;
  }

  private async getUserPermissions(roleId: string) {
    return await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { resource: true, action: true }
    });
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

  /**
   * Helper method to check if user has minimum role level
   */
  static hasMinimumRole(userRole: string, minimumRole: string): boolean {
    const userLevel = ROLE_HIERARCHY[userRole]?.level || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole]?.level || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Helper method to get all roles at or above a certain level
   */
  static getRolesAtOrAboveLevel(minimumRole: string): string[] {
    const requiredLevel = ROLE_HIERARCHY[minimumRole]?.level || 0;
    return Object.entries(ROLE_HIERARCHY)
      .filter(([_, config]) => config.level >= requiredLevel)
      .map(([role, _]) => role);
  }
}

// Export helper functions  
export { ROLE_HIERARCHY };