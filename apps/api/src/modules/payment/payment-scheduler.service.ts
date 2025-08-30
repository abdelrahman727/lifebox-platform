// src/modules/payment/payment-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ReconciliationService } from './services/reconciliation.service';
import { FawryService } from './services/fawry.service';
import { CreditService } from './services/credit.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PaymentSchedulerService {
  private readonly logger = new Logger(PaymentSchedulerService.name);

  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly fawryService: FawryService,
    private readonly creditService: CreditService,
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Daily reconciliation - runs at 2 AM
   */
  @Cron('0 2 * * *', {
    name: 'daily-reconciliation',
    timeZone: 'Africa/Cairo',
  })
  async dailyReconciliation() {
    this.logger.log('Starting daily reconciliation job');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const report = await this.reconciliationService.reconcilePayments(yesterday);
      
      this.logger.log('Daily reconciliation completed', report.summary);
    } catch (error) {
      this.logger.error('Daily reconciliation failed', error);
      // TODO: Send alert notification
    }
  }

  /**
   * Retry failed payments - runs every 30 minutes
   */
  @Cron('*/30 * * * *', {
    name: 'retry-failed-payments',
  })
  async retryFailedPayments() {
    this.logger.log('Starting retry failed payments job');
    
    try {
      await this.fawryService.retryFailedWebhooks();
      
      this.logger.log('Retry failed payments completed');
    } catch (error) {
      this.logger.error('Retry failed payments job failed', error);
    }
  }

  /**
   * Low balance alerts - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'low-balance-alerts',
  })
  async checkLowBalanceAlerts() {
    this.logger.log('Checking for low balance clients');
    
    try {
      const threshold = 50; // 50 EGP
      const lowBalanceClients = await this.creditService.getLowBalanceClients(threshold);
      
      if (lowBalanceClients.length > 0) {
        this.logger.warn(`Found ${lowBalanceClients.length} clients with low balance`);
        
        // Process each client
        for (const client of lowBalanceClients) {
          await this.sendLowBalanceAlert(client);
        }
      }
    } catch (error) {
      this.logger.error('Low balance alert check failed', error);
    }
  }

  /**
   * Usage tracking cleanup - runs daily at 3 AM
   */
  @Cron('0 3 * * *', {
    name: 'usage-tracking-cleanup',
    timeZone: 'Africa/Cairo',
  })
  async cleanupOldUsageTracking() {
    this.logger.log('Starting usage tracking cleanup');
    
    try {
      // Delete usage tracking older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      const result = await this.prisma.usageTracking.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });
      
      this.logger.log(`Deleted ${result.count} old usage tracking records`);
    } catch (error) {
      this.logger.error('Usage tracking cleanup failed', error);
    }
  }

  /**
   * Postpaid billing cycle - runs on the 1st of every month at 1 AM
   */
  @Cron('0 1 1 * *', {
    name: 'postpaid-billing-cycle',
    timeZone: 'Africa/Cairo',
  })
  async processPostpaidBilling() {
    this.logger.log('Starting postpaid billing cycle');
    
    try {
      // Get all postpaid clients
      const postpaidClients = await this.prisma.client.findMany({
        where: {
          billingType: 'postpaid',
        },
      });
      
      for (const client of postpaidClients) {
        await this.processClientPostpaidBilling(client);
      }
      
      this.logger.log(`Processed postpaid billing for ${postpaidClients.length} clients`);
    } catch (error) {
      this.logger.error('Postpaid billing cycle failed', error);
    }
  }

  /**
   * Credit expiry check - runs daily at 4 AM
   */
  @Cron('0 4 * * *', {
    name: 'credit-expiry-check',
    timeZone: 'Africa/Cairo',
  })
  async checkCreditExpiry() {
    this.logger.log('Checking for expiring credits');
    
    try {
      // Get all prepaid clients with credits expiring in 7 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      
      const expiringCredits = await this.prisma.client.findMany({
        where: {
          billingType: 'prepaid',
          credit: {
            gt: 0,
          },
        },
      });
      
      for (const client of expiringCredits) {
        await this.sendCreditExpiryWarning(client);
      }
      
      this.logger.log(`Sent expiry warnings to ${expiringCredits.length} clients`);
    } catch (error) {
      this.logger.error('Credit expiry check failed', error);
    }
  }

  /**
   * Payment statistics aggregation - runs daily at midnight
   */
  @Cron('0 0 * * *', {
    name: 'payment-statistics',
    timeZone: 'Africa/Cairo',
  })
  async aggregatePaymentStatistics() {
    this.logger.log('Aggregating payment statistics');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Aggregate payment statistics
      const stats = await this.prisma.fawryPaymentNotification.aggregate({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today,
          },
          paymentStatus: 'PmtNew',
          responseStatusCode: 200,
        },
        _count: true,
        _sum: {
          amount: true,
        },
        _avg: {
          amount: true,
        },
      });
      
      // Store statistics
      await this.prisma.auditLog.create({
        data: {
          actionType: 'PAYMENT_STATISTICS',
          resourceType: 'PAYMENT',
          resourceId: yesterday.toISOString().split('T')[0],
          details: {
            date: yesterday.toISOString().split('T')[0],
            totalTransactions: stats._count,
            totalAmount: Number(stats._sum.amount || 0),
            averageAmount: Number(stats._avg.amount || 0),
          },
          ipAddress: 'system',
          userAgent: 'PaymentScheduler',
        },
      });
      
      this.logger.log('Payment statistics aggregated', stats);
    } catch (error) {
      this.logger.error('Payment statistics aggregation failed', error);
    }
  }

  /**
   * Helper method to send low balance alert
   */
  private async sendLowBalanceAlert(client: any) {
    try {
      // Create notification record
      await this.prisma.notification.create({
        data: {
          type: 'LOW_BALANCE_ALERT',
          title: 'Low Credit Balance Alert',
          message: `Your credit balance (${client.credit} EGP) is below the minimum threshold. Please top up to continue using the service.`,
          severity: 'warning',
          clientId: client.id,
          metadata: {
            currentBalance: Number(client.credit),
            threshold: 50,
          },
        },
      });

      // TODO: Implement email/SMS notification
      this.logger.log(`Low balance alert created for client ${client.name}`);
    } catch (error) {
      this.logger.error(`Failed to send low balance alert for client ${client.id}`, error);
    }
  }

  /**
   * Helper method to process postpaid billing for a client
   */
  private async processClientPostpaidBilling(client: any) {
    try {
      // Close current period
      const currentPeriod = await this.prisma.postpaidPeriod.findFirst({
        where: {
          clientId: client.id,
          isActive: true,
        },
      });

      if (currentPeriod) {
        // Update period as inactive
        await this.prisma.postpaidPeriod.update({
          where: { id: currentPeriod.id },
          data: { isActive: false },
        });

        // Calculate total usage for the period
        const usage = await this.prisma.usageTracking.aggregate({
          where: {
            clientId: client.id,
            postpaidPeriodId: currentPeriod.id,
          },
          _sum: {
            costEgp: true,
          },
        });

        const totalCost = Number(usage._sum.costEgp || 0);

        // Create invoice notification
        await this.prisma.notification.create({
          data: {
            type: 'POSTPAID_INVOICE',
            title: 'Monthly Invoice Generated',
            message: `Your invoice for ${currentPeriod.startDate.toISOString().split('T')[0]} to ${currentPeriod.endDate.toISOString().split('T')[0]} is ready. Total amount: ${totalCost} EGP`,
            severity: 'info',
            clientId: client.id,
            metadata: {
              periodId: currentPeriod.id,
              totalAmount: totalCost,
              startDate: currentPeriod.startDate,
              endDate: currentPeriod.endDate,
            },
          },
        });
      }

      // Create new billing period
      const startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);

      // Find a system user or use a default
      const systemUser = await this.prisma.user.findFirst({
        where: { email: 'system@lifebox.com' },
      });

      await this.prisma.postpaidPeriod.create({
        data: {
          clientId: client.id,
          startDate,
          endDate,
          isActive: true,
          createdBy: systemUser?.id || 'system',
        },
      });

      this.logger.log(`Postpaid billing processed for client ${client.name}`);
    } catch (error) {
      this.logger.error(`Failed to process postpaid billing for client ${client.id}`, error);
    }
  }

  /**
   * Helper method to send credit expiry warning
   */
  private async sendCreditExpiryWarning(client: any) {
    try {
      await this.prisma.notification.create({
        data: {
          type: 'CREDIT_EXPIRY_WARNING',
          title: 'Credit Expiry Warning',
          message: `Your prepaid credit will expire soon. Current balance: ${client.credit} EGP`,
          severity: 'warning',
          clientId: client.id,
          metadata: {
            currentBalance: Number(client.credit),
          },
        },
      });

      this.logger.log(`Credit expiry warning sent for client ${client.name}`);
    } catch (error) {
      this.logger.error(`Failed to send credit expiry warning for client ${client.id}`, error);
    }
  }

  /**
   * Get scheduler status
   */
  async getSchedulerStatus() {
    const jobs = [
      'daily-reconciliation',
      'retry-failed-payments',
      'low-balance-alerts',
      'usage-tracking-cleanup',
      'postpaid-billing-cycle',
      'credit-expiry-check',
      'payment-statistics',
    ];

    const status = jobs.map(jobName => {
      try {
        const job = this.schedulerRegistry.getCronJob(jobName);
        const nextDates = job.nextDates(1);
        
        return {
          name: jobName,
          running: (job as any).running !== undefined ? (job as any).running : true,
          lastDate: (job as any).lastDate ? (job as any).lastDate() : null,
          nextDate: nextDates.length > 0 ? nextDates[0].toJSDate() : null,
        };
      } catch (error) {
        return {
          name: jobName,
          running: false,
          error: 'Job not found',
        };
      }
    });

    return status;
  }

  /**
   * Manually trigger a scheduled job
   */
  async triggerJob(jobName: string) {
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      job.fireOnTick();
      
      return {
        success: true,
        message: `Job ${jobName} triggered successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to trigger job ${jobName}`, error);
      throw error;
    }
  }

  /**
   * Stop a scheduled job
   */
  async stopJob(jobName: string) {
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      job.stop();
      
      return {
        success: true,
        message: `Job ${jobName} stopped successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to stop job ${jobName}`, error);
      throw error;
    }
  }

  /**
   * Start a scheduled job
   */
  async startJob(jobName: string) {
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      job.start();
      
      return {
        success: true,
        message: `Job ${jobName} started successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to start job ${jobName}`, error);
      throw error;
    }
  }
}