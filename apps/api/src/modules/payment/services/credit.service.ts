// src/modules/payment/services/credit.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@lifebox/database';
import { Decimal } from '@prisma/client/runtime/library';
import { CreditMonitorService } from './credit-monitor.service';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CreditMonitorService))
    private readonly creditMonitorService: CreditMonitorService,
  ) {}

  async addCredit(
    clientId: string,
    amount: number,
    description: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || this.prisma;

    const client = await db.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const currentBalance = Number(client.credit);
    const newBalance = currentBalance + amount;

    await db.client.update({
      where: { id: clientId },
      data: { credit: new Decimal(newBalance) },
    });

    const transaction = await db.creditTransaction.create({
      data: {
        clientId,
        transactionType: 'deposit',
        amount: new Decimal(amount),
        balanceBefore: new Decimal(currentBalance),
        balanceAfter: new Decimal(newBalance),
        description,
      },
    });

    this.logger.log(
      `Credit added: ${amount} EGP to client ${clientId}. New balance: ${newBalance} EGP`,
    );

    // DISABLED AUTO-REACTIVATION AS REQUESTED
    // if (!tx && currentBalance <= 5 && newBalance > 5) {
    //   this.creditMonitorService.reactivateDevicesAfterPayment(clientId).catch(error => {
    //     this.logger.error('Failed to reactivate devices', error);
    //   });
    // }

    return transaction;
  }

  async deductCredit(
    clientId: string,
    amount: number,
    description: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || this.prisma;

    const client = await db.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const currentBalance = Number(client.credit);

    if (currentBalance < amount) {
      throw new BadRequestException(
        `Insufficient credit. Current balance: ${currentBalance} EGP, Required: ${amount} EGP`,
      );
    }

    const newBalance = currentBalance - amount;

    await db.client.update({
      where: { id: clientId },
      data: { credit: new Decimal(newBalance) },
    });

    const transaction = await db.creditTransaction.create({
      data: {
        clientId,
        transactionType: 'usage',
        amount: new Decimal(-amount),
        balanceBefore: new Decimal(currentBalance),
        balanceAfter: new Decimal(newBalance),
        referenceId,
        description,
      },
    });

    this.logger.log(
      `Credit deducted: ${amount} EGP from client ${clientId}. New balance: ${newBalance} EGP`,
    );

    // Trigger monitoring if balance is critical
    if (!tx && newBalance <= 5) {
      this.logger.warn('Balance is now critical, triggering monitoring');
      this.creditMonitorService.monitorCreditLevels().catch((error) => {
        this.logger.error('Failed to trigger monitoring', error);
      });
    }

    return transaction;
  }

  async refundCredit(
    clientId: string,
    amount: number,
    description: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || this.prisma;

    const client = await db.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    const currentBalance = Number(client.credit);
    const newBalance = currentBalance + amount;

    await db.client.update({
      where: { id: clientId },
      data: { credit: new Decimal(newBalance) },
    });

    const transaction = await db.creditTransaction.create({
      data: {
        clientId,
        transactionType: 'refund',
        amount: new Decimal(amount),
        balanceBefore: new Decimal(currentBalance),
        balanceAfter: new Decimal(newBalance),
        referenceId,
        description,
      },
    });

    this.logger.log(
      `Credit refunded: ${amount} EGP to client ${clientId}. New balance: ${newBalance} EGP`,
    );

    return transaction;
  }

  async getCreditBalance(clientId: string): Promise<number> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { credit: true },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    return Number(client.credit);
  }

  async getCreditHistory(
    clientId: string,
    options: {
      limit?: number;
      offset?: number;
      transactionType?: 'deposit' | 'usage' | 'refund';
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const where: any = { clientId };

    if (options.transactionType) {
      where.transactionType = options.transactionType;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const transactions = await this.prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });

    const total = await this.prisma.creditTransaction.count({ where });

    return {
      transactions,
      total,
      limit: options.limit || 50,
      offset: options.offset || 0,
    };
  }

  async getCreditStats(clientId: string, period: 'week' | 'month' | 'year') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const stats = await this.prisma.creditTransaction.groupBy({
      by: ['transactionType'],
      where: {
        clientId,
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    const currentBalance = await this.getCreditBalance(clientId);

    return {
      period,
      currentBalance,
      startDate,
      endDate: now,
      transactions: stats.map((s) => ({
        type: s.transactionType,
        count: s._count,
        totalAmount: Number(s._sum.amount || 0),
      })),
    };
  }

  async getLowBalanceClients(threshold: number = 10) {
    return this.prisma.client.findMany({
      where: {
        billingType: 'prepaid',
        credit: { lte: threshold },
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
          },
        },
        devices: {
          where: { isActive: true },
          select: {
            id: true,
            deviceCode: true,
            deviceName: true,
          },
        },
      },
      orderBy: { credit: 'asc' },
    });
  }

  /**
   * Get client by Fawry Payment ID
   * Used by credit.controller.ts
   */
  async getClientByFawryId(fawryPaymentId: string) {
    const client = await this.prisma.client.findFirst({
      where: { fawryPaymentId },
      include: {
        subscriptions: {
          where: { status: 'active' },
        },
        devices: {
          where: { isActive: true },
        },
      },
    });

    if (!client) {
      throw new BadRequestException(
        `Client with Fawry ID ${fawryPaymentId} not found`,
      );
    }

    return client;
  }

  /**
   * Calculate usage cost based on pricing rules
   * Used by pricing.controller.ts
   */
  async calculateUsageCost(
    clientId: string,
    energyKwh: number,
    waterM3?: number,
  ): Promise<number> {
    // Get client and their pricing
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        customerPricing: {
          where: { isActive: true },
        },
      },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    let totalCost = 0;

    // Calculate energy cost
    if (energyKwh > 0) {
      const energyPricing = client.customerPricing.find(
        (p) => p.pricingType === 'energy',
      );

      if (energyPricing) {
        // Custom pricing: rate per unit
        const units = energyKwh / Number(energyPricing.perUnit);
        totalCost += units * Number(energyPricing.rateValue);
      } else {
        // Default pricing using electricity rate
        totalCost += energyKwh * Number(client.electricityRateEgp);
      }
    }

    // Calculate water cost if applicable
    if (waterM3 && waterM3 > 0) {
      const waterPricing = client.customerPricing.find(
        (p) => p.pricingType === 'water_flow',
      );

      if (waterPricing) {
        const units = waterM3 / Number(waterPricing.perUnit);
        totalCost += units * Number(waterPricing.rateValue);
      }
      // If no water pricing defined, water is free (only energy is charged)
    }

    return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Process usage and deduct credit for prepaid clients
   */
  async processUsage(
    deviceId: string,
    energyKwh: number,
    waterM3?: number,
    sessionId?: string,
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { client: true },
    });

    if (!device) {
      throw new BadRequestException('Device not found');
    }

    // Only process for prepaid clients
    if (device.client.billingType !== 'prepaid') {
      return null;
    }

    const cost = await this.calculateUsageCost(
      device.clientId,
      energyKwh,
      waterM3,
    );

    if (cost > 0) {
      // Deduct credit
      const transaction = await this.deductCredit(
        device.clientId,
        cost,
        `Usage: ${energyKwh} kWh${waterM3 ? `, ${waterM3} m³` : ''}`,
        sessionId,
      );

      // Record usage tracking
      await this.prisma.usageTracking.create({
        data: {
          deviceId,
          clientId: device.clientId,
          sessionStart: new Date(),
          sessionEnd: new Date(),
          energyConsumedKwh: energyKwh,
          waterPumpedM3: waterM3 || 0,
          costEgp: new Decimal(cost),
          paymentType: 'prepaid',
        },
      });

      return transaction;
    }

    return null;
  }
}
