// src/modules/payment/fawry.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FawryService } from './services/fawry.service';
import { CreditService } from './services/credit.service';
import {
  FawryBillInquiryDto,
  FawryPaymentNotifyDto,
  FawryBillInquiryResponseDto,
  FawryPaymentNotifyResponseDto,
} from './dto/fawry-bill-inquiry.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('fawry')
@Controller('fawry')
export class FawryController {
  private readonly logger = new Logger(FawryController.name);

  constructor(
    private readonly fawryService: FawryService,
    private readonly creditService: CreditService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Fawry Bill Inquiry Endpoint
   * This endpoint is called by Fawry when customers want to check their bill
   */
  @Post('service/billinquiry')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Fawry bill inquiry requests',
    description:
      'Called by Fawry when customers want to check their bill amount',
  })
  @ApiResponse({
    status: 200,
    description: 'Bill inquiry processed successfully',
    type: FawryBillInquiryResponseDto,
  })
  async handleBillInquiry(
    @Body(new ValidationPipe({ transform: true })) inquiryDto: FawryBillInquiryDto
  ): Promise<FawryBillInquiryResponseDto> {
    this.logger.log(
      `Received bill inquiry for account: ${inquiryDto.billingAcct}`,
    );
    this.logger.debug('Bill inquiry request:', JSON.stringify(inquiryDto, null, 2));

    try {
      const response = await this.fawryService.handleBillInquiry(inquiryDto);

      this.logger.log(
        `Bill inquiry response - Status: ${response.status.statusCode}, Amount: ${response.billRec?.[0]?.billInfo?.billAmt?.amt || 0} EGP`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Bill inquiry error: ${error.message}`, error.stack);
      return {
        status: {
          statusCode: 500,
          description: error.message,
        },
        msgCode: 'BillInqRs',
        serverDt: new Date().toISOString().replace('Z', '').substring(0, 23),
        rqUID: inquiryDto.rqUID,
        asyncRqUID: inquiryDto.asyncRqUID,
        billRec: null,
      };
    }
  }

  /**
   * Fawry Payment Notification Endpoint
   * This endpoint is called by Fawry when a payment is completed
   */
  @Post('service/payment')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Fawry payment notification',
    description: 'Webhook endpoint called by Fawry when a payment is completed',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment notification processed successfully',
    type: FawryPaymentNotifyResponseDto,
  })
  async handlePaymentNotification(
    @Body(new ValidationPipe({ transform: true })) notificationDto: FawryPaymentNotifyDto
  ): Promise<FawryPaymentNotifyResponseDto> {
    this.logger.log('Received Fawry payment notification');
    this.logger.debug('Payment notification request:', JSON.stringify(notificationDto, null, 2));

    try {
      const response = await this.fawryService.handlePaymentNotification(notificationDto);

      this.logger.log(
        `Payment notification response - Status: ${response.status.statusCode}`,
      );

      return response;
    } catch (error) {
      this.logger.error('Payment notification error:', error);
      
      // Extract payment IDs from request if available
      const pmtIds = notificationDto.pmtRec?.[0]?.pmtInfo?.pmtIds || [];
      
      return {
        status: {
          statusCode: 500,
          description: 'Internal server error',
        },
        msgCode: 'PmtNotifyRs',
        serverDt: new Date().toISOString().replace('Z', '').substring(0, 23),
        rqUID: notificationDto.rqUID,
        asyncRqUID: notificationDto.asyncRqUID,
        pmtStatusRec: [
          {
            status: {
              statusCode: 500,
              description: error.message,
            },
            pmtIds: pmtIds,
          },
        ],
      };
    }
  }

  /**
   * Register webhook URL with Fawry
   */
  @Post('webhook/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register webhook URL with Fawry' })
  async registerWebhook(@Body() data: { url: string; secret?: string }) {
    // Store webhook configuration
    await this.configService.set('FAWRY_WEBHOOK_URL', data.url);
    if (data.secret) {
      await this.configService.set('FAWRY_WEBHOOK_SECRET', data.secret);
    }

    // TODO: Call Fawry API to register webhook

    return {
      message: 'Webhook registered successfully',
      url: data.url,
    };
  }

  /**
   * Get client payment history (Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user', 'admin')
  @Get('payments/:clientId/history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client payment history',
    description: 'Retrieve Fawry payment history for a specific client',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(
    @Param('clientId') clientId: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ) {
    return this.fawryService.getPaymentHistory(clientId, limit, offset);
  }

  /**
   * Get client bill inquiry history (Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user', 'admin')
  @Get('inquiries/:clientId/history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client bill inquiry history',
    description: 'Retrieve Fawry bill inquiry history for a specific client',
  })
  @ApiResponse({
    status: 200,
    description: 'Bill inquiry history retrieved successfully',
  })
  async getBillInquiryHistory(
    @Param('clientId') clientId: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ) {
    return this.fawryService.getBillInquiryHistory(clientId, limit, offset);
  }

  /**
   * Get client credit balance
   */
  @UseGuards(JwtAuthGuard)
  @Get('credit/:clientId/balance')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client credit balance',
    description: 'Retrieve current credit balance for a client',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit balance retrieved successfully',
  })
  async getCreditBalance(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
  ) {
    // Check if user has access to this client
    if (
      user.role.name !== 'super_user' &&
      user.role.name !== 'admin' &&
      user.clientId !== clientId
    ) {
      throw new BadRequestException('Access denied to this client');
    }

    const balance = await this.creditService.getCreditBalance(clientId);
    return { clientId, balance, currency: 'EGP' };
  }

  /**
   * Get client credit transaction history
   */
  @UseGuards(JwtAuthGuard)
  @Get('credit/:clientId/transactions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client credit transaction history',
    description: 'Retrieve credit transaction history for a client',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit transaction history retrieved successfully',
  })
  async getCreditHistory(
    @Param('clientId') clientId: string,
    @CurrentUser() user: any,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Query('type') transactionType?: 'deposit' | 'usage' | 'refund',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Check if user has access to this client
    if (
      user.role.name !== 'super_user' &&
      user.role.name !== 'admin' &&
      user.clientId !== clientId
    ) {
      throw new BadRequestException('Access denied to this client');
    }

    const options = {
      limit: Math.min(limit, 100), // Max 100 records
      offset,
      transactionType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.creditService.getCreditHistory(clientId, options);
  }

  /**
   * Get client credit statistics
   */
  @UseGuards(JwtAuthGuard)
  @Get('credit/:clientId/stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client credit statistics',
    description: 'Retrieve credit usage statistics for a client',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit statistics retrieved successfully',
  })
  async getCreditStats(
    @Param('clientId') clientId: string,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
    @CurrentUser() user: any,
  ) {
    // Check if user has access to this client
    if (
      user.role.name !== 'super_user' &&
      user.role.name !== 'admin' &&
      user.clientId !== clientId
    ) {
      throw new BadRequestException('Access denied to this client');
    }

    return this.creditService.getCreditStats(clientId, period);
  }

  /**
   * Get low balance clients (Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user', 'admin')
  @Get('credit/low-balance')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get low balance clients',
    description: 'Retrieve clients with low credit balance for alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Low balance clients retrieved successfully',
  })
  async getLowBalanceClients(@Query('threshold') threshold: number = 10) {
    return this.creditService.getLowBalanceClients(threshold);
  }

  /**
   * Manual credit adjustment (Super User only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user')
  @Post('credit/:clientId/adjust')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manual credit adjustment',
    description: 'Manually adjust client credit balance (Super User only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit adjusted successfully',
  })
  async adjustCredit(
    @Param('clientId') clientId: string,
    @Body()
    adjustmentData: {
      amount: number;
      type: 'add' | 'deduct' | 'refund';
      description: string;
      referenceId?: string;
    },
    @CurrentUser() user: any,
  ) {
    const { amount, type, description, referenceId } = adjustmentData;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    let transaction;
    const fullDescription = `${description} (Manual adjustment by ${user.fullName || user.email})`;

    switch (type) {
      case 'add':
        transaction = await this.creditService.addCredit(
          clientId,
          amount,
          fullDescription,
        );
        break;
      case 'deduct':
        transaction = await this.creditService.deductCredit(
          clientId,
          amount,
          fullDescription,
          referenceId,
        );
        break;
      case 'refund':
        transaction = await this.creditService.refundCredit(
          clientId,
          amount,
          fullDescription,
          referenceId,
        );
        break;
      default:
        throw new BadRequestException('Invalid adjustment type');
    }

    return {
      success: true,
      transaction,
      newBalance: transaction.balanceAfter,
    };
  }

  /**
   * Test bill inquiry endpoint (Development only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user')
  @Post('test/bill-inquiry/:clientId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test bill inquiry',
    description: 'Test bill inquiry for a client (Development only)',
  })
  async testBillInquiry(@Param('clientId') clientId: string) {
    // Get client's Fawry payment ID
    const client = await this.fawryService['prisma'].client.findUnique({
      where: { id: clientId },
      select: { fawryPaymentId: true, name: true },
    });

    if (!client?.fawryPaymentId) {
      throw new BadRequestException(
        'Client does not have Fawry payment ID configured',
      );
    }

    const testInquiry: FawryBillInquiryDto = {
      msgCode: 'BillInqRq',
      sender: 'FAWRY',
      receiver: this.configService.get<string>('FAWRY_MERCHANT_CODE'),
      clientDt: new Date().toISOString().replace('Z', '').substring(0, 23),
      rqUID: `TEST_${Date.now()}`,
      asyncRqUID: `ASYNC_TEST_${Date.now()}`,
      billingAcct: client.fawryPaymentId,
      bankId: 'FAWRYRTL',
      billTypeCode: this.configService.get<string>('FAWRY_BILL_TYPE_CODE'),
      deliveryMethod: 'POS',
      terminalId: 'TEST_TERMINAL',
    };

    return this.fawryService.handleBillInquiry(testInquiry);
  }

  /**
   * Test payment notification endpoint (Development only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user')
  @Post('test/payment/:clientId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test payment notification',
    description: 'Test payment notification for a client (Development only)',
  })
  async testPaymentNotification(
    @Param('clientId') clientId: string,
    @Body() testData: { amount: number; isRetry?: boolean }
  ) {
    // Get client's Fawry payment ID
    const client = await this.fawryService['prisma'].client.findUnique({
      where: { id: clientId },
      select: { fawryPaymentId: true, name: true },
    });

    if (!client?.fawryPaymentId) {
      throw new BadRequestException(
        'Client does not have Fawry payment ID configured',
      );
    }

    const timestamp = new Date().toISOString().replace('Z', '').substring(0, 23);
    const fptn = `TEST_FPTN_${Date.now()}`;

    const testPayment: FawryPaymentNotifyDto = {
      msgCode: 'PmtNotifyRq',
      sender: 'FAWRY',
      receiver: this.configService.get<string>('FAWRY_MERCHANT_CODE'),
      clientDt: timestamp,
      isRetry: testData.isRetry || false,
      rqUID: `TEST_${Date.now()}`,
      asyncRqUID: `ASYNC_TEST_${Date.now()}`,
      terminalId: 'TEST_TERMINAL',
      clientTerminalSeqId: `TEST_SEQ_${Date.now()}`,
      pmtRec: [
        {
          pmtInfo: {
            billingAcct: client.fawryPaymentId,
            billTypeCode: parseInt(this.configService.get<string>('FAWRY_BILL_TYPE_CODE')),
            bankId: 'FAWRYRTL',
            pmtType: 'PREP',
            deliveryMethod: 'POS',
            pmtMethod: 'CASH',
            pmtAmt: {
              amt: testData.amount,
              curCode: 'EGP',
            },
            pmtStatus: 'PmtNew',
            pmtIds: [
              {
                pmtId: fptn,
                pmtIdType: 'FPTN',
                creationDt: timestamp,
              },
              {
                pmtId: `TEST_BNKPTN_${Date.now()}`,
                pmtIdType: 'BNKPTN',
                creationDt: timestamp,
              },
              {
                pmtId: `TEST_BNKDTN_${Date.now()}`,
                pmtIdType: 'BNKDTN',
                creationDt: timestamp,
              },
              {
                pmtId: `TEST_FCRN_${Date.now()}`,
                pmtIdType: 'FCRN',
                creationDt: timestamp,
              },
            ],
          },
        },
      ],
    };

    return this.fawryService.handlePaymentNotification(testPayment);
  }

  /**
   * Retry failed webhooks (Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user', 'admin')
  @Post('retry-failed-webhooks')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retry failed webhook notifications',
    description: 'Manually trigger retry of failed payment notifications',
  })
  async retryFailedWebhooks() {
    await this.fawryService.retryFailedWebhooks();
    return {
      message: 'Failed webhook retry initiated',
      timestamp: new Date(),
    };
  }

  /**
   * Process refund (Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_user', 'admin')
  @Post('refund')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Process payment refund',
    description: 'Process a refund for a Fawry payment',
  })
  async processRefund(
    @Body()
    refundData: {
      fptn: string;
      amount: number;
      reason: string;
    },
  ) {
    if (refundData.amount <= 0) {
      throw new BadRequestException('Refund amount must be positive');
    }

    return this.fawryService.processRefund(
      refundData.fptn,
      refundData.amount,
      refundData.reason,
    );
  }
}