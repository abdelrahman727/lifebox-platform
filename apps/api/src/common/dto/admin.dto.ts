import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsEnum, IsJSON, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// System Settings DTOs
export class CreateSystemSettingDto {
  @ApiProperty({ description: 'Setting key (unique)' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ description: 'Data type', enum: ['string', 'number', 'boolean', 'json'] })
  @IsEnum(['string', 'number', 'boolean', 'json'])
  dataType: 'string' | 'number' | 'boolean' | 'json';

  @ApiProperty({ description: 'Setting category', enum: ['credit', 'notifications', 'general'] })
  @IsEnum(['credit', 'notifications', 'general'])
  category: 'credit' | 'notifications' | 'general';

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSystemSettingDto {
  @ApiProperty({ description: 'Setting value' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkUpdateSettingsDto {
  @ApiProperty({ description: 'Settings to update', type: 'object' })
  @IsJSON()
  settings: Record<string, any>;
}

// Credit Settings DTOs
export class CreditSettingsDto {
  @ApiProperty({ description: 'Credit warning threshold in EGP', example: 20 })
  @IsNumber()
  @Type(() => Number)
  creditWarningThreshold: number;

  @ApiProperty({ description: 'Credit critical threshold in EGP', example: 5 })
  @IsNumber()
  @Type(() => Number)
  creditCriticalThreshold: number;

  @ApiProperty({ description: 'Credit monitoring interval in minutes', example: 5 })
  @IsNumber()
  @Type(() => Number)
  creditMonitoringInterval: number;
}

// Message Template DTOs
export class CreateMessageTemplateDto {
  @ApiProperty({ description: 'Template name (unique)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Message type', enum: ['email', 'sms', 'push'] })
  @IsEnum(['email', 'sms', 'push'])
  type: 'email' | 'sms' | 'push';

  @ApiProperty({ 
    description: 'Template category', 
    enum: ['credit_warning', 'credit_critical', 'device_reactivated', 'payment_received', 'device_offline'] 
  })
  @IsEnum(['credit_warning', 'credit_critical', 'device_reactivated', 'payment_received', 'device_offline'])
  category: string;

  @ApiPropertyOptional({ description: 'Email subject (required for email templates)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Template content with variables like ${client.credit}' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Available variables for this template', type: 'object' })
  @IsJSON()
  variables: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is template active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMessageTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Email subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Template content' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({ description: 'Available variables', type: 'object' })
  @IsOptional()
  @IsJSON()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is template active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestMessageTemplateDto {
  @ApiProperty({ description: 'Client ID to use for template variables' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ description: 'Test email address (for email templates)' })
  @IsOptional()
  @IsString()
  testEmail?: string;

  @ApiPropertyOptional({ description: 'Test phone number (for SMS templates)' })
  @IsOptional()
  @IsString()
  testPhone?: string;
}

export class MessageTemplateQueryDto {
  @ApiPropertyOptional({ description: 'Filter by template type' })
  @IsOptional()
  @IsEnum(['email', 'sms', 'push'])
  type?: 'email' | 'sms' | 'push';

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}