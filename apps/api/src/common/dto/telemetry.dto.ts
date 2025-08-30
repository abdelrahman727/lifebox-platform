import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export enum TimeInterval {
  RAW = 'raw',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum AcSource {
  GRID = 'grid',
  DIESEL = 'diesel',
  SOLAR = 'solar',
}

export class TelemetryQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2024-01-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: TimeInterval, default: TimeInterval.HOUR })
  @IsOptional()
  @IsEnum(TimeInterval)
  interval?: TimeInterval = TimeInterval.HOUR;

  @ApiPropertyOptional({ description: 'Limit number of results', default: 1000 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 1000;

  @ApiPropertyOptional({ description: 'Select specific metrics (comma-separated)' })
  @IsOptional()
  @IsString()
  metrics?: string;
}

export class CreateTelemetryDto {
  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  @IsDateString()
  time: string;

  // NEW: Comprehensive IoT Device Telemetry Fields
  // Energy Measurements
  @ApiPropertyOptional({ example: 0.02, description: 'Accumulated non-solar energy value (kWh)' })
  @IsOptional()
  @IsNumber()
  accumulatedNonsolarConsumptionValue?: number;

  @ApiPropertyOptional({ example: 318.35, description: 'Accumulated solar energy value (kWh)' })
  @IsOptional()
  @IsNumber()
  accumulatedSolarConsumptionValue?: number;

  @ApiPropertyOptional({ example: 0, description: 'Daily non-solar consumption (kWh)' })
  @IsOptional()
  @IsNumber()
  dailyNonsolarConsumptionValue?: number;

  @ApiPropertyOptional({ example: 1943, description: 'Energy consumption per day (kWh)' })
  @IsOptional()
  @IsNumber()
  dailySolarConsumptionValue?: number;

  @ApiPropertyOptional({ example: 0, description: 'Energy/hr (kWh/hr) from non-solar source' })
  @IsOptional()
  @IsNumber()
  hourlyNonsolarConsumptionValue?: number;

  @ApiPropertyOptional({ example: 102, description: 'Energy/hr (kWh/hr) from solar source' })
  @IsOptional()
  @IsNumber()
  hourlySolarConsumptionValue?: number;

  @ApiPropertyOptional({ example: 0, description: 'Energy per day (kWh)' })
  @IsOptional()
  @IsNumber()
  energyPerDayValue?: number;

  @ApiPropertyOptional({ example: 318.37, description: 'Total energy generated today (kWh)' })
  @IsOptional()
  @IsNumber()
  totalEnergyValue?: number;

  @ApiPropertyOptional({ example: 101, description: 'Current pump energy consumption (kWh)' })
  @IsOptional()
  @IsNumber()
  pumpEnergyConsumptionValue?: number;

  // Electrical Measurements
  @ApiPropertyOptional({ example: 568, description: 'DC Voltage of solar modules (V)' })
  @IsOptional()
  @IsNumber()
  busVoltageValue?: number;

  @ApiPropertyOptional({ example: 42.53, description: 'Frequency (Hz)' })
  @IsOptional()
  @IsNumber()
  frequencyValue?: number;

  @ApiPropertyOptional({ example: 125.8, description: 'Pump Current now (Ampere)' })
  @IsOptional()
  @IsNumber()
  pumpCurrentValue?: number;

  @ApiPropertyOptional({ example: 70.4, description: 'This is the pump power now (kW)' })
  @IsOptional()
  @IsNumber()
  pumpPowerValue?: number;

  @ApiPropertyOptional({ example: 323, description: 'Current pump voltage (V)' })
  @IsOptional()
  @IsNumber()
  pumpVoltageValue?: number;

  // Motor & Pump Measurements
  @ApiPropertyOptional({ example: 1259, description: 'Motor Speed (RPM)' })
  @IsOptional()
  @IsNumber()
  motorSpeedValue?: number;

  @ApiPropertyOptional({ example: 'Running', description: 'Pump status either running or stopped or unknown' })
  @IsOptional()
  @IsString()
  pumpStatusValue?: string;

  @ApiPropertyOptional({ example: 'RunForward', description: 'Pump direction (to run forward or backwards)' })
  @IsOptional()
  @IsString()
  inverterDirectionValue?: string;

  @ApiPropertyOptional({ example: 'Power & Communication', description: 'Inverter status' })
  @IsOptional()
  @IsString()
  inverterStatusValue?: string;

  @ApiPropertyOptional({ example: 'Solar', description: 'Inverter supply source' })
  @IsOptional()
  @IsString()
  inverterSupplySourceValue?: string;

  @ApiPropertyOptional({ example: 69, description: 'Current inverter temperature (Celsius)' })
  @IsOptional()
  @IsNumber()
  inverterTemperatureValue?: number;

  // Water & Environmental Measurements
  @ApiPropertyOptional({ example: 9.25, description: 'TDS Sensor value (PPM)' })
  @IsOptional()
  @IsNumber()
  tdsValue?: number;

  @ApiPropertyOptional({ example: 0, description: 'Water level sensor value' })
  @IsOptional()
  @IsNumber()
  levelSensorValue?: number;

  @ApiPropertyOptional({ example: 0, description: 'Pressure sensor value' })
  @IsOptional()
  @IsNumber()
  pressureSensorValue?: number;

  @ApiPropertyOptional({ example: 1682358.51, description: 'Total water pumped from the pump (m3)' })
  @IsOptional()
  @IsNumber()
  totalWaterVolumeM3Value?: number;

  @ApiPropertyOptional({ example: 533.72, description: 'Water pumped per hour (m3/hr)' })
  @IsOptional()
  @IsNumber()
  waterPumpedFlowRatePerHourValue?: number;

  // System Information
  @ApiPropertyOptional({ example: 'Inverter', description: 'EdgeBox power source either inverter or battery' })
  @IsOptional()
  @IsString()
  powerSourceOfBoxValue?: string;

  @ApiPropertyOptional({ example: '1', description: 'Device identifier' })
  @IsOptional()
  @IsString()
  deviceCodeValue?: string;

  @ApiPropertyOptional({ description: 'Device ID value' })
  @IsOptional()
  @IsString()
  deviceIdValue?: string;

  @ApiPropertyOptional({ description: 'LifeBox code' })
  @IsOptional()
  @IsString()
  lifeboxCodeValue?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  locationValue?: string;

  @ApiPropertyOptional({ description: 'System components' })
  @IsOptional()
  @IsString()
  systemComponentsValue?: string;

  @ApiPropertyOptional({ example: 'Mon Aug 18 17:02:02 2025', description: 'Latest timestamp to receive data from the inverter' })
  @IsOptional()
  @IsString()
  lastInvUpdateValue?: string;

  // Date Fields
  @ApiPropertyOptional({ example: '24-11-24', description: 'Commissioning date' })
  @IsOptional()
  @IsString()
  commissioningDateValue?: string;

  @ApiPropertyOptional({ example: '21-05-25', description: 'Installation date' })
  @IsOptional()
  @IsString()
  installationDateValue?: string;

  // Contract & Business
  @ApiPropertyOptional({ description: 'Contract reference number' })
  @IsOptional()
  @IsString()
  contractRefNumberValue?: string;

  @ApiPropertyOptional({ description: 'What is being replaced' })
  @IsOptional()
  @IsString()
  replacingWhatValue?: string;

  @ApiPropertyOptional({ description: 'Subscription type' })
  @IsOptional()
  @IsString()
  subscriptionTypeValue?: string;

  @ApiPropertyOptional({ description: 'Client tier' })
  @IsOptional()
  @IsString()
  clientTierValue?: string;

  // Calculated Values
  @ApiPropertyOptional({ example: 684286.95, description: 'Amount of money saved (Multiple based on either grid or diesel multiplied by total energy generated)' })
  @IsOptional()
  @IsNumber()
  moneySavedValue?: number;

  @ApiPropertyOptional({ example: 275.37, description: 'Total CO2 mitigated (tCO2) - Accumulated' })
  @IsOptional()
  @IsNumber()
  totalCO2MitigatedValue?: number;

  // Control & Configuration
  @ApiPropertyOptional({ example: 'CommunicationControl', description: 'Start command mode' })
  @IsOptional()
  @IsString()
  startCommandModeValue?: string;

  @ApiPropertyOptional({ description: 'Software version' })
  @IsOptional()
  @IsString()
  swVersionValue?: string;

  @ApiPropertyOptional({ description: 'Hardware version' })
  @IsOptional()
  @IsString()
  hwVersionValue?: string;

  // Raw MQTT payload for debugging and unknown field detection
  @ApiPropertyOptional({ description: 'Raw MQTT payload' })
  @IsOptional()
  rawPayload?: any;
}

export class WaterVolumeQueryDto {
  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: ['hourly', 'daily'], default: 'hourly' })
  @IsOptional()
  @IsString()
  groupBy?: 'hourly' | 'daily' = 'hourly';
}

export class TelemetryStatsDto {
  totalEnergy: number;
  averagePower: number;
  totalWaterVolume: number;
  averageTemperature: number;
  uptime: number;
  lastSeen: Date;
}
