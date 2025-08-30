import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { 
  IsString, 
  IsDecimal, 
  IsDateString, 
  IsOptional, 
  IsBoolean, 
  IsNumber,
  Min,
  Max,
  IsIn
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateExchangeRateDto {
  @ApiProperty({
    description: 'Base currency (source currency)',
    example: 'EGP',
    default: 'EGP'
  })
  @IsString()
  @IsIn(['EGP', 'USD', 'EUR', 'GBP'], { message: 'Base currency must be one of: EGP, USD, EUR, GBP' })
  baseCurrency: string = 'EGP';

  @ApiProperty({
    description: 'Target currency (destination currency)',
    example: 'USD',
    default: 'USD'
  })
  @IsString()
  @IsIn(['EGP', 'USD', 'EUR', 'GBP'], { message: 'Target currency must be one of: EGP, USD, EUR, GBP' })
  targetCurrency: string = 'USD';

  @ApiProperty({
    description: 'Exchange rate value',
    example: 30.25,
    type: 'number'
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  @Max(1000000)
  rate: number;

  @ApiProperty({
    description: 'Date when this rate becomes effective (ISO 8601)',
    example: '2025-01-10T00:00:00.000Z'
  })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({
    description: 'Date when this rate expires (ISO 8601). If not provided, rate remains active indefinitely',
    example: '2025-01-17T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({
    description: 'Admin notes about this rate change',
    example: 'Updated due to market volatility'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Whether this rate is active',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateExchangeRateDto extends PartialType(CreateExchangeRateDto) {}

export class ExchangeRateFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by base currency',
    example: 'EGP'
  })
  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @ApiPropertyOptional({
    description: 'Filter by target currency',
    example: 'USD'
  })
  @IsOptional()
  @IsString()
  targetCurrency?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter rates effective from this date',
    example: '2025-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter rates effective until this date',
    example: '2025-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

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

export class CurrencyConversionDto {
  @ApiProperty({
    description: 'Amount to convert',
    example: 1000
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Base currency',
    default: 'EGP'
  })
  @IsOptional()
  @IsString()
  @IsIn(['EGP', 'USD', 'EUR', 'GBP'])
  baseCurrency?: string = 'EGP';

  @ApiPropertyOptional({
    description: 'Target currency',
    default: 'USD'
  })
  @IsOptional()
  @IsString()
  @IsIn(['EGP', 'USD', 'EUR', 'GBP'])
  targetCurrency?: string = 'USD';

  @ApiPropertyOptional({
    description: 'Specific date for historical rate (ISO 8601). If not provided, uses current rate',
    example: '2025-01-10T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  rateDate?: string;
}