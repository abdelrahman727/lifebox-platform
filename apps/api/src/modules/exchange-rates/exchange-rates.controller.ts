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
import { ExchangeRatesService } from './exchange-rates.service';
import { 
  CreateExchangeRateDto, 
  UpdateExchangeRateDto, 
  ExchangeRateFilterDto,
  CurrencyConversionDto 
} from './dto/exchange-rate.dto';

@ApiTags('exchange-rates')
@Controller('admin/exchange-rates')
@UseGuards(JwtAuthGuard, HierarchicalRolesGuard)
@ApiBearerAuth()
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Post()
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Create new exchange rate',
    description: 'Create a new exchange rate configuration. Only super users and admins can create exchange rates.',
  })
  @ApiResponse({
    status: 201,
    description: 'Exchange rate created successfully',
  })
  async create(
    @Body() createDto: CreateExchangeRateDto,
    @CurrentUser() user: any,
  ) {
    return await this.exchangeRatesService.createExchangeRate(createDto, user.id);
  }

  @Get()
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Get all exchange rates',
    description: 'Retrieve all exchange rates with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rates retrieved successfully',
  })
  async findAll(@Query() filterDto: ExchangeRateFilterDto) {
    return await this.exchangeRatesService.findAll(filterDto);
  }

  @Get('current')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Get current active exchange rate',
    description: 'Get the currently active exchange rate for EGP to USD conversion',
  })
  @ApiQuery({
    name: 'baseCurrency',
    required: false,
    description: 'Base currency (default: EGP)',
  })
  @ApiQuery({
    name: 'targetCurrency', 
    required: false,
    description: 'Target currency (default: USD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Current exchange rate retrieved successfully',
  })
  async getCurrentRate(
    @Query('baseCurrency') baseCurrency?: string,
    @Query('targetCurrency') targetCurrency?: string,
  ) {
    return await this.exchangeRatesService.getCurrentRate(
      baseCurrency || 'EGP',
      targetCurrency || 'USD'
    );
  }

  @Get('history')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Get exchange rate history',
    description: 'Get historical exchange rates for a specific currency pair',
  })
  @ApiQuery({
    name: 'baseCurrency',
    required: false,
    description: 'Base currency (default: EGP)',
  })
  @ApiQuery({
    name: 'targetCurrency',
    required: false, 
    description: 'Target currency (default: USD)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate history retrieved successfully',
  })
  async getRateHistory(
    @Query('baseCurrency') baseCurrency?: string,
    @Query('targetCurrency') targetCurrency?: string,
    @Query('days') days?: string,
  ) {
    return await this.exchangeRatesService.getRateHistory(
      baseCurrency || 'EGP',
      targetCurrency || 'USD',
      days ? parseInt(days) : 30
    );
  }

  @Post('convert')
  @RequirePermissions(CommonPermissions.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Convert currency amount',
    description: 'Convert an amount from one currency to another using current or historical rates',
  })
  @ApiResponse({
    status: 200,
    description: 'Currency conversion completed successfully',
    schema: {
      type: 'object',
      properties: {
        originalAmount: { type: 'number', example: 1000 },
        originalCurrency: { type: 'string', example: 'EGP' },
        convertedAmount: { type: 'number', example: 33.06 },
        convertedCurrency: { type: 'string', example: 'USD' },
        exchangeRate: { type: 'number', example: 0.033058 },
        rateDate: { type: 'string', example: '2025-01-10T00:00:00.000Z' },
        rateId: { type: 'string', example: 'uuid' },
      },
    },
  })
  async convertCurrency(@Body() conversionDto: CurrencyConversionDto) {
    return await this.exchangeRatesService.convertCurrency(
      conversionDto.amount,
      conversionDto.baseCurrency || 'EGP',
      conversionDto.targetCurrency || 'USD',
      conversionDto.rateDate ? new Date(conversionDto.rateDate) : undefined
    );
  }

  @Get(':id')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Get exchange rate by ID',
    description: 'Retrieve a specific exchange rate by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Exchange rate ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate retrieved successfully',
  })
  async findOne(@Param('id') id: string) {
    return await this.exchangeRatesService.findOne(id);
  }

  @Put(':id')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Update exchange rate',
    description: 'Update an existing exchange rate configuration',
  })
  @ApiParam({
    name: 'id',
    description: 'Exchange rate ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateExchangeRateDto,
  ) {
    return await this.exchangeRatesService.updateExchangeRate(id, updateDto);
  }

  @Delete(':id')
  @Roles('super_user', 'admin')
  @RequirePermissions(CommonPermissions.SYSTEM_MANAGE)
  @ApiOperation({
    summary: 'Deactivate exchange rate',
    description: 'Deactivate an exchange rate (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Exchange rate ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate deactivated successfully',
  })
  async deactivate(@Param('id') id: string) {
    return await this.exchangeRatesService.deactivateExchangeRate(id);
  }
}