// src/modules/telemetry/device-metadata-context.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';

export interface DeviceMetadata {
  deviceName: string;
  deviceCode: string;
  deviceType: string;
  installationDate?: Date;
  commissioningDate?: Date;
  contractReference?: string;
  components: any;
  pumpDetails?: any;
  isActive: boolean;
  [key: string]: any; // Additional metadata fields
}

export interface MetadataSnapshot {
  deviceId: string;
  version: number;
  configurationHash: string;
  metadataSnapshot: DeviceMetadata;
  validFrom: Date;
  validUntil?: Date;
}

@Injectable()
export class DeviceMetadataContextService {
  private readonly logger = new Logger(DeviceMetadataContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new metadata snapshot when device configuration changes
   */
  async createMetadataSnapshot(deviceId: string, metadata: DeviceMetadata): Promise<string> {
    try {
      // Calculate configuration hash
      const configurationHash = this.calculateConfigurationHash(metadata);

      // Check if this exact configuration already exists
      const existingSnapshot = await this.prisma.deviceMetadataSnapshot.findFirst({
        where: {
          deviceId,
          configurationHash,
          validUntil: null, // Current active configuration
        },
      });

      if (existingSnapshot) {
        this.logger.debug(`Configuration hash ${configurationHash} already exists for device ${deviceId}`);
        return existingSnapshot.configurationHash;
      }

      // Mark previous snapshot as no longer current
      await this.prisma.deviceMetadataSnapshot.updateMany({
        where: {
          deviceId,
          validUntil: null,
        },
        data: {
          validUntil: new Date(),
        },
      });

      // Get next version number
      const latestSnapshot = await this.prisma.deviceMetadataSnapshot.findFirst({
        where: { deviceId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      const nextVersion = (latestSnapshot?.version || 0) + 1;

      // Create new snapshot
      const newSnapshot = await this.prisma.deviceMetadataSnapshot.create({
        data: {
          deviceId,
          version: nextVersion,
          configurationHash,
          metadataSnapshot: metadata,
          validFrom: new Date(),
        },
      });

      this.logger.log(`Created metadata snapshot version ${nextVersion} for device ${deviceId}`);
      return newSnapshot.configurationHash;
    } catch (error) {
      this.logger.error(`Failed to create metadata snapshot for device ${deviceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get the current device metadata snapshot for telemetry context
   */
  async getCurrentMetadataSnapshot(deviceId: string): Promise<MetadataSnapshot | null> {
    try {
      const snapshot = await this.prisma.deviceMetadataSnapshot.findFirst({
        where: {
          deviceId,
          validUntil: null, // Current active configuration
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (!snapshot) {
        // Create initial snapshot from device data
        const device = await this.prisma.device.findUnique({
          where: { id: deviceId },
        });

        if (device) {
          const metadata: DeviceMetadata = {
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

          const configurationHash = await this.createMetadataSnapshot(deviceId, metadata);
          
          return {
            deviceId,
            version: 1,
            configurationHash,
            metadataSnapshot: metadata,
            validFrom: new Date(),
          };
        }

        return null;
      }

      return {
        deviceId: snapshot.deviceId,
        version: snapshot.version,
        configurationHash: snapshot.configurationHash,
        metadataSnapshot: snapshot.metadataSnapshot as DeviceMetadata,
        validFrom: snapshot.validFrom,
        validUntil: snapshot.validUntil,
      };
    } catch (error) {
      this.logger.error(`Failed to get current metadata snapshot for device ${deviceId}:`, error.message);
      return null;
    }
  }

  /**
   * Get metadata snapshot valid at a specific time for historical telemetry
   */
  async getMetadataSnapshotAtTime(deviceId: string, timestamp: Date): Promise<MetadataSnapshot | null> {
    try {
      const snapshot = await this.prisma.deviceMetadataSnapshot.findFirst({
        where: {
          deviceId,
          validFrom: { lte: timestamp },
          OR: [
            { validUntil: null },
            { validUntil: { gte: timestamp } },
          ],
        },
        orderBy: {
          version: 'desc',
        },
      });

      if (!snapshot) {
        return null;
      }

      return {
        deviceId: snapshot.deviceId,
        version: snapshot.version,
        configurationHash: snapshot.configurationHash,
        metadataSnapshot: snapshot.metadataSnapshot as DeviceMetadata,
        validFrom: snapshot.validFrom,
        validUntil: snapshot.validUntil,
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata snapshot at time ${timestamp} for device ${deviceId}:`, error.message);
      return null;
    }
  }

  /**
   * Update unknown field catalog with device context
   */
  async updateUnknownFieldContext(fieldName: string, deviceId: string, metadata: DeviceMetadata): Promise<void> {
    try {
      const configurationHash = this.calculateConfigurationHash(metadata);

      // Get or create unknown field catalog entry
      const existingField = await this.prisma.unknownFieldCatalog.findUnique({
        where: { fieldName },
      });

      if (existingField) {
        // Update existing field with device context
        const deviceContexts = (existingField.deviceContexts as any[]) || [];
        const affectedDevices = existingField.affectedDevices || [];
        const configurationHashes = existingField.configurationHashes || [];

        // Add new device context if not already present
        const existingContext = deviceContexts.find((ctx: any) => 
          ctx.deviceId === deviceId && ctx.configurationHash === configurationHash
        );

        if (!existingContext) {
          deviceContexts.push({
            deviceId,
            configurationHash,
            deviceMetadata: metadata,
            firstSeen: new Date(),
          });
        }

        // Update arrays with unique values
        const uniqueDevices = [...new Set([...affectedDevices, deviceId])];
        const uniqueHashes = [...new Set([...configurationHashes, configurationHash])];

        await this.prisma.unknownFieldCatalog.update({
          where: { fieldName },
          data: {
            lastSeen: new Date(),
            occurrenceCount: { increment: 1 },
            deviceContexts: deviceContexts,
            affectedDevices: uniqueDevices,
            configurationHashes: uniqueHashes,
          },
        });
      } else {
        // Create new field catalog entry with device context
        await this.prisma.unknownFieldCatalog.create({
          data: {
            fieldName,
            deviceContexts: [
              {
                deviceId,
                configurationHash,
                deviceMetadata: metadata,
                firstSeen: new Date(),
              },
            ],
            affectedDevices: [deviceId],
            configurationHashes: [configurationHash],
          },
        });
      }

      this.logger.debug(`Updated unknown field ${fieldName} context for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to update unknown field ${fieldName} context:`, error.message);
    }
  }

  /**
   * Get devices grouped by configuration hash for analysis
   */
  async getDevicesByConfiguration(): Promise<{
    configurationHash: string;
    devices: string[];
    metadataSnapshot: DeviceMetadata;
    version: number;
    count: number;
  }[]> {
    try {
      const snapshots = await this.prisma.deviceMetadataSnapshot.findMany({
        where: {
          validUntil: null, // Only current configurations
        },
        select: {
          deviceId: true,
          configurationHash: true,
          metadataSnapshot: true,
          version: true,
        },
      });

      // Group by configuration hash
      const grouped = snapshots.reduce((acc, snapshot) => {
        const hash = snapshot.configurationHash;
        if (!acc[hash]) {
          acc[hash] = {
            configurationHash: hash,
            devices: [],
            metadataSnapshot: snapshot.metadataSnapshot as DeviceMetadata,
            version: snapshot.version,
            count: 0,
          };
        }
        acc[hash].devices.push(snapshot.deviceId);
        acc[hash].count++;
        return acc;
      }, {} as Record<string, any>);

      return Object.values(grouped);
    } catch (error) {
      this.logger.error('Failed to get devices by configuration:', error.message);
      return [];
    }
  }

  /**
   * Filter telemetry events by device configuration
   */
  async filterTelemetryByConfiguration(
    filters: {
      configurationHash?: string;
      deviceType?: string;
      installationDateAfter?: Date;
      installationDateBefore?: Date;
      contractReference?: string;
      components?: Record<string, any>;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    try {
      const whereClause: any = {};

      // Time range filter
      if (filters.startDate || filters.endDate) {
        whereClause.time = {};
        if (filters.startDate) whereClause.time.gte = filters.startDate;
        if (filters.endDate) whereClause.time.lte = filters.endDate;
      }

      // Configuration hash filter
      if (filters.configurationHash) {
        whereClause.configurationHash = filters.configurationHash;
      }

      // Metadata-based filters through JSON queries
      const metadataFilters: any[] = [];

      if (filters.deviceType) {
        metadataFilters.push({
          deviceMetadataSnapshot: {
            path: ['deviceType'],
            equals: filters.deviceType,
          },
        });
      }

      if (filters.contractReference) {
        metadataFilters.push({
          deviceMetadataSnapshot: {
            path: ['contractReference'],
            equals: filters.contractReference,
          },
        });
      }

      if (filters.installationDateAfter) {
        metadataFilters.push({
          deviceMetadataSnapshot: {
            path: ['installationDate'],
            gte: filters.installationDateAfter.toISOString(),
          },
        });
      }

      if (filters.installationDateBefore) {
        metadataFilters.push({
          deviceMetadataSnapshot: {
            path: ['installationDate'],
            lte: filters.installationDateBefore.toISOString(),
          },
        });
      }

      if (filters.components) {
        Object.entries(filters.components).forEach(([key, value]) => {
          metadataFilters.push({
            deviceMetadataSnapshot: {
              path: ['components', key],
              equals: value,
            },
          });
        });
      }

      if (metadataFilters.length > 0) {
        whereClause.AND = metadataFilters;
      }

      const telemetryEvents = await this.prisma.telemetryEvent.findMany({
        where: whereClause,
        include: {
          device: {
            select: {
              deviceName: true,
              deviceCode: true,
              clientId: true,
            },
          },
        },
        orderBy: {
          time: 'desc',
        },
      });

      return telemetryEvents;
    } catch (error) {
      this.logger.error('Failed to filter telemetry by configuration:', error.message);
      return [];
    }
  }

  /**
   * Get metadata change impact analysis
   */
  async getMetadataChangeImpact(deviceId: string, fromDate?: Date, toDate?: Date): Promise<{
    configurationChanges: number;
    telemetryAffected: number;
    performanceCorrelation: any[];
  }> {
    try {
      const whereClause: any = { deviceId };
      if (fromDate || toDate) {
        whereClause.validFrom = {};
        if (fromDate) whereClause.validFrom.gte = fromDate;
        if (toDate) whereClause.validFrom.lte = toDate;
      }

      // Get configuration changes
      const snapshots = await this.prisma.deviceMetadataSnapshot.findMany({
        where: whereClause,
        orderBy: { validFrom: 'asc' },
      });

      // Count affected telemetry events
      const telemetryCount = await this.prisma.telemetryEvent.count({
        where: {
          deviceId,
          ...(fromDate && { time: { gte: fromDate } }),
          ...(toDate && { time: { lte: toDate } }),
        },
      });

      // Analyze performance correlation (simplified)
      const performanceCorrelation = await Promise.all(
        snapshots.map(async (snapshot) => {
          const telemetryInPeriod = await this.prisma.telemetryEvent.findMany({
            where: {
              deviceId,
              configurationHash: snapshot.configurationHash,
              time: {
                gte: snapshot.validFrom,
                ...(snapshot.validUntil && { lte: snapshot.validUntil }),
              },
            },
            select: {
              totalEnergyValue: true,
              pumpPowerValue: true,
              pumpEnergyConsumptionValue: true,
            },
          });

          const avgPower = telemetryInPeriod.reduce((sum, t) => sum + (t.pumpPowerValue || 0), 0) / telemetryInPeriod.length;
          const avgEnergy = telemetryInPeriod.reduce((sum, t) => sum + (t.pumpEnergyConsumptionValue || 0), 0) / telemetryInPeriod.length;

          return {
            configurationHash: snapshot.configurationHash,
            version: snapshot.version,
            validFrom: snapshot.validFrom,
            validUntil: snapshot.validUntil,
            telemetryPoints: telemetryInPeriod.length,
            averagePower: avgPower || 0,
            averageEnergy: avgEnergy || 0,
          };
        })
      );

      return {
        configurationChanges: snapshots.length,
        telemetryAffected: telemetryCount,
        performanceCorrelation,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze metadata change impact for device ${deviceId}:`, error.message);
      return {
        configurationChanges: 0,
        telemetryAffected: 0,
        performanceCorrelation: [],
      };
    }
  }

  /**
   * Calculate SHA256 hash of device configuration for quick comparison
   */
  private calculateConfigurationHash(metadata: DeviceMetadata): string {
    const configString = JSON.stringify(metadata, Object.keys(metadata).sort());
    return crypto.createHash('sha256').update(configString).digest('hex').substring(0, 16);
  }

  /**
   * Get configuration differences between two snapshots
   */
  async getConfigurationDiff(hash1: string, hash2: string): Promise<{
    added: Record<string, any>;
    removed: Record<string, any>;
    modified: Record<string, { old: any; new: any }>;
  }> {
    try {
      const [snapshot1, snapshot2] = await Promise.all([
        this.prisma.deviceMetadataSnapshot.findFirst({ where: { configurationHash: hash1 } }),
        this.prisma.deviceMetadataSnapshot.findFirst({ where: { configurationHash: hash2 } }),
      ]);

      if (!snapshot1 || !snapshot2) {
        return { added: {}, removed: {}, modified: {} };
      }

      const config1 = snapshot1.metadataSnapshot as Record<string, any>;
      const config2 = snapshot2.metadataSnapshot as Record<string, any>;

      const added: Record<string, any> = {};
      const removed: Record<string, any> = {};
      const modified: Record<string, { old: any; new: any }> = {};

      // Find added and modified
      Object.keys(config2).forEach(key => {
        if (!(key in config1)) {
          added[key] = config2[key];
        } else if (JSON.stringify(config1[key]) !== JSON.stringify(config2[key])) {
          modified[key] = { old: config1[key], new: config2[key] };
        }
      });

      // Find removed
      Object.keys(config1).forEach(key => {
        if (!(key in config2)) {
          removed[key] = config1[key];
        }
      });

      return { added, removed, modified };
    } catch (error) {
      this.logger.error(`Failed to get configuration diff between ${hash1} and ${hash2}:`, error.message);
      return { added: {}, removed: {}, modified: {} };
    }
  }
}