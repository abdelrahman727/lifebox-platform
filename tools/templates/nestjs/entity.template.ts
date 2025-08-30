import { ApiProperty } from '@nestjs/swagger';

/**
 * {{NAME_PASCAL}} Entity
 * Represents the {{NAME}} data structure
 * Generated on {{DATE}}
 */
export class {{NAME_PASCAL}}Entity {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'clp123abc456def789',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the {{NAME}}',
    example: 'Sample {{NAME_PASCAL}}',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the {{NAME}}',
    example: 'This is a sample {{NAME}} description',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the {{NAME}} is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Client ID this {{NAME}} belongs to',
    example: 'clp123abc456def789',
  })
  clientId: string;

  @ApiProperty({
    description: 'ID of the user who created this {{NAME}}',
    example: 'clp123abc456def789',
  })
  createdById: string;

  @ApiProperty({
    description: 'ID of the user who last updated this {{NAME}}',
    example: 'clp123abc456def789',
    required: false,
  })
  updatedById?: string;

  @ApiProperty({
    description: 'Timestamp when the {{NAME}} was created',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the {{NAME}} was last updated',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  // Add relationships if needed
  // createdBy?: UserEntity;
  // updatedBy?: UserEntity;
  // client?: ClientEntity;
}