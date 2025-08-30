import { IsString, IsInt, IsBoolean, IsOptional, IsDateString, IsObject, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateDeviceAlarmDto {
  @ApiProperty({
    description: 'Device ID that generated the alarm',
    example: 'device-123'
  })
  @IsString()
  @IsUUID()
  deviceId: string;

  @ApiProperty({
    description: 'Alarm type from MQTT message',
    example: 'BoxPowerSource'
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Human readable alarm title',
    example: 'The box has lost its power source from the inverter.'
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Alarm status (1 = active, 0 = resolved)',
    example: 1
  })
  @IsInt()
  @Min(0)
  @Max(1)
  status: number;

  @ApiProperty({
    description: 'Severity level (1 = info, 2 = warning, 3 = critical)',
    example: 3
  })
  @IsInt()
  @Min(1)
  @Max(3)
  severity: number;

  @ApiPropertyOptional({
    description: 'Whether alarm should be propagated',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  propagate?: boolean;

  @ApiProperty({
    description: 'Complete MQTT message data',
    example: {
      "raw": {
        "type": "BoxPowerSource",
        "title": "The box has lost its power source from the inverter.",
        "status": 1,
        "severity": 3,
        "propagate": true
      }
    }
  })
  @IsObject()
  rawData: any;
}

export class UpdateDeviceAlarmDto {
  @ApiPropertyOptional({
    description: 'Mark alarm as resolved',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({
    description: 'Admin notes when resolving alarm',
    example: 'Power source restored after maintenance'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeviceAlarmQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by device ID',
    example: 'device-123'
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by alarm type',
    example: 'BoxPowerSource'
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by severity level',
    example: 3
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(3)
  severity?: number;

  @ApiPropertyOptional({
    description: 'Filter by resolution status',
    example: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({
    description: 'Filter alarms from date (ISO string)',
    example: '2025-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter alarms to date (ISO string)',
    example: '2025-01-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Page number (starting from 1)',
    example: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (max 100)',
    example: 20
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class DeviceAlarmResponseDto {
  @ApiProperty({
    description: 'Alarm ID',
    example: 'alarm-123'
  })
  id: string;

  @ApiProperty({
    description: 'Device ID',
    example: 'device-123'
  })
  deviceId: string;

  @ApiProperty({
    description: 'Alarm type',
    example: 'BoxPowerSource'
  })
  type: string;

  @ApiProperty({
    description: 'Alarm title',
    example: 'The box has lost its power source'
  })
  title: string;

  @ApiProperty({
    description: 'Alarm status',
    example: 1
  })
  status: number;

  @ApiProperty({
    description: 'Severity level',
    example: 3
  })
  severity: number;

  @ApiProperty({
    description: 'Whether alarm propagates',
    example: true
  })
  propagate: boolean;

  @ApiProperty({
    description: 'Raw MQTT data',
    example: { "raw": { "type": "BoxPowerSource" } }
  })
  rawData: any;

  @ApiProperty({
    description: 'When alarm was received',
    example: '2025-01-15T10:00:00Z'
  })
  receivedAt: Date;

  @ApiProperty({
    description: 'Whether alarm is resolved',
    example: false
  })
  resolved: boolean;

  @ApiPropertyOptional({
    description: 'When alarm was resolved',
    example: '2025-01-15T11:00:00Z'
  })
  resolvedAt?: Date;

  @ApiPropertyOptional({
    description: 'Admin notes',
    example: 'Power restored'
  })
  notes?: string;

  @ApiProperty({
    description: 'Device information'
  })
  device: {
    id: string;
    deviceName: string;
    deviceCode: string;
    client: {
      id: string;
      companyName: string;
    };
  };

  @ApiPropertyOptional({
    description: 'User who resolved the alarm'
  })
  resolver?: {
    id: string;
    fullName: string;
    email: string;
  };
}