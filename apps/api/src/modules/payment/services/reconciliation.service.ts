// src/modules/payment/services/reconciliation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

interface ReconciliationRecord {
  date: Date;
  fptn: string;
  bnkptn?: string;
  billingAccount: string;
  amount: number;
  paymentStatus: string;
  localStatus?: string;
  matched: boolean;
  discrepancy?: string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main reconciliation process
   */
  async reconcilePayments(date: Date) {
    this.logger.log(`Starting reconciliation for date: ${date.toISOString().split('T')[0]}`);
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Fetch all local payments for the date
    const localPayments = await this.prisma.fawryPaymentNotification.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        client: true,
        creditTransaction: true,
      },
    });
    
    // TODO: Fetch reconciliation file from Fawry
    // For now, we'll simulate with local data
    const fawryRecords = await this.fetchFawryReconciliationData(date);
    
    // Perform reconciliation
    const reconciliationResults = await this.performReconciliation(
      localPayments,
      fawryRecords,
    );
    
    // Generate reconciliation report
    const report = await this.generateReconciliationReport(
      date,
      reconciliationResults,
    );
    
    // Store reconciliation results
    await this.storeReconciliationResults(date, reconciliationResults, report);
    
    // Handle discrepancies
    await this.handleDiscrepancies(reconciliationResults);
    
    this.logger.log(`Reconciliation completed for date: ${date.toISOString().split('T')[0]}`);
    
    return report;
  }

  /**
   * Fetch reconciliation data from Fawry
   */
  private async fetchFawryReconciliationData(date: Date): Promise<ReconciliationRecord[]> {
    // TODO: Implement actual Fawry API call or file fetch
    // This is a placeholder that returns empty array
    this.logger.warn('Fawry reconciliation API not implemented, using local data only');
    return [];
  }

  /**
   * Perform reconciliation between local and Fawry records
   */
  private async performReconciliation(
    localPayments: any[],
    fawryRecords: ReconciliationRecord[],
  ): Promise<ReconciliationRecord[]> {
    const results: ReconciliationRecord[] = [];
    
    // Create maps for efficient lookup
    const localMap = new Map(localPayments.map(p => [p.fptn, p]));
    const fawryMap = new Map(fawryRecords.map(r => [r.fptn, r]));
    
    // Check all local payments
    for (const localPayment of localPayments) {
      const fawryRecord = fawryMap.get(localPayment.fptn);
      
      if (!fawryRecord) {
        // Payment exists locally but not at Fawry
        results.push({
          date: localPayment.createdAt,
          fptn: localPayment.fptn,
          bnkptn: localPayment.bnkptn,
          billingAccount: localPayment.billingAccount,
          amount: Number(localPayment.amount),
          paymentStatus: localPayment.paymentStatus,
          localStatus: localPayment.responseStatusCode?.toString(),
          matched: false,
          discrepancy: 'Missing at Fawry',
        });
      } else {
        // Compare records
        const amountMatch = Math.abs(Number(localPayment.amount) - fawryRecord.amount) < 0.01;
        const statusMatch = localPayment.paymentStatus === fawryRecord.paymentStatus;
        
        if (amountMatch && statusMatch) {
          results.push({
            date: localPayment.createdAt,
            fptn: localPayment.fptn,
            bnkptn: localPayment.bnkptn,
            billingAccount: localPayment.billingAccount,
            amount: Number(localPayment.amount),
            paymentStatus: localPayment.paymentStatus,
            localStatus: localPayment.responseStatusCode?.toString(),
            matched: true,
          });
        } else {
          const discrepancies = [];
          if (!amountMatch) {
            discrepancies.push(`Amount mismatch (Local: ${localPayment.amount}, Fawry: ${fawryRecord.amount})`);
          }
          if (!statusMatch) {
            discrepancies.push(`Status mismatch (Local: ${localPayment.paymentStatus}, Fawry: ${fawryRecord.paymentStatus})`);
          }
          
          results.push({
            date: localPayment.createdAt,
            fptn: localPayment.fptn,
            bnkptn: localPayment.bnkptn,
            billingAccount: localPayment.billingAccount,
            amount: Number(localPayment.amount),
            paymentStatus: localPayment.paymentStatus,
            localStatus: localPayment.responseStatusCode?.toString(),
            matched: false,
            discrepancy: discrepancies.join('; '),
          });
        }
      }
    }
    
    // Check for payments at Fawry but not local
    for (const fawryRecord of fawryRecords) {
      if (!localMap.has(fawryRecord.fptn)) {
        results.push({
          ...fawryRecord,
          matched: false,
          discrepancy: 'Missing locally',
        });
      }
    }
    
    return results;
  }

  /**
   * Generate reconciliation report
   */
  private async generateReconciliationReport(
    date: Date,
    results: ReconciliationRecord[],
  ) {
    const totalTransactions = results.length;
    const matchedTransactions = results.filter(r => r.matched).length;
    const mismatchedTransactions = totalTransactions - matchedTransactions;
    const totalAmount = results.reduce((sum, r) => sum + r.amount, 0);
    const matchedAmount = results
      .filter(r => r.matched)
      .reduce((sum, r) => sum + r.amount, 0);
    const mismatchedAmount = totalAmount - matchedAmount;
    
    const discrepancies = results
      .filter(r => !r.matched)
      .map(r => ({
        fptn: r.fptn,
        billingAccount: r.billingAccount,
        amount: r.amount,
        discrepancy: r.discrepancy,
      }));
    
    return {
      date: date.toISOString().split('T')[0],
      summary: {
        totalTransactions,
        matchedTransactions,
        mismatchedTransactions,
        matchRate: (matchedTransactions / totalTransactions) * 100,
        totalAmount,
        matchedAmount,
        mismatchedAmount,
      },
      discrepancies,
      generatedAt: new Date(),
    };
  }

  /**
   * Store reconciliation results in database
   */
  private async storeReconciliationResults(
    date: Date,
    results: ReconciliationRecord[],
    report: any,
  ) {
    // Store summary - adjust based on your actual schema
    // If your auditLog doesn't have these fields, you might need to:
    // 1. Update your Prisma schema to include them, or
    // 2. Store this data differently (e.g., in a separate reconciliation table)
    
    try {
      // Option 1: If your auditLog has different field names
      await this.prisma.auditLog.create({
        data: {
          // Adjust these field names to match your actual schema
          actionType: 'RECONCILIATION_COMPLETED', // or whatever field name you have
          entity: 'PAYMENT',
          entityId: date.toISOString().split('T')[0],
          resourceType: 'PAYMENT_RECONCILIATION',
          metadata: report, // or details/data field
          ip: 'system',
          userAgent: 'ReconciliationService',
          // Add userId if required by your schema
          // userId: 'system',
        } as any,
      });
    } catch (error) {
      this.logger.error('Failed to store reconciliation results in audit log', error);
      
      // Alternative: Store in a different way if audit log doesn't work
      // You could create a dedicated reconciliation results table
    }
    
    // Store detailed results if needed
    if (results.some(r => !r.matched)) {
      // Generate CSV report for mismatches
      const csvData = await this.generateCSVReport(results.filter(r => !r.matched));
      const fileName = `reconciliation_discrepancies_${date.toISOString().split('T')[0]}.csv`;
      const filePath = path.join(
        this.configService.get('REPORTS_PATH', './reports'),
        fileName,
      );
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, csvData);
      
      this.logger.warn(`Discrepancy report saved to: ${filePath}`);
    }
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(records: ReconciliationRecord[]): Promise<string> {
    return new Promise((resolve, reject) => {
      stringify(
        records,
        {
          header: true,
          columns: [
            'date',
            'fptn',
            'bnkptn',
            'billingAccount',
            'amount',
            'paymentStatus',
            'localStatus',
            'discrepancy',
          ],
        },
        (err, output) => {
          if (err) reject(err);
          else resolve(output);
        },
      );
    });
  }

  /**
   * Handle discrepancies
   */
  private async handleDiscrepancies(results: ReconciliationRecord[]) {
    const discrepancies = results.filter(r => !r.matched);
    
    if (discrepancies.length === 0) {
      return;
    }
    
    this.logger.warn(`Found ${discrepancies.length} discrepancies in reconciliation`);
    
    // Handle different types of discrepancies
    for (const discrepancy of discrepancies) {
      if (discrepancy.discrepancy === 'Missing locally') {
        // Payment exists at Fawry but not locally
        // This might need manual investigation or automatic sync
        this.logger.error(
          `Payment ${discrepancy.fptn} exists at Fawry but not locally. Manual intervention required.`,
        );
        
        // TODO: Send notification to admin
        // TODO: Create a pending reconciliation task
      } else if (discrepancy.discrepancy === 'Missing at Fawry') {
        // Payment exists locally but not at Fawry
        // This might indicate a failed notification
        this.logger.error(
          `Payment ${discrepancy.fptn} exists locally but not at Fawry. May need to retry notification.`,
        );
        
        // TODO: Mark for retry or investigation
      } else {
        // Other mismatches (amount, status)
        this.logger.error(
          `Payment ${discrepancy.fptn} has discrepancy: ${discrepancy.discrepancy}`,
        );
        
        // TODO: Create investigation task
      }
    }
  }

  /**
   * Get reconciliation status for a date
   */
  async getReconciliationStatus(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      // Adjust the query based on your actual schema
      const auditLog = await this.prisma.auditLog.findFirst({
        where: {
          // Adjust these field names to match your actual schema
          actionType: 'RECONCILIATION_COMPLETED', // or whatever field name you have
          entityId: dateStr,
        } as any,
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      if (!auditLog) {
        return {
          date: dateStr,
          status: 'NOT_STARTED',
          lastRun: null,
        };
      }
      
      return {
        date: dateStr,
        status: 'COMPLETED',
        lastRun: auditLog.createdAt,
        report: (auditLog as any).metadata || (auditLog as any).details || {},
      };
    } catch (error) {
      this.logger.error('Failed to get reconciliation status', error);
      return {
        date: dateStr,
        status: 'ERROR',
        lastRun: null,
        error: error.message,
      };
    }
  }

  /**
   * Get pending reconciliation tasks
   */
  async getPendingReconciliationTasks() {
    // Get the last 7 days
    const tasks = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const status = await this.getReconciliationStatus(date);
      if (status.status === 'NOT_STARTED') {
        tasks.push({
          date: status.date,
          status: 'PENDING',
        });
      }
    }
    
    return tasks;
  }
}