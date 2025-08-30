import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/database/prisma.service';

export interface CommandPermissionCheck {
  hasPermission: boolean;
  commandType: string;
  userId: string;
  deviceId?: string;
  scope: 'global' | 'client' | 'device';
  grantedBy?: string;
}

@Injectable()
export class GranularCommandService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map legacy command types to new granular command permissions
   */
  private mapCommandToPermission(commandType: string): string {
    const commandMapping: Record<string, string> = {
      // Pump Commands
      'pump_on': 'pump_start',
      'START_PUMP': 'pump_start',
      'Control_Pump_Forward1': 'pump_start',
      'Control_Pump_Forward': 'pump_start',
      
      'pump_off': 'pump_stop', 
      'STOP_PUMP': 'pump_stop',
      'Control_Pump_Stop': 'pump_stop',
      
      'RESTART_SYSTEM': 'pump_restart',
      'pump_forward': 'pump_restart',
      'pump_reverse': 'pump_restart',
      
      // System Commands
      'SHUTDOWN_SYSTEM': 'system_shutdown',
      'master_shutdown': 'system_shutdown',
      'Reset_Box': 'system_reboot',
      
      // Maintenance Commands  
      'EdgeBox_Command': 'maintenance_mode',
      'master_lock': 'maintenance_mode',
      'master_unlock': 'maintenance_mode',
      
      // Diagnostic Commands
      'alarm_reset': 'diagnostic_run',
      'Inverter_Remote_AlarmReset': 'diagnostic_run',
      'pre_temp_alarm_test': 'diagnostic_run',
      
      // Parameter Commands
      'Change_phone_number': 'parameter_update',
      'ChangeApn': 'parameter_update', 
      'Change_Cloud_Credential': 'parameter_update',
      'Grid_Price_Rate': 'parameter_update',
      'Diesel_Price_Rate': 'parameter_update',
      'Change_Inverter_Temperature_SetPoint': 'parameter_update',
      'Pre_alarm_Temperature_Setpoint': 'parameter_update',
      'Inverter_Change_Password': 'parameter_update',
      'inverter_password': 'parameter_update',
    };

    return commandMapping[commandType] || commandType;
  }

  /**
   * Check if user has permission to execute a specific command
   */
  async checkCommandPermission(
    userId: string,
    commandType: string,
    deviceId?: string,
  ): Promise<CommandPermissionCheck> {
    try {
      // Get user with role and client info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user) {
        return {
          hasPermission: false,
          commandType,
          userId,
          deviceId,
          scope: 'global',
        };
      }

      const mappedCommand = this.mapCommandToPermission(commandType);
      
      // Check if user's role has this command permission
      const hasRolePermission = user.role.permissions.some(
        (p) => p.resource === 'commands' && p.action === mappedCommand,
      );

      if (hasRolePermission) {
        return {
          hasPermission: true,
          commandType: mappedCommand,
          userId,
          deviceId,
          scope: 'global',
        };
      }

      // Check for individually granted command permissions
      const individualPermission = await this.prisma.userCommandPermission.findFirst({
        where: {
          userId,
          commandPermission: {
            commandType: mappedCommand,
          },
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          // Check scope
          ...(deviceId ? {
            OR: [
              { scope: 'global' },
              { scope: 'device', scopeId: deviceId },
              // Also check if user has client-level access to this device
              { 
                scope: 'client',
                scopeId: {
                  in: await this.getDeviceClientId(deviceId),
                }
              },
            ]
          } : {}),
        },
        include: {
          grantedByUser: true,
        },
      });

      return {
        hasPermission: !!individualPermission,
        commandType: mappedCommand,
        userId,
        deviceId,
        scope: individualPermission?.scope as 'global' | 'client' | 'device' || 'global',
        grantedBy: individualPermission?.grantedByUser?.fullName,
      };

    } catch (error) {
      console.error('Error checking command permission:', error);
      return {
        hasPermission: false,
        commandType,
        userId,
        deviceId,
        scope: 'global',
      };
    }
  }

  /**
   * Grant command permission to a user
   */
  async grantCommandPermission(
    grantedBy: string,
    userId: string,
    commandType: string,
    scope: 'global' | 'client' | 'device' = 'global',
    scopeId?: string,
    expiresAt?: Date,
  ) {
    // Verify the granter has delegation rights and the command permission
    const granterCheck = await this.checkCommandPermission(grantedBy, commandType);
    const granterHasDelegation = await this.checkCommandPermission(grantedBy, 'delegate');

    if (!granterCheck.hasPermission || !granterHasDelegation.hasPermission) {
      throw new Error('Insufficient permissions to grant this command');
    }

    const mappedCommand = this.mapCommandToPermission(commandType);

    // First find or create the CommandPermission
    const commandPermission = await this.prisma.commandPermission.upsert({
      where: { commandType: mappedCommand },
      update: {},
      create: {
        commandType: mappedCommand,
        name: mappedCommand.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Permission to execute ${mappedCommand} commands`,
        category: 'device_control',
        isActive: true,
      },
    });

    return await this.prisma.userCommandPermission.create({
      data: {
        userId,
        commandPermissionId: commandPermission.id,
        scope,
        scopeId,
        grantedBy,
        expiresAt,
        isActive: true,
      },
    });
  }

  /**
   * Get available commands for a user
   */
  async getUserAvailableCommands(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) return [];

    // Get role-based commands
    const roleCommands = user.role.permissions
      .filter((p) => p.resource === 'commands')
      .map((p) => p.action);

    // Get individually granted commands
    const individualCommands = await this.prisma.userCommandPermission.findMany({
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

    const individualCommandTypes = individualCommands.map((c) => c.commandPermission.commandType);

    // Combine and deduplicate
    return [...new Set([...roleCommands, ...individualCommandTypes])];
  }

  /**
   * Get client ID for a device
   */
  private async getDeviceClientId(deviceId: string): Promise<string[]> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { clientId: true },
    });

    return device?.clientId ? [device.clientId] : [];
  }

  /**
   * Get all available command types with descriptions
   */
  getCommandDescriptions(): Record<string, string> {
    return {
      pump_start: 'Start water pump operation',
      pump_stop: 'Stop water pump operation',
      pump_restart: 'Restart pump system',
      system_reboot: 'Reboot entire device system',
      system_shutdown: 'Shutdown device completely',
      maintenance_mode: 'Enter maintenance mode',
      diagnostic_run: 'Run system diagnostics',
      parameter_update: 'Update device parameters',
      delegate: 'Delegate command permissions to others',
    };
  }
}