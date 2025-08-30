import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TelemetryQueryDto, CreateTelemetryDto, WaterVolumeQueryDto, TimeInterval } from '../../common/dto/telemetry.dto';
import { DeviceMetadataContextService } from './device-metadata-context.service';
import { AlarmProcessorService } from '../alarms/alarm-processor.service';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    private prisma: PrismaService,
    private metadataContextService: DeviceMetadataContextService,
    private alarmProcessor: AlarmProcessorService,
  ) {}

  async create(deviceId: string, createTelemetryDto: CreateTelemetryDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const waterVolume = this.calculateWaterVolume(
      createTelemetryDto.pumpPowerValue,
      createTelemetryDto.frequencyValue,
      device.pumpDetails as any
    );

    // Use new inverter supply source field for AC source detection
    const acSource = createTelemetryDto.inverterSupplySourceValue || 
      this.detectAcSource(createTelemetryDto.busVoltageValue, createTelemetryDto.frequencyValue);

    // Get current device metadata snapshot for telemetry context
    const metadataSnapshot = await this.metadataContextService.getCurrentMetadataSnapshot(deviceId);
    
    const telemetry = await this.prisma.telemetryEvent.create({
      data: {
        deviceId,
        time: new Date(createTelemetryDto.time),
        ...createTelemetryDto,
        // Store water volume calculation (legacy field support)
        totalWaterVolumeM3Value: waterVolume,
        // Add metadata context fields
        deviceMetadataSnapshot: metadataSnapshot?.metadataSnapshot || null,
        metadataVersion: metadataSnapshot?.version || null,
        configurationHash: metadataSnapshot?.configurationHash || null,
      },
    });
    
    // Process any unknown fields for context tracking
    await this.processUnknownFields(createTelemetryDto, deviceId, metadataSnapshot?.metadataSnapshot);

    // Process telemetry data for alarm checking (async, don't wait)
    this.processAlarmsAsync(deviceId, createTelemetryDto, new Date(createTelemetryDto.time));

    return telemetry;
  }

  async findAll(deviceId: string, query: TelemetryQueryDto) {
    const { startDate, endDate, interval, limit, metrics } = query;

    const where: any = {
      deviceId,
    };

    if (startDate || endDate) {
      where.time = {};
      if (startDate) where.time.gte = new Date(startDate);
      if (endDate) where.time.lte = new Date(endDate);
    }

    if (interval === TimeInterval.RAW) {
      const data = await this.prisma.telemetryEvent.findMany({
        where,
        orderBy: { time: 'desc' },
        take: limit,
        select: this.buildSelectObject(metrics),
      });

      return { data, interval: 'raw' };
    }

    const aggregatedData = await this.aggregateTelemetry(deviceId, where, interval);
    
    return {
      data: aggregatedData,
      interval,
    };
  }

  async findLatest(deviceId: string) {
    const latest = await this.prisma.telemetryEvent.findFirst({
      where: { deviceId },
      orderBy: { time: 'desc' },
    });

    if (!latest) {
      throw new NotFoundException('No telemetry data found for this device');
    }

    return latest;
  }

  async getStatistics(deviceId: string, startDate?: string, endDate?: string) {
    const where: any = {
      deviceId,
    };

    if (startDate || endDate) {
      where.time = {};
      if (startDate) where.time.gte = new Date(startDate);
      if (endDate) where.time.lte = new Date(endDate);
    }

    const [stats, uptime, lastTelemetry] = await Promise.all([
      this.prisma.telemetryEvent.aggregate({
        where,
        _avg: {
          pumpPowerValue: true,
          inverterTemperatureValue: true,
        },
        _sum: {
          energyPerDayValue: true,
          totalWaterVolumeM3Value: true,
        },
        _max: {
          totalEnergyValue: true,
        },
      }),
      this.calculateUptime(deviceId, where),
      this.prisma.telemetryEvent.findFirst({
        where: { deviceId },
        orderBy: { time: 'desc' },
        select: { time: true },
      }),
    ]);

    return {
      totalEnergy: stats._max?.totalEnergyValue || 0,
      averagePower: stats._avg?.pumpPowerValue || 0,
      totalWaterVolume: stats._sum?.totalWaterVolumeM3Value || 0,
      averageTemperature: stats._avg?.inverterTemperatureValue || 0,
      uptime,
      lastSeen: lastTelemetry?.time || null,
    };
  }

  async getWaterVolume(deviceId: string, query: WaterVolumeQueryDto) {
    const { startDate, endDate, groupBy } = query;

    const telemetryData = await this.prisma.$queryRaw`
      SELECT 
        date_trunc(${groupBy}, time) as period,
        SUM(water_volume_m3) as total_volume,
        AVG(pump_power_kw) as avg_power,
        AVG(frequency_hz) as avg_frequency
      FROM telemetry_events
      WHERE device_id = ${deviceId}::uuid
        AND time >= ${new Date(startDate)}
        AND time <= ${new Date(endDate)}
        AND water_volume_m3 IS NOT NULL
      GROUP BY period
      ORDER BY period ASC
    `;

    return telemetryData;
  }

  async getSustainabilityMetrics(deviceId: string, startDate?: string, endDate?: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { client: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const where: any = {
      deviceId,
    };

    if (startDate || endDate) {
      where.time = {};
      if (startDate) where.time.gte = new Date(startDate);
      if (endDate) where.time.lte = new Date(endDate);
    }

    const energyStats = await this.prisma.telemetryEvent.aggregate({
      where,
      _max: {
        totalEnergyValue: true,
      },
      _sum: {
        energyPerDayValue: true,
      },
    });

    const totalEnergyMwh = (energyStats._max?.totalEnergyValue || 0) / 1000;
    
    const co2Factor = device.client.replacingSource === 'diesel' ? 0.865 : 0.525;
    const co2Mitigated = totalEnergyMwh * co2Factor;

    const electricityRate = Number(device.client.electricityRateEgp) || 2.15;
    const totalEnergyKwh = totalEnergyMwh * 1000;
    const moneySavedEgp = totalEnergyKwh * electricityRate;
    const moneySavedUsd = moneySavedEgp / 30;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.sustainabilityMetric.upsert({
      where: {
        deviceId_date: {
          deviceId,
          date: today,
        },
      },
      update: {
        totalEnergyMwh,
        co2MitigatedTons: co2Mitigated,
        moneySavedEgp,
        moneySavedUsd,
        calculationMethod: `${device.client.replacingSource}_replacement`,
      },
      create: {
        deviceId,
        date: today,
        totalEnergyMwh,
        co2MitigatedTons: co2Mitigated,
        moneySavedEgp,
        moneySavedUsd,
        calculationMethod: `${device.client.replacingSource}_replacement`,
      },
    });

    return {
      totalEnergyMwh,
      co2MitigatedTons: co2Mitigated,
      moneySavedEgp,
      moneySavedUsd,
      replacingSource: device.client.replacingSource,
      electricityRate,
    };
  }

  private calculateWaterVolume(
    pumpPowerValue?: number,
    frequencyValue?: number,
    pumpDetails?: any
  ): number {
    if (!pumpPowerValue || !frequencyValue || !pumpDetails) return 0;

    const motorEfficiency = 0.85;
    const pumpEfficiency = 0.75;
    const waterDensity = 1000;
    const gravity = 9.81;
    const head = pumpDetails.head || 50;

    const waterVolume = 
      (pumpPowerValue * motorEfficiency * pumpEfficiency * 1000 * 3600) /
      (waterDensity * gravity * head);

    return waterVolume / 3600;
  }

  private detectAcSource(busVoltageValue?: number, frequencyValue?: number): string | null {
    if (!busVoltageValue) return null;

    if (busVoltageValue >= 370 && busVoltageValue <= 380) {
      return 'grid';
    }

    const hour = new Date().getHours();
    if (hour >= 16 && frequencyValue && frequencyValue >= 45 && frequencyValue <= 50) {
      return 'diesel';
    }

    return 'solar';
  }

  private buildSelectObject(metrics?: string) {
    if (!metrics) return undefined;

    const fields = metrics.split(',').map(f => f.trim());
    const select: any = {
      id: true,
      time: true,
      deviceId: true,
    };

    fields.forEach(field => {
      if (field in this.telemetryFields) {
        select[field] = true;
      }
    });

    return select;
  }

  private readonly telemetryFields = {
    totalEnergyValue: true,
    energyPerDayValue: true,
    busVoltageValue: true,
    inverterSupplySourceValue: true,
    pumpPowerValue: true,
    pumpVoltageValue: true,
    pumpCurrentValue: true,
    motorSpeedValue: true,
    frequencyValue: true,
    pumpStatusValue: true,
    inverterStatusValue: true,
    inverterTemperatureValue: true,
    totalWaterVolumeM3Value: true,
  };

  private async aggregateTelemetry(
    deviceId: string,
    where: any,
    interval: TimeInterval
  ) {
    let dateFormat: string;
    
    switch (interval) {
      case TimeInterval.MINUTE:
        dateFormat = 'minute';
        break;
      case TimeInterval.HOUR:
        dateFormat = 'hour';
        break;
      case TimeInterval.DAY:
        dateFormat = 'day';
        break;
      case TimeInterval.WEEK:
        dateFormat = 'week';
        break;
      case TimeInterval.MONTH:
        dateFormat = 'month';
        break;
      default:
        dateFormat = 'hour';
    }

    const whereConditions = [];
    let whereClause = '';
    
    if (where.time?.gte) {
      whereConditions.push(`time >= '${where.time.gte.toISOString()}'`);
    }
    if (where.time?.lte) {
      whereConditions.push(`time <= '${where.time.lte.toISOString()}'`);
    }
    
    if (whereConditions.length > 0) {
      whereClause = `AND ${whereConditions.join(' AND ')}`;
    }

    const aggregatedData = await this.prisma.$queryRaw`
      SELECT 
        date_trunc(${dateFormat}, time) as time,
        AVG(total_energy_mwh) as total_energy_mwh,
        SUM(energy_per_day_kwh) as energy_per_day_kwh,
        AVG(bus_voltage_v) as bus_voltage_v,
        AVG(pump_power_kw) as pump_power_kw,
        AVG(pump_voltage_v) as pump_voltage_v,
        AVG(pump_current_a) as pump_current_a,
        AVG(motor_rpm) as motor_rpm,
        AVG(frequency_hz) as frequency_hz,
        AVG(inverter_temp_c) as inverter_temp_c,
        SUM(water_volume_m3) as water_volume_m3,
        bool_or(inverter_on) as inverter_on,
        bool_or(pump_on) as pump_on,
        COUNT(*) as data_points
      FROM telemetry_events
      WHERE device_id = ${deviceId}::uuid
        ${whereClause}
      ORDER BY time DESC
    `;

    return aggregatedData;
  }

  private async calculateUptime(
    deviceId: string,
    where: any
  ): Promise<number> {
    const telemetryCount = await this.prisma.telemetryEvent.count({
      where: {
        ...where,
        inverterOn: true,
      },
    });

    const totalCount = await this.prisma.telemetryEvent.count({ where });

    return totalCount > 0 ? (telemetryCount / totalCount) * 100 : 0;
  }

  /**
   * Process unknown fields in telemetry data and update their device context
   */
  private async processUnknownFields(
    telemetryData: CreateTelemetryDto,
    deviceId: string,
    deviceMetadata: any
  ): Promise<void> {
    if (!deviceMetadata) return;

    // Get all known telemetry fields
    const knownFields = new Set(Object.keys(this.telemetryFields));
    knownFields.add('time');
    knownFields.add('deviceId');

    // Find unknown fields in the telemetry data
    const unknownFields = Object.keys(telemetryData).filter(
      field => !knownFields.has(field)
    );

    // Update context for each unknown field
    for (const fieldName of unknownFields) {
      try {
        await this.metadataContextService.updateUnknownFieldContext(
          fieldName,
          deviceId,
          deviceMetadata
        );
      } catch (error) {
        // Log error but don't fail the telemetry creation
        console.error(`Failed to update unknown field context for ${fieldName}:`, error.message);
      }
    }
  }

  /**
   * Filter telemetry events by device configuration context
   */
  async filterByConfiguration(filters: {
    configurationHash?: string;
    deviceType?: string;
    installationDateAfter?: Date;
    installationDateBefore?: Date;
    contractReference?: string;
    components?: Record<string, any>;
    startDate?: Date;
    endDate?: Date;
  }) {
    return await this.metadataContextService.filterTelemetryByConfiguration(filters);
  }

  /**
   * Get metadata change impact analysis for a device
   */
  async getMetadataChangeImpact(deviceId: string, fromDate?: Date, toDate?: Date) {
    return await this.metadataContextService.getMetadataChangeImpact(deviceId, fromDate, toDate);
  }

  /**
   * Process alarms for telemetry data (async, non-blocking)
   */
  private async processAlarmsAsync(
    deviceId: string,
    telemetryData: CreateTelemetryDto,
    timestamp: Date
  ): Promise<void> {
    try {
      // Convert telemetry DTO to flat data structure for alarm processing
      const telemetryDataForAlarms = {
        // Standard telemetry fields
        temperature: telemetryData.inverterTemperatureValue,
        voltage: telemetryData.busVoltageValue,
        frequency: telemetryData.frequencyValue,
        power: telemetryData.pumpPowerValue,
        current: telemetryData.pumpCurrentValue,
        inverterTemp: telemetryData.inverterTemperatureValue,
        // Note: batteryVoltageV, batteryCapacityPerc, solarIrradianceWm2 not in DTO
        
        // Nested fields for complex alarm rules
        'inverter.temperature': telemetryData.inverterTemperatureValue,
        'inverter.tempC': telemetryData.inverterTemperatureValue,
        'pump.power': telemetryData.pumpPowerValue,
        'pump.current': telemetryData.pumpCurrentValue,
        'bus.voltage': telemetryData.busVoltageValue,
        
        // Add any additional fields from telemetry data
        ...telemetryData,
      };

      const triggeredAlarms = await this.alarmProcessor.processTelemetryData({
        deviceId,
        timestamp,
        data: telemetryDataForAlarms,
      });

      if (triggeredAlarms.length > 0) {
        this.logger.warn(`${triggeredAlarms.length} alarm(s) triggered for device ${deviceId}:`, 
          triggeredAlarms.map(a => a.ruleName).join(', ')
        );
      }
    } catch (error) {
      // Log error but don't throw - we don't want alarm processing to break telemetry ingestion
      this.logger.error(`Failed to process alarms for device ${deviceId}: ${error.message}`);
    }
  }
}
