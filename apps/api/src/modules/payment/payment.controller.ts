// src/modules/payment/payment.controller.ts
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FawryQueryService } from './services/fawry-query.service';
import { CreditService } from './services/credit.service';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(
    private readonly fawryQueryService: FawryQueryService,
    private readonly creditService: CreditService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get payment analytics dashboard
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Get('analytics')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment analytics',
    description: 'Retrieve payment analytics for dashboard',
  })
  async getPaymentAnalytics(
    @Query('clientId') clientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.fawryQueryService.getPaymentAnalytics(clientId, start, end);
  }

  /**
   * Get credit analytics dashboard
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Get('credit-analytics')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get credit analytics',
    description: 'Retrieve credit usage analytics for dashboard',
  })
  async getCreditAnalytics(
    @Query('clientId') clientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.fawryQueryService.getCreditAnalytics(clientId, start, end);
  }

  /**
   * Get payment history with advanced filters
   */
  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment history',
    description: 'Retrieve payment history with advanced filtering',
  })
  async getPaymentHistory(
    @CurrentUser() user: any,
    @Query('clientId') clientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('sortBy') sortBy?: 'amount' | 'date' | 'status',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin') {
      if (!clientId || clientId !== user.clientId) {
        throw new BadRequestException('Access denied to payment history');
      }
    }

    const query = {
      clientId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      paymentMethod,
      paymentStatus,
      minAmount,
      maxAmount,
      limit,
      offset,
      sortBy,
      sortOrder,
    };

    return this.fawryQueryService.getPaymentHistory(query);
  }

  /**
   * Get client payment summary
   */
  @Get('summary/:clientId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client payment summary',
    description: 'Retrieve payment summary for a specific client',
  })
  async getClientPaymentSummary(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
  ) {
    // Check access permissions
    if (
      user.role.name !== 'super_user' &&
      user.role.name !== 'admin' &&
      user.clientId !== clientId
    ) {
      throw new BadRequestException('Access denied to client payment summary');
    }

    return this.fawryQueryService.getClientPaymentSummary(clientId);
  }

  /**
   * Get payment trends
   */
  @Get('trends')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment trends',
    description: 'Retrieve payment trends for charts',
  })
  async getPaymentTrends(
    @CurrentUser() user: any,
    @Query('clientId') clientId?: string,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ) {
    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin') {
      if (!clientId || clientId !== user.clientId) {
        throw new BadRequestException('Access denied to payment trends');
      }
    }

    return this.fawryQueryService.getPaymentTrends(clientId, period);
  }

  /**
   * Search payments
   */
  @Get('search')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search payments',
    description: 'Search payments by various criteria',
  })
  async searchPayments(
    @CurrentUser() user: any,
    @Query('q') searchTerm: string,
    @Query('clientId') clientId?: string,
    @Query('limit') limit?: number,
  ) {
    if (!searchTerm || searchTerm.trim().length < 3) {
      throw new BadRequestException(
        'Search term must be at least 3 characters',
      );
    }

    // Check access permissions
    if (user.role.name !== 'super_user' && user.role.name !== 'admin') {
      clientId = user.clientId; // Force to user's client
    }

    return this.fawryQueryService.searchPayments(
      searchTerm.trim(),
      clientId,
      limit,
    );
  }

  /**
   * Export payment data
   */
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @Post('export')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export payment data',
    description: 'Export payment data to CSV/Excel',
  })
  async exportPaymentData(
    @Body()
    exportRequest: {
      clientId?: string;
      startDate?: string;
      endDate?: string;
      format: 'csv' | 'excel';
      includeDetails?: boolean;
    },
  ) {
    // This would typically generate a file and return a download link
    // For now, return the data that would be exported
    const query = {
      clientId: exportRequest.clientId,
      startDate: exportRequest.startDate
        ? new Date(exportRequest.startDate)
        : undefined,
      endDate: exportRequest.endDate
        ? new Date(exportRequest.endDate)
        : undefined,
      limit: 10000, // Large limit for export
    };

    const result = await this.fawryQueryService.getPaymentHistory(query);

    return {
      message: 'Export data prepared',
      format: exportRequest.format,
      totalRecords: result.total,
      data: result.payments, // In real implementation, this would be a file URL
    };
  }
}
