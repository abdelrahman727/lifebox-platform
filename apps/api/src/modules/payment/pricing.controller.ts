// src/modules/payment/pricing.controller.ts
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
  BadRequestException,
  NotFoundException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { CreditService } from './services/credit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface CreatePricingDto {
  clientId: string;
  pricingType: 'energy' | 'water_flow';
  rateValue: number;
  perUnit: number;
  unitType: 'kwh' | 'm3_per_hr';
}

interface CreatePostpaidPeriodDto {
  clientId: string;
  startDate: string;
  endDate: string;
}

@ApiTags('pricing')
@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {}

  /**
   * Get client pricing configuration
   */
  @Get('clients/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get client pricing configuration',
    description: 'Retrieve pricing configuration for a specific client'
  })
  async getClientPricing(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any
  ) {
    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin' && user.clientId !== clientId) {
      throw new BadRequestException('Access denied to client pricing');
    }

    const [pricing, client] = await Promise.all([
      this.prisma.customerPricing.findMany({
        where: { clientId },
        include: {
          creator: {
            select: { fullName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.client.findUnique({
        where: { id: clientId },
        select: {
          name: true,
          electricityRateEgp: true,
          billingType: true
        }
      })
    ]);

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return {
      client,
      customPricing: pricing,
      defaultElectricityRate: client.electricityRateEgp
    };
  }

  /**
   * Create custom pricing for client
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Post('clients/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create custom pricing',
    description: 'Create custom pricing configuration for a client'
  })
  async createClientPricing(
    @Param('clientId') clientId: string,
    @Body() pricingDto: CreatePricingDto,
    @CurrentUser() user: any
  ) {
    // Validate client exists
    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Deactivate existing pricing
    await this.prisma.customerPricing.updateMany({
      where: { clientId, isActive: true },
      data: { isActive: false }
    });

    // Create new pricing
    const pricing = await this.prisma.customerPricing.create({
      data: {
        clientId,
        pricingType: pricingDto.pricingType,
        rateValue: pricingDto.rateValue,
        perUnit: pricingDto.perUnit,
        unitType: pricingDto.unitType,
        createdBy: user.id
      },
      include: {
        creator: {
          select: { fullName: true, email: true }
        }
      }
    });

    return {
      message: 'Custom pricing created successfully',
      pricing
    };
  }

  /**
   * Update client pricing
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Put(':pricingId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update pricing configuration',
    description: 'Update existing pricing configuration'
  })
  async updatePricing(
    @Param('pricingId') pricingId: string,
    @Body() updateData: Partial<CreatePricingDto>
  ) {
    const pricing = await this.prisma.customerPricing.findUnique({
      where: { id: pricingId }
    });

    if (!pricing) {
      throw new NotFoundException('Pricing configuration not found');
    }

    const updatedPricing = await this.prisma.customerPricing.update({
      where: { id: pricingId },
      data: updateData,
      include: {
        creator: {
          select: { fullName: true, email: true }
        }
      }
    });

    return {
      message: 'Pricing updated successfully',
      pricing: updatedPricing
    };
  }

  /**
   * Delete pricing configuration
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Delete(':pricingId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete pricing configuration',
    description: 'Delete a pricing configuration'
  })
  async deletePricing(@Param('pricingId') pricingId: string) {
    const pricing = await this.prisma.customerPricing.findUnique({
      where: { id: pricingId }
    });

    if (!pricing) {
      throw new NotFoundException('Pricing configuration not found');
    }

    await this.prisma.customerPricing.delete({
      where: { id: pricingId }
    });

    return {
      message: 'Pricing configuration deleted successfully'
    };
  }

  /**
   * Get postpaid periods for client
   */
  @Get('postpaid/:clientId/periods')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get postpaid periods',
    description: 'Retrieve postpaid billing periods for a client'
  })
  async getPostpaidPeriods(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any
  ) {
    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin' && user.clientId !== clientId) {
      throw new BadRequestException('Access denied to postpaid periods');
    }

    const periods = await this.prisma.postpaidPeriod.findMany({
      where: { clientId },
      include: {
        creator: {
          select: { fullName: true, email: true }
        },
        usageTracking: {
          select: {
            energyConsumedKwh: true,
            waterPumpedM3: true,
            costEgp: true
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    return periods.map(period => ({
      ...period,
      totalUsage: period.usageTracking.reduce((sum, usage) => ({
        energyKwh: sum.energyKwh + (usage.energyConsumedKwh || 0),
        waterM3: sum.waterM3 + (usage.waterPumpedM3 || 0),
        cost: sum.cost + Number(usage.costEgp || 0)
      }), { energyKwh: 0, waterM3: 0, cost: 0 })
    }));
  }

  /**
   * Create postpaid period
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Post('postpaid/:clientId/periods')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create postpaid period',
    description: 'Create a new postpaid billing period for a client'
  })
  async createPostpaidPeriod(
    @Param('clientId') clientId: string,
    @Body() periodDto: CreatePostpaidPeriodDto,
    @CurrentUser() user: any
  ) {
    // Validate client exists and is postpaid
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { billingType: true, name: true }
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (client.billingType !== 'postpaid') {
      throw new BadRequestException('Client is not on postpaid billing');
    }

    const startDate = new Date(periodDto.startDate);
    const endDate = new Date(periodDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check for overlapping periods
    const overlapping = await this.prisma.postpaidPeriod.findFirst({
      where: {
        clientId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate }
          }
        ]
      }
    });

    if (overlapping) {
      throw new BadRequestException('Period overlaps with existing billing period');
    }

    // Deactivate current active period
    await this.prisma.postpaidPeriod.updateMany({
      where: { clientId, isActive: true },
      data: { isActive: false }
    });

    const period = await this.prisma.postpaidPeriod.create({
      data: {
        clientId,
        startDate,
        endDate,
        createdBy: user.id
      },
      include: {
        creator: {
          select: { fullName: true, email: true }
        }
      }
    });

    return {
      message: 'Postpaid period created successfully',
      period
    };
  }

  /**
   * Calculate usage cost for client
   */
  @Post('calculate-cost/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Calculate usage cost',
    description: 'Calculate cost for given energy and water usage'
  })
  async calculateUsageCost(
    @Param('clientId') clientId: string,
    @Body() usageData: {
      energyKwh?: number;
      waterM3PerHr?: number;
    },
    @CurrentUser() user: any
  ) {
    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin' && user.clientId !== clientId) {
      throw new BadRequestException('Access denied to cost calculation');
    }

    const cost = await this.creditService.calculateUsageCost(
      clientId,
      usageData.energyKwh || 0,
      usageData.waterM3PerHr || 0
    );

    return {
      clientId,
      usage: usageData,
      calculatedCost: cost,
      currency: 'EGP'
    };
  }

  /**
   * Get usage tracking for postpaid client
   */
  @Get('usage/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get usage tracking',
    description: 'Retrieve usage tracking data for a client'
  })
  async getUsageTracking(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
    @Query('periodId') periodId?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0
  ) {
    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin' && user.clientId !== clientId) {
      throw new BadRequestException('Access denied to usage tracking');
    }

    const whereClause: any = { clientId };
    if (periodId) {
      whereClause.postpaidPeriodId = periodId;
    }

    const [usage, total] = await Promise.all([
      this.prisma.usageTracking.findMany({
        where: whereClause,
        include: {
          device: {
            select: { deviceName: true, deviceCode: true }
          },
          postpaidPeriod: {
            select: { startDate: true, endDate: true }
          }
        },
        orderBy: { sessionStart: 'desc' },
        take: limit,
        skip: offset
      }),
      this.prisma.usageTracking.count({
        where: whereClause
      })
    ]);

    return {
      usage,
      total,
      hasMore: offset + limit < total,
      pagination: {
        limit,
        offset,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get usage summary for client
   */
  @Get('usage-summary/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get usage summary',
    description: 'Retrieve usage summary for a client'
  })
  async getUsageSummary(
    @Param('clientId') clientId: string,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
    @CurrentUser() user: any
  ) {
    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin' && user.clientId !== clientId) {
      throw new BadRequestException('Access denied to usage summary');
    }

    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const summary = await this.prisma.usageTracking.aggregate({
      where: {
        clientId,
        sessionStart: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        energyConsumedKwh: true,
        waterPumpedM3: true,
        costEgp: true
      },
      _count: true,
      _avg: {
        energyConsumedKwh: true,
        waterPumpedM3: true,
        costEgp: true
      }
    });

    // Get daily breakdown
    const dailyUsage = await this.prisma.$queryRaw`
      SELECT 
        DATE(session_start) as date,
        SUM(energy_consumed_kwh)::float as energy,
        SUM(water_pumped_m3)::float as water,
        SUM(cost_egp)::float as cost,
        COUNT(*)::int as sessions
      FROM usage_tracking
      WHERE client_id = ${clientId}
        AND session_start >= ${startDate}
        AND session_start <= ${endDate}
      GROUP BY DATE(session_start)
      ORDER BY date ASC
    `;

    return {
      period,
      summary: {
        totalEnergy: Number(summary._sum.energyConsumedKwh || 0),
        totalWater: Number(summary._sum.waterPumpedM3 || 0),
        totalCost: Number(summary._sum.costEgp || 0),
        totalSessions: summary._count,
        averageEnergy: Number(summary._avg.energyConsumedKwh || 0),
        averageWater: Number(summary._avg.waterPumpedM3 || 0),
        averageCost: Number(summary._avg.costEgp || 0)
      },
      dailyBreakdown: (dailyUsage as any[]).map(day => ({
        date: day.date.toISOString().split('T')[0],
        energy: day.energy,
        water: day.water,
        cost: day.cost,
        sessions: day.sessions
      }))
    };
  }

  /**
   * Update client electricity rate
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Put('electricity-rate/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update electricity rate',
    description: 'Update default electricity rate for a client'
  })
  async updateElectricityRate(
    @Param('clientId') clientId: string,
    @Body() rateData: { electricityRateEgp: number }
  ) {
    if (rateData.electricityRateEgp <= 0) {
      throw new BadRequestException('Electricity rate must be positive');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: { electricityRateEgp: rateData.electricityRateEgp },
      select: {
        id: true,
        name: true,
        electricityRateEgp: true,
        updatedAt: true
      }
    });

    return {
      message: 'Electricity rate updated successfully',
      client: updatedClient
    };
  }

  /**
   * Switch client billing type
   */
  @UseGuards(RolesGuard)
  @Roles('super_user')
  @Put('billing-type/:clientId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Switch billing type',
    description: 'Switch client between prepaid and postpaid billing (Super User only)'
  })
  async switchBillingType(
    @Param('clientId') clientId: string,
    @Body() billingData: { billingType: 'prepaid' | 'postpaid' }
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { billingType: true, name: true, credit: true }
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (client.billingType === billingData.billingType) {
      throw new BadRequestException(`Client is already on ${billingData.billingType} billing`);
    }

    // Additional validation for switching to prepaid
    if (billingData.billingType === 'prepaid' && Number(client.credit) < 0) {
      throw new BadRequestException('Cannot switch to prepaid with negative balance. Please clear outstanding amount first.');
    }

    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: { billingType: billingData.billingType },
      select: {
        id: true,
        name: true,
        billingType: true,
        credit: true,
        updatedAt: true
      }
    });

    return {
      message: `Billing type switched to ${billingData.billingType} successfully`,
      client: updatedClient
    };
  }
}