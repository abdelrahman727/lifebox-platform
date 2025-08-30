// src/modules/realtime/realtime.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RealtimeService, TelemetryData } from './realtime-simple.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('realtime')
@Controller('realtime')
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  /**
   * Get real-time device status
   */
  @Get('devices/:deviceId/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get real-time device status',
    description: 'Retrieve current status and latest telemetry for a device',
  })
  @ApiResponse({
    status: 200,
    description: 'Device status retrieved successfully',
  })
  async getDeviceStatus(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: any,
  ) {
    try {
      return await this.realtimeService.getDeviceStatus(deviceId, user.id);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Get multi-device status for a client
   */
  @Get('clients/:clientId/devices/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get multi-device status',
    description: 'Retrieve status for all devices of a client',
  })
  @ApiResponse({
    status: 200,
    description: 'Multi-device status retrieved successfully',
  })
  async getMultiDeviceStatus(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
  ) {
    try {
      return await this.realtimeService.getMultiDeviceStatus(clientId, user.id);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Ingest telemetry data (Internal/MQTT service only)
   */
  @Post('telemetry/ingest')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'service')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ingest telemetry data',
    description: 'Internal endpoint for MQTT service to ingest device telemetry',
  })
  @ApiResponse({
    status: 201,
    description: 'Telemetry data processed successfully',
  })
  async ingestTelemetry(
    @Body() telemetryData: TelemetryData,
  ) {
    try {
      // Validate required fields
      if (!telemetryData.deviceId || !telemetryData.timestamp) {
        throw new BadRequestException('deviceId and timestamp are required');
      }

      return await this.realtimeService.processTelemetryData(telemetryData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to process telemetry: ${error.message}`);
    }
  }

  /**
   * Command status update (Internal/MQTT service only)
   */
  @Post('command-status')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'service')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update command status',
    description: 'Internal endpoint for MQTT service to broadcast command status updates',
  })
  @ApiResponse({
    status: 200,
    description: 'Command status update broadcast successfully',
  })
  async updateCommandStatus(
    @Body() commandStatusData: {
      deviceId: string;
      commandId: string;
      status: string;
      message?: string;
      timestamp: string;
      executionData?: any;
    },
  ) {
    try {
      // Validate required fields
      if (!commandStatusData.deviceId || !commandStatusData.commandId || !commandStatusData.status) {
        throw new BadRequestException('deviceId, commandId, and status are required');
      }

      return await this.realtimeService.broadcastCommandStatusUpdate(commandStatusData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to broadcast command status: ${error.message}`);
    }
  }

  /**
   * Get WebSocket connection statistics (Admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Get('connections/stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get connection statistics',
    description: 'Retrieve WebSocket connection statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection statistics retrieved successfully',
  })
  async getConnectionStats() {
    return this.realtimeService.getConnectionStats();
  }

  /**
   * Get active alarms with real-time updates
   */
  @Get('alarms/active')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get active alarms',
    description: 'Retrieve active alarms for real-time monitoring',
  })
  @ApiResponse({
    status: 200,
    description: 'Active alarms retrieved successfully',
  })
  async getActiveAlarms(
    @CurrentUser() user: any,
    @Query('clientId') clientId?: string,
    @Query('deviceId') deviceId?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit: number = 50,
  ) {
    // TODO: Implement alarm querying service
    // For now, return a placeholder
    return {
      message: 'Active alarms endpoint - implementation pending',
      filters: { clientId, deviceId, severity, limit },
      user: user.id,
    };
  }

  /**
   * Acknowledge alarm
   */
  @Post('alarms/:alarmId/acknowledge')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Acknowledge alarm',
    description: 'Acknowledge an active alarm',
  })
  @ApiResponse({
    status: 200,
    description: 'Alarm acknowledged successfully',
  })
  async acknowledgeAlarm(
    @Param('alarmId') alarmId: string,
    @CurrentUser() user: any,
    @Body() data?: { notes?: string },
  ) {
    // TODO: Implement alarm acknowledgment
    return {
      message: 'Alarm acknowledgment endpoint - implementation pending',
      alarmId,
      acknowledgedBy: user.id,
      notes: data?.notes,
      timestamp: new Date(),
    };
  }

  /**
   * Get device telemetry history (last N records)
   */
  @Get('devices/:deviceId/telemetry/recent')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get recent telemetry',
    description: 'Retrieve recent telemetry data for a device',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent telemetry retrieved successfully',
  })
  async getRecentTelemetry(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: any,
    @Query('limit') limit: number = 100,
    @Query('minutes') minutes: number = 60,
  ) {
    // TODO: Implement recent telemetry querying
    return {
      message: 'Recent telemetry endpoint - implementation pending',
      deviceId,
      limit,
      minutes,
      user: user.id,
    };
  }

  /**
   * Get aggregated telemetry data
   */
  @Get('devices/:deviceId/telemetry/aggregated')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get aggregated telemetry',
    description: 'Retrieve aggregated telemetry data (hourly/daily averages)',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated telemetry retrieved successfully',
  })
  async getAggregatedTelemetry(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: any,
    @Query('period') period: 'hour' | 'day' | 'week' = 'day',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // TODO: Implement aggregated telemetry querying
    return {
      message: 'Aggregated telemetry endpoint - implementation pending',
      deviceId,
      period,
      startDate,
      endDate,
      user: user.id,
    };
  }

  /**
   * Test telemetry ingestion (Development only)
   */
  @UseGuards(RolesGuard)
  @Roles('super_user')
  @Post('telemetry/test')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test telemetry ingestion',
    description: 'Generate test telemetry data for development/testing',
  })
  @ApiResponse({
    status: 201,
    description: 'Test telemetry data generated successfully',
  })
  async generateTestTelemetry(
    @Body() testData: { deviceId: string; count?: number },
  ) {
    try {
      const count = testData.count || 1;
      const results = [];

      for (let i = 0; i < count; i++) {
        // Generate realistic test data
        const telemetry: TelemetryData = {
          deviceId: testData.deviceId,
          timestamp: new Date(),
          energyGenerated: Math.random() * 5 + 2, // 2-7 kWh
          energyConsumed: Math.random() * 3 + 1, // 1-4 kWh
          waterFlowRate: Math.random() * 50 + 10, // 10-60 L/min
          pumpStatus: Math.random() > 0.9 ? 'error' : Math.random() > 0.1 ? 'on' : 'off',
          batteryVoltage: Math.random() * 2 + 11, // 11-13V
          solarVoltage: Math.random() * 5 + 15, // 15-20V
          motorCurrent: Math.random() * 8 + 5, // 5-13A
          systemEfficiency: Math.random() * 0.3 + 0.6, // 60-90%
          temperature: Math.random() * 30 + 40, // 40-70°C
          pressure: Math.random() * 2 + 3, // 3-5 bar
          vibration: Math.random() * 1.5 + 0.5, // 0.5-2 m/s²
          coordinates: {
            latitude: 30.0444 + (Math.random() - 0.5) * 0.1, // Around Cairo
            longitude: 31.2357 + (Math.random() - 0.5) * 0.1,
          },
        };

        const result = await this.realtimeService.processTelemetryData(telemetry);
        results.push(result);

        // Add small delay between records
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        message: `Generated ${count} test telemetry records`,
        deviceId: testData.deviceId,
        records: results,
      };

    } catch (error) {
      throw new BadRequestException(`Failed to generate test telemetry: ${error.message}`);
    }
  }

  /**
   * Get system health status
   */
  @Get('system/health')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get system health',
    description: 'Retrieve real-time system health status',
  })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
  })
  async getSystemHealth(@CurrentUser() user: any) {
    const stats = this.realtimeService.getConnectionStats();
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      websocket: {
        connected: stats.connectedClients > 0,
        clients: stats.connectedClients,
      },
      database: {
        connected: true, // TODO: Add actual DB health check
      },
      services: {
        telemetryProcessor: true, // TODO: Add actual service health
        alarmProcessor: true,
        creditMonitor: true,
      },
      user: {
        id: user.id,
        role: user.role?.name,
        hasAccess: true,
      },
    };
  }
}