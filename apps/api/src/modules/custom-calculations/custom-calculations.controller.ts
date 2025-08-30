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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HierarchicalRolesGuard } from '../../common/guards/hierarchical-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions, CommonPermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomCalculationsService } from './custom-calculations.service';
import { 
  CreateCalculationFormulaDto, 
  UpdateCalculationFormulaDto,
  TestFormulaDto,
  CalculationFormulaFilterDto,
  CalculateResultDto,
  CalculationResultFilterDto
} from './dto/custom-calculations.dto';

@ApiTags('custom-calculations')
@Controller('admin/custom-calculations')
@UseGuards(JwtAuthGuard, HierarchicalRolesGuard)
@ApiBearerAuth()
export class CustomCalculationsController {
  constructor(private readonly customCalculationsService: CustomCalculationsService) {}

  @Post('formulas')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Create new calculation formula',
    description: 'Create a new custom calculation formula with variables and constants',
  })
  @ApiResponse({
    status: 201,
    description: 'Formula created successfully',
  })
  async createFormula(
    @Body() createDto: CreateCalculationFormulaDto,
    @CurrentUser() user: any,
  ) {
    return await this.customCalculationsService.createFormula(createDto, user.id);
  }

  @Get('formulas')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Get all calculation formulas',
    description: 'Retrieve all calculation formulas with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Formulas retrieved successfully',
  })
  async findAllFormulas(@Query() filterDto: CalculationFormulaFilterDto) {
    return await this.customCalculationsService.findAllFormulas(filterDto);
  }

  @Get('formulas/:id')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Get calculation formula by ID',
    description: 'Retrieve a specific calculation formula by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Formula ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Formula retrieved successfully',
  })
  async findOneFormula(@Param('id') id: string) {
    return await this.customCalculationsService.findOneFormula(id);
  }

  @Put('formulas/:id')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Update calculation formula',
    description: 'Update an existing calculation formula',
  })
  @ApiParam({
    name: 'id',
    description: 'Formula ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Formula updated successfully',
  })
  async updateFormula(
    @Param('id') id: string,
    @Body() updateDto: UpdateCalculationFormulaDto,
  ) {
    return await this.customCalculationsService.updateFormula(id, updateDto);
  }

  @Delete('formulas/:id')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Deactivate calculation formula',
    description: 'Deactivate a calculation formula (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Formula ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Formula deactivated successfully',
  })
  async deactivateFormula(@Param('id') id: string) {
    return await this.customCalculationsService.deactivateFormula(id);
  }

  @Post('formulas/test')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Test calculation formula',
    description: 'Test a formula with sample values before creating or updating it',
  })
  @ApiResponse({
    status: 200,
    description: 'Formula test completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        result: { type: 'number', example: 15.75 },
        scope: { 
          type: 'object', 
          example: { P_in: 5.5, eta_m: 0.9, eta_p: 0.8, rho: 1000, g: 9.81, H: 25.0 } 
        },
        formula: { type: 'string', example: '(P_in * eta_m * eta_p * 1000 * 3600) / (rho * g * H)' },
        resultUnit: { type: 'string', example: 'm³/h' },
      },
    },
  })
  async testFormula(@Body() testDto: TestFormulaDto) {
    return await this.customCalculationsService.testFormula(testDto);
  }

  @Post('calculate')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Calculate result for device',
    description: 'Calculate formula result for a specific device using latest or historical telemetry data',
  })
  @ApiResponse({
    status: 201,
    description: 'Calculation completed and result stored',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid' },
        deviceId: { type: 'string', example: 'uuid' },
        formulaId: { type: 'string', example: 'uuid' },
        result: { type: 'number', example: 15.75 },
        inputValues: { 
          type: 'object', 
          example: { P_in: 5.5, H: 25.0 } 
        },
        timestamp: { type: 'string', example: '2025-01-10T12:00:00.000Z' },
        isValid: { type: 'boolean', example: true },
        formula: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Hourly Flow Rate' },
            resultUnit: { type: 'string', example: 'm³/h' },
            category: { type: 'string', example: 'pump_efficiency' },
          },
        },
        device: {
          type: 'object',
          properties: {
            deviceName: { type: 'string', example: 'Pump Station 01' },
            deviceCode: { type: 'string', example: 'PS001' },
          },
        },
      },
    },
  })
  async calculateForDevice(@Body() calculateDto: CalculateResultDto) {
    return await this.customCalculationsService.calculateForDevice(calculateDto);
  }

  @Get('results/:deviceId')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Get calculation results for device',
    description: 'Retrieve calculation results for a specific device with optional filtering',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID',
  })
  @ApiQuery({
    name: 'formulaId',
    required: false,
    description: 'Filter by formula ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filtering (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filtering (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Calculation results retrieved successfully',
  })
  async getCalculationResults(
    @Param('deviceId') deviceId: string,
    @Query('formulaId') formulaId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.customCalculationsService.getCalculationResults(
      deviceId,
      formulaId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('fields/available')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Get available fields for formulas',
    description: 'Get all available telemetry and unknown fields that can be used in calculation formulas',
  })
  @ApiResponse({
    status: 200,
    description: 'Available fields retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        telemetryFields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'pumpPowerKw' },
              displayName: { type: 'string', example: 'Pump Power' },
              unit: { type: 'string', example: 'kW' },
              type: { type: 'string', example: 'telemetry' },
            },
          },
        },
        unknownFields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'customField1' },
              displayName: { type: 'string', example: 'Custom Field 1' },
              unit: { type: 'string', example: 'unknown' },
              type: { type: 'string', example: 'unknown_field' },
              sampleValues: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  async getAvailableFields() {
    return await this.customCalculationsService.getAvailableFields();
  }
}