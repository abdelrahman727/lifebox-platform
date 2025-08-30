import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { CustomCalculationsService } from '../custom-calculations/custom-calculations.service';
import {
  SustainabilityMetricsDto,
  SustainabilityMetricType,
  CalculationPeriod,
  ComparisonType,
  CarbonFootprintDto,
  WaterEfficiencyDto,
  SustainabilityBenchmarkDto,
} from './dto/sustainability-request.dto';

export interface SustainabilityMetrics {
  metricType: SustainabilityMetricType;
  period: string;
  value: number;
  unit: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  comparison?: {
    baseline: number;
    improvement: number;
    improvementPercentage: number;
  };
  breakdown?: any;
  calculatedAt: Date;
}

export interface EnvironmentalImpact {
  co2Savings: number; // kg CO2
  waterProduced: number; // m³
  energyGenerated: number; // kWh
  fossilFuelReplaced: number; // liters diesel equivalent
  treesEquivalent: number; // trees planted equivalent
  costSavings: number; // monetary savings
}

@Injectable()
export class SustainabilityService {
  private readonly logger = new Logger(SustainabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly customCalculationsService: CustomCalculationsService,
  ) {}

  async calculateSustainabilityMetrics(
    request: SustainabilityMetricsDto,
    userId: string,
  ): Promise<SustainabilityMetrics> {
    try {
      this.logger.log(`Calculating ${request.metricType} metrics for user ${userId}`);

      // Validate user permissions
      await this.validateUserAccess(userId, request.clientId);

      // Calculate date range
      const { startDate, endDate } = this.calculateDateRange(request);

      // Get telemetry data for calculations
      const telemetryData = await this.getTelemetryData(request, startDate, endDate);

      if (telemetryData.length === 0) {
        throw new BadRequestException('No telemetry data found for the specified criteria');
      }

      // Calculate metrics based on type
      let metrics: SustainabilityMetrics;

      switch (request.metricType) {
        case SustainabilityMetricType.CO2_SAVINGS:
          metrics = await this.calculateCO2Savings(telemetryData, request, startDate, endDate);
          break;
        case SustainabilityMetricType.WATER_EFFICIENCY:
          metrics = await this.calculateWaterEfficiency(telemetryData, request, startDate, endDate);
          break;
        case SustainabilityMetricType.ENERGY_EFFICIENCY:
          metrics = await this.calculateEnergyEfficiency(telemetryData, request, startDate, endDate);
          break;
        case SustainabilityMetricType.CARBON_FOOTPRINT:
          metrics = await this.calculateCarbonFootprint(telemetryData, request, startDate, endDate);
          break;
        case SustainabilityMetricType.RENEWABLE_ENERGY_PERCENTAGE:
          metrics = await this.calculateRenewableEnergyPercentage(telemetryData, request, startDate, endDate);
          break;
        case SustainabilityMetricType.WATER_PRODUCTION_EFFICIENCY:
          metrics = await this.calculateWaterProductionEfficiency(telemetryData, request, startDate, endDate);
          break;
        case SustainabilityMetricType.SYSTEM_SUSTAINABILITY_SCORE:
          metrics = await this.calculateSustainabilityScore(telemetryData, request, startDate, endDate);
          break;
        case SustainabilityMetricType.ENVIRONMENTAL_IMPACT:
          metrics = await this.calculateEnvironmentalImpact(telemetryData, request, startDate, endDate);
          break;
        default:
          throw new BadRequestException('Unsupported sustainability metric type');
      }

      this.logger.log(`Calculated ${request.metricType}: ${metrics.value} ${metrics.unit}`);
      return metrics;

    } catch (error) {
      this.logger.error(`Failed to calculate sustainability metrics: ${error.message}`);
      throw error;
    }
  }

