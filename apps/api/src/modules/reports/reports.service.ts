import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  GenerateReportDto,
  ReportType,
  ReportFormat,
  ReportPeriod,
} from './dto/report-request.dto';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

interface ReportData {
  title: string;
  period: string;
  generatedAt: Date;
  client?: any;
  devices?: any[];
  telemetryData?: any[];
  alarmData?: any[];
  energyMetrics?: any;
  waterMetrics?: any;
  billingData?: any;
  summary?: any;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly reportsDir = join(process.cwd(), 'reports');

  constructor(private readonly prisma: PrismaService) {
    // Ensure reports directory exists
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async generateReport(
    reportRequest: GenerateReportDto,
    userId: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Generating ${reportRequest.type} report for user ${userId}`,
      );

      // Validate user permissions
      const user = await this.validateUserAccess(
        userId,
        reportRequest.clientId,
      );

      // Calculate date range
      const { startDate, endDate } = this.calculateDateRange(reportRequest);

      // Gather report data based on type
      const reportData = await this.gatherReportData(
        reportRequest,
        startDate,
        endDate,
        user,
      );

      // Generate report in requested format
      let filePath: string;
      switch (reportRequest.format) {
        case ReportFormat.PDF:
          filePath = await this.generatePDFReport(reportData, reportRequest);
          break;
        case ReportFormat.CSV:
          filePath = await this.generateCSVReport(reportData, reportRequest);
          break;
        case ReportFormat.JSON:
          filePath = await this.generateJSONReport(reportData, reportRequest);
          break;
        default:
          throw new BadRequestException('Unsupported report format');
      }

      this.logger.log(`Report generated successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`);
      throw error;
    }
  }

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

  private calculateDateRange(request: GenerateReportDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    if (request.period === ReportPeriod.CUSTOM) {
      if (!request.startDate || !request.endDate) {
        throw new BadRequestException(
          'Start date and end date are required for custom period',
        );
      }
      startDate = new Date(request.startDate);
      endDate = new Date(request.endDate);
    } else {
      switch (request.period) {
        case ReportPeriod.DAILY:
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          break;
        case ReportPeriod.WEEKLY:
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
          startDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
          );
          endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case ReportPeriod.MONTHLY:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case ReportPeriod.QUARTERLY:
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
          break;
        case ReportPeriod.YEARLY:
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

  private async gatherReportData(
    request: GenerateReportDto,
    startDate: Date,
    endDate: Date,
    user: any,
  ): Promise<ReportData> {
    const reportData: ReportData = {
      title: this.getReportTitle(request.type, request.period),
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      generatedAt: new Date(),
    };

    // Base query conditions
    const deviceFilter = {
      ...(request.clientId ? { clientId: request.clientId } : {}),
      ...(request.deviceIds ? { id: { in: request.deviceIds } } : {}),
      ...(user.role.name === 'client_user' ? { clientId: user.clientId } : {}),
    };

    switch (request.type) {
      case ReportType.DEVICE_PERFORMANCE:
        reportData.devices = await this.getDevicePerformanceData(
          deviceFilter,
          startDate,
          endDate,
        );
        break;

      case ReportType.TELEMETRY_SUMMARY:
        reportData.telemetryData = await this.getTelemetrySummaryData(
          deviceFilter,
          startDate,
          endDate,
        );
        break;

      case ReportType.CLIENT_OVERVIEW:
        if (request.clientId) {
          reportData.client = await this.getClientOverviewData(
            request.clientId,
            startDate,
            endDate,
          );
        }
        break;

      case ReportType.ALARM_HISTORY:
        reportData.alarmData = await this.getAlarmHistoryData(
          deviceFilter,
          startDate,
          endDate,
        );
        break;

      case ReportType.ENERGY_USAGE:
        reportData.energyMetrics = await this.getEnergyUsageData(
          deviceFilter,
          startDate,
          endDate,
        );
        break;

      case ReportType.WATER_PRODUCTION:
        reportData.waterMetrics = await this.getWaterProductionData(
          deviceFilter,
          startDate,
          endDate,
        );
        break;

      case ReportType.SYSTEM_HEALTH:
        reportData.summary = await this.getSystemHealthData(
          deviceFilter,
          startDate,
          endDate,
        );
        break;

      case ReportType.BILLING_SUMMARY:
        reportData.billingData = await this.getBillingSummaryData(
          request.clientId || user.clientId,
          startDate,
          endDate,
        );
        break;

      default:
        throw new BadRequestException('Unsupported report type');
    }

    return reportData;
  }

  private async getDevicePerformanceData(
    deviceFilter: any,
    startDate: Date,
    endDate: Date,
  ) {
    return await this.prisma.device.findMany({
      where: {
        ...deviceFilter,
        telemetryEvents: {
          some: {
            time: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
      include: {
        client: {
          select: {
            name: true,
            organizationName: true,
          },
        },
        telemetryEvents: {
          where: {
            time: {
              gte: startDate,
              lt: endDate,
            },
          },
          orderBy: { time: 'desc' },
          take: 100, // Limit for performance
        },
        alarmEvents: {
          where: {
            triggeredAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
    });
  }

  private async getTelemetrySummaryData(
    deviceFilter: any,
    startDate: Date,
    endDate: Date,
  ) {
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
            deviceCode: true,
            deviceName: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { time: 'desc' },
      take: 1000, // Limit for performance
    });
  }

  private async getClientOverviewData(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        devices: {
          include: {
            telemetryEvents: {
              where: {
                time: {
                  gte: startDate,
                  lt: endDate,
                },
              },
              orderBy: { time: 'desc' },
              take: 10,
            },
            alarmEvents: {
              where: {
                triggeredAt: {
                  gte: startDate,
                  lt: endDate,
                },
              },
            },
          },
        },
        creditTransactions: {
          where: {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
    });

    return client;
  }

  private async getAlarmHistoryData(
    deviceFilter: any,
    startDate: Date,
    endDate: Date,
  ) {
    return await this.prisma.alarmEvent.findMany({
      where: {
        device: deviceFilter,
        triggeredAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        device: {
          select: {
            deviceCode: true,
            deviceName: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  private async getEnergyUsageData(
    deviceFilter: any,
    startDate: Date,
    endDate: Date,
  ) {
    const deviceIds = await this.getDeviceIds(deviceFilter);
    
    // Use individual aggregate queries for each device to avoid complex groupBy
    const results = await Promise.all(
      deviceIds.map(async (deviceId) => {
        const [sumData, avgData, countData] = await Promise.all([
          this.prisma.telemetryEvent.aggregate({
            where: {
              deviceId,
              time: {
                gte: startDate,
                lt: endDate,
              },
            },
            _sum: {
              energyPerDayValue: true,
              pumpEnergyConsumptionValue: true,
            },
          }),
          this.prisma.telemetryEvent.aggregate({
            where: {
              deviceId,
              time: {
                gte: startDate,
                lt: endDate,
              },
            },
            _avg: {
              pumpPowerValue: true,
            },
          }),
          this.prisma.telemetryEvent.count({
            where: {
              deviceId,
              time: {
                gte: startDate,
                lt: endDate,
              },
            },
          }),
        ]);

        return {
          _id: deviceId,
          totalEnergyGenerated: sumData._sum.energyPerDayValue || 0,
          totalEnergyConsumed: sumData._sum.pumpEnergyConsumptionValue || 0,
          avgEfficiency: avgData._avg.pumpPowerValue || 0,
          dataPoints: countData,
        };
      })
    );

    return results;
  }

  private async getWaterProductionData(
    deviceFilter: any,
    startDate: Date,
    endDate: Date,
  ) {
    const deviceIds = await this.getDeviceIds(deviceFilter);
    
    // Use individual aggregate queries for each device
    const results = await Promise.all(
      deviceIds.map(async (deviceId) => {
        const [sumData, avgData, pumpOnCount] = await Promise.all([
          this.prisma.telemetryEvent.aggregate({
            where: {
              deviceId,
              time: {
                gte: startDate,
                lt: endDate,
              },
            },
            _sum: {
              totalWaterVolumeM3Value: true,
            },
          }),
          this.prisma.telemetryEvent.aggregate({
            where: {
              deviceId,
              time: {
                gte: startDate,
                lt: endDate,
              },
            },
            _avg: {
              totalWaterVolumeM3Value: true,
              pressureSensorValue: true,
            },
          }),
          this.prisma.telemetryEvent.count({
            where: {
              deviceId,
              time: {
                gte: startDate,
                lt: endDate,
              },
              pumpStatusValue: "Running",
            },
          }),
        ]);

        return {
          _id: deviceId,
          totalWaterProduced: sumData._sum.totalWaterVolumeM3Value || 0,
          avgFlowRate: avgData._avg.totalWaterVolumeM3Value || 0,
          avgPressure: avgData._avg.pressureSensorValue || 0,
          operatingHours: pumpOnCount,
        };
      })
    );

    return results;
  }

  private async getSystemHealthData(
    deviceFilter: any,
    startDate: Date,
    endDate: Date,
  ) {
    const devices = await this.prisma.device.count({
      where: deviceFilter,
    });

    const activeDevices = await this.prisma.device.count({
      where: {
        ...deviceFilter,
        isActive: true,
      },
    });

    const totalAlarms = await this.prisma.alarmEvent.count({
      where: {
        device: deviceFilter,
        triggeredAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const criticalAlarms = await this.prisma.alarmEvent.count({
      where: {
        device: deviceFilter,
        triggeredAt: {
          gte: startDate,
          lt: endDate,
        },
        severity: 'critical',
      },
    });

    return {
      totalDevices: devices,
      activeDevices,
      deviceHealthPercentage: devices > 0 ? (activeDevices / devices) * 100 : 0,
      totalAlarms,
      criticalAlarms,
      systemUptime: devices > 0 ? (activeDevices / devices) * 100 : 0,
    };
  }

  private async getBillingSummaryData(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        creditTransactions: {
          where: {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const totalCredits = client.creditTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
    );
    const totalDeductions = client.creditTransactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const totalAdditions = client.creditTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      client: {
        name: client.name,
        organizationName: client.organizationName,
        billingType: client.billingType,
        currentCredit: client.credit,
      },
      transactions: client.creditTransactions,
      summary: {
        totalCredits,
        totalDeductions,
        totalAdditions,
        transactionCount: client.creditTransactions.length,
      },
    };
  }

  private async getDeviceIds(deviceFilter: any): Promise<string[]> {
    const devices = await this.prisma.device.findMany({
      where: deviceFilter,
      select: { id: true },
    });
    return devices.map((d) => d.id);
  }

  private getReportTitle(type: ReportType, period: ReportPeriod): string {
    const typeNames = {
      [ReportType.DEVICE_PERFORMANCE]: 'Device Performance',
      [ReportType.TELEMETRY_SUMMARY]: 'Telemetry Summary',
      [ReportType.CLIENT_OVERVIEW]: 'Client Overview',
      [ReportType.ALARM_HISTORY]: 'Alarm History',
      [ReportType.ENERGY_USAGE]: 'Energy Usage',
      [ReportType.WATER_PRODUCTION]: 'Water Production',
      [ReportType.SYSTEM_HEALTH]: 'System Health',
      [ReportType.BILLING_SUMMARY]: 'Billing Summary',
    };

    const periodNames = {
      [ReportPeriod.DAILY]: 'Daily',
      [ReportPeriod.WEEKLY]: 'Weekly',
      [ReportPeriod.MONTHLY]: 'Monthly',
      [ReportPeriod.QUARTERLY]: 'Quarterly',
      [ReportPeriod.YEARLY]: 'Yearly',
      [ReportPeriod.CUSTOM]: 'Custom Period',
    };

    return `${periodNames[period]} ${typeNames[type]} Report`;
  }

  private async generatePDFReport(
    data: ReportData,
    request: GenerateReportDto,
  ): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      const html = this.generateHTML(data, request);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${request.type}_${request.period}_${timestamp}.pdf`;
      const filePath = join(this.reportsDir, filename);

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });

