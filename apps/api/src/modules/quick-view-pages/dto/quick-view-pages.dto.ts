import { IsString, IsBoolean, IsOptional, IsArray, IsInt, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateQuickViewPageDto {
  @ApiProperty({
    description: 'User-friendly name for the quick view page',
    example: 'Production Floor Overview',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the page',
    example: 'Quick overview of all production floor pumps with essential controls',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL-friendly slug for sharing (must be unique)',
    example: 'prod-floor-overview',
  })
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Array of device IDs to include in the page',
    example: ['device-1', 'device-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  deviceIds: string[];

  @ApiProperty({
    description: 'Array of command template IDs to include',
    example: ['cmd-template-1', 'cmd-template-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  commandTemplateIds: string[];
}

export class UpdateQuickViewPageDto {
  @ApiPropertyOptional({
    description: 'User-friendly name for the quick view page',
    example: 'Updated Production Floor Overview',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional description of the page',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug for sharing',
    example: 'updated-prod-floor',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Whether the page is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Array of device IDs to include in the page',
    example: ['device-1', 'device-3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deviceIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of command template IDs to include',
    example: ['cmd-template-1', 'cmd-template-3'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commandTemplateIds?: string[];
}

export class ShareQuickViewPageDto {
  @ApiProperty({
    description: 'User ID to share the page with',
    example: 'user-123',
  })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Whether the user can use commands on the page',
    example: true,
  })
  @IsBoolean()
  canUseCommands: boolean;
}

export class UpdateQuickViewShareDto {
  @ApiPropertyOptional({
    description: 'Whether the user can use commands on the page',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  canUseCommands?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the share is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QuickViewDeviceDto {
  @ApiProperty({
    description: 'Device ID',
    example: 'device-123',
  })
  id: string;

  @ApiProperty({
    description: 'Display order on the page',
    example: 1,
  })
  displayOrder: number;

  @ApiProperty({
    description: 'Device information',
  })
  device: {
    id: string;
    deviceName: string;
    deviceCode: string;
    isActive: boolean;
    client: {
      id: string;
      companyName: string;
    };
  };
}

export class QuickViewCommandDto {
  @ApiProperty({
    description: 'Command ID',
    example: 'cmd-123',
  })
  id: string;

  @ApiProperty({
    description: 'Display order on the page',
    example: 1,
  })
  displayOrder: number;

  @ApiProperty({
    description: 'Custom label override',
    example: 'Emergency Stop',
  })
  customLabel?: string;

  @ApiProperty({
    description: 'Command template information',
  })
  commandTemplate: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: string;
    requiredRole: string;
  };
}

export class QuickViewPageShareDto {
  @ApiProperty({
    description: 'Share ID',
    example: 'share-123',
  })
  id: string;

  @ApiProperty({
    description: 'Whether user can use commands',
    example: true,
  })
  canUseCommands: boolean;

  @ApiProperty({
    description: 'Whether the share is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'When the page was shared',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User the page is shared with',
  })
  user: {
    id: string;
    fullName: string;
    email: string;
    role: {
      name: string;
    };
  };

  @ApiProperty({
    description: 'User who shared the page',
  })
  sharedByUser: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class QuickViewPageResponseDto {
  @ApiProperty({
    description: 'Page ID',
    example: 'page-123',
  })
  id: string;

  @ApiProperty({
    description: 'Page name',
    example: 'Production Floor Overview',
  })
  name: string;

  @ApiProperty({
    description: 'Page description',
    example: 'Quick overview of production floor',
  })
  description?: string;

  @ApiProperty({
    description: 'URL slug for sharing',
    example: 'prod-floor-overview',
  })
  slug: string;

  @ApiProperty({
    description: 'Whether the page is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2025-01-15T11:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Devices included in the page',
    type: [QuickViewDeviceDto],
  })
  devices: QuickViewDeviceDto[];

  @ApiProperty({
    description: 'Commands available on the page',
    type: [QuickViewCommandDto],
  })
  commands: QuickViewCommandDto[];

  @ApiProperty({
    description: 'Users the page is shared with',
    type: [QuickViewPageShareDto],
  })
  shares: QuickViewPageShareDto[];

  @ApiProperty({
    description: 'Page creator information',
  })
  creator: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class QuickViewPageSummaryDto {
  @ApiProperty({
    description: 'Page ID',
    example: 'page-123',
  })
  id: string;

  @ApiProperty({
    description: 'Page name',
    example: 'Production Floor Overview',
  })
  name: string;

  @ApiProperty({
    description: 'Page description',
    example: 'Quick overview of production floor',
  })
  description?: string;

  @ApiProperty({
    description: 'URL slug for sharing',
    example: 'prod-floor-overview',
  })
  slug: string;

  @ApiProperty({
    description: 'Whether the page is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Number of devices',
    example: 5,
  })
  deviceCount: number;

  @ApiProperty({
    description: 'Number of commands',
    example: 3,
  })
  commandCount: number;

  @ApiProperty({
    description: 'Number of shares',
    example: 2,
  })
  shareCount: number;

  @ApiProperty({
    description: 'Creation date',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Page creator information',
  })
  creator: {
    id: string;
    fullName: string;
    email: string;
  };
}

export class ExecuteQuickViewCommandDto {
  @ApiProperty({
    description: 'Command template ID to execute',
    example: 'cmd-template-123',
  })
  @IsString()
  @IsUUID()
  commandTemplateId: string;

  @ApiProperty({
    description: 'Device ID to execute command on',
    example: 'device-123',
  })
  @IsString()
  @IsUUID()
  deviceId: string;

  @ApiProperty({
    description: 'Command parameters (variables)',
    example: { speed: 75, duration: 3600 },
  })
  @IsOptional()
  parameters?: Record<string, any>;
}

export class QuickViewQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for page names',
    example: 'production',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (starting from 1)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (max 100)',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

// CUSTOM CALCULATIONS DTOs
export class CreateCalculationVariableDto {
  @ApiProperty({
    description: 'Variable name in the formula (e.g., device_1, pump_a)',
    example: 'device_1',
  })
  @IsString()
  variableName: string;

  @ApiProperty({
    description: 'Device ID for this variable',
    example: 'device-123',
  })
  @IsString()
  @IsUUID()
  deviceId: string;

  @ApiProperty({
    description: 'Field name from telemetry data',
    example: 'pumpPowerValue',
  })
  @IsString()
  fieldName: string;

  @ApiPropertyOptional({
    description: 'Aggregation type for the variable',
    example: 'latest',
    enum: ['latest', 'avg', 'sum', 'min', 'max', 'count'],
  })
  @IsOptional()
  @IsString()
  aggregation?: 'latest' | 'avg' | 'sum' | 'min' | 'max' | 'count' = 'latest';

  @ApiPropertyOptional({
    description: 'Time window in minutes for aggregation (null for latest)',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeWindow?: number;
}

export class CreateQuickViewCalculationDto {
  @ApiProperty({
    description: 'User-friendly name for the calculation',
    example: 'Total Pump Power',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of what the calculation does',
    example: 'Sum of power consumption from all pumps',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Mathematical formula using variable names',
    example: 'device_1.pumpPowerValue + device_2.pumpPowerValue + device_3.pumpPowerValue',
  })
  @IsString()
  formula: string;

  @ApiProperty({
    description: 'Variables used in the formula',
    type: [CreateCalculationVariableDto],
  })
  @IsArray()
  @Type(() => CreateCalculationVariableDto)
  variables: CreateCalculationVariableDto[];

  @ApiPropertyOptional({
    description: 'Display order on the page',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Unit for the calculated result',
    example: 'kW',
  })
  @IsOptional()
  @IsString()
  resultUnit?: string;

  @ApiPropertyOptional({
    description: 'Display format for the result',
    example: 'number',
    enum: ['number', 'percentage', 'currency'],
  })
  @IsOptional()
  @IsString()
  displayFormat?: string = 'number';

  @ApiPropertyOptional({
    description: 'Number of decimal places to display',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  decimalPlaces?: number = 2;
}

export class UpdateQuickViewCalculationDto {
  @ApiPropertyOptional({
    description: 'User-friendly name for the calculation',
    example: 'Updated Total Pump Power',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of what the calculation does',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Mathematical formula using variable names',
    example: 'device_1.pumpPowerValue * 1.2 + device_2.pumpPowerValue',
  })
  @IsOptional()
  @IsString()
  formula?: string;

  @ApiPropertyOptional({
    description: 'Variables used in the formula',
    type: [CreateCalculationVariableDto],
  })
  @IsOptional()
  @IsArray()
  @Type(() => CreateCalculationVariableDto)
  variables?: CreateCalculationVariableDto[];

  @ApiPropertyOptional({
    description: 'Whether the calculation is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Display order on the page',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Unit for the calculated result',
    example: 'MW',
  })
  @IsOptional()
  @IsString()
  resultUnit?: string;

  @ApiPropertyOptional({
    description: 'Display format for the result',
    example: 'percentage',
    enum: ['number', 'percentage', 'currency'],
  })
  @IsOptional()
  @IsString()
  displayFormat?: string;

  @ApiPropertyOptional({
    description: 'Number of decimal places to display',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  decimalPlaces?: number;
}

// FILTERING DTOs
export class CreateFilterConditionDto {
  @ApiPropertyOptional({
    description: 'Device ID to filter (null = all devices)',
    example: 'device-123',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({
    description: 'Field name to filter on',
    example: 'pumpPowerValue',
  })
  @IsString()
  fieldName: string;

  @ApiProperty({
    description: 'Comparison operator',
    example: 'gte',
    enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'between', 'contains'],
  })
  @IsString()
  operator: string;

  @ApiProperty({
    description: 'Filter value (JSON string for complex values)',
    example: '100',
  })
  @IsString()
  value: string;

  @ApiPropertyOptional({
    description: 'Logical operator for combining with other conditions',
    example: 'AND',
    enum: ['AND', 'OR'],
  })
  @IsOptional()
  @IsString()
  logicalOp?: string = 'AND';
}

export class CreateQuickViewFilterDto {
  @ApiProperty({
    description: 'User-friendly name for the filter',
    example: 'High Power Consumption',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of what the filter does',
    example: 'Shows devices with power consumption above 100kW',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Filter conditions',
    type: [CreateFilterConditionDto],
  })
  @IsArray()
  @Type(() => CreateFilterConditionDto)
  conditions: CreateFilterConditionDto[];

  @ApiPropertyOptional({
    description: 'Whether this is the default filter',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}

export class UpdateQuickViewFilterDto {
  @ApiPropertyOptional({
    description: 'User-friendly name for the filter',
    example: 'Updated High Power Filter',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of what the filter does',
    example: 'Updated filter description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Filter conditions',
    type: [CreateFilterConditionDto],
  })
  @IsOptional()
  @IsArray()
  @Type(() => CreateFilterConditionDto)
  conditions?: CreateFilterConditionDto[];

  @ApiPropertyOptional({
    description: 'Whether the filter is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is the default filter',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// RESPONSE DTOs
export class QuickViewCalculationVariableDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  variableName: string;

  @ApiProperty()
  fieldName: string;

  @ApiProperty()
  aggregation: string;

  @ApiProperty()
  timeWindow?: number;

  @ApiProperty()
  device: {
    id: string;
    deviceName: string;
    deviceCode: string;
  };
}

export class QuickViewCalculationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  formula: string;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  resultUnit?: string;

  @ApiProperty()
  displayFormat: string;

  @ApiProperty()
  decimalPlaces: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [QuickViewCalculationVariableDto] })
  variables: QuickViewCalculationVariableDto[];
}

export class QuickViewFilterConditionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fieldName: string;

  @ApiProperty()
  operator: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  logicalOp: string;

  @ApiProperty()
  device?: {
    id: string;
    deviceName: string;
    deviceCode: string;
  };
}

export class QuickViewFilterDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [QuickViewFilterConditionDto] })
  conditions: QuickViewFilterConditionDto[];
}

export class CalculationResultDto {
  @ApiProperty()
  calculationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  formattedValue: string;

  @ApiProperty()
  unit?: string;

  @ApiProperty()
  error?: string;

  @ApiProperty()
  lastUpdated: Date;
}