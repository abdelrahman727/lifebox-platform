import { IsString, IsUUID, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeviceAssignmentDto {
  @ApiProperty({
    description: 'User ID to assign to device',
    example: 'uuid-user-123',
  })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Device ID to assign user to',
    example: 'uuid-device-456',
  })
  @IsString()
  @IsUUID()
  deviceId: string;
}

export class BulkCreateDeviceAssignmentDto {
  @ApiProperty({
    description: 'Array of user IDs to assign to devices',
    example: ['uuid-user-123', 'uuid-user-456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(4, { each: true })
  userIds: string[];

  @ApiProperty({
    description: 'Array of device IDs to assign users to',
    example: ['uuid-device-123', 'uuid-device-456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(4, { each: true })
  deviceIds: string[];
}

export class UpdateDeviceAssignmentDto {
  @ApiPropertyOptional({
    description: 'Active status of the assignment',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DeviceAssignmentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'uuid-user-123',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by device ID',
    example: 'uuid-device-456',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by client ID',
    example: 'uuid-client-789',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by assignment status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Limit number of results',
    example: 50,
  })
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
  })
  @IsOptional()
  offset?: number = 0;
}

export class DeviceAssignmentResponseDto {
  @ApiProperty({
    description: 'Assignment ID',
    example: 'uuid-assignment-123',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'uuid-user-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Device ID',
    example: 'uuid-device-456',
  })
  deviceId: string;

  @ApiProperty({
    description: 'ID of user who made the assignment',
    example: 'uuid-admin-789',
  })
  assignedBy: string;

  @ApiProperty({
    description: 'Assignment timestamp',
    example: '2025-08-17T10:30:00Z',
  })
  assignedAt: Date;

  @ApiProperty({
    description: 'Is assignment active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Assignment creation timestamp',
    example: '2025-08-17T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Assignment last update timestamp',
    example: '2025-08-17T10:35:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User details',
  })
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: {
      name: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Device details',
  })
  device?: {
    id: string;
    deviceName: string;
    deviceCode: string;
    lifeboxCode: string;
    client: {
      name: string;
      organizationName: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Assigner details',
  })
  assignedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}