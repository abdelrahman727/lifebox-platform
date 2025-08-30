import { PartialType } from '@nestjs/swagger';
import { Create{{NAME_PASCAL}}Dto } from './create-{{NAME_KEBAB}}.dto';

/**
 * Data Transfer Object for updating {{NAME}}
 * Extends Create{{NAME_PASCAL}}Dto with all fields optional
 * Generated on {{DATE}}
 */
export class Update{{NAME_PASCAL}}Dto extends PartialType(Create{{NAME_PASCAL}}Dto) {
  // All fields from Create{{NAME_PASCAL}}Dto are automatically optional
  // Add any update-specific fields here if needed
}