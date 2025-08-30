// src/modules/payment/services/device-control.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DeviceControlService {
  private readonly logger = new Logger(DeviceControlService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create shutdown command in database
   * The MQTT ingestion service will pick this up and send to the device
   */
  async shutdownDevice(
    device: any,
    reason: string,
    requestedBy: string = 'system',
  ): Promise<string> {
    try {
      const command = await this.prisma.controlCommand.create({
        data: {
          deviceId: device.id,
          commandType: 'CREDIT_SHUTDOWN',
          payload: {
            reason,
            automatic: true,
            timestamp: new Date(),
          },
          status: 'PENDING',
          requestedBy,
          maxRetries: 3,
        },
      });

      this.logger.log(
        `Shutdown command created for device ${device.deviceCode} (${command.id})`,
      );

      return command.id;
    } catch (error) {
      this.logger.error(`Failed to shutdown device ${device.deviceCode}`, error);
      throw error;
    }
  }

  /**
   * Create turn-on command in database
   */
  async turnOnDevice(
    device: any,
    reason: string,
    requestedBy: string = 'system',
  ): Promise<string> {
    try {
      const command = await this.prisma.controlCommand.create({
        data: {
          deviceId: device.id,
          commandType: 'CREDIT_REACTIVATION',
          payload: {
            reason,
            automatic: true,
            timestamp: new Date(),
          },
          status: 'PENDING',
          requestedBy,
          maxRetries: 3,
        },
      });

      this.logger.log(
        `Turn-on command created for device ${device.deviceCode} (${command.id})`,
      );

      return command.id;
    } catch (error) {
      this.logger.error(`Failed to turn on device ${device.deviceCode}`, error);
      throw error;
    }
  }

  /**
   * Create any device command in database
   */
  async sendDeviceCommand(
    deviceId: string,
    commandType: string,
    action: string,
    payload?: any,
    requestedBy: string = 'system',
  ): Promise<string> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (!device) {
        throw new Error('Device not found');
      }

      const command = await this.prisma.controlCommand.create({
        data: {
          deviceId: device.id,
          commandType,
          payload: {
            ...payload,
            action,
            timestamp: new Date(),
          },
          status: 'PENDING',
          requestedBy,
          maxRetries: 3,
        },
      });

      this.logger.log(
        `Command ${commandType} created for device ${device.deviceCode} (${command.id})`,
      );

      return command.id;
    } catch (error) {
      this.logger.error(`Failed to send command to device ${deviceId}`, error);
      throw error;
    }
  }

  /**
   * Get command status
   */
  async getCommandStatus(commandId: string) {
    return this.prisma.controlCommand.findUnique({
      where: { id: commandId },
      include: {
        acknowledgments: true,
      },
    });
  }

  /**
   * Batch shutdown all devices for a client
   */
  async shutdownAllClientDevices(clientId: string, reason: string) {
    const devices = await this.prisma.device.findMany({
      where: {
        clientId,
        isActive: true,
      },
    });

    const commandIds = [];

    for (const device of devices) {
      try {
        const commandId = await this.shutdownDevice(device, reason);
        commandIds.push({ deviceId: device.id, commandId, status: 'created' });
      } catch (error: any) {
        commandIds.push({ deviceId: device.id, error: error.message, status: 'failed' });
      }
    }

    return {
      clientId,
      devicesAffected: devices.length,
      commands: commandIds,
    };
  }

  /**
   * Batch turn on all devices for a client
   */
  async turnOnAllClientDevices(clientId: string, reason: string) {
    const devices = await this.prisma.device.findMany({
      where: {
        clientId,
        isActive: true,
      },
    });

    const commandIds = [];

    for (const device of devices) {
      try {
        const commandId = await this.turnOnDevice(device, reason);
        commandIds.push({ deviceId: device.id, commandId, status: 'created' });
      } catch (error: any) {
        commandIds.push({ deviceId: device.id, error: error.message, status: 'failed' });
      }
    }

    return {
      clientId,
      devicesAffected: devices.length,
      commands: commandIds,
    };
  }
}