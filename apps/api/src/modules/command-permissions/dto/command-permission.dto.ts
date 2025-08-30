import { IsString, IsUUID, IsBoolean, IsOptional, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CommandScope {
  GLOBAL = 'global',
  CLIENT = 'client',
  DEVICE = 'device'
}

export enum CommandCategory {
  GENERAL = 'general',
  PUMP_CONTROL = 'pump_control',
  POWER_MANAGEMENT = 'power_management',
  SYSTEM_MONITORING = 'system_monitoring',
  MAINTENANCE = 'maintenance',
  FIRMWARE = 'firmware',
  CONFIGURATION = 'configuration'
}

export class CreateCommandPermissionDto {
  @ApiProperty({
    description: 'Command type identifier',
    example: 'pump_speed_control',
  })
  @IsString()
  commandType: string;

  @ApiProperty({
    description: 'Human readable name for the command',
    example: 'Pump Speed Control',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Command description',
    example: 'Control the pump speed settings remotely',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Command category',
    enum: CommandCategory,
    example: CommandCategory.PUMP_CONTROL,
  })
  @IsOptional()
  @IsEnum(CommandCategory)
  category?: CommandCategory = CommandCategory.GENERAL;

  @ApiPropertyOptional({
    description: 'Is this a system-level command',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemLevel?: boolean = false;

  @ApiPropertyOptional({
    description: 'Is this a client-level command',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isClientLevel?: boolean = true;
}

export class UpdateCommandPermissionDto {
  @ApiPropertyOptional({
    description: 'Human readable name for the command',
    example: 'Pump Speed Control Updated',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Command description',
    example: 'Updated description for pump speed control',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Command category',
    enum: CommandCategory,
  })
  @IsOptional()
  @IsEnum(CommandCategory)
  category?: CommandCategory;

  @ApiPropertyOptional({
    description: 'Is this a system-level command',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemLevel?: boolean;

  @ApiPropertyOptional({
    description: 'Is this a client-level command',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isClientLevel?: boolean;

  @ApiPropertyOptional({
    description: 'Is command active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GrantCommandPermissionDto {
  @ApiProperty({
    description: 'User ID to grant permission to',
    example: 'uuid-user-123',
  })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Command permission ID to grant',
    example: 'uuid-command-456',
  })
  @IsString()
  @IsUUID()
  commandPermissionId: string;

  @ApiPropertyOptional({
    description: 'Scope of the permission',
    enum: CommandScope,
    example: CommandScope.CLIENT,
  })
  @IsOptional()
  @IsEnum(CommandScope)
  scope?: CommandScope = CommandScope.GLOBAL;

  @ApiPropertyOptional({
    description: 'Scope ID (client or device ID based on scope)',
    example: 'uuid-client-789',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({
    description: 'Can this user delegate this permission to others',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  canDelegate?: boolean = false;

  @ApiPropertyOptional({
    description: 'Permission expiration date (ISO string)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class BulkGrantCommandPermissionDto {
  @ApiProperty({
    description: 'Array of user IDs to grant permissions to',
    example: ['uuid-user-123', 'uuid-user-456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(4, { each: true })
  userIds: string[];

  @ApiProperty({
    description: 'Array of command permission IDs to grant',
    example: ['uuid-command-123', 'uuid-command-456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(4, { each: true })
  commandPermissionIds: string[];

  @ApiPropertyOptional({
    description: 'Scope of the permissions',
    enum: CommandScope,
    example: CommandScope.CLIENT,
  })
  @IsOptional()
  @IsEnum(CommandScope)
  scope?: CommandScope = CommandScope.GLOBAL;

  @ApiPropertyOptional({
    description: 'Scope ID (client or device ID based on scope)',
    example: 'uuid-client-789',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({
    description: 'Can users delegate these permissions to others',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  canDelegate?: boolean = false;
}

export class UpdateUserCommandPermissionDto {
  @ApiPropertyOptional({
    description: 'Is permission active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Can this user delegate this permission to others',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canDelegate?: boolean;

  @ApiPropertyOptional({
    description: 'Permission expiration date (ISO string)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CommandPermissionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by command type',
    example: 'pump_control',
  })
  @IsOptional()
  @IsString()
  commandType?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: CommandCategory,
  })
  @IsOptional()
  @IsEnum(CommandCategory)
  category?: CommandCategory;

  @ApiPropertyOptional({
    description: 'Filter by system level commands',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemLevel?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by client level commands',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isClientLevel?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by active status',
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

export class UserCommandPermissionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'uuid-user-123',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by command permission ID',
    example: 'uuid-command-456',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  commandPermissionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by scope',
    enum: CommandScope,
  })
  @IsOptional()
  @IsEnum(CommandScope)
  scope?: CommandScope;

  @ApiPropertyOptional({
    description: 'Filter by scope ID',
    example: 'uuid-client-789',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by delegation capability',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  canDelegate?: boolean;

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

export class CommandPermissionResponseDto {
  @ApiProperty({
    description: 'Command permission ID',
    example: 'uuid-command-123',
  })
  id: string;

  @ApiProperty({
    description: 'Command type identifier',
    example: 'pump_speed_control',
  })
  commandType: string;

  @ApiProperty({
    description: 'Human readable name',
    example: 'Pump Speed Control',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Command description',
    example: 'Control the pump speed settings remotely',
  })
  description?: string;

  @ApiProperty({
    description: 'Command category',
    enum: CommandCategory,
    example: CommandCategory.PUMP_CONTROL,
  })
  category: CommandCategory;

  @ApiProperty({
    description: 'Is system-level command',
    example: false,
  })
  isSystemLevel: boolean;

  @ApiProperty({
    description: 'Is client-level command',
    example: true,
  })
  isClientLevel: boolean;

  @ApiProperty({
    description: 'Is command active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-08-17T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-08-17T10:35:00Z',
  })
  updatedAt: Date;
}

export class UserCommandPermissionResponseDto {
  @ApiProperty({
    description: 'User command permission ID',
    example: 'uuid-permission-123',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'uuid-user-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Command permission ID',
    example: 'uuid-command-456',
  })
  commandPermissionId: string;

  @ApiProperty({
    description: 'ID of user who granted this permission',
    example: 'uuid-admin-789',
  })
  grantedBy: string;

  @ApiProperty({
    description: 'Permission grant timestamp',
    example: '2025-08-17T10:30:00Z',
  })
  grantedAt: Date;

  @ApiProperty({
    description: 'Is permission active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Can user delegate this permission',
    example: false,
  })
  canDelegate: boolean;

  @ApiProperty({
    description: 'Permission scope',
    enum: CommandScope,
    example: CommandScope.CLIENT,
  })
  scope: CommandScope;

  @ApiPropertyOptional({
    description: 'Scope ID (client or device ID)',
    example: 'uuid-client-789',
  })
  scopeId?: string;

  @ApiPropertyOptional({
    description: 'Permission expiration date',
    example: '2025-12-31T23:59:59Z',
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-08-17T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
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
    description: 'Command permission details',
  })
  commandPermission?: CommandPermissionResponseDto;

  @ApiPropertyOptional({
    description: 'Granted by user details',
  })
  grantedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}