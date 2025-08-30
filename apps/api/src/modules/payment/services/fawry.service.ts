// src/modules/payment/services/fawry.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CreditService } from './credit.service';
import {
  FawryBillInquiryDto,
  FawryPaymentNotifyDto,
  FawryBillInquiryResponseDto,
  FawryPaymentNotifyResponseDto,
} from '../dto/fawry-bill-inquiry.dto';
import * as crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FawryService {
  private readonly logger = new Logger(FawryService.name);
  private readonly fawryBaseUrl: string;
  private readonly merchantCode: string;
  private readonly securityKey: string;
  private readonly billTypeCode: string;
  private readonly skipSignatureValidation: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly configService: ConfigService,
  ) {
    this.fawryBaseUrl = this.configService.get<string>('FAWRY_BASE_URL', '');
    this.merchantCode = this.configService.get<string>('FAWRY_MERCHANT_CODE', '');
    this.securityKey = this.configService.get<string>('FAWRY_SECURITY_KEY', '');
    this.billTypeCode = this.configService.get<string>('FAWRY_BILL_TYPE_CODE', 'LIFEBOX_CREDIT');
    // Add option to skip signature validation for testing
    this.skipSignatureValidation = this.configService.get<boolean>('FAWRY_SKIP_SIGNATURE_VALIDATION', false);
  }

  /**
   * Handle Fawry Bill Inquiry Request
   */
  async handleBillInquiry(
    inquiryDto: FawryBillInquiryDto,
  ): Promise<FawryBillInquiryResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Processing bill inquiry for account: ${inquiryDto.billingAcct}`,
      );

      // Verify signature if provided and not skipping validation
      if (!this.skipSignatureValidation && inquiryDto.signature && !this.verifyBillInquirySignature(inquiryDto)) {
        this.logger.error(`Invalid signature for bill inquiry`);
        return this.createBillInquiryErrorResponse(
          inquiryDto,
          31, // Message Authentication Error
          'Invalid signature',
        );
      }

      // Find client by Fawry payment ID (billing account)
      const client = await this.prisma.client.findFirst({
        where: {
          fawryPaymentId: inquiryDto.billingAcct,
        },
        include: {
          customerPricing: {
            where: { isActive: true },
          },
        },
      });

      if (!client) {
        this.logger.warn(
          `Client not found for billing account: ${inquiryDto.billingAcct}`,
        );
        return this.createBillInquiryErrorResponse(
          inquiryDto,
          12006, // Billing Account is not existed
          'Billing account not found',
        );
      }

      // Calculate bill amount
      const billAmount = await this.calculateBillAmount(client);

      // Generate a unique bill number
      const billNumber = `BILL_${Date.now()}`;

      // Log inquiry to database
      const inquiry = await this.prisma.fawryBillInquiry.create({
        data: {
          requestId: inquiryDto.rqUID,
          asyncRequestId: inquiryDto.asyncRqUID,
          billingAccount: inquiryDto.billingAcct,
          billTypeCode: inquiryDto.billTypeCode.toString(),
          terminalId: inquiryDto.terminalId || null,
          deliveryMethod: inquiryDto.deliveryMethod || 'PULL',
          requestTimestamp: inquiryDto.clientDt ? new Date(inquiryDto.clientDt) : new Date(),
          requestPayload: inquiryDto as any,
          responseStatusCode: 200,
          responseStatusDescription: 'Success',
          responsePayload: {} as any, // Will be updated after response creation
          responseTimestamp: new Date(),
          billAmount: new Decimal(billAmount),
          clientId: client.id,
        },
      });

      const response: FawryBillInquiryResponseDto = {
        status: {
          statusCode: 200,
          description: 'Success'
        },
        msgCode: 'BillInqRs',
        serverLang: 'ar-eg',
        serverDt: new Date().toISOString().replace('Z', '').substring(0, 23),
        rqUID: inquiryDto.rqUID,
        asyncRqUID: inquiryDto.asyncRqUID,
        terminalId: inquiryDto.terminalId,
        bankId: inquiryDto.bankId,
        deliveryMethod: inquiryDto.deliveryMethod,
        customProperties: inquiryDto.customProperties || [],
        billRec: [{
          billNumber: billNumber,
          billingAcct: inquiryDto.billingAcct,
          extraBillingAccts: inquiryDto.extraBillingAccts,
          billTypeCode: inquiryDto.billTypeCode,
          billCustomProperties: [],
          nextBTC: null,
          allowPayment: 'true',
          billInfo: {
            billAmt: {
              amt: billAmount,
              curCode: 'EGP'
            },
            dueDate: this.calculateDueDate(),
            issueDate: new Date().toISOString().split('T')[0],
            extraBillInfo: `Credit Top-up;Current Balance: ${client.credit} EGP`,
            billLabel: 'LifeBox Credit'
          }
        }],
        signature: null
      };

      // Sign the response if we have a security key
      if (this.securityKey) {
        response.signature = this.signBillInquiryResponse(response);
      }

      // Update response in database
      await this.prisma.fawryBillInquiry.update({
        where: { id: inquiry.id },
        data: {
          responsePayload: response as any,
        },
      });

      this.logger.log(
        `Bill inquiry completed in ${Date.now() - startTime}ms for ${inquiryDto.billingAcct}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Bill inquiry failed: ${error.message}`, error.stack);
      return this.createBillInquiryErrorResponse(
        inquiryDto,
        500,
        `Internal server error`,
      );
    }
  }

  /**
   * Handle Fawry Payment Notification
   */
  async handlePaymentNotification(
    notificationDto: FawryPaymentNotifyDto,
  ): Promise<FawryPaymentNotifyResponseDto> {
    const startTime = Date.now();

    try {
      // Extract payment info from nested structure
      const pmtInfo = notificationDto.pmtRec[0]?.pmtInfo;
      if (!pmtInfo) {
        throw new BadRequestException('Invalid payment structure');
      }

      // Find the FPTN from payment IDs
      const fptnRecord = pmtInfo.pmtIds.find(id => id.pmtIdType === 'FPTN');
      const fptn = fptnRecord?.pmtId;

      if (!fptn) {
        throw new BadRequestException('FPTN not found in payment IDs');
      }

      this.logger.log(`Processing payment notification for FPTN: ${fptn}`);

      // Verify signature if not skipping validation
      if (!this.skipSignatureValidation && notificationDto.signature && !this.verifyPaymentSignature(notificationDto)) {
        this.logger.error(`Invalid signature for payment: ${fptn}`);
        return this.createPaymentErrorResponse(
          notificationDto,
          31, // Message Authentication Error
          'Invalid signature',
        );
      }

      // Check if already processed
      const existingNotification = await this.prisma.fawryPaymentNotification.findFirst({
        where: { fptn },
      });

      if (existingNotification && !notificationDto.isRetry) {
        this.logger.warn(`Duplicate payment notification: ${fptn}`);
        return this.createPaymentErrorResponse(
          notificationDto,
          21021, // Duplicate payment transaction
          'Duplicate payment transaction',
        );
      }

      // If retry and already exists, return the original response
      if (existingNotification && notificationDto.isRetry) {
        this.logger.log(`Retry payment notification for existing transaction: ${fptn}`);
        const updatedClient = await this.prisma.client.findUnique({
          where: { id: existingNotification.clientId },
        });
        return this.createPaymentSuccessResponse(
          notificationDto,
          existingNotification.id,
          Number(updatedClient?.credit || 0),
          existingNotification.responseStatusCode || 200,
        );
      }

      // Find client
      const client = await this.prisma.client.findFirst({
        where: { fawryPaymentId: pmtInfo.billingAcct },
      });

      if (!client) {
        this.logger.error(
          `Client not found for billing account: ${pmtInfo.billingAcct}`,
        );
        return this.createPaymentErrorResponse(
          notificationDto,
          12006,
          'Billing account not found',
        );
      }

      // Validate payment amount
      const expectedAmount = await this.calculateBillAmount(client);
      if (Math.abs(pmtInfo.pmtAmt.amt - expectedAmount) > 0.01) {
        this.logger.warn(
          `Payment amount validation warning. Expected: ${expectedAmount}, Received: ${pmtInfo.pmtAmt.amt}. Proceeding anyway.`,
        );
        // Don't fail the payment, just log the warning
      }

      // Process payment in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Extract all payment IDs
        const bnkptnRecord = pmtInfo.pmtIds.find(id => id.pmtIdType === 'BNKPTN');
        const bnkdtnRecord = pmtInfo.pmtIds.find(id => id.pmtIdType === 'BNKDTN');
        const fcrnRecord = pmtInfo.pmtIds.find(id => id.pmtIdType === 'FCRN');

        // Create payment notification record
        const notification = await tx.fawryPaymentNotification.create({
          data: {
            requestId: notificationDto.rqUID,
            asyncRequestId: notificationDto.asyncRqUID,
            fptn: fptn,
            bnkptn: bnkptnRecord?.pmtId || null,
            bnkdtn: bnkdtnRecord?.pmtId || null,
            fcrn: fcrnRecord?.pmtId || null,
            billingAccount: pmtInfo.billingAcct,
            billTypeCode: pmtInfo.billTypeCode.toString(),
            terminalId: notificationDto.terminalId || null,
            clientTerminalSeqId: notificationDto.clientTerminalSeqId || null,
            paymentMethod: pmtInfo.pmtMethod || 'UNKNOWN',
            paymentType: pmtInfo.pmtType || 'UNKNOWN',
            deliveryMethod: pmtInfo.deliveryMethod || 'UNKNOWN',
            amount: new Decimal(pmtInfo.pmtAmt.amt),
            currency: pmtInfo.pmtAmt.curCode || 'EGP',
            isRetry: notificationDto.isRetry || false,
            paymentStatus: pmtInfo.pmtStatus || 'UNKNOWN',
            requestTimestamp: notificationDto.clientDt ? new Date(notificationDto.clientDt) : new Date(),
            requestPayload: notificationDto as any,
            responseStatusCode: 200,
            responseStatusDescription: 'Success',
            responsePayload: {} as any,
            responseTimestamp: new Date(),
            clientId: client.id,
          },
        });

        // Add customer data if provided
        if (notificationDto.custData) {
          // Extract customer info from the structure
          let officialId = null;
          let officialIdType = null;
          let mobile = null;
          let email = null;

          // Get official ID from custIds array
          if (notificationDto.custData.custIds && notificationDto.custData.custIds.length > 0) {
            officialId = notificationDto.custData.custIds[0].OfficialId;
            officialIdType = notificationDto.custData.custIds[0].OfficialIdType;
          }

          // Get contact info
          if (notificationDto.custData.contactInfo) {
            const mobileContact = notificationDto.custData.contactInfo.find(
              c => c.contactType === 'MOBILE'
            );
            const emailContact = notificationDto.custData.contactInfo.find(
              c => c.contactType === 'EMAIL'
            );
            mobile = mobileContact?.contactValue;
            email = emailContact?.contactValue;
          }

          await tx.fawryCustomerData.create({
            data: {
              paymentNotificationId: notification.id,
              officialId: officialId,
              officialIdType: officialIdType,
              name: notificationDto.custData.name || null,
              middleName: notificationDto.custData.middleName || null,
              lastName: notificationDto.custData.lastName || null,
              birthDate: notificationDto.custData.birthDate
                ? new Date(notificationDto.custData.birthDate)
                : null,
              gender: notificationDto.custData.gender || null,
              mobile: mobile,
              email: email,
            },
          });
        }

        // Add credit to client account only if payment is successful and new
        if (pmtInfo.pmtStatus === 'PmtNew' && !existingNotification) {
          const creditTransaction = await this.creditService.addCredit(
            client.id,
            pmtInfo.pmtAmt.amt,
            `Fawry payment - FPTN: ${fptn}`,
            tx,
          );

          // Update notification with credit transaction
          await tx.fawryPaymentNotification.update({
            where: { id: notification.id },
            data: { creditTransactionId: creditTransaction.id },
          });

          return { notification, creditTransaction, client };
        }

        return { notification, creditTransaction: null, client };
      });

      // Get updated client balance
      const updatedClient = await this.prisma.client.findUnique({
        where: { id: client.id },
      });

      const response = this.createPaymentSuccessResponse(
        notificationDto,
        result.notification.id,
        Number(updatedClient?.credit || 0),
      );

      // Update response in database
      await this.prisma.fawryPaymentNotification.update({
        where: { id: result.notification.id },
        data: {
          responsePayload: response as any,
        },
      });

      this.logger.log(
        `Payment notification processed in ${Date.now() - startTime}ms for FPTN: ${fptn}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Payment notification failed: ${error.message}`,
        error.stack,
      );
      return this.createPaymentErrorResponse(
        notificationDto,
        500,
        `Processing failed: ${error.message}`,
      );
    }
  }

  private createBillInquiryErrorResponse(
    request: FawryBillInquiryDto,
    statusCode: number,
    statusDescription: string,
  ): FawryBillInquiryResponseDto {
    return {
      status: {
        statusCode,
        description: statusDescription
      },
      msgCode: 'BillInqRs',
      serverDt: new Date().toISOString().replace('Z', '').substring(0, 23),
      serverLang: 'ar-eg',
      rqUID: request.rqUID,
      asyncRqUID: request.asyncRqUID,
      terminalId: request.terminalId,
      bankId: request.bankId,
      deliveryMethod: request.deliveryMethod,
      customProperties: [],
      billRec: null,
      signature: null
    };
  }

  private createPaymentErrorResponse(
    request: FawryPaymentNotifyDto,
    statusCode: number,
    statusDescription: string,
  ): FawryPaymentNotifyResponseDto {
    // Extract payment IDs from nested structure
    const pmtIds = request.pmtRec[0]?.pmtInfo?.pmtIds || [];

    return {
      status: {
        statusCode,
        description: statusDescription
      },
      msgCode: 'PmtNotifyRs',
      serverDt: new Date().toISOString().replace('Z', '').substring(0, 23),
      rqUID: request.rqUID,
      asyncRqUID: request.asyncRqUID,
      terminalId: request.terminalId,
      clientTerminalSeqId: request.clientTerminalSeqId,
      customProperties: [],
      pmtStatusRec: [{
        status: {
          statusCode,
          description: statusDescription
        },
        pmtIds: pmtIds
      }],
      isRetry: request.isRetry,
      signature: null
    };
  }

  private createPaymentSuccessResponse(
    request: FawryPaymentNotifyDto,
    internalTransactionId: string,
    currentBalance: number,
    statusCode: number = 200,
  ): FawryPaymentNotifyResponseDto {
    const pmtIds = request.pmtRec[0]?.pmtInfo?.pmtIds || [];
    
    // Add our internal transaction ID (BLRPTN)
    const responseIds = [
      ...pmtIds,
      {
        pmtId: internalTransactionId,
        pmtIdType: 'BLRPTN',
        creationDt: new Date().toISOString().replace('Z', '').substring(0, 23)
      }
    ];

    const response: FawryPaymentNotifyResponseDto = {
      status: {
        statusCode: statusCode,
        description: statusCode === 200 ? 'Success' : 'Payment processed'
      },
      msgCode: 'PmtNotifyRs',
      serverDt: new Date().toISOString().replace('Z', '').substring(0, 23),
      rqUID: request.rqUID,
      asyncRqUID: request.asyncRqUID,
      terminalId: request.terminalId,
      clientTerminalSeqId: request.clientTerminalSeqId,
      customProperties: [],
      pmtStatusRec: [{
        status: {
          statusCode: statusCode,
          description: 'Payment processed successfully'
        },
        extraBillInfo: `Payment received successfully;New Balance: ${currentBalance} EGP`,
        pmtIds: responseIds,
        balanceAmt: {
          amt: currentBalance,
          curCode: 'EGP'
        }
      }],
      signature: null
    };

    // Sign the response if we have a security key
    if (this.securityKey) {
      response.signature = this.signPaymentNotifyResponse(response);
    }

    return response;
  }

  /**
   * Message Hashing Functions
   */
  private verifyBillInquirySignature(dto: FawryBillInquiryDto): boolean {
    if (!dto.signature || !this.securityKey) {
      return true; // No signature to verify or no key configured
    }

    try {
      let msgToHash = '';
      
      msgToHash += dto.msgCode.trim();
      msgToHash += dto.asyncRqUID.trim();
      msgToHash += dto.billingAcct.trim();
      msgToHash += dto.billTypeCode.toString();
      
      // Add extra billing accounts in order
      if (dto.extraBillingAccts) {
        const orderedKeys = ['Key1', 'Key2', 'Key3', 'Key4', 'Key5'];
        for (const key of orderedKeys) {
          const extra = dto.extraBillingAccts.find(e => e.key === key);
          if (extra) {
            msgToHash += extra.key.trim();
            msgToHash += extra.value.trim();
          }
        }
      }
      
      msgToHash += this.securityKey;
      
      const hash = crypto
        .createHash('sha256')
        .update(msgToHash, 'utf8')
        .digest('base64');
      
      return hash === dto.signature;
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  private signBillInquiryResponse(response: FawryBillInquiryResponseDto): string {
    if (!this.securityKey) {
      return '';
    }

    let msgToHash = '';

    msgToHash += response.msgCode.trim();
    msgToHash += response.asyncRqUID.trim();
    msgToHash += response.billRec[0].billingAcct.trim();
    msgToHash += response.billRec[0].billTypeCode.toString();

    // Add extra billing accounts in order
    if (response.billRec[0].extraBillingAccts) {
      const orderedKeys = ['Key1', 'Key2', 'Key3', 'Key4', 'Key5'];
      for (const key of orderedKeys) {
        const extra = response.billRec[0].extraBillingAccts.find(e => e.key === key);
        if (extra) {
          msgToHash += extra.key.trim();
          msgToHash += extra.value.trim();
        }
      }
    }

    msgToHash += response.status.statusCode.toString();
    msgToHash += this.securityKey;

    return crypto
      .createHash('sha256')
      .update(msgToHash, 'utf8')
      .digest('base64');
  }

  private verifyPaymentSignature(dto: FawryPaymentNotifyDto): boolean {
    if (!dto.signature || !this.securityKey) {
      return true;
    }

    try {
      let msgToHash = '';
      const pmtInfo = dto.pmtRec[0].pmtInfo;
      
      msgToHash += dto.msgCode.trim();
      msgToHash += dto.asyncRqUID.trim();
      msgToHash += pmtInfo.billingAcct.trim();
      msgToHash += pmtInfo.billTypeCode.toString();
      
      // Add extra billing accounts in order
      if (pmtInfo.extraBillingAccts) {
        const orderedKeys = ['Key1', 'Key2', 'Key3', 'Key4', 'Key5'];
        for (const key of orderedKeys) {
          const extra = pmtInfo.extraBillingAccts.find(e => e.key === key);
          if (extra) {
            msgToHash += extra.key.trim();
            msgToHash += extra.value.trim();
          }
        }
      }
      
      // Add payment IDs in the order they were received
      for (const pmtId of pmtInfo.pmtIds) {
        msgToHash += pmtId.pmtId.trim();
        msgToHash += pmtId.pmtIdType.trim();
        if (pmtId.creationDt) {
          msgToHash += pmtId.creationDt.trim();
        }
      }
      
      // Format amount with 2 decimal places
      msgToHash += pmtInfo.pmtAmt.amt.toFixed(2);
      msgToHash += this.securityKey;
      
      const hash = crypto
        .createHash('sha256')
        .update(msgToHash, 'utf8')
        .digest('base64');
      
      return hash === dto.signature;
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  private signPaymentNotifyResponse(response: FawryPaymentNotifyResponseDto): string {
    if (!this.securityKey) {
      return '';
    }

    let msgToHash = '';

    msgToHash += response.msgCode.trim();
    msgToHash += response.asyncRqUID.trim();

    // Add payment IDs in order: FPTN, BNKPTN, FCRN, BNKDTN, BLRPTN
    const orderedTypes = ['FPTN', 'BNKPTN', 'FCRN', 'BNKDTN', 'BLRPTN'];
    for (const type of orderedTypes) {
      const pmtId = response.pmtStatusRec[0].pmtIds.find(id => id.pmtIdType === type);
      if (pmtId) {
        msgToHash += pmtId.pmtId.trim();
        msgToHash += pmtId.pmtIdType.trim();
        if (pmtId.creationDt) {
          msgToHash += pmtId.creationDt.trim();
        }
      }
    }

    msgToHash += response.pmtStatusRec[0].status.statusCode.toString();

    // Add balance amount if present
    if (response.pmtStatusRec[0].balanceAmt) {
      msgToHash += response.pmtStatusRec[0].balanceAmt.amt.toFixed(2);
    }

    msgToHash += this.securityKey;

    return crypto
      .createHash('sha256')
      .update(msgToHash, 'utf8')
      .digest('base64');
  }

  /**
   * Calculate bill amount for a client
   */
  private async calculateBillAmount(client: any): Promise<number> {
    if (client.billingType === 'prepaid') {
      // For prepaid clients, use a default top-up amount or calculate based on pricing
      if (client.customerPricing && client.customerPricing.length > 0) {
        // Use the first active pricing rule
        const pricing = client.customerPricing[0];
        return Number(pricing.rateValue);
      }
      return 50.0; // 50 EGP minimum default
    } else {
      // For postpaid clients, calculate based on usage
      const currentPeriod = await this.prisma.postpaidPeriod.findFirst({
        where: {
          clientId: client.id,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!currentPeriod) {
        return 0;
      }

      const usage = await this.prisma.usageTracking.aggregate({
        where: {
          clientId: client.id,
          postpaidPeriodId: currentPeriod.id,
          paymentType: 'postpaid',
        },
        _sum: {
          costEgp: true,
        },
      });

      return Number(usage._sum.costEgp || 0);
    }
  }

  private calculateDueDate(): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Get payment history for a client
   */
  async getPaymentHistory(
    clientId: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    return this.prisma.fawryPaymentNotification.findMany({
      where: { clientId },
      include: {
        customerData: true,
        creditTransaction: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get bill inquiry history for a client
   */
  async getBillInquiryHistory(
    clientId: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    return this.prisma.fawryBillInquiry.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Retry failed webhooks
   */
  async retryFailedWebhooks() {
    const failedPayments = await this.prisma.fawryPaymentNotification.findMany({
      where: {
        responseStatusCode: { not: 200 },
        isRetry: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    for (const payment of failedPayments) {
      try {
        // Reconstruct the DTO from stored data
        const requestPayload = payment.requestPayload as any;
        const retryDto: FawryPaymentNotifyDto = {
          ...requestPayload,
          isRetry: true,
        };

        await this.handlePaymentNotification(retryDto);
      } catch (error) {
        this.logger.error(`Retry failed for FPTN ${payment.fptn}:`, error);
      }
    }
  }

  /**
   * Process refund
   */
  async processRefund(fptn: string, amount: number, reason: string) {
    const payment = await this.prisma.fawryPaymentNotification.findFirst({
      where: { fptn },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // TODO: Implement actual refund logic with Fawry API
    // For now, just deduct credit
    await this.creditService.deductCredit(
      payment.clientId,
      amount,
      `Refund for FPTN: ${fptn} - ${reason}`,
      `REFUND_${fptn}`,
    );

    return {
      status: 'SUCCESS',
      refundId: `REFUND_${Date.now()}`,
    };
  }
}