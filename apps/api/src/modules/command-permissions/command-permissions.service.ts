import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateCommandPermissionDto,
  UpdateCommandPermissionDto,
  GrantCommandPermissionDto,
  BulkGrantCommandPermissionDto,
  UpdateUserCommandPermissionDto,
  CommandPermissionQueryDto,
  UserCommandPermissionQueryDto,
  CommandScope
} from './dto/command-permission.dto';

@Injectable()
export class CommandPermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new command permission (Super Users only)
   */
  async createCommandPermission(
    createDto: CreateCommandPermissionDto,
    creatorId: string
  ) {
    // Verify creator is Super User
    await this.validateSuperUserPermission(creatorId);

    // Check if command type already exists
    const existingCommand = await this.prisma.commandPermission.findUnique({
      where: { commandType: createDto.commandType },
    });

    if (existingCommand) {
      throw new BadRequestException(`Command type '${createDto.commandType}' already exists`);
    }

    return this.prisma.commandPermission.create({
      data: createDto,
    });
  }

  /**
   * Get all command permissions with filtering
   */
  async getCommandPermissions(query: CommandPermissionQueryDto, requesterId: string) {
    const { commandType, category, isSystemLevel, isClientLevel, isActive, limit, offset } = query;

    // Verify requester has permission to view command permissions
    await this.validateCommandViewPermission(requesterId);

    const where: any = {};

    // Apply filters
    if (commandType) where.commandType = { contains: commandType, mode: 'insensitive' };
    if (category) where.category = category;
    if (typeof isSystemLevel === 'boolean') where.isSystemLevel = isSystemLevel;
    if (typeof isClientLevel === 'boolean') where.isClientLevel = isClientLevel;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [commands, total] = await Promise.all([
      this.prisma.commandPermission.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      this.prisma.commandPermission.count({ where }),
    ]);

    return {
      commands,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a command permission (Super Users only)
   */
  async updateCommandPermission(
    commandId: string,
    updateDto: UpdateCommandPermissionDto,
    requesterId: string
  ) {
    // Verify requester is Super User
    await this.validateSuperUserPermission(requesterId);

    const command = await this.prisma.commandPermission.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      throw new NotFoundException('Command permission not found');
    }

    return this.prisma.commandPermission.update({
      where: { id: commandId },
      data: updateDto,
    });
  }

  /**
   * Delete a command permission (Super Users only)
   */
  async deleteCommandPermission(commandId: string, requesterId: string) {
    // Verify requester is Super User
    await this.validateSuperUserPermission(requesterId);

    const command = await this.prisma.commandPermission.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      throw new NotFoundException('Command permission not found');
    }

    // Soft delete by setting isActive to false
    return this.prisma.commandPermission.update({
      where: { id: commandId },
      data: { isActive: false },
    });
  }

  /**
   * Grant command permission to a user (hierarchical delegation)
   */
  async grantCommandPermission(
    grantDto: GrantCommandPermissionDto,
    granterId: string
  ) {
    const { userId, commandPermissionId, scope, scopeId, canDelegate, expiresAt } = grantDto;

    // Validate the granter has permission to grant this command
    await this.validateGrantPermission(granterId, commandPermissionId, scope, scopeId);

    // Verify target user exists and is within granter's scope
    await this.validateTargetUser(granterId, userId, scope, scopeId);

    // Check if permission already exists
    const existingPermission = await this.prisma.userCommandPermission.findUnique({
      where: {
        userId_commandPermissionId_scope_scopeId: {
          userId,
          commandPermissionId,
          scope: scope || CommandScope.GLOBAL,
          scopeId: scopeId || null,
        },
      },
    });

    if (existingPermission) {
      if (existingPermission.isActive) {
        throw new BadRequestException('User already has this command permission for the specified scope');
      } else {
        // Reactivate existing permission
        return this.prisma.userCommandPermission.update({
          where: { id: existingPermission.id },
          data: {
            isActive: true,
            grantedBy: granterId,
            grantedAt: new Date(),
            canDelegate: canDelegate || false,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            updatedAt: new Date(),
          },
          include: this.getUserCommandPermissionIncludes(),
        });
      }
    }

    // Create new permission
    return this.prisma.userCommandPermission.create({
      data: {
        userId,
        commandPermissionId,
        grantedBy: granterId,
        scope: scope || CommandScope.GLOBAL,
        scopeId: scopeId || null,
        canDelegate: canDelegate || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: this.getUserCommandPermissionIncludes(),
    });
  }

  /**
   * Grant command permissions in bulk
   */
  async grantBulkCommandPermissions(
    bulkGrantDto: BulkGrantCommandPermissionDto,
    granterId: string
  ) {
    const { userIds, commandPermissionIds, scope, scopeId, canDelegate } = bulkGrantDto;
    const permissions = [];
    const errors = [];

    // Validate all combinations first
    for (const userId of userIds) {
      for (const commandPermissionId of commandPermissionIds) {
        try {
          await this.validateGrantPermission(granterId, commandPermissionId, scope, scopeId);
          await this.validateTargetUser(granterId, userId, scope, scopeId);
        } catch (error) {
          errors.push({
            userId,
            commandPermissionId,
            error: error.message,
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Some permissions failed validation',
        errors,
      });
    }

    // Grant permissions
    for (const userId of userIds) {
      for (const commandPermissionId of commandPermissionIds) {
        try {
          const permission = await this.grantCommandPermission(
            {
              userId,
              commandPermissionId,
              scope,
              scopeId,
              canDelegate,
            },
            granterId
          );
          permissions.push(permission);
        } catch (error) {
          // Skip if already exists, add to errors otherwise
          if (!error.message.includes('already has this command permission')) {
            errors.push({
              userId,
              commandPermissionId,
              error: error.message,
            });
          }
        }
      }
    }

    return {
      permissions,
      errors,
      summary: {
        successful: permissions.length,
        failed: errors.length,
        total: userIds.length * commandPermissionIds.length,
      },
    };
  }

  /**
   * Get user command permissions with filtering
   */
  async getUserCommandPermissions(query: UserCommandPermissionQueryDto, requesterId: string) {
    const { userId, commandPermissionId, scope, scopeId, isActive, canDelegate, limit, offset } = query;

    // Build where clause with access control
    const where: any = {};

    // Apply filters
    if (userId) where.userId = userId;
    if (commandPermissionId) where.commandPermissionId = commandPermissionId;
    if (scope) where.scope = scope;
    if (scopeId) where.scopeId = scopeId;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (typeof canDelegate === 'boolean') where.canDelegate = canDelegate;

    // Apply access control based on requester permissions
    await this.applyAccessControl(where, requesterId);

    const [permissions, total] = await Promise.all([
      this.prisma.userCommandPermission.findMany({
        where,
        include: this.getUserCommandPermissionIncludes(),
        take: limit,
        skip: offset,
        orderBy: { grantedAt: 'desc' },
      }),
      this.prisma.userCommandPermission.count({ where }),
    ]);

    return {
      permissions,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user command permission
   */
  async updateUserCommandPermission(
    permissionId: string,
    updateDto: UpdateUserCommandPermissionDto,
    requesterId: string
  ) {
    const permission = await this.prisma.userCommandPermission.findUnique({
      where: { id: permissionId },
      include: {
        commandPermission: true,
        user: true,
      },
    });

    if (!permission) {
      throw new NotFoundException('User command permission not found');
    }

    // Verify requester has permission to update this
    await this.validateUpdatePermission(requesterId, permission);

    return this.prisma.userCommandPermission.update({
      where: { id: permissionId },
      data: {
        ...updateDto,
        expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined,
        updatedAt: new Date(),
      },
      include: this.getUserCommandPermissionIncludes(),
    });
  }

  /**
   * Revoke user command permission
   */
  async revokeUserCommandPermission(permissionId: string, requesterId: string) {
    const permission = await this.prisma.userCommandPermission.findUnique({
      where: { id: permissionId },
      include: {
        commandPermission: true,
        user: true,
      },
    });

    if (!permission) {
      throw new NotFoundException('User command permission not found');
    }

    // Verify requester has permission to revoke this
    await this.validateUpdatePermission(requesterId, permission);

    return this.prisma.userCommandPermission.update({
      where: { id: permissionId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get commands available to a specific user
   */
  async getUserAvailableCommands(userId: string, requesterId: string) {
    // Verify requester has permission to view this user's commands
    await this.validateUserCommandViewPermission(requesterId, userId);

    const permissions = await this.prisma.userCommandPermission.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        commandPermission: true,
      },
    });

    return permissions
      .filter(p => p.commandPermission)
      .map(p => ({
        ...p.commandPermission,
        scope: p.scope,
        scopeId: p.scopeId,
        canDelegate: p.canDelegate,
        expiresAt: p.expiresAt,
      }));
  }

  /**
   * Check if a user has a specific command permission
   */
  async checkUserCommandPermission(
    userId: string,
    commandType: string,
    scope?: CommandScope,
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
        scope: scope || CommandScope.GLOBAL,
        scopeId: scopeId || null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return !!permission;
  }

  /**
   * Get commands that a user can delegate to others
   */
  async getUserDelegatableCommands(userId: string, requesterId: string) {
    // Verify requester has permission to view this
    await this.validateUserCommandViewPermission(requesterId, userId);

    const permissions = await this.prisma.userCommandPermission.findMany({
      where: {
        userId,
        isActive: true,
        canDelegate: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        commandPermission: true,
      },
    });

    return permissions
      .filter(p => p.commandPermission)
      .map(p => ({
        ...p.commandPermission,
        scope: p.scope,
        scopeId: p.scopeId,
        grantedAt: p.grantedAt,
      }));
  }

  // Private helper methods

  private async validateSuperUserPermission(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role.name !== 'super_user') {
      throw new ForbiddenException('Only Super Users can manage command permissions');
    }
  }

  private async validateCommandViewPermission(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super Users and Admins can view command permissions
    if (!['super_user', 'admin'].includes(user.role.name)) {
      throw new ForbiddenException('Insufficient permissions to view command permissions');
    }
  }

  private async validateGrantPermission(
    granterId: string,
    commandPermissionId: string,
    scope?: CommandScope,
    scopeId?: string
  ) {
    const [granter, commandPermission] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: granterId },
        include: { role: true },
      }),
      this.prisma.commandPermission.findUnique({
        where: { id: commandPermissionId },
      }),
    ]);

    if (!granter) throw new NotFoundException('Granter not found');
    if (!commandPermission) throw new NotFoundException('Command permission not found');

    // Super Users can grant any command to anyone
    if (granter.role.name === 'super_user') return;

    // Admins and Clients must have the command permission with delegation rights
    const granterPermission = await this.prisma.userCommandPermission.findFirst({
      where: {
        userId: granterId,
        commandPermissionId,
        isActive: true,
        canDelegate: true,
        scope: scope || CommandScope.GLOBAL,
        scopeId: scopeId || null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!granterPermission) {
      throw new ForbiddenException(
        'You do not have delegation rights for this command in the specified scope'
      );
    }
  }

  private async validateTargetUser(
    granterId: string,
    targetUserId: string,
    scope?: CommandScope,
    scopeId?: string
  ) {
    const [granter, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: granterId },
        include: { role: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { role: true },
      }),
    ]);

    if (!granter) throw new NotFoundException('Granter not found');
    if (!targetUser) throw new NotFoundException('Target user not found');

    // Super Users can grant to anyone
    if (granter.role.name === 'super_user') return;

    // Scope-based validation
    if (scope === CommandScope.CLIENT) {
      // Must be granting within the same client or granter's assigned clients
      if (granter.role.name === 'admin') {
        // Admins can grant within their scope (implement admin-client assignment logic)
        return;
      } else if (granter.role.name === 'client' && targetUser.clientId === granter.clientId) {
        return;
      }
    } else if (scope === CommandScope.DEVICE) {
      // Device-specific grants need additional validation
      if (scopeId) {
        const device = await this.prisma.device.findUnique({
          where: { id: scopeId },
        });

        if (!device) {
          throw new NotFoundException('Scope device not found');
        }

        // Both users must have access to the device's client
        if (granter.role.name === 'client' && device.clientId !== granter.clientId) {
          throw new ForbiddenException('Cannot grant device-specific commands outside your client scope');
        }
      }
    }

    // Default: users can only grant within their organization
    if (granter.role.name === 'client' && targetUser.clientId !== granter.clientId) {
      throw new ForbiddenException('Cannot grant commands to users outside your organization');
    }
  }

  private async validateUpdatePermission(requesterId: string, permission: any) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: { role: true },
    });

    if (!requester) throw new NotFoundException('Requester not found');

    // Super Users can modify any permission
    if (requester.role.name === 'super_user') return;

    // Admins can modify permissions they granted or within their scope
    if (requester.role.name === 'admin' && permission.grantedBy === requesterId) return;

    // Clients can modify permissions they granted within their scope
    if (requester.role.name === 'client' && 
        permission.grantedBy === requesterId && 
        permission.user.clientId === requester.clientId) return;

    throw new ForbiddenException('You do not have permission to modify this command permission');
  }

  private async validateUserCommandViewPermission(requesterId: string, targetUserId: string) {
    const [requester, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requesterId },
        include: { role: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { role: true },
      }),
    ]);

    if (!requester) throw new NotFoundException('Requester not found');
    if (!targetUser) throw new NotFoundException('Target user not found');

    // Super Users and Admins can view any user's commands
    if (['super_user', 'admin'].includes(requester.role.name)) return;

    // Users can view their own commands
    if (requesterId === targetUserId) return;

    // Clients can view commands for users in their organization
    if (requester.role.name === 'client' && targetUser.clientId === requester.clientId) return;

    throw new ForbiddenException('You do not have permission to view this user\'s command permissions');
  }

  private async applyAccessControl(where: any, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: { role: true },
    });

    if (!requester) throw new NotFoundException('Requester not found');

    // Super Users and Admins can see all permissions
    if (['super_user', 'admin'].includes(requester.role.name)) return;

    // Non-admin users can only see permissions for their client's users
    where.user = {
      clientId: requester.clientId,
    };
  }

  private getUserCommandPermissionIncludes() {
    return {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: { select: { name: true } },
        },
      },
      commandPermission: true,
      grantedByUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    };
  }
}