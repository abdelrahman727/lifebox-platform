import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { {{NAME_PASCAL}}Service } from './{{NAME_KEBAB}}.service';
import { Create{{NAME_PASCAL}}Dto } from './dto/create-{{NAME_KEBAB}}.dto';
import { Update{{NAME_PASCAL}}Dto } from './dto/update-{{NAME_KEBAB}}.dto';
import { EnhancedPermissionsGuard } from '../common/guards/enhanced-permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '@prisma/client';

/**
 * {{NAME_PASCAL}} Controller
 * 
 * Handles HTTP requests for {{NAME}} management
 * Generated on {{DATE}}
 */
@ApiTags('{{NAME}}')
@ApiBearerAuth()
@Controller('{{NAME_KEBAB}}')
@UseGuards(EnhancedPermissionsGuard)
export class {{NAME_PASCAL}}Controller {
  constructor(private readonly {{NAME_CAMEL}}Service: {{NAME_PASCAL}}Service) {}

  /**
   * Create a new {{NAME}}
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('{{NAME_UPPER}}_CREATE')
  @ApiOperation({ 
    summary: 'Create {{NAME}}',
    description: 'Creates a new {{NAME}} record'
  })
  @ApiResponse({
    status: 201,
    description: 'The {{NAME}} has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions.',
  })
  async create(
    @Body() create{{NAME_PASCAL}}Dto: Create{{NAME_PASCAL}}Dto,
    @GetUser() user: User,
  ) {
    return this.{{NAME_CAMEL}}Service.create(create{{NAME_PASCAL}}Dto, user);
  }

  /**
   * Get all {{NAME}}s with pagination
   */
  @Get()
  @RequirePermissions('{{NAME_UPPER}}_READ')
  @ApiOperation({ 
    summary: 'Get all {{NAME}}s',
    description: 'Retrieves a paginated list of {{NAME}}s'
  })
  @ApiResponse({
    status: 200,
    description: 'List of {{NAME}}s retrieved successfully.',
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @GetUser() user: User,
  ) {
    return this.{{NAME_CAMEL}}Service.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      user,
    });
  }

  /**
   * Get a specific {{NAME}} by ID
   */
  @Get(':id')
  @RequirePermissions('{{NAME_UPPER}}_READ')
  @ApiOperation({ 
    summary: 'Get {{NAME}} by ID',
    description: 'Retrieves a specific {{NAME}} by its ID'
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the {{NAME}} to retrieve',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'The {{NAME}} has been successfully retrieved.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - {{NAME}} with specified ID does not exist.',
  })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    return this.{{NAME_CAMEL}}Service.findOne(id, user);
  }

  /**
   * Update a {{NAME}}
   */
  @Patch(':id')
  @RequirePermissions('{{NAME_UPPER}}_UPDATE')
  @ApiOperation({ 
    summary: 'Update {{NAME}}',
    description: 'Updates an existing {{NAME}} record'
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the {{NAME}} to update',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'The {{NAME}} has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - {{NAME}} with specified ID does not exist.',
  })
  async update(
    @Param('id') id: string,
    @Body() update{{NAME_PASCAL}}Dto: Update{{NAME_PASCAL}}Dto,
    @GetUser() user: User,
  ) {
    return this.{{NAME_CAMEL}}Service.update(id, update{{NAME_PASCAL}}Dto, user);
  }

  /**
   * Delete a {{NAME}}
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('{{NAME_UPPER}}_DELETE')
  @ApiOperation({ 
    summary: 'Delete {{NAME}}',
    description: 'Deletes a {{NAME}} record'
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the {{NAME}} to delete',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'The {{NAME}} has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - {{NAME}} with specified ID does not exist.',
  })
  async remove(
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    return this.{{NAME_CAMEL}}Service.remove(id, user);
  }
}