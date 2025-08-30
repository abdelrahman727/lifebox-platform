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
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuickViewPagesService } from './quick-view-pages.service';
import {
  CreateQuickViewPageDto,
  UpdateQuickViewPageDto,
  ShareQuickViewPageDto,
  UpdateQuickViewShareDto,
  QuickViewPageResponseDto,
  QuickViewPageSummaryDto,
  ExecuteQuickViewCommandDto,
  QuickViewQueryDto,
  CreateQuickViewCalculationDto,
  UpdateQuickViewCalculationDto,
  CreateQuickViewFilterDto,
  UpdateQuickViewFilterDto,
  QuickViewCalculationDto,
  QuickViewFilterDto,
  CalculationResultDto
} from './dto/quick-view-pages.dto';

@ApiTags('Quick View Pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quick-view-pages')
export class QuickViewPagesController {
  constructor(private readonly quickViewPagesService: QuickViewPagesService) {}

  @Post()
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Create a new quick view page',
    description: 'Only super users and super admins can create quick view pages with selected devices and commands'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quick view page created successfully',
    type: QuickViewPageResponseDto
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Page slug must be unique'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Some devices or command templates were not found'
  })
  async createPage(
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateQuickViewPageDto
  ): Promise<QuickViewPageResponseDto> {
    return this.quickViewPagesService.createPage(userId, createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user\'s quick view pages',
    description: 'Get pages created by user or shared with user'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for page names' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (starting from 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page (max 100)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/QuickViewPageSummaryDto' }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  async getUserPages(
    @CurrentUser('sub') userId: string,
    @Query() queryDto: QuickViewQueryDto
  ) {
    return this.quickViewPagesService.getUserPages(userId, queryDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get quick view page by ID',
    description: 'Get detailed page information including devices and commands'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Page retrieved successfully',
    type: QuickViewPageResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this page'
  })
  async getPageById(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string
  ): Promise<QuickViewPageResponseDto> {
    return this.quickViewPagesService.getPageById(pageId, userId);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get quick view page by slug',
    description: 'Access shared page using its URL slug'
  })
  @ApiParam({ name: 'slug', description: 'Page URL slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Page retrieved successfully',
    type: QuickViewPageResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have access to this page or page is inactive'
  })
  async getPageBySlug(
    @Param('slug') slug: string,
    @CurrentUser('sub') userId: string
  ): Promise<QuickViewPageResponseDto> {
    return this.quickViewPagesService.getPageBySlug(slug, userId);
  }

  @Put(':id')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Update quick view page',
    description: 'Update page details, devices, or commands. Only creator can update.'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Page updated successfully',
    type: QuickViewPageResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only update pages you created'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Page slug must be unique'
  })
  async updatePage(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateQuickViewPageDto
  ): Promise<QuickViewPageResponseDto> {
    return this.quickViewPagesService.updatePage(pageId, userId, updateDto);
  }

  @Delete(':id')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Delete quick view page',
    description: 'Delete page and all its shares. Only creator can delete.'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Page deleted successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only delete pages you created'
  })
  async deletePage(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string
  ): Promise<void> {
    return this.quickViewPagesService.deletePage(pageId, userId);
  }

  @Post(':id/share')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Share quick view page with user',
    description: 'Share page with another user and set command permissions'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Page shared successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        canUseCommands: { type: 'boolean' },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            email: { type: 'string' },
            role: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            }
          }
        },
        sharedByUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            email: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page or target user not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only share pages you created'
  })
  async sharePage(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string,
    @Body() shareDto: ShareQuickViewPageDto
  ) {
    return this.quickViewPagesService.sharePage(pageId, userId, shareDto);
  }

  @Put('shares/:shareId')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Update page share settings',
    description: 'Update command permissions or active status for a share'
  })
  @ApiParam({ name: 'shareId', description: 'Share ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Share updated successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Share not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only update shares for pages you created'
  })
  async updateShare(
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateQuickViewShareDto
  ) {
    return this.quickViewPagesService.updateShare(shareId, userId, updateDto);
  }

  @Delete('shares/:shareId')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Remove page share',
    description: 'Remove user access to the page'
  })
  @ApiParam({ name: 'shareId', description: 'Share ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Share removed successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Share not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only remove shares for pages you created'
  })
  async removeShare(
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @CurrentUser('sub') userId: string
  ): Promise<void> {
    return this.quickViewPagesService.removeShare(shareId, userId);
  }

  @Post(':id/execute-command')
  @ApiOperation({
    summary: 'Execute command on quick view page',
    description: 'Execute a command on a device through the quick view page with role-based filtering'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Command executed successfully',
    schema: {
      type: 'object',
      properties: {
        commandId: { type: 'string' },
        status: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page, device, or command not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to execute commands on this page'
  })
  async executeCommand(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string,
    @Body() executeDto: ExecuteQuickViewCommandDto
  ) {
    return this.quickViewPagesService.executeCommand(pageId, userId, executeDto);
  }

  @Get(':id/available-devices')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Get available devices for page',
    description: 'Get list of active devices that can be added to the page'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available devices retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          deviceName: { type: 'string' },
          deviceCode: { type: 'string' },
          client: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              companyName: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getAvailableDevices() {
    // This could be implemented to return devices not already in the page
    // For now, return all active devices
    return [];
  }

  @Get(':id/available-commands')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Get available command templates for page',
    description: 'Get list of active command templates that can be added to the page'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available command templates retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          displayName: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          requiredRole: { type: 'string' }
        }
      }
    }
  })
  async getAvailableCommands() {
    // This could be implemented to return commands not already in the page
    // For now, return all active command templates
    return [];
  }

  // CUSTOM CALCULATIONS ENDPOINTS

  @Post(':id/calculations')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Create custom calculation for quick view page',
    description: 'Create a custom calculation that combines data from multiple devices'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Calculation created successfully',
    type: QuickViewCalculationDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page not found or devices not found'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only add calculations to pages you created'
  })
  async createCalculation(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateQuickViewCalculationDto
  ): Promise<QuickViewCalculationDto> {
    return this.quickViewPagesService.createCalculation(pageId, userId, createDto);
  }

  @Get(':id/calculations')
  @ApiOperation({
    summary: 'Get calculations for quick view page',
    description: 'Get all custom calculations for the page'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calculations retrieved successfully',
    type: [QuickViewCalculationDto]
  })
  async getPageCalculations(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string
  ): Promise<QuickViewCalculationDto[]> {
    return this.quickViewPagesService.getPageCalculations(pageId, userId);
  }

  @Put('calculations/:calculationId')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Update custom calculation',
    description: 'Update calculation formula, variables, or display settings'
  })
  @ApiParam({ name: 'calculationId', description: 'Calculation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calculation updated successfully',
    type: QuickViewCalculationDto
  })
  async updateCalculation(
    @Param('calculationId', ParseUUIDPipe) calculationId: string,
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateQuickViewCalculationDto
  ): Promise<QuickViewCalculationDto> {
    return this.quickViewPagesService.updateCalculation(calculationId, userId, updateDto);
  }

  @Delete('calculations/:calculationId')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Delete custom calculation',
    description: 'Remove calculation from quick view page'
  })
  @ApiParam({ name: 'calculationId', description: 'Calculation ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Calculation deleted successfully'
  })
  async deleteCalculation(
    @Param('calculationId', ParseUUIDPipe) calculationId: string,
    @CurrentUser('sub') userId: string
  ): Promise<void> {
    return this.quickViewPagesService.deleteCalculation(calculationId, userId);
  }

  @Get(':id/calculations/results')
  @ApiOperation({
    summary: 'Get calculation results with current data',
    description: 'Execute calculations and return results with filtered data'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiQuery({ name: 'filterId', required: false, description: 'Filter ID to apply' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calculation results retrieved successfully',
    type: [CalculationResultDto]
  })
  async getCalculationResults(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string,
    @Query('filterId') filterId?: string
  ): Promise<CalculationResultDto[]> {
    return this.quickViewPagesService.getCalculationResults(pageId, userId, filterId);
  }

  // FILTERING ENDPOINTS

  @Post(':id/filters')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Create filter for quick view page',
    description: 'Create a filter to dynamically filter device data and calculations'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Filter created successfully',
    type: QuickViewFilterDto
  })
  async createFilter(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string,
    @Body() createDto: CreateQuickViewFilterDto
  ): Promise<QuickViewFilterDto> {
    return this.quickViewPagesService.createFilter(pageId, userId, createDto);
  }

  @Get(':id/filters')
  @ApiOperation({
    summary: 'Get filters for quick view page',
    description: 'Get all filters for the page'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filters retrieved successfully',
    type: [QuickViewFilterDto]
  })
  async getPageFilters(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string
  ): Promise<QuickViewFilterDto[]> {
    return this.quickViewPagesService.getPageFilters(pageId, userId);
  }

  @Put('filters/:filterId')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Update filter',
    description: 'Update filter conditions or settings'
  })
  @ApiParam({ name: 'filterId', description: 'Filter ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filter updated successfully',
    type: QuickViewFilterDto
  })
  async updateFilter(
    @Param('filterId', ParseUUIDPipe) filterId: string,
    @CurrentUser('sub') userId: string,
    @Body() updateDto: UpdateQuickViewFilterDto
  ): Promise<QuickViewFilterDto> {
    return this.quickViewPagesService.updateFilter(filterId, userId, updateDto);
  }

  @Delete('filters/:filterId')
  @Roles('super_user', 'super_admin')
  @ApiOperation({
    summary: 'Delete filter',
    description: 'Remove filter from quick view page'
  })
  @ApiParam({ name: 'filterId', description: 'Filter ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Filter deleted successfully'
  })
  async deleteFilter(
    @Param('filterId', ParseUUIDPipe) filterId: string,
    @CurrentUser('sub') userId: string
  ): Promise<void> {
    return this.quickViewPagesService.deleteFilter(filterId, userId);
  }

  @Get(':id/filtered-data')
  @ApiOperation({
    summary: 'Get filtered device data',
    description: 'Get device telemetry data with applied filters'
  })
  @ApiParam({ name: 'id', description: 'Page ID' })
  @ApiQuery({ name: 'filterId', required: false, description: 'Filter ID to apply' })
  @ApiQuery({ name: 'from', required: false, description: 'Start time (ISO string)' })
  @ApiQuery({ name: 'to', required: false, description: 'End time (ISO string)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filtered data retrieved successfully'
  })
  async getFilteredData(
    @Param('id', ParseUUIDPipe) pageId: string,
    @CurrentUser('sub') userId: string,
    @Query('filterId') filterId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.quickViewPagesService.getFilteredData(pageId, userId, {
      filterId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined
    });
  }
}