import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SustainabilityService, SustainabilityMetrics } from './sustainability.service';
import {
  SustainabilityMetricsDto,
  SustainabilityMetricType,
  CalculationPeriod,
  ComparisonType,
  CarbonFootprintDto,
  WaterEfficiencyDto,
  SustainabilityBenchmarkDto,
} from './dto/sustainability-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sustainability')
@Controller('sustainability')
@UseGuards(JwtAuthGuard)
export class SustainabilityController {
  constructor(private readonly sustainabilityService: SustainabilityService) {}

  /**
   * Calculate specific sustainability metric
   */
  @Post('metrics/calculate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Calculate sustainability metrics',
    description: 'Calculate various sustainability metrics including CO2 savings, water efficiency, energy efficiency, and environmental impact',
  })
  @ApiResponse({
    status: 200,
    description: 'Sustainability metrics calculated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            metricType: { type: 'string' },
            period: { type: 'string' },
            value: { type: 'number' },
            unit: { type: 'string' },
            trend: { type: 'string', enum: ['increasing', 'decreasing', 'stable'] },
            trendPercentage: { type: 'number' },
            comparison: {
              type: 'object',
              properties: {
                baseline: { type: 'number' },
                improvement: { type: 'number' },
                improvementPercentage: { type: 'number' },
              },
            },
            breakdown: { type: 'object' },
            calculatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters or no data found',
  })
  async calculateSustainabilityMetrics(
    @Body() metricsDto: SustainabilityMetricsDto,
    @CurrentUser() user: any,
  ) {
    try {
      const metrics = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate sustainability metrics: ${error.message}`);
    }
  }

  /**
   * Get CO2 savings metrics
   */
  @Get('metrics/co2-savings')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get CO2 savings metrics',
    description: 'Calculate CO2 emissions avoided by using solar energy instead of conventional sources',
  })
  @ApiQuery({
    name: 'period',
    enum: CalculationPeriod,
    description: 'Calculation period',
    required: false,
  })
  @ApiQuery({
    name: 'clientId',
    description: 'Client ID to filter metrics',
    required: false,
  })
  @ApiQuery({
    name: 'comparisonType',
    enum: ComparisonType,
    description: 'Baseline for comparison',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'CO2 savings metrics retrieved successfully',
  })
  async getCO2Savings(
    @Query('period') period: CalculationPeriod = CalculationPeriod.MONTHLY,
    @Query('clientId') clientId: string | undefined,
    @Query('comparisonType') comparisonType: ComparisonType | undefined,
    @CurrentUser() user: any,
  ) {
    try {
      const metricsDto: SustainabilityMetricsDto = {
        metricType: SustainabilityMetricType.CO2_SAVINGS,
        period,
        clientId,
        comparisonType,
      };

      const metrics = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate CO2 savings: ${error.message}`);
    }
  }

  /**
   * Get water efficiency metrics
   */
  @Get('metrics/water-efficiency')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get water efficiency metrics',
    description: 'Calculate water production efficiency in m³ per kWh of energy consumed',
  })
  @ApiQuery({
    name: 'period',
    enum: CalculationPeriod,
    description: 'Calculation period',
    required: false,
  })
  @ApiQuery({
    name: 'clientId',
    description: 'Client ID to filter metrics',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Water efficiency metrics retrieved successfully',
  })
  async getWaterEfficiency(
    @Query('period') period: CalculationPeriod = CalculationPeriod.MONTHLY,
    @Query('clientId') clientId: string | undefined,
    @CurrentUser() user: any,
  ) {
    try {
      const metricsDto: SustainabilityMetricsDto = {
        metricType: SustainabilityMetricType.WATER_EFFICIENCY,
        period,
        clientId,
      };

      const metrics = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate water efficiency: ${error.message}`);
    }
  }

  /**
   * Get energy efficiency metrics
   */
  @Get('metrics/energy-efficiency')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get energy efficiency metrics',
    description: 'Calculate system energy efficiency as percentage of energy utilization',
  })
  @ApiQuery({
    name: 'period',
    enum: CalculationPeriod,
    description: 'Calculation period',
    required: false,
  })
  @ApiQuery({
    name: 'clientId',
    description: 'Client ID to filter metrics',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Energy efficiency metrics retrieved successfully',
  })
  async getEnergyEfficiency(
    @Query('period') period: CalculationPeriod = CalculationPeriod.MONTHLY,
    @Query('clientId') clientId: string | undefined,
    @CurrentUser() user: any,
  ) {
    try {
      const metricsDto: SustainabilityMetricsDto = {
        metricType: SustainabilityMetricType.ENERGY_EFFICIENCY,
        period,
        clientId,
      };

      const metrics = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate energy efficiency: ${error.message}`);
    }
  }

  /**
   * Get renewable energy percentage
   */
  @Get('metrics/renewable-energy')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get renewable energy percentage',
    description: 'Calculate percentage of energy needs met by renewable sources',
  })
  @ApiQuery({
    name: 'period',
    enum: CalculationPeriod,
    description: 'Calculation period',
    required: false,
  })
  @ApiQuery({
    name: 'clientId',
    description: 'Client ID to filter metrics',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Renewable energy metrics retrieved successfully',
  })
  async getRenewableEnergyPercentage(
    @Query('period') period: CalculationPeriod = CalculationPeriod.MONTHLY,
    @Query('clientId') clientId: string | undefined,
    @CurrentUser() user: any,
  ) {
    try {
      const metricsDto: SustainabilityMetricsDto = {
        metricType: SustainabilityMetricType.RENEWABLE_ENERGY_PERCENTAGE,
        period,
        clientId,
      };

      const metrics = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate renewable energy percentage: ${error.message}`);
    }
  }

  /**
   * Get system sustainability score
   */
  @Get('metrics/sustainability-score')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get overall sustainability score',
    description: 'Calculate composite sustainability score (0-100) based on multiple environmental metrics',
  })
  @ApiQuery({
    name: 'period',
    enum: CalculationPeriod,
    description: 'Calculation period',
    required: false,
  })
  @ApiQuery({
    name: 'clientId',
    description: 'Client ID to filter metrics',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Sustainability score retrieved successfully',
  })
  async getSustainabilityScore(
    @Query('period') period: CalculationPeriod = CalculationPeriod.MONTHLY,
    @Query('clientId') clientId: string | undefined,
    @CurrentUser() user: any,
  ) {
    try {
      const metricsDto: SustainabilityMetricsDto = {
        metricType: SustainabilityMetricType.SYSTEM_SUSTAINABILITY_SCORE,
        period,
        clientId,
      };

      const metrics = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate sustainability score: ${error.message}`);
    }
  }

  /**
   * Get environmental impact summary
   */
  @Get('metrics/environmental-impact')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get environmental impact metrics',
    description: 'Calculate comprehensive environmental impact including CO2 savings, water production, and ecosystem benefits',
  })
  @ApiQuery({
    name: 'period',
    enum: CalculationPeriod,
    description: 'Calculation period',
    required: false,
  })
  @ApiQuery({
    name: 'clientId',
    description: 'Client ID to filter metrics',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Environmental impact metrics retrieved successfully',
  })
  async getEnvironmentalImpact(
    @Query('period') period: CalculationPeriod = CalculationPeriod.MONTHLY,
    @Query('clientId') clientId: string | undefined,
    @CurrentUser() user: any,
  ) {
    try {
      const metricsDto: SustainabilityMetricsDto = {
        metricType: SustainabilityMetricType.ENVIRONMENTAL_IMPACT,
        period,
        clientId,
      };

      const metrics = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate environmental impact: ${error.message}`);
    }
  }

  /**
   * Get comprehensive sustainability report
   */
  @Get('reports/comprehensive/:clientId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get comprehensive sustainability report',
    description: 'Generate a complete sustainability report with all metrics for a specific client',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID to generate report for',
  })
  @ApiQuery({
    name: 'period',
    enum: CalculationPeriod,
    description: 'Calculation period',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive sustainability report generated successfully',
  })
  async getComprehensiveSustainabilityReport(
    @Param('clientId') clientId: string,
    @Query('period') period: CalculationPeriod = CalculationPeriod.MONTHLY,
    @CurrentUser() user: any,
  ) {
    try {
      const report = await this.sustainabilityService.getComprehensiveSustainabilityReport(
        clientId,
        user.id,
        period,
      );
      
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate comprehensive sustainability report: ${error.message}`);
    }
  }

  /**
   * Get available sustainability metric types
   */
  @Get('metrics/types')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available sustainability metric types',
    description: 'Retrieve list of available sustainability metrics with descriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Sustainability metric types retrieved successfully',
  })
  async getSustainabilityMetricTypes() {
    return {
      success: true,
      data: {
        metricTypes: [
          {
            type: SustainabilityMetricType.CO2_SAVINGS,
            name: 'CO2 Emissions Savings',
            description: 'Amount of CO2 emissions avoided by using solar energy instead of fossil fuels',
            unit: 'kg CO2',
            category: 'Climate Impact',
          },
          {
            type: SustainabilityMetricType.WATER_EFFICIENCY,
            name: 'Water Production Efficiency',
            description: 'Volume of water produced per unit of energy consumed',
            unit: 'm³/kWh',
            category: 'Resource Efficiency',
          },
          {
            type: SustainabilityMetricType.ENERGY_EFFICIENCY,
            name: 'Energy System Efficiency',
            description: 'Percentage efficiency of the solar energy system',
            unit: '%',
            category: 'Energy Performance',
          },
          {
            type: SustainabilityMetricType.CARBON_FOOTPRINT,
            name: 'Carbon Footprint',
            description: 'Total carbon footprint of the system operations',
            unit: 'kg CO2',
            category: 'Climate Impact',
          },
          {
            type: SustainabilityMetricType.RENEWABLE_ENERGY_PERCENTAGE,
            name: 'Renewable Energy Usage',
            description: 'Percentage of energy needs met by renewable sources',
            unit: '%',
            category: 'Energy Independence',
          },
          {
            type: SustainabilityMetricType.WATER_PRODUCTION_EFFICIENCY,
            name: 'Water Production Rate',
            description: 'Efficiency of water production processes',
            unit: '%',
            category: 'Water Security',
          },
          {
            type: SustainabilityMetricType.SYSTEM_SUSTAINABILITY_SCORE,
            name: 'Overall Sustainability Score',
            description: 'Composite score based on multiple sustainability factors',
            unit: 'Score (0-100)',
            category: 'Overall Performance',
          },
          {
            type: SustainabilityMetricType.ENVIRONMENTAL_IMPACT,
            name: 'Environmental Impact Assessment',
            description: 'Comprehensive environmental impact including ecosystem benefits',
            unit: 'Impact Score (0-100)',
            category: 'Environmental Assessment',
          },
        ],
        periods: [
          { period: CalculationPeriod.DAILY, name: 'Daily', description: 'Current day metrics' },
          { period: CalculationPeriod.WEEKLY, name: 'Weekly', description: 'Current week metrics' },
          { period: CalculationPeriod.MONTHLY, name: 'Monthly', description: 'Current month metrics' },
          { period: CalculationPeriod.QUARTERLY, name: 'Quarterly', description: 'Current quarter metrics' },
          { period: CalculationPeriod.YEARLY, name: 'Yearly', description: 'Current year metrics' },
          { period: CalculationPeriod.CUSTOM, name: 'Custom Period', description: 'User-defined date range' },
        ],
        comparisonTypes: [
          { type: ComparisonType.DIESEL_GENERATOR, name: 'Diesel Generator', description: 'Compare against diesel-powered systems' },
          { type: ComparisonType.GRID_ELECTRICITY, name: 'Grid Electricity', description: 'Compare against grid electricity' },
          { type: ComparisonType.CONVENTIONAL_PUMPING, name: 'Conventional Pumping', description: 'Compare against conventional pumping methods' },
          { type: ComparisonType.MANUAL_IRRIGATION, name: 'Manual Irrigation', description: 'Compare against manual irrigation systems' },
        ],
      },
    };
  }

  /**
   * Get sustainability benchmarks and targets
   */
  @Get('benchmarks')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get sustainability benchmarks',
    description: 'Retrieve industry benchmarks and targets for sustainability metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Sustainability benchmarks retrieved successfully',
  })
  async getSustainabilityBenchmarks() {
    return {
      success: true,
      data: {
        benchmarks: {
          co2SavingsPerMWh: 800, // kg CO2/MWh
          waterEfficiencyTarget: 2.0, // m³/kWh
          energyEfficiencyTarget: 85, // %
          sustainabilityScoreTarget: 85, // Score
          renewableEnergyTarget: 95, // %
        },
        industryAverages: {
          solarWaterPumping: {
            waterEfficiency: 1.8, // m³/kWh
            energyEfficiency: 82, // %
            systemUptime: 88, // %
          },
          conventionalPumping: {
            waterEfficiency: 1.2, // m³/kWh
            energyEfficiency: 70, // %
            co2Emissions: 0.8, // kg CO2/kWh
          },
        },
        sdgAlignment: [
          {
            goal: 'SDG 6',
            title: 'Clean Water and Sanitation',
            relevantMetrics: ['water_efficiency', 'water_production_efficiency'],
          },
          {
            goal: 'SDG 7',
            title: 'Affordable and Clean Energy',
            relevantMetrics: ['renewable_energy_percentage', 'energy_efficiency'],
          },
          {
            goal: 'SDG 13',
            title: 'Climate Action',
            relevantMetrics: ['co2_savings', 'carbon_footprint'],
          },
          {
            goal: 'SDG 15',
            title: 'Life on Land',
            relevantMetrics: ['environmental_impact'],
          },
        ],
        certificationStandards: [
          {
            name: 'ISO 14001',
            description: 'Environmental Management Systems',
            applicableMetrics: ['carbon_footprint', 'environmental_impact'],
          },
          {
            name: 'LEED Green Building',
            description: 'Leadership in Energy and Environmental Design',
            applicableMetrics: ['renewable_energy_percentage', 'water_efficiency'],
          },
          {
            name: 'Carbon Trust Standard',
            description: 'Carbon footprint certification',
            applicableMetrics: ['co2_savings', 'carbon_footprint'],
          },
        ],
      },
    };
  }

  /**
   * Get device-specific sustainability metrics
   */
  @Get('metrics/device/:deviceId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get device-specific sustainability metrics',
    description: 'Calculate sustainability metrics for a specific device',
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Device ID to calculate metrics for',
  })
  @ApiQuery({
    name: 'metricType',
    enum: SustainabilityMetricType,
    description: 'Type of sustainability metric',
    required: false,
  })
  @ApiQuery({
    name: 'period',
    enum: CalculationPeriod,
    description: 'Calculation period',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Device sustainability metrics retrieved successfully',
  })
  async getDeviceSustainabilityMetrics(
    @Param('deviceId') deviceId: string,
    @Query('metricType') metricType: SustainabilityMetricType = SustainabilityMetricType.SYSTEM_SUSTAINABILITY_SCORE,
    @Query('period') period: CalculationPeriod = CalculationPeriod.MONTHLY,
    @CurrentUser() user: any,
  ) {
    try {
      const metricsDto: SustainabilityMetricsDto = {
        metricType,
        period,
        deviceIds: [deviceId],
      };

      const metrics = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      
      return {
        success: true,
        data: {
          deviceId,
          ...metrics,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate device sustainability metrics: ${error.message}`);
    }
  }

  /**
   * Compare sustainability metrics between periods
   */
  @Post('metrics/compare')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Compare sustainability metrics between periods',
    description: 'Compare sustainability metrics between different time periods or configurations',
  })
  @ApiResponse({
    status: 200,
    description: 'Sustainability metrics comparison completed successfully',
  })
  async compareSustainabilityMetrics(
    @Body() comparisonRequest: {
      metricType: SustainabilityMetricType;
      baselinePeriod: { startDate: string; endDate: string };
      comparisonPeriod: { startDate: string; endDate: string };
      clientId?: string;
      deviceIds?: string[];
    },
    @CurrentUser() user: any,
  ) {
    try {
      // Calculate metrics for baseline period
      const baselineMetricsDto: SustainabilityMetricsDto = {
        metricType: comparisonRequest.metricType,
        period: CalculationPeriod.CUSTOM,
        startDate: comparisonRequest.baselinePeriod.startDate,
        endDate: comparisonRequest.baselinePeriod.endDate,
        clientId: comparisonRequest.clientId,
        deviceIds: comparisonRequest.deviceIds,
      };

      // Calculate metrics for comparison period
      const comparisonMetricsDto: SustainabilityMetricsDto = {
        metricType: comparisonRequest.metricType,
        period: CalculationPeriod.CUSTOM,
        startDate: comparisonRequest.comparisonPeriod.startDate,
        endDate: comparisonRequest.comparisonPeriod.endDate,
        clientId: comparisonRequest.clientId,
        deviceIds: comparisonRequest.deviceIds,
      };

      const [baselineMetrics, comparisonMetrics] = await Promise.all([
        this.sustainabilityService.calculateSustainabilityMetrics(baselineMetricsDto, user.id),
        this.sustainabilityService.calculateSustainabilityMetrics(comparisonMetricsDto, user.id),
      ]);

      // Calculate comparison statistics
      const difference = comparisonMetrics.value - baselineMetrics.value;
      const percentageChange = baselineMetrics.value !== 0 
        ? (difference / baselineMetrics.value) * 100 
        : 0;

      return {
        success: true,
        data: {
          metricType: comparisonRequest.metricType,
          baseline: {
            period: baselineMetrics.period,
            value: baselineMetrics.value,
            unit: baselineMetrics.unit,
          },
          comparison: {
            period: comparisonMetrics.period,
            value: comparisonMetrics.value,
            unit: comparisonMetrics.unit,
          },
          analysis: {
            difference,
            percentageChange: Math.round(percentageChange * 100) / 100,
            trend: difference > 0 ? 'improvement' : difference < 0 ? 'decline' : 'stable',
            significance: Math.abs(percentageChange) > 10 ? 'significant' : Math.abs(percentageChange) > 5 ? 'moderate' : 'minimal',
          },
          recommendations: this.generateComparisonRecommendations(difference, percentageChange, comparisonRequest.metricType),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to compare sustainability metrics: ${error.message}`);
    }
  }

  private generateComparisonRecommendations(difference: number, percentageChange: number, metricType: SustainabilityMetricType): string[] {
    const recommendations: string[] = [];

    if (Math.abs(percentageChange) < 5) {
      recommendations.push('Performance is stable with minimal change');
    } else if (percentageChange > 10) {
      recommendations.push('Excellent improvement! Continue current practices');
      
      if (metricType === SustainabilityMetricType.CO2_SAVINGS) {
        recommendations.push('Consider expanding solar capacity to maximize CO2 savings');
      } else if (metricType === SustainabilityMetricType.WATER_EFFICIENCY) {
        recommendations.push('Share best practices with other systems to replicate success');
      }
    } else if (percentageChange < -10) {
      recommendations.push('Performance decline detected - investigation recommended');
      
      if (metricType === SustainabilityMetricType.ENERGY_EFFICIENCY) {
        recommendations.push('Check for system maintenance needs and component degradation');
      } else if (metricType === SustainabilityMetricType.WATER_EFFICIENCY) {
        recommendations.push('Review pump operations and pressure settings for optimization');
      }
    }

    return recommendations;
  }

  /**
   * Calculate money saved with dynamic exchange rates (NEW!)
   */
  @Post('metrics/money-saved/enhanced')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Calculate money saved with dynamic exchange rates',
    description: 'Calculate money saved in both EGP and USD using current exchange rates with historical tracking',
  })
  @ApiResponse({
    status: 201,
    description: 'Enhanced money savings calculated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            calculationDate: { type: 'string', example: '2025-01-10T12:00:00.000Z' },
            exchangeRateInfo: {
              type: 'object',
              properties: {
                baseCurrency: { type: 'string', example: 'EGP' },
                targetCurrency: { type: 'string', example: 'USD' },
                rate: { type: 'number', example: 0.033058 },
                effectiveDate: { type: 'string', example: '2025-01-10T00:00:00.000Z' },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalDevices: { type: 'number', example: 3 },
                totalEnergyKwh: { type: 'number', example: 1250.5 },
                totalMoneySavedEgp: { type: 'number', example: 1062.93 },
                totalMoneySavedUsd: { type: 'number', example: 35.15 },
              },
            },
          },
        },
      },
    },
  })
  async calculateMoneySavedWithExchangeRates(
    @Body() request: {
      deviceIds: string[];
      startDate: string;
      endDate: string;
      baselineEnergySource?: 'grid' | 'diesel';
    },
    @CurrentUser() user: any,
  ) {
    try {
      const result = await this.sustainabilityService.calculateMoneySavedWithExchangeRates(
        request.deviceIds,
        new Date(request.startDate),
        new Date(request.endDate),
        request.baselineEnergySource || 'grid',
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate money saved with exchange rates: ${error.message}`);
    }
  }

  /**
   * Get sustainability metrics with time-based filtering (NEW!)
   */
  @Get('metrics/filtered')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get sustainability metrics with advanced filtering',
    description: 'Retrieve sustainability metrics with time-based filtering and automatic currency conversion',
  })
  @ApiQuery({
    name: 'deviceIds',
    description: 'Comma-separated device IDs to filter',
    required: false,
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for filtering (ISO 8601)',
    required: false,
    example: '2025-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for filtering (ISO 8601)',
    required: false,
    example: '2025-01-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'includeCurrencyConversion',
    description: 'Include automatic currency conversion for missing USD values',
    required: false,
    type: 'boolean',
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered sustainability metrics retrieved successfully',
  })
  async getSustainabilityMetricsFiltered(
    @CurrentUser() user: any,
    @Query('deviceIds') deviceIds?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeCurrencyConversion') includeCurrencyConversion?: boolean,
  ) {
    try {
      const deviceIdArray = deviceIds ? deviceIds.split(',') : undefined;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const result = await this.sustainabilityService.getSustainabilityMetricsWithFiltering(
        deviceIdArray,
        start,
        end,
        includeCurrencyConversion !== false,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get filtered sustainability metrics: ${error.message}`);
    }
  }

  /**
   * Calculate custom sustainability metrics using formulas (NEW!)
   */
  @Post('metrics/custom')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Calculate custom sustainability metrics using formulas',
    description: 'Calculate custom metrics for sustainability analysis using predefined formulas and telemetry data',
  })
  @ApiResponse({
    status: 201,
    description: 'Custom sustainability metrics calculated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            deviceId: { type: 'string', example: 'uuid' },
            formulaId: { type: 'string', example: 'uuid' },
            period: {
              type: 'object',
              properties: {
                startDate: { type: 'string', example: '2025-01-01T00:00:00.000Z' },
                endDate: { type: 'string', example: '2025-01-31T23:59:59.999Z' },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalCalculations: { type: 'number', example: 720 },
                validCalculations: { type: 'number', example: 718 },
                failedCalculations: { type: 'number', example: 2 },
                averageValue: { type: 'number', example: 15.75 },
                minValue: { type: 'number', example: 12.34 },
                maxValue: { type: 'number', example: 18.92 },
              },
            },
          },
        },
      },
    },
  })
  async calculateCustomSustainabilityMetrics(
    @Body() request: {
      deviceId: string;
      formulaId: string;
      startDate: string;
      endDate: string;
    },
    @CurrentUser() user: any,
  ) {
    try {
      const result = await this.sustainabilityService.calculateCustomSustainabilityMetrics(
        request.deviceId,
        request.formulaId,
        new Date(request.startDate),
        new Date(request.endDate),
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate custom sustainability metrics: ${error.message}`);
    }
  }

  /**
   * Calculate daily and cumulative money saved (NEW!)
   */
  @Post('metrics/money-saved/daily-cumulative')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Calculate daily and cumulative money saved',
    description: 'Calculate money saved per kWh generated daily with both daily and cumulative savings in separate blocks',
  })
  @ApiResponse({
    status: 201,
    description: 'Daily and cumulative money savings calculated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalCumulativeSavings: {
                  type: 'object',
                  properties: {
                    egp: { type: 'number', example: 1250.75, description: 'Total cumulative savings in EGP using 2.15 EGP/kWh rate' },
                    usd: { type: 'number', example: 41.35, description: 'Total cumulative savings in USD with current exchange rate' },
                  },
                },
                averageDailySavings: {
                  type: 'object',
                  properties: {
                    egp: { type: 'number', example: 45.75, description: 'Average daily savings in EGP' },
                    usd: { type: 'number', example: 1.51, description: 'Average daily savings in USD' },
                  },
                },
                electricityRateUsed: {
                  type: 'object',
                  properties: {
                    egp: { type: 'number', example: 2.15, description: 'Electricity rate used in EGP/kWh (admin editable)' },
                    source: { type: 'string', example: 'grid', description: 'Baseline energy source for comparison' },
                  },
                },
              },
            },
            dailyBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', example: '2025-01-15' },
                  dailySavings: {
                    type: 'object',
                    properties: {
                      egp: { type: 'number', example: 45.75 },
                      usd: { type: 'number', example: 1.51 },
                    },
                  },
                  cumulativeSavings: {
                    type: 'object',
                    properties: {
                      egp: { type: 'number', example: 1250.75 },
                      usd: { type: 'number', example: 41.35 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async calculateDailyAndCumulativeMoneySaved(
    @Body() request: {
      deviceIds: string[];
      startDate: string;
      endDate: string;
      baselineEnergySource?: 'grid' | 'diesel';
    },
    @CurrentUser() user: any,
  ) {
    try {
      const result = await this.sustainabilityService.calculateDailyAndCumulativeMoneySaved(
        request.deviceIds,
        new Date(request.startDate),
        new Date(request.endDate),
        request.baselineEnergySource || 'grid',
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to calculate daily and cumulative money saved: ${error.message}`);
    }
  }

  /**
   * Get widget-ready sustainability data (NEW!)
   */
  @Get('widgets/data')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get widget-ready sustainability data',
    description: 'Retrieve sustainability data optimized for dashboard widgets with real-time updates',
  })
  @ApiQuery({
    name: 'widgetType',
    description: 'Type of widget data to retrieve',
    enum: ['money_saved', 'co2_savings', 'energy_efficiency', 'water_production', 'custom_calculation'],
    required: true,
  })
  @ApiQuery({
    name: 'deviceIds',
    description: 'Comma-separated device IDs',
    required: false,
  })
  @ApiQuery({
    name: 'timeframe',
    description: 'Timeframe for data',
    enum: ['today', 'week', 'month', 'quarter', 'year'],
    required: false,
  })
  @ApiQuery({
    name: 'formulaId',
    description: 'Formula ID for custom calculations (required if widgetType is custom_calculation)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Widget data retrieved successfully',
  })
  async getWidgetSustainabilityData(
    @CurrentUser() user: any,
    @Query('widgetType') widgetType: string,
    @Query('deviceIds') deviceIds?: string,
    @Query('timeframe') timeframe: string = 'month',
    @Query('formulaId') formulaId?: string,
  ) {
    try {
      const deviceIdArray = deviceIds ? deviceIds.split(',') : undefined;
      
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;
      const endDate = now;

      switch (timeframe) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      let result: any;

      switch (widgetType) {
        case 'money_saved':
          if (deviceIdArray) {
            result = await this.sustainabilityService.calculateMoneySavedWithExchangeRates(
              deviceIdArray,
              startDate,
              endDate,
            );
          } else {
            result = await this.sustainabilityService.getSustainabilityMetricsWithFiltering(
              undefined,
              startDate,
              endDate,
            );
          }
          break;

        case 'custom_calculation':
          if (!formulaId || !deviceIdArray?.[0]) {
            throw new BadRequestException('Formula ID and device ID are required for custom calculations');
          }
          result = await this.sustainabilityService.calculateCustomSustainabilityMetrics(
            deviceIdArray[0],
            formulaId,
            startDate,
            endDate,
          );
          break;

        default:
          // Handle standard metrics
          const metricTypeMap = {
            'co2_savings': SustainabilityMetricType.CO2_SAVINGS,
            'energy_efficiency': SustainabilityMetricType.ENERGY_EFFICIENCY,
            'water_production': SustainabilityMetricType.WATER_PRODUCTION_EFFICIENCY,
          };

          const metricType = metricTypeMap[widgetType];
          if (!metricType) {
            throw new BadRequestException(`Unsupported widget type: ${widgetType}`);
          }

          const metricsDto: SustainabilityMetricsDto = {
            metricType,
            period: CalculationPeriod.CUSTOM,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            deviceIds: deviceIdArray,
          };

          result = await this.sustainabilityService.calculateSustainabilityMetrics(metricsDto, user.id);
      }

      return {
        success: true,
        data: {
          widgetType,
          timeframe,
          deviceIds: deviceIdArray,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          result,
          lastUpdated: new Date(),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get widget sustainability data: ${error.message}`);
    }
  }
}