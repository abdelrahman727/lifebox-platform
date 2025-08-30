import { IsString, IsOptional, IsEmail, IsNumber, IsEnum, IsBoolean, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateClientDto {
  @ApiProperty({ description: 'Client name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiPropertyOptional({ description: 'Subscription type' })
  @IsOptional()
  @IsString()
  subscriptionType?: string;

  @ApiPropertyOptional({ description: 'Client tier' })
  @IsOptional()
  @IsString()
  clientTier?: string;

  @ApiPropertyOptional({ description: 'Payment status' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Electricity rate in EGP', default: 2.15 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  electricityRateEgp?: number;

  @ApiPropertyOptional({ description: 'Source being replaced' })
  @IsOptional()
  @IsString()
  replacingSource?: string;

  @ApiPropertyOptional({ description: 'Primary phone number' })
  @IsOptional()
  @IsString()
  phoneNumber1?: string;

  @ApiPropertyOptional({ description: 'Secondary phone number' })
  @IsOptional()
  @IsString()
  phoneNumber2?: string;

  @ApiPropertyOptional({ description: 'Tertiary phone number' })
  @IsOptional()
  @IsString()
  phoneNumber3?: string;

  // FAWRY FIELDS
  @ApiPropertyOptional({ description: 'Client credit balance in EGP', default: 0.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit?: number;

  @ApiPropertyOptional({ description: 'Fawry payment ID for billing' })
  @IsOptional()
  @IsString()
  fawryPaymentId?: string;

  @ApiPropertyOptional({ 
    description: 'Billing type', 
    enum: ['prepaid', 'postpaid'],
    default: 'prepaid' 
  })
  @IsOptional()
  @IsEnum(['prepaid', 'postpaid'])
  billingType?: 'prepaid' | 'postpaid';
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ClientQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by subscription type' })
  @IsOptional()
  @IsString()
  subscriptionType?: string;

  @ApiPropertyOptional({ description: 'Filter by client tier' })
  @IsOptional()
  @IsString()
  clientTier?: string;

  @ApiPropertyOptional({ description: 'Filter by payment status' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by billing type' })
  @IsOptional()
  @IsEnum(['prepaid', 'postpaid'])
  billingType?: 'prepaid' | 'postpaid';

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Subscription plan name' })
  @IsString()
  planName: string;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Monthly fee' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyFee?: number;
}

// Client Credit Update DTO
export class UpdateClientCreditDto {
  @ApiProperty({ description: 'New credit amount in EGP' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit: number;
}

// Client Fawry Settings DTO
export class UpdateClientFawryDto {
  @ApiPropertyOptional({ description: 'Fawry payment ID' })
  @IsOptional()
  @IsString()
  fawryPaymentId?: string;

  @ApiPropertyOptional({ 
    description: 'Billing type', 
    enum: ['prepaid', 'postpaid'] 
  })
  @IsOptional()
  @IsEnum(['prepaid', 'postpaid'])
  billingType?: 'prepaid' | 'postpaid';

  @ApiPropertyOptional({ description: 'Electricity rate in EGP' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  electricityRateEgp?: number;
}