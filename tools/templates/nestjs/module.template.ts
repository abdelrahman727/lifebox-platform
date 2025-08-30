import { Module } from '@nestjs/common';
import { {{NAME_PASCAL}}Controller } from './{{NAME_KEBAB}}.controller';
import { {{NAME_PASCAL}}Service } from './{{NAME_KEBAB}}.service';

/**
 * {{NAME_PASCAL}} Module
 * 
 * Handles {{NAME}} related functionality including:
 * - CRUD operations
 * - Business logic
 * - Data validation
 * 
 * Generated on {{DATE}}
 */
@Module({
  controllers: [{{NAME_PASCAL}}Controller],
  providers: [{{NAME_PASCAL}}Service],
  exports: [{{NAME_PASCAL}}Service],
})
export class {{NAME_PASCAL}}Module {}