import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CommandCategory } from './dto/command-permission.dto';

interface DefaultCommand {
  commandType: string;
  name: string;
  description: string;
  category: CommandCategory;
  isSystemLevel: boolean;
  isClientLevel: boolean;
}

@Injectable()
export class CommandPermissionsSeederService {
  private readonly logger = new Logger(CommandPermissionsSeederService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Seed the system with default command permissions
   */
  async seedDefaultCommands(): Promise<void> {
    this.logger.log('Starting command permissions seeding...');

    const defaultCommands: DefaultCommand[] = [
      // Pump Control Commands
      {
        commandType: 'pump_control',
        name: 'Pump Control',
        description: 'Basic pump operation control (on/off)',
        category: CommandCategory.PUMP_CONTROL,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'pump_speed_control',
        name: 'Pump Speed Control',
        description: 'Advanced pump speed and performance control',
        category: CommandCategory.PUMP_CONTROL,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'pump_scheduling',
        name: 'Pump Scheduling',
        description: 'Set automated pump operation schedules',
        category: CommandCategory.PUMP_CONTROL,
        isSystemLevel: false,
        isClientLevel: true,
      },

      // Power Management Commands
      {
        commandType: 'power_source_switch',
        name: 'Power Source Switch',
        description: 'Switch between solar, grid, and battery power sources',
        category: CommandCategory.POWER_MANAGEMENT,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'battery_management',
        name: 'Battery Management',
        description: 'Battery charging and discharge control',
        category: CommandCategory.POWER_MANAGEMENT,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'power_optimization',
        name: 'Power Optimization',
        description: 'Optimize power usage and efficiency settings',
        category: CommandCategory.POWER_MANAGEMENT,
        isSystemLevel: false,
        isClientLevel: true,
      },

      // System Monitoring Commands
      {
        commandType: 'status_monitoring',
        name: 'Status Monitoring',
        description: 'View real-time device status and telemetry',
        category: CommandCategory.SYSTEM_MONITORING,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'alarm_management',
        name: 'Alarm Management',
        description: 'Configure and manage device alarms',
        category: CommandCategory.SYSTEM_MONITORING,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'data_export',
        name: 'Data Export',
        description: 'Export telemetry and historical data',
        category: CommandCategory.SYSTEM_MONITORING,
        isSystemLevel: false,
        isClientLevel: true,
      },

      // Configuration Commands
      {
        commandType: 'device_configuration',
        name: 'Device Configuration',
        description: 'Modify device settings and parameters',
        category: CommandCategory.CONFIGURATION,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'network_configuration',
        name: 'Network Configuration',
        description: 'Configure device network and communication settings',
        category: CommandCategory.CONFIGURATION,
        isSystemLevel: false,
        isClientLevel: true,
      },

      // Maintenance Commands
      {
        commandType: 'maintenance_mode',
        name: 'Maintenance Mode',
        description: 'Put device in maintenance mode for service',
        category: CommandCategory.MAINTENANCE,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'diagnostics',
        name: 'System Diagnostics',
        description: 'Run system diagnostics and health checks',
        category: CommandCategory.MAINTENANCE,
        isSystemLevel: false,
        isClientLevel: true,
      },
      {
        commandType: 'calibration',
        name: 'Sensor Calibration',
        description: 'Calibrate sensors and measurement devices',
        category: CommandCategory.MAINTENANCE,
        isSystemLevel: false,
        isClientLevel: true,
      },

      // System-Level Commands (Super Users only)
      {
        commandType: 'firmware_update',
        name: 'Firmware Update',
        description: 'Update device firmware and system software',
        category: CommandCategory.FIRMWARE,
        isSystemLevel: true,
        isClientLevel: false,
      },
      {
        commandType: 'factory_reset',
        name: 'Factory Reset',
        description: 'Reset device to factory default settings',
        category: CommandCategory.FIRMWARE,
        isSystemLevel: true,
        isClientLevel: false,
      },
      {
        commandType: 'system_shutdown',
        name: 'System Shutdown',
        description: 'Emergency system shutdown and power off',
        category: CommandCategory.FIRMWARE,
        isSystemLevel: true,
        isClientLevel: false,
      },
    ];

    for (const commandData of defaultCommands) {
      await this.createOrUpdateCommand(commandData);
    }

    this.logger.log(`Seeded ${defaultCommands.length} default command permissions`);
  }

  /**
   * Set up hierarchical permissions for demo purposes
   */
  async setupHierarchicalPermissionsDemo(): Promise<void> {
    this.logger.log('Setting up hierarchical permissions demo...');

    // Get the Super User
    const superUser = await this.prisma.user.findFirst({
      where: {
        role: {
          name: 'super_user',
        },
      },
    });

    if (!superUser) {
      this.logger.warn('No Super User found for demo setup');
      return;
    }

    // Get sample commands
    const pumpControlCommand = await this.prisma.commandPermission.findUnique({
      where: { commandType: 'pump_control' },
    });

    const statusMonitoringCommand = await this.prisma.commandPermission.findUnique({
      where: { commandType: 'status_monitoring' },
    });

    const powerManagementCommand = await this.prisma.commandPermission.findUnique({
      where: { commandType: 'power_source_switch' },
    });

    if (!pumpControlCommand || !statusMonitoringCommand || !powerManagementCommand) {
      this.logger.warn('Required commands not found for demo setup');
      return;
    }

    // Find an Admin user
    const adminUser = await this.prisma.user.findFirst({
      where: {
        role: {
          name: 'admin',
        },
      },
    });

    if (adminUser) {
      // Super User grants pump control with delegation rights to Admin
      await this.createPermissionIfNotExists({
        userId: adminUser.id,
        commandPermissionId: pumpControlCommand.id,
        grantedBy: superUser.id,
        canDelegate: true,
        scope: 'global',
      });

      // Super User grants status monitoring with delegation rights to Admin
      await this.createPermissionIfNotExists({
        userId: adminUser.id,
        commandPermissionId: statusMonitoringCommand.id,
        grantedBy: superUser.id,
        canDelegate: true,
        scope: 'global',
      });

      this.logger.log(`Granted delegatable permissions to Admin: ${adminUser.email}`);

      // Find a Client user
      const clientUser = await this.prisma.user.findFirst({
        where: {
          role: {
            name: 'client',
          },
        },
      });

      if (clientUser) {
        // Admin grants pump control (without delegation) to Client
        await this.createPermissionIfNotExists({
          userId: clientUser.id,
          commandPermissionId: pumpControlCommand.id,
          grantedBy: adminUser.id,
          canDelegate: false,
          scope: 'client',
          scopeId: clientUser.clientId,
        });

        // Admin grants status monitoring (with delegation) to Client
        await this.createPermissionIfNotExists({
          userId: clientUser.id,
          commandPermissionId: statusMonitoringCommand.id,
          grantedBy: adminUser.id,
          canDelegate: true,
          scope: 'client',
          scopeId: clientUser.clientId,
        });

        this.logger.log(`Admin delegated permissions to Client: ${clientUser.email}`);

        // Find an Operator user from the same client
        const operatorUser = await this.prisma.user.findFirst({
          where: {
            role: {
              name: 'operator',
            },
            clientId: clientUser.clientId,
          },
        });

        if (operatorUser) {
          // Client grants status monitoring (without delegation) to Operator
          await this.createPermissionIfNotExists({
            userId: operatorUser.id,
            commandPermissionId: statusMonitoringCommand.id,
            grantedBy: clientUser.id,
            canDelegate: false,
            scope: 'client',
            scopeId: clientUser.clientId,
          });

          this.logger.log(`Client delegated permissions to Operator: ${operatorUser.email}`);
        }

        // Find a Viewer user from the same client
        const viewerUser = await this.prisma.user.findFirst({
          where: {
            role: {
              name: 'viewer',
            },
            clientId: clientUser.clientId,
          },
        });

        if (viewerUser) {
          // Client grants status monitoring (read-only, without delegation) to Viewer
          await this.createPermissionIfNotExists({
            userId: viewerUser.id,
            commandPermissionId: statusMonitoringCommand.id,
            grantedBy: clientUser.id,
            canDelegate: false,
            scope: 'client',
            scopeId: clientUser.clientId,
          });

          this.logger.log(`Client delegated read-only permissions to Viewer: ${viewerUser.email}`);
        }
      }
    }

    this.logger.log('Hierarchical permissions demo setup completed');
  }

  /**
   * Create device-specific assignments for demo
   */
  async setupDeviceSpecificAssignmentsDemo(): Promise<void> {
    this.logger.log('Setting up device-specific assignments demo...');

    // Find a Viewer user
    const viewerUser = await this.prisma.user.findFirst({
      where: {
        role: {
          name: 'viewer',
        },
      },
    });

    if (!viewerUser) {
      this.logger.warn('No Viewer user found for device assignment demo');
      return;
    }

    // Get some devices from the viewer's client
    const devices = await this.prisma.device.findMany({
      where: {
        clientId: viewerUser.clientId,
      },
      take: 2,
    });

    if (devices.length === 0) {
      this.logger.warn('No devices found for device assignment demo');
      return;
    }

    // Find a Client user who can assign devices
    const clientUser = await this.prisma.user.findFirst({
      where: {
        role: {
          name: 'client',
        },
        clientId: viewerUser.clientId,
      },
    });

    if (!clientUser) {
      this.logger.warn('No Client user found for device assignment demo');
      return;
    }

    // Assign viewer to specific devices only
    for (const device of devices) {
      await this.createDeviceAssignmentIfNotExists({
        userId: viewerUser.id,
        deviceId: device.id,
        assignedBy: clientUser.id,
      });
    }

    this.logger.log(`Assigned Viewer ${viewerUser.email} to ${devices.length} specific devices`);
  }

  private async createOrUpdateCommand(commandData: DefaultCommand): Promise<void> {
    const existingCommand = await this.prisma.commandPermission.findUnique({
      where: { commandType: commandData.commandType },
    });

    if (existingCommand) {
      // Update existing command
      await this.prisma.commandPermission.update({
        where: { id: existingCommand.id },
        data: {
          name: commandData.name,
          description: commandData.description,
          category: commandData.category,
          isSystemLevel: commandData.isSystemLevel,
          isClientLevel: commandData.isClientLevel,
          isActive: true,
        },
      });
    } else {
      // Create new command
      await this.prisma.commandPermission.create({
        data: commandData,
      });
    }
  }

  private async createPermissionIfNotExists(permissionData: {
    userId: string;
    commandPermissionId: string;
    grantedBy: string;
    canDelegate: boolean;
    scope: string;
    scopeId?: string;
  }): Promise<void> {
    const existing = await this.prisma.userCommandPermission.findUnique({
      where: {
        userId_commandPermissionId_scope_scopeId: {
          userId: permissionData.userId,
          commandPermissionId: permissionData.commandPermissionId,
          scope: permissionData.scope,
          scopeId: permissionData.scopeId || null,
        },
      },
    });

    if (!existing) {
      await this.prisma.userCommandPermission.create({
        data: permissionData,
      });
    } else if (!existing.isActive) {
      // Reactivate if exists but inactive
      await this.prisma.userCommandPermission.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          grantedBy: permissionData.grantedBy,
          canDelegate: permissionData.canDelegate,
        },
      });
    }
  }

  private async createDeviceAssignmentIfNotExists(assignmentData: {
    userId: string;
    deviceId: string;
    assignedBy: string;
  }): Promise<void> {
    const existing = await this.prisma.userDeviceAssignment.findUnique({
      where: {
        userId_deviceId: {
          userId: assignmentData.userId,
          deviceId: assignmentData.deviceId,
        },
      },
    });

    if (!existing) {
      await this.prisma.userDeviceAssignment.create({
        data: assignmentData,
      });
    } else if (!existing.isActive) {
      // Reactivate if exists but inactive
      await this.prisma.userDeviceAssignment.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          assignedBy: assignmentData.assignedBy,
        },
      });
    }
  }

  /**
   * Run complete demo setup
   */
  async runCompleteDemo(): Promise<void> {
    this.logger.log('Running complete hierarchical permissions demo...');
    
    await this.seedDefaultCommands();
    await this.setupHierarchicalPermissionsDemo();
    await this.setupDeviceSpecificAssignmentsDemo();
    
    this.logger.log('Complete hierarchical permissions demo setup finished!');
  }
}