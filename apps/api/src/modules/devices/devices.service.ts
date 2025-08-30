import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDeviceDto, UpdateDeviceDto, CreateDeviceLocationDto, DeviceQueryDto, SendCommandDto } from '../../common/dto/device.dto';
import { DeviceMetadataContextService } from '../telemetry/device-metadata-context.service';
import { Prisma } from '@prisma/client';
import * as mqtt from 'mqtt';

@Injectable()
export class DevicesService {
  private mqttClient: mqtt.MqttClient | null = null;

  constructor(
    private prisma: PrismaService,
    private metadataContextService: DeviceMetadataContextService
  ) {
    this.initializeMQTTClient();
  }

  private initializeMQTTClient(): void {
    try {
      const brokerUrl = `mqtt://${process.env.MQTT_BROKER_HOST || 'localhost'}:${process.env.MQTT_BROKER_PORT || '1883'}`;
      
      this.mqttClient = mqtt.connect(brokerUrl, {
        username: process.env.MQTT_USERNAME || 'lifebox_ingestion',
        password: process.env.MQTT_PASSWORD,
        clientId: `lifebox-api-commands-${process.pid}`,
        keepalive: 60,
        reconnectPeriod: 5000,
        connectTimeout: 30 * 1000,
        clean: true,
      });

      this.mqttClient.on('connect', () => {
        console.log('Device service connected to MQTT broker for commands');
      });

      this.mqttClient.on('error', (error) => {
        console.error('Device service MQTT connection error:', error);
      });

    } catch (error) {
      console.error('Failed to initialize MQTT client in DevicesService:', error);
    }
  }

