import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { 
  CreateDeviceAssignmentDto, 
  BulkCreateDeviceAssignmentDto,
  UpdateDeviceAssignmentDto, 
  DeviceAssignmentQueryDto 
} from './dto/user-assignment.dto';

@Injectable()
export class UserAssignmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a device assignment for a user
   * Super Users can assign any user to any device
   * Admins can assign users to devices within their assigned clients
   * Clients can assign users to their own devices
   */
  async createDeviceAssignment(
    createDto: CreateDeviceAssignmentDto,
    assignerId: string
  ) {
    const { userId, deviceId } = createDto;

    // Verify the assigner has permission to make this assignment
    await this.validateAssignmentPermission(assignerId, userId, deviceId);

    // Check if assignment already exists
    const existingAssignment = await this.prisma.userDeviceAssignment.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });

    if (existingAssignment) {
      if (existingAssignment.isActive) {
        throw new BadRequestException('User is already assigned to this device');
      } else {
        // Reactivate existing assignment
        return this.prisma.userDeviceAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            isActive: true,
            assignedBy: assignerId,
            assignedAt: new Date(),
            updatedAt: new Date(),
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: { select: { name: true } },
              },
            },
            device: {
              select: {
                id: true,
                deviceName: true,
                deviceCode: true,
                lifeboxCode: true,
                client: {
                  select: {
                    name: true,
                    organizationName: true,
                  },
                },
              },
            },
            assignedByUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        });
      }
    }

    // Create new assignment
    return this.prisma.userDeviceAssignment.create({
      data: {
        userId,
        deviceId,
        assignedBy: assignerId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
            lifeboxCode: true,
            client: {
              select: {
                name: true,
                organizationName: true,
              },
            },
          },
        },
        assignedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Create multiple device assignments (bulk operation)
   */
  async createBulkDeviceAssignments(
    bulkCreateDto: BulkCreateDeviceAssignmentDto,
    assignerId: string
  ) {
    const { userIds, deviceIds } = bulkCreateDto;
    const assignments = [];
    const errors = [];

    // Validate all combinations first
    for (const userId of userIds) {
      for (const deviceId of deviceIds) {
        try {
          await this.validateAssignmentPermission(assignerId, userId, deviceId);
        } catch (error) {
          errors.push({
            userId,
            deviceId,
            error: error.message,
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Some assignments failed validation',
        errors,
      });
    }

    // Create assignments
    for (const userId of userIds) {
      for (const deviceId of deviceIds) {
        try {
          const assignment = await this.createDeviceAssignment(
            { userId, deviceId },
            assignerId
          );
          assignments.push(assignment);
        } catch (error) {
          // Skip if already exists, add to errors otherwise
          if (!error.message.includes('already assigned')) {
            errors.push({
              userId,
              deviceId,
              error: error.message,
            });
          }
        }
      }
    }

    return {
      assignments,
      errors,
      summary: {
        successful: assignments.length,
        failed: errors.length,
        total: userIds.length * deviceIds.length,
      },
    };
  }

  /**
   * Get device assignments with filtering
   */
  async getDeviceAssignments(query: DeviceAssignmentQueryDto, requesterId: string) {
    const { userId, deviceId, clientId, isActive, limit, offset } = query;

    // Build where clause based on requester permissions
    const where: any = {};

    // Apply filters
    if (userId) where.userId = userId;
    if (deviceId) where.deviceId = deviceId;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    // Check requester permissions and scope access
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: { role: true },
    });

    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    // Apply access control based on role
    if (!['super_user', 'admin'].includes(requester.role.name)) {
      // Non-admin users can only see assignments for their client's devices
      where.device = {
        clientId: requester.clientId,
      };
    } else if (clientId && requester.role.name === 'admin') {
      // Admins can filter by specific client if provided
      where.device = {
        clientId: clientId,
      };
    } else if (clientId && requester.role.name === 'super_user') {
      // Super users can see any client
      where.device = {
        clientId: clientId,
      };
    }

    const [assignments, total] = await Promise.all([
      this.prisma.userDeviceAssignment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: { select: { name: true } },
            },
          },
          device: {
            select: {
              id: true,
              deviceName: true,
              deviceCode: true,
              lifeboxCode: true,
              client: {
                select: {
                  name: true,
                  organizationName: true,
                },
              },
            },
          },
          assignedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { assignedAt: 'desc' },
      }),
      this.prisma.userDeviceAssignment.count({ where }),
    ]);

    return {
      assignments,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a device assignment
   */
  async updateDeviceAssignment(
    assignmentId: string,
    updateDto: UpdateDeviceAssignmentDto,
    requesterId: string
  ) {
    const assignment = await this.prisma.userDeviceAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        device: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Verify requester has permission to update this assignment
    await this.validateUpdatePermission(requesterId, assignment);

    return this.prisma.userDeviceAssignment.update({
      where: { id: assignmentId },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
            lifeboxCode: true,
            client: {
              select: {
                name: true,
                organizationName: true,
              },
            },
          },
        },
        assignedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Remove a device assignment (soft delete - set isActive to false)
   */
  async removeDeviceAssignment(assignmentId: string, requesterId: string) {
    const assignment = await this.prisma.userDeviceAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        device: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Verify requester has permission to remove this assignment
    await this.validateUpdatePermission(requesterId, assignment);

    return this.prisma.userDeviceAssignment.update({
      where: { id: assignmentId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all devices assigned to a specific user
   */
  async getUserDevices(userId: string, requesterId: string) {
    // Verify requester has permission to view this user's assignments
    await this.validateUserAccessPermission(requesterId, userId);

    const assignments = await this.prisma.userDeviceAssignment.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
            lifeboxCode: true,
            isActive: true,
            client: {
              select: {
                name: true,
                organizationName: true,
              },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map(assignment => assignment.device);
  }

  /**
   * Get all users assigned to a specific device
   */
  async getDeviceUsers(deviceId: string, requesterId: string) {
    // Verify requester has permission to view this device's assignments
    await this.validateDeviceAccessPermission(requesterId, deviceId);

    const assignments = await this.prisma.userDeviceAssignment.findMany({
      where: {
        deviceId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map(assignment => assignment.user);
  }

  /**
   * Validate if the assigner has permission to create this assignment
   */
  private async validateAssignmentPermission(
    assignerId: string,
    targetUserId: string,
    deviceId: string
  ) {
    const [assigner, targetUser, device] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: assignerId },
        include: { role: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { role: true },
      }),
      this.prisma.device.findUnique({
        where: { id: deviceId },
        include: { client: true },
      }),
    ]);

    if (!assigner) throw new NotFoundException('Assigner not found');
    if (!targetUser) throw new NotFoundException('Target user not found');
    if (!device) throw new NotFoundException('Device not found');

    // Super users can assign anyone to any device
    if (assigner.role.name === 'super_user') return;

    // Admins can assign users to devices within their scope
    // For now, allowing admins to assign to any device (can be refined based on admin-client assignments)
    if (assigner.role.name === 'admin') return;

    // Clients can assign users to their own devices
    if (assigner.role.name === 'client' && device.clientId === assigner.clientId) return;

    throw new ForbiddenException(
      'You do not have permission to create this device assignment'
    );
  }

  /**
   * Validate if the requester has permission to update/delete this assignment
   */
  private async validateUpdatePermission(requesterId: string, assignment: any) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      include: { role: true },
    });

    if (!requester) throw new NotFoundException('Requester not found');

    // Super users can modify any assignment
    if (requester.role.name === 'super_user') return;

    // Admins can modify assignments within their scope
    if (requester.role.name === 'admin') return;

    // Clients can modify assignments for their devices
    if (requester.role.name === 'client' && assignment.device.clientId === requester.clientId) return;

    throw new ForbiddenException(
      'You do not have permission to modify this assignment'
    );
  }

  /**
   * Validate if the requester has permission to view a user's device assignments
   */
  private async validateUserAccessPermission(requesterId: string, targetUserId: string) {
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

    // Super users and admins can view any user's assignments
    if (['super_user', 'admin'].includes(requester.role.name)) return;

    // Users can view their own assignments
    if (requesterId === targetUserId) return;

    // Clients can view assignments for users in their organization
    if (requester.role.name === 'client' && targetUser.clientId === requester.clientId) return;

    throw new ForbiddenException(
      'You do not have permission to view this user\'s device assignments'
    );
  }

  /**
   * Validate if the requester has permission to view a device's user assignments
   */
  private async validateDeviceAccessPermission(requesterId: string, deviceId: string) {
    const [requester, device] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requesterId },
        include: { role: true },
      }),
      this.prisma.device.findUnique({
        where: { id: deviceId },
        include: { client: true },
      }),
    ]);

    if (!requester) throw new NotFoundException('Requester not found');
    if (!device) throw new NotFoundException('Device not found');

    // Super users and admins can view any device's assignments
    if (['super_user', 'admin'].includes(requester.role.name)) return;

    // Clients can view assignments for their devices
    if (device.clientId === requester.clientId) return;

    throw new ForbiddenException(
      'You do not have permission to view this device\'s user assignments'
    );
  }
}