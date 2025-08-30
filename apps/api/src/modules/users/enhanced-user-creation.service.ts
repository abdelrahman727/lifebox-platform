import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface CreateUserWithCommandsDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  roleId: string;
  clientId?: string;
  commandPermissions?: string[]; // Array of command types
}

@Injectable()
export class EnhancedUserCreationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create user with role-specific restrictions and command permissions
   */
  async createUserWithCommands(
    creatorId: string,
    createUserDto: CreateUserWithCommandsDto,
  ) {
    // Get creator info
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!creator) {
      throw new BadRequestException('Creator not found');
    }

    // Get target role info
    const targetRole = await this.prisma.role.findUnique({
      where: { id: createUserDto.roleId },
    });

    if (!targetRole) {
      throw new BadRequestException('Invalid role specified');
    }

    // Apply role-specific creation restrictions
    await this.validateUserCreationPermissions(creator, targetRole.name, createUserDto.clientId);

    // Create the user
    const newUser = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash: createUserDto.password, // Should be hashed
        fullName: createUserDto.fullName,
        phone: createUserDto.phone,
        roleId: createUserDto.roleId,
        clientId: createUserDto.clientId,
        isActive: true,
      },
    });

    // Grant specific command permissions if provided
    if (createUserDto.commandPermissions && createUserDto.commandPermissions.length > 0) {
      await this.grantCommandPermissionsToUser(
        creatorId,
        newUser.id,
        createUserDto.commandPermissions,
        createUserDto.clientId,
      );
    }

    return newUser;
  }

  /**
   * Validate user creation permissions based on creator role
   */
  private async validateUserCreationPermissions(
    creator: any,
    targetRoleName: string,
    clientId?: string,
  ) {
    const creatorRoleName = creator.role.name;

    switch (creatorRoleName) {
      case 'super_user':
      case 'super_admin':
        // Can create any user type
        return;

      case 'admin':
        // Can create any user type in assigned organizations
        if (!clientId) {
          throw new BadRequestException('Admin must specify client when creating users');
        }
        // TODO: Add check for admin's assigned clients
        return;

      case 'client':
        // Can ONLY create operators and viewers
        if (!['operator', 'viewer'].includes(targetRoleName)) {
          throw new ForbiddenException(
            'Clients can only create operators and viewers, not other clients or higher roles'
          );
        }
        
        // Must be in their own organization
        if (clientId !== creator.clientId) {
          throw new ForbiddenException('Clients can only create users in their own organization');
        }
        return;

      case 'operator':
      case 'viewer':
        // Cannot create any users
        throw new ForbiddenException('Operators and viewers cannot create other users');

      default:
        throw new ForbiddenException('Unknown role - cannot create users');
    }
  }

  /**
   * Grant command permissions to a newly created user
   */
  private async grantCommandPermissionsToUser(
    granterId: string,
    userId: string,
    commandPermissions: string[],
    clientId?: string,
  ) {
    const permissions = [];

    for (const commandType of commandPermissions) {
      // Verify granter has this command permission
      const granterHasPermission = await this.checkCreatorHasCommand(granterId, commandType);
      
      if (granterHasPermission) {
        permissions.push({
          userId,
          commandType,
          scope: clientId ? 'client' : 'global',
          scopeId: clientId,
          grantedBy: granterId,
          isActive: true,
        });
      }
    }

    if (permissions.length > 0) {
      await this.prisma.userCommandPermission.createMany({
        data: permissions,
      });
    }
  }

  /**
   * Check if creator has a specific command permission
   */
  private async checkCreatorHasCommand(creatorId: string, commandType: string): Promise<boolean> {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!creator) return false;

    // Check role permissions
    const hasRolePermission = creator.role.permissions.some(
      (p) => p.resource === 'commands' && p.action === commandType,
    );

    if (hasRolePermission) return true;

    // Check individual permissions
    const hasIndividualPermission = await this.prisma.userCommandPermission.findFirst({
      where: {
        userId: creatorId,
        commandPermission: {
          commandType,
        },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return !!hasIndividualPermission;
  }

  /**
   * Get available roles that a creator can assign
   */
  async getAvailableRolesForCreator(creatorId: string): Promise<any[]> {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        role: true,
      },
    });

    if (!creator) return [];

    const allRoles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    switch (creator.role.name) {
      case 'super_user':
      case 'super_admin':
        return allRoles; // Can create any role

      case 'admin':
        return allRoles.filter((r) => !['super_user', 'super_admin'].includes(r.name));

      case 'client':
        return allRoles.filter((r) => ['operator', 'viewer'].includes(r.name));

      default:
        return []; // Operators and viewers cannot create users
    }
  }

  /**
   * Get available commands that a creator can delegate
   */
  async getAvailableCommandsForCreator(creatorId: string): Promise<string[]> {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!creator) return [];

    // Get role-based commands
    const roleCommands = creator.role.permissions
      .filter((p) => p.resource === 'commands' && p.action !== 'delegate')
      .map((p) => p.action);

    // Get individually granted commands
    const individualCommands = await this.prisma.userCommandPermission.findMany({
      where: {
        userId: creatorId,
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

    const individualCommandTypes = individualCommands.map((c) => c.commandPermission.commandType);

    // Combine and deduplicate
    return [...new Set([...roleCommands, ...individualCommandTypes])];
  }
}