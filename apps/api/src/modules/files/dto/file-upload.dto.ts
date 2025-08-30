import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum, IsUUID, IsBoolean, MaxLength, ArrayMaxSize } from 'class-validator';

export enum FileCategory {
  PROFILE = 'profile',
  DOCUMENT = 'document', 
  REPORT = 'report',
  DEVICE_IMAGE = 'device_image',
  CERTIFICATE = 'certificate',
  MANUAL = 'manual',
  WARRANTY = 'warranty',
  INVOICE = 'invoice',
  OTHER = 'other',
}

export enum FileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  CLIENT_ONLY = 'client_only',
}

export class FileUploadDto {
  @ApiProperty({
    description: 'File category',
    enum: FileCategory,
    default: FileCategory.OTHER,
  })
  @IsEnum(FileCategory)
  category: FileCategory = FileCategory.OTHER;

  @ApiPropertyOptional({
    description: 'File description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'File tags for organization',
    type: [String],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiProperty({
    description: 'File visibility',
    enum: FileVisibility,
    default: FileVisibility.PRIVATE,
  })
  @IsEnum(FileVisibility)
  visibility: FileVisibility = FileVisibility.PRIVATE;

  @ApiPropertyOptional({
    description: 'Associate file with specific client',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Associate file with specific device',
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}

export class FileUpdateDto {
  @ApiPropertyOptional({
    description: 'File category',
    enum: FileCategory,
  })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({
    description: 'File description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'File tags for organization',
    type: [String],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiProperty({
    description: 'File visibility',
    enum: FileVisibility,
  })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({
    description: 'Associate file with specific client',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Associate file with specific device',
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Mark file as active/inactive',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FileQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: FileCategory,
  })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({
    description: 'Filter by client ID',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by device ID',
  })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by uploader ID',
  })
  @IsOptional()
  @IsUUID()
  uploadedBy?: string;

  @ApiPropertyOptional({
    description: 'Search in file name or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma-separated)',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Include only active files',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
  })
  limit?: number = 20;
}