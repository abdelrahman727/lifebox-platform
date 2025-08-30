// src/modules/control/control-command.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EnhancedPermissionsGuard, RequireDeviceCommand, RequireDeviceAccess } from '../../common/guards/enhanced-permissions.guard';
import { PrismaService } from '../database/prisma.service';
import { CreditMonitorService } from '../payment/services/credit-monitor.service';
import { DeviceControlService } from '../payment/services/device-control.service';
import { GranularCommandService } from '../../common/services/granular-command.service';

// Updated interface to support all 28 new command types
interface CommandDto {
  commandType: 
    // New 28 command types from user requirements
    | 'TDS_RANGE' | 'Level_Sensor' | 'Pressure_Sensor' | 'Change_phone_number'
    | 'Control_Pump_Forward1' | 'Select_Start_Command_Mode' | 'Change_Inverter_Temperature_SetPoint'
    | 'Pre_alarm_Temperature_Setpoint' | 'pre_temp_alarm_test' | 'Inverter_Cancel_Pass'
    | 'Inverter_Change_Password' | 'control_master_on' | 'EdgeBox_Command'
    | 'Inverter_Reg_Addr' | 'Inverter_Reg_Addr2' | 'Inverter_Remote_direction'
    | 'Inverter_Remote_AlarmReset' | 'Control_Pump_Stop' | 'Control_Pump_Forward'
    | 'Control_Pump_Backward' | 'control_master_off' | 'client_data_1'
    | 'client_data_2' | 'Grid_Price_Rate' | 'Diesel_Price_Rate' | 'ChangeApn'
    | 'Change_Cloud_Credential' | 'Reset_Box'
    // Legacy commands for backward compatibility
    | 'pump_on' | 'pump_off' | 'pump_forward' | 'pump_reverse' | 'inverter_password' 
    | 'master_shutdown' | 'master_lock' | 'master_unlock' | 'alarm_reset'
    | 'START_PUMP' | 'STOP_PUMP' | 'SET_FREQUENCY' | 'SET_MOTOR_SPEED'
    | 'ENABLE_AUTO_MODE' | 'DISABLE_AUTO_MODE' | 'RESTART_SYSTEM' | 'SHUTDOWN_SYSTEM';
  payload?: any;
  reason?: string;
}

