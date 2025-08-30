// src/modules/payment/services/fawry-query.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { 
  PaymentHistoryQuery, 
  CreditTransactionQuery, 
  PaymentAnalytics, 
  CreditAnalytics 
} from '../interfaces/fawry-bill-inquiry.interface';

@Injectable()
export class FawryQueryService {
  private readonly logger = new Logger(FawryQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Advanced payment history query with filters
   */
  async getPaymentHistory(query: PaymentHistoryQuery) {
    const {
      clientId,
      startDate,
      endDate,
      paymentMethod,
      paymentStatus,
      minAmount,
      maxAmount,
      limit = 50,
      offset = 0,
      sortBy = 'date',
      sortOrder = 'desc'
    } = query;

    const whereClause: any = {};

    if (clientId) whereClause.clientId = clientId;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    if (minAmount || maxAmount) {
      whereClause.amount = {};
      if (minAmount) whereClause.amount.gte = minAmount;
      if (maxAmount) whereClause.amount.lte = maxAmount;
    }

    const orderByClause: any = {};
    switch (sortBy) {
      case 'amount':
        orderByClause.amount = sortOrder;
        break;
      case 'status':
        orderByClause.paymentStatus = sortOrder;
        break;
      default:
        orderByClause.createdAt = sortOrder;
    }

    const [payments, total] = await Promise.all([
      this.prisma.fawryPaymentNotification.findMany({
        where: whereClause,
        include: {
          client: {
            select: { name: true, organizationName: true }
          },
          customerData: true,
          creditTransaction: true
        },
        orderBy: orderByClause,
        take: limit,
        skip: offset
      }),
      this.prisma.fawryPaymentNotification.count({
        where: whereClause
      })
    ]);

    return {
      payments,
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
   * Get payment analytics for dashboard
   */
  async getPaymentAnalytics(
    clientId?: string,
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: Date = new Date()
  ): Promise<PaymentAnalytics> {
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      paymentStatus: 'SUCCESS' // Only successful payments
    };

    if (clientId) whereClause.clientId = clientId;

    // Total payments and amount
    const totals = await this.prisma.fawryPaymentNotification.aggregate({
      where: whereClause,
      _count: true,
      _sum: { amount: true },
      _avg: { amount: true }
    });

    // Payments by method
    const paymentsByMethod = await this.prisma.fawryPaymentNotification.groupBy({
      by: ['paymentMethod'],
      where: whereClause,
      _count: true,
      _sum: { amount: true }
    });

    // Daily payment trends
    const dailyPayments = clientId 
      ? await this.prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*)::int as count,
          SUM(amount)::float as amount
        FROM fawry_payment_notifications
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
          AND payment_status = 'SUCCESS'
          AND client_id = ${clientId}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `
      : await this.prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*)::int as count,
          SUM(amount)::float as amount
        FROM fawry_payment_notifications
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
          AND payment_status = 'SUCCESS'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

    // Success rate calculation
    const allPayments = await this.prisma.fawryPaymentNotification.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        ...(clientId && { clientId })
      },
      _count: true
    });

    const successRate = allPayments._count > 0 
      ? (totals._count / allPayments._count) * 100 
      : 0;

    return {
      totalPayments: totals._count,
      totalAmount: Number(totals._sum.amount || 0),
      averagePayment: Number(totals._avg.amount || 0),
      paymentsByMethod: paymentsByMethod.reduce((acc, item) => {
        acc[item.paymentMethod] = {
          count: item._count,
          amount: Number(item._sum.amount || 0)
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number }>),
      paymentsByDay: (dailyPayments as any[]).map(item => ({
        date: item.date.toISOString().split('T')[0],
        count: item.count,
        amount: item.amount
      })),
      successRate,
      period: { startDate, endDate }
    };
  }

  /**
   * Get credit analytics
   */
  async getCreditAnalytics(
    clientId?: string,
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): Promise<CreditAnalytics> {
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (clientId) whereClause.clientId = clientId;

    // Get totals by transaction type
    const [deposits, usage, refunds] = await Promise.all([
      this.prisma.creditTransaction.aggregate({
        where: { ...whereClause, transactionType: 'deposit' },
        _sum: { amount: true },
        _count: true
      }),
      this.prisma.creditTransaction.aggregate({
        where: { ...whereClause, transactionType: 'usage' },
        _sum: { amount: true },
        _count: true
      }),
      this.prisma.creditTransaction.aggregate({
        where: { ...whereClause, transactionType: 'refund' },
        _sum: { amount: true },
        _count: true
      })
    ]);

    // Daily usage trends
    const dailyUsage = clientId
      ? await this.prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          ABS(SUM(CASE WHEN transaction_type = 'usage' THEN amount ELSE 0 END))::float as usage
        FROM credit_transactions
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
          AND client_id = ${clientId}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `
      : await this.prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          ABS(SUM(CASE WHEN transaction_type = 'usage' THEN amount ELSE 0 END))::float as usage
        FROM credit_transactions
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

    // Balance distribution (for all clients if no specific client)
    let balanceDistribution: Array<{ range: string; count: number }> = [];
    if (!clientId) {
      const balanceRanges = await this.prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN credit < 10 THEN '0-10'
            WHEN credit < 50 THEN '10-50'
            WHEN credit < 100 THEN '50-100'
            WHEN credit < 500 THEN '100-500'
            ELSE '500+'
          END as range,
          COUNT(*)::int as count
        FROM clients
        WHERE billing_type = 'prepaid'
        GROUP BY range
        ORDER BY 
          CASE range
            WHEN '0-10' THEN 1
            WHEN '10-50' THEN 2
            WHEN '50-100' THEN 3
            WHEN '100-500' THEN 4
            WHEN '500+' THEN 5
          END
      `;
      balanceDistribution = balanceRanges as any[];
    }

    // Calculate average balance
    const avgBalance = clientId
      ? await this.prisma.client.findUnique({
          where: { id: clientId },
          select: { credit: true }
        }).then(client => Number(client?.credit || 0))
      : await this.prisma.client.aggregate({
          where: { billingType: 'prepaid' },
          _avg: { credit: true }
        }).then(result => Number(result._avg.credit || 0));

    return {
      totalDeposits: Number(deposits._sum.amount || 0),
      totalUsage: Math.abs(Number(usage._sum.amount || 0)),
      totalRefunds: Number(refunds._sum.amount || 0),
      averageBalance: avgBalance,
      balanceDistribution,
      usageByDay: (dailyUsage as any[]).map(item => ({
        date: item.date.toISOString().split('T')[0],
        usage: item.usage
      })),
      period: { startDate, endDate }
    };
  }

  /**
   * Get client payment summary
   */
  async getClientPaymentSummary(clientId: string) {
    const [
      totalPayments,
      recentPayments,
      creditBalance,
      lastPayment
    ] = await Promise.all([
      // Total payments
      this.prisma.fawryPaymentNotification.aggregate({
        where: { 
          clientId,
          paymentStatus: 'SUCCESS'
        },
        _count: true,
        _sum: { amount: true }
      }),

      // Recent payments (last 30 days)
      this.prisma.fawryPaymentNotification.count({
        where: {
          clientId,
          paymentStatus: 'SUCCESS',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Current credit balance
      this.prisma.client.findUnique({
        where: { id: clientId },
        select: { credit: true }
      }),

      // Last payment
      this.prisma.fawryPaymentNotification.findFirst({
        where: { 
          clientId,
          paymentStatus: 'SUCCESS'
        },
        orderBy: { createdAt: 'desc' },
        select: {
          amount: true,
          createdAt: true,
          paymentMethod: true
        }
      })
    ]);

    return {
      totalPayments: {
        count: totalPayments._count,
        amount: Number(totalPayments._sum.amount || 0)
      },
      recentPayments,
      currentBalance: Number(creditBalance?.credit || 0),
      lastPayment: lastPayment ? {
        amount: Number(lastPayment.amount),
        date: lastPayment.createdAt,
        method: lastPayment.paymentMethod
      } : null
    };
  }

  /**
   * Get payment trends for dashboard charts
   */
  async getPaymentTrends(
    clientId?: string,
    period: 'week' | 'month' | 'year' = 'month'
  ) {
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

    const dateTruncPeriod = period === 'year' ? 'month' : 'day';
    const trends = clientId
      ? await this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC(${dateTruncPeriod}, created_at) as period,
          COUNT(*)::int as payment_count,
          SUM(amount)::float as total_amount,
          AVG(amount)::float as avg_amount
        FROM fawry_payment_notifications
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
          AND payment_status = 'SUCCESS'
          AND client_id = ${clientId}
        GROUP BY DATE_TRUNC(${dateTruncPeriod}, created_at)
        ORDER BY period ASC
      `
      : await this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC(${dateTruncPeriod}, created_at) as period,
          COUNT(*)::int as payment_count,
          SUM(amount)::float as total_amount,
          AVG(amount)::float as avg_amount
        FROM fawry_payment_notifications
        WHERE created_at >= ${startDate} 
          AND created_at <= ${endDate}
          AND payment_status = 'SUCCESS'
        GROUP BY DATE_TRUNC(${dateTruncPeriod}, created_at)
        ORDER BY period ASC
      `;

    return (trends as any[]).map(trend => ({
      period: trend.period,
      paymentCount: trend.payment_count,
      totalAmount: trend.total_amount,
      averageAmount: trend.avg_amount
    }));
  }

  /**
   * Search payments with text-based filters
   */
  async searchPayments(
    searchTerm: string,
    clientId?: string,
    limit: number = 20
  ) {
    const whereClause: any = {
      OR: [
        { fptn: { contains: searchTerm, mode: 'insensitive' } },
        { bnkptn: { contains: searchTerm, mode: 'insensitive' } },
        { fcrn: { contains: searchTerm, mode: 'insensitive' } },
        { client: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { client: { organizationName: { contains: searchTerm, mode: 'insensitive' } } }
      ]
    };

    if (clientId) {
      whereClause.clientId = clientId;
    }

    return this.prisma.fawryPaymentNotification.findMany({
      where: whereClause,
      include: {
        client: {
          select: { name: true, organizationName: true }
        },
        customerData: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}