      return filePath;
    } finally {
      await browser.close();
    }
  }

  private async generateCSVReport(
    data: ReportData,
    request: GenerateReportDto,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${request.type}_${request.period}_${timestamp}.csv`;
    const filePath = join(this.reportsDir, filename);

    let csvContent = '';

    // Generate CSV based on report type
    switch (request.type) {
      case ReportType.TELEMETRY_SUMMARY:
        csvContent = this.generateTelemetryCSV(data.telemetryData || []);
        break;
      case ReportType.ALARM_HISTORY:
        csvContent = this.generateAlarmCSV(data.alarmData || []);
        break;
      default:
        csvContent = 'Report Type,Period,Generated At\n';
        csvContent += `${request.type},${data.period},${data.generatedAt.toISOString()}\n`;
    }

    writeFileSync(filePath, csvContent, 'utf8');
    return filePath;
  }

  private async generateJSONReport(
    data: ReportData,
    request: GenerateReportDto,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${request.type}_${request.period}_${timestamp}.json`;
    const filePath = join(this.reportsDir, filename);

    const jsonData = {
      reportMetadata: {
        type: request.type,
        format: request.format,
        period: request.period,
        generatedAt: data.generatedAt,
        title: data.title,
      },
      data,
    };

    writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
    return filePath;
  }

  private generateHTML(data: ReportData, request: GenerateReportDto): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${data.title}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #333; }
            .subtitle { font-size: 14px; color: #666; margin-top: 10px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
            .metric-label { font-size: 12px; color: #666; }
            .metric-value { font-size: 18px; font-weight: bold; color: #333; }
            .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">${data.title}</div>
            <div class="subtitle">Period: ${data.period}</div>
            <div class="subtitle">Generated: ${data.generatedAt.toLocaleString()}</div>
        </div>
        
        ${this.generateReportContent(data, request)}
        
        <div class="footer">
            Generated by LifeBox IoT Platform - Report ID: ${request.type}_${new Date().getTime()}
        </div>
    </body>
    </html>
    `;
  }

  private generateReportContent(
    data: ReportData,
    request: GenerateReportDto,
  ): string {
    switch (request.type) {
      case ReportType.DEVICE_PERFORMANCE:
        return this.generateDevicePerformanceHTML(data.devices || []);
      case ReportType.TELEMETRY_SUMMARY:
        return this.generateTelemetrySummaryHTML(data.telemetryData || []);
      case ReportType.CLIENT_OVERVIEW:
        return this.generateClientOverviewHTML(data.client);
      case ReportType.ALARM_HISTORY:
        return this.generateAlarmHistoryHTML(data.alarmData || []);
      case ReportType.SYSTEM_HEALTH:
        return this.generateSystemHealthHTML(data.summary || {});
      case ReportType.BILLING_SUMMARY:
        return this.generateBillingSummaryHTML(data.billingData || {});
      default:
        return '<div class="section"><div class="section-title">Report Data</div><p>Report generated successfully.</p></div>';
    }
  }

  private generateDevicePerformanceHTML(devices: any[]): string {
    if (devices.length === 0) {
      return '<div class="section"><div class="section-title">Device Performance</div><p>No devices found for the selected criteria.</p></div>';
    }

    let html =
      '<div class="section"><div class="section-title">Device Performance Summary</div>';

    devices.forEach((device) => {
      const telemetryCount = device.telemetryEvents?.length || 0;
      const alarmCount = device.alarmEvents?.length || 0;
      const latestTelemetry = device.telemetryEvents?.[0];

      html += `
        <h3>${device.deviceName} (${device.deviceCode})</h3>
        <p><strong>Client:</strong> ${device.client?.name || 'N/A'}</p>
        <div class="metric">
          <div class="metric-label">Status</div>
          <div class="metric-value">${device.isActive ? 'Active' : 'Inactive'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Data Points</div>
          <div class="metric-value">${telemetryCount}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Alarms</div>
          <div class="metric-value">${alarmCount}</div>
        </div>
        ${
          latestTelemetry
            ? `
        <div class="metric">
          <div class="metric-label">Latest Energy (kWh)</div>
          <div class="metric-value">${latestTelemetry.energyPerDayValue?.toFixed(2) || 'N/A'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Latest Voltage (V)</div>
          <div class="metric-value">${latestTelemetry.busVoltageValue?.toFixed(1) || 'N/A'}</div>
        </div>
        `
            : ''
        }
      `;
    });

    html += '</div>';
    return html;
  }

  private generateTelemetrySummaryHTML(telemetryData: any[]): string {
    if (telemetryData.length === 0) {
      return '<div class="section"><div class="section-title">Telemetry Summary</div><p>No telemetry data found for the selected criteria.</p></div>';
    }

    let html =
      '<div class="section"><div class="section-title">Telemetry Summary</div>';
    html +=
      '<table><thead><tr><th>Device</th><th>Time</th><th>Energy (kWh)</th><th>Voltage (V)</th><th>Current (A)</th><th>Pump Status</th></tr></thead><tbody>';

    telemetryData.slice(0, 50).forEach((record) => {
      html += `
        <tr>
          <td>${record.device?.deviceCode || 'N/A'}</td>
          <td>${new Date(record.time).toLocaleString()}</td>
          <td>${record.energyPerDayValue?.toFixed(2) || 'N/A'}</td>
          <td>${record.busVoltageValue?.toFixed(1) || 'N/A'}</td>
          <td>${record.pumpCurrentValue?.toFixed(1) || 'N/A'}</td>
          <td>${record.pumpStatusValue === 'Running' ? 'On' : 'Off'}</td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    return html;
  }

  private generateClientOverviewHTML(client: any): string {
    if (!client) {
      return '<div class="section"><div class="section-title">Client Overview</div><p>Client not found.</p></div>';
    }

    const deviceCount = client.devices?.length || 0;
    const activeDevices =
      client.devices?.filter((d: any) => d.isActive).length || 0;
    const totalTransactions = client.creditTransactions?.length || 0;

    return `
      <div class="section">
        <div class="section-title">Client Overview</div>
        <h3>${client.name} ${client.organizationName ? `(${client.organizationName})` : ''}</h3>
        <div class="metric">
          <div class="metric-label">Total Devices</div>
          <div class="metric-value">${deviceCount}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Active Devices</div>
          <div class="metric-value">${activeDevices}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Current Credit</div>
          <div class="metric-value">${client.credit?.toFixed(2) || '0.00'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Credit Transactions</div>
          <div class="metric-value">${totalTransactions}</div>
        </div>
      </div>
    `;
  }

  private generateAlarmHistoryHTML(alarmData: any[]): string {
    if (alarmData.length === 0) {
      return '<div class="section"><div class="section-title">Alarm History</div><p>No alarms found for the selected criteria.</p></div>';
    }

    let html =
      '<div class="section"><div class="section-title">Alarm History</div>';
    html +=
      '<table><thead><tr><th>Device</th><th>Type</th><th>Severity</th><th>Message</th><th>Triggered At</th><th>Status</th></tr></thead><tbody>';

    alarmData.forEach((alarm) => {
      html += `
        <tr>
          <td>${alarm.device?.deviceCode || 'N/A'}</td>
          <td>${alarm.type || 'N/A'}</td>
          <td>${alarm.severity || 'N/A'}</td>
          <td>${alarm.message || 'N/A'}</td>
          <td>${new Date(alarm.triggeredAt).toLocaleString()}</td>
          <td>${alarm.resolvedAt ? 'Resolved' : 'Active'}</td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    return html;
  }

  private generateSystemHealthHTML(summary: any): string {
    return `
      <div class="section">
        <div class="section-title">System Health Summary</div>
        <div class="metric">
          <div class="metric-label">Total Devices</div>
          <div class="metric-value">${summary.totalDevices || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Active Devices</div>
          <div class="metric-value">${summary.activeDevices || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">System Health</div>
          <div class="metric-value">${summary.deviceHealthPercentage?.toFixed(1) || '0'}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Alarms</div>
          <div class="metric-value">${summary.totalAlarms || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Critical Alarms</div>
          <div class="metric-value">${summary.criticalAlarms || 0}</div>
        </div>
      </div>
    `;
  }

  private generateBillingSummaryHTML(billingData: any): string {
    if (!billingData.client) {
      return '<div class="section"><div class="section-title">Billing Summary</div><p>No billing data available.</p></div>';
    }

    return `
      <div class="section">
        <div class="section-title">Billing Summary</div>
        <h3>${billingData.client.name} ${billingData.client.organizationName ? `(${billingData.client.organizationName})` : ''}</h3>
        <div class="metric">
          <div class="metric-label">Current Credit</div>
          <div class="metric-value">${billingData.client.currentCredit?.toFixed(2) || '0.00'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Additions</div>
          <div class="metric-value">${billingData.summary?.totalAdditions?.toFixed(2) || '0.00'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Deductions</div>
          <div class="metric-value">${billingData.summary?.totalDeductions?.toFixed(2) || '0.00'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Transaction Count</div>
          <div class="metric-value">${billingData.summary?.transactionCount || 0}</div>
        </div>
      </div>
    `;
  }

  private generateTelemetryCSV(telemetryData: any[]): string {
    let csv =
      'Device Code,Time,Energy Generated (kWh),Energy Consumed (kWh),Battery Voltage (V),Solar Voltage (V),Current (A),Temperature (C),Pressure (bar),Pump Status\n';

    telemetryData.forEach((record) => {
      csv +=
        [
          record.device?.deviceCode || '',
          new Date(record.time).toISOString(),
          record.energyPerDayValue || 0,
          record.pumpEnergyConsumptionValue || 0,
          record.busVoltageValue || 0,
          record.pumpVoltageValue || 0,
          record.pumpCurrentValue || 0,
          record.inverterTemperatureValue || 0,
          record.pressureSensorValue || 0,
          record.pumpStatusValue === 'Running' ? 'On' : 'Off',
        ].join(',') + '\n';
    });

    return csv;
  }

  private generateAlarmCSV(alarmData: any[]): string {
    let csv =
      'Device Code,Alarm Type,Severity,Message,Triggered At,Resolved At,Status\n';

    alarmData.forEach((alarm) => {
      csv +=
        [
          alarm.device?.deviceCode || '',
          alarm.type || '',
          alarm.severity || '',
          `"${alarm.message || ''}"`,
          new Date(alarm.triggeredAt).toISOString(),
          alarm.resolvedAt ? new Date(alarm.resolvedAt).toISOString() : '',
          alarm.resolvedAt ? 'Resolved' : 'Active',
        ].join(',') + '\n';
    });

    return csv;
  }

  async getReportHistory(userId: string): Promise<string[]> {
    // This would typically be stored in database, but for now return files from directory
    const fs = await import('fs');
    const files = fs.readdirSync(this.reportsDir);
    return files.filter((file) => file.match(/\.(pdf|csv|json)$/));
  }

  async deleteReport(fileName: string, userId: string): Promise<void> {
    const filePath = join(this.reportsDir, fileName);
    const fs = await import('fs');

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Report deleted: ${fileName} by user ${userId}`);
    } else {
      throw new NotFoundException('Report file not found');
    }
  }
}
