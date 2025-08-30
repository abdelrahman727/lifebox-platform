import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsUUID, IsArray } from 'class-validator';

export enum ReportType {
  DEVICE_PERFORMANCE = 'device_performance',
  TELEMETRY_SUMMARY = 'telemetry_summary', 
  CLIENT_OVERVIEW = 'client_overview',
  ALARM_HISTORY = 'alarm_history',
  ENERGY_USAGE = 'energy_usage',
  WATER_PRODUCTION = 'water_production',
  SYSTEM_HEALTH = 'system_health',
  BILLING_SUMMARY = 'billing_summary',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
}

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export class GenerateReportDto {
  @ApiProperty({
    description: 'Type of report to generate',
    enum: ReportType,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({
    description: 'Output format for the report',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  @IsEnum(ReportFormat)
  format: ReportFormat = ReportFormat.PDF;

  @ApiProperty({
    description: 'Report period',
    enum: ReportPeriod,
    default: ReportPeriod.MONTHLY,
  })
  @IsEnum(ReportPeriod)
  period: ReportPeriod = ReportPeriod.MONTHLY;

  @ApiPropertyOptional({
    description: 'Start date for custom period (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom period (ISO 8601 format)',
    example: '2024-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Client ID to filter the report',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Device IDs to include in the report',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  deviceIds?: string[];

  @ApiPropertyOptional({
    description: 'Additional report parameters as JSON object',
  })
  @IsOptional()
  parameters?: Record<string, any>;
}

export class ReportScheduleDto {
  @ApiProperty({
    description: 'Report configuration',
  })
  reportConfig: GenerateReportDto;

  @ApiProperty({
    description: 'Cron expression for scheduling (e.g., "0 9 * * 1" for every Monday at 9 AM)',
    example: '0 9 * * 1',
  })
  @IsString()
  cronExpression: string;

  @ApiPropertyOptional({
    description: 'Email addresses to send the report to',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  recipients?: string[];

  @ApiPropertyOptional({
    description: 'Report title/name',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Report description',
  })
  @IsOptional()
  @IsString()
  description?: string;
}