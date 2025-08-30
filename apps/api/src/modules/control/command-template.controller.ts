import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommandTemplateService } from './command-template.service';
import {
  CreateCommandTemplateDto,
  UpdateCommandTemplateDto,
  CommandTemplateQueryDto,
  ExecuteCommandDto,
  ValidateCommandTemplateDto,
} from '../../common/dto/command-template.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('command-templates')
@Controller('command-templates')
@UseGuards(JwtAuthGuard)
export class CommandTemplateController {
  constructor(private readonly commandTemplateService: CommandTemplateService) {}

  /**
   * Create a new command template
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create command template',
    description: 'Create a new command template (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Command template created successfully',
  })
  async create(
    @Body() createDto: CreateCommandTemplateDto,
    @CurrentUser() user: any,
  ) {
    try {
      const template = await this.commandTemplateService.create(createDto, user.id);
      return {
        success: true,
        data: template,
        message: 'Command template created successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create command template: ${error.message}`);
    }
  }

  /**
   * Get all command templates with filtering
   */
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get command templates',
    description: 'Retrieve command templates with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Command templates retrieved successfully',
  })
  async findAll(@Query() query: CommandTemplateQueryDto) {
    try {
      const result = await this.commandTemplateService.findAll(query);
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Command templates retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get command templates: ${error.message}`);
    }
  }

  /**
   * Get templates grouped by category (for admin dashboards)
   */
  @Get('by-category')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get templates by category',
    description: 'Retrieve command templates grouped by category for dashboard display',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates grouped by category retrieved successfully',
  })
  async getTemplatesByCategory() {
    try {
      const categorizedTemplates = await this.commandTemplateService.getTemplatesByCategory();
      return {
        success: true,
        data: categorizedTemplates,
        message: 'Templates by category retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get templates by category: ${error.message}`);
    }
  }

  /**
   * Get command template by ID
   */
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get command template',
    description: 'Retrieve a specific command template by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Command template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Command template retrieved successfully',
  })
  async findOne(@Param('id') id: string) {
    try {
      const template = await this.commandTemplateService.findOne(id);
      return {
        success: true,
        data: template,
        message: 'Command template retrieved successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get command template: ${error.message}`);
    }
  }

  /**
   * Update command template
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update command template',
    description: 'Update an existing command template (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Command template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Command template updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommandTemplateDto,
    @CurrentUser() user: any,
  ) {
    try {
      const template = await this.commandTemplateService.update(id, updateDto, user.id);
      return {
        success: true,
        data: template,
        message: 'Command template updated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update command template: ${error.message}`);
    }
  }

  /**
   * Delete command template
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete command template',
    description: 'Delete a command template (Admin only, cannot delete defaults)',
  })
  @ApiParam({
    name: 'id',
    description: 'Command template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Command template deleted successfully',
  })
  async remove(@Param('id') id: string) {
    try {
      const result = await this.commandTemplateService.remove(id);
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete command template: ${error.message}`);
    }
  }

  /**
   * Validate command template
   */
  @Post('validate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate command template',
    description: 'Validate template syntax and variables',
  })
  @ApiResponse({
    status: 200,
    description: 'Template validation completed',
  })
  async validateTemplate(@Body() validateDto: ValidateCommandTemplateDto) {
    try {
      const result = this.commandTemplateService.validateTemplate(validateDto);
      return {
        success: true,
        data: result,
        message: result.isValid ? 'Template is valid' : 'Template validation failed',
      };
    } catch (error) {
      throw new BadRequestException(`Template validation failed: ${error.message}`);
    }
  }

  /**
   * Execute command template
   */
  @Post('execute')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin', 'operator')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Execute command template',
    description: 'Execute a command template with variables on a device',
  })
  @ApiResponse({
    status: 201,
    description: 'Command executed successfully',
  })
  async executeCommand(
    @Body() executeDto: ExecuteCommandDto,
    @CurrentUser() user: any,
  ) {
    try {
      const result = await this.commandTemplateService.executeCommand(executeDto, user.id);
      return {
        success: true,
        data: result,
        message: 'Command executed successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to execute command: ${error.message}`);
    }
  }

  /**
   * Get execution history for a template
   */
  @Get(':id/history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get template execution history',
    description: 'Retrieve execution history for a specific template',
  })
  @ApiParam({
    name: 'id',
    description: 'Command template ID',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of records to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Execution history retrieved successfully',
  })
  async getExecutionHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const history = await this.commandTemplateService.getExecutionHistory(id, limitNum);
      return {
        success: true,
        data: history,
        count: history.length,
        message: 'Execution history retrieved successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get execution history: ${error.message}`);
    }
  }

  /**
   * Initialize default templates (Admin only)
   */
  @Post('initialize-defaults')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initialize default templates',
    description: 'Initialize or refresh default command templates (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Default templates initialized successfully',
  })
  async initializeDefaultTemplates() {
    try {
      await this.commandTemplateService.initializeDefaultTemplates();
      return {
        success: true,
        message: 'Default command templates initialized successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to initialize default templates: ${error.message}`);
    }
  }

  /**
   * Get default templates only
   */
  @Get('defaults/list')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get default templates',
    description: 'Retrieve only default system templates',
  })
  @ApiResponse({
    status: 200,
    description: 'Default templates retrieved successfully',
  })
  async getDefaultTemplates() {
    try {
      const query: CommandTemplateQueryDto = {
        isDefault: true,
        isActive: true,
        limit: 100,
      };
      const result = await this.commandTemplateService.findAll(query);
      return {
        success: true,
        data: result.data,
        count: result.data.length,
        message: 'Default templates retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get default templates: ${error.message}`);
    }
  }
}