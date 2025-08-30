import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsUUID, IsArray, IsNumber, Min, Max } from 'class-validator';

export enum SustainabilityMetricType {
  CO2_SAVINGS = 'co2_savings',
  WATER_EFFICIENCY = 'water_efficiency', 
  ENERGY_EFFICIENCY = 'energy_efficiency',
  CARBON_FOOTPRINT = 'carbon_footprint',
  RENEWABLE_ENERGY_PERCENTAGE = 'renewable_energy_percentage',
  WATER_PRODUCTION_EFFICIENCY = 'water_production_efficiency',
  SYSTEM_SUSTAINABILITY_SCORE = 'system_sustainability_score',
  ENVIRONMENTAL_IMPACT = 'environmental_impact',
}

export enum CalculationPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum ComparisonType {
  DIESEL_GENERATOR = 'diesel_generator',
  GRID_ELECTRICITY = 'grid_electricity',
  CONVENTIONAL_PUMPING = 'conventional_pumping',
  MANUAL_IRRIGATION = 'manual_irrigation',
}

export class SustainabilityMetricsDto {
  @ApiProperty({
    description: 'Type of sustainability metric to calculate',
    enum: SustainabilityMetricType,
  })
  @IsEnum(SustainabilityMetricType)
  metricType: SustainabilityMetricType;

  @ApiProperty({
    description: 'Calculation period',
    enum: CalculationPeriod,
    default: CalculationPeriod.MONTHLY,
  })
  @IsEnum(CalculationPeriod)
  period: CalculationPeriod = CalculationPeriod.MONTHLY;

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
    description: 'Client ID to filter the metrics',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Device IDs to include in calculations',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  deviceIds?: string[];

  @ApiPropertyOptional({
    description: 'Comparison baseline for impact calculations',
    enum: ComparisonType,
  })
  @IsOptional()
  @IsEnum(ComparisonType)
  comparisonType?: ComparisonType;
}

export class CarbonFootprintDto {
  @ApiPropertyOptional({
    description: 'CO2 emissions factor for grid electricity (kg CO2/kWh)',
    default: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  gridEmissionsFactor?: number = 0.5;

  @ApiPropertyOptional({
    description: 'CO2 emissions factor for diesel generation (kg CO2/liter)',
    default: 2.68,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  dieselEmissionsFactor?: number = 2.68;

  @ApiPropertyOptional({
    description: 'Average diesel consumption for conventional pumping (liters/kWh)',
    default: 0.3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  dieselConsumptionRate?: number = 0.3;
}

export class WaterEfficiencyDto {
  @ApiPropertyOptional({
    description: 'Target water production efficiency (m³/kWh)',
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetWaterEfficiency?: number = 2.0;

  @ApiPropertyOptional({
    description: 'Baseline water production method efficiency for comparison',
    default: 1.2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baselineWaterEfficiency?: number = 1.2;
}

export class SustainabilityBenchmarkDto {
  @ApiPropertyOptional({
    description: 'Industry benchmark values for comparison',
  })
  @IsOptional()
  benchmarks?: {
    co2SavingsPerMWh?: number;
    waterEfficiencyTarget?: number;
    energyEfficiencyTarget?: number;
    sustainabilityScoreTarget?: number;
  };

  @ApiPropertyOptional({
    description: 'Regional factors for calculations',
  })
  @IsOptional()
  regionalFactors?: {
    solarIrradiance?: number; // kWh/m²/day
    gridCarbonIntensity?: number; // kg CO2/kWh
    waterScarcityIndex?: number; // 0-1 scale
    economicImpactFactor?: number;
  };
}