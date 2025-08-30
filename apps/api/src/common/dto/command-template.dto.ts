import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsEnum, ValidateNested, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum CommandCategory {
  CONTROL = 'control',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system',
  SECURITY = 'security',
  MONITORING = 'monitoring',
  MAINTENANCE = 'maintenance',
  DIAGNOSTIC = 'diagnostic',
  GENERAL = 'general',
}

export interface CommandVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  description?: string;
  required?: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[]; // For enum types
  };
}

export class CreateCommandTemplateDto {
  @ApiProperty({ description: 'Unique template name (snake_case)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty({ description: 'Display name for UI' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Command template with variables (e.g., "InvPassWord: {{&Pass}}")',
    example: 'InvPassWord: {{&Pass}}'
  })
  @IsString()
  @IsNotEmpty()
  commandTemplate: string;

  @ApiProperty({ 
    description: 'Command category',
    enum: CommandCategory,
    default: CommandCategory.GENERAL 
  })
  @IsEnum(CommandCategory)
  category: CommandCategory;

  @ApiProperty({ 
    description: 'Variable definitions for template substitution',
    type: 'object',
    example: {
      Pass: {
        name: 'Pass',
        type: 'string',
        description: 'New password',
        required: true,
        validation: { min: 8, max: 50 }
      }
    }
  })
  @IsObject()
  variables: Record<string, CommandVariable>;

  @ApiPropertyOptional({ description: 'Whether this is a default system template' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Whether template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Minimum role required to execute this command',
    example: 'admin'
  })
  @IsOptional()
  @IsString()
  requiredRole?: string;
}

export class UpdateCommandTemplateDto extends PartialType(CreateCommandTemplateDto) {}

export class CommandTemplateQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsEnum(CommandCategory)
  category?: CommandCategory;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by default templates only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Search by name or display name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}

export class ExecuteCommandDto {
  @ApiProperty({ description: 'Command template ID to execute' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: 'Target device ID' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ 
    description: 'Variable values for template substitution',
    type: 'object',
    example: { Pass: 'newPassword123' }
  })
  @IsObject()
  variables: Record<string, any>;

  @ApiPropertyOptional({ description: 'Priority of the command' })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'critical'])
  priority?: 'low' | 'normal' | 'high' | 'critical';

  @ApiPropertyOptional({ description: 'Command execution timeout in seconds' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  timeoutSeconds?: number;
}

export class ValidateCommandTemplateDto {
  @ApiProperty({ description: 'Command template to validate' })
  @IsString()
  @IsNotEmpty()
  commandTemplate: string;

  @ApiProperty({ description: 'Variables for validation' })
  @IsObject()
  variables: Record<string, CommandVariable>;

  @ApiProperty({ 
    description: 'Sample variable values for testing',
    type: 'object',
    example: { Pass: 'testPassword' }
  })
  @IsObject()
  sampleValues: Record<string, any>;
}