import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FormulaVariableDto {
  @ApiProperty({
    description: 'Variable name used in formula',
    example: 'P_in'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Human-readable display name',
    example: 'Input Power'
  })
  @IsString()
  displayName: string;

  @ApiProperty({
    description: 'Source type for this variable',
    enum: ['telemetry', 'unknown_field', 'constant'],
    example: 'telemetry'
  })
  @IsString()
  sourceType: 'telemetry' | 'unknown_field' | 'constant';

  @ApiProperty({
    description: 'Field name in the source',
    example: 'pumpPowerKw'
  })
  @IsString()
  sourceField: string;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'kW'
  })
  @IsString()
  unit: string;

  @ApiProperty({
    description: 'Whether this variable is required for calculation',
    default: true
  })
  @IsBoolean()
  isRequired: boolean;

  @ApiPropertyOptional({
    description: 'Default value if data not available',
    example: 0
  })
  @IsOptional()
  @IsNumber()
  defaultValue?: number;
}

export class FormulaConstantDto {
  @ApiProperty({
    description: 'Constant value',
    example: 9.81
  })
  @IsNumber()
  value: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'm/s²'
  })
  @IsString()
  unit: string;

  @ApiProperty({
    description: 'Description of this constant',
    example: 'Gravitational acceleration'
  })
  @IsString()
  description: string;
}

export class CreateCalculationFormulaDto {
  @ApiProperty({
    description: 'Formula name',
    example: 'Hourly Flow Rate'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Formula description',
    example: 'Calculate pump hourly flow rate based on power and efficiency'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Mathematical formula expression',
    example: '(P_in * eta_m * eta_p * 1000 * 3600) / (rho * g * H)'
  })
  @IsString()
  formula: string;

  @ApiProperty({
    description: 'Variable definitions',
    type: [FormulaVariableDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaVariableDto)
  variables: FormulaVariableDto[];

  @ApiProperty({
    description: 'Formula constants',
    example: {
      eta_m: { value: 0.9, unit: '', description: 'Motor efficiency' },
      eta_p: { value: 0.8, unit: '', description: 'Pump efficiency' },
      rho: { value: 1000, unit: 'kg/m³', description: 'Water density' },
      g: { value: 9.81, unit: 'm/s²', description: 'Gravitational acceleration' }
    }
  })
  @IsObject()
  constants: Record<string, FormulaConstantDto>;

  @ApiProperty({
    description: 'Unit of the calculation result',
    example: 'm³/h'
  })
  @IsString()
  resultUnit: string;

  @ApiProperty({
    description: 'Formula category for organization',
    example: 'pump_efficiency'
  })
  @IsString()
  category: string;

  @ApiPropertyOptional({
    description: 'Whether this formula is active',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateCalculationFormulaDto extends PartialType(CreateCalculationFormulaDto) {}

export class TestFormulaDto {
  @ApiProperty({
    description: 'Mathematical formula to test',
    example: '(P_in * eta_m * eta_p * 1000 * 3600) / (rho * g * H)'
  })
  @IsString()
  formula: string;

  @ApiProperty({
    description: 'Variable definitions for the formula',
    type: [FormulaVariableDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormulaVariableDto)
  variables: FormulaVariableDto[];

  @ApiProperty({
    description: 'Constants used in the formula',
    example: {
      eta_m: { value: 0.9, unit: '', description: 'Motor efficiency' },
      eta_p: { value: 0.8, unit: '', description: 'Pump efficiency' }
    }
  })
  @IsObject()
  constants: Record<string, FormulaConstantDto>;

  @ApiProperty({
    description: 'Test values for variables',
    example: { P_in: 5.5, H: 25.0 }
  })
  @IsObject()
  testValues: Record<string, number>;

  @ApiProperty({
    description: 'Expected result unit',
    example: 'm³/h'
  })
  @IsString()
  resultUnit: string;
}

export class CalculationFormulaFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by category'
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search in name and description'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    default: 50
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    default: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class CalculateResultDto {
  @ApiProperty({
    description: 'Device ID to calculate for',
    example: 'uuid'
  })
  @IsUUID()
  deviceId: string;

  @ApiProperty({
    description: 'Formula ID to use for calculation',
    example: 'uuid'
  })
  @IsUUID()
  formulaId: string;

  @ApiPropertyOptional({
    description: 'Specific timestamp for historical calculation (ISO 8601). If not provided, uses latest telemetry',
    example: '2025-01-10T12:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class CalculationResultFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by device ID'
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by formula ID'
  })
  @IsOptional()
  @IsUUID()
  formulaId?: string;

  @ApiPropertyOptional({
    description: 'Start date for filtering results (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering results (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    default: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    default: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}