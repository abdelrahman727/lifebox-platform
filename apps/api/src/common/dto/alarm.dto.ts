import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, IsEnum, IsObject, IsArray } from 'class-validator';

export enum AlarmCategory {
  FRECON_VFD = 'frecon_vfd',
  BATTERY_INVERTER = 'battery_inverter',
  GATEWAY = 'gateway',
  CONNECTIVITY = 'connectivity',
  CUSTOM = 'custom',
}

export enum AlarmCondition {
  GT = 'gt',    // Greater than
  LT = 'lt',    // Less than
  GTE = 'gte',  // Greater than or equal
  LTE = 'lte',  // Less than or equal
  EQ = 'eq',    // Equal
  NEQ = 'neq',  // Not equal
  SPIKE = 'spike', // Sudden increase
  DROP = 'drop',   // Sudden decrease
}

export enum AlarmSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum ReactionType {
  DASHBOARD = 'dashboard',
  SMS = 'sms',
  EMAIL = 'email',
  SHUTDOWN = 'shutdown',
  COMMAND = 'command',
}

export class CreateAlarmRuleDto {
  @ApiProperty({ example: 'High Temperature Alarm' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({ enum: AlarmCategory })
  @IsEnum(AlarmCategory)
  alarmCategory: AlarmCategory;

  @ApiProperty({ example: 'inverterTempC' })
  @IsString()
  metricName: string;

  @ApiProperty({ enum: AlarmCondition })
  @IsEnum(AlarmCondition)
  condition: AlarmCondition;

  @ApiProperty({ example: 55 })
  @IsNumber()
  thresholdValue: number;

  @ApiPropertyOptional({ example: 10, description: 'Duration in seconds before triggering' })
  @IsOptional()
  @IsNumber()
  thresholdDurationSeconds?: number;

  @ApiPropertyOptional({ example: 50, description: 'Pre-alarm threshold' })
  @IsOptional()
  @IsNumber()
  preAlarmThreshold?: number;

  @ApiProperty({ enum: AlarmSeverity })
  @IsEnum(AlarmSeverity)
  severity: AlarmSeverity;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Custom message template for SMS notifications',
    example: '🚨 ALERT: {deviceName} temperature is {value}°C (threshold: {threshold}°C). Check immediately!'
  })
  @IsOptional()
  @IsString()
  customSmsMessage?: string;

  @ApiPropertyOptional({ 
    description: 'Custom message template for email notifications',
    example: '<h2>🚨 Temperature Alert</h2><p>Device <strong>{deviceName}</strong> temperature reached <strong>{value}°C</strong> which exceeds the threshold of <strong>{threshold}°C</strong>.</p><p>Please check the device immediately.</p>'
  })
  @IsOptional()
  @IsString()
  customEmailMessage?: string;

  @ApiPropertyOptional({ 
    description: 'Custom message template for dashboard notifications',
    example: 'Temperature alert on {deviceName}: {value}°C > {threshold}°C'
  })
  @IsOptional()
  @IsString()
  customDashboardMessage?: string;

  @ApiPropertyOptional({
    example: [
      { reactionType: 'dashboard', enabled: true },
      { reactionType: 'email', enabled: true, reactionConfig: { emails: ['admin@lifebox.com'] } },
      { reactionType: 'sms', enabled: false },
      { reactionType: 'command', enabled: true, reactionConfig: { commandType: 'pump_off', reason: 'Automatic safety shutdown due to high temperature' } }
    ]
  })
  @IsOptional()
  @IsArray()
  reactions?: CreateAlarmReactionDto[];
}

export class CreateAlarmReactionDto {
  @ApiProperty({ enum: ReactionType })
  @IsEnum(ReactionType)
  reactionType: ReactionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  reactionConfig?: Record<string, any>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}

export class UpdateAlarmRuleDto extends CreateAlarmRuleDto {}

export class AlarmEventQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ enum: AlarmSeverity })
  @IsOptional()
  @IsEnum(AlarmSeverity)
  severity?: AlarmSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}

export class AcknowledgeAlarmDto {
  @ApiProperty({ example: 'Maintenance team notified' })
  @IsString()
  message: string;
}

export class TestAlarmDto {
  @ApiProperty({ example: 60 })
  @IsNumber()
  testValue: number;
}