  private async calculateCO2Savings(
    telemetryData: any[],
    request: SustainabilityMetricsDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SustainabilityMetrics> {
    // Calculate total energy generated (from solar)
    const totalEnergyGenerated = telemetryData.reduce((sum, record) => sum + (record.energyPerDayValue || 0), 0);
    
    // CO2 emission factors (kg CO2 per kWh)
    const gridEmissionsFactor = 0.5; // Typical grid emissions factor for Egypt
    const dieselEmissionsFactor = 0.8; // Diesel generator emissions factor

    // Calculate CO2 savings compared to grid electricity
    const gridCO2Avoided = totalEnergyGenerated * gridEmissionsFactor;
    const dieselCO2Avoided = totalEnergyGenerated * dieselEmissionsFactor;

    // Use diesel comparison as baseline (more conservative)
    const co2Savings = request.comparisonType === ComparisonType.GRID_ELECTRICITY 
      ? gridCO2Avoided 
      : dieselCO2Avoided;

    // Calculate trend (compare with previous period)
    const previousPeriodData = await this.getPreviousPeriodData(request, startDate, endDate);
    const previousCO2Savings = this.calculatePreviousCO2Savings(previousPeriodData, request.comparisonType);
    const trend = this.calculateTrend(co2Savings, previousCO2Savings);

    return {
      metricType: SustainabilityMetricType.CO2_SAVINGS,
      period: this.formatDateRange(startDate, endDate),
      value: Math.round(co2Savings * 100) / 100, // Round to 2 decimal places
      unit: 'kg CO2',
      trend: trend.direction,
      trendPercentage: trend.percentage,
      comparison: {
        baseline: request.comparisonType === ComparisonType.GRID_ELECTRICITY ? gridCO2Avoided : dieselCO2Avoided,
        improvement: co2Savings,
        improvementPercentage: 100, // 100% improvement (avoided all emissions)
      },
      breakdown: {
        totalEnergyGenerated,
        emissionsFactor: request.comparisonType === ComparisonType.GRID_ELECTRICITY ? gridEmissionsFactor : dieselEmissionsFactor,
        comparisonType: request.comparisonType || ComparisonType.DIESEL_GENERATOR,
        treesEquivalent: Math.round(co2Savings / 21.77), // 1 tree absorbs ~21.77 kg CO2/year
      },
      calculatedAt: new Date(),
    };
  }

  private async calculateWaterEfficiency(
    telemetryData: any[],
    request: SustainabilityMetricsDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SustainabilityMetrics> {
    // Calculate total water produced and energy consumed
    const totalWaterProduced = telemetryData.reduce((sum, record) => sum + (record.totalWaterVolumeM3Value || 0), 0);
    const totalEnergyConsumed = telemetryData.reduce((sum, record) => sum + (record.pumpEnergyConsumptionValue || 0), 0);

    if (totalEnergyConsumed === 0) {
      throw new BadRequestException('No energy consumption data found');
    }

    // Calculate water efficiency (m³ water per kWh energy)
    const waterEfficiency = totalWaterProduced / totalEnergyConsumed;
    
    // Industry benchmarks for solar water pumping
    const benchmarkEfficiency = 2.0; // m³/kWh (good efficiency)
    const conventionalEfficiency = 1.2; // m³/kWh (conventional pumping)

    // Calculate trend
    const previousPeriodData = await this.getPreviousPeriodData(request, startDate, endDate);
    const previousEfficiency = this.calculatePreviousWaterEfficiency(previousPeriodData);
    const trend = this.calculateTrend(waterEfficiency, previousEfficiency);

    return {
      metricType: SustainabilityMetricType.WATER_EFFICIENCY,
      period: this.formatDateRange(startDate, endDate),
      value: Math.round(waterEfficiency * 100) / 100,
      unit: 'm³/kWh',
      trend: trend.direction,
      trendPercentage: trend.percentage,
      comparison: {
        baseline: conventionalEfficiency,
        improvement: waterEfficiency - conventionalEfficiency,
        improvementPercentage: ((waterEfficiency - conventionalEfficiency) / conventionalEfficiency) * 100,
      },
      breakdown: {
        totalWaterProduced,
        totalEnergyConsumed,
        benchmarkEfficiency,
        performanceRating: this.getPerformanceRating(waterEfficiency, benchmarkEfficiency),
        efficiencyGrade: this.getEfficiencyGrade(waterEfficiency, benchmarkEfficiency),
      },
      calculatedAt: new Date(),
    };
  }

  private async calculateEnergyEfficiency(
    telemetryData: any[],
    request: SustainabilityMetricsDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SustainabilityMetrics> {
    // Calculate energy metrics
    const totalEnergyGenerated = telemetryData.reduce((sum, record) => sum + (record.energyPerDayValue || 0), 0);
    const totalEnergyConsumed = telemetryData.reduce((sum, record) => sum + (record.pumpEnergyConsumptionValue || 0), 0);

    if (totalEnergyGenerated === 0) {
      throw new BadRequestException('No energy generation data found');
    }

    // Calculate system efficiency (energy consumed / energy generated)
    const systemEfficiency = (totalEnergyConsumed / totalEnergyGenerated) * 100;
    
    // Calculate average efficiency from telemetry extras (if available)
    const efficiencyRecords = telemetryData.filter(record => record.extras?.systemEfficiency);
    const avgSystemEfficiency = efficiencyRecords.length > 0 
      ? efficiencyRecords.reduce((sum, record) => sum + (record.extras.systemEfficiency * 100), 0) / efficiencyRecords.length
      : systemEfficiency;

    // Industry benchmarks
    const benchmarkEfficiency = 85; // 85% is considered good for solar systems
    const conventionalEfficiency = 70; // Conventional diesel systems

    // Calculate trend
    const previousPeriodData = await this.getPreviousPeriodData(request, startDate, endDate);
    const previousEfficiency = this.calculatePreviousEnergyEfficiency(previousPeriodData);
    const trend = this.calculateTrend(avgSystemEfficiency, previousEfficiency);

    return {
      metricType: SustainabilityMetricType.ENERGY_EFFICIENCY,
      period: this.formatDateRange(startDate, endDate),
      value: Math.round(avgSystemEfficiency * 100) / 100,
      unit: '%',
      trend: trend.direction,
      trendPercentage: trend.percentage,
      comparison: {
        baseline: conventionalEfficiency,
        improvement: avgSystemEfficiency - conventionalEfficiency,
        improvementPercentage: ((avgSystemEfficiency - conventionalEfficiency) / conventionalEfficiency) * 100,
      },
      breakdown: {
        totalEnergyGenerated,
        totalEnergyConsumed,
        energyUtilizationRatio: systemEfficiency,
        benchmarkEfficiency,
        performanceRating: this.getPerformanceRating(avgSystemEfficiency, benchmarkEfficiency),
        efficiencyStatus: avgSystemEfficiency >= benchmarkEfficiency ? 'excellent' : avgSystemEfficiency >= 70 ? 'good' : 'needs_improvement',
      },
      calculatedAt: new Date(),
    };
  }

  private async calculateCarbonFootprint(
    telemetryData: any[],
    request: SustainabilityMetricsDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SustainabilityMetrics> {
    // Solar systems have minimal operational carbon footprint
    // Calculate any indirect footprint from maintenance, etc.
    
    const totalEnergyGenerated = telemetryData.reduce((sum, record) => sum + (record.energyPerDayValue || 0), 0);
    
    // Minimal carbon footprint for solar operations (mainly maintenance)
    const operationalCarbonFootprint = totalEnergyGenerated * 0.02; // 0.02 kg CO2/kWh for solar operations
    
    // Compare with conventional energy sources
    const gridCarbonFootprint = totalEnergyGenerated * 0.5; // Grid electricity footprint
    const dieselCarbonFootprint = totalEnergyGenerated * 0.8; // Diesel generator footprint

    const trend = this.calculateTrend(operationalCarbonFootprint, operationalCarbonFootprint * 0.95); // Assume slight improvement

    return {
      metricType: SustainabilityMetricType.CARBON_FOOTPRINT,
      period: this.formatDateRange(startDate, endDate),
      value: Math.round(operationalCarbonFootprint * 100) / 100,
      unit: 'kg CO2',
      trend: trend.direction,
      trendPercentage: trend.percentage,
      comparison: {
        baseline: request.comparisonType === ComparisonType.GRID_ELECTRICITY ? gridCarbonFootprint : dieselCarbonFootprint,
        improvement: (request.comparisonType === ComparisonType.GRID_ELECTRICITY ? gridCarbonFootprint : dieselCarbonFootprint) - operationalCarbonFootprint,
        improvementPercentage: (1 - operationalCarbonFootprint / (request.comparisonType === ComparisonType.GRID_ELECTRICITY ? gridCarbonFootprint : dieselCarbonFootprint)) * 100,
      },
      breakdown: {
        operationalFootprint: operationalCarbonFootprint,
        gridComparison: gridCarbonFootprint,
        dieselComparison: dieselCarbonFootprint,
        totalEnergyGenerated,
        footprintIntensity: operationalCarbonFootprint / totalEnergyGenerated, // kg CO2/kWh
      },
      calculatedAt: new Date(),
    };
  }

  private async calculateRenewableEnergyPercentage(
    telemetryData: any[],
    request: SustainabilityMetricsDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SustainabilityMetrics> {
    // For solar systems, renewable energy percentage is essentially 100%
    // But we can calculate the percentage of total energy needs met by renewable sources
    
    const totalEnergyGenerated = telemetryData.reduce((sum, record) => sum + (record.energyPerDayValue || 0), 0);
    const totalEnergyConsumed = telemetryData.reduce((sum, record) => sum + (record.pumpEnergyConsumptionValue || 0), 0);

    // Calculate renewable energy percentage based on generation vs consumption
    const renewablePercentage = totalEnergyConsumed > 0 
      ? Math.min((totalEnergyGenerated / totalEnergyConsumed) * 100, 100)
      : 100;

    // Energy independence score
    const energyIndependence = totalEnergyGenerated >= totalEnergyConsumed ? 100 : renewablePercentage;

    const trend = this.calculateTrend(renewablePercentage, renewablePercentage * 0.98); // Assume slight improvement

    return {
      metricType: SustainabilityMetricType.RENEWABLE_ENERGY_PERCENTAGE,
      period: this.formatDateRange(startDate, endDate),
      value: Math.round(renewablePercentage * 100) / 100,
      unit: '%',
      trend: trend.direction,
      trendPercentage: trend.percentage,
      comparison: {
        baseline: 0, // Comparing to no renewable energy
        improvement: renewablePercentage,
        improvementPercentage: renewablePercentage, // Direct percentage
      },
      breakdown: {
        totalEnergyGenerated,
        totalEnergyConsumed,
        energyIndependence,
        excessEnergyGenerated: Math.max(0, totalEnergyGenerated - totalEnergyConsumed),
        renewableSource: 'Solar Photovoltaic',
        carbonFreeEnergy: true,
      },
      calculatedAt: new Date(),
    };
  }

  private async calculateWaterProductionEfficiency(
    telemetryData: any[],
    request: SustainabilityMetricsDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SustainabilityMetrics> {
    // Calculate water production metrics
    const totalWaterProduced = telemetryData.reduce((sum, record) => sum + (record.totalWaterVolumeM3Value || 0), 0);
    const operatingHours = telemetryData.filter(record => record.pumpStatusValue === 'Running').length;
    const totalHours = telemetryData.length;

    if (operatingHours === 0) {
      throw new BadRequestException('No pump operating data found');
    }

    // Calculate production efficiency metrics
    const waterPerHour = totalWaterProduced / operatingHours; // m³/hour
    const systemUptime = (operatingHours / totalHours) * 100; // % uptime
    const avgPressure = telemetryData.reduce((sum, record) => sum + (record.pressureSensorValue || 0), 0) / telemetryData.length;

    // Production efficiency score (0-100)
    const benchmarkProductionRate = 5.0; // m³/hour benchmark
    const productionEfficiency = Math.min((waterPerHour / benchmarkProductionRate) * 100, 100);

    const trend = this.calculateTrend(productionEfficiency, productionEfficiency * 0.95);

    return {
      metricType: SustainabilityMetricType.WATER_PRODUCTION_EFFICIENCY,
      period: this.formatDateRange(startDate, endDate),
      value: Math.round(productionEfficiency * 100) / 100,
      unit: '%',
      trend: trend.direction,
      trendPercentage: trend.percentage,
      comparison: {
        baseline: 75, // 75% baseline efficiency
        improvement: productionEfficiency - 75,
        improvementPercentage: ((productionEfficiency - 75) / 75) * 100,
      },
      breakdown: {
        totalWaterProduced,
        waterPerHour,
        systemUptime,
        avgPressure,
        operatingHours,
        benchmarkProductionRate,
        productionRating: this.getPerformanceRating(waterPerHour, benchmarkProductionRate),
      },
      calculatedAt: new Date(),
    };
  }

  private async calculateSustainabilityScore(
    telemetryData: any[],
    request: SustainabilityMetricsDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SustainabilityMetrics> {
    // Calculate individual metric scores
    const co2Metrics = await this.calculateCO2Savings(telemetryData, request, startDate, endDate);
    const waterMetrics = await this.calculateWaterEfficiency(telemetryData, request, startDate, endDate);
    const energyMetrics = await this.calculateEnergyEfficiency(telemetryData, request, startDate, endDate);
    const renewableMetrics = await this.calculateRenewableEnergyPercentage(telemetryData, request, startDate, endDate);

    // Weighted scoring system (0-100)
    const weights = {
      co2Savings: 0.3, // 30% weight
      waterEfficiency: 0.25, // 25% weight
      energyEfficiency: 0.25, // 25% weight
      renewableEnergy: 0.2, // 20% weight
    };

    // Normalize scores to 0-100 scale
    const co2Score = Math.min(co2Metrics.value / 1000 * 100, 100); // Normalize by expected annual savings
    const waterScore = Math.min(waterMetrics.value / 3.0 * 100, 100); // Normalize by excellent efficiency
    const energyScore = energyMetrics.value; // Already in percentage
    const renewableScore = renewableMetrics.value; // Already in percentage

    // Calculate composite sustainability score
    const sustainabilityScore = 
      co2Score * weights.co2Savings +
      waterScore * weights.waterEfficiency +
      energyScore * weights.energyEfficiency +
      renewableScore * weights.renewableEnergy;

    // Determine sustainability rating
    const rating = sustainabilityScore >= 90 ? 'Excellent' :
                  sustainabilityScore >= 80 ? 'Very Good' :
                  sustainabilityScore >= 70 ? 'Good' :
                  sustainabilityScore >= 60 ? 'Fair' : 'Needs Improvement';

    const trend = this.calculateTrend(sustainabilityScore, sustainabilityScore * 0.95);

    return {
      metricType: SustainabilityMetricType.SYSTEM_SUSTAINABILITY_SCORE,
      period: this.formatDateRange(startDate, endDate),
      value: Math.round(sustainabilityScore * 100) / 100,
      unit: 'Score (0-100)',
      trend: trend.direction,
      trendPercentage: trend.percentage,
      comparison: {
        baseline: 50, // 50 as baseline "average" sustainability
        improvement: sustainabilityScore - 50,
        improvementPercentage: ((sustainabilityScore - 50) / 50) * 100,
      },
      breakdown: {
        co2Score: Math.round(co2Score * 100) / 100,
        waterScore: Math.round(waterScore * 100) / 100,
        energyScore: Math.round(energyScore * 100) / 100,
        renewableScore: Math.round(renewableScore * 100) / 100,
        weights,
        rating,
        recommendations: this.getSustainabilityRecommendations(sustainabilityScore, {
          co2Score,
          waterScore,
          energyScore,
          renewableScore,
        }),
      },
      calculatedAt: new Date(),
    };
  }

  private async calculateEnvironmentalImpact(
    telemetryData: any[],
    request: SustainabilityMetricsDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SustainabilityMetrics> {
    const totalEnergyGenerated = telemetryData.reduce((sum, record) => sum + (record.energyPerDayValue || 0), 0);
    const totalWaterProduced = telemetryData.reduce((sum, record) => sum + (record.totalWaterVolumeM3Value || 0), 0);

    // Calculate comprehensive environmental impact
    const impact: EnvironmentalImpact = {
      co2Savings: totalEnergyGenerated * 0.8, // kg CO2 saved vs diesel
      waterProduced: totalWaterProduced, // m³ water produced
      energyGenerated: totalEnergyGenerated, // kWh clean energy
      fossilFuelReplaced: totalEnergyGenerated * 0.3, // liters diesel equivalent
      treesEquivalent: Math.round((totalEnergyGenerated * 0.8) / 21.77), // trees planted equivalent
      costSavings: totalEnergyGenerated * 0.15, // USD savings (rough estimate)
    };

    // Calculate composite impact score (0-100)
    const impactScore = Math.min(
      (impact.co2Savings / 10000) * 30 + // CO2 impact (30% weight)
      (impact.waterProduced / 1000) * 25 + // Water impact (25% weight)
      (impact.energyGenerated / 5000) * 25 + // Energy impact (25% weight)
      (impact.treesEquivalent / 100) * 20, // Ecosystem impact (20% weight)
      100
    );

    const trend = this.calculateTrend(impactScore, impactScore * 0.95);

    return {
      metricType: SustainabilityMetricType.ENVIRONMENTAL_IMPACT,
      period: this.formatDateRange(startDate, endDate),
      value: Math.round(impactScore * 100) / 100,
      unit: 'Impact Score (0-100)',
      trend: trend.direction,
      trendPercentage: trend.percentage,
      comparison: {
        baseline: 0, // Baseline of no environmental benefit
        improvement: impactScore,
        improvementPercentage: impactScore, // Direct percentage improvement
      },
      breakdown: {
        ...impact,
        impactCategories: {
          climateAction: impact.co2Savings,
          waterSecurity: impact.waterProduced,
          energyTransition: impact.energyGenerated,
          ecosystemBenefit: impact.treesEquivalent,
          economicBenefit: impact.costSavings,
        },
        sdgAlignment: [
          'SDG 6: Clean Water and Sanitation',
          'SDG 7: Affordable and Clean Energy',
          'SDG 13: Climate Action',
          'SDG 15: Life on Land',
        ],
      },
      calculatedAt: new Date(),
    };
  }

  // Helper methods
  private async validateUserAccess(userId: string, clientId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        client: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Super admin and admin can access any client's data
    if (['super_user', 'admin'].includes(user.role.name)) {
      return user;
    }

    // Regular users can only access their own client's data
    if (clientId && user.clientId !== clientId) {
      throw new BadRequestException('Access denied to client data');
    }

    return user;
  }

  private calculateDateRange(request: SustainabilityMetricsDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    if (request.period === CalculationPeriod.CUSTOM) {
      if (!request.startDate || !request.endDate) {
        throw new BadRequestException('Start date and end date are required for custom period');
      }
      startDate = new Date(request.startDate);
      endDate = new Date(request.endDate);
    } else {
      switch (request.period) {
        case CalculationPeriod.DAILY:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          break;
        case CalculationPeriod.WEEKLY:
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
          startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case CalculationPeriod.MONTHLY:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case CalculationPeriod.QUARTERLY:
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
          break;
        case CalculationPeriod.YEARLY:
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
    }

    return { startDate, endDate };
  }

  private async getTelemetryData(request: SustainabilityMetricsDto, startDate: Date, endDate: Date) {
    const deviceFilter = {
      ...(request.clientId ? { clientId: request.clientId } : {}),
      ...(request.deviceIds ? { id: { in: request.deviceIds } } : {}),
    };

    return await this.prisma.telemetryEvent.findMany({
      where: {
        device: deviceFilter,
        time: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        device: {
          select: {
            id: true,
            deviceCode: true,
            deviceName: true,
          },
        },
      },
      orderBy: { time: 'desc' },
    });
  }

  private async getPreviousPeriodData(request: SustainabilityMetricsDto, startDate: Date, endDate: Date) {
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate);

    return await this.getTelemetryData(
      { ...request, startDate: previousStartDate.toISOString(), endDate: previousEndDate.toISOString() },
      previousStartDate,
      previousEndDate,
    );
  }

  private calculateTrend(currentValue: number, previousValue: number): { direction: 'increasing' | 'decreasing' | 'stable'; percentage: number } {
    if (previousValue === 0) {
      return { direction: 'stable', percentage: 0 };
    }

    const percentage = ((currentValue - previousValue) / previousValue) * 100;
    const direction = Math.abs(percentage) < 2 ? 'stable' : percentage > 0 ? 'increasing' : 'decreasing';
    
    return { direction, percentage: Math.round(Math.abs(percentage) * 100) / 100 };
  }

  private formatDateRange(startDate: Date, endDate: Date): string {
    return `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
  }

  private getPerformanceRating(value: number, benchmark: number): string {
    const ratio = value / benchmark;
    return ratio >= 1.2 ? 'Excellent' :
           ratio >= 1.0 ? 'Good' :
           ratio >= 0.8 ? 'Fair' :
           'Needs Improvement';
  }

  private getEfficiencyGrade(value: number, benchmark: number): string {
    const ratio = value / benchmark;
    return ratio >= 1.3 ? 'A+' :
           ratio >= 1.1 ? 'A' :
           ratio >= 0.9 ? 'B' :
           ratio >= 0.7 ? 'C' :
           'D';
  }

  private getSustainabilityRecommendations(score: number, breakdown: any): string[] {
    const recommendations: string[] = [];

    if (score < 70) {
      recommendations.push('Overall system sustainability needs improvement');
    }

    if (breakdown.energyScore < 80) {
      recommendations.push('Optimize energy efficiency through system maintenance and component upgrades');
    }

    if (breakdown.waterScore < 75) {
      recommendations.push('Improve water production efficiency by optimizing pump operations and pressure settings');
    }

    if (breakdown.co2Score < 80) {
      recommendations.push('Maximize solar energy utilization to increase CO2 savings');
    }

    if (breakdown.renewableScore < 95) {
      recommendations.push('Consider energy storage to maximize renewable energy usage');
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent sustainability performance! Maintain current operations and consider expansion.');
    }

    return recommendations;
  }

  // Previous period calculation helpers
  private calculatePreviousCO2Savings(previousData: any[], comparisonType?: ComparisonType): number {
    if (previousData.length === 0) return 0;
    const totalEnergy = previousData.reduce((sum, record) => sum + (record.energyPerDayValue || 0), 0);
    const emissionsFactor = comparisonType === ComparisonType.GRID_ELECTRICITY ? 0.5 : 0.8;
    return totalEnergy * emissionsFactor;
  }

  private calculatePreviousWaterEfficiency(previousData: any[]): number {
    if (previousData.length === 0) return 0;
    const totalWater = previousData.reduce((sum, record) => sum + (record.totalWaterVolumeM3Value || 0), 0);
    const totalEnergy = previousData.reduce((sum, record) => sum + (record.pumpEnergyConsumptionValue || 0), 0);
    return totalEnergy > 0 ? totalWater / totalEnergy : 0;
  }

  private calculatePreviousEnergyEfficiency(previousData: any[]): number {
    if (previousData.length === 0) return 0;
    const efficiencyRecords = previousData.filter(record => record.extras?.systemEfficiency);
    return efficiencyRecords.length > 0 
      ? efficiencyRecords.reduce((sum, record) => sum + (record.extras.systemEfficiency * 100), 0) / efficiencyRecords.length
      : 75; // Default assumption
  }

  async getComprehensiveSustainabilityReport(
    clientId: string,
    userId: string,
    period: CalculationPeriod = CalculationPeriod.MONTHLY,
  ) {
    const baseRequest: SustainabilityMetricsDto = {
      metricType: SustainabilityMetricType.CO2_SAVINGS, // Will be overridden
      period,
      clientId,
    };

    // Calculate all metrics in parallel
    const [
      co2Metrics,
      waterEfficiency,
      energyEfficiency,
      carbonFootprint,
      renewableEnergy,
      waterProduction,
      sustainabilityScore,
      environmentalImpact,
    ] = await Promise.all([
      this.calculateSustainabilityMetrics({ ...baseRequest, metricType: SustainabilityMetricType.CO2_SAVINGS }, userId),
      this.calculateSustainabilityMetrics({ ...baseRequest, metricType: SustainabilityMetricType.WATER_EFFICIENCY }, userId),
      this.calculateSustainabilityMetrics({ ...baseRequest, metricType: SustainabilityMetricType.ENERGY_EFFICIENCY }, userId),
      this.calculateSustainabilityMetrics({ ...baseRequest, metricType: SustainabilityMetricType.CARBON_FOOTPRINT }, userId),
      this.calculateSustainabilityMetrics({ ...baseRequest, metricType: SustainabilityMetricType.RENEWABLE_ENERGY_PERCENTAGE }, userId),
      this.calculateSustainabilityMetrics({ ...baseRequest, metricType: SustainabilityMetricType.WATER_PRODUCTION_EFFICIENCY }, userId),
      this.calculateSustainabilityMetrics({ ...baseRequest, metricType: SustainabilityMetricType.SYSTEM_SUSTAINABILITY_SCORE }, userId),
      this.calculateSustainabilityMetrics({ ...baseRequest, metricType: SustainabilityMetricType.ENVIRONMENTAL_IMPACT }, userId),
    ]);

    return {
      reportId: `sustainability_${clientId}_${Date.now()}`,
      clientId,
      period,
      generatedAt: new Date(),
      metrics: {
        co2Savings: co2Metrics,
        waterEfficiency: waterEfficiency,
        energyEfficiency: energyEfficiency,
        carbonFootprint: carbonFootprint,
        renewableEnergy: renewableEnergy,
        waterProduction: waterProduction,
        sustainabilityScore: sustainabilityScore,
        environmentalImpact: environmentalImpact,
      },
      summary: {
        overallScore: sustainabilityScore.value,
        rating: sustainabilityScore.breakdown.rating,
        keyAchievements: [
          `${co2Metrics.value} kg CO2 emissions avoided`,
          `${waterEfficiency.value} m³/kWh water efficiency achieved`,
          `${renewableEnergy.value}% renewable energy utilization`,
          `${environmentalImpact.breakdown.treesEquivalent} trees equivalent CO2 absorption`,
        ],
        recommendations: sustainabilityScore.breakdown.recommendations,
      },
    };
  }

  // Enhanced sustainability metrics with exchange rate integration
  async calculateMoneySavedWithExchangeRates(
    deviceIds: string[],
    startDate: Date,
    endDate: Date,
    baselineEnergySource: 'grid' | 'diesel' = 'grid',
  ) {
    this.logger.log(`Calculating money saved with exchange rates for ${deviceIds.length} devices`);

    try {
      // Get current exchange rate for EGP to USD
      const currentExchangeRate = await this.exchangeRatesService.getCurrentRate('EGP', 'USD');
      
      if (!currentExchangeRate) {
        throw new BadRequestException('No active exchange rate found for EGP to USD conversion');
      }

      // Get telemetry data for the period
      const telemetryData = await this.prisma.telemetryEvent.findMany({
        where: {
          deviceId: { in: deviceIds },
          time: { gte: startDate, lte: endDate },
        },
        include: {
          device: {
            include: {
              client: {
                select: {
                  electricityRateEgp: true,
                  replacingSource: true,
                },
              },
            },
          },
        },
      });

      if (telemetryData.length === 0) {
        throw new NotFoundException('No telemetry data found for the specified period');
      }

      const results = [];
      
      // Group by device to calculate individual savings
      const deviceGroups = this.groupBy(telemetryData, 'deviceId');
      
      for (const [deviceId, deviceTelemetry] of Object.entries(deviceGroups)) {
        const device = deviceTelemetry[0].device;
        const electricityRateEgp = parseFloat(device.client?.electricityRateEgp?.toString() || '2.15'); // Default EGP rate per kWh (2.15 EGP/kWh as per requirements)
        
        // Calculate total energy generated/saved
        const totalEnergyKwh = deviceTelemetry.reduce((sum, record) => {
          return sum + (record.energyPerDayValue || 0);
        }, 0);

        // Calculate money saved in EGP
        let baselineRateEgpPerKwh = electricityRateEgp;
        
        if (baselineEnergySource === 'diesel') {
          // Diesel cost calculation: ~4 EGP per liter, ~3.5 kWh per liter
          baselineRateEgpPerKwh = 4.0 / 3.5; // ~1.14 EGP per kWh
        }

        const moneySavedEgp = totalEnergyKwh * baselineRateEgpPerKwh;
        const moneySavedUsd = moneySavedEgp * parseFloat(currentExchangeRate.rate.toString());

        // Store the calculation result in database
        const sustainabilityMetric = await this.prisma.sustainabilityMetric.upsert({
          where: {
            deviceId_date: {
              deviceId: deviceId,
              date: startDate,
            },
          },
          update: {
            moneySavedEgp: moneySavedEgp,
            moneySavedUsd: moneySavedUsd,
            exchangeRateUsed: currentExchangeRate.rate,
            exchangeRateDate: currentExchangeRate.effectiveFrom,
            calculationMethod: `${baselineEnergySource}_baseline_${currentExchangeRate.id}`,
            calculationDetails: {
              totalEnergyKwh,
              baselineEnergySource,
              electricityRateEgpPerKwh: baselineRateEgpPerKwh,
              exchangeRateId: currentExchangeRate.id,
              calculatedAt: new Date(),
            },
          },
          create: {
            deviceId: deviceId,
            date: startDate,
            totalEnergyMwh: totalEnergyKwh / 1000, // Convert to MWh
            moneySavedEgp: moneySavedEgp,
            moneySavedUsd: moneySavedUsd,
            exchangeRateUsed: currentExchangeRate.rate,
            exchangeRateDate: currentExchangeRate.effectiveFrom,
            calculationMethod: `${baselineEnergySource}_baseline_${currentExchangeRate.id}`,
            calculationDetails: {
              totalEnergyKwh,
              baselineEnergySource,
              electricityRateEgpPerKwh: baselineRateEgpPerKwh,
              exchangeRateId: currentExchangeRate.id,
              calculatedAt: new Date(),
            },
          },
        });

        results.push({
          deviceId,
          deviceName: device.deviceName,
          deviceCode: device.deviceCode,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          energyMetrics: {
            totalEnergyKwh,
            baselineEnergySource,
            electricityRateEgpPerKwh: baselineRateEgpPerKwh,
          },
          moneySaved: {
            egp: Math.round(moneySavedEgp * 100) / 100,
            usd: Math.round(moneySavedUsd * 100) / 100,
          },
          exchangeRate: {
            rate: parseFloat(currentExchangeRate.rate.toString()),
            effectiveDate: currentExchangeRate.effectiveFrom,
            rateId: currentExchangeRate.id,
          },
          sustainabilityMetricId: sustainabilityMetric.id,
        });
      }

      return {
        calculationDate: new Date(),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        exchangeRateInfo: {
          baseCurrency: 'EGP',
          targetCurrency: 'USD',
          rate: parseFloat(currentExchangeRate.rate.toString()),
          effectiveDate: currentExchangeRate.effectiveFrom,
        },
        summary: {
          totalDevices: results.length,
          totalEnergyKwh: results.reduce((sum, r) => sum + r.energyMetrics.totalEnergyKwh, 0),
          totalMoneySavedEgp: results.reduce((sum, r) => sum + r.moneySaved.egp, 0),
          totalMoneySavedUsd: results.reduce((sum, r) => sum + r.moneySaved.usd, 0),
          averageSavingsPerDevice: {
            egp: results.reduce((sum, r) => sum + r.moneySaved.egp, 0) / results.length,
            usd: results.reduce((sum, r) => sum + r.moneySaved.usd, 0) / results.length,
          },
        },
        deviceResults: results,
      };

    } catch (error) {
      this.logger.error(`Error calculating money saved with exchange rates: ${error.message}`);
      throw error;
    }
  }

  async getSustainabilityMetricsWithFiltering(
    deviceIds?: string[],
    startDate?: Date,
    endDate?: Date,
    includeCurrencyConversion: boolean = true,
  ) {
    this.logger.log(`Getting sustainability metrics with filtering`);

    const where: any = {};
    
    if (deviceIds?.length) {
      where.deviceId = { in: deviceIds };
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const metrics = await this.prisma.sustainabilityMetric.findMany({
      where,
      include: {
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
            clientId: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { device: { deviceName: 'asc' } },
      ],
    });

    // If currency conversion is needed and we have EGP values without USD
    if (includeCurrencyConversion) {
      const currentExchangeRate = await this.exchangeRatesService.getCurrentRate('EGP', 'USD');
      
      for (const metric of metrics) {
        if (metric.moneySavedEgp && !metric.moneySavedUsd && currentExchangeRate) {
          // Update with current USD conversion
          await this.prisma.sustainabilityMetric.update({
            where: { id: metric.id },
            data: {
              moneySavedUsd: parseFloat(metric.moneySavedEgp.toString()) * parseFloat(currentExchangeRate.rate.toString()),
              exchangeRateUsed: currentExchangeRate.rate,
              exchangeRateDate: currentExchangeRate.effectiveFrom,
            },
          });
        }
      }
    }

    return {
      totalRecords: metrics.length,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      summary: {
        totalMoneySavedEgp: metrics.reduce((sum, m) => sum + (m.moneySavedEgp ? parseFloat(m.moneySavedEgp.toString()) : 0), 0),
        totalMoneySavedUsd: metrics.reduce((sum, m) => sum + (m.moneySavedUsd ? parseFloat(m.moneySavedUsd.toString()) : 0), 0),
        totalCo2MitigatedTons: metrics.reduce((sum, m) => sum + (m.co2MitigatedTons || 0), 0),
        totalEnergyMwh: metrics.reduce((sum, m) => sum + (m.totalEnergyMwh || 0), 0),
        uniqueDevices: new Set(metrics.map(m => m.deviceId)).size,
      },
      metrics: metrics.map(metric => ({
        ...metric,
        moneySavedEgp: metric.moneySavedEgp ? parseFloat(metric.moneySavedEgp.toString()) : null,
        moneySavedUsd: metric.moneySavedUsd ? parseFloat(metric.moneySavedUsd.toString()) : null,
        co2MitigatedTons: metric.co2MitigatedTons || null,
        totalEnergyMwh: metric.totalEnergyMwh || null,
        exchangeRateUsed: metric.exchangeRateUsed ? parseFloat(metric.exchangeRateUsed.toString()) : null,
      })),
    };
  }

  async calculateCustomSustainabilityMetrics(
    deviceId: string,
    formulaId: string,
    startDate: Date,
    endDate: Date,
  ) {
    this.logger.log(`Calculating custom sustainability metrics for device ${deviceId} using formula ${formulaId}`);

    try {
      // Get all telemetry data for the period
      const telemetryRecords = await this.prisma.telemetryEvent.findMany({
        where: {
          deviceId,
          time: { gte: startDate, lte: endDate },
        },
        orderBy: { time: 'asc' },
      });

      if (telemetryRecords.length === 0) {
        throw new NotFoundException('No telemetry data found for the specified device and period');
      }

      const calculationResults = [];

      // Calculate custom metrics for each telemetry record
      for (const telemetryRecord of telemetryRecords) {
        try {
          const result = await this.customCalculationsService.calculateForDevice({
            deviceId,
            formulaId,
            timestamp: telemetryRecord.time.toISOString(),
          });

          calculationResults.push({
            timestamp: telemetryRecord.time,
            telemetryId: telemetryRecord.id,
            calculationResult: result,
          });
        } catch (error) {
          this.logger.warn(`Failed to calculate custom metric for timestamp ${telemetryRecord.time}: ${error.message}`);
        }
      }

      // Aggregate the results
      const validResults = calculationResults.filter(r => r.calculationResult.isValid);
      const totalResults = validResults.length;
      const averageValue = totalResults > 0 
        ? validResults.reduce((sum, r) => sum + r.calculationResult.result, 0) / totalResults
        : 0;

      return {
        deviceId,
        formulaId,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: {
          totalCalculations: calculationResults.length,
          validCalculations: validResults.length,
          failedCalculations: calculationResults.length - validResults.length,
          averageValue: Math.round(averageValue * 100) / 100,
          minValue: validResults.length > 0 ? Math.min(...validResults.map(r => r.calculationResult.result)) : null,
          maxValue: validResults.length > 0 ? Math.max(...validResults.map(r => r.calculationResult.result)) : null,
        },
        calculationResults: calculationResults,
        formula: validResults.length > 0 ? validResults[0].calculationResult.formula : null,
      };

    } catch (error) {
      this.logger.error(`Error calculating custom sustainability metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate daily and cumulative money saved with proper separation
   * This provides both daily savings and cumulative total as required
   */
  async calculateDailyAndCumulativeMoneySaved(
    deviceIds: string[],
    startDate: Date,
    endDate: Date,
    baselineEnergySource: 'grid' | 'diesel' = 'grid',
  ) {
    this.logger.log(`Calculating daily and cumulative money saved for ${deviceIds.length} devices`);

    try {
      // Get current exchange rate
      const currentExchangeRate = await this.exchangeRatesService.getCurrentRate('EGP', 'USD');
      
      if (!currentExchangeRate) {
        throw new BadRequestException('No active exchange rate found for EGP to USD conversion');
      }

      // Get telemetry data grouped by day and device
      const telemetryData = await this.prisma.telemetryEvent.findMany({
        where: {
          deviceId: { in: deviceIds },
          time: { gte: startDate, lte: endDate },
        },
        include: {
          device: {
            include: {
              client: {
                select: {
                  electricityRateEgp: true,
                  replacingSource: true,
                },
              },
            },
          },
        },
        orderBy: { time: 'asc' },
      });

      if (telemetryData.length === 0) {
        throw new NotFoundException('No telemetry data found for the specified period');
      }

      // Group data by date and device
      const dailySavings: any[] = [];
      const deviceGroups = this.groupBy(telemetryData, 'deviceId');
      
      let totalCumulativeEgp = 0;
      let totalCumulativeUsd = 0;

      for (const [deviceId, deviceTelemetry] of Object.entries(deviceGroups)) {
        const device = deviceTelemetry[0].device;
        const electricityRateEgp = parseFloat(device.client?.electricityRateEgp?.toString() || '2.15');
        
        // Group by date for daily calculations
        const dailyGroups = this.groupTelemetryByDay(deviceTelemetry);
        
        let deviceCumulativeEgp = 0;
        let deviceCumulativeUsd = 0;

        for (const [dateStr, dayTelemetry] of Object.entries(dailyGroups)) {
          // Calculate daily energy for this device
          const dailyEnergyKwh = dayTelemetry.reduce((sum, record) => {
            return sum + (record.energyPerDayValue || 0);
          }, 0);

          // Calculate baseline rate
          let baselineRateEgpPerKwh = electricityRateEgp;
          if (baselineEnergySource === 'diesel') {
            baselineRateEgpPerKwh = 4.0 / 3.5; // ~1.14 EGP per kWh
          }

          // Calculate daily savings
          const dailyMoneySavedEgp = dailyEnergyKwh * baselineRateEgpPerKwh;
          const dailyMoneySavedUsd = dailyMoneySavedEgp * parseFloat(currentExchangeRate.rate.toString());

          // Update cumulative totals
          deviceCumulativeEgp += dailyMoneySavedEgp;
          deviceCumulativeUsd += dailyMoneySavedUsd;
          totalCumulativeEgp += dailyMoneySavedEgp;
          totalCumulativeUsd += dailyMoneySavedUsd;

          dailySavings.push({
            date: dateStr,
            deviceId,
            deviceName: device.deviceName,
            deviceCode: device.deviceCode,
            dailyEnergyKwh: Math.round(dailyEnergyKwh * 100) / 100,
            dailySavings: {
              egp: Math.round(dailyMoneySavedEgp * 100) / 100,
              usd: Math.round(dailyMoneySavedUsd * 100) / 100,
            },
            cumulativeSavings: {
              egp: Math.round(deviceCumulativeEgp * 100) / 100,
              usd: Math.round(deviceCumulativeUsd * 100) / 100,
            },
            electricityRateEgpPerKwh: baselineRateEgpPerKwh,
            baselineEnergySource,
          });
        }
      }

      return {
        calculationDate: new Date(),
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        exchangeRateInfo: {
          baseCurrency: 'EGP',
          targetCurrency: 'USD',
          rate: parseFloat(currentExchangeRate.rate.toString()),
          effectiveDate: currentExchangeRate.effectiveFrom,
        },
        summary: {
          totalDevices: new Set(dailySavings.map(s => s.deviceId)).size,
          totalDays: dailySavings.length,
          totalCumulativeSavings: {
            egp: Math.round(totalCumulativeEgp * 100) / 100,
            usd: Math.round(totalCumulativeUsd * 100) / 100,
          },
          averageDailySavings: {
            egp: dailySavings.length > 0 ? Math.round((totalCumulativeEgp / dailySavings.length) * 100) / 100 : 0,
            usd: dailySavings.length > 0 ? Math.round((totalCumulativeUsd / dailySavings.length) * 100) / 100 : 0,
          },
          electricityRateUsed: {
            egp: parseFloat(telemetryData[0]?.device?.client?.electricityRateEgp?.toString() || '2.15'),
            source: baselineEnergySource,
            ratePerKwh: baselineEnergySource === 'diesel' ? 1.14 : parseFloat(telemetryData[0]?.device?.client?.electricityRateEgp?.toString() || '2.15'),
          },
        },
        dailyBreakdown: dailySavings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      };

    } catch (error) {
      this.logger.error(`Error calculating daily and cumulative money saved: ${error.message}`);
      throw error;
    }
  }

  /**
   * Group telemetry records by day (YYYY-MM-DD format)
   */
  private groupTelemetryByDay(telemetryData: any[]): Record<string, any[]> {
    return telemetryData.reduce((groups, record) => {
      const dateStr = record.time.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(record);
      return groups;
    }, {});
  }

  // Helper method to group array by key
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const group = String(item[key]);
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }
}