@ApiTags('control')
@Controller('control')
@UseGuards(JwtAuthGuard, EnhancedPermissionsGuard)
@ApiBearerAuth()
export class ControlCommandController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditMonitorService: CreditMonitorService,
    private readonly deviceControlService: DeviceControlService,
    private readonly granularCommandService: GranularCommandService,
  ) {}

  @Post('device/:deviceId/command')
  @RequireDeviceAccess() // Check device access first
  @ApiOperation({ summary: 'Send control command to device' })
  @ApiResponse({ status: 200, description: 'Command sent successfully' })
  @ApiResponse({ status: 403, description: 'Command blocked due to insufficient credit or permissions' })
  async sendCommand(
    @Param('deviceId') deviceId: string,
    @Body() commandDto: CommandDto,
    @CurrentUser() user: any,
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { client: true },
    });

    if (!device) {
      throw new BadRequestException('Device not found');
    }

    // Check granular command permission
    const commandPermission = await this.granularCommandService.checkCommandPermission(
      user.id,
      commandDto.commandType,
      deviceId,
    );

    if (!commandPermission.hasPermission) {
      throw new ForbiddenException({
        statusCode: 403,
        message: `You do not have permission to execute '${commandDto.commandType}' commands`,
        error: 'INSUFFICIENT_COMMAND_PERMISSION',
        details: {
          commandType: commandDto.commandType,
          mappedCommand: commandPermission.commandType,
          requiredPermission: `commands.${commandPermission.commandType}`,
        },
      });
    }

    // Check credit for turn-on commands (including new command types)
    const pumpOnCommands = [
      'pump_on', 'master_unlock', 'START_PUMP', 
      'Control_Pump_Forward1', 'Control_Pump_Forward', 'control_master_on'
    ];
    
    if (pumpOnCommands.includes(commandDto.commandType)) {
      const canTurnOn = await this.creditMonitorService.canDeviceTurnOn(deviceId);
      
      if (!canTurnOn.allowed) {
        throw new ForbiddenException({
          statusCode: 403,
          message: canTurnOn.message,
          error: 'INSUFFICIENT_CREDIT',
          details: {
            currentBalance: device.client.credit,
            minimumRequired: 5,
            fawryPaymentCode: device.client.fawryPaymentId,
            instructions: 'Please top up your account via Fawry to continue using the service.',
          },
        });
      }
    }

    // Send command via device control service
    const commandId = await this.deviceControlService.sendDeviceCommand(
      deviceId,
      commandDto.commandType,
      commandDto.commandType.replace('_', ' '),
      commandDto.payload,
      user.id,
    );

    return {
      success: true,
      message: 'Command sent successfully',
      commandId,
      status: 'QUEUED',
    };
  }

  @Get('command/:commandId/status')
  @RequireDeviceAccess() // User needs device access to view command status
  @ApiOperation({ summary: 'Get command status' })
  async getCommandStatus(
    @Param('commandId') commandId: string,
    @CurrentUser() user: any,
  ) {
    const command = await this.prisma.controlCommand.findUnique({
      where: { id: commandId },
      include: {
        device: true,
        acknowledgments: true,
      },
    });

    if (!command) {
      throw new BadRequestException('Command not found');
    }

    // Access check is now handled by EnhancedPermissionsGuard

    return {
      commandId: command.id,
      deviceCode: command.device.deviceCode,
      commandType: command.commandType,
      status: command.status,
      requestedAt: command.requestedAt,
      sentAt: command.sentAt,
      acknowledgedAt: command.acknowledgedAt,
      completedAt: command.completedAt,
      errorMessage: command.errorMessage,
      retryCount: command.retryCount,
      acknowledgments: command.acknowledgments,
    };
  }

  @Get('device/:deviceId/history')
  @RequireDeviceAccess() // User needs device access to view command history
  @ApiOperation({ summary: 'Get device command history' })
  async getDeviceCommandHistory(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: any,
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new BadRequestException('Device not found');
    }

    // Access check is now handled by EnhancedPermissionsGuard

    const commands = await this.prisma.controlCommand.findMany({
      where: { deviceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        acknowledgments: true,
      },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    });

    return commands;
  }

  @Post('client/:clientId/emergency-shutdown')
  @ApiOperation({ summary: 'Emergency shutdown all client devices' })
  async emergencyShutdown(
    @Param('clientId') clientId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: any,
  ) {
    // Check if user has emergency shutdown permissions
    const hasEmergencyPermission = await this.granularCommandService.checkCommandPermission(
      user.id,
      'system_shutdown',
    );

    // Also check if user has access to this client
    const hasClientAccess = user.role.name === 'super_user' || 
                           user.role.name === 'super_admin' || 
                           user.role.name === 'admin' || 
                           user.clientId === clientId;

    if (!hasEmergencyPermission.hasPermission || !hasClientAccess) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'You do not have permission to perform emergency shutdown',
        error: 'INSUFFICIENT_EMERGENCY_PERMISSION',
        details: {
          hasEmergencyPermission: hasEmergencyPermission.hasPermission,
          hasClientAccess,
          requiredPermission: 'commands.system_shutdown',
        },
      });
    }

    const result = await this.deviceControlService.shutdownAllClientDevices(
      clientId,
      body.reason,
    );

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: 'EMERGENCY_SHUTDOWN',
        resourceType: 'CLIENT',
        resourceId: clientId,
        details: {
          reason: body.reason,
          ...result,
        },
        ipAddress: 'unknown',
        userAgent: 'unknown',
      },
    });

    return {
      success: true,
      message: `Emergency shutdown initiated for ${result.devicesAffected} devices`,
      ...result,
    };
  }
}