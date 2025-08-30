// src/modules/realtime/realtime-simple.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RealtimeGateway } from './realtime.gateway';

export interface TelemetryData {
  deviceId: string;
  timestamp: Date;
  energyGenerated: number;
  energyConsumed: number;
  waterFlowRate: number;
  pumpStatus: 'on' | 'off' | 'error';
  batteryVoltage: number;
  solarVoltage: number;
  motorCurrent: number;
  systemEfficiency: number;
  temperature: number;
  pressure: number;
  vibration: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private gateway: RealtimeGateway;

  constructor(private readonly prisma: PrismaService) {}

  // Set gateway reference (called from module)
  setGateway(gateway: RealtimeGateway) {
    this.gateway = gateway;
  }

  // Process incoming telemetry data (simplified version)
  async processTelemetryData(telemetryData: TelemetryData) {
    try {
      // Verify device exists and is active
      const device = await this.prisma.device.findUnique({
        where: { id: telemetryData.deviceId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              organizationName: true,
            },
          },
        },
      });

      if (!device) {
        this.logger.warn(`Telemetry received for unknown device: ${telemetryData.deviceId}`);
        return;
      }

      if (!device.isActive) {
        this.logger.warn(`Telemetry received for inactive device: ${device.deviceCode}`);
        return;
      }

      // Store telemetry data in database using existing schema
      const telemetry = await this.prisma.telemetryEvent.create({
        data: {
          deviceId: telemetryData.deviceId,
          time: telemetryData.timestamp,
          energyPerDayValue: telemetryData.energyGenerated,
          pumpEnergyConsumptionValue: telemetryData.energyConsumed,
          busVoltageValue: telemetryData.batteryVoltage,
          pumpVoltageValue: telemetryData.solarVoltage,
          pumpCurrentValue: telemetryData.motorCurrent,
          inverterTemperatureValue: telemetryData.temperature,
          pressureSensorValue: telemetryData.pressure,
          pumpStatusValue: telemetryData.pumpStatus === 'on' ? 'Running' : 'Stopped',
          inverterStatusValue: telemetryData.pumpStatus !== 'error' ? 'Power & Communication' : 'Error',
          totalWaterVolumeM3Value: telemetryData.waterFlowRate ? telemetryData.waterFlowRate / 1000 : null,
          extras: {
            systemEfficiency: telemetryData.systemEfficiency,
            vibration: telemetryData.vibration,
            coordinates: telemetryData.coordinates,
            originalPumpStatus: telemetryData.pumpStatus,
          },
        },
      });

      // Broadcast to connected clients
      if (this.gateway) {
        this.gateway.broadcastTelemetry(telemetryData.deviceId, {
          ...telemetryData,
          deviceCode: device.deviceCode,
          deviceName: device.deviceName,
          clientName: device.client.name,
        });
      }

      // Simple alarm detection (just log for now)
      this.checkSimpleAlarms(device, telemetryData);