  async create(createDeviceDto: CreateDeviceDto, userId: string) {
    // Check if device codes are unique
    const existingDevice = await this.prisma.device.findFirst({
      where: {
        OR: [
          { deviceCode: createDeviceDto.deviceCode },
          { lifeboxCode: createDeviceDto.lifeboxCode },
          { seitechDeviceId: createDeviceDto.seitechDeviceId },
        ],
      },
    });

    if (existingDevice) {
      throw new BadRequestException('Device with this code already exists');
    }

    // Check if client exists
    const client = await this.prisma.client.findUnique({
      where: { id: createDeviceDto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const device = await this.prisma.device.create({
      data: {
        ...createDeviceDto,
        createdBy: userId,
        installationDate: createDeviceDto.installationDate ? new Date(createDeviceDto.installationDate) : null,
        commissioningDate: createDeviceDto.commissioningDate ? new Date(createDeviceDto.commissioningDate) : null,
        warrantyEndDate: createDeviceDto.warrantyEndDate ? new Date(createDeviceDto.warrantyEndDate) : null,
      },
      include: {
        client: true,
        locations: {
          where: { validTo: null },
          take: 1,
        },
      },
    });

    // Create initial metadata snapshot for the new device
    try {
      const metadata = {
        deviceName: device.deviceName,
        deviceCode: device.deviceCode,
        deviceType: device.deviceType,
        installationDate: device.installationDate,
        commissioningDate: device.commissioningDate,
        contractReference: device.contractReference,
        components: device.components,
        pumpDetails: device.pumpDetails,
        isActive: device.isActive,
      };
      
      await this.metadataContextService.createMetadataSnapshot(device.id, metadata);
    } catch (error) {
      // Log error but don't fail device creation
      console.error(`Failed to create initial metadata snapshot for device ${device.id}:`, error.message);
    }

    return device;
  }

  async findAll(query: DeviceQueryDto) {
    const { search, clientId, isActive, deviceType, page = 1, limit = 10 } = query;
    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { deviceName: { contains: search, mode: 'insensitive' } },
        { deviceCode: { contains: search, mode: 'insensitive' } },
        { lifeboxCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (clientId) where.clientId = clientId;
    if (isActive !== undefined) where.isActive = isActive;
    if (deviceType) where.deviceType = deviceType;

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          client: true,
          locations: {
            where: { validTo: null },
            take: 1,
          },
          _count: {
            select: {
              telemetryEvents: true,
              alarmEvents: true,
              commands: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      devices: devices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        client: true,
        locations: {
          orderBy: { validFrom: 'desc' },
          take: 5,
        },
        telemetryEvents: {
          orderBy: { time: 'desc' },
          take: 1,
        },
        alarmEvents: {
          where: { resolvedAt: null },
        },
        _count: {
          select: {
            telemetryEvents: true,
            alarmEvents: true,
            commands: true,
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Get latest telemetry summary
    const latestTelemetry = device.telemetryEvents[0] || null;
    
    return {
      ...device,
      status: this.calculateDeviceStatus(device, latestTelemetry),
      currentLocation: device.locations.find(l => !l.validTo) || null,
    };
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto, userId: string) {
    const device = await this.findOne(id);

    // Track metadata changes
    const changes = [];
    for (const [key, value] of Object.entries(updateDeviceDto)) {
      if (device[key] !== value) {
        changes.push({
          deviceId: id,
          fieldName: key,
          oldValue: String(device[key]),
          newValue: String(value),
          changedBy: userId,
        });
      }
    }

    // Update device
    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        ...updateDeviceDto,
        installationDate: updateDeviceDto.installationDate ? new Date(updateDeviceDto.installationDate) : undefined,
        commissioningDate: updateDeviceDto.commissioningDate ? new Date(updateDeviceDto.commissioningDate) : undefined,
        warrantyEndDate: updateDeviceDto.warrantyEndDate ? new Date(updateDeviceDto.warrantyEndDate) : undefined,
      },
      include: {
        client: true,
        locations: {
          where: { validTo: null },
          take: 1,
        },
      },
    });

    // Save metadata history
    if (changes.length > 0) {
      await this.prisma.deviceMetadataHistory.createMany({
        data: changes,
      });

      // Create new metadata snapshot for significant changes
      try {
        const metadata = {
          deviceName: updated.deviceName,
          deviceCode: updated.deviceCode,
          deviceType: updated.deviceType,
          installationDate: updated.installationDate,
          commissioningDate: updated.commissioningDate,
          contractReference: updated.contractReference,
          components: updated.components,
          pumpDetails: updated.pumpDetails,
          isActive: updated.isActive,
        };
        
        await this.metadataContextService.createMetadataSnapshot(updated.id, metadata);
      } catch (error) {
        // Log error but don't fail device update
        console.error(`Failed to create metadata snapshot for device ${updated.id} after update:`, error.message);
      }
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete
    await this.prisma.device.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Device deactivated successfully' };
  }

  async updateLocation(id: string, locationDto: CreateDeviceLocationDto) {
    await this.findOne(id);

    // Invalidate current location
    await this.prisma.deviceLocation.updateMany({
      where: {
        deviceId: id,
        validTo: null,
      },
      data: {
        validTo: new Date(),
      },
    });

    // Create new location
    const location = await this.prisma.deviceLocation.create({
      data: {
        deviceId: id,
        ...locationDto,
      },
    });

    return location;
  }

  async sendCommand(id: string, commandDto: SendCommandDto, userId: string) {
    const device = await this.findOne(id);

    if (!device.isActive) {
      throw new BadRequestException('Cannot send commands to inactive device');
    }

    // Create command record
    const command = await this.prisma.controlCommand.create({
      data: {
        deviceId: id,
        commandType: commandDto.commandType,
        payload: {
          ...commandDto.payload,
          action: commandDto.action,
          parameters: commandDto.parameters,
          priority: commandDto.priority || 'MEDIUM',
          expiresAt: commandDto.expiresAt
        },
        status: 'pending',
        requestedBy: userId,
      },
    });

    try {
      // Send command via MQTT to the command processing service
      const mqttCommand = {
        commandId: command.id,
        deviceId: device.lifeboxCode, // Use lifebox code as device identifier
        type: commandDto.commandType,
        action: commandDto.action,
        parameters: commandDto.parameters,
        payload: commandDto.payload,
        timestamp: new Date().toISOString(),
        priority: commandDto.priority || 'MEDIUM',
        expiresAt: commandDto.expiresAt
      };

      if (this.mqttClient?.connected) {
        // Send to MQTT ingestion service for processing
        await new Promise<void>((resolve, reject) => {
          this.mqttClient!.publish('platform/commands/queue', JSON.stringify(mqttCommand), { qos: 1 }, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });

        // Update command status to 'sent'
        await this.prisma.controlCommand.update({
          where: { id: command.id },
          data: { status: 'sent', sentAt: new Date() }
        });

        return {
          commandId: command.id,
          status: 'sent',
          message: 'Command sent to device via MQTT',
        };
      } else {
        throw new Error('MQTT client not connected');
      }
    } catch (error) {
      // Update command status to 'failed'
      await this.prisma.controlCommand.update({
        where: { id: command.id },
        data: { 
          status: 'failed', 
          errorMessage: error instanceof Error ? error.message : 'Unknown MQTT error'
        }
      });

      throw new BadRequestException(`Failed to send command: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCommandHistory(deviceId: string, query: any = {}) {
    await this.findOne(deviceId); // Verify device exists

    const { page = 1, limit = 20, status } = query;
    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const where: any = { deviceId };
    if (status) {
      where.status = status;
    }

    const [commands, total] = await Promise.all([
      this.prisma.controlCommand.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: offset,
        take: limitNum,
        include: {
          user: {
            select: { fullName: true, email: true }
          }
        }
      }),
      this.prisma.controlCommand.count({ where })
    ]);

    return {
      commands,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  async getCommandDetails(deviceId: string, commandId: string) {
    await this.findOne(deviceId); // Verify device exists

    const command = await this.prisma.controlCommand.findFirst({
      where: { 
        id: commandId, 
        deviceId 
      },
      include: {
        user: {
          select: { fullName: true, email: true }
        },
        acknowledgments: {
          orderBy: { receivedAt: 'desc' }
        }
      }
    });

    if (!command) {
      throw new NotFoundException('Command not found');
    }

    return command;
  }

  async updateCommandStatus(deviceId: string, commandId: string, statusUpdate: any) {
    await this.findOne(deviceId); // Verify device exists

    const command = await this.prisma.controlCommand.findFirst({
      where: { 
        id: commandId, 
        deviceId 
      }
    });

    if (!command) {
      throw new NotFoundException('Command not found');
    }

    // Update command status
    const updatedCommand = await this.prisma.controlCommand.update({
      where: { id: commandId },
      data: {
        status: statusUpdate.status,
        acknowledgedAt: statusUpdate.acknowledgedAt ? new Date(statusUpdate.acknowledgedAt) : undefined,
        completedAt: statusUpdate.status === 'COMPLETED' ? new Date() : undefined,
        errorMessage: statusUpdate.message || statusUpdate.errorMessage
      }
    });

    // Create acknowledgment record if provided
    if (statusUpdate.status && statusUpdate.acknowledgedAt) {
      await this.prisma.commandAcknowledgment.create({
        data: {
          commandId,
          status: statusUpdate.status,
          message: statusUpdate.message || '',
          receivedAt: new Date(statusUpdate.acknowledgedAt)
        }
      });
    }

    return updatedCommand;
  }

  async getDeviceStats(id: string) {
    const device = await this.findOne(id);

    // Get aggregated stats
    const [telemetryStats, alarmStats, commandStats] = await Promise.all([
      // Telemetry stats
      this.prisma.telemetryEvent.aggregate({
        where: { deviceId: id },
        _avg: {
          totalEnergyValue: true,
          pumpPowerValue: true,
          inverterTemperatureValue: true,
        },
        _max: {
          totalEnergyValue: true,
          inverterTemperatureValue: true,
        },
        _count: true,
      }),
      // Alarm stats
      this.prisma.alarmEvent.groupBy({
        by: ['severity'],
        where: { deviceId: id },
        _count: true,
      }),
      // Command stats
      this.prisma.controlCommand.groupBy({
        by: ['status'],
        where: { deviceId: id },
        _count: true,
      }),
    ]);

    return {
      device: {
        id: device.id,
        name: device.deviceName,
        code: device.deviceCode,
      },
      telemetry: telemetryStats,
      alarms: alarmStats,
      commands: commandStats,
    };
  }

  private calculateDeviceStatus(device: any, latestTelemetry: any) {
    if (!device.isActive) return 'inactive';
    if (!latestTelemetry) return 'unknown';

    const lastSeen = new Date(latestTelemetry.time);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'warning';
    return 'offline';
  }
}
