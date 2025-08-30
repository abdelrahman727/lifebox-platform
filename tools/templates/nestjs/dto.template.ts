import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Data Transfer Object for creating {{NAME}}
 * Generated on {{DATE}}
 */
export class Create{{NAME_PASCAL}}Dto {
  @ApiProperty({
    description: 'Name of the {{NAME}}',
    example: 'Sample {{NAME_PASCAL}}',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Description of the {{NAME}}',
    example: 'This is a sample {{NAME}} description',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Whether the {{NAME}} is active',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Add more fields as needed for your specific {{NAME}}
  // Examples:
  
  // @ApiProperty({
  //   description: 'Email address',
  //   example: 'user@example.com',
  // })
  // @IsEmail()
  // @IsNotEmpty()
  // email: string;

  // @ApiProperty({
  //   description: 'Phone number',
  //   example: '+1234567890',
  //   required: false,
  // })
  // @IsString()
  // @IsOptional()
  // phone?: string;

  // @ApiProperty({
  //   description: 'Age',
  //   example: 25,
  //   minimum: 1,
  //   maximum: 120,
  //   required: false,
  // })
  // @IsNumber()
  // @IsOptional()
  // @Min(1)
  // @Max(120)
  // age?: number;
}