      this.logger.debug(`Processed telemetry for device ${device.deviceCode}`);
      return telemetry;

    } catch (error) {
      this.logger.error(`Error processing telemetry: ${error.message}`);
      throw error;
    }
  }

  // Simple alarm detection (just logs, no database storage)
  private checkSimpleAlarms(device: any, telemetryData: TelemetryData) {
    const alarms = [];

    // Battery voltage low
    if (telemetryData.batteryVoltage < 11.0) {
      alarms.push({
        type: 'battery_low',
        severity: telemetryData.batteryVoltage < 10.5 ? 'critical' : 'warning',
        message: `Low battery voltage: ${telemetryData.batteryVoltage}V`,
      });
    }

    // High motor current
    if (telemetryData.motorCurrent > 15.0) {
      alarms.push({
        type: 'motor_overcurrent',
        severity: telemetryData.motorCurrent > 20.0 ? 'critical' : 'warning',
        message: `High motor current: ${telemetryData.motorCurrent}A`,
      });
    }

    // Pump error
    if (telemetryData.pumpStatus === 'error') {
      alarms.push({
        type: 'pump_error',
        severity: 'critical',
        message: 'Pump error reported by device',
      });
    }

    // Just log and broadcast alarms for now
    for (const alarmData of alarms) {
      this.logger.warn(`Alarm: ${alarmData.type} for device ${device.deviceCode} - ${alarmData.message}`);

      if (this.gateway) {
        const alarm = {
          id: `temp_${Date.now()}`,
          deviceId: device.id,
          severity: alarmData.severity,
          message: alarmData.message,
          type: alarmData.type,
          triggeredAt: telemetryData.timestamp,
          device: {
            deviceCode: device.deviceCode,
            deviceName: device.deviceName,
          },
          client: {
            name: device.client.name,
            organizationName: device.client.organizationName,
          },
        };
        
        this.gateway.broadcastAlarm(alarm);
      }
    }
  }

  // Get real-time device status (simplified)
  async getDeviceStatus(deviceId: string, userId: string) {
    // Verify device exists and user has access
    const device = await this.prisma.device.findFirst({
      where: {
        id: deviceId,
        OR: [
          {
            client: {
              users: {
                some: { id: userId },
              },
            },
          },
          // Allow admins
          {
            client: {
              users: {
                some: {
                  id: userId,
                  role: {
                    name: { in: ['super_user', 'admin'] },
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        client: {
          select: {
            name: true,
            organizationName: true,
          },
        },
      },
    });

    if (!device) {
      throw new Error('Device not found or access denied');
    }

    // Get latest telemetry
    const latestTelemetry = await this.prisma.telemetryEvent.findFirst({
      where: { deviceId },
      orderBy: { time: 'desc' },
    });

    // Get active alarms (simplified - just empty for now)
    const activeAlarms: any[] = [];

    return {
      device: {
        id: device.id,
        code: device.deviceCode,
        name: device.deviceName,
        isActive: device.isActive,
        client: device.client,
      },
      telemetry: latestTelemetry,
      alarms: activeAlarms,
      isOnline: latestTelemetry && 
        new Date().getTime() - new Date(latestTelemetry.time).getTime() < 5 * 60 * 1000,
    };
  }

  // Get multi-device status (simplified)
  async getMultiDeviceStatus(clientId: string, userId: string) {
    // Verify user access
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        client: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin' && user.clientId !== clientId) {
      throw new Error('Access denied to client data');
    }

    // Get client devices with their latest telemetry
    const devices = await this.prisma.device.findMany({
      where: { clientId },
      include: {
        telemetryEvents: {
          orderBy: { time: 'desc' },
          take: 1,
        },
      },
    });

    return devices.map(device => {
      const latestTelemetry = device.telemetryEvents[0];
      const isOnline = latestTelemetry && 
        new Date().getTime() - new Date(latestTelemetry.time).getTime() < 5 * 60 * 1000;

      return {
        id: device.id,
        code: device.deviceCode,
        name: device.deviceName,
        isActive: device.isActive,
        isOnline,
        telemetry: latestTelemetry,
        activeAlarms: 0, // Simplified
        criticalAlarms: 0, // Simplified
      };
    });
  }

  // Broadcast command status update to connected clients
  async broadcastCommandStatusUpdate(commandStatusData: {
    deviceId: string;
    commandId: string;
    status: string;
    message?: string;
    timestamp: string;
    executionData?: any;
  }) {
    if (!this.gateway) {
      throw new Error('WebSocket gateway not initialized');
    }

    try {
      // Get device information for client identification
      const device = await this.prisma.device.findUnique({
        where: { id: commandStatusData.deviceId },
        include: {
          client: {
            select: {
              id: true,
              organizationName: true,
            },
          },
        },
      });

      if (!device) {
        throw new Error('Device not found');
      }

      // Prepare broadcast data
      const broadcastData = {
        type: 'commandStatus',
        deviceId: commandStatusData.deviceId,
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        commandId: commandStatusData.commandId,
        status: commandStatusData.status,
        message: commandStatusData.message,
        timestamp: commandStatusData.timestamp,
        executionData: commandStatusData.executionData,
        clientId: device.clientId,
      };

      // Broadcast to different rooms based on permissions
      
      // 1. Broadcast to admin room (super_user, admin can see all devices)
      this.gateway.broadcastToRoom('admin', 'command-status-update', broadcastData);

      // 2. Broadcast to specific client room (client users can see their devices)
      if (device.clientId) {
        this.gateway.broadcastToRoom(`client-${device.clientId}`, 'command-status-update', broadcastData);
      }

      // 3. Broadcast to specific device room (device-specific monitoring)
      this.gateway.broadcastToRoom(`device-${commandStatusData.deviceId}`, 'command-status-update', broadcastData);

      console.log(`Command status update broadcast for device ${device.deviceCode}, command ${commandStatusData.commandId}, status: ${commandStatusData.status}`);

      return {
        success: true,
        message: 'Command status update broadcast successfully',
        broadcastData,
      };

    } catch (error) {
      console.error('Failed to broadcast command status update:', error);
      throw new Error(`Failed to broadcast command status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get connection statistics
  getConnectionStats() {
    if (!this.gateway) {
      return { connectedClients: 0, error: 'Gateway not initialized' };
    }

    return {
      connectedClients: this.gateway.getConnectedClientInfo().length,
      clientInfo: this.gateway.getConnectedClientInfo(),
    };
  }
}